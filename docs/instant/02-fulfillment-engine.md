# SERVENTICA INSTANT — PHASE 2 FULFILLMENT ENGINE ARCHITECTURE

## 1. Overview
Phase 2 implements the production **Fulfillment Engine** on top of the INSTANT-01 domain and database foundation. It coordinates real-time serviceability, dynamic ETA calculation, partner candidate filtering, weighted candidate ranking, dispatch waves with timeouts, atomic single- and multi-partner assignment, in-job duration extensions, state-dependent cancellation, automated redispatch, and verified price reconciliation.

Dedicated integration endpoints have been mounted at `/api/v1/partner/*` and `/api/v1/instant/*`.

---

## 2. Design Patterns Applied

| Pattern | Implementation | Purpose |
| :--- | :--- | :--- |
| **Strategy Pattern** | `HelpingHandPricingStrategy`, `RoadHelpPricingStrategy`, `LaundryPricingStrategy`, `PackMovePricingStrategy` | Encapsulates service-specific pricing logic, multipliers, fee structures, and weight reconciliations. |
| **Factory Pattern** | `PricingStrategyFactory`, `ServicePolicyFactory` | Dynamically resolves the appropriate strategy/policy based on service slug or enum. |
| **Specification Pattern** | `EligiblePartnerSpecification` composing 10 granular specs (`IsApprovedPartner`, `HasRequiredSkill`, `IsOnline`, `IsAvailable`, `HasFreshLocation`, `IsWithinRadius`, `CanReachWithinEta`, `HasCapacity`, `HasRequiredVehicle`, `HasNoScheduleConflict`) | Modular, composable partner candidate filtering without 300-line monolithic functions. |
| **Chain of Responsibility** | Candidate pipeline: Geo-radius filter $\rightarrow$ Capability check $\rightarrow$ Freshness check $\rightarrow$ ETA filter $\rightarrow$ Schedule conflict check. | Progressively prunes unviable candidates prior to expensive routing/ranking calculations. |
| **Repository Pattern** | `FulfillmentRepository` interface with `InMemoryFulfillmentRepository` | Clean persistence abstraction supporting atomic mutex locks, entity lookups, and test isolation. |
| **Domain Services** | `FulfillmentService`, `ServiceabilityService`, `QuoteService`, `ETAService`, `CapacityService`, `DispatchService`, `AssignmentService`, `ExtensionService`, `CancellationService`, `NotificationService`, `BookingLifecycleService` | Separation of concerns. Controllers remain thin input/output orchestrators. |
| **State Machine** | `FulfillmentStateMachine` | Authoritative lifecycle validation preventing invalid state jumps. |
| **Observer / Outbox** | `FulfillmentOutboxService`, `NotificationService` | Asynchronous, non-blocking delivery of push notifications, tracking events, and audit logs. |

---

## 3. Core Engine Components

### 3.1 Serviceability Service (`ServiceabilityService`)
- Validates geographic coordinates (latitude $[-90, 90]$, longitude $[-180, 180]$).
- Enforces operational hours (06:00 AM to 11:00 PM IST).
- Queries eligible active partner capacity in customer zone.
- Returns structured JSON with live minimum ETA and starting price. Never returns fake success.

### 3.2 Dynamic ETA Service (`ETAService`)
- Calculates accurate geographic distance using the Haversine formula.
- Applies an urban winding factor of $1.35\times$ straight-line distance.
- Applies a conservative city travel speed of $25\text{ km/h}$ plus a $3\text{-minute}$ traffic buffer.
- Never hardcodes arbitrary "5 minutes".

### 3.3 Weighted Candidate Ranking Model (`PartnerMatchingService`)
Eligible candidates are scored on a normalized scale $[0, 100]$ using configurable weights summing to 1.0:
$$\text{Score} = (\text{ETA} \times 0.35) + (\text{Distance} \times 0.25) + (\text{Capability} \times 0.20) + (\text{Availability} \times 0.10) + (\text{Reliability} \times 0.10)$$
- **ETA Score:** Inversely proportional to travel time up to `maxEtaMinutes`.
- **Distance Score:** Inversely proportional to distance up to `maxRadiusKm`.
- **Capability Score:** Base capability plus bonus for verified experience.
- **Reliability Score:** Partner historical acceptance rate ($50\%$) + rating out of 5.0 ($50\%$).

### 3.4 Dispatch Waves (`DispatchService`)
1. **Wave 1:** Top $N$ candidates receive targeted job offers with an automated $45\text{-second}$ countdown timeout.
2. **Cascade on Decline / Expiry:** If a candidate declines or the timer expires, the wave automatically advances to the next ranked candidate.
3. **Radius Expansion:** If top candidates are exhausted, operational radius is expanded by $+3\text{ km}$.
4. **Fallback:** If all waves are exhausted, the booking gracefully transitions to `UNFULFILLABLE`.

