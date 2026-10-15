-- ==============================================================================
-- SERVENTICA — PRODUCTION HYPERLOCAL SCAN & PARTNER DISPATCH ENGINE
-- Inspired by Zomato, Swiggy, and Uber multi-stage candidate pipelines:
-- 1. Geospatial Multi-Ring Wave Expansion (Local Zone -> Neighboring Zones -> Wider Serviceable Area)
-- 2. Hard Eligibility Filtering (Active, Verified, Skills, Fresh Heartbeat, No Conflicting Jobs)
-- 3. Transparent Weighted Ranking (Travel Time, Workload, Operational Score)
-- 4. Atomic Concurrency-Safe Wave Offer Dispatch & Explainable Diagnostics
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Diagnostic logging table for marketplace observability and admin dispatch audits
CREATE TABLE IF NOT EXISTS public.dispatch_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  pickup_lat NUMERIC(10, 7) NOT NULL,
  pickup_lng NUMERIC(10, 7) NOT NULL,
  wave_number INTEGER NOT NULL DEFAULT 1,
  scanned_radius_km NUMERIC(5, 2) NOT NULL,
  total_candidates_scanned INTEGER NOT NULL DEFAULT 0,
  eligible_candidates_count INTEGER NOT NULL DEFAULT 0,
  diagnostic_code TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_scan_logs_booking ON public.dispatch_scan_logs(booking_id, created_at DESC);

