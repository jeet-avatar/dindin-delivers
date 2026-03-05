---
phase: quick-95
plan: 01
subsystem: order-flow
tags: [address-validation, delivery, gap-15, safety]
dependency_graph:
  requires: []
  provides: [address-validation, address-unreachable-endpoint]
  affects: [order-creation, delivery-monitoring]
tech_stack:
  added: []
  patterns: [in-memory-tracking, background-job-extension]
key_files:
  created:
    - apps/web/p2p-platform/backend/tests/unit/test_address_validation.py
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py
decisions:
  - "In-memory dict _address_unreachable_orders for 5-min timer tracking (avoids DB migration since Order model has no delivery_notes column)"
  - "Store address-unreachable notes in existing delivery_instructions field for audit trail"
  - "Address-unreachable timeout check integrated into existing check_delivery_timeouts_job (60s interval)"
metrics:
  duration: 689s
  completed: 2026-03-05
  tasks: 2/2
  files: 4
---

# Quick Task 95: Address Validation + Address-Unreachable Endpoint

Address validation at order checkout with continental US bounds checking, plus driver address-unreachable reporting with 5-minute customer response window and auto-fail with refund.

## What Was Done

### Task 1: Address validation at checkout + address-unreachable endpoint (56c49af5)

1. **validate_delivery_address()** function in order_flow.py:
   - Validates lat in [24.0, 50.0], lng in [-125.0, -66.0] (continental US)
   - Supports both "latitude"/"longitude" and "lat"/"lng" key variants
   - Requires non-empty street (min 3 chars) and at least city or zip
   - Returns None if valid, raises HTTPException(422) if invalid
   - Skips validation for empty/None address (pickup orders)

2. **Wired into create_order()** at line 1259, after price change check, before tax calculation.

3. **POST /orders/{order_id}/address-unreachable** endpoint:
   - Requires driver auth + driver must be assigned to order
   - Order must be in OUT_FOR_DELIVERY status
   - Sends push notification to customer with 5-min warning
   - Stores notes in delivery_instructions field for audit trail
   - Tracks report time in `_address_unreachable_orders` in-memory dict
   - Returns success with expires_at timestamp

4. **5-minute timeout** in check_delivery_timeouts_job():
   - Checks all entries in `_address_unreachable_orders`
   - If 5 min elapsed and order still OUT_FOR_DELIVERY: sets DELIVERY_FAILED, triggers refund, notifies customer
   - Cleans up expired entries from tracking dict

5. **iOS alias** at `/erp/orders/{order_id}/address-unreachable` in main_new.py

### Task 2: Unit tests (aba4a254)

15 tests total:
- 11 validate_delivery_address unit tests (valid, missing lat, missing lng, bounds low/high, lng bounds, empty street, missing city+zip, city-only, zip-only, alt keys)
- 4 address-unreachable endpoint tests (success with push, wrong driver 403, wrong status 400, not found 404)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed existing test_order_flow tests missing lat/lng**
- **Found during:** Task 2 regression check
- **Issue:** test_create_order_success and test_create_order_with_items_not_in_menu had delivery_address without latitude/longitude, causing 422 after validation was wired in
- **Fix:** Added `"latitude": 37.7749, "longitude": -122.4194` to all 4 delivery_address test fixtures in test_order_flow.py
- **Files modified:** tests/unit/test_order_flow.py
- **Commit:** aba4a254

**2. [Rule 1 - Bug] Fixed OrderStatus.PENDING -> PENDING_PAYMENT in test**
- **Found during:** Task 2 initial test run
- **Issue:** Plan specified `OrderStatus.PENDING` but the actual enum uses `PENDING_PAYMENT`
- **Fix:** Changed to `OrderStatus.PENDING_PAYMENT` in test fixture
- **Commit:** aba4a254

## Test Results

- 15/15 new tests pass
- 1055/1055 total unit tests pass (0 regressions)

## Self-Check: PASSED
