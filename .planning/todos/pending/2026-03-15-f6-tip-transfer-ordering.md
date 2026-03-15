---
created: 2026-03-15T00:00:00Z
title: "F6: Fix tip transfer ordering — attempt Stripe transfer before saving"
area: security/financial
severity: HIGH
files:
  - apps/web/p2p-platform/backend/main_new.py:16819
---

## Problem

Tip is saved to database BEFORE Stripe transfer is attempted. If transfer fails, tip shows in DB but driver never receives it. Creates accounting mismatch.

## Solution

1. Attempt Stripe transfer FIRST
2. Only save tip to database if transfer succeeds
3. If transfer fails, return error to customer with retry option
4. Add "tip_transfer_status" field: pending/transferred/failed
