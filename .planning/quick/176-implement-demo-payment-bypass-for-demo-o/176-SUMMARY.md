---
phase: quick-176
plan: 01
subsystem: backend/order_flow
tags: [demo, app-store-review, payment-bypass, order-flow]
dependency_graph:
  requires: []
  provides: [demo-payment-bypass]
  affects: [order_flow.py, order-creation-endpoint]
tech_stack:
  added: []
  patterns: [conditional-bypass, inline-constant]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
decisions:
  - Used inline constants (DEMO_CUSTOMER_EMAIL, DEMO_VENDOR_IDS) rather than env vars — demo bypass is intentionally hardcoded for App Store review, not a configuration concern
  - Inserted bypass BEFORE promo redemption tracking so promo logic still runs correctly for demo orders that also have promo codes
metrics:
  duration: 10 minutes
  completed: 2026-03-14
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-176 Plan 01: Demo Payment Bypass Summary

Demo payment bypass added to order_flow.py so App Store review orders from `demo.customer@dollor.ai` at vendor IDs 1, 40, or 134 skip Stripe and land directly in `PENDING_RESTAURANT`.

## What Was Built

A 6-line bypass block was inserted in `order_flow.py` immediately after `db.refresh(new_order)` (line 1393) and before the promo redemption tracking block. When the order email matches `demo.customer@dollor.ai` and the vendor ID is in `{1, 40, 134}`, the order is mutated in-place:

- `payment_status` set to `"succeeded"`
- `status` set to `OrderStatus.PENDING_RESTAURANT`
- `sent_to_restaurant_at` set to `datetime.now()`
- A second `db.commit()` + `db.refresh()` persists the state

Non-demo orders pass through unchanged.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add demo payment bypass after order creation | e52372e8 | order_flow.py (+14 lines) |

## Verification

- `grep -n "demo.customer@dollor.ai\|DEMO_VENDOR_IDS\|Demo payment bypass" order_flow.py` returns 5 matching lines confirming bypass is present
- 86 unit tests in `tests/unit/test_order_flow.py` pass with no regressions
- Pre-existing `test_payment_safety.py` SQLite lock errors (11 errors, 4 passed) are identical before and after the change — confirmed by running on original code via `git stash`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] `apps/web/p2p-platform/backend/order_flow.py` exists and contains bypass code
- [x] Commit `e52372e8` exists in git log
- [x] 86 order_flow unit tests pass
