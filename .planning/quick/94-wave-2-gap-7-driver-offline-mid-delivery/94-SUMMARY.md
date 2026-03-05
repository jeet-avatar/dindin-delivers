---
phase: quick-94
plan: 01
subsystem: backend/order-flow
tags: [delivery, safety-net, background-job, driver-management]
dependency_graph:
  requires: [order_flow.py, main_new.py, models.py]
  provides: [reassign_delivery, check_stale_driver_reassignment_job, POST /api/deliveries/{order_id}/reassign]
  affects: [_VALID_ORDER_TRANSITIONS, APScheduler job list]
tech_stack:
  added: []
  patterns: [in-memory dedup set, APScheduler interval job, send_push_notification sync call]
key_files:
  created:
    - apps/web/p2p-platform/backend/tests/unit/test_stale_driver_reassignment.py
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/main_new.py
decisions:
  - Same in-memory dedup set pattern as _delivery_warned_orders for preventing duplicate reassignment notifications
  - Dedup set self-cleans by removing IDs for orders no longer in READY_FOR_PICKUP
  - require_any_auth for admin endpoint (not require_admin) matching existing delivery endpoint patterns
metrics:
  duration: 327s
  completed: 2026-03-05
  tasks: 2/2
  tests: 8 new + 85 existing (0 regressions)
---

# Quick Task 94: Stale Driver Detection and Auto-Reassignment Summary

Background job detects OUT_FOR_DELIVERY orders with driver GPS stale >10 minutes, auto-reassigns to driver pool with customer/driver push notifications and support email.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `7099c15a` | Stale driver detection job + reassignment helper + admin endpoint + status transition |
| 2 | `3da0f7d2` | 8 unit tests for stale detection, reassignment, dedup, and endpoint validation |

## What Was Built

### reassign_delivery() Helper (order_flow.py)
- Clears driver_id, driver_name, driver_en_route, driver_accepted_at, picked_up_at
- Resets order status to READY_FOR_PICKUP (back to driver pool)
- Sends push notification to customer ("Your driver went offline. We're finding a new driver.")
- Sends push notification to original driver ("Your delivery has been reassigned due to inactivity.")
- Emails support@dollor.ai with order number, driver name, and reason
- Returns dict with success, order_id, original_driver_id

### check_stale_driver_reassignment_job() Background Job (order_flow.py)
- Runs every 60 seconds via APScheduler
- Queries OUT_FOR_DELIVERY orders with non-null driver_id
- Checks Driver.location_updated_at against 10-minute cutoff
- location_updated_at == None also treated as stale (never updated)
- In-memory _reassigned_orders set prevents duplicate processing
- Self-cleaning: removes IDs for orders no longer in READY_FOR_PICKUP

### POST /api/deliveries/{order_id}/reassign Endpoint (main_new.py)
- Manual reassignment for admin/system use
- Validates order exists, is OUT_FOR_DELIVERY, has assigned driver
- Uses reassign_delivery() helper for consistent behavior
- Protected by require_any_auth

### Status Transition Update (main_new.py)
- Added READY_FOR_PICKUP to _VALID_ORDER_TRANSITIONS["OUT_FOR_DELIVERY"]
- Allows OUT_FOR_DELIVERY -> READY_FOR_PICKUP transition for reassignment

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

8/8 new tests passing:
- test_reassign_delivery_clears_driver_fields
- test_reassign_delivery_sends_customer_notification
- test_reassign_delivery_sends_driver_notification
- test_stale_driver_detection_triggers_reassignment
- test_fresh_driver_location_not_reassigned
- test_stale_driver_no_location_ever
- test_dedup_prevents_double_reassignment
- test_reassign_endpoint_rejects_wrong_status

85/85 existing test_order_flow.py tests pass (0 regressions).
