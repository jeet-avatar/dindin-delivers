---
phase: quick-22
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/22-vapt-security-audit-on-all-3-ios-apps-ow/VAPT_REPORT.md
  - apps/ios/customer/eatfaircustomer/Info.plist
  - apps/ios/delivery/eatffairdelivery/Info.plist
  - apps/ios/restaurant/eatffairrestaurant/Info.plist
  - apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift
  - apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
  - apps/ios/delivery/eatffairdelivery/Views/DriverStatsCard.swift
  - apps/ios/delivery/eatffairdelivery/Views/OrderMapDetailView.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
autonomous: true
requirements: [VAPT-01]

must_haves:
  truths:
    - "All OWASP Mobile Top 10 categories are audited with specific findings per category"
    - "All CRITICAL and HIGH severity findings have fixes applied"
    - "No hardcoded secrets, API keys, or credentials exist in Swift source (excluding Info.plist Google Maps key which is bundle-restricted)"
    - "No auth tokens are stored in UserDefaults (only in Keychain via SecureStorage)"
    - "All print() statements in non-DEBUG builds are wrapped in #if DEBUG"
    - "Certificate pinning is enabled for dollor.ai and api.dollor.ai domains"
    - "Jailbreak detection warns users and restricts sensitive operations"
    - "All 3 iOS apps build successfully after fixes"
  artifacts:
    - path: ".planning/quick/22-vapt-security-audit-on-all-3-ios-apps-ow/VAPT_REPORT.md"
      provides: "Complete VAPT report with findings, severity, remediation"
      min_lines: 200
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift"
      provides: "SSL pinning enabled for dollor.ai domains"
      contains: "dollor.ai"
  key_links:
    - from: "VAPT_REPORT.md"
      to: "Swift source files"
      via: "file:line references for each finding"
      pattern: "apps/ios/"
    - from: "NetworkSecurity.swift"
      to: "P2PAPIService.swift"
      via: "SSL pinning on API requests"
      pattern: "pinnedDomains"
---

<objective>
Perform a static code VAPT (Vulnerability Assessment and Penetration Testing) audit of all 3 iOS apps and shared framework against OWASP Mobile Top 10 (2024), produce a detailed report, and fix all CRITICAL and HIGH severity findings.

Purpose: Ensure iOS apps meet security standards before App Store distribution, identify and remediate vulnerabilities that could expose user data, credentials, or enable attacks.
Output: VAPT_REPORT.md with categorized findings + code fixes for CRITICAL/HIGH items.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Key iOS source paths:
- Shared framework: apps/ios/eatfair-ios-shared/Sources/EatFairShared/
- Customer app: apps/ios/customer/eatfaircustomer/
- Driver app: apps/ios/delivery/eatffairdelivery/
- Restaurant app: apps/ios/restaurant/eatffairrestaurant/

