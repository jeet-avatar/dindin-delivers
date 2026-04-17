---
id: CASE-148
title: "Frontend redirects to login page when refresh token is also expired"
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
feature: "Frontend auth expiry handling"
test_ref: ""
files:
  - path: src/frontend/src/pages/Password.tsx
    lines: ""
---

## Why This Case Was Created
When both the access token and refresh token are expired (e.g., user returns after several days), the frontend must clear any stored auth state and redirect the user to the login page. If this doesn't happen, the user is stuck in a broken state — seeing the app UI but unable to make any API calls. No test verifies this redirect behavior.

## What Is Wrong
No test exists for this behavior. A missing or broken redirect leaves users stuck on the app with no way to log back in without a manual page refresh.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the basic token refresh interceptor. The fallback path (refresh token also expired → redirect to login) was the secondary case and may not have been implemented or tested.

## What Is Done Right
The backend returns 401 when the refresh token is expired. The login page exists at the root route. The frontend auth state exists and can be cleared.

## How To Fix It
Write the following test in `tests/e2e/test_token_refresh.py`:

```python
@pytest.mark.asyncio
async def test_frontend_redirects_to_login_when_refresh_fails(page, mock_api):
    """
    Verify that when refresh token is also expired (refresh returns 401),
    the frontend clears auth state and redirects to the login page.
    """
    async def handle_chat(route):
        await route.fulfill(status=401, json={"detail": "Token expired"})

    async def handle_refresh(route):
        await route.fulfill(status=401, json={"detail": "Refresh token expired"})

    await mock_api.route("**/api/chat", handle_chat)
    await mock_api.route("**/api/auth/refresh", handle_refresh)

    # Start at chat page (authenticated state)
    await page.goto("http://localhost:5173/chat")
    await page.fill('[data-testid="chat-input"]', "test")
    await page.click('[data-testid="send-button"]')

    # Should redirect to login
    await page.wait_for_url("**/login", timeout=5000)
    assert "/login" in page.url or page.url.endswith("/"), (
        f"Expected redirect to login, got: {page.url}"
    )
```

## Architecture Mapping

**Layer:** Frontend Auth Expiry Handling (Browser)

**Flow:**
    API call → 401 → refresh attempt → refresh 401 → clear auth state → redirect to /login ← NO TEST EXISTS HERE

**Upstream:** User with fully expired session returns to app
**Downstream:** If broken, user sees app UI but all API calls fail silently — confusing broken state

## Verification
- [ ] Write test: `pytest tests/e2e/test_token_refresh.py::test_frontend_redirects_to_login_when_refresh_fails -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for auth expiry redirect. Users get stuck in broken authenticated-but-expired state.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-141, CASE-147
