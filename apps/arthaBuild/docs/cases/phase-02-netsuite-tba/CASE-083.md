---
id: CASE-083
title: "POST /api/netsuite/authenticate returns 401 without Bearer token"
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
feature: "POST /api/netsuite/authenticate (JWT required)"
test_ref: "tests/test_netsuite.py::test_authenticate_requires_auth"
files:
  - path: src/backend/routers/netsuite.py
    lines: "188-200"
---

## Why This Case Was Created
Verifies that POST /api/netsuite/authenticate requires a valid Bearer token and cannot be called anonymously. Without this guard, an unauthenticated caller could inject arbitrary TBA credentials into the session store keyed to any fabricated user ID they choose.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/netsuite.py:188-200` — confirm `Depends(get_current_user_id)` is present in the route function signature; if removed, the endpoint becomes public
- If the route was moved to a sub-router or APIRouter that has an `dependencies=[]` override, confirm the dependency was re-added
- FastAPI's `HTTPBearer` raises 403 for a missing header and 401 for an invalid token — if the test strictly asserts 401, it may need to accept both codes

## Why It Was Done This Way (Root Cause)
The authenticate route at `routers/netsuite.py:188-200` uses `user_id: str = Depends(get_current_user_id)` to bind the TBA credentials to a specific, JWT-verified user. Without this binding, `session_store.set_session_creds(user_id, creds)` would store credentials under an attacker-controlled `user_id`, potentially overwriting another real user's session. The `get_current_user_id` dependency is the single point that ties the session store key to a verified identity.

## What Is Done Right
This test confirms that credential injection is impossible for unauthenticated callers. It sends a full valid TBA credential body (all five required fields) with no Authorization header and expects rejection. This proves the `user_id` in the session store is always derived from a verified JWT, never from the request body.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_authenticate_requires_auth -v
```
If the test fails, check:
1. `routers/netsuite.py:188` — confirm `user_id: str = Depends(get_current_user_id)` is in the function signature
2. Confirm no `@router.post(..., dependencies=[])` override strips the dependency
3. Confirm `get_current_user_id` raises an HTTPException rather than returning a default user_id when no token is present

## Architecture Mapping

**Layer:** Backend Router (JWT guard)

**Flow:**
    [POST /api/netsuite/authenticate — no Authorization header, valid TBA body]
      → [routers/netsuite.py:188 Depends(get_current_user_id)]
        → [HTTPBearer raises HTTPException(403) / get_current_user_id raises HTTPException(401)]
          → [request rejected — session_store.set_session_creds never called]
                ↑ THIS TEST COVERS THIS GATE

**Upstream:** Any unauthenticated client attempting to inject TBA credentials
**Downstream:** Session store keyed by `user_id` is never modified; existing sessions unaffected

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_authenticate_requires_auth -v`

## Downstream Impact
**Impact if unfixed:** Unauthenticated callers can inject TBA credentials into the session store for arbitrary user IDs. If they guess a valid user_id, they overwrite that user's NetSuite session, causing silent credential replacement and potential unauthorized deploy access.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-079 (expired JWT), CASE-082 (status requires auth), CASE-084 (deploy requires auth), CASE-077 (session isolation)