Security-critical files already reviewed during planning:
- SecureStorage.swift — Keychain wrapper (GOOD: uses kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
- NetworkSecurity.swift — SSL pinning framework (ISSUE: dollor.ai pins are empty/disabled)
- AppConfig.swift — Configuration + UserDefaultsKeys (ISSUE: UserDefaults stores user profile data)
- GoogleMapsConfig.swift — API key loading (GOOD: loads from Info.plist, not hardcoded in source)
- P2PAPIService.swift — API service (ISSUE: uses URLSession.shared instead of secure session)
- Info.plist x3 — ATS config (ISSUE: amazonaws.com allows insecure HTTP)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Full OWASP Mobile Top 10 Static Code Audit</name>
  <files>
    .planning/quick/22-vapt-security-audit-on-all-3-ios-apps-ow/VAPT_REPORT.md
  </files>
  <action>
Perform a comprehensive static code audit across ALL Swift source files in the 4 directories (shared, customer, driver, restaurant). For each OWASP category, scan every .swift file and every .plist config. Produce VAPT_REPORT.md with this structure:

**Header section:**
- Date, auditor, scope, methodology
- Executive summary with counts: CRITICAL / HIGH / MEDIUM / LOW / INFO

**For each OWASP M1-M10 category, document:**
- Category name and description
- Files scanned (list)
- Findings with: ID, severity, file:line, description, evidence (code snippet), remediation
- Status: OPEN / FIXED

**Known findings to verify and document (from planning recon):**

**M1 - Improper Credential Usage:**
- FINDING: Google Maps API key hardcoded in customer Info.plist line 25: `AIzaSyCELfWMuckt-Bbx5tyuiOSS3sYNywxVTXc`. Severity: MEDIUM (key is bundle-restricted in Google Cloud Console per GoogleMapsConfig.swift comments, but still visible in binary). The driver and restaurant Info.plist do NOT have this key hardcoded (they use GoogleService-Info.plist).
- VERIFY: No other hardcoded API keys (sk_live_, sk_test_, AKIA, Bearer tokens) in .swift files. Planning recon found NONE — confirm.
- VERIFY: GoogleMapsConfig.swift loads key from Info.plist/GoogleService-Info.plist correctly (GOOD pattern).
- VERIFY: Tokens stored in Keychain via SecureStorage (GOOD). Migration from UserDefaults exists in SecureStorage.migrateFromUserDefaults().

**M2 - Inadequate Supply Chain Security:**
- FINDING: CocoaPods dependencies (GoogleMaps 9.4.0, GooglePlaces 9.4.1) use pessimistic version constraints `~> 9.0` — acceptable but document.
- VERIFY: SPM dependencies via Package.swift in shared framework (Firebase SDK). Check for pinned versions.
- No known CVEs for these specific versions as of Feb 2026.

**M3 - Insecure Authentication/Authorization:**
- VERIFY: All API calls use Bearer token from SecureStorage (confirmed in Quick Task 18 — 158 auth headers).
- VERIFY: Token refresh mechanism exists or tokens are long-lived JWTs.
- VERIFY: Logout clears all tokens (SecureStorage.clearAuthTokens confirmed).
- NOTE: No token expiry/refresh logic visible — document as MEDIUM finding.

**M4 - Insufficient Input/Output Validation:**
- VERIFY: Login forms validate email format (AuthViewModel.swift has isValidEmail check).
- VERIFY: No WebView usage in app code (planning recon: WebViews only in Firebase SDK, not app code — GOOD).
- SCAN: Check all user-input fields for sanitization before API calls.

**M5 - Insecure Communication:**
- FINDING (HIGH): Certificate pinning DISABLED for dollor.ai and api.dollor.ai in NetworkSecurity.swift lines 19-26. The pinnedDomains dict has empty pin sets with comments "Certificate pinning disabled - using ATS for security". Only Stripe has a pin.
- FINDING (MEDIUM): ATS exception for amazonaws.com allows insecure HTTP loads in all 3 Info.plist files. While NSAllowsArbitraryLoads is correctly set to false, the amazonaws.com exception is overly broad.
- FINDING (MEDIUM): P2PAPIService uses URLSession.shared (line 98 etc.) instead of NetworkSecurity.createSecureSession() — bypasses SSL pinning even if it were enabled.
- VERIFY: All xcconfig URLs use https:// (confirmed: Production, Staging, Development all use https).
- VERIFY: WebSocket uses wss:// (confirmed: xcconfig uses wss:// prefix).

**M6 - Inadequate Privacy Controls:**
- FINDING (MEDIUM): print() statements in production code (non-#if DEBUG) in customer and driver apps:
  - MultiRestaurantCheckoutView.swift: ~15 print() statements logging order details (address, subtotal, items) NOT wrapped in #if DEBUG
  - DeliveryViewModel.swift: ~20 print() statements logging order counts, driver IDs, earnings NOT wrapped in #if DEBUG
  - DriverStatsCard.swift: ~3 print() statements NOT wrapped in #if DEBUG
  - OrderMapDetailView.swift: 1 print() statement NOT wrapped in #if DEBUG
  - RideRequestView.swift: 2 print() statements NOT wrapped in #if DEBUG
- VERIFY: Restaurant app has NO print statements (confirmed clean).
- VERIFY: os.Logger used correctly in shared framework (confirmed — uses Logger subsystem/category pattern).
- VERIFY: UserDefaults stores non-sensitive profile data (name, email, IDs) — this is acceptable per Apple guidelines as long as tokens are in Keychain.

**M7 - Insufficient Binary Protections:**
- FINDING (INFO): Jailbreak detection exists in NetworkSecurity.swift (isDeviceJailbroken) but checkJailbreakStatus() only logs a warning — does not restrict functionality or warn user.
- VERIFY: Production.xcconfig has SWIFT_OPTIMIZATION_LEVEL = -O, STRIP_SWIFT_SYMBOLS = YES, ENABLE_TESTABILITY = NO (all GOOD).
- VERIFY: No DEBUG flags leak into production (AppConfig.swift line 415: #if DEBUG guard on isDummyPaymentMode — GOOD).

**M8 - Security Misconfiguration:**
- VERIFY: Info.plist permission descriptions are appropriate and specific (confirmed all 3 apps have specific descriptions).
- VERIFY: URL schemes use reverse-DNS Google OAuth client IDs (confirmed — not guessable).
- FINDING (LOW): Customer Info.plist requests NSContactsUsageDescription but verify this is actually needed.
- VERIFY: Background modes are appropriate (customer: remote-notification; driver: location, audio, remote-notification; restaurant: remote-notification).

**M9 - Insecure Data Storage:**
- VERIFY: Auth tokens stored in Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly (confirmed in SecureStorage.swift line 61 — GOOD).
- VERIFY: No Core Data/SQLite with sensitive unencrypted data.
- FINDING (LOW): UserDefaults stores customer/driver/vendor email addresses and names (AppConfig.swift UserDefaultsKeys). This is acceptable for non-sensitive display data but document.

**M10 - Insufficient Cryptography:**
- VERIFY: CryptoKit SHA256 used for certificate pinning hashes (confirmed in NetworkSecurity.swift line 125).
- VERIFY: Apple Sign-In uses nonce (confirmed in AuthViewModel.swift line 43).
- No custom crypto implementations found (GOOD — uses platform crypto).

Write the complete report to VAPT_REPORT.md.
  </action>
  <verify>
    - VAPT_REPORT.md exists and is >200 lines
    - All 10 OWASP categories have entries
    - Each finding has: ID, severity, file:line, description, evidence, remediation
    - Executive summary tallies match individual findings
  </verify>
  <done>
    Complete VAPT report covering all 10 OWASP Mobile Top 10 categories with specific findings, file:line references, code evidence, and remediation recommendations for every finding.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix All CRITICAL and HIGH Severity Findings</name>
  <files>
    apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift
    apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
    apps/ios/delivery/eatffairdelivery/Views/DriverStatsCard.swift
    apps/ios/delivery/eatffairdelivery/Views/OrderMapDetailView.swift
    apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  </files>
  <action>
Fix all CRITICAL and HIGH findings from the VAPT report. Based on planning recon, the fixes needed are:

**FIX 1 (HIGH): Enable SSL Certificate Pinning for dollor.ai domains**
File: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift`
- Generate SHA-256 public key pins for api.dollor.ai by connecting to the live server
- Run: `openssl s_client -connect api.dollor.ai:443 -servername api.dollor.ai 2>/dev/null | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`
- Also get the intermediate CA pin for backup
- Populate the pinnedDomains dict for "dollor.ai" and "api.dollor.ai" with the actual pins
- Also add the staging domain (d34u5ixl0bulv4.cloudfront.net) pinning OR add it to the "no pinning required" pass-through (since CloudFront certs rotate frequently, pinning CF is impractical — document this decision)
- IMPORTANT: Keep the existing Stripe pin. For CloudFront/staging domains, explicitly skip pinning (CF rotates certs) but document WHY.

**FIX 2 (MEDIUM->HIGH when combined): Wrap all production print() in #if DEBUG**
These print() statements log sensitive operational data (addresses, order amounts, driver IDs, earnings) that would appear in device console logs accessible to anyone with physical access or a paired Mac.

File: `apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift`
- Wrap ALL print() calls (~15 instances around lines 776-1047) in `#if DEBUG` / `#endif` blocks
- These log: order details, addresses, subtotals, order numbers

File: `apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift`
- Wrap ALL print() calls (~20 instances around lines 181-303) in `#if DEBUG` / `#endif`
- These log: order counts, driver IDs, earnings data, API failure details

File: `apps/ios/delivery/eatffairdelivery/Views/DriverStatsCard.swift`
- Wrap ALL print() calls (~3 instances around lines 128-149) in `#if DEBUG` / `#endif`

File: `apps/ios/delivery/eatffairdelivery/Views/OrderMapDetailView.swift`
- Wrap the print() call (line 213) in `#if DEBUG` / `#endif`

File: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift`
- Wrap the 2 print() calls (lines 2481, 2510) in `#if DEBUG` / `#endif`

**FIX 3 (MEDIUM): Enhance jailbreak detection response**
File: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift`
- Update `checkJailbreakStatus()` to return Bool and add a method `shouldRestrictFeatures()` that returns true on jailbroken devices
- Add a method `jailbreakWarningMessage()` returning a user-facing alert string
- Document that calling code should check this on app launch and show a warning alert

After all fixes, update the VAPT_REPORT.md to mark fixed findings as status: FIXED.
  </action>
  <verify>
    - Run: `grep -rn "print(" apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift | grep -v "#if DEBUG"` — should return 0 results (all wrapped)
    - Run: `grep -rn "print(" apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift | grep -v "#if DEBUG"` — should return 0 results
    - Run: `grep -rn "print(" apps/ios/delivery/eatffairdelivery/Views/DriverStatsCard.swift | grep -v "#if DEBUG"` — should return 0 results
    - Verify NetworkSecurity.swift pinnedDomains has non-empty pin sets for dollor.ai/api.dollor.ai
    - Verify NetworkSecurity.swift has shouldRestrictFeatures() method
  </verify>
  <done>
    All CRITICAL and HIGH findings fixed: SSL pinning enabled for dollor.ai domains, all production print() statements wrapped in #if DEBUG, jailbreak detection enhanced with user-facing response. VAPT_REPORT.md updated with FIXED status.
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify iOS Apps Build Successfully After Fixes</name>
  <files></files>
  <action>
Build all 3 iOS apps to verify the security fixes don't break compilation:

```bash
# Customer App
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatfaircustomer -configuration Staging \
  -destination 'generic/platform=iOS' build 2>&1 | tail -5

# Driver App
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairdelivery -configuration Staging \
  -destination 'generic/platform=iOS' build 2>&1 | tail -5

# Restaurant App (use workspace first, fall back to project if scheme not found)
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairrestaurant -configuration Staging \
  -destination 'generic/platform=iOS' build 2>&1 | tail -5
```

If any build fails, diagnose and fix the compilation error. Common issues:
- Missing import statements after moving code
- Type mismatches in new methods
- Syntax errors in #if DEBUG wrappers

All 3 apps must show "BUILD SUCCEEDED" in output.
  </action>
  <verify>
    All 3 xcodebuild commands exit with status 0 and output contains "BUILD SUCCEEDED"
  </verify>
  <done>
    All 3 iOS apps (customer, driver, restaurant) build successfully with security fixes applied. No compilation regressions introduced.
  </done>
</task>

</tasks>

<verification>
1. VAPT_REPORT.md exists with all 10 OWASP categories documented
2. Each finding has file:line reference, severity, and evidence
3. All CRITICAL/HIGH findings show status: FIXED
4. SSL pinning has real certificate pins (not empty strings)
5. Zero production print() statements outside #if DEBUG blocks
6. Jailbreak detection has user-facing response mechanism
7. All 3 iOS apps build successfully
</verification>

<success_criteria>
- Complete VAPT report covering OWASP Mobile Top 10 with 15+ findings
- All CRITICAL and HIGH severity items remediated in code
- All 3 iOS apps compile without errors after fixes
- Report serves as auditable security artifact for App Store review
</success_criteria>

<output>
After completion, create `.planning/quick/22-vapt-security-audit-on-all-3-ios-apps-ow/22-SUMMARY.md`
</output>
