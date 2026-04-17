---
id: CASE-071
title: "POST /api/netsuite/authenticate returns 200 for valid TBA credentials"
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
feature: "POST /api/netsuite/authenticate"
test_ref: "tests/test_netsuite.py::test_tc_ns_01_valid_credentials"
files:
  - path: src/backend/routers/netsuite.py
    lines: "188-238"
  - path: src/backend/session_store.py
    lines: "28-31"
---

## Why This Case Was Created
Verifies the happy-path TBA credential flow: a user submits all five required NetSuite TBA fields, the SuiteCloud CLI validates them (mocked in CI), and the backend returns `{authenticated: true, account_name: "7220160_SB2"}`. Part of the Phase 02 traceability registry (TC-NS-01).

## What Is Wrong
N/A — this test PASSES. If this test ever fails, investigate:
- `routers/netsuite.py:199` — `_validate_tba_credentials` call (is it still mocked in the test?)
- `session_store.py:28-31` — `set_session_creds()` must store the `NetSuiteCreds` dataclass keyed by `user_id`
- `routers/netsuite.py:234-238` — `AuthenticateResponse` must include `authenticated=True`, `account_name`, and a message containing "Connected"

## Why It Was Done This Way (Root Cause)
The SuiteCloud CLI is not available in CI, so `_validate_tba_credentials` is patched with `unittest.mock.patch` to return `(True, "7220160_SB2")`. This isolates the HTTP contract test from the external CLI dependency. The router at `routers/netsuite.py:199` calls the function, and the mock intercepts it. The resulting `NetSuiteCreds` object is stored in `session_store._store[user_id]` (`session_store.py:28-31`).

## What Is Done Right
Covers the complete authenticate-and-store path: Pydantic model validation of the `AuthenticateRequest`, mock-patched CLI validation, `set_session_creds()` persistence in RAM, and the `AuthenticateResponse` shape (`authenticated`, `account_name`, `message`). Confirms the "Connected" string in the message field, which Phase 04 frontend status indicator checks.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_01_valid_credentials -v
```
If the test fails, check:
1. `routers/netsuite.py:199` — verify `_validate_tba_credentials` is the fully-qualified mock target (`routers.netsuite._validate_tba_credentials`)
2. `routers/netsuite.py:234` — `AuthenticateResponse` must include `account_name` and `message` contains "Connected"
3. `session_store.py:28-31` — `set_session_creds` stores `NetSuiteCreds` without error

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/netsuite/authenticate]
      → [routers/netsuite.py:199 _validate_tba_credentials (mocked → (True, "7220160_SB2"))]
        → [session_store.py:28-31 set_session_creds(user_id, NetSuiteCreds(...))]
          → [routers/netsuite.py:234-238 return AuthenticateResponse(authenticated=True, ...)]
                ↑
        THIS TEST COVERS THIS PATH

**Upstream:** User submits TBA credentials via POST body; `get_current_user_id` Depends extracts `user_id` from JWT
**Downstream:** Enables `GET /api/netsuite/status`, `POST /api/deploy/suitescript`; Phase 04 status indicator reads `authenticated_at`

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_01_valid_credentials -v`

## Downstream Impact
**Impact if unfixed:** The entire Phase 02 session flow breaks. No user can connect to NetSuite. `POST /api/deploy/suitescript` returns 401 for all users.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-072 (wrong consumer key), CASE-073 (wrong account ID), CASE-077 (session isolation)