### 3.5 Atomic Single & Multi-Partner Assignment (`AssignmentService`)
- **Single-Partner Race Condition:** Protected by a FIFO promise mutex per `bookingId` in `atomicClaimSlot`. When two partners accept simultaneously, only one succeeds; the second receives `JOB_ALREADY_ASSIGNED` (`409 Conflict`).
- **Multi-Partner Reservation ($N \ge 2$):** For Pack & Move ($2\dots 4$ helpers), each partner atomically claims a role slot (`PRIMARY`, `ASSISTANT`). The booking remains in `MATCHING` until all $N$ slots are filled, transitioning to `PARTNER_ACCEPTED` atomically.

### 3.6 Helping Hand Duration Extension (`ExtensionService`)
- Permitted in $+30\text{ min}$ increments up to a total cap of $240\text{ min}$ (4 hours).
- Validates the assigned partner's future schedule for conflicts using `CapacityService`.
- Calculates an incremental snapshotted price quote.
- Emits extension offer to partner; upon partner acceptance, the booking duration and total are updated atomically.

### 3.7 State-Dependent Cancellation & Redispatch (`CancellationService`)
- Customer cancellation before partner acceptance is free.
- Cancellation after partner dispatch/arrival incurs a nominal compensation fee for partner travel.
- Cancellation during active service is blocked without operations intervention.
- **Partner Cancellation Redispatch:** If an assigned partner cancels, their assignment is revoked, their presence is freed back to `AVAILABLE`, and the engine automatically triggers an immediate redispatch wave for the booking.

### 3.8 Laundry Weight Reconciliation (`LaundryPricingStrategy`)
- Initial booking operates on an **Estimated Quote** based on approximate load (e.g. $5.0\text{ kg}$).
- At collection/hub, digital scales record **Verified Weight** (`actualVerifiedWeightKg`).
- If verified total deviates by $>10\%$ from estimate, the system triggers `requiresCustomerConfirmation = true` and alerts the customer before processing.

---

## 4. API Endpoints

### 4.1 Partner App Endpoints (`/api/v1/partner/*`)
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/presence/status` | Sets status (`AVAILABLE`, `BUSY`, `OFFLINE`) and GPS coordinates |
| `POST` | `/presence/heartbeat` | High-frequency telemetry (lat, lon, heading, speed, accuracy) |
| `GET` | `/dispatch/offers/active` | Active offer inbox with remaining countdown seconds |
| `POST` | `/dispatch/offers/:offerId/accept` | Atomically accepts offer and retrieves customer details |
| `POST` | `/dispatch/offers/:offerId/decline` | Declines offer and cascades to next wave candidate |
| `POST` | `/jobs/:jobId/en-route` | Marks partner on the way |
| `POST` | `/jobs/:jobId/arrived` | Marks arrival, checks geofence, generates customer OTP |
| `POST` | `/jobs/:jobId/start` | Starts service with Customer Verification OTP |
| `POST` | `/jobs/:jobId/complete` | Finalizes job, accepts notes & verified laundry weight |
| `POST` | `/jobs/:jobId/extension-response` | Partner accepts/declines customer duration extension |

### 4.2 Customer Instant Endpoints (`/api/v1/instant/*`)
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/services` | Service catalog with dynamic ETAs and availability |
| `POST` | `/serviceability` | Evaluates zone serviceability and operating hours |
| `POST` | `/quote` | Calculates locked, snapshotted price quote (15-min lock) |
| `POST` | `/dispatch` | Launches instant intent and triggers automated dispatch waves |
| `GET` | `/bookings/:id/status` | Live booking status, assigned partners, tracking channel |
| `POST` | `/bookings/:id/extend` | Customer requests $+30\text{m}$ extension |
| `POST` | `/bookings/:id/cancel` | State-dependent customer cancellation |

---

## 5. Verification & Test Suite Summary
- **Total Tests Passing:** 43 tests across 3 suites.
- **Suite 1:** [`packages/validation/src/__tests__/instant_fulfillment.test.ts`](file:///c:/dev/serventica-app/packages/validation/src/__tests__/instant_fulfillment.test.ts) (14/14 passing)
- **Suite 2:** [`apps/api/src/fulfillment/__tests__/fulfillment_engine.test.ts`](file:///c:/dev/serventica-app/apps/api/src/fulfillment/__tests__/fulfillment_engine.test.ts) (24/24 passing)
- **Suite 3:** [`apps/api/src/fulfillment/__tests__/partner_and_customer_flows.test.ts`](file:///c:/dev/serventica-app/apps/api/src/fulfillment/__tests__/partner_and_customer_flows.test.ts) (5/5 passing)
- **Type Safety:** 10/10 monorepo packages clean (`turbo run typecheck` passed with 0 errors).
