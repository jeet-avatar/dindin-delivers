---
phase: quick-125
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/email_service.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/stripe_integration.py
autonomous: true
requirements: [PROMO-WIRE]

must_haves:
  truths:
    - "CreateOrderRequest accepts promo_code, discount is subtracted from total_amount"
    - "Vendor absorbs discount — vendor payout reduced by discount_amount, platform keeps $2 flat"
    - "Customer receipt email shows discount line when promo applied"
    - "Driver earnings email sent after delivery completion"
    - "Featured deals endpoint returns real promotions from DB, not hardcoded templates"
    - "Startup migration adds discount_amount, promo_code, promo_type columns to orders table"
  artifacts:
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "Order model with discount_amount, promo_code, promo_type columns"
      contains: "discount_amount"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Promo validation in create_order, discount in fee_breakdown, vendor payout adjustment"
      contains: "promo_code"
    - path: "apps/web/p2p-platform/backend/email_service.py"
      provides: "Customer receipt with discount row, driver earnings email function"
      contains: "send_delivery_completed_driver_email"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Featured deals from real DB, startup migration for discount columns"
      contains: "discount_amount"
  key_links:
    - from: "order_flow.py create_order"
      to: "models.py Order"
      via: "discount_amount/promo_code/promo_type fields"
      pattern: "discount_amount"
    - from: "order_flow.py complete_delivery"
      to: "email_service.py send_delivery_completed_driver_email"
      via: "function call after customer receipt"
      pattern: "send_delivery_completed_driver_email"
    - from: "stripe_integration.py"
      to: "email_service.py send_vendor_order_email"
      via: "passes discount/payout params"
      pattern: "discount_amount"
---

<objective>
Verify and deploy the promotion system wiring into the payment flow.

Purpose: Changes have already been made across 5 backend files to wire promo_code support into CreateOrderRequest, subtract discounts from totals (vendor absorbs), add discount lines to receipt emails, add driver earnings emails, and make featured deals query real DB. This plan verifies those changes compile, pass tests, and deploy cleanly.

Output: Verified promotion system wired into payment flow, all tests passing, deployed to staging and production.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/models.py
@apps/web/p2p-platform/backend/order_flow.py
@apps/web/p2p-platform/backend/email_service.py
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/stripe_integration.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify all promotion changes and run full test suite</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/email_service.py
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/stripe_integration.py
  </files>
  <action>
    Verify the existing changes across all 5 files are correct and consistent. Specifically check:

    1. **models.py** — Confirm `discount_amount` (Float, nullable), `promo_code` (String, nullable), `promo_type` (String, nullable) columns added to Order model with correct SQLAlchemy types.

    2. **order_flow.py** — Verify:
       - `CreateOrderRequest` has `promo_code: Optional[str] = None`
       - Promo validation queries Promotion table by code, checks `is_active`, `start_date <= now <= end_date`, `current_uses < max_uses`
       - Discount calculation: percentage type = `(discount_value / 100) * subtotal`, fixed type = `min(discount_value, subtotal)`
       - `total_amount = subtotal + delivery_fee + service_fee - discount_amount` (discount subtracted BEFORE Stripe charge)
       - Order record stores `discount_amount`, `promo_code`, `promo_type`
       - Response JSON includes discount_amount and promo_code in fee_breakdown
       - Restaurant payout = `subtotal - platform_fee - discount_amount` (vendor absorbs discount, platform keeps $1 flat)
       - Customer receipt email call passes `discount_amount` and `promo_code`
       - Driver earnings email call added after customer receipt in complete_delivery flow

    3. **email_service.py** — Verify:
       - `send_order_confirmation_email` (or customer receipt function) accepts `discount_amount` and `promo_code` params
       - When discount > 0, HTML includes a discount row showing "-$X.XX (Promo: CODE)"
       - `send_vendor_order_email` accepts subtotal, discount, platform_fee, vendor_payout params with breakdown HTML
       - New `send_delivery_completed_driver_email()` function exists with delivery_fee, tip, total earnings

    4. **stripe_integration.py** — Verify vendor email call passes discount/payout params correctly.

    5. **main_new.py** — Verify:
       - Featured deals endpoint (`/api/promotions/featured` or similar) queries real Promotion table
       - Startup migration adds `discount_amount`, `promo_code`, `promo_type` columns to orders table via ALTER TABLE IF NOT EXISTS pattern
       - `/api/promotions/send-samples` endpoint exists for test email sending

    If any issues found (missing imports, wrong variable names, broken references), fix them.

    Then run the full backend test suite:
    ```bash
    cd apps/web/p2p-platform/backend
    pytest tests/ -v --tb=short 2>&1 | tail -50
    ```

    Fix any test failures caused by the promotion changes (e.g., tests that assert on order response shape, tests that mock create_order, pricing model tests that check total calculation).

    Also run promotion-specific tests:
    ```bash
    pytest tests/unit/test_promotions.py -v --tb=short
    ```
  </action>
  <verify>
    - `python -m py_compile models.py` passes (already confirmed)
    - `python -m py_compile order_flow.py` passes (already confirmed)
    - `python -m py_compile email_service.py` passes (already confirmed)
    - `python -m py_compile stripe_integration.py` passes (already confirmed)
    - `pytest tests/ -v` shows 0 failures
    - `pytest tests/unit/test_promotions.py -v` passes
  </verify>
  <done>All 5 files verified correct, full test suite passes with 0 failures, promotion-specific tests pass.</done>
