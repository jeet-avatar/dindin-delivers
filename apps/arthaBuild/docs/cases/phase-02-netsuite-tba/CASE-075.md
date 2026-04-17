---
id: CASE-075
title: "POST /api/netsuite/authenticate returns 200 for sandbox account ID (_SB suffix)"
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
feature: "POST /api/netsuite/authenticate — sandbox account support"
test_ref: "tests/test_netsuite.py::test_tc_ns_05_sandbox_account"
files:
  - path: src/backend/routers/netsuite.py
    lines: "188-238"
  - path: src/backend/session_store.py
    lines: "14-22"
---

## Why This Case Was Created
Verifies that sandbox NetSuite accounts (whose account IDs contain the `_SB` suffix, e.g. `7220160_SB2`) are accepted and return `account_name` containing `_SB`. Part of Phase 02 traceability registry (TC-NS-05).

## What Is Wrong
N/A — this test PASSES. If this test ever fails, investigate:
- `routers/netsuite.py:234-238` — `AuthenticateResponse.account_name` must pass through the value returned by `_validate_tba_credentials` unchanged (no stripping of `_SB`)
- `session_store.py:14-22` — `NetSuiteCreds.account_name` must be stored as-is, including `_SB` suffix

## Why It Was Done This Way (Root Cause)
The router makes no distinction between sandbox and production account IDs — it passes `account_id` directly to `_validate_tba_credentials` and stores whatever `account_name` the CLI returns. The mock returns `(True, "7220160_SB2")`, which becomes both `creds.account_name` in the session and `account_name` in the response. The `_SB` suffix is purely informational to the frontend.

## What Is Done Right
Confirms that sandbox accounts (`_SB2`, `_SB1`, etc.) flow through the same authentication path as production accounts without any special-casing or rejection. The test asserts `"_SB" in body.get("account_name")`, which would catch any accidental stripping of the suffix.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_05_sandbox_account -v
```
If the test fails, check:
1. `routers/netsuite.py:234` — `account_name=account_name` in `AuthenticateResponse(...)` must not transform the value
2. Ensure no regex or string replace on `_SB` was added to `_validate_tba_credentials`

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/netsuite/authenticate — account_id = "7220160_SB2"]
      → [routers/netsuite.py:199 _validate_tba_credentials (mocked → (True, "7220160_SB2"))]
        → [session_store.py:28-31 set_session_creds — account_name stored with _SB suffix]
          → [routers/netsuite.py:234-238 AuthenticateResponse.account_name = "7220160_SB2"]
                ↑
        THIS TEST COVERS THIS PATH

**Upstream:** User connects a NetSuite sandbox environment (common during development)
**Downstream:** Phase 04 frontend displays `account_name` in the status indicator; `_SB` suffix signals to users they are in sandbox mode

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_05_sandbox_account -v`

## Downstream Impact
**Impact if unfixed:** Sandbox users would receive an error or a stripped account name, making it impossible to test NetSuite integrations against sandbox before promoting to production.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (valid credentials), CASE-076 (production account)
