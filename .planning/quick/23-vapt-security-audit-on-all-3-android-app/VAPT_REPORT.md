# VAPT Security Audit Report - Dollor.ai Android Apps

**Date:** 2026-02-22
**Auditor:** Claude AI (GSD Quick Task 23)
**Scope:** All 4 Android modules (app/, driver/, partner/, shared/)
**Standard:** OWASP Mobile Top 10 (2024)
**Android Repo:** `/Users/jeet/StudioProjects/eatfair-android`

---

## Executive Summary

A comprehensive Vulnerability Assessment and Penetration Testing (VAPT) audit was performed across all 4 Dollor.ai Android modules. The audit covered 15 security categories aligned with OWASP Mobile Top 10.

**Key findings:**
- 1 Critical vulnerability: OkHttp logging at Level.BODY in ALL builds (debug + release) exposes auth tokens, passwords, and PII in logcat
- 3 High severity issues: Missing ProGuard log stripping in driver/partner apps, sensitive PII logged in multiple source files
- 5 Medium severity issues: No SSL pinning, AppConfig static tokens, no root detection, no FLAG_SECURE, plaintext SharedPreferences for non-sensitive data
- 2 Low severity issues: google-services.json tracked in git, no shared module minification
- 3 Info findings: Google Web Client ID hardcoded (public/acceptable), println in test files only, appropriate permissions

**Overall posture:** GOOD foundation (EncryptedSharedPreferences, cleartextTraffic=false, allowBackup=false, exported=false on services, R8 minification) with critical logging vulnerability requiring immediate fix.

---

## Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1     | WILL FIX (Task 2) |
| High     | 3     | WILL FIX (Task 2) |
| Medium   | 5     | DOCUMENTED (deferred) |
| Low      | 2     | DOCUMENTED |
| Info     | 3     | Acceptable |
| N/A      | 1     | Not applicable |
| **Total** | **15** | |

---

## Detailed Findings by Category

### 1. Hardcoded Secrets / API Keys

**Status:** PASS (with info note)
**Severity:** Info
**Fix Status:** N/A - Acceptable

**Findings:**
- `GOOGLE_WEB_CLIENT_ID` hardcoded in 3 locations:
  - `app/build.gradle.kts:69` - `"65740760476-31o2a074qeh2nsc6hlbt8peqpmivmq32.apps.googleusercontent.com"`
  - `driver/build.gradle.kts:63` - same value
  - `partner/build.gradle.kts:61` - same value
  - `shared/.../TokenRefreshInterceptor.kt:41` - `WEB_CLIENT_ID` constant
- Google Web Client IDs are PUBLIC by design (used in client-side OAuth flow). This is NOT a secret.

**Verified NOT present:**
- No `sk_live_*` or `sk_test_*` (Stripe secret keys)
- No `AKIA*` (AWS access keys)
- No hardcoded JWT secrets
- No hardcoded passwords in source (only field labels like "Password" in UI and test files)
- No `AIza*` hardcoded API keys (Google Maps key loaded from `local.properties` via `BuildConfig`)
- `Bearer` usage is dynamic header construction only (`"Bearer $token"` patterns), not hardcoded tokens

**Recommendation:** Current approach is correct. Secrets are in `local.properties` (gitignored) and loaded via `BuildConfig`.

---

### 2. Insecure Data Storage

**Status:** MOSTLY PASS
**Severity:** Medium
**Fix Status:** DOCUMENTED (deferred)

**Findings:**
- **GOOD:** Primary token/PII storage uses `EncryptedSharedPreferences` with AES256_GCM (`SecureStorage.kt:29-35`)
- **GOOD:** MasterKey uses `AES256_GCM` scheme (`SecureStorage.kt:25-27`)
- **GOOD:** Thread-safe with `ReentrantReadWriteLock` (`SecureStorage.kt:38-40`)
- **CONCERN (Medium):** Partner `NotificationsViewModel.kt:62` uses plain `getSharedPreferences("partner_notifications", MODE_PRIVATE)` for notification data. This stores notification titles, messages, and order details in plaintext. While notifications are not highly sensitive, they may contain customer names and order IDs.
- No `MODE_WORLD_READABLE` or `MODE_WORLD_WRITEABLE` usage found.

