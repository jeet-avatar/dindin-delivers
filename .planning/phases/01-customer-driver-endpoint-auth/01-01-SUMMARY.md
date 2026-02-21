---
phase: 01-customer-driver-endpoint-auth
plan: 01
subsystem: auth
tags: [jwt, fastapi, depends, customer-auth, ownership-checks, role-enforcement]

# Dependency graph
requires:
  - phase: none
    provides: auth_utils.py with require_customer already existed
provides:
  - All 49 customer endpoints in main_new.py use Depends(require_customer) from auth_utils.py
  - Ownership checks on all customer_id path parameter endpoints (403 on mismatch)
  - Order ownership checks on all order action endpoints (tip, cancel, refund, track, chat, rate)
  - Cart endpoints require mandatory JWT auth (was optional Header pattern)
affects: [01-02-PLAN (driver endpoints), 01-03-PLAN (vendor+admin endpoints), deploy plans]

# Tech tracking
tech-stack:
  added: []
  patterns: [Depends(require_customer) for all customer endpoints, ownership check pattern for path params]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "Converted /api/auth/customer/me and /api/auth/customer/profile from manual oauth2_scheme to require_customer (not in original plan but required by must_haves)"
  - "Removed admin role bypass from tip-driver endpoint (customer-only, admin should use admin endpoints)"
  - "Removed vendor fallback from cancel-order (customer JWT has no vendor_id, vendor cancel is separate)"
  - "Kept shared ride endpoints (/api/rides/track, /api/rides/cancel) on get_current_user as they serve both customers and drivers"

patterns-established:
  - "Ownership check pattern: if customer.id != customer_id: raise HTTPException(403, 'Access denied')"
  - "Order ownership pattern: if order.customer_email != customer.email: raise HTTPException(403, 'Access denied')"
  - "No redundant DB lookup: use customer object from Depends(require_customer) directly instead of re-querying by email"

requirements-completed: [AUTH-01]

# Metrics
duration: 16min
completed: 2026-02-21
---

# Phase 01 Plan 01: Customer Endpoint Auth Summary

**49 customer endpoints converted from ad-hoc auth (get_current_customer, get_current_user, oauth2_scheme, Header pattern) to standardized Depends(require_customer) with ownership checks on all path-parameter endpoints**

## Performance

- **Duration:** 16 min
- **Started:** 2026-02-21T20:37:25Z
- **Completed:** 2026-02-21T20:53:01Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- All 49 customer endpoints use Depends(require_customer) from auth_utils.py -- driver/vendor JWTs now rejected
- All endpoints with customer_id in path verify authenticated customer owns the resource (403 on mismatch)
- All endpoints with order_id verify customer placed the order (403 on mismatch)
- Cart endpoints (6) converted from optional Header-based auth to mandatory JWT
- Email verification endpoints (3) converted from manual JWT decode to standardized auth
- Customer delete endpoint converted from manual JWT decode to standardized auth
- Removed redundant Customer DB lookups (favorites, addresses, FCM) by using Depends result directly
- Net code reduction: 101 lines removed (331 insertions, 331+101=432 deletions across both commits -- wait, actual: 251 insertions, 384 deletions = net -133 lines)

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert Group A + C + D customer endpoints** - `88fe4f96` (feat)
   - 10 Group A endpoints (get_current_customer -> require_customer)
   - 6 Group C cart endpoints (Header pattern -> require_customer)
   - 1 Group D promo endpoint (get_current_user -> require_customer)

2. **Task 2: Convert Group B + E + address + FCM + order create** - `e61d0eba` (feat)
   - 15 Group B endpoints (get_current_user -> require_customer with ownership)
   - 6 Group E endpoints (manual oauth2_scheme -> require_customer)
   - 6 address endpoints with ownership checks
   - 2 FCM token endpoints with ownership checks
   - 1 order create endpoint
   - 2 auth/customer profile endpoints (auto-fix deviation)

## Files Created/Modified

- `apps/web/p2p-platform/backend/main_new.py` - All 49 customer endpoints converted to Depends(require_customer)

## Decisions Made

- Kept shared ride endpoints (/api/rides/{id}/track, /api/rides/{id}/cancel) on get_current_user since both customers and drivers use them -- these belong in Plan 02 or 03
- Removed admin role bypass from tip-driver (customer-only endpoint; admin has separate admin endpoints)
- Removed vendor fallback from cancel-order (customer JWT cannot have vendor_id; vendors cancel via vendor endpoints)
- Did NOT modify get_current_customer_from_token calls on shared endpoints (/api/orders, /api/payments/intent) where auth is optional multi-role

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Converted /api/auth/customer/me and /api/auth/customer/profile**
- **Found during:** Task 2 verification
- **Issue:** Plan's must_haves require "No customer endpoint uses manual oauth2_scheme patterns" but these 2 customer endpoints were not listed in the plan's task actions
- **Fix:** Converted both from manual oauth2_scheme JWT decode to Depends(require_customer), added ownership check on profile update
- **Files modified:** apps/web/p2p-platform/backend/main_new.py
- **Verification:** Import succeeds, 97 customer tests pass
- **Committed in:** e61d0eba (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential to meet must_have success criteria. No scope creep.

## Issues Encountered

- Tests require a real PostgreSQL database for full suite; verified with SQLite fallback (923 passed, 34 pre-existing failures)
- Pre-existing test failures in vendor_endpoints, auth_endpoints, stripe_integration are unrelated to this change

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Customer auth is complete -- all 49 endpoints enforce customer JWT
- Ready for Plan 02 (driver endpoint auth conversion)
- No blockers

---
*Phase: 01-customer-driver-endpoint-auth*
*Completed: 2026-02-21*
