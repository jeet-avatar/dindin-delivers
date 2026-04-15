---
id: CASE-084
title: "POST /api/deploy/suitescript returns 401 without Bearer token"
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
feature: "POST /api/deploy/suitescript (JWT required)"
test_ref: "tests/test_netsuite.py::test_deploy_requires_auth"
files:
  - path: src/backend/routers/deploy.py
    lines: "1-30"
---

## Why This Case Was Created
Verifies that POST /api/deploy/suitescript cannot be called without a valid Bearer token. Without this guard, anonymous users could trigger SuiteScript deployments against any NetSuite account, even if no TBA session would ultimately be found for them.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/deploy.py:1-30` — confirm `Depends(get_current_user_id)` is present in the route function signature
- If the route was moved to a new APIRouter with `dependencies=[]` or without the dependency explicitly re-added, the JWT guard may be missing
- FastAPI's `HTTPBearer` raises 403 for a completely missing header and 401 for a malformed/invalid token — if the test strictly asserts 401, it may need to accept `[401, 403]`

## Why It Was Done This Way (Root Cause)
The deploy route at `routers/deploy.py:1-30` is the most security-sensitive endpoint in Phase 02: it triggers the SuiteCloud CLI against a live NetSuite environment. It requires two sequential auth checks — first JWT (via `get_current_user_id` Depends), then TBA session (via `session_store.is_authenticated`). The JWT check happens before any session lookup, ensuring no information about session state is disclosed to unauthenticated callers. CASE-080 covers the second check (TBA session absent); this case covers the first check (no JWT at all).

## What Is Done Right
This test proves that the deploy endpoint has the outermost JWT guard active. It sends a request with no Authorization header and expects rejection before any SuiteCloud CLI subprocess or session store access occurs. Together with CASE-080, it establishes that the deploy endpoint requires both layers of authentication.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_deploy_requires_auth -v
```
If the test fails, check:
1. `routers/deploy.py:1-30` — look for `user_id: str = Depends(get_current_user_id)` in the function signature
2. Confirm the router include in `rawapi.py` or equivalent does not strip dependencies
3. If response is 403 instead of 401, adjust the assertion to accept both

## Architecture Mapping

**Layer:** Backend Router (JWT guard — deploy)

**Flow:**
    [POST /api/deploy/suitescript — no Authorization header]
      → [routers/deploy.py Depends(get_current_user_id)]
        → [HTTPBearer raises HTTPException(403) / get_current_user_id raises HTTPException(401)]
          → [request rejected — session_store never accessed, SuiteCloud CLI never invoked]
                ↑ THIS TEST COVERS THIS GATE

**Upstream:** Any anonymous HTTP client (bot, misconfigured script, attacker)
**Downstream:** SuiteCloud CLI subprocess is never invoked; no NetSuite environment is contacted

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_deploy_requires_auth -v`

## Downstream Impact
**Impact if unfixed:** Anonymous callers can invoke the SuiteScript deploy route. Even if the TBA session check catches them next, the request reaches further into the stack than it should — increasing attack surface and potentially exposing internal error messages about the session store or CLI.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-080 (deploy — no TBA session), CASE-082 (status requires auth), CASE-083 (authenticate requires auth), CASE-079 (expired JWT)
