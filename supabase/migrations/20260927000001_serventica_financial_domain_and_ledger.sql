-- ==============================================================================
-- SERVENTICA — SERV-08: FINANCIAL INTEGRITY & DOUBLE-ENTRY LEDGER SYSTEM
-- Minor-unit integer amounts (paise), Double-Entry Accounting Ledger, Invoices,
-- Authoritative Refunds, Partner Settlement Batches & Reconciliation Exceptions
-- ==============================================================================

-- 1. EXTEND PAYMENTS WITH MINOR UNITS & LEDGER REFERENCE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='amount_minor') THEN
    ALTER TABLE public.payments ADD COLUMN amount_minor BIGINT;
    UPDATE public.payments SET amount_minor = CAST(ROUND(amount * 100) AS BIGINT) WHERE amount_minor IS NULL;
    ALTER TABLE public.payments ALTER COLUMN amount_minor SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='captured_amount_minor') THEN
    ALTER TABLE public.payments ADD COLUMN captured_amount_minor BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='refunded_amount_minor') THEN
    ALTER TABLE public.payments ADD COLUMN refunded_amount_minor BIGINT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. EXTEND REFUNDS TABLE WITH MINOR UNITS & AUDIT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='refunds' AND column_name='amount_minor') THEN
    ALTER TABLE public.refunds ADD COLUMN amount_minor BIGINT;
    UPDATE public.refunds SET amount_minor = CAST(ROUND(amount * 100) AS BIGINT) WHERE amount_minor IS NULL;
    ALTER TABLE public.refunds ALTER COLUMN amount_minor SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='refunds' AND column_name='actor_id') THEN
    ALTER TABLE public.refunds ADD COLUMN actor_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='refunds' AND column_name='idempotency_key') THEN
    ALTER TABLE public.refunds ADD COLUMN idempotency_key TEXT UNIQUE;
  END IF;
END $$;

-- 3. DOUBLE-ENTRY FINANCIAL LEDGER TABLES
-- Standard Chart of Accounts
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g. 'CUSTOMER_CLEARING', 'GATEWAY_CLEARING', 'PLATFORM_REVENUE', 'PARTNER_PAYABLE', 'TAX_LIABILITY', 'REFUND_CLEARING'
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  currency TEXT NOT NULL DEFAULT 'INR',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed standard system chart of accounts if not present
INSERT INTO public.ledger_accounts (code, name, account_type, currency, description)
VALUES 
  ('CUSTOMER_RECEIVABLE', 'Customer Accounts Receivable', 'ASSET', 'INR', 'Amounts due from customers for booked services'),
  ('GATEWAY_CLEARING', 'Payment Gateway Clearing', 'ASSET', 'INR', 'Funds held or in-transit at payment processor (Razorpay/Bank)'),
  ('PLATFORM_REVENUE', 'Serventica Platform Commission Revenue', 'REVENUE', 'INR', 'Earned platform fees and booking commissions'),
  ('PARTNER_PAYABLE', 'Partner Service Payouts Payable', 'LIABILITY', 'INR', 'Earned payouts owed to service professionals'),
  ('TAX_LIABILITY', 'Taxes Payable (GST)', 'LIABILITY', 'INR', 'Collected GST/Taxes payable to tax authorities'),
  ('REFUND_CLEARING', 'Customer Refunds Clearing', 'LIABILITY', 'INR', 'Funds reserved or disbursed for customer refunds')
ON CONFLICT (code) DO NOTHING;

-- Ledger Transactions (The journal header)
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT,
  refund_id UUID REFERENCES public.refunds(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('PAYMENT_CAPTURED', 'PARTNER_EARNING_ACCRUED', 'REFUND_PROCESSED', 'SETTLEMENT_DISBURSED', 'ADJUSTMENT')),
  reference_number TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'VOIDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx_booking ON public.ledger_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_payment ON public.ledger_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_ref ON public.ledger_transactions(reference_number);

-- Ledger Entries (Double-entry line items: debits and credits)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL REFERENCES public.ledger_accounts(code) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_acc ON public.ledger_entries(account_code);

-- 4. AUTHORITATIVE INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT,
  invoice_number TEXT UNIQUE NOT NULL,
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_minor BIGINT NOT NULL,
  tax_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'PAID', 'VOID', 'REFUNDED')),
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- 5. RECONCILIATION EXCEPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.reconciliation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PAYMENT', 'SETTLEMENT', 'REFUND')),
  internal_reference_id TEXT NOT NULL,
  provider_reference_id TEXT,
  expected_amount_minor BIGINT NOT NULL,
  actual_amount_minor BIGINT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED')),
  discrepancy_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON public.reconciliation_exceptions(status, severity);
