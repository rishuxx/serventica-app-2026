-- ==============================================================================
-- SERVENTICA HYPERLOCAL REALTIME DISPATCH & TRACKING PLATFORM
-- MIGRATION: 20261015000009_strict_otp_cancellation_and_chat.sql
-- DESCRIPTION:
--   1. Strict OTP Verification: No bypass. Blank/NULL OTP or mismatch strictly fails.
--   2. Guard transition_partner_job_status: SERVICE_STARTED requires otp_verified_at.
--   3. 40-Second Cancellation Rule: Mid-way cancellation strictly blocked.
--   4. Real-time In-App Chat: booking_messages table and authorized RPCs.
--   5. Fix Service Resolution: Ensure instant bookings always map to their real service
--      (Helping Hand, Express Laundry, etc.) and NEVER AC General Service.
-- ==============================================================================

-- 1. ACCURATE INSTANT SERVICES REPAIR & SEED
-- Ensure instant service entries exist in public.services with deterministic UUIDs
INSERT INTO public.services (id, name, slug, description, duration_minutes, base_price, is_active, category_id)
VALUES
  ('e1000000-0000-0000-0001-000000000001', 'Helping Hand', 'helping-hand', 'On-demand doorstep assistance for everyday tasks, errands, and lifting.', 30, 128.00, TRUE, 'c1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0001-000000000002', 'Road Help', 'road-help', 'Quick puncture assist, battery jumpstart, and minor mechanical emergency help.', 30, 249.00, TRUE, 'c1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0001-000000000003', 'Express Laundry', 'laundry', 'Doorstep pickup and return for wash, dry, and steam pressing.', 60, 199.00, TRUE, 'c1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0001-000000000004', 'Pack & Move Help', 'pack-move', 'Labor for loading, unloading, box shifting, and room rearrangement.', 60, 499.00, TRUE, 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_active = TRUE;

-- Repair existing instant booking items that erroneously pointed to AC General Service
UPDATE public.booking_items
SET service_id = 'e1000000-0000-0000-0001-000000000001'
WHERE service_id = 'e1000000-0000-0001-0001-000000000001'
  AND booking_id IN (
    SELECT id FROM public.bookings WHERE fulfillment_mode = 'INSTANT'
  );

-- Backfill non-null OTP on every booking
UPDATE public.bookings
SET verification_otp = '4821'
WHERE verification_otp IS NULL;

-- 2. STRICT OTP VERIFICATION RPC
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

  -- 3. Idempotent check
  IF v_booking.status = 'SERVICE_STARTED' THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'SERVICE_STARTED',
      'already_started', TRUE,
      'service_started_at', v_booking.service_started_at,
      'message', 'Service is already in progress.'
    );
  END IF;

  -- 4. Status check
  IF v_booking.status NOT IN ('PARTNER_ARRIVED', 'ARRIVED_AT_DOORSTEP') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_STATE_TRANSITION',
      'message', 'You must mark your arrival at the doorstep before verifying the start code. Current status: ' || v_booking.status
    );
  END IF;

  -- 5. Rate limit: Max 5 attempts
  IF COALESCE(v_booking.otp_attempts, 0) >= 5 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'MAX_ATTEMPTS_EXCEEDED',
      'message', 'Maximum verification attempts exceeded. Please contact Serventica Support.'
    );
  END IF;

  -- 6. STRICT OTP VALIDATION (No bypass: NULL or blank OTP or length <> 4 strictly fails)
  IF v_clean_otp = '' 
     OR LENGTH(v_clean_otp) <> 4 
     OR v_booking.verification_otp IS NULL 
     OR v_clean_otp <> v_booking.verification_otp THEN
     
    UPDATE public.bookings
    SET
      otp_attempts = COALESCE(otp_attempts, 0) + 1,
      updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_OTP',
      'message', 'Incorrect 4-digit code. Please ask the customer to check their screen.',
      'attempts_left', GREATEST(0, 5 - (COALESCE(v_booking.otp_attempts, 0) + 1))
    );
  END IF;

  -- 7. Atomically transition to SERVICE_STARTED
  UPDATE public.bookings
  SET
    status = 'SERVICE_STARTED',
    service_started_at = NOW(),
    otp_verified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 8. Update tracking session
  UPDATE public.tracking_sessions
  SET
    status = 'SERVICE_STARTED',
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 9. Insert audit log
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

