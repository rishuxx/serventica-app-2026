# SERVENTICA — Payment Lifecycle, Webhook Verification & Ledger

```text
1. ORDER CREATION
   - Customer initiates checkout
   - Backend calculates exact authoritative pricing breakdown
   - Razorpay Order created via server-to-server API with Idempotency Key
   - Order ID returned to mobile app

2. PAYMENT EXECUTION
   - Razorpay Checkout invoked on client
   - Customer completes UPI/Card/NetBanking payment
   - Razorpay client callback triggers UI feedback (PENDING confirmation)

3. AUTHORITATIVE WEBHOOK VERIFICATION
   - Razorpay server transmits `payment.captured` webhook to `/api/v1/payments/webhook`
   - NestJS verifies HMAC-SHA256 signature using Razorpay Webhook Secret
   - Booking transitioned to CONFIRMED
   - Double-entry ledger records gross customer debit & platform receivable

4. REFUNDS & DISPUTES
   - Cancellation triggered within free window
   - Automated refund order dispatched to Razorpay API
   - Ledger reversal entry created
```
