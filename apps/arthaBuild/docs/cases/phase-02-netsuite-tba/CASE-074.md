---
id: CASE-074
title: "POST /api/netsuite/authenticate returns 422 for empty request body"
phase: "02"
phase_name: "NetSuite TBA Session"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kavya"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/netsuite/authenticate — Pydantic validation"
test_ref: "tests/test_netsuite.py::test_tc_ns_04_empty_fields"
files:
  - path: src/backend/routers/netsuite.py
    lines: "28-33"
---

## Why This Case Was Created
Verifies that submitting an empty JSON body `{}` to the authenticate endpoint returns 422 Unprocessable Entity from Pydantic schema validation, before the SuiteCloud CLI is ever called. Part of Phase 02 traceability registry (TC-NS-04).

## What Is Wrong
N/A — this test PASSES. If this test ever fails, investigate:
- `routers/netsuite.py:28-33` — `AuthenticateRequest` Pydantic model must declare all 5 fields as required (no default values)
- FastAPI's automatic Pydantic validation must be active for the `body: AuthenticateRequest` parameter at `routers/netsuite.py:191`
- Ensure `_validate_tba_credentials` is not called when the request body is invalid (422 should fire before the function body runs)

## Why It Was Done This Way (Root Cause)
`AuthenticateRequest` at `routers/netsuite.py:28-33` declares `account_id`, `token_key`, `token_secret`, `consumer_key`, and `consumer_secret` as required `str` fields with no defaults. FastAPI automatically runs Pydantic validation before calling the route handler. An empty `{}` body causes all 5 fields to fail the required-field check, returning 422 without ever reaching `_validate_tba_credentials`.

## What Is Done Right
Confirms that the Pydantic schema is the primary input guard. No mock is needed — this test verifies the framework-level validation layer. Tests that the endpoint does not silently accept empty credentials and attempt a CLI call with empty strings.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_04_empty_fields -v
```
If the test fails, check:
1. `routers/netsuite.py:28-33` — `AuthenticateRequest` fields must have no `Optional` or `= None` / `= ""` defaults
2. `routers/netsuite.py:191` — the `body: AuthenticateRequest` parameter must be a positional Pydantic model, not `request: Request`

## Architecture Mapping

**Layer:** Backend Router — Pydantic validation layer

**Flow:**
    [POST /api/netsuite/authenticate — body = {}]
      → [FastAPI Pydantic validation on AuthenticateRequest (routers/netsuite.py:28-33)]
        → [5 required fields missing → 422 Unprocessable Entity]
          (route handler body is NEVER reached)
                ↑
        THIS TEST COVERS THIS PATH

**Upstream:** Raw HTTP POST body with empty JSON object
**Downstream:** FastAPI returns 422 with a field-level error array; route handler not invoked; no CLI call made

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_04_empty_fields -v`

## Downstream Impact
**Impact if unfixed:** If fields had defaults of `""`, the CLI would be called with empty strings, causing a 503 or 504 instead of 422. Frontend would receive an opaque server error instead of a field-level validation error.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (valid credentials), CASE-072 (wrong consumer key)
