# 02 — STRIDE THREAT MODEL & ABUSE SCENARIOS

## 1. Threat Actors & Capabilities

| Threat Actor | Motivation | Capabilities & Vectors | Assumed Access |
|---|---|---|---|
| **External Malicious Attacker** | Financial theft, data leakage, denial of service | Reverse engineering APK/IPA, extracting keys, replaying API requests, bypassing UI controls | Public network, anon Supabase key, official mobile client binary |
| **Malicious Authenticated Customer** | Free services, fraudulent cancellations, refund abuse | Intercepting HTTPS/WSS, tampering with IDs, forging parameters, concurrent slot holds | Valid Supabase customer account & JWT |
| **Rogue / Compromised Partner** | Unauthorized payouts, location spoofing, customer harassment | Tampering with tracking WebSocket, spoofing GPS coordinates, marking jobs completed prematurely | Valid partner identity |
| **Compromised Dependency / Supply Chain** | Remote code execution, credential exfiltration | Malicious npm postinstall scripts, vulnerable transitive dependencies (`proxy-addr`, `shell-quote`) | Build-time and runtime Node.js execution |

---

## 2. STRIDE Matrix Evaluation

| Threat Category | Target Component | Threat Scenario | Mitigating Control Implemented | Status |
|---|---|---|---|---|
| **Spoofing (S)** | NestJS API & WebSocket | Attacker submits fake JWT or claims `role: 'PARTNER'` in WebSocket handshake. | `SupabaseAuthGuard` validates token server-side via `auth.getUser()`; connection capped. | **Mitigated** |
| **Tampering (T)** | Payment Verification Adapter | Attacker passes `sig_fake123` to capture payment without authorization. | Backdoor removed; strict `crypto.timingSafeEqual` HMAC-SHA256 required. | **Mitigated** |
| **Repudiation (R)** | Booking & Financial Ledger | Customer or Partner denies order confirmation or cancellation. | Double-entry journal entries in `ledger_transactions` and outbox audit log. | **Mitigated** |
| **Information Disclosure (I)** | React Native Local Storage | Attacker extracts JWT and session tokens from unencrypted storage on rooted device. | Tokens currently stored in `AsyncStorage`. Needs Keystore migration. | **Residual Risk** |
| **Denial of Service (D)** | Tracking WebSocket & API | Attacker opens 10,000 WebSocket connections or spams GPS updates. | Multi-tier ThrottlerGuard on HTTP; 500 connection cap & 2000ms ping throttle on WS. | **Mitigated** |
| **Elevation of Privilege (E)** | PostgreSQL RPCs & Finance API | Unauthenticated caller executes `authoritative_cancel_booking` or calls `/finance/refunds`. | Public execute revoked on 15 RPCs; `SupabaseAuthGuard` added to `FinanceController`. | **Mitigated** |

---

## 3. High-Priority Abuse Cases Evaluated

### Abuse Case AC-01: Fraudulent Booking Confirmation via Signature Forgery
- **Precondition**: Attacker has a valid customer account and initiates a booking.
- **Attack Vector**: Attacker intercepts payment callback and calls `POST /finance/payments/capture` with `providerSignature: "sig_bypass_123"`.
- **Pre-Remediation Outcome**: Server returned `success: true` and marked booking `CAPTURED` due to `sig_` prefix check.
- **Post-Remediation Outcome**: HMAC calculation fails, server returns `400 Bad Request ("Invalid provider payment signature")`.

### Abuse Case AC-02: Cross-Customer Booking Takeover (BOLA/IDOR)
- **Precondition**: Customer A and Customer B both have active bookings.
- **Attack Vector**: Customer A sends `POST /fulfillment/confirm` with `customerId: CustomerB_ID`.
- **Pre-Remediation Outcome**: Server trusted `customerId` from request body and confirmed booking under Customer B.
- **Post-Remediation Outcome**: Server overrides `customerId` with `req.user.id`, preventing cross-user substitution.

### Abuse Case AC-03: Arbitrary Booking Cancellation via Anonymous Supabase RPC
- **Precondition**: Attacker has Supabase project URL and anon public key.
- **Attack Vector**: Attacker calls `supabase.rpc('authoritative_cancel_booking', { p_booking_id: victimBookingId })`.
- **Pre-Remediation Outcome**: RPC executed with `SECURITY DEFINER` privileges and cancelled the victim's order.
- **Post-Remediation Outcome**: RPC call rejected with `permission denied for function authoritative_cancel_booking` for anon role.
