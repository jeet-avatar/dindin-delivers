---
id: CASE-025
title: "_persist_chat_to_db() silently swallows DB failures — client unaware"
phase: "04"
phase_name: "Frontend Integration"
category: ARCH_VIOLATION
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "154-185"
---

## Why This Case Was Created
Fault propagation audit for the chat persistence layer. The function `_persist_chat_to_db()` was designed as "non-fatal" — the chatbot should still work even if the DB write fails. However, the implementation silently logs a warning and returns `None` without any signal to the caller. The chat endpoint sends a 200 response to the client regardless of whether the message was persisted. This violates the principle of informed clients: if DB persistence is a paid-tier feature or a contractual guarantee, silent data loss is unacceptable.

## What Is Wrong
`src/backend/rawapi.py:154-185`:
```python
async def _persist_chat_to_db(
    chat_session_id: int,
    user_input: str,
    response_text: str,
    intent: str,
):
    """
    Non-fatal helper: persist user + assistant messages to DB when chat_session_id is provided.
    Falls back silently — in-memory context still works even if DB write fails.
    """
    try:
        _db_session_factory = _async_sessionmaker(_db_engine, expire_on_commit=False)
        async with _db_session_factory() as db_sess:
            db_sess.add(ChatMessage(...))
            db_sess.add(ChatMessage(...))
            await db_sess.execute(...)
            await db_sess.commit()
    except Exception as _e:
        logger.warning(f"Failed to persist chat message to DB (non-fatal): {_e}")
        # Returns None — caller never knows
```

The caller at `rawapi.py:329-332` does not check the return value:
```python
if chat_session_id:
    await _persist_chat_to_db(chat_session_id, user_input, response_text, intent)
return JSONResponse(content={"response": response_text, "intent": intent, ...})
```

If `db_sess.commit()` fails (DB locked, disk full, migration mismatch), the user receives a 200 response with their AI answer, but neither the user message nor the assistant message is saved to the `chat_messages` table. The user believes their chat history is saved — it is not. The next time they load the session, those messages will be absent.

## Why It Was Done This Way (Root Cause)
The docstring explicitly states the design intent: "Non-fatal helper — in-memory context still works even if DB write fails." This was correct Phase 3 thinking (the in-memory `chat_sessions` dict is the primary context store). However, Phase 9 made DB persistence the primary source of truth for chat history (the `ChatSession`/`ChatMessage` tables power the sidebar and history view). The function was not re-evaluated for Phase 9's stronger persistence requirement.

## What Is Done Right
The non-fatal pattern is architecturally sound for network-partition scenarios where the LLM answer should still reach the user. The try/except with a warning log is better than allowing an unhandled exception to crash the endpoint. The caller-side guard `if chat_session_id:` correctly makes persistence opt-in.

## How To Fix It
**Option A (minimal — recommended) — Return a bool from `_persist_chat_to_db` and include persistence status in response:**

```python
async def _persist_chat_to_db(...) -> bool:
    """Returns True on success, False on failure."""
    try:
        ...
        await db_sess.commit()
        return True
    except Exception as _e:
        logger.warning(f"Failed to persist chat message to DB (non-fatal): {_e}")
        return False
```

In the caller:
```python
if chat_session_id:
    persisted = await _persist_chat_to_db(chat_session_id, user_input, response_text, intent)
    if not persisted:
        logger.error(f"Chat message not persisted for session {chat_session_id}")
        # Include warning in response so frontend can show a toast:
        extra = {"persistence_warning": "Message may not have been saved"}
    else:
        extra = {}
return JSONResponse(content={"response": response_text, "intent": intent,
                             "session_id": session_id,
                             "latency_ms": round((time.time() - start_time) * 1000),
                             **extra})
```

**Option B (stronger) — Expose a `persisted` boolean field in all chat responses** so the frontend can show a persistent warning banner when messages fail to save.

**Step 2 — Add a test in `test_chats.py` or a new `test_persistence.py`:**
```python
async def test_persist_chat_to_db_returns_false_on_error(monkeypatch):
    """_persist_chat_to_db should return False when DB commit fails."""
    from rawapi import _persist_chat_to_db
    # Monkeypatch the DB engine to raise on commit
    # ... (use AsyncMock on _db_engine.begin())
    result = await _persist_chat_to_db(1, "hello", "world", "general_chat")
    assert result is False
```

## Architecture Mapping

**Layer:** Backend App (rawapi.py — in-line helper function)

**Flow:**

    [POST /api/chatbot/process] → [LLM graph.invoke()] → [response_text]
                                           ↓
                               [_persist_chat_to_db()] ← DB commit
                                           ↓ (silent failure)
                               [200 JSONResponse to client]
                                           ↑
                              CLIENT BELIEVES MESSAGE WAS SAVED
                              BUT MESSAGES TABLE IS NOT UPDATED

**Upstream:** `POST /api/chatbot/process` (rawapi.py:237) — all four return paths call `_persist_chat_to_db`
**Downstream:** `ChatMessage` ORM model, frontend chat history sidebar (`GET /api/chats/{id}/messages`)

## Verification
- [ ] Grep proof: `grep -n "_persist_chat_to_db" src/backend/rawapi.py`
- [ ] Test proof: No existing test covers the failure path (gap documented in CASE-028)
- [ ] Runtime proof: Temporarily corrupt the DB session (e.g., close the DB file) and POST to `/api/chatbot/process` with a `chat_session_id` — response will be 200 but messages will not appear in `GET /api/chats/{id}/messages`

## Downstream Impact
**Impact if unfixed:** Data Loss (silent)

When the DB is unavailable (disk full, SQLite lock, migration error), users receive successful 200 responses but their chat history is not saved. The user will be confused when chat history disappears on the next page load. Enterprise customers relying on chat history for audit/compliance will experience silent record loss with no alert.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-028
