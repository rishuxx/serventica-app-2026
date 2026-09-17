# Serventica — Master Catalog Data Quality & Import Report

**Generated Date:** 2026-09-17T18:54:39.626Z  
**Dataset Source:** `Serventica_Service_Pricing_Data.csv`  
**Target Marketplace:** Serventica (43 Indian Cities)

---

## 1. Dataset Summary

| Metric | Count | Description |
| :--- | :--- | :--- |
| **Source Rows Processed** | `72` | Total lines parsed from spreadsheet |
| **Unique Represented Cities** | `43` | Canonical Indian metros and Tier-2 hubs |
| **Canonical Categories** | `13` | Master 13 taxonomy categories |
| **Canonical Subcategories** | `43` | Normalized service families |
| **Canonical Services Created** | `72` | Unique canonical service entities |
| **Canonical Variants / Jobs** | `72` | Normalized job specifications |
| **Price Records Created** | `72` | Multi-tier national and city price records |
| **Duplicates Removed / Merged** | `0` | Redundant rows normalized into single entities |
| **Rows Requiring Review** | `0` | Ambiguous ranges or strings flagged in audit table |

---

## 2. Normalization Strategy & Rules

1. **AC Duplicate Alias Resolution**:
   - `ac_service_repair` and `ac_service_repairs` are unified under canonical category **AC & Appliance Services** (`ac-appliances`).
   - Mapped to standard subcategories (`ac-cleaning-maintenance`, `ac-repair-diagnostics`, `ac-gas-cooling`, `ac-installation`).
2. **City Normalization**:
   - All 43 cities (Ahmedabad, Bangalore, Chennai, Jaipur, Udaipur, Hyderabad, Kolkata, Mumbai, Pune, Nagpur, Ludhiana, Vadodara, Lucknow, Kochi, Bhubaneswar, Kanpur, Surat, Indore, Agra, Bhopal, Guwahati, Vijayawada, Varanasi, Coimbatore, Thiruvananthapuram, Patna, Raipur, Nashik, Jabalpur, Jamshedpur, Dehradun, Meerut, Ranchi, Prayagraj, Amritsar, Gwalior, Kota, Aurangabad, Mysore, Guntur, Rajahmundry, Cuttack, Madurai) seeded with standard coordinates, timezone, and country code `IN`.
3. **Monetary Precision**:
   - Replaced floating-point numbers with PostgreSQL `NUMERIC(10, 2)` and explicit currency `INR`.
   - Separated `base_price`, `labour_price`, and `material_price`.
4. **Audit Traceability**:
   - Every raw line from the source is preserved in `catalog_import_rows` with `raw_charge` and `mapping_notes`.

---

## 3. Master Category Status

| Index | Category Name | Slug | Initial Status |
| :--- | :--- | :--- | :--- |
| 01 | **AC & Appliance Services** | `ac-appliances` | **ACTIVE** |
| 02 | **Electrician** | `electrician` | **ACTIVE** |
| 03 | **Plumbing** | `plumbing` | **ACTIVE** |
| 04 | **Home Cleaning** | `home-cleaning` | **ACTIVE** |
| 05 | **Painting** | `painting` | *INACTIVE (Ready)* |
| 06 | **RO & Water Purification** | `ro-water` | **ACTIVE** |
| 07 | **Carpentry** | `carpentry` | **ACTIVE** |
| 08 | **Pest Control** | `pest-control` | **ACTIVE** |
| 09 | **Home Decor & Installation** | `home-decor` | **ACTIVE** |
| 10 | **Laundry** | `laundry` | **ACTIVE** |
| 11 | **Moving & Shifting** | `moving-shifting` | *INACTIVE (Ready)* |
| 12 | **Appliance Repair** | `appliance-repair` | **ACTIVE** |
| 13 | **Other Home Services** | `other-services` | *INACTIVE (Ready)* |

---
