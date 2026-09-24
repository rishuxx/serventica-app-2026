-- ==============================================================================
-- SERVENTICA — SERV-03: TRACKING SESSIONS SCHEMA & PERSISTENCE ENGINE (PHASE 3)
-- Authoritative Tracking Session Lifecycle, Debounced Location Recovery,
-- Database-level Uniqueness Constraint, Foreign Keys & State Transitions
-- ==============================================================================

-- 1. TRACKING SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'WAITING_FOR_FIRST_LOCATION' 
    CHECK (status IN (
      'WAITING_FOR_FIRST_LOCATION',
      'LIVE',
      'STALE',
      'ARRIVED',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'CANCELLED'
    )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_location_at TIMESTAMPTZ,
  last_latitude NUMERIC(10, 7),
  last_longitude NUMERIC(10, 7),
  last_heading NUMERIC(5, 2),
  last_speed NUMERIC(6, 2),
  last_accuracy NUMERIC(6, 2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PARTIAL UNIQUE INDEX: Strictly one active tracking session per booking
-- Completed/Cancelled sessions are closed, allowing clean historical audit without collision.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_tracking_session_per_booking 
ON public.tracking_sessions(booking_id) 
WHERE status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

-- 3. QUERY PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_booking ON public.tracking_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_partner ON public.tracking_sessions(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_customer ON public.tracking_sessions(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_updated ON public.tracking_sessions(updated_at DESC);

-- 4. RPC FUNCTION: GET OR CREATE AUTHORITATIVE TRACKING SESSION
-- Concurrency-safe creation or retrieval of the active tracking session
CREATE OR REPLACE FUNCTION public.get_or_create_tracking_session(
  p_booking_id UUID,
  p_partner_id UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session RECORD;
  v_booking_status TEXT;
  v_assigned_partner_id UUID;
  v_customer_id UUID;
BEGIN
  -- 1. Verify authoritative booking state
  SELECT status, partner_id, user_id INTO v_booking_status, v_assigned_partner_id, v_customer_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking_status IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_assigned_partner_id <> p_partner_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED_PARTNER', 'message', 'Partner is not assigned to this booking.');
  END IF;

  IF v_customer_id <> p_customer_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED_CUSTOMER', 'message', 'Customer does not own this booking.');
  END IF;

  -- 2. Check for existing active session
  SELECT * INTO v_session
  FROM public.tracking_sessions
  WHERE booking_id = p_booking_id 
    AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED')
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'session_id', v_session.id,
      'booking_id', v_session.booking_id,
      'status', v_session.status,
      'last_latitude', v_session.last_latitude,
      'last_longitude', v_session.last_longitude,
      'last_heading', v_session.last_heading,
      'last_location_at', v_session.last_location_at,
      'is_new', FALSE
    );
  END IF;

  -- 3. Insert new tracking session atomically
  INSERT INTO public.tracking_sessions (
    booking_id, customer_id, partner_id, status, started_at
  ) VALUES (
    p_booking_id, p_customer_id, p_partner_id, 'WAITING_FOR_FIRST_LOCATION', NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_session;

  -- If conflict race occurred, fetch the existing one
  IF v_session.id IS NULL THEN
    SELECT * INTO v_session
    FROM public.tracking_sessions
    WHERE booking_id = p_booking_id 
      AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED')
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'session_id', v_session.id,
    'booking_id', v_session.booking_id,
    'status', v_session.status,
    'last_latitude', v_session.last_latitude,
    'last_longitude', v_session.last_longitude,
    'last_heading', v_session.last_heading,
    'last_location_at', v_session.last_location_at,
    'is_new', TRUE
  );
END;
$$;

-- 5. RPC FUNCTION: UPDATE TRACKING SESSION LOCATION (DEBOUNCED RECOVERY)
CREATE OR REPLACE FUNCTION public.update_tracking_session_location(
  p_booking_id UUID,
  p_partner_id UUID,
  p_latitude NUMERIC(10, 7),
  p_longitude NUMERIC(10, 7),
  p_heading NUMERIC(5, 2) DEFAULT NULL,
  p_speed NUMERIC(6, 2) DEFAULT NULL,
  p_accuracy NUMERIC(6, 2) DEFAULT NULL,
  p_status TEXT DEFAULT 'LIVE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  UPDATE public.tracking_sessions
  SET
    last_latitude = p_latitude,
    last_longitude = p_longitude,
    last_heading = p_heading,
    last_speed = p_speed,
    last_accuracy = p_accuracy,
    last_location_at = NOW(),
    status = p_status,
    updated_at = NOW()
  WHERE booking_id = p_booking_id 
    AND partner_id = p_partner_id
    AND status NOT IN ('SERVICE_COMPLETED', 'CANCELLED');

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'ACTIVE_SESSION_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'updated_at', NOW());
END;
$$;
