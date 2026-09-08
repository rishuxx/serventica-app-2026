# SERVENTICA — Product Vision & Blueprint

## 1. Executive Summary
Serventica is a technology-enabled on-demand and scheduled home-services marketplace platform designed for high operational reliability, geographic precision, transparent pricing, and rigorous partner verification.

## 2. Core Stakeholder Architecture
```text
CUSTOMERS (Mobile App)
       ↕
SERVENTICA CORE PLATFORM (API & Domain Logic)
       ↕
SERVICE PARTNERS (Mobile App)
       ↕
ADMIN & OPERATIONS (Web Portal)
```

## 3. Product Principles
1. **Authoritative Backend**: Never trust client pricing, booking status, or payment flags.
2. **Geographic Zone Precision**: Serviceability driven by PostGIS geographic zones, not plain city strings.
3. **Data-Driven Catalog**: Dynamic categories, services, variants, and add-ons managed via admin/database.
4. **Resilient Offline Architecture**: Mobile clients handle network dropouts and reconnects gracefully.
