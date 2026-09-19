# Serventica — Complete V1 Production Roadmap

## 0. Purpose

This roadmap defines the implementation order for the Serventica V1 customer + partner service marketplace.

**Primary objective:** build a real, testable operational system first. UI polish is secondary until the underlying authentication, authorization, order, payment, dispatch, partner, and realtime flows are correct.

**V1 principle:** implement only the features required to make the complete service-booking loop work reliably. Avoid premature analytics, wallets, advanced payouts, complex promotions, or unnecessary abstractions.

---

# 1. Target V1 Architecture

```text
                    ┌─────────────────────┐
                    │   Customer App      │
                    │ React Native        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Supabase Auth       │
                    │ Phone OTP           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Supabase PostgreSQL  │
                    │ RLS + Transactions   │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             ▼                 ▼                  ▼
      Edge Functions       Razorpay TEST       Realtime
             │                 │                  │
             ▼                 ▼                  ▼
       Order Backend       Payment Verify     Status/Tracking
             │
             ▼
       Dispatch Engine
             │
             ▼
                    ┌─────────────────────┐
                    │   Partner App       │
                    │ React Native       │
                    └─────────────────────┘
```

### Core stack

- React Native
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase Edge Functions
- Supabase Realtime
- Razorpay for V1 payment
- Push notification provider appropriate for the mobile platform
- Server-side business logic for all trusted operations

---

# 2. Development Order

Do not build phases out of order.

```text
PHASE 01  Authentication
    ↓
PHASE 02  Authorization + Profiles + Security
    ↓
PHASE 03  Catalog + Service Selection
    ↓
PHASE 04  Address + Serviceability
    ↓
PHASE 05  Order Creation
    ↓
PHASE 06  Razorpay TEST Payment
    ↓
PHASE 07  Order State Machine
    ↓
PHASE 08  Dispatch / Partner Search
    ↓
PHASE 09  Partner App
    ↓
PHASE 10  Partner Accept / Reject
    ↓
PHASE 11  Realtime Order Tracking
    ↓
PHASE 12  Notifications
    ↓
PHASE 13  Cancellation / Failure / Recovery
    ↓
PHASE 14  End-to-End Hardening
    ↓
PHASE 15  Production Readiness
```

---

# 3. PHASE 01 — Phone OTP Authentication

## Objective

Implement real phone-number authentication using Supabase Auth.

Do NOT create a custom OTP database or custom OTP verification mechanism.

### Flow

```text
Enter phone number
        ↓
Normalize phone number
        ↓
Request OTP
        ↓
Supabase Auth
        ↓
SMS provider
        ↓
Enter OTP
        ↓
Verify OTP
        ↓
Supabase session
        ↓
Load/create profile
        ↓
Customer application
```

## Requirements

- Phone number normalization
- Country code handling
- OTP expiry
- Resend cooldown
- Rate limiting
- Invalid OTP handling
- Expired OTP handling
- Excessive attempts handling
- Duplicate OTP request protection
- Session persistence
- Session refresh
- Secure logout
- App restart session restoration
- Auth listener
- Network failure recovery

## Startup flow

```text
APP_START
   ↓
Restore Supabase session
   ↓
Session valid?
   ├── YES → Load profile → Customer Home
   └── NO  → Login
```

Do not use timers or local flags as proof of authentication.

## Authentication tests

- Fresh install
- Valid phone
- Invalid phone
- Wrong OTP
- Expired OTP
- Resend OTP
- Rapid resend attempts
- Multiple OTP requests
- Network loss during OTP request
- Network loss during verification
- App killed during OTP
- App restarted after successful login
- Logout
- App killed after logout
- App reopened after logout
- Session refresh
- Invalid/expired session

---

# 4. PHASE 02 — Authorization, Profiles and RLS

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

## Profile model

```text
profiles
--------
id
user_id
role
full_name
phone
email
avatar_url
status
created_at
updated_at
last_login_at
```

Initial role:

```text
CUSTOMER
```

Future roles:

```text
PARTNER
ADMIN
SUPPORT
```

## Rules

- `profiles.user_id` must map to `auth.users.id`
- One profile per auth user
- Customer cannot assign their own role
- Customer cannot modify trusted fields
- Customer can only access their own profile
- Customer can only access their own orders
- Customer cannot modify payment status
- Customer cannot modify order status
- Customer cannot assign a partner
- Customer cannot modify authoritative price

