# 01 — ARCHITECTURE & SENSITIVE DATA FLOWS

## 1. System Topology Overview

Serventica operates a dual-data-plane architecture split across a bare React Native client, a NestJS backend microservice, and Supabase managed PostgreSQL infrastructure:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Mobile Customer (apps/customer)
    participant Nest as NestJS API (apps/api:3000)
    participant Auth as Supabase Auth (GoTrue)
    participant DB as PostgreSQL 17 (Supabase)
    actor Partner as Mobile Partner

    Note over Customer,DB: 1. Authentication Lifecycle
    Customer->>Auth: signInWithOtp(phone) / signInWithOAuth(Google)
    Auth-->>Customer: Session JWT + Refresh Token
    Customer->>Customer: Persist in SafeAsyncStorage (AsyncStorage)

    Note over Customer,DB: 2. Core Booking & Fulfillment Flow
    Customer->>DB: rpc('create_booking_payment_order', params)
    DB-->>Customer: Authoritative Order & Pending Booking
    Customer->>Nest: POST /fulfillment/confirm (JWT Bearer)
    Nest->>Auth: auth.getUser(token) [Cached 5 min]
    Nest->>Nest: Verify callerId == customerId (BOLA Defense)
    Nest-->>Customer: 200 OK (Booking Confirmed)

    Note over Customer,DB: 3. Authoritative Payment Capture
    Customer->>Nest: POST /finance/payments/capture (JWT Bearer)
    Nest->>Nest: HMAC-SHA256 timing-safe signature verification
    Nest-->>Customer: 200 OK (Payment Captured)

    Note over Customer,Partner: 4. Real-time Live Tracking
    Partner->>Nest: WS Connect (handshake.auth.token)
    Partner->>Nest: WS 'tracking:location:update' (GPS coords)
    Nest->>Nest: Throttle pings (max 1 per 2 sec per partner)
    Nest->>Customer: WS Emit 'tracking:location:broadcast'
```

---

## 2. Trust Boundaries & Verification Gates

| Trust Boundary | Intersecting Components | Enforcement Mechanism | Assessment Finding |
|---|---|---|---|
| **TB-1: Mobile Client $\to$ Backend API** | `apps/customer` $\to$ `apps/api` | `SupabaseAuthGuard` (JWT Bearer) + `ThrottlerGuard` | **Secured** after adding Auth Guard to `FinanceController` and BOLA bindings to `FulfillmentController`. |
| **TB-2: Mobile Client $\to$ Database RPCs** | `apps/customer` $\to$ PostgreSQL | Supabase `anon` / `authenticated` JWT | **Hardened via Migration** (revoked `anon` execute on state-mutating RPCs; added `auth.uid()` checks). |
| **TB-3: WebSocket Gateway $\to$ Realtime Clients** | `TrackingGateway` $\to$ Sockets | Handshake token + room authorization | **Rate-limited (2000ms ping window & 500 connection cap)**. |
| **TB-4: Server $\to$ Third-Party Gateways** | `apps/api` $\to$ Razorpay / Maps | Server-side HMAC-SHA256 validation | **Hardened**: Removed `sig_` backdoor; enforced `crypto.timingSafeEqual`. |

---

## 3. Sensitive Data Flow Classification

| Data Asset | Storage Location | Transit Protocol | Classification | Controls |
|---|---|---|---|---|
| **Customer Auth Tokens** | AsyncStorage | HTTPS / WSS | Confidential | Vulnerable to extraction on rooted devices; Keystore migration required. |
| **Customer Physical Location** | `addresses` table, live sockets | HTTPS / WSS | PII / Confidential | RLS restricts access to owner customer and assigned partner. |
| **Partner Live GPS Coordinates** | In-memory socket rooms, `tracking_sessions` | WSS | Sensitive | Broadcasted only to subscribers authorized for the active `bookingId`. |
| **Financial Ledger Entries** | `ledger_entries`, `payments` | HTTPS | Restricted Financial | Double-entry balanced; modification restricted to `service_role`. |
| **Third-Party API Credentials** | Environment variables, `.env` | Server runtime | Secret | Server-side only; prohibited from mobile client bundling. |
