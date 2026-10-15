# Serventica Instant — Full Product & Implementation Master Plan
**Document Version:** 1.0.0-PROD  
**Architecture Classification:** High-Concurrency Rapid On-Demand Fulfillment Network  
**Target Applications:** `@serventica/customer`, `@serventica/api` (NestJS), `@serventica/partner` (Future Integration), `@serventica/admin`

---

## 1. Executive Summary & Core Understanding ("In Short")

### 1.1 The Fundamental Distinction
"Instant" in Serventica is **not** a new category, nor is it merely a button on the UI. It is a **dedicated fulfillment mode** powered by a high-velocity dispatch and matching engine.

$$\text{Category} = \mathbf{WHAT} \text{ the customer needs (e.g., Cleaning, AC Repair, Manpower, Vehicle Assist)}$$
$$\text{Fulfillment Mode} = \mathbf{HOW/WHEN} \text{ Serventica fulfills it (Instant vs. Scheduled)}$$

```
                         SERVENTICA PLATFORM
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
     SERVICES (Catalog)                            INSTANT (Rapid Portal)
         │                                                 │
 ┌───────┼────────┐                                ┌───────┼─────────┐
 │       │        │                                │       │         │
 AC   Cleaning Plumbing                         Helping   Road    Laundry
                                                 Hand     Help      │
                                                           │     (Pickup)
                                                      Pack & Move
                                                           │
                                                           ▼
                                               UNIFIED FULFILLMENT ENGINE
                                                           │
                                        ┌──────────────────┴──────────────────┐
                                        │                                     │
                                     INSTANT                              SCHEDULED
                                (Dispatch Wave)                       (Slot Reservation)
                                        │                                     │
                                        └──────────────────┬──────────────────┘
                                                           │
                                              BOOKING & MULTI-ASSIGNMENT
```

### 1.2 Core Product Tenets
1. **Instant $\neq$ Emergency:** Serventica Instant provides priority, on-demand assistance subject to live partner availability. It does **not** handle medical, police, or fire crises, avoiding impossible legal SLAs and liability traps.
2. **One Fulfillment Engine, Zero Silos:** We do not build 4 distinct booking pipelines (`HelpingHandBooking`, `FuelBooking`, etc.). Every instant request compiles down into a normalized `FulfillmentIntent` that produces a `Booking` with 1-to-$N$ `BookingAssignments`.
3. **Multi-Partner from Day One:** `Pack & Move` or heavy tasks require 2 or more helpers. The assignment layer must support `required_partner_count` atomically, rather than binding a booking to a single partner ID.
4. **Partner-First API Readiness:** Every state transition and dispatch wave is designed with clean, versioned REST and WebSocket endpoints so the future Partner App can connect without touching backend logic.

---

## 2. Technology Stack & Architectural Fit

The architecture seamlessly expands Serventica's current monorepo structure:

| Layer | Technology | Role & Justification |
| :--- | :--- | :--- |
| **Backend Framework** | **NestJS (Node.js 22 + TypeScript)** in `apps/api` | Enterprise-grade modular architecture. Houses `FulfillmentModule`, `DispatchModule`, `PartnerModule`, and `PricingModule`. |
| **Database & Spatial** | **Supabase (PostgreSQL 15+ & PostGIS)** | Geospatial queries (`ST_DWithin`, `ST_Distance`), atomic RPC functions, Row-Level Security (RLS), and database transactions (`SERIALIZABLE` / row locking). |
| **Realtime Gateway** | **Socket.io + Supabase Realtime** | High-frequency GPS heartbeats from partners, instantaneous dispatch offer delivery, live customer tracking, and state broadcast. |
| **Mobile Frontend** | **React Native 0.86 / Expo 57** in `apps/customer` | Existing consumer mobile app leveraging `Reanimated 4`, `Lucide`, and `ServenticaTokens` design system. |
| **Partner Integration** | **REST + WebSocket Contracts** | Hardened endpoints with JWT principal validation, BOLA/IDOR prevention, and throttling via `@nestjs/throttler`. |
| **Routing & Distance Matrix** | **Mapbox Matrix API / OSRM Engine** | Accurate road-network ETAs rather than naive straight-line Euclidean distance calculations. |
| **Concurrency Control** | **PostgreSQL Advisory Locks (`pg_advisory_xact_lock`)** | Prevents partner double-booking race conditions and guarantees atomic slot/candidate locking during dispatch waves. |

