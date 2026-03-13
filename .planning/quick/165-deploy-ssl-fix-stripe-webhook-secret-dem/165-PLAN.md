---
phase: quick-165
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - infrastructure/ecs/task-definition.json
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
must_haves:
  truths:
    - "STRIPE_WEBHOOK_SECRET is present in ECS task definition secrets"
    - "Demo customer password includes trailing ! in recreate-customer endpoint"
    - "Staging deployment succeeds via CI/CD"
    - "Production deployment succeeds via CI/CD"
    - "Production smoke tests pass (demo login, webhook endpoint reachable)"
  artifacts:
    - path: "infrastructure/ecs/task-definition.json"
      provides: "STRIPE_WEBHOOK_SECRET secret binding"
      contains: "STRIPE_WEBHOOK_SECRET"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Correct demo password with !"
      contains: "DemoCustomer2025!"
  key_links:
    - from: "infrastructure/ecs/task-definition.json"
      to: "AWS Secrets Manager dollor/production/stripe"
      via: "ECS secret valueFrom ARN"
      pattern: "STRIPE_WEBHOOK_SECRET"
---

<objective>
Deploy SSL fix, Stripe webhook secret, and demo password fix to staging and production.

Purpose: Three changes need to reach production — (1) task-definition.json now includes STRIPE_WEBHOOK_SECRET from Secrets Manager so Stripe webhook signature verification works, (2) main_new.py recreate-customer endpoint has corrected demo password "DemoCustomer2025!" (with !), (3) Route53/CloudFront SSL fix is already live (infra-only, no code deploy needed).
Output: Both staging and production running with webhook secret available and correct demo password.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@infrastructure/ecs/task-definition.json
@apps/web/p2p-platform/backend/main_new.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify changes, run tests, commit, and push</name>
  <files>infrastructure/ecs/task-definition.json, apps/web/p2p-platform/backend/main_new.py</files>
  <action>
    ANTI-HALLUCINATION: Before anything, verify both changes exist in working tree:
    1. `grep -n "STRIPE_WEBHOOK_SECRET" infrastructure/ecs/task-definition.json` — must show the secret entry
    2. `grep -n "DemoCustomer2025!" apps/web/p2p-platform/backend/main_new.py` — must show password with !
    3. `grep -n "DemoCustomer2025" apps/web/p2p-platform/backend/main_new.py` — confirm no instance WITHOUT the !

    If both verified, run backend tests:
    4. `cd apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -x -q` — must pass (use -x to fail fast)

    Create CR ticket per ticketed-task skill:
    5. POST to /api/admin/change-requests/ with title "Deploy SSL fix + Stripe webhook secret + demo password fix", change_type "infrastructure", priority "Critical"
    6. Submit CR for review

    Commit and push:
    7. `git add infrastructure/ecs/task-definition.json apps/web/p2p-platform/backend/main_new.py`
    8. Commit with message: `fix(quick-165): [CR-XXXX] add STRIPE_WEBHOOK_SECRET to ECS task def + fix demo password`
    9. `git push origin main`
  </action>
  <verify>
    - `grep -c "STRIPE_WEBHOOK_SECRET" infrastructure/ecs/task-definition.json` returns 1+
    - `grep -c "DemoCustomer2025\!" apps/web/p2p-platform/backend/main_new.py` returns 1+
    - pytest exits 0
    - `git log --oneline -1` shows the commit
    - `git status` shows clean working tree for these files
  </verify>
  <done>Both changes committed and pushed to origin/main. Tests pass. CR ticket created.</done>
</task>

<task type="auto">
  <name>Task 2: Deploy to staging, smoke test, deploy to production, verify</name>
  <files></files>
  <action>
    CRITICAL: Use CI/CD ONLY. NEVER manual docker/ecs commands.

    Deploy to staging:
    1. `gh workflow run deploy-staging.yml --ref main`
    2. `gh run list --workflow=deploy-staging.yml --limit 3` — get run ID
    3. `gh run watch <run-id>` — wait for completion, must succeed

    Smoke test staging (https://d34u5ixl0bulv4.cloudfront.net):
    4. `curl -s -o /dev/null -w "%{http_code}" https://d34u5ixl0bulv4.cloudfront.net/health` — expect 200
    5. `curl -s -X POST https://d34u5ixl0bulv4.cloudfront.net/api/demo/setup -H "Content-Type: application/json" | head -20` — verify demo setup works
    6. Test demo customer login: `curl -s -X POST https://d34u5ixl0bulv4.cloudfront.net/api/customers/login -H "Content-Type: application/json" -d '{"email":"demo.customer@dollor.ai","password":"DemoCustomer2025!"}'` — expect 200 with token
    7. Verify webhook endpoint exists: `curl -s -o /dev/null -w "%{http_code}" -X POST https://d34u5ixl0bulv4.cloudfront.net/api/webhooks/stripe -H "Content-Type: application/json" -d '{}'` — expect 400 or 401 (NOT 404)

    Deploy to production:
    8. `gh workflow run deploy-dollar-ai.yml`
    9. `gh run list --workflow=deploy-dollar-ai.yml --limit 3` — get run ID
    10. `gh run watch <run-id>` — wait for completion, must succeed

    Smoke test production (https://api.dollor.ai):
    11. `curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/health` — expect 200
    12. Test demo customer login: `curl -s -X POST https://api.dollor.ai/api/customers/login -H "Content-Type: application/json" -d '{"email":"demo.customer@dollor.ai","password":"DemoCustomer2025!"}'` — expect 200 with token
    13. Verify webhook endpoint: `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/webhooks/stripe -H "Content-Type: application/json" -d '{}'` — expect 400 or 401 (NOT 404)
    14. Verify SSL: `curl -s -o /dev/null -w "%{http_code}" https://dollor.ai` — expect 200 or 301/302
    15. Verify SSL: `curl -s -o /dev/null -w "%{http_code}" https://www.dollor.ai` — expect 200 or 301/302

    Transition CR ticket through: In Progress -> Staging -> Production -> Verified
  </action>
  <verify>
    - Staging deploy workflow completed successfully
    - Production deploy workflow completed successfully
    - Staging health returns 200
    - Production health returns 200
    - Demo customer login returns 200 on both staging and production
    - Webhook endpoint returns non-404 on both environments
    - https://dollor.ai and https://www.dollor.ai resolve (SSL fix confirmed)
    - CR ticket in Verified status
  </verify>
  <done>Both staging and production deployed with STRIPE_WEBHOOK_SECRET in environment, correct demo password, and SSL working on dollor.ai/www.dollor.ai. All smoke tests pass.</done>
</task>

</tasks>

<verification>
- STRIPE_WEBHOOK_SECRET available as env var in ECS containers (verified by webhook endpoint not returning 500 on missing secret)
- Demo customer login works with "DemoCustomer2025!" password on production
- https://dollor.ai resolves with valid SSL certificate
- https://api.dollor.ai/api/webhooks/stripe returns non-404 status
</verification>

<success_criteria>
1. Backend tests pass before deploy
2. Staging deploy green, staging smoke tests pass
3. Production deploy green, production smoke tests pass
4. Demo login works on production with correct password
5. Stripe webhook endpoint reachable on production (not 404)
6. SSL works on dollor.ai and www.dollor.ai
</success_criteria>

<output>
After completion, create `.planning/quick/165-deploy-ssl-fix-stripe-webhook-secret-dem/165-SUMMARY.md`
</output>
