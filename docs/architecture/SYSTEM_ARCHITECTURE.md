# SERVENTICA — System Architecture & Decision Record

## 1. Monorepo & System Topography
```text
serventica/
├── apps/
│   ├── customer/          # React Native Customer Mobile App (Android / iOS)
│   ├── partner/           # React Native Service Partner Mobile App (Android / iOS)
│   ├── admin/             # Next.js Operations & Catalog Portal
│   └── api/               # NestJS Core Business Logic & Dispatch Engine
├── packages/
│   ├── design-system/     # Shared tokens (Obsidian #161616, Gold #f7ca49), Atomic UI
│   ├── types/             # Canonical TypeScript Database & Domain Contracts
│   ├── config/            # Shared Environment & App Config
│   └── api-client/        # Type-safe API client wrapper
├── supabase/
│   ├── migrations/        # PostgreSQL + PostGIS Migrations & RLS Policies
│   └── seed/              # Seed data for categories, services, and zones
└── docs/                  # Living engineering & product documentation
```

## 2. Technology Selection Record (ADR-001)
- **Runtime & Language**: Node.js v22.17.0, TypeScript 5+, Hermes Engine.
- **Mobile Foundation**: React Native 0.87.1 with New Architecture (Fabric / TurboModules).
- **Backend Service Layer**: NestJS + TypeScript REST & Realtime gateway.
- **Database & Storage**: PostgreSQL 15+ via Supabase with PostGIS spatial extension.
- **Client State Management**: TanStack Query (Server Cache) + Zustand (Local Client UI State).
- **Validation**: Zod + React Hook Form.
