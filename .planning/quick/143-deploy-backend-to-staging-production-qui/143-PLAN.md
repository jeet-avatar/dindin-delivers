---
phase: quick-143
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [DEPLOY-BACKEND]
must_haves:
  truths:
    - "Backend with Quick-138 notification fixes and Quick-142 vendor coords is running on staging"
    - "Staging smoke tests pass on key endpoints"
    - "Backend with same changes is running on production"
    - "Production deployment verified healthy"
  artifacts: []
  key_links:
    - from: "git push origin main"
      to: "deploy-staging.yml"
      via: "CI/CD workflow"
      pattern: "gh workflow run deploy-staging"
    - from: "deploy-staging.yml"
      to: "deploy-dollar-ai.yml"
      via: "staging verified then production deploy"
      pattern: "gh workflow run deploy-dollar-ai"
---

<objective>
Deploy backend to staging and production via CI/CD.

Purpose: Ship Quick-138 (notification fixes) and Quick-142 (vendor coordinates / self-delivery nav flow) to live environments.
Output: Both staging and production running the latest backend code.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md — CI/CD deployment rules, staging/production URLs, smoke test patterns
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR, push code, deploy to staging, and smoke test</name>
  <files></files>
  <action>
1. Create a Change Request ticket (change_type: infrastructure, priority: High, title: "Deploy backend: Quick-138 notifications + Quick-142 vendor coords").
2. Submit the CR for review.
3. Push code to remote: `git push origin main`
4. Deploy to staging: `gh workflow run deploy-staging.yml --ref main`
5. Monitor staging deployment: `gh run list --workflow=deploy-staging.yml --limit 3` then `gh run watch <run-id>` until complete.
6. Transition CR to "Staging".
7. Smoke test staging at `https://d34u5ixl0bulv4.cloudfront.net`:
   - `curl -s -o /dev/null -w "%{http_code}" https://d34u5ixl0bulv4.cloudfront.net/health` — expect 200
   - `curl -s -o /dev/null -w "%{http_code}" https://d34u5ixl0bulv4.cloudfront.net/api/vendors/published` — expect 200
   - `curl -s -o /dev/null -w "%{http_code}" https://d34u5ixl0bulv4.cloudfront.net/docs` — expect 403 or 404 (Swagger locked down in prod-like)
   - Verify response bodies are valid JSON where applicable.
8. If any smoke test fails, STOP and report. Do NOT proceed to production.

CRITICAL: NEVER use manual docker build, docker push, aws ecs, or direct ECR/ECS commands.
  </action>
  <verify>
- `gh run view <staging-run-id>` shows all jobs passed
- All staging smoke test curls return expected status codes
  </verify>
  <done>Staging deployment succeeded and smoke tests pass.</done>
</task>

<task type="auto">
  <name>Task 2: Deploy to production and verify</name>
  <files></files>
  <action>
1. Deploy to production: `gh workflow run deploy-dollar-ai.yml`
2. Monitor production deployment: `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>` until complete.
3. Transition CR to "Production".
4. Smoke test production at `https://api.dollor.ai`:
   - `curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/health` — expect 200
   - `curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/api/vendors/published` — expect 200
   - `curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/docs` — expect 403 or 404
5. Transition CR to "Verified".
6. Report final deployment status with CI/CD run IDs.

CRITICAL: NEVER use manual docker build, docker push, aws ecs, or direct ECR/ECS commands.
  </action>
  <verify>
- `gh run view <prod-run-id>` shows all jobs passed
- All production smoke test curls return expected status codes
- ECS tasks are RUNNING (check via CI/CD output, not manual aws commands)
  </verify>
  <done>Production deployment succeeded, smoke tests pass, CR marked Verified.</done>
</task>

</tasks>

<verification>
- Staging smoke tests: health 200, vendors/published 200, docs blocked
- Production smoke tests: health 200, vendors/published 200, docs blocked
- Both CI/CD runs completed successfully (no manual docker/ecs commands used)
- CR ticket tracks full deploy lifecycle
</verification>

<success_criteria>
- Latest backend code (Quick-138 + Quick-142) is live on both staging and production
- All smoke tests pass on both environments
- CI/CD runs documented with run IDs
- CR ticket in Verified status
</success_criteria>

<output>
After completion, create `.planning/quick/143-deploy-backend-to-staging-production-qui/143-SUMMARY.md`
</output>
