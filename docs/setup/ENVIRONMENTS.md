# SERVENTICA — ENVIRONMENT & RELEASE STRATEGY

This document specifies the multi-environment topology and security isolation rules for Serventica.

---

## 1. Environment Topology

```
┌───────────────────────────────┐
│     Serventica Development    │
│  - Local React Native App     │
│  - Dev Supabase: gzaihyh...   │
│  - Dev Database / Seed Data   │
└──────────────┬────────────────┘
               │
               ▼ (Tested & Version-controlled Migrations)
┌───────────────────────────────┐
│     Serventica Staging        │
│  - TestFlight / Internal Beta │
│  - Staging Supabase Project   │
│  - Sanitized Staging Data     │
└──────────────┬────────────────┘
               │
               ▼ (Automated CI/CD & Security Gate)
┌───────────────────────────────┐
│     Serventica Production     │
│  - Play Store / App Store     │
│  - Dedicated Prod Supabase    │
│  - Strict RLS & Daily Backups │
└───────────────────────────────┘
```

---

## 2. Environment Variables & Secret Isolation

1. **Client Application (`apps/customer`)**:
   - **Allowed**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTH_CALLBACK_SCHEME`.
   - **STRICTLY PROHIBITED**: `SUPABASE_SERVICE_ROLE_KEY`, Database Passwords, Payment Gateway Private Keys, SMS Provider Tokens.

2. **Backend API (`apps/api`)**:
   - Holds `SUPABASE_SERVICE_ROLE_KEY` securely in memory on the server.
   - Evaluates business rules, privileged calculations, partner payouts, and dispatch actions.

---

## 3. Migration Policy

- **Never manually edit tables in the Supabase Dashboard UI for production.**
- All changes must be added as timestamped SQL files under `supabase/migrations/`.
- Migrations are tested against development before promotion.