## RLS

Every customer-owned table must use policies based on:

```sql
auth.uid()
```

Never trust:

```text
customer_id
user_id
role
price
payment_status
order_status
```

when supplied by the mobile client.

---

# 5. PHASE 03 — Service Catalog

Use a clean hierarchy:

```text
categories
    ↓
services
    ↓
service_variants
```

Example:

```text
Category:
AC Services

Service:
AC Repair

Variant:
Split AC General Repair
```

## Catalog requirements

- Active/inactive services
- Service category
- Service description
- Service image
- Base price
- Variant price
- Duration
- Required skill/category
- Required equipment
- Service availability
- Service area
- Minimum booking constraints

## Important rule

The client may request:

```text
service_id
variant_id
```

The client must NOT be trusted for:

```text
final_price
discount
tax
partner_payout
platform_fee
```

The backend calculates authoritative amounts.

---

# 6. PHASE 04 — Address and Serviceability

Customer must be able to select/store a service address.

## Address model

```text
customer_addresses
------------------
id
customer_id
label
address_line
landmark
city
state
postal_code
latitude
longitude
is_default
created_at
updated_at
```

## Requirements

- Add address
- Edit address
- Delete address
- Set default
- Select address for order
- Validate coordinates
- Validate serviceability
- Prevent unsupported locations

## V1 serviceability

Keep it controllable from the backend/admin.

Example:

```text
Region
    ↓
Serviceable pincodes / areas
    ↓
Available services
```

Do not hardcode serviceability permanently inside the mobile app.

---

# 7. PHASE 05 — Order Creation

## Initial request

Customer submits:

```text
service_id
variant_id
address_id
requested_date
requested_time_slot
notes
idempotency_key
```

## Backend responsibilities

1. Authenticate user
2. Validate service
3. Validate variant
4. Validate address ownership
5. Validate serviceability
6. Validate requested date/time
7. Check availability
8. Calculate authoritative price
9. Create order
10. Create payment record
11. Return payment initiation data

## Order structure

```text
orders
------
id
customer_id
service_id
variant_id
address_id
scheduled_date
scheduled_start
scheduled_end
status
subtotal
tax
discount
total
currency
notes
partner_id
created_at
updated_at
```

## Idempotency

Duplicate taps must not create duplicate orders.

The request should contain an idempotency key.

Backend must guarantee:

```text
same customer + same idempotency key
        ↓
same logical operation
        ↓
no duplicate order
```

---

# 8. PHASE 06 — Razorpay TEST Payment

V1 uses Razorpay only.

Do not add Juspay/Cashfree at this stage.

Keep a provider abstraction so another provider can be added later.

```text
PaymentProvider
      ↓
RazorpayPaymentProvider
```

## Payment flow

```text
Customer
   ↓
Create Order Request
   ↓
Backend calculates amount
   ↓
Create internal payment
   ↓
Create Razorpay order
   ↓
Return checkout data
   ↓
Razorpay Checkout
   ↓
Customer pays
   ↓
Client callback
   ↓
Backend verification
   ↓
Razorpay webhook
   ↓
Payment SUCCESS
   ↓
Order CONFIRMED
```

## Critical rule

The mobile callback is NOT authoritative.

The backend must verify:

- Razorpay order ID
- Razorpay payment ID
- signature
- amount
- currency
- internal order/payment relationship

## Payment states

```text
CREATED
ORDER_CREATED
CHECKOUT_STARTED
PENDING
AUTHORIZED
CAPTURED
SUCCESS
FAILED
CANCELLED
EXPIRED
UNKNOWN
REFUND_PENDING
REFUNDED
PARTIALLY_REFUNDED
RECONCILIATION_REQUIRED
```

## Tables

```text
payments
payment_attempts
payment_events
payment_refunds
payment_idempotency_keys
audit_logs
outbox_events
```

## Never store

- Card number
- CVV
- UPI PIN
- Raw payment credentials

## Webhook requirements

- Verify webhook signature
- Store event ID
- Reject duplicate event
- Process idempotently
- Handle webhook arriving before app callback
- Handle callback arriving before webhook
- Handle both simultaneously
- Handle app killed after payment
- Handle network loss after payment
- Reconcile unknown payment states

