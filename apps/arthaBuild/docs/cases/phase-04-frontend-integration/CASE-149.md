---
id: CASE-149
title: "Frontend loads existing chat sessions from GET /api/chats on mount"
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
feature: "Frontend chat history loading"
test_ref: ""
files:
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
The chat sidebar should display existing conversation sessions when the user opens the app. This requires a `GET /api/chats` call on component mount that populates the session list. If this fetch is missing or broken, the sidebar is always empty — users cannot resume previous conversations. No E2E test verifies the session list loads on mount.

## What Is Wrong
No test exists for this behavior. A lifecycle hook error or API fetch failure leaves the sidebar permanently empty without triggering a visible error.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the chat history sidebar. The `GET /api/chats` endpoint exists and returns a list of sessions. The sidebar component fetches on mount (useEffect). No automated test captures the mount-fetch-render sequence.

## What Is Done Right
The backend `GET /api/chats` endpoint returns a list of sessions for the authenticated user. The sidebar component exists in the frontend. Sessions are stored in the DB with user association.

## How To Fix It
Write the following test in `tests/e2e/test_chat_history.py`:

```python
@pytest.mark.asyncio
async def test_chat_sidebar_loads_sessions_on_mount(page, mock_api):
    """
    Verify that the chat sidebar loads and displays existing sessions
    from GET /api/chats when the page mounts.
    """
    mock_sessions = [
        {"id": "session-1", "title": "NetSuite Customer Query", "updated_at": "2026-04-10T10:00:00"},
        {"id": "session-2", "title": "SuiteScript Help", "updated_at": "2026-04-09T09:00:00"},
    ]

    await mock_api.route(
        "**/api/chats",
        lambda route: route.fulfill(status=200, json=mock_sessions)
    )

    await page.goto("http://localhost:5173/chat")

    # Wait for sidebar to load
    sidebar = page.locator('[data-testid="chat-sidebar"]')
    await sidebar.wait_for()

    session_items = page.locator('[data-testid="chat-session-item"]')
    count = await session_items.count()
    assert count == 2, f"Expected 2 sessions in sidebar, got {count}"

    first_title = await session_items.nth(0).text_content()
    assert "NetSuite Customer Query" in first_title
```

## Architecture Mapping

**Layer:** Frontend → Backend Chat List API (E2E)

**Flow:**
    component mount → useEffect → GET /api/chats → session list → render sidebar items ← NO TEST EXISTS HERE

**Upstream:** User opens the ArthaBuild chat interface
**Downstream:** If broken, sidebar empty — users cannot resume any previous conversations

## Verification
- [ ] Write test: `pytest tests/e2e/test_chat_history.py::test_chat_sidebar_loads_sessions_on_mount -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for chat history loading. A useEffect dependency array bug silently prevents session history from ever loading.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-138, CASE-134, CASE-146
