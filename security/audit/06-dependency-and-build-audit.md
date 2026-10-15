# 06 — DEPENDENCY & BUILD PIPELINE AUDIT

## 1. Supply-Chain & Dependency Analysis

An execution of `npm audit` across the monorepo root and workspace packages identified **82 advisories**:
- **Critical**: 2
- **High**: 66
- **Moderate**: 14
- **Low**: 0

### Critical Advisories Analyzed:

1. **`proxy-addr` — IP Spoofing Vulnerability (GHSA-jqcg-44mw-7w3h)**
   - **Severity**: Critical (CVSS 8.6)
   - **Mechanism**: Vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet parsing.
   - **Relevance & Reachability**: Reachable in Express / NestJS if `app.set('trust proxy', true)` is configured with IP ranges. Currently, `apps/api/src/main.ts` does not bind `trust proxy` to broad subnets.
   - **Remediation Requirement**: Upstream Express ecosystem update; in deployment, ensure Cloudflare/NGINX sanitizes `X-Forwarded-For` before proxying to NestJS.

2. **`shell-quote` — Command Injection via Line Terminator (GHSA-pqg4-j6r4-53mv)**
   - **Severity**: Critical (CVSS 8.1)
   - **Relevance & Reachability**: Transitive dependency pulled in via `@react-native-community/cli` / build tools. It is **not reachable at runtime** in customer mobile binaries or in the NestJS production server process.

---

## 2. Native Mobile Build Configuration Review

### Android Platform Security:

1. **Cleartext Traffic**:
   - `android:usesCleartextTraffic="${usesCleartextTraffic}"` in `AndroidManifest.xml`.
   - Controlled via Gradle debug/release property. In release mode, cleartext HTTP is prohibited by default on Android 9+ (API 28+).
2. **Backup Configuration**:
   - `android:allowBackup="false"` in `AndroidManifest.xml` (Best Practice: prevents ADB backup data extraction).
3. **Signing Keystore**:
   - `android/app/build.gradle` signs release builds with `debug.keystore`:
     ```groovy
     release {
         signingConfig signingConfigs.debug
     }
     ```
   - **Action Required**: Before Play Store upload, generate a private production upload keystore and store credentials in secure CI environment variables.
4. **Code Obfuscation**:
   - `def enableProguardInReleaseBuilds = false` in `android/app/build.gradle`.
   - **Action Required**: Set to `true` for release builds to enable R8 shrinking and obfuscation, deterring reverse engineering.

---

## 3. iOS Platform Security:
1. **App Transport Security (ATS)**:
   - `NSAllowsArbitraryLoads` is set to `false` in `ios/ServenticaApp/Info.plist`. All network traffic is strictly enforced over TLS 1.2+.
2. **Privacy Manifest**:
   - `ios/ServenticaApp/PrivacyInfo.xcprivacy` is present to comply with Apple third-party SDK privacy declaration requirements.
