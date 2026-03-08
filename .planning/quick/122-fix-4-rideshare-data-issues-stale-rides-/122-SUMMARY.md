---
phase: quick-122
plan: 01
subsystem: api
tags: [rideshare, sqlalchemy, earnings, bids, cleanup]

provides:
  - Stale ride exclusion from available rides query (30-min null-expiry cutoff)
  - Rideshare earnings in driver earnings endpoint
  - Time-filtered driver bids with active_rides_count
  - Admin stale-rides cleanup endpoint
affects: [rideshare, driver-app, admin]

tech-stack:
  added: []
  patterns: [null-expiry age check for stale data, admin cleanup endpoints with JWT role check]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/bid_routes.py
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "30-minute cutoff for null-expiry rides balances freshness vs. normal ride creation flow"
  - "Admin cleanup uses require_any_auth + role check pattern consistent with existing dispute resolution"
  - "Rideshare earnings added as separate fields (rideshare_rides, rideshare_earnings) for backward compatibility"

requirements-completed: [RIDE-DATA-01, RIDE-DATA-02, RIDE-DATA-03, RIDE-DATA-04]

duration: 6min
completed: 2026-03-08
---

# Quick Task 122: Fix 4 Rideshare Data Issues Summary

**Stale ride filtering, rideshare earnings in driver payouts, time-filtered bids with active ride count, and admin cleanup endpoint**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-08T08:29:58Z
- **Completed:** 2026-03-08T08:36:10Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Available rides query excludes null-expiry rides older than 30 minutes (fixes 16 stale Feb 14-18 ghost rides)
- Background expiry job now catches and expires stale null-expiry rides automatically
- Admin cleanup endpoint POST /rides/admin/cleanup-stale-rides for manual bulk expiry
- Driver earnings endpoint includes rideshare_rides count, rideshare_earnings amount in totals
- Driver bids endpoint accepts `days` param (default 7) and returns `active_rides_count`

## Task Commits

1. **Task 1: Fix available rides query and add admin stale-rides cleanup** - `6512761c` (fix)
2. **Task 2: Add rideshare earnings and filter bids** - `433a0677` (feat)
3. **Task 3: Run tests and verify no regressions** - (verification only, no commit)

## Files Created/Modified
- `apps/web/p2p-platform/backend/bid_routes.py` - Stale ride filter, null-expiry cleanup job, admin cleanup endpoint, bids days filter + active_rides_count
- `apps/web/p2p-platform/backend/main_new.py` - Rideshare earnings query added to driver earnings endpoint

## Decisions Made
- 30-minute cutoff chosen for null-expiry rides: long enough for normal ride flow, short enough to expire stale data
- Admin cleanup follows existing dispute resolution auth pattern (require_any_auth + role == "admin")
- Rideshare earnings added as new fields rather than merged into existing food delivery fields for backward compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Test Results
- 1489 passed, 11 skipped, 0 failed
- All skips are expected (staging auth credentials not available in test env)

## User Setup Required
None - no external service configuration required.

## Next Steps
- Deploy to staging and production via CI/CD
- Verify on production that the 16 stale Feb 14-18 rides no longer appear in /rides/available
- Optionally run POST /rides/admin/cleanup-stale-rides to force-expire any remaining stale rides

---
*Quick Task: 122*
*Completed: 2026-03-08*
