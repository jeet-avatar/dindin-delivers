---
phase: 02-ios-api-verification
plan: 02
subsystem: api
tags: [ios, swift, driver-app, api-verification, P2PAPIService, backend-routes]

# Dependency graph
requires:
  - phase: 01-infrastructure-cleanup
    provides: "Production backend with security headers and credential resolution"
provides:
  - "Complete verification of all 53 iOS Driver app API calls against backend"
  - "4 mismatches documented with severity and fix approach"
  - "TODO comments at all mismatch call sites in P2PAPIService.swift"
  - "02-02-REPORT-DRIVER.md verification report"
affects: [02-03-PLAN, fix-plan, ios-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns: ["API verification via grep cross-reference between iOS Swift and Python FastAPI backend"]

key-files:
  created:
    - ".planning/phases/02-ios-api-verification/02-02-REPORT-DRIVER.md"
  modified:
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"

key-decisions:
  - "Document-only audit: no code fixes per user decision, only TODO comments at mismatch sites"
  - "Verified backend aliases (app.add_api_route) provide /api prefix routes for iOS compatibility"

patterns-established:
  - "API audit pattern: trace iOS baseURL construction -> P2PAPIService function -> backend route registration"
  - "Backend alias system at lines 21026-21060 bridges iOS /api prefix with legacy routes"

requirements-completed: [API-02]

# Metrics
duration: 9min
completed: 2026-02-22
---

# Phase 02 Plan 02: iOS Driver App API Verification Summary

**Verified 53 Driver app API calls against backend: 49 OK, 4 mismatches (3 critical, 1 medium) including broken document upload alias, wrong auth token in ride chat, and PUT vs POST FCM token method**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-22T23:26:07Z
- **Completed:** 2026-02-22T23:35:12Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Verified all 53 API calls reachable from the iOS Driver app (52 via P2PAPIService.shared + 1 direct URLRequest)
- Discovered 4 mismatches: broken document upload backend alias, ride chat using wrong auth token, FCM token wrong HTTP method
- Added 4 TODO comments at mismatch call sites in P2PAPIService.swift
- Documented backend alias architecture (lines 21026-21060 in main_new.py) that bridges iOS /api prefix gap
- Recorded TestFlight build baseline: Driver build 196, commit 1297b663, 158 commits behind HEAD

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract and verify all Driver app API calls against backend routes** - `812d0e9b` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `.planning/phases/02-ios-api-verification/02-02-REPORT-DRIVER.md` - Complete verification report with 53 API calls in structured tables
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - 4 TODO comments at mismatch call sites

## Decisions Made
- **Audit-only approach:** Per user decision, no code fixes applied. Only TODO comments and documentation.
- **Backend alias verification:** Discovered that 4 driver profile/document routes lack `/api` prefix in their primary registration but have `app.add_api_route()` aliases at lines 21026-21060 that provide the `/api` prefixed versions. 3 of 4 aliases are correct; the document upload alias (line 21033) maps to the wrong handler.

## Deviations from Plan

None - plan executed exactly as written.

## Mismatches Found (Summary)

### Critical (3)
1. **uploadDriverDocument** -- Backend alias maps `POST /api/drivers/{id}/documents` to `get_driver_documents` (returns status) instead of `upload_driver_document_by_id` (handles file upload). Driver document uploads silently fail.
2. **fetchRideChatMessages** -- Uses `customerToken` instead of `driverToken`. In Driver app, `customerToken` is nil, causing 401. Rideshare chat completely broken for drivers.
3. **sendRideChatMessage** -- Same `customerToken` issue as above. Drivers cannot send ride chat messages.

### Medium (1)
4. **saveDriverFCMToken (fcmToken: variant)** -- Uses PUT method but backend only accepts POST at `/api/erp/drivers/{id}/fcm-token`. Results in 405. Push notification registration broken for drivers.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Driver app API verification complete, ready for plan 02-03 (Restaurant app verification + consolidated FIX_PLAN.md)
- 4 mismatches should be included in the consolidated fix plan from 02-03
- Combined with 02-01 Customer app findings (44 mismatches), total iOS mismatches so far: 48

## Self-Check: PASSED

- [x] Report file exists: `.planning/phases/02-ios-api-verification/02-02-REPORT-DRIVER.md`
- [x] Summary file exists: `.planning/phases/02-ios-api-verification/02-02-SUMMARY.md`
- [x] Task commit exists: `812d0e9b`
- [x] TODO comments added: 4 new (7 total including 3 from 02-01)
- [x] Report has 49 OK + 4 MISMATCH = 53 total verified calls

---
*Phase: 02-ios-api-verification*
*Completed: 2026-02-22*
