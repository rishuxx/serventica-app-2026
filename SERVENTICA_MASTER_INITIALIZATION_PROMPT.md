# SERVENTICA — MASTER INITIALIZATION PROMPT
## Production-Grade Home Services Marketplace Platform

> **Purpose:** This document is the first prompt/specification to give the coding agent when initializing the new Serventica codebase.
>
> **Important:** This is NOT a college project, prototype, demo, or throwaway MVP. Treat Serventica as a real startup product intended for real customers, real service professionals, real payments, real bookings, real operational workflows, and eventual multi-city scale.

---

# 0. AGENT INSTRUCTION — READ THIS FIRST

You are initializing a completely NEW production-grade Serventica platform.

The previous Serventica React Native project is a prototype/reference only. **Do not use the old project as the production codebase and do not inherit its architecture, hardcoded data, mock flows, legacy dependencies, or technical debt.**

The old project may later be inspected separately for:
- product ideas
- existing Serventica concepts
- branding
- visual references
- useful assets
- service categories
- UX inspiration

But the new codebase must be designed from first principles.

## Core principle

> **BUILD THE PRODUCT FOUNDATION FIRST. IMPLEMENT THE FINAL VISUAL DESIGN SECOND.**

The first implementation should be functionally complete and architecturally sound, using a clean temporary UI where necessary.

The final Serventica UI/UX will later be implemented screen-by-screen from approved screenshots/design references.

Do NOT confuse:
- preserving the Serventica product vision with preserving old code
- building production architecture with building excessive premature infrastructure
- building functionality first with ignoring future UI requirements

---

# 1. PRODUCT VISION

Serventica is a technology-enabled local home-services marketplace.

The platform connects:

```text
CUSTOMERS
    ↕
SERVENTICA PLATFORM
    ↕
SERVICE PARTNERS / PROFESSIONALS
```

with an administrative/operations layer:

```text
CUSTOMER APP
      ↕
CORE PLATFORM
      ↕
PARTNER APP

ADMIN WEB
      ↕
CORE PLATFORM
```

The long-term platform should support:

- Home services
- Repairs
- Electrical work
- Plumbing
- Painting
- Waterproofing
- Cleaning
- AC services
- RO/filter services
- Fan/cooler services
- Washing machine services
- Appliance repair
- Other household repair categories
- Serventica Originals
- On-demand helpers
- Househelp
- Gardener
- General helpers
- Hourly workers
- Daily workers
- Monthly workers
- Recurring services
- Subscription-style services
- Emergency/on-demand services where operationally feasible

The exact catalog must remain data-driven and configurable from Admin.

Do NOT hardcode business categories into screen components.

---

# 2. PRODUCT PRINCIPLES

The product must be designed around these principles:

1. Customer trust
2. Partner trust
3. Operational reliability
4. Transparent pricing
5. Real-time booking visibility
6. Serviceability by geographic zone
7. Secure payments
8. Strong partner verification
9. High-quality service execution
10. Data-driven decisions
11. Maintainable software architecture
12. Scalable domain boundaries
13. Excellent mobile performance
14. Consistent design system
15. Production-grade observability
16. Strong security
17. Testability
18. Accessibility
19. Offline/network resilience
20. Clear separation between presentation, business logic, and infrastructure

---

# 3. PRODUCTS TO BUILD

Serventica is NOT one application.

Build three separate products sharing the same backend/platform.

## PRODUCT A — CUSTOMER MOBILE APP

Technology:

- React Native
- TypeScript
- React Native New Architecture
- Hermes

Platforms:

- Android
- iOS

Purpose:

Customers discover, customize, book, pay for, track, and review services.

---

## PRODUCT B — PARTNER MOBILE APP

Technology:

- React Native
- TypeScript
- React Native New Architecture
- Hermes

Platforms:

- Android
- iOS

Purpose:

Service professionals onboard, complete verification, manage availability, receive jobs, navigate to customers, execute services, update job status, communicate, and track earnings.

The Partner app is a separate product because partner workflows, security, navigation, availability, job state, and operational requirements differ significantly from customer workflows.

---

## PRODUCT C — ADMIN / OPERATIONS WEB

Technology:

- Next.js
- TypeScript
- React

Purpose:

Central operational control.

Admin must eventually manage:

- Customers
- Partners
- Partner verification
- Service catalog
- Categories
- Pricing
- Add-ons
- Service zones
- Bookings
- Dispatch
- Offers
- Coupons
- Payments
- Refunds
- Payouts
- Reviews
- Complaints
- Support
- Notifications
- Analytics
- Configuration
- Audit logs

---

# 4. RECOMMENDED MONOREPO

Use a monorepo.

Recommended:

- pnpm
- Turborepo

Target structure:

