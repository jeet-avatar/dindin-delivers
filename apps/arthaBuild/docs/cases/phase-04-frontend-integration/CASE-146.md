---
id: CASE-146
title: "Frontend chat sends POST /api/chat with {message: text, session_id: id}"
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
feature: "Frontend chat message send"
test_ref: ""
files:
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
The frontend chat input must send POST `/api/chat` with exactly `{message: ..., session_id: ...}`. The backend Pydantic schema uses `message` (not `query`, `text`, or `content`) and requires `session_id`. If the field names don't match, the backend returns 422 and chat silently fails. No E2E test verifies the exact payload structure.

## What Is Wrong
No test exists for this behavior. A field name mismatch between frontend and backend schema is a common integration bug that manual testing can miss if error handling swallows 422 responses.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the chat UI and connected it to the backend. Field names were aligned during development. However, no automated test captures the request body to verify field names are correct.

## What Is Done Right
The backend `ChatRequest` Pydantic schema defines `message: str` and `session_id: str`. The chat UI exists and sends messages. The frontend API client is implemented.

## How To Fix It
Write the following test in `tests/e2e/test_chat_ui.py`:

```python
@pytest.mark.asyncio
async def test_chat_sends_correct_payload_fields(page, mock_api):
    """
    Verify that the chat UI sends POST /api/chat with exactly:
    - message: the user's text
    - session_id: the current session identifier
    Field names must match backend ChatRequest schema.
    """
    captured = {}

    async def handle_chat(route):
        captured["body"] = await route.request.json()
        await route.fulfill(
            status=200,
            json={"response": "Here is the answer.", "session_id": "test-session"}
        )

    await mock_api.route("**/api/chat", handle_chat)

    await page.goto("http://localhost:5173/chat")
    await page.fill('[data-testid="chat-input"]', "How do I run a saved search?")
    await page.click('[data-testid="send-button"]')

    body = captured.get("body", {})
    assert "message" in body, f"Expected 'message' field, got keys: {list(body.keys())}"
    assert body["message"] == "How do I run a saved search?"
    assert "session_id" in body, f"Expected 'session_id' field, got keys: {list(body.keys())}"
    assert body["session_id"], "session_id must not be empty"
```

## Architecture Mapping

**Layer:** Frontend → Backend Chat API (E2E)

**Flow:**
    Chat input submit → POST /api/chat {message: str, session_id: str} → response.response → display in chat UI ← NO TEST EXISTS HERE

**Upstream:** User types and submits a message in the chat interface
**Downstream:** If field names wrong, backend returns 422 and chat appears broken for all users

## Verification
- [ ] Write test: `pytest tests/e2e/test_chat_ui.py::test_chat_sends_correct_payload_fields -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for chat payload field names. A schema rename on either side silently breaks all chat functionality.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-134, CASE-141, CASE-149