## V1 payment methods

- UPI
- Cards
- Cash/pay-after-service only if explicitly enabled

For UPI, use the official Razorpay-supported flow. Do not fake installed apps or payment success.

---

# 9. PHASE 07 — Order State Machine

Keep V1 states understandable.

## Main flow

```text
DRAFT
  ↓
PAYMENT_PENDING
  ↓
CONFIRMED
  ↓
PARTNER_SEARCHING
  ↓
PARTNER_ASSIGNED
  ↓
PARTNER_EN_ROUTE
  ↓
SERVICE_STARTED
  ↓
SERVICE_COMPLETED
```

## Failure branches

```text
PAYMENT_FAILED
CANCELLED
EXPIRED
```

## State transition rules

Every transition must be validated server-side.

Example:

```text
PAYMENT_PENDING → CONFIRMED
```

is valid only after verified payment.

```text
CONFIRMED → PARTNER_SEARCHING
```

is generated by trusted backend logic.

The customer must never be able to directly set:

```text
status = CONFIRMED
status = COMPLETED
status = PARTNER_ASSIGNED
```

---

# 10. PHASE 08 — Dispatch / Partner Search

Only start partner search after:

```text
ORDER_CONFIRMED
```

## Flow

```text
ORDER_CONFIRMED
        ↓
PARTNER_SEARCHING
        ↓
Find eligible partners
        ↓
Rank candidates
        ↓
Create offer
        ↓
Partner accepts/rejects
```

## V1 eligibility

Partner must:

1. Have required category/service skill
2. Be active
3. Be online/available
4. Be available for requested time
5. Be inside service area
6. Have no conflicting booking
7. Be operationally eligible

Then rank by operational factors such as:

- travel distance/time
- availability
- service compatibility
- current workload

Start simple. Add advanced scoring later.

---

# 11. PHASE 09 — Partner App

Create the partner application only after the customer flow is working.

## Partner authentication

Use the same identity architecture, but role-gate access.

```text
Partner phone
    ↓
OTP
    ↓
Session
    ↓
Profile
    ↓
PARTNER role
    ↓
Partner application
```

## Minimum partner features

### Dashboard

Show:

- online/offline status
- current available jobs
- active job
- basic profile

### Job offer

Partner sees:

- service
- customer area/address details required for operation
- scheduled time
- estimated amount/fare
- service requirements
- equipment requirements
- order details
- accept
- reject

### Active order

Show:

- customer information required for service
- service details
- destination
- navigation
- status controls

Minimum state actions:

```text
ACCEPT
↓
EN_ROUTE
↓
ARRIVED
↓
START_SERVICE
↓
COMPLETE
```

---

# 12. PHASE 10 — Partner Accept / Reject

## Acceptance

Acceptance must be atomic.

```text
Offer available?
    ↓
YES
    ↓
Transaction / conditional update
    ↓
Assign partner
    ↓
Order = PARTNER_ASSIGNED
```

Two partners must not be able to accept the same order.

Use a database constraint/transaction/conditional update to guarantee this.

## Rejection policy

V1:

```text
1st rejection → allowed
2nd rejection → allowed
3rd rejection → configurable operational penalty
```

But distinguish:

```text
REJECTED
EXPIRED
UNAVAILABLE
TIMEOUT
SYSTEM_FAILURE
```

Do not penalize every non-acceptance as a rejection.

Penalty rules should be backend-controlled and configurable.

---

# 13. PHASE 11 — Realtime Order Tracking

Once partner accepts:

```text
PARTNER_ASSIGNED
        ↓
Customer receives update
        ↓
Partner EN_ROUTE
        ↓
Partner location/status updates
        ↓
ARRIVED
        ↓
SERVICE_STARTED
        ↓
SERVICE_COMPLETED
```

## Realtime requirements

Use Supabase Realtime and/or appropriate push notification infrastructure.

Do not depend on manual refresh.

Customer should receive:

- partner assigned
- partner status
- partner location when applicable
- order status
- relevant service information

Partner should receive:

- order updates
- customer/location information needed for service
- cancellation changes
- schedule changes

---

# 14. PHASE 12 — Notifications

Notification events should be generated from trusted backend events.

Examples:

```text
OTP requested
Payment successful
Order confirmed
Partner searching
Partner assigned
Partner en route
Partner arrived
Service started
Service completed
Order cancelled
Payment failed
```

Do not put notification business logic directly inside random UI components.

Use an event/outbox pattern where appropriate.

---

# 15. PHASE 13 — Cancellation and Failure Recovery

Every real marketplace needs failure paths.

## Customer cancellation

Define rules for:

- before payment
- after payment
- before partner assignment
- after partner assignment
- partner en route
- service started

Do not implement arbitrary client-side cancellation.

Backend decides whether cancellation is allowed.

## Partner cancellation

Handle:

```text
partner rejects
partner becomes unavailable
partner cancels
partner times out
partner loses connection
```

Then:

```text
current offer invalid
        ↓
find next eligible partner
        ↓
dispatch again
```

## No partner available

```text
PARTNER_SEARCHING
        ↓
No eligible partner
        ↓
retry policy
        ↓
still unavailable
        ↓
order marked accordingly
        ↓
customer notified
        ↓
refund/cancellation handling if required
```

---

# 16. PHASE 14 — Security Hardening

## Authentication security

- Supabase Auth
- Secure session storage
- Token refresh
- Logout invalidation
- Rate limiting
- OTP abuse protection

## Database security

RLS on all customer/partner-owned data.

Never trust:

```text
role
price
payment status
order status
partner ID
customer ID
```

from the client.

## Edge Functions

Use server-side validation for:

- order creation
- pricing
- payment creation
- payment verification
- payment webhook
- order state transitions
- dispatch
- partner assignment
- cancellation
- refunds

---

# 17. PHASE 15 — Database Integrity

Important constraints:

- foreign keys
- unique constraints
- check constraints
- not-null constraints where required
- indexes
- unique payment IDs
- unique webhook event IDs
- unique idempotency keys
- one active assignment per order
- valid role values
- valid state values

## Index important queries

Examples:

```text
orders(customer_id)
orders(status)
orders(partner_id)
orders(scheduled_date)
partner_profiles(status)
partner_availability(...)
payments(order_id)
payment_events(event_id)
```

Use indexes based on actual query patterns rather than blindly indexing every column.

---

# 18. PHASE 16 — Observability

Add structured logs for important operations.

Every critical backend operation should be traceable using identifiers such as:

```text
request_id
user_id
order_id
payment_id
partner_id
event_id
```

Track:

- authentication failures
- order creation failures
- payment failures
- webhook failures
- dispatch failures
- assignment conflicts
- unexpected state transitions
- notification failures

Do not log sensitive payment credentials or OTP values.

---

# 19. PHASE 17 — Testing Strategy

Testing is part of implementation, not an optional final step.

## Authentication tests

- Fresh install
- OTP success
- OTP failure
- OTP expiry
- OTP resend
- Rate limits
- Logout
- App restart
- Session restoration
- Session expiry

## Order tests

- Valid order
- Invalid service
- Invalid variant
- Invalid address
- Unsupported location
- Invalid date/time
- Duplicate tap
- Duplicate API request
- Network loss
- App kill during order creation

## Payment tests

- Successful payment
- Failed payment
- Cancelled checkout
- Duplicate callback
- Duplicate webhook
- Webhook first
- Callback first
- App killed after payment
- Network loss after payment
- Unknown payment state
- Amount mismatch
- Signature mismatch

## Dispatch tests

- No partner
- One partner
- Multiple partners
- Partner rejects
- Partner times out
- Partner accepts
- Two partners accept simultaneously
- Partner becomes unavailable
- Retry dispatch

## Realtime tests

- Customer receives status update
- Partner receives status update
- Location updates
- Reconnect after network loss
- App background/foreground
- App killed/reopened

---

# 20. Critical Race Conditions

Explicitly test:

### Duplicate order

```text
Tap Order
Tap Order
Tap Order
```

Expected:

```text
ONE logical order
```

### Double partner acceptance

```text
Partner A accepts
Partner B accepts
```

Expected:

```text
Exactly ONE assignment
```

### Payment callback + webhook

```text
Callback
Webhook
```

in either order.

Expected:

```text
ONE successful payment
ONE confirmed order
```

### Retry after timeout

A client may retry the same API request.

Expected:

```text
Idempotent result
```

---

# 21. Admin-Controlled Configuration

Keep operational rules configurable where practical.

