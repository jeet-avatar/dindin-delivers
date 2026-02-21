---
phase: 01-finish-endpoint-auth
plan: 01
subsystem: auth
tags: [fastapi, jwt, depends, middleware, rbac, ownership-checks]

# Dependency graph
requires:
  - phase: v1.1-02-security-auth-fix
    provides: auth_utils.py with require_any_auth/require_customer/require_driver/require_vendor/require_admin
provides:
  - 23 per-endpoint Depends() auth guards on role-specific endpoints in main_new.py
  - Public allowlist fix for verification webhooks and verification status checks
  - 7 manual Header(None) JWT parsing blocks replaced with standardized Depends()
  - Ownership checks on all ID-parameterized endpoints (IDOR protection)
affects: [01-02-PLAN, 01-03-PLAN, deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-endpoint Depends() auth with ownership checks, _auth_driver/vendor naming for auth-only params]

key-files:
  created: []
  modified: [apps/web/p2p-platform/backend/main_new.py]

key-decisions:
  - "Moved auth_utils import to top of main_new.py (line 33) to avoid NameError — was previously at line 14919"
  - "Used _auth_driver/_auth_vendor naming to avoid shadowing local variables in endpoints that re-query DB"
  - "Kept authorization: str = Header(None) on GET /api/orders/{order_id} alongside Depends(require_any_auth) for existing ownership checks"

patterns-established:
  - "Ownership pattern: _auth_vendor: Vendor = Depends(require_vendor) + if _auth_vendor.id != vendor_id: raise 403"
  - "Lightweight auth: _auth: dict = Depends(require_any_auth) for endpoints accepting any role"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 10min
completed: 2026-02-20
---

# Phase 01 Plan 01: Fix Public Allowlist + Add Per-Endpoint Depends() Auth Summary

**23 per-endpoint Depends() auth guards added to main_new.py covering customer/driver/vendor/any-auth endpoints, with verification webhook allowlist fix and 7 manual auth block replacements**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-20T23:30:38Z
- **Completed:** 2026-02-20T23:41:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added verification webhook prefix (`/api/verification/webhook/`) to `_PUBLIC_PREFIXES` and verification status regex to `_PUBLIC_PATTERN_PATHS`
- Added per-endpoint Depends() auth to 23 endpoints: 2 customer, 12 driver, 6 vendor, 3 any-auth
- Replaced 7 manual `Header(None)` + `jwt.decode` boilerplate blocks with clean `Depends(require_driver)` / `Depends(require_customer)`
- Added ownership checks on all endpoints with ID path parameters (IDOR protection)
- Zero test regressions: 890 passed (same as baseline)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix public path allowlist and add role-specific Depends() to customer/driver/vendor endpoints** - `ea42673e` (feat)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Added auth_utils import at top, fixed public allowlist (2 entries), added 23 per-endpoint Depends() auth guards, replaced 7 manual auth blocks, added ownership checks

## Decisions Made
- Moved `from auth_utils import ...` from line 14919 to line 33 (top of file) because endpoints using require_customer/require_driver are defined much earlier in the file. Removed the duplicate import at the old location.
- Used `_auth_driver: Driver = Depends(require_driver)` naming convention when the endpoint already re-queries the driver from DB (avoids variable shadowing with `driver = db.query(Driver)...`).
- Kept `authorization: str = Header(None)` on `GET /api/orders/{order_id}` alongside `Depends(require_any_auth)` because the endpoint uses the raw authorization header for role-based ownership checks (customer vs vendor vs driver). Double JWT decode is acceptable per the research (Pitfall 3, ~0.2ms overhead).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved auth_utils import to top of file**
- **Found during:** Task 1 (test run)
- **Issue:** `from auth_utils import require_customer` was at line 14919 but `require_customer` was used at line 3801 in endpoint signatures, causing `NameError: name 'require_customer' is not defined` at module load time
- **Fix:** Added full import at line 33 (after models import), removed duplicate import at old location
- **Files modified:** `apps/web/p2p-platform/backend/main_new.py`
- **Verification:** Tests load and pass (890 passed)
- **Committed in:** `ea42673e` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Import placement fix was necessary for code to load. No scope creep.

## Issues Encountered
- Pre-existing TestClient API incompatibility in `test_vendor_endpoints.py` and `tests/api/test_endpoints.py` (225 errors) -- these are NOT regressions. Same count before and after changes. Caused by starlette/httpx version mismatch (`Client.__init__() got an unexpected keyword argument 'app'`).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-02 (ERP proxy stubs) can proceed -- all allowlist and per-endpoint auth for real endpoints is in place
- Plan 01-03 (remaining endpoints) can proceed in parallel or after 01-02
- All auth infrastructure is stable and proven

---
## Self-Check: PASSED

- [x] main_new.py exists
- [x] 01-01-SUMMARY.md exists
- [x] Commit ea42673e exists in git log

*Phase: 01-finish-endpoint-auth*
*Completed: 2026-02-20*
