# Serventica --- SERV-03 Instant + Scheduled Service Booking

## Production-Grade Implementation Master Prompt

### Customer App + Partner App + Admin + Backend + Supabase

> **Objective:** Add two real booking-intent modes directly beneath the
> category navigation inside the existing Hero Container:
>
> **Instant** --- request service as soon as possible.
>
> **Schedule** --- select a future date/time window.
>
> This must be a real operational feature, not a visual toggle. Every
> selection must flow through service eligibility, location, partner
> availability, capacity, pricing, booking state, partner acceptance,
> and admin controls.
>
> The existing Serventica Hero/category UI must remain intact. Extend it
> without replacing the current architecture.

------------------------------------------------------------------------

# 1. PRODUCT CONCEPT

Serventica should support two fundamentally different fulfillment modes:

``` text
                 SERVICE INTENT
                      │
             ┌────────┴────────┐
             ▼                 ▼
        INSTANT             SCHEDULE
     ASAP / urgent       Future date/time
             │                 │
             ▼                 ▼
      Find eligible        Check future
      partner now          capacity
             │                 │
             ▼                 ▼
      dispatch/accept      reserve slot
             │                 │
             └────────┬────────┘
                      ▼
                   BOOKING
```

The important architectural rule:

**Instant and Schedule are two fulfillment strategies over the same
service catalog and booking domain.**

Do not create two unrelated booking systems.

------------------------------------------------------------------------

# 2. WHERE IT APPEARS

Current Hero structure is conceptually:

``` text
Header
Location / ETA
Search
Category Navigation
Hero Image + Hero Content
```

Add the new service-mode selector immediately **below the category
navigation and above the hero image/content**, as requested.

Target:

``` text
┌─────────────────────────────────────┐
│ Serventica                          │
│ ⚡ ETA        Location       Profile │
│                                     │
│ Search                              │
│                                     │
│ AC     Cleaning   Electrical ...    │
│ ─────────────────────────────────── │
│                                     │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ ⚡ Instant    │ │ ◷ Schedule    │ │
│ │ Get help ASAP │ │ Choose a time │ │
│ │ 15–60 min     │ │ Today / Later │ │
│ └───────────────┘ └───────────────┘ │
│                                     │
│          HERO IMAGE                 │
│       Hero title / CTA              │
└─────────────────────────────────────┘
```

This is a conceptual structure only. Do not copy the reference UI
literally.

------------------------------------------------------------------------

# 3. UI/UX DIRECTION

The design should feel like a modern on-demand service platform rather
than a traditional form.

Use:

-   curved cards
-   subtle glass/translucent surfaces
-   category-derived accent colors
-   soft borders
-   restrained shadows
-   large touch targets
-   clear hierarchy
-   minimal text
-   micro-interactions
-   smooth selection transitions

Avoid:

-   rectangular desktop-style tabs
-   excessive gradients
-   excessive text
-   multiple competing buttons
-   tiny touch targets
-   modal-heavy flows
-   visually noisy cards

The component must adapt to every category theme.

Example:

``` text
AC & Appliances       → light blue
Cleaning              → cool slate / service neutral
Electrical             → yellow / amber
Plumbing               → purple/blue
Painting               → velvet red
Gardening              → green
Pest Control           → light green
Home Decor             → soft pink/red
RO & Water             → aqua/blue
```

Use the category's existing theme tokens rather than hardcoding colors
in the new component.

------------------------------------------------------------------------

# 4. IMPORTANT: CATEGORY + MODE ARE DIFFERENT DIMENSIONS

Do NOT model:

``` text
selectedCategory = "instant-cleaning"
```

Instead:

``` ts
selectedCategory = "cleaning"
fulfillmentMode = "INSTANT"
```

or:

``` ts
selectedCategory = "cleaning"
fulfillmentMode = "SCHEDULED"
```

This separation is critical.

It allows:

``` text
Cleaning + Instant
Cleaning + Schedule

Electrical + Instant
Electrical + Schedule

Plumbing + Instant
Plumbing + Schedule
```

without duplicating categories.

------------------------------------------------------------------------

# 5. DOMAIN MODEL

Create/reuse:

``` ts
export type FulfillmentMode =
  | 'INSTANT'
  | 'SCHEDULED';
```

Service eligibility:

``` ts
export interface FulfillmentCapability {
  instant: boolean;
  scheduled: boolean;
}
```

Do not assume every service supports both modes.

Examples:

``` text
Emergency plumbing
→ INSTANT = true
→ SCHEDULED = true

Monthly gardener
→ INSTANT = false
→ SCHEDULED = true

Emergency electrical repair
→ INSTANT = true
→ SCHEDULED = true

Deep cleaning
→ INSTANT = true
→ SCHEDULED = true

Large painting project
→ INSTANT = false
→ SCHEDULED = true
```

These are examples only; actual capabilities must come from the
database.

------------------------------------------------------------------------

# 6. SERVICE MODE MUST BE DATA-DRIVEN

Do not hardcode:

``` ts
if (category === 'cleaning') instant = true;
```

The database should determine availability.

Conceptual:

``` text
service
  ├── instant_enabled
  ├── scheduled_enabled
  ├── minimum_notice_minutes
  ├── maximum_advance_days
  ├── instant_dispatch_radius
  └── booking_policy
```

This allows Admin to control operations without app rebuilds.

------------------------------------------------------------------------

# 7. SERVICE MODEL

Extend/reuse the existing service model:

``` ts
interface Service {
  id: string;
  categoryId: string;

  name: string;
  slug: string;

  description?: string;

  basePrice: number;
  durationMinutes: number;

  capabilities: {
    instant: boolean;
    scheduled: boolean;
  };

  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;

  isActive: boolean;
}
```

Do not duplicate service data between mobile and backend.

------------------------------------------------------------------------

# 8. HERO MODE COMPONENT

Create a reusable:

``` text
FulfillmentModeSelector
```

Responsibilities:

-   render Instant/Schedule choices
-   display availability
-   animate selection
-   expose selected mode
-   remain category-theme aware

It must NOT:

-   calculate price
-   query partners directly
-   calculate ETA
-   create bookings
-   write Supabase rows directly

------------------------------------------------------------------------

# 9. COMPONENT CONTRACT

Conceptual:

``` ts
interface FulfillmentModeSelectorProps {
  selectedMode: FulfillmentMode;

  instantState: FulfillmentAvailabilityState;
  scheduledState: FulfillmentAvailabilityState;

  theme: CategoryTheme;

  onModeChange: (
    mode: FulfillmentMode
  ) => void;
}
```

The component is presentation-oriented.

Business logic belongs outside it.

------------------------------------------------------------------------

# 10. AVAILABILITY STATE

Do not use only:

``` text
enabled / disabled
```

Use meaningful states:

``` ts
type FulfillmentAvailabilityState =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'LOADING'
  | 'SERVICE_NOT_SUPPORTED'
  | 'LOCATION_REQUIRED'
  | 'NO_CAPACITY'
  | 'NO_PARTNER'
  | 'OUTSIDE_SERVICE_AREA';
```

This lets the UI explain why a mode cannot currently be selected.

------------------------------------------------------------------------

# 11. INSTANT MODE

Instant means:

``` text
Customer needs service as soon as possible.
```

Flow:

``` text
Customer selects category
        ↓
Selects service
        ↓
Selects INSTANT
        ↓
Location validated
        ↓
Serviceability checked
        ↓
Eligible partners found
        ↓
Partner availability checked
        ↓
Capacity checked
        ↓
Travel ETA calculated
        ↓
Price/quote calculated
        ↓
Booking intent created
        ↓
Partner dispatch/offer
        ↓
Partner accepts
        ↓
Booking confirmed
```

Do not interpret "instant" as:

``` text
guaranteed arrival in 15 minutes
```

unless the backend has enough operational evidence to make that promise.

------------------------------------------------------------------------

# 12. INSTANT AVAILABILITY

Instant should be based on actual operational data.

Concept:

``` text
instant_available =
    service_active
    AND location_serviceable
    AND eligible_partner_exists
    AND partner_available_now
    AND capacity_available
```

Optional:

``` text
AND partner_within_allowed_distance
```

The backend must be authoritative.

The mobile app must not decide this locally.

------------------------------------------------------------------------

# 13. INSTANT ETA

The existing SERV-02 routing foundation should be reused.

For the initial configured origin:

``` text
30.343866, 77.953231
```

the system can calculate:

``` text
origin → customer
```

Later:

``` text
nearest eligible partner → customer
```

Do not create a second routing engine.

------------------------------------------------------------------------

# 14. INSTANT ETA SEMANTICS

Distinguish:

``` text
Travel ETA
```

from:

``` text
Service arrival estimate
```

Travel ETA:

``` text
partner/origin → customer
```

Service estimate:

``` text
partner readiness
+
dispatch delay
+
travel
```

The initial SERV-02 estimate is travel routing.

Do not falsely present it as a guaranteed service arrival.

------------------------------------------------------------------------

# 15. SCHEDULED MODE

Scheduled means:

``` text
Customer selects future service date/time.
```

Flow:

``` text
Select service
      ↓
Schedule
      ↓
Select duration/package
      ↓
Select date
      ↓
Load available time windows
      ↓
Select time slot
      ↓
Validate serviceability
      ↓
Validate capacity
      ↓
Calculate quote
      ↓
Reserve slot
      ↓
Create booking
```

------------------------------------------------------------------------

# 16. SCHEDULED SLOT GENERATION

Never hardcode:

``` text
8:00
8:30
9:00
...
```

as universal slots.

Slots must come from backend policy.

Inputs:

``` text
service
duration
date
customer location
working hours
partner availability
capacity
minimum notice
buffer
holidays
blackout periods
existing bookings
```

Output:

``` ts
interface TimeSlot {
  id: string;

  startAt: string;
  endAt: string;

  status:
    | 'AVAILABLE'
    | 'FULL'
    | 'BLOCKED'
    | 'EXPIRED';

  remainingCapacity?: number;
}
```

------------------------------------------------------------------------

# 17. SLOT GENERATION ALGORITHM

Conceptual:

``` text
1. Load service booking policy.
2. Resolve customer timezone.
3. Determine business operating window.
4. Apply holiday/blackout rules.
5. Apply minimum notice.
6. Generate candidate slots.
7. Determine service duration.
8. Add required buffers.
9. Query availability/capacity.
10. Remove conflicts.
11. Remove unavailable partner capacity.
12. Return remaining slots.
```

Never generate slots only on the mobile client.

------------------------------------------------------------------------

# 18. TIMEZONE

Use timezone-aware timestamps.

Store backend timestamps in:

``` text
UTC
```

Display in:

``` text
customer local timezone
```

For India:

``` text
Asia/Kolkata
```

Do not store:

``` text
"10:30 AM"
```

as the canonical booking time.

Store:

``` text
start_at
end_at
timezone
```

------------------------------------------------------------------------

# 19. MINIMUM NOTICE

Every scheduled service may have a minimum notice.

Example:

``` text
minimum_notice_minutes = 120
```

If current time is:

``` text
1:30 PM
```

then:

``` text
2:00 PM
```

may be invalid.

The backend must determine this.

The mobile UI can hide obviously invalid slots, but backend validation
remains mandatory.

------------------------------------------------------------------------

# 20. MAXIMUM ADVANCE

Services may support:

``` text
today
tomorrow
next 7 days
next 30 days
```

Use:

``` text
maximum_advance_days
```

from service policy.

Do not hardcode a universal 7-day rule.

------------------------------------------------------------------------

# 21. SERVICE DURATION

A booking duration can come from:

``` text
service
package
quantity
property size
selected plan
```

Example:

``` text
0.5 hr
1 hr
1.5 hr
2 hr
```

The selected duration must influence:

``` text
slot capacity
pricing
partner availability
endAt
```

------------------------------------------------------------------------

# 22. SLOT CAPACITY MODEL

Do not model availability only as:

``` text
slot.available = true
```

Capacity should support:

``` text
slot capacity
partner capacity
service-specific capacity
zone capacity
```

Conceptual:

``` text
capacity:
  maxBookings
  reserved
  remaining
```

Future:

``` text
Cleaning:
3 teams

Plumbing:
5 technicians

Painting:
2 teams
```

------------------------------------------------------------------------

# 23. CONCURRENCY / RACE CONDITION

This is critical.

Two customers can see:

``` text
10:00 AM AVAILABLE
```

at the same time.

Both click Book.

Do NOT rely on the frontend.

Backend must atomically reserve capacity.

Concept:

``` text
Customer A ─┐
            ├─→ atomic reservation
Customer B ─┘
```

