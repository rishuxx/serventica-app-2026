# SERVENTICA — Master Monorepo

Production-grade quick-commerce home services & on-demand workforce marketplace platform.

![Serventica Home Experience](docs/screenshots/serventica_hero_latest.png)

## Overview & Current State

### Customer App Home UI/UX Architecture
- **Full-Width Neon Top Hero**: Edge-to-edge immersive background (`lights.jpg`) with smooth curved bottom boundary (`borderBottomRadius: 36`).
- **Quick-Commerce Delivery Header**:
  - **Electric Delivery Timestamp**: Pure white electric bolt icon (`Zap`) with delivery estimate (`20 minutes`).
  - **Live Geolocation Fetching**: Automatically detects real device latitude/longitude with Android permissions, reverse-geocodes to neighborhood/city, and supports an interactive manual address picker modal.
  - **Profile & Quick Actions**: Compact account button and translucent frosted-glass search bar directly under the header.
- **Dynamic Promo & Service Showcase**:
  - Runs rotating banners, advertisements, and seasonal campaigns (`"Sit Back & Relax"`, `"Occasional Decors"`, `"Gardener On-Demand"`).
  - Clear hierarchy with prominent display title and Poppins description.
  - Compact CTA button (`Shop Now`).
- **Interactive Home Catalog**:
  - **Serventica Originals**: Featured seasonal offerings with discount badges.
  - **3 Core Pillars**: Services, Repairs, and OnDemand cards.
  - **Basics Grid**: Quick-access essential services (AC Repair, Electrician, Plumbing, RO Filter, Invertor, Cleaning, Washing Machine).
  - **Integrated Real-Time Search**: Instant indexed search overlay matching services and categories across the entire catalog.

---

## Monorepo Applications
- `apps/customer`: React Native Customer Mobile App (Android & iOS)
- `apps/partner`: React Native Partner Mobile App (Android & iOS)
- `apps/admin`: Next.js Operations & Catalog Portal
- `apps/api`: NestJS Core Platform API & Dispatch Engine

## Shared Packages
- `packages/types`: Canonical TypeScript domain contracts
- `packages/validation`: Zod request schemas
- `packages/design-system`: Light Theme tokens, Coolvetica & Poppins typography
- `packages/api-client`: Standardized REST/Realtime client
- `packages/analytics`: Event taxonomy & analytics schema
- `packages/config`: Environment configuration contracts
- `packages/utils`: Currency, math & date formatters

---

## Development & Running Locally

### Prerequisites
- Node.js 18+
- React Native CLI & Android SDK (API 34+)
- Android Emulator or connected physical device via ADB

### Starting the Metro Bundler
```bash
npm start
```

### Running on Android
```bash
npm run android
```

> **Fast Refresh Rule**: Keep Metro running during UI work. Native rebuilds (`gradlew clean`) are not needed for React / styling updates.

---

## Database Migrations
Supabase migrations are managed under `supabase/migrations/`:
- `20260908000001_serventica_foundation.sql`: Core schema, auth, bookings, service catalog.
- `20260908000002_home_catalog_and_search.sql`: Real search indexing, home feed categories, banners, and basics.