---

## 3. The 4 Instant Services — Detailed Workflows

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            INSTANT SERVICE PORTFOLIO                            │
├────────────────────┬────────────────────┬───────────────────┬────────────────────┤
│ ⚡ Helping Hand     │ 🛠 Road Help        │ 🧺 Laundry Pickup │ 📦 Pack & Move     │
│ Quick household    │ On-demand roadside │ Instant pickup,   │ Multi-helper local │
│ manpower & support │ & mini-diagnosis   │ weighed at hub    │ moving & packing   │
└────────────────────┴────────────────────┴───────────────────┴────────────────────┘
```

### 3.1 Helping Hand
* **Concept:** General non-specialized human manpower for immediate household chores (Cleaning, Dishwashing, Organizing, Loading/Unloading, Basic kitchen aid).
* **Booking Durations:** 0.5 hr, 1.0 hr, 1.5 hr, 2.0 hr, 2.5 hr, 3.0 hr, 3.5 hr, 4.0 hr.
* **Pricing Formula:**  
  $$\text{Price} = (\text{Base Hourly Rate} \times \text{Duration}) \times \text{Helper Count} + \text{Difficulty Modifier} + \text{Location Surcharge}$$
* **Safety Boundaries:**  
  * *Permitted:* Household help, organizing, folding, dusting, non-hazardous assistance.  
  * *Prohibited:* Electrical wiring, gas appliances, structural plumbing, medical/elderly care, hazardous chemicals, exterior high-rise window cleaning.  
  * *UI Action:* If customer selects a specialized task, the app displays: *"This task requires a licensed professional"* and routes them to the verified Electrician/Plumber category.
* **Controlled Extension Engine:**
  1. At 75% elapsed duration (e.g. 45 mins into a 1-hour job), the customer app displays "Request Extension (+30 min)".
  2. The backend performs a **Conflict Check**: verifies whether the assigned partner has another booking within the next $[CurrentEnd + 30\text{m} + Buffer]$ window.
  3. If free $\rightarrow$ Dispatch extension prompt to Partner App. If busy $\rightarrow$ Immediately display: *"Extension unavailable: partner has a scheduled booking."*
  4. If partner accepts $\rightarrow$ Atomic duration update, quote delta recalculated, customer charged.

---

### 3.2 Road Help
* **Concept:** Rapid roadside diagnosis and immediate minor assistance for stranded motorists.
* **Mini-Diagnosis Wizard:**
  * **Step 1: What happened?**
    * ⛽ *Ran out of fuel*
    * 🛞 *Flat tyre*
    * 🔋 *Battery / Starting issue*
    * 🔧 *Vehicle breakdown*
    * 🛠 *Other vehicle issue*
  * **Step 2: Can the vehicle start?** (`YES` | `NO` | `NOT SURE`)
  * **Step 3: Vehicle Type:** (`Motorcycle / Bike` | `Scooter` | `Hatchback / Sedan` | `SUV / 4x4`)
* **Fuel Delivery Constraints (Crucial):**
  * **Strict Limit:** Exactly **1 Litre** (Petrol or Diesel).
  * **Explicit Messaging:** *"Emergency top-up designed strictly to reach the nearest fuel station."* No quantity selector (1L, 2L, 5L) to prevent illegal fuel-trading liability.
  * **Anti-Abuse Loophole Defense:** Same-vehicle / same-location rate limiting (e.g., maximum 1 fuel request per 48 hours per vehicle number).
  * **Compliance Gate:** Enabled only in zones with verified legal supplier fulfillment partnerships.
* **Capability Matching:**
  * Flat tyre $\rightarrow$ Dispatches partners with `TYRE_EQUIPMENT` capability.
  * Battery issue $\rightarrow$ Dispatches partners with `JUMPSTART_BATTERY` capability.
  * Breakdown $\rightarrow$ Dispatches partners with `MECHANICAL_DIAGNOSTIC` capability.

---

### 3.3 Laundry (Instant Pickup)
* **Concept:** Instant **pickup** of dirty laundry; not instant washing.
* **Workflow:**
  1. Customer requests instant pickup with approximate bag count / load (e.g., ~5 kg) and garment categories (Regular, Delicates, Bedding).
  2. Immediate partner dispatch for doorstep collection.
  3. Partner collects clothes and transports them to the processing hub.
  4. **The Weight Problem Solution:** The initial checkout is an **Estimated Quote**. At the hub, certified digital scales record the **Verified Weight**.
  5. If the verified amount deviates by more than 10%, an automated confirmation push is sent to the customer before washing begins.

---

### 3.4 Pack & Move (Local Shifting)
* **Concept:** Immediate moving and packing assistance for renters, students, and local shifting.
* **Multi-Helper Requirement:**
  * Supports 1, 2, or 3+ helpers (`required_partner_count: 2`).
  * Customer specifies duration or inventory scope (boxes, furniture, floor with/without elevator).
* **Atomic Multi-Partner Assignment:**
  * System reserves $N$ eligible partners simultaneously.
  * If Partner 1 accepts but Partner 2 declines, the dispatch wave continues until $N$ slots are filled or times out gracefully. Booking is not half-fulfilled.

---

## 4. End-to-End API Contracts (Ready for Partner App Integration)

All endpoints reside under `/api/v1` and are guarded by JWT authentication, role binding, and idempotency checks.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        API ARCHITECTURE OVERVIEW                       │
├────────────────────────────┬───────────────────────────────────────────┤
│ Customer Endpoints         │ Partner App Integration Endpoints         │
│ • Catalog & Dynamic ETA    │ • Presence & GPS Heartbeat                │
│ • Snapshotted Quotes       │ • Offer Inbox & Atomic Acceptance         │
│ • Intent & Dispatch Launch │ • Job Lifecycle (En Route, Arrived, Start)│
│ • Extensions & Tracking    │ • Extension Acceptance & Weight Record    │
└────────────────────────────┴───────────────────────────────────────────┘
```

