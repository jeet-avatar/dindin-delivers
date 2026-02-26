---
phase: quick-53
plan: 01
subsystem: database
tags: [postgresql, sqlalchemy, asyncio, performance, indexing, geospatial]

# Dependency graph
requires:
  - phase: quick-52
    provides: RIDE_DB_FLOW_REPORT.md identifying 6 bottlenecks
provides:
  - 4 database indexes on hot-path columns (ride_requests.status, ride_requests.matched_driver_id, ride_bids.status, drivers.is_online)
  - Geo-filtered driver push notifications (25km bounding box + haversine)
  - Async batch push via asyncio.gather with asyncio.to_thread
  - Single-commit pattern using db.flush() for ride creation and bid submission
  - Deduplicated ride_request query in respond_to_bid
  - Batch bid-existence check replacing N+1 in get_available_ride_requests
affects: [rideshare, bid_routes, models, performance]

# Tech tracking
tech-stack:
  added: []
  patterns: [db.flush()-then-commit for auto-increment IDs, bounding-box-plus-haversine geo-filter, asyncio.to_thread for sync-to-async wrapping, batch IN query replacing N+1 loop]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/bid_routes.py

key-decisions:
  - "Used db.flush() instead of double db.commit() to get auto-incremented IDs before final commit"
  - "25km radius for driver push notifications with bounding-box pre-filter and haversine post-filter"
  - "asyncio.to_thread wraps synchronous send_push_notification for true concurrency, db=None avoids cross-thread session"
  - "Batch IN query for bid-existence check instead of per-ride N+1 queries"

patterns-established:
  - "db.flush() pattern: Use flush() to get auto-incremented IDs, set derived fields, then single commit()"
  - "Geo-filter pattern: Bounding box SQL pre-filter + haversine list-comprehension post-filter for distance queries"
  - "Async push pattern: asyncio.create_task(_send_push_batch(...)) with asyncio.to_thread for sync functions"

requirements-completed: [DB-IDX-01, DB-GEO-02, DB-PUSH-03, DB-COMMIT-04, DB-DUP-05, DB-N1-06]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Quick Task 53: Fix All 6 Ride Request Database Bottlenecks Summary

**4 column indexes, geo-filtered push notifications (25km), async batch push via asyncio.gather, flush-then-commit deduplication, and batch N+1 elimination reducing ride lifecycle from ~286 to ~80-100 queries**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-26T10:25:00Z
- **Completed:** 2026-02-26T10:33:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Added 4 database indexes to hot-path columns eliminating full table scans on ride_requests.status, ride_requests.matched_driver_id, ride_bids.status, drivers.is_online
- Driver push notifications geo-filtered to 25km radius using SQL bounding-box pre-filter + haversine post-filter (was: notify ALL online drivers globally)
- Push notifications sent concurrently via asyncio.gather with asyncio.to_thread wrapping (was: synchronous serial for-loop)
- Eliminated double-commit in ride creation and bid submission using db.flush() pattern (was: 2 commits each)
- Removed duplicate ride_request query in respond_to_bid (was: same query executed twice)
- Replaced N+1 bid-existence check in get_available_ride_requests with single batch IN query (was: 1 query per open ride request)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add missing database indexes to models.py** - `931a276c` (perf)
2. **Task 2: Geo-filter driver notifications + batch async push + double-commit fix** - `b9f9740c` (perf)
3. **Task 3: Fix duplicate query + N+1 batch bid check** - `05368b02` (perf)

## Files Created/Modified
- `apps/web/p2p-platform/backend/models.py` - Added index=True to 4 hot-path columns (RideRequest.status, RideRequest.matched_driver_id, RideBid.status, Driver.is_online)
- `apps/web/p2p-platform/backend/bid_routes.py` - Geo-filtered driver query, _send_push_batch async helper, db.flush() pattern, deduplicated query, batch bid-existence check

## Decisions Made
- Used simple column-level indexes (not composite) as first pass -- covers the most critical full-table-scan cases. Composite indexes (customer_id+status, ride_request_id+driver_id+status) can be added later via Alembic migration.
- 25km notification radius chosen (~15 miles + buffer) as reasonable rideshare pickup distance.
- Pass db=None to send_push_notification when called from asyncio.to_thread -- the order_flow.py fallback creates its own SessionLocal(), which is thread-safe. Request-scoped session would cause SQLAlchemy concurrency errors.
- Defined _send_push_batch at module scope (not nested in endpoint) for testability and reuse.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all 6 fixes applied cleanly with zero regressions.

## Test Results

- **Full backend suite:** 1289 passed, 18 failed (pre-existing auth-related test issues), 10 skipped
- **Bid/ride-specific tests:** 91 passed, 1 failed (pre-existing e2e auth issue), 5 skipped
- **Zero regressions** from the database optimization changes

## User Setup Required

None - no external service configuration required.

## Next Steps
- Deploy to staging and run load test to measure actual query reduction
- Consider composite indexes if slow queries persist under load
- Consider adding database connection pooling metrics to monitor improvement

## Self-Check: PASSED

- All files exist (models.py, bid_routes.py, 53-SUMMARY.md)
- All 3 task commits verified (931a276c, b9f9740c, 05368b02)
- All 6 fixes verified in code: 4 indexes, geo-filter, asyncio.gather, 2x db.flush(), batch bid check, single ride_request query in respond_to_bid

---
*Quick Task: 53*
*Completed: 2026-02-26*
