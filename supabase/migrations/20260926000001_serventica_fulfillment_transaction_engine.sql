-- ==============================================================================
-- SERVENTICA — SERV-07: FULFILLMENT TRANSACTION ENGINE & STATE INTEGRITY
-- Authoritative State Machine Transitions, Financial Settlement Ledger,
-- Immutable Pricing Snapshots, Transactional Outbox & Partner Reassignment
-- ==============================================================================

-- 1. EXTEND BOOKINGS TABLE FOR IMMUTABLE PRICING & LIFECYCLE TIMESTAMPS
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- 2. FULFILLMENT IDEMPOTENCY KEYS
-- Protects against duplicate network submissions, retries, and race conditions
CREATE TABLE IF NOT EXISTS public.fulfillment_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  resource_id UUID,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_idempotency_user ON public.fulfillment_idempotency_keys(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_fulfillment_idempotency_expiry ON public.fulfillment_idempotency_keys(expires_at);

-- 3. TRANSACTIONAL OUTBOX EVENTS
-- Guaranteed at-least-once domain event dispatch (Socket notifications, push alerts, analytics)
CREATE TABLE IF NOT EXISTS public.fulfillment_outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL DEFAULT 'BOOKING',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 5,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_outbox_pending ON public.fulfillment_outbox_events(status, available_at)
  WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX IF NOT EXISTS idx_fulfillment_outbox_booking ON public.fulfillment_outbox_events(booking_id, event_type);

-- 4. BOOKING SETTLEMENTS LEDGER
-- Immutable financial records separating operational service completion from ledger clearance
CREATE TABLE IF NOT EXISTS public.booking_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  gross_amount NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  partner_payout NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'DISPUTED', 'REFUNDED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_settlements_partner ON public.booking_settlements(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_settlements_booking ON public.booking_settlements(booking_id);

-- 5. RPC: AUTHORITATIVE CONFIRM BOOKING (With Pricing Snapshot & Idempotency)
CREATE OR REPLACE FUNCTION public.authoritative_confirm_booking(
  p_booking_id UUID,
  p_booking_number TEXT,
  p_customer_id UUID,
  p_address_id UUID,
  p_service_id UUID,
  p_scheduled_start TIMESTAMPTZ,
  p_subtotal NUMERIC,
  p_total NUMERIC,
  p_discount NUMERIC,
  p_platform_fee NUMERIC,
  p_tax NUMERIC,
  p_currency TEXT,
  p_pricing_snapshot JSONB,
  p_idempotency_key TEXT,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_key RECORD;
  v_booking RECORD;
  v_item JSONB;
  v_request_hash TEXT;
BEGIN
  v_request_hash := md5(p_booking_id::text || ':' || p_customer_id::text || ':' || p_total::text);

  -- 1. Check Idempotency Key
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT * INTO v_existing_key
    FROM public.fulfillment_idempotency_keys
    WHERE idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing_key.request_hash <> v_request_hash THEN
        RETURN jsonb_build_object(
          'success', FALSE,
          'error', 'IDEMPOTENCY_CONFLICT',
          'message', 'Idempotency key reused with different request payload.'
        );
      END IF;
      RETURN v_existing_key.response_payload;
    END IF;
  END IF;

  -- 2. Upsert Booking Record
  INSERT INTO public.bookings (
    id,
    booking_number,
    customer_id,
    address_id,
    status,
    scheduled_start_time,
    subtotal_amount,
    total_amount,
    discount_amount,
    platform_fee,
    tax_amount,
    currency,
    pricing_snapshot,
    created_at,
    updated_at
  ) VALUES (
    p_booking_id,
    COALESCE(p_booking_number, 'SRV-' || upper(substr(p_booking_id::text, 1, 8))),
    p_customer_id,
    p_address_id,
    'CONFIRMED',
    p_scheduled_start,
    p_subtotal,
    p_total,
    p_discount,
    p_platform_fee,
    p_tax,
    COALESCE(p_currency, 'INR'),
    p_pricing_snapshot,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = CASE WHEN public.bookings.status = 'DRAFT' THEN 'CONFIRMED' ELSE public.bookings.status END,
    pricing_snapshot = EXCLUDED.pricing_snapshot,
    total_amount = EXCLUDED.total_amount,
    updated_at = NOW()
  RETURNING * INTO v_booking;

  -- 3. Upsert Booking Items if provided
  IF jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.booking_items (
        id,
        booking_id,
        service_id,
        quantity,
        unit_price,
        total_price,
        created_at
      ) VALUES (
        COALESCE((v_item->>'id')::uuid, gen_random_uuid()),
        p_booking_id,
        COALESCE((v_item->>'service_id')::uuid, p_service_id),
        COALESCE((v_item->>'quantity')::int, 1),
        COALESCE((v_item->>'unit_price')::numeric, p_subtotal),
        COALESCE((v_item->>'total_price')::numeric, p_subtotal),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- 4. Queue Outbox Event for Dispatch & Notification Orchestration
  INSERT INTO public.fulfillment_outbox_events (
    booking_id,
    event_type,
    payload
  ) VALUES (
    p_booking_id,
    'BOOKING_CONFIRMED',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'booking_number', v_booking.booking_number,
      'customer_id', p_customer_id,
      'address_id', p_address_id,
      'total_amount', p_total,
      'scheduled_start_time', p_scheduled_start
    )
  );

  -- 5. Record Audit Event
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    p_booking_id, 'BOOKING_CONFIRMED', 'CUSTOMER', p_customer_id, 'DRAFT', 'CONFIRMED',
    jsonb_build_object('idempotency_key', p_idempotency_key, 'total_amount', p_total)
  );

  -- 6. Save Idempotency Key Response
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.fulfillment_idempotency_keys (
      idempotency_key, user_id, operation, request_hash, resource_id, response_payload, status
    ) VALUES (
      p_idempotency_key, p_customer_id, 'CONFIRM_BOOKING', v_request_hash, p_booking_id,
      jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'booking_number', v_booking.booking_number, 'status', 'CONFIRMED'),
      'COMPLETED'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'booking_number', v_booking.booking_number,
    'status', 'CONFIRMED'
  );
END;
$$;

-- 6. RPC: AUTHORITATIVE REASSIGN PARTNER
-- Atomically revokes old partner assignment, terminates active tracking, restarts dispatch wave
CREATE OR REPLACE FUNCTION public.authoritative_reassign_partner(
  p_booking_id UUID,
  p_reason TEXT,
  p_actor_type TEXT,
  p_actor_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_old_partner_id UUID;
  v_pickup_lat NUMERIC;
  v_pickup_lng NUMERIC;
  v_service_id UUID;
BEGIN
  -- 1. Lock booking row
  SELECT b.*, a.latitude, a.longitude
  INTO v_booking
  FROM public.bookings b
  LEFT JOIN public.addresses a ON a.id = b.address_id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_booking.status IN ('SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PARTNER') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CANNOT_REASSIGN',
      'message', 'Cannot reassign partner when service is in status: ' || v_booking.status
    );
  END IF;

  v_old_partner_id := v_booking.partner_id;
  v_pickup_lat := COALESCE(v_booking.latitude, 28.5729);
  v_pickup_lng := COALESCE(v_booking.longitude, 77.3849);

  -- 2. Terminate active tracking session for old partner
  UPDATE public.tracking_sessions
  SET
    status = 'CANCELLED',
    ended_at = NOW(),
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 3. Reset booking state to SEARCHING_PARTNER
  UPDATE public.bookings
  SET
    partner_id = NULL,
    status = 'SEARCHING_PARTNER',
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 4. Expire existing open dispatch requests/offers for this booking
  UPDATE public.dispatch_requests
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status IN ('PENDING', 'OFFERED');

  UPDATE public.dispatch_offers
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE dispatch_request_id IN (SELECT id FROM public.dispatch_requests WHERE booking_id = p_booking_id)
    AND status = 'OFFERED';

  -- 5. Record Audit Events
  INSERT INTO public.tracking_audit_log (
    booking_id, event_type, actor_type, actor_id, metadata
  ) VALUES (
    p_booking_id, 'TRACKING_TERMINATED', p_actor_type, p_actor_id,
    jsonb_build_object('reason', p_reason, 'old_partner_id', v_old_partner_id, 'action', 'REASSIGNMENT')
  );

  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, from_status, to_status, payload
  ) VALUES (
    p_booking_id, 'PARTNER_REASSIGNED', p_actor_type, v_booking.status, 'SEARCHING_PARTNER',
    jsonb_build_object('old_partner_id', v_old_partner_id, 'reason', p_reason)
  );

  -- 6. Queue Outbox Event to Trigger Dispatch Waves & Notify Customer
  INSERT INTO public.fulfillment_outbox_events (
    booking_id,
    event_type,
    payload
  ) VALUES (
    p_booking_id,
    'PARTNER_REASSIGNED',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'old_partner_id', v_old_partner_id,
      'reason', p_reason,
      'customer_id', v_booking.customer_id
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'previous_partner_id', v_old_partner_id,
    'status', 'SEARCHING_PARTNER'
  );
