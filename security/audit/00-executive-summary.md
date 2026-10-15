# 00 — EXECUTIVE SECURITY SUMMARY

## Overall Verdict: CONDITIONALLY READY (Remediated Scope) / HIGH (Baseline Scope)

This document synthesizes the results of an adversarial, full-stack application security audit, threat model, and controlled penetration review of **Serventica Home Services Platform** (monorepo consisting of Bare React Native 0.86.3 mobile app, NestJS 12.0.1 backend API, and Supabase PostgreSQL 17 database).

Prior to audit remediation, the application exhibited **High-to-Critical risk**, driven primarily by:
1. **Unauthenticated Financial Controllers**: The NestJS `/finance` API lacked authentication guards, exposing payment capture and refund endpoints to anonymous callers.
2. **Cryptographic Payment Signature Backdoor**: The backend Razorpay adapter contained an insecure test condition that accepted any signature starting with `sig_` or `sig_test_`.
3. **Broken Object-Level Authorization (BOLA/IDOR)**: The `/fulfillment` controller accepted `customerId` and `partnerId` from untrusted request bodies rather than extracting them authoritatively from the verified session.
4. **Database-Level Authorization Bypass**: 26 `SECURITY DEFINER` PostgreSQL functions had public execution grants to the unauthenticated `anon` role, lacking `auth.uid()` checks.
5. **Hardcoded Secrets**: Google Maps SDK API key and Razorpay test merchant key were hardcoded in mobile code and manifests.

---

## Key Risk Metrics

| Metric | Baseline | Post-Remediation |
|---|---|---|
| **Critical Findings** | 4 | 0 (Unresolved: 0, Remediated: 4) |
| **High Findings** | 4 | 1 (Storage hardening requires native migration) |
| **Medium Findings** | 5 | 2 (Supply-chain & IP spoofing controls) |
| **Low / Informational** | 4 | 4 (Defense-in-depth recommendations) |
| **Status** | **HIGH RISK** | **CONDITIONALLY READY** |

---

## Remediated Vulnerabilities Summary

| ID | Title | Severity | Status | Remediated File |
|---|---|---|---|---|
| **API-SEC-01** | Missing Authentication Guard on Finance Endpoints | CRITICAL | **FIXED** | [`apps/api/src/finance/finance.controller.ts`](file:///c:/dev/serventica-app/apps/api/src/finance/finance.controller.ts) |
| **API-SEC-02** | Signature Verification Bypass in Razorpay Adapter | CRITICAL | **FIXED** | [`apps/api/src/finance/razorpay-provider.adapter.ts`](file:///c:/dev/serventica-app/apps/api/src/finance/razorpay-provider.adapter.ts) |
| **API-SEC-03** | BOLA / IDOR in Fulfillment State Machine Endpoints | CRITICAL | **FIXED** | [`apps/api/src/fulfillment/fulfillment.controller.ts`](file:///c:/dev/serventica-app/apps/api/src/fulfillment/fulfillment.controller.ts) |
| **DB-SEC-01** | Public Execution Grants on Sensitive PostgreSQL RPCs | CRITICAL | **FIXED (MIGRATION)** | [`supabase/migrations/20261010000001_security_hardening_rpcs_and_grants.sql`](file:///c:/dev/serventica-app/supabase/migrations/20261010000001_security_hardening_rpcs_and_grants.sql) |
| **SEC-01** | Hardcoded Third-Party API Credentials in Config | HIGH | **FIXED** | [`packages/config/src/index.ts`](file:///c:/dev/serventica-app/packages/config/src/index.ts) |

---

## Residual Risks Requiring Action

1. **Native Secure Storage Migration**: The mobile client continues to persist Supabase session tokens in unencrypted `@react-native-async-storage/async-storage`. Migration to Android Keystore / iOS Keychain (via `react-native-keychain` or `expo-secure-store`) must be performed before production public release.
2. **Reverse Proxy IP Trust Configuration**: `proxy-addr` dependency advisory (GHSA-jqcg-44mw-7w3h) requires that the production gateway (NGINX/Cloudflare) strictly santize incoming client IPs before passing to Express.
3. **Google Cloud Console Restrictions**: Google Maps API Key `AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g` must have Android package (`com.serventicaapp`) and SHA-1 certificate fingerprint restrictions applied in the Google Cloud Console.
