-- ==============================================================================
-- SERVENTICA — DATABASE SECURITY HARDENING MIGRATION
-- Migration: 20261010000001_security_hardening_rpcs_and_grants.sql
--
-- Objective:
--   1. Revoke public/anon execute on sensitive SECURITY DEFINER RPCs (DB-SEC-01)
--   2. Restrict maintenance & cleanup functions strictly to service_role
--   3. Enforce strict caller identity (auth.uid()) verification on payment & booking RPCs
--   4. Enable RLS and verify policies across operational and ledger tables
-- ==============================================================================

-- 1. REVOKE PUBLIC EXECUTE PRIVILEGES FROM ANON ROLE
-- Prevents unauthenticated attackers holding the public anon key from invoking state-mutating functions

-- Financial & Payment Confirmation RPCs
REVOKE EXECUTE ON FUNCTION public.confirm_orchestrated_payment(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.verify_and_confirm_booking(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM anon, public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'authoritative_capture_payment') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.authoritative_capture_payment(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, public';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'authoritative_process_refund') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.authoritative_process_refund(UUID, UUID, BIGINT, TEXT, UUID, TEXT) FROM anon, public';
  END IF;
END $$;

-- Fulfillment & Dispatch RPCs
REVOKE EXECUTE ON FUNCTION public.authoritative_confirm_booking(UUID, TEXT, UUID, UUID, UUID, TIMESTAMPTZ, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, TEXT, JSONB) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.authoritative_reassign_partner(UUID, TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.authoritative_start_service(UUID, UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.authoritative_complete_service(UUID, UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.authoritative_cancel_booking(UUID, TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_order(UUID, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_dispatch_offer(UUID, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_dispatch_offer(UUID, UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transition_partner_job_status(UUID, UUID, TEXT, JSONB) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_instant_dispatch_wave(UUID, UUID, NUMERIC, NUMERIC, INT, INT) FROM anon, public;

-- Live Tracking & Presence Heartbeats
REVOKE EXECUTE ON FUNCTION public.update_partner_presence_heartbeat(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_tracking_session_location(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.authoritative_mark_partner_arrived(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_or_create_tracking_session(UUID, UUID, UUID) FROM anon, public;

-- Maintenance & Retention: Restricted strictly to service_role (Scheduled Cron)
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_tracking_data(INT, INT, INT) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tracking_data(INT, INT, INT) TO service_role;

-- Grant EXECUTE to authenticated users for client-invoked operations
GRANT EXECUTE ON FUNCTION public.confirm_orchestrated_payment(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_confirm_booking(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_booking_payment_order(UUID, UUID, UUID, UUID[], UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orchestrate_booking_payment_session(UUID, UUID, UUID, UUID[], UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_booking_slot(UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_or_refresh_device_token(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 2. HARDEN CALLER AUTHORIZATION ON SENSITIVE RPCs

-- Ensure create_booking_payment_order verifies auth.uid() == p_user_id
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
  -- Strict Caller Verification
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller (%) cannot create booking for user (%)', auth.uid(), p_user_id;
  END IF;

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

  -- 8. Insert Initial Payment Record
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

-- 3. ENABLE ROW LEVEL SECURITY & AUDIT POLICIES
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracking_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reconciliation_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own invoices
DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
CREATE POLICY "Customers can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = customer_id);

-- System audit logs: restrict to service role
DROP POLICY IF EXISTS "Service role manages tracking audit logs" ON public.tracking_audit_log;
CREATE POLICY "Service role manages tracking audit logs" ON public.tracking_audit_log
  FOR ALL USING (auth.role() = 'service_role');
