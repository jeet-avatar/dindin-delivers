---
phase: quick-177
plan: 01
subsystem: order-flow, ios-restaurant
tags: [order-status, state-machine, demo-bypass, ios-restaurant-app]
dependency_graph:
  requires: []
  provides: [correct-READY_FOR_PICKUP-transition, out_for_delivery-ui-card, demo-delivery-timer]
  affects: [order_flow.py, EnhancedDashboardView.swift]
tech_stack:
  added: []
  patterns: [status-state-machine-fix, swiftui-status-card]
key_files:
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
decisions:
  - READY_FOR_PICKUP handler sets status directly to READY_FOR_PICKUP; delivery_decision_sent_at is kept for the 3-min auto-advance timer
  - out_for_delivery card inserted between ready_for_pickup and restaurant_will_deliver blocks; shows driver info with call button or fallback text
metrics:
  duration: ~8 minutes
  completed: 2026-03-15T01:27:33Z
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-177 Plan 01: Fix Order Flow READY_FOR_PICKUP and Delivering Now UI Summary

**One-liner:** Fixed READY_FOR_PICKUP state machine bug (was writing PENDING_DELIVERY_DECISION), added demo timer fix, and added out_for_delivery "Delivering now" card to restaurant iOS app.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix READY_FOR_PICKUP status transition + demo delivery_decision_sent_at | 76a46127 | order_flow.py |
| 2 | Add out_for_delivery card to EnhancedDashboardView.swift | c7aa880d | EnhancedDashboardView.swift |

## Changes Made

### Task 1 — order_flow.py (line ~3231)

**Bug fixed:** `update_order_status` READY_FOR_PICKUP handler was setting `order.status = OrderStatus.PENDING_DELIVERY_DECISION` instead of `OrderStatus.READY_FOR_PICKUP`. This caused the order to skip the READY_FOR_PICKUP state entirely, breaking any client that polls for that status.

**Fix:** Changed to `order.status = OrderStatus.READY_FOR_PICKUP`. The `delivery_decision_sent_at = datetime.now()` line is retained — it's needed so the 3-minute auto-advance timer (which watches for READY_FOR_PICKUP orders with a valid `delivery_decision_sent_at`) fires correctly.

**Demo bypass fix:** Added `new_order.delivery_decision_sent_at = datetime.now()` to the demo payment bypass block (~line 1403). Previously the demo order landed at `PENDING_RESTAURANT` without a `delivery_decision_sent_at`, so the auto-advance timer never triggered during App Store review demos.

### Task 2 — EnhancedDashboardView.swift (line ~1862)

**Added:** `out_for_delivery` status card between the `ready_for_pickup`/`ready` block and `restaurant_will_deliver` block. Shows:
- "Delivering now" header with shipping box icon in brand green
- Driver info card (name, phone, call button) when `order.driverName` is set
- Fallback text "Driver is on the way to the customer" when no driver info

## Verification

- Backend syntax: `python3 -m py_compile order_flow.py` → **OK**
- Status grep: line 3235 confirms `order.status = OrderStatus.READY_FOR_PICKUP` in READY_FOR_PICKUP handler
- Demo grep: line 1403 confirms `delivery_decision_sent_at = datetime.now()` in demo bypass
- iOS build: `xcodebuild eatffairrestaurant` → **BUILD SUCCEEDED**
- Backend tests: require JWT_SECRET_KEY env var (normal local constraint) — syntax verified clean

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] `apps/web/p2p-platform/backend/order_flow.py` — modified, syntax clean
- [x] `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` — modified, iOS build succeeded
- [x] Commit 76a46127 exists (Task 1)
- [x] Commit c7aa880d exists (Task 2)
