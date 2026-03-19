---
phase: quick-192
plan: 01
subsystem: backend-payments
tags: [stripe-connect, driver-payout, rideshare, bug-fix]
key-files:
  modified:
    - apps/web/p2p-platform/backend/bid_routes.py
decisions:
  - "Used ride_request.id as sole idempotency key component — it is already unique and deterministic per ride"
  - "Indented post-transfer assignment (stripe_transfer_id, driver_paid_at, push notification) inside if payout_cents > 0 block to prevent UnboundLocalError on transfer variable"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-18"
  tasks_completed: 2
  files_modified: 1
---

# Phase quick-192 Plan 01: Fix Driver Auto-Payout Bugs in complete_ride — Summary

**One-liner:** Fixed 3 silent bugs in Stripe Connect auto-payout block — NameError on bid variable, duplicate-transfer guard, and A4A $0.05 deduction — enabling real driver payouts on ride completion.

## What Was Fixed

Three bugs in `apps/web/p2p-platform/backend/bid_routes.py` inside the `complete_ride` handler that silently prevented Stripe Connect transfers from ever executing:

### Bug 1 — NameError on undefined `bid` variable (line 2324, pre-fix)

The idempotency key used `bid.id if hasattr(bid, 'id') else ride_request.matched_bid_id`. The variable `bid` was never in scope inside `complete_ride` — it is only in scope in `accept_bid`. The entire try/except block swallowed the resulting `NameError` silently. Every ride completion resulted in $0 paid to the driver.

**Fix (line 2329):** Changed to `idempotency_key=f"ride_xfer_{ride_request.id}"` — deterministic, safe to retry, no external variable dependency.

### Bug 2 — No idempotency guard before Transfer.create (pre-fix)

The code had no check for an existing `stripe_transfer_id` before calling `stripe.Transfer.create`. Retrying a completed ride endpoint could create a second transfer.

**Fix (lines 2312-2314):** Added guard before the `payout_cents` computation:
```python
if ride_request.stripe_transfer_id:
    logger.info(f"Ride {ride_request.id} transfer already exists ({ride_request.stripe_transfer_id}), skipping")
else:
    # payout_cents block...
```

### Bug 3 — A4A fee not deducted from driver_payout (line 2267, pre-fix)

`driver_payout` was stored as `fare - platform_fee` but per `rideshare_payments.py` Model A spec, the driver also pays the $0.05 Access for All fee.

**Fix (lines 2267-2268):**
```python
driver_a4a_share = 0.05  # TNC-13: driver's share of Access for All fee
ride_request.driver_payout = round(final_price - platform_fee - driver_a4a_share, 2)
```

## Verification Output

### Grep Proof

```
2267:    driver_a4a_share = 0.05  # TNC-13: driver's share of Access for All fee
2268:    ride_request.driver_payout = round(final_price - platform_fee - driver_a4a_share, 2)
2312:                if ride_request.stripe_transfer_id:
2313:                    logger.info(f"Ride {ride_request.id} transfer already exists ({ride_request.stripe_transfer_id}), skipping")
2329:                            idempotency_key=f"ride_xfer_{ride_request.id}"
2331:                        ride_request.stripe_transfer_id = transfer.id
```

### Syntax Check

```
python -m py_compile bid_routes.py → SYNTAX OK
```

### bid.id Near Transfer Block

```
grep -n "bid\.id" bid_routes.py | grep -i "xfer|transfer|payout" → NO HITS
```

### CI/CD

- **Staging deploy**: Run `23272880266` — all 4 jobs green (Tests, ECS Deploy, Frontend, Summary)
- **Production deploy**: Run `23272879677` — all 4 jobs green (Tests, Frontend CloudFront, Backend ECS, Notify)

### Production Health

```
curl https://api.dollor.ai/health
→ {"status":"healthy","service":"p2p-backend","version":"1.0.18","database":"connected"}
```

## Commit

- `7cd4acec` — fix(quick-192): fix 3 auto-payout bugs in complete_ride — NameError bid.id, idempotency guard, A4A deduction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed post-transfer indentation**
- **Found during:** Task 1
- **Issue:** After adding the idempotency guard `else:` branch, `ride_request.stripe_transfer_id = transfer.id`, `driver_paid_at`, and the push notification block were left at the old indentation level (inside `if payout_cents > 0:` else branch), which would cause an `UnboundLocalError` on `transfer` variable if payout_cents were 0.
- **Fix:** Re-indented all post-transfer lines to be inside the `if payout_cents > 0:` block.
- **Files modified:** `apps/web/p2p-platform/backend/bid_routes.py`
- **Commit:** `7cd4acec`

## Self-Check: PASSED

- [x] `apps/web/p2p-platform/backend/bid_routes.py` — modified, exists
- [x] Commit `7cd4acec` — verified via `git log`
- [x] CI/CD run `23272879677` production — all jobs green
- [x] `grep ride_xfer_` returns line 2329
- [x] `grep driver_a4a_share` returns lines 2267-2268
- [x] `grep stripe_transfer_id` returns idempotency guard at line 2312
