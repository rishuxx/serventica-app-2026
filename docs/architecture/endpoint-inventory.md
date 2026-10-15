# Serventica Backend Endpoint Inventory

This document provides an exhaustive inventory of all REST endpoints, WebSocket events, and RPC functions in the Serventica backend platform (`apps/api` and PostgreSQL RPCs).

## 1. REST Endpoints (`apps/api`)

### 1.1 Health & Diagnostics (`HealthController`)
- **Route**: `GET /health`
  - **Auth**: Public
  - **Purpose**: System liveness probe returning process status, memory, and database connectivity.
- **Route**: `GET /health/ready`
  - **Auth**: Public
  - **Purpose**: Kubernetes/container readiness probe checking downstream database and socket gateway health.

### 1.2 Instant Fulfillment Engine (`InstantController`)
- **Base Paths**: `/instant`, `/api/v1/instant`
- **Endpoints**:
  - `POST /quote`: Generates a tamper-proof quote snapshot with distance/duration surcharges and 10-minute expiry.
  - `POST /book`: Initiates instant booking, acquires idempotency lock, triggers dispatch wave engine.
  - `POST /:bookingId/cancel`: Authoritative customer cancellation with cancellation fee computation.
  - `POST /:bookingId/extend`: Adds 30-minute block extensions to in-progress Helping Hand jobs.
  - `GET /:bookingId/status`: Retrieves authoritative persisted booking and dispatch state.

### 1.3 Partner Operations (`PartnerController`)
- **Base Paths**: `/partner`, `/api/v1/partner`
- **Endpoints**:
  - `POST /presence`: Updates partner online/offline/busy status.
  - `POST /location`: High-frequency partner coordinate ingestion with geo-bounds validation.
  - `GET /offers/pending`: Retrieves active dispatch wave offers awaiting partner response.
  - `POST /offers/:offerId/respond`: Partner acceptance or rejection of dispatch wave offer (enforces atomic exclusivity).
  - `POST /booking/:bookingId/arrived`: Signals partner arrival at customer premises.
  - `POST /booking/:bookingId/start`: Starts service countdown timer with OTP verification.
  - `POST /booking/:bookingId/complete`: Confirms service completion, captures final billable units.

### 1.4 General Fulfillment & Scheduled Bookings (`FulfillmentController`)
- **Base Paths**: `/fulfillment`, `/api/v1/fulfillment`
- **Endpoints**:
  - `GET /serviceability`: Checks geographical serviceability by latitude/longitude.
  - `GET /availability/slots`: Retrieves valid future scheduling slots considering partner capacity.
  - `POST /bookings/scheduled`: Reserves and creates a scheduled booking.
  - `POST /bookings/:bookingId/reschedule`: Atomically modifies scheduled booking slot.

### 1.5 Finance & Ledger (`FinanceController`)
- **Base Paths**: `/finance`, `/api/v1/finance`
- **Endpoints**:
  - `POST /payments/initiate`: Creates payment intent with provider (Cashfree / Razorpay / Supabase Sandbox).
  - `POST /payments/webhook`: Authoritative provider webhook handler with HMAC signature verification.
  - `POST /refunds/request`: Triggers audited refund for cancelled or disputed bookings.
  - `GET /ledger/statement`: Financial audit trail for accounts.

### 1.6 Customer Account Management (`CustomersController`)
- **Base Paths**: `/customers`, `/api/v1/customers`
- **Endpoints**:
  - `GET /me`: Retrieves authenticated customer profile and verification level.
  - `PUT /me`: Updates customer profile attributes (first/last name, preferences).
  - `GET /addresses`: Lists saved addresses for current customer.
  - `POST /addresses`: Creates validated address with geographic coordinates.

### 1.7 Administrative Operations (`AdminController`)
- **Base Paths**: `/admin`, `/api/v1/admin`
- **Endpoints**:
  - `GET /dispatch/active`: Real-time monitoring of all in-flight instant dispatch requests.
  - `POST /dispatch/:bookingId/intervene`: Admin manual partner reassignment or emergency abort.
  - `GET /partners/pending`: List of partner onboarding submissions awaiting document verification.
  - `POST /partners/:partnerId/verify`: Approves or rejects partner background checks.
  - `GET /audit/logs`: Immutable administrative audit logs.

---

## 2. Realtime WebSocket Gateway (`TrackingGateway`)
- **Namespace**: `/tracking`
- **Authentication**: JWT Bearer token via query or handshake headers.
- **Client Rooms**:
  - `tracking:{bookingId}`: Joined by authorized customer and assigned partner.
  - `partner:{partnerId}`: Private room for instant offer dispatch notifications.
- **Events Emitted by Server**:
  - `dispatch:new_offer`: Notifies partner of high-priority wave assignment offer.
  - `partner:location`: Streams low-latency partner coordinates to customer tracking map.
  - `partner:arrived`: Signals partner arrival at doorstep.
  - `job:started`: Signals active job timer started.
  - `job:extension_prompt`: Prompts customer for 30m overtime extension.
  - `job:extension_confirmed`: Confirms extension approved.
  - `job:completed`: Signals service finalized.
  - `job:redispatching`: Signals partner cancellation and wave escalation.
  - `job:cancelled`: Signals terminal cancellation.

---

## 3. Database Remote Procedure Calls (RPCs)
- `check_serviceability(p_lat, p_lng)`: PostGIS polygon containment check.
- `atomic_accept_dispatch_offer(p_offer_id, p_partner_id)`: Atomic conditional assignment lock.
- `append_fulfillment_outbox_event(...)`: Transactional outbox event insertion.
- `record_ledger_entry(...)`: Double-entry accounting transaction balance check.