Examples:

```text
serviceability regions
service activation
service pricing
time slots
partner rejection threshold
partner penalty configuration
dispatch radius
dispatch retry count
cancellation policy
cash availability
payment configuration
```

Do not hardcode business rules into mobile UI.

---

# 22. API Design Principles

Every backend endpoint should have:

```text
Authentication
Authorization
Input validation
Business validation
Transaction safety
Idempotency where required
Error handling
Structured logging
```

Use consistent responses.

Example:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "..."
}
```

Error example:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "The selected service is currently unavailable."
  },
  "requestId": "..."
}
```

Do not expose internal database errors directly to customers.

---

# 23. Suggested Backend Services

Keep domain logic separated.

```text
AuthService
ProfileService
CatalogService
AddressService
ServiceabilityService
PricingService
OrderService
PaymentService
DispatchService
PartnerService
NotificationService
RealtimeService
CancellationService
```

Payment:

```text
PaymentService
      ↓
PaymentProvider
      ↓
RazorpayPaymentProvider
```

This gives provider independence without adding unnecessary payment providers now.

---

# 24. Suggested Repository Structure

Adapt this to the existing project rather than blindly restructuring it.

```text
serventica-app/
│
├── apps/
│   ├── customer/
│   ├── partner/
│   └── admin/
│
├── packages/
│   ├── types/
│   ├── validation/
│   ├── domain/
│   ├── api/
│   └── config/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── dispatch/
│   │   ├── partners/
│   │   └── notifications/
│   └── seed/
│
└── docs/
```

Do not perform a massive folder restructure simply for aesthetics. Preserve the existing project where practical.

---

# 25. Production-Grade Rules for the Coding Agent

When implementing any phase:

1. Inspect the existing implementation first.
2. Identify what is already working.
3. Do not rebuild working functionality unnecessarily.
4. Do not change UI unless the task requires it.
5. Do not introduce fake data where real backend logic is required.
6. Do not bypass RLS.
7. Do not trust client-supplied authoritative values.
8. Do not create duplicate services/functions for the same responsibility.
9. Reuse existing abstractions when they are correct.
10. Keep changes scoped to the current phase.
11. Add migrations instead of manually changing production schema.
12. Test both success and failure paths.
13. Test retry/idempotency behavior.
14. Check logs/errors after implementation.
15. Do not claim something is production-ready without evidence.

---

# 26. Phase Completion Gate

A phase is NOT complete merely because the code compiles.

For every phase:

```text
Implementation
      ↓
Type check
      ↓
Lint
      ↓
Unit tests where appropriate
      ↓
Integration tests
      ↓
Real device/app tests where required
      ↓
Failure-path tests
      ↓
Security/RLS verification
      ↓
Database verification
      ↓
Final report
```

The agent must report:

```text
1. What was implemented
2. Files changed
3. Database changes
4. API changes
5. Tests executed
6. Test results
7. Known limitations
8. Remaining work
```

Then STOP.

Do not repeatedly analyze the entire repository after the phase has passed.

---

# 27. Customer-Side Completion Milestone

Before starting the partner app, the following must work:

```text
Fresh Install
    ↓
Phone Number
    ↓
OTP
    ↓
Authenticated Session
    ↓
Customer Profile
    ↓
Browse Services
    ↓
Select Service
    ↓
Select Address
    ↓
Select Date/Time
    ↓
Create Order
    ↓
Razorpay TEST Checkout
    ↓
Backend Payment Verification
    ↓
Order CONFIRMED
    ↓
PARTNER_SEARCHING
    ↓
Dispatch Event Created
```

And these must also work:

```text
Logout
App Restart
Session Restore
Failed OTP
Expired OTP
Failed Payment
Cancelled Payment
Duplicate Order Tap
Network Loss
Invalid Address
Unavailable Service
Unauthorized Database Access
```

Only after this milestone should partner app implementation begin.

---

# 28. Partner-Side Completion Milestone

Partner must be able to:

```text
Login
  ↓
Become Available
  ↓
Receive Job Offer
  ↓
View Job Details
  ↓
Accept / Reject
  ↓
Order Assigned
  ↓
Navigate / En Route
  ↓
Arrive
  ↓
Start Service
  ↓
Complete Service
```

Customer must see corresponding backend-driven state changes.