Only one succeeds if capacity = 1.

Use a database transaction/atomic function/appropriate locking
mechanism.

Do not implement:

``` text
SELECT available
then
INSERT booking
```

as two independent unsafe operations.

------------------------------------------------------------------------

# 24. SLOT HOLD

For checkout/payment, introduce a temporary hold concept.

Example:

``` text
AVAILABLE
   ↓
HELD
   ↓
PAYMENT
   ↓
CONFIRMED
```

If payment fails or hold expires:

``` text
HELD
 ↓
RELEASED
 ↓
AVAILABLE
```

This is essential for future real payment integration.

SERV-03 may define the reservation contract even if payment is
implemented later.

------------------------------------------------------------------------

# 25. HOLD EXPIRY

A hold must contain:

``` text
held_at
expires_at
hold_token
```

Backend must reject expired holds.

Never trust the client clock.

Use server time.

------------------------------------------------------------------------

# 26. BOOKING STATE MACHINE

Do not use arbitrary booleans.

Use explicit state.

Concept:

``` text
DRAFT
 ↓
QUOTE_CREATED
 ↓
HOLD_CREATED
 ↓
PENDING_CONFIRMATION
 ↓
CONFIRMED
 ↓
ASSIGNED
 ↓
PARTNER_ACCEPTED
 ↓
EN_ROUTE
 ↓
ARRIVED
 ↓
IN_PROGRESS
 ↓
COMPLETED
```

Failure branches:

``` text
CANCELLED
EXPIRED
FAILED
REASSIGNMENT_REQUIRED
```

Do not implement every future operational state in this phase unless the
existing booking domain already requires them. Define boundaries
cleanly.

------------------------------------------------------------------------

# 27. BOOKING INTENT

Before final booking, create a normalized intent:

``` ts
interface BookingIntent {
  serviceId: string;
  customerId: string;

  fulfillmentMode: FulfillmentMode;

  addressId: string;

  scheduledStartAt?: string;
  scheduledEndAt?: string;

  durationMinutes?: number;

  quoteVersion?: string;

  idempotencyKey: string;
}
```

Instant:

``` text
fulfillmentMode = INSTANT
scheduledStartAt = null
```

Scheduled:

``` text
fulfillmentMode = SCHEDULED
scheduledStartAt = selected slot
```

------------------------------------------------------------------------

# 28. IDEMPOTENCY

Mobile networks can retry requests.

The same booking request must not create two bookings.

Every create/reserve operation should support:

``` text
Idempotency-Key
```

or equivalent request identifier.

Backend behavior:

``` text
same key + same request
→ return original result

same key + different request
→ reject
```

This is mandatory for production booking.

------------------------------------------------------------------------

# 29. CUSTOMER FLOW --- FULL

``` text
HOME
 ↓
Category selected
 ↓
Mode selector
 ├── Instant
 └── Schedule
```

## Instant:

``` text
Instant
 ↓
Service catalog
 ↓
Service selected
 ↓
Location/serviceability
 ↓
Partner availability
 ↓
ETA
 ↓
Quote
 ↓
Checkout
 ↓
Hold/payment
 ↓
Booking confirmation
```

## Scheduled:

``` text
Schedule
 ↓
Service catalog
 ↓
Service selected
 ↓
Duration/package
 ↓
Date
 ↓
Time slot
 ↓
Availability
 ↓
Quote
 ↓
Checkout
 ↓
Hold/payment
 ↓
Booking confirmation
```

------------------------------------------------------------------------

# 30. CUSTOMER MODE PERSISTENCE

Do not persist mode globally forever.

Use appropriate scope.

Example:

``` text
Home session:
selected category
selected mode
```

When reopening app:

-   restore only if product UX requires it
-   otherwise use category default

Do not create surprising global state.

------------------------------------------------------------------------

# 31. CATEGORY-SPECIFIC DEFAULT

The category can define:

``` text
default_fulfillment_mode
```

Examples:

``` text
Emergency plumbing → INSTANT
Routine cleaning → SCHEDULED
Gardening → SCHEDULED
AC breakdown → INSTANT
Painting → SCHEDULED
```

But the customer must still be able to choose another mode if the
service supports it.

Default is not business authorization.

------------------------------------------------------------------------

# 32. HERO COPY

The Hero should dynamically communicate the selected mode.

Example:

### Instant

``` text
Need help now?
Get a verified professional as soon as possible.
```

### Schedule

``` text
Plan it your way.
Choose the date and time that works for you.
```

Do not hardcode category-specific copy inside React.

The copy should be data/config driven where the current architecture
supports it.

------------------------------------------------------------------------

# 33. MODE CARD CONTENT

Each card should contain:

``` text
icon
short title
short supporting line
availability/ETA/next slot
```

Example:

``` text
⚡ Instant
Available now
From ~25 min
```

and:

``` text
◷ Schedule
Pick a convenient time
Today / Tomorrow
```

Do not promise an exact arrival unless backend data supports it.

------------------------------------------------------------------------

# 34. SELECTION ANIMATION

Use lightweight animations.

On selecting Instant:

``` text
old selection
    ↓
opacity/scale transition
    ↓
accent surface
    ↓
selected indicator
```

On switching to Schedule:

``` text
same component
    ↓
crossfade/interpolate
    ↓
schedule card becomes active
```

Do not unmount the whole Hero.

Avoid:

``` text
navigation reset
screen replacement
full page transition
```

------------------------------------------------------------------------

# 35. PERFORMANCE

The mode selector must be effectively instant.

Requirements:

``` text
no API call from animation frame
no expensive re-render
no image reload
no navigation stack transition
no layout thrashing
```

Use:

``` text
React.memo
stable callbacks
derived selectors
lightweight animation primitives
```

where appropriate for the existing architecture.

------------------------------------------------------------------------

# 36. API ARCHITECTURE

Create/reuse endpoints such as:

``` text
GET /services/{serviceId}/fulfillment-options
POST /availability/instant
POST /availability/slots
POST /booking-intents
POST /slot-holds
```

Use the project's existing API conventions.

Do not create five endpoints if the existing architecture already has an
equivalent aggregation endpoint.

------------------------------------------------------------------------

# 37. FULFILLMENT OPTIONS API

Conceptual response:

``` json
{
  "serviceId": "uuid",
  "instant": {
    "supported": true,
    "available": true,
    "estimatedArrivalMinutes": 28
  },
  "scheduled": {
    "supported": true,
    "available": true,
    "nextAvailableDate": "2026-09-18"
  }
}
```

Important:

``` text
supported != currently available
```

For example:

``` text
supported = true
available = false
reason = NO_PARTNER
```

------------------------------------------------------------------------

# 38. AVAILABILITY REASONS

Use stable reason codes:

``` text
NO_PARTNER
NO_CAPACITY
OUTSIDE_SERVICE_AREA
SERVICE_DISABLED
LOCATION_REQUIRED
MINIMUM_NOTICE
HOLIDAY
BLACKOUT
TEMPORARILY_UNAVAILABLE
```

UI converts codes into customer-friendly copy.

Do not expose internal debugging text.

------------------------------------------------------------------------

# 39. BACKEND AGGREGATION

The client should ideally make one optimized request to obtain mode
availability rather than five sequential requests.

Concept:

``` text
GET fulfillment options
       ↓
service policy
       ↓
location
       ↓
serviceability
       ↓
availability
       ↓
routing
       ↓
response
```

Use caching for data that is safe to cache.

Do not cache rapidly changing partner availability for too long.

------------------------------------------------------------------------

# 40. INSTANT PARTNER SELECTION

Do not put partner ranking in the Hero.

The future dispatch system should decide.

Potential factors:

``` text
service capability
distance
ETA
availability
working status
current workload
zone
rating/policy
partner priority
```

SERV-03 can expose availability without implementing the final dispatch
algorithm.

------------------------------------------------------------------------

# 41. PARTNER APP --- INSTANT FLOW

Partner app must eventually receive:

``` text
NEW_SERVICE_REQUEST
```

Conceptual:

``` text
Customer creates instant request
          ↓
Backend creates dispatch task
          ↓
eligible partner candidates
          ↓
partner offer
          ↓
partner accepts
          ↓
booking assigned
          ↓
customer notified
```

Partner should see:

``` text
service
customer area/address according to privacy policy
estimated travel
distance
price/payout information when authorized
accept/decline
```

Do not expose unnecessary customer information before acceptance.

------------------------------------------------------------------------

# 42. PARTNER APP --- SCHEDULED FLOW

Scheduled booking:

``` text
Booking created
 ↓
capacity reserved
 ↓
future assignment
 ↓
partner assignment according to dispatch policy
 ↓
partner calendar
 ↓
reminder
 ↓
partner confirms readiness
 ↓
service
```

Partner should see:

``` text
scheduled date
start time
duration
service
location
required skills
booking status
```

------------------------------------------------------------------------

# 43. PARTNER AVAILABILITY MODEL

Create/reuse:

``` ts
interface PartnerAvailability {
  partnerId: string;

  serviceId: string;

  startAt: string;
  endAt: string;

  status:
    | 'AVAILABLE'
    | 'BUSY'
    | 'BLOCKED'
    | 'OFF_DUTY';

  capacity: number;
}
```

Do not assume:

``` text
partner = available
```

just because they are logged in.

------------------------------------------------------------------------

# 44. PARTNER WORKING HOURS

Partner can have:

``` text
weekly schedule
breaks
leave
blackouts
service-specific hours
```

This should be data-driven.

Admin must eventually be able to control these policies.

------------------------------------------------------------------------

# 45. ADMIN CONTROL

The admin system must control:

``` text
service enabled/disabled
instant enabled/disabled
scheduled enabled/disabled
minimum notice
maximum advance
operating hours
slot interval
capacity
blackout dates
service areas
partner availability overrides
```

Do not put these controls inside mobile code.

------------------------------------------------------------------------

# 46. ADMIN UI STRUCTURE

Future admin:

``` text
Services
 ├── Fulfillment
 │    ├── Instant
 │    ├── Scheduled
 │    ├── Minimum notice
 │    └── Advance window
 │
 ├── Availability
 │    ├── Capacity
 │    ├── Working hours
 │    └── Blackouts
 │
 └── Partners
      ├── Skills
      ├── Zones
      ├── Availability
      └── Overrides
```

This should use existing `apps/admin` infrastructure if present.

------------------------------------------------------------------------

# 47. DATABASE DESIGN

Inspect the existing schema first.

Do not create duplicate tables.

Potential new tables/entities:

``` text
service_fulfillment_policies
service_operating_hours
service_blackouts
service_slots / generated availability
partner_availability
booking_holds
booking_intents
```

Use existing booking tables if already present.

------------------------------------------------------------------------

# 48. FULFILLMENT POLICY TABLE

Conceptual:

``` sql
create table service_fulfillment_policies (
  service_id uuid primary key references services(id),

  instant_enabled boolean not null default false,
  scheduled_enabled boolean not null default true,

  minimum_notice_minutes integer not null default 0,
  maximum_advance_days integer not null default 30,

  slot_interval_minutes integer not null default 30,

  instant_radius_meters integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (minimum_notice_minutes >= 0),
  check (maximum_advance_days >= 0),
  check (slot_interval_minutes > 0),
  check (
    instant_radius_meters is null
    or instant_radius_meters > 0
  )
);
```

Adapt names/types to the existing schema.

------------------------------------------------------------------------

# 49. OPERATING HOURS

Do not store all slots permanently unless there is a real operational
reason.

Prefer policies:

``` text
Monday
09:00 → 18:00

Tuesday
09:00 → 18:00
```

Then generate availability dynamically using current capacity.

Persist exceptions:

``` text
holiday
blackout
special hours
```

------------------------------------------------------------------------

# 50. SLOT GENERATION SERVICE

Create:

``` ts
interface SlotGenerationService {
  getAvailableSlots(
    request: SlotRequest
  ): Promise<TimeSlot[]>;
}
```

Request:

``` ts
interface SlotRequest {
  serviceId: string;
  customerLocation: GeoPoint;
  date: string;
  durationMinutes: number;
}
```

Service should compose:

``` text
ServicePolicy
WorkingHoursProvider
BlackoutProvider
PartnerAvailabilityProvider
CapacityProvider
ServiceabilityService
```

Do not make SlotGenerationService query Supabase directly everywhere.

------------------------------------------------------------------------

# 51. SERVICEABILITY BOUNDARY

SERV-03 must consume the routing/location foundation from SERV-02.

Do not duplicate:

``` text
GeoPoint validation
Origin resolution
RoutingProvider
ETAService
```

Future:

``` text
ServiceabilityService
    ↓
OriginResolver
    ↓
RoutingProvider
```