### 4.1 Partner App Endpoints (`/api/v1/partner/*`)

These endpoints allow the Partner App to connect directly to the existing backend without rewriting any contracts.

#### 1. Partner Presence & Status
```http
POST /api/v1/partner/presence/status
Authorization: Bearer <partner_jwt>
Content-Type: application/json

Request:
{
  "status": "AVAILABLE", // "ONLINE" | "AVAILABLE" | "BUSY" | "OFFLINE"
  "currentLatitude": 30.316494,
  "currentLongitude": 78.032191
}

Response: 200 OK
{
  "success": true,
  "partnerId": "prt_8832a1",
  "status": "AVAILABLE",
  "activeJobId": null,
  "updatedAt": "2026-10-10T10:30:00.000Z"
}
```

#### 2. High-Frequency GPS Heartbeat
```http
POST /api/v1/partner/presence/heartbeat
Authorization: Bearer <partner_jwt>
Content-Type: application/json

Request:
{
  "latitude": 30.318210,
  "longitude": 78.034500,
  "heading": 142.5,
  "speed": 22.4, // km/h
  "accuracy": 4.8, // meters
  "recordedAt": "2026-10-10T10:31:05.120Z"
}

Response: 200 OK
{
  "acknowledged": true,
  "serverTime": "2026-10-10T10:31:05.150Z",
  "assignedJobId": "bok_44912" // null if unassigned
}
```

#### 3. Active Dispatch Offer Inbox
```http
GET /api/v1/partner/dispatch/offers/active
Authorization: Bearer <partner_jwt>

Response: 200 OK
{
  "offer": {
    "offerId": "off_9912",
    "bookingId": "bok_44912",
    "serviceType": "HELPING_HAND",
    "serviceTitle": "Helping Hand (Household Help)",
    "durationMinutes": 60,
    "payoutAmount": 280.00,
    "currency": "INR",
    "customerArea": "Nanda Ki Chowki, Dehradun",
    "distanceKm": 1.8,
    "estimatedTravelMinutes": 7,
    "expiresAt": "2026-10-10T10:32:15.000Z", // 45s countdown
    "requirements": {
      "taskCategory": "Cleaning & Dusting",
      "specialInstructions": "Bring floor wiper if possible"
    }
  }
}
```

