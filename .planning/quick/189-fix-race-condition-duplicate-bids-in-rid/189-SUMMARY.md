---
phase: quick-189
plan: 01
subsystem: backend-rideshare
tags: [race-condition, database, concurrency, bid-system, unique-constraint]
dependency_graph:
  requires: []
  provides: [uq_bid_per_driver_per_request, SELECT FOR UPDATE on bid INSERT, IntegrityError HTTP 400]
  affects: [bid_routes.py, models.py, ride_bids table]
tech_stack:
  added: []
  patterns: [SELECT FOR UPDATE, UniqueConstraint, IntegrityError handler, Alembic migration]
key_files:
  created:
    - apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/bid_routes.py
decisions:
  - "SELECT FOR UPDATE widens existing check to cover all bid statuses (not just PENDING) — prevents a withdrawn bid being re-submitted by the same driver"
  - "down_revision set to add_early_driver_notification (last migration in chain) — verified by grepping revision value from 20260203 file"
  - "IntegrityError wraps entire add/flush/commit/refresh block including ride_request status update to ensure atomicity on rollback"
metrics:
  duration: "~20 minutes"
  completed: "2026-03-18"
  tasks_completed: 3
  files_modified: 3
---

# Quick Task 189: Fix Race Condition — Duplicate Bids in Rideshare Summary

**One-liner:** Database-level race condition fix via UniqueConstraint on (ride_request_id, driver_id) + SELECT FOR UPDATE duplicate check + IntegrityError HTTP 400 fallback in bid submission.

## What Was Built

Fixed a TOCTOU (Time-of-Check/Time-of-Use) race condition in the rideshare bid submission flow. Two concurrent requests from the same driver could both read NULL for an existing bid and both INSERT, producing duplicate rows that corrupted bidding state.

Three-layer defense:

1. **Database constraint** — `UniqueConstraint('ride_request_id', 'driver_id', name='uq_bid_per_driver_per_request')` added to `RideBid.__table_args__` in `models.py`. This is the ultimate enforcement layer — the database rejects duplicates regardless of application-level checks.

2. **SELECT FOR UPDATE** — The existing plain SELECT duplicate check in `bid_routes.py` (line 1372) was replaced with `db.execute(select(RideBid).where(...).with_for_update())`. This acquires a row-level lock before the INSERT, preventing concurrent transactions from both seeing NULL and both proceeding.

3. **IntegrityError handler** — The `db.add/flush/commit/refresh` block is wrapped in `try/except IntegrityError` which rolls back and raises HTTP 400 "Bid already submitted." This catches edge cases where the DB constraint fires despite the SELECT FOR UPDATE (e.g., serialization anomalies or different isolation levels).

4. **Alembic migration** — `20260318_add_unique_constraint_ride_bid.py` cleans up any existing duplicate rows (keeping the earliest bid per driver+request pair) then creates the constraint on the live database.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add UniqueConstraint to RideBid model + Alembic migration | 878fc30f | models.py, alembic/versions/20260318_add_unique_constraint_ride_bid.py |
| 2 | Fix bid_routes.py duplicate check with SELECT FOR UPDATE + IntegrityError handler | ce7384dd | bid_routes.py |
| 3 | Push, deploy staging (run 23261360382 success), deploy production (run 23261676795 success) | — | CI/CD only |

## Verification

- `grep -n "UniqueConstraint" apps/web/p2p-platform/backend/models.py` → line 1, line 1459
- `grep -n "uq_bid_per_driver_per_request" apps/web/p2p-platform/backend/models.py` → line 1459
- `grep -n "with_for_update" apps/web/p2p-platform/backend/bid_routes.py` → line 1381
- `grep -n "IntegrityError" apps/web/p2p-platform/backend/bid_routes.py` → lines 9, 1457
- Staging deploy run 23261360382: conclusion=success
- Production deploy run 23261676795: conclusion=success

## Deviations from Plan

None — plan executed exactly as written. The only note: Alembic could not run locally (no DATABASE_URL — this is expected for AWS RDS-hosted DB). Migration was verified as valid Python with correct revision/down_revision structure, and will be applied by ECS container startup migration logic. The `down_revision = 'add_early_driver_notification'` was confirmed by grepping the actual revision value from `20260203_add_early_driver_notification_fields.py` (revision = 'add_early_driver_notification').

## Self-Check: PASSED

- models.py contains UniqueConstraint: FOUND (line 1, line 1459)
- bid_routes.py contains with_for_update: FOUND (line 1381)
- bid_routes.py contains IntegrityError: FOUND (lines 9, 1457)
- Migration file exists: FOUND (apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py)
- Task 1 commit 878fc30f: FOUND
- Task 2 commit ce7384dd: FOUND
- Staging CI/CD run 23261360382: success
- Production CI/CD run 23261676795: success
