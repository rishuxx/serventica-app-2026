# 04 — SECRETS & ENVIRONMENT AUDIT

## 1. Secret & Configuration Inventory (Values Redacted)

| Variable / Identifier | Exposure Scope | Classification | Recommended Location | Action Required |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Client & Server | Public Configuration | `.env` / Client Bundle | None (Required for client RPC connectivity). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Restricted Public Token | `.env` / Client Bundle | Safe with RLS; must not have bypass policies. |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Client Native Bundle | Restricted Public Token | `.env` / Client Bundle | Restrict allowed URLs/bundles in Mapbox account. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Client Native Bundle | Restricted Public Token | `.env` / Manifest Placeholder | Add Android package name & SHA-1 restriction in Google Cloud Console. |
| `RAZORPAY_KEY_ID` | Client & Server | Public Merchant Key | `.env` | Safe as public test merchant identifier. |
| `RAZORPAY_KEY_SECRET` | Backend Server Only | **Private Secret** | Server Environment / Secret Manager | Must NEVER enter client builds or Git. |
| `MAPBOX_DOWNLOADS_TOKEN` | Build Time Only | **Private Secret** | `~/.gradle/gradle.properties` / CI Secret | Private build secret for SDK downloads. Verify not in git. |

---

## 2. Historical & Tracked Repository Audit

1. **Git Tracked Environment Files**:
   - `.env.example` is committed and clean (contains placeholders only).
   - `.env` is properly ignored in `.gitignore`.
2. **Hardcoded Strings in Code**:
   - Google Maps API key `AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g` was detected in 6 source files and AndroidManifest. Remediated in `packages/config/src/index.ts` to favor dynamic environment injection.
   - Razorpay Test Key `rzp_test_TdYpNoPP7IoSJR` was previously hardcoded; now parameterized with fallback.
3. **Artifact Exposure in Git**:
   - `apps/api/dist/` is tracked in Git, including `.js.map` source maps.
   - **Recommendation**: Add `apps/api/dist/` to `.gitignore` and remove it from repository tracking to prevent exposing backend implementation details.

---

## 3. Credential Rotation Requirements

| Credential | Reason for Rotation | Priority | Procedure |
|---|---|---|---|
| **Google Maps API Key** (`AIzaSy...`) | Exposed in multiple repository commits | MEDIUM | 1. Generate new restricted key in Google Cloud Console.<br>2. Restrict to Android app `com.serventicaapp` with release SHA-1.<br>3. Delete or disable old key once deployed. |
| **Razorpay Test Merchant Keys** | Hardcoded in test scripts & config | LOW | Safe for sandbox testing; ensure production Live Key (`rzp_live_...`) is injected solely in production server environment. |
