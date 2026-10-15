# Serventica Instant — State Machine Specifications
**Document ID:** `docs/instant/01-state-machine.md`  
**Phase:** Prompt 01 — State Transition & Integrity  
**Status:** Approved & Production-Ready  

---

## 1. Intent & Booking Lifecycle State Machine

```
              ┌───────────────┐
              │    CREATED    │
              └───────┬───────┘
                      │ Customer selects options
                      ▼
              ┌───────────────┐
              │    QUOTED     │
              └───────┬───────┘
                      │ Customer taps "Get Help Now"
                      ▼
              ┌───────────────┐
       ┌─────►│   MATCHING    │◄────────────────┐ Redispatch on
       │      └───────┬───────┘                 │ partner cancellation
       │              │                         │
       │              │ All N partners accept   │
       │              ▼                         │
       │      ┌───────────────┐                 │
       │      │   CONFIRMED   │─────────────────┘
       │      └───────┬───────┘
       │              │
       │              ▼
       │      ┌───────────────┐
       │      │  IN_PROGRESS  │
       │      └───────┬───────┘
       │              │ Service done & verified
       │              ▼
       │      ┌───────────────┐
       │      │   COMPLETED   │
       │      └───────────────┘
       │
       │ Timeout or All candidates reject
       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ UNFULFILLABLE │     │   CANCELLED   │     │    EXPIRED    │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## 2. BookingAssignment State Machine (Per Partner)

```
       ┌───────────┐
       │ ASSIGNED  │
       └─────┬─────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
┌───────────┐ ┌───────────┐
│ ACCEPTED  │ │ DECLINED  │
└─────┬─────┘ └───────────┘
      │ Partner taps "On the way"
      ▼
┌───────────┐
│ EN_ROUTE  │
└─────┬─────┘
      │ Partner reaches location / geofence
      ▼
┌───────────┐
│  ARRIVED  │
└─────┬─────┘
      │ Customer provides 4-digit OTP
      ▼
┌─────────────┐
│ IN_PROGRESS │
└─────┬───────┘
      │ Work done & notes/weight recorded
      ▼
┌─────────────┐
│  COMPLETED  │
└─────────────┘
```

---

## 3. Transition Rules & Guards

| Entity | From State | To State | Permitted Actor | Validation Guard | Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Intent** | `CREATED` | `QUOTED` | `SYSTEM` | Service serviceable; pricing rules active | Create versioned `Quote` record |
| **Intent** | `QUOTED` | `MATCHING` | `CUSTOMER` | Quote not expired; idempotency key valid | Create `dispatch_request`; trigger Wave 1 |
| **Assignment** | `ASSIGNED` | `ACCEPTED` | `PARTNER` | Offer not expired; partner status is `AVAILABLE` | Mark partner `BUSY`; sync primary partner to booking |
| **Assignment** | `ASSIGNED` | `DECLINED` | `PARTNER` | Offer active | Trigger next candidate in dispatch wave |
| **Assignment** | `ACCEPTED` | `EN_ROUTE` | `PARTNER` | Preceded by `ACCEPTED` | Broadcast ETA to customer; start GPS stream |
| **Assignment** | `EN_ROUTE` | `ARRIVED` | `PARTNER` | Distance $\le 200\text{m}$ (geofence verified) | Push notification to customer |
| **Assignment** | `ARRIVED` | `IN_PROGRESS` | `PARTNER` | Valid 4-digit verification OTP provided | Set `started_at = NOW()`; timer starts |
| **Assignment** | `IN_PROGRESS` | `COMPLETED` | `PARTNER` | Valid completion notes / verified weight | Create `booking_settlements` record |
| **Extension** | `REQUESTED` | `ACCEPTED` | `PARTNER` | No schedule conflict on partner's calendar | Recalculate duration; charge customer |
| **Extension** | `REQUESTED` | `DECLINED` | `PARTNER` | None | Notify customer; keep original end time |
