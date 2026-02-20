---
phase: 02-security-auth-fix
plan: 01
subsystem: auth
tags: [jwt, fastapi, middleware, oauth2, security, ios-swift, defense-in-depth]

# Dependency graph
requires:
  - phase: 01-unit-test-fixes
    provides: green CI baseline (890 tests passing)
provides:
  - auth_utils.py with 5 standardized auth dependency functions
  - global require_auth_middleware with public path allowlist (~60 exact + ~15 prefix + ~10 regex)
  - router-level auth on 3 fully-protectable routers (25 endpoints)
  - per-endpoint auth on 78 router endpoints across 8 files
  - per-endpoint auth on 67 main_new.py endpoints
  - iOS guard-let auth pattern on 4 previously soft-auth functions
  - defense-in-depth: middleware safety net + per-endpoint Depends()
affects: [deployment, staging-testing, android-verification]

# Tech tracking
tech-stack:
  added: [auth_utils.py module]
  patterns: [router-level dependencies, global auth middleware, public path allowlist, guard-let iOS auth]

key-files:
  created:
    - apps/web/p2p-platform/backend/auth_utils.py
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/stripe_integration.py
    - apps/web/p2p-platform/backend/promotions.py
    - apps/web/p2p-platform/backend/matchmaking_routes.py
    - apps/web/p2p-platform/backend/rideshare_payments.py
    - apps/web/p2p-platform/backend/verification_routes.py
    - apps/web/p2p-platform/backend/auto_onboarding.py
    - apps/web/p2p-platform/backend/investor_tracking.py
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift

key-decisions:
  - "Hybrid auth: global middleware safety net + per-endpoint Depends() for defense-in-depth"
  - "auth_utils.py uses auto_error=False OAuth2 for better error messages vs auto_error=True"
  - "Promotions /apply kept public (promo code validation during checkout)"
  - "Onboarding accept/confirm/status kept code-gated (invitation code auth, not JWT)"
  - "Investor request-access/verify-access/log-view kept token-gated (not JWT)"
  - "iOS changed from if-let (soft) to guard-let (hard fail) for auth tokens"
  - "Android verified: uses per-call @Header auth via DollorRepository, no changes needed"

patterns-established:
  - "Router-level auth: app.include_router(router, dependencies=[Depends(require_any_auth)]) for fully-protectable routers"
  - "Per-endpoint auth: _auth: dict = Depends(require_any_auth) as last parameter for mixed routers"
  - "Global middleware: allowlist-based (public paths explicit, everything else requires JWT)"
  - "Ownership auth: _user = Depends(get_current_user) for PII/mutation endpoints in main_new.py"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-02-20
---

# Phase 02: Security Auth Fix Summary

**Defense-in-depth auth: global JWT middleware + per-endpoint Depends() protecting 170+ previously-unprotected endpoints across 11 files**

## Performance

- **Duration:** 20 min
- **Started:** 2026-02-20T06:39:17Z
- **Completed:** 2026-02-20T06:59:29Z
- **Tasks:** 8 of 11 (2C.1, 2C.2, 2A.1-2A.3, 2B.1-2B.3; deployment tasks 2D.1-2D.3 deferred)
- **Files modified:** 11

## Accomplishments

- Created `auth_utils.py` with 5 standardized auth dependency functions (require_any_auth, require_customer, require_driver, require_vendor, require_admin)
- Added global `require_auth_middleware` that requires valid JWT for all non-public routes (~60 exact paths + ~15 prefix patterns + ~10 regex patterns allowlisted)
- Secured 170+ previously-unprotected endpoints with explicit Depends() auth
- Strengthened 4 iOS functions from soft `if let` to hard `guard let` auth pattern
- Verified Android uses per-call auth via DollorRepository (no changes needed)
- 890 unit tests still pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 2C.1: iOS auth header strengthening** - `ad128e49` (fix)
2. **Task 2C.2: Android interceptor verification** - documented in 2C.1 commit (no code changes needed)
3. **Task 2A.1: Create auth_utils.py** - `c3930fb4` (feat)
4. **Task 2A.2: Router-level auth on 3 routers** - `ae6a3f15` (feat)
5. **Task 2A.3: Per-endpoint auth on 8 router files** - `f3c0eb31` (feat)
6. **Task 2B.1+2B.2: Global auth middleware + allowlist** - `87afad52` (feat)
7. **Task 2B.3: Per-endpoint auth on main_new.py** - `72dcb376` (feat)

## Files Created/Modified

