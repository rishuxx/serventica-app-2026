# SERVENTICA — AUTHENTICATION ARCHITECTURE & LIFECYCLE

This document details the production authentication architecture, session persistence model, customer identity relationships, and security guarantees in the Serventica platform.

---

## 1. Domain Separation of Identity

Serventica strictly separates **Authentication Identity** from **Application Customer Profile**:

```
+-----------------------------------------------------------+
|                      Supabase Auth                        |
|                       (auth.users)                        |
|          - id (UUID)                                      |
|          - email / phone                                  |
|          - encrypted_password / otp state                 |
+-----------------------------------------------------------+
                             |
                             | 1:1 Foreign Key (ON DELETE CASCADE)
                             v
+-----------------------------------------------------------+
|                       public.users                        |
|          - id (UUID, PK)                                  |
|          - email / phone                                  |
|          - display_name                                   |
|          - avatar_url                                     |
|          - status (ACTIVE, SUSPENDED, DEACTIVATED)        |
+-----------------------------------------------------------+
        |                                           |
        | 1:1                                       | 1:N
        v                                           v
+--------------------------------+       +-------------------+
|    public.customer_profiles    |       | public.user_roles |
|  - id (UUID)                   |       |  - user_id        |
|  - user_id                     |       |  - role           |
|  - first_name / last_name      |       +-------------------+
|  - onboarding_status           |
|  - default_address_id          |
+--------------------------------+
```

---

## 2. Authentication Lifecycle States

The Customer App implements an authoritative single-source-of-truth state machine:

1. **`INITIALIZING`**:
   - The application checks `@react-native-async-storage/async-storage` via `@supabase/supabase-js` for a cached session.
   - If a valid token or refresh token is available, the session is restored in the background without prompting the login screen.
2. **`UNAUTHENTICATED`**:
   - The user traverses `Splash` $\rightarrow$ `Login` $\rightarrow$ `OTP` or triggers Google OAuth.
   - Credentials or OTP tokens are submitted to Supabase Auth.
3. **`AUTHENTICATED`**:
   - The verified `Session` triggers the `Customer Bootstrap` flow.
   - Reads `public.users`, `public.customer_profiles`, and `public.user_roles`.
   - Mounts the protected navigation layer (`HomePlaceholderScreen`).
4. **`ERROR`**:
   - Explicit error handling for network failures, invalid OTP codes, rate limits, and unconfigured providers.

---

## 3. Session Persistence & Restart Handling

- **Storage**: Sessions are persisted securely in Android SharedPreferences / iOS Keychain via AsyncStorage.
- **Token Refresh**: `@supabase/supabase-js` manages automatic background token refreshing before JWT expiry.
- **Deep Linking**: `serventica://auth/callback` handles OAuth callbacks from external browser redirects.
- **Sign Out**: `authService.signOut()` clears local tokens, resets React Context state, and returns to `UNAUTHENTICATED`.

---

## 4. Security & Zero-Trust Rules

1. **No Service Role Keys in Client**: Mobile application bundles only contain the public publishable anon key.
2. **PostgreSQL Row Level Security (RLS)**:
   - Customers can only `SELECT` and `UPDATE` their own record (`auth.uid() = user_id`).
   - Customers cannot alter roles or elevated permissions.
   - Catalog data is public read-only for active services.
3. **Backend Validation**:
   - NestJS API validates Bearer JWT on every protected route (`SupabaseAuthGuard`).
   - Contextual user ID is derived on the server, never trusted from client request bodies.