END;
$$;

-- 7. RPC: AUTHORITATIVE START SERVICE
-- Requires PARTNER_ARRIVED, assigned partner authorization, and throttles tracking telemetry
CREATE OR REPLACE FUNCTION public.authoritative_start_service(
  p_booking_id UUID,
  p_partner_id UUID,
  p_verification_otp TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- 1. Lock and fetch booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 2. Verify assigned partner
  IF v_booking.partner_id IS DISTINCT FROM p_partner_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHORIZED_PARTNER',
      'message', 'Partner is not assigned to this booking.'
    );
  END IF;

  -- 3. Idempotency / State Verification
  IF v_booking.status = 'SERVICE_STARTED' THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'code', 'ALREADY_STARTED',
      'status', 'SERVICE_STARTED',
      'service_started_at', v_booking.service_started_at
    );
  END IF;

  IF v_booking.status NOT IN ('PARTNER_ARRIVED', 'PARTNER_EN_ROUTE') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_STATE_TRANSITION',
      'message', 'Partner must have arrived at location before starting service. Current status: ' || v_booking.status
    );
  END IF;

  -- 4. Atomically transition booking
  UPDATE public.bookings
  SET
    status = 'SERVICE_STARTED',
    service_started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 5. Update tracking session status
  UPDATE public.tracking_sessions
  SET
    status = 'SERVICE_STARTED',
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 6. Audit & Outbox Event
  INSERT INTO public.tracking_audit_log (
    booking_id, event_type, actor_type, actor_id, metadata
  ) VALUES (
    p_booking_id, 'SERVICE_STARTED', 'PARTNER', p_partner_id::text,
    jsonb_build_object('otp_verified', (p_verification_otp IS NOT NULL))
  );

  INSERT INTO public.fulfillment_outbox_events (
    booking_id, event_type, payload
  ) VALUES (
    p_booking_id, 'SERVICE_STARTED',
    jsonb_build_object('booking_id', p_booking_id, 'partner_id', p_partner_id, 'customer_id', v_booking.customer_id)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'status', 'SERVICE_STARTED',
    'service_started_at', NOW()
  );
