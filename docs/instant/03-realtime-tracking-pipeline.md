# SERVENTICA INSTANT — PHASE 3 REAL-TIME TRACKING & DISPATCH EVENT PIPELINE

## 1. Architectural Goal
Connect the backend Fulfillment Engine (Phase 2) to real-time WebSockets / Socket.IO so all dispatch waves, partner offer inboxes, customer matching states, live GPS navigation, arrival geofencing, OTP verification, duration extensions, and weight reconciliations stream instantly between customer and partner devices without polling.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   REAL-TIME EVENT BUS ARCHITECTURE                     │
└────────────────────────────────────────────────────────────────────────┘

    CUSTOMER APP                                         PARTNER APP
         │                                                    │
         │ 1. POST /instant/dispatch                          │
         ▼                                                    │
 ┌─────────────────┐                                          │
 │ Dispatch Engine │──── Wave 1 Offer: dispatch:new_offer ───►│
 └─────────────────┘      (room: partner:{partnerId})         │
         │                                                    ▼
         │                                              [45s Timer]
         │                                                    │
         │                                              partner:accept
         │                                                    │
         │◄─── dispatch:matched ──────────────────────────────┘
  (room: tracking:{bookingId})
         │
         │◄─── partner:location (sanitized GPS) ──────────────┐
         │     (room: tracking:{bookingId})                   │ [En Route]
         │                                                    │
         │◄─── partner:arrived + OTP (geofence <= 50m) ───────┤ [Arrived]
         │                                                    │
         │◄─── job:started (verified OTP) ────────────────────┤ [In Progress]
         │                                                    │
         ├──── job:extension_requested ──────────────────────►│
         │◄─── job:extension_confirmed ───────────────────────┤
         │                                                    │
         │◄─── job:completed + laundry reconciliation ────────┘ [Completed]
```

---

## 2. Room Topologies

| Room Pattern | Participants | Purpose |
| :--- | :--- | :--- |
| `partner:{partnerId}` | Partner device (authenticated) | Private channel for targeted wave offers, extension prompts, and dispatch cancellations. |
| `tracking:{bookingId}` | Customer device & Assigned Partner(s) | Public-within-booking room for live GPS streams, matching cards, arrival alerts, and OTP validation. |

---

## 3. Socket Event Contracts

### 3.1 Server $\rightarrow$ Partner (`partner:{partnerId}`)
- `dispatch:new_offer` — Wave job offer with 45s countdown.
- `dispatch:offer_cancelled` — Triggered if offer expired or claimed elsewhere.
- `job:extension_prompt` — Customer requested $+30\text{m}$ extension.

### 3.2 Server $\rightarrow$ Customer (`tracking:{bookingId}`)
- `dispatch:matched` — Partner accepted; customer transitions from radar to confirmed card.
- `tracking:location` — High-frequency sanitized GPS with dynamic travel duration & distance.
- `partner:arrived` — Partner within $50\text{m}$ geofence; triggers arrival sound & reveals 4-digit OTP.
- `job:started` — Service timer begins running.
- `job:extension_confirmed` — Updated duration and total amount.
- `job:laundry_weight_alert` — Digital scale verification notice ($>10\%$ deviation).
- `job:completed` — Service finalized; invoice view & review prompt.
- `job:redispatching` — If assigned partner cancels; notifies customer that automated replacement is underway.

### 3.3 Client $\rightarrow$ Server
- `tracking:join` — Join room `tracking:{bookingId}`.
- `partner:subscribe_offers` — Partner joins `partner:{partnerId}`.
- `partner:accept_offer` — Partner accepts offer over socket.
- `partner:decline_offer` — Partner rejects offer (triggers immediate cascade).
- `partner:location` — Ingest partner GPS reading with heading and speed.
- `job:start_with_otp` — Partner submits 4-digit verification OTP.
- `job:extension_response` — Partner accepts or declines extension.

---

## 4. Implementation Status: COMPLETED ✅

1. **Contract Definitions (`packages/types/src/fulfillment.types.ts`):**
   - Added `InstantSocketEvents`, `DispatchOfferPayload`, and `MatchedPartnerPayload`.
   - Added `expiresAt` optional property to `InstantBookingExtension`.

2. **Gateway Extension (`apps/api/src/tracking/tracking.gateway.ts`):**
   - Implemented automatic partner room subscription `partner:{userId}` upon authenticated connection when `role === 'PARTNER'`.
   - Added `@SubscribeMessage('partner:subscribe_offers')` for explicit room joins.
   - Added bridge broadcasting methods:
     - `broadcastOfferToPartner(partnerId, offer)` -> `dispatch:new_offer`
     - `broadcastOfferCancelled(partnerId, offerId, reason)` -> `dispatch:offer_cancelled`
     - `broadcastMatchToBooking(bookingId, matchPayload)` -> `dispatch:matched`
     - `broadcastArrivalToBooking(bookingId, arrivalPayload)` -> `partner:arrived`
     - `broadcastServiceStarted(bookingId, startedAt)` -> `job:started`
     - `broadcastExtensionPrompt(partnerId, promptPayload)` -> `job:extension_prompt`
     - `broadcastExtensionConfirmed(bookingId, confirmPayload)` -> `job:extension_confirmed`
     - `broadcastLaundryReconciliation(bookingId, reconPayload)` -> `job:laundry_weight_confirmation`
     - `broadcastJobCompleted(bookingId, completedPayload)` -> `job:completed`
     - `broadcastCancellation(bookingId, reason)` -> `job:cancelled`
     - `broadcastRedispatching(bookingId, message)` -> `job:redispatching`

3. **Domain Services Bridging:**
   - Injected `TrackingGateway` (`@Optional()`) into `DispatchService`, `AssignmentService`, `BookingLifecycleService`, `ExtensionService`, `CancellationService`, and `FulfillmentOutboxService`.
   - Added `redispatchBooking` method in `DispatchService` to re-activate dispatch waves and cascade cleanly when partners cancel.

4. **Automated Verification (`apps/api/src/fulfillment/__tests__/socket_instant_pipeline.test.ts`):**
   - Full integration test suite simulating live concurrent Customer and Partner Socket.IO clients over HTTP/WebSocket.
   - **53/53 tests passing (100% green)** across all 4 instant test suites.
   - **Monorepo Typecheck: 10/10 packages passing** clean compilation (`turbo run typecheck`).

