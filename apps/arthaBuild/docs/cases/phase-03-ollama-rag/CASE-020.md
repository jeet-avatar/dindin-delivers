---
id: CASE-020
title: "No rate limit on /api/chatbot/process — DoS vector"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: ARCH_VIOLATION
severity: HIGH
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "237-336"
---

## Why This Case Was Created
Triggered by the ARCH_VIOLATION audit dimension. The `/api/chatbot/process` endpoint is the most computationally expensive route in the application — each request triggers a full Ollama LLM inference cycle (retrieve → grade → rewrite → generate), which can take 3–30 seconds and consumes all available CPU on the host. There is no rate limiting decorator on this endpoint. An authenticated user (or a script using a valid JWT) can flood the endpoint with hundreds of concurrent requests, exhausting CPU, RAM, and Ollama's request queue, causing a Denial of Service for all other users.

## What Is Wrong
`src/backend/rawapi.py` line 237 — the chatbot endpoint has NO `@limiter.limit(...)` decorator:

```python
# === FastAPI Route ===
@app.post("/api/chatbot/process")     # ← no @limiter.limit() decorator
async def ask(request: Request):
    async with AsyncSessionLocal() as _lic_db:
        _lic = await license_module.validate_license(_lic_db)
    if not _lic.get("valid"):
        raise HTTPException(status_code=402, ...)
    if not _ai_ready:
        return JSONResponse(content={...}, status_code=503)
    try:
        data = await request.json()
        ...
        result = graph.invoke(input_data)   # ← full Ollama LLM inference, up to 30 seconds
```

By contrast, the auth routes in `routers/auth.py` correctly apply rate limiting:
```python
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")      # ← rate limited
async def login(request: Request, ...):
```

SlowAPI (`from auth_utils import limiter`) is already configured on the app:
```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

The infrastructure for rate limiting is fully in place. It is simply not applied to the most expensive endpoint.

**Impact scenario:** A single authenticated user sends 50 concurrent POST requests to `/api/chatbot/process`. Ollama queues all 50 requests. The server's CPU reaches 100% for the duration of inference (minutes). Other users experience timeouts. The Ollama process may run out of memory and crash.

## Why It Was Done This Way (Root Cause)
Rate limiting was applied to auth endpoints (login, check-user) during Phase 1 because they are the most common brute-force targets. The chatbot endpoint was added later and the rate limiter decorator was not added, either because the Phase 3 developer assumed the license check provides sufficient access control, or because it was deferred. The license check only gates unauthenticated access — it does not limit request frequency for valid license holders.

## What Is Done Right
- SlowAPI is correctly configured on the FastAPI app instance (`rawapi.py:111-112`)
- The license check at line 239-242 prevents unauthenticated users from triggering inference
- The `_ai_ready` check at line 243 prevents inference when Ollama is not available
- The `limiter` from `auth_utils` uses IP-based rate limiting, which is the correct approach

## How To Fix It
Add a `@limiter.limit()` decorator to the chatbot endpoint and make the endpoint accept `Request` explicitly for SlowAPI:

**In `src/backend/rawapi.py` lines 236-238:**
```python
# Before
@app.post("/api/chatbot/process")
async def ask(request: Request):

# After
@app.post("/api/chatbot/process")
@limiter.limit("10/minute")      # adjust limit based on LLM inference time
async def ask(request: Request):
```

The `Request` object is already the first parameter — SlowAPI requires this for rate limiter key extraction.

**Recommended limits (adjust based on Ollama model inference time):**
- `"10/minute"` for development (conservative)
- `"30/minute"` for production with llama3.1:8b on modern hardware

**Step 2 — Verify the rate limiter key uses IP, not user:**
```bash
grep -n "key_func\|limiter.*=.*Limiter" src/backend/auth_utils.py
```
If using `get_ipaddr` as key_func, the limit is per-IP. For ArthaBuild's single-tenant model, per-IP is sufficient. For multi-user deployments, consider per-user-ID limiting.

## Architecture Mapping

**Layer:** Backend Router — Rate Limiting Middleware

**Flow:**

    POST /api/chatbot/process
      → [no rate limit check]   ← THIS CASE LIVES HERE (missing @limiter.limit decorator)
        → license check (validates license, not frequency)
          → _ai_ready check
            → graph.invoke() → Ollama LLM inference (3-30 seconds, 100% CPU)

    [Correct pattern — from auth endpoints]
    POST /api/auth/login
      → @limiter.limit("10/minute")   ← rate limit enforced
        → login logic

**Upstream:** Any authenticated client can send unlimited requests to this endpoint

**Downstream:** `graph.invoke()` in `model_utils.build_graph()` — full RAG pipeline execution; Ollama process CPU/RAM consumption

## Verification
- [ ] Grep proof: `grep -n "@limiter\|limiter.limit" src/backend/rawapi.py` → empty (confirms no rate limit on chatbot endpoint)
- [ ] Grep proof: `grep -n "@limiter" src/backend/routers/auth.py` → shows decorators on login and check-user (confirms limiter is used elsewhere)
- [ ] Fix proof: after adding `@limiter.limit("10/minute")`, send 11 rapid requests → 11th returns 429
- [ ] Runtime proof: `curl -X POST http://localhost:8000/api/chatbot/process ... ` (11 times quickly) → 10 succeed, 11th returns `{"error": "Rate limit exceeded"}`

## Downstream Impact
**Impact if unfixed:** System Failure / DoS vector

Any authenticated user (valid JWT + valid license) can exhaust server resources by flooding this endpoint. Ollama has no built-in concurrency limit for requests — it queues them all, consuming unbounded CPU. In a single-tenant deployment this means the authorized user can accidentally or deliberately lock themselves out of the system. In a multi-user deployment it is a critical DoS vector.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
