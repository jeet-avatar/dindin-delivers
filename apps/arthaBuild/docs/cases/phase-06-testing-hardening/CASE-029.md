---
id: CASE-029
title: "No Alembic migration smoke test — only schema tests via create_all"
phase: "06"
phase_name: "Testing & Hardening"
category: TEST_GAP
severity: MEDIUM
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Kiran"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/conftest.py
    lines: "56-63"
  - path: src/backend/alembic/versions/
    lines: ""
---

## Why This Case Was Created
Database migration integrity audit. The test suite creates the test database schema using SQLAlchemy's `Base.metadata.create_all()` (`conftest.py:59-60`). This approach bypasses Alembic entirely — it creates the latest schema directly from ORM models without exercising any migration scripts. There are currently 4 Alembic migrations in `src/backend/alembic/versions/`. A broken migration (incorrect `op.add_column`, wrong `batch_alter_table` context for SQLite, or a syntax error in a `.py` migration file) would go undetected by the entire test suite. The production startup event at `rawapi.py:196-206` runs `alembic upgrade head` — if that fails in production, the app logs an error but continues, which can cause DB schema mismatches.

## What Is Wrong
`src/backend/tests/conftest.py:56-63`:
```python
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session in the in-memory DB."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)   # ← bypasses Alembic
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

The four Alembic migration files exist:
- `55f7c14b391d_create_users_and_password_reset_tokens.py`
- `a1b2c3d4e5f6_add_fk_password_reset_token_user_id.py`
- `12fa982ac6c3_add_license_cache_and_script_.py`
- `a2b3c4d5e6f7_phase9_rbac_chat.py`

None of these are executed by any test. If a developer introduces a migration with incorrect `render_as_batch=True` usage for SQLite's `ALTER TABLE` limitations, the migration will fail silently in CI because `create_all` bypasses it. The only time the migration runs is on `docker compose up` or manual `alembic upgrade head`.

## Why It Was Done This Way (Root Cause)
Using `create_all` for tests is a common and correct approach for fast iteration — running migrations in an in-memory SQLite test DB is slower and more complex to set up (requires a file-based SQLite or a separate test DB). The Phase 6 test harness prioritized speed and simplicity. Adding a migration smoke test was deferred as an infrastructure task.

## What Is Done Right
The `create_all` approach correctly creates all tables with the right schema as defined by the ORM models. Since the ORM models and the Alembic migrations are kept in sync (each phase adds both a migration and an ORM update), the test DB schema matches production. The startup event at `rawapi.py:196-206` does run `alembic upgrade head` on real deployments, providing a manual verification point.

## How To Fix It
**Step 1 — Add a separate conftest fixture that runs Alembic migrations on a file-based SQLite DB.**

Create `src/backend/tests/test_migrations.py`:

```python
"""
Migration smoke test: runs all Alembic migrations from scratch on a temp DB.
Verifies that alembic upgrade head completes without error.
Separate from conftest.py — uses a file-based SQLite (Alembic cannot run on in-memory DBs
because it uses subprocess/separate connections).
"""
import os
import subprocess
import tempfile
import pytest


@pytest.mark.migrations
def test_alembic_upgrade_head_completes():
    """
    Run `alembic upgrade head` against a fresh file-based SQLite DB.
    Fails if any migration script has a syntax error, wrong batch_alter context,
    or broken op.add_column call.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_migrations.db")
        backend_dir = os.path.join(os.path.dirname(__file__), "..")

        env = {
            **os.environ,
            "DATABASE_URL": f"sqlite+aiosqlite:///{db_path}",
            "JWT_SECRET_KEY": "test-migration-key-32chars!!!!!!",
        }

        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            env=env,
            timeout=60,
        )

        assert result.returncode == 0, (
            f"alembic upgrade head failed:\n"
            f"STDOUT: {result.stdout}\n"
            f"STDERR: {result.stderr}"
        )
        assert "ERROR" not in result.stderr, (
            f"Alembic reported errors:\n{result.stderr}"
        )


@pytest.mark.migrations
def test_alembic_downgrade_base_completes():
    """
    Run `alembic downgrade base` after `upgrade head` to verify downgrade path.
    Optional: marks migration as reversible.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_downgrade.db")
        backend_dir = os.path.join(os.path.dirname(__file__), "..")

        env = {
            **os.environ,
            "DATABASE_URL": f"sqlite+aiosqlite:///{db_path}",
            "JWT_SECRET_KEY": "test-migration-key-32chars!!!!!!",
        }

        up = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=backend_dir, capture_output=True, text=True, env=env, timeout=60,
        )
        assert up.returncode == 0, f"upgrade failed: {up.stderr}"

        down = subprocess.run(
            ["alembic", "downgrade", "base"],
            cwd=backend_dir, capture_output=True, text=True, env=env, timeout=60,
        )
        assert down.returncode == 0, f"downgrade failed: {down.stderr}"
```

**Step 2 — Add the `migrations` marker to `pytest.ini`:**
```ini
[pytest]
markers =
    migrations: Run Alembic migration smoke tests (slower, requires file-based SQLite)
```

**Step 3 — Run migrations tests separately in CI:**
```bash
# Fast unit tests (skip migrations)
pytest src/backend/tests/ -m "not migrations" -v

# Migration smoke test (run in a dedicated CI step)
pytest src/backend/tests/test_migrations.py -m migrations -v
```

## Architecture Mapping

**Layer:** Database (Alembic migrations)

**Flow:**

    [New Alembic migration added by developer]
                    ↓
    [pytest run via conftest.py create_all]
                    ↓ (Alembic NOT invoked)
    [CI passes — migration script never exercised]
                    ↓
    [docker compose up → alembic upgrade head]
                    ↓
    [Migration script fails → DB mismatch → API 500s or startup error]
                    ↑
             GAP LIVES HERE — no CI gate on migration scripts

**Upstream:** Phase execution that adds new ORM models + Alembic migration files
**Downstream:** `rawapi.py:196-206` startup event, production `docker compose up`

## Verification
- [ ] Grep proof: `grep -rn "alembic\|upgrade" src/backend/tests/` — confirms no migration tests exist
- [ ] Test proof: After adding `test_migrations.py`: `pytest src/backend/tests/test_migrations.py -v` — should pass
- [ ] Runtime proof: `cd src/backend && alembic upgrade head` on a fresh DB — confirms migrations run without error

## Downstream Impact
**Impact if unfixed:** System Failure (on deploy)

A broken migration script is only discovered when deploying to Docker. In production, `rawapi.py:203-205` logs the error but does not raise — the app starts with a mismatched schema. Subsequent API calls that reference new columns added by the failed migration will raise `OperationalError: no such column`, causing 500 errors for features that depend on those columns (e.g., Phase 9 RBAC columns, Phase 7 license cache columns).

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-028
