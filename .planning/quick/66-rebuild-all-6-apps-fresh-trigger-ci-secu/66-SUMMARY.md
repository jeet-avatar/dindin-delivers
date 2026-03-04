---
phase: quick-66
plan: 66
subsystem: build-distribution
tags: [xcodebuild, testflight, firebase, android, ios, gradle]

# Dependency graph
requires:
  - phase: quick-65
    provides: "Previous build versions (1106/211/181 iOS, vC=31/28/24 Android)"
provides:
  - "iOS Customer build 1107 on TestFlight"
  - "iOS Driver build 212 on TestFlight"
  - "iOS Restaurant build 182 on TestFlight"
  - "Android Customer vC=32 (v1.0.31) on Firebase"
  - "Android Driver vC=29 (v1.0.28) on Firebase"
  - "Android Partner vC=25 (v1.0.24) on Firebase"
affects: [app-store-submission, testing, qa]

# Tech tracking
tech-stack:
  added: []
  patterns: [parallel-ios-archives, parallel-firebase-distribute]

key-files:
  created: []
  modified:
    - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj

key-decisions:
  - "CI Security workflow lacks workflow_dispatch trigger -- cannot be manually triggered; only fires on PR to main or push to develop"

patterns-established:
  - "Parallel iOS archive pattern: 3 concurrent xcodebuild archive + sequential export/upload"
  - "Firebase distribute immediately after assembleRelease completes"

requirements-completed: [BUILD-66]

# Metrics
duration: 12min
completed: 2026-03-04
---

# Quick Task 66: Rebuild All 6 Apps Summary

**All 6 apps rebuilt with bumped build numbers: iOS 1107/212/182 to TestFlight, Android vC=32/29/25 to Firebase App Distribution**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-04T08:47:58Z
- **Completed:** 2026-03-04T09:00:30Z
- **Tasks:** 3
- **Files modified:** 6 (3 iOS pbxproj + 3 Android build.gradle.kts)

## Accomplishments
- Bumped all 6 app build numbers (iOS: 1106->1107, 211->212, 181->182; Android: vC=31->32, vC=28->29, vC=24->25)
- Uploaded 3 iOS apps to TestFlight via xcodebuild archive + exportArchive (parallel archives)
- Built 3 Android release APKs and distributed to Firebase App Distribution
- Pushed both repos (doordash-p2p + eatfair-android) to remote

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump iOS build numbers, push code** - `a6ea527c` (build) -- iOS repo
2. **Task 1: Bump Android build numbers, push code** - `f9500fbb` (build) -- Android repo
3. **Task 2: Archive and upload iOS apps to TestFlight** - No commit (build/upload only)
4. **Task 3: Build and distribute Android apps to Firebase** - No commit (build/distribute only)

## Files Created/Modified
- `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj` - CURRENT_PROJECT_VERSION 1106 -> 1107 (6 occurrences)
- `apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj` - CURRENT_PROJECT_VERSION 211 -> 212 (6 occurrences)
- `apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj` - CURRENT_PROJECT_VERSION 181 -> 182 (6 occurrences)
- `(android) app/build.gradle.kts` - versionCode 31->32, versionName "1.0.30"->"1.0.31"
- `(android) driver/build.gradle.kts` - versionCode 28->29, versionName "1.0.27"->"1.0.28"
- `(android) partner/build.gradle.kts` - versionCode 24->25, versionName "1.0.23"->"1.0.24"

## Decisions Made
- CI - Security & Quality workflow does not have a `workflow_dispatch` trigger (only PR and push to develop). Cannot be manually triggered. Skipped this sub-step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CI Security workflow cannot be manually triggered**
- **Found during:** Task 1 (trigger CI workflow)
- **Issue:** `gh workflow run "CI - Security & Quality"` returned HTTP 422 -- workflow only has `pull_request` and `push` triggers, no `workflow_dispatch`
- **Fix:** Skipped CI trigger -- the workflow will run automatically on next PR to main
- **Files modified:** None
- **Verification:** `gh workflow view "CI - Security & Quality" --yaml` confirmed no workflow_dispatch trigger
- **Committed in:** N/A (no code change)

---

**Total deviations:** 1 (CI workflow trigger unavailable)
**Impact on plan:** Minimal -- security scans will run on next PR. All 6 apps successfully built and distributed.

## Issues Encountered
- ExportOptions.plist with `destination: upload` uploads directly to App Store Connect without writing IPA to disk -- this is expected behavior, not an error
- dSYM warnings for grpc/grpcpp/openssl_grpc frameworks during export are cosmetic (third-party Firebase dependencies)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 apps on latest codebase with fresh build numbers
- Ready for testing or App Store submission
- MEMORY.md updated with new build versions

## Self-Check: PASSED

- FOUND: 66-SUMMARY.md
- FOUND: a6ea527c (iOS build bump commit)
- FOUND: f9500fbb (Android build bump commit)
- VERIFIED: iOS Customer 1107 uploaded to TestFlight ("Uploaded eatfaircustomer / EXPORT SUCCEEDED")
- VERIFIED: iOS Driver 212 uploaded to TestFlight ("Uploaded eatffairdelivery / EXPORT SUCCEEDED")
- VERIFIED: iOS Restaurant 182 uploaded to TestFlight ("Uploaded eatffairrestaurant / EXPORT SUCCEEDED")
- VERIFIED: Android Customer vC=32 distributed to Firebase ("uploaded new release 1.0.31 (32) successfully")
- VERIFIED: Android Driver vC=29 distributed to Firebase ("uploaded new release 1.0.28 (29) successfully")
- VERIFIED: Android Partner vC=25 distributed to Firebase ("uploaded new release 1.0.24 (25) successfully")

---
*Phase: quick-66*
*Completed: 2026-03-04*
