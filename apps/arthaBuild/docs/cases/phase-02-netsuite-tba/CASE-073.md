---
id: CASE-073
title: "POST /api/netsuite/authenticate returns 401 for wrong account ID"
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
feature: "POST /api/netsuite/authenticate — account ID rejection"
test_ref: "tests/test_netsuite.py::test_tc_ns_03_wrong_account_id"
files:
  - path: src/backend/routers/netsuite.py
    lines: "207-211"
---

## Why This Case Was Created
Verifies that an incorrect `account_id` causes the authenticate endpoint to return 401. Although TC-NS-02 and TC-NS-03 produce the same HTTP outcome, they are distinct test cases because the SuiteCloud CLI validates the account ID separately from the TBA token pair. Part of Phase 02 traceability registry (TC-NS-03).

## What Is Wrong
N/A — this test PASSES. If this test ever fails, investigate:
- `routers/netsuite.py:207-211` — the `if not is_valid` branch must raise `HTTPException(401, ...)`
- The test only checks `resp.status_code == 401`; ensure the status code was not changed to a different value (e.g., 403 or 400)

## Why It Was Done This Way (Root Cause)
`_validate_tba_credentials` is mocked to return `(False, None)`, simulating the SuiteCloud CLI detecting an unrecognized account ID. The router raises `HTTPException(status_code=401)`. The distinction from TC-NS-02 is intentional: it documents that both wrong-consumer-key and wrong-account-id scenarios are covered and both produce 401.

## What Is Done Right
Uses `{**VALID_TBA, "account_id": "WRONG_ACCOUNT"}` to isolate the account ID field. Confirms the router's error path handles account ID failures identically to credential failures (same 401 response), preventing any information leakage about which specific field is wrong.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_03_wrong_account_id -v
```
If the test fails, check:
1. `routers/netsuite.py:207` — `if not is_valid:` must still raise `HTTPException(401, ...)`
2. Confirm the mock `return_value=(False, None)` is correctly patching `routers.netsuite._validate_tba_credentials`

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/netsuite/authenticate — body.account_id = "WRONG_ACCOUNT"]
      → [routers/netsuite.py:199 _validate_tba_credentials (mocked → (False, None))]
        → [routers/netsuite.py:207-211 if not is_valid → HTTPException(401)]
                ↑
        THIS TEST COVERS THIS PATH

**Upstream:** Pydantic `AuthenticateRequest` validates all 5 fields are non-empty strings
**Downstream:** Frontend shows "Invalid credentials" error prompt; user corrects their account ID

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_03_wrong_account_id -v`

## Downstream Impact
**Impact if unfixed:** Same as CASE-072 — bad account IDs would be stored in session, causing all subsequent deploy calls to fail against the wrong NetSuite account.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (valid credentials), CASE-072 (wrong consumer key)
