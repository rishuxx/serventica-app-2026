# SERVENTICA — PHONE OTP & SMS AUTHENTICATION SETUP GUIDE

This document describes the exact architecture, SMS provider requirements, and configuration steps for real phone OTP authentication in Serventica.

---

## 1. Provider Options Supported by Supabase

Supabase Auth supports native SMS gateway integration through several providers:
1. **Twilio** (Global standard, supports India via DLT template routing)
2. **MessageBird / Bird**
3. **Vonage**
4. **Textlocal** (Direct India DLT SMS provider)
5. **Fast2SMS** (Cost-effective for Indian domestic traffic)

---

## 2. Regulatory Requirements for India (DLT Compliance)

When sending SMS to Indian phone numbers (`+91`):
1. **Entity Registration**: Register the Serventica business entity on Telecom Operator DLT portals (e.g., VilPower, Jio DLT, Airtel DLT).
2. **Sender Header (Sender ID)**: Approve a 6-character alphabetic sender header (e.g., `SRVNTC`, `SERVEN`).
3. **SMS OTP Template**: Register and approve the transactional OTP message template:
   > `{#var#} is your Serventica verification code. Valid for 10 minutes. Please do not share this OTP with anyone.`
4. **PE ID & Template ID**: The approved Principal Entity ID and Template ID must be mapped to your SMS provider gateway.

---

## 3. Supabase Dashboard Configuration

### Location
👉 **Supabase Project Settings > Authentication > Providers > Phone**

### Configuration:
1. Toggle **Enable Phone provider** to `ON`.
2. Select your SMS provider (e.g., `Twilio` or `MessageBird`).
3. Fill in provider credentials:
   - **Account SID / API Key**
   - **Auth Token / Secret**
   - **Sender Number / Header**
4. Set OTP Expiry (Default: `600 seconds / 10 minutes`).
5. Set Rate Limiting to prevent abuse (e.g., max 5 SMS per phone number per hour).

---

## 4. Development vs Production Setup

- **Local / Dev Phase**: 
  - For local development without SMS costs, Supabase allows adding test phone numbers with fixed verification codes in **Auth > Providers > Phone > Test Phone Numbers** (e.g. `+919876543210` with code `123456`).
- **Production Phase**:
  - Requires approved DLT Entity, DLT Template, and live SMS provider account with credit balance.