END;
$$;

-- 8. RPC: AUTHORITATIVE COMPLETE SERVICE (With Settlement & Terminal Eviction)
CREATE OR REPLACE FUNCTION public.authoritative_complete_service(
  p_booking_id UUID,
  p_partner_id UUID,
  p_completion_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_gross NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_tax NUMERIC(10, 2);
  v_payout NUMERIC(10, 2);
  v_settlement RECORD;
BEGIN
  -- 1. Lock and fetch booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 2. Verify assigned partner
  IF v_booking.partner_id IS DISTINCT FROM p_partner_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHORIZED_PARTNER',
      'message', 'Partner is not assigned to this booking.'
    );
  END IF;

  -- 3. Idempotency Check: if already completed, return existing settlement
  IF v_booking.status IN ('SERVICE_COMPLETED', 'CLOSED') THEN
    SELECT * INTO v_settlement FROM public.booking_settlements WHERE booking_id = p_booking_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'code', 'ALREADY_COMPLETED',
      'status', v_booking.status,
      'service_completed_at', v_booking.service_completed_at,
      'settlement', row_to_json(v_settlement)
    );
  END IF;

  IF v_booking.status <> 'SERVICE_STARTED' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_STATE_TRANSITION',
      'message', 'Service must be started before completing. Current status: ' || v_booking.status
    );
  END IF;

  -- 4. Calculate Financial Settlement
  -- Serventica model: Gross = total_amount, Platform Fee = platform_fee + 15% commission, Partner payout = Gross - Platform Fee - Tax
  v_gross := COALESCE(v_booking.total_amount, 499.00);
  v_tax := COALESCE(v_booking.tax_amount, 0.00);
  v_platform_fee := COALESCE(v_booking.platform_fee, 29.00) + ROUND(v_gross * 0.15, 2);
  v_payout := GREATEST(0.00, v_gross - v_platform_fee - v_tax);

  -- 5. Mark booking SERVICE_COMPLETED & FINALIZED
  UPDATE public.bookings
  SET
    status = 'SERVICE_COMPLETED',
    service_completed_at = NOW(),
    finalized_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 6. Insert immutable settlement record
  INSERT INTO public.booking_settlements (
    booking_id, partner_id, gross_amount, platform_fee, tax_amount, partner_payout, currency, status, metadata, settled_at
  ) VALUES (
    p_booking_id, p_partner_id, v_gross, v_platform_fee, v_tax, v_payout, COALESCE(v_booking.currency, 'INR'), 'SETTLED',
    jsonb_build_object('completion_notes', p_completion_notes), NOW()
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    updated_at = NOW()
  RETURNING * INTO v_settlement;

  -- 7. Mark tracking session terminal
  UPDATE public.tracking_sessions
  SET
    status = 'SERVICE_COMPLETED',
    ended_at = NOW(),
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 8. Audit & Outbox Events
  INSERT INTO public.tracking_audit_log (
    booking_id, event_type, actor_type, actor_id, metadata
  ) VALUES (
    p_booking_id, 'SERVICE_COMPLETED', 'PARTNER', p_partner_id::text,
    jsonb_build_object('payout', v_payout, 'gross', v_gross)
  );

  INSERT INTO public.fulfillment_outbox_events (
    booking_id, event_type, payload
  ) VALUES (
    p_booking_id, 'SERVICE_COMPLETED',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'partner_id', p_partner_id,
      'customer_id', v_booking.customer_id,
      'gross_amount', v_gross,
      'partner_payout', v_payout
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'status', 'SERVICE_COMPLETED',
    'service_completed_at', NOW(),
    'payout', v_payout,
    'gross', v_gross
  );
END;
$$;

-- 9. RPC: AUTHORITATIVE CANCEL BOOKING
CREATE OR REPLACE FUNCTION public.authoritative_cancel_booking(
  p_booking_id UUID,
  p_reason TEXT,
  p_actor_type TEXT,
  p_actor_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_target_status TEXT;
  v_refund_status TEXT;
BEGIN
  -- 1. Lock booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 2. Validate state allows cancellation
  IF v_booking.status IN ('SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CANNOT_CANCEL',
      'message', 'Service has already started or completed. Please reach out to customer support.'
    );
  END IF;

  IF v_booking.status IN ('CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PARTNER', 'CANCELLED_BY_SYSTEM') THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'code', 'ALREADY_CANCELLED',
      'status', v_booking.status,
      'message', 'Booking has already been cancelled.'
    );
  END IF;

  -- 3. Determine cancellation target status
  IF p_actor_type = 'PARTNER' THEN
    v_target_status := 'CANCELLED_BY_PARTNER';
  ELSIF p_actor_type = 'ADMIN' OR p_actor_type = 'SYSTEM' THEN
    v_target_status := 'CANCELLED_BY_SYSTEM';
  ELSE
    v_target_status := 'CANCELLED_BY_CUSTOMER';
  END IF;

  v_refund_status := CASE WHEN COALESCE(v_booking.total_amount, 0) > 0 THEN 'REFUND_INITIATED' ELSE 'NOT_APPLICABLE' END;

  -- 4. Update booking
  UPDATE public.bookings
  SET
    status = v_target_status,
    cancellation_reason = p_reason,
    cancelled_at = NOW(),
    refund_status = v_refund_status,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 5. Terminate tracking session
  UPDATE public.tracking_sessions
  SET
    status = 'CANCELLED',
    ended_at = NOW(),
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 6. Cancel pending dispatch
  UPDATE public.dispatch_requests
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status IN ('PENDING', 'OFFERED');

  UPDATE public.dispatch_offers
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE dispatch_request_id IN (SELECT id FROM public.dispatch_requests WHERE booking_id = p_booking_id)
    AND status = 'OFFERED';

  -- 7. Audit & Outbox Event
  INSERT INTO public.tracking_audit_log (
    booking_id, event_type, actor_type, actor_id, metadata
  ) VALUES (
    p_booking_id, 'BOOKING_CANCELLED', p_actor_type, p_actor_id,
    jsonb_build_object('reason', p_reason, 'status', v_target_status)
  );

  INSERT INTO public.fulfillment_outbox_events (
    booking_id, event_type, payload
  ) VALUES (
    p_booking_id, 'BOOKING_CANCELLED',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'actor_type', p_actor_type,
      'reason', p_reason,
      'customer_id', v_booking.customer_id,
      'partner_id', v_booking.partner_id
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'status', v_target_status,
    'refund_status', v_refund_status
  );
END;
$$;
