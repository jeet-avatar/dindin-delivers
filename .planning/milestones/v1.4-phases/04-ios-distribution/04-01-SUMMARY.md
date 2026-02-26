---
phase: 04-ios-distribution
plan: 01
subsystem: api
tags: [swift, python, fastapi, p2p-api, ios, backend]

# Dependency graph
requires:
  - phase: 02-ios-api-verification
    provides: "FIX_PLAN.md with 8 iOS API mismatches to fix"
  - phase: 03-android-api-verification
    provides: "FIX_PLAN.md with 2 backend fixes (driver doc alias, vendor self-delete)"
provides:
  - "P2PAPIService.swift with 5 code fixes (chat auth, FCM method, customer profile path, menu update method)"
  - "Backend driver document upload alias correctly wired to upload handler"
  - "Backend vendor self-delete endpoint DELETE /api/vendors/{vendor_id}/delete"
affects: [04-02, 05-android-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "driverToken ?? customerToken fallback for dual-role endpoints (driver or customer context)"
    - "Vendor self-delete follows same pattern as customer/driver delete (JWT auth + id cross-check)"

key-files:
  created: []
  modified:
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "Chat auth uses driverToken ?? customerToken (not just customerToken) so drivers can access ride chat"
  - "Vendor self-delete uses require_vendor Depends + id cross-check matching existing customer/driver pattern"
  - "Fixes 6 and 7 (assignStockImages, getAIEmployeeStats) already had correct auth headers -- verified, no change needed"

patterns-established:
  - "Dual-role token fallback: driverToken ?? customerToken for endpoints accessible by both roles"
  - "Account self-delete pattern: DELETE /api/{role}s/{id}/delete with JWT auth + id ownership check"

requirements-completed: []  # DIST-01/02/03 are for TestFlight upload, not API fixes -- those complete in 04-02

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 04 Plan 01: iOS API Fixes + Backend Fixes Summary

**5 iOS API fixes in P2PAPIService.swift (chat auth, FCM method, profile path, menu method) + 2 backend fixes (driver doc upload alias, vendor self-delete endpoint)**

## Performance

- **Duration:** 5 min (pre-committed)
- **Started:** 2026-02-25T10:40:00Z
- **Completed:** 2026-02-25T10:42:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed CRITICAL driver ride chat auth: `fetchRideChatMessages` and `sendRideChatMessage` now use `driverToken ?? customerToken` so the Driver app can send/receive chat messages during rides
- Fixed 3 MEDIUM iOS issues: FCM token save uses POST (not PUT), customer profile update hits `/auth/customer/profile` (JWT-based), menu item update uses PUT (not PATCH)
- Fixed backend driver document upload alias: POST `/api/drivers/{id}/documents` now correctly routes to `upload_driver_document_by_id` instead of `get_driver_documents`
- Added vendor self-delete endpoint: DELETE `/api/vendors/{vendor_id}/delete` with vendor JWT auth, matching customer/driver delete pattern (required by Google Play Store policy)

## Task Commits

Both tasks were committed atomically in a single commit (changes applied together):

1. **Task 1: Apply 8 iOS API fixes in P2PAPIService.swift** - `bd40371` (fix)
2. **Task 2: Apply 2 backend fixes in main_new.py** - `bd40371` (fix)

**Plan metadata:** (this file)

## Files Created/Modified
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - 5 code fixes: chat auth token fallback (2), FCM method PUT->POST (1), customer profile path (1), menu update method PATCH->PUT (1). Fixes 6-7 verified already correct, Fix 8 removed resolved TODOs.
- `apps/web/p2p-platform/backend/main_new.py` - Driver doc upload alias fix (line 20989) + new vendor self-delete endpoint (line 3389) + vendor delete alias (line 20993)

## Decisions Made
- Combined both tasks into a single atomic commit since the iOS and backend fixes are logically related (both from verification phases) and need to ship together
- Verified that Fixes 6 (assignStockImages auth) and 7 (getAIEmployeeStats auth) already had correct auth headers in the codebase -- no changes needed, documented as verified
- Vendor self-delete follows exact pattern from existing customer/driver delete endpoints with `require_vendor` Depends and vendor_id ownership check

## Deviations from Plan

None - plan executed exactly as written. All 5 code changes applied, 2 verification-only items confirmed correct, TODO cleanup completed.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- P2PAPIService.swift is now correct for all verified API calls -- ready for TestFlight build (Plan 04-02)
- Backend has vendor self-delete endpoint -- ready for production deploy before app build
- Plan 04-02 will bump build numbers, deploy backend, then archive and upload all 3 iOS apps to TestFlight

## Self-Check: PASSED

- FOUND: P2PAPIService.swift
- FOUND: main_new.py
- FOUND: commit bd40371
- FOUND: 04-01-SUMMARY.md

---
*Phase: 04-ios-distribution*
*Completed: 2026-02-25*
