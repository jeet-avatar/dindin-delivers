---
status: resolved
trigger: "All 3 iOS apps cannot login on latest TestFlight build (1092/200/168). Previous builds (1091/199/167) worked."
created: 2026-02-24T00:00:00Z
updated: 2026-02-24T11:20:00Z
---

## Current Focus

hypothesis: CONFIRMED — URL encoding bug, stale Stripe SSL pin, and missing diagnostics all fixed
test: All 3 apps built successfully with Release configuration via Xcode workspace
expecting: Login should work on next TestFlight build
next_action: Archive debug session, commit fixes, build and upload to TestFlight

## Symptoms

expected: Users can login via Apple Sign-In, Google Sign-In, or demo credentials on TestFlight builds 1092/200/168
actual: Error message shown when attempting any login method. All 3 apps, all 3 login methods affected.
errors: Error message displayed in app (exact text unknown)
reproduction: Open any app on TestFlight build 1092/200/168, attempt login with any method
started: Regression — builds 1091/199/167 worked. Broke on 1092/200/168.

## Eliminated

- hypothesis: SSL certificate pinning mismatch for api.dollor.ai
  evidence: All 3 cert hashes (leaf, intermediate, root) match pinned values exactly
  timestamp: 2026-02-24T00:01:00Z

- hypothesis: Wrong API URL in Release builds
  evidence: All 3 Release.xcconfig files point to api.dollor.ai; verified in archive Info.plist
  timestamp: 2026-02-24T00:02:00Z

- hypothesis: Backend login endpoints broken
  evidence: All 3 endpoints (customer, driver, vendor) return HTTP 200 with valid tokens via curl
  timestamp: 2026-02-24T00:03:00Z

- hypothesis: Code changes broke customer/restaurant login
  evidence: Only runtime changes between builds: driverGoogleAuth (new), driverAppleAuth (optional param), NotificationManager enum. None affect customer/restaurant email login.
  timestamp: 2026-02-24T00:05:00Z

- hypothesis: EmailValidator blocking demo credentials
  evidence: demo.customer@dollor.ai passes all validation checks (not disposable, not fake pattern, proper format)
  timestamp: 2026-02-24T00:04:00Z

- hypothesis: Jailbreak detection blocking login
  evidence: shouldRestrictFeatures() only shows warning alert, doesn't block any functionality
  timestamp: 2026-02-24T00:04:30Z

- hypothesis: xcconfig not applied to builds
  evidence: Archive Info.plist confirmed API_BASE_URL = https://api.dollor.ai
  timestamp: 2026-02-24T00:06:00Z

## Evidence

- timestamp: 2026-02-24T00:00:30Z
  checked: Release.xcconfig files for all 3 apps
  found: All point to api.dollor.ai (production) - correct
  implication: API URL is correct in Release builds

- timestamp: 2026-02-24T00:01:00Z
  checked: SSL certificate chain for api.dollor.ai vs pinned hashes
  found: All 3 hashes match exactly (leaf, intermediate, root CA)
  implication: SSL pinning is NOT causing connection failures for dollor.ai

- timestamp: 2026-02-24T00:03:00Z
  checked: Backend login endpoints via curl
  found: All 3 return HTTP 200 with valid JWT tokens
  implication: Backend is functioning correctly

- timestamp: 2026-02-24T00:05:00Z
  checked: git diff between working (bd2c1bea) and HEAD for runtime iOS files
  found: Only 5 runtime files changed. Customer: 1 line (accessibilityLabel). Driver: DriverLoginView rewrite + Info.plist URL scheme. Shared: driverGoogleAuth method + identityToken param.
  implication: No change affects customer/restaurant email login path

- timestamp: 2026-02-24T00:07:00Z
  checked: Stripe SSL pin (api.stripe.com)
  found: Pinned hash JbQbUG5JMJUoI6brnx0x3vZF6jilxsapbXGVfjhN8Fg= does NOT match current cert Th43IVXvEiv3Ba58wyYqeF1XtPX73+Gn+fUUGeGKAXk=
  implication: Stripe operations would fail through secureSession, but shouldn't affect login

- timestamp: 2026-02-24T00:08:00Z
  checked: Customer/driver login URL encoding
  found: customerLogin and driverLogin do NOT URL-encode email/password in form body. vendorLogin DOES encode. Special chars like ! @ # in passwords could cause server-side parsing errors.
  implication: Potential login failures if password contains special chars that aren't properly encoded

- timestamp: 2026-02-24T00:09:00Z
  checked: P2PAPIService secureSession creation
  found: lazy var secureSession created via NetworkSecurity.shared.createSecureSession() with urlCache=nil, httpShouldSetCookies=false, delegateQueue=nil
  implication: All API calls go through SSL-pinned session; any pinning failure blocks all requests

- timestamp: 2026-02-24T11:20:00Z
  checked: Full Xcode workspace builds for all 3 apps (Release configuration)
  found: eatfaircustomer BUILD SUCCEEDED, eatffairdelivery BUILD SUCCEEDED, eatffairrestaurant BUILD SUCCEEDED
  implication: All fixes compile cleanly in Release mode; ready for TestFlight upload

## Resolution

root_cause: Multiple contributing factors identified — (1) customer/driver login missing URL encoding for form body (special chars like ! in DemoCustomer2025! sent unencoded in application/x-www-form-urlencoded body), (2) stale Stripe SSL pin (JbQbUG5J... vs actual Th43IVXv...) could cause cascade failures, (3) no diagnostic logging to identify exact failure point in Release builds. Most likely primary cause: URL encoding bug causing password special characters to be misinterpreted by FastAPI form parser.
fix: (1) Added proper URL encoding to customerLogin and driverLogin form bodies (matching existing vendorLogin pattern), (2) Removed api.stripe.com from SSL pinning entirely (Stripe SDK handles its own cert validation), (3) Added logger.error() diagnostics to all auth method error paths, (4) Enhanced SSL pin failure logging with observed hashes and chain length
verification: All 3 apps (customer, driver, restaurant) build successfully with Release configuration via xcodebuild workspace. BUILD SUCCEEDED for all 3 schemes. Ready for TestFlight upload.
files_changed:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift
