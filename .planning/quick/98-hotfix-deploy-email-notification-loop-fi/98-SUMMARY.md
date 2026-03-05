---
phase: quick-98
status: complete
date: 2026-03-05
commits: ["0ac64022"]
deploy_run: 22715920830
---

# Quick-98: HOTFIX — Email Notification Loop Fix

## Issue
User reported non-stop duplicate emails for order DOLL2026229. Emails flooding inbox continuously.

## Root Cause (3 compounding issues)

1. **Multi-worker scheduler duplication** — `BackgroundScheduler` started in every uvicorn worker (4 workers x 2 ECS instances = 8 copies). All background jobs ran 8x per interval. In-memory dedup sets were per-process, providing no cross-process protection.

2. **Dedup set cleanup bug** — `_reassigned_orders.intersection_update(still_waiting_ids)` cleared the entire dedup set whenever reassigned orders changed status, stripping dedup protection and enabling repeated emails.

3. **No Stripe webhook idempotency** — Webhook handler processed every `payment_intent.succeeded` event without checking if `stripe_event_id` was already processed.

## Fix Applied (commit `0ac64022`)
- File-lock scheduler guard (`fcntl.LOCK_EX | LOCK_NB`) — only 1 worker per container runs background jobs
- Fixed dedup cleanup: `difference_update(terminal_orders)` instead of `intersection_update`
- Added `_delivery_failed_orders` dedup set for 120-minute timeout
- Added `stripe_event_id` duplicate check in webhook handler

## Files Changed
- `apps/web/p2p-platform/backend/order_flow.py` — scheduler lock, dedup set fixes
- `apps/web/p2p-platform/backend/stripe_integration.py` — webhook idempotency

## Deploy
- Production run: `22715920830` — all jobs passed
- Health check: 200, all endpoints responding
- 1062/1062 unit tests passing

## Verification
- Production `/health` returns 200
- `/api/orders/place`, `/api/rides/request`, `/api/orders/999/refund` all return 401 (expected)
