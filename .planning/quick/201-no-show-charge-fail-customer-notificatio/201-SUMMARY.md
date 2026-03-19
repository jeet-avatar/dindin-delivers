---
phase: quick-201
plan: 01
subsystem: rideshare-payments
tags: [no-show, payment, notifications, support-ticket]
dependency_graph:
  requires: [bid_routes.py:mark_passenger_no_show, models.py:SupportTicket]
  provides: [customer failure notifications, P1 support ticket on charge failure]
  affects: [bid_routes.py]
tech_stack:
  added: []
  patterns: [charge_succeeded flag, conditional push body, auto-SupportTicket creation]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/bid_routes.py
decisions:
  - "charge_succeeded flag initialised False before Stripe block; set True only after PaymentIntent.create succeeds — scope is the entire no-show handler"
  - "Both failure paths (CardError catch + no-card else) get identical notification blocks; description differs by failure reason"
  - "Support ticket creation wrapped in nested try/except so a DB error there cannot obscure the outer no-show flow"
  - "CR ticket creation skipped — ADMIN_SECRET_KEY not available locally; per skill rule: log warning and continue"
metrics:
  duration: "8 minutes"
  completed: "2026-03-19"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-201: No-show Charge Fail — Customer Notification + P1 Support Ticket

**One-liner:** Fixed silent no-show charge failure by adding conditional charge_succeeded flag, customer push + in-app notifications on both failure paths, and auto-P1 SupportTicket creation in bid_routes.py.

## What Was Built

When the $5 no-show fee fails (Stripe CardError/InvalidRequestError or no saved payment method), the customer previously received a misleading cancellation push claiming "A $5.00 fee has been applied." This fix:

1. **`charge_succeeded` flag** — initialised `False` before the Stripe try block, set `True` only after `PaymentIntent.create` succeeds (`bid_routes.py:2156`, `2205`).

2. **Failure path 1 — CardError/InvalidRequestError** (`bid_routes.py:2228-2272`): After `payment_status = "manual_review"` and `db.commit()`, now sends:
   - `send_push_notification` — "No-show fee couldn't be collected" push to customer
   - `_notify_customer` — in-app notification with payment type
   - `SupportTicket` creation — `TicketType.SUPPORT`, `TicketPriority.P1_HIGH`, `TicketStatus.OPEN`, component="Payment", labels=["no-show", "payment-failed"]

3. **Failure path 2 — no stripe_customer_id or no default card** (`bid_routes.py:2273-2317`): Identical three-block notification pattern, description includes the `reason` variable.

4. **Conditional cancellation push body** (`bid_routes.py:2336`): The "Ride cancelled — No show" push now reads:
   - **charge_succeeded=True**: `"{driver_name} waited at the pickup but you didn't show up. A $5.00 fee has been applied."`
   - **charge_succeeded=False**: `"{driver_name} waited at the pickup but you didn't show up. We couldn't process the no-show fee — our team will follow up."`

5. **Import** — `SupportTicket, TicketType, TicketPriority, TicketStatus` added to the models import block at `bid_routes.py:23`.

## Verification Output

```
=== charge_succeeded occurrences (3 hits — init, success set, conditional body) ===
2156:    charge_succeeded = False
2205:                charge_succeeded = True
2336:                body=... if charge_succeeded else ...

=== SupportTicket + TicketPriority in bid_routes.py (7 hits) ===
23:    SupportTicket, TicketType, TicketPriority, TicketStatus
2253:                    last_ticket = db.query(SupportTicket)...
2255:                    support_ticket = SupportTicket(
2260:                        priority=TicketPriority.P1_HIGH,
2298:                last_ticket = db.query(SupportTicket)...
2300:                support_ticket = SupportTicket(
2305:                    priority=TicketPriority.P1_HIGH,

=== Conditional push body (1 hit) ===
2336:    body=... if charge_succeeded else ...

=== noshow_charge_failed (2 hits — both in failure paths only) ===
2240:    data={"type": "noshow_charge_failed", ...}  # CardError path
2285:    data={"type": "noshow_charge_failed", ...}  # no-card path

Import check: import OK (with Redis fallback warning — expected in local env)
```

## Commits

| Hash | Description |
|------|-------------|
| `49369645` | fix(quick-201): no-show charge fail — customer notifications + P1 support ticket |

## Deviations from Plan

None — plan executed exactly as written.

**Note on CR ticket:** ADMIN_SECRET_KEY was not available from AWS Secrets Manager in this session. Per `.agents/skills/ticketed-task/SKILL.md`: "If the key is not available, log a warning and continue — don't block the task."

## Self-Check: PASSED

- [x] `bid_routes.py` modified and confirmed present
- [x] Commit `49369645` exists in git log
- [x] Import check: `import bid_routes` exits clean (Redis fallback only, no Python errors)
- [x] `charge_succeeded` appears in 3 locations (init, success set, conditional body)
- [x] Both failure paths contain `send_push_notification` + `_notify_customer` + `SupportTicket` creation
- [x] Conditional push body uses `charge_succeeded` to choose between "fee applied" and "couldn't process" messages
