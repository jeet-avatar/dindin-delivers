---
phase: quick-96
plan: 1
subsystem: api
tags: [haversine, push-notification, driver-location, proximity]

# Dependency graph
requires:
  - phase: quick-63
    provides: "In-memory dedup set pattern for delivery warnings"
provides:
  - "Driver approaching push notification within 500m of delivery"
  - "_haversine_distance_meters helper (meters precision)"
  - "_check_driver_proximity_to_delivery reusable function"
affects: [order-flow, driver-location, push-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Haversine GPS distance in meters", "In-memory dedup set for one-time push notifications"]

key-files:
  created:
    - apps/web/p2p-platform/backend/tests/unit/test_driver_proximity.py
  modified:
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "Reused existing import math and placed meters haversine near km variant for discoverability"
  - "Android endpoint gets null guard on lat/lng before proximity check (request body fields are optional)"

patterns-established:
  - "Proximity-based push: haversine distance + in-memory dedup set + try/except wrapper"

requirements-completed: [PROXIMITY-01]

# Metrics
duration: 6min
completed: 2026-03-05
---

# Quick Task 96: Driver Approaching Notification Summary

**Haversine proximity check on both driver location endpoints sends one-time "Driver Approaching" push to customer within 500m of delivery address**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-05
- **Completed:** 2026-03-05
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `_haversine_distance_meters()` for GPS distance calculation in meters
- Added `_check_driver_proximity_to_delivery()` wired into both PUT and POST driver location endpoints
- In-memory `_driver_approaching_notified` set prevents duplicate notifications per order
- 7 unit tests covering haversine accuracy, notification send/dedup/skip logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Add haversine helper and proximity check function** - `4b6396f1` (feat)
2. **Task 2: Unit tests for haversine and proximity notification** - `8a8b724b` (test)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Added `_haversine_distance_meters`, `_check_driver_proximity_to_delivery`, `_driver_approaching_notified` set, `DRIVER_APPROACHING_THRESHOLD_METERS` constant; wired into both location endpoints
- `apps/web/p2p-platform/backend/tests/unit/test_driver_proximity.py` - 7 tests for haversine accuracy and proximity notification logic

## Decisions Made
- Plan specified Times Square to Empire State Building as ~107m but actual haversine distance is ~1068m; test coordinates adjusted to use points ~200m apart for within-threshold tests
- Android endpoint POST /api/driver/location gets explicit null check on lat/lng before calling proximity check since request body fields are extracted from dict (could be None)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected test coordinate distances**
- **Found during:** Task 2 (unit test creation)
- **Issue:** Plan-specified coordinates (Times Square 40.7580,-73.9855 to ESB 40.7484,-73.9857) are actually ~1068m apart, not ~107m. This is beyond the 500m threshold, so proximity tests would fail.
- **Fix:** Updated known-distance test to expect ~1068m. Used closer coordinate pairs (~200m apart) for proximity notification tests.
- **Files modified:** tests/unit/test_driver_proximity.py
- **Committed in:** 8a8b724b

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Coordinate correction necessary for test accuracy. No scope creep.

## Issues Encountered
None beyond the coordinate correction above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Driver approaching notification ready for staging deploy
- 1385 existing tests pass with zero regressions

---
*Phase: quick-96*
*Completed: 2026-03-05*