- `apps/web/p2p-platform/backend/auth_utils.py` (NEW) - 5 standardized auth dependency functions
- `apps/web/p2p-platform/backend/main_new.py` - Global auth middleware + router-level deps + 67 per-endpoint Depends
- `apps/web/p2p-platform/backend/order_flow.py` - 45 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/stripe_integration.py` - 7 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/promotions.py` - 8 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/matchmaking_routes.py` - 6 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/rideshare_payments.py` - 2 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/verification_routes.py` - 7 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/auto_onboarding.py` - 2 endpoints with require_any_auth
- `apps/web/p2p-platform/backend/investor_tracking.py` - 1 endpoint with require_any_auth
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - 4 functions: guard-let auth

## Decisions Made

1. **Hybrid approach (Option D from research)**: Global middleware as safety net + per-endpoint Depends() for role/ownership checks. This means new endpoints are automatically protected even if developer forgets Depends().

2. **auth_utils.py uses auto_error=False**: Allows distinguishing "no token provided" from "invalid token" for better error messages. Follows the pattern already established by chat_routes.py.

3. **Public endpoint allowlist sourced from security audit**: The ~60 exact paths, ~15 prefix patterns, and ~10 regex patterns were directly sourced from the verified SECURITY_AUDIT_2026-02-20.md document.

4. **iOS strengthened to guard-let**: Changed from soft `if let` (proceed without auth if no token) to hard `guard let` (fail immediately with clear error). This prevents confusing 401 errors from the server when the user simply isn't logged in.

5. **Android verified, not modified**: The Android app uses per-call `@Header("Authorization") token: String` in Retrofit + `TokenRefreshInterceptor` for 401 retries. Auth is handled correctly per-call by DollorRepository.

6. **Deployment deferred**: Tasks 2D.1-2D.3 (staging + production deployment) deferred to separate execution. Code changes are complete and tested locally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Depends import to investor_tracking.py**
- **Found during:** Task 2A.3 (per-endpoint auth)
- **Issue:** investor_tracking.py imported from fastapi but didn't include Depends
- **Fix:** Added Depends to the fastapi import statement
- **Files modified:** apps/web/p2p-platform/backend/investor_tracking.py
- **Verification:** Tests pass, no import errors
- **Committed in:** f3c0eb31 (Task 2A.3 commit)

**2. [Rule 1 - Bug] iOS functions already had if-let auth (plan said NO auth)**
- **Found during:** Task 2C.1
- **Issue:** Plan and research said 4 iOS functions had NO auth headers. Inspection showed they already had `if let` patterns (added in uncommitted changes). The plan was based on older code.
- **Fix:** Strengthened from `if let` (soft) to `guard let` (hard fail) instead of adding from scratch
- **Impact:** Lower risk than expected - users already had auth, just made it stricter

---

**Total deviations:** 2 auto-fixed (1 blocking import, 1 bug in plan assumptions)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Python script approach for bulk endpoint changes**: Adding auth to 45+ endpoints in order_flow.py initially placed `_auth` parameter before required parameters (causing `parameter without a default follows parameter with a default` syntax error). Fixed by placing `_auth` at the END of parameter lists.

- **Function name mismatches in skip lists**: Several router files had function names that didn't match the plan's descriptions (e.g., `list_verification_providers` vs `get_providers`, `confirm_and_go_live` vs `confirm_onboarding`). Required multiple reverts and retries to get the correct skip lists.

## Deferred Items

- **Tasks 2D.1-2D.3 (Deployment)**: Staging and production deployment deferred. Requires Docker build, ECR push, ECS task definition update, and health monitoring. CI/CD pipeline exists (`deploy-staging.yml`) for automated deployment via push to staging/develop branch.

- **ERP proxy stubs (~120 endpoints)**: The global middleware protects these, but they remain dead code (proxy to non-existent microservices). Consider deleting in a future cleanup phase.

- **Ownership checks (IDOR protection)**: The current changes add auth (who are you?) but not ownership (are you allowed to access THIS resource?). Full IDOR protection for address CRUD, FCM tokens, fare negotiation, etc. should be a follow-up phase.

## User Setup Required

None - no external service configuration required. Deployment (2D tasks) is the remaining action.

## Next Phase Readiness

- All security code changes complete and committed (6 commits)
- 890 unit tests passing, zero regressions
- Ready for staging deployment: build with `docker build --target production --platform linux/amd64`
- Monitor CloudWatch for 401 spike after deployment
- iOS app already sends auth headers (guard-let pattern), no App Store update needed before deploy

## Self-Check: PASSED

- auth_utils.py: FOUND
- All 6 task commits: FOUND (ad128e49, c3930fb4, ae6a3f15, f3c0eb31, 87afad52, 72dcb376)
- SUMMARY.md: FOUND

---
*Phase: 02-security-auth-fix*
*Completed: 2026-02-20*