</task>

<task type="auto">
  <name>Task 2: Commit changes and deploy to staging + production</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/email_service.py
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/stripe_integration.py
  </files>
  <action>
    1. Stage and commit the 5 backend files (NOT config.json or test files unless they were modified for fixes):
       ```bash
       git add apps/web/p2p-platform/backend/models.py \
              apps/web/p2p-platform/backend/order_flow.py \
              apps/web/p2p-platform/backend/email_service.py \
              apps/web/p2p-platform/backend/main_new.py \
              apps/web/p2p-platform/backend/stripe_integration.py
       ```
       Commit message: "feat(quick-125): wire promotion system into payment flow — promo_code on orders, discount in totals, vendor absorbs, receipt emails, driver earnings email, real featured deals"

    2. Push to remote:
       ```bash
       git push origin main
       ```

    3. Deploy to staging:
       ```bash
       gh workflow run deploy-staging.yml --ref main
       ```

    4. Wait for staging deploy, then smoke test:
       ```bash
       # Check featured deals endpoint returns real data
       curl -s https://d34u5ixl0bulv4.cloudfront.net/api/promotions/featured | python3 -m json.tool | head -20
       ```

    5. Deploy to production:
       ```bash
       gh workflow run deploy-dollar-ai.yml
       ```

    6. Monitor deployment:
       ```bash
       gh run list --workflow=deploy-dollar-ai.yml --limit 3
       gh run watch <run-id>
       ```

    7. Verify production featured deals:
       ```bash
       curl -s https://api.dollor.ai/api/promotions/featured | python3 -m json.tool | head -20
       ```

    IMPORTANT: Follow CI/CD rules — NEVER manual docker build/push/ecs commands. Only use gh workflow run.
  </action>
  <verify>
    - `git log --oneline -1` shows the promotion commit
    - `gh run list --workflow=deploy-staging.yml --limit 1` shows success
    - `gh run list --workflow=deploy-dollar-ai.yml --limit 1` shows success
    - `curl -s https://api.dollor.ai/api/promotions/featured` returns real promotion data (not hardcoded templates)
  </verify>
  <done>Changes committed, pushed, deployed to staging (verified), deployed to production (verified), featured deals endpoint returns real DB data.</done>
</task>

</tasks>

<verification>
- Full backend test suite passes with 0 failures
- Promotion discount math: total = subtotal + delivery_fee + service_fee - discount_amount
- Vendor payout math: vendor_payout = subtotal - platform_fee($1) - discount_amount
- Platform revenue unchanged: $2/order ($1 customer service fee + $1 restaurant platform fee)
- Driver earnings unchanged: keeps 100% of delivery_fee + tips
- Featured deals returns real Promotion table data
- Customer receipt shows discount line when promo applied
- Driver earnings email function exists and is called in complete_delivery
</verification>

<success_criteria>
- All 5 backend files verified correct and consistent
- Full test suite: 0 failures
- Deployed to staging + production via CI/CD
- Featured deals endpoint returns real promotions from DB on production
</success_criteria>

<output>
After completion, create `.planning/quick/125-wire-promotion-system-into-payment-flow/125-SUMMARY.md`
</output>
