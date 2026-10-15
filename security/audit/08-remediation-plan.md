# 08 — REMEDIATION PLAN & CHANGE CONTROL

## 1. Implemented Changes

The following changes have been implemented directly in the repository with regression tests passing:

1. **[`apps/api/src/finance/finance.controller.ts`](file:///c:/dev/serventica-app/apps/api/src/finance/finance.controller.ts)**:
   - Added `@UseGuards(SupabaseAuthGuard)` across all financial endpoints.
   - Added `@Throttle` limits: 10/min for payment captures, 3/min for refund processing.
   - Bound actor identity authoritatively to `req.user.id`.
2. **[`apps/api/src/finance/razorpay-provider.adapter.ts`](file:///c:/dev/serventica-app/apps/api/src/finance/razorpay-provider.adapter.ts)**:
   - Eliminated `sig_` and `sig_test_` bypass checks.
   - Applied constant-time comparison via `crypto.timingSafeEqual`.
3. **[`apps/api/src/fulfillment/fulfillment.controller.ts`](file:///c:/dev/serventica-app/apps/api/src/fulfillment/fulfillment.controller.ts)**:
   - Bound `customerId` and `partnerId` authoritatively to `req.user.id` to eliminate BOLA/IDOR vulnerabilities.
4. **[`packages/config/src/index.ts`](file:///c:/dev/serventica-app/packages/config/src/index.ts)**:
   - Parameterized Google Maps and Razorpay configuration to prioritize runtime environment variables.
5. **[`supabase/migrations/20261010000001_security_hardening_rpcs_and_grants.sql`](file:///c:/dev/serventica-app/supabase/migrations/20261010000001_security_hardening_rpcs_and_grants.sql)**:
   - Revoked public/anon execution grants on state-mutating PostgreSQL RPCs.
   - Enforced `auth.uid()` checks on booking creation RPCs.
   - Restricted maintenance functions to `service_role`.

---

## 2. Recommended Next-Phase Operations (Requires User Authorization)

1. **Database Migration Deployment**:
   - Run `npx supabase migration up` to apply `20261010000001_security_hardening_rpcs_and_grants.sql` to the live database project `gzaihyhglxelrahoopju`.
2. **Google Cloud Console API Key Restriction**:
   - Add Application Restriction: Android apps $\to$ Package name `com.serventicaapp` with release SHA-1 certificate fingerprint.
   - Restrict API scope: Google Maps SDK for Android and Places API only.
3. **Android Release Keystore Generation**:
   - Generate production upload keystore (`my-upload-key.keystore`) and configure Gradle properties outside version control.
