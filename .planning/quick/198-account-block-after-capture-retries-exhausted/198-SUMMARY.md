---
phase: quick-198
plan: 01
subsystem: rideshare-payments
tags: [payment, stripe, customer-blocking, ride-request, alembic]
dependency_graph:
  requires: [quick-192-auto-payout, phase-08.1-payment-retry-count]
  provides: [has_unpaid_balance customer flag, 402 ride-request guard]
  affects: [bid_routes.py, models.py, customers table]
tech_stack:
  added: []
  patterns: [DB flag for account-level blocking, scheduler-set + endpoint-guard pattern]
key_files:
  created:
    - apps/web/p2p-platform/backend/alembic/versions/20260318_add_unpaid_balance_customers.py
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/bid_routes.py
decisions:
  - "has_unpaid_balance is a separate Boolean from is_active — is_active is for suspension; has_unpaid_balance is specifically for payment debt blocking"
  - "Guard inserted AFTER concurrent-rides check (429) so customers see debt error before capacity error"
  - "Flag set only if not already True (idempotent) — multiple scheduler runs do not cause extra DB writes"
  - "down_revision points to 20260318_payment_retry_count (actual chain head at time of execution, not the filename of the unique constraint migration)"
metrics:
  duration: 8m
  completed: "2026-03-19T06:08:11Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase quick-198 Plan 01: Account Block After Capture Retries Exhausted Summary

**One-liner:** Customer `has_unpaid_balance` Boolean blocks new ride requests (HTTP 402) after Stripe capture fails 3 times in `check_capture_retry_job`.

## What Was Built

Two-part feature to prevent customers from accumulating unpaid ride debt:

1. **New DB column** — `has_unpaid_balance = Column(Boolean, default=False)` on the `Customer` model with a corresponding Alembic migration that adds the column with `server_default='false'` so existing customers are unaffected.

2. **Flag setter** — In `check_capture_retry_job` (bid_routes.py), when `retry_count >= MAX_RETRIES`, the scheduler now queries the `Customer` record by `ride.customer_id` and sets `has_unpaid_balance = True` if not already flagged. The set is idempotent (guarded by `not customer_record.has_unpaid_balance`).

3. **Request guard** — In `create_ride_request` (bid_routes.py line 445), immediately after the concurrent-rides 429 check, if `customer.has_unpaid_balance` is True, raises `HTTPException(status_code=402, ...)` before any fare calculation happens.

## Verification

- Grep proof:
  - `models.py:654` — `has_unpaid_balance = Column(Boolean, default=False)` in Customer class
  - `bid_routes.py:3897-3900` — flag set in `check_capture_retry_job` exhaustion block
  - `bid_routes.py:445` — 402 guard in `create_ride_request`
  - Migration file: `upgrade()` adds column, `downgrade()` drops it, `down_revision = '20260318_payment_retry_count'`

- Logic trace:
  - Scheduler: `retry_count >= 3` → `customer_record.has_unpaid_balance = True` → `db.commit()`
  - Endpoint: `customer.has_unpaid_balance is True` → `raise HTTPException(status_code=402)`
  - Default `False` → all existing customers can still book (no regression)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `95533a5c` | feat(quick-198): add has_unpaid_balance to Customer model + Alembic migration |
| Task 2 | `f022b8e4` | feat(quick-198): set has_unpaid_balance flag on retry exhaustion + 402 guard at ride request |

## Deviations from Plan

**1. [Rule 1 - Bug] Corrected down_revision in migration**
- **Found during:** Task 1
- **Issue:** Plan specified `down_revision = '20260318_payment_retry_count'` and listed the latest migration as `20260318_payment_retry_count`. The actual newest file in alembic/versions was `20260318_add_unique_constraint_ride_bid.py` but its own `revision` value is `20260318_ride_bid_unique` and it is pointed to by `20260318_payment_retry_count` as its `down_revision`. So `20260318_payment_retry_count` is indeed the chain head — plan was correct.
- **Fix:** Initial draft used the filename instead of the revision ID; corrected to `20260318_payment_retry_count`.
- **Files modified:** `alembic/versions/20260318_add_unpaid_balance_customers.py`

## Self-Check: PASSED

- [x] `models.py` contains `has_unpaid_balance` at line 654
- [x] Migration file exists at `alembic/versions/20260318_add_unpaid_balance_customers.py`
- [x] `bid_routes.py` has flag-set at line ~3897 (check_capture_retry_job)
- [x] `bid_routes.py` has 402 guard at line 445 (create_ride_request)
- [x] Commits `95533a5c` and `f022b8e4` exist on main branch
- [x] `down_revision` points to correct chain head `20260318_payment_retry_count`
