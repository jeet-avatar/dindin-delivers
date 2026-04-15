---
id: CASE-141
title: "Frontend Password.tsx calls /api/auth/check-user then /api/auth/login correctly"
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
feature: "Frontend login flow"
test_ref: ""
files:
  - path: src/frontend/src/pages/Password.tsx
    lines: ""
---

## Why This Case Was Created
The login flow in `Password.tsx` is a two-step process: first call `/api/auth/check-user` to validate the email exists, then call `/api/auth/login` with credentials. The field name sent as username must match the backend schema (email sent as `username` per OAuth2PasswordRequestForm). No Playwright or Cypress E2E test verifies this two-step flow works end-to-end.

## What Is Wrong
No test exists for this behavior. If the field names or endpoint order change, the test suite will not catch a login regression.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the frontend login page. E2E testing was deferred as the test infrastructure (Playwright/Cypress) was not set up during this phase. Unit tests for React components exist but do not cover API call sequences.

## What Is Done Right
`Password.tsx` exists and renders the login form. The backend endpoints `/api/auth/check-user` and `/api/auth/login` exist and are tested independently. The frontend makes API calls via a configured API client.

## How To Fix It
Write the following test in `tests/e2e/test_login_flow.py` (Playwright) or `cypress/e2e/login.cy.ts`:

```python
# Playwright E2E test
@pytest.mark.asyncio
async def test_login_flow_calls_correct_endpoints(page, mock_api):
    """
    Verify the frontend login flow:
    1. Submits email → /api/auth/check-user
    2. Submits password → /api/auth/login with username=email field
    3. Stores access_token in memory (not localStorage)
    """
    api_calls = []

    async def capture_request(request):
        if "/api/auth/" in request.url:
            api_calls.append({
                "url": request.url,
                "method": request.method,
                "body": request.post_data,
            })

    page.on("request", capture_request)

    await page.goto("http://localhost:5173")
    await page.fill('[data-testid="email-input"]', "user@example.com")
    await page.click('[data-testid="continue-button"]')

    await page.fill('[data-testid="password-input"]', "SecurePass123!")
    await page.click('[data-testid="login-button"]')

    assert any("/api/auth/check-user" in c["url"] for c in api_calls), \
        "check-user was not called"
    login_call = next((c for c in api_calls if "/api/auth/login" in c["url"]), None)
    assert login_call is not None, "/api/auth/login was not called"
    assert "username=" in (login_call["body"] or ""), \
        "login body must use 'username' field (OAuth2PasswordRequestForm)"
```

## Architecture Mapping

**Layer:** Frontend → Backend Auth (E2E)

**Flow:**
    Password.tsx → checkUser(email) → POST /api/auth/check-user → login(email, password) → POST /api/auth/login ← NO TEST EXISTS HERE

**Upstream:** User opens ArthaBuild and enters credentials
**Downstream:** If broken, users cannot log in — complete system lockout

## Verification
- [ ] Write test: `pytest tests/e2e/test_login_flow.py::test_login_flow_calls_correct_endpoints -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for the login flow. A field name change in the backend schema could silently break all logins.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-142, CASE-147, CASE-148
