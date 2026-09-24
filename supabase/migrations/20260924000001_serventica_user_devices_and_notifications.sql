-- ==============================================================================
-- SERVENTICA — SERV-04: USER DEVICES, NOTIFICATION IDEMPOTENCY & GEOFENCE ENGINE
-- Device Token Registry, Notification Events Deduplication,
-- Authoritative Server-side Geofence Arrival RPC Transaction
-- ==============================================================================

-- 1. USER DEVICES TABLE
-- Registers physical client devices and their push notification tokens.
-- Supports multi-device per user, device replacement, and token invalidation.
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  push_token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_model TEXT,
  app_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_device_pair UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_lookup ON public.user_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON public.user_devices(push_token);

-- 2. NOTIFICATION EVENTS TABLE
-- Ensures strict idempotency: guarantees that arrival, assignment, or status push notifications
-- are delivered at most once per trigger, preventing duplicate alerts from multiple GPS events.
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'PARTNER_ASSIGNED',
    'PARTNER_EN_ROUTE',
    'ARRIVING_SOON',
    'PARTNER_ARRIVED',
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'BOOKING_CANCELLED'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'DELIVERED', 'FAILED')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_booking ON public.notification_events(booking_id, event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_recipient ON public.notification_events(recipient_id, created_at DESC);

-- 3. RPC: REGISTER OR REFRESH USER DEVICE TOKEN
CREATE OR REPLACE FUNCTION public.register_or_refresh_device_token(
  p_user_id UUID,
  p_platform TEXT,
  p_push_token TEXT,
  p_device_id TEXT,
  p_device_model TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS public.user_devices AS $$
DECLARE
  v_device public.user_devices;
BEGIN
  INSERT INTO public.user_devices (
    user_id,
    platform,
    push_token,
    device_id,
    device_model,
    app_version,
    is_active,
    last_seen_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_platform,
    p_push_token,
    p_device_id,
    p_device_model,
    p_app_version,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    push_token = EXCLUDED.push_token,
    platform = EXCLUDED.platform,
    device_model = COALESCE(EXCLUDED.device_model, public.user_devices.device_model),
    app_version = COALESCE(EXCLUDED.app_version, public.user_devices.app_version),
    is_active = TRUE,
    last_seen_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_device;

  RETURN v_device;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: AUTHORITATIVE SERVER-SIDE GEOFENCE ARRIVAL TRANSITION
-- Transactionally verifies that:
-- 1. Booking exists and is in a trackable en-route / assigned state.
-- 2. Partner is the authoritative assigned partner.
-- 3. Transition is atomic and idempotent (first valid trigger succeeds, duplicates return existing).
-- 4. Updates booking status, tracking session status, logs audit event, and queues arrival notification.
CREATE OR REPLACE FUNCTION public.authoritative_mark_partner_arrived(
  p_booking_id UUID,
  p_partner_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_distance_meters NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_tracking_session RECORD;
  v_idempotency_key TEXT;
  v_notification_id UUID;
  v_already_arrived BOOLEAN := FALSE;
BEGIN
  -- 1. Lock and fetch booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'BOOKING_NOT_FOUND',
      'message', 'Booking does not exist.'
    );
  END IF;

  -- 2. Verify assigned partner matches
  IF v_booking.partner_id IS DISTINCT FROM p_partner_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'UNAUTHORIZED_PARTNER',
      'message', 'Partner is not assigned to this booking.'
    );
  END IF;

  -- 3. Idempotency Check: if already ARRIVED, SERVICE_STARTED, or COMPLETED, return current state safely
  IF v_booking.status IN ('PARTNER_ARRIVED', 'SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED') THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'code', 'ALREADY_ARRIVED',
      'status', v_booking.status,
      'message', 'Booking has already transitioned to or past arrival.'
    );
  END IF;

  -- Verify current state allows arrival
  IF v_booking.status NOT IN ('PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'INVALID_STATE_TRANSITION',
      'message', 'Booking cannot transition to ARRIVED from ' || v_booking.status
    );
  END IF;

  -- 4. Perform authoritative state update to PARTNER_ARRIVED
  UPDATE public.bookings
  SET 
    status = 'PARTNER_ARRIVED',
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 5. Update active tracking session
  UPDATE public.tracking_sessions
  SET 
    status = 'ARRIVED',
    last_latitude = p_latitude,
    last_longitude = p_longitude,
    last_location_at = NOW(),
    updated_at = NOW()
  WHERE booking_id = p_booking_id
    AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  -- 6. Insert idempotent arrival notification event
  v_idempotency_key := p_booking_id::TEXT || ':PARTNER_ARRIVED';
  
  INSERT INTO public.notification_events (
    booking_id,
    recipient_id,
    event_type,
    title,
    body,
    data,
    idempotency_key,
    status
  )
  VALUES (
    p_booking_id,
    v_booking.user_id,
    'PARTNER_ARRIVED',
    'Servs Has Arrived! 📍',
    'Your verified service professional has arrived at your address.',
    jsonb_build_object(
      'bookingId', p_booking_id,
      'bookingNumber', v_booking.booking_number,
      'status', 'PARTNER_ARRIVED',
      'latitude', p_latitude,
      'longitude', p_longitude,
      'distanceMeters', p_distance_meters
    ),
    v_idempotency_key,
    'QUEUED'
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'code', 'ARRIVED_TRANSITION_SUCCESS',
    'bookingId', p_booking_id,
    'newStatus', 'PARTNER_ARRIVED',
    'arrivedAt', NOW(),
    'notificationQueued', v_notification_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