```text
serventica/
│
├── apps/
│   ├── customer/
│   ├── partner/
│   ├── admin/
│   └── api/
│
├── packages/
│   ├── design-system/
│   ├── types/
│   ├── validation/
│   ├── api-client/
│   ├── config/
│   ├── analytics/
│   ├── utils/
│   └── constants/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── seed/
│   └── config/
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── flows/
│   ├── security/
│   ├── operations/
│   └── design/
│
├── tooling/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

Do not create arbitrary folders simply to make the repository look sophisticated.

Use clear domain ownership.

---

# 5. MOBILE TECHNOLOGY STACK

## Core

React Native + TypeScript.

Use the current stable React Native version compatible with the chosen dependency ecosystem.

Before installation:
- verify current stable versions
- verify compatibility between React Native, Reanimated, Gesture Handler, FlashList and other native dependencies
- avoid blindly using latest versions if they are incompatible

## Architecture

Use React Native New Architecture.

Use Hermes.

Use native modules when a feature genuinely requires native functionality.

Do NOT reject native Kotlin/Swift code where necessary.

React Native is the primary cross-platform application framework, not a prohibition against native code.

---

# 6. MOBILE UI / UX TECHNOLOGY

Do NOT build Serventica around a generic pre-made visual UI kit.

Create a reusable Serventica Design System.

Recommended supporting technologies:

- React Native
- React Native Reanimated
- React Native Gesture Handler
- Shopify FlashList
- @gorhom/bottom-sheet
- React Hook Form
- Zod

Use a controlled icon system.

Use optimized image loading/caching.

Use skeleton/loading components.

Use haptics where appropriate.

Avoid excessive animations that reduce performance.

---

# 7. SERVENTICA DESIGN SYSTEM

The final UI must be distinctive to Serventica.

Do NOT copy Urban Company, Blinkit, Zepto, BigBasket, or any competitor visually.

Competitors may be studied for:
- product architecture
- operational patterns
- marketplace mechanics
- performance principles
- information architecture
- engineering approaches

Their visual identity must NOT be copied.

The design system must eventually define:

```text
Design Tokens
├── Colors
├── Typography
├── Font weights
├── Spacing
├── Border radius
├── Shadows
├── Elevation
├── Iconography
├── Motion
├── Breakpoints
└── Accessibility rules
```

Components:

```text
Button
IconButton
SearchBar
Header
CategoryCard
ServiceCard
OfferCard
PartnerCard
Rating
Price
Badge
Chip
Tabs
Input
Select
BottomSheet
Modal
Toast
Banner
Skeleton
EmptyState
ErrorState
Confirmation
DatePicker
TimeSlotPicker
AddressCard
BookingCard
OrderStatus
PaymentSummary
```

The final Serventica screenshots will determine exact visual implementation later.

---

# 8. STATE MANAGEMENT

Separate state categories.

## Server state

Use:

TanStack Query.

Use it for:
- services
- categories
- bookings
- partner information
- offers
- customer profile
- addresses
- server-generated configuration

Do NOT duplicate server state unnecessarily into Zustand.

## Local/client state

Use:

Zustand.

Use for:
- UI state
- temporary selections
- local preferences
- controlled client-only state

## Forms

Use:

React Hook Form + Zod.

All important form validation must exist server-side as well.

Client validation is UX; server validation is security/business correctness.

---

# 9. NAVIGATION

Use React Navigation with strict TypeScript navigation types.

Customer navigation should conceptually support:

```text
Root
├── Auth
│   ├── Splash
│   ├── Login
│   ├── OTP
│   └── Profile Setup
│
└── Main
    ├── Home
    ├── Services
    ├── Repairs
    ├── OnDemand
    ├── Search
    ├── Cart
    ├── Orders
    └── Profile
```

Do not assume this exact navigation hierarchy is final. Design the navigation architecture so it can evolve.

---

# 10. BACKEND TECHNOLOGY

Use:

## NestJS + TypeScript

NestJS is the application/business-logic layer.

Do not put complex business rules directly into React Native screens.

Target architecture:

```text
React Native / Next.js
        ↓
API Client
        ↓
NestJS API
        ↓
Application / Domain Logic
        ↓
Repositories / Infrastructure
        ↓
PostgreSQL / Supabase
```

---

# 11. DATABASE

Use:

## PostgreSQL

PostgreSQL is the primary relational database.

Reasons:
- transactional booking data
- strong relationships
- financial records
- partner/customer relationships
- constraints
- indexing
- reporting
- mature ecosystem

Use:

## PostGIS

for geographic functionality.

Examples:

- service zones
- partner locations
- customer locations
- radius queries
- distance calculations
- geographic serviceability

Do NOT manually implement all geographic logic using JavaScript latitude/longitude calculations.

---

# 12. SUPABASE

Use Supabase as a major infrastructure layer.

Use:

- PostgreSQL
- PostGIS
- Authentication
- Storage
- Realtime
- database migrations
- database tooling
- appropriate Edge Functions where useful

However:

## Do NOT build this:

```text
React Native
    ↓
Direct database CRUD everywhere
```

Instead:

```text
Client
  ↓
API / Application Layer
  ↓
Business Logic
  ↓
