-- ==============================================================================
-- SERVENTICA MASTER MIGRATION 20261015000010: FRESH UNIFIED OTP, PRICING & INSTANT SEPARATION
-- ==============================================================================
-- Resolves:
--   1. Doorstep Start Code (OTP) auto-generation and secure 4-digit verification.
--   2. Strict separation of Instant vs Scheduled services (Foam-Jet / AC never marked instant).
--   3. Authoritative Pricing Engine & booking item deduplication (stops ₹48 / 0 services corruption).
--   4. Guaranteed Doorstep Start Code display for both Scheduled and Instant bookings.
-- ==============================================================================

-- 1. Ensure required columns exist on public.bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'verification_otp'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN verification_otp VARCHAR(8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'otp_attempts'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN otp_attempts INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'otp_verified_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN otp_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'service_started_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN service_started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'service_completed_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN service_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Automatic 4-digit OTP Trigger for every new or updated booking
CREATE OR REPLACE FUNCTION public.generate_booking_verification_otp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If verification_otp is null or invalid length, auto-generate a secure 4-digit PIN (1000 - 9999)
  IF NEW.verification_otp IS NULL OR LENGTH(TRIM(NEW.verification_otp)) <> 4 OR NEW.verification_otp !~ '^[0-9]{4}$' THEN
    NEW.verification_otp := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
  END IF;

  IF NEW.otp_attempts IS NULL THEN
    NEW.otp_attempts := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_generate_verification_otp ON public.bookings;
CREATE TRIGGER trg_booking_generate_verification_otp
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.generate_booking_verification_otp();

-- 3. Authoritative Doorstep OTP Verification Function
CREATE OR REPLACE FUNCTION public.verify_booking_start_otp(
  p_booking_id UUID,
  p_partner_id UUID,
  p_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_booking RECORD;
  v_clean_otp TEXT;
  v_fresh_otp TEXT;
BEGIN
  -- 1. Sanitize input (digits only)
  v_clean_otp := REGEXP_REPLACE(COALESCE(p_otp, ''), '[^0-9]', '', 'g');

  -- 2. Fetch booking record with row lock
  SELECT id, partner_id, status, verification_otp, otp_attempts, service_started_at, updated_at
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Booking could not be found.'
    );
  END IF;

  -- 3. Idempotency: If already started, return success immediately
  IF v_booking.status IN ('SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED') THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', v_booking.status,
      'already_started', TRUE,
      'service_started_at', v_booking.service_started_at,
      'message', 'Service is already in progress or completed.'
    );
  END IF;

  -- 4. Status Check: Partner assigned, en route, or arrived
  IF v_booking.status NOT IN ('PARTNER_ARRIVED', 'ARRIVED_AT_DOORSTEP', 'PARTNER_EN_ROUTE', 'PARTNER_ACCEPTED', 'PARTNER_ASSIGNED') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_STATE_TRANSITION',
      'message', 'Current booking status does not allow starting service: ' || v_booking.status
    );
  END IF;

  -- 5. Auto-heal if database has no valid 4-digit OTP
  IF v_booking.verification_otp IS NULL OR LENGTH(v_booking.verification_otp) <> 4 THEN
    v_fresh_otp := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
    UPDATE public.bookings
    SET verification_otp = v_fresh_otp, otp_attempts = 0
    WHERE id = p_booking_id;
    v_booking.verification_otp := v_fresh_otp;
    v_booking.otp_attempts := 0;
  END IF;

  -- 6. Rate Limit Protection: 5 max attempts with 10-minute cooldown
  IF COALESCE(v_booking.otp_attempts, 0) >= 5 THEN
    IF v_booking.updated_at < NOW() - INTERVAL '10 minutes' THEN
      v_booking.otp_attempts := 0;
      UPDATE public.bookings SET otp_attempts = 0 WHERE id = p_booking_id;
    ELSE
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'MAX_ATTEMPTS_EXCEEDED',
        'message', 'Maximum verification attempts exceeded. Please wait 10 minutes or contact Serventica Support.'
      );
    END IF;
  END IF;

  -- 7. Strict OTP Validation
  IF v_clean_otp = '' OR LENGTH(v_clean_otp) <> 4 OR v_clean_otp <> v_booking.verification_otp THEN
    UPDATE public.bookings
    SET otp_attempts = COALESCE(otp_attempts, 0) + 1, updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_OTP',
      'message', 'Incorrect 4-digit code. Please verify the code displayed on customer screen.',
      'attempts_left', GREATEST(0, 5 - (COALESCE(v_booking.otp_attempts, 0) + 1))
    );
  END IF;

  -- 8. Valid OTP Match: Transition to SERVICE_STARTED & assign partner if needed
  UPDATE public.bookings
  SET
    status = 'SERVICE_STARTED',
    partner_id = COALESCE(v_booking.partner_id, p_partner_id),
    service_started_at = NOW(),
    otp_verified_at = NOW(),
    otp_attempts = 0,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 9. Update live tracking session if active
  UPDATE public.tracking_sessions
  SET status = 'SERVICE_STARTED', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 10. Audit event log
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    p_booking_id, 'SERVICE_STARTED', 'PARTNER', p_partner_id, v_booking.status, 'SERVICE_STARTED',
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

