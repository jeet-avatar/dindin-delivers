---
phase: quick-131
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [FIX-DELIVERED-500, FIX-CONFIRM-PAYMENT-500, FIX-ACCOUNTING-ENTRIES]

must_haves:
  truths:
    - "POST /api/erp/orders/{id}/delivered returns 200 (not 500)"
    - "PUT /api/erp/orders/{id}/complete-delivery returns 200 (not 500)"
    - "POST /api/erp/orders/{id}/confirm-payment returns 200 (not 500)"
    - "POST /api/erp/orders/{id}/picked-up returns 200 (not 500)"
    - "JournalEntry records are created when deliveries complete via alias endpoints"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Fixed alias endpoints with correct parameter forwarding"
      contains: "_auth=_auth"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Fixed complete_delivery() forwarding _auth to order_delivered()"
      contains: "order_delivered(order_id, db, _auth)"
  key_links:
    - from: "main_new.py alias endpoints"
      to: "order_flow.py functions"
      via: "function call with all required parameters"
      pattern: "order_delivered\\(order_id, db, _auth"
---

<objective>
Fix CRITICAL 500 errors on /erp/orders/{id}/delivered, /erp/orders/{id}/complete-delivery, /erp/orders/{id}/confirm-payment, and /erp/orders/{id}/picked-up alias endpoints.

Purpose: These alias endpoints in main_new.py pass incorrect parameters to the underlying order_flow.py functions, causing 500 errors on production. This means JournalEntry accounting records are NOT being created when deliveries complete, and drivers/restaurants cannot mark orders as delivered through the iOS app.

Output: All alias endpoints correctly forward auth and request parameters to their underlying functions. Accounting entries are created on delivery completion.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 14475-14595 — alias endpoints)
@apps/web/p2p-platform/backend/order_flow.py (lines 3457-3461 — order_delivered signature, lines 4325-4334 — complete_delivery, lines 1468-1473 — confirm_payment)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket and fix all alias endpoint parameter mismatches</name>
  <files>apps/web/p2p-platform/backend/main_new.py, apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
Create a CR ticket (priority: Critical, change_type: code) per ticketed-task skill.

Then fix the following 5 parameter mismatch bugs:

**main_new.py alias fixes:**

1. Line 14478 — `picked_up_alias`: Change `return await order_picked_up(order_id, db)` to `return await order_picked_up(order_id, db, _auth)`. The `order_picked_up()` signature is `(order_id, db, _auth)`.

2. Line 14483 — `complete_delivery_alias`: Change `return await complete_delivery(order_id, db)` to `return await complete_delivery(order_id, db, _auth)`. The `complete_delivery()` signature is `(order_id, db, _auth)`.

3. Line 14502 — `order_delivered_alias`: Change `return await order_delivered(order_id, db)` to `return await order_delivered(order_id, db, _auth)`. The `order_delivered()` signature is `(order_id, db, _auth)`.

4. Line 14560 — `confirm_payment_ios_alias`: This is the worst one. Change the function signature to accept `request: Request` and pass it through:
   - Add `request: Request` as first parameter to `confirm_payment_ios_alias`
   - Change `return await confirm_payment(order_id, db)` to `return await confirm_payment(request, order_id, db, _auth)`
   - The `confirm_payment()` signature is `(http_request: Request, order_id, db, _auth)` — it needs Request for rate limiting.

**order_flow.py fix:**

5. Line 4334 — `complete_delivery()`: Change `return await order_delivered(order_id, db)` to `return await order_delivered(order_id, db, _auth)`. The `_auth` param is already available in `complete_delivery`'s own signature at line 4328.

**Why these fail:** When alias functions call the underlying functions directly (not via FastAPI routing), the `Depends()` defaults do NOT execute. FastAPI only resolves `Depends()` for the directly-routed endpoint function. So calling `order_delivered(order_id, db)` without `_auth` means `_auth` gets no value, causing a TypeError (500).