**Recommendation:** Consider migrating `partner_notifications` prefs to EncryptedSharedPreferences or DataStore with encryption for defense-in-depth. Low priority since data is app-private (MODE_PRIVATE) and not auth tokens.

---

### 3. Insecure Network Communication

**Status:** MOSTLY PASS
**Severity:** Medium (SSL pinning absence)
**Fix Status:** DOCUMENTED (deferred)

**Findings:**
- **GOOD:** All 3 apps have `network_security_config.xml` with `cleartextTrafficPermitted="false"` (`app/res/xml/network_security_config.xml:4`, `driver/res/xml/network_security_config.xml:4`, `partner/res/xml/network_security_config.xml:4`)
- **GOOD:** All manifests reference `android:networkSecurityConfig="@xml/network_security_config"`
- **GOOD:** API base URL is HTTPS: `https://api.dollor.ai/api` (`AppConfig.kt:41`)
- **NO SSL PINNING:** Comment at `SharedModule.kt:59` says "Certificate pinning can be added" - confirms absent. No `CertificatePinner` in OkHttp, no `pin-set` in network_security_config.xml.
- **http:// URLs found:** Only in test/comment contexts and WebSocket URL conversion:
  - `ChatService.kt:102` and `NegotiationService.kt:107` - `.replace("http://", "ws://")` (protocol conversion utility, not insecure)
  - Test files only reference `http://d.android.com/tools/testing`

**Recommendation:** Add SSL certificate pinning for `api.dollor.ai` in `network_security_config.xml` with pin-set. This prevents MITM attacks even with compromised CA certificates. Standard for financial apps.

---

### 4. Improper Authentication / Token Handling

**Status:** MOSTLY PASS
**Severity:** Medium (AppConfig static tokens)
**Fix Status:** DOCUMENTED (deferred)

**Findings:**
- **GOOD:** Primary token storage in `SecureStorage.kt` using EncryptedSharedPreferences
- **GOOD:** Token refresh interceptor (`TokenRefreshInterceptor.kt`) handles 401 with silent Google re-auth
- **GOOD:** Auth cleared on re-auth failure (`TokenRefreshInterceptor.kt:106-108`)
- **GOOD:** `SecureStorage.clearAll()` clears everything on logout (`SecureStorage.kt:543-550`)
- **CONCERN (Medium):** `AppConfig.kt:32-37` has static mutable token variables:
  ```kotlin
  var currentVendorId: Int? = null
  var vendorToken: String? = null
  var currentDriverId: Int? = null
  var driverToken: String? = null
  var currentCustomerId: Int? = null
  var customerToken: String? = null
  ```
  These are used in `partner/ui/documents/RestaurantDocumentsScreen.kt:80-81`. They persist in memory for the lifetime of the process and are accessible to any code in the same process.

**Recommendation:** Add security comment to AppConfig static tokens. They serve as convenience cache, not primary storage. Source of truth is SecureStorage.

---

### 5. Insufficient Input Validation

**Status:** PASS
**Severity:** Low (acceptable)
**Fix Status:** N/A

**Findings:**
- **GOOD:** No raw SQL queries - uses Retrofit for network calls
- **GOOD:** No WebView with JavaScript enabled (pure Compose UI)
- **GOOD:** Validation extensions exist at `shared/.../ValidationExtensions.kt` for email, password, phone
- No string concatenation in query construction
- No SQL injection vectors (no Room raw queries found in source)

**Recommendation:** None required. Input validation is server-side (backend) and client-side (ValidationExtensions.kt). Adequate for a REST API client.

---

### 6. Insecure IPC (Inter-Process Communication)

**Status:** PASS
**Severity:** Info (acceptable)
**Fix Status:** N/A

**Findings:**
- **Customer app (`app/AndroidManifest.xml`):**
  - `MainActivity` exported=true (line 47) - REQUIRED for launcher
  - `FileProvider` exported=false (line 38) - CORRECT
  - `CustomerFirebaseMessagingService` exported=false (line 69) - CORRECT
