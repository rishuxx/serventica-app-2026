-- ==============================================================================
-- SERVENTICA — SCHEDULED BOOKING CONCURRENCY & SLOT RESERVATION HARDENING
-- Transactional slot reservation RPC with pessimistic row-locking (FOR UPDATE)
-- ==============================================================================

-- 1. Ensure booking_reservations has unique exclusion index for confirmed active slots
CREATE INDEX IF NOT EXISTS idx_reservations_exclusive_slot 
ON public.booking_reservations(professional_id, start_at, end_at)
WHERE status IN ('HELD', 'CONFIRMED') AND professional_id IS NOT NULL;

-- 2. Atomic Slot Reservation Function with Pessimistic Row Locking
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
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_status TEXT;
  v_reservation_id UUID;
  v_professional_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_hold_seconds INT;
BEGIN
  -- 1. Idempotency Check: return existing reservation if actor and key match
  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.booking_reservations
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_idempotent_replay', true,
      'reservation_id', v_existing_id,
      'status', v_existing_status
    );
  END IF;

  -- 2. Find and lock an eligible professional for the requested time slot
  -- Uses FOR UPDATE SKIP LOCKED on professionals to eliminate concurrency race conditions
  SELECT p.id INTO v_professional_id
  FROM public.professionals p
  JOIN public.professional_service_areas psa ON psa.professional_id = p.id
  JOIN public.professional_service_skills pss ON pss.professional_id = p.id
  WHERE psa.service_area_id = p_service_area_id
    AND pss.service_id = p_service_id
    AND p.is_active = TRUE
    AND p.is_approved = TRUE
    -- Ensure professional has no overlapping active reservations
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_reservations br
      WHERE br.professional_id = p.id
        AND br.status IN ('HELD', 'CONFIRMED')
        AND br.expires_at > NOW()
        AND (p_start_at, p_end_at) OVERLAPS (br.start_at, br.end_at)
    )
  ORDER BY p.rating DESC, p.completed_jobs_count DESC
  LIMIT 1
  FOR UPDATE OF p SKIP LOCKED;

  v_hold_seconds := COALESCE(p_hold_duration_minutes, 15) * 60;
  v_expires_at := NOW() + (v_hold_seconds || ' seconds')::INTERVAL;

  -- 3. Insert slot hold reservation atomically
  INSERT INTO public.booking_reservations (
    user_id,
    service_id,
    variant_id,
    professional_id,
    service_area_id,
    start_at,
    end_at,
    expires_at,
    status,
    idempotency_key,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_service_id,
    p_variant_id,
    v_professional_id,
    p_service_area_id,
    p_start_at,
    p_end_at,
    v_expires_at,
    'HELD',
    p_idempotency_key,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_idempotent_replay', false,
    'reservation_id', v_reservation_id,
    'professional_id', v_professional_id,
    'expires_at', v_expires_at,
    'status', 'HELD'
  );
EXCEPTION
  WHEN unique_violation THEN
    -- In case of concurrent idempotency conflict
    SELECT id, status INTO v_existing_id, v_existing_status
    FROM public.booking_reservations
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_idempotent_replay', true,
        'reservation_id', v_existing_id,
        'status', v_existing_status
      );
    END IF;
    RAISE;
END;
$$;

-- Grant execution with explicit argument types to eliminate any ambiguity
GRANT EXECUTE ON FUNCTION public.reserve_booking_slot(UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) TO authenticated, service_role;
