---
id: CASE-006
title: "Login normalizes email to lowercase but DB column has no COLLATE NOCASE index"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: ARCH_VIOLATION
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/models.py
    lines: "40"
  - path: src/backend/routers/auth.py
    lines: "31, 46"
---

## Why This Case Was Created
Triggered by the ARCH_VIOLATION audit dimension. The application normalizes email addresses to lowercase in code before querying the database, but the underlying SQLite column has no `COLLATE NOCASE` constraint. This creates a latent inconsistency: if any code path inserts or queries an email without calling `.lower()` first, the DB will treat `Alice@test.com` and `alice@test.com` as different rows, allowing duplicate accounts or missed lookups.

## What Is Wrong
`src/backend/models.py` line 40 — the `email` column has no collation:
```python
email = Column(String, unique=True, index=True, nullable=False)
# Missing: COLLATE NOCASE on the index
```

`src/backend/routers/auth.py` lines 31 and 46 — normalization is enforced only in code:
```python
# check-user (line 31)
result = await db.execute(select(User).where(User.email == data.email.lower()))

# login (line 46)
result = await db.execute(select(User).where(User.email == data.username.lower()))
```

The application correctly calls `.lower()` before every query, so in practice all emails are stored and queried lowercase. However, the `unique=True` constraint on the `email` column does not enforce case-insensitive uniqueness at the database level. SQLite's default string comparison is case-sensitive (`'Alice' != 'alice'`). A direct DB INSERT (via Alembic data migration, admin script, or test fixture that bypasses the application layer) could insert `Alice@test.com` even when `alice@test.com` already exists, breaking the uniqueness invariant.

Additionally, the `index=True` on the `email` column creates a B-tree index using SQLite's default case-sensitive collation. A query for `Alice@test.com` would not use the index to find `alice@test.com`, though in practice this is masked by the `.lower()` normalization.

## Why It Was Done This Way (Root Cause)
The code-level `.lower()` normalization was applied correctly and consistently in Phase 1. The COLLATE NOCASE constraint was not added because SQLite's default string comparisons are case-sensitive and the normalization appeared to fully solve the problem. The gap only becomes visible when code outside the application layer (direct SQL, migrations, admin tools) touches the email column.

## What Is Done Right
Every application-layer query (check-user, login, forgot-password, register) correctly normalizes email to lowercase before comparison. Registration also stores emails lowercase. This means the bug has zero impact under normal application usage.

## How To Fix It
Add `COLLATE NOCASE` to the email column definition in `models.py` and create an Alembic migration:

**Step 1 — Update model (`src/backend/models.py` line 40):**
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
# SQLite: use String with collation argument
email = Column(String(collation="NOCASE"), unique=True, index=True, nullable=False)
```

**Step 2 — Generate Alembic migration:**
```bash
cd src/backend
alembic revision --autogenerate -m "add_nocase_collation_to_email"
```

**Step 3 — Review the generated migration** and ensure it uses `batch_alter_table` (required for SQLite ALTER TABLE — CLAUDE.md rule: `render_as_batch=True`).

**Step 4 — Apply migration:**
```bash
alembic upgrade head
```

## Architecture Mapping

**Layer:** DB Model → Auth Router

**Flow:**

    POST /api/auth/login
      → data.username.lower()          ← application normalizes here
        → SELECT * FROM users WHERE email = ?   ← DB comparison (case-sensitive by default)
                                                          ↑
                                              THIS CASE LIVES HERE
          (if email was somehow stored non-lowercase, lookup would fail)

**Upstream:** Registration route (`routers/user.py`) — stores email; all code paths currently call `.lower()` before storing

**Downstream:** All auth routes (check-user, login, forgot-password) that query by email

## Verification
- [ ] Grep proof: `grep -n "COLLATE\|collation\|nocase" src/backend/models.py` → empty (confirms missing constraint)
- [ ] Grep proof: `grep -n "\.lower()" src/backend/routers/auth.py` → shows lines 31, 46, 112 (confirms application-level normalization exists)
- [ ] Fix proof: after migration, `sqlite3 arthaBuild.db ".schema users"` → shows `email TEXT COLLATE NOCASE`

## Downstream Impact
**Impact if unfixed:** None under normal operation; Data Loss risk for edge cases

Under normal application use, the `.lower()` normalization fully prevents the issue. Impact only materializes if: (a) an Alembic data migration inserts emails without lowercasing, (b) an admin script queries the DB directly, or (c) the normalization is accidentally removed from one code path. Low probability but high consequence — a duplicate account could be created, breaking authentication for the affected email.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