---

# 29. Full V1 End-to-End Flow

```text
CUSTOMER
   │
   ├── Phone OTP
   │
   ├── Browse service
   │
   ├── Select service
   │
   ├── Select address
   │
   ├── Select date/time
   │
   └── Place order
            │
            ▼
       ORDER CREATED
            │
            ▼
      PAYMENT PENDING
            │
            ▼
      RAZORPAY TEST
            │
            ▼
     SERVER VERIFICATION
            │
       ┌────┴────┐
       │         │
    FAILED     SUCCESS
       │         │
       ▼         ▼
   Failure     CONFIRMED
                 │
                 ▼
         PARTNER SEARCHING
                 │
                 ▼
          PARTNER OFFER
                 │
          ┌──────┴──────┐
          │             │
        REJECT        ACCEPT
          │             │
          ▼             ▼
      NEXT OFFER    ASSIGNED
                        │
                        ▼
                    EN_ROUTE
                        │
                        ▼
                     ARRIVED
                        │
                        ▼
                  SERVICE_STARTED
                        │
                        ▼
                 SERVICE_COMPLETED
```

---

# 30. What NOT to Build in V1

Do not let scope expand prematurely into:

- complicated loyalty systems
- wallet system
- advanced subscription system
- sophisticated referral engine
- complex coupon engine
- large analytics dashboard
- automated partner payouts
- complicated financial ledger beyond what is required
- AI recommendations
- excessive admin analytics
- multiple payment providers
- unnecessary microservices
- elaborate partner gamification
- unnecessary UI redesign
- fake/mock production workflows

These can be added after the core operational loop is stable.

---

# 31. Definition of V1 Success

V1 is functionally successful when a real test user can:

```text
Register/login with phone OTP
        ↓
Remain authenticated after app restart
        ↓
Browse a real service catalog
        ↓
Choose a service
        ↓
Choose a valid service address
        ↓
Choose a valid date/time
        ↓
Create exactly one order
        ↓
Pay through Razorpay TEST
        ↓
Have payment verified by backend
        ↓
Have order confirmed
        ↓
Trigger partner search
        ↓
Partner receives offer
        ↓
Partner accepts
        ↓
Customer receives assignment
        ↓
Partner goes en route
        ↓
Partner arrives
        ↓
Service starts
        ↓
Service completes
```

All important failure and retry paths must also behave deterministically.

---

# 32. Recommended Execution Sequence

## Sprint/Phase A — Customer Foundation

- Phase 01 Authentication
- Phase 02 Authorization/RLS
- Phase 03 Catalog
- Phase 04 Address
- Phase 05 Order Creation

## Sprint/Phase B — Transaction Layer

- Phase 06 Razorpay TEST
- Phase 07 Order State Machine
- Payment recovery
- Idempotency
- Webhooks
- Reconciliation basics

## Sprint/Phase C — Dispatch Foundation

- Phase 08 Partner Search
- Eligibility
- Availability
- Dispatch event
- Offer lifecycle

## Sprint/Phase D — Partner App

- Phase 09 Partner authentication
- Partner availability
- Job offers
- Phase 10 accept/reject
- Active job lifecycle

## Sprint/Phase E — Operational Realtime

- Phase 11 realtime tracking
- Phase 12 notifications
- Phase 13 cancellation/recovery

## Sprint/Phase F — Hardening

- Security
- RLS
- Race conditions
- Load-oriented tests
- Logging
- Error handling
- Recovery
- Production configuration

---

# 33. Final Development Rule

Build Serventica as a **transactionally correct service marketplace**, not as a collection of screens.

The correct priority is:

```text
Correctness
    ↓
Security
    ↓
Data integrity
    ↓
Business logic
    ↓
API reliability
    ↓
Realtime behavior
    ↓
Testing
    ↓
Performance
    ↓
UI polish
```

A beautiful screen that cannot reliably create, verify, assign, track, and complete a service order is not a completed feature.

The core V1 target is the complete operational loop:

```text
CUSTOMER
→ AUTH
→ SERVICE
→ ADDRESS
→ ORDER
→ PAYMENT
→ CONFIRMATION
→ DISPATCH
→ PARTNER
→ ACCEPT
→ EN_ROUTE
→ SERVICE
→ COMPLETE
```

**End of roadmap.**