------------------------------------------------------------------------

# 52. OOP STRUCTURE

Use:

``` text
FulfillmentMode
FulfillmentPolicy
FulfillmentAvailabilityService
InstantAvailabilityStrategy
ScheduledAvailabilityStrategy
SlotGenerationService
CapacityService
BookingIntentService
```

where the domain actually benefits.

------------------------------------------------------------------------

# 53. STRATEGY PATTERN

Use Strategy for fulfillment.

``` ts
interface FulfillmentStrategy {
  getAvailability(
    context: FulfillmentContext
  ): Promise<FulfillmentAvailability>;
}
```

Implement:

``` text
InstantFulfillmentStrategy
ScheduledFulfillmentStrategy
```

Both satisfy the same contract.

------------------------------------------------------------------------

# 54. INSTANT STRATEGY

Concept:

``` text
validate service
 ↓
validate location
 ↓
serviceability
 ↓
find available partners/capacity
 ↓
route/ETA
 ↓
availability result
```

It must not create the final payment transaction.

------------------------------------------------------------------------

# 55. SCHEDULED STRATEGY

Concept:

``` text
validate service
 ↓
validate date
 ↓
validate policy
 ↓
generate slots
 ↓
check capacity
 ↓
return available slots
```

It must not contain instant dispatch logic.

------------------------------------------------------------------------

# 56. FACTORY

Use:

``` ts
class FulfillmentStrategyFactory {
  getStrategy(
    mode: FulfillmentMode
  ): FulfillmentStrategy {
    ...
  }
}
```

Then:

``` text
INSTANT
   ↓
InstantFulfillmentStrategy

SCHEDULED
   ↓
ScheduledFulfillmentStrategy
```

------------------------------------------------------------------------

# 57. REPOSITORY PATTERN

Use repositories:

``` text
ServiceRepository
FulfillmentPolicyRepository
PartnerAvailabilityRepository
CapacityRepository
BookingRepository
SlotRepository
```

where they fit the existing architecture.

Business services should not contain raw database queries everywhere.

------------------------------------------------------------------------

# 58. DEPENDENCY INJECTION

Example:

``` ts
class FulfillmentAvailabilityService {
  constructor(
    private readonly strategyFactory: FulfillmentStrategyFactory,
    private readonly serviceRepository: ServiceRepository
  ) {}
}
```

Dependencies should be injected.

Do not instantiate infrastructure inside business methods.

------------------------------------------------------------------------

# 59. SOLID

## S

Separate:

``` text
slot generation
capacity
routing
partner selection
booking
```

## O

Add a future mode:

``` text
EMERGENCY
```

without rewriting every existing mode.

## L

Both fulfillment strategies must honor the same interface contract.

## I

Do not make one interface containing:

``` text
slot generation
payment
dispatch
tracking
```

## D

Domain services depend on interfaces.

------------------------------------------------------------------------

# 60. STATE MACHINE

Fulfillment selection itself can be modeled:

``` text
CATEGORY_SELECTED
      ↓
MODE_UNSELECTED
      ↓
INSTANT_SELECTED
      │
      └→ SCHEDULED_SELECTED
```

But do not confuse UI selection state with booking state.

They are separate state machines.

------------------------------------------------------------------------

# 61. UI STATE VS DOMAIN STATE

UI:

``` text
selectedMode
loading
error
```

Domain:

``` text
availability
capacity
booking status
hold
assignment
```

Never use UI state as authoritative booking state.

------------------------------------------------------------------------

# 62. PRICE BOUNDARY

Instant/Scheduled mode can influence pricing.

Example:

``` text
instant surcharge
scheduled discount
```

But pricing must remain in the pricing domain.

Do not do:

``` ts
if (mode === 'INSTANT') price += 100;
```

inside Hero or fulfillment UI.

Instead:

``` text
FulfillmentMode
      ↓
PricingEngine
```

The pricing engine decides the actual amount.

------------------------------------------------------------------------

# 63. PARTNER PAYOUT BOUNDARY

Do not calculate partner payout in:

``` text
InstantFulfillmentStrategy
```

or:

``` text
ScheduledFulfillmentStrategy
```

Use:

``` text
Pricing / Payout domain
```

later.

------------------------------------------------------------------------

# 64. ADMIN AUDIT

Admin changes should be auditable.

Record:

``` text
who changed
what changed
old value
new value
when
reason if required
```

Especially:

``` text
instant enabled/disabled
scheduled enabled/disabled
capacity
operating hours
blackouts
```

------------------------------------------------------------------------

# 65. REALTIME UPDATES

For instant availability, availability changes rapidly.

If the existing stack supports Supabase Realtime:

``` text
partner availability change
 ↓
availability state
 ↓
customer UI refresh
```

But do not rely solely on realtime.

Always revalidate at the critical booking/reservation operation.

------------------------------------------------------------------------

# 66. STALE AVAILABILITY

Customer sees:

``` text
Instant — Available
```

then partner becomes unavailable.

Backend booking attempt must return:

``` text
NO_PARTNER
```

or:

``` text
NO_CAPACITY
```

The client then refreshes availability.

Never assume previously fetched availability remains valid.

------------------------------------------------------------------------

# 67. SCHEDULED SLOT STALENESS

Customer sees:

``` text
10:30 AM available
```

another customer books it.

Customer taps Book.

Backend performs atomic reservation.

If unavailable:

``` text
SLOT_NO_LONGER_AVAILABLE
```

then UI refreshes.

------------------------------------------------------------------------

# 68. NETWORK FAILURE

For availability:

``` text
loading
 ↓
network failure
 ↓
controlled error
```

Do not show:

``` text
Available
```

just because the previous request succeeded unless explicitly marked
stale.

------------------------------------------------------------------------

# 69. OFFLINE

The app should not create authoritative bookings offline.

Allowed:

``` text
cached service catalog
cached UI state
```

Not allowed:

``` text
offline booking confirmation
offline slot reservation
offline payment success
```

------------------------------------------------------------------------

# 70. ACCESSIBILITY

Mode cards must:

-   have adequate touch area
-   have accessible labels
-   expose selected state
-   support screen readers
-   not rely only on color
-   maintain readable contrast

Example accessible state:

``` text
"Instant service, selected"
```

------------------------------------------------------------------------

# 71. ANIMATION PERFORMANCE

Use native-driven/optimized animations supported by the current React
Native stack.

Do not animate:

``` text
large image processing
network calls
database queries
```

inside animation callbacks.

Avoid JS-thread-heavy animations.

The Hero must remain smooth during:

``` text
category switch
mode switch
scroll
```

------------------------------------------------------------------------

# 72. DATA PREFETCHING

When a category becomes active:

``` text
category selected
 ↓
prefetch fulfillment options
```

But do not prefetch every service/slot for every category.

Use demand-based prefetching.

For example:

``` text
Home:
fetch lightweight mode availability

Service detail:
fetch detailed availability

Schedule:
fetch date/slot data
```

------------------------------------------------------------------------

# 73. REQUEST CANCELLATION

If customer rapidly changes:

``` text
Cleaning
→ Electrical
→ Plumbing
```

cancel or invalidate stale availability requests.

Only latest category/mode request should update the UI.

Use:

``` text
AbortController
request IDs
query-library cancellation
```

according to existing infrastructure.

------------------------------------------------------------------------

# 74. CACHE POLICY

Safe-to-cache:

``` text
service metadata
fulfillment policy
operating hours
```

Short-lived:

``` text
instant availability
slot availability
```

Do not cache:

``` text
booking confirmation
payment result
final reservation state
```

as authoritative client state.

------------------------------------------------------------------------

# 75. CUSTOMER DATA FLOW --- INSTANT

``` text
User
 ↓
Category
 ↓
Mode = INSTANT
 ↓
Service catalog
 ↓
Service selection
 ↓
Customer address
 ↓
POST fulfillment availability
 ↓
Backend
 ├── service policy
 ├── serviceability
 ├── partner availability
 ├── capacity
 └── routing
 ↓
Availability + ETA
 ↓
Customer
 ↓
Create booking intent
 ↓
Quote
 ↓
Hold
 ↓
Payment
 ↓
Confirm
 ↓
Partner dispatch
```

------------------------------------------------------------------------

# 76. CUSTOMER DATA FLOW --- SCHEDULE

``` text
User
 ↓
Category
 ↓
Mode = SCHEDULED
 ↓
Service catalog
 ↓
Service
 ↓
Duration/package
 ↓
Date
 ↓
Slot API
 ↓
Backend
 ├── policy
 ├── operating hours
 ├── blackout
 ├── serviceability
 ├── partner availability
 └── capacity
 ↓
Available slots
 ↓
User selects slot
 ↓
Create booking intent
 ↓
Quote
 ↓
Atomic hold
 ↓
Payment
 ↓
Confirm
 ↓
Partner assignment
```

------------------------------------------------------------------------

# 77. PARTNER DATA FLOW --- INSTANT

``` text
Customer booking intent
 ↓
dispatch engine
 ↓
eligible partner candidates
 ↓
partner offer
 ↓
Partner App notification
 ↓
Partner opens request
 ↓
Accept
 ↓
Atomic assignment
 ↓
Partner navigation
 ↓
Customer updates
```

Partner acceptance must be idempotent.

------------------------------------------------------------------------

# 78. PARTNER DATA FLOW --- SCHEDULED

``` text
Scheduled booking
 ↓
future capacity reservation
 ↓
partner assignment
 ↓
partner calendar
 ↓
reminder
 ↓
partner preparation
 ↓
service start
```

The actual dispatch/assignment algorithm belongs to the later dispatch
domain.

------------------------------------------------------------------------

# 79. ADMIN DATA FLOW

``` text
Admin
 ↓
Edit service policy
 ↓
Validate
 ↓
Authorization
 ↓
Audit log
 ↓
Supabase
 ↓
Backend cache invalidation
 ↓
Customer/Partner API
 ↓
New behavior
```

No mobile rebuild should be required for policy/data changes.

------------------------------------------------------------------------

# 80. DATABASE RLS

Customer:

``` text
read only data they are authorized to see
```

Partner:

``` text
read their own availability/bookings
```

Admin:

``` text
authorized operational writes
```

Never give the mobile app a Supabase service-role key.

------------------------------------------------------------------------

# 81. TRANSACTION BOUNDARY

Booking reservation should be atomic.

For scheduled capacity:

``` text
BEGIN
  validate slot
  validate capacity
  reserve capacity
  create hold
COMMIT
```

If anything fails:

``` text
ROLLBACK
```

Use database functions/transactions appropriate to the current backend
architecture.

------------------------------------------------------------------------

# 82. UNIQUE CONSTRAINTS

Use database-level protection where appropriate.

Examples:

``` text
idempotency key uniqueness
active hold uniqueness
booking reference uniqueness
```

Do not rely solely on application checks.

------------------------------------------------------------------------

# 83. VALIDATION LAYERS

Validate at:

``` text
UI
API schema
domain
database constraints
```

But do not duplicate complex business rules unnecessarily.

Client validation is for UX.

Backend validation is authoritative.

Database constraints protect integrity.

------------------------------------------------------------------------

# 84. SECURITY

Never trust:

``` text
price
ETA
duration
slot availability
partner availability
mode capability
service active state
```

sent from mobile.

Mobile sends intent.

Backend calculates/validates truth.

------------------------------------------------------------------------

# 85. RATE LIMITING

Protect:

``` text
availability
slot generation
booking intent
hold creation
```

against abusive request loops.

Use existing API rate-limit infrastructure where available.

Do not rate-limit legitimate category switching so aggressively that the
UX breaks.

------------------------------------------------------------------------

# 86. OBSERVABILITY

Log structured events:

``` text
fulfillment_options_requested
instant_availability_checked
scheduled_slots_requested
slot_hold_created
slot_hold_failed
booking_intent_created
availability_stale
partner_offer_created
```

Include:

``` text
requestId
userId where appropriate
serviceId
mode
duration
latency
result
errorCode
```

Avoid unnecessary exact location logging.

------------------------------------------------------------------------

# 87. METRICS

Prepare:

``` text
instant_availability_requests
instant_available_rate
instant_no_partner_rate
instant_no_capacity_rate

scheduled_slot_requests
slot_generation_latency
slot_conflict_rate

hold_success_rate
hold_expiry_rate

booking_intent_success_rate
booking_duplicate_prevented
```

These metrics will later reveal operational bottlenecks.

------------------------------------------------------------------------

# 88. ERROR MODEL

Stable codes:

