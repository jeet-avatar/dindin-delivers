---
created: 2026-03-15T00:00:00Z
title: "F4: Vendor payout sync idempotency — prevent duplicate payouts"
area: security/financial
severity: HIGH
files:
  - apps/web/p2p-platform/backend/stripe_integration.py:634
---

## Problem

`sync_vendor_payouts()` can be called multiple times for the same period, creating duplicate payout records. No check for existing payouts in the same period.

## Solution

1. Check for existing payout: `if db.query(VendorPayout).filter(vendor_id, period_start, period_end).first(): skip`
2. Or: add unique constraint on (vendor_id, period_start, period_end)
3. Return list of already-processed vendors vs newly-processed