#### 4. Accept Dispatch Offer (Atomic)
```http
POST /api/v1/partner/dispatch/offers/:offerId/accept
Authorization: Bearer <partner_jwt>
Content-Type: application/json

Request:
{
  "currentLocation": {
    "latitude": 30.318210,
    "longitude": 78.034500
  }
}

Response: 200 OK
{
  "success": true,
  "bookingId": "bok_44912",
  "assignmentStatus": "CONFIRMED",
  "customer": {
    "name": "Rishu",
    "addressLine": "House 12, Lane 4, Nanda Ki Chowki",
    "latitude": 30.325100,
    "longitude": 78.041200,
    "maskedContact": "+91-XXXXXXXX90"
  },
  "jobTimeline": {
    "assignedAt": "2026-10-10T10:31:45.000Z",
    "targetArrivalAt": "2026-10-10T10:40:00.000Z"
  }
}
```

#### 5. Decline Dispatch Offer
```http
POST /api/v1/partner/dispatch/offers/:offerId/decline
Authorization: Bearer <partner_jwt>
Content-Type: application/json

Request:
{
  "reason": "TOO_FAR" // "TOO_FAR" | "NOT_EQUIPPED" | "BUSY_OFFLINE" | "OTHER"
}

Response: 200 OK
{
  "acknowledged": true,
  "offerStatus": "REJECTED"
}
```

#### 6. Job Lifecycle Transitions
* `POST /api/v1/partner/jobs/:jobId/en-route` $\rightarrow$ Marks partner on the way.
* `POST /api/v1/partner/jobs/:jobId/arrived` $\rightarrow$ Triggers customer proximity push & geofence verification.
* `POST /api/v1/partner/jobs/:jobId/start` $\rightarrow$ Requires Customer Verification OTP:
  ```json
  { "verificationOtp": "4821" }
  ```
* `POST /api/v1/partner/jobs/:jobId/complete` $\rightarrow$ Finalizes job:
  ```json
  {
    "completionNotes": "Completed 1 hour deep dusting.",
    "actualWeightKg": 6.8 // for laundry jobs
  }
  ```

#### 7. Extension Request Response
```http
POST /api/v1/partner/jobs/:jobId/extension-response
Authorization: Bearer <partner_jwt>
Content-Type: application/json

Request:
{
  "extensionId": "ext_5510",
  "accepted": true
}

Response: 200 OK
{
  "success": true,
  "newEndTime": "2026-10-10T12:00:00.000Z",
  "additionalPayout": 140.00
}
```

---

### 4.2 Customer App Endpoints (`/api/v1/instant/*`)

#### 1. Instant Catalog & Live Dynamic ETA
```http
GET /api/v1/instant/services?latitude=30.325100&longitude=78.041200
Authorization: Bearer <customer_jwt>

Response: 200 OK
{
  "serviceable": true,
  "zoneId": "zone_dehradun_west",
  "services": [
    {
      "id": "inst_helping_hand",
      "slug": "helping-hand",
      "title": "Helping Hand",
      "subtitle": "From 30 mins",
      "startingPrice": 59.00,
      "estimatedArrivalMinutes": 8,
      "instantEnabled": true,
      "themeColor": "#7C3AED",
      "badge": "Popular"
    },
    {
      "id": "inst_road_help",
      "slug": "road-help",
      "title": "Road Help",
      "subtitle": "Get help nearby",
      "startingPrice": 99.00,
      "estimatedArrivalMinutes": 12,
      "instantEnabled": true,
      "themeColor": "#4F46E5",
      "badge": "Roadside"
    },
    {
      "id": "inst_laundry",
      "slug": "laundry",
      "title": "Laundry Pickup",
      "subtitle": "Doorstep pickup",
      "startingPrice": 149.00,
      "estimatedArrivalMinutes": 15,
      "instantEnabled": true,
      "themeColor": "#6366F1",
      "badge": "Express"
    },
    {
      "id": "inst_pack_move",
      "slug": "pack-move",
      "title": "Pack & Move",
      "subtitle": "Get moving help",
      "startingPrice": 249.00,
      "estimatedArrivalMinutes": 18,
      "instantEnabled": true,
      "themeColor": "#EA580C",
      "badge": "Multi-helper"
    }
  ]
}
```

