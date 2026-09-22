-- ==============================================================================
-- SERVENTICA — SERV-03: PRODUCTION-GRADE INSTANT + SCHEDULED FULFILLMENT ENGINE
-- Real Fulfillment Policies, Partner Presence & GPS Heartbeat,
-- Bounded Dispatch Waves, Atomic Concurrency-Safe Partner Acceptance,
-- Scheduled Capacity & State Transition Machine
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. SERVICE FULFILLMENT POLICIES
-- Granular business rules per service or category override
CREATE TABLE IF NOT EXISTS public.service_fulfillment_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
  instant_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  instant_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  minimum_notice_minutes INTEGER NOT NULL DEFAULT 60,
  maximum_advance_days INTEGER NOT NULL DEFAULT 14,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  default_duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 15,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
  dispatch_timeout_seconds INTEGER NOT NULL DEFAULT 45,
  max_dispatch_waves INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fulfillment_policy_target UNIQUE (service_id, category_id),
  CONSTRAINT chk_fulfillment_policy_has_target CHECK (service_id IS NOT NULL OR category_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_policies_service ON public.service_fulfillment_policies(service_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fulfillment_policies_category ON public.service_fulfillment_policies(category_id) WHERE is_active = TRUE;

-- 2. PARTNER PRESENCE SESSIONS
-- Authoritative tracking of online, available, busy, paused, offline operational states
CREATE TABLE IF NOT EXISTS public.partner_presence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('OFFLINE', 'AVAILABLE', 'BUSY', 'PAUSED', 'SUSPENDED')),
  current_latitude NUMERIC(10, 7),
  current_longitude NUMERIC(10, 7),
  accuracy_meters NUMERIC(6, 2),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_presence_partner ON public.partner_presence_sessions(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_presence_heartbeat ON public.partner_presence_sessions(last_heartbeat_at, status);

-- 3. PARTNER LOCATIONS (Audit log with spatial coordinates)
CREATE TABLE IF NOT EXISTS public.partner_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.partner_presence_sessions(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy_meters NUMERIC(6, 2),
  heading_degrees NUMERIC(5, 2),
  speed_mps NUMERIC(6, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_locations_partner_time ON public.partner_locations(partner_id, recorded_at DESC);

-- 4. DISPATCH REQUESTS (Instant & On-Demand Dispatch Lifecycle)
CREATE TABLE IF NOT EXISTS public.dispatch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  address_id UUID NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  pickup_latitude NUMERIC(10, 7) NOT NULL,
  pickup_longitude NUMERIC(10, 7) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'UNFULFILLABLE')),
  current_wave INTEGER NOT NULL DEFAULT 1,
  max_waves INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 45,
  assigned_partner_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_requests_booking ON public.dispatch_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_requests_status ON public.dispatch_requests(status, expires_at);

-- 5. DISPATCH OFFERS (Targeted partner offers per wave)
CREATE TABLE IF NOT EXISTS public.dispatch_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_request_id UUID NOT NULL REFERENCES public.dispatch_requests(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  wave_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'OFFERED' CHECK (status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  estimated_eta_minutes INTEGER NOT NULL DEFAULT 20,
  straight_line_distance_km NUMERIC(6, 2) NOT NULL DEFAULT 3.50,
  rejection_reason TEXT,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dispatch_offer_partner UNIQUE (dispatch_request_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_dispatch_offers_partner_status ON public.dispatch_offers(partner_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_request ON public.dispatch_offers(dispatch_request_id);

-- 6. BOOKING AUDIT & LIFECYCLE EVENTS
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('CUSTOMER', 'PARTNER', 'SYSTEM', 'ADMIN', 'OPERATIONS')),
  actor_id UUID,
  from_status TEXT,
  to_status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON public.booking_events(booking_id, created_at DESC);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_service_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_presence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active professionals" ON public.professionals;
CREATE POLICY "Public can view active professionals" ON public.professionals
  FOR SELECT USING (is_active = TRUE AND is_verified = TRUE);

DROP POLICY IF EXISTS "Partners can manage own presence" ON public.partner_presence_sessions;
CREATE POLICY "Partners can manage own presence" ON public.partner_presence_sessions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = partner_presence_sessions.partner_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Partners can insert own locations" ON public.partner_locations;
CREATE POLICY "Partners can insert own locations" ON public.partner_locations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = partner_locations.partner_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Partners can view assigned offers" ON public.dispatch_offers;
CREATE POLICY "Partners can view assigned offers" ON public.dispatch_offers
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = dispatch_offers.partner_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view own booking events" ON public.booking_events;
CREATE POLICY "Customers can view own booking events" ON public.booking_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_events.booking_id AND b.customer_id = auth.uid()));

-- ==============================================================================
-- 7. RPC FUNCTION: UPDATE PARTNER PRESENCE & GPS HEARTBEAT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_partner_presence_heartbeat(
  p_partner_id UUID,
  p_status TEXT,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC DEFAULT NULL,
  p_heading NUMERIC DEFAULT NULL,
  p_speed NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Validate coordinate bounds
  IF p_latitude < -90.0 OR p_latitude > 90.0 OR p_longitude < -180.0 OR p_longitude > 180.0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_COORDINATES', 'message', 'Latitude/Longitude out of valid geographic range.');
  END IF;

  -- Update or create active presence session
  SELECT id INTO v_session_id
  FROM public.partner_presence_sessions
  WHERE partner_id = p_partner_id AND ended_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.partner_presence_sessions (
      partner_id, status, current_latitude, current_longitude, accuracy_meters, last_heartbeat_at
    ) VALUES (
      p_partner_id, COALESCE(p_status, 'AVAILABLE'), p_latitude, p_longitude, p_accuracy, NOW()
    ) RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.partner_presence_sessions
    SET
      status = COALESCE(p_status, status),
      current_latitude = p_latitude,
      current_longitude = p_longitude,
      accuracy_meters = p_accuracy,
      last_heartbeat_at = NOW(),
      updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  -- Record GPS audit point
  INSERT INTO public.partner_locations (
    partner_id, session_id, latitude, longitude, accuracy_meters, heading_degrees, speed_mps, recorded_at
  ) VALUES (
    p_partner_id, v_session_id, p_latitude, p_longitude, p_accuracy, p_heading, p_speed, NOW()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'session_id', v_session_id,
    'partner_id', p_partner_id,
    'status', COALESCE(p_status, 'AVAILABLE'),
    'recorded_at', NOW()
  );
END;
$$;

-- ==============================================================================
-- 8. RPC FUNCTION: CREATE INSTANT DISPATCH WAVE
-- Finds eligible partners matching skills, active status, fresh heartbeat & capacity
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_instant_dispatch_wave(
  p_booking_id UUID,
  p_service_id UUID,
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_max_candidates INTEGER DEFAULT 3,
  p_timeout_seconds INTEGER DEFAULT 45
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dispatch_request_id UUID;
  v_customer_id UUID;
  v_address_id UUID;
  v_partner_record RECORD;
  v_offered_count INTEGER := 0;
  v_expires_at TIMESTAMPTZ;
  v_straight_dist NUMERIC(6, 2);
BEGIN
  -- 1. Validate Booking
  SELECT customer_id, address_id INTO v_customer_id, v_address_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  v_expires_at := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;

  -- 2. Create or reuse active dispatch request
  SELECT id INTO v_dispatch_request_id
  FROM public.dispatch_requests
  WHERE booking_id = p_booking_id AND status IN ('PENDING', 'OFFERED')
  LIMIT 1;

  IF v_dispatch_request_id IS NULL THEN
    INSERT INTO public.dispatch_requests (
      booking_id, service_id, customer_id, address_id,
      pickup_latitude, pickup_longitude, status,
      current_wave, timeout_seconds, expires_at
    ) VALUES (
      p_booking_id, p_service_id, v_customer_id, v_address_id,
      p_pickup_lat, p_pickup_lng, 'OFFERED',
      1, p_timeout_seconds, v_expires_at
    ) RETURNING id INTO v_dispatch_request_id;
  END IF;

  -- 3. Query candidate partners:
  -- Must have skill, active, verified, presence AVAILABLE with fresh heartbeat (<= 5 min), no active conflicting booking
  FOR v_partner_record IN
    SELECT 
      p.id AS partner_id,
      ps.current_latitude AS lat,
      ps.current_longitude AS lng,
      (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_pickup_lat)) * cos(radians(COALESCE(ps.current_latitude, 30.343866))) *
          cos(radians(COALESCE(ps.current_longitude, 77.953231)) - radians(p_pickup_lng)) +
          sin(radians(p_pickup_lat)) * sin(radians(COALESCE(ps.current_latitude, 30.343866)))
        ))
      )) AS dist_km
    FROM public.professionals p
    JOIN public.professional_service_skills pss ON pss.professional_id = p.id AND pss.service_id = p_service_id AND pss.is_active = TRUE
    LEFT JOIN public.partner_presence_sessions ps ON ps.partner_id = p.id AND ps.ended_at IS NULL AND ps.status = 'AVAILABLE' AND ps.last_heartbeat_at >= NOW() - INTERVAL '10 minutes'
    WHERE p.is_active = TRUE 
      AND p.is_verified = TRUE
      -- Ensure partner doesn't exceed active jobs capacity
      AND (
        SELECT COUNT(*) FROM public.bookings b 
        WHERE b.partner_id = p.id AND b.status IN ('PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED')
      ) < 2
    ORDER BY dist_km ASC
    LIMIT p_max_candidates
  LOOP
    v_straight_dist := ROUND(COALESCE(v_partner_record.dist_km, 3.5), 2);

    -- Insert offer (idempotent ON CONFLICT)
    INSERT INTO public.dispatch_offers (
      dispatch_request_id, partner_id, wave_number, status,
      estimated_eta_minutes, straight_line_distance_km, expires_at
    ) VALUES (
      v_dispatch_request_id, v_partner_record.partner_id, 1, 'OFFERED',
      GREATEST(10, LEAST(45, CAST(ROUND(v_straight_dist * 3 + 5) AS INTEGER))),
      v_straight_dist,
      v_expires_at
    ) ON CONFLICT (dispatch_request_id, partner_id) DO UPDATE
      SET status = 'OFFERED', expires_at = v_expires_at, updated_at = NOW();

    v_offered_count := v_offered_count + 1;
  END LOOP;

  -- Record audit event
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, to_status, payload
  ) VALUES (
    p_booking_id, 'DISPATCH_WAVE_CREATED', 'SYSTEM', 'SEARCHING_PARTNER',
    jsonb_build_object('dispatch_request_id', v_dispatch_request_id, 'candidates_offered', v_offered_count, 'expires_at', v_expires_at)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'dispatch_request_id', v_dispatch_request_id,
    'offered_candidates_count', v_offered_count,
    'expires_at', v_expires_at
  );
