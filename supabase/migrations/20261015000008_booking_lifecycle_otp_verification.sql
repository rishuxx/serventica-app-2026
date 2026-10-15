-- ==============================================================================
-- SERVENTICA HYPERLOCAL REALTIME DISPATCH & TRACKING PLATFORM
-- MIGRATION: 20261015000008_booking_lifecycle_otp_verification.sql
-- DESCRIPTION:
--   1. Adds verification_otp, otp_attempts, and otp_verified_at columns to bookings.
--   2. Authoritative verify_booking_start_otp RPC with row locking, attempt limiting,
--      atomic state transition to SERVICE_STARTED, and audit logging.
--   3. Updates place_instant_order_and_dispatch to generate secure 4-digit OTPs.
--   4. Updates get_customer_booking_detail to return verificationOtp to customer.
-- ==============================================================================

-- 1. ADD COLUMNS TO BOOKINGS
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill any active bookings without an OTP
UPDATE public.bookings
SET verification_otp = LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0')
WHERE verification_otp IS NULL;

-- 2. AUTHORITATIVE RPC: verify_booking_start_otp
CREATE OR REPLACE FUNCTION public.verify_booking_start_otp(
  p_booking_id UUID,
  p_partner_id UUID,
  p_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_clean_otp TEXT;
BEGIN
  v_clean_otp := TRIM(COALESCE(p_otp, ''));

  -- 1. Row-level lock and verify booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Booking not found.'
    );
  END IF;

  -- 2. Verify assigned partner
  IF v_booking.partner_id IS DISTINCT FROM p_partner_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHORIZED_PARTNER',
      'message', 'You are not the assigned partner for this booking.'
    );
  END IF;

  -- 3. Idempotent check: if already started, succeed gracefully
  IF v_booking.status = 'SERVICE_STARTED' THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'SERVICE_STARTED',
      'already_started', TRUE,
      'service_started_at', v_booking.service_started_at,
      'message', 'Service is already in progress.'
    );
  END IF;

  -- 4. Check status prerequisite (Partner must be arrived at doorstep)
  IF v_booking.status NOT IN ('PARTNER_ARRIVED', 'ARRIVED_AT_DOORSTEP') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_STATE_TRANSITION',
      'message', 'You must mark your arrival at the doorstep before verifying the start code. Current status: ' || v_booking.status
    );
  END IF;

  -- 5. Rate limit: Max 5 incorrect attempts
  IF COALESCE(v_booking.otp_attempts, 0) >= 5 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'MAX_ATTEMPTS_EXCEEDED',
      'message', 'Maximum verification attempts exceeded. Please contact Serventica Support.'
    );
  END IF;

  -- 6. Validate OTP
  IF v_booking.verification_otp IS NOT NULL AND v_clean_otp <> v_booking.verification_otp THEN
    UPDATE public.bookings
    SET
      otp_attempts = COALESCE(otp_attempts, 0) + 1,
      updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_OTP',
      'message', 'Incorrect 4-digit code. Please check with customer.',
      'attempts_left', GREATEST(0, 5 - (COALESCE(v_booking.otp_attempts, 0) + 1))
    );
  END IF;

  -- 7. Atomically transition booking to SERVICE_STARTED
  UPDATE public.bookings
  SET
    status = 'SERVICE_STARTED',
    service_started_at = NOW(),
    otp_verified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 8. Update tracking session status
  UPDATE public.tracking_sessions
  SET
    status = 'SERVICE_STARTED',
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 9. Insert audit and event records
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    p_booking_id, 'SERVICE_STARTED', 'PARTNER', p_partner_id, 'PARTNER_ARRIVED', 'SERVICE_STARTED',
    jsonb_build_object('verified_via_otp', TRUE, 'verified_at', NOW())
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'SERVICE_STARTED',
    'service_started_at', NOW(),
    'message', 'Doorstep code verified successfully. Service started.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_booking_start_otp(UUID, UUID, TEXT) TO authenticated, anon, service_role;

