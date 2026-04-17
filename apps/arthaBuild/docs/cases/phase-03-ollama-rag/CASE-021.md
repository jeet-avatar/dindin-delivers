---
id: CASE-021
title: "Chat response latency_ms missing on early-return paths"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: API_CORRECTNESS
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "243-247, 334-336"
---

## Why This Case Was Created
Triggered by the API_CORRECTNESS audit dimension. The `/api/chatbot/process` endpoint includes `latency_ms` in its response JSON on all normal return paths (lines 299, 306, 318, 332). However, two early-return paths — the AI-not-ready 503 and the exception 500 — do not include `latency_ms`. This creates an inconsistent response schema that frontend code or API consumers must guard against, and it violates the `ChatResponse` interface defined in `src/frontend/src/services/api.ts`.

## What Is Wrong
`src/backend/rawapi.py` has two return paths that do not include `latency_ms`:

**Path 1 — AI not ready (line 243-247) — missing `latency_ms`:**
```python
if not _ai_ready:
    return JSONResponse(
        content={"response": "AI service not yet configured. Phase 3 wires the LLM."},
        status_code=503,
    )
    # Missing: latency_ms, intent, session_id
```

**Path 2 — Exception handler (line 334-336) — missing `latency_ms`:**
```python
    except BaseException as e:
        print("❌ Error in /ask:", str(e))
        return JSONResponse(content={"detail": str(e)}, status_code=500)
        # Missing: latency_ms, intent, session_id, response
```

**The four normal return paths all include `latency_ms`:**
- Line 299: `"latency_ms": round((time.time() - start_time) * 1000)` (yes path)
- Line 306: `"latency_ms": round(...)` (fetch_netsuite_data path)
- Line 318: `"latency_ms": round(...)` (manage_sdf_project path)
- Line 332: `"latency_ms": round(...)` (main response path)

**Frontend interface (`src/frontend/src/services/api.ts` lines 25-31):**
```typescript
export interface ChatResponse {
  response: string;
  intent: string;
  sources?: Array<...>;
  session_id: string;
  latency_ms?: number;     // optional — frontend guards against undefined
}
```

The `latency_ms` field is marked `optional` (`latency_ms?: number`) in the frontend TypeScript interface, so the frontend does not crash when the field is absent. However, the `response` field is required in the interface (`response: string`) — and the 500 path returns `{"detail": ...}` instead of `{"response": ...}`, which violates the interface more severely.

**Note:** The 503 path is hit before `start_time` is assigned (line 255), so `latency_ms` cannot be calculated on that path — it should either be `0` or omitted with a clear convention.

## Why It Was Done This Way (Root Cause)
The early-return paths (503, 500) were written before `latency_ms` was added to the response schema. When the Phase 9 chat persistence work standardized the response shape, only the normal return paths were updated. The 503 pre-AI-ready path was written in Phase 1 (before `start_time` was even introduced) and the 500 exception path is a fallback that was not revisited.

## What Is Done Right
All four normal code paths consistently return the full response shape including `latency_ms`, `intent`, and `session_id`. The frontend correctly uses `latency_ms?` (optional) in the TypeScript interface, providing forward compatibility. The license check (line 239-242) correctly raises `HTTPException(402)`, which FastAPI serializes consistently — not a manual JSONResponse.

## How To Fix It
**Fix 1 — 503 AI not ready path (line 243-247):** Add the missing fields with sensible defaults:

```python
# Before
if not _ai_ready:
    return JSONResponse(
        content={"response": "AI service not yet configured. Phase 3 wires the LLM."},
        status_code=503,
    )

# After
if not _ai_ready:
    return JSONResponse(
        content={
            "response": "AI service not yet configured. Phase 3 wires the LLM.",
            "intent": "unknown",
            "session_id": "unknown",
            "latency_ms": 0,
        },
        status_code=503,
    )
```

**Fix 2 — 500 exception path (line 334-336):** Add the missing fields and change `detail` to `response` to match the interface:

```python
# Before
    except BaseException as e:
        print("❌ Error in /ask:", str(e))
        return JSONResponse(content={"detail": str(e)}, status_code=500)

# After
    except BaseException as e:
        logger.error(f"Error in /api/chatbot/process: {e}")
        return JSONResponse(
            content={
                "response": "An internal error occurred. Please try again.",
                "detail": str(e),   # keep for debugging but add response field
                "intent": "unknown",
                "session_id": data.get("session_id", "unknown") if 'data' in dir() else "unknown",
                "latency_ms": 0,
            },
            status_code=500,
        )
```

## Architecture Mapping

**Layer:** Backend Router — Response Schema Consistency

**Flow:**

    POST /api/chatbot/process
      → license check → 402 HTTPException (consistent, handled by FastAPI)
      → _ai_ready check → 503 JSONResponse (MISSING latency_ms)   ← THIS CASE, PATH 1
        → start_time = time.time()
          → graph.invoke()
            → [4 normal returns] → 200 JSONResponse WITH latency_ms ✓
            → [exception] → 500 JSONResponse (MISSING latency_ms)   ← THIS CASE, PATH 2

**Upstream:** `src/frontend/src/services/api.ts:sendChatMessage()` reads the response — currently guards against missing `latency_ms` via `latency_ms?: number`

**Downstream:** Frontend `ChatMessage` component may display latency; if `response` field is absent (500 path), `sendChatMessage()` would not throw but return data with `undefined` response

## Verification
- [ ] Grep proof: `grep -n "latency_ms\|JSONResponse" src/backend/rawapi.py` → shows lines 244-247 (503 path, no latency_ms) and 336 (500 path, no latency_ms)
- [ ] Grep proof: `grep -n "latency_ms" src/backend/rawapi.py` → shows only lines 299, 306, 318, 332 (not lines 244-247 or 336)
- [ ] Fix proof: after fix, all JSONResponse calls in `ask()` include `latency_ms` field
- [ ] Runtime proof: stop Ollama → `curl -X POST http://localhost:8000/api/chatbot/process ...` → response includes `{"latency_ms": 0, "intent": "unknown", ...}` with 503 status

## Downstream Impact
**Impact if unfixed:** Cosmetic + minor API_CORRECTNESS

The frontend's `latency_ms?: number` optional field means no crash occurs. The more significant issue is the 500 path returning `{"detail": ...}` instead of `{"response": ...}` — the `sendChatMessage()` function in `api.ts` checks `data.response` (line 80-82) and would return `undefined` as the response string, causing the chat UI to display an empty message bubble rather than an error.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
