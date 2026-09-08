# SERVENTICA — Monorepo & Directory Structure

```text
serventica/
├── apps/
│   ├── customer/              # Customer Mobile Application (React Native)
│   ├── partner/               # Partner Mobile Application (React Native)
│   ├── admin/                 # Admin & Operations Web Portal (Next.js)
│   └── api/                   # Core Business Logic & Dispatch (NestJS)
├── packages/
│   ├── types/                 # Shared Canonical TypeScript Entities & Contracts
│   ├── validation/            # Shared Request Validation Schemas (Zod)
│   ├── api-client/            # Shared REST/Realtime Client
│   ├── design-system/         # Shared Tokens & UI Primitives (Light Theme default)
│   ├── analytics/             # Taxonomy & Event Types
│   ├── config/                # Environment & Configuration Contracts
│   └── utils/                 # Shared Formatters & Math Utilities
├── supabase/
│   ├── migrations/            # PostgreSQL & PostGIS Schema Migrations
│   ├── functions/             # Supabase Edge Functions (e.g. background alerts)
│   ├── seed/                  # Seed Data for Initial Launch
│   └── config/                # Local Supabase CLI Config
└── docs/                      # Comprehensive Architecture & Product Specs
```
