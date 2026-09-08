# SERVENTICA — BACKEND & API ARCHITECTURE

This document describes the design, security boundaries, and communication contracts of the NestJS backend API (`apps/api`).

---

## 1. Architecture Overview

```
+--------------------------+
|  React Native (Customer) |
+--------------------------+
             |
             | Authorization: Bearer <Supabase-JWT>
             v
+--------------------------+
|      NestJS Backend      |
|        (apps/api)        |
+--------------------------+
             |
             | Service Role / Direct PostgreSQL
             v
+--------------------------+
|   PostgreSQL / Supabase  |
+--------------------------+
```

---

## 2. API Security & Identity Derivation

1. **SupabaseAuthGuard**:
   - Validates Bearer tokens on protected endpoints.
   - Derives contextual authenticated identity (`req.user.id`).
   - Prevents client-spoofed `userId` parameters from being trusted.
2. **Authoritative Operations**:
   - The backend alone calculates authoritative pricing, discounts, and fees.
   - Mobile app totals are never accepted blindly without server verification.
   - Partner assignments and booking transitions are validated against the state machine.

---

## 3. Standardized Error Response Format

All exceptions and validation errors conform to the canonical `ApiErrorResponse` interface:

```json
{
  "code": "ERR_401",
  "message": "Missing or invalid Authorization header",
  "requestId": "req_1725777600000",
  "statusCode": 401,
  "timestamp": "2026-09-08T06:20:00.000Z"
}
```

---

## 4. Modules Implemented

- `Auth / Security Guard`: `apps/api/src/common/guards/supabase-auth.guard.ts`
- `Global Exception Filter`: `apps/api/src/common/filters/http-exception.filter.ts`
- `Customer Bootstrap`: `apps/api/src/customers/customers.controller.ts`
- `Root Module & Server Bootstrap`: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`
