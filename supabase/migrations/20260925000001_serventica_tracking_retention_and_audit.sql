-- ==============================================================================
-- SERVENTICA — SERV-06: DATA RETENTION, LIFECYCLE MANAGEMENT & DURABLE AUDIT LOG
-- Production Data Lifecycle Policies, Operational Cleanup RPCs,
-- Business Event Audit Trails with Correlation IDs
-- ==============================================================================

-- 1. TRACKING BUSINESS AUDIT LOG TABLE
-- Captures high-level authoritative lifecycle transitions (not high-frequency GPS points)
CREATE TABLE IF NOT EXISTS public.tracking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'BOOKING_ASSIGNED',
    'TRACKING_STARTED',
    'PARTNER_EN_ROUTE',
    'GEOFENCE_ENTERED',
    'PARTNER_ARRIVED',
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'BOOKING_CANCELLED',
    'TRACKING_TERMINATED'
  )),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('CUSTOMER', 'PARTNER', 'SYSTEM', 'ADMIN')),
  actor_id TEXT NOT NULL,
  correlation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_audit_booking ON public.tracking_audit_log(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_audit_event ON public.tracking_audit_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_audit_correlation ON public.tracking_audit_log(correlation_id) WHERE correlation_id IS NOT NULL;

-- 2. OPERATIONAL DATA RETENTION & CLEANUP PROCEDURE
-- Purges non-essential, ephemeral telemetry and aged audit events
-- Rules:
-- 1. NEVER deletes active bookings or active tracking sessions.
-- 2. Retains completed/cancelled tracking sessions for 90 days.
-- 3. Retains delivered notification events for 30 days.
-- 4. Retains business audit logs for 180 days (tax/regulatory compliance).
CREATE OR REPLACE FUNCTION public.cleanup_expired_tracking_data(
  p_session_retention_days INT DEFAULT 90,
  p_notification_retention_days INT DEFAULT 30,
  p_audit_retention_days INT DEFAULT 180
)
RETURNS JSONB AS $$
DECLARE
  v_deleted_sessions INT := 0;
  v_deleted_notifications INT := 0;
  v_deleted_audit INT := 0;
BEGIN
  -- 1. Purge completed/cancelled tracking sessions older than threshold
  DELETE FROM public.tracking_sessions
  WHERE status IN ('SERVICE_COMPLETED', 'CANCELLED')
    AND updated_at < NOW() - (p_session_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  -- 2. Purge delivered or failed notification events older than threshold
  DELETE FROM public.notification_events
  WHERE status IN ('DELIVERED', 'FAILED')
    AND created_at < NOW() - (p_notification_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

  -- 3. Purge business audit logs older than threshold
  DELETE FROM public.tracking_audit_log
  WHERE created_at < NOW() - (p_audit_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_sessions', v_deleted_sessions,
    'deleted_notifications', v_deleted_notifications,
    'deleted_audit_logs', v_deleted_audit,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