- **Driver app (`driver/AndroidManifest.xml`):**
  - `MainActivity` exported=true (line 35) - REQUIRED for launcher
  - `FileProvider` exported=false (line 49) - CORRECT
  - `DriverFirebaseMessagingService` exported=false (line 64) - CORRECT
- **Partner app (`partner/AndroidManifest.xml`):**
  - `MainActivity` exported=true (line 35) - REQUIRED for launcher
  - `PartnerFirebaseMessagingService` exported=false (line 48) - CORRECT
- No unprotected broadcast receivers
- No content providers beyond FileProvider (which is properly secured)
- No custom Intents exposed

**Recommendation:** None. IPC posture is good.

---

### 7. Code Obfuscation (ProGuard/R8)

**Status:** MOSTLY PASS
**Severity:** Low
**Fix Status:** DOCUMENTED

**Findings:**
- **Customer (`app/build.gradle.kts:80-81`):** `isMinifyEnabled = true`, `isShrinkResources = true` - GOOD
- **Driver (`driver/build.gradle.kts:74-75`):** `isMinifyEnabled = true`, `isShrinkResources = true` - GOOD
- **Partner (`partner/build.gradle.kts:69-70`):** `isMinifyEnabled = true`, `isShrinkResources = true` - GOOD
- **Shared (`shared/build.gradle.kts:36`):** `isMinifyEnabled = false` - Expected for library module. R8 processing happens at the consuming app level, so shared module code IS minified when included in any of the 3 app builds.

**Recommendation:** Shared module `isMinifyEnabled = false` is correct for a library module. The consuming apps apply R8/ProGuard to all included code including shared. No action needed.

---

### 8. Debug Flags in Release Builds

**Status:** PASS
**Severity:** Info
**Fix Status:** N/A

**Findings:**
- No `debuggable = true` or `isDebuggable = true` in any release buildType
- `BuildConfig.DEBUG` is used properly for conditional logic
- Debug build type has `isMinifyEnabled = false` (correct - `app/build.gradle.kts:92-93`)
- Release build type has `isMinifyEnabled = true` (correct)

**Recommendation:** None. Debug flags are properly configured.

---

### 9. Logging Sensitive Data

**Status:** FAIL
**Severity:** Critical (OkHttp) + High (source file logs) + High (missing ProGuard stripping)
**Fix Status:** WILL FIX (Task 2)

#### Finding 9A: [CRITICAL] OkHttp Level.BODY in ALL Builds

**File:** `shared/src/main/java/ai/dollor/shared/di/SharedModule.kt:56`
```kotlin
level = HttpLoggingInterceptor.Level.BODY
```

**Impact:** Logs EVERY HTTP request and response body to logcat in ALL builds (debug AND release), including:
- JWT auth tokens in Authorization headers
- Login passwords in POST bodies
- Customer emails, phone numbers, addresses
- Payment information
- All API responses with PII

**Risk:** Any app on the device with READ_LOGS permission (or via ADB) can read these tokens.

#### Finding 9B: [HIGH] Sensitive PII in Log.d Statements

Multiple files log emails, tokens, and PII:

| File | Line | Content Logged | Severity |
|------|------|----------------|----------|
| `app/.../NavigationGraph.kt` | 579 | `"Sign Up: $email, $name, $phone, $zipCode"` | HIGH - logs email, name, phone |
| `app/.../NavigationGraph.kt` | 633 | `"Google Sign In success: $email"` | HIGH - logs email |
| `app/.../NavigationGraph.kt` | 655 | `"Login: $email"` | HIGH - logs email |
| `app/.../NavigationGraph.kt` | 660 | `"SignUp: $email, $fullName"` | HIGH - logs email and name |
| `partner/.../LoginScreen.kt` | 105 | `"Google Sign-In success, calling API with email=$gEmail"` | HIGH - logs email |
| `driver/.../LoginScreen.kt` | 108 | `"Google Sign-In success, calling API with email=$gEmail"` | HIGH - logs email |
| `app/.../CustomerFirebaseMessagingService.kt` | 75 | `"Sending FCM token to server: ${token.take(20)}..."` | Medium - partial token |
| `driver/.../DriverFirebaseMessagingService.kt` | 83 | `"Sending FCM token to server: ${token.take(20)}..."` | Medium - partial token |
| `partner/.../PartnerFirebaseMessagingService.kt` | 73 | `"Sending FCM token to server: ${token.take(20)}..."` | Medium - partial token |
| `shared/.../DollorFirebaseMessagingService.kt` | 90 | `"FCM Token refreshed: ${token.take(20)}..."` | Medium - partial token |

