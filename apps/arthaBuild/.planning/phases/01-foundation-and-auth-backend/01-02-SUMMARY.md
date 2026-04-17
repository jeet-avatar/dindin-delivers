---
phase: 01-foundation-and-auth-backend
plan: 02
subsystem: database
tags: [sqlalchemy, alembic, sqlite, aiosqlite, python]

# Dependency graph
requires:
  - phase: 01-01
    provides: Python venv with all packages installed at src/backend/venv/

provides:
  - Async SQLAlchemy engine (aiosqlite), AsyncSessionLocal, Base, get_db — database.py
  - User ORM model (12 columns incl. failed_attempts, locked_until) — models.py
  - PasswordResetToken ORM model (token_hash SHA-256) — models.py
  - Alembic config with render_as_batch=True and sqlite sync URL — alembic.ini + alembic/env.py
  - Initial migration creating users and password_reset_tokens tables — alembic/versions/55f7c14b391d_*
  - arthaBuild.db SQLite file with correct schema at src/backend/arthaBuild.db

affects: [01-03, 01-04, 01-05, auth, netsuite-session, chat]

# Tech tracking
tech-stack:
  added: [alembic 1.13.3, aiosqlite 0.20.0, sqlalchemy 2.0.35]
  patterns:
    - async_sessionmaker with expire_on_commit=False (prevents MissingGreenlet errors)
    - render_as_batch=True in alembic env.py (SQLite ALTER TABLE support)
    - Alembic uses sync URL (sqlite:///); runtime uses async URL (sqlite+aiosqlite:///)
    - User model stores name + first_name + last_name to satisfy both login response and general lookups
    - PasswordResetToken stores token_hash (SHA-256), never raw token

key-files:
  created:
    - src/backend/database.py
    - src/backend/models.py
    - src/backend/alembic.ini
    - src/backend/alembic/env.py
    - src/backend/alembic/versions/55f7c14b391d_create_users_and_password_reset_tokens.py
    - src/backend/arthaBuild.db
  modified: []

key-decisions:
  - "Alembic autogenerate produced empty migration (no existing DB to diff against) — wrote migration manually with explicit create_table ops"
  - "User model includes first_name + last_name alongside name to match frozen login response interface {id,name,first_name,last_name,email}"
  - "render_as_batch=True added to both run_migrations_offline and run_migrations_online in env.py"

patterns-established:
  - "database.py pattern: load_dotenv → DATABASE_URL from env → create_async_engine → async_sessionmaker(expire_on_commit=False) → get_db generator"
  - "models.py pattern: import Base from database → define model class → all timestamps use server_default=func.now()"
  - "alembic env.py: sys.path.insert to find database.py → from database import Base → target_metadata = Base.metadata"

requirements-completed: [FR-AUTH-01, FR-AUTH-03]

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 01 Plan 02: Database Foundation Summary

**Async SQLAlchemy + Alembic setup with SQLite: User and PasswordResetToken ORM models, initial migration creating both tables, arthaBuild.db live at head**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-07T23:55:08Z
- **Completed:** 2026-04-07T23:57:18Z
- **Tasks:** 2
- **Files modified:** 6 (created)

## Accomplishments
- database.py with async engine, AsyncSessionLocal (expire_on_commit=False), Base, and get_db dependency
- models.py with User model (12 columns: id, name, first_name, last_name, email, organization, password_hash, is_active, is_verified, failed_attempts, locked_until, created_at) and PasswordResetToken model
- Alembic fully configured: sync URL in alembic.ini, render_as_batch=True in env.py, Base imported from database
- Initial migration written manually (autogenerate was empty on clean DB); both tables created correctly
- arthaBuild.db at head with users + password_reset_tokens + alembic_version tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database.py and models.py** - `d1b3ad33` (feat)
2. **Task 2: Initialize Alembic and create initial migration** - `7a4458c5` (feat)

## Files Created/Modified
- `src/backend/database.py` - Async SQLAlchemy engine, AsyncSessionLocal, Base, get_db
- `src/backend/models.py` - User (12 cols) and PasswordResetToken ORM models
- `src/backend/alembic.ini` - sqlite:///./arthaBuild.db sync URL
- `src/backend/alembic/env.py` - Base import, render_as_batch=True in both migration modes
- `src/backend/alembic/versions/55f7c14b391d_create_users_and_password_reset_tokens.py` - Initial migration
- `src/backend/arthaBuild.db` - SQLite database file created by alembic upgrade head

## Decisions Made
- Alembic autogenerate produced an empty migration because no database file existed yet to compare against. Wrote the migration manually with explicit `create_table` and `create_index` operations using `op.batch_alter_table` to stay consistent with render_as_batch=True.
- User model stores all three of `name`, `first_name`, and `last_name` to satisfy the frozen login response interface `{id, name, first_name, last_name, email}` defined in CLAUDE.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Alembic autogenerate produced empty migration**
- **Found during:** Task 2 (Step E)
- **Issue:** `alembic revision --autogenerate` generates a diff between the current DB state and models — but on a clean (non-existent) DB, there is nothing to diff, so it generates `pass` in both upgrade and downgrade
- **Fix:** Wrote the migration manually with explicit `op.create_table` calls for both tables, mirroring the column definitions in models.py exactly
- **Files modified:** `alembic/versions/55f7c14b391d_create_users_and_password_reset_tokens.py`
- **Verification:** `alembic upgrade head` ran clean; sqlite3 confirmed both tables with all required columns
- **Committed in:** 7a4458c5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in autogenerate approach)
**Impact on plan:** Fix was necessary; plan assumed autogenerate would detect models but without an existing DB there is nothing to diff. Manual migration is the standard approach for initial schema creation.

## Issues Encountered
None beyond the autogenerate deviation documented above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- database.py and models.py importable and verified: `from database import Base, get_db; from models import User, PasswordResetToken` prints OK
- arthaBuild.db at alembic head (55f7c14b391d) with correct schema
- Plans 01-03 (auth endpoints) and 01-04 (password reset) can now import User and PasswordResetToken directly
- No blockers

---
*Phase: 01-foundation-and-auth-backend*
*Completed: 2026-04-07*