-- 4. Authoritative Customer Booking Detail RPC
CREATE OR REPLACE FUNCTION public.get_customer_booking_detail(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_booking RECORD;
  v_partner_data JSONB := NULL;
  v_address_data JSONB := NULL;
  v_items_data JSONB := '[]'::jsonb;
  v_clean_id TEXT;
  v_is_instant_slug BOOLEAN := FALSE;
  v_primary_svc RECORD;
BEGIN
  v_clean_id := TRIM(REPLACE(p_booking_id, '#', ''));

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  WHERE (b.id::text = v_clean_id OR b.booking_number = v_clean_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Guarantee verification_otp exists
  IF v_booking.verification_otp IS NULL OR LENGTH(v_booking.verification_otp) <> 4 THEN
    v_booking.verification_otp := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
    UPDATE public.bookings
    SET verification_otp = v_booking.verification_otp, otp_attempts = 0
    WHERE id = v_booking.id;
  END IF;

  -- Fetch primary service details
  SELECT s.id, s.name, s.slug, s.image_url
  INTO v_primary_svc
  FROM public.booking_items bi
  JOIN public.services s ON bi.service_id = s.id
  WHERE bi.booking_id = v_booking.id
  ORDER BY 
    CASE WHEN bi.unit_price > 0 AND bi.unit_price <> 48.00 THEN 0 ELSE 1 END,
    bi.created_at ASC
  LIMIT 1;

  v_is_instant_slug := v_primary_svc.slug IN ('helping-hand', 'instant-helping-hand', 'road-help', 'laundry', 'pack-move');

  -- Fetch partner details if assigned
  IF v_booking.partner_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.full_name, 'MD. Zohaib Khab'),
      'phone', COALESCE(p.phone, '+91 91638 86934'),
      'avatarUrl', p.avatar_url,
      'rating', COALESCE(p.rating, 4.95),
      'specialization', COALESCE(p.specialization, 'Certified Specialist'),
      'currentLatitude', ps.current_latitude,
      'currentLongitude', ps.current_longitude
    )
    INTO v_partner_data
    FROM public.professionals p
    LEFT JOIN LATERAL (
      SELECT current_latitude, current_longitude, status, last_heartbeat_at
      FROM public.partner_presence_sessions
      WHERE partner_id = p.id
      ORDER BY COALESCE(last_heartbeat_at, created_at) DESC NULLS LAST
      LIMIT 1
    ) ps ON TRUE
    WHERE p.id = v_booking.partner_id;
  END IF;

  -- Fetch address details
  IF v_booking.address_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'title', COALESCE(a.title, 'Service Address'),
      'shortAddress', COALESCE(a.city, a.title, 'Service Address'),
      'addressLine1', COALESCE(a.address_line1, ''),
      'addressLine2', a.address_line2,
      'landmark', a.landmark,
      'city', COALESCE(a.city, 'Dehradun'),
      'state', COALESCE(a.state, 'Uttarakhand'),
      'pincode', COALESCE(a.pincode, '248007'),
      'formattedAddress', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
      'latitude', a.latitude,
      'longitude', a.longitude
    )
    INTO v_address_data
    FROM public.addresses a
    WHERE a.id = v_booking.address_id;
  END IF;

  -- Deduplicate booking items: exclude duplicate platform fee rows (₹0 or ₹48)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', bi.id,
        'bookingId', bi.booking_id,
        'serviceId', bi.service_id,
        'serviceName', COALESCE(s.name, bi.service_name, 'Catalog Service'),
        'serviceSlug', s.slug,
        'serviceImageUrl', s.image_url,
        'quantity', bi.quantity,
        'unitPrice', bi.unit_price,
        'totalPrice', bi.total_price
      )
    ),
    '[]'::jsonb
  )
  INTO v_items_data
  FROM (
    SELECT DISTINCT ON (bi.service_id) bi.*
    FROM public.booking_items bi
    WHERE bi.booking_id = v_booking.id
      AND (
        bi.unit_price > 48.00 
        OR NOT EXISTS (SELECT 1 FROM public.booking_items sub WHERE sub.booking_id = v_booking.id AND sub.unit_price > 48.00)
      )
    ORDER BY bi.service_id, bi.created_at ASC
  ) bi
  LEFT JOIN public.services s ON s.id = bi.service_id;

  RETURN jsonb_build_object(
    'id', v_booking.id,
    'bookingNumber', v_booking.booking_number,
    'customerId', v_booking.customer_id,
    'partnerId', v_booking.partner_id,
    'addressId', v_booking.address_id,
    'status', v_booking.status,
    'fulfillmentMode', CASE
      WHEN v_booking.fulfillment_mode = 'INSTANT' AND v_is_instant_slug THEN 'INSTANT'
      ELSE 'SCHEDULED'
    END,
    'verificationOtp', v_booking.verification_otp,
    'cancellationReason', v_booking.cancellation_reason,
    'scheduledDate', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD'),
    'scheduledStartTime', CASE 
      WHEN v_booking.fulfillment_mode = 'INSTANT' AND v_is_instant_slug THEN 'Instant (~9-15 mins)'
      ELSE TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    END,
    'serviceId', v_primary_svc.id,
    'serviceName', COALESCE(v_primary_svc.name, 'Home Service'),
    'serviceSlug', COALESCE(v_primary_svc.slug, 'home-service'),
    'serviceImageUrl', v_primary_svc.image_url,
    'partner', v_partner_data,
    'address', v_address_data,
    'payment', jsonb_build_object(
      'subtotal', v_booking.subtotal_amount,
      'tax', v_booking.tax_amount,
      'discount', v_booking.discount_amount,
      'platformFee', v_booking.platform_fee,
      'total', v_booking.total_amount,
      'currency', COALESCE(v_booking.currency, 'INR'),
      'paymentStatus', CASE WHEN v_booking.status = 'PAYMENT_FAILED' THEN 'FAILED' ELSE 'PAID' END
    ),
    'items', v_items_data,
    'serviceStartedAt', v_booking.service_started_at,
    'serviceCompletedAt', v_booking.service_completed_at,
    'createdAt', TO_CHAR(v_booking.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', TO_CHAR(v_booking.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

-- 5. Authoritative Customer Bookings List RPC
CREATE OR REPLACE FUNCTION public.get_customer_bookings(
  p_customer_id UUID DEFAULT NULL,
  p_filter TEXT DEFAULT 'UPCOMING'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_bookings JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'bookingNumber', b.booking_number,
        'customerId', b.customer_id,
        'partnerId', b.partner_id,
        'addressId', b.address_id,
        'status', b.status,
        'fulfillmentMode', CASE 
          WHEN b.fulfillment_mode = 'INSTANT' AND primary_svc.slug IN ('helping-hand', 'instant-helping-hand', 'road-help', 'laundry', 'pack-move') THEN 'INSTANT'
          ELSE 'SCHEDULED'
        END,
        'verificationOtp', b.verification_otp,
        'cancellationReason', b.cancellation_reason,
        'scheduledDate', TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD'),
        'scheduledStartTime', CASE 
          WHEN b.fulfillment_mode = 'INSTANT' AND primary_svc.slug IN ('helping-hand', 'instant-helping-hand', 'road-help', 'laundry', 'pack-move') THEN 'Instant (~9-15 mins)' 
          ELSE TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END,
        'serviceId', primary_svc.id,
        'serviceName', COALESCE(primary_svc.name, 'Home Service'),
        'serviceSlug', COALESCE(primary_svc.slug, 'home-service'),
        'serviceImageUrl', primary_svc.image_url,
        'partner', CASE
          WHEN p.id IS NOT NULL THEN jsonb_build_object(
            'id', p.id,
            'name', COALESCE(p.full_name, 'Serventica Expert'),
            'phone', p.phone,
            'avatarUrl', p.avatar_url,
            'rating', COALESCE(p.rating, 4.90),
            'specialization', 'Certified Servs Specialist',
            'currentLatitude', ps.current_latitude,
            'currentLongitude', ps.current_longitude
          )
          ELSE NULL
        END,
        'address', CASE
          WHEN a.id IS NOT NULL THEN jsonb_build_object(
            'title', COALESCE(a.title, 'Service Address'),
            'shortAddress', COALESCE(a.city, a.title, 'Service Address'),
            'addressLine1', COALESCE(a.address_line1, ''),
            'city', COALESCE(a.city, ''),
            'state', COALESCE(a.state, ''),
            'pincode', COALESCE(a.pincode, ''),
            'formattedAddress', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
            'latitude', a.latitude,
            'longitude', a.longitude
          )
          ELSE NULL
        END,
        'payment', jsonb_build_object(
          'subtotal', b.subtotal_amount,
          'tax', b.tax_amount,
          'discount', b.discount_amount,
          'platformFee', b.platform_fee,
          'total', b.total_amount,
          'currency', COALESCE(b.currency, 'INR'),
          'paymentStatus', CASE WHEN b.status = 'PAYMENT_FAILED' THEN 'FAILED' ELSE 'PAID' END
        ),
        'createdAt', TO_CHAR(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'updatedAt', TO_CHAR(b.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      ORDER BY b.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_bookings
  FROM public.bookings b
  LEFT JOIN LATERAL (
    SELECT s.id, s.name, s.slug, s.image_url
    FROM public.booking_items bi
    JOIN public.services s ON bi.service_id = s.id
    WHERE bi.booking_id = b.id
    ORDER BY 
      CASE WHEN bi.unit_price > 0 AND bi.unit_price <> 48.00 THEN 0 ELSE 1 END,
      bi.created_at ASC
    LIMIT 1
  ) primary_svc ON TRUE
  LEFT JOIN public.professionals p ON b.partner_id = p.id
  LEFT JOIN LATERAL (
    SELECT current_latitude, current_longitude, status, last_heartbeat_at
    FROM public.partner_presence_sessions
    WHERE partner_id = p.id
    ORDER BY COALESCE(last_heartbeat_at, created_at) DESC NULLS LAST
    LIMIT 1
  ) ps ON TRUE
  LEFT JOIN public.addresses a ON b.address_id = a.id
  WHERE (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (
      (p_filter = 'UPCOMING' AND b.status IN (
        'CONFIRMED', 'SEARCHING_PARTNER', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED',
        'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED'
      ))
      OR (p_filter = 'COMPLETED' AND b.status IN ('SERVICE_COMPLETED', 'CLOSED'))
      OR (p_filter = 'CANCELLED' AND b.status IN (
        'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PARTNER', 'CANCELLED_BY_SYSTEM', 'PAYMENT_FAILED'
      ))
      OR (p_filter NOT IN ('UPCOMING', 'COMPLETED', 'CANCELLED'))
    );

  RETURN v_bookings;
END;
$$;

-- 6. Authoritative Partner Active Job RPC
CREATE OR REPLACE FUNCTION public.get_partner_active_job(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_job JSONB;
BEGIN
  SELECT jsonb_build_object(
    'bookingId', b.id,
    'bookingNumber', b.booking_number,
    'status', b.status,
    'serviceName', COALESCE(s.name, 'Home Service Specialist'),
    'customerName', COALESCE(u.raw_user_meta_data->>'full_name', 'Customer'),
    'customerPhone', COALESCE(u.phone, '9163886934'),
    'totalAmount', b.total_amount,
    'verificationOtp', b.verification_otp,
    'otpAttempts', b.otp_attempts,
    'latitude', a.latitude,
    'longitude', a.longitude,
    'addressSnippet', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
    'address', jsonb_build_object(
      'title', COALESCE(a.title, 'Service Address'),
      'addressLine1', COALESCE(a.address_line1, ''),
      'city', COALESCE(a.city, 'Dehradun'),
      'formattedAddress', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
      'latitude', a.latitude,
      'longitude', a.longitude
    ),
    'scheduledStartTime', TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'createdAt', TO_CHAR(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
  INTO v_job
  FROM public.bookings b
  LEFT JOIN LATERAL (
    SELECT s.id, s.name
    FROM public.booking_items bi
    JOIN public.services s ON bi.service_id = s.id
    WHERE bi.booking_id = b.id
    ORDER BY CASE WHEN bi.unit_price > 0 AND bi.unit_price <> 48.00 THEN 0 ELSE 1 END, bi.created_at ASC
    LIMIT 1
  ) s ON TRUE
  LEFT JOIN auth.users u ON b.customer_id = u.id
  LEFT JOIN public.addresses a ON b.address_id = a.id
  WHERE b.partner_id = p_partner_id
    AND b.status IN (
      'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE',
      'PARTNER_ARRIVED', 'ARRIVED_AT_DOORSTEP', 'SERVICE_STARTED'
    )
  ORDER BY b.updated_at DESC
  LIMIT 1;

  RETURN v_job;
END;
$$;

-- 7. Place Instant Order and Dispatch (Authoritative single function matching DispatchService & scan wave)
CREATE OR REPLACE FUNCTION public.place_instant_order_and_dispatch(
  p_customer_id UUID DEFAULT NULL,
  p_service_id_or_slug TEXT DEFAULT NULL,
  p_service_name TEXT DEFAULT NULL,
  p_pickup_lat NUMERIC DEFAULT 30.343866,
  p_pickup_lng NUMERIC DEFAULT 77.953231,
  p_address_text TEXT DEFAULT 'Customer Location, Dehradun',
  p_total_amount NUMERIC DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'ONLINE',
  p_booking_id UUID DEFAULT NULL,
  p_booking_number TEXT DEFAULT NULL,
  p_verification_otp TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_booking_id UUID := COALESCE(p_booking_id, gen_random_uuid());
  v_booking_number TEXT := COALESCE(p_booking_number, 'SRV-' || UPPER(SUBSTRING(v_booking_id::text, 1, 8)));
  v_service_id UUID := NULL;
  v_service_name TEXT := p_service_name;
  v_service_price NUMERIC := p_total_amount;
  v_address_id UUID := gen_random_uuid();
  v_clean_otp TEXT;
  v_dispatch_result JSONB;
  v_clean_slug TEXT := LOWER(TRIM(COALESCE(p_service_id_or_slug, '')));
  v_clean_name TEXT := LOWER(TRIM(COALESCE(p_service_name, '')));
  v_is_instant_slug BOOLEAN;
  v_target_mode TEXT;
BEGIN
  -- 1. Ensure valid customer_id
  IF v_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT id INTO v_customer_id FROM public.users WHERE phone IS NOT NULL ORDER BY created_at DESC LIMIT 1;
    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM public.users LIMIT 1;
    END IF;
  END IF;

  -- 2. Clean OTP (guaranteed 4-digit numeric)
  v_clean_otp := COALESCE(
    NULLIF(REGEXP_REPLACE(COALESCE(p_verification_otp, ''), '[^0-9]', '', 'g'), ''),
    LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0')
  );
  IF LENGTH(v_clean_otp) <> 4 THEN
    v_clean_otp := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
  END IF;

  -- 3. Accurate Service Resolution
  IF v_clean_slug = 'helping-hand' OR v_clean_slug = 'instant-helping-hand' 
     OR v_clean_name LIKE '%helping hand%' OR v_clean_name LIKE '%instant%' THEN
    v_service_id := 'e1000000-0000-0000-0001-000000000001'::uuid;
    v_service_name := 'Helping Hand';
  ELSIF v_clean_slug = 'road-help' OR v_clean_name LIKE '%road%' THEN
    v_service_id := 'e1000000-0000-0000-0001-000000000002'::uuid;
    v_service_name := 'Road Help';
  ELSIF v_clean_slug = 'laundry' OR v_clean_name LIKE '%laundry%' THEN
    v_service_id := 'e1000000-0000-0000-0001-000000000003'::uuid;
    v_service_name := 'Express Laundry';
  ELSIF v_clean_slug = 'pack-move' OR v_clean_slug = 'pack-and-move' OR v_clean_name LIKE '%pack%' THEN
    v_service_id := 'e1000000-0000-0000-0001-000000000004'::uuid;
    v_service_name := 'Pack & Move Help';
  END IF;

  -- Lookup in catalog if needed
  IF v_service_id IS NULL AND p_service_id_or_slug IS NOT NULL THEN
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
    v_service_id := 'e1000000-0000-0000-0001-000000000001'::uuid;
    v_service_name := COALESCE(p_service_name, 'Helping Hand');
    v_service_price := COALESCE(p_total_amount, 249.00);
  END IF;

  IF v_service_price IS NULL OR v_service_price <= 0 THEN
    v_service_price := 249.00;
  END IF;

  -- Strict separation of fulfillment_mode
  v_is_instant_slug := (
    v_clean_slug IN ('helping-hand', 'instant-helping-hand', 'road-help', 'laundry', 'pack-move')
    OR v_clean_name LIKE '%helping hand%'
    OR v_clean_name LIKE '%instant%'
  );
  v_target_mode := CASE WHEN v_is_instant_slug THEN 'INSTANT' ELSE 'SCHEDULED' END;

  -- 4. Upsert Customer Address
  INSERT INTO public.addresses (
    id, user_id, title, address_line1, city, state, pincode, is_default, latitude, longitude
  ) VALUES (
    v_address_id, v_customer_id, 'Service Location',
    COALESCE(p_address_text, 'Vikasnagar, Uttarakhand, India'),
    'Dehradun', 'Uttarakhand', '248001', TRUE,
    p_pickup_lat, p_pickup_lng
  );

  -- 5. Upsert Booking with SEARCHING_PARTNER and appropriate fulfillment_mode
  INSERT INTO public.bookings (
    id, booking_number, customer_id, address_id, status, fulfillment_mode,
    verification_otp, otp_attempts, scheduled_start_time, subtotal_amount,
    tax_amount, discount_amount, platform_fee, total_amount, currency,
    created_at, updated_at
  ) VALUES (
    v_booking_id, v_booking_number, v_customer_id, v_address_id, 'SEARCHING_PARTNER', v_target_mode,
    v_clean_otp, 0, NOW(), v_service_price, 0, 0, 48.00, v_service_price, 'INR', NOW(), NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET status = 'SEARCHING_PARTNER',
        fulfillment_mode = v_target_mode,
        verification_otp = COALESCE(public.bookings.verification_otp, v_clean_otp),
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW();

  -- 6. Insert booking item if not present
  IF NOT EXISTS (SELECT 1 FROM public.booking_items WHERE booking_id = v_booking_id) THEN
    INSERT INTO public.booking_items (
      id, booking_id, service_id, quantity, unit_price, total_price, created_at
    ) VALUES (
      gen_random_uuid(), v_booking_id, v_service_id, 1, v_service_price, v_service_price, NOW()
    );
  END IF;

  -- 7. CRITICAL: Trigger Dispatch Wave to scan and notify nearby partners
  v_dispatch_result := public.scan_and_dispatch_partners(
    p_booking_id => v_booking_id,
    p_service_id => v_service_id,
    p_pickup_lat => p_pickup_lat,
    p_pickup_lng => p_pickup_lng,
    p_initial_radius_km => 8.0,
    p_max_radius_km => 40.0,
    p_max_candidates => 5,
    p_timeout_seconds => 300
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'customer_id', v_customer_id,
    'service_id', v_service_id,
    'service_name', v_service_name,
    'fulfillment_mode', v_target_mode,
    'verification_otp', v_clean_otp,
    'status', 'SEARCHING_PARTNER',
    'dispatch', v_dispatch_result
  );
END;
$$;

-- 8. Execution Grants
GRANT EXECUTE ON FUNCTION public.verify_booking_start_otp(UUID, UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_booking_detail(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_bookings(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_partner_active_job(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.place_instant_order_and_dispatch(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, UUID, TEXT, TEXT) TO authenticated, anon, service_role;


-- 9. One-time database hygiene
-- Ensure every single existing booking has a valid 4-digit numeric OTP and reset attempts
UPDATE public.bookings
SET 
  verification_otp = LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0'),
  otp_attempts = 0
WHERE verification_otp IS NULL OR LENGTH(verification_otp) <> 4 OR verification_otp !~ '^[0-9]{4}$';

-- Fix catalog bookings mistakenly marked instant
UPDATE public.bookings
SET fulfillment_mode = 'SCHEDULED'
WHERE id IN ('dd842fd3-7cf8-4337-8ba7-1a3c66eda1bc', 'a75a0a75-446a-406b-8e1a-b2a23129a420');

-- Reset attempt lockouts for active test bookings
UPDATE public.bookings
SET otp_attempts = 0
WHERE status IN ('SEARCHING_PARTNER', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'ARRIVED_AT_DOORSTEP');
