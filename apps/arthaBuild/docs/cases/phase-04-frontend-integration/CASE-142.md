---
id: CASE-142
title: "Frontend stores access_token in memory only (never localStorage/sessionStorage)"
phase: "04"
phase_name: "Frontend Integration"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Playwright browser testing infrastructure required — deferred to M2 staging validation phase"
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Frontend token storage security"
test_ref: ""
files:
  - path: src/frontend/src/pages/Password.tsx
    lines: ""
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
ArthaBuild's security model requires that JWT access tokens are stored in memory only — never written to `localStorage` or `sessionStorage`. Tokens in browser storage are vulnerable to XSS attacks. The CLAUDE.md for ArthaBuild explicitly states this rule. No test verifies this security requirement is enforced.

## What Is Wrong
No test exists for this behavior. If a developer accidentally adds `localStorage.setItem('token', ...)`, the test suite will not catch it.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented token storage in a React context or module-level variable. The security rule is documented but not automated. No static analysis check or runtime test verifies that storage APIs are not used for tokens.

## What Is Done Right
The access token is received from `/api/auth/login` and used for subsequent requests. The frontend is implemented in TypeScript/React. The rule is documented in CLAUDE.md.

## How To Fix It
Write the following test in `tests/e2e/test_token_storage.py` (Playwright) or as a static analysis check:

```python
# Playwright E2E test
@pytest.mark.asyncio
async def test_access_token_not_in_browser_storage(page):
    """
    Verify that after login, the access_token is NOT stored in
    localStorage or sessionStorage.
    """
    await page.goto("http://localhost:5173")
    await page.fill('[data-testid="email-input"]', "user@example.com")
    await page.click('[data-testid="continue-button"]')
    await page.fill('[data-testid="password-input"]', "SecurePass123!")
    await page.click('[data-testid="login-button"]')
    await page.wait_for_url("**/chat")

    # Check localStorage
    local_storage_keys = await page.evaluate("Object.keys(localStorage)")
    token_in_local = any("token" in k.lower() or "access" in k.lower() for k in local_storage_keys)
    assert not token_in_local, f"access_token found in localStorage keys: {local_storage_keys}"

    # Check sessionStorage
    session_storage_keys = await page.evaluate("Object.keys(sessionStorage)")
    token_in_session = any("token" in k.lower() or "access" in k.lower() for k in session_storage_keys)
    assert not token_in_session, f"access_token found in sessionStorage keys: {session_storage_keys}"
```

## Architecture Mapping

**Layer:** Frontend Token Security (Browser)

**Flow:**
    POST /api/auth/login → response.access_token → store in React state/module var (NOT localStorage/sessionStorage) ← NO TEST EXISTS HERE

**Upstream:** User logs in successfully
**Downstream:** If violated, tokens are XSS-extractable — complete account compromise if XSS vulnerability exists

## Verification
- [ ] Write test: `pytest tests/e2e/test_token_storage.py::test_access_token_not_in_browser_storage -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for token storage security. A developer convenience change could introduce an XSS token theft vector.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-141, CASE-147, CASE-190
