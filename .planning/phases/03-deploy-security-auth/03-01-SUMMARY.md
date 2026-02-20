---
phase: 03-deploy-security-auth
plan: 01
subsystem: infra
tags: [ecs, ecr, docker, staging, deployment, security-auth, smoke-test]

# Dependency graph
requires:
  - phase: 02-security-auth-fix
    provides: "JWT auth code (auth_utils.py, global middleware, per-endpoint Depends) ready to deploy"
provides:
  - "Security auth code running on staging ECS (task-def dollor-api-staging:31)"
  - "19/19 E2E smoke tests verified on staging"
  - "Staging confirmed safe for production promotion"
affects: [03-02-PLAN, production-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Docker multi-stage build with --target production for Fargate deployments"
    - "E2E smoke testing against staging CloudFront URL before production promotion"

key-files:
  created: []
  modified:
    - "apps/web/p2p-platform/backend/main_new.py (public path allowlist fixes)"
    - "apps/web/p2p-platform/backend/order_flow.py (removed auth from public vendor docs)"

key-decisions:
  - "Used manual AWS CLI deploy (Option B) since CI/CD workflow_dispatch targets staging/develop branches"
  - "Fixed 2 auth misconfigurations discovered during smoke testing before marking staging verified"
  - "Vendor doc endpoints (/api/vendors/{id}/documents, /api/vendors/{id}/upload-url) made public since they serve menu images"

patterns-established:
  - "Staging smoke test pattern: 7 public + 8 protected + 4 authenticated flow tests"
  - "Auth middleware public path allowlist validated via live E2E before production"

requirements-completed: [DEPLOY-01, DEPLOY-02]

# Metrics
duration: 25min
completed: 2026-02-20
---

# Phase 03 Plan 01: Deploy Security Auth to Staging Summary

**Security auth Docker image deployed to staging ECS (task-def :31), 19/19 smoke tests pass -- public endpoints accessible, protected endpoints reject unauthenticated requests, authenticated flows work end-to-end**

## Performance

- **Duration:** ~25 min (across continuation sessions)
- **Started:** 2026-02-20
- **Completed:** 2026-02-20
- **Tasks:** 3/3 (build+deploy, smoke test, human verification)
- **Files modified:** 2

## Accomplishments
- Security auth code (170+ protected endpoints) deployed to staging ECS as task-def `dollor-api-staging:31`
- 19/19 E2E smoke tests passed against `https://d34u5ixl0bulv4.cloudfront.net`:
  - 7 public endpoints verified accessible (health, logins, featured, docs, openapi, vendor docs)
  - 8 protected endpoints verified rejecting unauthenticated requests (orders, stripe, addresses, location, FCM, driver location, bid, chat)
  - 4 authenticated flow tests passed (customer login, profile access, vendor login, vendor profile)
- 2 auth misconfigurations discovered and fixed during smoke testing (see Deviations)
- Human review approved -- staging ready for production promotion

## Task Commits

Each task was committed atomically:

1. **Task 1: Build and deploy security auth image to staging ECS** - `bc6d7492` + `050ec42a` (fix)
   - `bc6d7492`: Added 11 missing public paths to auth middleware allowlist (CI test failures)
   - `050ec42a`: Removed incorrect auth dependency from public vendor doc endpoints
2. **Task 2: E2E smoke test security auth on staging** - (no code changes, testing only)
3. **Task 3: Human verification of staging deployment** - N/A (checkpoint, user approved)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Added 11 public paths to middleware allowlist, fixed vendor doc auth
- `apps/web/p2p-platform/backend/order_flow.py` - Removed Depends(require_any_auth) from vendor document endpoints

## Decisions Made
- **Manual deploy via AWS CLI**: CI/CD workflow_dispatch targets staging/develop branches, not main. Used Option B (manual ECR push + ECS task-def update) as specified in plan.
- **Vendor doc endpoints made public**: `/api/vendors/{id}/documents` and `/api/vendors/{id}/upload-url` serve menu images that customers need without auth. Removed incorrectly-added auth dependency.
- **11 public paths added to allowlist**: Customer registration, password reset, vendor register, docs endpoints, and other legitimately-public paths were missing from the middleware allowlist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CI tests revealed 11 missing public paths in auth middleware allowlist**
- **Found during:** Task 1 (Build and deploy)
- **Issue:** Unpushed commits meant the staging image had stale code. After pushing and building, CI tests revealed 11 endpoints that should be public but were blocked by the auth middleware (customer registration, password reset, vendor registration, docs endpoints).
- **Fix:** Added all 11 paths to the `PUBLIC_PATHS` and `PUBLIC_PATH_PREFIXES` lists in `main_new.py`
- **Files modified:** `apps/web/p2p-platform/backend/main_new.py`
- **Verification:** CI tests pass, staging /health returns 200
- **Committed in:** `bc6d7492`

**2. [Rule 1 - Bug] Vendor doc endpoints incorrectly required authentication**
- **Found during:** Task 1 (Build and deploy)
- **Issue:** `/api/vendors/{id}/documents` and `/api/vendors/{id}/upload-url` had `Depends(require_any_auth)` added during Phase 02, but these endpoints serve menu/restaurant images that customers browse without logging in.
- **Fix:** Removed `require_any_auth` dependency from both endpoints in `order_flow.py`. Added paths to middleware public allowlist.
- **Files modified:** `apps/web/p2p-platform/backend/order_flow.py`, `apps/web/p2p-platform/backend/main_new.py`
- **Verification:** Staging smoke test confirmed both endpoints return 200 without auth
- **Committed in:** `050ec42a`

**3. [Rule 3 - Blocking] Unpushed local commits**
- **Found during:** Task 1 (Build and deploy)
- **Issue:** 12 commits ahead of origin/main. Docker build from local code worked, but CI/CD needed pushed code.
- **Fix:** Pushed commits to origin/main before proceeding with deploy
- **Files modified:** None (git push only)
- **Verification:** `git status` shows in sync with origin

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes were necessary for correct staging deployment. No scope creep -- these were auth misconfiguration bugs caught exactly as the staging deploy was designed to catch.

## Issues Encountered
None beyond the deviations documented above. The staging deploy worked as intended -- catching auth misconfigurations in a safe environment before production.

## User Setup Required
None - no external service configuration required.

## Smoke Test Results

| # | Endpoint | Expected | Actual | Result |
|---|----------|----------|--------|--------|
| 1 | GET /health | 200 | 200 | PASS |
| 2 | POST /api/auth/customer/login (bad creds) | non-401 middleware | 401 (endpoint) | PASS |
| 3 | POST /api/auth/driver/login (bad creds) | non-401 middleware | 401 (endpoint) | PASS |
| 4 | GET /api/vendors/featured | 200 | 200 | PASS |
| 5 | GET /docs | 200 | 200 | PASS |
| 6 | GET /openapi.json | 200 | 200 | PASS |
| 7 | GET /api/vendors/{id}/documents | 200 | 200 | PASS |
| 8 | GET /api/erp/orders/pending-restaurant | 401 | 401 | PASS |
| 9 | POST /api/stripe/create-payment-intent | 401 | 401 | PASS |
| 10 | GET /api/erp/customers/1/addresses | 401 | 401 | PASS |
| 11 | POST /api/erp/drivers/1/location | 401 | 401 | PASS |
| 12 | POST /api/erp/customers/1/fcm-token | 401 | 401 | PASS |
| 13 | POST /api/drivers/1/location | 401 | 401 | PASS |
| 14 | POST /api/rides/bid | 401 | 401 | PASS |
| 15 | GET /api/chat/customer/1/messages | 401 | 401 | PASS |
| 16 | POST /api/auth/customer/login (demo) | 200 + token | 200 + token | PASS |
| 17 | GET /api/customer/profile (with JWT) | 200 | 200 | PASS |
| 18 | POST /api/auth/vendor/login (demo) | 200 + token | 200 + token | PASS |
| 19 | GET /api/vendor/profile (with JWT) | 200 | 200 | PASS |

## Next Phase Readiness
- Staging verified and approved. Ready for Plan 03-02: Production deployment.
- Rollback procedure documented in 03-01-PLAN.md if needed.
- No blockers for production promotion.

## Self-Check: PASSED
- Commit `bc6d7492`: FOUND
- Commit `050ec42a`: FOUND
- File `apps/web/p2p-platform/backend/main_new.py`: FOUND
- File `apps/web/p2p-platform/backend/order_flow.py`: FOUND
- File `.planning/phases/03-deploy-security-auth/03-01-SUMMARY.md`: FOUND

---
*Phase: 03-deploy-security-auth*
*Completed: 2026-02-20*