#### 2. Snapshotted Price Quote Calculation
```http
POST /api/v1/instant/quote
Authorization: Bearer <customer_jwt>
Content-Type: application/json

Request:
{
  "serviceSlug": "helping-hand",
  "latitude": 30.325100,
  "longitude": 78.041200,
  "configuration": {
    "durationMinutes": 120,
    "helpersRequired": 1,
    "taskCategory": "Cleaning & Dusting"
  }
}

Response: 200 OK
{
  "quoteId": "qte_9931ad",
  "pricingVersion": "2026.10-v1",
  "lineItems": [
    { "description": "Helping Hand (2.0 hrs)", "amount": 118.00 },
    { "description": "Platform & Safety Fee", "amount": 15.00 },
    { "description": "Taxes (GST 18%)", "amount": 23.94 }
  ],
  "subtotal": 133.00,
  "tax": 23.94,
  "discount": 0.00,
  "totalPayable": 156.94,
  "currency": "INR",
  "expiresAt": "2026-10-10T10:45:00.000Z" // 15-minute price lock
}
```

#### 3. Create Intent & Trigger Dispatch Wave
```http
POST /api/v1/instant/dispatch
Authorization: Bearer <customer_jwt>
X-Idempotency-Key: "idemp_cus882_1728555200"
Content-Type: application/json

Request:
{
  "quoteId": "qte_9931ad",
  "addressId": "addr_9912",
  "serviceRequirement": {
    "serviceSlug": "helping-hand",
    "durationMinutes": 120,
    "helpersRequired": 1,
    "customerNotes": "Please help with living room organization"
  },
  "paymentMethod": "UPI" // or "CASH" / "SAVED_CARD"
}

Response: 201 Created
{
  "success": true,
  "bookingId": "bok_44912",
  "status": "MATCHING",
  "statusTimeline": [
    { "status": "REQUESTED", "timestamp": "2026-10-10T10:30:00.000Z" },
    { "status": "MATCHING", "timestamp": "2026-10-10T10:30:02.000Z" }
  ],
  "estimatedArrivalMinutes": 8,
  "trackingChannel": "tracking:bok_44912"
}
```

---

### 4.3 Realtime WebSocket Protocol (`/tracking`)

Clients and partners subscribe to bi-directional Socket.io rooms:

```
┌────────────────────────────────────────────────────────┐
│               SOCKET.IO REALTIME EVENTS                │
├──────────────────────────┬─────────────────────────────┤
│ Server $\rightarrow$ Partner App   │ Server $\rightarrow$ Customer App     │
│ • offer:new              │ • booking:matching_wave     │
│ • offer:cancelled        │ • booking:assigned          │
│ • job:extension_request  │ • partner:location_stream   │
│ • job:customer_cancelled │ • booking:completed         │
└──────────────────────────┴─────────────────────────────┘
```

1. **`offer:new` (to Partner Room `partner:{partnerId}`):**
   ```json
   {
     "offerId": "off_9912",
     "bookingId": "bok_44912",
     "serviceType": "HELPING_HAND",
     "payout": 280.0,
     "distanceKm": 1.8,
     "etaMinutes": 7,
     "timeoutSeconds": 45
   }
   ```
2. **`partner:location_stream` (to Booking Room `tracking:{bookingId}`):**
   ```json
   {
     "partnerId": "prt_8832a1",
     "latitude": 30.32015,
     "longitude": 78.0365,
     "heading": 145.0,
     "updatedEtaMinutes": 5
   }
   ```

---

## 5. Domain & Database Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITY RELATIONSHIPS                        │
│                                                                          │
│   ┌──────────────────┐               ┌────────────────────────┐          │
│   │ FulfillmentIntent│ 1 ────────── 1│   ServiceRequirement   │          │
│   └────────┬─────────┘               └────────────────────────┘          │
│            │ 1                                                           │
│            │                                                             │
│            ▼ 1                                                           │
│   ┌──────────────────┐               ┌────────────────────────┐          │
│   │     Booking      │ 1 ────────── N│   BookingAssignment    │          │
│   └────────┬─────────┘               └───────────┬────────────┘          │
│            │ 1                                   │ N                     │
│            │                                     │                       │
│            ▼ N                                   ▼ 1                     │
│   ┌──────────────────┐               ┌────────────────────────┐          │
│   │  DispatchOffer   │               │        Partner         │          │
│   └──────────────────┘               └───────────┬────────────┘          │
│                                                  │ 1                     │
│                                                  ▼ N                     │
│                                      ┌────────────────────────┐          │
│                                      │    PartnerCapability   │          │
│                                      └────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Generalized Relational Schema

