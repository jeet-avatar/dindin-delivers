---
phase: quick-142
plan: 01
subsystem: backend/order_flow
tags: [vendor-orders, api, order-status, payment]
dependency_graph:
  requires: []
  provides: [payment_status and delivery_decision_sent_at in GET /api/vendors/{id}/orders]
  affects: [iOS restaurant app, Android partner app]
tech_stack:
  added: []
  patterns: [defensive getattr fallback for optional model fields]
key_files:
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
decisions:
  - payment_status is Column(String) not Enum — no .value call needed; use getattr directly
  - delivery_decision_sent_at uses same isoformat + Z pattern as other timestamps in the block
metrics:
  duration: ~5 minutes
  completed: 2026-03-15
  tasks_completed: 1
  files_modified: 1
---

# Quick-142: Add payment_status and delivery_decision_sent_at to vendor orders response

**One-liner:** Exposed two existing Order model fields (plain string payment_status, DateTime delivery_decision_sent_at) in the GET /api/vendors/{id}/orders result dict so iOS/Android restaurant apps receive payment and delivery-decision state.

## What Was Done

Added two fields to the `result.append({...})` dict in `get_vendor_orders` (order_flow.py ~line 3191):

```python
"payment_status": getattr(order, 'payment_status', None),
"delivery_decision_sent_at": (order.delivery_decision_sent_at.isoformat() + "Z") if getattr(order, 'delivery_decision_sent_at', None) else None,
```

Both fields use the defensive `getattr` fallback pattern already established in the same block (e.g., `driver_en_route`, `picked_up_at`, `estimated_ready_at`).

## Field Type Verification

- `payment_status`: `Column(String(50), default="pending")` at models.py:455 — plain string, values: pending/processing/succeeded/failed/refunded
- `delivery_decision_sent_at`: `Column(DateTime)` at models.py:486 — datetime, serialized as ISO-8601 + Z suffix

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1: Add payment_status and delivery_decision_sent_at | 048f2043 | order_flow.py |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `order_flow.py` modified and committed: 048f2043
- Both fields present in result.append() block at lines 3191-3192
- Syntax check passed: `python -c "import ast; ast.parse(...); print('OK')"` returned Syntax OK
