-- ==============================================================================
-- SERVENTICA — INSTANT PLATFORM FOUNDATION (Prompt 01)
-- Domain Entities, Multi-Partner Assignments, Capabilities,
-- Checked Constraints, Row-Level Security & Atomic RPCs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. SERVICE REQUIREMENTS
-- Reusable domain requirements model for Instant & Scheduled services
CREATE TABLE IF NOT EXISTS public.service_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instant_service_type TEXT NOT NULL CHECK (instant_service_type IN ('HELPING_HAND', 'ROAD_HELP', 'LAUNDRY', 'PACK_MOVE')),
  required_partner_count INT NOT NULL DEFAULT 1 CHECK (required_partner_count >= 1),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  task_category TEXT,
  vehicle_type TEXT CHECK (vehicle_type IS NULL OR vehicle_type IN ('BIKE', 'SCOOTER', 'CAR', 'SUV', 'OTHER')),
  starter_status TEXT CHECK (starter_status IS NULL OR starter_status IN ('YES', 'NO', 'NOT_SURE')),
  issue_type TEXT CHECK (issue_type IS NULL OR issue_type IN ('FUEL', 'BREAKDOWN', 'FLAT_TYRE', 'BATTERY', 'OTHER')),
  fuel_type TEXT CHECK (fuel_type IS NULL OR fuel_type IN ('PETROL', 'DIESEL')),
  fuel_quantity_litres NUMERIC(4, 2) CHECK (fuel_quantity_litres IS NULL OR (fuel_quantity_litres > 0 AND fuel_quantity_litres <= 1.00)),
  approx_load_kg NUMERIC(6, 2) CHECK (approx_load_kg IS NULL OR approx_load_kg > 0),
  actual_verified_weight_kg NUMERIC(6, 2) CHECK (actual_verified_weight_kg IS NULL OR actual_verified_weight_kg > 0),
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_helping_hand_initial_cap CHECK (
    instant_service_type != 'HELPING_HAND' OR duration_minutes <= 240
  )
);

CREATE INDEX IF NOT EXISTS idx_service_requirements_type ON public.service_requirements(instant_service_type);

