---
id: CASE-076
title: "POST /api/netsuite/authenticate returns 200 for production account ID (no _SB suffix)"
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
feature: "POST /api/netsuite/authenticate — production account support"
test_ref: "tests/test_netsuite.py::test_tc_ns_06_production_account"
files:
  - path: src/backend/routers/netsuite.py
    lines: "188-238"
  - path: src/backend/session_store.py
    lines: "14-22"
---

## Why This Case Was Created
Verifies that production NetSuite accounts (no `_SB` suffix in account ID, e.g. `7220160`) are accepted and that `account_name` in the response does not contain `_SB`. Companion to TC-NS-05 to ensure both environments are explicitly covered. Part of Phase 02 traceability registry (TC-NS-06).

## What Is Wrong
N/A — this test PASSES. If this test ever fails, investigate:
- `routers/netsuite.py:234-238` — `AuthenticateResponse.account_name` must reflect the value returned by `_validate_tba_credentials`, which for production accounts will not contain `_SB`
- The test asserts `"_SB" not in body.get("account_name")` — failure means the router is injecting or appending `_SB` to the account name

## Why It Was Done This Way (Root Cause)
Production accounts use plain numeric account IDs (e.g. `7220160`). The mock returns `(True, "7220160")`, and the router passes this through to `AuthenticateResponse.account_name` unchanged. This is the same code path as TC-NS-05 — the test exists to document production account coverage alongside sandbox.

## What Is Done Right
Confirms the complementary scenario to TC-NS-05: production account IDs work the same way as sandbox, and the response `account_name` correctly reflects the absence of `_SB`. Together with CASE-075, these two cases ensure neither account type is accidentally rejected or misidentified.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_06_production_account -v
```
If the test fails, check:
1. `routers/netsuite.py:234` — `account_name` must be the raw value returned by `_validate_tba_credentials`
2. Ensure no transformation is applied that adds `_SB` to production account names

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/netsuite/authenticate — account_id = "7220160" (no _SB)]
      → [routers/netsuite.py:199 _validate_tba_credentials (mocked → (True, "7220160"))]
        → [session_store.py:28-31 set_session_creds — account_name = "7220160"]
          → [routers/netsuite.py:234-238 AuthenticateResponse.account_name = "7220160"]
                ↑
        THIS TEST COVERS THIS PATH

**Upstream:** User connects a NetSuite production environment
**Downstream:** Phase 04 frontend status indicator shows the production account name; no `_SB` badge displayed

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_06_production_account -v`

## Downstream Impact
**Impact if unfixed:** Production account users cannot connect; all deploy operations are blocked for the majority of production users.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-075 (sandbox account), CASE-071 (valid credentials)
