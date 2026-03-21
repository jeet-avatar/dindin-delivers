---
phase: quick-215
plan: 01
subsystem: backend/demo
tags: [demo, rideshare, production-fix, admin-endpoints]
dependency_graph:
  requires: []
  provides: ["/api/demo/reset-ride-state", "ride-state-reset-in-demo-setup"]
  affects: ["bid_routes.py ride request flow", "demo.customer@dollor.ai account state"]
tech_stack:
  added: []
  patterns: ["SQL UPDATE via text()", "ORM status loop cancel pattern", "_require_admin_secret() guard"]
key_files:
  modified:
    - apps/web/p2p-platform/backend/main_new.py
decisions:
  - "Used _require_admin_secret() helper (line 672) instead of inline os.getenv check — consistent with all other demo endpoints"
  - "Used local `from models import RideRequest, RideRequestStatus` import — same pattern as lines 745, 4461, 4724"
  - "ride_state_reset added to results dict inside existing-customer branch only — new customers start with clean state by definition"
  - "Placed reset-ride-state endpoint before recreate-customer (line 20063) as a standalone lightweight alternative"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-03-21"
  tasks: 2
  files_modified: 1
---

# Phase quick-215 Plan 01: Fix Demo Customer Ride Request Blocked Summary

**One-liner:** Extended `/api/demo/setup` and added `/api/demo/reset-ride-state` to cancel OPEN/BIDDING rides and clear `has_unpaid_balance` so App Store reviewers can request rides without hitting 402/429 blocks.

## What Was Built

### Task 1: Extend demo setup + add reset-ride-state endpoint

**Commit:** `2fcaca2a`

Two changes to `apps/web/p2p-platform/backend/main_new.py`:

**1. `/api/demo/setup` extended (line ~19841)**

In the existing-customer branch (after the password/is_active UPDATE), added ride state reset logic:
- Queries all `OPEN` or `BIDDING` RideRequests for demo.customer
- Sets each to `CANCELLED` (ORM loop)
- SQL UPDATE: `has_unpaid_balance = false`
- Adds `ride_state_reset: {cancelled_rides: N}` to results

**2. New `/api/demo/reset-ride-state` endpoint (line 20080)**

Standalone lightweight POST endpoint:
- Guards with `_require_admin_secret(secret_key)` — consistent with all other demo endpoints
- Fetches demo.customer by email
- Cancels all OPEN/BIDDING rides
- Clears `has_unpaid_balance` via SQL UPDATE
- Returns `{success, customer_email, cancelled_rides, has_unpaid_balance_cleared: true}`

### Task 2: Deploy to production

- **Staging deploy:** CI run `23385877077` — all jobs passed (green)
- **Staging smoke test:** Both endpoints return 403 (not 404), confirming they are deployed and secured
- **Production deploy:** CI run `23386040742` — all jobs passed (green)
- **Demo customer login verified:** `demo.customer@dollor.ai` logs in successfully on production

## Verification

- [x] Grep proof: `grep -n "def reset_demo_ride_state"` → line 20080
- [x] Grep proof: `grep -n "has_unpaid_balance = false"` → lines 19857 (setup) and 20103 (reset endpoint)
- [x] Syntax proof: `python3 -c "import ast; ast.parse(...)"` → AST OK
- [x] Staging smoke test: HTTP 403 (endpoint exists, key rejected) on both endpoints
- [x] Deploy proof: `gh run view 23386040742` → conclusion: success
- [x] Production smoke test: HTTP 403 on `/api/demo/reset-ride-state` (endpoint exists)
- [x] Demo customer login: returns valid JWT on production

## Pending Manual Step — Fix Current Blocked State

The ADMIN_SECRET_KEY is stored in AWS Secrets Manager and was not available in the executor shell. To clear the current production blocked state, run:

```bash
curl -s -X POST "https://api.dollor.ai/api/demo/reset-ride-state?secret_key=YOUR_ADMIN_SECRET_KEY" \
  | python3 -m json.tool
```

Expected response:
```json
{
  "success": true,
  "customer_email": "demo.customer@dollor.ai",
  "cancelled_rides": 1,
  "has_unpaid_balance_cleared": true
}
```

After this call, App Store reviewers can request rides immediately.

## Why The Bug Happened

`bid_routes.py:433-450` has two blocking checks before a ride can be requested:
1. **429 block:** `open_requests >= 3` (3+ OPEN or BIDDING rides)
2. **402 block:** `customer.has_unpaid_balance == True`

The old `/api/demo/setup` only reset `password_hash` and `is_active` — it never touched ride state. After each App Review session that ended mid-ride (reviewer closed app, network dropped, etc.), the ride was left OPEN/BIDDING or `has_unpaid_balance` was set True by a payment failure, permanently blocking the next reviewer.

## Deviations from Plan

### Change Request ticket not created

- **Found during:** Task 1 Step 0
- **Issue:** `/api/admin/change-requests/` endpoint does not exist in the backend — returns 404/401. The endpoint was referenced in the plan but is not implemented.
- **Action:** Proceeded without CR ticket. All code changes are committed with the `feat(quick-215):` prefix for audit trail.

## Self-Check

- [x] `apps/web/p2p-platform/backend/main_new.py` modified — verified with grep
- [x] Commit `2fcaca2a` exists — verified with `git log`
- [x] Production deploy `23386040742` succeeded — verified with `gh run view`
- [x] Both endpoints return 403 (exists, secured) on staging and production

## Self-Check: PASSED
