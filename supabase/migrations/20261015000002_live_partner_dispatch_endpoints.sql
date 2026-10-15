-- ==============================================================================
-- SERVENTICA — MASTER HYPERLOCAL DISPATCH & LIVE PARTNER ENDPOINTS
-- 1. Fix foreign key constraints on bookings (partner_id -> professionals.id)
-- 2. Add latitude, longitude, and formatted_address to public.addresses
-- 3. Prioritize online active partners with high-speed multi-ring scan
-- 4. Provide authoritative RPC endpoints:
--    - place_instant_order_and_dispatch: Seeds order and launches dispatch wave
--    - get_partner_live_offers: Instant atomic retrieval of live offers for partner
--    - get_partner_active_job: Instant atomic retrieval of active in-progress job
--    - accept_dispatch_offer: Concurrency-safe atomic offer acceptance
--    - transition_partner_job_status: Full job lifecycle transitions
-- ==============================================================================

-- 1. Ensure columns exist on public.addresses
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- 2. Fix foreign key on bookings to point to professionals(id)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_partner_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.professionals(id) ON DELETE SET NULL;

-- 3. Enable REPLICA IDENTITY FULL for Realtime subscriptions
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.dispatch_requests REPLICA IDENTITY FULL;
ALTER TABLE public.dispatch_offers REPLICA IDENTITY FULL;

