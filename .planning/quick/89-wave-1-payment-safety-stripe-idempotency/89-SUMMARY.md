---
phase: quick-89
plan: 89
subsystem: payments
tags: [stripe, idempotency, refund, price-validation, vendor-offline]
dependency-graph:
  requires: [GAP-1, GAP-2, GAP-5, GAP-6]
  provides: [stripe-idempotency, order-refund-endpoint, price-change-detection, vendor-offline-blocking]
  affects: [rideshare_payments, matchmaking_routes, stripe_integration, order_flow, bid_routes, main_new]
tech-stack:
  added: []
  patterns: [stripe-idempotency-keys, price-staleness-detection, vendor-lifecycle-order-management]
key-files:
  created:
    - apps/web/p2p-platform/backend/tests/unit/test_payment_safety.py
  modified:
    - apps/web/p2p-platform/backend/rideshare_payments.py
    - apps/web/p2p-platform/backend/matchmaking_routes.py
    - apps/web/p2p-platform/backend/stripe_integration.py
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/bid_routes.py
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/tests/unit/test_stripe_integration.py
decisions:
  - Use getattr(vendor, 'is_online', True) for backward compatibility with vendors missing the field
  - Idempotency keys use deterministic format (entity_type + IDs) not UUIDs for retry safety
  - Vendor offline check runs before price check (fail fast on closed restaurant)
metrics:
  duration: 697s
  completed: 2026-03-05
  tasks: 3/3
  tests-added: 15
  tests-total: 1346
  regressions: 0
---

# Quick Task 89: Wave 1 Payment Safety - Stripe Idempotency Summary

Stripe idempotency keys on all 8+ payment calls, refund endpoint, price staleness detection at checkout, vendor offline blocking with auto-cancel

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Stripe idempotency keys + refund endpoint | c4b4c7df | 8 idempotency keys across 6 files, POST /api/erp/orders/{id}/refund, payout failure status tracking |
| 2 | Price change detection + vendor offline | ae60d36c | 409 on stale prices, 400 on offline vendor, auto-cancel pending orders on go-offline |
| 3 | Unit tests for all 4 features | 903a43d0 | 15 tests covering all GAPs, full suite 1346 passed |

## What Was Built

### GAP-1: Stripe Idempotency Keys (8 calls)
- `rideshare_payments.py`: `ride_pi_{ride_id}_{request_id}` on PaymentIntent.create
- `matchmaking_routes.py`: `conn_fee_{request_id}_{bid_id}` on connection fee PaymentIntent.create
- `stripe_integration.py`: conditional `simple_pi_{order_id}_{timestamp}` on simple payment intent
- `order_flow.py`: `ride_driver_xfer_{ride_id}`, `vendor_xfer_{order_id}_{order_number}`, `driver_xfer_{order_id}_{order_number}` on Transfer.create
- `bid_routes.py`: `bid_driver_xfer_{ride_id}_{bid_id}` on Transfer.create
- `main_new.py`: `main_ride_xfer_{ride_id}_{request_id}` on Transfer.create, `main_pi_{order_id}_{timestamp}` on PaymentIntent.create
- `stripe_integration.py` already had `order_{id}_{number}` on line 313

### GAP-2: Payment Failure Rollback + Refund Endpoint
- Vendor payout failure sets `vendor_payout.status = "failed"` (non-blocking)
- Driver payout failure sets `driver_payout_record.status = "failed"` (non-blocking)
- New endpoint: `POST /api/erp/orders/{order_id}/refund`
  - Requires any auth (admin or customer)
  - Blocks refund on DELIVERED orders
  - Blocks double refund
  - Uses `stripe.Refund.create` with idempotency key `refund_{order_id}`
  - Sets payment_status="refunded" and status=CANCELLED

### GAP-5: Price Change Detection at Checkout
- Both `order_flow.py` and `stripe_integration.py` create_order functions validate expected_price
- Returns HTTP 409 with `{"message": "Menu prices have changed", "price_changes": [...]}`
- Each price_change includes: item name, expected price, current DB price
- Tolerance: 0.01 (1 cent) to handle floating point rounding
- Backward compatible: orders without expected_price field pass through normally

### GAP-6: Vendor Offline Blocking + Auto-Cancel
- Both create_order functions check `vendor.is_online` before processing
- Returns HTTP 400 "Restaurant is currently offline and not accepting orders"
- Vendor go-offline endpoint (`PUT /api/vendors/{id}/online-status?is_online=false`) auto-cancels:
  - Orders with status PENDING_PAYMENT, CONFIRMED, or PENDING_RESTAURANT
  - Calls `stripe.PaymentIntent.cancel()` for orders with payment intents (non-blocking)
  - Returns `auto_cancelled_orders` count in response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stray syntax error in order_flow.py**
- **Found during:** Task 3 test run
- **Issue:** Extra `}` at end of file from append edit
- **Fix:** Removed stray closing brace
- **Commit:** 903a43d0

**2. [Rule 1 - Bug] Existing test_stripe_integration fixture missing is_online**
- **Found during:** Task 3 full suite regression
- **Issue:** mock_vendor fixture created vendor without is_online=True, failing due to new offline check
- **Fix:** Added `is_online=True` to mock_vendor fixture
- **Commit:** 903a43d0

## Verification

- `grep -c "idempotency_key"` across 6 payment files: all have at least 1
- 15/15 new unit tests pass
- 1346/1346 full suite tests pass (0 regressions)
- Refund endpoint confirmed at `POST /api/erp/orders/{order_id}/refund`
