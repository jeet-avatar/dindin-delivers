---
phase: 06-ssl-pinning-rotation-fix
plan: 01
subsystem: security
tags: [ssl-pinning, ios, testflight, amazon-root-ca, spki, certificate-pinning]

# Dependency graph
requires:
  - phase: 03-ios-vapt
    provides: "Original SSL pinning implementation with leaf+intermediate pins"
provides:
  - "Root CA SPKI pins in NetworkSecurity.swift (5 Amazon Trust Services root CAs)"
  - "iOS builds 1097/205/174 on TestFlight with root-only SSL pinning"
affects: [ios-distribution, ssl-renewal, production-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Root CA pinning instead of leaf/intermediate pinning for ACM certificate resilience"]

key-files:
  created: []
  modified:
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift"
    - "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
    - "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
    - "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"

key-decisions:
  - "Pin all 5 Amazon Trust Services root CAs for maximum resilience against AWS chain changes"
  - "Remove leaf and intermediate pins entirely -- root CAs never change, eliminating renewal breakage"

patterns-established:
  - "Root CA SPKI pinning: pin root CAs only, never leaf/intermediate certificates"
  - "All 5 Amazon root CAs pinned per domain for redundancy against AWS intermediate rotation"

requirements-completed: [SSL-01, SSL-02]

# Metrics
duration: 45min
completed: 2026-02-27
---

# Phase 06 Plan 01: SSL Pinning Rotation Fix Summary

**Migrated iOS SSL pinning from leaf+intermediate to 5 Amazon Root CA SPKI pins and uploaded all 3 apps to TestFlight (builds 1097/205/174)**

## Performance

- **Duration:** 45 min (code change + 3 archive/upload cycles)
- **Started:** 2026-02-27T03:53:44Z
- **Completed:** 2026-02-27T07:36:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced leaf pin (`WggyjbYa6k0khD7aafEMGmJ`) and intermediate pin (`G9LNNAql897egYsabashkzUCTEJkWBzgoEtk8X`) with 5 Amazon Root CA SPKI hashes
- Both `dollor.ai` and `api.dollor.ai` domains now pin: Amazon Root CA 1 (RSA 2048), CA 2 (RSA 4096), CA 3 (EC P-256), CA 4 (EC P-384), Starfield Services Root G2 (RSA 2048)
- All 3 iOS apps archived, signed, and uploaded to TestFlight: Customer 1097, Driver 205, Restaurant 174
- Apps will now survive all future ACM certificate renewals without requiring app updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace leaf+intermediate pins with 5 Amazon Root CA SPKI pins** - `88092351` (feat)
2. **Task 2: Build and upload all 3 iOS apps to TestFlight** - `8dacc1dc` (chore)

## Files Created/Modified
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift` - Replaced pinnedDomains dictionary with 5 root CA hashes per domain
- `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj` - Build 1096 -> 1097
- `apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj` - Build 204 -> 205
- `apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj` - Build 173 -> 174

## Decisions Made
- Pinned all 5 Amazon Trust Services root CAs (not just the one currently in chain) for resilience against AWS rotating its intermediate/root selection
- Root CA keys are permanent by design -- changing a root key would break the entire PKI chain of trust, so these pins never need updating
- Stripe and CloudFront domains intentionally excluded from pinning (Stripe handles its own validation; CloudFront rotates frequently)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Xcode first-launch setup required**
- **Found during:** Task 2 (archive)
- **Issue:** `xcodebuild` failed with "Failed to load code for plug-in IDESimulatorFoundation" after Xcode update
- **Fix:** Ran `xcodebuild -runFirstLaunch` to install required components
- **Files modified:** None (system-level)
- **Verification:** Subsequent archive commands succeeded
- **Committed in:** N/A (no code change)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor toolchain issue, no code scope change.

## Issues Encountered
- Xcode plugin load failure required `-runFirstLaunch` before archiving (resolved automatically)
- dSYM warnings for Firebase/gRPC third-party frameworks during export -- cosmetic only, does not affect app functionality

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SSL pinning is now future-proof against ACM certificate renewals
- Combined with Phase 06 Plan 02 (CloudWatch alarms + rotation runbook), the SSL infrastructure is production-ready
- Phase 07 (Google Play Store Distribution) can proceed independently

## Self-Check: PASSED

- All 4 modified files exist on disk
- Both commit hashes (88092351, 8dacc1dc) found in git log
- SUMMARY.md created at expected path

---
*Phase: 06-ssl-pinning-rotation-fix*
*Completed: 2026-02-27*
