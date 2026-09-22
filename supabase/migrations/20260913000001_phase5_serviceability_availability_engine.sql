-- ==============================================================================
-- SERVENTICA — PHASE 5: REAL SERVICEABILITY, PARTNER AVAILABILITY,
-- TIME-SLOT ENGINE, CAPACITY & CONCURRENCY PROTECTION
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. PROFESSIONALS / PARTNERS TABLE
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.90,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professionals_active ON public.professionals(is_active, is_verified);

-- 2. PROFESSIONAL SERVICE SKILLS
CREATE TABLE IF NOT EXISTS public.professional_service_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.service_variants(id) ON DELETE CASCADE,
  skill_level TEXT DEFAULT 'STANDARD' CHECK (skill_level IN ('BEGINNER', 'STANDARD', 'EXPERT', 'MASTER')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prof_service_skill UNIQUE (professional_id, service_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_service_skills ON public.professional_service_skills(service_id, professional_id, is_active);

-- 3. PROFESSIONAL SERVICE AREAS
CREATE TABLE IF NOT EXISTS public.professional_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_area_id UUID NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prof_service_area UNIQUE (professional_id, service_area_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_service_areas ON public.professional_service_areas(service_area_id, professional_id, is_active);

-- 4. PROFESSIONAL WORKING HOURS (Supports multiple windows per day)
CREATE TABLE IF NOT EXISTS public.professional_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_prof_working_hours_valid CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_prof_working_hours ON public.professional_working_hours(professional_id, day_of_week, is_active);

-- 5. PROFESSIONAL TIME OFF / LEAVE
CREATE TABLE IF NOT EXISTS public.professional_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_prof_time_off_range CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_prof_time_off ON public.professional_time_off(professional_id, start_at, end_at) WHERE is_approved = TRUE;

-- 6. PROFESSIONAL AVAILABILITY OVERRIDES
CREATE TABLE IF NOT EXISTS public.professional_availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  availability_type TEXT NOT NULL CHECK (availability_type IN ('EXTRA_HOURS', 'BLOCKED', 'HOLIDAY_OVERRIDE')),
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_prof_avail_override_range CHECK (end_at > start_at)
);

-- 7. BUSINESS HOURS (Configurable by Global, City, Area, or Service)
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL DEFAULT 'GLOBAL' CHECK (scope_type IN ('GLOBAL', 'CITY', 'SERVICE_AREA', 'SERVICE')),
  scope_id UUID,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '20:00:00',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_business_hours_valid CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_scope ON public.business_hours(scope_type, scope_id, day_of_week, is_active);

-- 8. BUSINESS HOLIDAYS & BLACKOUTS
CREATE TABLE IF NOT EXISTS public.business_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'GLOBAL' CHECK (scope_type IN ('GLOBAL', 'CITY', 'SERVICE_AREA', 'SERVICE')),
  scope_id UUID,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_holidays ON public.business_holidays(holiday_date, scope_type, is_active);

CREATE TABLE IF NOT EXISTS public.availability_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL DEFAULT 'GLOBAL' CHECK (scope_type IN ('GLOBAL', 'CITY', 'SERVICE_AREA', 'SERVICE', 'PROFESSIONAL')),
  scope_id UUID,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_blackout_range CHECK (end_at > start_at)
);

-- 9. BOOKING RESERVATIONS TABLE (Atomic Slot Locking & Idempotency)
CREATE TABLE IF NOT EXISTS public.booking_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.service_variants(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  service_area_id UUID NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'RELEASED')),
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reservation_user_idempotency UNIQUE(user_id, idempotency_key),
  CONSTRAINT chk_reservation_time_range CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_reservations_active_slot ON public.booking_reservations(service_area_id, service_id, status, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry ON public.booking_reservations(expires_at) WHERE status = 'HELD';

-- 10. ROW LEVEL SECURITY
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_service_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reservations ENABLE ROW LEVEL SECURITY;

-- Customer can read active public business hours and holiday definitions
DROP POLICY IF EXISTS "Public can view active business hours" ON public.business_hours;
CREATE POLICY "Public can view active business hours" ON public.business_hours FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active holidays" ON public.business_holidays;
CREATE POLICY "Public can view active holidays" ON public.business_holidays FOR SELECT USING (is_active = TRUE);

-- Customer can manage their own booking reservations
DROP POLICY IF EXISTS "Users can view own reservations" ON public.booking_reservations;
CREATE POLICY "Users can view own reservations" ON public.booking_reservations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own reservations" ON public.booking_reservations;
CREATE POLICY "Users can create own reservations" ON public.booking_reservations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reservations" ON public.booking_reservations;
CREATE POLICY "Users can update own reservations" ON public.booking_reservations FOR UPDATE USING (auth.uid() = user_id);

-- 11. RPC FUNCTION: RESOLVE SERVICEABILITY
CREATE OR REPLACE FUNCTION public.resolve_serviceability(
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_service_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_city RECORD;
  v_area RECORD;
  v_city_avail RECORD;
  v_partner_count INTEGER := 0;
  v_service RECORD;
BEGIN
  -- 1. Validate service
  IF p_service_id IS NOT NULL THEN
    SELECT id, name, is_active, is_bookable, duration_minutes INTO v_service
    FROM public.services
    WHERE id = p_service_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'serviceable', false,
        'reason', 'SERVICE_NOT_FOUND',
        'message', 'Requested service does not exist.'
      );
    END IF;

    IF NOT v_service.is_active OR NOT v_service.is_bookable THEN
      RETURN jsonb_build_object(
        'serviceable', false,
        'reason', 'SERVICE_NOT_BOOKABLE',
        'message', 'Service is currently unavailable for booking.'
      );
    END IF;
  END IF;

  -- 2. Resolve City
  IF p_city_id IS NOT NULL THEN
    SELECT id, name, is_active, timezone INTO v_city
    FROM public.cities
    WHERE id = p_city_id;
  ELSIF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    -- Match closest city within 50km
    SELECT id, name, is_active, timezone,
           (6371 * acos(cos(radians(p_latitude)) * cos(radians(latitude)) * cos(radians(longitude) - radians(p_longitude)) + sin(radians(p_latitude)) * sin(radians(latitude)))) AS dist
    INTO v_city
    FROM public.cities
    WHERE is_active = TRUE AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY dist ASC
    LIMIT 1;
  ELSE
    -- Default to Dehradun pilot
    SELECT id, name, is_active, timezone INTO v_city
    FROM public.cities
    WHERE slug = 'dehradun'
    LIMIT 1;
  END IF;

  IF v_city IS NULL OR NOT v_city.is_active THEN
    RETURN jsonb_build_object(
      'serviceable', false,
      'reason', 'CITY_NOT_SUPPORTED',
      'message', 'Serventica is not yet operational in this city.'
    );
  END IF;

  -- 3. Resolve Service Area
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    SELECT id, name, radius_km, is_active,
           (6371 * acos(cos(radians(p_latitude)) * cos(radians(latitude)) * cos(radians(longitude) - radians(p_longitude)) + sin(radians(p_latitude)) * sin(radians(latitude)))) AS dist
    INTO v_area
    FROM public.service_areas
    WHERE city_id = v_city.id AND is_active = TRUE AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY dist ASC
    LIMIT 1;

    IF v_area IS NOT NULL AND v_area.radius_km IS NOT NULL AND v_area.dist > v_area.radius_km THEN
      v_area := NULL;
    END IF;
  END IF;

  -- If no area matched geographically, check for default primary area of city
  IF v_area IS NULL THEN
    SELECT id, name, radius_km, is_active INTO v_area
    FROM public.service_areas
    WHERE city_id = v_city.id AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_area IS NULL THEN
    RETURN jsonb_build_object(
      'serviceable', false,
      'cityId', v_city.id,
      'cityName', v_city.name,
      'reason', 'AREA_NOT_SUPPORTED',
      'message', 'Service area is not currently covered.'
    );
  END IF;

  -- 4. Check Service City Availability
  IF p_service_id IS NOT NULL THEN
    SELECT is_available, minimum_notice_minutes INTO v_city_avail
    FROM public.service_city_availability
    WHERE service_id = p_service_id AND city_id = v_city.id;

    IF v_city_avail IS NOT NULL AND NOT v_city_avail.is_available THEN
      RETURN jsonb_build_object(
        'serviceable', false,
        'cityId', v_city.id,
        'cityName', v_city.name,
        'serviceAreaId', v_area.id,
        'serviceAreaName', v_area.name,
        'reason', 'TEMPORARILY_UNAVAILABLE',
        'message', 'Service is temporarily paused in this city.'
      );
    END IF;

    -- 5. Count Qualified Active Partners
    SELECT COUNT(DISTINCT p.id) INTO v_partner_count
    FROM public.professionals p
    JOIN public.professional_service_skills pss ON pss.professional_id = p.id AND pss.is_active = TRUE
    JOIN public.professional_service_areas psa ON psa.professional_id = p.id AND psa.is_active = TRUE
    WHERE p.is_active = TRUE
      AND p.is_verified = TRUE
      AND pss.service_id = p_service_id
      AND psa.service_area_id = v_area.id;

    IF v_partner_count = 0 THEN
      RETURN jsonb_build_object(
        'serviceable', false,
        'cityId', v_city.id,
        'cityName', v_city.name,
        'serviceAreaId', v_area.id,
        'serviceAreaName', v_area.name,
        'reason', 'NO_PARTNER_CAPACITY',
        'message', 'No qualified service partners available in this area.'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'serviceable', true,
    'cityId', v_city.id,
    'cityName', v_city.name,
    'serviceAreaId', v_area.id,
    'serviceAreaName', v_area.name,
    'reason', 'SERVICE_AVAILABLE',
    'minNoticeMinutes', COALESCE(v_city_avail.minimum_notice_minutes, 60),
    'deliveryTimeFormatted', '20 minutes'
  );
END;
$$;

-- 12. RPC FUNCTION: GET AVAILABLE SLOTS FOR DATE
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_service_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_service_area_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_service RECORD;
  v_variant RECORD;
  v_area RECORD;
  v_city RECORD;
  v_duration INTEGER := 60;
  v_buffer INTEGER := 20;
  v_slot_interval INTEGER := 30;
  v_min_notice_min INTEGER := 60;
  v_day_of_week INTEGER;
  v_biz_start TIME := '08:00:00';
  v_biz_end TIME := '20:00:00';
  v_curr_time TIMESTAMPTZ := NOW();
  v_is_today BOOLEAN;
  v_holiday RECORD;
  v_qualified_pro_count INTEGER;
  v_slots JSONB := '[]'::jsonb;
  v_slot_start_time TIME;
  v_slot_end_time TIME;
  v_slot_start_tz TIMESTAMPTZ;
  v_slot_end_tz TIMESTAMPTZ;
  v_available_pro_count INTEGER;
  v_booked_count INTEGER;
  v_period TEXT;
  v_slot_id TEXT;
  v_slot_state TEXT;
BEGIN
  -- 1. Load Service
  SELECT id, duration_minutes, is_active, is_bookable INTO v_service
  FROM public.services WHERE id = p_service_id;

  IF NOT FOUND OR NOT v_service.is_active OR NOT v_service.is_bookable THEN
    RETURN jsonb_build_object('error', 'SERVICE_UNAVAILABLE', 'slots', '[]'::jsonb);
  END IF;
  v_duration := COALESCE(v_service.duration_minutes, 60);

  -- Variant Duration Override if present
  IF p_variant_id IS NOT NULL THEN
    SELECT duration_minutes INTO v_variant
    FROM public.service_variants WHERE id = p_variant_id;
    IF v_variant.duration_minutes IS NOT NULL AND v_variant.duration_minutes > 0 THEN
      v_duration := v_variant.duration_minutes;
    END IF;
  END IF;

  -- 2. Resolve Service Area & City
  IF p_service_area_id IS NOT NULL THEN
    SELECT sa.id, sa.name, sa.city_id, c.name AS city_name, c.timezone INTO v_area
    FROM public.service_areas sa
    JOIN public.cities c ON c.id = sa.city_id
    WHERE sa.id = p_service_area_id;
  END IF;

  IF v_area IS NULL THEN
    SELECT sa.id, sa.name, sa.city_id, c.name AS city_name, c.timezone INTO v_area
    FROM public.service_areas sa
    JOIN public.cities c ON c.id = sa.city_id
    WHERE sa.is_active = TRUE
    ORDER BY sa.created_at ASC LIMIT 1;
  END IF;

  -- 3. Check Holidays
  SELECT name INTO v_holiday FROM public.business_holidays
  WHERE holiday_date = p_date AND is_active = TRUE LIMIT 1;

  IF v_holiday IS NOT NULL THEN
    RETURN jsonb_build_object(
      'date', p_date,
      'timezone', COALESCE(v_area.timezone, 'Asia/Kolkata'),
      'reason', 'HOLIDAY',
      'holidayName', v_holiday.name,
      'slots', '[]'::jsonb
    );
  END IF;

  -- 4. Count Qualified Partners in Area
  SELECT COUNT(DISTINCT p.id) INTO v_qualified_pro_count
  FROM public.professionals p
  JOIN public.professional_service_skills pss ON pss.professional_id = p.id AND pss.is_active = TRUE
  JOIN public.professional_service_areas psa ON psa.professional_id = p.id AND psa.is_active = TRUE
  WHERE p.is_active = TRUE
    AND p.is_verified = TRUE
    AND pss.service_id = p_service_id
    AND psa.service_area_id = v_area.id;

  IF v_qualified_pro_count = 0 THEN
    RETURN jsonb_build_object(
      'date', p_date,
      'timezone', COALESCE(v_area.timezone, 'Asia/Kolkata'),
      'reason', 'NO_PARTNER_CAPACITY',
      'slots', '[]'::jsonb
    );
  END IF;

  -- 5. Business Hours for Requested Day
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  SELECT start_time, end_time INTO v_biz_start, v_biz_end
  FROM public.business_hours
  WHERE is_active = TRUE AND day_of_week = v_day_of_week
  ORDER BY (scope_type = 'SERVICE') DESC, (scope_type = 'SERVICE_AREA') DESC, (scope_type = 'CITY') DESC
  LIMIT 1;

  IF v_biz_start IS NULL THEN
    v_biz_start := '08:00:00';
    v_biz_end := '20:00:00';
  END IF;

  v_is_today := (p_date = CURRENT_DATE);

  -- 6. Generate Candidate Slots
  v_slot_start_time := v_biz_start;
  WHILE v_slot_start_time + (v_duration || ' minutes')::INTERVAL <= v_biz_end LOOP
    v_slot_end_time := v_slot_start_time + (v_duration || ' minutes')::INTERVAL;
    
    -- Convert to TIMESTAMPTZ in target timezone
    v_slot_start_tz := (p_date || ' ' || v_slot_start_time)::TIMESTAMP AT TIME ZONE COALESCE(v_area.timezone, 'Asia/Kolkata');
    v_slot_end_tz := (p_date || ' ' || v_slot_end_time)::TIMESTAMP AT TIME ZONE COALESCE(v_area.timezone, 'Asia/Kolkata');

    -- Check Minimum Notice (Must be at least now + min_notice_min)
    IF v_slot_start_tz >= v_curr_time + (v_min_notice_min || ' minutes')::INTERVAL THEN
      
      -- Calculate available eligible professionals for this specific slot window (respecting working hours, time-off, and overlapping bookings)
      SELECT COUNT(DISTINCT p.id) INTO v_available_pro_count
      FROM public.professionals p
      JOIN public.professional_service_skills pss ON pss.professional_id = p.id AND pss.is_active = TRUE
      JOIN public.professional_service_areas psa ON psa.professional_id = p.id AND psa.is_active = TRUE
      JOIN public.professional_working_hours pwh ON pwh.professional_id = p.id AND pwh.is_active = TRUE AND pwh.day_of_week = v_day_of_week
      WHERE p.is_active = TRUE
        AND p.is_verified = TRUE
        AND pss.service_id = p_service_id
        AND psa.service_area_id = v_area.id
        AND pwh.start_time <= v_slot_start_time
        AND pwh.end_time >= v_slot_end_time
        -- Exclude if professional has approved time-off overlapping this slot + travel buffer
        AND NOT EXISTS (
          SELECT 1 FROM public.professional_time_off pto
          WHERE pto.professional_id = p.id
            AND pto.is_approved = TRUE
            AND pto.start_at < v_slot_end_tz + (v_buffer || ' minutes')::INTERVAL
            AND pto.end_at > v_slot_start_tz - (v_buffer || ' minutes')::INTERVAL
        )
        -- Exclude if professional has active confirmed booking overlapping this slot + buffer
        AND NOT EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.partner_id = p.id
            AND b.status IN ('CONFIRMED', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'SERVICE_STARTED')
            AND b.scheduled_start_time < v_slot_end_tz + (v_buffer || ' minutes')::INTERVAL
            AND (b.scheduled_start_time + (v_duration || ' minutes')::INTERVAL) > v_slot_start_tz - (v_buffer || ' minutes')::INTERVAL
        );

      -- Count Active Held Reservations in this slot for the area
      SELECT COUNT(id) INTO v_booked_count
      FROM public.booking_reservations br
      WHERE br.service_area_id = v_area.id
        AND br.service_id = p_service_id
        AND br.status IN ('HELD', 'CONFIRMED')
        AND br.expires_at > NOW()
        AND br.start_at < v_slot_end_tz
        AND br.end_at > v_slot_start_tz;

      -- Period Bucket
      IF EXTRACT(HOUR FROM v_slot_start_time) < 12 THEN
        v_period := 'MORNING';
      ELSIF EXTRACT(HOUR FROM v_slot_start_time) < 17 THEN
        v_period := 'AFTERNOON';
      ELSE
        v_period := 'EVENING';
      END IF;

      v_slot_id := 'slot_' || to_char(p_date, 'YYYY-MM-DD') || '_' || to_char(v_slot_start_time, 'HH24:MI');
      
      IF (v_available_pro_count - v_booked_count) > 0 THEN
        v_slot_state := 'AVAILABLE';
      ELSE
        v_slot_state := 'FULL';
      END IF;

      v_slots := v_slots || jsonb_build_object(
        'id', v_slot_id,
        'startAt', v_slot_start_tz,
        'endAt', v_slot_end_tz,
        'startTimeFormatted', to_char(v_slot_start_tz, 'HH12:MI AM'),
        'endTimeFormatted', to_char(v_slot_end_tz, 'HH12:MI AM'),
        'displayTime', to_char(v_slot_start_tz, 'HH12:MI AM') || ' – ' || to_char(v_slot_end_tz, 'HH12:MI AM'),
        'period', v_period,
        'available', (v_slot_state = 'AVAILABLE'),
        'totalCapacity', v_available_pro_count,
        'bookedCapacity', v_booked_count,
        'remainingCapacity', GREATEST(0, v_available_pro_count - v_booked_count),
        'state', v_slot_state
      );
    END IF;

    v_slot_start_time := v_slot_start_time + (v_slot_interval || ' minutes')::INTERVAL;
  END LOOP;

  RETURN jsonb_build_object(
    'serviceId', p_service_id,
    'variantId', p_variant_id,
    'serviceAreaId', v_area.id,
    'cityId', v_area.city_id,
    'timezone', COALESCE(v_area.timezone, 'Asia/Kolkata'),
    'date', p_date,
    'serviceDurationMinutes', v_duration,
    'bufferMinutes', v_buffer,
    'totalSlots', jsonb_array_length(v_slots),
    'availableSlots', (SELECT COUNT(*) FROM jsonb_array_elements(v_slots) elem WHERE (elem->>'available')::BOOLEAN = TRUE),
    'slots', v_slots
  );