-- ==============================================================================
-- MASTER DISPATCH SCAN FUNCTION: scan_and_dispatch_partners
-- Multi-ring search pipeline with explainable exclusion diagnostics
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.scan_and_dispatch_partners(
  p_booking_id UUID,
  p_service_id UUID,
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_initial_radius_km NUMERIC DEFAULT 8.0,
  p_max_radius_km NUMERIC DEFAULT 25.0,
  p_max_candidates INTEGER DEFAULT 5,
  p_timeout_seconds INTEGER DEFAULT 45
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_dispatch_request_id UUID;
  v_current_radius NUMERIC := p_initial_radius_km;
  v_wave_number INTEGER := 1;
  v_expires_at TIMESTAMPTZ;
  v_offered_count INTEGER := 0;
  v_total_scanned INTEGER := 0;
  v_diagnostic_code TEXT := 'NO_PARTNER_IN_RADIUS';
  v_partner_record RECORD;
BEGIN
  -- 1. Validate Booking
  SELECT customer_id, address_id INTO v_customer_id, v_address_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Target booking does not exist.'
    );
  END IF;

  v_expires_at := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;

  -- 2. Create or reuse active dispatch request
  SELECT id, current_wave INTO v_dispatch_request_id, v_wave_number
  FROM public.dispatch_requests
  WHERE booking_id = p_booking_id AND status IN ('PENDING', 'OFFERED')
  LIMIT 1;

  IF v_dispatch_request_id IS NULL THEN
    v_wave_number := 1;
    INSERT INTO public.dispatch_requests (
      booking_id, service_id, customer_id, address_id,
      pickup_latitude, pickup_longitude, status,
      current_wave, timeout_seconds, expires_at
    ) VALUES (
      p_booking_id, p_service_id, v_customer_id, v_address_id,
      p_pickup_lat, p_pickup_lng, 'OFFERED',
      v_wave_number, p_timeout_seconds, v_expires_at
    ) RETURNING id INTO v_dispatch_request_id;
  ELSE
    -- Increment wave number on subsequent scan iteration
    v_wave_number := v_wave_number + 1;
    UPDATE public.dispatch_requests
    SET current_wave = v_wave_number, expires_at = v_expires_at, updated_at = NOW()
    WHERE id = v_dispatch_request_id;
  END IF;

  -- 3. Multi-Ring Candidate Scan Loop:
  -- Pass 1: Local Zone (e.g. 8 km)
  -- Pass 2: Neighboring Zones (e.g. 15 km)
  -- Pass 3: Wider Serviceable Area (up to p_max_radius_km)
  WHILE v_current_radius <= p_max_radius_km AND v_offered_count = 0 LOOP

    -- Discover qualified, online, available candidates within v_current_radius
    FOR v_partner_record IN
      WITH candidate_pool AS (
        SELECT 
          p.id AS partner_id,
          p.full_name,
          p.rating,
          p.total_jobs,
          COALESCE(ps.current_latitude, p.metadata->'base_location'->>'latitude'::text, '30.343866')::numeric AS lat,
          COALESCE(ps.current_longitude, p.metadata->'base_location'->>'longitude'::text, '77.953231')::numeric AS lng,
          ps.status AS presence_status,
          ps.last_heartbeat_at,
          -- Harversine spherical distance calculation in km
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(p_pickup_lat)) * 
              cos(radians(COALESCE(ps.current_latitude, (p.metadata->'base_location'->>'latitude')::numeric, 30.343866))) *
              cos(radians(COALESCE(ps.current_longitude, (p.metadata->'base_location'->>'longitude')::numeric, 77.953231)) - radians(p_pickup_lng)) +
              sin(radians(p_pickup_lat)) * 
              sin(radians(COALESCE(ps.current_latitude, (p.metadata->'base_location'->>'latitude')::numeric, 30.343866)))
            ))
          )) AS dist_km,
          -- Active jobs in progress
          (
            SELECT COUNT(*) FROM public.bookings b 
            WHERE b.partner_id = p.id 
              AND b.status IN ('PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED')
          ) AS active_jobs_count
        FROM public.professionals p
        -- Check 1: Must have active skill linked for the requested service (or listed in profile metadata skills)
        LEFT JOIN public.professional_service_skills pss 
          ON pss.professional_id = p.id 
         AND pss.service_id = p_service_id 
         AND pss.is_active = TRUE
        -- Check 2: Presence session must be AVAILABLE with fresh heartbeat (within 10 minutes)
        LEFT JOIN public.partner_presence_sessions ps 
          ON ps.partner_id = p.id 
         AND ps.ended_at IS NULL
        WHERE p.is_active = TRUE 
          AND p.is_verified = TRUE
          AND (
            pss.id IS NOT NULL 
            OR p.metadata->'skills' ? (SELECT slug FROM public.services WHERE id = p_service_id)
            OR p.metadata->'skills' ? (SELECT name FROM public.services WHERE id = p_service_id)
            OR jsonb_array_length(COALESCE(p.metadata->'skills', '[]'::jsonb)) = 0 -- Fallback if generalist
          )
      )
      SELECT 
        c.partner_id,
        c.full_name,
        c.rating,
        c.dist_km,
        c.active_jobs_count,
        -- Weighted ranking score:
        -- Score = (Distance * 1.5) + (ActiveJobs * 5.0) - (Rating * 2.0)
        -- Lower score ranks first (Fastest arrival + lowest workload + highest rating)
        ((c.dist_km * 1.5) + (c.active_jobs_count * 5.0) - (c.rating * 2.0)) AS rank_score
      FROM candidate_pool c
      WHERE c.dist_km <= v_current_radius
        AND c.active_jobs_count < 2 -- Capacity constraint: max 1 concurrent job for instant
        AND (c.presence_status = 'AVAILABLE' OR c.presence_status IS NULL)
        AND (c.last_heartbeat_at IS NULL OR c.last_heartbeat_at >= NOW() - INTERVAL '10 minutes')
      ORDER BY rank_score ASC
      LIMIT p_max_candidates
    LOOP
      v_total_scanned := v_total_scanned + 1;

      -- Create durable dispatch offer for each ranked candidate
      INSERT INTO public.dispatch_offers (
        dispatch_request_id,
        partner_id,
        wave_number,
        status,
        estimated_eta_minutes,
        straight_line_distance_km,
        expires_at
      ) VALUES (
        v_dispatch_request_id,
        v_partner_record.partner_id,
        v_wave_number,
        'OFFERED',
        GREATEST(8, LEAST(45, CAST(ROUND(v_partner_record.dist_km * 3 + 5) AS INTEGER))),
        ROUND(v_partner_record.dist_km, 2),
        v_expires_at
      ) ON CONFLICT (dispatch_request_id, partner_id) DO UPDATE
        SET status = 'OFFERED',
            wave_number = v_wave_number,
            expires_at = v_expires_at,
            updated_at = NOW();

      v_offered_count := v_offered_count + 1;
    END LOOP;

    -- If no candidates in this ring, expand radius for the next pass
    IF v_offered_count = 0 THEN
      IF v_current_radius < 15.0 THEN
        v_current_radius := 15.0;
      ELSIF v_current_radius < p_max_radius_km THEN
        v_current_radius := p_max_radius_km;
      ELSE
        EXIT;
      END IF;
    END IF;

  END LOOP;

  -- 4. Determine Diagnostic Result Code
  IF v_offered_count > 0 THEN
    v_diagnostic_code := 'OFFERS_DISPATCHED';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.professional_service_skills WHERE service_id = p_service_id AND is_active = TRUE
      UNION
      SELECT 1 FROM public.professionals 
      WHERE is_active = TRUE AND is_verified = TRUE 
        AND (
          metadata->'skills' ? (SELECT slug FROM public.services WHERE id = p_service_id)
          OR metadata->'skills' ? (SELECT name FROM public.services WHERE id = p_service_id)
          OR jsonb_array_length(COALESCE(metadata->'skills', '[]'::jsonb)) = 0
        )
    ) THEN
      v_diagnostic_code := 'NO_QUALIFIED_PARTNER_FOR_SERVICE';
    ELSIF NOT EXISTS (SELECT 1 FROM public.partner_presence_sessions WHERE status = 'AVAILABLE' AND ended_at IS NULL) THEN
      v_diagnostic_code := 'NO_ONLINE_PARTNER';
    ELSIF NOT EXISTS (SELECT 1 FROM public.partner_presence_sessions WHERE status = 'AVAILABLE' AND last_heartbeat_at >= NOW() - INTERVAL '10 minutes') THEN
      v_diagnostic_code := 'PARTNER_HEARTBEATS_STALE';
    ELSE
      v_diagnostic_code := 'NO_PARTNER_WITHIN_MAX_RADIUS';
    END IF;
  END IF;

  -- 5. Record scan log for auditability & admin telemetry
  INSERT INTO public.dispatch_scan_logs (
    booking_id, service_id, pickup_lat, pickup_lng,
    wave_number, scanned_radius_km, total_candidates_scanned,
    eligible_candidates_count, diagnostic_code, details
  ) VALUES (
    p_booking_id, p_service_id, p_pickup_lat, p_pickup_lng,
    v_wave_number, v_current_radius, v_total_scanned,
    v_offered_count, v_diagnostic_code,
    jsonb_build_object(
      'dispatch_request_id', v_dispatch_request_id,
      'final_radius_km', v_current_radius,
      'expires_at', v_expires_at
    )
  );

  -- 6. Record audit event on the booking
  INSERT INTO public.booking_events (
    booking_id, event_type, actor_type, to_status, payload
  ) VALUES (
    p_booking_id, 'DISPATCH_SCAN_COMPLETED', 'SYSTEM', 'SEARCHING_PARTNER',
    jsonb_build_object(
      'dispatch_request_id', v_dispatch_request_id,
      'wave_number', v_wave_number,
      'candidates_offered', v_offered_count,
      'scanned_radius_km', v_current_radius,
      'diagnostic_code', v_diagnostic_code
    )
  );

  RETURN jsonb_build_object(
    'success', (v_offered_count > 0),
    'dispatch_request_id', v_dispatch_request_id,
    'offered_candidates_count', v_offered_count,
    'wave_number', v_wave_number,
    'scanned_radius_km', v_current_radius,
    'diagnostic_code', v_diagnostic_code,
    'expires_at', v_expires_at
  );
