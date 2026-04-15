---
id: CASE-077
title: "Two authenticated users cannot see each other's TBA credentials (session isolation)"
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
feature: "Session isolation in session_store.py"
test_ref: "tests/test_netsuite.py::test_tc_ns_07_session_isolation"
files:
  - path: src/backend/session_store.py
    lines: "1-50"
  - path: src/backend/routers/netsuite.py
    lines: "188-238"
---

## Why This Case Was Created
Verifies that the session store enforces per-user isolation: when User A and User B each authenticate with different TBA credentials, each user's call to GET /api/netsuite/status returns only their own account name and credentials. Part of the Phase 02 traceability registry (TC-NS-07).

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `session_store.py:1-50` — `_store` must be a `dict` keyed by `user_id`; if keyed by anything else (e.g., a fixed key, session cookie, or account ID), isolation breaks
- `routers/netsuite.py:270-295` — `GET /api/netsuite/status` must call `session_store.get_session_creds(user_id)` where `user_id` is the current JWT subject, not a global or shared key
- `get_current_user_id` — verify the JWT `sub` field is extracted correctly as a string; if two users share the same derived ID, their sessions collide

## Why It Was Done This Way (Root Cause)
`session_store._store` is a plain Python `dict` keyed by `user_id` (a string derived from the JWT `sub` claim). `set_session_creds(user_id, creds)` at `session_store.py:28-31` writes only to `_store[user_id]`, and `get_session_creds(user_id)` at `session_store.py:14-22` reads only from `_store[user_id]`. Because each JWT carries a unique `user_id`, no code path allows one user's read to touch another user's entry. The design is intentionally minimal — no locking needed because Python's GIL protects dict reads/writes and because TBA credentials are per-user-session, not shared state.

## What Is Done Right
This test exercises the multi-tenant isolation invariant end-to-end: two separate user registrations, two separate logins yielding two distinct JWTs, two separate TBA authentications with different account names, and two separate status checks — each confirming only the expected account name is present and the other user's account name is absent.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_07_session_isolation -v
```
If the test fails, check:
1. `session_store.py` — confirm `_store` is keyed by `user_id` (not a singleton or fixed key)
2. `routers/netsuite.py:270-295` — confirm `get_current_user_id` is used as the Depends parameter and passed directly to `get_session_creds`
3. Inspect that User A's JWT `sub` and User B's JWT `sub` are distinct strings

## Architecture Mapping

**Layer:** Backend Session Store + Router

**Flow:**
    [User A: POST /api/netsuite/authenticate — account_id="7220160_SB2"]
      → [session_store._store["user_a_id"] = NetSuiteCreds(account_name="7220160_SB2")]
    [User B: POST /api/netsuite/authenticate — account_id="9999999_SB1"]
      → [session_store._store["user_b_id"] = NetSuiteCreds(account_name="9999999_SB1")]
    [User A: GET /api/netsuite/status]
      → [session_store.get_session_creds("user_a_id") → "7220160_SB2"]
                ↑ THIS TEST COVERS THIS ISOLATION INVARIANT
    [User B: GET /api/netsuite/status]
      → [session_store.get_session_creds("user_b_id") → "9999999_SB1"]

**Upstream:** Each user authenticates independently via their own JWT
**Downstream:** Critical in multi-tenant deployments — if isolation fails, User A's credentials (tokenKey, consumerKey, etc.) are readable by User B

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_07_session_isolation -v`

## Downstream Impact
**Impact if unfixed:** Cross-user credential exposure. User A can read User B's tokenKey, consumerKey, and tokenSecret via the status endpoint. This is a critical security regression in any deployment with more than one concurrent user.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-071 (valid credentials happy path), CASE-078 (logout wipes credentials), CASE-085 (credentials not in DB)
