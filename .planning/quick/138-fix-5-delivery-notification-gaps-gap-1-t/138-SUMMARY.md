---
phase: quick-138
plan: 01
subsystem: notifications, delivery-flow
tags: [push-notifications, self-delivery, android-partner, ios-restaurant, backend]
dependency_graph:
  requires: []
  provides: [delivery-notification-gaps-fixed, vendor-arrived-endpoint]
  affects: [order_flow.py, main_new.py, P2PAPIService.swift, OrdersViewModel.swift, EnhancedDashboardView.swift, DollorApiService.kt, DollorRepository.kt, OrdersViewModel.kt, OrdersScreen.kt]
tech_stack:
  added: []
  patterns: [push-notification-at-lifecycle-transitions, self-delivery-arrival-endpoint]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
decisions:
  - Show "I've Arrived at Customer" button for ALL out-for-delivery orders in Partner app; backend validates self-delivery flag and returns 400 for non-self-delivery orders
metrics:
  duration: 464s
  completed: 2026-03-10
---

# Quick Task 138: Fix 5 Delivery Notification Gaps Summary

Customer push notifications at every delivery lifecycle stage, plus vendor "I've Arrived at Customer" button on iOS and Android Partner apps for self-delivery orders.

## What Was Done

### GAP-1: Customer push on payment confirmed
- `order_flow.py:1506-1525`: After `db.commit()` in `confirm_payment()`, sends "Order Placed!" push to customer with order details

### GAP-2: Customer push on food ready
- `order_flow.py:3177`: Sends "Your food is ready!" push when order transitions to READY_FOR_PICKUP

### GAP-3: Customer push on out for delivery
- `order_flow.py:3216`: Sends "Out for delivery!" push in `update_order_status()` after db.commit
- `main_new.py:8842`: Same push in the main_new.py out-for-delivery handler

### GAP-4: Self-delivery vs driver arrival messaging
- `order_flow.py:4662`: Arrival notification checks `restaurant_will_deliver` flag to differentiate messaging ("The restaurant is at your door" vs "Your driver has arrived")

### GAP-5: Vendor arrived-at-delivery endpoint + UI
- `order_flow.py:4693`: `POST /api/erp/orders/{id}/vendor-arrived-at-delivery` endpoint
- iOS: `P2PAPIService.markArrivedAtDelivery()`, `OrdersViewModel.markArrivedAtDelivery()`, `EnhancedDashboardView` "I've Arrived at Customer" button
- Android: `DollorApiService.vendorArrivedAtDelivery()`, `DollorRepository.vendorArrivedAtDelivery()`, `OrdersViewModel.vendorArrivedAtDelivery()`, `OrdersScreen` orange "I've Arrived at Customer" button with LocationOn icon

### Test Fix
- `test_order_flow.py:test_confirm_payment_success`: Updated mock to handle new Vendor/Customer queries from GAP-1 code, patched `send_push_notification`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test_confirm_payment_success mock**
- **Found during:** Task 1
- **Issue:** GAP-1 added `db.query(Vendor)` and `db.query(Customer)` calls in `confirm_payment()`, but the test mock returned `mock_order` for all queries, causing `AttributeError: Mock object has no attribute 'restaurant_name'`
- **Fix:** Replaced single mock chain with `query_side_effect` that returns correct mock objects per model type; patched `send_push_notification`
- **Files modified:** `tests/unit/test_order_flow.py`
- **Commit:** 7d808b60

## Commits

| # | Hash | Message | Repo |
|---|------|---------|------|
| 1 | `7d808b60` | feat(quick-138): [CR-0011] fix 5 delivery notification gaps (GAP-1 through GAP-5) | doordash-p2p |
| 2 | `08c8cad3` | feat(quick-138): [CR-0011] Android Partner "I've Arrived at Customer" button (GAP-5) | eatfair-android |

## CR Ticket

- **CR-0011**: Fix 5 delivery notification gaps (GAP-1 through GAP-5)
- **Status**: Under Review

## Self-Check: PASSED

All files exist, both commits verified in respective repos.

## Verification

- Backend: 1014 passed, 0 failed (1 pre-existing flaky skipped), 11 skipped
- Android Partner: `assembleDebug` BUILD SUCCESSFUL
- `vendorArrivedAtDelivery` confirmed in 4 Android files
- `vendor-arrived-at-delivery` confirmed in order_flow.py
- "I've Arrived at Customer" confirmed in OrdersScreen.kt
