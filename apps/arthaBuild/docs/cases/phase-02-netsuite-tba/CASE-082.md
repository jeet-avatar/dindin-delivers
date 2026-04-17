---
id: CASE-082
title: "GET /api/netsuite/status returns 401 without Bearer token"
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
feature: "GET /api/netsuite/status (JWT required)"
test_ref: "tests/test_netsuite.py::test_status_requires_auth"
files:
  - path: src/backend/routers/netsuite.py
    lines: "270-280"
---

## Why This Case Was Created
Verifies that GET /api/netsuite/status is not publicly accessible: a request without an Authorization header must be rejected with a 401 (or 403 per HTTPBearer behavior), not served with any data. This is the baseline auth guard test for the status endpoint.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/netsuite.py:270-280` — confirm `Depends(get_current_user_id)` is present in the route signature; if removed, the endpoint becomes public
- FastAPI's `HTTPBearer` returns 403 when the `Authorization` header is absent (not 401 in some versions) — if the test asserts strictly 401, it may need to accept `[401, 403]`
- If a global middleware was added that converts all auth failures to 401, confirm it does not mask the HTTPBearer 403

## Why It Was Done This Way (Root Cause)
The status route at `routers/netsuite.py:270-280` declares `user_id: str = Depends(get_current_user_id)` in its signature. `get_current_user_id` uses `HTTPBearer` as its security scheme. FastAPI's `HTTPBearer` raises `HTTPException(status_code=403)` when the `Authorization` header is completely absent, and the `get_current_user_id` wrapper re-raises as 401 on decode failure. The net effect is that unauthenticated requests are rejected before any session store access occurs.

## What Is Done Right
This test confirms the outermost security gate: even before the TBA session check, the route requires a valid Bearer token. It complements CASE-081 (which tests a JWT-valid but TBA-unauthenticated state) by covering the case where the caller provides no JWT at all.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_status_requires_auth -v
```
If the test fails, check:
1. `routers/netsuite.py:270` — confirm `Depends(get_current_user_id)` is in the function signature
2. Confirm `get_current_user_id` raises `HTTPException` (not returns `None`) when no token is provided
3. If the response is 403 instead of 401, adjust the test assertion to accept both (FastAPI HTTPBearer returns 403 for missing header)

## Architecture Mapping

**Layer:** Backend Router (JWT guard)

**Flow:**
    [GET /api/netsuite/status — no Authorization header]
      → [routers/netsuite.py:270 Depends(get_current_user_id)]
        → [HTTPBearer raises HTTPException(403) / get_current_user_id raises HTTPException(401)]
          → [request rejected — session store never accessed]
                ↑ THIS TEST COVERS THIS GATE

**Upstream:** Any unauthenticated client (browser, curl, bot) that calls the status endpoint
**Downstream:** Session store is never queried; no TBA credential data is accessible

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_status_requires_auth -v`

## Downstream Impact
**Impact if unfixed:** The status endpoint becomes publicly accessible. Any caller can determine whether a given user_id has an active NetSuite session, and potentially discover account names, without possessing a valid JWT.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-079 (expired JWT), CASE-081 (unauthenticated TBA state), CASE-083 (authenticate requires auth), CASE-084 (deploy requires auth)