#### Finding 9C: [HIGH] Missing Log Stripping in Driver and Partner ProGuard

- **Customer (`app/proguard-rules.pro:267-275`):** HAS `-assumenosideeffects` for all Log methods - GOOD
- **Driver (`driver/proguard-rules.pro`):** MISSING - all Log.d/v/i/w/e calls survive in release APK
- **Partner (`partner/proguard-rules.pro`):** MISSING - all Log.d/v/i/w/e calls survive in release APK
- **Shared (`shared/proguard-rules.pro`):** MISSING - but shared is a library module, so consuming app's rules apply

**Impact:** Driver and Partner release APKs ship with all log statements intact, including sensitive PII from Finding 9B.

---

### 10. Clipboard / Screenshot Vulnerabilities

**Status:** NOT IMPLEMENTED
**Severity:** Medium
**Fix Status:** DOCUMENTED (deferred)

**Findings:**
- No `FLAG_SECURE` usage anywhere in the codebase (verified via grep)
- Login screens, payment screens, and profile screens with PII do not prevent screenshots
- No clipboard sanitization for sensitive data

**Recommendation:** Add `window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)` to login/payment Activities to prevent screenshots and screen recording. Low priority for initial release.

---

### 11. Root Detection

**Status:** NOT IMPLEMENTED
**Severity:** Medium
**Fix Status:** DOCUMENTED (deferred)

**Findings:**
- No root detection library (RootBeer, SafetyNet, Play Integrity) found
- App runs without warning on rooted devices
- No jailbreak/root checks before sensitive operations

**Recommendation:** Integrate Play Integrity API or RootBeer library to detect compromised devices. At minimum, warn users. For financial operations, consider blocking on rooted devices.

---

### 12. SSL Pinning

**Status:** NOT IMPLEMENTED
**Severity:** Medium
**Fix Status:** DOCUMENTED (deferred)

**Findings:**
- `SharedModule.kt:59` comment: "Certificate pinning can be added for api.dollor.ai if needed"
- No `CertificatePinner` in OkHttp configuration
- No `pin-set` in any `network_security_config.xml`

**Recommendation:** Add certificate pinning for `api.dollor.ai` either via OkHttp `CertificatePinner` or `network_security_config.xml` pin-set. Include backup pins for certificate rotation. This prevents MITM attacks with rogue CA certificates.

---

### 13. AndroidManifest.xml Permissions Audit

**Status:** PASS
**Severity:** Info (acceptable)
**Fix Status:** N/A

**Permissions by App:**

| Permission | Customer | Driver | Partner | Justification |
|-----------|----------|--------|---------|---------------|
| INTERNET | Yes | Yes | Yes | API calls |
| ACCESS_FINE_LOCATION | Yes | Yes | Yes | Maps, delivery, rides |
| ACCESS_COARSE_LOCATION | Yes | Yes | Yes | Fallback location |
| CAMERA | Yes | Yes | Yes | Photos (profile, docs, delivery proof) |
| READ_EXTERNAL_STORAGE (max 32) | Yes | Yes | Yes | Legacy photo picker |
| POST_NOTIFICATIONS | Yes | Yes | Yes | Push notifications |
| ACCESS_NETWORK_STATE | Yes | Yes | Yes | Connectivity checks |

