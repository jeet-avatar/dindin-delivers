---
id: CASE-072
title: "POST /api/netsuite/authenticate returns 401 for wrong consumer key"
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
feature: "POST /api/netsuite/authenticate — credential rejection"
test_ref: "tests/test_netsuite.py::test_tc_ns_02_wrong_consumer_key"
files:
  - path: src/backend/routers/netsuite.py
    lines: "207-211"
  - path: src/backend/session_store.py
    lines: "28-31"
---

## Why This Case Was Created
Verifies that an incorrect `consumer_key` causes the authenticate endpoint to return 401 with an appropriate error message. The SuiteCloud CLI mock returns `(False, None)` to simulate a rejected credential. Part of Phase 02 traceability registry (TC-NS-02).

## What Is Wrong
N/A — this test PASSES. If this test ever fails, investigate:
- `routers/netsuite.py:207-211` — the `if not is_valid` branch must raise `HTTPException(401, "Invalid NetSuite TBA credentials...")`
- The test asserts `"Invalid"` or `"credential"` (case-insensitive) appears in the detail string; verify the error message was not changed
- Ensure `set_session_creds` is NOT called when validation fails (credentials must not be stored on rejection)

## Why It Was Done This Way (Root Cause)
`_validate_tba_credentials` is mocked to return `(False, None)`, simulating the SuiteCloud CLI detecting an invalid consumer key. The router at `routers/netsuite.py:207` checks `is_valid` and raises `HTTPException(status_code=401, detail="Invalid NetSuite TBA credentials. Verify Account ID, Consumer Key/Secret, and Token Key/Secret.")`. No `set_session_creds` call is reached, so nothing is written to `session_store._store`.

## What Is Done Right
Confirms the error-path contract: the router rejects bad credentials with 401 and a human-readable detail containing "Invalid" or "credential". The test uses `{**VALID_TBA, "consumer_key": "WRONG_KEY"}` to isolate the wrong-consumer-key scenario from other fields.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_02_wrong_consumer_key -v
```
If the test fails, check:
1. `routers/netsuite.py:207` — `if not is_valid:` block must raise `HTTPException(401, ...)`
2. The detail string at `routers/netsuite.py:209-210` must contain "Invalid" or "credential" (case-insensitive)
3. Confirm the mock target is `routers.netsuite._validate_tba_credentials` (not `session_store.*`)

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/netsuite/authenticate — body.consumer_key = "WRONG_KEY"]
      → [routers/netsuite.py:199 _validate_tba_credentials (mocked → (False, None))]
        → [routers/netsuite.py:207-211 if not is_valid → HTTPException(401)]
                ↑
        THIS TEST COVERS THIS PATH

**Upstream:** User submits bad consumer key in POST body; Pydantic validates all 5 fields are present
**Downstream:** Frontend receives 401 and shows "Invalid credentials" error message

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_02_wrong_consumer_key -v`

## Downstream Impact
**Impact if unfixed:** Bad credentials would be accepted and stored in session, letting users attempt deploys against a NetSuite account they cannot access, causing 401/403 errors at deploy time rather than at connect time.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (valid credentials), CASE-073 (wrong account ID)
