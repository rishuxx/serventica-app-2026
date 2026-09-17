-- ==============================================================================
-- SERVENTICA — PHASE 6: PRODUCTION BOOKING & REAL PAYMENT TRANSACTION SYSTEM
-- ==============================================================================

-- 1. UPGRADE PAYMENTS TABLE (Safely add Phase 6 columns to existing payments table)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'RAZORPAY',
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist even if table was created in an earlier migration
DO $$ 
BEGIN
  -- If user_id column doesn't exist, create it (or alias customer_id if present)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='user_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='customer_id') THEN
      ALTER TABLE public.payments ADD COLUMN user_id UUID;
      UPDATE public.payments SET user_id = customer_id WHERE user_id IS NULL;
      ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;
    ELSE
      ALTER TABLE public.payments ADD COLUMN user_id UUID;
    END IF;
  END IF;

  -- Add remaining Phase 6 production payment columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_order_id') THEN
    ALTER TABLE public.payments ADD COLUMN provider_order_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_payment_id') THEN
    ALTER TABLE public.payments ADD COLUMN provider_payment_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_signature') THEN
    ALTER TABLE public.payments ADD COLUMN provider_signature TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='payment_method') THEN
    ALTER TABLE public.payments ADD COLUMN payment_method TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='payment_method_details') THEN
    ALTER TABLE public.payments ADD COLUMN payment_method_details JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_status') THEN
    ALTER TABLE public.payments ADD COLUMN provider_status TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_error_code') THEN
    ALTER TABLE public.payments ADD COLUMN provider_error_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_error_description') THEN
    ALTER TABLE public.payments ADD COLUMN provider_error_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='authorized_at') THEN
    ALTER TABLE public.payments ADD COLUMN authorized_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='captured_at') THEN
    ALTER TABLE public.payments ADD COLUMN captured_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='failed_at') THEN
    ALTER TABLE public.payments ADD COLUMN failed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='cancelled_at') THEN
    ALTER TABLE public.payments ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='refunded_at') THEN
    ALTER TABLE public.payments ADD COLUMN refunded_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='metadata') THEN
    ALTER TABLE public.payments ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON public.payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment ON public.payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 2. PAYMENT AUDIT EVENTS TABLE (Webhooks & Provider Callbacks)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'RAZORPAY',
  event_type TEXT NOT NULL,
  provider_event_id TEXT UNIQUE,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON public.payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event_id ON public.payment_events(provider_event_id);

-- 3. PAYMENT ATTEMPTS (For retry traceability without overwriting history)
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'RAZORPAY',
  provider_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'CREATED',
  amount NUMERIC(12, 2) NOT NULL,
  failure_code TEXT,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking ON public.payment_attempts(booking_id, attempt_number);

-- 4. REFUNDS TABLE (Refund-Ready Architecture)
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  provider_refund_id TEXT UNIQUE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds(booking_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Customers can view their own payment and refund records (Read-Only)
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own payment attempts" ON public.payment_attempts;
CREATE POLICY "Users can view their own payment attempts"
  ON public.payment_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own refunds" ON public.refunds;
CREATE POLICY "Users can view their own refunds"
  ON public.refunds FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = refunds.payment_id AND p.user_id = auth.uid()));

