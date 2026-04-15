---
id: CASE-013
title: "No auth test for /api/netsuite/authenticate requires JWT"
phase: "02"
phase_name: "NetSuite TBA Session"
category: TEST_GAP
severity: MEDIUM
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Kavya"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/test_netsuite.py
    lines: "406-416"
  - path: src/backend/routers/netsuite.py
    lines: "~1-50"
---

## Why This Case Was Created
Triggered by the TEST_GAP audit dimension. The test suite for the NetSuite TBA session includes an `authenticate_requires_auth` test that verifies a 401 is returned when no bearer token is sent. However, inspection of the test reveals it only tests the case of a completely missing Authorization header — there is no test for: (1) an expired JWT, (2) a tampered JWT, or (3) a JWT with wrong `token_type`. These represent distinct code paths in the authentication middleware.

## What Is Wrong
`src/backend/tests/test_netsuite.py` lines 406–416 covers only the "no token at all" case:

```python
@pytest.mark.asyncio
async def test_authenticate_requires_auth(client):
    """
    POST /api/netsuite/authenticate without Bearer token → 401.
    """
    resp = await client.post("/api/netsuite/authenticate", json=VALID_TBA)
    assert resp.status_code == 401
```

This test exercises the `credentials=None` branch in `get_current_user_id` (the HTTPBearer dependency). It does not test:

- **Expired JWT sent** → should return 401 (exercises `jwt.ExpiredSignatureError` path)
- **Tampered/invalid JWT signature** → should return 401 (exercises `jwt.InvalidSignatureError` path)
- **Valid JWT but wrong token_type** (e.g., using a refresh token as an access token) → should return 401

The TC-NS-09 test (`test_tc_ns_09_expired_jwt_returns_401`) in the same file tests an expired JWT against `/api/netsuite/status`, but no equivalent test exists for `/api/netsuite/authenticate`. Each endpoint that uses the JWT dependency should have its own auth boundary tested, because middleware ordering or dependency injection misconfiguration can cause some endpoints to silently bypass auth.

## Why It Was Done This Way (Root Cause)
The test was written to verify the most common auth failure mode (no token). Testing expired and tampered tokens against every endpoint would be repetitive given that all endpoints use the same `get_current_user_id` dependency. However, the gap is notable for `/api/netsuite/authenticate` specifically because it is the most sensitive endpoint — it is the entry point for storing TBA credentials in RAM.

## What Is Done Right
The existing `test_authenticate_requires_auth` test correctly verifies that the endpoint is not publicly accessible. The TC-NS-01 through TC-NS-10 tests comprehensively cover the functional behavior of the authenticated flows. The session isolation test (TC-NS-07) is particularly thorough.

## How To Fix It
Add the following tests to `src/backend/tests/test_netsuite.py`:

```python
@pytest.mark.asyncio
async def test_authenticate_expired_jwt_returns_401(client):
    """
    TC-NS-AUTH-02: Expired JWT → POST /api/netsuite/authenticate returns 401.
    Architecture: get_current_user_id → decode_token raises ExpiredSignatureError.
    """
    import jwt as pyjwt
    import os
    from datetime import datetime, timedelta, timezone

    secret = os.environ["JWT_SECRET_KEY"]
    expired_token = pyjwt.encode(
        {
            "sub": "9999",
            "token_type": "access",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        },
        secret,
        algorithm="HS256",
    )

    resp = await client.post(
        "/api/netsuite/authenticate",
        json=VALID_TBA,
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


@pytest.mark.asyncio
async def test_authenticate_tampered_jwt_returns_401(client):
    """
    TC-NS-AUTH-03: Tampered JWT signature → 401.
    Architecture: PyJWT signature verification fails → HTTPException(401).
    """
    resp = await client.post(
        "/api/netsuite/authenticate",
        json=VALID_TBA,
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.fakesig"},
    )
    assert resp.status_code == 401
```

Run the new tests:
```bash
pytest tests/test_netsuite.py -v -k "auth"
```

## Architecture Mapping

**Layer:** Backend Router → JWT Authentication Middleware

**Flow:**

    POST /api/netsuite/authenticate
      → get_current_user_id (HTTPBearer dependency)
        → decode_token(credentials.credentials, "access")
                    ↑
          THIS CASE LIVES HERE (test gap — only "no token" path tested,
           "expired token" and "tampered token" paths not tested for this endpoint)
          → user_id (int from JWT sub)
        → _validate_tba_credentials(...)
        → set_session_creds(user_id, creds)

**Upstream:** Frontend `NetSuiteConnectPanel` sends the authenticate request with a stored access token

**Downstream:** If auth bypass were possible here, an unauthenticated caller could inject TBA credentials into the session store for arbitrary user IDs

## Verification
- [ ] Grep proof: `grep -n "authenticate_requires_auth\|authenticate.*auth\|auth.*authenticate" src/backend/tests/test_netsuite.py` → shows only the "no token" test at line 410
- [ ] Grep proof: `grep -n "expired.*authenticate\|tampered.*authenticate" src/backend/tests/test_netsuite.py` → empty (confirms gap)
- [ ] Test proof: `pytest tests/test_netsuite.py::test_authenticate_expired_jwt_returns_401 -v` → PASSED after fix

## Downstream Impact
**Impact if unfixed:** Test Gap

No immediate security vulnerability — the endpoint is correctly protected by the `get_current_user_id` dependency. The gap means that if the dependency injection for this endpoint is accidentally removed or misconfigured, no test would catch it.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-009 (test infrastructure gap that also affects migration coverage)
