---
created: 2026-03-15T00:00:00Z
title: "F1: Driver payout — validate available earnings before Stripe transfer"
area: security/financial
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/main_new.py:5786
---

## Problem

`request_driver_payout()` at main_new.py:5786 allows drivers to request ANY amount up to $10,000 without checking actual earnings. A driver with $0 in earnings can request a $10,000 payout.

Only checks: amount > 0, amount ≤ $10,000, driver has Stripe account.
Missing: Check against actual available earnings in database.

## Solution

1. Query sum of completed ride/delivery earnings for driver
2. Subtract already-processed payouts
3. Validate requested amount ≤ available balance
4. Add audit log with driver ID, amount, available balance