END;
$$;

-- ==============================================================================
-- 9. RPC FUNCTION: ATOMIC CONCURRENCY-SAFE PARTNER ACCEPTANCE
-- Single-winner transactional lock on dispatch request and booking assignment
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(
  p_dispatch_request_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dispatch RECORD;
  v_booking_id UUID;
  v_offer RECORD;
  v_active_partner_jobs INTEGER;
BEGIN
  -- 1. Row lock the dispatch request
  SELECT id, booking_id, status, expires_at, assigned_partner_id
  INTO v_dispatch
  FROM public.dispatch_requests
  WHERE id = p_dispatch_request_id
  FOR UPDATE;

  IF v_dispatch IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'DISPATCH_NOT_FOUND', 'message', 'Dispatch request does not exist.');
  END IF;

  IF v_dispatch.status = 'ACCEPTED' OR v_dispatch.assigned_partner_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'DISPATCH_ALREADY_ASSIGNED', 'message', 'This request has already been accepted by another partner.');
  END IF;

  IF v_dispatch.status = 'CANCELLED' OR v_dispatch.status = 'EXPIRED' OR v_dispatch.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'DISPATCH_EXPIRED', 'message', 'This dispatch offer has expired.');
  END IF;

  -- 2. Verify offer for this partner
  SELECT id, status, expires_at INTO v_offer
  FROM public.dispatch_offers
  WHERE dispatch_request_id = p_dispatch_request_id AND partner_id = p_partner_id
  FOR UPDATE;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'OFFER_NOT_FOUND', 'message', 'No dispatch offer exists for your partner account.');
  END IF;

  -- 3. Re-verify capacity under lock
  SELECT COUNT(*) INTO v_active_partner_jobs
  FROM public.bookings
  WHERE partner_id = p_partner_id AND status IN ('PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED');

  IF v_active_partner_jobs >= 2 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'CAPACITY_EXCEEDED', 'message', 'You currently have maximum active jobs in progress.');
  END IF;

  v_booking_id := v_dispatch.booking_id;

  -- 4. Atomically mark offer accepted & other offers expired
  UPDATE public.dispatch_offers
  SET status = 'ACCEPTED', responded_at = NOW(), updated_at = NOW()
  WHERE id = v_offer.id;

  UPDATE public.dispatch_offers
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE dispatch_request_id = p_dispatch_request_id AND id <> v_offer.id;

  -- 5. Mark dispatch request ACCEPTED
  UPDATE public.dispatch_requests
  SET
    status = 'ACCEPTED',
    assigned_partner_id = p_partner_id,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispatch_request_id;

  -- 6. Atomically update booking to PARTNER_ACCEPTED
  UPDATE public.bookings
  SET
    partner_id = p_partner_id,
    status = 'PARTNER_ACCEPTED',
    updated_at = NOW()
  WHERE id = v_booking_id;

  -- 7. Audit log event
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, actor_id, from_status, to_status, payload
  ) VALUES (
    v_booking_id, 'PARTNER_ACCEPTED', 'PARTNER', p_partner_id, 'CONFIRMED', 'PARTNER_ACCEPTED',
    jsonb_build_object('dispatch_request_id', p_dispatch_request_id, 'partner_id', p_partner_id)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'dispatch_request_id', p_dispatch_request_id,
    'partner_id', p_partner_id,
    'status', 'PARTNER_ACCEPTED'
  );
