# Serventica Master System Architecture Audit & Baseline Report

## Executive Summary
This report establishes the verified technical baseline of the Serventica Home-Services Marketplace codebase (`C:\dev\serventica-app`) in accordance with Phase A of the engineering mandate. 

The repository is structured as a **modular monolith** with 3 applications (`apps/customer`, `apps/api`, `apps/admin`) and 7 domain/infrastructure packages (`packages/types`, `packages/validation`, `packages/config`, `packages/design-system`, `packages/api-client`, `packages/utils`, `packages/analytics`), managed by Turborepo and npm workspaces. The persistence layer comprises 23 sequential PostgreSQL migrations on Supabase, featuring PostGIS, Row Level Security, transactional RPCs, and an append-only event ledger.

The core instant fulfillment domain is mature and rigorously verified: 60 automated tests pass across unit, socket, and end-to-end suites. The primary baseline failure identified is an isolated configuration conflict in the backend test runner (`apps/api` inheriting React Native Babel presets during full monorepo test runs).

---

## 1. Verified Baseline Execution

| Check | Tool / Command | Exit Code | Result | Evidence |
| :--- | :--- | :---: | :---: | :--- |
| **Workspace Compilation** | `npm run typecheck` | 0 | **PASS** | 10 of 10 packages compiled with 0 TypeScript errors. |
| **Instant Fulfillment Domain** | `npm run test:instant` | 0 | **PASS** | 5 suites, 60 tests passed (state machine, dispatch waves, outbox, sockets). |
| **Monorepo Global Test** | `npm run test` | 1 | **FAIL** | `apps/api` crashed during Jest discovery due to missing Node-specific Jest preset. |
| **Database Migrations** | Static SQL Audit | 0 | **PASS** | 23 migrations verified with consistent constraints and RLS. |
| **Mobile Runtime Environment** | Metro / Android Dev Server | 0 | **RUNNING** | Port 8087 active, Android emulator running. |

---

## 2. Architecture & Domain Inventory Artifacts
In compliance with Section 2.1 of the mandate, the following architectural artifacts have been authored in `docs/architecture/`:
1. [system-inventory.md](file:///c:/dev/serventica-app/docs/architecture/system-inventory.md): Full breakdown of applications, packages, entry points, and workspace topology.
2. [current-state.md](file:///c:/dev/serventica-app/docs/architecture/current-state.md): Baseline check logs, tool versions, and defect analysis.
3. [endpoint-inventory.md](file:///c:/dev/serventica-app/docs/architecture/endpoint-inventory.md): Complete catalog of REST controllers, WebSocket events, and PostgreSQL RPCs.
4. [database-inventory.md](file:///c:/dev/serventica-app/docs/architecture/database-inventory.md): Migration history, schema tables, constraints, and RLS policies.
5. [risk-register.md](file:///c:/dev/serventica-app/docs/architecture/risk-register.md): Prioritized P0-P3 risks, impacts, and remediation plans.
6. [implementation-ledger.md](file:///c:/dev/serventica-app/docs/architecture/implementation-ledger.md): Phase-by-phase task tracking ledger with status vocabulary.

---

## 3. Key Findings & Root Cause Analysis

### Finding 1: Test Runner Preset Misconfiguration (Priority P2)
- **Component**: `apps/api`
- **Root Cause**: `apps/api/package.json` specifies `"test": "jest --passWithNoTests"`. Since `apps/api` lacks its own `jest.config.js`, Jest falls back to the monorepo root `jest.config.js`, which uses `@react-native/jest-preset`. When Babel attempts to parse TypeScript NestJS decorators (`@Controller`, `@Injectable`) with the React Native JSX preset, it throws a syntax error.
- **Remediation**: Create a standalone `apps/api/jest.config.js` with `ts-jest` targeting Node.js.

### Finding 2: Scheduled Booking Slot Reservation Concurrency (Priority P1)
- **Component**: `FulfillmentController` & Database availability engine
- **Root Cause**: Scheduled slot reservation validates available partner capacity via application-level queries without transactional exclusion locks.
- **Remediation**: Implement a PostgreSQL transactional RPC (`reserve_scheduled_slot`) using row locks (`SELECT ... FOR UPDATE`) or a partial unique index on active slot reservations.

### Finding 3: Incomplete Administrative Web Application Scaffolding (Priority P2)
- **Component**: `apps/admin`
- **Root Cause**: Build scripts in `apps/admin/package.json` are placeholders. The operational admin frontend has not yet been connected to the backend admin endpoints (`apps/api/src/admin`).
- **Remediation**: Wire the Next.js administrative dashboard to the backend admin API in Phase E.

---

## 4. Release Decision & Next Actions
- **Release Decision**: **CONDITIONALLY READY (DEV/STAGING BASELINE VERIFIED)**.
  - Core Instant Fulfillment domain, state machine, outbox, and socket gateway are fully functional and pass all tests.
  - Production readiness requires resolving the monorepo test runner configuration (P2) and hardening scheduled slot concurrency (P1).
- **Next Phase**: **Phase B — Foundational Correctness** (Fixing `apps/api` Jest configuration, centralizing config validation, and verifying RLS policies).
