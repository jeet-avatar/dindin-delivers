---
id: CASE-140
title: "POST /api/chat is rate-limited to prevent LLM abuse"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "POST /api/chat (rate limiting)"
test_ref: ""
files:
  - path: src/backend/routers/chat.py
    lines: ""
  - path: src/backend/main.py
    lines: ""
---

## Why This Case Was Created
The `/api/chat` endpoint is the highest-cost operation: it triggers FAISS search and an Ollama LLM inference call. Without rate limiting, a malicious or runaway client could flood the endpoint and exhaust server resources. Rate limiting is especially important since Ollama runs locally and has no built-in throttle. No test verifies a rate limit is enforced.

## What Is Wrong
No test exists for this behavior. If no rate limit is in place, the test suite will not catch it. A stress test or malicious client could bring down the Ollama container.

## Why It Was Done This Way (Root Cause)
Phase 03 focused on correctness of the RAG pipeline. Rate limiting was deferred as a hardening concern. The chat endpoint may have no rate limit currently — or one may exist but be untested.

## What Is Done Right
The chat endpoint is auth-protected (requires valid JWT). Auth overhead provides minimal natural throttling. The system architecture (BYOC, single-tenant) reduces exposure to external abuse.

## How To Fix It
Write the following test in `tests/test_chat.py`:

```python
@pytest.mark.asyncio
async def test_chat_endpoint_rate_limited(client, auth_headers):
    """
    Verify that POST /api/chat returns 429 after exceeding the per-user rate limit.
    Send N+1 requests where N is the configured limit. Assert N+1th returns 429.
    """
    rate_limit = 10  # Expected requests per minute limit

    with patch("src.backend.routers.chat.ollama_chat") as mock_ollama, \
         patch("src.backend.routers.chat.faiss_search") as mock_search:

        mock_search.return_value = []
        mock_ollama.return_value = {"message": {"content": "ok"}}

        responses = []
        for i in range(rate_limit + 1):
            resp = await client.post(
                "/api/chat",
                json={"message": f"Message {i}", "session_id": "rate-test"},
                headers=auth_headers,
            )
            responses.append(resp.status_code)

    # At least one response after limit should be 429
    assert 429 in responses, (
        f"Expected 429 Too Many Requests after {rate_limit} requests, "
        f"got statuses: {responses}"
    )
```

## Architecture Mapping

**Layer:** Chat Router / Middleware (Backend)

**Flow:**
    POST /api/chat → rate_limit_middleware(user_id) → allow/reject → ollama_chat() ← NO TEST EXISTS HERE

**Upstream:** Any authenticated user
**Downstream:** If missing, unrestricted LLM calls could exhaust Ollama memory/CPU on the customer's EC2 instance

## Verification
- [ ] Write test: `pytest tests/test_chat.py::test_chat_endpoint_rate_limited -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for rate limiting. A misconfigured deployment with no rate limit risks resource exhaustion on customer-hosted infrastructure.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-139, CASE-167
