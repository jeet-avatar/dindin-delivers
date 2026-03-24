---
phase: quick-208
plan: 03
subsystem: ios-restaurant
tags: [ios, restaurant, order-acceptance, countdown-timer, bug-fix, gap-1, gap-3]
dependency_graph:
  requires:
    - 208-01 (audit board)
    - 208-02 (backend gap fixes)
  provides:
    - GAP-1 closed: acceptOrder() now hits restaurant-accept endpoint
    - GAP-3 closed: countdown timer uses sent_to_restaurant_at
  affects:
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
    - apps/web/p2p-platform/backend/order_flow.py
tech_stack:
  added: []
  patterns:
    - ISO8601DateFormatter with dual formatOptions fallback (withFractionalSeconds + without)
    - Delegate pattern: acceptOrder() calls acceptRestaurantOrder() for single responsibility
key_files:
  created: []
  modified:
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
    - apps/web/p2p-platform/backend/order_flow.py
decisions:
  - "Delegate acceptOrder() to acceptRestaurantOrder() rather than replacing it — avoids duplicate code and ensures single call path"
  - "Added sentAt to shared Order model (not just P2PVendorOrder) so countdown timer works via the toOrder() conversion path"
  - "ISO 8601 parser uses dual formatOptions fallback matching existing toOrder() pattern at P2PAPIService.swift:10936-10942"
  - "Kept placedAt fallback in calculateRemainingSeconds() for backward compatibility when sentAt is nil"
metrics:
  duration: "~20 minutes"
  completed: "2026-03-24"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase quick-208 Plan 03: iOS Restaurant Gap Fixes — GAP-1 and GAP-3

One-liner: Fixed acceptOrder() to hit the restaurant-accept endpoint (KOT + driver notification) and countdown timer to use sent_to_restaurant_at instead of placed_at.

## What Was Built

### Task 1 — GAP-1: Fixed acceptOrder() endpoint (OrdersViewModel.swift)

**Bug:** `acceptOrder()` at line 273 called `updateOrderStatus(order, "PREPARING")` which hits `PUT /erp/orders/{id}/status?status=PREPARING`. This bypassed the proper restaurant-accept endpoint entirely.

**Impact of bug:**
- KOT (Kitchen Order Ticket) print to POS was never triggered
- Nearby driver early-notification was never sent
- `restaurant_accepted_at` timestamp was never set on the order
- 3-minute acceptance window validation was bypassed

**Fix:** Replaced the body of `acceptOrder()` to delegate to the already-correct `acceptRestaurantOrder()` method which calls `p2pAPI.restaurantAcceptOrder()` hitting `POST /erp/orders/{id}/restaurant-accept`.

The `acceptRestaurantOrder()` method already existed at line 320 with proper error handling for window-expired messages.

### Task 2 — GAP-3: Countdown timer uses sent_to_restaurant_at (multiple files)

**Bug:** `calculateRemainingSeconds()` in `EnhancedDashboardView.swift:443` calculated remaining time from `order.placedAt` (when the customer placed the order). The backend 3-minute acceptance window starts from `sent_to_restaurant_at` (when payment is captured and the order is pushed to the restaurant). There can be seconds to minutes between these two events.

**Impact of bug:** Visual countdown could show "1:30 remaining" while the backend window had already expired, or overstated remaining time.

**Changes made across 4 files:**

- **Backend (`order_flow.py:3261`):** Added `sent_at` field from `sent_to_restaurant_at` to `get_vendor_orders` response
- **P2PVendorOrder (`P2PAPIService.swift:10878`):** Added `sentAt: String?` field with CodingKey `sent_at`
- **Shared Order model (`Order.swift:384`):** Added `sentAt: String?` field, CodingKey, decoder, init param, default init
- **`toOrder()` (`P2PAPIService.swift:11056`):** Passes `sentAt: sentAt` through to `Order` init
- **`calculateRemainingSeconds()` (`EnhancedDashboardView.swift:443`):** Prefers `order.sentAt` over `order.placedAt`, falls back to `placedAt` when nil

## Verification

```
GAP-1:
- grep "updateOrderStatus.*PREPARING" OrdersViewModel.swift → 1 match (comment only, not code)
- grep "restaurantAcceptOrder" OrdersViewModel.swift → line 335 inside acceptRestaurantOrder body

GAP-3:
- grep "sentAt" P2PAPIService.swift → 10878 (field), 10909 (CodingKey), 11056 (toOrder)
- grep "sentAt" Order.swift → 384 (field), 406 (CodingKey), 490 (decode), 493 (init), 545, 590
- grep "sentAt" EnhancedDashboardView.swift → 448, 451, 457, 462 (in calculateRemainingSeconds)
- Backend: "sent_at" at order_flow.py:3261 in get_vendor_orders response

Build:
- xcodebuild restaurant xcworkspace → BUILD SUCCEEDED (no errors)
```

## Commits

| Hash | Task | Description |
|------|------|-------------|
| `3f681879` | Task 1 (GAP-1) | fix acceptOrder() to call restaurant-accept endpoint |
| `467f9e4a` | Task 2 (GAP-3) | add sentAt to vendor orders and fix countdown timer |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Commits verified:
- FOUND: 3f681879 in git log (GAP-1 fix)
- FOUND: 467f9e4a in git log (GAP-3 fix)