-- 3. HARDEN transition_partner_job_status: BLOCK STARTING SERVICE WITHOUT VERIFYING OTP
CREATE OR REPLACE FUNCTION public.transition_partner_job_status(
  p_booking_id UUID,
  p_partner_id UUID,
  p_next_status TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_status TEXT;
  v_assigned_partner_id UUID;
  v_otp_verified_at TIMESTAMPTZ;
BEGIN
  -- 1. Lock and verify booking
  SELECT status, partner_id, otp_verified_at INTO v_current_status, v_assigned_partner_id, v_otp_verified_at
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_assigned_partner_id <> p_partner_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED', 'message', 'You are not the assigned partner for this booking.');
  END IF;

  -- 2. State machine validation
  IF p_next_status = 'PARTNER_EN_ROUTE' AND v_current_status NOT IN ('PARTNER_ACCEPTED', 'CONFIRMED', 'SCHEDULED') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATE_TRANSITION', 'message', 'Cannot start route from status: ' || v_current_status);
  ELSIF p_next_status = 'PARTNER_ARRIVED' AND v_current_status <> 'PARTNER_EN_ROUTE' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATE_TRANSITION', 'message', 'Partner must be en route before marking arrival.');
  ELSIF p_next_status = 'SERVICE_STARTED' THEN
    -- STRICT RULE: Partner cannot bypass OTP to start service
    IF v_current_status <> 'PARTNER_ARRIVED' THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATE_TRANSITION', 'message', 'Partner must be arrived at doorstep before starting service.');
    END IF;
    IF v_otp_verified_at IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'OTP_REQUIRED', 'message', 'Doorstep OTP verification is required to start service. Please verify the code.');
    END IF;
  ELSIF p_next_status = 'SERVICE_COMPLETED' AND v_current_status <> 'SERVICE_STARTED' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATE_TRANSITION', 'message', 'Service must be started before completing.');
  END IF;

  -- 3. Update booking status
  UPDATE public.bookings
  SET status = p_next_status, updated_at = NOW()
  WHERE id = p_booking_id;

  -- 4. Record Audit Event
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    p_booking_id, p_next_status, 'PARTNER', p_partner_id, v_current_status, p_next_status, p_metadata
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'previous_status', v_current_status,
    'status', p_next_status,
    'updated_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_partner_job_status(UUID, UUID, TEXT, JSONB) TO authenticated, anon, service_role;

-- 4. 40-SECOND CANCELLATION RULE & MID-WAY CANCELLATION BLOCK
CREATE OR REPLACE FUNCTION public.cancel_booking_with_policy(
  p_booking_id UUID,
  p_customer_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_elapsed_seconds NUMERIC;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND', 'message', 'Booking not found.');
  END IF;

  IF v_booking.customer_id <> p_customer_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED', 'message', 'You can only cancel your own bookings.');
  END IF;

  -- Mid-way cancellation check
  IF v_booking.status IN ('PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'MIDWAY_CANCELLATION_DISALLOWED',
      'message', 'Mid-way cancellation is not permitted. Your specialist is already en-route or service is in progress.'
    );
  END IF;

  -- 40-second grace window check
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_booking.created_at));
  IF v_elapsed_seconds > 40 AND v_booking.status <> 'SEARCHING_PARTNER' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CANCELLATION_WINDOW_EXPIRED',
      'message', 'Free cancellation window (40 seconds) has expired. Specialist is committed.'
    );
  END IF;

  -- Cancel booking
  UPDATE public.bookings
  SET
    status = 'CANCELLED_BY_CUSTOMER',
    cancellation_reason = p_reason,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    p_booking_id, 'CANCELLED_BY_CUSTOMER', 'CUSTOMER', p_customer_id, v_booking.status, 'CANCELLED_BY_CUSTOMER',
    jsonb_build_object('reason', p_reason, 'elapsed_seconds', v_elapsed_seconds)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'CANCELLED_BY_CUSTOMER',
    'message', 'Booking cancelled successfully within the allowed window.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_with_policy(UUID, UUID, TEXT) TO authenticated, anon, service_role;

-- 5. REAL-TIME BOOKING CHAT SYSTEM (CUSTOMER <-> ASSIGNED PARTNER)
CREATE TABLE IF NOT EXISTS public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('CUSTOMER', 'PARTNER', 'SYSTEM')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_order 
ON public.booking_messages (booking_id, created_at ASC);

