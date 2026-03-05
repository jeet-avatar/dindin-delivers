---
phase: quick-92
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  truths:
    - "Wave 1 Payment Safety backend is running on staging"
    - "Wave 1 Payment Safety backend is running on production"
    - "Staging smoke test confirms new endpoints respond correctly"
    - "Production smoke test confirms new endpoints respond correctly"
  artifacts: []
  key_links:
    - from: "gh workflow run deploy-staging.yml"
      to: "staging ECS service"
      via: "CI/CD pipeline"
      pattern: "deploy-staging"
    - from: "gh workflow run deploy-dollar-ai.yml"
      to: "production ECS service"
      via: "CI/CD pipeline"
      pattern: "deploy-dollar-ai"
---

<objective>
Deploy Wave 1 Payment Safety backend changes (Quick-89) to staging and production via CI/CD.

Purpose: Get Stripe idempotency keys, refund endpoint, price change detection 409, vendor offline blocking 400, and auto-cancel on vendor offline live in production.
Output: Both staging and production running the latest backend with payment safety features.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
Code is already committed and pushed to main. This is a deploy-only plan.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Deploy to staging and smoke test</name>
  <files></files>
  <action>
1. Deploy to staging via CI/CD (NEVER use manual docker/aws/ecs commands):
   ```
   gh workflow run deploy-staging.yml --ref main
   ```
2. Monitor the workflow run:
   ```
   gh run list --workflow=deploy-staging.yml --limit 3
   gh run watch <run-id>
   ```
3. Wait for successful completion. If it fails, check logs with `gh run view <run-id> --log-failed`.

4. Smoke test staging at `https://d34u5ixl0bulv4.cloudfront.net`:
   - Health check: `curl -s https://d34u5ixl0bulv4.cloudfront.net/health`
   - Verify refund endpoint exists (expect 401/422 without auth, NOT 404):
     `curl -s -o /dev/null -w "%{http_code}" -X POST https://d34u5ixl0bulv4.cloudfront.net/api/orders/999/refund`
   - Verify order placement still works (expect 401 without auth, NOT 500):
     `curl -s -o /dev/null -w "%{http_code}" -X POST https://d34u5ixl0bulv4.cloudfront.net/api/orders/place`
   - Verify ride request still works (expect 401 without auth, NOT 500):
     `curl -s -o /dev/null -w "%{http_code}" -X POST https://d34u5ixl0bulv4.cloudfront.net/api/rides/request`

   Success criteria: health returns 200, all other endpoints return 401 or 422 (NOT 404 or 500).
  </action>
  <verify>
   - `gh run view <run-id>` shows all jobs passed
   - Staging health endpoint returns 200
   - Refund endpoint returns non-404 status (401 or 422)
   - Order and ride endpoints return 401 (not 500)
  </verify>
  <done>Staging deployed and smoke tested — all endpoints responding correctly with no 404s or 500s.</done>
</task>

<task type="auto">
  <name>Task 2: Deploy to production and verify</name>
  <files></files>
  <action>
1. Deploy to production via CI/CD (NEVER use manual docker/aws/ecs commands):
   ```
   gh workflow run deploy-dollar-ai.yml
   ```
2. Monitor the workflow run:
   ```
   gh run list --workflow=deploy-dollar-ai.yml --limit 3
   gh run watch <run-id>
   ```
3. Wait for successful completion. If it fails, check logs with `gh run view <run-id> --log-failed`.

4. Smoke test production at `https://api.dollor.ai`:
   - Health check: `curl -s https://api.dollor.ai/health`
   - Verify refund endpoint exists (expect 401/422 without auth, NOT 404):
     `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/orders/999/refund`
   - Verify order placement still works (expect 401 without auth, NOT 500):
     `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/orders/place`
   - Verify ride request still works (expect 401 without auth, NOT 500):
     `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/rides/request`

   Success criteria: health returns 200, all other endpoints return 401 or 422 (NOT 404 or 500).
  </action>
  <verify>
   - `gh run view <run-id>` shows all jobs passed
   - Production health endpoint returns 200
   - Refund endpoint returns non-404 status (401 or 422)
   - Order and ride endpoints return 401 (not 500)
  </verify>
  <done>Production deployed and verified — Wave 1 Payment Safety features are live.</done>
</task>

</tasks>

<verification>
- Staging CI/CD workflow completed successfully
- Production CI/CD workflow completed successfully
- Both environments return 200 on /health
- New refund endpoint responds (not 404) on both environments
- Existing order/ride endpoints not broken (no 500s)
</verification>

<success_criteria>
Wave 1 Payment Safety backend (Stripe idempotency, refund endpoint, price change 409, vendor offline 400, auto-cancel) is live on both staging and production with passing smoke tests.
</success_criteria>

<output>
After completion, create `.planning/quick/92-deploy-wave-1-payment-safety-backend-to-/92-SUMMARY.md`
</output>
