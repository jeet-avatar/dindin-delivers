---
id: CASE-081
title: "GET /api/netsuite/status returns authenticated:false when no session exists"
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
feature: "GET /api/netsuite/status (unauthenticated state)"
test_ref: "tests/test_netsuite.py::test_status_when_not_connected"
files:
  - path: src/backend/routers/netsuite.py
    lines: "270-295"
---

## Why This Case Was Created
Verifies that GET /api/netsuite/status correctly reports `{authenticated: false}` for a user who holds a valid ArthaBuild JWT but has not yet called POST /api/netsuite/authenticate. This covers the initial state seen by every new user before connecting to NetSuite.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/netsuite.py:270-295` — the status route must call `session_store.is_authenticated(user_id)` (or `get_session_creds(user_id) is None`) and return `{authenticated: false}` in that branch
- The status route must NOT return a 4xx for this case — a JWT-authenticated user who has no TBA session is a valid normal state, not an error
- If `account_name` or `account_id` fields appear in the response when no session exists, the Phase 04 frontend status indicator may display a false "connected" state

## Why It Was Done This Way (Root Cause)
The status endpoint at `routers/netsuite.py:270-295` is designed to be polled by the frontend at page load to determine the initial NetSuite connection state. It returns 200 in all cases where the JWT is valid, with `authenticated` as the discriminator field. When `session_store.get_session_creds(user_id)` returns `None` (key absent from `_store`), the route returns `{authenticated: false}` with no `account_name` or `account_id`. This matches the frozen interface in CLAUDE.md: `GET /api/netsuite/status → {authenticated:bool, account_name?:str, account_id?:str, authenticated_at?:str}`.

## What Is Done Right
This test exercises the pre-connection state — the most common state a new user encounters. It confirms: (1) the endpoint accepts a valid JWT without requiring a TBA session, (2) `authenticated` is exactly `false` (not `null` or absent), and (3) optional fields like `account_name` are omitted, not returned as `null`, preventing false-positive frontend rendering.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_status_when_not_connected -v
```
If the test fails, check:
1. `routers/netsuite.py:270-295` — confirm the `None`-session branch returns `authenticated: False` with status 200
2. Confirm `account_name`, `account_id`, and `authenticated_at` are absent (not `null`) when no session exists
3. Confirm the route does not raise a 404 or 500 for the no-session case

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [GET /api/netsuite/status — valid JWT, no TBA session in _store]
      → [routers/netsuite.py:270 Depends(get_current_user_id) → user_id OK]
        → [routers/netsuite.py:275 session_store.get_session_creds(user_id) → None]
          → [return {authenticated: false}]
                ↑ THIS TEST COVERS THIS PATH

**Upstream:** Phase 04 frontend polls this endpoint at mount to show the NetSuite connection status indicator
**Downstream:** Frontend shows "Not connected" state; POST /api/deploy/suitescript will return 401 until the user authenticates

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_status_when_not_connected -v`

## Downstream Impact
**Impact if unfixed:** Frontend status indicator shows an incorrect state (connected or error) to new users, causing confusion before they have configured their NetSuite credentials.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (authenticate happy path), CASE-078 (logout wipes credentials), CASE-082 (status requires JWT)
