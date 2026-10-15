# 03 — EVIDENCE-BASED SECURITY FINDINGS

## Finding Classification Summary

| Finding ID | Title | Severity | Confidence | Status |
|---|---|---|---|---|
| **API-SEC-01** | Missing Authentication Guard on Finance Endpoints | CRITICAL | HIGH | **REMEDIATED** |
| **API-SEC-02** | Signature Verification Bypass in Razorpay Adapter | CRITICAL | HIGH | **REMEDIATED** |
| **API-SEC-03** | Broken Object-Level Authorization (BOLA/IDOR) in Fulfillment | CRITICAL | HIGH | **REMEDIATED** |
| **DB-SEC-01** | Public Execute Grants on Sensitive PostgreSQL RPCs | CRITICAL | HIGH | **REMEDIATED (MIGRATION)** |
| **SEC-01** | Hardcoded Third-Party API Credentials in Version Control | HIGH | HIGH | **REMEDIATED** |
| **MOB-SEC-01** | Plaintext Session & Token Storage in React Native AsyncStorage | HIGH | HIGH | **RESIDUAL RISK** |
| **DEP-SEC-01** | Critical & High Advisories in Dependency Tree (`proxy-addr`, `shell-quote`) | MEDIUM | HIGH | **IDENTIFIED** |
| **MOB-SEC-02** | Debug Keystore Used in Release Signing Configuration | MEDIUM | HIGH | **IDENTIFIED** |
| **MOB-SEC-03** | R8 / Proguard Minification Disabled in Release Builds | LOW | HIGH | **IDENTIFIED** |

---

## Detailed Findings

### [API-SEC-01] Missing Authentication Guard on Finance Endpoints
- **Severity**: CRITICAL | **Confidence**: HIGH
- **Component**: [`apps/api/src/finance/finance.controller.ts`](file:///c:/dev/serventica-app/apps/api/src/finance/finance.controller.ts)
- **Evidence**:
  ```typescript
  // PRE-REMEDIATION CODE:
  @Controller('finance')
  export class FinanceController {
    @Post('payments/capture')
    async capturePayment(@Body() body: AuthoritativeCaptureParams) { ... }
    @Post('refunds')
    async processRefund(@Body() body: AuthoritativeRefundParams) { ... }
  ```
- **Attack Scenario**: An unauthenticated attacker sends an HTTP POST request to `/finance/refunds` or `/finance/payments/capture`. The request is processed without token validation, executing financial transactions without an authenticated principal.
- **Remediation**: Added `@UseGuards(SupabaseAuthGuard)` to the controller and bound `actorId` and `capturedBy` strictly to `req.user.id`. Added `@Throttle` to cap captures to 10/min and refunds to 3/min.

---

### [API-SEC-02] Signature Verification Bypass in Razorpay Adapter
- **Severity**: CRITICAL | **Confidence**: HIGH
- **Component**: [`apps/api/src/finance/razorpay-provider.adapter.ts`](file:///c:/dev/serventica-app/apps/api/src/finance/razorpay-provider.adapter.ts#L43-L46)
- **Evidence**:
  ```typescript
  // PRE-REMEDIATION CODE:
  if (params.signature.startsWith('sig_test_') || params.signature.startsWith('sig_')) {
    return true;
  }
  ```
- **Attack Scenario**: Attacker places an order, intercepts payment completion, and submits `providerSignature: "sig_attacker_fake"`. The server bypasses HMAC validation and confirms the booking without real funds transfer.
- **Remediation**: Removed the `sig_` prefix bypass. Implemented strict `crypto.timingSafeEqual` over HMAC-SHA256 digest. Restricting mock signatures strictly to `NODE_ENV === 'test'` with an explicit environment opt-in flag.

---

### [API-SEC-03] Broken Object-Level Authorization (BOLA/IDOR) in Fulfillment
- **Severity**: CRITICAL | **Confidence**: HIGH
- **Component**: [`apps/api/src/fulfillment/fulfillment.controller.ts`](file:///c:/dev/serventica-app/apps/api/src/fulfillment/fulfillment.controller.ts)
- **Evidence**:
  ```typescript
  // PRE-REMEDIATION CODE:
  @Post('confirm')
  async confirmBooking(@Body() body: ConfirmBookingParams) {
    return this.fulfillmentService.confirmBooking(body);
  }
  ```
- **Attack Scenario**: Attacker initiates booking confirmation specifying another user's `customerId` in the JSON payload.
- **Remediation**: Bound `customerId = req.user.id` and `partnerId = req.user.id` authoritatively in `FulfillmentController`.

---

### [DB-SEC-01] Public Execute Grants on Sensitive PostgreSQL RPCs
- **Severity**: CRITICAL | **Confidence**: HIGH
- **Component**: Supabase PostgreSQL Functions (26 `SECURITY DEFINER` functions)
- **Evidence**: Live database catalog query showed:
  ```json
  {"fn":"authoritative_cancel_booking","anon_exec":true,"auth_exec":true,"checks_uid":false}
  {"fn":"authoritative_complete_service","anon_exec":true,"auth_exec":true,"checks_uid":false}
  ```
- **Attack Scenario**: Any client with the public anon key can call `supabase.rpc('authoritative_cancel_booking', { p_booking_id: ... })` to terminate any booking across the system.
- **Remediation**: Created migration [`20261010000001_security_hardening_rpcs_and_grants.sql`](file:///c:/dev/serventica-app/supabase/migrations/20261010000001_security_hardening_rpcs_and_grants.sql) revoking execute privileges from `anon` on all state-mutating RPCs, restricting maintenance functions to `service_role`, and enforcing `auth.uid() == p_user_id`.

---

### [SEC-01] Hardcoded Third-Party API Credentials in Version Control
- **Severity**: HIGH | **Confidence**: HIGH
- **Component**: [`android/app/src/main/AndroidManifest.xml`](file:///c:/dev/serventica-app/android/app/src/main/AndroidManifest.xml#L77), [`packages/config/src/index.ts`](file:///c:/dev/serventica-app/packages/config/src/index.ts)
- **Evidence**: Google Maps API Key `AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g` and Razorpay Test Key `rzp_test_TdYpNoPP7IoSJR` hardcoded in source repository.
- **Attack Scenario**: Reverse engineer or public repo reader extracts the Google Maps key, incurring unauthorized geocoding and directions API quota charges.
- **Remediation**: Parameterized `packages/config/src/index.ts` to prioritize `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and `EXPO_PUBLIC_RAZORPAY_KEY_ID`. Documented rotation and Google Cloud Console SHA-1 fingerprint restriction requirement.

---

### [MOB-SEC-01] Plaintext Session & Token Storage in React Native
- **Severity**: HIGH | **Confidence**: HIGH
- **Component**: [`apps/customer/src/lib/supabase/client.ts`](file:///c:/dev/serventica-app/apps/customer/src/lib/supabase/client.ts#L17)
- **Evidence**: `SafeAsyncStorage` delegates to `@react-native-async-storage/async-storage`, which writes unencrypted XML to `/data/data/com.serventicaapp/shared_prefs/` on Android.
- **Attack Scenario**: Attacker with physical access or malware on rooted device extracts the refresh token and hijacks the customer's account indefinitely.
- **Recommendation**: Migrate to `react-native-keychain` or `expo-secure-store` for session token storage before app store release.