**Assessment:** All permissions are justified for app functionality. No excessive permissions (no READ_PHONE_STATE, no RECORD_AUDIO, no WRITE_EXTERNAL_STORAGE). `READ_EXTERNAL_STORAGE` is properly scoped to `maxSdkVersion="32"`.

---

### 14. WebView Security

**Status:** N/A
**Severity:** N/A
**Fix Status:** N/A

**Findings:**
- No WebView usage found in any module (verified via grep for `WebView`, `setJavaScriptEnabled`, `addJavascriptInterface`)
- All UI is built with Jetpack Compose
- No web content rendering

**Recommendation:** None. Pure native Compose UI eliminates all WebView attack vectors.

---

### 15. Backup Enabled Flag

**Status:** PASS
**Severity:** Info (acceptable)
**Fix Status:** N/A

**Findings:**
- **Customer (`app/AndroidManifest.xml:24`):** `android:allowBackup="false"` + `android:fullBackupContent="false"` - GOOD
- **Driver (`driver/AndroidManifest.xml:26`):** `android:allowBackup="false"` - GOOD
- **Partner (`partner/AndroidManifest.xml:26`):** `android:allowBackup="false"` - GOOD
- Customer app also has `android:dataExtractionRules="@xml/data_extraction_rules"` for Android 12+ backup rules

**Recommendation:** None. Backup is properly disabled, preventing auth tokens from being extracted via ADB backup.

---

## Additional Findings

### A1: google-services.json Tracked in Git

**Severity:** Low
**Fix Status:** DOCUMENTED

- `driver/google-services.json` and `partner/google-services.json` are tracked in git (confirmed via `git ls-files`)
- `app/google-services.json` is NOT tracked
- `.gitignore` already has `google-services.json` entry, but 2 files were committed before the rule was added
- These files contain Firebase project IDs and OAuth client IDs (public information), NOT secret keys

**Recommendation:** Run `git rm --cached driver/google-services.json partner/google-services.json` to untrack. Low priority since no secrets are in these files.

### A2: println Usage

**Severity:** Info
**Fix Status:** N/A

- 106 occurrences of `println` found, ALL in test files only (`CustomerAppStagingApiTest.kt`, `OrderCreationFieldMappingTest.kt`)
- No `println` or `System.out.println` in production source code

### A3: Plaintext SharedPreferences for Notifications

**Severity:** Medium (see Category 2)
**Fix Status:** DOCUMENTED (deferred)

- `NotificationsViewModel.kt:62` uses unencrypted SharedPreferences for storing notification history
- Data includes order IDs, customer names, and driver names from push notifications
- Not auth-sensitive data, but PII-adjacent

---

## Remediation Priority

### Immediate Fix (Task 2)

| # | Severity | Finding | File(s) | Action |
|---|----------|---------|---------|--------|
| 1 | CRITICAL | OkHttp Level.BODY in release | `SharedModule.kt:56` | Conditional: BODY for debug, NONE for release |
| 2 | HIGH | Missing Log stripping in driver ProGuard | `driver/proguard-rules.pro` | Add `-assumenosideeffects` block |
| 3 | HIGH | Missing Log stripping in partner ProGuard | `partner/proguard-rules.pro` | Add `-assumenosideeffects` block |
| 4 | HIGH | Sensitive PII in Log.d statements | 6 files (see 9B) | Redact emails, names, phone, tokens |

### Deferred (Future Sprint)

| # | Severity | Finding | Recommendation |
|---|----------|---------|----------------|
| 5 | Medium | No SSL certificate pinning | Add pin-set for api.dollor.ai |
| 6 | Medium | AppConfig static token variables | Add security comments, consider removal |
| 7 | Medium | No root detection | Integrate Play Integrity API |
| 8 | Medium | No FLAG_SECURE on sensitive screens | Add to login/payment Activities |
| 9 | Medium | Plaintext notification SharedPrefs | Migrate to EncryptedSharedPreferences |
| 10 | Low | google-services.json in git | git rm --cached to untrack |

---

## Build Verification

**Status:** PENDING (Task 3)

---

*Report generated by VAPT Security Audit - GSD Quick Task 23*
