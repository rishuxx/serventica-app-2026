# Serventica Instant — Existing Architecture & Integration Analysis
**Document ID:** `docs/instant/01-existing-architecture.md`  
**Phase:** Step 0 Pre-Flight Audit  
**Author:** AI Architecture Agent  
**Status:** Approved & Grounded  

---

## 1. Executive Summary

This pre-flight analysis documents the current state of the Serventica monorepo (`c:\dev\serventica-app`) prior to implementing **SERVentica Instant**. 

The goal of this audit is to prevent system duplication, ensure strict backward compatibility, and reuse working database models, APIs, and business rules.

---

## 2. Existing Database Schema & Migration Audit

Serventica's database is managed via Supabase PostgreSQL migrations (from `20260908000001` through `20261010000001`).

### 2.1 Core Tables Directly Relevant to Fulfillment

| Table Name | Origin Migration | Existing Purpose | Instant Platform Reuse / Modification Strategy |
| :--- | :--- | :--- | :--- |
| `public.users` | `20260908000001` | System identity & phone auth | **Reuse directly.** All customers and partners link to this user table. |
| `public.customer_profiles` | `20260908000001` | Customer metadata & default address | **Reuse directly.** Customer identity resolution. |
| `public.partner_profiles` | `20260908000001` | Partner KYC, online flag, coordinates | **Reuse directly.** Partner profile metadata. |
| `public.professionals` | `20260910000001` | Professional provider entity with status & phone | **Canonical Partner Entity.** Referenced by `dispatch_offers` and `booking_settlements`. `booking_assignments` will reference this table. |
| `public.categories` | `20260908000001` | Service categories | **Reuse directly.** Categorization for standard catalog. |
| `public.services` | `20260908000001` | Individual services with base price & slug | **Reuse directly.** Instant services (`helping-hand`, `road-help`, `laundry`, `pack-move`) will register here or link as instant service variants. |
| `public.addresses` | `20260908000001` | Customer addresses with latitude/longitude | **Reuse directly.** Destination for instant helpers and pickup points. |
| `public.bookings` | `20260908000001` & `20260926000001` | Central booking records with pricing snapshot & status | **Extend safely.** Add `fulfillment_mode` (`INSTANT` \| `SCHEDULED`) and `service_requirement_id`. Retain `bookings.partner_id` as the primary partner pointer for legacy query compatibility. |
| `public.booking_items` | `20260908000001` | Items / line items attached to a booking | **Reuse directly.** |
| `public.service_fulfillment_policies` | `20260915000001` | Policies per service (`instant_enabled`, `instant_radius_km`, `min_notice`) | **Extend safely.** Add instant policy columns: `max_initial_duration_minutes`, `allow_extensions`, `extension_slot_minutes`, `fuel_max_litres`, `prohibited_task_codes`. |
| `public.partner_presence_sessions` | `20260915000001` | Online/Available/Busy status & heartbeat | **Reuse directly.** Query for active Instant partner candidates where `last_heartbeat_at > now() - INTERVAL '3 minutes'`. |
| `public.partner_locations` | `20260915000001` | Spatial coordinate audit log | **Reuse directly.** Live tracking location log. |
| `public.dispatch_requests` | `20260915000001` | Wave-based dispatch request header | **Extend safely.** Add `service_requirement_id` and `fulfillment_intent_id`. |
| `public.dispatch_offers` | `20260915000001` | Individual partner offers with ETA & straight-line dist | **Extend safely.** Add `required_role` and `payout_amount`. |
| `public.booking_events` | `20260915000001` | Immutable audit log of state changes | **Reuse directly.** Audit log for instant lifecycle transitions. |
| `public.fulfillment_idempotency_keys` | `20260926000001` | Idempotency locking & replay table | **Reuse directly.** Prevents duplicate instant requests. |
| `public.fulfillment_outbox_events` | `20260926000001` | Outbox pattern for asynchronous domain event delivery | **Reuse directly.** Guaranteed at-least-once event delivery for socket alerts. |
| `public.booking_settlements` | `20260926000001` | Financial ledger separating service completion from payouts | **Reuse directly.** Ledger settlement per assignment. |

---

## 3. Existing Backend Services & APIs (`apps/api`)

The NestJS backend application (`@serventica/api`) contains established domain modules:

1. **`FulfillmentModule` (`apps/api/src/fulfillment`):**
   * `FulfillmentController`: Secured with `SupabaseAuthGuard` and `@Throttle`. Contains endpoints for `/fulfillment/confirm`, `/fulfillment/accept`, `/fulfillment/start-service`, `/fulfillment/complete-service`, `/fulfillment/reassign`, and `/fulfillment/cancel`.
   * `FulfillmentTransactionService`: Orchestrates PostgreSQL transactions, state transitions, idempotency checks, and settlement generation.
   * `PricingEngineService`: Calculates pricing snapshots.
   * `FulfillmentOutboxService`: Dispatches domain outbox events.
2. **`TrackingModule` (`apps/api/src/tracking`):**
   * `TrackingGateway`: Socket.io gateway handling rooms (`booking:{bookingId}`) and streaming partner coordinates.
   * `GeofenceService`: Validates proximity and arrival conditions.
   * `LocationValidationService`: Checks for GPS spoofing and anomalies.
3. **`Common` (`apps/api/src/common`):**
   * `SupabaseAuthGuard`: Authoritatively extracts `req.user.id` from JWT, preventing BOLA/IDOR vulnerabilities.

---

## 4. Reusable Frontend Components (`apps/customer`)

1. **`LocationContext` & `useLocation`:** Provides customer coordinate access (`activeLocation.latitude`, `activeLocation.longitude`).
2. **`useServiceETA`:** Calculates ETA based on current coordinates.
3. **`LiveTrackingMap` (`apps/customer/src/features/account/components/LiveTrackingMap.tsx`):** Mapbox-based visual tracking map component capable of rendering customer pin, partner pin, and route polyline.
4. **`ServenticaTokens` (`packages/design-system`):** Design tokens for colors (deep purples, vibrant accents), spacing, and typography (Lexend).

---

## 5. Architectural Gaps & Missing Entities (What Prompt 01 Must Add)

To support the full Serventica Instant platform without building duplicate silos, we must create:

1. **`fulfillment_intents` (Table):**
   * Represents the pre-booking customer intent before partner matching and confirmation.
   * Tracks requested fulfillment mode (`INSTANT`), customer ID, location, expiration, status, and idempotency key.
2. **`service_requirements` (Table):**
   * Reusable structured requirement object containing `service_slug`, `required_partner_count` ($1$ to $N$), `duration_minutes`, `task_category`, `vehicle_type`, `fuel_type`, `approx_load_kg`, and `special_instructions`.
3. **`booking_assignments` (Table):**
   * Resolves the "one partner per booking" architectural bottleneck. Allows $1$ to $N$ partners per booking (e.g. 2 helpers for Pack & Move). Tracks each partner's assigned role, assignment status, individual payout, started/completed timestamps.
4. **`partner_capabilities` (Table):**
   * Granular capabilities (`GENERAL_HELP`, `ROADSIDE_ASSISTANCE`, `FUEL_ASSISTANCE`, `FLAT_TYRE`, `BATTERY_START`, `LAUNDRY_PICKUP`, `MOVING_ASSISTANCE`). Dispatches only to qualified partners.
5. **`instant_booking_extensions` (Table):**
   * Manages duration extension requests, conflict checking against partner future bookings, recalculation of quotes, and partner accept/decline state.
6. **Canonical `FulfillmentMode` Enum:**
   * Strongly typed `'INSTANT' | 'SCHEDULED'` across PostgreSQL and TypeScript.

---

## 6. Proposed Integration & Migration Points

```
Existing public.bookings
  ├── id (UUID)
  ├── customer_id (UUID)
  ├── partner_id (UUID) ◄── [Synchronized with PRIMARY partner in booking_assignments]
  ├── fulfillment_mode ◄── [NEW: 'INSTANT' | 'SCHEDULED']
  ├── service_requirement_id ◄── [NEW: FK -> public.service_requirements(id)]
  └── pricing_snapshot (JSONB)

New public.booking_assignments
  ├── id (UUID)
  ├── booking_id (FK -> public.bookings)
  ├── partner_id (FK -> public.professionals)
  ├── role ('PRIMARY' | 'ASSISTANT' | 'SPECIALIST')
  └── assignment_status ('ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED')
```

### Safety Rules:
1. **Zero Table Drops / Replacements:** Do not drop `bookings`, `dispatch_requests`, or `services`.
2. **Backward Compatibility:** All existing scheduled booking queries continue to work unchanged. Default `fulfillment_mode` is `'SCHEDULED'`.
3. **RLS Hardening:** Strict Row-Level Security ensuring customers only view their own intents and assignments, while partners view only offers and jobs specifically assigned to them.