Database
```

Sensitive business operations must be server-controlled.

---

# 13. DATABASE DESIGN PRINCIPLES

Database design must be:

- normalized where appropriate
- indexed
- constrained
- migration-driven
- auditable
- transactional
- secure

Use:
- foreign keys
- unique constraints
- check constraints
- indexes
- timestamps
- soft-delete strategy where appropriate
- immutable financial records where appropriate
- status history
- audit logs

Never rely solely on frontend logic to maintain data integrity.

---

# 14. INITIAL DOMAIN MODEL

The exact schema must be designed carefully before implementation.

Core domains:

```text
Identity
Customers
Partners
Catalog
Services
Locations
Pricing
Cart
Booking
Payment
Dispatch
Notification
Review
Support
Offers
Payouts
Analytics
Audit
```

Candidate entities:

```text
users
roles
permissions
user_roles

customer_profiles
partner_profiles

partner_documents
partner_skills
partner_service_zones
partner_availability

addresses
service_zones

categories
services
service_variants
service_addons
service_media
service_requirements

pricing_rules

carts
cart_items

bookings
booking_items
booking_addons
booking_status_history

assignments
dispatch_attempts

payments
payment_transactions
refunds

offers
coupons
coupon_redemptions

reviews
ratings

notifications
notification_preferences

support_tickets
chat_threads
chat_messages

payouts
ledger_entries

audit_logs
```

Do NOT blindly create all tables immediately.

First produce a database design document explaining:
- purpose
- relationships
- cardinality
- ownership
- indexes
- lifecycle
- security/RLS
- audit requirements

Then implement migrations.

---

# 15. AUTHENTICATION

Customer:

- mobile number
- OTP
- session management
- logout
- account recovery

Partner:

- mobile authentication
- onboarding
- verification
- approval
- activation/suspension

Admin:

- stronger authentication
- role-based access
- preferably MFA for privileged roles

Never store raw OTPs.

Never log sensitive credentials.

---

# 16. ROLE-BASED ACCESS CONTROL

Define roles such as:

```text
CUSTOMER

PARTNER

SUPPORT_AGENT

OPERATIONS_AGENT

PARTNER_MANAGER

FINANCE

CONTENT_MANAGER

ADMIN

SUPER_ADMIN
```

Permissions must be explicit.

Example:

```text
booking.read
booking.create
booking.cancel
booking.assign
booking.refund

partner.read
partner.verify
partner.suspend

service.create
service.update
service.delete

pricing.update

payout.read
payout.process
```

Do not implement authorization using frontend visibility alone.

---

# 17. CUSTOMER PRODUCT — FUNCTIONAL FLOW

Implement the full functional customer lifecycle.

```text
Open App
    ↓
Authentication
    ↓
Location
    ↓
Serviceability
    ↓
Home
    ↓
Browse/Search
    ↓
Category
    ↓
Service
    ↓
Customize
    ↓
Cart
    ↓
Address
    ↓
Schedule
    ↓
Price Review
    ↓
Payment
    ↓
Booking Confirmation
    ↓
Partner Matching
    ↓
Partner Assigned
    ↓
Partner En Route
    ↓
Partner Arrived
    ↓
Service Started
    ↓
Service Completed
    ↓
Review
```

Every state must be represented in the backend.

---

# 18. HOME SCREEN FUNCTIONALITY

The eventual Serventica home screen should support data-driven sections such as:

```text
Location
Search
Hero/banner
Serventica Originals
Services
Repairs
OnDemand
Popular services
Offers
Recently booked
Recommended services
```

The current visual style can later be recreated from screenshots.

Do NOT hardcode service cards into the UI.

Admin should eventually control content.

---

# 19. SERVICE CATALOG

Catalog must be data-driven.

Hierarchy:

```text
Category
    ↓
Subcategory
    ↓
Service
    ↓
Variant
    ↓
Add-ons
```

Example:

```text
Electrical
    ↓
Electrical Works
    ↓
Wiring
    ├── Basic Wiring
    ├── Full Wiring
    └── Inspection
```

Another:

```text
Repair
    ↓
AC
    ↓
AC Service
    ├── 1 Ton
    ├── 1.5 Ton
    └── 2 Ton
```

Admin must be able to configure these.

---

# 20. SERVICE TYPES

Do not assume every service is fixed-price.

Support multiple service models.

## Fixed-price

Example:

```text
AC basic service
₹X
```

## Variant-based

```text
1 Ton
1.5 Ton
2 Ton
```

## Add-on based

```text
Base service
+
Gas refill
+
Deep cleaning
+
Spare part
```

## Quantity-based

```text
Fan × 5
```

## Inspection/quote based

```text
Inspection
    ↓
Technician assessment
    ↓
Quote
    ↓
Customer approval
    ↓
Service
```

## Duration-based

```text
1 hour
4 hours
8 hours
```

This will be particularly important for OnDemand workforce services.

---

# 21. PRICING ENGINE

Never trust a client-provided final price.

Backend must calculate authoritative pricing.

Conceptually:

```text
Base Price
+ Variant Price
+ Add-ons
× Quantity
+ Distance/Travel fee where applicable
+ Surge/peak adjustment where applicable
+ Platform fee
+ Taxes
- Coupon
- Discount
= Final Payable Amount
```

The exact formula must be configurable and documented.

Pricing must produce a detailed breakdown.

---

# 22. CART

Cart must be real.

Support:

- service items
- variants
- add-ons
- quantities
- pricing snapshot
- availability validation
- removal
- update
- expiration/revalidation where required

Before checkout, revalidate price and availability.

---

# 23. ADDRESS + SERVICEABILITY

Customer must be able to:

- use current location
- search address
- manually enter address
- save address
- edit address
- delete address
- select default address

Serviceability:

```text
Customer Address
      ↓
