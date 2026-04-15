---
id: CASE-144
title: "Frontend connection status indicator reflects {authenticated: true/false} from /api/netsuite/status"
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
feature: "Frontend status indicator"
test_ref: ""
files:
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
The frontend must display a connection status indicator (connected/disconnected) that reflects the actual NetSuite authentication state from `/api/netsuite/status`. If the indicator shows "connected" when NetSuite auth has expired, users will attempt operations that silently fail. No test verifies the indicator reads from the correct endpoint and updates the UI correctly.

## What Is Wrong
No test exists for this behavior. A UI state management bug could cause the indicator to show stale or incorrect state.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the status indicator as a UI component. The `/api/netsuite/status` endpoint returns `{authenticated: bool, account_id: str}`. The indicator was implemented and manually verified but no automated test captures the data-to-UI binding.

## What Is Done Right
The `/api/netsuite/status` endpoint exists and returns the correct shape. The status indicator UI component exists. The frontend fetches status on mount.

## How To Fix It
Write the following test in `tests/e2e/test_netsuite_status.py`:

```python
@pytest.mark.asyncio
async def test_status_indicator_shows_connected_when_authenticated(page, mock_api):
    """
    Verify that the connection status indicator shows 'Connected' when
    /api/netsuite/status returns {authenticated: true}.
    """
    await mock_api.route(
        "**/api/netsuite/status",
        lambda route: route.fulfill(
            status=200,
            json={"authenticated": True, "account_id": "1234567"}
        )
    )

    await page.goto("http://localhost:5173")
    indicator = page.locator('[data-testid="netsuite-status"]')
    await indicator.wait_for()
    assert await indicator.get_attribute("data-status") == "connected"


@pytest.mark.asyncio
async def test_status_indicator_shows_disconnected_when_not_authenticated(page, mock_api):
    """
    Verify the indicator shows 'Disconnected' when /api/netsuite/status
    returns {authenticated: false}.
    """
    await mock_api.route(
        "**/api/netsuite/status",
        lambda route: route.fulfill(
            status=200,
            json={"authenticated": False, "account_id": None}
        )
    )

    await page.goto("http://localhost:5173")
    indicator = page.locator('[data-testid="netsuite-status"]')
    await indicator.wait_for()
    assert await indicator.get_attribute("data-status") == "disconnected"
```

## Architecture Mapping

**Layer:** Frontend → Backend Status API (E2E)

**Flow:**
    component mount → GET /api/netsuite/status → {authenticated} → update status indicator UI ← NO TEST EXISTS HERE

**Upstream:** User opens ArthaBuild dashboard
**Downstream:** If broken, users see incorrect connection status — wasted time debugging a "disconnected" indicator when actually connected

## Verification
- [ ] Write test: `pytest tests/e2e/test_netsuite_status.py::test_status_indicator_shows_connected_when_authenticated -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for status indicator data binding. A JSON field rename could silently show wrong connection state.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-143, CASE-164
