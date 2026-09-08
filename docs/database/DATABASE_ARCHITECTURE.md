# SERVENTICA — DATABASE ARCHITECTURE & RLS MODEL

This document provides a complete overview of the Serventica PostgreSQL database schema, PostGIS spatial support, Row Level Security (RLS) policies, and domain entity relationships.

---

## 1. Core Principles

- **PostGIS Enabled**: Native `GEOMETRY` and `GEOGRAPHY` support for polygon service zones and point location calculations.
- **Strict Row Level Security (RLS)**: Every single table in the `public` schema has explicit RLS enabled and tested policies.
- **Automated Bootstrap Trigger**: `handle_new_auth_user()` ensures that when a user registers via Supabase Auth (`auth.users`), corresponding records are automatically created in `public.users`, `public.customer_profiles`, and `public.user_roles`.

---

## 2. Domain Entities

### Identity & Access Control
- `public.users`: Core user entity tied 1:1 to `auth.users(id)` via Foreign Key with `ON DELETE CASCADE`.
- `public.roles`: Canonical platform roles (`CUSTOMER`, `PARTNER`, `OPERATIONS_AGENT`, `ADMIN`, `SUPER_ADMIN`).
- `public.user_roles`: Multi-role mapping table with uniqueness constraints.

### Customer Domain
- `public.customer_profiles`: Extended customer information (names, language preference, onboarding status, default address).
- `public.addresses`: Customer addresses with PostGIS Point coordinates (`GEOGRAPHY(Point, 4326)`).

### Partner Domain
- `public.partner_profiles`: Partner service professional profiles, KYC status, real-time location (`GEOGRAPHY(Point, 4326)`), rating, and job statistics.

### Geography & Serviceability
- `public.service_zones`: PostGIS Polygon boundaries (`GEOMETRY(Polygon, 4326)`) and pincode arrays defining active operating zones.

### Catalog & Pricing
- `public.categories`: Hierarchical service categories with sort order and parent-child relations.
- `public.services`: Core service items with base prices, duration, and pricing types (`FIXED`, `VARIANT`, `ADDON`, etc.).
- `public.service_variants`: Sub-options and tier options for services.
- `public.service_addons`: Additional selectable add-ons for services.

### Bookings & Orders
- `public.bookings`: Booking lifecycle state machine, scheduling, pricing breakdown (subtotal, tax, platform fee, discounts, total).
- `public.booking_items`: Individual items, variants, and quantities in each booking.

### Payments
- `public.payments`: Payment transactions, gateway provider IDs (Razorpay), statuses, and currency amounts.

---

## 3. RLS Security Model

| Table | Policy | Operation | Rule |
| :--- | :--- | :--- | :--- |
| `users` | Users can read own record | `SELECT` | `auth.uid() = id` |
| `users` | Users can update own record | `UPDATE` | `auth.uid() = id` |
| `customer_profiles` | Customers can view own profile | `SELECT` | `auth.uid() = user_id` |
| `customer_profiles` | Customers can insert own profile | `INSERT` | `auth.uid() = user_id` |
| `customer_profiles` | Customers can update own profile | `UPDATE` | `auth.uid() = user_id` |
| `addresses` | Users can view own addresses | `SELECT` | `auth.uid() = user_id` |
| `addresses` | Users can manage own addresses | `ALL` | `auth.uid() = user_id` |
| `categories` | Public read active categories | `SELECT` | `is_active = TRUE` |
| `services` | Public read active services | `SELECT` | `is_active = TRUE` |
| `bookings` | Customers can view own bookings | `SELECT` | `auth.uid() = customer_id` |
| `user_roles` | Users can read own roles | `SELECT` | `auth.uid() = user_id` |
