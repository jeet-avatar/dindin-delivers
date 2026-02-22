---
phase: 02-vendor-admin-endpoint-auth
plan: 01
subsystem: auth
tags: [jwt, fastapi, depends, vendor, ownership-check]

# Dependency graph
requires:
  - phase: 01-customer-driver-endpoint-auth
    provides: auth_utils.py with require_vendor, require_admin functions
provides:
  - All 31 vendor endpoints use Depends(require_vendor) with ownership checks
  - 5 admin-only vendor management endpoints use Depends(require_admin)
  - Zero get_current_vendor callers in endpoint signatures
  - Zero manual JWT decode blocks on vendor endpoints
affects: [02-03-PLAN, deploy, ios-restaurant-app, android-partner-app]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vendor ownership check: _auth_vendor.id != vendor_id -> 403"
    - "Vendor self-access: vendor: Vendor = Depends(require_vendor) with no path param"

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py

key-decisions:
  - "No admin bypass on any vendor endpoint -- admin uses admin-specific endpoints"
  - "Quick-publish endpoint converted to Depends(require_admin) since it is admin-only"
  - "Self-access endpoints (profile, earnings, KOT config) use vendor: Vendor = Depends(require_vendor) with no ownership check needed"

patterns-established:
  - "Pattern: _auth_vendor: Vendor = Depends(require_vendor) + if _auth_vendor.id != vendor_id: 403 for all {vendor_id} path param endpoints"
  - "Pattern: vendor: Vendor = Depends(require_vendor) for self-access endpoints (no path param needed)"

requirements-completed: [AUTH-03]

# Metrics
duration: 19min
completed: 2026-02-22
---

# Phase 02 Plan 01: Vendor Endpoint Auth Summary

**Converted 31 vendor endpoints from ad-hoc auth to standardized Depends(require_vendor) with ownership checks, plus 5 admin-only vendor management endpoints to Depends(require_admin)**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-22T02:34:51Z
- **Completed:** 2026-02-22T02:53:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Converted 22 vendor endpoints from get_current_user/get_current_vendor to Depends(require_vendor) with ownership checks
- Converted 7 vendor Stripe/location/register endpoints from manual JWT decode to Depends(require_vendor)
- Converted 5 admin-only vendor management endpoints to Depends(require_admin)
- Achieved zero get_current_vendor callers in endpoint signatures
- Achieved zero manual JWT decode blocks on any vendor endpoint
- Added ownership checks (vendor_id match) on all 28 endpoints with {vendor_id} path params

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert vendor endpoints to Depends(require_vendor)** - `d4a940d8` (feat)
   - Note: Task 2 Stripe endpoint conversions were also included in this commit as they were staged together
2. **Task 2: Test fix for vendor FCM token test** - `4a535aea` (fix)
   - Deviation Rule 3: test called register_vendor_fcm_token without new _auth_vendor param

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Converted 31 vendor endpoints from ad-hoc to standardized auth
- `apps/web/p2p-platform/backend/tests/unit/test_order_flow.py` - Fixed test_save_vendor_fcm_token to pass _auth_vendor parameter

## Decisions Made
- No admin bypass on any vendor endpoint -- admin uses admin-specific endpoints (consistent with Phase 01 decision)
- Quick-publish endpoint uses Depends(require_admin) since only admins should publish vendors
- Self-access endpoints (vendor/profile, vendor/earnings, vendor/kot-config, vendor/kot-test, vendor/my-documents, vendor/my-documents/upload) use simple `vendor: Vendor = Depends(require_vendor)` without path param ownership check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test_save_vendor_fcm_token to pass _auth_vendor parameter**
- **Found during:** Task 2 verification
- **Issue:** Unit test called register_vendor_fcm_token directly without the new _auth_vendor parameter, causing AttributeError
- **Fix:** Added `_auth_vendor=mock_vendor` kwarg to the test function call
- **Files modified:** tests/unit/test_order_flow.py
- **Verification:** Test passes after fix
- **Committed in:** 4a535aea

**2. [Note] Prior commit 2b79095f already converted 12 vendor endpoints**
- The prior session commit labeled as `02-02` (admin endpoint conversion) also included some vendor endpoint conversions (from get_current_user to require_vendor). This reduced the work needed in this plan's Task 1. All remaining vendor endpoints were converted in this execution.

---

**Total deviations:** 1 auto-fixed (1 blocking test fix)
**Impact on plan:** Minor -- test fix was necessary for correctness after auth conversion. No scope creep.

## Issues Encountered
- SQLite "database is locked" error on test_register_success -- pre-existing test infrastructure issue, not caused by changes
- 12 document integration tests fail with 401 -- pre-existing issue from global auth middleware, not caused by vendor endpoint changes
- Both issues confirmed to exist identically before and after changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All vendor endpoints now have per-endpoint Depends(require_vendor) auth
- Plan 02-03 (admin portal/ERP endpoints + final AUTH-06 audit) is unblocked
- Deploy is needed to ship these changes to staging/production

---
*Phase: 02-vendor-admin-endpoint-auth*
*Completed: 2026-02-22*

## Self-Check: PASSED
- All files exist (main_new.py, test_order_flow.py, 02-01-SUMMARY.md)
- All commits exist (d4a940d8, 4a535aea)
