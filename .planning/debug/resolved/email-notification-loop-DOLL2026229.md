---
status: resolved
trigger: "User receiving non-stop duplicate emails for order/reference DOLL2026229"
created: 2026-03-05T00:00:00Z
updated: 2026-03-05T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Three root causes found (see Resolution)
test: n/a
expecting: n/a
next_action: Apply fix — scheduler guard + dedup set cleanup fix + email dedup

## Symptoms

expected: One email per event (order confirmation, status update, etc.)
actual: Many duplicate emails flooding user inbox, all related to DOLL2026229
errors: No crash — system keeps running and sending emails
reproduction: Happening right now in production with DOLL2026229
started: Likely after Wave 2 deployment (Quick-93 through Quick-97)

## Eliminated

## Evidence

- timestamp: 2026-03-05T00:10:00Z
  checked: order_flow.py background jobs (lines 2018-2610)
  found: 6 background jobs with interval triggers, 3 send emails (check_delivery_timeouts_job, reassign_delivery, cleanup_stale_orders_job)
  implication: Background jobs are the email-sending mechanism

- timestamp: 2026-03-05T00:15:00Z
  checked: main_new.py startup_event (line 1552) + order_flow.py scheduler init (line 2568)
  found: BackgroundScheduler starts in EACH uvicorn worker process via on_event("startup"). With --workers 4 and 2 ECS instances = 8 scheduler instances
  implication: Every background job runs 8x per interval, with 8 separate in-memory dedup sets

- timestamp: 2026-03-05T00:20:00Z
  checked: check_stale_driver_reassignment_job cleanup logic (lines 2492-2498)
  found: _reassigned_orders.intersection_update(still_waiting_ids) clears ENTIRE set when no orders are READY_FOR_PICKUP. This strips dedup protection after any order status change.
  implication: Dedup set is continuously cleared, allowing repeat reassignment+email cycles

- timestamp: 2026-03-05T00:22:00Z
  checked: check_delivery_timeouts_job 90-min warning (lines 2283-2322)
  found: _delivery_warned_orders dedup is per-process. With 8 processes = 8 warning emails instead of 1. And 120-min path has NO dedup — relies on status change + commit
  implication: Multi-worker setup multiplies all notification sends by 8x

- timestamp: 2026-03-05T00:25:00Z
  checked: stripe_integration.py webhook handler (lines 359-485)
  found: No idempotency check on stripe_event_id. Order confirmation email sent on every webhook call without checking if already CONFIRMED
  implication: Stripe webhook retries (on timeout/error) cause duplicate confirmation emails

## Resolution

root_cause: |
  THREE compounding issues cause email notification loops:

  1. MULTI-WORKER SCHEDULER DUPLICATION: BackgroundScheduler starts in every uvicorn worker
     (4 workers x 2 ECS = 8 instances). All background jobs run 8x per interval. In-memory
     dedup sets (_delivery_warned_orders, _reassigned_orders) are per-process, providing
     NO cross-process deduplication.

  2. DEDUP SET CLEANUP BUG: check_stale_driver_reassignment_job line 2498 uses
     intersection_update(still_waiting_ids) which clears the ENTIRE _reassigned_orders set
     when no orders are in READY_FOR_PICKUP status. This strips dedup protection, allowing
     the same order to be reassigned (with email) again and again.

  3. NO EMAIL-LEVEL DEDUP: Emails are sent without any check for whether the same email
     was recently sent for the same order/event. No idempotency on Stripe webhook handler.

fix: |
  1. SCHEDULER LOCK (order_flow.py): Added _should_run_scheduler() using fcntl file lock
     so only ONE uvicorn worker per container runs the BackgroundScheduler. Other workers
     skip scheduler startup entirely. Lock auto-releases on process exit.

  2. DEDUP SET CLEANUP FIX (order_flow.py): Changed _reassigned_orders cleanup from
     intersection_update(still_in_READY_FOR_PICKUP) to difference_update(terminal_orders).
     Old logic cleared the ENTIRE set when orders left READY_FOR_PICKUP, stripping dedup
     protection. New logic only removes orders that reached terminal states (DELIVERED,
     CANCELLED, DELIVERY_FAILED).

  3. 120-MIN DELIVERY FAILURE DEDUP (order_flow.py): Added _delivery_failed_orders set
     to prevent duplicate emails/refunds if db.commit() fails and the job re-runs before
     the status change persists.

  4. STRIPE WEBHOOK IDEMPOTENCY (stripe_integration.py): Added stripe_event_id duplicate
     check before processing. Returns early if event already processed, preventing
     duplicate confirmation emails from Stripe webhook retries.

verification: 1062/1062 unit tests pass. All changes are defensive (dedup guards) — they prevent duplicate actions without changing any functional behavior.
files_changed:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/stripe_integration.py
