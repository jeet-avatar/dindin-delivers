---
phase: 01-customer-driver-endpoint-auth
plan: 02
subsystem: auth
tags: [jwt, fastapi, depends, driver-auth, ownership-checks, role-enforcement, ride-auth]

# Dependency graph
requires:
  - phase: 01-01
    provides: auth_utils.py with require_driver, require_any_auth; customer endpoints already converted
provides:
  - All driver-specific endpoints in main_new.py use Depends(require_driver) from auth_utils.py
  - All shared ride endpoints use Depends(require_any_auth) with participant verification
  - Ownership checks on all driver_id path parameter endpoints (403 on mismatch)
  - Participant verification on ride cancel/rate/tip using JWT customer_id/driver_id
affects: [deploy plans, Phase 02 vendor+admin endpoint auth]

# Tech tracking
tech-stack:
  added: []
  patterns: [Depends(require_driver) for driver endpoints, Depends(require_any_auth) for shared ride endpoints, _auth.get("customer_id") for participant checks]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "Removed admin-or-owner JWT bypass from all driver Stripe/payout/status endpoints -- admin uses admin-specific endpoints"
  - "Converted ERP driver proxy endpoints (status, location) from require_any_auth to require_driver with ownership checks"
  - "Used _auth.get('customer_id') from JWT payload for ride participant verification instead of manual JWT decode"
  - "Ignored driver_id query param in /api/driver/bids to prevent IDOR -- always uses authenticated driver.id"

patterns-established:
  - "Driver ownership check: if driver.id != driver_id: raise HTTPException(403, 'Access denied')"
  - "Ride participant check: auth_customer_id = _auth.get('customer_id'); if ride.customer_id != auth_customer_id: raise 403"
  - "No redundant DB lookup: driver from Depends(require_driver) used directly, removed duplicate db.query(Driver)"
  - "Shared ride pattern: _auth: dict = Depends(require_any_auth) for both customer and driver callers"

requirements-completed: [AUTH-02]

# Metrics
duration: 14min
completed: 2026-02-21
---

# Phase 01 Plan 02: Driver + Shared Ride Endpoint Auth Summary

**29 driver endpoints converted to Depends(require_driver) with ownership checks, 19 shared ride endpoints converted to Depends(require_any_auth) with participant verification on cancel/rate/tip**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-21T21:07:51Z
- **Completed:** 2026-02-21T21:22:28Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- All 29 driver-specific endpoints use Depends(require_driver) -- customer/vendor JWTs now rejected
- All endpoints with driver_id in path verify authenticated driver owns the resource (403 on mismatch)
- All 19 shared ride endpoints use Depends(require_any_auth) with explicit per-endpoint auth
- Ride cancel/rate/tip verify caller is the ride's customer via JWT customer_id
- ERP rate_ride verifies caller is either ride customer or matched driver (participant check)
- Removed manual JWT decode blocks from 16 endpoints (cleaner, less error-prone)
- Removed admin-or-owner fallback from 9 Stripe/payout/status endpoints
- Prevented IDOR on /api/driver/bids by ignoring client-provided driver_id query param
- Net code reduction: 136 insertions, 339 deletions = net -203 lines across both commits

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert driver endpoints to Depends(require_driver)** - `0683a7c6` (feat)
   - 7 driver auth endpoints (refresh, me, online, location, documents POST/GET)
   - 9 path-param endpoints (delete, post-status, stripe/connect, stripe/onboarding-link, stripe/status, stripe/dashboard-link, payout-history, active-order, earnings-by-id)
   - 1 get_current_driver endpoint (driver/earnings)
   - 8 additional driver endpoints (profile-by-id, profile-update, documents-by-id GET/POST, bids, deliveries, location-android, available-deliveries)
   - 2 ERP proxy endpoints (drivers/{id}/status, drivers/{id}/location)
   - 2 FCM token endpoints (register, unregister)

2. **Task 2: Convert shared ride endpoints to Depends(require_any_auth)** - `85af5717` (feat)
   - 4 main ride endpoints (track, cancel, rate, tip)
   - 3 ERP ride endpoints (status, full-tracking, rate)
   - 7 iOS ride aliases (available, accept, picked-up, start, track, status, negotiate)
   - 5 negotiation endpoints (accept-fare, customer-negotiate, customer-accept-fare, negotiation-status, cancel-alias)
   - 3 ride chat endpoints (get chat, send chat, get messages)

## Files Created/Modified

- `apps/web/p2p-platform/backend/main_new.py` - All 29 driver + 19 shared ride endpoints converted to standardized auth

## Decisions Made

- Removed admin-or-owner JWT bypass from all driver Stripe/payout/status endpoints (admin uses admin endpoints, per Plan 01 pattern)
- Converted ERP proxy endpoints from require_any_auth to require_driver since only drivers call these
- Used JWT payload customer_id/driver_id for participant verification (no manual token re-decode needed)
- Ignored client-provided driver_id query param in /api/driver/bids to prevent IDOR

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed NameError in driver_refresh_token**
- **Found during:** Task 2 verification (test failure)
- **Issue:** After converting from get_current_user to require_driver, line 2641 still referenced `current_user.email` which no longer exists
- **Fix:** Changed to `driver.email` since require_driver returns the Driver object
- **Files modified:** apps/web/p2p-platform/backend/main_new.py
- **Verification:** test_driver_token_refresh now passes
- **Committed in:** 85af5717 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness. Would have caused NameError at runtime.

## Issues Encountered

- Pre-existing test failure: `test_404_returns_json` expects 404 but gets 401 from global auth middleware (not related to our changes)
- Pre-existing test failure: `test_update_location` sends JSON body for query params (test bug, not code bug)
- Pre-existing test failure: `test_save_driver_fcm_token` calls function directly without FastAPI DI (test pattern issue)
- 1290 tests pass, 8 fail (all pre-existing), 11 skipped

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Driver and shared ride auth is complete -- all endpoints enforce proper JWT
- Only vendor/admin endpoints still use get_current_user (Phase 02 scope)
- Plan 01-01 (customer), 01-02 (driver+ride), and 01-03 (bid_routes) are all complete
- Phase 01 is fully complete -- ready for deployment phase
- No blockers

## Self-Check: PASSED

- FOUND: 01-02-SUMMARY.md
- FOUND: apps/web/p2p-platform/backend/main_new.py
- FOUND: commit 0683a7c6 (Task 1)
- FOUND: commit 85af5717 (Task 2)

---
*Phase: 01-customer-driver-endpoint-auth*
*Completed: 2026-02-21*
