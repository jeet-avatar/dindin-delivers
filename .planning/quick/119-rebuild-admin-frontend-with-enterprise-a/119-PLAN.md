---
phase: quick-119
plan: 01
type: execute
wave: 1
depends_on: [quick-118]
files_modified:
  - apps/web/p2p-platform/backend/admin_frontend/
autonomous: true
requirements: [DEPLOY-01]
---

<objective>
Rebuild admin frontend with quick-118 enterprise approval routing (approval chains, delegation,
dept-specific fields, SLA tracking), deploy to staging + production via CI/CD, smoke test both.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Rebuild frontend and push</name>
  <files>apps/web/p2p-platform/backend/admin_frontend/</files>
  <action>
1. Build frontend:
   cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/frontend && npm run build

2. Copy build to backend static dir:
   rm -rf /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/admin_frontend/*
   cp -r /Users/jeet/doordash-p2p/apps/web/p2p-platform/frontend/dist/* /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/admin_frontend/

3. Commit and push:
   git add apps/web/p2p-platform/backend/admin_frontend/
   git commit -m "build(admin): rebuild frontend with enterprise approval routing (quick-118)"
   git push origin main
  </action>
  <verify>git log -1 shows build commit, git status clean, push succeeded</verify>
  <done>Frontend rebuilt and pushed to main</done>
</task>

<task type="auto">
  <name>Task 2: Deploy staging and smoke test</name>
  <files>scripts/admin-smoke-test.sh</files>
  <action>
1. gh workflow run deploy-staging.yml --ref main
2. gh run list --workflow=deploy-staging.yml --limit 1 — get run ID
3. gh run watch <run-id> — wait for completion
4. bash scripts/admin-smoke-test.sh staging
  </action>
  <verify>Staging deploy succeeds, smoke test passes</verify>
  <done>Staging deployed and smoke tested</done>
</task>

<task type="auto">
  <name>Task 3: Deploy production and smoke test</name>
  <files></files>
  <action>
1. gh workflow run deploy-dollar-ai.yml
2. gh run list --workflow=deploy-dollar-ai.yml --limit 1 — get run ID
3. gh run watch <run-id> — wait for completion
4. bash scripts/admin-smoke-test.sh production
  </action>
  <verify>Production deploy succeeds, smoke test passes</verify>
  <done>Production deployed and smoke tested</done>
</task>

</tasks>

<success_criteria>
- Frontend build includes enterprise approval routing UI
- Staging + production deployed via CI/CD (no manual docker/ecs)
- Smoke tests pass on both environments
</success_criteria>

<output>
After completion, create `.planning/quick/119-rebuild-admin-frontend-with-enterprise-a/119-SUMMARY.md`
</output>
