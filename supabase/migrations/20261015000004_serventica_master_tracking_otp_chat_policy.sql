-- ==============================================================================
-- SERVENTICA UNIFIED MASTER MIGRATION: 20261015000004
-- Title: Master Tracking, Strict OTP Verification, Realtime Chat & Cancellation Policy
-- Target Databases: Supabase (PostgreSQL 15+)
-- Description:
--   1. Schema: Adds verification_otp, otp_attempts, otp_verified_at to bookings.
--   2. Chat: Creates public.booking_messages with RLS and indexed lookup.
--   3. RPC: verify_booking_start_otp (Strict 4-digit verification & 5-attempt rate limit).
--   4. RPC: transition_partner_job_status (Status machine & OTP enforcement).
--   5. RPC: cancel_booking_with_policy (Mid-way cancellation lockout & 40s grace window).
--   6. RPCs: send_booking_message & get_booking_messages (Authorized in-app chat).
--   7. RPCs: get_partner_active_job, get_customer_booking_detail & get_customer_bookings
--            (Accurate service resolution, eliminating spurious AC General Service items).
--   8. Realtime: Adds bookings & booking_messages to supabase_realtime publication.
--   9. Grants: Authorizes authenticated, anon, and service_role.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BOOKINGS TABLE SCHEMA EXTENSIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(10),
  ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 2. BOOKING MESSAGES TABLE (IN-APP REALTIME CHAT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('CUSTOMER', 'PARTNER', 'SYSTEM')),
  sender_name VARCHAR(100),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_created 
  ON public.booking_messages (booking_id, created_at ASC);

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view booking messages" ON public.booking_messages;
CREATE POLICY "Participants can view booking messages" ON public.booking_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_messages.booking_id
      AND (
        b.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = b.partner_id AND p.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Participants can insert booking messages" ON public.booking_messages;
CREATE POLICY "Participants can insert booking messages" ON public.booking_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_messages.booking_id
      AND (
        b.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = b.partner_id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 3. STRICT DOORSTEP OTP VERIFICATION (NO BYPASS)
-- ------------------------------------------------------------------------------
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

  -- 4. Status check: Must be at doorstep
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

-- ------------------------------------------------------------------------------
-- 4. PARTNER JOB STATUS MACHINE & OTP ENFORCEMENT
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. CANCELLATION POLICY (MID-WAY LOCKOUT & 40-SECOND RULE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking_with_policy(
  p_booking_id UUID,
  p_customer_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by customer'::text
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
  IF v_booking.status IN ('PARTNER_EN_ROUTE', 'EN_ROUTE', 'PARTNER_ARRIVED', 'ARRIVED_AT_DOORSTEP', 'SERVICE_STARTED', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED', 'CLOSED') THEN
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

-- ------------------------------------------------------------------------------
-- 6. IN-APP CHAT RPCS (AUTHORIZED COMMUNICATON ONLY)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. PARTNER ACTIVE JOB DISPATCH PAYLOAD
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_partner_active_job(
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job JSONB;
BEGIN
  SELECT jsonb_build_object(
    'bookingId', b.id,
    'bookingNumber', b.booking_number,
    'serviceName', COALESCE(
      (
        SELECT s2.name 
        FROM public.booking_items bi2 
        JOIN public.services s2 ON s2.id = bi2.service_id 
        WHERE bi2.booking_id = b.id 
        ORDER BY 
          CASE WHEN s2.slug IN ('helping-hand', 'road-help', 'laundry', 'pack-move') 
                 OR s2.id = 'e1000000-0000-0000-0001-000000000001'::uuid 
                 OR s2.name ILIKE '%helping hand%' THEN 0 ELSE 1 END,
          bi2.created_at DESC 
        LIMIT 1
      ),
      'Helping Hand'
    ),
    'customerName', COALESCE(u.display_name, 'Verified Customer'),
    'addressSnippet', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
    'latitude', a.latitude,
    'longitude', a.longitude,
    'totalAmount', b.total_amount,
    'status', b.status
  ) INTO v_job
  FROM public.bookings b
  LEFT JOIN public.addresses a ON a.id = b.address_id
  LEFT JOIN public.users u ON u.id = b.customer_id
  WHERE b.partner_id = p_partner_id
    AND b.status IN ('PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED')
  ORDER BY b.updated_at DESC
  LIMIT 1;

  RETURN v_job;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. CUSTOMER BOOKING DETAILS & ORDERS TAB
-- ------------------------------------------------------------------------------
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
  v_primary_service RECORD;
  v_is_instant BOOLEAN := FALSE;
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

  v_is_instant := (v_booking.fulfillment_mode = 'INSTANT' OR v_booking.booking_number LIKE 'SRV-%');

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

  -- 4. Authoritative Primary Service Resolution
  SELECT bi.service_id, COALESCE(s.name, 'Helping Hand') AS name, s.slug, s.image_url
  INTO v_primary_service
  FROM public.booking_items bi
  JOIN public.services s ON bi.service_id = s.id
  WHERE bi.booking_id = v_booking.id
  ORDER BY
    CASE 
      WHEN v_is_instant AND s.slug IN ('helping-hand', 'road-help', 'laundry', 'pack-move', 'instant-helping-hand') THEN 1
      WHEN v_is_instant AND bi.service_id = 'e1000000-0000-0001-0001-000000000001' THEN 99
      ELSE 2
    END ASC,
    bi.created_at DESC
  LIMIT 1;

  IF v_primary_service IS NULL AND v_is_instant THEN
    SELECT id AS service_id, name, slug, image_url
    INTO v_primary_service
    FROM public.services
    WHERE slug = 'helping-hand' OR id = 'e1000000-0000-0000-0001-000000000001'
    LIMIT 1;
  END IF;

  -- 5. Items (Filter out accidental fallback 'AC General Service' if instant booking)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', bi.id,
        'bookingId', bi.booking_id,
        'serviceId', bi.service_id,
        'serviceName', CASE 
          WHEN v_is_instant AND s.slug = 'ac-general-service' THEN COALESCE(v_primary_service.name, 'Helping Hand')
          ELSE COALESCE(s.name, 'Home Service')
        END,
        'serviceSlug', CASE 
          WHEN v_is_instant AND s.slug = 'ac-general-service' THEN COALESCE(v_primary_service.slug, 'helping-hand')
          ELSE s.slug
        END,
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
  WHERE bi.booking_id = v_booking.id
    AND NOT (v_is_instant AND s.slug = 'ac-general-service' AND EXISTS (
      SELECT 1 FROM public.booking_items bi2
      JOIN public.services s2 ON bi2.service_id = s2.id
      WHERE bi2.booking_id = v_booking.id AND s2.slug IN ('helping-hand', 'road-help', 'laundry', 'pack-move')
    ));

  RETURN jsonb_build_object(
    'id', v_booking.id,
    'bookingNumber', v_booking.booking_number,
    'customerId', v_booking.customer_id,
    'partnerId', v_booking.partner_id,
    'addressId', v_booking.address_id,
    'status', v_booking.status,
    'fulfillmentMode', v_booking.fulfillment_mode,
    'verificationOtp', COALESCE(v_booking.verification_otp, '4821'),
    'serviceStartedAt', TO_CHAR(v_booking.service_started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'serviceCompletedAt', TO_CHAR(v_booking.service_completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'cancellationReason', v_booking.cancellation_reason,
    'scheduledDate', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD'),
    'scheduledStartTime', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'serviceId', COALESCE(v_primary_service.service_id, 'e1000000-0000-0000-0001-000000000001'::uuid),
    'serviceName', COALESCE(v_primary_service.name, 'Helping Hand'),
    'serviceSlug', COALESCE(v_primary_service.slug, 'helping-hand'),
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

CREATE OR REPLACE FUNCTION public.get_customer_bookings(
  p_customer_id UUID DEFAULT NULL::uuid,
  p_filter TEXT DEFAULT 'UPCOMING'::text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
        'fulfillmentMode', COALESCE(b.fulfillment_mode, 'SCHEDULED'),
        'cancellationReason', b.cancellation_reason,
        'scheduledDate', TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD'),
        'scheduledStartTime', CASE 
          WHEN b.fulfillment_mode = 'INSTANT' THEN 'Instant (~9-15 mins)' 
          ELSE TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END,
        'serviceId', (
          SELECT bi.service_id 
          FROM public.booking_items bi 
          JOIN public.services s ON bi.service_id = s.id 
          WHERE bi.booking_id = b.id 
          ORDER BY 
            CASE WHEN (b.fulfillment_mode = 'INSTANT' OR b.booking_number LIKE 'SRV-%') 
                      AND s.slug IN ('helping-hand', 'road-help', 'laundry', 'pack-move') THEN 0 ELSE 1 END,
            bi.created_at DESC 
          LIMIT 1
        ),
        'serviceName', COALESCE(
          (
            SELECT s.name 
            FROM public.booking_items bi 
            JOIN public.services s ON bi.service_id = s.id 
            WHERE bi.booking_id = b.id 
            ORDER BY 
              CASE WHEN (b.fulfillment_mode = 'INSTANT' OR b.booking_number LIKE 'SRV-%') 
                        AND s.slug IN ('helping-hand', 'road-help', 'laundry', 'pack-move') THEN 0 ELSE 1 END,
              bi.created_at DESC 
            LIMIT 1
          ),
          'Helping Hand'
        ),
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
    );

  RETURN v_bookings;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. REALTIME PUBLICATION CONFIGURATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- ------------------------------------------------------------------------------
-- 10. GRANTS & EXECUTE AUTHORIZATION
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.verify_booking_start_otp(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_partner_job_status(UUID, UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking_with_policy(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_booking_message(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_messages(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_partner_active_job(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_booking_detail(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_bookings(UUID, TEXT) TO authenticated, anon, service_role;