```sql
-- 1. Fulfillment Policies configured per service
CREATE TABLE service_fulfillment_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    instant_enabled BOOLEAN NOT NULL DEFAULT false,
    scheduled_enabled BOOLEAN NOT NULL DEFAULT true,
    max_instant_radius_km NUMERIC(5,2) DEFAULT 8.00,
    min_dispatch_eta_minutes INTEGER DEFAULT 5,
    max_initial_duration_minutes INTEGER DEFAULT 240,
    allow_extensions BOOLEAN DEFAULT true,
    extension_slot_minutes INTEGER DEFAULT 30,
    pricing_multiplier NUMERIC(4,2) DEFAULT 1.00,
    required_capabilities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Service Requirements snapshot
CREATE TABLE service_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_intent_id UUID NOT NULL,
    service_slug TEXT NOT NULL,
    required_partner_count INTEGER NOT NULL DEFAULT 1,
    duration_minutes INTEGER,
    task_category TEXT,
    vehicle_type TEXT,
    fuel_type TEXT,
    quantity_litres NUMERIC(4,2),
    approx_load_kg NUMERIC(6,2),
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Unified Booking Assignments (1-to-N partner support)
CREATE TABLE booking_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    role TEXT NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY' | 'ASSISTANT' | 'SPECIALIST'
    assignment_status TEXT NOT NULL DEFAULT 'ASSIGNED', 
    -- 'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    assigned_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    payout_amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR'
);

-- 4. Partner Capabilities & Skills
CREATE TABLE partner_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    capability_code TEXT NOT NULL, 
    -- 'GENERAL_MANPOWER', 'JUMPSTART_BATTERY', 'TYRE_EQUIPMENT', 'FUEL_TRANSPORT', 'HEAVY_LIFTING'
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(partner_id, capability_code)
);

-- 5. Partner High-Frequency Presence & GPS
CREATE TABLE partner_presence (
    partner_id UUID PRIMARY KEY REFERENCES partners(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'OFFLINE', -- 'ONLINE' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'
    current_location GEOGRAPHY(POINT, 4326),
    heading NUMERIC(5,2),
    speed NUMERIC(5,2),
    accuracy NUMERIC(5,2),
    battery_level INTEGER,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Dispatch Waves and Offers
CREATE TABLE dispatch_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    wave_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'OFFERED', -- 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
    offered_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- 7. Controlled Extensions
CREATE TABLE instant_booking_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    additional_minutes INTEGER NOT NULL DEFAULT 30,
    quote_id UUID REFERENCES quotes(id),
    status TEXT NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
    requested_at TIMESTAMPTZ DEFAULT now(),
    responded_at TIMESTAMPTZ
);
```

---

## 6. Comprehensive Loophole & Edge Case Defenses

Every operational loophole highlighted in your prompt is systematically addressed:

| # | Edge Case / Loophole | Failure Mode Without System Defense | Serventica Architectural Defense |
| :--- | :--- | :--- | :--- |
| **1** | **Demand > Capacity** | 20 customers order Helping Hand simultaneously, but only 5 partners exist. | **Dynamic Capacity Gate:** Before dispatch, the system verifies `COUNT(active_partners) - active_reservations > 0`. If depleted, returns: *"All helpers are currently engaged. Next estimated slot in ~25 min"* with a seamless "Schedule for Later" button. |
| **2** | **Simultaneous Partner Acceptance** | Partner A accepts Job 101 and Job 102 concurrently on different devices. | **Atomic Transaction with Advisory Lock:** `acceptOffer` runs inside a Postgres transaction: `SELECT * FROM partners WHERE id = $1 FOR UPDATE`. Once status shifts to `BUSY`, the second accept automatically rolls back with HTTP 409 Conflict. |
| **3** | **Customer Location Shift Mid-Flow** | Customer enters cart in Area A, then moves 10 km to Area B before confirming. | **Location Revision Fingerprint:** The generated `Quote` contains a geospatial bounding box. If customer GPS deviates $> 200\text{m}$, the backend invalidates the quote and prompts a 1-tap re-quote. |
| **4** | **Duration Change (1h $\rightarrow$ 4h)** | Customer books 1 hr, then extends to 4 hrs, but partner has a booking at 2h. | **Strict Calendar Conflict Interceptor:** Extension requests verify partner's subsequent calendar slots before presenting the option. If a conflict exists, extension is blocked server-side. |
| **5** | **Straight-Line vs. Real ETA** | Partner is 2 km straight line across a river/mountain ridge, but 18 km driving distance. | **Routing Matrix Integration:** Candidates are ranked by real road-network driving duration (via Mapbox/OSRM), not euclidean radius. |
| **6** | **Stale Partner GPS** | Partner last updated GPS 45 minutes ago; app falsely shows them 5 minutes away. | **Heartbeat TTL Threshold:** Query filters candidates by `last_heartbeat_at > now() - INTERVAL '3 minutes'`. Stale partners are evicted from the instant candidate pool. |
| **7** | **Partner Declines Offer** | Partner rejects dispatch request. | **Multi-Wave Cascading Dispatch:** If candidate in Wave 1 rejects or times out (45s), the engine cascades to candidate 2 without failing the customer order. |
| **8** | **Customer Double-Tap Spam** | Rapid taps on "Get Help Now" create duplicate charges & bookings. | **Idempotency Key Enforcement:** Client transmits a UUID `X-Idempotency-Key`. The backend stores keys with a 60-second lock; duplicate requests return the existing booking record. |
| **9** | **Network Drop at Confirmation** | App loses connection right as payment finishes. | **Idempotency State Recovery:** On reconnect, the customer app polls `/api/v1/instant/requests/by-key/:key` to resume the active matching state without re-ordering. |
| **10** | **Payment Ok, Dispatch Fails** | Payment completes, but all nearby partners reject. | **`PAYMENT_VERIFIED` + `RECONCILIATION_QUEUE`:** Booking moves to `UNFULFILLABLE`. Customer is given the choice to 1-tap retry, schedule for later, or trigger an automated instant refund. |
| **11** | **Partner Cancels Mid-Route** | Partner gets a flat tyre on the way to the customer. | **Automatic Seamless Redispatch:** Partner cancellation triggers an internal event that moves booking back to `MATCHING` (Wave 2) with priority flag, alerting the customer: *"Re-routing to another nearby partner."* |
| **12** | **Multi-Helper Deadlock (Pack & Move)** | Helper 1 accepts, Helper 2 rejects; Helper 1 is left stranded. | **Atomic Team Reservation (2-Phase Commit):** Booking remains in `MATCHING` until all $N$ helpers are locked. If the timeout expires without all $N$ confirmed, all reserved helpers are released simultaneously. |
| **13** | **Fuel Delivery Loophole** | Customer uses service as a cheap fuel delivery substitute. | **Anti-Abuse Frequency Limit:** Maximum 1 fuel request per vehicle registration / phone number per 48 hours. Max quantity hard-locked to 1 Litre. |
| **14** | **Laundry Weight Discrepancy** | Customer estimates 4 kg, but basket weighs 8.5 kg. | **Two-Tier Pricing:** Initial charge is an estimated pre-auth hold. Final charge occurs only after partner digital scale syncs the verified weight with hub approval. |

---

## 7. Phased Implementation Roadmap

```
PHASE 1 ──────► PHASE 2 ──────► PHASE 3 ──────► PHASE 4 ──────► PHASE 5..9
Instant         Partner         Dynamic         Helping Hand    Road, Laundry,
Domain Core     Presence & GPS  Dispatch Engine Reference Vert  Pack & Move, Ops
```

### Phase 1: Instant Domain & Core Models (Backend Foundation)
* Define TypeScript contracts in `packages/types/src/fulfillment.types.ts`: `ServiceRequirement`, `BookingAssignment`, `PartnerCapability`, `InstantPolicy`.
* Apply database migration: `service_fulfillment_policies`, `service_requirements`, `booking_assignments`, `dispatch_offers`.
* Implement `PricingEngineService` snapshot generator (`Quote` model with expiration and versioning).

### Phase 2: Partner Capabilities & Real-Time Presence
* Create `partner_capabilities` and `partner_presence` tables.
* Implement `/api/v1/partner/presence/status` and high-frequency `/heartbeat` endpoints.
* PostGIS spatial indexing on `partner_presence.current_location` with 3-minute heartbeat freshness filter.

