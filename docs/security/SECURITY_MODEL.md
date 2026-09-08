# SERVENTICA — Security Model & Data Protection

## 1. Secrets & Credentials Zero-Trust Policy
- **Mobile Applications Zero Secrets**: Never package Supabase Service Role keys, Razorpay secret keys, SMS gateway tokens, or signing secrets into the React Native client apps.
- **Client Key Restriction**: Mobile apps only possess the Supabase Anon Public Key and connect via the authoritative NestJS API for sensitive business logic.

## 2. Authentication & Session Management
- **Phone OTP Flow**: Multi-tenant OTP validation using cryptographic hash checks and brute-force rate-limiting (max 3 attempts per 5 minutes per IP/number).
- **JWT Lifecycles**: Access Tokens (15 min expiry) + Refresh Tokens stored in secure hardware-backed keystore (Keychain / KeyStore).

## 3. Webhook Security & Idempotency
- **Razorpay Signature Verification**: All payment webhook events verified using HMAC-SHA256 signatures before updating payment or booking status.
- **Double-Spending Prevention**: Idempotency keys enforced on order creation and ledger balance updates.

## 4. Personally Identifiable Information (PII)
- Partner Aadhaar/PAN documents stored in encrypted private Supabase Storage buckets with temporary signed URLs only accessible to authorized verification agents.
