# SERVENTICA LIVE TRACKING — PRODUCTION OPERATIONAL RUNBOOK

## 1. Overview & System Topology

The Serventica Live Tracking ecosystem is a distributed real-time platform delivering sub-second GPS coordinate delivery, battery-conscious mobile tracking, arrival geofencing, and idempotent notifications.

```
Partner Phone (BackgroundLocationManager)
       ↓ (partner:location)
Socket.IO Gateway (/tracking)
       ↓
LocationValidationService -> TrackingSessionService -> GeofenceService
       ↓
Postgres (Supabase) + PushNotificationService
       ↓
Customer App (useTrackingStore -> LiveTrackingMap)
```

---

## 2. Health & Monitoring Endpoints

| Endpoint | Method | Expected Output | Purpose |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | `{"status":"ok","service":"serventica-api"}` | Liveness probe (Kubernetes / ECS) |
| `/health/ready` | `GET` | `{"status":"ready","database":"connected","socket":"ready"}` | Readiness probe |
| `/health/tracking` | `GET` | `{"status":"healthy","metrics":{"activeTrackingSessions":N,...}}` | Operational metrics & session monitor |

---

## 3. Operational Troubleshooting

### A. Diagnosing Stale GPS
- **Symptoms**: Customer map badge displays `GPS Signal Stale` (grey indicator).
- **Causes**:
  1. Partner device entered aggressive OS battery saver.
  2. Partner entered basement / cellular dead zone.
  3. Partner revoked location permission while on trip.
- **Remediation**:
  1. Check partner presence heartbeat in `partner_presence_sessions`.
  2. Verify if background service is running on partner device (`SERVENTICA_PARTNER_BACKGROUND_TRACKING`).
  3. If $> 5\text{ mins}$, dispatch operational SMS or automated fallback prompt to partner.

### B. Diagnosing Socket Reconnection Storms
- **Symptoms**: High spikes in `/tracking` connection attempts; elevated CPU usage.
- **Verification**: Check client backoff settings in `SocketConnectionManager.ts`. Confirm exponential backoff ($1\text{s} \to 30\text{s}$) with jitter ($0.5$).
- **Remediation**:
  1. Verify edge load balancer WebSocket timeouts (minimum 60s idle timeout).
  2. Ensure Socket.IO ping interval ($10\text{s}$) and timeout ($5\text{s}$) match gateway configurations.

### C. Diagnosing Routing / ETA Provider Failures
- **Symptoms**: Live route polyline missing; distance displays fallback straight-line estimate.
- **Verification**: Check Mapbox API status or quota limits.
- **Remediation**:
  1. `RoutingProviderFactory` automatically cascades to Google Maps / OSRM fallback if Mapbox returns HTTP 429 or 5xx.
  2. Verify `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in environment config.

### D. Diagnosing Notification Failures
- **Symptoms**: Customer reports not receiving push notifications when partner arrives.
- **Verification**: Query `notification_events` table:
  ```sql
  SELECT * FROM public.notification_events 
  WHERE booking_id = 'YOUR_BOOKING_UUID' 
  ORDER BY created_at DESC;
  ```
- **Remediation**:
  1. Check `user_devices` to verify customer has an active `push_token` registered.
  2. Verify that `idempotency_key` was not prematurely marked as sent.

---

## 4. Secret Rotation & Environment Configuration

### Mandatory Environment Variables
```bash
# Backend / API
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey...

# Customer & Partner Mobile App
EXPO_PUBLIC_API_URL=https://api.serventica.com
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### Rotation Procedures
1. **Mapbox Public Token**: Update `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in CI/CD pipeline and trigger app bundle rebuild.
2. **Supabase Service Key**: Update in backend environment variables and execute zero-downtime rolling restart of `apps/api`.
3. **Database Migration Rollback**: All migrations in `supabase/migrations/` are non-destructive and use `IF NOT EXISTS` / `CREATE OR REPLACE`. To revert, execute the corresponding down-migration script.
