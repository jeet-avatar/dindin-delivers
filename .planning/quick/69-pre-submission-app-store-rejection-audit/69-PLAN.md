---
phase: quick-69
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [AUDIT-01]

must_haves:
  truths:
    - "Demo credentials work against production API"
    - "App Store Connect metadata is complete and valid"
    - "Info.plist has all required usage descriptions"
    - "Entitlements match app capabilities"
    - "No deprecated APIs or hardcoded staging URLs in Release config"
    - "Build 1108 is processed and ready for submission"
  artifacts:
    - path: ".planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md"
      provides: "Pass/fail report for every audit check"
      min_lines: 80
  key_links: []
---

<objective>
Comprehensive pre-submission App Store rejection audit for iOS Customer app (build 1108, bundle com.dollorai.customer). Check all common Apple rejection reasons and produce a pass/fail report with action items.

Purpose: Prevent App Store rejection by catching all known issues before submission.
Output: APP_STORE_AUDIT_REPORT.md with pass/fail for every check and action items.
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
@apps/ios/customer/eatfaircustomer/eatfaircustomerDebug.entitlements
@apps/ios/Config/Production.xcconfig
@apps/ios/Config/Staging.xcconfig
</context>

<tasks>

<task type="auto">
  <name>Task 1: Demo Account, API, and Code-Level Audit</name>
  <files></files>
  <action>
This is a READ-ONLY audit. No code changes. Execute the following checks and record results:

**1. Demo Account Verification (production):**
- POST https://api.dollor.ai/api/demo/setup to create/reset demo accounts
- POST https://api.dollor.ai/api/auth/customer/login with body {"email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!"}
- Verify 200 response with valid JWT token
- Apple reviewers WILL test these credentials. Must work flawlessly.

**2. Info.plist Usage Descriptions (already loaded -- verify completeness):**
File: apps/ios/customer/eatfaircustomer/Info.plist
Check each key exists and has a meaningful, user-facing description (not developer jargon):
- NSLocationWhenInUseUsageDescription (REQUIRED -- app uses location)
- NSLocationAlwaysAndWhenInUseUsageDescription (if background location used)
- NSCameraUsageDescription (if camera used)
- NSPhotoLibraryUsageDescription (if photo library used)
- NSMicrophoneUsageDescription (if microphone used)
- NSContactsUsageDescription (if contacts used)
- NSSpeechRecognitionUsageDescription (if speech recognition used)
- Check UIBackgroundModes -- only "remote-notification" should be present (no "location" unless justified)
- Verify ITSAppUsesNonExemptEncryption is set (false = no export compliance needed)

**3. Entitlements Audit:**
File: apps/ios/customer/eatfaircustomer/eatfaircustomer.entitlements
- aps-environment = production (REQUIRED for push notifications)
- com.apple.developer.applesignin (REQUIRED -- app uses Sign in with Apple)
- com.apple.developer.in-app-payments with merchant ID (for Stripe Apple Pay)
- No unnecessary entitlements that could cause rejection

**4. Release Configuration Audit:**
File: apps/ios/Config/Production.xcconfig
- API_BASE_URL must be https://api.dollor.ai (NOT staging URL)
- ENABLE_DEBUG_LOGGING = NO
- ENABLE_MOCK_DATA = NO
- IS_DUMMY_PAYMENT_MODE = NO
- ENABLE_TESTABILITY = NO
- Verify NO hardcoded staging URLs (d34u5ixl0bulv4.cloudfront.net) in Production.xcconfig

**5. Code-Level Checks:**
- Search for UIWebView usage across customer app Swift files: `grep -r "UIWebView" apps/ios/customer/` -- Apple rejects apps with UIWebView (deprecated since iOS 12)
- Search for hardcoded staging/test URLs in Swift source: `grep -rn "d34u5ixl0bulv4\|d3kuu45w6kl8hr\|localhost\|127.0.0.1" apps/ios/customer/eatfaircustomer/` (exclude Pods, build)
- Search for private API usage: `grep -rn "_UIKit\|_NS\|@objc.*private" apps/ios/customer/eatfaircustomer/`
- Check NSAllowsArbitraryLoads in Info.plist is false (already confirmed: false with local networking exception only)
- Verify amazonaws.com ATS exception is justified (S3 image loading -- legitimate use)

