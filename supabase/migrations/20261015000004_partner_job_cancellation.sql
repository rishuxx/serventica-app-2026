CREATE OR REPLACE FUNCTION public.cancel_partner_job(
  p_booking_id UUID,
  p_partner_id UUID,
  p_reason TEXT DEFAULT 'Partner unable to fulfill'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_booking.partner_id IS DISTINCT FROM p_partner_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED', 'message', 'You are not assigned to this job');
  END IF;

  UPDATE public.bookings
  SET status = 'CANCELLED_BY_PARTNER',
      cancellation_reason = p_reason,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    p_booking_id, 'CANCELLED_BY_PARTNER', 'PARTNER', p_partner_id, v_booking.status, 'CANCELLED_BY_PARTNER', jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'status', 'CANCELLED_BY_PARTNER');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_partner_job(UUID, UUID, TEXT) TO anon, authenticated, service_role;
