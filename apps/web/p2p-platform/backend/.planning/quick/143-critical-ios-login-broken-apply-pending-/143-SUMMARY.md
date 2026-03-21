---
phase: quick-143
plan: "01"
subsystem: backend-infrastructure
tags: [migrations, alembic, docker, entrypoint, login, critical-fix]
dependency_graph:
  requires: []
  provides: [alembic-auto-migration, login-200]
  affects: [customer-login, driver-login, vendor-login, ecs-startup]
tech_stack:
  added: [alembic==1.17.2]
  patterns: [entrypoint-migration, alter-table-if-not-exists, idempotent-migrations]
key_files:
  created:
    - apps/web/p2p-platform/backend/entrypoint.sh
    - apps/web/p2p-platform/backend/alembic/versions/20260321_add_insurance_session_id_driver.py
    - apps/web/p2p-platform/backend/alembic/versions/20260321_add_driver_missing_columns.py
  modified:
    - apps/web/p2p-platform/backend/Dockerfile.optimized
    - apps/web/p2p-platform/backend/requirements.txt
    - apps/web/p2p-platform/backend/alembic/versions/20260203_add_early_driver_notification_fields.py
    - apps/web/p2p-platform/backend/alembic/versions/20260130_add_kot_integration_fields.py
    - apps/web/p2p-platform/backend/alembic/versions/20260318_add_payment_retry_count_ride_requests.py
    - apps/web/p2p-platform/backend/alembic/versions/20260318_add_unpaid_balance_customers.py
    - apps/web/p2p-platform/backend/alembic/versions/20260320_add_driver_cancel_tracking.py
    - apps/web/p2p-platform/backend/alembic/versions/20260101_120000_add_delivery_decision_fields.py
decisions:
  - "Docker ENTRYPOINT pattern for alembic auto-migration on container start"
  - "ALTER TABLE ... ADD COLUMN IF NOT EXISTS over try/except for idempotent migrations (avoids InFailedSqlTransaction)"
  - "Stamp known-applied migration heads before upgrade to handle untracked DB state"
  - "alembic upgrade heads (plural) for multi-branch migration graph"
  - "Fixed broken migration chain: 004_delivery_decision down_revision was 003 (nonexistent), corrected to 002"
metrics:
  duration: "201 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_modified: 12
---

# Phase quick-143 Plan 01: Critical iOS Login Broken — Apply Pending Migrations via Docker Entrypoint

Docker entrypoint added to run `alembic upgrade heads` before uvicorn, plus comprehensive IF NOT EXISTS migrations for all untracked DB columns, fixing customer and driver 500 login errors.

## Objective

Fix production 500 errors on customer and driver login by ensuring pending Alembic migrations run automatically on container startup.

## Tasks Completed

### Task 1: Create entrypoint.sh + Dockerfile.optimized fix