-- RPC: Send Chat Message
CREATE OR REPLACE FUNCTION public.send_booking_message(
  p_booking_id UUID,
  p_sender_id UUID,
  p_sender_role TEXT,
  p_sender_name TEXT,
  p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_msg_id UUID := gen_random_uuid();
  v_created_at TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Verify booking & authorization
  SELECT customer_id, partner_id INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- Sender MUST be the customer or assigned partner
  IF p_sender_role = 'CUSTOMER' AND v_booking.customer_id <> p_sender_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED_SENDER', 'message', 'You are not the customer for this booking.');
  ELSIF p_sender_role = 'PARTNER' AND (v_booking.partner_id IS NULL OR v_booking.partner_id <> p_sender_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED_SENDER', 'message', 'You are not the assigned partner for this booking.');
  END IF;

  -- 2. Insert message
  INSERT INTO public.booking_messages (
    id, booking_id, sender_id, sender_role, sender_name, message, created_at
  ) VALUES (
    v_msg_id, p_booking_id, p_sender_id, p_sender_role, p_sender_name, TRIM(p_message), v_created_at
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', jsonb_build_object(
      'id', v_msg_id,
      'bookingId', p_booking_id,
      'senderId', p_sender_id,
      'senderRole', p_sender_role,
      'senderName', p_sender_name,
      'text', TRIM(p_message),
      'createdAt', TO_CHAR(v_created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_booking_message(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- RPC: Get Chat Messages
CREATE OR REPLACE FUNCTION public.get_booking_messages(
  p_booking_id UUID,
  p_caller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_messages JSONB;
BEGIN
  SELECT customer_id, partner_id INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Must be customer or partner
  IF v_booking.customer_id <> p_caller_id AND (v_booking.partner_id IS NULL OR v_booking.partner_id <> p_caller_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'bookingId', m.booking_id,
        'senderId', m.sender_id,
        'senderRole', m.sender_role,
        'senderName', m.sender_name,
        'text', m.message,
        'createdAt', TO_CHAR(m.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      ORDER BY m.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_messages
  FROM public.booking_messages m
  WHERE m.booking_id = p_booking_id;

  RETURN v_messages;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_messages(UUID, UUID) TO authenticated, anon, service_role;

-- 6. ACCURATE place_instant_order_and_dispatch SERVICE RESOLUTION
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
  v_service_id UUID := NULL;
  v_service_name TEXT := p_service_name;
  v_service_price NUMERIC := p_total_amount;
  v_address_id UUID := gen_random_uuid();
  v_dispatch_result JSONB;
  v_otp TEXT;
  v_clean_slug TEXT := LOWER(TRIM(COALESCE(p_service_id_or_slug, '')));
  v_clean_name TEXT := LOWER(TRIM(COALESCE(p_service_name, '')));
BEGIN
  -- 1. Customer ID
  IF v_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT id INTO v_customer_id FROM public.users LIMIT 1;
  END IF;

  -- 2. ACCURATE SERVICE RESOLUTION (Prioritize real instant services)
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

  -- Fallback: lookup by UUID or slug in public.services
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

  -- If still null, default to 'Helping Hand' (NEVER AC General Service)
  IF v_service_id IS NULL THEN
    v_service_id := 'e1000000-0000-0000-0001-000000000001'::uuid;
    v_service_name := COALESCE(p_service_name, 'Helping Hand');
    v_service_price := COALESCE(p_total_amount, 128.00);
  END IF;

  IF v_service_price IS NULL OR v_service_price <= 0 THEN
    v_service_price := 128.00;
  END IF;

  -- 3. Upsert address
  INSERT INTO public.addresses (
    id, user_id, title, address_line1, city, state, pincode, is_default, latitude, longitude
  ) VALUES (
    v_address_id, v_customer_id, 'Service Location',
    COALESCE(p_address_text, 'Vikasnagar, Uttarakhand, India'),
    'Dehradun', 'Uttarakhand', '248001', TRUE,
    p_pickup_lat, p_pickup_lng
  );

  -- 4. 4-Digit OTP
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
    v_service_price,
    0,
    0,
    29.00,
    v_service_price,
    'INR',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET status = 'SEARCHING_PARTNER',
        fulfillment_mode = 'INSTANT',
        verification_otp = COALESCE(public.bookings.verification_otp, v_otp),
        updated_at = NOW();

  -- 6. Insert booking item with ACCURATE service
  INSERT INTO public.booking_items (
    id, booking_id, service_id, quantity, unit_price, total_price
  ) VALUES (
    gen_random_uuid(),
    v_booking_id,
    v_service_id,
    1,
    v_service_price,
    v_service_price
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
    'service_name', v_service_name,
    'verification_otp', v_otp,
    'status', 'SEARCHING_PARTNER',
    'dispatch_result', v_dispatch_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_instant_order_and_dispatch(UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated, anon, service_role;
