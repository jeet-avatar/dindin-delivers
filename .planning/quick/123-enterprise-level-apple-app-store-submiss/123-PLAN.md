---
phase: quick-123
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/123-enterprise-level-apple-app-store-submiss/APP_STORE_FULL_AUDIT.md
autonomous: true
requirements: [AUDIT-01]

must_haves:
  truths:
    - "Demo account login returns 200 with JWT on production API"
    - "Privacy policy URL returns 200 and contains real privacy content"
    - "All Apple Review Guidelines sections (Safety, Performance, Business, Design, Legal) audited with pass/fail"
    - "No placeholder/incomplete features visible in the submitted build"
    - "Sign in with Apple is implemented alongside Google Sign-In"
    - "No crash-inducing code paths in critical user flows"
    - "App Store Connect metadata is complete with correct organization name"
    - "Data collection labels in ASC match actual app data collection"
  artifacts:
    - path: ".planning/quick/123-enterprise-level-apple-app-store-submiss/APP_STORE_FULL_AUDIT.md"
      provides: "Exhaustive audit report covering all Apple Review Guidelines"
      min_lines: 200
  key_links:
    - from: "Production API (api.dollor.ai)"
      to: "Demo account credentials"
      via: "POST /api/auth/customer/login"
      pattern: "demo.customer@dollor.ai"
    - from: "App Store Connect"
      to: "Build 1111"
      via: "ASC API reviewSubmissions"
      pattern: "WAITING_FOR_REVIEW"
    - from: "Info.plist"
      to: "Apple Review Guidelines 5.1.1"
      via: "NSUsageDescription keys"
      pattern: "NSLocation.*UsageDescription"
---

<objective>
Enterprise-level Apple App Store submission audit for iOS Customer app build 1111 (com.dollorai.customer), currently WAITING_FOR_REVIEW. Exhaustive check against ALL Apple Review Guidelines sections, metadata, demo account health, privacy compliance, UI/UX completeness, API health, and every known common rejection reason.

Purpose: Catch EVERY possible rejection point while build 1111 is under review. If any blocker is found, prepare immediate fix actions. This goes far beyond the prior quick-69/71 audits by covering the FULL Apple Review Guidelines (not just common rejections).
Output: APP_STORE_FULL_AUDIT.md with section-by-section Apple Guidelines coverage, 80+ individual checks, and clear PASS/FAIL/WARNING/ACTION_NEEDED status.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@apps/ios/customer/eatfaircustomer/Info.plist
@apps/ios/customer/eatfaircustomer/eatfaircustomer.entitlements
@apps/ios/Config/Production.xcconfig
@.planning/quick/69-pre-submission-app-store-rejection-audit/69-PLAN.md
@.planning/quick/71-e2e-pre-submission-verification-for-cust/71-VERIFICATION.md
@.planning/quick/81-submit-ios-customer-app-build-1111-to-ap/81-SUMMARY.md
@.planning/quick/114-remove-placeholder-ai-voice-features-fro/114-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Live API + App Store Connect Health Check</name>
  <files></files>
  <action>
Execute all live checks against production API and App Store Connect. Record every result.

**1. Demo Account E2E (Apple reviewer will do EXACTLY this):**
- POST https://api.dollor.ai/api/demo/setup (create/reset demo accounts)
- POST https://api.dollor.ai/api/auth/customer/login with Content-Type: application/x-www-form-urlencoded, body: username=demo.customer@dollor.ai&password=DemoCustomer2025!
- Verify 200 + access_token in response
- Using the token, test the critical customer flows Apple reviewers exercise:
  - GET /api/vendors/published (restaurant list -- must return non-empty)
  - GET /api/promotions/featured (deals -- must not 500)
  - POST /api/rides/estimate with valid pickup/dropoff coords (fare estimate -- must return fare object)
  - GET /api/customer/profile (profile must load)
  - GET /health (backend health check)
- Test rate limiting: make 5 rapid login attempts -- should NOT get locked out (Apple reviewers retry)

**2. App Store Connect Metadata Audit (via ASC API):**
Generate ES256 JWT (Key ID: 9K626GB728, Issuer: 80d10e49-f379-462f-9668-5ea53016812e, key: ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8).

