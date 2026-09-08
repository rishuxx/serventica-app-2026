# SERVENTICA — End-to-End Customer Booking & Service Lifecycle

```text
1. DISCOVERY & LOCATION
   - Customer opens app
   - Coordinates checked against PostGIS service zones
   - Dynamic catalog rendered for active zone

2. SELECTION & CART
   - Service customized with variant/add-ons
   - Authoritative pricing breakdown computed by backend

3. SCHEDULING & ADDRESS
   - Saved address selected / new address pinned
   - Dynamic time slot selected based on partner capacity

4. PAYMENT & CONFIRMATION
   - Razorpay payment order generated
   - Signature verified via webhook
   - Booking marked CONFIRMED

5. DISPATCH & SERVICE EXECUTION
   - Nearby eligible partners receive dispatch request (45s window)
   - Partner accepts, navigates to customer, enters Start OTP
   - Partner executes service checklist

6. COMPLETION & REVIEW
   - Customer verifies completion, rates service, submits feedback
   - Payment settled and partner earning recorded in ledger
```