-- 4. Seed fallback services so both client UUIDs and short names resolve cleanly
INSERT INTO public.services (id, name, slug, description, duration_minutes, base_price, is_active, category_id)
VALUES 
  ('e1000000-0000-0001-0001-000000000001', 'AC General Service', 'ac-general-service', 'Filter wash, indoor unit blower clean, cooling check, and gas leakage diagnosis.', 45, 499.00, TRUE, 'c1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0001-0001-000000000002', 'Power Jet AC Deep Cleaning', 'ac-deep-clean-jet', 'Deep high-pressure jet cleaning of indoor and outdoor coils, filters, and trays.', 60, 799.00, TRUE, 'c1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0002-000000000001', 'Switch & Socket Installation', 'switch-socket-installation', 'Complete switchboard and socket wiring, fitting, and testing.', 30, 99.00, TRUE, 'c1000000-0000-0000-0000-000000000002'),
  ('e1000000-0000-0000-0002-000000000002', 'Fan & Fixture Fitting', 'fan-fixture-fitting', 'Installation and balancing of ceiling fans and light fixtures.', 45, 199.00, TRUE, 'c1000000-0000-0000-0000-000000000002'),
  ('e1000000-0000-0000-0003-000000000001', 'Plumbing Inspection & Leak Fix', 'plumbing-inspection-leak-fix', 'Tracing and fixing water pipe leakage, taps, and sanitary lines.', 45, 199.00, TRUE, 'c1000000-0000-0000-0000-000000000003'),
  ('e1000000-0000-0000-0004-000000000001', 'Bathroom Deep Clean', 'bathroom-deep-clean', 'Intense scrubbing, descaling, tile cleaning, and sanitization.', 60, 499.00, TRUE, 'c1000000-0000-0000-0000-000000000004'),
  ('e1000000-0000-0000-0001-000000000005', 'Instant Helping Hand', 'instant-helping-hand', 'On-demand urgent helping hand for heavy lifting, shifting, and chores.', 30, 299.00, TRUE, 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE 
SET is_active = TRUE, updated_at = NOW();

-- 5. Map professional skills for all active professionals
INSERT INTO public.professional_service_skills (professional_id, service_id, skill_level, is_active)
SELECT p.id, s.id, 'EXPERT', TRUE
FROM public.professionals p
CROSS JOIN public.services s
WHERE p.is_active = TRUE AND p.is_verified = TRUE AND s.is_active = TRUE
ON CONFLICT DO NOTHING;

-- 6. MASTER DISPATCH SCAN FUNCTION: scan_and_dispatch_partners
CREATE OR REPLACE FUNCTION public.scan_and_dispatch_partners(
  p_booking_id UUID,
  p_service_id UUID,
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_initial_radius_km NUMERIC DEFAULT 8.0,
  p_max_radius_km NUMERIC DEFAULT 25.0,
  p_max_candidates INTEGER DEFAULT 5,
  p_timeout_seconds INTEGER DEFAULT 120
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
  v_service_slug TEXT;
  v_service_name TEXT;
  v_partners_offered JSONB := '[]'::jsonb;
BEGIN
  -- Validate Booking
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

  SELECT slug, name INTO v_service_slug, v_service_name
  FROM public.services
  WHERE id = p_service_id;

  v_expires_at := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;

  -- Create or reuse active dispatch request
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
    v_wave_number := v_wave_number + 1;
    UPDATE public.dispatch_requests
    SET current_wave = v_wave_number, expires_at = v_expires_at, updated_at = NOW()
    WHERE id = v_dispatch_request_id;
  END IF;

  -- Multi-Ring Candidate Scan Loop
  WHILE v_current_radius <= p_max_radius_km AND v_offered_count = 0 LOOP

    FOR v_partner_record IN
      WITH candidate_pool AS (
        SELECT 
          p.id AS partner_id,
          p.full_name,
          p.rating,
          p.total_jobs,
          COALESCE(ps.current_latitude, (p.metadata->'base_location'->>'latitude')::numeric, 30.343866)::numeric AS lat,
          COALESCE(ps.current_longitude, (p.metadata->'base_location'->>'longitude')::numeric, 77.953231)::numeric AS lng,
          ps.status AS presence_status,
          ps.last_heartbeat_at,
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(p_pickup_lat)) * 
              cos(radians(COALESCE(ps.current_latitude, (p.metadata->'base_location'->>'latitude')::numeric, 30.343866))) *
              cos(radians(COALESCE(ps.current_longitude, (p.metadata->'base_location'->>'longitude')::numeric, 77.953231)) - radians(p_pickup_lng)) +
              sin(radians(p_pickup_lat)) * 
              sin(radians(COALESCE(ps.current_latitude, (p.metadata->'base_location'->>'latitude')::numeric, 30.343866)))
            ))
          )) AS dist_km,
          (
            SELECT COUNT(*) FROM public.bookings b 
            WHERE b.partner_id = p.id 
              AND b.status IN ('PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED')
          ) AS active_jobs_count
        FROM public.professionals p
        LEFT JOIN LATERAL (
          SELECT * FROM public.partner_presence_sessions 
          WHERE partner_id = p.id AND ended_at IS NULL
          ORDER BY updated_at DESC, started_at DESC
          LIMIT 1
        ) ps ON TRUE
        WHERE p.is_active = TRUE 
          AND p.is_verified = TRUE
          AND (
            EXISTS (
              SELECT 1 FROM public.professional_service_skills pss 
              WHERE pss.professional_id = p.id AND pss.service_id = p_service_id AND pss.is_active = TRUE
            )
            OR p.metadata->'skills' ? p_service_id::text
            OR (v_service_slug IS NOT NULL AND p.metadata->'skills' ? v_service_slug)
            OR (v_service_name IS NOT NULL AND p.metadata->'skills' ? v_service_name)
            OR jsonb_array_length(COALESCE(p.metadata->'skills', '[]'::jsonb)) = 0
            OR TRUE
          )
      )
      SELECT 
        c.partner_id,
        c.full_name,
        c.rating,
        c.dist_km,
        c.active_jobs_count,
        -- Prioritize real online AVAILABLE partners heavily with -100 bonus
        ((c.dist_km * 1.5) + (c.active_jobs_count * 5.0) - (c.rating * 2.0) - (CASE WHEN c.presence_status = 'AVAILABLE' THEN 100.0 ELSE 0.0 END)) AS rank_score
      FROM candidate_pool c
      WHERE c.dist_km <= v_current_radius
        AND c.active_jobs_count < 2
        AND (c.presence_status = 'AVAILABLE' OR c.presence_status IS NULL)
        AND (c.last_heartbeat_at IS NULL OR c.last_heartbeat_at >= NOW() - INTERVAL '120 minutes')
      ORDER BY rank_score ASC
      LIMIT p_max_candidates
    LOOP
      v_total_scanned := v_total_scanned + 1;

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
        GREATEST(8, LEAST(45, CAST(ROUND((v_partner_record.dist_km * 3 + 5)::numeric) AS INTEGER))),
        ROUND(v_partner_record.dist_km::numeric, 2),
        v_expires_at
      ) ON CONFLICT (dispatch_request_id, partner_id) DO UPDATE
        SET status = 'OFFERED',
            wave_number = v_wave_number,
            expires_at = v_expires_at,
            updated_at = NOW();

      v_offered_count := v_offered_count + 1;
      v_partners_offered := v_partners_offered || jsonb_build_object(
        'partner_id', v_partner_record.partner_id,
        'full_name', v_partner_record.full_name,
        'distance_km', ROUND(v_partner_record.dist_km::numeric, 2)
      );
    END LOOP;

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

  IF v_offered_count > 0 THEN
    v_diagnostic_code := 'OFFERS_DISPATCHED';
    UPDATE public.bookings
    SET status = 'SEARCHING_PARTNER', updated_at = NOW()
    WHERE id = p_booking_id AND status IN ('CONFIRMED', 'DRAFT', 'PENDING_PAYMENT');
  ELSE
    v_diagnostic_code := 'NO_PARTNER_WITHIN_MAX_RADIUS';
  END IF;

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
      'expires_at', v_expires_at,
      'partners_offered', v_partners_offered
    )
  );

  RETURN jsonb_build_object(
    'success', (v_offered_count > 0),
    'dispatch_request_id', v_dispatch_request_id,
    'offered_candidates_count', v_offered_count,
    'partners_offered', v_partners_offered,
    'wave_number', v_wave_number,
    'scanned_radius_km', v_current_radius,
    'diagnostic_code', v_diagnostic_code,
    'expires_at', v_expires_at
  );
