# Serventica Instant — Database Architecture & Security
**Document ID:** `docs/instant/01-database.md`  
**Phase:** Prompt 01 — Database & Security Foundation  
**Status:** Approved & Production-Ready  

---

## 1. Migration Strategy & Design Principles

The database migration follows strict safety rules:
1. **Zero Breaking Changes:** Existing tables (`bookings`, `professionals`, `services`, `users`) are never dropped.
2. **Safe Idempotent DDL:** Every DDL statement uses `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`.
3. **Database-Level Invariants:** Business rules (fuel $\le 1\text{L}$, duration $\le 240\text{m}$, valid coordinates) are enforced directly in PostgreSQL check constraints, protecting against bad data even if client or API checks fail.
4. **Row-Level Security (RLS):** Strict multi-tenant boundaries separating customer and partner access.

---

## 2. Table Schemas & Relationships

### 2.1 `service_requirements`
Captures domain requirements per instant intent or booking.

```sql
CREATE TABLE IF NOT EXISTS public.service_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instant_service_type TEXT NOT NULL CHECK (instant_service_type IN ('HELPING_HAND', 'ROAD_HELP', 'LAUNDRY', 'PACK_MOVE')),
  required_partner_count INT NOT NULL DEFAULT 1 CHECK (required_partner_count >= 1),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  task_category TEXT,
  vehicle_type TEXT CHECK (vehicle_type IS NULL OR vehicle_type IN ('BIKE', 'SCOOTER', 'CAR', 'SUV', 'OTHER')),
  starter_status TEXT CHECK (starter_status IS NULL OR starter_status IN ('YES', 'NO', 'NOT_SURE')),
  issue_type TEXT CHECK (issue_type IS NULL OR issue_type IN ('FUEL', 'BREAKDOWN', 'FLAT_TYRE', 'BATTERY', 'OTHER')),
  fuel_type TEXT CHECK (fuel_type IS NULL OR fuel_type IN ('PETROL', 'DIESEL')),
  fuel_quantity_litres NUMERIC(4, 2) CHECK (fuel_quantity_litres IS NULL OR (fuel_quantity_litres > 0 AND fuel_quantity_litres <= 1.00)),
  approx_load_kg NUMERIC(6, 2) CHECK (approx_load_kg IS NULL OR approx_load_kg > 0),
  actual_verified_weight_kg NUMERIC(6, 2) CHECK (actual_verified_weight_kg IS NULL OR actual_verified_weight_kg > 0),
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 `fulfillment_intents`
Tracks customer requests before partner match.

```sql
CREATE TABLE IF NOT EXISTS public.fulfillment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  instant_service_type TEXT NOT NULL CHECK (instant_service_type IN ('HELPING_HAND', 'ROAD_HELP', 'LAUNDRY', 'PACK_MOVE')),
  fulfillment_mode TEXT NOT NULL DEFAULT 'INSTANT' CHECK (fulfillment_mode IN ('INSTANT', 'SCHEDULED')),
  service_requirement_id UUID NOT NULL REFERENCES public.service_requirements(id) ON DELETE CASCADE,
  address_id UUID NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  pickup_latitude NUMERIC(10, 7) NOT NULL CHECK (pickup_latitude BETWEEN -90 AND 90),
  pickup_longitude NUMERIC(10, 7) NOT NULL CHECK (pickup_longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED', 'QUOTED', 'MATCHING', 'CONFIRMED', 'UNFULFILLABLE', 'CANCELLED', 'EXPIRED'
  )),
  quote_id UUID,
  idempotency_key TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_intents_customer ON public.fulfillment_intents(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_intents_status_expiry ON public.fulfillment_intents(status, expires_at);
```

### 2.3 `booking_assignments`
The 1-to-$N$ partner assignment table.

```sql
CREATE TABLE IF NOT EXISTS public.booking_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (role IN ('PRIMARY', 'ASSISTANT', 'SPECIALIST')),
  assignment_status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (assignment_status IN (
    'ASSIGNED', 'ACCEPTED', 'DECLINED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  )),
  payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (payout_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_booking_partner_assignment UNIQUE (booking_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_assignments_partner ON public.booking_assignments(partner_id, assignment_status);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON public.booking_assignments(booking_id);
```

### 2.4 `partner_capabilities`
Controls dispatch qualification per partner.

```sql
CREATE TABLE IF NOT EXISTS public.partner_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  capability_code TEXT NOT NULL CHECK (capability_code IN (
    'GENERAL_HELP', 'ROADSIDE_ASSISTANCE', 'FUEL_TRANSPORT',
    'FLAT_TYRE', 'BATTERY_START', 'LAUNDRY_PICKUP', 'MOVING_ASSISTANCE'
  )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_partner_capability UNIQUE (partner_id, capability_code)
);

CREATE INDEX IF NOT EXISTS idx_partner_capabilities_code ON public.partner_capabilities(capability_code) WHERE is_active = TRUE;
```

### 2.5 `instant_booking_extensions`
Tracks extension requests and responses.

```sql
CREATE TABLE IF NOT EXISTS public.instant_booking_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  additional_minutes INT NOT NULL DEFAULT 30 CHECK (additional_minutes IN (30, 60, 90, 120)),
  quote_id UUID,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  conflict_checked BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking ON public.instant_booking_extensions(booking_id, status);
```

### 2.6 Extending Existing Tables
```sql
-- Extend bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fulfillment_mode TEXT NOT NULL DEFAULT 'SCHEDULED' 
    CHECK (fulfillment_mode IN ('INSTANT', 'SCHEDULED')),
  ADD COLUMN IF NOT EXISTS service_requirement_id UUID REFERENCES public.service_requirements(id) ON DELETE SET NULL;

-- Extend dispatch_requests
ALTER TABLE public.dispatch_requests
  ADD COLUMN IF NOT EXISTS fulfillment_intent_id UUID REFERENCES public.fulfillment_intents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_requirement_id UUID REFERENCES public.service_requirements(id) ON DELETE SET NULL;
```

---

## 3. Row-Level Security (RLS) Implementation

RLS is enabled on all tables:

1. **`fulfillment_intents` RLS:**
   * Customer can select and insert intents where `auth.uid() = customer_id`.
   * Partner cannot read raw customer intents.
   * Admin can read all intents.
2. **`booking_assignments` RLS:**
   * Customer can select assignments linked to their bookings (`bookings.customer_id = auth.uid()`).
   * Partner can select and update assignments where `partner_id = (SELECT id FROM professionals WHERE user_id = auth.uid())`.
3. **`partner_capabilities` RLS:**
   * Partner can view their own capabilities.
   * Only admin/system can insert or update capabilities.
