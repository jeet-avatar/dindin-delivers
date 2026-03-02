---
phase: quick-56
plan: 56
subsystem: api
tags: [fastapi, routing, ios, dead-code, cleanup]

# Dependency graph
requires: []
provides:
  - "Clean route registry: duplicate ride status alias removed"
  - "Dead iOS endpoint constants removed from AppConfig.swift"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-decorator pattern for path aliases on original handler (not separate alias functions)"

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift

key-decisions:
  - "Added bare /erp/ decorator to original get_ride_status handler to preserve path compatibility"
  - "Removed vendorAuth constant per checker advisory (points to /api/vendors/google-auth which does not exist; actual route is /api/auth/vendor/google-auth)"

patterns-established:
  - "Path aliases: use multi-decorator on original handler, not separate alias functions that delegate"

requirements-completed: [ROUTE-COLLISION-FIX]

# Metrics
duration: 7min
completed: 2026-03-02
---

# Quick Task 56: Route Collision Audit and Fix Summary

**Removed duplicate get_ride_status_ios_alias route, 3 dead AppConfig.swift endpoint constants (vendorAuth, vendorOrders, vendorMenu), preserved bare /erp/ path on original handler**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-02T22:19:12Z
- **Completed:** 2026-03-02T22:26:41Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed `get_ride_status_ios_alias` function (lines 14291-14298) that duplicated the `get_ride_status` handler at line 3679
- Added bare `/erp/rides/{ride_id}/status` decorator to original handler to preserve path compatibility for any clients using non-`/api/` prefix
- Removed 3 dead `APIEndpoints` constants from `AppConfig.swift`: `vendorAuth` (pointed to non-existent `/api/vendors/google-auth`), `vendorOrders`, and `vendorMenu` -- none referenced anywhere in iOS codebase
- Verified 1288 tests pass with zero new regressions (18 pre-existing auth failures unrelated to changes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove duplicate route and dead iOS endpoint constants** - `020fcae5` (fix)
2. **Task 2: Run full test suite and verify no regressions** - verification only, no code changes

**Plan metadata:** (pending)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Removed duplicate `get_ride_status_ios_alias` function (7 lines), added bare `/erp/` decorator to original handler
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` - Removed 5 lines: `vendorAuth`, `vendorOrders`, `vendorMenu` constants and their comment header

## Decisions Made
- Added bare `/erp/rides/{ride_id}/status` decorator to original `get_ride_status` handler (line 3679) to preserve the path that was registered by the now-deleted alias. This ensures any client using the non-`/api/` prefixed path continues to work.
- Removed `vendorAuth` constant per checker advisory: it pointed to `/api/vendors/google-auth` which does NOT exist in the backend. The actual vendor OAuth route is `/api/auth/vendor/google-auth` at `main_new.py:2208`. Since no iOS code references the constant, removal is safe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Checker Advisory] Removed vendorAuth constant**
- **Found during:** Task 1
- **Issue:** Checker advisory identified `vendorAuth = "/api/vendors/google-auth"` in AppConfig.swift points to a non-existent backend route (actual route is `/api/auth/vendor/google-auth`)
- **Fix:** Removed the constant along with the other two dead constants
- **Files modified:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift`
- **Verification:** `grep -rn vendorAuth` across iOS codebase returned zero references outside AppConfig.swift
- **Committed in:** `020fcae5`

---

**Total deviations:** 1 auto-fixed (checker advisory, dead code removal)
**Impact on plan:** The plan already suggested checking vendorAuth; checker advisory confirmed removal was safe. No scope creep.

## Issues Encountered
- Backend import check (`import main_new`) requires DATABASE_URL and JWT_SECRET_KEY environment variables at module load time. Used `py_compile` for syntax verification and test suite (which sets up its own env) for full integration verification.
- Many other duplicate routes exist in main_new.py (pre-existing). These are out of scope for this task which specifically addressed the ride status duplicate.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Route registry is cleaner but many other duplicate registrations remain (pre-existing)
- AppConfig.swift still contains endpoint constants that may not all be used; a full audit of all constants vs P2PAPIService.swift usage could further clean up
- All changes are backward-compatible; no client updates needed

---
*Phase: quick-56*
*Completed: 2026-03-02*