### Phase 3: Dynamic Dispatch Engine & Wave Fallback
* Build `DispatchEngineService` in NestJS:
  * Geo-radius candidate queries (`ST_DWithin`).
  * Real ETA calculation via routing matrix.
  * Wave timeout manager (45-second candidate offer window).
  * Concurrency lock via `pg_advisory_xact_lock` for atomic partner offer acceptance.

### Phase 4: Helping Hand Reference Vertical (End-to-End)
* Integrate Customer Flow in `apps/customer`:
  * Category navigation Instant vs Schedule toggle.
  * Helping Hand wizard: task selection, duration selector (0.5h to 4h), instant quote preview.
  * Real matching screen with dynamic radar animation (no fake progress bars).
* Partner Acceptance Flow:
  * Partner app mock/simulator receiving `offer:new`.
  * Real-time GPS stream during `EN_ROUTE`.
  * Start job with OTP and finish job.
* Controlled Duration Extension Engine:
  * Conflict check query against partner's upcoming bookings.
  * Extension request prompt sent to partner; pricing recalculation on accept.

### Phase 5: Road Help & Mini-Diagnosis Engine
* Road Help UI: 3-step mini-diagnosis wizard (Issue $\rightarrow$ Engine starter status $\rightarrow$ Vehicle type).
* Fuel delivery constraints: 1 Litre maximum, fuel station proximity notice, frequency limiter.
* Capability matching: Battery jumpstart vs tyre repair vs general mechanic.

### Phase 6: Laundry Instant Pickup & Weight Verification
* Laundry pickup UI: Load estimate, pickup time, bag count.
* Two-tier price flow: Estimated Quote $\rightarrow$ Hub digital scale sync $\rightarrow$ Final verified invoice.

### Phase 7: Pack & Move (Multi-Partner Atomic Assignment)
* Multi-helper selector (1, 2, or 3 helpers).
* 2-Phase atomic assignment: Locks all $N$ helpers before marking booking confirmed.

### Phase 8: Operations Dashboard & Dispatch Monitor
* Admin live monitor: active requests, dispatch wave inspector (Wave 1, 2, 3 rejections/timeouts), manual override/force reassign.
* Operational zone controls: toggle instant services per city, adjust search radius, and manage pricing surges.

### Phase 9: Security Hardening & Concurrency Verification
* Idempotency stress testing (double-tap simulations).
* Race condition tests (multiple partners accepting simultaneously).
* Network disconnection and offline resumption tests.

---

## 8. What I Need From You Before Implementation Starts

To ensure every detail is grounded in your exact business and operational reality, please provide or confirm the following:

### 1. Business & Operational Boundaries
1. **Pilot Location:** Which city/sub-locality will be the launch zone? (e.g., Dehradun - Nanda Ki Chowki, Prem Nagar, Clock Tower).
2. **Search Radii:** Confirmation of dispatch expansion tiers (e.g., Tier 1: 3 km, Tier 2: 5 km, Max: 8 km).
3. **Offer Timeout:** How many seconds does a partner have to accept an offer before it rolls over to the next candidate? (Standard: 30 or 45 seconds).

### 2. Pricing & Economics
1. **Helping Hand Base Rate:** What is the hourly base rate (e.g., ₹59 for 30m, ₹99 for 1h, ₹180 for 2h)?
2. **Road Help Fees:** Standard call-out fee for Roadside Diagnosis vs Fuel Delivery.
3. **Laundry Pickup Fee:** Is the instant pickup flat-rate or included in the per-kg washing charge?
4. **Pack & Move Helper Rate:** Standard hourly cost per helper.

### 3. Compliance & Legal Decisions
1. **Fuel Delivery Authorization:** Which fuel station/vendor model is legally permissible for your Dehradun launch? (Strict 1L emergency canister model).
2. **Safety Exclusions:** Confirmation of prohibited tasks for Helping Hand to display in user-facing liability disclaimers.

### 4. Third-Party Integrations
1. **Routing Provider:** Do you want to use Mapbox Matrix API (already configured in monorepo via `@rnmapbox/maps`) or Google Routes Matrix?
2. **Push Notifications:** Confirmation of FCM (Firebase Cloud Messaging) or OneSignal credentials for sending instant wake-up alerts to partner devices when backgrounded.
