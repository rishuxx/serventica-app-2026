-- ==============================================================================
-- SERVENTICA — PHASE 6A: PRODUCTION PAYMENT ORCHESTRATOR & OUTBOX ARCHITECTURE
-- Database Schema for Provider-Neutral Orchestration (Juspay / Razorpay / Cashfree)
-- ==============================================================================

-- 1. ENHANCE PAYMENTS TABLE WITH ORCHESTRATOR & LIFECYCLE FIELDS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='orchestrator') THEN
    ALTER TABLE public.payments ADD COLUMN orchestrator TEXT NOT NULL DEFAULT 'JUSPAY';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='processor') THEN
    ALTER TABLE public.payments ADD COLUMN processor TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='internal_payment_id') THEN
    ALTER TABLE public.payments ADD COLUMN internal_payment_id TEXT UNIQUE;
    UPDATE public.payments SET internal_payment_id = 'PAY_' || REPLACE(id::text, '-', '') WHERE internal_payment_id IS NULL;
    ALTER TABLE public.payments ALTER COLUMN internal_payment_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='version') THEN
    ALTER TABLE public.payments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_internal_id ON public.payments(internal_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_orchestrator ON public.payments(orchestrator);

-- 2. DEDICATED IDEMPOTENCY KEYS TABLE
CREATE TABLE IF NOT EXISTS public.payment_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'CREATE_PAYMENT',
  request_hash TEXT,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT unq_customer_op_key UNIQUE(customer_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON public.payment_idempotency_keys(customer_id, operation, idempotency_key);

-- 3. TRANSACTIONAL OUTBOX TABLE FOR EVENT-DRIVEN DISPATCH & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON public.outbox_events(status, available_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON public.outbox_events(aggregate_type, aggregate_id);

-- 4. PARTNER BOOKING OFFERS (RACE-SAFE DISPATCH ENGINE)
CREATE TABLE IF NOT EXISTS public.partner_booking_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'OFFERED' CHECK (status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  estimated_eta_minutes INTEGER NOT NULL DEFAULT 20,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_offers_booking ON public.partner_booking_offers(booking_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_offers_partner ON public.partner_booking_offers(partner_id, status);

-- 5. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.payment_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_booking_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own idempotency records" ON public.payment_idempotency_keys;
CREATE POLICY "Users can view own idempotency records"
  ON public.payment_idempotency_keys FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Partners can view own booking offers" ON public.partner_booking_offers;
CREATE POLICY "Partners can view own booking offers"
  ON public.partner_booking_offers FOR SELECT
  USING (auth.uid() = partner_id);

-- ==============================================================================
-- 6. ORCHESTRATOR RPC: orchestrate_booking_payment_session
-- Atomically creates booking, immutable price snapshot, outbox event, and payment session
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.orchestrate_booking_payment_session(
  p_customer_id UUID,
  p_service_id UUID,
  p_variant_id UUID,
  p_addon_ids UUID[],
  p_address_id UUID,
  p_service_area_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_payment_method TEXT,
  p_orchestrator TEXT,
  p_idempotency_key TEXT,
  p_reservation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_id UUID;
  v_booking_number TEXT;
  v_payment_id UUID;
  v_internal_payment_id TEXT;
  v_base_price NUMERIC(10, 2);
  v_variant_price NUMERIC(10, 2) := 0;
  v_addons_total NUMERIC(10, 2) := 0;
  v_platform_fee NUMERIC(10, 2) := 29.00;
  v_insurance_fee NUMERIC(10, 2) := 19.00;
  v_tax_amount NUMERIC(10, 2) := 0.00;
  v_discount_amount NUMERIC(10, 2) := 0.00;
  v_item_total NUMERIC(10, 2);
  v_total_amount NUMERIC(10, 2);
  v_amount_paise BIGINT;
  v_service_name TEXT;
  v_service_slug TEXT;
  v_variant_name TEXT;
  v_existing_response JSONB;
BEGIN
  -- 1. Check Idempotency Key
  SELECT response INTO v_existing_response
  FROM public.payment_idempotency_keys
  WHERE customer_id = p_customer_id
    AND operation = 'CREATE_PAYMENT'
    AND idempotency_key = p_idempotency_key;

  IF v_existing_response IS NOT NULL THEN
    RETURN v_existing_response;
  END IF;

  -- 2. Fetch authoritative service pricing
  SELECT name, slug, base_price
  INTO v_service_name, v_service_slug, v_base_price
  FROM public.services
  WHERE id = p_service_id AND is_active = TRUE;

  IF v_service_name IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'SERVICE_NOT_FOUND', 'message', 'Requested service is inactive or invalid.');
  END IF;

  -- 3. Variant Pricing
  IF p_variant_id IS NOT NULL THEN
    SELECT name, price INTO v_variant_name, v_variant_price
    FROM public.service_variants
    WHERE id = p_variant_id AND service_id = p_service_id AND is_active = TRUE;
  END IF;

  -- 4. Add-on Pricing
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addons_total
    FROM public.service_addons
    WHERE id = ANY(p_addon_ids) AND is_active = TRUE;
  END IF;

  -- 5. Exact Server Price Calculations
  v_item_total := COALESCE(v_variant_price, v_base_price) + v_addons_total;
  v_total_amount := (v_item_total + v_platform_fee + v_insurance_fee + v_tax_amount) - v_discount_amount;
  v_amount_paise := CAST(ROUND(v_total_amount * 100) AS BIGINT);
  
  v_booking_id := gen_random_uuid();
  v_payment_id := gen_random_uuid();
  v_booking_number := 'SRV-' || UPPER(SUBSTRING(v_booking_id::text, 1, 8));
  v_internal_payment_id := 'PAY_' || REPLACE(v_payment_id::text, '-', '');

  -- 6. Insert Pending Booking with immutable price snapshot
  INSERT INTO public.bookings (
    id,
    booking_number,
    customer_id,
    address_id,
    status,
    scheduled_start_time,
    subtotal_amount,
    tax_amount,
    discount_amount,
    platform_fee,
    total_amount,
    currency,
    created_at,
    updated_at
  )
  VALUES (
    v_booking_id,
    v_booking_number,
    p_customer_id,
    p_address_id,
    'PENDING_PAYMENT',
    p_start_at,
    v_item_total,
    v_tax_amount,
    v_discount_amount,
    (v_platform_fee + v_insurance_fee),
    v_total_amount,
    'INR',
    NOW(),
    NOW()
  );

  -- 7. Insert Booking Item
  INSERT INTO public.booking_items (
    id,
    booking_id,
    service_id,
    variant_id,
    quantity,
    unit_price,
    total_price
  )
  VALUES (
    gen_random_uuid(),
    v_booking_id,
    p_service_id,
    p_variant_id,
    1,
    COALESCE(v_variant_price, v_base_price),
    COALESCE(v_variant_price, v_base_price)
  );

  -- 8. Insert Payment Record
  INSERT INTO public.payments (
    id,
    internal_payment_id,
    booking_id,
    user_id,
    orchestrator,
    provider,
    amount,
    currency,
    status,
    payment_method,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_payment_id,
    v_internal_payment_id,
    v_booking_id,
    p_customer_id,
    COALESCE(p_orchestrator, 'JUSPAY'),
    CASE WHEN p_payment_method = 'COD' THEN 'COD' WHEN p_payment_method = 'WALLET' THEN 'WALLET' ELSE 'JUSPAY' END,
    v_total_amount,
    'INR',
    'CHECKOUT_INITIALIZED',
    p_payment_method,
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'reservation_id', p_reservation_id,
      'service_area_id', p_service_area_id,
      'price_snapshot', jsonb_build_object(
        'itemTotal', v_item_total,
        'convenienceFee', v_platform_fee,
        'safetyFee', v_insurance_fee,
        'total', v_total_amount
      )
    ),
    NOW(),
    NOW()
  );

  -- 9. Insert Initial Attempt
  INSERT INTO public.payment_attempts (
    id,
    booking_id,
    user_id,
    payment_id,
    attempt_number,
    provider,
    status,
    amount,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_booking_id,
    p_customer_id,
    v_payment_id,
    1,
    COALESCE(p_orchestrator, 'JUSPAY'),
    'CHECKOUT_INITIALIZED',
    v_total_amount,
    NOW(),
    NOW()
  );

  -- 10. Link reservation if present
  IF p_reservation_id IS NOT NULL THEN
    UPDATE public.booking_reservations
    SET booking_id = v_booking_id
    WHERE id = p_reservation_id AND user_id = p_customer_id;
  END IF;

  -- 11. Prepare Response Payload
  v_existing_response := jsonb_build_object(
    'success', TRUE,
    'paymentId', v_payment_id,
    'internalPaymentId', v_internal_payment_id,
    'bookingId', v_booking_id,
    'bookingNumber', v_booking_number,
    'orchestrator', COALESCE(p_orchestrator, 'JUSPAY'),
    'amountRupees', v_total_amount,
    'amountMinor', v_amount_paise,
    'currency', 'INR',
    'status', 'CHECKOUT_INITIALIZED',
    'expiresAt', (NOW() + INTERVAL '15 minutes')
  );

  -- 12. Save in idempotency store
  INSERT INTO public.payment_idempotency_keys (
    customer_id,
    idempotency_key,
    operation,
    response
  )
  VALUES (
    p_customer_id,
    p_idempotency_key,
    'CREATE_PAYMENT',
    v_existing_response
  );

  RETURN v_existing_response;
END;
$$;

-- ==============================================================================
-- 7. ATOMIC TRANSACTIONAL CONFIRMATION & OUTBOX TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.confirm_orchestrated_payment(
  p_payment_id UUID,
  p_provider TEXT,
  p_provider_payment_id TEXT,
  p_provider_order_id TEXT,
  p_provider_signature TEXT,
  p_payment_method TEXT DEFAULT 'UPI'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_id UUID;
  v_booking_number TEXT;
  v_customer_id UUID;
  v_amount NUMERIC(12, 2);
  v_reservation_id UUID;
  v_service_id UUID;
  v_service_name TEXT;
  v_address_id UUID;
BEGIN
  -- 1. Lock payment row
  SELECT booking_id, user_id, amount, (metadata->>'reservation_id')::UUID
  INTO v_booking_id, v_customer_id, v_amount, v_reservation_id
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_booking_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_NOT_FOUND');
  END IF;

  -- 2. Update Payment State to CAPTURED
  UPDATE public.payments
  SET
    status = 'CAPTURED',
    processor = p_provider,
    provider_payment_id = p_provider_payment_id,
    provider_order_id = p_provider_order_id,
    provider_signature = p_provider_signature,
    payment_method = p_payment_method,
    captured_at = NOW(),
    updated_at = NOW(),
    version = version + 1
  WHERE id = p_payment_id;

  -- 3. Update Booking State to CONFIRMED
  UPDATE public.bookings
  SET
    status = 'CONFIRMED',
    updated_at = NOW()
  WHERE id = v_booking_id
  RETURNING booking_number, address_id INTO v_booking_number, v_address_id;

  -- 4. Confirm Slot Reservation
  IF v_reservation_id IS NOT NULL THEN
    UPDATE public.booking_reservations
    SET
      status = 'CONFIRMED',
      updated_at = NOW()
    WHERE id = v_reservation_id;
  END IF;

  -- 5. Fetch service details for outbox event
  SELECT bi.service_id, s.name
  INTO v_service_id, v_service_name
  FROM public.booking_items bi
  JOIN public.services s ON s.id = bi.service_id
  WHERE bi.booking_id = v_booking_id
  LIMIT 1;

  -- 6. Insert Outbox Event for Asynchronous Partner Dispatch & Push Notifications
  INSERT INTO public.outbox_events (
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    status
  )
  VALUES (
    'BOOKING_CONFIRMED',
    'BOOKING',
    v_booking_id,
    jsonb_build_object(
      'bookingId', v_booking_id,
      'bookingNumber', v_booking_number,
      'customerId', v_customer_id,
      'paymentId', p_payment_id,
      'serviceId', v_service_id,
      'serviceName', v_service_name,
      'amount', v_amount,
      'confirmedAt', NOW()
    ),
    'PENDING'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'bookingId', v_booking_id,
    'bookingNumber', v_booking_number,
    'paymentId', p_payment_id,
    'transactionId', p_provider_payment_id,
    'amount', v_amount,
    'status', 'CAPTURED'
  );
END;
$$;
