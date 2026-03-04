---
phase: quick-65
plan: 01
subsystem: infra
tags: [ci-cd, firebase, testflight, ecs, deploy, android, ios]

requires:
  - phase: quick-60 through quick-64
    provides: Code changes for delivery timeout, vendor doc upload, deterministic chat, ride availability

provides:
  - Backend deployed to staging and production with all recent changes
  - All 3 Android APKs distributed to Firebase App Distribution
  - All 3 iOS apps uploaded to TestFlight with bumped build numbers

affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py
    - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj

key-decisions:
  - "Fixed test_get_realtime_analytics call count boundaries for 15 OrderStatus values (was 13, PENDING_DELIVERY_PROOF + DELIVERY_FAILED added in quick-63)"
  - "Re-triggered staging deploy after test fix push rather than waiting for production deploy first"

patterns-established: []

requirements-completed: []

duration: 14min
completed: 2026-03-04
---

# Quick Task 65: Deploy Backend, Distribute Android APKs, Rebuild iOS Summary

**Backend deployed to staging+production via CI/CD, 3 Android APKs distributed to Firebase, 3 iOS apps archived and uploaded to TestFlight (builds 1106/211/181)**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-04T08:22:09Z
- **Completed:** 2026-03-04T08:36:28Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Backend deployed to staging (run 22661219776) and production (run 22661218347) via CI/CD workflows
- All 3 Android APKs distributed to Firebase App Distribution for jeetnair.in@gmail.com (Customer v1.0.30/vC=31, Driver v1.0.27/vC=28, Partner v1.0.23/vC=24)
- All 3 iOS apps archived and uploaded to TestFlight (Customer 1106, Driver 211, Restaurant 181)
- MEMORY.md build version table updated to reflect new builds

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy backend to staging and production** - No file commit needed (CI/CD only)
   - Staging: `gh workflow run deploy-staging.yml` -- run 22661219776 succeeded
   - Production: `gh workflow run deploy-dollar-ai.yml` -- run 22661218347 succeeded
   - Staging health: 200, Production health: 200
2. **Task 2: Distribute Android APKs to Firebase** - No file commit needed (Firebase CLI only)
   - Customer: `1:65740760476:android:535885ca28086e6242d459` -- uploaded v1.0.30 (31)
   - Driver: `1:65740760476:android:7d9bed1ee685434c42d459` -- uploaded v1.0.27 (28)
   - Partner: `1:65740760476:android:8591cc17fa4f8d4c42d459` -- uploaded v1.0.23 (24)
3. **Task 3: Bump iOS build numbers, archive, upload to TestFlight** - `2076afff` (chore)
   - Customer: build 1106, archive + export succeeded, uploaded to ASC
   - Driver: build 211, archive + export succeeded, uploaded to ASC
   - Restaurant: build 181, archive + export succeeded, uploaded to ASC

## Files Created/Modified
- `apps/web/p2p-platform/backend/tests/unit/test_order_flow.py` - Fixed call count boundaries for 15 OrderStatus values
- `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj` - Build number 1106
- `apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj` - Build number 211
- `apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj` - Build number 181

## Decisions Made
- Fixed test_get_realtime_analytics before deploying (CI/CD tests were failing due to stale call count boundaries)
- Deployed to production using the push-triggered workflow (run 22661218347) which already included the test fix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test_get_realtime_analytics for 15 OrderStatus values**
- **Found during:** Task 1 (Backend deploy to staging)
- **Issue:** CI/CD staging deploy failed -- test_get_realtime_analytics had call count boundaries for 13 order statuses, but PENDING_DELIVERY_PROOF and DELIVERY_FAILED were added in quick-63, making the total 15. Call count routing sent driver/order queries to wrong mock handlers, causing TypeError: '>' not supported between MagicMock and int.
- **Fix:** Updated call count boundaries from <=13 to <=15 for status queries, <=15 to <=17 for driver queries, shifted completed orders/vendor/prep query offsets by 2, added scalar_query mock for avg delivery time query.
- **Files modified:** `apps/web/p2p-platform/backend/tests/unit/test_order_flow.py`
- **Verification:** `pytest tests/unit/test_order_flow.py::TestAnalytics::test_get_realtime_analytics -v` passes locally. CI/CD tests pass on re-triggered deploy.
- **Committed in:** `4603fabb`

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Test fix was necessary to unblock CI/CD deploy. No scope creep.

## Issues Encountered
- Initial staging deploy failed due to test_get_realtime_analytics TypeError (fixed via deviation Rule 1)
- dSYM upload warnings on iOS exports (cosmetic -- Firebase framework symbols, does not affect builds)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All platforms current with latest code (quick-60 through quick-64 changes)
- Backend healthy on both staging and production
- Ready for next development cycle

## Self-Check: PASSED

- FOUND: 65-SUMMARY.md
- FOUND: 4603fabb (test fix commit)
- FOUND: 2076afff (iOS build bump commit)
- FOUND: Staging deploy success (run 22661219776)
- FOUND: Production deploy success (run 22661218347)

---
*Quick Task: 65*
*Completed: 2026-03-04*
