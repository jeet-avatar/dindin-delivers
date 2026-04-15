---
id: CASE-080
title: "POST /api/deploy/suitescript returns 401 when no TBA session exists"
phase: "02"
phase_name: "NetSuite TBA Session"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kavya"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/deploy/suitescript (session check)"
test_ref: "tests/test_netsuite.py::test_tc_ns_10_deploy_without_session_returns_401"
files:
  - path: src/backend/routers/deploy.py
    lines: "1-50"
---

## Why This Case Was Created
Verifies that POST /api/deploy/suitescript enforces the TBA session requirement: a user who has a valid JWT but has never called POST /api/netsuite/authenticate (or has logged out) is rejected with a 401, not permitted to trigger a SuiteScript deployment. Part of the Phase 02 traceability registry (TC-NS-10).

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/deploy.py:1-50` — the deploy route must call `session_store.is_authenticated(user_id)` and raise `HTTPException(401)` when it returns `False`; if this check is removed or bypassed, unauthenticated deploys are possible
- `session_store.is_authenticated()` — must return `False` for any `user_id` not present in `_store` (key absence, not `None` value)
- Ensure the deploy route does not fall through to the SuiteCloud CLI call when `is_authenticated` returns `False`

## Why It Was Done This Way (Root Cause)
The deploy route at `routers/deploy.py:1-50` first validates the JWT via `get_current_user_id` Depends (proving the user is logged in to ArthaBuild), then performs a second check: `session_store.is_authenticated(user_id)`. This two-layer check separates ArthaBuild authentication (JWT) from NetSuite session authentication (TBA). A valid JWT is necessary but not sufficient to deploy — the user must have an active TBA session. This prevents a scenario where a user's NetSuite credentials expire or are revoked but they still hold a valid ArthaBuild JWT.

## What Is Done Right
The test covers the gap between "logged into ArthaBuild" and "connected to NetSuite": it registers a user, logs in to get a JWT, and immediately POSTs to /api/deploy/suitescript without first calling /api/netsuite/authenticate. The 401 response confirms the session check is active and enforced as a separate gate from JWT validation.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_10_deploy_without_session_returns_401 -v
```
If the test fails, check:
1. `routers/deploy.py:1-50` — look for `session_store.is_authenticated(user_id)` call; if absent, the check was removed
2. Confirm the HTTPException is raised before the SuiteCloud CLI subprocess is invoked
3. Confirm the 401 detail message does not leak internal state (e.g., "no session found for user_id=X")

## Architecture Mapping

**Layer:** Backend Router (deploy)

**Flow:**
    [POST /api/deploy/suitescript — valid JWT, no TBA session]
      → [routers/deploy.py Depends(get_current_user_id) → user_id OK]
        → [routers/deploy.py session_store.is_authenticated(user_id) → False]
          → [HTTPException(status_code=401, detail="NetSuite session required")]
                ↑ THIS TEST COVERS THIS CHECK

**Upstream:** User navigates to Deploy tab in Phase 04 frontend without first connecting to NetSuite
**Downstream:** SuiteCloud CLI subprocess is never called; no partial deploy state is created

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_10_deploy_without_session_returns_401 -v`

## Downstream Impact
**Impact if unfixed:** Any ArthaBuild-authenticated user can trigger SuiteScript deployments to NetSuite without providing TBA credentials. The CLI call would fail with credential errors, but it would still execute — potentially leaving partial deploy artifacts or exposing internal error messages.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (authenticate happy path), CASE-080 (deploy — no session), CASE-084 (deploy — no JWT)
