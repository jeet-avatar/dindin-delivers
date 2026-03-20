---
phase: quick-202
plan: 01
subsystem: rideshare-tracking
tags: [rideshare, driver, cancellation, acceptance-rate, alembic]
key-files:
  created:
    - apps/web/p2p-platform/backend/alembic/versions/20260320_add_driver_cancel_tracking.py
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/bid_routes.py
    - apps/web/p2p-platform/backend/main_new.py
decisions:
  - "or-0 guard on ride_accept_count/ride_cancel_count to handle NULL rows from pre-migration records"
  - "Default acceptance_rate of 95.0 when driver has fewer than 5 total rides (not enough data for meaningful rate)"
  - "Push failure wrapped in bare except so push warnings never block the cancel transaction"
  - "20%/30% cancel rate thresholds only apply when total >= 10 rides to avoid misleading new-driver rates"
  - "_acceptance_rate computed separately in each function (get_driver_dashboard vs get_driver_dashboard_v5) since they are independent code paths"
metrics:
  duration: ~20 min
  completed: 2026-03-19
  tasks: 3
  files: 4
---

# Phase quick-202: Driver Cancel Rate Tracking Summary

Real driver cancellation rate tracking via two DB counters on the Driver model — `ride_accept_count` incremented on bid accept, `ride_cancel_count` incremented on driver cancel, with push warnings at 20%/30% thresholds and live `acceptance_rate` computation replacing hardcoded 95.0/100 in both driver earnings endpoints.

## What Was Built

### Task 1: Alembic Migration
`20260320_add_driver_cancel_tracking.py`
- `revision = '20260320_driver_cancel_tracking'`
- `down_revision = '20260318_unpaid_balance'` — correct chain head verified before writing
- Adds `ride_accept_count INTEGER server_default='0'` and `ride_cancel_count INTEGER server_default='0'` to `drivers` table
- `nullable=True` in migration for existing rows; ORM uses `default=0`

### Task 2: Driver Model + bid_routes.py Counters + Push Warnings

**models.py (line 772-773):**
- `ride_accept_count = Column(Integer, default=0)` — rides accepted (matched)
- `ride_cancel_count = Column(Integer, default=0)` — rides cancelled after matching
- Inserted immediately after `total_deliveries` column

**bid_routes.py bid accept path (line 717-719):**
- Queries `accepting_driver` by `bid.driver_id`
- Increments `ride_accept_count` with or-0 guard before `db.commit()`

**bid_routes.py `driver_cancel_ride` function (line 2075-2108):**
- Queries `cancelling_driver` by `cancelled_driver_id`
- Increments `ride_cancel_count` with or-0 guard
- Computes `total = ride_accept_count + ride_cancel_count`
- If `total >= 10`: computes `cancel_rate = ride_cancel_count / total`
  - `>= 0.30`: sends "High cancellation rate" push with rate percentage
  - `>= 0.20`: sends "Cancellation reminder" push with counts
- Both push blocks wrapped in bare `except: pass` — push failure never blocks cancel transaction
- `db.commit()` executes after counters are updated (counters committed atomically with ride status changes)

### Task 3: main_new.py Real Acceptance Rate

**`get_driver_dashboard` (line 7694-7695, 7701):**
```python
_total_rides = (driver.ride_accept_count or 0) + (driver.ride_cancel_count or 0)
_acceptance_rate = round(((driver.ride_accept_count or 0) / _total_rides) * 100, 1) if _total_rides >= 5 else 95.0
```
- `today_stats["acceptance_rate"]` now uses `_acceptance_rate` (was hardcoded `100`)

**`get_driver_dashboard_v5` (line 7833-7834, 7850):**
- Same `_acceptance_rate` formula computed before the response dict
- Flat field `"acceptance_rate"` now uses `_acceptance_rate` (was hardcoded `95.0`)

## Verification Proof

### Grep proof — all 4 files

Migration chain:
```
11:down_revision = '20260318_unpaid_balance'
```

Models:
```
772:    ride_accept_count = Column(Integer, default=0)
773:    ride_cancel_count = Column(Integer, default=0)
```

bid_routes.py:
```
719:     accepting_driver.ride_accept_count = (accepting_driver.ride_accept_count or 0) + 1
2078:    cancelling_driver.ride_cancel_count = (cancelling_driver.ride_cancel_count or 0) + 1
2079:    total = (cancelling_driver.ride_accept_count or 0) + (cancelling_driver.ride_cancel_count or 0)
2081:    cancel_rate = cancelling_driver.ride_cancel_count / total
2089:    data={"type": "cancel_rate_warning", ...}
2101:    data={"type": "cancel_rate_warning", ...}
```

main_new.py:
```
7695:    _acceptance_rate = round(((driver.ride_accept_count or 0) / _total_rides) * 100, 1) if _total_rides >= 5 else 95.0
7701:        "acceptance_rate": _acceptance_rate
7834:        _acceptance_rate = round(((driver.ride_accept_count or 0) / _total_rides) * 100, 1) if _total_rides >= 5 else 95.0
7850:        "acceptance_rate": _acceptance_rate,  # Real acceptance rate from DB counters
```

### Syntax proof
```
SYNTAX OK: models.py
SYNTAX OK: bid_routes.py
SYNTAX OK: main_new.py
```
(verified via Python AST parse)

### Logic proof
```
total=10 (8 accept, 2 cancel): acceptance_rate=80.0
total=3 (< 5 rides): acceptance_rate=95.0 (default)
cancel_rate=30% (3/10): cancel_rate >= 0.30 = True
```

## Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| NULL columns (pre-migration rows) | `or 0` guard on every read |
| < 5 total rides | Default 95.0 (not enough data) |
| Push notification failure | Bare `except: pass` — never blocks cancel |
| < 10 total rides for warnings | Threshold check: `if total >= 10` |
| Zero-division in cancel_rate | Guarded by `total >= 10` check (total >= 10 means total != 0) |

## Commits

| Hash | Description |
|------|-------------|
| `586d3d03` | chore(quick-202): Alembic migration — add ride_accept_count + ride_cancel_count to drivers |
| `7d336c0e` | feat(quick-202): Driver model cancel tracking + bid_routes counter increments + push warnings |
| `6f9ba860` | feat(quick-202): Replace hardcoded acceptance_rate with real DB computation in driver earnings |

## Self-Check: PASSED

Files created/modified:
- [x] `apps/web/p2p-platform/backend/alembic/versions/20260320_add_driver_cancel_tracking.py` — FOUND
- [x] `apps/web/p2p-platform/backend/models.py` — ride_accept_count + ride_cancel_count at line 772-773
- [x] `apps/web/p2p-platform/backend/bid_routes.py` — accept increment line 719, cancel increment + push 2078-2108
- [x] `apps/web/p2p-platform/backend/main_new.py` — _acceptance_rate at 7694-7695 (dashboard) and 7833-7834 (v5)

Commits exist: 586d3d03, 7d336c0e, 6f9ba860 — all in git log.
