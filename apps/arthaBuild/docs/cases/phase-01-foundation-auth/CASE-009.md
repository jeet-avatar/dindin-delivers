---
id: CASE-009
title: "Alembic migrations bypassed in test suite (conftest uses create_all)"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: TEST_GAP
severity: MEDIUM
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/conftest.py
    lines: "56-63"
  - path: src/backend/rawapi.py
    lines: "196-206"
---

## Why This Case Was Created
Triggered by the TEST_GAP audit dimension. The test infrastructure creates the database schema using SQLAlchemy's `Base.metadata.create_all()` rather than running Alembic migrations. This means migration scripts are never exercised in the test suite. A broken migration (e.g., missing `render_as_batch=True` for SQLite, wrong column type, bad constraint) will pass all tests but fail on first production or staging deployment.

## What Is Wrong
`src/backend/tests/conftest.py` lines 56–63:
```python
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session in the in-memory DB."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)   # ← bypasses Alembic entirely
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

The production startup in `rawapi.py` lines 196–206 runs Alembic migrations:
```python
import subprocess
result = subprocess.run(
    ["alembic", "upgrade", "head"],
    cwd=os.path.dirname(__file__),
    capture_output=True,
    text=True,
)
```

The divergence means:
- **Tests** always see the schema derived from current ORM models (always up-to-date with model changes)
- **Production** sees the schema produced by migration scripts (which may lag behind or contain bugs)

If a migration is written with a mistake (e.g., adding a NOT NULL column without a default, SQLite ALTER TABLE without `batch_alter_table`, wrong column name), it will be undetected until `alembic upgrade head` is run at deployment time.

The CLAUDE.md rule states: "Alembic migrations: always `render_as_batch=True` (SQLite ALTER TABLE)." This rule is enforced in migration files but never tested.

## Why It Was Done This Way (Root Cause)
`create_all()` is the standard pytest-asyncio pattern for in-memory SQLite test databases. It is simpler, faster, and does not require Alembic to be configured for an in-memory URL. Running Alembic migrations against an in-memory database requires extra setup (`alembic.ini` pointing to the test DB URL, or programmatic invocation via `alembic.config`). The simpler approach was used in Phase 1 and was not revisited.

## What Is Done Right
Using an in-memory SQLite database for tests is correct — it provides perfect isolation and does not touch `arthaBuild.db`. The `StaticPool` connection sharing is also correct for in-memory SQLite with a single connection. The tests themselves are sound; the issue is solely the schema creation mechanism.

## How To Fix It
Add a secondary test or fixture that runs Alembic migrations against the test database to verify migration scripts are correct. This can coexist with the existing `create_all` approach.

**Option A — Add a dedicated migration smoke-test** (minimal change):
```python
# In tests/test_migrations.py (new file)
import pytest
import subprocess
import os

def test_alembic_upgrade_head_succeeds():
    """
    TC-MIGRATION-01: Alembic upgrade head runs without error against a fresh DB.
    Uses a temporary SQLite file so it does not touch arthaBuild.db.
    """
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        test_db_path = f.name

    env = {**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{test_db_path}"}
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=os.path.dirname(os.path.dirname(__file__)),  # src/backend/
        capture_output=True,
        text=True,
        env=env,
    )
    assert result.returncode == 0, f"Alembic migration failed:\n{result.stderr}"
```

**Option B — Programmatic Alembic invocation** in conftest:
Replace `Base.metadata.create_all` with `alembic upgrade head` using `alembic.config.Config` and `alembic.command.upgrade`. This is the most faithful test of production behavior but requires more setup.

Run the migration smoke-test:
```bash
pytest tests/test_migrations.py -v
```

## Architecture Mapping

**Layer:** Test Infrastructure → Database Schema Creation

**Flow:**

    [Test Suite]
    conftest.py:60 → Base.metadata.create_all()   ← THIS CASE LIVES HERE (bypasses Alembic)
      → in-memory SQLite schema (always matches ORM models)

    [Production]
    rawapi.py:196 → subprocess "alembic upgrade head"
      → SQLite schema via migration scripts (may diverge from ORM models if migration is buggy)

**Upstream:** All test files depend on `conftest.py`'s `create_tables` fixture

**Downstream:** Alembic migration scripts in `src/backend/alembic/versions/` are never exercised by the test suite

## Verification
- [ ] Grep proof: `grep -n "create_all\|alembic" src/backend/tests/conftest.py` → shows `create_all` at line 60, no alembic import
- [ ] Grep proof: `grep -rn "alembic upgrade\|alembic.command" src/backend/tests/` → empty (confirms no migration tests)
- [ ] Fix proof: `pytest tests/test_migrations.py -v` → PASSED (shows Alembic runs cleanly)

## Downstream Impact
**Impact if unfixed:** System Failure risk at deployment time

A broken migration will not be caught until `alembic upgrade head` is run at container start in production or staging. The `rawapi.py` startup event logs migration failures (`logger.error`) but does not raise — the server will start with a broken schema, causing 500 errors when routes try to query tables that don't exist or have wrong columns.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-007, CASE-008 (other test gaps in auth suite)