``` text
FULFILLMENT_MODE_UNSUPPORTED
FULFILLMENT_MODE_UNAVAILABLE
LOCATION_REQUIRED
OUTSIDE_SERVICE_AREA
NO_PARTNER
NO_CAPACITY
NO_AVAILABLE_SLOTS
SLOT_NO_LONGER_AVAILABLE
MINIMUM_NOTICE_NOT_MET
MAXIMUM_ADVANCE_EXCEEDED
SERVICE_INACTIVE
BOOKING_HOLD_EXPIRED
IDEMPOTENCY_CONFLICT
```

UI should map codes to friendly messages.

------------------------------------------------------------------------

# 89. UX ERROR EXAMPLES

Instead of:

``` text
500 Internal Server Error
```

show:

``` text
Instant service isn't available right now.
Try scheduling a time instead.
```

If a slot disappears:

``` text
That time was just booked.
We've refreshed the available times.
```

Do not blame the user.

------------------------------------------------------------------------

# 90. TESTING --- UNIT

Test:

``` text
FulfillmentMode
FulfillmentStrategyFactory
InstantFulfillmentStrategy
ScheduledFulfillmentStrategy
SlotGenerationService
minimum notice
maximum advance
duration
capacity
availability mapping
error mapping
```

------------------------------------------------------------------------

# 91. TESTING --- SLOT ALGORITHM

Test:

``` text
operating hours
outside hours
minimum notice
maximum advance
holiday
blackout
duration
overlapping booking
capacity = 0
capacity > 0
multiple partners
partner unavailable
```

------------------------------------------------------------------------

# 92. TESTING --- CONCURRENCY

Simulate:

``` text
Customer A → slot X
Customer B → slot X
```

Verify:

``` text
only permitted capacity is reserved
```

Test instant assignment similarly:

``` text
Partner A
Customer A
Customer B
```

Do not allow double assignment.

------------------------------------------------------------------------

# 93. TESTING --- IDEMPOTENCY

Send the same request twice:

``` text
same idempotency key
same payload
```

Expected:

``` text
same booking/hold result
```

Then:

``` text
same key
different payload
```

Expected:

``` text
IDEMPOTENCY_CONFLICT
```

------------------------------------------------------------------------

# 94. TESTING --- CUSTOMER E2E

Actually test:

``` text
1. Open category.
2. See Instant/Schedule selector.
3. Select Instant.
4. Verify same Hero remains.
5. Verify instant availability loads.
6. Select service.
7. Verify real location/serviceability.
8. Verify ETA.
9. Select Schedule.
10. Verify date options.
11. Select date.
12. Verify real slots.
13. Select duration.
14. Select slot.
15. Verify stale slot handling.
16. Verify booking intent.
```

------------------------------------------------------------------------

# 95. TESTING --- PARTNER E2E

Test:

``` text
1. Partner online.
2. Partner marked available.
3. Customer creates instant request.
4. Partner receives offer.
5. Partner accepts.
6. Backend assigns atomically.
7. Second partner cannot steal assigned job.
8. Partner sees correct destination.
9. Routing uses shared routing service.
```

------------------------------------------------------------------------

# 96. TESTING --- ADMIN

Test:

``` text
disable instant
 ↓
customer cannot select instant

enable instant
 ↓
customer can select if operationally available

change minimum notice
 ↓
slots update

change capacity
 ↓
availability changes

blackout date
 ↓
slots disappear
```

No mobile rebuild should be necessary.

------------------------------------------------------------------------

# 97. TESTING --- FAILURE MATRIX

  Failure                  Expected
  ------------------------ ---------------------------
  No location              Location required
  Service disabled         Service unavailable
  Instant unsupported      Instant disabled
  No partner               Controlled unavailable
  No capacity              Controlled unavailable
  Outside zone             Service not available
  Slot expired             Refresh slots
  Hold expired             User must retry
  Duplicate request        Idempotent result
  Routing timeout          Controlled degraded state
  Network offline          No false confirmation
  Admin disables service   New requests blocked
  Partner goes offline     Availability recalculated

------------------------------------------------------------------------

# 98. PERFORMANCE TARGETS

Avoid:

``` text
category click
 → 10 sequential API calls
```

Prefer:

``` text
category click
 → lightweight fulfillment data
```

Then on service selection:

``` text
service detail
 → detailed availability
```

Then schedule:

``` text
date
 → slots
```

Do not fetch all future slots for all services.

------------------------------------------------------------------------

# 99. MEMORY / RENDER PERFORMANCE

The Hero must not become a giant stateful component.

Separate:

``` text
HeroHeader
CategoryNavigation
FulfillmentModeSelector
HeroContent
FulfillmentAvailabilityController
```

The visual component should remain lightweight.

------------------------------------------------------------------------

# 100. REACT STATE ARCHITECTURE

Avoid:

``` ts
const [everything, setEverything] = useState(...)
```

Prefer:

``` text
category state
mode state
service state
availability query state
slot query state
booking intent state
```

Use the project's existing query/state management library if present.

------------------------------------------------------------------------

# 101. SERVER AUTHORITY

Final truth always comes from backend.

Example:

``` text
Mobile:
"10:30 is available"

Backend:
"10:30 is no longer available"

Backend wins.
```

The same applies to:

``` text
price
ETA
partner
capacity
service availability
```

------------------------------------------------------------------------

# 102. EVENTUAL CONSISTENCY

Availability can change between:

``` text
read
```

and:

``` text
reserve
```

Therefore:

``` text
READ
 ↓
DISPLAY
 ↓
RESERVE
 ↓
REVALIDATE
```

Do not treat a read response as a reservation.

------------------------------------------------------------------------

# 103. FUTURE PAYMENT COMPATIBILITY

The flow must support:

``` text
slot hold
 ↓
payment
 ↓
payment success
 ↓
booking confirmation
```

not:

``` text
payment
 ↓
try to find slot
```

For scheduled bookings, reserve capacity before payment for a short
hold, then confirm after successful payment.

The exact payment orchestration belongs to the payment phase.

------------------------------------------------------------------------

# 104. FUTURE CANCELLATION

Design booking/hold states so future cancellation can support:

``` text
customer cancellation
partner cancellation
admin cancellation
expired hold
refund policy
rescheduling
```

Do not implement the entire cancellation engine here.

------------------------------------------------------------------------

# 105. FUTURE RESCHEDULING

Scheduled bookings should eventually support:

``` text
existing booking
 ↓
request reschedule
 ↓
new slot validation
 ↓
old slot/new slot atomic transition
```

The current slot model must not prevent this.

------------------------------------------------------------------------

# 106. FUTURE SERVICE PACKAGES

The architecture should support:

``` text
service
 ├── package
 ├── duration
 ├── quantity
 └── fulfillment mode
```

without rewriting fulfillment.

------------------------------------------------------------------------

# 107. FUTURE EMERGENCY MODE

Do not implement now, but architecture should allow:

``` text
INSTANT
SCHEDULED
EMERGENCY
```

if the business later needs a distinct emergency workflow.

Do not add it to the current UI unless product requirements demand it.

------------------------------------------------------------------------

# 108. FUTURE MEMBERSHIP / SUBSCRIPTION

Do not mix membership discounts into fulfillment.

Correct:

``` text
FulfillmentMode
 ↓
PricingEngine
 ↓
Membership/DiscountEngine
```

------------------------------------------------------------------------

# 109. ADMIN + PARTNER RESPONSIBILITY

## Admin controls policy

``` text
what can be offered
when it can be offered
where it can be offered
capacity
rules
```

## Partner controls operational availability

``` text
online/offline
working status
acceptance
availability
```

## Backend decides truth

``` text
eligible
serviceable
available
reserved
confirmed
```

## Customer chooses

``` text
service
mode
date/time
address
```

This separation is essential.

------------------------------------------------------------------------

# 110. FINAL TARGET ARCHITECTURE

``` text
                         CUSTOMER APP
                              │
                       Category selected
                              │
                              ▼
                    FulfillmentModeSelector
                         /            \
                        /              \
                       ▼                ▼
                   INSTANT          SCHEDULED
                       │                │
                       ▼                ▼
             InstantStrategy     ScheduledStrategy
                       │                │
                       ├──────┬─────────┤
                              ▼
                    Fulfillment Service
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                 ▼
       Service Policy   Serviceability      Availability
             │                │                 │
             │                ▼                 ▼
             │          Routing/ETA        Capacity
             │
             └────────────────┬─────────────────┘
                              ▼
                         Booking Intent
                              │
                              ▼
                            Quote
                              │
                              ▼
                         Slot / Hold
                              │
                              ▼
                           Payment
                              │
                              ▼
                          Booking
                              │
                              ▼
                    Partner / Dispatch
                              │
                              ▼
                       Service execution
```

------------------------------------------------------------------------

# 111. IMPLEMENTATION ORDER

Execute in this order.

## Phase A --- Audit

``` text
1. Inspect repository.
2. Locate service/category architecture.
3. Locate Hero component.
4. Locate existing booking/service detail flow.
5. Locate Supabase schema.
6. Locate partner availability schema.
7. Locate existing routing/serviceability.
8. Locate admin workspace.
```

## Phase B --- Domain

``` text
9. FulfillmentMode
10. FulfillmentPolicy
11. FulfillmentAvailability
12. FulfillmentContext
13. FulfillmentStrategy
14. TimeSlot
15. BookingIntent
16. Hold
```

## Phase C --- Database

``` text
17. Reuse existing service tables.
18. Add fulfillment policy where missing.
19. Add operating hours if missing.
20. Add blackout rules if missing.
21. Add availability/capacity model where missing.
22. Add hold/idempotency constraints.
23. Configure RLS.
```

## Phase D --- Backend

``` text
24. Strategy implementations.
25. Strategy factory.
26. Availability service.
27. Slot generation service.
28. Capacity service.
29. Fulfillment API.
30. Booking intent API.
31. Hold API.
32. Idempotency.
33. Error mapping.
```

## Phase E --- Customer

``` text
34. FulfillmentModeSelector.
35. Integrate into Hero.
36. Instant state.
37. Scheduled state.
38. Service selection.
39. Date selection.
40. Slot selection.
41. Availability errors.
42. Loading states.
43. stale request protection.
```

## Phase F --- Partner

``` text
44. Partner availability.
45. Instant service offers.
46. Accept/decline.
47. Assignment protection.
48. Scheduled calendar.
```

## Phase G --- Admin

``` text
49. Fulfillment policy controls.
50. Operating hours.
51. Capacity.
52. Blackouts.
53. Partner availability controls.
54. Audit logs.
```

## Phase H --- Verification

``` text
55. Unit tests.
56. Integration tests.
57. concurrency tests.
58. idempotency tests.
59. customer E2E.
60. partner E2E.
61. admin E2E.
62. real-device testing.
63. typecheck.
64. lint.
65. build.
66. performance audit.
67. security audit.
```

------------------------------------------------------------------------

# 112. STRICT UI PRESERVATION RULE

Do not rebuild the current Hero.

Add:

``` text
FulfillmentModeSelector
```

as a reusable layer.

Preserve:

``` text
category colors
hero image
hero text
search
location
ETA
category navigation
scroll behavior
sticky behavior
```

The new component must inherit the currently selected category's theme.

------------------------------------------------------------------------

# 113. STRICT ANIMATION RULE

The mode selector must transition:

``` text
Instant ↔ Schedule
```

without:

``` text
screen navigation
Hero remount
image reload
scroll reset
full layout jump
```

Use layout-stable dimensions where possible.

------------------------------------------------------------------------

# 114. STRICT DATA RULE

Never hardcode:

``` text
instant available
15 minutes
today
8:00 AM
9:00 AM
```

as business truth.

They are backend-derived values.

Static fallback copy is acceptable only as a UI placeholder while
loading.

------------------------------------------------------------------------

# 115. STRICT BOOKING RULE

Never confirm a booking based only on:

``` text
client availability
```

Final sequence:

``` text
client request
 ↓
backend validation
 ↓
atomic reservation
 ↓
payment/confirmation flow
 ↓
booking confirmed
```

------------------------------------------------------------------------

# 116. STRICT NO-FAKE RULE

Never simulate:

``` text
partner available
slot available
instant available
booking confirmed
payment success
```

for the production flow.

Mocks are allowed only in tests.

------------------------------------------------------------------------

# 117. STRICT OOP RULE

Do not create a 2,000-line:

``` text
BookingService
```

containing:

``` text
availability
slots
pricing
payment
dispatch
notifications
```

Keep domains separated.

------------------------------------------------------------------------

# 118. STRICT FUTURE-COMPATIBILITY RULE

SERV-03 must consume SERV-02:

``` text
GeoPoint
RoutingProvider
OriginResolver
ETAService
```