Check ALL of the following via ASC API:
- App name and subtitle
- Primary and secondary category
- Description (must be meaningful, not placeholder)
- Keywords
- What's New text
- Privacy policy URL -- curl it, verify 200 AND contains actual privacy policy text (not a redirect to homepage or 404)
- Support URL -- curl it, verify 200
- Marketing URL (if set)
- Copyright field = "2026 Zietra Technologies inc" (critical: previous rejection was org name)
- Age rating declaration exists and is configured
- Screenshots: verify at least iPhone 6.5" or 6.7" set has screenshots. Count them.
- App preview videos (if any)
- Demo account credentials configured in review info (email + password)
- Review notes to Apple (should explain matchmaking service, not delivery company)
- Contact info for reviewer
- Build 1111 status: processingState=VALID, attached to version, version state=WAITING_FOR_REVIEW
- Review submission state
- App privacy (data collection) declarations exist

**3. Privacy Policy Deep Check:**
- Fetch https://www.dollor.ai/privacy
- Verify it mentions: data collection, location data, payment info, personal info, third-party sharing, contact info (email)
- Verify it matches what is declared in ASC data collection labels
- Check for CCPA/GDPR mentions (Apple increasingly requires this)

**4. Support URL Check:**
- Fetch https://www.dollor.ai/support (or whatever is configured in ASC)
- Verify it is a real support page, not a 404 or redirect to marketing page
  </action>
  <verify>All API calls return expected results. ASC metadata is complete. Demo login returns 200 with JWT. Privacy URL is real and contains policy text.</verify>
  <done>Every live check has PASS/FAIL status with HTTP response codes and evidence.</done>
</task>

<task type="auto">
  <name>Task 2: Full Apple Review Guidelines Code-Level Audit + Report Generation</name>
  <files>.planning/quick/123-enterprise-level-apple-app-store-submiss/APP_STORE_FULL_AUDIT.md</files>
  <action>
Audit EVERY Apple Review Guidelines section against the iOS Customer app codebase. Then combine ALL results from Task 1 and Task 2 into APP_STORE_FULL_AUDIT.md.

**SECTION 1 - SAFETY (Guidelines 1.1-1.6):**
- 1.1 Objectionable Content: App is food delivery + rideshare. No UGC beyond reviews/ratings. Check if user-submitted content (reviews, chat messages) has moderation. Search for profanity filters or content moderation in backend: grep for "moderate\|profanity\|filter.*content\|report.*content" in backend .py files.
- 1.2 User Generated Content: If chat exists, verify report/block mechanism. Check for "report\|block.*user" in customer app Swift files.
- 1.3 Kids Category: App is NOT in Kids category. Age rating = 4+. Verify no COPPA issues -- app collects location/payment from users. If age gate exists, note it.
- 1.4 Physical Harm: Rideshare involves physical transportation. Verify app does not provide medical/emergency services advice.
- 1.5 Developer Information: Verify developer name in ASC is "Zietra Technologies inc" (not personal name).

**SECTION 2 - PERFORMANCE (Guidelines 2.1-2.5):**
- 2.1 App Completeness: NO placeholder content, no "coming soon" features, no test data visible. Search: grep -rn "coming soon\|placeholder\|lorem ipsum\|TODO\|FIXME\|test data" apps/ios/customer/eatfaircustomer/ --include="*.swift" (exclude comments). Quick-114 removed AI/voice placeholders -- verify nothing new was added after that commit (253f98fb).
- 2.2 Beta/Demo: App must not feel like beta. No "beta" labels, no TestFlight-only features.
- 2.3 Accurate Metadata: App name "Dollor" matches bundle display name. Description accurately describes food delivery + rideshare matchmaking. No misleading claims.
- 2.3.7 App must not require physical hardware not commonly available.
- 2.4 Hardware Compatibility: iPhone-only (UIRequiresFullScreen=true, portrait only). Check minimum iOS version in project.pbxproj (should be iOS 16+ or 17+, NOT higher than necessary).
- 2.5 Software Requirements: Check if app uses any deprecated APIs. Already verified no UIWebView. Search for other deprecated patterns: grep -rn "UIAlertView\|UIActionSheet\|addressBook\|ABPeoplePickerNavigationController" apps/ios/customer/eatfaircustomer/ --include="*.swift"

**SECTION 3 - BUSINESS (Guidelines 3.1-3.2):**
- 3.1 Payments: App uses Stripe for payments (not IAP). This is PERMITTED because Dollor is a matchmaking service for physical goods/services delivery -- Apple's IAP requirement does NOT apply to physical goods/services (Guideline 3.1.3(e): "goods and services consumed outside of the app"). Verify NO digital goods are sold.
- 3.1.1 In-App Purchase: NOT required. Dollor sells physical food delivery and rideshare (real-world services). Document this justification.
- 3.1.2 Subscriptions: No subscriptions in app. Verify.
- 3.2 Other Business Model Issues: No multi-level marketing, no loan features, no crypto trading.

**SECTION 4 - DESIGN (Guidelines 4.0-4.8):**
- 4.0 Design: Professional UI, not a repackaged website.
- 4.1 Copycats: App is original, not copying DoorDash/Uber UI (it is its own brand "Dollor").
- 4.2 Minimum Functionality: App provides real functionality (order food, request rides, track deliveries). Not a wrapper around a website.
- 4.3 Spam: Single app, not a reskin.
- 4.4 Extensions: No extensions (no widgets, no iMessage apps). N/A.
- 4.5 Apple Sites and Services: Check Sign in with Apple implementation -- if Google Sign-In is offered, Apple REQUIRES Sign in with Apple (Guideline 4.8). Verify entitlement exists (CONFIRMED: com.apple.developer.applesignin in entitlements). Search for AuthenticationServices import and ASAuthorizationAppleIDProvider usage: grep -rn "ASAuthorizationAppleIDProvider\|AuthenticationServices\|SignInWithApple\|appleSignIn" apps/ios/customer/eatfaircustomer/ --include="*.swift"
- 4.7 HTML5 Games/Bots/etc: N/A.
- 4.8 Sign in with Apple: CRITICAL CHECK. If Google Sign-In exists, Apple Sign-In MUST be offered as alternative. Verify BOTH are present in login flow. Grep for Google Sign-In: "GIDSignIn\|GoogleSignIn\|google.*sign.*in" and Apple Sign-In usage in same login view.

**SECTION 5 - LEGAL (Guidelines 5.1-5.6):**
- 5.1 Privacy:
  - 5.1.1 Data Collection and Storage: App collects location, name, email, payment info. All must be declared in ASC privacy labels. Check Info.plist usage descriptions match actual usage (7 descriptions present -- verify each is actually used in code, not just declared).
  - 5.1.2 Data Use and Sharing: Verify no undisclosed third-party SDKs sharing data. Check Podfile for analytics/tracking SDKs: Firebase Analytics, Google Maps, Stripe. All must be declared in ASC privacy.
  - 5.1.3 Health and Health Research: N/A.
  - 5.1.4 Kids: Not in Kids category. N/A.
  - 5.1.5 Location Services: App uses location. NSLocationWhenInUseUsageDescription present. Verify location is only requested when needed (not on app launch for no reason).
- 5.2 Intellectual Property: "Dollor" is original brand. No trademark conflicts.
- 5.3 Gaming/Gambling: N/A.
- 5.4 VPN Apps: N/A.
- 5.6 Developer Code of Conduct: Standard compliance.