-- ==============================================================================
-- 6. POSTGRESQL RPC: create_booking_payment_order
-- Atomically validates draft, recalculates authoritative price, creates pending booking and payment record
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_booking_payment_order(
  p_user_id UUID,
  p_service_id UUID,
  p_variant_id UUID,
  p_addon_ids UUID[],
  p_address_id UUID,
  p_service_area_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_payment_method TEXT,
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
  v_base_price NUMERIC(10, 2);
  v_variant_price NUMERIC(10, 2) := 0;
  v_addons_total NUMERIC(10, 2) := 0;
  v_platform_fee NUMERIC(10, 2) := 49.00;
  v_convenience_fee NUMERIC(10, 2) := 49.00;
  v_tax_amount NUMERIC(10, 2) := 0;
  v_discount_amount NUMERIC(10, 2) := 0;
  v_total_amount NUMERIC(10, 2);
  v_amount_paise BIGINT;
  v_service_name TEXT;
  v_service_slug TEXT;
  v_service_image TEXT;
  v_variant_name TEXT;
  v_existing_payment JSONB;
BEGIN
  -- 1. Idempotency Check
  SELECT jsonb_build_object(
    'success', TRUE,
    'booking_id', b.id,
    'booking_number', b.booking_number,
    'payment_id', p.id,
    'amount_rupees', p.amount,
    'amount_paise', CAST(ROUND(p.amount * 100) AS BIGINT),
    'currency', p.currency,
    'status', p.status
  ) INTO v_existing_payment
  FROM public.payments p
  JOIN public.bookings b ON b.id = p.booking_id
  WHERE p.user_id = p_user_id
    AND p.metadata->>'idempotency_key' = p_idempotency_key
    AND p.status IN ('CREATED', 'PENDING');

  IF v_existing_payment IS NOT NULL THEN
    RETURN v_existing_payment;
  END IF;

  -- 2. Validate Service and fetch authoritative price
  SELECT name, slug, image_url, base_price
  INTO v_service_name, v_service_slug, v_service_image, v_base_price
  FROM public.services
  WHERE id = p_service_id AND is_active = TRUE;

  IF v_service_name IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'SERVICE_NOT_FOUND', 'message', 'Requested service is inactive or invalid.');
  END IF;

  -- 3. Variant Price if selected
  IF p_variant_id IS NOT NULL THEN
    SELECT name, price INTO v_variant_name, v_variant_price
    FROM public.service_variants
    WHERE id = p_variant_id AND service_id = p_service_id AND is_active = TRUE;
  END IF;

  -- 4. Addons Total if provided
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addons_total
    FROM public.service_addons
    WHERE id = ANY(p_addon_ids) AND is_active = TRUE;
  END IF;

  -- 5. Calculate Exact Server-Authoritative Total
  v_total_amount := (COALESCE(v_variant_price, v_base_price) + v_addons_total + v_platform_fee + v_convenience_fee) - v_discount_amount;
  v_amount_paise := CAST(ROUND(v_total_amount * 100) AS BIGINT);
  v_booking_number := 'SRV-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

  -- 6. Insert Pending Booking Record
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
    currency
  )
  VALUES (
    gen_random_uuid(),
    v_booking_number,
    p_user_id,
    p_address_id,
    'PENDING_PAYMENT',
    p_start_at,
    COALESCE(v_variant_price, v_base_price),
    v_tax_amount,
    v_discount_amount,
    (v_platform_fee + v_convenience_fee),
    v_total_amount,
    'INR'
  )
  RETURNING id INTO v_booking_id;

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

  -- 8. Insert Initial Payment Record (status: CREATED)
  INSERT INTO public.payments (
    id,
    booking_id,
    user_id,
    provider,
    amount,
    currency,
    status,
    payment_method,
    metadata
  )
  VALUES (
    gen_random_uuid(),
    v_booking_id,
    p_user_id,
    CASE WHEN p_payment_method = 'COD' THEN 'COD' WHEN p_payment_method = 'WALLET' THEN 'WALLET' ELSE 'RAZORPAY' END,
    v_total_amount,
    'INR',
    'CREATED',
    p_payment_method,
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'reservation_id', p_reservation_id,
      'service_area_id', p_service_area_id
    )
  )
  RETURNING id INTO v_payment_id;

  -- 9. Record Initial Attempt
  INSERT INTO public.payment_attempts (
    id,
    booking_id,
    user_id,
    payment_id,
    attempt_number,
    provider,
    status,
    amount
  )
  VALUES (
    gen_random_uuid(),
    v_booking_id,
    p_user_id,
    v_payment_id,
    1,
    CASE WHEN p_payment_method = 'COD' THEN 'COD' WHEN p_payment_method = 'WALLET' THEN 'WALLET' ELSE 'RAZORPAY' END,
    'CREATED',
    v_total_amount
  );

  -- Link reservation if present
  IF p_reservation_id IS NOT NULL THEN
    UPDATE public.booking_reservations
    SET booking_id = v_booking_id
    WHERE id = p_reservation_id AND user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'payment_id', v_payment_id,
    'amount_rupees', v_total_amount,
    'amount_paise', v_amount_paise,
    'currency', 'INR',
    'status', 'CREATED'
  );
END;
$$;

-- ==============================================================================
-- 7. POSTGRESQL RPC: verify_and_confirm_booking
-- Atomically captures payment, confirms slot reservation, and activates booking
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verify_and_confirm_booking(
  p_booking_id UUID,
  p_payment_id UUID,
  p_provider_order_id TEXT,
  p_provider_payment_id TEXT,
  p_provider_signature TEXT,
  p_payment_method TEXT DEFAULT 'UPI'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_number TEXT;
  v_amount NUMERIC(12, 2);
  v_reservation_id UUID;
BEGIN
  -- 1. Lock payment record for atomic update
  SELECT amount, (metadata->>'reservation_id')::UUID
  INTO v_amount, v_reservation_id
  FROM public.payments
  WHERE id = p_payment_id AND booking_id = p_booking_id
  FOR UPDATE;

  IF v_amount IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_RECORD_NOT_FOUND');
  END IF;

  -- 2. Update Payment Record to CAPTURED
  UPDATE public.payments
  SET
    provider_order_id = p_provider_order_id,
    provider_payment_id = p_provider_payment_id,
    provider_signature = p_provider_signature,
    status = 'CAPTURED',
    payment_method = p_payment_method,
    captured_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 3. Update Booking to CONFIRMED
  UPDATE public.bookings
  SET
    status = 'CONFIRMED',
    updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING booking_number INTO v_booking_number;

  -- 4. Confirm Reservation so slot capacity remains permanently locked
  IF v_reservation_id IS NOT NULL THEN
    UPDATE public.booking_reservations
    SET
      status = 'CONFIRMED',
      updated_at = NOW()
    WHERE id = v_reservation_id;
  END IF;

  -- 5. Record successful attempt
  UPDATE public.payment_attempts
  SET
    status = 'CAPTURED',
    provider_order_id = p_provider_order_id,
    updated_at = NOW()
  WHERE payment_id = p_payment_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'booking_number', v_booking_number,
    'payment_id', p_payment_id,
    'amount', v_amount,
    'status', 'CAPTURED',
    'transaction_id', p_provider_payment_id
  );
END;
$$;