Do not create:

``` text
SecondLocationService
SecondRoutingService
SecondETAService
```

for instant/scheduled.

------------------------------------------------------------------------

# 119. DEFINITION OF DONE

The feature is complete only when:

``` text
[ ] Instant/Schedule selector exists beneath category navigation
[ ] Selector is category-theme aware
[ ] Existing Hero remains intact
[ ] No navigation is required to switch mode
[ ] Instant is a real backend capability
[ ] Scheduled is a real backend capability
[ ] Service capabilities come from database
[ ] Location is validated
[ ] Serviceability is backend-authoritative
[ ] Instant availability uses real partner/capacity state
[ ] Scheduled slots are backend-generated
[ ] Minimum notice works
[ ] Maximum advance works
[ ] Working hours work
[ ] Blackouts work
[ ] Duration affects slot availability
[ ] Capacity is atomic
[ ] Slot race conditions are handled
[ ] Hold mechanism exists where required
[ ] Hold expiry works
[ ] Idempotency exists
[ ] Customer flow works
[ ] Partner flow is integrated/prepared
[ ] Admin controls exist or are cleanly supported by existing admin architecture
[ ] RLS/security verified
[ ] Errors are typed/stable
[ ] Stale requests are protected
[ ] Performance is verified
[ ] Unit tests pass
[ ] Integration tests pass
[ ] concurrency tests pass
[ ] E2E tests pass
[ ] physical device tested
[ ] typecheck passes
[ ] lint passes
[ ] build passes
[ ] no fake availability remains
[ ] no hardcoded universal slots remain
[ ] no duplicate routing/ETA logic exists
```

------------------------------------------------------------------------

# 120. FINAL REPORT REQUIRED FROM THE AGENT

At completion report:

## A. Repository audit

What already existed.

## B. Files changed

Exact paths.

## C. Database

Exact migrations/tables/constraints/indexes/RLS.

## D. Domain architecture

Explain:

``` text
FulfillmentMode
Strategy
Availability
Capacity
BookingIntent
Hold
```

## E. Customer flow

Show exact runtime flow.

## F. Partner flow

Show exact runtime flow.

## G. Admin flow

Show exact runtime flow.

## H. Race-condition protection

Explain exactly how simultaneous bookings are prevented.

## I. Idempotency

Explain exactly how duplicate mobile requests are prevented.

## J. Testing

List exact commands and actual results.

## K. Manual verification

List devices and scenarios actually tested.

## L. Known limitations

Clearly separate:

``` text
implemented
not implemented
future phase
```

Never claim a feature is production-ready merely because TypeScript
compiles.

------------------------------------------------------------------------

# 121. FINAL ENGINEERING PRINCIPLE

The objective is not:

``` text
"Add two buttons to the Hero."
```

The objective is:

``` text
Build a real fulfillment-mode domain.
```

The Hero is only the entry point.

The complete system is:

``` text
             CATEGORY
                ↓
       INSTANT / SCHEDULE
          ↙           ↘
      NOW             FUTURE
       ↓                ↓
 SERVICEABILITY     SLOT ENGINE
       ↓                ↓
 PARTNER/CAPACITY   CAPACITY
       ↓                ↓
    ROUTING          RESERVATION
       ↓                ↓
      ETA              HOLD
       ↘                ↙
          BOOKING INTENT
                ↓
              QUOTE
                ↓
             PAYMENT
                ↓
             BOOKING
                ↓
             PARTNER
                ↓
             SERVICE
```

Build this with clean domain boundaries now so that future booking,
payment, partner, dispatch, pricing, and admin phases **extend the
system rather than replace it**.

------------------------------------------------------------------------

# END OF SERV-03 MASTER PROMPT


# 122. CRITICAL CORRECTION — THE TWO HERO BUTTONS ARE NOT THE END OF THE FEATURE

The two Hero buttons are only the **entry point**.

Do NOT implement this feature as:

```text
Hero
 ↓
Instant button
 ↓
some UI
```

or:

```text
Hero
 ↓
Schedule button
 ↓
some UI
```

The implementation is incomplete unless the complete downstream customer journeys and their backend contracts work.

The required product behavior is:

```text
HOME / HERO
      │
      ├───────────────┐
      ▼               ▼
   INSTANT         SCHEDULE
      │               │
      ▼               ▼
INSTANT FLOW      SCHEDULE FLOW
      │               │
      └───────┬───────┘
              ▼
        SERVICE SELECTION
              │
              ▼
       BOOKING CONFIGURATION
              │
              ▼
          CHECKOUT
              │
              ▼
        BOOKING CONFIRM
              │
              ▼
       PARTNER / DISPATCH
              │
              ▼
       BOOKING TRACKING
```

Every arrow must have a real implementation boundary.

---

# 123. REQUIRED PAGES / SCREENS AFTER CLICK

Implement the downstream screens as reusable production screens.

## INSTANT

After clicking **Instant**:

```text
Hero
 ↓
Instant Service Catalog
 ↓
Select Service
 ↓
Service Detail / Configuration
 ↓
Location Confirmation
 ↓
Live Availability + ETA
 ↓
Quote / Booking Summary
 ↓
Checkout
 ↓
Booking Confirmation
 ↓
Partner Assignment / Tracking
```

The exact number of screens may be consolidated where the existing navigation architecture allows it, but the **domain steps must exist**.

Do not create unnecessary page transitions merely for visual separation.

---

# 124. INSTANT SERVICE CATALOG PAGE

Create/reuse:

```text
InstantServicesScreen
```

Purpose:

Show services from the currently selected category that are actually eligible for instant fulfillment.

Example:

```text
Instant help

Available near you

┌─────────────────────────────┐
│ AC Repair                   │
│ From ₹___                   │
│ ~25 min                     │
│                         →   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Electrical Repair           │
│ From ₹___                   │
│ ~18 min                     │
│                         →   │
└─────────────────────────────┘
```

Do not show a service merely because:

```text
instant_enabled = true
```

It must also pass current operational availability.

---

# 125. INSTANT CATALOG API

Conceptual:

```http
GET /v1/fulfillment/instant/services
```

Request context:

```text
categoryId
customerLocation
```

Backend evaluates:

```text
service active
+
instant capability
+
serviceability
+
current partner availability
+
capacity
```

Response:

```json
{
  "mode": "INSTANT",
  "services": [
    {
      "serviceId": "...",
      "name": "AC Repair",
      "startingPrice": 499,
      "estimatedArrivalMinutes": 27,
      "availability": "AVAILABLE"
    }
  ]
}
```

The backend remains authoritative.

---

# 126. INSTANT SERVICE DETAIL

After selecting a service:

```text
InstantServicesScreen
        ↓
InstantServiceDetailScreen
```

Show:

```text
service name
description
starting/final applicable price
duration
what is included
arrival estimate
service address
mode = Instant
CTA
```

Do not calculate the final price in React Native.

---

# 127. LOCATION CONFIRMATION

Before creating an instant request:

```text
Service
 ↓
Customer address
 ↓
Serviceability
```

Reuse the existing address/location architecture.

Do not create another location subsystem.

The address must be represented by a stable:

```text
addressId
```

rather than sending arbitrary display text as the booking identity.

---

# 128. REAL INSTANT AVAILABILITY

When the customer reaches the instant booking step:

```text
service
+
address
+
mode
```

must be sent to backend.

Backend performs:

```text
1. Authenticate customer
2. Validate service
3. Validate mode
4. Resolve address
5. Check service area
6. Find eligible partners
7. Check current partner state
8. Check partner workload
9. Check capacity
10. Calculate route/ETA
11. Return current availability
```

Do not use the Hero's old ETA as booking truth.

The Hero ETA is informational.

The booking ETA must be recalculated.

---

# 129. INSTANT QUOTE

Create/reuse:

```text
QuoteService
```

Input:

```ts
interface QuoteRequest {
  customerId: string;
  serviceId: string;
  fulfillmentMode: FulfillmentMode;
  addressId: string;
  quantity?: number;
  durationMinutes?: number;
}
```

Output:

```ts
interface Quote {
  quoteId: string;
  subtotal: number;
  taxes: number;
  platformFee: number;
  travelFee?: number;
  instantFee?: number;
  discount?: number;
  total: number;
  currency: string;
  expiresAt: string;
  version: number;
}
```

The actual fields must follow the existing pricing architecture.

---

# 130. QUOTE MUST EXPIRE

A quote is not permanent.

Store:

```text
quoteId
version
createdAt
expiresAt
```

At booking confirmation:

```text
quote still valid?
```

If not:

```text
QUOTE_EXPIRED
```

and refresh.

Never trust a price calculated minutes ago by the client.

---

# 131. INSTANT BOOKING SUMMARY

Create/reuse:

```text
BookingSummaryScreen
```

Show:

```text
Selected service
Instant
Address
Estimated arrival
Service duration
Price breakdown
Applicable charges
Payment method
```

CTA:

```text
Confirm & Pay
```

The exact wording may follow the payment phase.

---

# 132. SCHEDULE FLOW

After clicking **Schedule**:

```text
Hero
 ↓
Schedule Service Catalog
 ↓
Select Service
 ↓
Service Detail / Package
 ↓
Select Duration / Quantity
 ↓
Select Date
 ↓
Select Time Slot
 ↓
Location
 ↓
Availability Revalidation
 ↓
Quote
 ↓
Checkout
 ↓
Booking Confirmation
```

Reuse the same service catalog where possible.

The difference is the fulfillment strategy.

---

# 133. SCHEDULE SERVICE CATALOG

Create/reuse:

```text
ScheduledServicesScreen
```

It should show only:

```text
scheduled_enabled = true
```

services.

Example:

```text
Schedule a service

Cleaning
Deep Home Cleaning
From ₹1499
60–180 min

AC Service
Available from tomorrow

Painting
Schedule inspection
```

Do not show instant-only services.

---

# 134. SCHEDULE SERVICE CONFIGURATION

Depending on service:

```text
duration
package
quantity
property size
service variant
```

must be selected before slot calculation whenever these affect duration/capacity.

Example:

```text
Cleaning
0.5 hr
1 hr
1.5 hr
2 hr
```

Selected duration must flow to backend.

---

# 135. DATE SELECTION

Create/reuse:

```text
ScheduleDateScreen
```

Backend determines:

```text
earliestAllowedDate
latestAllowedDate
blackout dates
working days
service-specific availability
```

The client may render a calendar, but cannot decide valid dates independently.

---

# 136. TIME SLOT SCREEN

Create/reuse:

```text
ScheduleSlotScreen
```

Request:

```json
{
  "serviceId": "...",
  "addressId": "...",
  "date": "2026-09-19",
  "durationMinutes": 60
}
```

Response:

```json
{
  "slots": [
    {
      "slotId": "...",
      "startAt": "...",
      "endAt": "...",
      "status": "AVAILABLE"
    }
  ]
}
```

---

# 137. SLOT SCREEN MUST REFRESH

When entering the screen:

```text
fetch current slots
```

When returning to it:

```text
revalidate
```

When booking:

```text
atomic reservation
```

Do not assume a previously loaded slot is still available.

---

# 138. SCHEDULE SLOT HOLD

When the customer selects a slot and proceeds toward payment:

```text
AVAILABLE
 ↓
HOLD_REQUEST
 ↓
HELD
 ↓
PAYMENT
 ↓
CONFIRMED
```

Hold must be server-created.

Client cannot mark a slot as held.

---

# 139. CHECKOUT SCREEN

Both flows converge:

```text
Instant
       \
        → Checkout
       /
Schedule
```

Create/reuse:

```text
CheckoutScreen
```

It receives a normalized:

```ts
BookingIntent
```

not separate ad-hoc payloads.

Example:

```ts
interface BookingIntent {
  serviceId: string;
  customerId: string;
  addressId: string;

  fulfillmentMode: 'INSTANT' | 'SCHEDULED';

  scheduledStartAt?: string;
  scheduledEndAt?: string;

  durationMinutes?: number;

  quoteId: string;
  idempotencyKey: string;
}
```

---

# 140. PAYMENT COMPATIBILITY

The checkout architecture must be designed now so the later payment phase can plug in cleanly.

Correct:

```text
Booking Intent
 ↓
Quote
 ↓
Hold
 ↓
Payment Order
 ↓
Payment Provider
 ↓
Webhook verification
 ↓
Booking confirmation
```

Do not build:

```text
Button clicked
 ↓
create booking = confirmed
```

---

# 141. BOOKING CONFIRMATION SCREEN

After successful confirmation:

```text
BookingConfirmedScreen
```

Display:

```text
booking reference
service
mode
date/time OR instant ETA
address
amount
payment status
partner status
```

For instant:

```text
Finding a professional
```

may be shown while assignment is pending.

For scheduled:

```text
Scheduled for
19 Sep · 10:30 AM
```

---

# 142. INSTANT PARTNER ASSIGNMENT SCREEN

Instant bookings require a live operational state.

Example:

```text
Finding a professional nearby...
```

Then:

```text
Professional assigned
ETA ~24 min
```

Then:

```text
On the way
```

This must be backed by booking/dispatch state, not a fake animation.

---

# 143. BOOKING TRACKING

Create/reuse:

```text
BookingTrackingScreen
```

State examples:

```text
SEARCHING
ASSIGNING
ASSIGNED
PARTNER_ACCEPTED
EN_ROUTE
ARRIVED
IN_PROGRESS
COMPLETED
```

For scheduled bookings:

```text
SCHEDULED
ASSIGNING
ASSIGNED
PARTNER_EN_ROUTE
ARRIVED
...
```

The UI maps backend state to presentation.

---

# 144. PARTNER APP — REAL INSTANT REQUEST

The Partner App must not be an afterthought.

Backend creates:

```text
DispatchTask
```

after an instant booking reaches the correct state.

Concept:

```text
Customer
 ↓
Booking Intent
 ↓
Quote/Hold/Payment
 ↓
Booking Confirmed
 ↓
Dispatch Task
 ↓
Candidate Partners
 ↓
Partner Offer
 ↓
Accept
 ↓
Atomic Assignment
```

---

# 145. PARTNER INSTANT REQUEST SCREEN

Partner sees:

```text
Service
Approximate customer area
Distance
ETA
Expected job duration
Partner payout / applicable earnings
Accept
Decline
```

Exact financial visibility must follow partner authorization and pricing policy.

---

# 146. PARTNER ACCEPTANCE RACE

Two partners may receive an offer.

Both tap:

```text
Accept
```

Backend must atomically assign:

```text
first valid acceptance
```

and reject the other:

```text
REQUEST_ALREADY_ASSIGNED
```

Never allow:

```text
booking → two active partners
```

unless the domain explicitly supports multi-worker jobs.

---

# 147. SCHEDULED PARTNER CALENDAR

Partner App needs:

```text
Upcoming
Today
Tomorrow
Calendar
```

Each scheduled booking includes:

```text
service
startAt
endAt
duration
address
status
```

Partner cannot accept overlapping work when the scheduling policy prohibits it.

---

# 148. PARTNER AVAILABILITY UPDATE

Partner can update:

```text
online/offline
working/away
availability
```

Backend validates whether they are actually eligible.

Partner UI state is not automatically equivalent to capacity.

---

# 149. ADMIN — FULL CONTROL

Admin must eventually control the complete lifecycle.

Required areas:

```text
Services
Categories
Fulfillment Policies
Operating Hours
Slots
Capacity
Partners
Partner Availability
Service Areas
Bookings
Dispatch
Blackouts
Pricing
Promotions
```

SERV-03 should create the domain interfaces required for these controls even if some admin screens are completed in the subsequent admin phase.

---

# 150. ADMIN SERVICE FULFILLMENT EDITOR

Example:

```text
Service: Deep Home Cleaning

Fulfillment

[✓] Instant
[✓] Scheduled

Minimum notice:
120 min

Maximum advance:
30 days

Slot interval:
30 min

Instant radius:
10 km

Operating hours:
09:00 – 20:00
```

Saving this updates backend configuration.

No mobile app rebuild.

---

# 151. ADMIN AVAILABILITY OVERRIDE

Admin must eventually be able to:

```text
temporarily disable instant
temporarily disable scheduled
block date
block slot
reduce capacity
increase capacity
disable service
```

All changes must be audited.

---

# 152. BACKEND DOMAIN MODULE STRUCTURE

Use the existing monorepo conventions, but target a structure conceptually similar to:

```text
apps/
  customer/
  partner/
  admin/
  api/

packages/
  domain/
    fulfillment/
    services/
    availability/
    capacity/
    booking/
    pricing/
    routing/
    dispatch/

  application/
    fulfillment/
    booking/

  infrastructure/
    supabase/
    routing/
    notifications/
    payments/

  shared/
    types/
    validation/
```

Do not blindly create this exact structure if the repository already has a better established architecture.

**First inspect the repository and extend existing boundaries.**

---

# 153. API LAYER

Keep:

```text
Controller / Route
        ↓
Application Service
        ↓
Domain Service
        ↓
Repository / Provider
        ↓
Database / External API
```

Do not put business logic inside route handlers.

---

# 154. DOMAIN VS INFRASTRUCTURE

Domain should know:

```text
PartnerAvailabilityProvider
RoutingProvider
CapacityProvider
```

not:

```text
SupabaseClient
GoogleMapsClient
MapboxClient
```

This makes routing and database infrastructure replaceable.

---

# 155. PROVIDER ABSTRACTIONS

Use interfaces:

```ts
interface RoutingProvider {
  getRoute(
    origin: GeoPoint,
    destination: GeoPoint
  ): Promise<RouteResult>;
}
```

Possible implementation:

```text
Open-source/free routing provider
```

or the project's current provider.

Likewise:

```ts
interface PartnerAvailabilityProvider
interface NotificationProvider
interface PaymentProvider
```

---

# 156. ROUTING REUSE

SERV-03 must reuse the existing SERV-02 routing foundation.

Do not create a second:

```text
ETA calculation
```

service.

Architecture:

```text
Fulfillment
 ↓
ETAService
 ↓
RoutingProvider
```

For now the configured fallback origin can remain:

```text
30.343866, 77.953231
```

but the API must already support:

```text
originType:
  CONFIGURED
  PARTNER
```

or equivalent future resolution.

---

# 157. ORIGIN RESOLUTION

Create/reuse:

```ts
interface OriginResolver {
  resolve(
    context: FulfillmentContext
  ): Promise<GeoPoint>;
}
```

Current:

```text
CONFIGURED_ORIGIN
→ 30.343866, 77.953231
```

Future:

```text
NEAREST_ELIGIBLE_PARTNER
→ partner.latitude/longitude
```

This prevents future rewrites.

---

# 158. LOCATION → SERVICEABILITY → AVAILABILITY

Do not mix these concepts.

```text
LOCATION
"What address?"

SERVICEABILITY
"Can Serventica serve this address?"

AVAILABILITY
"Can this service be fulfilled now/at this time?"

CAPACITY
"Do we have remaining operational capacity?"

ROUTING
"How long does travel take?"
```

These are separate domain responsibilities.

---

# 159. INSTANT AVAILABILITY PIPELINE

Exact backend pipeline:

```text
POST /fulfillment/instant/check
        ↓
Auth
        ↓
Validate request
        ↓
Load service
        ↓
Load fulfillment policy
        ↓
Resolve address
        ↓
Serviceability
        ↓
Resolve origin
        ↓
Find eligible partners
        ↓
Check partner state
        ↓
Check capacity
        ↓
Calculate route
        ↓
Calculate ETA
        ↓
Return availability
```

---

# 160. SCHEDULE AVAILABILITY PIPELINE

```text
POST /fulfillment/scheduled/slots
        ↓
Auth
        ↓
Validate service
        ↓
Load policy
        ↓
Resolve address
        ↓
Serviceability
        ↓
Validate date
        ↓
Load working hours
        ↓
Load blackouts
        ↓
Generate candidate slots
        ↓
Check partner availability
        ↓
Check capacity
        ↓
Return slots
```

---

# 161. BOOKING CREATION PIPELINE

Both modes must converge:

```text
POST /booking-intents
        ↓
Authenticate
        ↓
Validate service
        ↓
Validate address
        ↓
Validate mode
        ↓
Validate quote
        ↓
Validate availability
        ↓
Create/refresh hold
        ↓
Persist booking intent
        ↓
Return intent
```

Then:

```text
intent
 ↓
checkout
 ↓
payment
 ↓
confirm
```

---

# 162. CONFIRMATION PIPELINE

```text
Payment success / authorized confirmation
        ↓
Backend verifies payment
        ↓
Revalidate hold
        ↓
Atomic confirmation
        ↓
Booking status = CONFIRMED
        ↓
Release/convert hold
        ↓
Create dispatch task where applicable
        ↓
Notify customer
        ↓
Notify partner system
```

Payment provider webhooks, not only client callbacks, must be considered authoritative for final payment state.

---

# 163. DATABASE RELATIONSHIP

Conceptually:

```text
categories
   │
   └── services
          │
          └── fulfillment_policy

customers
   │
   └── addresses

services
   │
   └── booking_intents
          │
          ├── quote
          ├── hold
          └── booking
                  │
                  └── dispatch_task
                          │
                          └── partner
```

Availability:

```text
partner
   │
   └── partner_availability
```

Capacity is derived from:

```text
service
+
zone
+
partner
+
booking
+
operating policy
```

as appropriate for the current business model.

---

# 164. REQUIRED DATABASE INTEGRITY

At minimum protect:

```text
foreign keys
unique booking reference
unique idempotency key
hold expiry
valid status transitions
non-negative capacity
valid durations
valid policy values
```

Use indexes for:

```text
service_id
category_id
partner_id
start_at
end_at
status
address/service area
idempotency_key
```

Adapt to actual query patterns after inspecting the existing database.

---

# 165. NO UI-ONLY IMPLEMENTATION

The agent must reject its own implementation as incomplete if:

```text
button works visually
but no backend request exists
```

or:

```text
catalog renders
but availability is mocked
```

or:

```text
slot appears
but cannot be atomically reserved
```

or:

```text
booking confirms without backend validation
```

or:

```text
partner side is only placeholder UI
```

These are not acceptable completion states.

---

# 166. END-TO-END ACCEPTANCE TEST

Perform this exact test.

## Test A — Instant

```text
1. Open Customer App.
2. Select a category supporting instant.
3. Tap Instant.
4. Verify navigation to the appropriate instant flow.
5. Load real service catalog.
6. Select a service.
7. Select/confirm address.
8. Backend validates serviceability.
9. Backend calculates current availability.
10. Backend returns ETA.
11. Create quote.
12. Create booking intent.
13. Create hold where required.
14. Proceed through checkout.
15. Confirm booking using the real booking pipeline.
16. Verify booking appears in customer bookings.
17. Verify dispatch task exists when applicable.
18. Verify Partner App receives the operational request.
19. Partner accepts.
20. Verify atomic assignment.
21. Verify Customer sees assigned state.
```

## Test B — Scheduled

```text
1. Open Customer App.
2. Select a category supporting scheduled.
3. Tap Schedule.
4. Load scheduled service catalog.
5. Select service.
6. Select duration/package.
7. Select date.
8. Backend returns valid slots.
9. Select slot.
10. Backend creates/validates hold.
11. Create booking intent.
12. Proceed through checkout.
13. Confirm booking.
14. Verify booking has correct UTC start/end.
15. Verify customer local display.
16. Verify Partner App calendar.
17. Verify partner assignment/capacity.
```

---

# 167. CONCURRENCY ACCEPTANCE TEST

Create one available slot with:

```text
capacity = 1
```

Then execute:

```text
Customer A → reserve
Customer B → reserve
```

simultaneously.

Expected:

```text
A = success
B = SLOT_NO_LONGER_AVAILABLE
```

or the reverse.

Never:

```text
A = success
B = success
capacity = -1
```

---

# 168. INSTANT CONCURRENCY TEST

Create:

```text
1 available partner
```

Then:

```text
Customer A → request
Customer B → request
```

Expected:

```text
one request receives assignment
other receives updated availability/no partner
```

unless the operational model explicitly allows concurrent capacity.

---

# 169. ADMIN ACCEPTANCE TEST

Admin:

```text
Disable Instant
```

Customer:

```text
Instant → unavailable
```

Admin:

```text
Enable Instant
```

Customer:

```text
Instant → operationally available if partner/capacity exists
```

Admin:

```text
Create blackout
```

Customer:

```text
that scheduled date → unavailable
```

Admin:

```text
Change minimum notice
```

Customer:

```text
slot availability changes
```

---

# 170. STOP CONDITION

**STOP IMPLEMENTATION immediately when all requested SERV-03 requirements are implemented and verified.**

Do NOT enter an endless loop of:

```text
inspect every file
rewrite unrelated files
re-run unrelated audits
```

After implementation:

```text
1. Run targeted verification.
2. Fix failures.
3. Run final relevant tests.
4. Confirm acceptance criteria.
5. Produce final report.
6. STOP.
```

Do not refactor unrelated UI/UX or previously completed systems unless a concrete dependency requires it.