END;
$$;

-- 13. RPC FUNCTION: GET AVAILABLE DATES WITHIN WINDOW
CREATE OR REPLACE FUNCTION public.get_available_dates(
  p_service_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_service_area_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days')::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cur_date DATE;
  v_dates JSONB := '[]'::jsonb;
  v_slots_res JSONB;
  v_avail_count INTEGER;
  v_is_today BOOLEAN;
  v_is_tomorrow BOOLEAN;
BEGIN
  v_cur_date := p_from_date;
  WHILE v_cur_date <= p_to_date LOOP
    v_slots_res := public.get_available_slots(p_service_id, p_variant_id, p_service_area_id, v_cur_date);
    v_avail_count := COALESCE((v_slots_res->>'availableSlots')::INTEGER, 0);
    
    v_is_today := (v_cur_date = CURRENT_DATE);
    v_is_tomorrow := (v_cur_date = CURRENT_DATE + 1);

    v_dates := v_dates || jsonb_build_object(
      'date', to_char(v_cur_date, 'YYYY-MM-DD'),
      'dayName', to_char(v_cur_date, 'Dy'),
      'dayNumber', EXTRACT(DAY FROM v_cur_date)::INTEGER,
      'monthName', to_char(v_cur_date, 'Mon'),
      'isToday', v_is_today,
      'isTomorrow', v_is_tomorrow,
      'isAvailable', (v_avail_count > 0),
      'availableSlotCount', v_avail_count
    );

    v_cur_date := v_cur_date + 1;
  END LOOP;

  RETURN v_dates;
END;
$$;

-- 14. RPC FUNCTION: ATOMIC SLOT RESERVATION WITH CONCURRENCY LOCK
CREATE OR REPLACE FUNCTION public.reserve_booking_slot(
  p_user_id UUID,
  p_service_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_service_area_id UUID DEFAULT NULL,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_hold_duration_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing RECORD;
  v_area_id UUID;
  v_avail_pro_count INTEGER;
  v_held_count INTEGER;
  v_new_reservation RECORD;
  v_assigned_pro_id UUID;
  v_buffer INTEGER := 20;
  v_duration INTEGER;
BEGIN
  -- 1. Idempotency check: if user already reserved with this key, return it immediately
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.booking_reservations
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      IF v_existing.status = 'HELD' AND v_existing.expires_at > NOW() THEN
        RETURN jsonb_build_object(
          'success', true,
          'reservationId', v_existing.id,
          'status', v_existing.status,
          'startAt', v_existing.start_at,
          'endAt', v_existing.end_at,
          'expiresAt', v_existing.expires_at,
          'message', 'Existing reservation restored.'
        );
      END IF;
    END IF;
  END IF;

  -- 2. Resolve default area if not provided
  v_area_id := p_service_area_id;
  IF v_area_id IS NULL THEN
    SELECT id INTO v_area_id FROM public.service_areas WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 3. Row-level Lock on active capacity for this area and service window
  -- Clean up expired reservations first
  UPDATE public.booking_reservations
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status = 'HELD' AND expires_at <= NOW();

  -- Count available qualified professionals for this specific slot window
  SELECT COUNT(DISTINCT p.id), MIN(p.id) INTO v_avail_pro_count, v_assigned_pro_id
  FROM public.professionals p
  JOIN public.professional_service_skills pss ON pss.professional_id = p.id AND pss.is_active = TRUE
  JOIN public.professional_service_areas psa ON psa.professional_id = p.id AND psa.is_active = TRUE
  WHERE p.is_active = TRUE
    AND p.is_verified = TRUE
    AND pss.service_id = p_service_id
    AND psa.service_area_id = v_area_id
    AND NOT EXISTS (
      SELECT 1 FROM public.professional_time_off pto
      WHERE pto.professional_id = p.id AND pto.is_approved = TRUE
        AND pto.start_at < p_end_at + (v_buffer || ' minutes')::INTERVAL
        AND pto.end_at > p_start_at - (v_buffer || ' minutes')::INTERVAL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.partner_id = p.id
        AND b.status IN ('CONFIRMED', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'SERVICE_STARTED')
        AND b.scheduled_start_time < p_end_at + (v_buffer || ' minutes')::INTERVAL
        AND (b.scheduled_start_time + INTERVAL '60 minutes') > p_start_at - (v_buffer || ' minutes')::INTERVAL
    );

  -- Count currently held or confirmed reservations for this window
  SELECT COUNT(id) INTO v_held_count
  FROM public.booking_reservations
  WHERE service_area_id = v_area_id
    AND service_id = p_service_id
    AND status IN ('HELD', 'CONFIRMED')
    AND expires_at > NOW()
    AND start_at < p_end_at
    AND end_at > p_start_at
  FOR UPDATE;

  -- 4. Check Capacity
  IF (v_avail_pro_count - v_held_count) <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SLOT_NO_LONGER_AVAILABLE',
      'message', 'This time slot was just booked by another customer. Please select another time.'
    );
  END IF;

  -- 5. Insert Atomic Reservation
  INSERT INTO public.booking_reservations (
    id,
    user_id,
    service_id,
    variant_id,
    professional_id,
    service_area_id,
    start_at,
    end_at,
    expires_at,
    status,
    idempotency_key
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_service_id,
    p_variant_id,
    v_assigned_pro_id,
    v_area_id,
    p_start_at,
    p_end_at,
    NOW() + (COALESCE(p_hold_duration_minutes, 15) || ' minutes')::INTERVAL,
    'HELD',
    COALESCE(p_idempotency_key, gen_random_uuid()::TEXT)
  )
  RETURNING * INTO v_new_reservation;

  RETURN jsonb_build_object(
    'success', true,
    'reservationId', v_new_reservation.id,
    'status', v_new_reservation.status,
    'startAt', v_new_reservation.start_at,
    'endAt', v_new_reservation.end_at,
    'expiresAt', v_new_reservation.expires_at,
    'message', 'Slot reserved successfully.'
  );
END;
$$;

-- ==============================================================================
-- 15. SEED DATA: BUSINESS HOURS & PILOT PROFESSIONALS IN DEHRADUN
-- ==============================================================================

-- Global Business Hours (8:00 AM – 8:00 PM every day)
INSERT INTO public.business_hours (id, scope_type, day_of_week, start_time, end_time, is_active)
VALUES
  (gen_random_uuid(), 'GLOBAL', 0, '08:00:00', '20:00:00', TRUE),
  (gen_random_uuid(), 'GLOBAL', 1, '08:00:00', '20:00:00', TRUE),
  (gen_random_uuid(), 'GLOBAL', 2, '08:00:00', '20:00:00', TRUE),
  (gen_random_uuid(), 'GLOBAL', 3, '08:00:00', '20:00:00', TRUE),
  (gen_random_uuid(), 'GLOBAL', 4, '08:00:00', '20:00:00', TRUE),
  (gen_random_uuid(), 'GLOBAL', 5, '08:00:00', '20:00:00', TRUE),
  (gen_random_uuid(), 'GLOBAL', 6, '08:00:00', '20:00:00', TRUE)
ON CONFLICT DO NOTHING;

-- Seed Dehradun Pilot Service Areas
DO $$
DECLARE
  v_dehradun_id UUID;
  v_area_premnagar UUID := 'e1111111-0000-0000-0000-000000000001';
  v_area_rajpur UUID := 'e1111111-0000-0000-0000-000000000002';
  v_area_jakhan UUID := 'e1111111-0000-0000-0000-000000000003';
  v_pro_1 UUID := 'a1000000-0000-0000-0000-000000000001';
  v_pro_2 UUID := 'a1000000-0000-0000-0000-000000000002';
  v_pro_3 UUID := 'a1000000-0000-0000-0000-000000000003';
  v_pro_4 UUID := 'a1000000-0000-0000-0000-000000000004';
  v_pro_5 UUID := 'a1000000-0000-0000-0000-000000000005';
  v_srv_ac UUID;
  v_srv_elec UUID;
  v_srv_plumb UUID;
  v_srv_clean UUID;
  i INTEGER;
BEGIN
  SELECT id INTO v_dehradun_id FROM public.cities WHERE slug = 'dehradun';
  IF v_dehradun_id IS NULL THEN
    v_dehradun_id := 'c1000000-0000-0000-0000-000000000031';
  END IF;

  -- Insert Dehradun Core Areas
  INSERT INTO public.service_areas (id, city_id, name, postal_code, latitude, longitude, radius_km, is_active)
  VALUES
    (v_area_premnagar, v_dehradun_id, 'Prem Nagar & Nanda Ki Chowki', '248007', 30.343866, 77.953231, 15.00, TRUE),
    (v_area_rajpur, v_dehradun_id, 'Rajpur Road & Dalanwala', '248001', 30.360144, 78.077241, 12.00, TRUE),
    (v_area_jakhan, v_dehradun_id, 'Jakhan & Sahastradhara Rd', '248009', 30.375000, 78.090000, 10.00, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    postal_code = EXCLUDED.postal_code,
    radius_km = EXCLUDED.radius_km,
    is_active = EXCLUDED.is_active;

  -- Seed Verified Pilot Professionals
  INSERT INTO public.professionals (id, full_name, phone, rating, total_jobs, is_active, is_verified)
  VALUES
    (v_pro_1, 'Rajesh Kumar (Master AC Specialist)', '+919876543210', 4.95, 142, TRUE, TRUE),
    (v_pro_2, 'Sunil Sharma (Senior Electrician)', '+919876543211', 4.92, 98, TRUE, TRUE),
    (v_pro_3, 'Amit Verma (Plumbing Expert)', '+919876543212', 4.88, 114, TRUE, TRUE),
    (v_pro_4, 'Vikram Singh (AC & Appliance Tech)', '+919876543213', 4.90, 76, TRUE, TRUE),
    (v_pro_5, 'Pooja Devi (Deep Cleaning Specialist)', '+919876543214', 4.96, 180, TRUE, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    rating = EXCLUDED.rating,
    is_active = EXCLUDED.is_active,
    is_verified = EXCLUDED.is_verified;

  -- Assign Working Hours (Mon - Sun 08:30 to 19:30)
  FOR i IN 0..6 LOOP
    INSERT INTO public.professional_working_hours (id, professional_id, day_of_week, start_time, end_time, is_active)
    VALUES
      (gen_random_uuid(), v_pro_1, i, '08:30:00', '19:30:00', TRUE),
      (gen_random_uuid(), v_pro_2, i, '08:30:00', '19:30:00', TRUE),
      (gen_random_uuid(), v_pro_3, i, '08:30:00', '19:30:00', TRUE),
      (gen_random_uuid(), v_pro_4, i, '08:30:00', '19:30:00', TRUE),
      (gen_random_uuid(), v_pro_5, i, '08:30:00', '19:30:00', TRUE)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Assign Service Areas to Professionals
  INSERT INTO public.professional_service_areas (id, professional_id, service_area_id, is_active)
  VALUES
    (gen_random_uuid(), v_pro_1, v_area_premnagar, TRUE),
    (gen_random_uuid(), v_pro_1, v_area_rajpur, TRUE),
    (gen_random_uuid(), v_pro_2, v_area_premnagar, TRUE),
    (gen_random_uuid(), v_pro_2, v_area_rajpur, TRUE),
    (gen_random_uuid(), v_pro_3, v_area_premnagar, TRUE),
    (gen_random_uuid(), v_pro_3, v_area_jakhan, TRUE),
    (gen_random_uuid(), v_pro_4, v_area_premnagar, TRUE),
    (gen_random_uuid(), v_pro_5, v_area_premnagar, TRUE),
    (gen_random_uuid(), v_pro_5, v_area_rajpur, TRUE)
  ON CONFLICT DO NOTHING;

  -- Assign Skills to Professionals for all services of respective categories
  FOR v_srv_ac IN (SELECT id FROM public.services WHERE slug LIKE '%ac-%' OR slug LIKE '%foam-jet%' OR slug LIKE '%gas-refill%') LOOP
    INSERT INTO public.professional_service_skills (id, professional_id, service_id, skill_level, is_active)
    VALUES
      (gen_random_uuid(), v_pro_1, v_srv_ac, 'EXPERT', TRUE),
      (gen_random_uuid(), v_pro_4, v_srv_ac, 'STANDARD', TRUE)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_srv_elec IN (SELECT id FROM public.services WHERE slug LIKE '%switch%' OR slug LIKE '%fan%' OR slug LIKE '%mcb%' OR slug LIKE '%inverter%') LOOP
    INSERT INTO public.professional_service_skills (id, professional_id, service_id, skill_level, is_active)
    VALUES (gen_random_uuid(), v_pro_2, v_srv_elec, 'EXPERT', TRUE)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_srv_plumb IN (SELECT id FROM public.services WHERE slug LIKE '%tap%' OR slug LIKE '%basin%' OR slug LIKE '%toilet%' OR slug LIKE '%pipe%' OR slug LIKE '%motor%') LOOP
    INSERT INTO public.professional_service_skills (id, professional_id, service_id, skill_level, is_active)
    VALUES (gen_random_uuid(), v_pro_3, v_srv_plumb, 'EXPERT', TRUE)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_srv_clean IN (SELECT id FROM public.services WHERE slug LIKE '%clean%' OR slug LIKE '%sofa%' OR slug LIKE '%scrub%') LOOP
    INSERT INTO public.professional_service_skills (id, professional_id, service_id, skill_level, is_active)
    VALUES (gen_random_uuid(), v_pro_5, v_srv_clean, 'EXPERT', TRUE)
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;
