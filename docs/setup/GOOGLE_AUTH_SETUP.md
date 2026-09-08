# SERVENTICA — GOOGLE OAUTH AUTHENTICATION SETUP GUIDE

This guide details the exact configurations required to enable native **Google Sign-In** with Supabase Auth for Serventica.

---

## 1. Google Cloud Console Configuration

### Dashboard Location
👉 **Google Cloud Console:** `https://console.cloud.google.com/`

### Steps:
1. **Create/Select Google Cloud Project**:
   - Project Name: `Serventica Production` (or `Serventica Dev`)
2. **OAuth Consent Screen**:
   - User Type: `External`
   - App Name: `Serventica`
   - User Support Email: Support/Founder email
   - Developer Contact Info: Developer email
   - Scopes: `openid`, `email`, `profile`
3. **Credentials > Create Credentials > OAuth client ID**:
   - **Client 1: Web Application**
     - Name: `Serventica Web & Supabase Proxy`
     - Authorized Javascript Origins: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co`
     - Authorized Redirect URIs: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`
   - **Client 2: Android Application**
     - Package Name: `com.serventicaapp`
     - SHA-1 Certificate Fingerprint: Run `./gradlew signingReport` in `android/` directory to get debug & release keystore SHA-1.

---

## 2. Supabase Dashboard Configuration

### Dashboard Location
👉 **Supabase Project Settings > Authentication > Providers > Google**

### Settings:
1. Toggle **Enable Google provider** to `ON`.
2. **Client ID (for OAuth)**: Paste the Web Application Client ID created in Google Cloud.
3. **Client Secret (for OAuth)**: Paste the Web Application Client Secret created in Google Cloud.
4. Click **Save**.

---

## 3. Deep Linking & URL Redirects

In Supabase Dashboard: **Authentication > URL Configuration**:
- **Site URL**: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co`
- **Redirect URLs (Whitelisted)**:
  - `serventica://auth/callback`
  - `http://localhost:3000` (for API / Admin)

---

## 4. Distinction Matrix

| Setting | Required NOW (Local/Dev) | Required BEFORE Production |
| :--- | :--- | :--- |
| **Supabase Project ID & URL** | Yes | Yes |
| **Supabase Google Provider ON** | Yes | Yes |
| **Google Cloud Web OAuth ID & Secret** | Yes | Yes |
| **Android SHA-1 in Google Cloud** | Debug SHA-1 | Production Release Keystore SHA-1 |
| **OAuth Consent Verification (Google)** | Not needed (Test users only) | Mandatory Google App Verification |