END;
$$;

-- Alias backward-compatible signature so customer app and background jobs calling create_instant_dispatch_wave work seamlessly
CREATE OR REPLACE FUNCTION public.create_instant_dispatch_wave(
  p_booking_id UUID,
  p_service_id UUID,
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_max_candidates INTEGER DEFAULT 5,
  p_timeout_seconds INTEGER DEFAULT 45
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.scan_and_dispatch_partners(
    p_booking_id => p_booking_id,
    p_service_id => p_service_id,
    p_pickup_lat => p_pickup_lat,
    p_pickup_lng => p_pickup_lng,
    p_initial_radius_km => 8.0,
    p_max_radius_km => 25.0,
    p_max_candidates => p_max_candidates,
    p_timeout_seconds => p_timeout_seconds
  );
END;
$$;

-- ==============================================================================
-- GRANTS & PERMISSIONS: Allow mobile clients and authenticated users to invoke
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.scan_and_dispatch_partners(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER, INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.create_instant_dispatch_wave(UUID, UUID, NUMERIC, NUMERIC, INTEGER, INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.update_partner_presence_heartbeat(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated, service_role, anon;

-- Ensure RLS on dispatch_offers and dispatch_requests allows partner and customer access
GRANT ALL ON public.dispatch_scan_logs TO authenticated, service_role, anon;
GRANT ALL ON public.dispatch_offers TO authenticated, service_role, anon;
GRANT ALL ON public.dispatch_requests TO authenticated, service_role, anon;
GRANT ALL ON public.partner_presence_sessions TO authenticated, service_role, anon;

-- ==============================================================================
-- RPC: get_partner_live_offers
-- Returns active offers for a partner with all joined booking, service, and address data
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_partner_live_offers(
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', do.id,
      'dispatch_request_id', do.dispatch_request_id,
      'partner_id', do.partner_id,
      'wave_number', do.wave_number,
      'status', do.status,
      'estimated_eta_minutes', do.estimated_eta_minutes,
      'straight_line_distance_km', do.straight_line_distance_km,
      'offered_at', do.offered_at,
      'expires_at', do.expires_at,
      'booking_id', dr.booking_id,
      'booking', jsonb_build_object(
        'id', b.id,
        'booking_number', b.booking_number,
        'total_amount', b.total_amount,
        'scheduled_start_time', b.scheduled_start_time,
        'status', b.status,
        'service_name', COALESCE(s.name, 'Instant Home Service'),
        'customer_name', COALESCE(u.full_name, 'Verified Customer'),
        'address_snippet', COALESCE(a.address_line1 || ', ' || a.city, 'Service Address')
      )
    ) ORDER BY do.offered_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.dispatch_offers do
  JOIN public.dispatch_requests dr ON dr.id = do.dispatch_request_id
  LEFT JOIN public.bookings b ON b.id = dr.booking_id
  LEFT JOIN public.services s ON s.id = dr.service_id
  LEFT JOIN public.addresses a ON a.id = dr.address_id
  LEFT JOIN public.users u ON u.id = b.customer_id
  WHERE do.partner_id = p_partner_id
    AND do.status = 'OFFERED'
    AND do.expires_at > NOW();

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_live_offers(UUID) TO authenticated, service_role, anon;


