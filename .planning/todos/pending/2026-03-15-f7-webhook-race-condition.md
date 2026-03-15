---
created: 2026-03-15T00:00:00Z
title: "F7: Stripe webhook race condition — use DB unique constraint"
area: security/financial
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/stripe_integration.py:385
---

## Problem

Webhook idempotency check has a race condition window between SELECT and INSERT. Two simultaneous webhook deliveries could both pass the check and process the same event twice.

## Solution

1. Add unique constraint on `stripe_event_id` column in StripePaymentLog
2. Wrap log creation in try/except IntegrityError
3. If IntegrityError → return "already_processed"
