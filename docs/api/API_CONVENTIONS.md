# SERVENTICA — API Architecture & Contracts

## 1. Conventions & Standards
- **Protocol**: HTTPS REST JSON APIs (Base: `/api/v1`).
- **Authentication**: JWT Bearer Tokens in `Authorization: Bearer <token>` header.
- **Idempotency**: Critical mutation endpoints (`/bookings`, `/payments/orders`) support `Idempotency-Key` header to prevent duplicate execution.

## 2. Standardized Response Envelope
All API endpoints return a standardized envelope. Internal stack traces are never exposed to clients.

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  },
  "requestId": "req_88f921ab0"
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_SLOT_UNAVAILABLE",
    "message": "The selected service slot is no longer available.",
    "details": {
      "slot": "2026-09-08T14:00:00Z"
    }
  },
  "requestId": "req_88f921ab0"
}
```

## 3. Core API Modules
- `/api/v1/auth` (OTP request, OTP verify, refresh, logout)
- `/api/v1/catalog` (Categories, services, variants, add-ons)
- `/api/v1/location` (Serviceability verification via PostGIS)
- `/api/v1/pricing` (Authoritative price calculation engine)
- `/api/v1/cart` (Cart items management and pre-validation)
- `/api/v1/bookings` (Booking state lifecycle and scheduling)
- `/api/v1/payments` (Razorpay order creation and webhook verification)
- `/api/v1/partner` (Partner job reception, navigation, status updates)
- `/api/v1/admin` (Operations, dispatch overrides, and catalog controls)
