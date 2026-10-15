# Serventica Instant — API Contracts & Payload Specifications
**Document ID:** `docs/instant/01-api-contracts.md`  
**Phase:** Prompt 01 — API Contracts & Integration Boundaries  
**Status:** Approved & Production-Ready  

---

## 1. Authentication & Security Boundary
* **All API calls** require a valid Supabase JWT Bearer token.
* Identity is extracted server-side from `req.user.id`. The caller cannot spoof `customer_id` or `partner_id`.
* Every mutation endpoint accepts an `X-Idempotency-Key` header to prevent duplicate execution on network retry.

---

## 2. Customer API Contracts (`/api/v1/instant/*`)

### 2.1 Get Live Instant Catalog & Dynamic ETAs
* **Endpoint:** `GET /api/v1/instant/services`
* **Query Params:** `latitude=30.325100&longitude=78.041200`
* **Success Response (200 OK):**
```json
{
  "serviceable": true,
  "zoneId": "zone_dehradun_central",
  "services": [
    {
      "id": "srv_helping_hand",
      "slug": "helping-hand",
      "serviceType": "HELPING_HAND",
      "title": "Helping Hand",
      "subtitle": "From 30 mins",
      "startingPrice": 59.00,
      "estimatedArrivalMinutes": 8,
      "instantEnabled": true,
      "themeColor": "#7C3AED",
      "allowedDurations": [30, 60, 90, 120, 150, 180, 210, 240]
    },
    {
      "id": "srv_road_help",
      "slug": "road-help",
      "serviceType": "ROAD_HELP",
      "title": "Road Help",
      "subtitle": "Get help nearby",
      "startingPrice": 99.00,
      "estimatedArrivalMinutes": 12,
      "instantEnabled": true,
      "themeColor": "#4F46E5",
      "subtypes": ["FUEL", "BREAKDOWN", "FLAT_TYRE", "BATTERY"]
    },
    {
      "id": "srv_laundry",
      "slug": "laundry",
      "serviceType": "LAUNDRY",
      "title": "Laundry Pickup",
      "subtitle": "Instant pickup",
      "startingPrice": 149.00,
      "estimatedArrivalMinutes": 15,
      "instantEnabled": true,
      "themeColor": "#6366F1"
    },
    {
      "id": "srv_pack_move",
      "slug": "pack-move",
      "serviceType": "PACK_MOVE",
      "title": "Pack & Move",
      "subtitle": "Get moving help",
      "startingPrice": 249.00,
      "estimatedArrivalMinutes": 18,
      "instantEnabled": true,
      "themeColor": "#EA580C",
      "maxHelpers": 3
    }
  ]
}
```

---

### 2.2 Calculate Snapshotted Price Quote
* **Endpoint:** `POST /api/v1/instant/quote`
* **Request Body:**
```json
{
  "serviceSlug": "helping-hand",
  "latitude": 30.325100,
  "longitude": 78.041200,
  "requirements": {
    "durationMinutes": 120,
    "requiredPartnerCount": 1,
    "taskCategory": "Cleaning & Dusting"
  }
}
```
* **Success Response (200 OK):**
```json
{
  "quoteId": "qte_884920",
  "pricingVersion": "2026.10-v1",
  "lineItems": [
    { "description": "Helping Hand (2.0 hrs)", "amount": 118.00 },
    { "description": "Platform & Safety Fee", "amount": 15.00 },
    { "description": "GST (18%)", "amount": 23.94 }
  ],
  "subtotal": 133.00,
  "tax": 23.94,
  "discount": 0.00,
  "totalPayable": 156.94,
  "currency": "INR",
  "expiresAt": "2026-10-10T11:00:00.000Z"
}
```

---

