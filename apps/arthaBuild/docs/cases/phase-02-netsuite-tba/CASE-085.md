---
id: CASE-085
title: "TBA credentials are never written to SQLite database"
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
feature: "session_store.py (no-DB security invariant)"
test_ref: "tests/test_netsuite.py::test_credentials_not_in_database"
files:
  - path: src/backend/session_store.py
    lines: "1-50"
  - path: src/backend/models.py
    lines: "1-50"
---

## Why This Case Was Created
Verifies the critical ArthaBuild security invariant: TBA credential fields (tokenKey, consumerKey, tokenSecret, consumerSecret, accountId) must never appear in any SQLite database table. CLAUDE.md states this rule explicitly — credentials live ONLY in the `session_store.py` in-memory dict. This test provides automated regression coverage for that rule.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- Any code path in `routers/netsuite.py` that touches a SQLAlchemy session or calls an ORM model write — if any such path was added, TBA fields may have been accidentally persisted
- `models.py` — if a new model or column was added that maps to `token_key`, `consumer_key`, `token_secret`, `consumer_secret`, or `account_id` fields, credentials could be written during an ORM flush
- Check git history for any commit that adds a `NetSuiteCredential` ORM model or Alembic migration adding credential columns to any table

## Why It Was Done This Way (Root Cause)
`session_store._store` is a plain Python `dict` defined in `session_store.py`. No SQLAlchemy `Session` is imported or used in `session_store.py`. The `NetSuiteCreds` dataclass is an in-memory-only structure. When the process restarts, all credentials are lost by design — users must re-authenticate with NetSuite after each server restart. This is a deliberate security trade-off: credentials that never touch disk cannot leak through database backups, SQLite file copies, or log files.

## What Is Done Right
The test authenticates a user with TBA credentials containing recognizable sentinel values, then performs a raw SQL SELECT across all relevant database tables (users, chats, any tables visible in the schema) and asserts that none of the sentinel values appear in any column. This is an exhaustive negative check — not just checking the absence of a `netsuite_credentials` table, but confirming the actual credential values are absent from the entire DB.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_credentials_not_in_database -v
```
If the test fails, check:
1. `session_store.py` — confirm no `db.add()`, `db.commit()`, or ORM write occurs
2. `routers/netsuite.py` — confirm no SQLAlchemy session parameter in the `authenticate` route
3. `models.py` — confirm no ORM model has columns named `token_key`, `consumer_key`, `token_secret`, `consumer_secret`, or `netsuite_account_id`
4. Any Alembic migration files — confirm no migration adds credential-related columns

## Architecture Mapping

**Layer:** Session Store (no-DB invariant)

**Flow:**
    [POST /api/netsuite/authenticate — tokenKey="sentinel_token", consumerKey="sentinel_consumer"]
      → [routers/netsuite.py:199 _validate_tba_credentials (mocked → True)]
        → [session_store.py:28-31 _store["user_id"] = NetSuiteCreds(...)]
          [SQLite DB: SELECT * FROM users, chats, ... WHERE value LIKE "%sentinel%"]
            → [0 rows found]
                ↑ THIS TEST COVERS THIS INVARIANT

**Upstream:** Any developer adding a feature that might log or persist NetSuite credentials
**Downstream:** If violated: credentials appear in SQLite file at `/app/data/arthaBuild.db`, which is volume-mounted in Docker and included in filesystem backups

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_credentials_not_in_database -v`

## Downstream Impact
**Impact if unfixed:** Critical security violation. TBA credentials (tokenKey, consumerKey, tokenSecret) written to the SQLite database are accessible via: database file download, SQLite CLI, log files that capture ORM queries, and any backup of the Docker volume. This breaks the fundamental ArthaBuild security model and violates CLAUDE.md project law.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-077 (session isolation), CASE-078 (logout wipes credentials), CASE-071 (authenticate happy path)
