---
id: CASE-078
title: "POST /api/netsuite/logout removes all TBA credentials from session store"
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
feature: "POST /api/netsuite/logout"
test_ref: "tests/test_netsuite.py::test_tc_ns_08_logout_wipes_credentials"
files:
  - path: src/backend/routers/netsuite.py
    lines: "248-265"
  - path: src/backend/session_store.py
    lines: "34-40"
---

## Why This Case Was Created
Verifies that POST /api/netsuite/logout completely clears the user's TBA credentials from the in-memory session store, such that a subsequent GET /api/netsuite/status returns `{authenticated: false}`. Part of the Phase 02 traceability registry (TC-NS-08).

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `session_store.py:34-40` — `clear_session_creds(user_id)` must delete the key from `_store` (not set it to `None` or an empty object)
- `routers/netsuite.py:248-265` — logout route must call `session_store.clear_session_creds(user_id)` with the correct `user_id` from JWT, not a fixed or unrelated value
- `routers/netsuite.py:270-295` — status route must return `{authenticated: false}` when `get_session_creds(user_id)` returns `None` or key is absent

## Why It Was Done This Way (Root Cause)
`clear_session_creds(user_id)` at `session_store.py:34-40` performs a `del _store[user_id]` (or equivalent safe pop) to remove the entry entirely. This is stronger than setting the value to `None` because it ensures `is_authenticated(user_id)` returns `False` — the implementation checks for key presence, not value truthiness. The logout route at `routers/netsuite.py:248-265` uses the same `get_current_user_id` Depends as the authenticate and status routes, so the same `user_id` that was used to store credentials is used to delete them.

## What Is Done Right
This test exercises the full logout-and-verify flow: authenticate, confirm status shows connected, call logout, confirm status shows disconnected. It proves that RAM cleanup happens immediately and that no stale credential state persists after a successful logout call.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_08_logout_wipes_credentials -v
```
If the test fails, check:
1. `session_store.py:34-40` — `clear_session_creds` must remove the key, not set it to falsy value
2. `routers/netsuite.py:248-265` — confirm `clear_session_creds(user_id)` is called (not `clear_session_creds(account_id)` or similar)
3. Status route response — when `_store.get(user_id)` is `None`, `authenticated` field must be `False`

## Architecture Mapping

**Layer:** Backend Router + Session Store

**Flow:**
    [POST /api/netsuite/logout]
      → [routers/netsuite.py:248-265 get_current_user_id → user_id]
        → [session_store.py:34-40 clear_session_creds(user_id) — deletes _store[user_id]]
          → [return {message: "Logged out"}]
    [GET /api/netsuite/status — same user]
      → [session_store.get_session_creds(user_id) → None]
        → [return {authenticated: false}]
                ↑ THIS TEST COVERS THIS PATH

**Upstream:** User clicks "Disconnect from NetSuite" in Phase 04 frontend
**Downstream:** After logout, POST /api/deploy/suitescript returns 401 (session check fails); Phase 04 status indicator shows disconnected state

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_08_logout_wipes_credentials -v`

## Downstream Impact
**Impact if unfixed:** TBA credentials persist in RAM for the process lifetime after a user logs out. In a shared deployment, this means credentials remain accessible via the status endpoint until the process restarts. Critical security regression.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (authenticate happy path), CASE-077 (session isolation), CASE-081 (status when not connected), CASE-085 (credentials not in DB)
