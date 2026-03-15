---
created: 2026-03-15T00:00:00Z
title: "F5: Refund endpoint — add audit logging + already-refunded check"
area: security/financial
severity: HIGH
files:
  - apps/web/p2p-platform/backend/order_flow.py:5993
---

## Problem

Refund endpoint has no check if order was already refunded. No audit log with admin identity. No rate limiting on refund requests.

## Solution

1. Check `order.payment_status == "refunded"` → return early
2. Log refund with admin user ID
3. Add rate limiting (5 refunds per hour per admin)
4. Mark order as refunded after successful Stripe refund