### 2.3 Create Intent & Launch Dispatch
* **Endpoint:** `POST /api/v1/instant/dispatch`
* **Headers:** `X-Idempotency-Key: uuid-v4`
* **Request Body:**
```json
{
  "quoteId": "qte_884920",
  "addressId": "addr_99120",
  "serviceSlug": "helping-hand",
  "requirements": {
    "durationMinutes": 120,
    "requiredPartnerCount": 1,
    "taskCategory": "Cleaning & Dusting",
    "specialInstructions": "Bring clean cloth"
  },
  "paymentMethod": "UPI"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "intentId": "int_77192",
  "bookingId": "bok_44912",
  "status": "MATCHING",
  "estimatedArrivalMinutes": 8,
  "timeline": [
    { "status": "REQUESTED", "timestamp": "2026-10-10T10:45:00.000Z" },
    { "status": "MATCHING", "timestamp": "2026-10-10T10:45:01.000Z" }
  ],
  "trackingRoom": "tracking:bok_44912"
}
```

---

### 2.4 Request Duration Extension (Helping Hand)
* **Endpoint:** `POST /api/v1/instant/bookings/:id/extend`
* **Request Body:**
```json
{
  "additionalMinutes": 30
}
```
* **Success Response (200 OK):**
```json
{
  "extensionId": "ext_1102",
  "status": "REQUESTED",
  "additionalAmount": 35.00,
  "newEstimatedEndTime": "2026-10-10T13:15:00.000Z",
  "message": "Extension request sent to partner. Awaiting confirmation."
}
```
* **Conflict Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "error": "EXTENSION_CONFLICT",
  "message": "Extension unavailable: partner has a conflicting scheduled booking."
}
```

---

## 3. Partner API Contracts (`/api/v1/partner/*`)

### 3.1 Partner Status & Presence
* **Endpoint:** `POST /api/v1/partner/presence/status`
* **Request Body:**
```json
{
  "status": "AVAILABLE",
  "currentLatitude": 30.316494,
  "currentLongitude": 78.032191
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "status": "AVAILABLE",
  "updatedAt": "2026-10-10T10:45:00.000Z"
}
```

---

### 3.2 High-Frequency GPS Heartbeat
* **Endpoint:** `POST /api/v1/partner/presence/heartbeat`
* **Request Body:**
```json
{
  "latitude": 30.318210,
  "longitude": 78.034500,
  "heading": 142.5,
  "speed": 22.4,
  "accuracy": 4.8,
  "recordedAt": "2026-10-10T10:45:10.000Z"
}
```
* **Response (200 OK):**
```json
{
  "acknowledged": true,
  "serverTime": "2026-10-10T10:45:10.030Z",
  "assignedJobId": null
}
```

---

### 3.3 Active Offer Inbox
* **Endpoint:** `GET /api/v1/partner/dispatch/offers/active`
* **Response (200 OK):**
```json
{
  "hasOffer": true,
  "offer": {
    "offerId": "off_99120",
    "bookingId": "bok_44912",
    "serviceType": "HELPING_HAND",
    "title": "Helping Hand (2.0 hrs)",
    "customerArea": "Nanda Ki Chowki",
    "payoutAmount": 280.00,
    "distanceKm": 1.8,
    "etaMinutes": 7,
    "expiresAt": "2026-10-10T10:45:45.000Z"
  }
}
```

---

### 3.4 Accept Offer (Atomic)
* **Endpoint:** `POST /api/v1/partner/dispatch/offers/:offerId/accept`
* **Request Body:**
```json
{
  "currentLatitude": 30.318210,
  "currentLongitude": 78.034500
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "bookingId": "bok_44912",
  "assignmentStatus": "ACCEPTED",
  "customer": {
    "name": "Rishu",
    "address": "Lane 4, Nanda Ki Chowki",
    "latitude": 30.325100,
    "longitude": 78.041200
  }
}
```

---

### 3.5 Lifecycle Transitions
* `POST /api/v1/partner/jobs/:id/en-route` $\rightarrow$ `{ "status": "EN_ROUTE" }`
* `POST /api/v1/partner/jobs/:id/arrived` $\rightarrow$ `{ "status": "ARRIVED" }`
* `POST /api/v1/partner/jobs/:id/start` $\rightarrow$ Body: `{ "verificationOtp": "4912" }`
* `POST /api/v1/partner/jobs/:id/complete` $\rightarrow$ Body: `{ "completionNotes": "Completed all cleaning", "actualVerifiedWeightKg": null }`
* `POST /api/v1/partner/jobs/:id/extension-response` $\rightarrow$ Body: `{ "extensionId": "ext_1102", "accepted": true }`
