---
phase: quick-126
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [PROMO-TEST, PROMO-DEPLOY]

must_haves:
  truths:
    - "Full backend test suite passes with zero failures"
    - "Promotion discount math is correct in payment flow"
    - "Customer receipt email includes discount line when promo applied"
    - "Vendor email shows payout breakdown with promo discount absorbed"
    - "Driver earnings email unchanged (driver keeps 100%)"
    - "Featured deals endpoint returns real DB promotions"
    - "Staging deployment succeeds via CI/CD and smoke tests pass"
  artifacts:
    - path: "apps/web/p2p-platform/backend/tests/"
      provides: "Test suite covering promo flow"
  key_links:
    - from: "order_flow.py"
      to: "stripe_integration.py"
      via: "promo discount applied before Stripe charge"
      pattern: "promo.*discount|discount.*amount"
    - from: "email_service.py"
      to: "order_flow.py"
      via: "receipt email pulls discount from order data"
      pattern: "discount|promo"
---

<objective>
Test the promotion system wired in quick-125 end-to-end: run full backend test suite, verify promo discount math, email functions, featured deals endpoint. Then deploy to staging via CI/CD and smoke test.

Purpose: Validate that promo codes, discount calculations, receipt emails, and featured deals all work correctly before promoting to production.
Output: Green test suite, staging deployment, smoke test results.
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
  <name>Task 1: Create Change Request ticket for promo system testing + staging deploy</name>
  <action>
Create a Change Request on the admin portal using the ticketed-task skill:

1. POST to `https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY` with:
   - title: "Test promotion system E2E and deploy to staging"
   - description: "Run full backend test suite to verify promo discount math, email functions, featured deals endpoint from quick-125. Deploy to staging via CI/CD and smoke test."
   - change_type: "code"
   - priority: "Medium"
   - requested_by: "support@dollor.ai"

2. Extract `cr_id` from response (e.g., `CR-XXXX`).

3. Submit for review: POST to `https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY`

4. Transition to In Progress: POST to `https://api.dollor.ai/api/admin/change-requests/<cr_id>/transition?secret_key=$ADMIN_SECRET_KEY` with `new_status: "In Progress"`.

5. Record the CR ID for use in subsequent tasks and commit messages.

If ADMIN_SECRET_KEY is not available, log a warning and continue without blocking.
  </action>
  <verify>CR ticket exists and is in "In Progress" status. `cr_id` captured for later use.</verify>
  <done>Change Request created, submitted, and transitioned to In Progress.</done>
</task>

<task type="auto">
  <name>Task 2: Run full backend test suite and verify promo-specific logic</name>
  <files>apps/web/p2p-platform/backend/tests/</files>
  <action>
1. Run the full backend test suite:
   ```
   cd apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -v --tb=short 2>&1
   ```
   Expect ~1400+ tests passing, zero failures.

2. Specifically verify promo discount math by checking test output for:
   - Promotion model tests (create, validate, apply promo codes)
   - Order flow tests that exercise discount calculation path
   - Email service tests for receipt with discount line, vendor payout breakdown, driver earnings

3. Verify featured deals endpoint by grepping for test coverage:
   ```
   grep -rn "featured\|promotion\|promo" apps/web/p2p-platform/backend/tests/ --include="*.py"
   ```

4. If any test failures exist, diagnose and fix. The promo system was wired in quick-125 (commit c4b60252) touching models.py, order_flow.py, email_service.py, main_new.py, stripe_integration.py.

5. Verify promo discount math manually by reading order_flow.py:
   - Customer fee: $1 flat (unchanged by promo)
   - Restaurant fee: $1 flat (unchanged by promo)
   - Driver fee: $0 (unchanged by promo)
   - Promo discount: vendor absorbs, platform keeps flat fee
   - Confirm discount is subtracted from vendor payout, NOT from platform fee

6. Verify email_service.py includes discount line in customer receipt when promo is applied.
  </action>
  <verify>`pytest tests/ -v` shows all tests passing (0 failures). Promo discount math confirmed: vendor absorbs discount, platform keeps $2/order flat, driver keeps 100%.</verify>
  <done>Full test suite green. Promo discount math verified correct. Email templates include discount info. Featured deals endpoint has test coverage.</done>
</task>

<task type="auto">
  <name>Task 3: Push to remote, deploy staging via CI/CD, smoke test</name>
  <action>
1. Ensure all changes are pushed to remote:
   ```
   git push origin main
   ```

2. Deploy to staging via CI/CD (NEVER manual docker/ecs):
   ```
   gh workflow run deploy-staging.yml --ref main
   ```

3. Monitor the deployment:
   ```
   gh run list --workflow=deploy-staging.yml --limit 3
   gh run watch <run-id>
   ```

4. Once staging deploy succeeds, smoke test the promo-related endpoints on staging (`https://d34u5ixl0bulv4.cloudfront.net`):
   - GET `/api/promotions/featured` — should return real DB promotions (not empty)
   - Verify the endpoint returns 200 with promotion data structure

5. Run the smoke test script if available:
   ```
   bash scripts/smoke-test.sh staging
   ```

6. Transition CR ticket through deploy stages:
   - Transition to "Staging" after staging deploy succeeds
   - Transition to "Verified" after smoke tests pass

7. If smoke tests fail, diagnose the issue and report. Do NOT deploy to production — this task only targets staging.
  </action>
  <verify>
- `gh run view <run-id>` shows all jobs passed
- `curl -s https://d34u5ixl0bulv4.cloudfront.net/api/promotions/featured` returns 200 with promotion data
- CR ticket transitioned to Verified
  </verify>
  <done>Staging deployment successful. Smoke tests pass. Featured deals endpoint returns real data. CR ticket at Verified status.</done>
</task>

</tasks>

<verification>
- Full backend test suite: 0 failures
- Promo discount math: vendor absorbs discount, platform keeps $1 customer + $1 restaurant = $2/order
- Driver earnings: unaffected by promo (keeps 100% of delivery fee + tips)
- Email templates: customer receipt shows discount, vendor email shows payout breakdown
- Staging: deployed via CI/CD, smoke tests green
- CR ticket: created and tracked through to Verified
</verification>

<success_criteria>
1. Backend test suite passes with zero failures
2. Promo discount math verified correct (vendor absorbs, platform flat fee preserved)
3. Staging deployed via `gh workflow run deploy-staging.yml`
4. Featured deals endpoint returns real promotions on staging
5. CR ticket created and at Verified status
</success_criteria>

<output>
After completion, create `.planning/quick/126-test-promotion-system-e2e-and-deploy-sta/126-SUMMARY.md`
</output>
