# Serventica System Inventory & Architecture Reconnaissance

## 1. Executive Metadata
- **Project**: Serventica Home-Services Marketplace Platform
- **Audited Repository**: `C:\dev\serventica-app`
- **Architecture Paradigm**: Modular Monolith with Workspace Packages and Domain Isolation
- **Package Manager**: `npm@11.4.2` (`workspaces: ["apps/*", "packages/*"]`) orchestrated with `turborepo v2.10.12`
- **Node.js Target**: `>= 22.11.0` (Active Node: 22.x)
- **Database / Auth Engine**: PostgreSQL on Supabase (`gzaihyhglxelrahoopju.supabase.co`) with 23 migrations, pgvector, PostGIS, RLS, transactional RPCs.

---

## 2. Monorepo Structure & Applications

```
C:\dev\serventica-app
├── App.tsx                     # Mobile Root Composition & Customer Routing
├── apps/
│   ├── admin/                  # Administrative Web Platform (@serventica/admin - Next.js 15)
│   ├── api/                    # Core Backend Engine (@serventica/api - NestJS 11/12, Socket.io, REST)
│   └── customer/               # Customer Mobile Application (@serventica/customer - React Native 0.86 / Expo 57)
├── packages/
│   ├── analytics/              # Telemetry & event tracking contracts
│   ├── api-client/             # Typed API consumption client
│   ├── config/                 # Shared environment, brand, constants configuration
│   ├── design-system/          # Core tokens, color palette, typography definitions
│   ├── types/                  # Authoritative TypeScript domain interfaces & models
│   ├── utils/                  # Deterministic mathematical & string helpers
│   └── validation/             # Zod & class-validator runtime assertion schemas
├── supabase/
│   ├── migrations/             # 23 forward-only migration scripts (Foundation to Instant v1)
│   ├── config/                 # Supabase local environment config
│   └── seed/                   # Seed fixtures for categories, catalog, and test geographies
└── docs/
    ├── architecture/           # System design specifications & runbooks
    ├── instant/                # State machine & instant fulfillment architecture
    └── operations/             # Deployment and operational documentation
```

---

## 3. Applications Deep Dive

### 3.1 Customer Mobile Application (`apps/customer` & Root `App.tsx`)
- **Framework**: React Native 0.86.3 / React 19.2.3 with Expo 57.0.24 ecosystem modules (`@rnmapbox/maps`, `lottie-react-native`, `expo-location`).
- **Entry Points**: 
  - Root: [App.tsx](file:///c:/dev/serventica-app/App.tsx)
  - Features: [apps/customer/src/features](file:///c:/dev/serventica-app/apps/customer/src/features)
- **Primary Modules**:
  - `home`: Dynamic category carousel, flash-deals banner, instant service tiles (Helping Hand, Road Help).
  - `instant`: Real-time socket-backed instant fulfillment pipeline, ETA calculation, live tracking map.
  - `cart`: Multi-service booking cart, slot selection, price calculation summary.
  - `account`: Customer profile, saved addresses, authentication state.
- **State Management & Contexts**:
  - `AuthContext`: Phone OTP authentication via Supabase Auth, session caching.
  - `LocationContext`: Geolocation acquisition, active serviceable city detection.
  - `CartContext`: Transient cart item management with pricing breakdown.

### 3.2 Backend API Service (`apps/api`)
- **Framework**: NestJS 11.x (`@nestjs/core`, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/throttler`).
- **Network Interfaces**:
  - REST API: Port 3000 (standardized route prefixing with `/api/v1/` and legacy aliases).
  - WebSockets: Socket.io Gateway `TrackingGateway` (`/tracking` namespace) for real-time customer-partner room synchronization.
- **Core Modules**:
  - `fulfillment`: Instant and scheduled booking state machines, partner dispatching, wave-based assignment algorithms.
  - `partner`: Partner presence, heartbeat telemetry, location streaming, offer acceptance/rejection.
  - `finance`: Ledger accounts, double-entry transactional settlements, refund auditing.
  - `customers`: Customer profile hydration, saved addresses.
  - `admin`: Operational marketplace intervention, partner verification approval, live dispatch monitoring.
  - `health`: Liveness and readiness probes (`/health`).

### 3.3 Admin Platform (`apps/admin`)
- **Framework**: Next.js 15.2.0 (`@serventica/admin`), React 19.0.0.
- **Status**: Scaffolding initialized. Core administrative REST controller endpoints exist in `@serventica/api/src/admin`.

---

## 4. Shared Packages (`packages/*`)

| Package | Purpose | Build / Check Status |
| :--- | :--- | :--- |
| `@serventica/types` | Unified data contracts across mobile, web, and server | Verified (`tsc --noEmit` PASS) |
| `@serventica/validation` | Runtime input validation (instant fulfillment, bookings) | Verified (`tsc --noEmit` PASS) |
| `@serventica/config` | Shared environmental variables and operational constants | Verified (`tsc --noEmit` PASS) |
| `@serventica/design-system` | Lexend typography tokens, color schemes, spacing | Verified (`tsc --noEmit` PASS) |
| `@serventica/api-client` | Typed client wrapper for backend API calls | Verified (`tsc --noEmit` PASS) |
| `@serventica/utils` | Pure calculation functions (geo distance, date formatting) | Verified (`tsc --noEmit` PASS) |
| `@serventica/analytics` | Telemetry event schema contracts | Verified (`tsc --noEmit` PASS) |

---

## 5. Security & Authentication Posture
- **Identity Provider**: Supabase Auth (GoTrue) using Phone SMS OTP.
- **Client Key Isolation**: Only `EXPO_PUBLIC_SUPABASE_ANON_KEY` is exposed to mobile applications.
- **Server Authority**: Service-role privileges reserved exclusively for backend server environments (`apps/api`).
- **Database RLS**: Active RLS on tables (`bookings`, `payments`, `service_prices`, `partner_presence_sessions`, `dispatch_offers`).