CREATE INDEX IF NOT EXISTS idx_reconciliation_entity ON public.reconciliation_exceptions(entity_type, internal_reference_id);

-- ==============================================================================
-- 6. RPC: authoritative_capture_payment
-- Atomically captures payment, posts balanced ledger entries, and generates invoice
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.authoritative_capture_payment(
  p_booking_id UUID,
  p_payment_id UUID,
  p_provider_payment_id TEXT,
  p_provider_order_id TEXT,
  p_provider_signature TEXT,
  p_payment_method TEXT DEFAULT 'UPI',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment RECORD;
  v_booking RECORD;
  v_invoice_number TEXT;
  v_tx_id UUID;
  v_inv_id UUID;
BEGIN
  -- 1. Lock payment record
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_NOT_FOUND');
  END IF;

  -- 2. Idempotency check: If already captured, return safe success
  IF v_payment.status = 'CAPTURED' THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'code', 'ALREADY_CAPTURED',
      'payment_id', v_payment.id,
      'booking_id', p_booking_id,
      'amount_minor', v_payment.amount_minor,
      'provider_payment_id', v_payment.provider_payment_id
    );
  END IF;

  -- 3. Lock booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- 4. Mark payment CAPTURED
  UPDATE public.payments
  SET
    status = 'CAPTURED',
    captured_amount_minor = v_payment.amount_minor,
    provider_payment_id = p_provider_payment_id,
    provider_order_id = p_provider_order_id,
    provider_signature = p_provider_signature,
    payment_method = p_payment_method,
    captured_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 5. Mark booking CONFIRMED if pending payment
  IF v_booking.status IN ('DRAFT', 'PENDING_PAYMENT') THEN
    UPDATE public.bookings
    SET status = 'CONFIRMED', updated_at = NOW()
    WHERE id = p_booking_id;
  END IF;

  -- 6. Post Double-Entry Ledger Transaction:
  -- DEBIT:  GATEWAY_CLEARING (Asset increase - cash in transit at Razorpay)
  -- CREDIT: CUSTOMER_RECEIVABLE (Asset decrease - customer has paid their balance)
  INSERT INTO public.ledger_transactions (
    booking_id, payment_id, transaction_type, reference_number, description, currency
  ) VALUES (
    p_booking_id, p_payment_id, 'PAYMENT_CAPTURED',
    'TX-PAY-' || UPPER(SUBSTRING(p_payment_id::text, 1, 8)) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    'Payment capture via ' || p_payment_method || ' (' || p_provider_payment_id || ')',
    v_payment.currency
  ) RETURNING id INTO v_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_code, entry_type, amount_minor, currency)
  VALUES
    (v_tx_id, 'GATEWAY_CLEARING', 'DEBIT', v_payment.amount_minor, v_payment.currency),
    (v_tx_id, 'CUSTOMER_RECEIVABLE', 'CREDIT', v_payment.amount_minor, v_payment.currency);

  -- 7. Generate Immutable Invoice
  v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || UPPER(SUBSTRING(p_booking_id::text, 1, 6));

  INSERT INTO public.invoices (
    booking_id, customer_id, payment_id, invoice_number, pricing_snapshot,
    amount_minor, tax_minor, currency, status, issued_at, paid_at
  ) VALUES (
    p_booking_id, v_booking.customer_id, p_payment_id, v_invoice_number,
    COALESCE(v_booking.pricing_snapshot, '{}'::jsonb),
    v_payment.amount_minor,
    CAST(ROUND(COALESCE(v_booking.tax_amount, 0) * 100) AS BIGINT),
    v_payment.currency, 'PAID', NOW(), NOW()
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    payment_id = p_payment_id,
    status = 'PAID',
    paid_at = NOW()
  RETURNING id INTO v_inv_id;

  -- 8. Enqueue Outbox Event
  INSERT INTO public.fulfillment_outbox_events (
    booking_id, event_type, payload
  ) VALUES (
    p_booking_id, 'PAYMENT_CAPTURED',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'payment_id', p_payment_id,
      'amount_minor', v_payment.amount_minor,
      'invoice_number', v_invoice_number,
      'provider_payment_id', p_provider_payment_id
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'payment_id', p_payment_id,
    'invoice_number', v_invoice_number,
    'amount_minor', v_payment.amount_minor,
    'status', 'CAPTURED'
  );
END;
$$;

-- ==============================================================================
-- 7. RPC: authoritative_process_refund
-- Enforces: refund_minor <= captured_amount_minor - refunded_amount_minor,
-- posts balanced reverse ledger entries, and sets payment state.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.authoritative_process_refund(
  p_booking_id UUID,
  p_payment_id UUID,
  p_refund_amount_minor BIGINT,
  p_reason TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment RECORD;
  v_refund_id UUID;
  v_provider_refund_id TEXT;
  v_remaining_refundable BIGINT;
  v_tx_id UUID;
  v_next_status TEXT;
BEGIN
  -- 1. Lock payment row
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_NOT_FOUND');
  END IF;

  IF v_payment.status NOT IN ('CAPTURED', 'PARTIALLY_REFUNDED') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_PAYMENT_STATUS_FOR_REFUND',
      'message', 'Only captured payments can be refunded. Current status: ' || v_payment.status
    );
  END IF;

  -- 2. Verify Refundable Limits
  v_remaining_refundable := v_payment.captured_amount_minor - v_payment.refunded_amount_minor;

  IF p_refund_amount_minor <= 0 OR p_refund_amount_minor > v_remaining_refundable THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'EXCEEDS_REFUNDABLE_AMOUNT',
      'message', 'Requested refund (' || p_refund_amount_minor || ') exceeds remaining captured balance (' || v_remaining_refundable || ')'
    );
  END IF;

  -- 3. Check Idempotency Key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_refund_id FROM public.refunds WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'code', 'ALREADY_REFUNDED',
        'refund_id', v_refund_id,
        'message', 'Refund with this idempotency key already processed.'
      );
    END IF;
  END IF;

  v_provider_refund_id := 'rfnd_' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 12));

  -- 4. Record Refund Row
  INSERT INTO public.refunds (
    payment_id, booking_id, provider_refund_id, amount, amount_minor,
    currency, reason, status, actor_id, idempotency_key, processed_at
  ) VALUES (
    p_payment_id, p_booking_id, v_provider_refund_id,
    ROUND(p_refund_amount_minor / 100.0, 2), p_refund_amount_minor,
    v_payment.currency, p_reason, 'PROCESSED', p_actor_id, p_idempotency_key, NOW()
  ) RETURNING id INTO v_refund_id;

  -- 5. Update Payment Row Status and Totals
  IF (v_payment.refunded_amount_minor + p_refund_amount_minor) >= v_payment.captured_amount_minor THEN
    v_next_status := 'REFUNDED';
  ELSE
    v_next_status := 'PARTIALLY_REFUNDED';
  END IF;

  UPDATE public.payments
  SET
    refunded_amount_minor = refunded_amount_minor + p_refund_amount_minor,
    status = v_next_status,
    refunded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 6. Post Double-Entry Reversal Ledger Transaction:
  -- DEBIT:  REFUND_CLEARING (Liability decrease / clearing obligation)
  -- CREDIT: GATEWAY_CLEARING (Asset decrease - funds transferred back from gateway)
  INSERT INTO public.ledger_transactions (
    booking_id, payment_id, refund_id, transaction_type, reference_number, description, currency
  ) VALUES (
    p_booking_id, p_payment_id, v_refund_id, 'REFUND_PROCESSED',
    'TX-RFND-' || UPPER(SUBSTRING(v_refund_id::text, 1, 8)) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    'Refund processed: ' || p_reason,
    v_payment.currency
  ) RETURNING id INTO v_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_code, entry_type, amount_minor, currency)
  VALUES
    (v_tx_id, 'REFUND_CLEARING', 'DEBIT', p_refund_amount_minor, v_payment.currency),
    (v_tx_id, 'GATEWAY_CLEARING', 'CREDIT', p_refund_amount_minor, v_payment.currency);

  -- 7. Enqueue Outbox Event
  INSERT INTO public.fulfillment_outbox_events (
    booking_id, event_type, payload
  ) VALUES (
    p_booking_id, 'REFUND_PROCESSED',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'payment_id', p_payment_id,
      'refund_id', v_refund_id,
      'refund_amount_minor', p_refund_amount_minor,
      'remaining_balance_minor', (v_remaining_refundable - p_refund_amount_minor),
      'status', v_next_status
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'refund_id', v_refund_id,
    'booking_id', p_booking_id,
    'payment_id', p_payment_id,
    'refund_amount_minor', p_refund_amount_minor,
    'payment_status', v_next_status,
    'provider_refund_id', v_provider_refund_id
  );
END;
$$;
