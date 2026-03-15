---
created: 2026-03-15T00:00:00Z
title: "F3: Prevent tip manipulation — idempotency + status check"
area: security/financial
severity: HIGH
files:
  - apps/web/p2p-platform/backend/main_new.py:16014
---

## Problem

`POST /api/orders/{order_id}/tip-driver` can be called multiple times, accumulating tips. No check if order is already delivered. No idempotency. Tip amount is added to total_amount which creates accounting mismatch with Stripe.

## Solution

1. Only allow tip before order is marked delivered (or within 30 min window after delivery)
2. Replace tip instead of accumulating: `order.tip = tip_amount` not `order.tip += tip_amount`
3. Validate tip ≤ order subtotal (prevent $500 tip on $5 order)
4. Add idempotency: store last tip submission timestamp, reject if < 60 seconds
