---
phase: 01-finish-endpoint-auth
plan: 02
subsystem: auth
tags: [fastapi, jwt, depends, rbac, admin, ai-employee]

# Dependency graph
requires:
  - phase: 01-finish-endpoint-auth
    plan: 01
    provides: auth_utils import at top of main_new.py, per-endpoint Depends() pattern established
provides:
  - 9 admin/AI endpoints in main_new.py secured with Depends(require_admin)
  - Privilege escalation prevention on consolidated dashboard and vendor listing
  - All AI employee endpoints gated to admin role only
affects: [01-03-PLAN, deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [admin: User = Depends(require_admin) for admin-only endpoints]

key-files:
  created: []
  modified: [apps/web/p2p-platform/backend/main_new.py]

key-decisions:
  - "Used admin: User = Depends(require_admin) consistently for all 9 endpoints — no require_any_auth since all are admin-only"
  - "GET /api/vendors confirmed as admin listing (distinct from public /api/vendors/published in allowlist)"

patterns-established:
  - "AI employee endpoints always require admin role — they are called from admin portal, not background tasks"

requirements-completed: [AUTH-04, AUTH-05]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 01 Plan 02: Add Depends(require_admin) to Admin/AI Endpoints Summary

**9 admin-only and AI employee endpoints secured with Depends(require_admin) preventing privilege escalation from non-admin JWTs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T23:43:40Z
- **Completed:** 2026-02-20T23:46:44Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `Depends(require_admin)` to all 7 AI employee endpoints (`/api/ai/*`): menu review-all, review-item, check-publish-ready, auto-publish, process-new-vendor, dashboard, pending-reviews
- Added `Depends(require_admin)` to consolidated admin dashboard (`GET /api/dashboard/consolidated`)
- Added `Depends(require_admin)` to admin vendor listing (`GET /api/vendors`) — distinct from public `/api/vendors/published`
- Zero test regressions: 890 passed (same as baseline)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Depends(require_admin) to admin and AI endpoints** - `0faa4e71` (feat)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Added `admin: User = Depends(require_admin)` to 9 endpoint function signatures

## Decisions Made
- Used `admin: User = Depends(require_admin)` (not `require_any_auth`) for all 9 endpoints because they are all admin-only operations. A customer or driver JWT should get 403, not just 401.
- Confirmed `GET /api/vendors` is the admin listing (returns all vendors with status/risk filters) while `GET /api/vendors/published` is the public one (in middleware allowlist at line 301).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TestClient API incompatibility in `test_vendor_endpoints.py` and `tests/api/test_endpoints.py` (175 errors) -- NOT regressions. Same count before and after changes. Caused by starlette/httpx version mismatch.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-03 (remaining endpoints: chat, driver v2, ERP stubs, public allowlist) can proceed
- All admin/AI endpoints are now fully secured with role-based access control
- Total per-endpoint auth count: 23 (Plan 01) + 9 (Plan 02) = 32 endpoints with Depends()

---
## Self-Check: PASSED

- [x] main_new.py exists
- [x] 01-02-SUMMARY.md exists
- [x] Commit 0faa4e71 exists in git log

*Phase: 01-finish-endpoint-auth*
*Completed: 2026-02-20*