Coordinates
      ↓
Service Zone
      ↓
Service available?
      ↓
Yes / No
```

Do not simply rely on city name.

Use geographic zones.

---

# 24. SCHEDULING

Support:

- available dates
- available slots
- service duration
- partner capacity
- blocked slots
- operational hours
- holidays
- zone availability

Do not show slots that cannot actually be fulfilled.

---

# 25. BOOKING ENGINE

Booking creation must be transactional.

Conceptually:

```text
Validate user
↓
Validate service
↓
Validate address
↓
Validate zone
↓
Validate service availability
↓
Validate slot
↓
Calculate price
↓
Create booking/order state
↓
Create payment order
↓
Payment confirmation
↓
Finalize booking
↓
Dispatch
```

Use idempotency to prevent duplicate bookings/payment actions.

---

# 26. BOOKING STATE MACHINE

Define an explicit state machine.

Example:

```text
DRAFT
↓
PENDING_PAYMENT
↓
CONFIRMED
↓
SEARCHING_PARTNER
↓
PARTNER_ASSIGNED
↓
PARTNER_ACCEPTED
↓
PARTNER_EN_ROUTE
↓
PARTNER_ARRIVED
↓
SERVICE_STARTED
↓
SERVICE_COMPLETED
↓
CLOSED
```

Possible alternate states:

```text
PAYMENT_FAILED
CANCELLED_BY_CUSTOMER
CANCELLED_BY_PARTNER
CANCELLED_BY_SYSTEM
PARTNER_NO_SHOW
CUSTOMER_NO_SHOW
DISPUTED
REFUND_PENDING
REFUNDED
```

Do not allow arbitrary status changes.

Define legal transitions.

Every transition should be auditable.

---

# 27. PARTNER APP

Partner app flow:

```text
Install
↓
Login
↓
Profile
↓
Skills
↓
Documents
↓
KYC
↓
Admin Verification
↓
Training / Onboarding
↓
Activation
↓
Set Availability
↓
Receive Jobs
↓
Accept/Reject
↓
Navigate
↓
Arrive
↓
Start
↓
Complete
↓
Earnings
↓
Payout
```

---

# 28. PARTNER VERIFICATION

Potential data:

- identity
- phone
- address
- photograph
- government verification data as legally appropriate
- skill information
- experience
- certifications
- bank details
- service zones
- documents

Security and privacy must be designed carefully.

Do not store sensitive identity data unnecessarily.

---

# 29. PARTNER AVAILABILITY

Partner states:

```text
OFFLINE
AVAILABLE
BUSY
PAUSED
SUSPENDED
```

Availability must be server-controlled.

Do not trust a stale client state.

---

# 30. DISPATCH ENGINE

Initial dispatch should be rule-based.

Candidate factors:

```text
Service zone
Required skill
Partner availability
Distance
Current workload
Rating
Reliability
Acceptance history
```

Potential flow:

```text
Booking
 ↓
Find eligible partners
 ↓
Rank candidates
 ↓
Offer job
 ↓
Partner accepts?
 ├── YES → Assign
 └── NO → Next candidate
```

Later this can become more sophisticated.

Do NOT build ML dispatch prematurely.

---

# 31. REALTIME

Use realtime for:

- booking status
- partner assignment
- partner status
- job updates
- support/chat where appropriate
- operational dashboards

Architecture should tolerate:
- reconnects
- duplicate events
- delayed events
- offline devices

Realtime events must not become the sole source of truth.

The database remains authoritative.

---

# 32. PAYMENTS

Use Razorpay for the Indian launch unless product/legal/finance requirements later dictate otherwise.

Required architecture:

```text
Customer
 ↓
Backend
 ↓
Create Payment Order
 ↓
Razorpay
 ↓
Payment
 ↓
Webhook
 ↓
Backend Verification
 ↓
Update Payment
 ↓
Confirm Booking
```

Important:

- verify signatures server-side
- verify webhooks
- implement idempotency
- record payment transaction state
- support failures
- support refunds
- never trust client-only payment success

---

# 33. FINANCIAL LEDGER

Do not model platform finances as a single payment field.

Track:

```text
Customer payment
      ↓
Gross amount
      ↓
Taxes
      ↓
Platform fees
      ↓
Partner earning
      ↓
Serventica commission
      ↓
Refunds
      ↓
Adjustments
      ↓
