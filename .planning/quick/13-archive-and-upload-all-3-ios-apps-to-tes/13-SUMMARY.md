---
phase: quick-13
plan: 13
subsystem: ios
tags: [xcodebuild, xcarchive, testflight, app-store-connect, ipa, code-signing]

# Dependency graph
requires:
  - phase: quick-12
    provides: "Built iOS apps (Customer 1089, Driver 197, Restaurant 165)"
provides:
  - "Customer app build 1089 uploaded to TestFlight"
  - "Driver app build 197 uploaded to TestFlight"
  - "Restaurant app build 165 uploaded to TestFlight"
affects: [app-store-review, testflight-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "xcodebuild -exportArchive with -authenticationKey* flags for CLI uploads (no Apple ID login needed)"

key-files:
  created:
    - /tmp/dollor-archives/customer.xcarchive
    - /tmp/dollor-archives/driver.xcarchive
    - /tmp/dollor-archives/restaurant.xcarchive
  modified: []

key-decisions:
  - "Used xcodebuild -exportArchive with destination:upload instead of separate xcrun altool -- single command archives, exports, and uploads"
  - "Used -authenticationKeyPath/-authenticationKeyID/-authenticationKeyIssuerID flags instead of Apple ID login for CLI authentication"
  - "Used individual app workspaces (not top-level EatFair.xcworkspace) for archive -- enables proper per-app code signing"

patterns-established:
  - "iOS TestFlight upload pattern: archive with per-app workspace + export with API key auth flags"

requirements-completed: [QUICK-13]

# Metrics
duration: 15min
completed: 2026-02-22
---

# Quick Task 13: Archive and Upload All 3 iOS Apps to TestFlight Summary

**All 3 iOS apps (Customer 1089, Driver 197, Restaurant 165) archived, exported, and uploaded to TestFlight via xcodebuild with App Store Connect API key authentication**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-23T01:35:23Z
- **Completed:** 2026-02-23T01:49:55Z
- **Tasks:** 4
- **Files modified:** 0

## Accomplishments
- Customer app (Dollor, build 1089, com.dollorai.customer) uploaded to TestFlight
- Driver app (Dollor Driver, build 197, com.dollorai.delivery) uploaded to TestFlight
- Restaurant app (eatffairrestaurant, build 165, com.dollorai.restaurant) uploaded to TestFlight
- All three archives created at /tmp/dollor-archives/
- No source files modified, no git commits to source code

## Task Commits

No source code commits -- this was a build/upload-only operation.

## Upload Results

| App | Build | Bundle ID | Archive Result | Upload Result | Upload Time |
|-----|-------|-----------|----------------|---------------|-------------|
| Customer (Dollor) | 1089 | com.dollorai.customer | ARCHIVE SUCCEEDED | Upload succeeded | 17:41:08 UTC |
| Driver (Dollor Driver) | 197 | com.dollorai.delivery | ARCHIVE SUCCEEDED | Upload succeeded | 17:45:43 UTC |
| Restaurant | 165 | com.dollorai.restaurant | ARCHIVE SUCCEEDED | Upload succeeded | 17:49:54 UTC |

## Code Signing Details

All three apps were signed with:
- **Signing Identity:** Apple Development: Jithesh Manoharan (GQ7PNUK7CZ)
- **Team ID:** PRKZ4UVCD7
- **Provisioning Profiles:**
  - Customer: iOS Team Provisioning Profile: com.dollorai.customer (a07e6135)
  - Driver: iOS Team Provisioning Profile: com.dollorai.delivery (36fae1de)
  - Restaurant: iOS Team Provisioning Profile: com.dollorai.restaurant (b71bf8f7)

## Decisions Made

- **Used xcodebuild -exportArchive with API key auth instead of separate altool upload:** The ExportOptions.plist files have `destination: upload`, so `xcodebuild -exportArchive` handles both export and upload in a single step. The plan's Step 3 (xcrun altool) was unnecessary. Passing `-authenticationKeyPath`, `-authenticationKeyID`, and `-authenticationKeyIssuerID` to xcodebuild provides the same API key auth that altool would use.
- **Used per-app workspaces for archive:** Each app has its own workspace (e.g., `apps/ios/customer/eatfaircustomer.xcworkspace`) which was used instead of the top-level `EatFair.xcworkspace`. This ensures proper code signing and provisioning per bundle ID.
- **Restaurant workspace worked (no fallback needed):** The plan included a fallback to `-project` for the restaurant app, but the workspace resolved the scheme correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added API key authentication flags to xcodebuild export**
- **Found during:** Task 2, Step 2 (Customer app IPA export)
- **Issue:** `xcodebuild -exportArchive` with `destination: upload` in ExportOptions.plist tried to use an Apple ID account (via IDEDistributionUploadAccountStep), but no Apple ID is logged in via Xcode CLI. Error: "Failed to Use Accounts"
- **Fix:** Added `-authenticationKeyPath`, `-authenticationKeyID`, `-authenticationKeyIssuerID` flags to xcodebuild command, pointing to the App Store Connect API key at `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8`
- **Files modified:** None (command-line change only)
- **Verification:** All three apps exported and uploaded successfully

**2. [Rule 3 - Blocking] Skipped separate altool upload step**
- **Found during:** Task 2, Step 2 (Customer app export)
- **Issue:** ExportOptions.plist has `destination: upload`, so xcodebuild -exportArchive uploads directly to App Store Connect. No local IPA file is saved. The plan's Step 3 (xcrun altool --upload-app) would fail because there is no local IPA to upload.
- **Fix:** Skipped Step 3 for all three apps since upload is handled by the export step
- **Files modified:** None
- **Verification:** xcodebuild output confirms "Upload succeeded" for all three apps

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to complete uploads. The actual outcome is identical -- all three builds are uploaded to TestFlight. The mechanism is slightly different (xcodebuild handles upload directly instead of a separate altool step).

## Warnings (Non-blocking)

All three apps produced warnings about missing dSYMs for pre-compiled binary frameworks (FirebaseFirestoreInternal, absl, grpc, grpcpp, openssl_grpc, and for Driver/Restaurant also FirebaseAnalytics, GoogleAdsOnDeviceConversion, GoogleAppMeasurement, GoogleAppMeasurementIdentitySupport). These are third-party XCFrameworks that do not ship debug symbols -- this is expected and does not affect app functionality or App Store review.

## Issues Encountered
- Initial export attempt failed with "Failed to Use Accounts" error -- resolved by adding API key authentication flags (documented above as deviation)

## User Setup Required
None -- all builds are processing in App Store Connect. They should appear in TestFlight within 5-15 minutes of upload.

## Next Steps
- Verify builds appear in App Store Connect > TestFlight (5-15 minute processing time)
- Enable TestFlight external testing groups if needed
- Submit for App Store review when ready

## Self-Check: PASSED

- 13-SUMMARY.md: FOUND (this file)
- 13-PLAN.md: FOUND
- customer.xcarchive: FOUND at /tmp/dollor-archives/customer.xcarchive
- driver.xcarchive: FOUND at /tmp/dollor-archives/driver.xcarchive
- restaurant.xcarchive: FOUND at /tmp/dollor-archives/restaurant.xcarchive
- No source files modified: VERIFIED (git status clean)
- All three uploads confirmed via xcodebuild output: "Upload succeeded"

---
*Quick Task: 13*
*Completed: 2026-02-22*