**6. App Transport Security Assessment:**
- NSAllowsArbitraryLoads = false (GOOD)
- NSAllowsLocalNetworking = true (acceptable for dev, harmless in production)
- amazonaws.com exception allows insecure HTTP but requires TLS 1.2 minimum -- Apple may flag this. Document as potential risk.
  </action>
  <verify>All checks executed, results recorded with PASS/FAIL status for each item.</verify>
  <done>Every audit check has a definitive PASS/FAIL result with explanation.</done>
</task>

<task type="auto">
  <name>Task 2: App Store Connect Metadata and Build Status Audit</name>
  <files>.planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md</files>
  <action>
This is a READ-ONLY audit. No code changes.

**1. Generate App Store Connect JWT:**
Using the credentials from CLAUDE.md:
- Key ID: 9K626GB728
- Issuer ID: 80d10e49-f379-462f-9668-5ea53016812e
- Key path: ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8
- Algorithm: ES256, audience: appstoreconnect-v1, expiry: 20 min

Use a short Python or Ruby script to generate the JWT, then query the API.

**2. App Store Connect Metadata Checks:**
Use App Store Connect API v1 (https://api.appstoreconnect.apple.com/v1/):

a. Find the app: GET /v1/apps?filter[bundleId]=com.dollorai.customer
b. Get app info: Check for:
   - App name set
   - Primary category set
   - Content rights declaration

c. Get app store version info (GET /v1/apps/{id}/appStoreVersions?filter[appStoreState]=READY_FOR_SALE,PREPARE_FOR_SUBMISSION,WAITING_FOR_REVIEW,IN_REVIEW):
   - Privacy policy URL is set and accessible (curl it)
   - Support URL is set and accessible (curl it)
   - Description exists (not empty)
   - Keywords exist
   - What's New text (for updates)
   - Copyright field = "2026 Zietra Technologies inc" (per MEMORY.md)

d. Check screenshots: GET /v1/appStoreVersions/{versionId}/appScreenshotSets
   - Required: iPhone 6.7" (iPhone 15 Pro Max)
   - Required: iPhone 6.5" (iPhone 14 Plus) OR 6.7"
   - Optional but recommended: iPad Pro 12.9"
   - At least 1 screenshot per required size

e. Age rating: GET /v1/apps/{id}/relationships/ageRatingDeclaration (or from appInfos)
   - Must be configured (Apple rejects if missing)

**3. Build 1108 Processing Status:**
- GET /v1/builds?filter[app]={appId}&filter[version]=1108
- Check processingState: should be VALID (not PROCESSING or INVALID)
- Check if build is available for submission

**4. Previous Rejection Context:**
- Jan 23 rejection was due to personal developer name (Jithesh Manoharan)
- Account has been converted to Organization: "Zietra Technologies inc"
- Verify seller/provider name via API if possible (GET /v1/apps/{id} includes provider info)
- Note: MEMORY.md says seller name may still show old name -- flag if so

**5. Write APP_STORE_AUDIT_REPORT.md:**
Combine ALL results from Task 1 and Task 2 into a structured report at:
.planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md

Format:
```
# App Store Pre-Submission Audit Report
## Customer App - Build 1108 (com.dollorai.customer)
## Date: 2026-03-04

### Summary
- Total checks: N
- PASS: N
- FAIL: N
- WARNING: N

### 1. Demo Account Verification
| Check | Status | Details |
...

### 2. App Store Connect Metadata
| Check | Status | Details |
...

(etc. for all 7 categories from the audit checklist)

### Action Items
(Numbered list of things that MUST be fixed before submission)

### Warnings
(Things that are not blockers but should be reviewed)
```
  </action>
  <verify>APP_STORE_AUDIT_REPORT.md exists and contains pass/fail for every check category listed in the audit checklist.</verify>
  <done>Complete audit report with all checks documented, action items listed, and clear go/no-go recommendation for App Store submission.</done>
</task>

</tasks>

<verification>
- APP_STORE_AUDIT_REPORT.md exists at .planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md
- Report covers all 7 audit categories from the checklist
- Every individual check has PASS, FAIL, or WARNING status
- Action items section lists all blockers that must be fixed
- Report includes go/no-go recommendation
</verification>

<success_criteria>
- All 7 audit categories checked and documented
- Demo credentials verified against production API
- App Store Connect metadata verified via API
- Build 1108 processing status confirmed
- Info.plist, entitlements, xcconfig, and code-level checks complete
- Clear action items for any failures
- Report is actionable -- executor can fix any issues found
</success_criteria>

<output>
After completion, create `.planning/quick/69-pre-submission-app-store-rejection-audit/69-SUMMARY.md`
</output>
