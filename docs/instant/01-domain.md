# Serventica Instant — Domain Model Specification
**Document ID:** `docs/instant/01-domain.md`  
**Phase:** Prompt 01 — Domain Architecture  
**Status:** Approved & Production-Ready  

---

## 1. Core Domain Concepts & Canonical Enums

### 1.1 Canonical Fulfillment Mode
"Instant" is a fulfillment mode, not a service category. The system defines two primary fulfillment modes:

```typescript
export enum FulfillmentMode {
  INSTANT = 'INSTANT',
  SCHEDULED = 'SCHEDULED',
}
```
* **Rule:** Strings like `"instant"`, `"now"`, or `"immediate"` are strictly prohibited across domain layers. All APIs, DB records, and business policies must reference the canonical `FulfillmentMode` enum.

---

### 1.2 The Four Instant Services
The Instant portal features four dedicated on-demand services:

```typescript
export enum InstantServiceType {
  HELPING_HAND = 'HELPING_HAND',
  ROAD_HELP = 'ROAD_HELP',
  LAUNDRY = 'LAUNDRY',
  PACK_MOVE = 'PACK_MOVE',
}
```

---

## 2. Domain Entity Specifications

### 2.1 FulfillmentIntent
Represents the customer's on-demand requirement prior to partner assignment.

```typescript
export interface FulfillmentIntent {
  id: string;
  customerId: string;
  serviceId: string;
  instantServiceType: InstantServiceType;
  fulfillmentMode: FulfillmentMode;
  serviceRequirementId: string;
  addressId: string;
  pickupCoordinates: {
    latitude: number;
    longitude: number;
  };
  status: FulfillmentIntentStatus;
  quoteId: string;
  idempotencyKey: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type FulfillmentIntentStatus =
  | 'CREATED'
  | 'QUOTED'
  | 'MATCHING'
  | 'CONFIRMED'
  | 'UNFULFILLABLE'
  | 'CANCELLED'
  | 'EXPIRED';
```

---

### 2.2 ServiceRequirement
Encapsulates all service-specific inputs and operational parameters into a single reusable entity:

```typescript
export interface ServiceRequirement {
  id: string;
  fulfillmentIntentId?: string;
  bookingId?: string;
  instantServiceType: InstantServiceType;
  requiredPartnerCount: number; // >= 1 (e.g. 2 for Pack & Move)
  durationMinutes: number; // > 0
  taskCategory?: string; // e.g. "Cleaning & Dusting"
  vehicleType?: 'BIKE' | 'SCOOTER' | 'CAR' | 'SUV' | 'OTHER';
  starterStatus?: 'YES' | 'NO' | 'NOT_SURE';
  issueType?: 'FUEL' | 'BREAKDOWN' | 'FLAT_TYRE' | 'BATTERY' | 'OTHER';
  fuelType?: 'PETROL' | 'DIESEL';
  fuelQuantityLitres?: number; // STRICTLY <= 1.00 L
  approxLoadKg?: number; // for Laundry pickup
  actualVerifiedWeightKg?: number; // recorded at hub
  specialInstructions?: string;
  createdAt: string;
}
```

---

### 2.3 BookingAssignment (1-to-$N$ Partner Architecture)
Resolves the single-partner limitation. Allows multiple helpers per job:

```typescript
export interface BookingAssignment {
  id: string;
  bookingId: string;
  partnerId: string; // references public.professionals(id)
  role: AssignmentRole;
  assignmentStatus: AssignmentStatus;
  payoutAmount: number;
  currency: string;
  assignedAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  metadata?: Record<string, any>;
}

export type AssignmentRole = 'PRIMARY' | 'ASSISTANT' | 'SPECIALIST';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
```

---

### 2.4 PartnerCapability
Ensures only qualified professionals receive matching dispatch offers:

```typescript
export interface PartnerCapability {
  id: string;
  partnerId: string; // references public.professionals(id)
  capabilityCode: PartnerCapabilityCode;
  isActive: boolean;
  verifiedAt: string;
}

export type PartnerCapabilityCode =
  | 'GENERAL_HELP'
  | 'ROADSIDE_ASSISTANCE'
  | 'FUEL_TRANSPORT'
  | 'FLAT_TYRE'
  | 'BATTERY_START'
  | 'LAUNDRY_PICKUP'
  | 'MOVING_ASSISTANCE';
```

---

### 2.5 InstantBookingExtension
Controls the duration extension process without calendar race conditions:

```typescript
export interface InstantBookingExtension {
  id: string;
  bookingId: string;
  additionalMinutes: number; // e.g. 30
  quoteId: string;
  status: ExtensionStatus;
  requestedAt: string;
  respondedAt?: string | null;
  conflictChecked: boolean;
}

export type ExtensionStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
```

---

## 3. Service-Specific Business Rules

### 3.1 Helping Hand
* **Initial Duration Cap:** Between $30$ minutes and $240$ minutes ($4$ hours).
* **Maximum Helpers in V1:** $1$ helper default (can scale to $N$).
* **Controlled Extension:**
  * Minimum elapsed time to request extension: $75\%$ of active booking duration.
  * Extension unit: $30$ minutes.
  * Conflict Check: Must verify no active or scheduled assignment within $[EndTime + 30\text{m} + 15\text{m buffer}]$.
* **Safety & Specialist Boundaries:**
  * *Allowed:* Cleaning, sweeping, mopping, dishwashing, organizing, folding, packing, moving light items, general manpower.
  * *Restricted:* Electrical wiring, gas work, plumbing repairs, hazardous chemicals, medical/elderly physical care, structural carpentry.
  * *Routing:* If restricted task selected $\rightarrow$ return code `SPECIALIST_REQUIRED` with target category ID.

### 3.2 Road Help
* **Sub-Issues:** `FUEL_ASSISTANCE`, `VEHICLE_BREAKDOWN`, `FLAT_TYRE`, `BATTERY_START`, `OTHER_ROADSIDE_ASSISTANCE`.
* **Fuel Assistance Invariants:**
  * Max quantity: Exactly $1.00$ litre.
  * Commercial compliance: Supplier model required.
  * Rate-limiting: Maximum $1$ fuel request per vehicle per $48$ hours.
* **Roadside Safety Reminder:** User must acknowledge: *"Please move to a safe, visible location away from active traffic lanes."*

### 3.3 Laundry (Instant Pickup)
* **Scope:** Doorstep pickup only; cleaning happens at centralized hub.
* **Two-Tier Pricing:**
  * Estimated quote based on estimated load.
  * Verified price recorded at hub. If weight difference exceeds $10\%$, automated confirmation prompt is triggered.

### 3.4 Pack & Move
* **Scope:** Local shifting & packing help.
* **Multi-Helper Requirement:** Supports $1$, $2$, or $3+$ helpers.
* **Atomic Team Lock:** Booking status moves to `CONFIRMED` only when all $N$ helpers accept.