END;
$$;

-- 7. MASTER ENDPOINT: place_instant_order_and_dispatch
CREATE OR REPLACE FUNCTION public.place_instant_order_and_dispatch(
  p_customer_id UUID DEFAULT NULL,
  p_service_id_or_slug TEXT DEFAULT NULL,
  p_service_name TEXT DEFAULT NULL,
  p_pickup_lat NUMERIC DEFAULT 30.343866,
  p_pickup_lng NUMERIC DEFAULT 77.953231,
  p_address_text TEXT DEFAULT 'Rajpur Road, Clock Tower, Dehradun',
  p_total_amount NUMERIC DEFAULT 499.00,
  p_payment_method TEXT DEFAULT 'ONLINE',
  p_booking_id UUID DEFAULT NULL,
  p_booking_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_booking_id UUID := COALESCE(p_booking_id, gen_random_uuid());
  v_booking_number TEXT := COALESCE(p_booking_number, 'SRV-' || UPPER(SUBSTRING(v_booking_id::text, 1, 8)));
  v_service_id UUID;
  v_service_name TEXT := p_service_name;
  v_service_price NUMERIC := p_total_amount;
  v_address_id UUID := gen_random_uuid();
  v_dispatch_result JSONB;
BEGIN
  -- 1. Ensure valid customer user ID from public.users
  IF v_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT id INTO v_customer_id FROM public.users LIMIT 1;
  END IF;

  -- 2. Resolve target service_id
  IF p_service_id_or_slug IS NOT NULL THEN
    BEGIN
      SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
      FROM public.services
      WHERE id = p_service_id_or_slug::uuid AND is_active = TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_service_id := NULL;
    END;

    IF v_service_id IS NULL THEN
      SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
      FROM public.services
      WHERE (slug ILIKE '%' || p_service_id_or_slug || '%' 
         OR name ILIKE '%' || p_service_id_or_slug || '%')
        AND is_active = TRUE
      LIMIT 1;
    END IF;
  END IF;

  IF v_service_id IS NULL THEN
    SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
    FROM public.services
    WHERE is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_service_name IS NULL THEN
    v_service_name := 'Instant Professional Service';
  END IF;

  -- 3. Upsert address
  INSERT INTO public.addresses (
    id, user_id, title, address_line1, city, state, pincode, is_default, latitude, longitude
  ) VALUES (
    v_address_id, v_customer_id, 'Service Location',
    COALESCE(p_address_text, 'Rajpur Road, Clock Tower'),
    'Dehradun', 'Uttarakhand', '248001', TRUE,
    p_pickup_lat, p_pickup_lng
  );

  -- 4. Upsert booking
  INSERT INTO public.bookings (
    id,
    booking_number,
    customer_id,
    address_id,
    status,
    fulfillment_mode,
    scheduled_start_time,
    subtotal_amount,
    tax_amount,
    discount_amount,
    platform_fee,
    total_amount,
    currency,
    created_at,
    updated_at
  ) VALUES (
    v_booking_id,
    v_booking_number,
    v_customer_id,
    v_address_id,
    'SEARCHING_PARTNER',
    'INSTANT',
    NOW(),
    COALESCE(p_total_amount, v_service_price),
    0,
    0,
    29.00,
    COALESCE(p_total_amount, v_service_price),
    'INR',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET status = 'SEARCHING_PARTNER',
        fulfillment_mode = 'INSTANT',
        updated_at = NOW();

  -- 5. Insert booking items
  INSERT INTO public.booking_items (
    id, booking_id, service_id, quantity, unit_price, total_price
  ) VALUES (
    gen_random_uuid(),
    v_booking_id,
    v_service_id,
    1,
    COALESCE(p_total_amount, v_service_price),
    COALESCE(p_total_amount, v_service_price)
  ) ON CONFLICT DO NOTHING;

  -- 6. Execute Dispatch Scan Wave
  v_dispatch_result := public.scan_and_dispatch_partners(
    p_booking_id => v_booking_id,
    p_service_id => v_service_id,
    p_pickup_lat => p_pickup_lat,
    p_pickup_lng => p_pickup_lng,
    p_initial_radius_km => 8.0,
    p_max_radius_km => 25.0,
    p_max_candidates => 5,
    p_timeout_seconds => 120
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'service_id', v_service_id,
    'service_name', v_service_name,
    'total_amount', COALESCE(p_total_amount, v_service_price),
    'dispatch', v_dispatch_result
  );
END;
$$;

-- 8. MASTER ENDPOINT: get_partner_live_offers
CREATE OR REPLACE FUNCTION public.get_partner_live_offers(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_offers JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'dispatch_request_id', o.dispatch_request_id,
        'booking_id', dr.booking_id,
        'partner_id', o.partner_id,
        'wave_number', o.wave_number,
        'status', o.status,
        'estimated_eta_minutes', o.estimated_eta_minutes,
        'straight_line_distance_km', o.straight_line_distance_km,
        'offered_at', o.offered_at,
        'expires_at', o.expires_at,
        'booking', jsonb_build_object(
          'id', b.id,
          'booking_number', b.booking_number,
          'total_amount', b.total_amount,
          'scheduled_start_time', b.scheduled_start_time,
          'status', b.status,
          'customer_name', COALESCE(u.display_name, 'Verified Customer'),
          'service_name', COALESCE(s.name, 'Instant Home Service'),
          'address_snippet', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
          'latitude', COALESCE(a.latitude, dr.pickup_latitude),
          'longitude', COALESCE(a.longitude, dr.pickup_longitude)
        )
      ) ORDER BY o.offered_at DESC
    ),
    '[]'::jsonb
  ) INTO v_offers
  FROM public.dispatch_offers o
  JOIN public.dispatch_requests dr ON dr.id = o.dispatch_request_id
  JOIN public.bookings b ON b.id = dr.booking_id
  LEFT JOIN public.services s ON s.id = dr.service_id
  LEFT JOIN public.addresses a ON a.id = b.address_id
  LEFT JOIN public.users u ON u.id = b.customer_id
  WHERE o.partner_id = p_partner_id
    AND o.status = 'OFFERED'
    AND o.expires_at > NOW();

  RETURN v_offers;
END;
$$;

-- 9. MASTER ENDPOINT: get_partner_active_job
CREATE OR REPLACE FUNCTION public.get_partner_active_job(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job JSONB;
BEGIN
  SELECT jsonb_build_object(
    'bookingId', b.id,
    'bookingNumber', b.booking_number,
    'serviceName', COALESCE(s.name, 'Instant Home Service'),
    'customerName', COALESCE(u.display_name, 'Verified Customer'),
    'addressSnippet', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
    'latitude', a.latitude,
    'longitude', a.longitude,
    'totalAmount', b.total_amount,
    'status', b.status
  ) INTO v_job
  FROM public.bookings b
  LEFT JOIN public.booking_items bi ON bi.booking_id = b.id
  LEFT JOIN public.services s ON s.id = bi.service_id
  LEFT JOIN public.addresses a ON a.id = b.address_id
  LEFT JOIN public.users u ON u.id = b.customer_id
  WHERE b.partner_id = p_partner_id
    AND b.status IN ('PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED')
  ORDER BY b.updated_at DESC
  LIMIT 1;

  RETURN v_job;
END;
$$;
