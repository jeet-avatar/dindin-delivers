---
phase: 01-finish-endpoint-auth
plan: 03
subsystem: auth
tags: [fastapi, dead-code, proxy-stubs, microservices, cleanup]

# Dependency graph
requires:
  - phase: 01-finish-endpoint-auth
    plan: 01
    provides: per-endpoint Depends() auth on 23 real endpoints
  - phase: 01-finish-endpoint-auth
    plan: 02
    provides: admin/AI endpoint auth on 9 endpoints
provides:
  - main_new.py ~1021 lines shorter (dead proxy stubs deleted)
  - 93+ dead ERP proxy endpoints removed (14 service categories)
  - Kept real endpoints with auth added (payment intent, refund, driver status/location, analytics)
  - Final auth audit documenting 366 total endpoints with coverage breakdown
affects: [deploy, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [surgical dead code removal preserving callers, static auth audit script]

key-files:
  created: []
  modified: [apps/web/p2p-platform/backend/main_new.py]

key-decisions:
  - "Kept 4 proxy stubs with iOS callers (driver status, driver location, payment refund, analytics realtime) instead of deleting — added Depends(require_any_auth)"
  - "Kept real endpoints embedded in proxy section (restaurant detail DB query, payment intent Stripe, FCM tokens, AI employees analytics)"
  - "Kept proxy_request() helper and service URL constants — still used by health check and kept stubs"

patterns-established:
  - "When deleting proxy stubs, grep iOS and Android repos first to verify no mobile callers"
  - "Endpoints with active callers get auth rather than deletion"

requirements-completed: [AUTH-06]

# Metrics
duration: 9min
completed: 2026-02-20
---

# Phase 01 Plan 03: Delete Dead ERP Proxy Stubs and Final Auth Audit Summary

**Deleted 93+ dead ERP proxy stubs (~1021 lines) from main_new.py across 14 microservice categories, kept 4 stubs with iOS callers adding Depends(require_any_auth), and documented final auth coverage: 199 per-endpoint + 6 manual + 83 public + 78 middleware-only**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-20T23:48:54Z
- **Completed:** 2026-02-20T23:57:51Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Deleted ~1021 lines of dead proxy stubs to non-existent microservices across 14 service categories: ride, restaurant, auth, order, payment, user, driver, menu, notification, rating, analytics, negotiation, chat, call, location, pricing
- Verified no mobile app callers for deleted paths by grepping iOS (`apps/ios/`) and Android (`/Users/jeet/StudioProjects/eatfair-android/`) repos
- Kept 8 real endpoints that were embedded within the proxy section (restaurant detail, payment intent, FCM tokens x6, AI employees analytics)
- Kept 4 proxy stubs with active iOS callers and added `Depends(require_any_auth)` to each: driver status (PUT), driver location (PUT), payment refund (POST), analytics realtime (GET)
- Added `Depends(require_any_auth)` to the payment intent endpoint (POST /api/erp/payments/intent) for defense-in-depth
- Final audit: 366 total @app endpoints, 199 with per-endpoint Depends(), 6 with manual Header auth, 83 correctly in public allowlist, 78 protected by global middleware only
- Zero test regressions: 890 passed (same baseline as Plans 01 and 02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete dead ERP proxy stubs and verify no callers** - `9529719c` (feat)
2. **Task 2: Final auth coverage audit and count verification** - no code changes (audit-only task)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Deleted ~1021 lines of dead proxy stubs (93+ endpoints), kept real and iOS-called endpoints, added auth to kept stubs, updated section headers

## Decisions Made
- **Kept 4 proxy stubs with iOS callers:** Instead of deleting ALL proxy stubs, kept those that iOS actively calls (`PUT /api/erp/drivers/{driver_id}/status`, `PUT /api/erp/drivers/{driver_id}/location`, `POST /api/erp/payments/refund`, `GET /api/erp/analytics/dashboard/realtime`) and added `Depends(require_any_auth)` per the plan instructions. These stubs still return fallback data since microservices don't exist, but deleting them would change iOS behavior from 200-with-error-json to 404/401.
- **Kept real endpoints in proxy section:** The restaurant detail endpoint (`GET /api/erp/restaurants/{restaurant_id}`) queries the real database, the payment intent endpoint (`POST /api/erp/payments/intent`) does real Stripe integration, FCM token endpoints write to real DB with existing auth, and AI employees analytics returns hardcoded data. These are NOT proxy stubs despite being located in the proxy section.
- **Kept proxy_request() function and service URL constants:** Still needed by the health check endpoint (`/api/erp/health/services`) and the 4 kept proxy stubs. Also used by `add_api_route` registrations at end of file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Depends(require_any_auth) to kept proxy stubs**
- **Found during:** Task 1 (mobile app caller verification)
- **Issue:** Plan assumed all proxy stubs could be deleted. iOS calls 4 proxy paths that would break. Plan also says "add `_auth: dict = Depends(require_any_auth)` to them" for kept stubs, so this was planned for the discovery case.
- **Fix:** Kept 4 proxy stubs and added per-endpoint auth to each
- **Files modified:** `apps/web/p2p-platform/backend/main_new.py`
- **Verification:** App loads, tests pass (890)
- **Committed in:** `9529719c` (part of task commit)

**2. [Rule 2 - Missing Critical] Kept real DB endpoints embedded in proxy section**
- **Found during:** Task 1 (reading proxy section code)
- **Issue:** Lines 17656-17754 contain a real restaurant detail endpoint with DB queries (not a proxy). Lines 17975-18095 contain real Stripe integration (not a proxy). Lines 18426-18561 contain real FCM token endpoints with existing auth. Line 18623-18676 contains real AI employee analytics. Deleting the entire section as planned would break these.
- **Fix:** Performed surgical deletion, keeping real endpoints and only deleting pure proxy stubs
- **Files modified:** `apps/web/p2p-platform/backend/main_new.py`
- **Verification:** App loads, all kept endpoint functions still reachable, tests pass
- **Committed in:** `9529719c` (part of task commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both deviations were necessary to avoid breaking iOS app and losing real functionality. The plan anticipated the iOS caller case with explicit instructions. The real-endpoint discovery required surgical deletion instead of bulk deletion. Net result: ~1021 lines removed instead of ~1500, but all removed lines are genuinely dead code.

## Auth Coverage Summary (Final Audit)

| Category | Count | Status |
|----------|-------|--------|
| Total @app endpoints | 366 | -- |
| With per-endpoint Depends() auth | 199 | Fully secured (defense-in-depth) |
| With manual Header(None) auth | 6 | Working but should be standardized |
| In public allowlist (correctly public) | 83 | Health, auth, public browsing, webhooks |
| Protected by admin middleware | ~15 (within /api/admin/) | Require admin JWT or ADMIN_SECRET_KEY |
| Protected by demo secret | ~10 (within /api/demo/) | Require ADMIN_SECRET_KEY |
| Protected by global middleware only | 78 | JWT required, but no per-endpoint role check |

The 78 middleware-only endpoints are NOT a security risk (unauthenticated requests are blocked) but lack role-based access control at the endpoint level. These are candidates for a future defense-in-depth improvement phase.

## Issues Encountered
- Pre-existing TestClient API incompatibility in `test_vendor_endpoints.py` and `tests/api/test_endpoints.py` (175 errors) -- NOT regressions. Same count before and after changes. Caused by starlette/httpx version mismatch (`Client.__init__() got an unexpected keyword argument 'app'`).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 01 (finish-endpoint-auth) is now COMPLETE: 32 per-endpoint Depends() auth guards + 93+ proxy stubs deleted + final audit documented
- Ready for deployment to staging/production
- The 78 middleware-only endpoints are documented for future defense-in-depth work
- main_new.py is 21,456 lines (down from 22,477)

---
## Self-Check: PASSED

- [x] main_new.py exists
- [x] 01-03-SUMMARY.md exists
- [x] Commit 9529719c exists in git log

*Phase: 01-finish-endpoint-auth*
*Completed: 2026-02-20*