-- 2. FULFILLMENT INTENTS
-- Pre-booking customer requirement state before partner match
CREATE TABLE IF NOT EXISTS public.fulfillment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  instant_service_type TEXT NOT NULL CHECK (instant_service_type IN ('HELPING_HAND', 'ROAD_HELP', 'LAUNDRY', 'PACK_MOVE')),
  fulfillment_mode TEXT NOT NULL DEFAULT 'INSTANT' CHECK (fulfillment_mode IN ('INSTANT', 'SCHEDULED')),
  service_requirement_id UUID NOT NULL REFERENCES public.service_requirements(id) ON DELETE CASCADE,
  address_id UUID NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  pickup_latitude NUMERIC(10, 7) NOT NULL CHECK (pickup_latitude BETWEEN -90 AND 90),
  pickup_longitude NUMERIC(10, 7) NOT NULL CHECK (pickup_longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED', 'QUOTED', 'MATCHING', 'CONFIRMED', 'UNFULFILLABLE', 'CANCELLED', 'EXPIRED'
  )),
  quote_id UUID,
  idempotency_key TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_intents_customer ON public.fulfillment_intents(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_intents_status_expiry ON public.fulfillment_intents(status, expires_at);

-- 3. BOOKING ASSIGNMENTS (1-to-N Partner Architecture)
-- Enables multi-partner assignments per booking (e.g. 2 helpers for Pack & Move)
CREATE TABLE IF NOT EXISTS public.booking_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (role IN ('PRIMARY', 'ASSISTANT', 'SPECIALIST')),
  assignment_status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (assignment_status IN (
    'ASSIGNED', 'ACCEPTED', 'DECLINED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  )),
  payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (payout_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_booking_partner_assignment UNIQUE (booking_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_assignments_partner ON public.booking_assignments(partner_id, assignment_status);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON public.booking_assignments(booking_id);

-- 4. PARTNER CAPABILITIES
-- Maps partners to qualified instant operations
CREATE TABLE IF NOT EXISTS public.partner_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  capability_code TEXT NOT NULL CHECK (capability_code IN (
    'GENERAL_HELP', 'ROADSIDE_ASSISTANCE', 'FUEL_TRANSPORT',
    'FLAT_TYRE', 'BATTERY_START', 'LAUNDRY_PICKUP', 'MOVING_ASSISTANCE'
  )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_partner_capability UNIQUE (partner_id, capability_code)
);

CREATE INDEX IF NOT EXISTS idx_partner_capabilities_code ON public.partner_capabilities(capability_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_partner_capabilities_partner ON public.partner_capabilities(partner_id);

-- 5. INSTANT BOOKING EXTENSIONS
-- Manages duration extension requests with schedule conflict prevention
CREATE TABLE IF NOT EXISTS public.instant_booking_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  additional_minutes INT NOT NULL DEFAULT 30 CHECK (additional_minutes IN (30, 60, 90, 120)),
  quote_id UUID,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  conflict_checked BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking ON public.instant_booking_extensions(booking_id, status);

-- 6. EXTEND EXISTING TABLES
-- Extend public.bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fulfillment_mode TEXT NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS service_requirement_id UUID REFERENCES public.service_requirements(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bookings_fulfillment_mode'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT chk_bookings_fulfillment_mode CHECK (fulfillment_mode IN ('INSTANT', 'SCHEDULED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_fulfillment_mode ON public.bookings(fulfillment_mode);

-- Extend public.dispatch_requests
ALTER TABLE public.dispatch_requests
  ADD COLUMN IF NOT EXISTS fulfillment_intent_id UUID REFERENCES public.fulfillment_intents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_requirement_id UUID REFERENCES public.service_requirements(id) ON DELETE SET NULL;

-- Extend public.service_fulfillment_policies
ALTER TABLE public.service_fulfillment_policies
  ADD COLUMN IF NOT EXISTS max_initial_duration_minutes INT DEFAULT 240,
  ADD COLUMN IF NOT EXISTS allow_extensions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS extension_slot_minutes INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS fuel_max_litres NUMERIC(4, 2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS prohibited_task_codes TEXT[] DEFAULT '{}'::text[];

-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.service_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instant_booking_extensions ENABLE ROW LEVEL SECURITY;

-- 7.1 service_requirements policies
DROP POLICY IF EXISTS "service_requirements_select" ON public.service_requirements;
CREATE POLICY "service_requirements_select" ON public.service_requirements
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "service_requirements_insert" ON public.service_requirements;
CREATE POLICY "service_requirements_insert" ON public.service_requirements
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- 7.2 fulfillment_intents policies
DROP POLICY IF EXISTS "fulfillment_intents_customer_select" ON public.fulfillment_intents;
CREATE POLICY "fulfillment_intents_customer_select" ON public.fulfillment_intents
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_AGENT')
    )
  );

DROP POLICY IF EXISTS "fulfillment_intents_customer_insert" ON public.fulfillment_intents;
CREATE POLICY "fulfillment_intents_customer_insert" ON public.fulfillment_intents
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "fulfillment_intents_customer_update" ON public.fulfillment_intents;
CREATE POLICY "fulfillment_intents_customer_update" ON public.fulfillment_intents
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 7.3 booking_assignments policies
DROP POLICY IF EXISTS "booking_assignments_party_select" ON public.booking_assignments;
CREATE POLICY "booking_assignments_party_select" ON public.booking_assignments
  FOR SELECT TO authenticated
  USING (
    -- Customer who owns the booking
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_assignments.booking_id AND b.customer_id = auth.uid())
    OR
    -- Partner assigned to the job
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = booking_assignments.partner_id AND p.user_id = auth.uid())
    OR
    -- Operations / Admin
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_AGENT')
    )
  );

DROP POLICY IF EXISTS "booking_assignments_partner_update" ON public.booking_assignments;
CREATE POLICY "booking_assignments_partner_update" ON public.booking_assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = booking_assignments.partner_id AND p.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 7.4 partner_capabilities policies
DROP POLICY IF EXISTS "partner_capabilities_select" ON public.partner_capabilities;
CREATE POLICY "partner_capabilities_select" ON public.partner_capabilities
  FOR SELECT TO authenticated
  USING (TRUE);

-- 7.5 instant_booking_extensions policies
DROP POLICY IF EXISTS "instant_booking_extensions_select" ON public.instant_booking_extensions;
CREATE POLICY "instant_booking_extensions_select" ON public.instant_booking_extensions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = instant_booking_extensions.booking_id AND b.customer_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.booking_assignments ba
      JOIN public.professionals p ON ba.partner_id = p.id
      WHERE ba.booking_id = instant_booking_extensions.booking_id AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 8. ATOMIC RPC FUNCTIONS

-- 8.1 Atomic Partner Acceptance RPC
CREATE OR REPLACE FUNCTION public.atomic_accept_instant_assignment(
  p_booking_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_presence RECORD;
BEGIN
  -- 1. Lock the assignment row to prevent concurrent assignment updates
  SELECT * INTO v_assignment
  FROM public.booking_assignments
  WHERE booking_id = p_booking_id AND partner_id = p_partner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ASSIGNMENT_NOT_FOUND', 'message', 'No assignment found for this booking and partner');
  END IF;

  IF v_assignment.assignment_status != 'ASSIGNED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'message', 'Assignment is no longer in ASSIGNED status');
  END IF;

  -- 2. Lock partner presence to guarantee partner is available and prevent double booking
  SELECT * INTO v_presence
  FROM public.partner_presence_sessions
  WHERE partner_id = p_partner_id
  FOR UPDATE;

  IF FOUND AND v_presence.status = 'BUSY' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PARTNER_BUSY', 'message', 'Partner is currently busy with another active job');
  END IF;

  -- 3. Transition assignment to ACCEPTED
  UPDATE public.booking_assignments
  SET 
    assignment_status = 'ACCEPTED',
    accepted_at = NOW()
  WHERE id = v_assignment.id;

  -- 4. Mark partner presence as BUSY
  IF FOUND THEN
    UPDATE public.partner_presence_sessions
    SET status = 'BUSY', updated_at = NOW()
    WHERE partner_id = p_partner_id;
  END IF;

  -- 5. If this is PRIMARY assignment, sync booking partner_id and update booking status
  IF v_assignment.role = 'PRIMARY' THEN
    UPDATE public.bookings
    SET 
      partner_id = (SELECT user_id FROM public.professionals WHERE id = p_partner_id),
      status = 'PARTNER_ACCEPTED',
      updated_at = NOW()
    WHERE id = p_booking_id;
  END IF;

  -- 6. Insert audit event
  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    actor_type,
    actor_id,
    from_status,
    to_status,
    payload
  ) VALUES (
    p_booking_id,
    'ASSIGNMENT_ACCEPTED',
    'PARTNER',
    p_partner_id,
    'ASSIGNED',
    'ACCEPTED',
    jsonb_build_object('assignment_id', v_assignment.id, 'role', v_assignment.role)
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'assignment_id', v_assignment.id,
    'assignment_status', 'ACCEPTED'
  );
END;
$$;

-- 8.2 Check Partner Schedule Conflict RPC (for extensions)
CREATE OR REPLACE FUNCTION public.check_partner_extension_conflict(
  p_booking_id UUID,
  p_partner_id UUID,
  p_additional_minutes INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_projected_end TIMESTAMPTZ;
  v_has_conflict BOOLEAN := FALSE;
  v_conflicting_booking_id UUID;
BEGIN
  -- 1. Get current booking details
  SELECT scheduled_start_time, total_amount INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- Projected end time with buffer
  v_projected_end := NOW() + (p_additional_minutes || ' minutes')::interval + INTERVAL '15 minutes';

  -- 2. Check if partner has any scheduled booking starting before projected end time
  SELECT b.id INTO v_conflicting_booking_id
  FROM public.booking_assignments ba
  JOIN public.bookings b ON ba.booking_id = b.id
  WHERE ba.partner_id = p_partner_id
    AND ba.booking_id != p_booking_id
    AND b.status IN ('CONFIRMED', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'EN_ROUTE')
    AND b.scheduled_start_time < v_projected_end
    AND b.scheduled_start_time > NOW()
  LIMIT 1;

  IF v_conflicting_booking_id IS NOT NULL THEN
    v_has_conflict := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'has_conflict', v_has_conflict,
    'conflicting_booking_id', v_conflicting_booking_id,
    'projected_end_time', v_projected_end
  );
END;
$$;

-- Grant permissions to authenticated and service_role
GRANT SELECT, INSERT, UPDATE ON public.service_requirements TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.fulfillment_intents TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.booking_assignments TO authenticated, service_role;
GRANT SELECT ON public.partner_capabilities TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.instant_booking_extensions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atomic_accept_instant_assignment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_partner_extension_conflict(UUID, UUID, INT) TO authenticated, service_role;