**Do NOT change:** The `unassign_driver_alias`, `restaurant_accept_alias`, `restaurant_decline_alias`, `restaurant_accept_delivery_alias`, `restaurant_decline_delivery_alias`, `driver_arrived_alias`, `cancel_no_customer_alias`, `address_unreachable_alias` — verify these separately but do NOT modify unless confirmed broken. Only fix what is confirmed broken.

**Verification step:** After fixing, grep to confirm no alias still calls its target with only `(order_id, db)` when the target requires `_auth`.
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import main_new; print('import OK')"` to verify no syntax errors.
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && pytest tests/integration/test_ios_api_contracts.py -v -k "delivered or complete_delivery or confirm_payment or picked_up" --no-header 2>&1 | tail -30` to check relevant tests pass.
Run: `grep -n "order_delivered\|complete_delivery\|confirm_payment\|order_picked_up" apps/web/p2p-platform/backend/main_new.py | grep "await"` to visually confirm all calls now include _auth.
  </verify>
  <done>
All 5 function calls pass the correct parameters. No import/syntax errors. Relevant tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: Run full test suite and deploy to staging + production</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
1. Run the full backend test suite: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && pytest tests/ -v --tb=short 2>&1 | tail -50`. Fix any regressions.

2. Commit with CR ID: `fix(quick-131): [CR-XXXX] fix 500 on /erp/orders delivered, complete-delivery, confirm-payment, picked-up aliases`

3. Push to remote: `git push origin main`

4. Deploy to staging: `gh workflow run deploy-staging.yml --ref main`

5. Wait for staging deploy, then smoke test:
   - `curl -s -X POST "https://d34u5ixl0bulv4.cloudfront.net/api/erp/orders/1/delivered" -H "Authorization: Bearer TEST" -H "Content-Type: application/json" | head -5` (expect 401 or 404, NOT 500)
   - `curl -s -X PUT "https://d34u5ixl0bulv4.cloudfront.net/api/erp/orders/1/complete-delivery" -H "Authorization: Bearer TEST" -H "Content-Type: application/json" | head -5` (expect 401 or 404, NOT 500)
   - `curl -s -X POST "https://d34u5ixl0bulv4.cloudfront.net/api/erp/orders/1/confirm-payment" -H "Authorization: Bearer TEST" -H "Content-Type: application/json" | head -5` (expect 401 or 404, NOT 500)

6. Deploy to production: `gh workflow run deploy-dollar-ai.yml`

7. Monitor deploy: `gh run list --workflow=deploy-dollar-ai.yml --limit 3`

8. Smoke test production:
   - Same curl commands against `https://api.dollor.ai` — expect 401 or 404, NOT 500

9. Transition CR ticket through: In Progress -> Staging -> Production -> Verified
  </action>
  <verify>
Full test suite passes with zero regressions.
Staging smoke test: all 3 alias endpoints return non-500 status.
Production smoke test: all 3 alias endpoints return non-500 status.
CR ticket status: Verified.
  </verify>
  <done>
All alias endpoints return proper HTTP status codes (401/404) instead of 500. Production deploy confirmed healthy. CR ticket verified.
  </done>
</task>

</tasks>

<verification>
- POST /api/erp/orders/{id}/delivered does not return 500
- PUT /api/erp/orders/{id}/complete-delivery does not return 500
- POST /api/erp/orders/{id}/confirm-payment does not return 500
- POST /api/erp/orders/{id}/picked-up does not return 500
- complete_delivery() in order_flow.py correctly forwards _auth to order_delivered()
- All backend tests pass
- Production deployment succeeds
</verification>

<success_criteria>
All 5 parameter mismatch bugs fixed, tests pass, deployed to production, and alias endpoints return proper HTTP responses instead of 500.
</success_criteria>

<output>
After completion, create `.planning/quick/131-fix-critical-delivered-endpoint-500-and-/131-SUMMARY.md`
</output>
