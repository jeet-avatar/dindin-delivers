---
id: CASE-190
title: "State-changing endpoints (POST/PATCH/DELETE) are protected against CSRF"
phase: "12"
phase_name: "Security & SOC2"
category: FEATURE_TEST
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Aryan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "CSRF protection"
test_ref: ""
files:
  - path: src/backend/main.py
    lines: ""
---

## Why This Case Was Created
Cross-Site Request Forgery (CSRF) attacks trick authenticated users into making unintended state-changing requests. While Bearer token authentication (stateless JWT) provides inherent CSRF protection for API-only clients, browser-based clients with cookie-stored tokens need CSRF protection. ArthaBuild uses in-memory tokens but the CSRF posture must be verified. No test audits the CSRF protection model.

## What Is Wrong
No test exists for this behavior. The CSRF protection model is planned for Phase 12 security audit with no existing test coverage.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. ArthaBuild uses Bearer tokens in memory (not cookies), which provides inherent CSRF protection. However, this must be verified and documented as the CSRF protection mechanism.

## What Is Done Right
JWT tokens in the `Authorization: Bearer` header are not automatically sent by the browser with cross-origin requests (unlike cookies). This is the standard CSRF protection for API-only applications. The token storage is in-memory only (CASE-142).

## How To Fix It
Write the following test in `tests/security/test_csrf.py`:

```python
import requests
import pytest

BASE_URL = "http://localhost:8000"

@pytest.mark.security
def test_state_changing_request_without_auth_header_fails():
    """
    Verify that POST/PATCH/DELETE requests without Authorization header
    return 401, not 200. This confirms Bearer token (not cookie) auth
    is the CSRF protection mechanism.
    """
    # POST /api/chat without auth header
    resp = requests.post(
        f"{BASE_URL}/api/chat",
        json={"message": "test", "session_id": "csrf-test"},
        timeout=5,
    )
    assert resp.status_code == 401, (
        f"Expected 401 without auth, got {resp.status_code}. "
        "State-changing endpoints must require Authorization header."
    )

    # PATCH without auth header
    resp = requests.patch(f"{BASE_URL}/api/user/me", json={"first_name": "Evil"}, timeout=5)
    assert resp.status_code == 401

    # DELETE without auth header
    resp = requests.delete(f"{BASE_URL}/api/user/me", timeout=5)
    assert resp.status_code == 401


@pytest.mark.security
def test_no_cookie_based_auth_endpoints():
    """
    Verify the API does not use Set-Cookie for JWT tokens (which would require CSRF tokens).
    Auth response must use JSON body, not Set-Cookie.
    """
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "test@example.com", "password": "WrongPass"},
        timeout=5,
    )
    # Login may fail, but the response should not set JWT cookies
    set_cookie = resp.headers.get("Set-Cookie", "")
    assert "access_token" not in set_cookie.lower(), (
        "JWT access token should not be in Set-Cookie header — use JSON body instead"
    )
```

## Architecture Mapping

**Layer:** Security / CSRF Protection Model (Backend)

**Flow:**
    cross-origin request → no auto-sent Bearer token → 401 → CSRF attack fails ← NO TEST EXISTS HERE

**Upstream:** Malicious website attempting CSRF attack on an authenticated user
**Downstream:** If cookies were used without CSRF tokens, account actions could be hijacked

## Verification
- [ ] Write test: `pytest tests/security/test_csrf.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated verification of CSRF protection model. A future change to cookie-based auth without CSRF tokens would create CSRF vulnerability.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-142, CASE-188, CASE-189