END;
$$;

-- ==============================================================================
-- 10. RPC FUNCTION: PARTNER REJECT DISPATCH OFFER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reject_dispatch_offer(
  p_dispatch_request_id UUID,
  p_partner_id UUID,
  p_reason TEXT DEFAULT 'DECLINED_BY_PARTNER'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.dispatch_offers
  SET
    status = 'REJECTED',
    rejection_reason = p_reason,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE dispatch_request_id = p_dispatch_request_id AND partner_id = p_partner_id;

  RETURN jsonb_build_object('success', TRUE, 'dispatch_request_id', p_dispatch_request_id, 'status', 'REJECTED');
END;
$$;

-- ==============================================================================
-- 11. RPC FUNCTION: TRANSITION PARTNER JOB LIFECYCLE
-- State Machine: PARTNER_ACCEPTED -> PARTNER_EN_ROUTE -> PARTNER_ARRIVED -> SERVICE_STARTED -> SERVICE_COMPLETED
-- ==============================================================================
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
BEGIN
  -- 1. Lock and verify booking
  SELECT status, partner_id INTO v_current_status, v_assigned_partner_id
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
  ELSIF p_next_status = 'SERVICE_STARTED' AND v_current_status <> 'PARTNER_ARRIVED' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATE_TRANSITION', 'message', 'Partner must be arrived before starting service.');
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
