# Serventica Database Schema & Integrity Inventory

## 1. Migration History
The database schema is managed via 23 forward-only migrations in [supabase/migrations](file:///c:/dev/serventica-app/supabase/migrations):
1. `20260908000001_serventica_foundation.sql`: Core schema, profiles, enum types, audit triggers.
2. `20260908000002_home_catalog_and_search.sql`: Search indexes, category hierarchy.
3. `20260908000003_category_hierarchy_and_seed.sql`: Root service categories and visual icons.
4. `20260908000004_home_hero_assets.sql`: Hero banner configurations.
5. `20260909000001_account_and_user_management.sql`: User profile fields, saved addresses, role grants.
6. `20260909000002_category_experience_and_themes.sql`: Dynamic theming and UI layout configurations.
7. `20260910000001_service_origins_and_routing.sql`: Origin hubs and routing coordinates.
8. `20260911000001_production_catalog_system.sql`: Master catalog system with variants.
9. `20260912000001_master_catalog_city_pricing.sql`: Multi-city pricing matrix, service areas.
10. `20260913000001_phase5_serviceability_availability_engine.sql`: Professional skills, working hours, booking reservations.
11. `20260914000001_phase6_production_payments_and_booking_transactions.sql`: Payments, payment attempts, refunds.
12. `20260915000001_serventica_fulfillment_dispatch_engine.sql`: Partner presence, locations, dispatch offers, booking events.
13. `20260918000001_production_payment_orchestrator_and_outbox.sql`: Payment idempotency keys, outbox events.
14. `20260919000001_cancellation_and_refund_audit.sql`: Cancellation audit records.
15. `20260922000001_canonical_categories_cleanup.sql`: Category canonicalization.
16. `20260922000001_fix_booking_rls_and_realtime_sync.sql`: Real-time publication flags and booking RLS fixes.
17. `20260923000001_serventica_tracking_sessions.sql`: Live tracking session lifecycle.
18. `20260924000001_serventica_user_devices_and_notifications.sql`: Device push tokens, notification queue.
19. `20260925000001_serventica_tracking_retention_and_audit.sql`: Location data retention policies and spatial indexes.
20. `20260926000001_serventica_fulfillment_transaction_engine.sql`: Fulfillment idempotency, fulfillment outbox, settlements.
21. `20260927000001_serventica_financial_domain_and_ledger.sql`: Double-entry accounting ledger accounts and entries.
22. `20261010000001_security_hardening_rpcs_and_grants.sql`: RLS hardening, RPC security definers, revoke public execute.
23. `20261010000002_serventica_instant_foundation.sql`: Instant service requirements, fulfillment intents, partner capabilities, job extensions.

---

## 2. Core Domain Table Breakdown

| Domain | Table Name | Purpose | Primary Integrity Constraints |
| :--- | :--- | :--- | :--- |
| **Catalog** | `service_categories` | Root categories (Cleaning, AC, etc.) | `slug` UNIQUE, `is_active` BOOL |
| **Catalog** | `services` | Sellable services | FK `service_categories.id`, `base_price` >= 0 |
| **Catalog** | `service_variants` | Tiered offerings (e.g. 1 BHK, 2 BHK) | FK `services.id`, non-null duration |
| **Geospatial** | `service_areas` | Geographic polygons for serviceability | PostGIS Polygon, `city_id` FK |
| **Geospatial** | `partner_locations` | Partner real-time GPS coordinates | Spatial index, updated_at timestamp |
| **Bookings** | `bookings` | Authoritative customer bookings | State check constraint, customer FK |
| **Bookings** | `booking_events` | Append-only state transition journal | FK `bookings.id`, timestamp order |
| **Instant** | `fulfillment_intents`| Pre-booking lock & quote snapshot | UUID PK, quote expiry timestamp |
| **Dispatch** | `dispatch_offers` | Multi-wave assignment offers | Unique `(booking_id, partner_id, wave)` |
| **Dispatch** | `booking_assignments`| Current partner assignment | Unique active partner per booking |
| **Payments** | `payments` | Customer charge records | Integer minor units (cents/paise), FK booking |
| **Ledger** | `ledger_entries` | Double-entry financial audit entries | Balanced debits and credits constraint |
| **Outbox** | `fulfillment_outbox_events` | Transactional outbox for events | Status: `PENDING`, `DISPATCHED`, `FAILED` |
| **Idempotency**| `fulfillment_idempotency_keys` | Request deduplication | Actor-scoped key, response cache |

---

## 3. RLS Security Audit Summary

- **Customer Data Isolation**: `bookings`, `payments`, `addresses` have RLS policies restricting access to `auth.uid() = customer_id`.
- **Partner Access Boundary**: Partners can only query bookings assigned to them via `booking_assignments` or active `dispatch_offers`.
- **Admin Privilege**: Restricted via Supabase `auth.jwt() ->> 'role' = 'admin'`.
- **Service Role Bypass**: Only backend service role (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS for system operations.