Partner payout
```

Use immutable/append-only principles for financial records where appropriate.

Finance records must be auditable.

---

# 34. PARTNER EARNINGS

Partner should eventually see:

```text
Today's earnings
Weekly earnings
Monthly earnings
Completed jobs
Pending earnings
Available payout
Paid payout
Adjustments
```

Admin/finance should have corresponding views.

---

# 35. ON-DEMAND WORKFORCE MODEL

Serventica's differentiating area should eventually include:

### Househelp

- hourly
- daily
- recurring/monthly where operationally viable

### Gardener

- one-time
- scheduled
- recurring

### Helper

- hourly
- half-day
- full-day

### General workforce

- moving assistance
- loading/unloading
- event assistance
- cleaning assistance
- household assistance

This should be modeled as a generalized workforce booking system rather than creating a separate codebase for every worker category.

Conceptually:

```text
Worker
+
Skills
+
Availability
+
Location
+
Duration
+
Service type
+
Pricing model
+
Recurrence
```

---

# 36. ADMIN PLATFORM

Admin web must eventually become the operational command center.

Dashboard:

```text
Bookings
Revenue
Active partners
Customers
Completion rate
Cancellation rate
Payment failures
Partner acceptance
Support tickets
```

Catalog:

```text
Categories
Services
Variants
Add-ons
Media
Pricing
Availability
```

Partner:

```text
Applications
Verification
Skills
Zones
Availability
Jobs
Earnings
Ratings
Suspension
```

Operations:

```text
Live bookings
Dispatch
Assignment
Reassignment
Cancellation
Refund
Dispute
```

---

# 37. OFFERS / COUPONS

Create a proper promotion engine.

Potential rules:

- flat discount
- percentage discount
- first booking
- category-specific
- service-specific
- zone-specific
- minimum order
- maximum discount
- time window
- usage limit
- per-user limit

Never hardcode coupon logic in screens.

---

# 38. REVIEWS + QUALITY

After completion:

```text
Booking
↓
Rating
↓
Review
```

Track:

- customer rating
- partner rating
- service rating
- complaint
- cancellation
- no-show
- repeat booking

Eventually feed quality metrics into partner operations/dispatch.

---

# 39. NOTIFICATIONS

Create a centralized notification service.

Channels:

```text
Push
SMS
Email
In-app
```

Events:

```text
OTP
Booking confirmed
Payment successful
Partner assigned
Partner accepted
Partner arriving
Partner arrived
Service started
Service completed
Payment refund
Review reminder
Offer
Support update
```

Notifications must be event-driven where appropriate.

Do not scatter notification logic throughout UI screens.

---

# 40. SUPPORT

Build support around actual bookings.

Example:

```text
Customer
 ↓
Help
 ↓
Booking
 ↓
Problem type
 ↓
Ticket
 ↓
Support agent
 ↓
Resolution
```

Potential issue types:

- partner late
- partner no-show
- quality issue
- payment issue
- cancellation
- refund
- pricing issue
- damaged property
- other

---

# 41. SEARCH

Initial search can use PostgreSQL capabilities.

Search:

- categories
- services
- keywords
- synonyms
- tags

Later, if scale/quality requires it, introduce dedicated search infrastructure.

Do not add Elasticsearch/OpenSearch merely because large companies use it.

---

# 42. ANALYTICS

Use product analytics such as PostHog.

Track meaningful events.

Examples:

```text
app_opened
location_selected
serviceability_checked
category_viewed
service_viewed
customization_started
add_to_cart
checkout_started
payment_started
payment_success
payment_failed
booking_created
booking_cancelled
partner_assigned
service_started
service_completed
review_submitted
```

Define an analytics event taxonomy document.

Do not randomly fire events with inconsistent names.

---

# 43. ERROR MONITORING

Use Sentry.

Track:

- JS crashes
- native crashes
- API failures
- important business failures
- performance issues
- release versions

Do not log:
- OTPs
- passwords
- payment secrets
- unnecessary PII
- authentication tokens

---

# 44. PERFORMANCE

Performance requirements:

- fast startup
- efficient lists
- image optimization
- caching
- pagination
- minimal unnecessary renders
- smooth animations
- low memory usage
- low-end Android consideration
- poor-network resilience

Use FlashList for large/high-frequency lists where appropriate.

Do not optimize blindly.

Measure before major performance rewrites.

---

# 45. OFFLINE / NETWORK RESILIENCE

The app must gracefully handle:

```text
No internet
Slow internet
Intermittent internet
Request timeout
Server unavailable
Realtime disconnect
Payment interruption
```

UI should provide:

- retry
- cached safe content
- loading state
- empty state
- error state
- offline indication

Do not create fake success states when the server has not confirmed an operation.

---

# 46. ACCESSIBILITY

Implement:

- semantic labels
- accessible touch targets
- sufficient contrast
- scalable text considerations
- screen reader compatibility
- keyboard/focus behavior where relevant
- reduced motion where practical

Accessibility is part of production quality.

---

# 47. SECURITY

Implement from the beginning.

Requirements include:

- authentication
- authorization
- RBAC
- server-side validation
- rate limiting
- OTP abuse prevention
- secure secrets
- secure storage
- API authorization
- database security
- RLS where appropriate
- webhook verification
- payment verification
- audit logging
- session management
- admin protection

Never put:
- API secrets
- payment secret keys
- service-role credentials
- private signing keys

inside mobile applications.

---

# 48. API DESIGN

Use REST initially.

Organize APIs by domain:

```text
/auth
/users
/customers
/partners
/categories
/services
/search
/addresses
/cart
/bookings
/dispatch
/payments
/offers
/reviews
/notifications
/support
/payouts
/admin
```

Use:
- DTOs
- validation
- versioning strategy
- consistent error format
- pagination
- filtering
- sorting
- authorization

Avoid creating a giant generic `/api` endpoint.

---

# 49. ERROR CONTRACT

Standardize API errors.

Conceptually:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_SLOT_UNAVAILABLE",
    "message": "The selected slot is no longer available.",
    "details": {}
  },
  "requestId": "..."
}
```

