---
phase: 02-vendor-admin-endpoint-auth
plan: 03
subsystem: auth
tags: [jwt, fastapi, depends, require_admin, require_any_auth, require_vendor, auth-06]

# Dependency graph
requires:
  - phase: 02-vendor-admin-endpoint-auth/02-01
    provides: "auth_utils.py with require_vendor, vendor endpoints converted"
  - phase: 02-vendor-admin-endpoint-auth/02-02
    provides: "admin endpoints converted to Depends(require_admin)"
provides:
  - "All ~65 admin portal/ERP endpoints converted to role-appropriate Depends() auth"
  - "Zero Depends(get_current_user) in endpoint signatures (except GET /api/auth/me)"
  - "Zero Depends(get_current_vendor) in endpoint signatures"
  - "AUTH-06 verified: every non-public endpoint has explicit Depends() auth"
  - "Public path allowlist updated with missing entries (/privacy, /terms, /api/erp/restaurants/{id})"
affects: [deploy, ios-apps, android-apps]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin portal endpoints: admin: User = Depends(require_admin)"
    - "Multi-role endpoints (orders, chat, modifications): _auth: dict = Depends(require_any_auth)"
    - "Restaurant-only endpoints (delivery decisions): _auth_vendor: Vendor = Depends(require_vendor)"
    - "JWT payload extraction: _auth.get('role'), _auth.get('sub'), _auth.get('vendor_id')"

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py

key-decisions:
  - "GET /api/orders uses require_any_auth with JWT payload role check (admin sees all, non-admin sees own)"
  - "PATCH /api/orders/{order_id}/status uses require_any_auth with participant verification via JWT payload"
  - "Chat endpoints use require_any_auth (multi-role: customer, driver, admin)"
  - "Delivery decision endpoints use require_vendor (restaurant-only operations)"
  - "Order modification endpoints use require_any_auth (customer and vendor access)"
  - "Debug endpoint uses require_admin for defense-in-depth (also blocked by IS_PRODUCTION)"
  - "Removed redundant manual role check from submit_manual_review (require_admin handles it)"
  - "Added /privacy, /terms, /api/erp/restaurants/{id} to public path allowlist"

patterns-established:
  - "Pattern: JWT payload role check via _auth.get('role') != 'admin' for conditional admin-vs-non-admin logic"
  - "Pattern: all admin portal features (invoice, client, dashboard, Coupa, accounting, tickets) use Depends(require_admin)"

requirements-completed: [AUTH-05, AUTH-06]

# Metrics
duration: 13min
completed: 2026-02-22
---

# Phase 02 Plan 03: Admin Portal/ERP Endpoint Auth + AUTH-06 Audit Summary

**Converted ~65 admin portal/ERP endpoints to role-appropriate Depends() auth, verified AUTH-06 (zero endpoints rely solely on global middleware)**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-22T02:57:21Z
- **Completed:** 2026-02-22T03:10:47Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Converted 37 admin-only endpoints to Depends(require_admin): client (5), invoice (16), dashboard (2), Coupa (11), accounting (2), debug (1)
- Converted 8 ticket endpoints to Depends(require_admin)
- Converted 2 verification endpoints to Depends(require_admin), removed redundant role check
- Converted GET /api/orders to Depends(require_any_auth) preserving admin-vs-non-admin filter logic using JWT payload
- Converted PATCH /api/orders/{order_id}/status to Depends(require_any_auth) with participant verification
- Converted 4 chat endpoints to Depends(require_any_auth) for multi-role access
- Converted 3 delivery decision endpoints to Depends(require_vendor) for restaurant-only operations
- Converted 3 order modification endpoints to Depends(require_any_auth) for customer/vendor access
- AUTH-06 verified: every non-public endpoint has explicit Depends() auth or is in public path allowlist
- Added 3 missing entries to public path allowlist (/privacy, /terms, /api/erp/restaurants/{id})
- Fixed driver FCM token test after auth conversion

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert admin portal/ERP endpoints to Depends() auth** - `1308ca73` (feat)
2. **Task 2: AUTH-06 verification audit + test fix** - `3dbc3f82` (fix)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Converted ~65 endpoints from get_current_user to role-appropriate Depends(), updated public path allowlist
- `apps/web/p2p-platform/backend/tests/unit/test_order_flow.py` - Fixed test_save_driver_fcm_token to pass driver parameter

## Decisions Made
- GET /api/orders uses require_any_auth with JWT payload role check instead of require_admin, preserving the existing admin-sees-all, non-admin-sees-own filter logic
- PATCH /api/orders/{order_id}/status uses require_any_auth with JWT-based participant verification (email, vendor_id, driver_id from payload)
- Chat endpoints use require_any_auth since chat serves customers, drivers, and admin
- Delivery decision endpoints use require_vendor since they are restaurant-only operations
- Order modification endpoints use require_any_auth since they're used by both customers and vendors
- Removed redundant `if current_user.role != UserRole.ADMIN` check from submit_manual_review since require_admin already enforces admin role

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Chat/delivery/modification endpoints incorrectly batch-converted to require_admin**
- **Found during:** Task 1 (batch replacement verification)
- **Issue:** The batch replacement of `_user = Depends(get_current_user)` to `_user = Depends(require_admin)` also converted chat (4), delivery decision (3), and order modification (3) endpoints which should NOT be admin-only
- **Fix:** Manually corrected: chat to require_any_auth, delivery decisions to require_vendor, modifications to require_any_auth
- **Files modified:** main_new.py
- **Verification:** grep confirms correct auth on each endpoint type
- **Committed in:** 1308ca73

**2. [Rule 2 - Missing Critical] Public path allowlist missing /privacy, /terms, /api/erp/restaurants/{id}**
- **Found during:** Task 2 (AUTH-06 audit)
- **Issue:** 3 legitimately public endpoints were not in the global middleware's public path allowlist
- **Fix:** Added /privacy and /terms to exact paths, added regex pattern for /api/erp/restaurants/{id} GET
- **Files modified:** main_new.py
- **Verification:** Re-ran audit script, confirmed 0 non-public endpoints without auth
- **Committed in:** 3dbc3f82

**3. [Rule 3 - Blocking] test_save_driver_fcm_token missing driver parameter**
- **Found during:** Task 2 (test suite run)
- **Issue:** Unit test called register_driver_fcm_token directly without the driver parameter added during Phase 01 auth conversion
- **Fix:** Added `driver=mock_driver` kwarg to test function call
- **Files modified:** tests/unit/test_order_flow.py
- **Verification:** Test passes after fix
- **Committed in:** 3dbc3f82

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All fixes necessary for correctness. Chat/delivery/modification endpoints would have been broken if left as require_admin. No scope creep.

## Issues Encountered
- Pre-existing test failure (test_404_returns_json) unrelated to changes -- confirmed in 02-02-SUMMARY.md
- 316 errors in test_vendor_endpoints.py are pre-existing TestClient API incompatibility -- separate issue

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 02 (Vendor + Admin Endpoint Auth) is fully complete: all 3 plans executed
- AUTH-03 through AUTH-06 requirements all satisfied
- Deploy is needed to ship these changes to staging/production
- Ready for Phase 03 (Rate Limiting) or Phase 04 (Infra + Deploy)

## Self-Check: PASSED
- All files exist (main_new.py, test_order_flow.py, 02-03-SUMMARY.md)
- All commits exist (1308ca73, 3dbc3f82)

---
*Phase: 02-vendor-admin-endpoint-auth*
*Completed: 2026-02-22*