---

# 171. REQUIRED FINAL REPORT — EXTENDED

The agent must report:

## 1. What was already present

## 2. What was added

## 3. Customer screens added/modified

Exact paths.

## 4. Partner screens added/modified

Exact paths.

## 5. Admin screens added/modified

Exact paths.

## 6. Database migrations

Exact migration names.

## 7. API endpoints

Method + route + purpose.

## 8. Domain classes/services

Exact names and responsibilities.

## 9. Design patterns

Explain where:

```text
Strategy
Factory
Repository
Dependency Injection
State Machine
Provider abstraction
```

were actually used.

## 10. OOP/SOLID

Explain concrete application, not generic theory.

## 11. Instant runtime flow

Complete request/response path.

## 12. Scheduled runtime flow

Complete request/response path.

## 13. Partner flow

Complete request/response path.

## 14. Admin flow

Complete request/response path.

## 15. Concurrency protection

Exact mechanism.

## 16. Idempotency

Exact mechanism.

## 17. Security/RLS

Exact controls.

## 18. Tests

Commands + results.

## 19. Known limitations

Only genuine limitations.

## 20. Next dependency

State exactly what later phase can safely build on SERV-03.

---

# 172. SERV-03 DEFINITION OF DONE — UPDATED

SERV-03 is **NOT DONE** until all applicable items below are satisfied:

```text
[ ] Hero Instant entry works
[ ] Hero Schedule entry works
[ ] Instant catalog works
[ ] Scheduled catalog works
[ ] Service selection works
[ ] Service configuration works
[ ] Address selection works
[ ] Serviceability is real
[ ] Instant availability is real
[ ] Instant ETA is real
[ ] Scheduled date availability is real
[ ] Scheduled slot generation is real
[ ] Capacity validation is real
[ ] Race conditions are protected
[ ] Quote is backend generated
[ ] Quote expiry is handled
[ ] Booking intent exists
[ ] Idempotency exists
[ ] Hold exists where required
[ ] Hold expiry exists
[ ] Checkout contract is ready
[ ] Booking confirmation is backend-authoritative
[ ] Customer booking state is visible
[ ] Instant dispatch contract exists
[ ] Partner instant request works
[ ] Partner acceptance is atomic
[ ] Scheduled partner calendar/assignment contract exists
[ ] Admin policy controls are implemented or explicitly integrated into the existing admin module
[ ] Admin changes affect backend behavior
[ ] RLS/security verified
[ ] Unit tests pass
[ ] Integration tests pass
[ ] concurrency tests pass
[ ] E2E customer tests pass
[ ] E2E partner tests pass
[ ] E2E admin tests pass where implemented
[ ] typecheck passes
[ ] lint passes
[ ] production build passes
[ ] no fake availability remains
[ ] no fake booking confirmation remains
[ ] no hardcoded slot truth remains
[ ] no duplicate routing/ETA subsystem exists
```

---

# 173. FINAL PRINCIPLE — THIS IS A FULFILLMENT SYSTEM, NOT A HERO COMPONENT

The correct mental model is:

```text
             HERO
              │
       ┌──────┴──────┐
       ▼             ▼
    INSTANT       SCHEDULE
       │             │
       ▼             ▼
    CATALOG        CATALOG
       │             │
       ▼             ▼
 SERVICE CONFIG   SERVICE CONFIG
       │             │
       ▼             ▼
 AVAILABILITY      DATE/SLOTS
       │             │
       └──────┬──────┘
              ▼
          BOOKING INTENT
              │
             QUOTE
              │
             HOLD
              │
           CHECKOUT
              │
           PAYMENT
              │
           BOOKING
              │
          DISPATCH
              │
           PARTNER
              │
           SERVICE
              │
          TRACKING
```

The Hero buttons are merely the **first user interaction**.

The real implementation is the complete domain pipeline behind them.

Build the backend and domain contracts first-class so the Customer App, Partner App, Admin Dashboard, future Payment system, future Dispatch system, and future pricing system all operate on the same authoritative data model.

# END OF CORRECTION / SERV-03 V2

# 174. CRITICAL HOTFIX — INSTANT / SCHEDULE BUTTONS MUST BE REAL FUNCTIONAL ENTRY POINTS

The Hero currently contains two controls:

```text
INSTANT   → Get instant service
SCHEDULE  → Pick your time
```

They are NOT decorative CTAs and they are NOT complete merely because `onPress` navigates to another screen. Implement them as real production entry points into the SERV-03 fulfillment domain.

The complete requirement is:

```text
HOME / ACTIVE CATEGORY
        │
        ├───────────────┐
        ▼               ▼
     INSTANT         SCHEDULE
        │               │
        ▼               ▼
 Instant Catalog    Schedule Catalog
        │               │
        ▼               ▼
 Service Config     Service Config
        │               │
        ▼               ▼
 Serviceability     Date + Slot Engine
        │               │
        ▼               ▼
 Live Availability  Capacity Validation
        │               │
        └───────┬───────┘
                ▼
          Booking Intent
                ▼
              Quote
                ▼
               Hold
                ▼
             Checkout
                ▼
             Payment
                ▼
             Booking
                ▼
            Dispatch
                ▼
             Partner
                ▼
            Fulfillment
```

Do NOT implement fake catalogs, fake ETA, fake slots, fake partner assignment, or fake booking success.

---

# 175. FULFILLMENT MODE IS A DOMAIN CONCEPT

Create/reuse:

```ts
enum FulfillmentMode {
  INSTANT = 'INSTANT',
  SCHEDULED = 'SCHEDULED',
}
```

The two buttons map to these domain values. Do not pass arbitrary strings throughout the application.

---

# 176. ACTIVE CATEGORY MUST FLOW INTO THE BUTTON

The currently selected Hero category is the context for both buttons.

Example:

```text
Cleaning + Instant
→ only cleaning services eligible for Instant

Cleaning + Schedule
→ only cleaning services eligible for Scheduled

AC & Appliances + Instant
→ AC/appliance services eligible for Instant
```

Do not create a second category state inside the button components.

Conceptual context:

```ts
interface FulfillmentContext {
  mode: FulfillmentMode;
  categoryId: string;
  customerId: string;
  addressId?: string;
  serviceId?: string;
}
```

---

# 177. INSTANT BUTTON — REQUIRED REAL FLOW

On tap:

```text
Tap
 ↓
Immediate pressed feedback
 ↓
Prevent duplicate taps
 ↓
Read active category
 ↓
Create fulfillment intent
 ↓
Ensure authenticated customer where required
 ↓
Resolve current address
 ↓
Check serviceability
 ↓
Fetch Instant-eligible services
 ↓
Check current availability
 ↓
Open Instant Service Catalog
```

The Home screen must remain responsive while asynchronous work happens.

If there is no partner/capacity:

```text
NO_INSTANT_AVAILABILITY
```

must be returned. Never manufacture an ETA or booking.

---

# 178. SCHEDULE BUTTON — REQUIRED REAL FLOW

On tap:

```text
Tap
 ↓
Immediate feedback
 ↓
Prevent duplicate taps
 ↓
Read active category
 ↓
Create fulfillment intent
 ↓
Resolve address
 ↓
Check serviceability
 ↓
Fetch Scheduled-eligible services
 ↓
Open Schedule Service Catalog / configuration
```

Then:

```text
Service
 ↓
Variant / package / duration / quantity
 ↓
Date
 ↓
Backend-generated slots
 ↓
Slot validation
 ↓
Hold
 ↓
Quote
 ↓
Checkout
 ↓
Payment
 ↓
Booking
```

---

# 179. DO NOT PUT BUSINESS LOGIC IN THE BUTTON

Bad:

```text
InstantButton
 ↓
fetch services
 ↓
fetch partners
 ↓
calculate ETA
 ↓
calculate price
```

Correct:

```text
InstantButton
 ↓
FulfillmentFlowCoordinator.start(INSTANT, categoryId)
 ↓
Application Service
 ↓
Backend/domain workflow
```

The React Native component remains a thin presentation component.

---

# 180. FULFILLMENT FLOW COORDINATOR

Create/reuse an application-level coordinator such as:

```ts
interface FulfillmentFlowCoordinator {
  startInstant(categoryId: string): Promise<StartFulfillmentResult>;
  startScheduled(categoryId: string): Promise<StartFulfillmentResult>;
}
```

It coordinates the initial flow and returns a typed next step.

Example:

```ts
interface StartFulfillmentResult {
  status: 'READY' | 'REQUIRES_ADDRESS' | 'UNAVAILABLE' | 'ERROR';
  nextStep:
    | 'SERVICE_SELECTION'
    | 'ADDRESS'
    | 'SCHEDULE'
    | 'UNAVAILABLE';
  contextId?: string;
}
```

Navigation consumes this result; it does not invent business decisions.

---

# 181. STRATEGY PATTERN

Use/reuse:

```text
FulfillmentStrategy
 ├── InstantFulfillmentStrategy
 └── ScheduledFulfillmentStrategy
```

Instant evaluates:

```text
service active
+ instant enabled
+ serviceable address
+ eligible partner
+ partner skill
+ current capacity
+ operational policy
```

Scheduled evaluates:

```text
service active
+ scheduled enabled
+ serviceable address
+ operating hours
+ date rules
+ blackouts
+ partner capacity
+ slot availability
```

This prevents duplicated booking logic.

---

# 182. CUSTOMER SCREENS AFTER THE BUTTONS

Inspect existing navigation and reuse existing screens where they already provide the required responsibility. Do not create duplicate navigation containers.

Required conceptual screens:

```text
InstantServicesScreen
InstantServiceDetailScreen
ScheduledServicesScreen
ServiceConfigurationScreen
ScheduleDateTimeScreen
BookingSummaryScreen
CheckoutScreen
BookingConfirmationScreen
BookingTrackingScreen
```

A bottom sheet may be used for lightweight selection, while complex configuration can be a full screen. The domain flow must remain the same.

---

# 183. INSTANT SERVICE CATALOG

The catalog must be real data from the backend.

Example:

```text
Cleaning

Home Deep Cleaning       From ₹___    ~25 min
Bathroom Cleaning       From ₹___    ~20 min
Sofa Cleaning           From ₹___    ~30 min
```

Only services satisfying current policy and availability should be presented as available.

Do not merely fetch all services and hide invalid ones in the client.

---

# 184. SERVICE-SPECIFIC BEHAVIOR

The architecture must support different service configuration requirements.

Examples:

```text
Cleaning
→ property type / size / package / duration

AC & Appliances
→ appliance type / issue / quantity

Electrical
→ issue type / quantity

Plumbing
→ issue / fixture / quantity

Painting
→ rooms / area / inspection requirement

Gardening
→ garden area / visit type / maintenance requirements

Pest Control
→ property type / infestation type

Home Decor
→ occasion / date / setup requirements
```

Do not assume every service uses the same form.

Use a reusable metadata/schema-driven service configuration model where appropriate.

---

# 185. SERVICE CONFIGURATION SCHEMA

Conceptually:

```ts
interface ServiceConfigurationSchema {
  serviceId: string;
  fields: ServiceField[];
}
```

The client renders the appropriate fields, but the backend validates the submitted configuration.

Never trust client-supplied pricing, duration, partner IDs, capacity, or availability.

---

# 186. REAL SERVICEABILITY

Before showing an Instant/Scheduled flow as available:

```text
customer address
 ↓
service area lookup
 ↓
service/category policy
 ↓
serviceable = true/false
```

If not serviceable:

```text
This service isn't available at this location yet.

[Change location]
```

Preserve the active category and mode where possible.

---

# 187. INSTANT PARTNER ELIGIBILITY

Do not assign the nearest arbitrary partner.

Candidate pipeline:

```text
active
 ↓
verified
 ↓
available/online
 ↓
required skill match
 ↓
service area match
 ↓
no conflicting work
 ↓
capacity available
 ↓
geographic filter
 ↓
route/ETA calculation for bounded candidates
 ↓
matching/ranking policy
```

Reuse SERV-02 routing/ETA infrastructure.

Current configured fallback origin remains:

```text
30.343866, 77.953231
```

Future partner-origin resolution must be supported through an `OriginResolver`, rather than rewriting the ETA system.

---

# 188. INSTANT AVAILABILITY API

Create/reuse an endpoint equivalent to:

```http
POST /v1/fulfillment/instant/check
```

Input:

```json
{
  "categoryId": "...",
  "serviceId": "...",
  "addressId": "..."
}
```

Backend pipeline:

```text
Auth
 ↓
Validate request
 ↓
Load service
 ↓
Load fulfillment policy
 ↓
Resolve address
 ↓
Serviceability
 ↓
Resolve origin
 ↓
Find eligible partners
 ↓
Check partner state
 ↓
Check skills
 ↓
Check workload/capacity
 ↓
Calculate ETA
 ↓
Return authoritative result
```

---

# 189. SCHEDULE SLOT ALGORITHM

Generate candidate slots from:

```text
operating hours
+ slot interval
+ service duration
+ minimum notice
+ maximum advance
+ blackouts
+ partner availability
+ existing bookings
+ capacity
```

Example:

```text
09:00–18:00
60-minute service
30-minute slot interval
```

Candidate intervals are generated, then invalid intervals are removed.

Do not hardcode:

```text
8:00
8:30
9:00
```

as universal availability.

---

# 190. SLOT HOLD

Selecting a slot must cause a backend reservation/hold where required:

```text
AVAILABLE
 ↓
HELD
 ↓
PAYMENT
 ↓
CONFIRMED
```

Hold must contain:

```text
holdId
expiresAt
booking/intent reference
capacity/slot reference
```

On expiry:

```text
HELD → EXPIRED → capacity released
```

---

# 191. QUOTE AND BOOKING

Both modes converge on the same booking infrastructure:

```text
Fulfillment Intent
 ↓
Quote
 ↓
Hold
 ↓
Checkout
 ↓
Payment
 ↓
Booking Confirmation
```

Quote must be backend authoritative and have an expiry/version.

The client must never be able to alter:

```text
subtotal
fees
taxes
partner payout
final total
```

---

# 192. BOOKING STATE MACHINE

Use explicit legal transitions:

```text
DRAFT
 ↓
QUOTE_CREATED
 ↓
HOLD
 ↓
PAYMENT_PENDING
 ↓
CONFIRMED
 ↓
DISPATCHING
 ↓
ASSIGNED
 ↓
PARTNER_EN_ROUTE
 ↓
ARRIVED
 ↓
IN_PROGRESS
 ↓
COMPLETED
```

Failure/cancellation states should include appropriate equivalents such as:

```text
PAYMENT_FAILED
CANCELLED
EXPIRED
UNFULFILLABLE
```

Reject illegal transitions server-side.

---

# 193. PARTNER APP — INSTANT

After confirmation, create a real dispatch task when the service requires partner dispatch:

```text
Booking
 ↓
DispatchTask
 ↓
Eligible partners
 ↓
Partner offer
 ↓
Accept/Decline
 ↓
Atomic assignment
```

Partner sees appropriate operational information such as:

```text
service
approximate location
travel distance/ETA
job duration
applicable earnings
Accept
Decline
```

Do not expose customer information beyond authorization/business requirements.

---

# 194. PARTNER ACCEPTANCE RACE CONDITION

If two partners accept simultaneously:

```text
Partner A → Accept
Partner B → Accept
```

only one may win the atomic assignment unless the service explicitly supports multiple workers.

The other receives:

```text
REQUEST_ALREADY_ASSIGNED
```

Never allow accidental double assignment.

---

# 195. PARTNER APP — SCHEDULED

Scheduled bookings must integrate with partner availability/calendar:

```text
Today
Upcoming
Calendar
```

The backend must prevent overlapping assignments where policy prohibits them.

Customer scheduling and partner availability must use the same authoritative booking/capacity model.

---

# 196. ADMIN COMPATIBILITY

The feature must be controllable later through the Admin Dashboard without rebuilding the mobile app for data/policy changes.

Admin policy should eventually control:

```text
Instant enabled/disabled
Scheduled enabled/disabled
minimum notice
maximum advance
operating hours
blackouts
instant radius
slot interval
capacity
service activation
```

Mobile code must consume policy rather than hardcode these values.

---

# 197. DATABASE REQUIREMENTS

Inspect the existing schema first. Extend it instead of creating duplicate tables.

Where missing, support concepts equivalent to:

```text
services
service_categories
service_variants
service_skills
fulfillment_policies
partner_skills
partner_availability
booking_intents
quotes
holds
bookings
dispatch_tasks
```

Use foreign keys, indexes, unique constraints, timestamps, and appropriate status constraints.

Important indexes should reflect actual queries, especially:

```text
category_id
service_id
partner_id
status
start_at
end_at
idempotency_key
service area / geographic fields
```

---

# 198. TRANSACTION SAFETY

Critical mutations must be atomic:

```text
slot hold
partner assignment
capacity reservation
booking confirmation
```

Never use unsafe:

```text
SELECT availability
→ application waits
→ UPDATE availability
```

without concurrency protection.

Use PostgreSQL transactions/locking/database functions or equivalent safe mechanisms appropriate to the existing Supabase architecture.

---

# 199. IDEMPOTENCY

Critical POST operations must support idempotency where appropriate.

Example:

```http
Idempotency-Key: <UUID>
```

If the same request is retried because of a network timeout, return the existing operation/result instead of creating a duplicate booking.

Frontend duplicate-tap protection and backend idempotency are both required.

---

# 200. NETWORK / FAILURE BEHAVIOR

Safe reads can retry where appropriate:

```text
catalog
availability
slots
booking status
```

Do not blindly retry:

```text
booking creation
payment
confirmation
```

unless the request is idempotent.

If confirmation times out, query authoritative payment/booking status before telling the user that the booking failed.

---

# 201. NO AVAILABILITY FALLBACKS

Instant:

```text
No professionals are available right now.

[Schedule for later]
[Try another service]
```

Schedule:

```text
No slots available for this date.

[Choose another date]
```

Do not send the user unnecessarily back to Home and lose the current context.

---

# 202. AUTHENTICATION RESUME

If authentication is required:

```text
Tap Instant
 ↓
Login
 ↓
Return to original Instant context
```

Preserve:

```text
categoryId
mode
service selection where valid
```

Do not make the customer restart the entire flow.

---

# 203. APP BACKGROUND / RESTART

Persist only safe local flow state.

When returning after a potentially long background period:

```text
revalidate availability
revalidate slot
revalidate quote
revalidate hold
```

Never trust stale availability as final booking truth.

---

# 204. PERFORMANCE

The tap must provide immediate local feedback. Network/domain work must be asynchronous and must not block the React Native UI thread.

Use:

```text
small local loading state
bounded queries
indexed database queries
short-lived availability cache
service metadata cache
parallel independent reads
```

Do not route thousands of partners. First geographically bound/filter candidates, then calculate detailed route/ETA for a small candidate set.

Never block the Hero render while availability is being evaluated.

---

# 205. OBSERVABILITY

Add request correlation and useful events:

```text
fulfillment_flow_started
fulfillment_flow_failed
instant_availability_checked
scheduled_slots_requested
slot_held
quote_created
booking_intent_created
booking_confirmed
dispatch_created
partner_assigned
```

Track IDs such as:

```text
requestId
categoryId
serviceId
mode
bookingId
```

Do not log unnecessary sensitive customer information.

---

# 206. TEST MATRIX — BOTH BUTTONS

For representative categories:

```text
AC & Appliances
Cleaning
Electrical
Plumbing
Painting
Pest Control
Gardening
Home Decor
```

Test both:

```text
Instant
Scheduled
```

For each verify:

```text
[ ] physical touch works
[ ] correct category is passed
[ ] correct mode is passed
[ ] no duplicate requests
[ ] correct catalog loads
[ ] serviceability works
[ ] service-specific configuration works
[ ] availability/slots are backend-derived
[ ] quote works
[ ] booking intent works
[ ] hold works where applicable
[ ] checkout is reachable
[ ] booking confirmation works
[ ] correct partner workflow is created
[ ] errors are handled
```

---

# 207. CONCURRENCY TESTS

### Slot test

Capacity = 1.

Two customers attempt the same slot simultaneously.

Expected:

```text
one succeeds
one receives SLOT_NO_LONGER_AVAILABLE
```

Never:

```text
both succeed
capacity = -1
```

### Partner test

One partner receives the same eligible instant request and two competing acceptance requests are simulated.

Expected:

```text
one assignment
one rejected/stale response
```

---

# 208. BUTTON HIT-TEST / UI INTEGRATION

Because the current Hero also contains the location, search and horizontal category strip, verify touch boundaries.

The Instant/Schedule controls must not be blocked by another transparent/absolute layer.

Check:

```text
zIndex
elevation
pointerEvents
absolute positioning
gesture responder boundaries
```

But do not redesign the completed Hero UI. Fix only the interaction boundary required for functionality.

---

# 209. DO NOT CREATE DUPLICATE SYSTEMS

Before implementation inspect:

```text
existing navigation
existing booking flow
existing service catalog
existing serviceability
SERV-02 routing/ETA
existing Supabase schema
existing customer state
existing partner state
existing admin modules
```

Reuse existing implementations wherever their responsibility matches.

Do not create:

```text
second ETA engine
second location system
second booking model
second navigation container
second partner matching system
```

---

# 210. DEFINITION OF DONE FOR THESE BUTTONS

The two buttons are complete only when:

```text
[ ] Instant physically receives touch
[ ] Schedule physically receives touch
[ ] active category is passed
[ ] mode is typed
[ ] loading state works
[ ] duplicate taps are prevented
[ ] authentication is handled
[ ] location is handled
[ ] serviceability is real
[ ] catalog is real
[ ] service-specific configuration works
[ ] Instant partner availability is real
[ ] partner skill matching is respected
[ ] capacity is respected
[ ] ETA uses SERV-02 routing foundation
[ ] Scheduled slots are generated by backend rules
[ ] duration affects slots
[ ] operating hours are respected
[ ] blackout dates are respected
[ ] minimum notice is respected
[ ] maximum advance is respected
[ ] slot hold is real
[ ] quote is backend authoritative
[ ] booking intent is real
[ ] idempotency exists
[ ] checkout integration point works
[ ] booking confirmation is backend-authoritative
[ ] dispatch task is created where applicable
[ ] Partner App can consume the request
[ ] partner acceptance is atomic
[ ] customer booking status updates
[ ] failure states are meaningful
[ ] no fake ETA/slot/partner/booking remains
[ ] tests pass
[ ] production build passes
```

---

# 211. FINAL IMPLEMENTATION REPORT

When finished, report exactly:

```text
1. Root cause of why Instant/Schedule was not working
2. Customer files created/changed
3. Partner files created/changed
4. Backend files created/changed
5. Database migrations
6. API endpoints
7. Domain/application services
8. Navigation changes
9. Instant flow
10. Scheduled flow
11. Service-specific logic
12. Partner matching logic
13. Capacity algorithm
14. Slot algorithm
15. ETA integration
16. Idempotency mechanism
17. Concurrency protection
18. Error handling
19. Admin integration points
20. Tests performed + results
21. Known genuine limitations
22. Next phase dependency
```

Do not report generic statements such as “implemented successfully” without evidence.

---

# 212. STOP CONDITION — NO ENDLESS AGENT LOOP

After the feature is implemented:

```text
1. Run targeted tests.
2. Fix failures.
3. Re-run the affected tests.
4. Verify the complete Instant flow.
5. Verify the complete Scheduled flow.
6. Verify representative customer + partner paths.
7. Produce the final report.
8. STOP.
```

Do NOT repeatedly inspect and rewrite unrelated files after the acceptance criteria pass.

Do NOT reopen the completed Hero UI/UX work.

Do NOT redesign the app.

Do NOT continue indefinitely looking for theoretical improvements.

---

# 213. PRODUCT PRINCIPLE

The Hero controls are a **fulfillment launcher**, not two navigation buttons.

```text
                  HERO
                   │
          ACTIVE CATEGORY
                   │
          ┌────────┴────────┐
          ▼                 ▼
       INSTANT           SCHEDULE
          │                 │
          ▼                 ▼
     SERVICE CATALOG    SERVICE CATALOG
          │                 │
          ▼                 ▼
       CONFIG            DATE / SLOT
          │                 │
          ▼                 ▼
    AVAILABILITY        CAPACITY
          │                 │
          └────────┬────────┘
                   ▼
             BOOKING INTENT
                   ▼
                 QUOTE
                   ▼
                  HOLD
                   ▼
               CHECKOUT
                   ▼
                PAYMENT
                   ▼
                BOOKING
                   ▼
              DISPATCH
                   ▼
                PARTNER
                   ▼
              FULFILLMENT
                   ▼
                TRACKING
```

**Never mark SERV-03 complete merely because tapping the buttons changes screens. The feature is complete only when the business workflow behind the buttons is real, backend-authoritative, concurrency-safe, reusable across services/categories, integrated with the Partner App, compatible with Admin control, and tested end-to-end.**

# END OF SERV-03 BUTTON FUNCTIONALITY HOTFIX