Never expose internal stack traces to clients.

---

# 50. ENVIRONMENT STRATEGY

Create:

```text
development
staging
production
```

Never mix credentials.

Example:

```text
.env.example
.env.local
staging secrets
production secrets
```

Production secrets must be managed securely.

Do not commit secrets.

---

# 51. CI/CD

Every pull request should eventually run:

```text
Install
↓
Lint
↓
Typecheck
↓
Unit tests
↓
Integration tests
↓
Build
```

Production release:

```text
PR
↓
Review
↓
CI
↓
Staging
↓
QA
↓
Release
↓
Monitoring
```

---

# 52. TESTING STRATEGY

## Unit tests

Business logic:
- pricing
- booking transitions
- coupon rules
- dispatch ranking
- serviceability
- payment state handling

## Component tests

Important UI components.

## Integration tests

API + database.

## E2E tests

Critical customer flow:

```text
Login
→ Browse
→ Service
→ Cart
→ Address
→ Slot
→ Payment
→ Booking
```

Partner flow:

```text
Login
→ Availability
→ Job
→ Accept
→ Arrive
→ Start
→ Complete
```

---

# 53. DOCUMENTATION REQUIREMENT

Maintain living documentation.

Create:

```text
docs/
├── product/
│   ├── PRODUCT_VISION.md
│   ├── BUSINESS_MODEL.md
│   ├── SERVICE_CATALOG.md
│   └── USER_ROLES.md
│
├── architecture/
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── REPOSITORY_STRUCTURE.md
│   └── DECISION_LOG.md
│
├── database/
│   ├── DATABASE_SCHEMA.md
│   └── DATA_LIFECYCLES.md
│
├── api/
│   ├── API_CONVENTIONS.md
│   └── API_CONTRACTS.md
│
├── flows/
│   ├── CUSTOMER_FLOW.md
│   ├── PARTNER_FLOW.md
│   ├── BOOKING_LIFECYCLE.md
│   ├── PAYMENT_FLOW.md
│   └── DISPATCH_FLOW.md
│
├── security/
│   └── SECURITY_MODEL.md
│
├── operations/
│   ├── ADMIN_OPERATIONS.md
│   └── INCIDENT_RESPONSE.md
│
└── design/
    └── SERVENTICA_DESIGN_SYSTEM.md
```

---

# 54. UI IMPLEMENTATION STRATEGY

The first functional UI should intentionally be simple.

It should prove:

```text
Navigation works
API works
Data works
Authentication works
Booking works
Payments work
Realtime works
Error handling works
```

Then final UI work begins.

The final visual workflow:

```text
Approved Screenshot
        ↓
Analyze Layout
        ↓
Identify Components
        ↓
Map API/Data
        ↓
Implement
        ↓
Visual Comparison
        ↓
Interaction Testing
        ↓
Performance Testing
        ↓
Approve
```

Do not alter business logic simply to make a screenshot easier to reproduce.

---

# 55. DESIGN REFERENCE RULE

When screenshots are later supplied:

Preserve:
- hierarchy
- visual identity
- typography
- spacing
- composition
- interaction model
- card style
- imagery direction
- motion language

But implementation should remain:
- reusable
- data-driven
- accessible
- responsive
- performant

Do not make one-off components for every screenshot if a reusable component can express the same design.

---

# 56. COMPETITOR RESEARCH PRINCIPLE

Study competitors such as:

- Urban Company
- Blinkit
- Zepto
- BigBasket
- other Indian local-services/marketplace products

Use them to understand:
- product flows
- marketplace mechanics
- operational models
- customer expectations
- partner workflows
- delivery/service tracking
- search
- booking
- payments
- growth loops
- reliability

Do NOT clone:
- logos
- colors
- exact layouts
- copy
- proprietary visual identity
- assets
- source code

Serventica must have its own brand.

---

# 57. SCALABILITY PHILOSOPHY

Do not prematurely build:

- dozens of microservices
- Kafka everywhere
- Kubernetes
- complex distributed systems
- dedicated search infrastructure
- ML dispatch
- huge event platforms

unless actual requirements justify them.

Start with a well-structured modular backend.

Target:

```text
Modular Monolith
      ↓
Scale bottleneck identified
      ↓
Extract specific domain/service
      ↓
Introduce queue/event infrastructure
      ↓
Scale independently
```

The architecture should make extraction possible later.

---

# 58. INITIAL INFRASTRUCTURE PHILOSOPHY

Use managed infrastructure wherever it reduces unnecessary operational burden.

Initial platform:

```text
React Native
        +
Next.js
        +
NestJS
        +
Supabase/PostgreSQL
        +
PostGIS
        +
Razorpay
        +
Maps
        +
FCM/APNs
        +
Sentry
        +
PostHog
```

