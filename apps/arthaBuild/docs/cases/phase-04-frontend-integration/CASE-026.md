---
id: CASE-026
title: "Chat response schema inconsistent — latency_ms absent on non-AI paths"
phase: "04"
phase_name: "Frontend Integration"
category: API_CORRECTNESS
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "237-336"
---

## Why This Case Was Created
API schema consistency audit for `POST /api/chatbot/process`. Phase 4 established a contract response shape `{response, intent, session_id, latency_ms}` (verified in `test_health.py` TC-AB-001). The endpoint has multiple early-return paths. Audit of all return paths reveals that `latency_ms` is present on the primary LLM paths but absent on two paths: the 503 non-AI-ready response and the 500 error response. Frontend code reading `response.latency_ms` receives `undefined` on those paths, which can cause display bugs or NaN values in any latency reporting UI.

## What Is Wrong
The endpoint `POST /api/chatbot/process` has six distinct return paths. Tracing each:

**Path 1 — License invalid (`rawapi.py:241-242`):** raises `HTTPException(402)`. No `latency_ms` — acceptable since it's an HTTP exception, not a JSON response.

**Path 2 — AI not ready (`rawapi.py:243-247`):**
```python
return JSONResponse(
    content={"response": "AI service not yet configured. Phase 3 wires the LLM."},
    status_code=503,
)
```
Missing: `intent`, `session_id`, `latency_ms`. This is a valid degraded state but returns a different shape than the 200 paths.

**Path 3 — "yes" confirm path (`rawapi.py:298-299`):** Returns with `latency_ms`. Correct.

**Path 4 — fetch_netsuite_data path (`rawapi.py:305-306`):** Returns with `latency_ms`. Correct.

**Path 5 — manage_sdf_project path (`rawapi.py:317-318`):** Returns with `latency_ms`. Correct.

**Path 6 — Main LLM path (`rawapi.py:332`):** Returns with `latency_ms`. Correct.

**Path 7 — BaseException catch (`rawapi.py:334-336`):**
```python
except BaseException as e:
    print("❌ Error in /ask:", str(e))
    return JSONResponse(content={"detail": str(e)}, status_code=500)
```
Returns `{detail: str}` — no `response`, `intent`, `session_id`, `latency_ms`. This is the most divergent from the contract.

Frontend code that does `const { response, latency_ms } = await callChatbot(msg)` will receive `undefined` for both fields on a 503 or 500, potentially rendering `"undefined ms"` or crashing if code calls `.length` on `undefined`.

## Why It Was Done This Way (Root Cause)
The `start_time = time.time()` variable is defined inside the `try` block at `rawapi.py:255`. The non-AI-ready path (lines 243-247) is outside the try block and runs before `start_time` is set — so `latency_ms` literally cannot be computed there. The error catch at line 334 could compute `latency_ms` but was written as a minimal error shim.

## What Is Done Right
All four primary intent paths (general LLM, "yes" confirm, fetch NetSuite, manage SDF) correctly return the full contract shape including `latency_ms`. The Phase 4 test `test_chatbot_returns_200_with_ollama` verifies the happy path contract. The intent of having `latency_ms` in the response is correct and well-motivated.

## How To Fix It
**Step 1 — Move `start_time` to before the try block and add `latency_ms` to all return paths.**

In `rawapi.py:248`, move `start_time` assignment to before the non-AI-ready guard:

```python
@app.post("/api/chatbot/process")
async def ask(request: Request):
    start_time = time.time()   # move here — before AI ready check
    async with AsyncSessionLocal() as _lic_db:
        _lic = await license_module.validate_license(_lic_db)
    if not _lic.get("valid"):
        raise HTTPException(status_code=402, detail=f"License required. Contact {license_module.SALES_EMAIL}")
    if not _ai_ready:
        return JSONResponse(
            content={
                "response": "AI service not yet configured. Phase 3 wires the LLM.",
                "intent": "unavailable",
                "session_id": "default",
                "latency_ms": round((time.time() - start_time) * 1000),
            },
            status_code=503,
        )
    try:
        data = await request.json()
        # start_time already set above — remove the line inside try
```

**Step 2 — Fix the BaseException catch at `rawapi.py:334-336`:**

```python
except BaseException as e:
    logger.error(f"Error in /api/chatbot/process: {e}")
    return JSONResponse(content={
        "detail": str(e),
        "response": "An internal error occurred.",
        "intent": "error",
        "session_id": "default",
        "latency_ms": round((time.time() - start_time) * 1000),
    }, status_code=500)
```

**Step 3 — Replace `print()` with `logger.error()` in the catch block** (the bare `print` is a separate low-priority issue).

## Architecture Mapping

**Layer:** Backend Router (rawapi.py — chatbot endpoint)

**Flow:**

    [POST /api/chatbot/process]
          ↓
    [License check] → 402 (no JSON response body — acceptable)
          ↓
    [AI ready check] → 503 JSONResponse ← MISSING latency_ms, intent, session_id
          ↓
    try:
      [LLM invoke] → 200 JSONResponse (correct — has all fields)
    except:
      → 500 JSONResponse ← MISSING latency_ms, response, intent, session_id

**Upstream:** Frontend chat input component calling `POST /api/chatbot/process`
**Downstream:** Frontend response handler reading `{response, intent, session_id, latency_ms}`

## Verification
- [ ] Grep proof: `grep -n "return JSONResponse" src/backend/rawapi.py`
- [ ] Test proof: `pytest tests/test_health.py::test_chatbot_returns_200_with_ollama -v` (passes on happy path; no test for 503 path)
- [ ] Runtime proof: Stop Ollama, then `curl -X POST http://localhost:8000/api/chatbot/process -H "Content-Type: application/json" -d '{"message":"test"}' | python3 -m json.tool` — observe missing `latency_ms` in 503 response

## Downstream Impact
**Impact if unfixed:** Cosmetic / Degraded UX

When Ollama is not running (common during initial setup or server restarts), the frontend receives a 503 with an incomplete response body. If the frontend destructures `latency_ms` from the response, it gets `undefined`. Display bugs: "undefined ms" in any performance indicator, or a JavaScript TypeError if the code calls `.toFixed()` on `undefined`. No data loss, no security risk.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