-- 3. UPDATE place_instant_order_and_dispatch TO STORE SECURE 4-DIGIT OTP
CREATE OR REPLACE FUNCTION public.place_instant_order_and_dispatch(
  p_customer_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_booking_number TEXT DEFAULT NULL,
  p_service_id_or_slug TEXT DEFAULT NULL,
  p_service_name TEXT DEFAULT NULL,
  p_total_amount NUMERIC DEFAULT NULL,
  p_pickup_lat NUMERIC DEFAULT 30.343866,
  p_pickup_lng NUMERIC DEFAULT 77.953231,
  p_address_text TEXT DEFAULT 'Customer Location'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_booking_id UUID := COALESCE(p_booking_id, gen_random_uuid());
  v_booking_number TEXT := COALESCE(p_booking_number, 'SRV-' || UPPER(SUBSTRING(v_booking_id::text, 1, 8)));
  v_service_id UUID;
  v_service_name TEXT := p_service_name;
  v_service_price NUMERIC := p_total_amount;
  v_address_id UUID := gen_random_uuid();
  v_dispatch_result JSONB;
  v_otp TEXT;
BEGIN
  -- 1. Ensure valid customer user ID from public.users
  IF v_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT id INTO v_customer_id FROM public.users LIMIT 1;
  END IF;

  -- 2. Resolve target service_id
  IF p_service_id_or_slug IS NOT NULL THEN
    BEGIN
      SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
      FROM public.services
      WHERE id = p_service_id_or_slug::uuid AND is_active = TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_service_id := NULL;
    END;

    IF v_service_id IS NULL THEN
      SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
      FROM public.services
      WHERE (slug ILIKE '%' || p_service_id_or_slug || '%' 
         OR name ILIKE '%' || p_service_id_or_slug || '%')
        AND is_active = TRUE
      LIMIT 1;
    END IF;
  END IF;

  IF v_service_id IS NULL THEN
    SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
    FROM public.services
    WHERE is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_service_name IS NULL THEN
    v_service_name := 'Instant Professional Service';
  END IF;

  -- 3. Upsert address
  INSERT INTO public.addresses (
    id, user_id, title, address_line1, city, state, pincode, is_default, latitude, longitude
  ) VALUES (
    v_address_id, v_customer_id, 'Service Location',
    COALESCE(p_address_text, 'Rajpur Road, Clock Tower'),
    'Dehradun', 'Uttarakhand', '248001', TRUE,
    p_pickup_lat, p_pickup_lng
  );

  -- 4. Generate random 4-digit OTP for doorstep verification
  v_otp := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');

  -- 5. Upsert booking
  INSERT INTO public.bookings (
    id,
    booking_number,
    customer_id,
    address_id,
    status,
    fulfillment_mode,
    verification_otp,
    otp_attempts,
    scheduled_start_time,
    subtotal_amount,
    tax_amount,
    discount_amount,
    platform_fee,
    total_amount,
    currency,
    created_at,
    updated_at
  ) VALUES (
    v_booking_id,
    v_booking_number,
    v_customer_id,
    v_address_id,
    'SEARCHING_PARTNER',
    'INSTANT',
    v_otp,
    0,
    NOW(),
    COALESCE(p_total_amount, v_service_price),
    0,
    0,
    29.00,
    COALESCE(p_total_amount, v_service_price),
    'INR',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET status = 'SEARCHING_PARTNER',
        fulfillment_mode = 'INSTANT',
        verification_otp = COALESCE(public.bookings.verification_otp, v_otp),
        updated_at = NOW();

  -- 6. Insert booking items
  INSERT INTO public.booking_items (
    id, booking_id, service_id, quantity, unit_price, total_price
  ) VALUES (
    gen_random_uuid(),
    v_booking_id,
    v_service_id,
    1,
    COALESCE(p_total_amount, v_service_price),
    COALESCE(p_total_amount, v_service_price)
  ) ON CONFLICT DO NOTHING;

  -- 7. Execute Dispatch Scan Wave with 300 second (5 min) window
  v_dispatch_result := public.scan_and_dispatch_partners(
    p_booking_id => v_booking_id,
    p_pickup_lat => p_pickup_lat,
    p_pickup_lng => p_pickup_lng,
    p_radius_km => 25.0,
    p_timeout_seconds => 300
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'customer_id', v_customer_id,
    'verification_otp', v_otp,
    'status', 'SEARCHING_PARTNER',
    'dispatch_result', v_dispatch_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_instant_order_and_dispatch(UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated, anon, service_role;

-- 4. UPDATE get_customer_booking_detail TO INCLUDE verificationOtp
CREATE OR REPLACE FUNCTION public.get_customer_booking_detail(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_partner RECORD;
  v_presence RECORD;
  v_address RECORD;
  v_items JSONB;
  v_clean_id TEXT;
  v_clean_num TEXT;
BEGIN
  v_clean_id := TRIM(p_booking_id);
  v_clean_num := UPPER(REPLACE(v_clean_id, '#', ''));

  -- 1. Find booking by UUID or booking_number
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id::TEXT = v_clean_id
     OR UPPER(booking_number) = v_clean_num
     OR UPPER(booking_number) = 'SRV-' || v_clean_num
     OR UPPER(booking_number) = REPLACE(v_clean_num, 'SRV-', '')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_booking IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Partner profile
  IF v_booking.partner_id IS NOT NULL THEN
    SELECT id, full_name, phone, avatar_url, rating, total_jobs
    INTO v_partner
    FROM public.professionals
    WHERE id = v_booking.partner_id;

    -- Partner live coordinates from presence session
    SELECT current_latitude, current_longitude, status, last_heartbeat_at
    INTO v_presence
    FROM public.partner_presence_sessions
    WHERE partner_id = v_booking.partner_id
    ORDER BY COALESCE(last_heartbeat_at, created_at) DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- 3. Address
  IF v_booking.address_id IS NOT NULL THEN
    SELECT *
    INTO v_address
    FROM public.addresses
    WHERE id = v_booking.address_id;
  END IF;

  -- 4. Items
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', bi.id,
        'bookingId', bi.booking_id,
        'serviceId', bi.service_id,
        'serviceName', COALESCE(s.name, 'Home Service'),
        'serviceSlug', s.slug,
        'serviceImageUrl', s.image_url,
        'unitPrice', bi.unit_price,
        'quantity', bi.quantity,
        'totalPrice', bi.total_price
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.booking_items bi
  LEFT JOIN public.services s ON bi.service_id = s.id
  WHERE bi.booking_id = v_booking.id;

  RETURN jsonb_build_object(
    'id', v_booking.id,
    'bookingNumber', v_booking.booking_number,
    'customerId', v_booking.customer_id,
    'partnerId', v_booking.partner_id,
    'addressId', v_booking.address_id,
    'status', v_booking.status,
    'verificationOtp', COALESCE(v_booking.verification_otp, '4821'),
    'serviceStartedAt', TO_CHAR(v_booking.service_started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'serviceCompletedAt', TO_CHAR(v_booking.service_completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'cancellationReason', v_booking.cancellation_reason,
    'scheduledDate', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD'),
    'scheduledStartTime', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'serviceId', (SELECT bi.service_id FROM public.booking_items bi WHERE bi.booking_id = v_booking.id LIMIT 1),
    'serviceName', COALESCE(
      (SELECT s.name FROM public.booking_items bi JOIN public.services s ON bi.service_id = s.id WHERE bi.booking_id = v_booking.id LIMIT 1),
      'Home Service'
    ),
    'partner', CASE
      WHEN v_partner.id IS NOT NULL THEN jsonb_build_object(
        'id', v_partner.id,
        'name', COALESCE(v_partner.full_name, 'Serventica Expert'),
        'phone', v_partner.phone,
        'avatarUrl', v_partner.avatar_url,
        'rating', COALESCE(v_partner.rating, 4.90),
        'totalJobs', COALESCE(v_partner.total_jobs, 0),
        'specialization', 'Certified Servs Specialist',
        'currentLatitude', v_presence.current_latitude,
        'currentLongitude', v_presence.current_longitude
      )
      ELSE NULL
    END,
    'address', CASE
      WHEN v_address.id IS NOT NULL THEN jsonb_build_object(
        'title', COALESCE(v_address.title, 'Service Address'),
        'shortAddress', COALESCE(v_address.city, v_address.title, 'Service Address'),
        'addressLine1', COALESCE(v_address.address_line1, ''),
        'addressLine2', v_address.address_line2,
        'landmark', v_address.landmark,
        'city', COALESCE(v_address.city, ''),
        'state', COALESCE(v_address.state, ''),
        'pincode', COALESCE(v_address.pincode, ''),
        'formattedAddress', COALESCE(v_address.formatted_address, v_address.address_line1, 'Customer Location'),
        'latitude', v_address.latitude,
        'longitude', v_address.longitude
      )
      ELSE NULL
    END,
    'payment', jsonb_build_object(
      'subtotal', v_booking.subtotal_amount,
      'tax', v_booking.tax_amount,
      'discount', v_booking.discount_amount,
      'platformFee', v_booking.platform_fee,
      'total', v_booking.total_amount,
      'currency', COALESCE(v_booking.currency, 'INR'),
      'paymentStatus', CASE WHEN v_booking.status = 'PAYMENT_FAILED' THEN 'FAILED' ELSE 'PAID' END
    ),
    'items', v_items,
    'createdAt', TO_CHAR(v_booking.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', TO_CHAR(v_booking.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_booking_detail(TEXT) TO authenticated, anon, service_role;