**ADDITIONAL COMMON REJECTION CHECKS:**
- Crash on launch: Cannot test remotely, but verify no force-unwraps on critical paths: grep -rn "fatalError\|preconditionFailure" apps/ios/customer/eatfaircustomer/ --include="*.swift" (exclude test files)
- Background modes: Only "remote-notification" (GOOD -- no unjustified background modes)
- IPv6 compatibility: Apple tests on IPv6-only network. Verify no hardcoded IP addresses: grep -rn "[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}" apps/ios/customer/eatfaircustomer/ --include="*.swift"
- NSMicrophoneUsageDescription present but check if microphone is actually used (voice search was kept per quick-114). If mic permission declared but never triggered, Apple may reject. Verify SFSpeechRecognizer or AVAudioSession usage exists: grep -rn "SFSpeechRecognizer\|AVAudioSession\|AVAudioRecorder" apps/ios/customer/eatfaircustomer/ --include="*.swift"
- NSContactsUsageDescription present -- verify contacts are actually accessed somewhere: grep -rn "CNContactStore\|CNContact\|Contacts" apps/ios/customer/eatfaircustomer/ --include="*.swift"
- NSSpeechRecognitionUsageDescription present -- verify Speech framework usage exists
- ENABLE_AI_FEATURES = YES in Production.xcconfig -- check what this flag controls. If it enables features that were removed in quick-114, this is a red flag. Search: grep -rn "ENABLE_AI_FEATURES\|aiFeatures\|isAIEnabled" apps/ios/customer/eatfaircustomer/ --include="*.swift"
- Check for any "Dollor AI Service" branding in usage descriptions -- if AI features were removed, the usage descriptions should not reference AI. Note: NSLocationWhenInUseUsageDescription says "Dollor AI Service" -- this is the app name, acceptable.
- Minimum deployment target vs build 1111's actual target (minOsVersion: 17.0 per quick-81)

**WRITE THE REPORT:**
Create APP_STORE_FULL_AUDIT.md combining ALL results:

```
# Apple App Store Full Submission Audit
## iOS Customer App - Build 1111 (com.dollorai.customer)
## Organization: Zietra Technologies inc
## Date: 2026-03-08
## Build Status: WAITING_FOR_REVIEW

### Executive Summary
- Total checks: N
- PASS: N | FAIL: N | WARNING: N | N/A: N
- Recommendation: GO / NO-GO / CONDITIONAL GO
- Blocker count: N

### Section 1: Safety (Guidelines 1.1-1.6)
| # | Check | Guideline | Status | Evidence |
...

### Section 2: Performance (Guidelines 2.1-2.5)
...

### Section 3: Business (Guidelines 3.1-3.2)
...

### Section 4: Design (Guidelines 4.0-4.8)
...

### Section 5: Legal (Guidelines 5.1-5.6)
...

### Section 6: Live API Health
(from Task 1)

### Section 7: App Store Connect Metadata
(from Task 1)

### Section 8: Common Rejection Reasons
...

### Blockers (MUST FIX)
(numbered list, empty if none)

### Warnings (SHOULD REVIEW)
(numbered list)

### Risk Assessment
(overall risk level: LOW/MEDIUM/HIGH with justification)
```
  </action>
  <verify>APP_STORE_FULL_AUDIT.md exists with 200+ lines, covers all 5 Apple Review Guidelines sections plus live checks, every check has PASS/FAIL/WARNING status, executive summary has totals and recommendation.</verify>
  <done>Exhaustive audit report exists covering all Apple Review Guidelines sections (1-5), live API health, ASC metadata, common rejection reasons. Clear GO/NO-GO recommendation with blocker list and risk assessment.</done>
</task>

</tasks>

<verification>
- APP_STORE_FULL_AUDIT.md exists at .planning/quick/123-enterprise-level-apple-app-store-submiss/APP_STORE_FULL_AUDIT.md
- Report covers all 5 Apple Review Guidelines sections (Safety, Performance, Business, Design, Legal)
- Report includes live API health checks (demo login, key endpoints)
- Report includes ASC metadata verification (screenshots, privacy URL, age rating, demo creds)
- Report includes common rejection reason checks (crash paths, deprecated APIs, IPv6, unused permissions)
- Every individual check has PASS/FAIL/WARNING/N/A status with evidence
- Executive summary has total counts and GO/NO-GO recommendation
- Blockers section lists any items requiring immediate action
- Report is 200+ lines with actionable detail
</verification>

<success_criteria>
- 80+ individual checks across all Apple Review Guidelines sections
- Demo account verified working on production
- Privacy policy URL verified accessible with real content
- Sign in with Apple verified present alongside Google Sign-In
- No placeholder/incomplete features in submitted build
- ASC metadata verified complete (screenshots, description, age rating, copyright)
- Data collection declarations verified against actual SDK usage
- All Info.plist usage descriptions verified against actual code usage
- Clear GO/NO-GO/CONDITIONAL GO recommendation
- Any blockers identified with specific fix instructions
</success_criteria>

<output>
After completion, create `.planning/quick/123-enterprise-level-apple-app-store-submiss/123-SUMMARY.md`
</output>