Scale infrastructure only when justified by:
- traffic
- latency
- reliability
- cost
- operational requirements

---

# 59. DEVELOPMENT PHASES

Do NOT attempt to implement everything in one giant coding operation.

Use controlled phases.

## PHASE 0
Product definition

## PHASE 1
Architecture + repository initialization

## PHASE 2
Database design + migrations

## PHASE 3
Backend foundation

## PHASE 4
Authentication + identity

## PHASE 5
Customer app foundation

## PHASE 6
Catalog + service engine

## PHASE 7
Location + serviceability

## PHASE 8
Cart + pricing

## PHASE 9
Booking + scheduling

## PHASE 10
Payments

## PHASE 11
Partner onboarding

## PHASE 12
Partner job management

## PHASE 13
Dispatch

## PHASE 14
Realtime + notifications

## PHASE 15
Admin operations

## PHASE 16
Offers + reviews + support

## PHASE 17
On-demand workforce

## PHASE 18
Security hardening

## PHASE 19
Testing

## PHASE 20
Performance

## PHASE 21
Serventica UI/UX implementation

## PHASE 22
Pilot

## PHASE 23
Production launch

## PHASE 24
Scale

---

# 60. PHASE 0 — FIRST AGENT TASK

DO NOT START WRITING THE FULL APPLICATION YET.

First inspect the environment and produce a plan.

The first task is:

```text
1. Verify installed Node.js
2. Verify pnpm
3. Verify Git
4. Verify Android development environment
5. Verify Java/JDK
6. Verify Android SDK
7. Verify iOS requirements if running on macOS
8. Verify available Supabase tooling
9. Verify GitHub/Git configuration
10. Check whether Turborepo/pnpm can be initialized
```

Then propose the exact versions to use.

Do not blindly install dependencies.

---

# 61. CREATE THE INITIAL PROJECT

Initialize the new repository.

Requirements:

```text
TypeScript
ESLint
Prettier
Git
Husky/lint-staged where appropriate
pnpm
Turborepo
```

Create the initial monorepo structure.

Do NOT build customer screens yet.

---

# 62. FIRST DOCUMENTS TO CREATE

Before major implementation, create:

```text
docs/product/PRODUCT_VISION.md
docs/product/BUSINESS_MODEL.md
docs/product/USER_ROLES.md

docs/architecture/SYSTEM_ARCHITECTURE.md
docs/architecture/REPOSITORY_STRUCTURE.md
docs/architecture/DECISION_LOG.md

docs/database/DATABASE_SCHEMA.md

docs/flows/CUSTOMER_FLOW.md
docs/flows/PARTNER_FLOW.md
docs/flows/BOOKING_LIFECYCLE.md
docs/flows/PAYMENT_FLOW.md
docs/flows/DISPATCH_FLOW.md

docs/security/SECURITY_MODEL.md
```

---

# 63. DO NOT MAKE ASSUMPTIONS SILENTLY

When a product rule is unknown:

1. identify it
2. document it
3. propose the safest/default approach
4. mark it as a decision requiring confirmation

Do not invent critical business rules silently.

Examples:

- cancellation fee
- partner commission
- tax treatment
- refund policy
- service duration
- partner payout timing
- geographic expansion
- subscription pricing

---

# 64. ACCEPTANCE CRITERIA FOR INITIALIZATION

The initialization phase is complete only when:

- monorepo exists
- customer app scaffold exists
- partner app scaffold exists
- admin app scaffold exists
- API scaffold exists
- shared packages exist
- Supabase structure exists
- environment strategy exists
- lint works
- typecheck works
- basic builds work
- documentation exists
- Git repository is clean
- no secrets are committed
- architecture decisions are documented

Do not claim production readiness at this stage.

This is only the foundation.

---

# 65. GIT CHECKPOINTS

Create meaningful commits.

Examples:

```text
chore: initialize serventica monorepo
docs: define product architecture
feat: initialize customer app
feat: initialize partner app
feat: initialize admin app
feat: initialize api
feat: add database migrations
feat: implement authentication
feat: implement service catalog
feat: implement booking engine
feat: implement payments
```

Avoid giant commits containing hundreds of unrelated changes.

---

# 66. AGENT WORKING RULES

You are an engineering agent working on a serious production system.

Before changing architecture:

- explain why
- identify affected modules
- identify migration impact
- identify risks

Before adding a dependency:

- verify it is necessary
- verify React Native compatibility
- verify New Architecture compatibility
- verify maintenance status
- avoid duplicate libraries

Before deleting something:

- verify usage
- explain impact

Before changing database schema:

- create migration
- update schema documentation
- update affected code/tests

Before changing API contracts:

- update documentation
- update clients
- update tests

---

# 67. NEVER DO THESE THINGS

Do NOT:

- copy the old prototype architecture
- create hardcoded service arrays inside screens
- hardcode prices
- hardcode booking states
- fake successful payments
- fake partner assignment
- use mock data as permanent production data
- put secrets in mobile apps
- trust client-side prices
- trust client-side payment success
- implement authorization only in UI
- make every screen directly query the database
- create a giant global state store
- create unnecessary microservices
- install libraries without evaluating compatibility
- blindly upgrade React Native dependencies
- introduce Kafka/Redis merely for appearance
- clone competitor UI
- use placeholder logic and label it production-ready
- ignore error/loading/empty/offline states
- skip migrations
- skip tests
- skip logging/observability
- skip security review

---

# 68. IMPORTANT — UI/UX SEPARATION

The first build is allowed to look plain.

That is intentional.

The temporary UI exists to validate:

```text
DATA
BUSINESS LOGIC
API
NAVIGATION
STATE
BOOKING
PAYMENT
REALTIME
ERROR HANDLING
```

After that, the Serventica visual system will be applied.

The final UI must feel like:

> **Serventica**

not:

> Urban Company with different colors.

---

# 69. FUTURE SCALE

The architecture should eventually allow:

```text
One city
   ↓
Multiple zones
   ↓
Multiple cities
   ↓
Regional operations
   ↓
National marketplace
```

without redesigning the fundamental domain model.

Service zones, pricing, partner availability, catalog availability, operations and taxes should be capable of being configured by geography.

---

# 70. FIRST-CITY STRATEGY

Initial deployment should be controlled to one launch market.

The currently intended initial market should be confirmed before hardcoding any city-specific assumptions.

Do not architect the application around one city's name.

Use:

```text
Country
State
City
Zone
Pincode
Geo boundary
```

as configurable location data.

---

# 71. PRODUCTION DEFINITION

Do not use the phrase "production ready" simply because:

- the app compiles
- an APK installs
- a screen looks good
- an API returns JSON

Production readiness requires:

```text
Functional correctness
+
Security
+
Data integrity
+
Payment correctness
+
Operational tooling
+
Observability
+
Testing
+
Performance
+
Failure handling
+
Deployment process
+
Legal/business readiness
```

---

# 72. FINAL OBJECTIVE

The final Serventica platform should allow this complete real-world flow:

```text
CUSTOMER

Downloads app
      ↓
Creates account
      ↓
Shares/selects address
      ↓
Sees available Serventica services
      ↓
Searches/browses
      ↓
Selects service
      ↓
Selects variant/add-ons
      ↓
Adds to cart
      ↓
Selects address
      ↓
Selects date/time
      ↓
Receives authoritative price
      ↓
Pays
      ↓
Booking confirmed
      ↓
Serventica dispatches suitable partner
      ↓
Partner accepts
      ↓
Customer tracks status
      ↓
Partner arrives
      ↓
Service begins
      ↓
Service completed
      ↓
Payment/booking finalized
      ↓
Customer reviews
```

Simultaneously:

```text
PARTNER

Logs in
      ↓
Completes onboarding
      ↓
Gets verified
      ↓
Sets availability
      ↓
Receives suitable job
      ↓
Accepts
      ↓
Navigates to customer
      ↓
Arrives
      ↓
Starts service
      ↓
Completes
      ↓
Earning recorded
      ↓
Payout processed
```

And:

```text
ADMIN

Sees booking
      ↓
Sees customer
      ↓
Sees partner
      ↓
Controls dispatch
      ↓
Monitors payment
      ↓
Handles exceptions
      ↓
Handles complaints
      ↓
Controls catalog/pricing
      ↓
Controls partner ecosystem
      ↓
Views business metrics
```

That is the product we are building.

---

# 73. IMMEDIATE AGENT INSTRUCTION

## START HERE

Do the following in order:

### Step 1
Inspect the development environment.

### Step 2
Recommend exact compatible versions for:
- Node
- pnpm
- React Native
- React
- TypeScript
- Expo modules strategy if used
- NestJS
- Next.js
- Turborepo
- Supabase tooling

### Step 3
Create the monorepo.

### Step 4
Create:

```text
apps/customer
apps/partner
apps/admin
apps/api
```

### Step 5
Create shared packages.

### Step 6
Initialize Supabase/database structure.

### Step 7
Create the documentation listed above.

### Step 8
Create the initial architecture decision record.

### Step 9
Run lint/typecheck/build checks.

### Step 10
STOP.

Do not begin implementing the complete feature set until the architecture/documentation foundation has been reviewed.

---

# 74. AGENT RESPONSE FORMAT

After initialization, report:

```text
## Environment
...

## Versions Selected
...

## Repository Structure
...

## Architecture
...

## Database Strategy
...

## Security Strategy
...

## Dependencies Added
...

## Files Created
...

## Files Modified
...

## Commands Executed
...

## Validation
...

## Open Decisions
...

## Risks
...

## Recommended Next Phase
...
```

Be honest about what is implemented versus planned.

Never report a planned feature as completed.

---

# 75. FINAL ENGINEERING PRINCIPLE

Build Serventica as a real product.

Do not optimize for:

> "How quickly can we generate screens?"

Optimize for:

> "How reliably can Serventica complete a real customer transaction from discovery to payment to service completion while giving customers, partners, operations, and finance accurate information?"

The visual experience will be refined later.

The underlying system must be correct first.

## END OF INITIALIZATION SPECIFICATION