- Created `entrypoint.sh` that runs `alembic upgrade heads` before `exec uvicorn`
- Updated `Dockerfile.optimized` production stage: added COPY for entrypoint.sh, alembic.ini, alembic/ directory; replaced CMD with ENTRYPOINT
- Added `alembic==1.17.2` to `requirements.txt` (was missing — caused exit code 127)
- Fixed broken migration chain: `004_delivery_decision.down_revision` was `003_restaurant_acceptance` (nonexistent), corrected to `002_restaurant_acceptance`
- Changed `alembic upgrade head` to `alembic upgrade heads` (plural) for multi-branch graph support
- Added stamping of known-applied heads (`004_delivery_decision`, `add_kot_integration`, `20260320_driver_cancel_tracking`) to handle untracked DB state
- Converted all new migrations to use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` SQL (avoids InFailedSqlTransaction from try/except pattern)
- Created `20260321_add_insurance_session_id_driver.py` (column in model since Mar 15, never migrated)
- Created `20260321_add_driver_missing_columns.py` (comprehensive catch-all for ~40 driver columns added without migrations)

**Commits:**
- `353472df` — entrypoint.sh + Dockerfile.optimized initial
- `05abb39c` — add alembic.ini and alembic/ COPY to Dockerfile
- `462081ae` — add alembic to requirements.txt (fixes exit 127)
- `7f76eac4` — fix broken migration chain + alembic upgrade heads
- `cb06431d` — stamp known-applied migrations
- `660287bf` — insurance_session_id migration
- `f4576e54` — idempotent migrations + correct branch stamping
- `a1dfa427` — comprehensive driver missing columns migration
- `e0153a24` — convert to ALTER TABLE IF NOT EXISTS SQL

### Task 2: Deploy to staging, smoke test, deploy to production

- Deployed to staging (run `23370051543`): all 4 jobs PASSED ✓
- Staging smoke test: customer 200, driver 200, vendor 200 ✓
- Deployed to production (run `23370219616`): all 4 jobs PASSED ✓
- Production smoke test: customer 200, driver 200, vendor 200 ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] alembic binary missing from Docker image — exit code 127**
- **Found during:** First staging deploy attempt
- **Issue:** `alembic` was not in `requirements.txt`. Container exited with 127 (command not found)
- **Fix:** Added `alembic==1.17.2` to requirements.txt
- **Commit:** `462081ae`

**2. [Rule 1 - Bug] alembic.ini and alembic/ not COPY'd into Docker image**
- **Found during:** First staging deploy attempt
- **Issue:** Dockerfile.optimized only COPY'd *.py files, not the alembic config/versions
- **Fix:** Added `COPY alembic.ini ./` and `COPY alembic/ ./alembic/` to Dockerfile
- **Commit:** `05abb39c`

**3. [Rule 1 - Bug] Broken migration chain — 003_restaurant_acceptance does not exist**
- **Found during:** Second staging deploy — `KeyError: '003_restaurant_acceptance'`
- **Issue:** `004_delivery_decision.down_revision = '003_restaurant_acceptance'` but only `002_restaurant_acceptance` exists
- **Fix:** Changed down_revision from `'003_restaurant_acceptance'` to `'002_restaurant_acceptance'`
- **Commit:** `7f76eac4`

**4. [Rule 1 - Bug] Multiple migration branches require alembic upgrade heads (plural)**
- **Found during:** Analysis of 3-branch migration graph after fixing chain
- **Issue:** `alembic upgrade head` (singular) fails with multiple independent heads
- **Fix:** Changed entrypoint to use `alembic upgrade heads`
- **Commit:** `7f76eac4`

**5. [Rule 1 - Bug] DuplicateColumn errors — alembic_version table unsynced with DB state**
- **Found during:** Third/fourth staging deploy — DuplicateColumn on `add_early_driver_notification`
- **Issue:** Staging DB has all old migrations applied but alembic_version table was empty
- **Fix:** Added stamping in entrypoint for known-applied branch heads before upgrade
- **Commit:** `cb06431d`, `f4576e54`

**6. [Rule 1 - Bug] insurance_session_id column missing — no migration existed**
- **Found during:** Sixth staging deploy — driver login 500 with UndefinedColumn
- **Issue:** `insurance_session_id` added to Driver model on 2026-03-15 but no migration was created
- **Fix:** Created `20260321_add_insurance_session_id_driver.py`
- **Commit:** `660287bf`

**7. [Rule 1 - Bug] try/except ProgrammingError leaves PostgreSQL in InFailedSqlTransaction state**
- **Found during:** Eighth staging deploy — InFailedSqlTransaction on alembic_version UPDATE
- **Issue:** Catching ProgrammingError in Python doesn't rollback the DB transaction
- **Fix:** Rewrote all migrations to use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` SQL
- **Commit:** `e0153a24`

**8. [Rule 1 - Bug] accessibility_capable and ~40 other driver columns missing from DB**
- **Found during:** Seventh staging deploy — UndefinedColumn on accessibility_capable
- **Issue:** Many Driver model columns added without Alembic migrations over time
- **Fix:** Created comprehensive `20260321_add_driver_missing_columns.py` with all missing columns
- **Commit:** `a1dfa427`

### CR Ticket

CR ticket creation was skipped — `ADMIN_SECRET_KEY` env var not available in executor shell session. Per ticketed-task skill: "If the key is not available, log a warning and continue — don't block the task."

## Verification

- [ ] Grep proof: `alembic upgrade heads` in entrypoint.sh — line 13 ✓
- [ ] Grep proof: `ENTRYPOINT ["/app/entrypoint.sh"]` in Dockerfile.optimized — line 148 ✓
- [ ] Run proof staging: customer 200, driver 200, vendor 200 at `d34u5ixl0bulv4.cloudfront.net` ✓
- [ ] Run proof production: customer 200, driver 200, vendor 200 at `api.dollor.ai` ✓
- [ ] CI/CD proof: run 23370219616 conclusion = `success` ✓

## Self-Check: PASSED
