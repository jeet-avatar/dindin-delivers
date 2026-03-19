---
phase: quick-192
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/bid_routes.py
autonomous: true
requirements: [PAYOUT-AUTO-01]
must_haves:
  truths:
    - "When a ride is completed, a Stripe Transfer is created to the driver's Connect account if they are onboarded"
    - "The Transfer idempotency key is deterministic using ride_request.id only (no undefined 'bid' variable)"
    - "If a transfer already exists (stripe_transfer_id set), a second Transfer is NOT created"
    - "Driver payout amount correctly deducts platform fee AND A4A fee ($0.05) from fare"
    - "Drivers not yet Stripe-onboarded are logged as skipped (no error)"
  artifacts:
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "complete_ride handler with fixed auto-payout logic"
      contains: "idempotency_key=f\"ride_xfer_{ride_request.id}\""
  key_links:
    - from: "bid_routes.py complete_ride (line 2295)"
      to: "stripe.Transfer.create"
      via: "driver.stripe_account_id + stripe_onboarded check"
      pattern: "stripe\\.Transfer\\.create"
---

<objective>
Fix three bugs in the existing auto-payout block inside complete_ride that silently prevent real Stripe Connect transfers from executing:

1. NameError on `bid` variable (line 2324) — `bid` is not in scope; the whole try/except swallows this silently.
2. Missing idempotency guard — no check for existing `stripe_transfer_id` before creating a Transfer.
3. A4A fee discrepancy — payout stored as `fare - platform_fee` but should be `fare - platform_fee - 0.05` (per rideshare_payments.py model).

Purpose: Drivers currently receive $0 via Stripe Connect on ride completion because the Transfer.create call always raises a NameError. Fixing this makes the payout flow real.
Output: Updated bid_routes.py with the auto-payout block corrected.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/bid_routes.py
@apps/web/p2p-platform/backend/rideshare_payments.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix auto-payout block in complete_ride — idempotency key, A4A deduction, duplicate-transfer guard</name>
  <files>apps/web/p2p-platform/backend/bid_routes.py</files>
  <action>
    In `complete_ride` (around line 2258-2351), make three targeted fixes:

    **Fix 1 — A4A deduction in payout calculation (line 2267):**
    Change:
    ```python
    ride_request.driver_payout = round(final_price - platform_fee, 2)
    ```
    To:
    ```python
    driver_a4a_share = 0.05  # TNC-13: driver's share of Access for All fee
    ride_request.driver_payout = round(final_price - platform_fee - driver_a4a_share, 2)
    ```

    **Fix 2 — Idempotency guard (add before Transfer.create, inside the `if driver and ...stripe_onboarded` branch):**
    Before the `payout_cents = int(...)` line, add:
    ```python
    # Idempotency: skip if transfer already created
    if ride_request.stripe_transfer_id:
        logger.info(f"Ride {ride_request.id} transfer already exists ({ride_request.stripe_transfer_id}), skipping")
    else:
    ```
    Then indent the existing `payout_cents` block under this `else`.

    **Fix 3 — Broken idempotency_key reference (line 2324):**
    Change:
    ```python
    idempotency_key=f"bid_driver_xfer_{ride_request.id}_{bid.id if hasattr(bid, 'id') else ride_request.matched_bid_id}"
    ```
    To:
    ```python
    idempotency_key=f"ride_xfer_{ride_request.id}"
    ```
    This removes the undefined `bid` reference. The ride_request.id is already unique and deterministic.

    Do NOT change any other logic in the handler. Do NOT alter the demo-ride check, push notification, or email code.
  </action>
  <verify>
    1. Python syntax check: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import bid_routes" 2>&1`
    2. Grep confirming the fix: `grep -n "ride_xfer_\|stripe_transfer_id\|driver_a4a_share" apps/web/p2p-platform/backend/bid_routes.py`
    3. Confirm `bid.id` no longer appears in the file near the transfer block: `grep -n "bid\.id" apps/web/p2p-platform/backend/bid_routes.py`
    4. Run backend tests: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/ -x -q --tb=short 2>&1 | tail -20`
  </verify>
  <done>
    - `python -c "import bid_routes"` exits with code 0 (no NameError at import time)
    - `grep "ride_xfer_"` returns the updated idempotency_key line
    - `grep "driver_a4a_share"` returns the 0.05 deduction line inside complete_ride
    - `grep "stripe_transfer_id"` shows the idempotency guard before Transfer.create
    - `grep "bid\.id"` returns no hits inside the auto-payout block
    - Backend test suite passes (or no new failures vs baseline)
  </done>
</task>

<task type="auto">
  <name>Task 2: Commit and deploy to staging + production via CI/CD</name>
  <files></files>
  <action>
    1. Stage and commit the fix:
       ```bash
       cd /Users/jeet/doordash-p2p
       git add apps/web/p2p-platform/backend/bid_routes.py
       git commit -m "fix(quick-192): fix 3 auto-payout bugs in complete_ride — NameError bid.id, idempotency guard, A4A deduction"
       ```

    2. Push and deploy staging:
       ```bash
       git push origin main
       gh workflow run deploy-staging.yml --ref main
       ```
       Wait for staging deploy to succeed: `gh run list --workflow=deploy-staging.yml --limit 3`

    3. Smoke test staging — verify the complete endpoint exists and the payout block no longer errors:
       ```bash
       curl -s https://d34u5ixl0bulv4.cloudfront.net/api/payments/ride/pricing-info | python3 -m json.tool | head -10
       ```
       (Confirms backend is up and stripe payment routes are loading)

    4. Deploy production:
       ```bash
       gh workflow run deploy-dollar-ai.yml
       ```
       Monitor: `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>`

    5. Update STATE.md: append quick task 192 entry to the Quick Tasks Completed table.
  </action>
  <verify>
    - `gh run view <run-id>` shows all jobs passed (build, test, deploy)
    - `curl -s https://api.dollor.ai/api/payments/ride/pricing-info` returns 200 with tier data
  </verify>
  <done>
    CI/CD run for deploy-dollar-ai.yml shows all jobs succeeded. Production pricing-info endpoint returns 200.
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
- `grep -n "ride_xfer_\|driver_a4a_share\|stripe_transfer_id" apps/web/p2p-platform/backend/bid_routes.py` — all three lines present
- `grep -n "bid\.id" apps/web/p2p-platform/backend/bid_routes.py` — 0 hits inside the auto-payout block
- Production deploy CI/CD run: all jobs green
- `curl https://api.dollor.ai/api/payments/ride/pricing-info` — 200 OK
</verification>

<success_criteria>
The complete_ride handler:
1. No longer throws NameError on `bid` variable when executing the Transfer block
2. Uses deterministic idempotency key `ride_xfer_{ride_request.id}` — safe to retry
3. Skips Transfer.create if `stripe_transfer_id` already set — prevents duplicate payouts
4. Stores `driver_payout` as `fare - platform_fee - 0.05` matching the Model A spec in rideshare_payments.py
5. Deployed to production via CI/CD
</success_criteria>

<output>
After completion, create `.planning/quick/192-automate-driver-payouts-via-stripe-conne/192-SUMMARY.md` with:
- What was fixed (3 bugs, file:line references)
- Verification output (grep proof + CI/CD run ID)
- Commit hash
</output>
