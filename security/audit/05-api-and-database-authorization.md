# 05 — API & DATABASE AUTHORIZATION MATRIX

## 1. REST & WebSocket Endpoint Authorization Matrix

| Endpoint / Event | HTTP Method / Transport | Required Role | Auth Guard | Rate Limit | Object-Level Verification |
|---|---|---|---|---|---|
| `/customers/bootstrap` | GET | Authenticated | `SupabaseAuthGuard` | 100/min | Returns profile for `req.user.id`. |
| `/fulfillment/confirm` | POST | Customer | `SupabaseAuthGuard` | 5/min | **Enforced**: `customerId` bound to `req.user.id`. |
| `/fulfillment/accept` | POST | Partner | `SupabaseAuthGuard` | 10/min | **Enforced**: `partnerId` bound to `req.user.id`. |
| `/fulfillment/start-service` | POST | Partner | `SupabaseAuthGuard` | 10/min | **Enforced**: `partnerId` bound to `req.user.id`. |
| `/fulfillment/complete-service` | POST | Partner | `SupabaseAuthGuard` | 10/min | **Enforced**: `partnerId` bound to `req.user.id`. |
| `/fulfillment/cancel` | POST | Customer / Partner / Admin | `SupabaseAuthGuard` | 3/min | **Enforced**: `actorId` bound to `req.user.id`. |
| `/finance/payments/capture` | POST | Authenticated | `SupabaseAuthGuard` | 10/min | **Enforced**: Caller ID recorded; HMAC signature verified. |
| `/finance/refunds` | POST | Admin / Authorized | `SupabaseAuthGuard` | 3/min | **Enforced**: Caller ID verified; strict idempotent refund. |
| `/finance/invoices/:id` | GET | Customer / Owner | `SupabaseAuthGuard` | 30/min | Bound to `req.user.id`. |
| `tracking:location:update` | WS Message | Partner | Socket Handshake | Max 1 / 2000ms | Only active partner assigned to room. |

---

## 2. PostgreSQL Row-Level Security (RLS) Matrix

| Table Name | RLS Enabled | Policies Count | Permitted Access Rules |
|---|---|---|---|
| `users` | TRUE | 2 | Users can only SELECT and UPDATE their own record (`auth.uid() = id`). |
| `customer_profiles` | TRUE | 3 | Customers can only manage their own profile (`auth.uid() = user_id`). |
| `bookings` | TRUE | 4 | Customers view/insert own bookings (`auth.uid() = customer_id`); realtime updates enabled. |
| `booking_items` | TRUE | 4 | Customers manage own items linked to their bookings. |
| `payments` | TRUE | 1 | Users can only SELECT payments where `auth.uid() = user_id`. |
| `refunds` | TRUE | 1 | Users can only view refunds on their own payments. |
| `invoices` | TRUE | 1 | **Hardened**: Customers can only view invoices where `auth.uid() = customer_id`. |
| `tracking_sessions` | TRUE | 0 (RPC Mediated) | Access strictly mediated through authoritative SECURITY DEFINER functions. |
| `tracking_audit_log` | TRUE | 1 | **Hardened**: Service role only; no direct client mutations. |
| `services` | TRUE | 2 | Public read-only for active catalog services (`is_active = TRUE`). |

---

## 3. SECURITY DEFINER RPC Privileges Hardening

| Function Name | Target Roles Pre-Audit | Target Roles Post-Remediation | Caller Verification (`auth.uid()`) |
|---|---|---|---|
| `confirm_orchestrated_payment` | `anon`, `authenticated` | `authenticated`, `service_role` | Verified payment ownership in session. |
| `verify_and_confirm_booking` | `anon`, `authenticated` | `authenticated`, `service_role` | Caller verified against booking record. |
| `create_booking_payment_order` | `anon`, `authenticated` | `authenticated`, `service_role` | `auth.uid() == p_user_id` strictly enforced. |
| `authoritative_cancel_booking` | `anon`, `authenticated` | `authenticated`, `service_role` | Authoritative state machine validation. |
| `authoritative_complete_service` | `anon`, `authenticated` | `authenticated`, `service_role` | Validates assigned partner identity. |
| `cleanup_expired_tracking_data` | `anon`, `authenticated` | `service_role` ONLY | Scheduled maintenance procedure. |
