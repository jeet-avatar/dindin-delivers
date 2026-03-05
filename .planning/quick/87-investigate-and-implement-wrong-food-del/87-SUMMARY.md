---
phase: quick-87
plan: 1
subsystem: backend-food-disputes
tags: [food-delivery, disputes, refunds, stripe, api]
dependency_graph:
  requires: [Order model, DisputeStatus enum, Stripe integration]
  provides: [OrderDispute model, food dispute endpoints, order_disputes table]
  affects: [main_new.py, models.py]
tech_stack:
  added: [OrderDispute ORM model, OrderDisputeReason enum]
  patterns: [mirrors RideDispute pattern from bid_routes.py]
key_files:
  created:
    - apps/web/p2p-platform/backend/tests/test_order_disputes.py
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/main_new.py
decisions:
  - Reused existing DisputeStatus enum (shared with RideDispute) -- same lifecycle states
  - Created separate OrderDisputeReason enum (food-specific: WRONG_ITEMS, MISSING_ITEMS, QUALITY_ISSUE, NEVER_DELIVERED, OTHER)
  - Added affected_items JSON field for partial refund granularity
  - Endpoints placed in main_new.py (food order section) not bid_routes.py (rideshare only)
  - Added partial_refund as third resolution type beyond the rideshare refund/no_refund binary
metrics:
  duration: 6m 25s
  completed: 2026-03-05
  tasks: 3/3
  tests: 11 new, 1331 total passing
  files_changed: 3
---

# Quick Task 87: Food Order Dispute System Summary

Food order dispute flow with OrderDispute model, 4 REST endpoints, Stripe refund integration, and 11 unit tests -- mirrors rideshare dispute pattern with food-specific enhancements (affected_items, partial refunds).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add OrderDispute model and DB table creation | `be84828d` | models.py, main_new.py |
| 2 | Implement food order dispute endpoints | `3a3e7497` | main_new.py |
| 3 | Add unit tests for food order dispute flow | `5247b1d5` | tests/test_order_disputes.py |

## What Was Built

### OrderDispute Model (models.py:1796)
- `OrderDisputeReason` enum: WRONG_ITEMS, MISSING_ITEMS, QUALITY_ISSUE, NEVER_DELIVERED, OTHER
- `OrderDispute` model with: order_id, customer_id, reason, description, affected_items (JSON), status (reuses DisputeStatus), refund_amount, stripe_refund_id, admin_notes, resolved_at, timestamps
- Table creation SQL with indexes on order_id and customer_id

### Endpoints (main_new.py:15010-15250)
1. **POST /api/orders/{order_id}/dispute** -- Customer creates dispute (delivered orders only, ownership check, duplicate prevention)
2. **GET /api/orders/{order_id}/dispute** -- Get dispute status (owner or admin, admin_notes hidden from customers)
3. **GET /api/orders/customer/{customer_id}/disputes** -- List all customer disputes (ownership check)
4. **POST /api/orders/dispute/{dispute_id}/resolve** -- Admin resolves with refund/partial_refund/no_refund (Stripe integration, push notification)

### Tests (tests/test_order_disputes.py)
11 tests covering: create success, not-delivered block, not-owner rejection, duplicate prevention, invalid reason, get status, list disputes, full refund, partial refund, no refund, non-admin rejection.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- Models import OK: `from models import OrderDispute, OrderDisputeReason` succeeds
- All 4 routes registered in FastAPI app
- 11/11 dispute tests pass
- 1331/1331 full suite tests pass (0 regressions)

## Self-Check: PASSED
