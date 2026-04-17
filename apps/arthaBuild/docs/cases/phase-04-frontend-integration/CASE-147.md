---
id: CASE-147
title: "Frontend automatically refreshes access_token using refresh_token when 401 received"
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
feature: "Frontend token refresh"
test_ref: ""
files:
  - path: src/frontend/src/pages/Password.tsx
    lines: ""
---

## Why This Case Was Created
Access tokens expire (default 30 minutes). When a token expires mid-session, the frontend should automatically use the refresh token to obtain a new access token and retry the failed request — transparent to the user. If this retry logic is missing or broken, users get logged out mid-session after 30 minutes. No test verifies this refresh flow.

## What Is Wrong
No test exists for this behavior. If token refresh is missing, users experience unexpected logouts after short sessions.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the basic auth flow. Token refresh via an Axios/fetch interceptor was planned but may not have been implemented. The backend `/api/auth/refresh` endpoint exists. The frontend interceptor was deferred.

## What Is Done Right
The backend `POST /api/auth/refresh` endpoint accepts a `refresh_token` and returns a new `access_token`. The refresh token is stored in an httpOnly cookie or memory. The auth flow issues both tokens on login.

## How To Fix It
Write the following test in `tests/e2e/test_token_refresh.py`:

```python
@pytest.mark.asyncio
async def test_frontend_auto_refreshes_token_on_401(page, mock_api):
    """
    Verify that when an API call returns 401, the frontend:
    1. Calls POST /api/auth/refresh with the refresh token
    2. Retries the original request with the new access token
    3. Returns the original response to the UI (transparent to user)
    """
    call_log = []
    call_count = {"chat": 0}

    async def handle_chat(route):
        call_count["chat"] += 1
        if call_count["chat"] == 1:
            # First call returns 401 (expired token)
            await route.fulfill(status=401, json={"detail": "Token expired"})
        else:
            # Retry succeeds
            await route.fulfill(status=200, json={"response": "ok", "session_id": "s1"})

    async def handle_refresh(route):
        call_log.append("refresh")
        await route.fulfill(
            status=200,
            json={"access_token": "new_token_abc", "token_type": "bearer"}
        )

    await mock_api.route("**/api/chat", handle_chat)
    await mock_api.route("**/api/auth/refresh", handle_refresh)

    await page.goto("http://localhost:5173/chat")
    await page.fill('[data-testid="chat-input"]', "test question")
    await page.click('[data-testid="send-button"]')

    # Refresh should have been called
    assert "refresh" in call_log, "Frontend did not call /api/auth/refresh on 401"
    # Chat retry should have succeeded
    assert call_count["chat"] == 2, f"Expected chat retry, got {call_count['chat']} calls"
```

## Architecture Mapping

**Layer:** Frontend API Interceptor (Browser)

**Flow:**
    API call → 401 response → intercept → POST /api/auth/refresh → new token → retry original call ← NO TEST EXISTS HERE

**Upstream:** Access token expires after 30 minutes of use
**Downstream:** If broken, users are logged out unexpectedly mid-session every 30 minutes

## Verification
- [ ] Write test: `pytest tests/e2e/test_token_refresh.py::test_frontend_auto_refreshes_token_on_401 -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for token refresh. A broken interceptor causes constant mid-session logouts for users.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-141, CASE-142, CASE-148
