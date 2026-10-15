# 09 — RESIDUAL RISKS & LIMITATIONS

## 1. Unresolved & Accepted Residual Risks

| Risk Area | Risk Description | Likelihood | Impact | Recommended Future Action |
|---|---|---|---|---|
| **Mobile Token Storage** | Supabase session refresh tokens remain stored in plaintext AsyncStorage on client devices. | Medium | High | Replace `SafeAsyncStorage` with `react-native-keychain` or `expo-secure-store` before public app store launch. |
| **Reverse Proxy IP Trust** | Advisory in `proxy-addr` (GHSA-jqcg-44mw-7w3h) presents an IP spoofing risk if multi-hop proxies pass untrusted headers. | Low | Medium | Enforce strict single-hop reverse proxy stripping at Cloudflare/NGINX. |
| **Android Release Proguard** | Proguard/R8 minification is currently disabled (`enableProguardInReleaseBuilds = false`). | Medium | Low | Enable Proguard in `android/app/build.gradle` for production builds to hinder reverse engineering. |
| **Third-Party Rate Limits** | External Google Places and Mapbox geocoding APIs have usage-based quotas. | Medium | Medium | Maintain client-side debounce (already active at 350ms) and enforce backend route caching. |

---

## 2. Assessment Limitations & Exclusions

1. **Production Infrastructure Penetration Testing**:
   - In accordance with **Rule D**, no denial-of-service, flood testing, or brute-force testing was performed against the live Supabase project `gzaihyhglxelrahoopju` or Razorpay production endpoints.
2. **Local Docker Offline**:
   - Because the local Docker daemon was offline, tests were executed using isolated unit and integration mocks and read-only PostgreSQL catalog queries rather than local ephemeral database containers.
3. **Third-Party Provider Console Settings**:
   - Google Cloud Platform IAM and Cloud Console API restrictions cannot be checked purely through local files; manual verification in the console is required.
