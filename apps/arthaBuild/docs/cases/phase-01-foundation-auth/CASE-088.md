---
id: CASE-088
title: "GET /api/health returns {status:'ok'} response shape"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "GET /api/health (response shape)"
test_ref: "tests/test_health.py::test_health_response_shape"
files:
  - path: src/backend/rawapi.py
    lines: "1-50"
---

## Why This Case Was Created
Verifies the contract of the health endpoint response body: the JSON must include at minimum a `status` field with the value `"ok"`. The Phase 04 frontend reads this specific field to determine whether the backend connection is healthy and display the appropriate connection indicator.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `rawapi.py` — confirm the health route returns `{"status": "ok"}` (not `{"healthy": true}` or `{"message": "ok"}` — field name matters)
- If a refactor changed the response dict key from `status` to another name, Phase 04 frontend's connection check will silently show "disconnected" even when the backend is running
- Confirm the `status` value is the string `"ok"` and not a boolean, integer, or alternate string like `"healthy"` or `"running"`

## Why It Was Done This Way (Root Cause)
The health response shape `{status: "ok"}` was established as a frozen interface in CLAUDE.md. The Phase 04 frontend checks `response.data.status === "ok"` to set the connection indicator. The backend returns this exact shape from `rawapi.py`. Any additional fields (e.g., `suitecloud_ready`, `ollama_available`) are appended alongside `status` without replacing it, preserving backward compatibility.

## What Is Done Right
This test is distinct from CASE-087 (which only checks the status code). It verifies the response body contract at the JSON field level — specifically that `status` is present and equals `"ok"`. This is the contract the Phase 04 frontend depends on, making this test the traceability bridge between the health endpoint implementation and its frontend consumer.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_health.py::test_health_response_shape -v
```
If the test fails, check:
1. `rawapi.py` health route — confirm the return statement includes `"status": "ok"` (exact key and value)
2. Confirm no JSON serialization step transforms the key name (e.g., via `by_alias` in a Pydantic model)
3. Phase 04 frontend `src/frontend/src/services/api.ts` — check the field name used in the connection check to confirm it matches `status`

## Architecture Mapping

**Layer:** Backend Application (health response contract)

**Flow:**
    [GET /api/health]
      → [rawapi.py health handler]
        → [return {"status": "ok", ...}]  ← THIS TEST COVERS THE SHAPE
    [Phase 04 frontend — connection indicator]
      → [reads response.status === "ok"]

**Upstream:** Phase 04 frontend connection indicator; CI smoke tests that assert `body["status"] == "ok"`
**Downstream:** Any consumer of the health endpoint that parses the response body

## Verification
- [ ] Test passes: `pytest tests/test_health.py::test_health_response_shape -v`

## Downstream Impact
**Impact if unfixed:** Phase 04 frontend connection indicator permanently shows "disconnected" even when the backend is running. Users see a false error state and may not attempt to log in or use the application.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-087 (health returns 200), CASE-089 (startup fails without JWT_SECRET_KEY), CASE-086 (health includes suitecloud_ready)
