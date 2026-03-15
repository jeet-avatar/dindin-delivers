---
created: 2026-03-15T00:00:00Z
title: "F2: Prevent double payout on order delivery + ride completion"
area: security/financial
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/order_flow.py:3868
---

## Problem

`order_delivered()` creates vendor + driver payout records every time it's called. No check for `order.delivered_at is not None`. Called twice = double payout in database. Stripe idempotency key prevents duplicate transfer but DB records are duplicated.

Same issue exists for `complete_delivery()` and ride `completed()`.

## Solution

1. Add early return: `if order.delivered_at is not None: return {"already_delivered": True}`
2. Check if payout exists: `if db.query(VendorPayout).filter(VendorPayout.order_id == order.id).first(): return`
3. Apply same pattern to ride completion endpoint
