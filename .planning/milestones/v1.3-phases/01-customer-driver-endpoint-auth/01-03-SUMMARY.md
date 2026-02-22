---
phase: 01-customer-driver-endpoint-auth
plan: 03
subsystem: auth
tags: [jwt, fastapi, depends, auth_utils, bid_routes, rideshare, ownership-check]

# Dependency graph
requires:
  - phase: 01-customer-driver-endpoint-auth/01
    provides: "auth_utils.py with require_customer, require_driver, require_any_auth"
provides:
  - "All 35 bid_routes.py endpoints with per-endpoint auth via Depends()"
  - "Customer_id spoofing prevention on ride request creation"
  - "Driver_id spoofing prevention on bid submission"
  - "Ownership checks on all path-parameterized endpoints"
affects: [02-vendor-admin-endpoint-auth, deploy, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-endpoint Depends() auth replacing inline _require_auth() calls"
    - "Role-specific ownership checks on path-parameterized endpoints"
    - "ID spoofing prevention by overriding client-provided IDs with auth'd values"

key-files:
  created: []
  modified:
    - "apps/web/p2p-platform/backend/bid_routes.py"
    - "apps/web/p2p-platform/backend/tests/e2e/test_rideshare_e2e_flow.py"
    - "apps/web/p2p-platform/backend/tests/integration/test_ios_api_contracts.py"

key-decisions:
  - "Used require_customer for 11 customer endpoints, require_driver for 15 driver endpoints, require_any_auth for 9 shared/admin endpoints"
  - "Removed admin-bypass from customer/driver ownership checks -- admin operations use separate admin endpoints"
  - "Kept _require_auth() function definition for backward compat but no endpoints call it"

patterns-established:
  - "auth_driver naming: Use auth_driver param name when function already has a local driver variable"
  - "ID override: For POST endpoints that create resources, override client-provided IDs with auth'd values instead of just checking"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 25min
completed: 2026-02-21
---

# Phase 01 Plan 03: bid_routes.py Per-Endpoint Auth Summary

**35 rideshare bid endpoints secured with role-specific Depends() auth -- customer_id/driver_id spoofing prevented, ownership checks on all parameterized paths**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-21T20:37:40Z
- **Completed:** 2026-02-21T21:03:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 35 bid_routes.py endpoints now have explicit per-endpoint auth via Depends()
- Customer_id spoofing prevented on ride request creation (POST /request) -- auth'd customer.id used instead of client-provided value
- Driver_id spoofing prevented on bid submission (POST /request/{id}/bid) -- auth'd driver.id used instead of client-provided value
- Ownership checks on all endpoints with customer_id or driver_id in path
- Test suite updated: 1293 passed, 0 errors (up from 978 passed, 281 errors pre-fix)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth imports and convert all endpoints** - `17613d66` (feat)
2. **Task 2: Run test suite and fix auth-related regressions** - `78f9015d` (test)

## Files Created/Modified
- `apps/web/p2p-platform/backend/bid_routes.py` - Added auth_utils imports, replaced all _require_auth() with Depends()-based auth on 35 endpoints
- `apps/web/p2p-platform/backend/tests/e2e/test_rideshare_e2e_flow.py` - Added customer_headers/driver_headers fixtures, passed role-specific auth to all API calls
- `apps/web/p2p-platform/backend/tests/integration/test_ios_api_contracts.py` - Fixed rides_estimate test to pass customer auth

## Auth Distribution

| Auth Type | Count | Endpoints |
|-----------|-------|-----------|
| require_customer | 11 | ride request, cancel, view bids, respond to bid, disputes, recurring rides |
| require_driver | 15 | available rides, submit bid, update/withdraw/counter bids, arrived/start/complete/cancel, rate passenger, payout history |
| require_any_auth | 9 | surge, ride details, fare estimate, bid label, pricing tiers, receipt, email receipt, dispute detail, resolve dispute |

## Decisions Made
- Removed admin-bypass (`jwt_role != "admin"`) from customer and driver ownership checks. Admin operations should use dedicated admin endpoints, not bypass per-endpoint role auth.
- Used `auth_driver` parameter name (instead of `driver`) for driver auth on endpoints where the function body already queries a `driver` variable from DB.
- Applied `require_any_auth` to informational endpoints (surge, estimate, pricing tiers) even though they don't access user-specific data, to ensure explicit per-endpoint auth on every handler.
- Used `require_any_auth` + inline admin check for resolve_dispute (admin-only) since require_admin would be the correct auth but the plan specified using the three imported functions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale `payload` variable references after auth migration**
- **Found during:** Task 1 (endpoint conversion)
- **Issue:** After replacing `_require_auth(request)` with Depends()-based auth, 3 endpoints still referenced the removed `payload` variable: get_ride_request, get_available_ride_requests, get_ride_receipt
- **Fix:** Changed `payload.get(...)` to `_auth.get(...)` or `driver.id` as appropriate for each endpoint's auth parameter name
- **Files modified:** bid_routes.py
- **Verification:** grep for `payload` confirms only _require_auth definition (now unused) contains the word
- **Committed in:** 17613d66 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix -- stale variable references would cause NameError at runtime. No scope creep.

## Issues Encountered
- E2e test `test_full_rideshare_flow` still fails at Step 9 (chat endpoint in main_new.py, not bid_routes.py) -- pre-existing `'User' object has no attribute 'customer_id'` bug
- E2e test `test_tiered_pricing_tiers` fails at payment intent endpoint (main_new.py, not bid_routes.py) -- requires auth headers not in scope for this plan
- Both failures are outside bid_routes.py and not caused by this plan's changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All bid_routes.py endpoints secured with per-endpoint auth
- Ready for Phase 02 (vendor + admin endpoint auth) or deployment
- Pre-existing failures in main_new.py chat endpoint should be addressed in Phase 01 Plan 01/02 scope

---
*Phase: 01-customer-driver-endpoint-auth*
*Completed: 2026-02-21*
