# Serventica Current State & Baseline Health Report

## 1. Baseline Execution Summary

| Check Category | Command Executed | Result | Notes / Details |
| :--- | :--- | :--- | :--- |
| **Monorepo Typecheck** | `npm run typecheck` (`turbo run typecheck`) | **PASS** (10/10 packages) | 0 compilation errors across mobile, API, admin, and 7 shared packages. |
| **Instant Domain Tests** | `npm run test:instant` | **PASS** (5/5 suites, 60/60 tests) | Full E2E & unit coverage for Instant state machine, socket pipeline, wave dispatch, and outbox. |
| **Monorepo Test Suite** | `npm run test` (`turbo run test`) | **FAIL** (Exit code 1) | `apps/api` root Jest execution crashed due to Babel preset conflict (Babel trying to parse TS decorators as JSX). |
| **Database Migrations** | Static Migration Audit (23 files) | **PASS** | Valid sequential timestamp migrations with idempotent `CREATE TABLE IF NOT EXISTS` and RLS definitions. |
| **Mobile Runtime Environment** | Android Dev Server Check | **RUNNING** | Active Expo/Metro process on port 8087, Android emulator process running. |

---

## 2. Baseline Defect & Mismatch Findings

### 2.1 P2 Defect: Jest Configuration Conflict in `apps/api`
- **Component**: `apps/api/package.json` and Root `jest.config.js`
- **Symptom**: Running `npm test` runs `turbo run test`. `apps/api` runs `jest --passWithNoTests`, which inherits the root React Native Jest preset (`@react-native/jest-preset`), causing Babel parse errors on NestJS decorators (`@Controller`, `@Injectable`).
- **Impact**: Full monorepo CI test command fails despite all underlying tests passing when executed with proper ts-jest / nest-test configurations.
- **Root Cause**: Missing dedicated `apps/api/jest.config.js` overriding the root React Native preset.
- **Remediation**: Provide a dedicated `jest.config.js` inside `apps/api` pointing to `ts-jest` for Node.js backend testing.

### 2.2 P2 Defect: Admin App Scaffolding Incompleteness
- **Component**: `apps/admin`
- **Symptom**: `apps/admin/package.json` scripts (`dev`, `build`, `typecheck`) are dummy `node -e` or `echo 0` commands.
- **Impact**: Operational admin dashboard cannot be run standalone yet, though backend admin controllers exist.
- **Remediation**: Retain modular monolith boundary; wire administrative Next.js dashboard to `apps/api/src/admin` endpoints in Phase E/F.

### 2.3 P1 Architectural Risk: Concurrency Race in Slot Reservations
- **Component**: Scheduled booking slot reservations in `20260913000001_phase5_serviceability_availability_engine.sql`
- **Finding**: Scheduled slot booking relies on application-level read-before-write without database row locks (`SELECT FOR UPDATE`) or advisory locks. Under concurrent booking spikes, two users selecting the same slot could cause double-booking.
- **Remediation**: Implement transactional atomic slot reservation with database-enforced exclusion constraints or `FOR UPDATE` locking.
