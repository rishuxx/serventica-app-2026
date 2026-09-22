-- ==============================================================================
-- SERVENTICA — PHASE 6B: ORDER CANCELLATION & AUDIT TRAIL SCHEMA
-- Adds cancellation reason, cancellation timestamp, refund status & cancel RPC
-- ==============================================================================

DO $$ 
BEGIN
  -- 1. Add cancellation tracking columns to bookings table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='cancellation_reason') THEN
    ALTER TABLE public.bookings ADD COLUMN cancellation_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='cancelled_at') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='refund_status') THEN
    ALTER TABLE public.bookings ADD COLUMN refund_status TEXT DEFAULT 'NOT_APPLICABLE';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_status_cancelled ON public.bookings(status) WHERE status LIKE 'CANCELLED%';

-- ==============================================================================
-- 2. CANCEL BOOKING ATOMIC RPC
-- Validates current status, prevents collisions with started jobs,
-- initiates refund record and emits outbox event
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_booking_order(
  p_booking_id UUID,
  p_reason TEXT,
  p_cancelled_by TEXT DEFAULT 'CUSTOMER'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_new_status TEXT;
  v_payment public.payments%ROWTYPE;
  v_refund_id UUID;
BEGIN
  -- 1. Lock and fetch booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- 2. State & Collision Guard
  IF v_booking.status IN ('SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot cancel a service that has already started or completed.'
    );
  END IF;

  IF v_booking.status LIKE 'CANCELLED%' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This booking is already cancelled.'
    );
  END IF;

  v_new_status := CASE 
    WHEN p_cancelled_by = 'PARTNER' THEN 'CANCELLED_BY_PARTNER'
    WHEN p_cancelled_by = 'SYSTEM' THEN 'CANCELLED_BY_SYSTEM'
    ELSE 'CANCELLED_BY_CUSTOMER'
  END;

  -- 3. Update booking status
  UPDATE public.bookings
  SET 
    status = v_new_status,
    cancellation_reason = p_reason,
    cancelled_at = NOW(),
    refund_status = CASE 
      WHEN EXISTS (SELECT 1 FROM public.payments WHERE booking_id = p_booking_id AND status = 'CAPTURED') 
      THEN 'REFUND_INITIATED' 
      ELSE 'NOT_APPLICABLE' 
    END,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 4. Cancel active partner booking offers
  UPDATE public.partner_booking_offers
  SET status = 'CANCELLED', responded_at = NOW()
  WHERE booking_id = p_booking_id AND status = 'OFFERED';

  -- 5. If paid online, record refund entry
  SELECT * INTO v_payment
  FROM public.payments
  WHERE booking_id = p_booking_id AND status = 'CAPTURED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.refunds (
      payment_id,
      booking_id,
      amount,
      currency,
      reason,
      status,
      requested_at
    ) VALUES (
      v_payment.id,
      p_booking_id,
      v_payment.amount,
      v_payment.currency,
      p_reason,
      'PENDING',
      NOW()
    ) RETURNING id INTO v_refund_id;
  END IF;

  -- 6. Emit Outbox Event for background processing / partner push notifications
  INSERT INTO public.outbox_events (
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    status
  ) VALUES (
    'BOOKING_CANCELLED',
    'BOOKING',
    p_booking_id,
    jsonb_build_object(
      'booking_id', p_booking_id,
      'status', v_new_status,
      'reason', p_reason,
      'cancelled_by', p_cancelled_by,
      'refund_id', v_refund_id,
      'cancelled_at', NOW()
    ),
    'PENDING'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', v_new_status,
    'refund_status', CASE WHEN FOUND THEN 'REFUND_INITIATED' ELSE 'NOT_APPLICABLE' END
  );
END;
$$;
