---
phase: quick-117
plan: 01
type: execute
wave: 1
depends_on: [quick-116]
files_modified:
  - apps/web/p2p-platform/backend/admin_frontend/
autonomous: true
requirements: [DEPLOY-01]
---

<objective>
Rebuild admin frontend with quick-116 workflow button fixes, copy to backend static dir,
commit, push to main, deploy staging via CI/CD, smoke test, then deploy production.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Rebuild frontend and commit</name>
  <files>apps/web/p2p-platform/backend/admin_frontend/</files>
  <action>
1. Build the admin frontend:
   ```
   cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/frontend
   npm run build
   ```

2. Clear old static files and copy new build:
   ```
   rm -rf /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/admin_frontend/*
   cp -r /Users/jeet/doordash-p2p/apps/web/p2p-platform/frontend/dist/* /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/admin_frontend/
   ```

3. Stage and commit:
   ```
   git add apps/web/p2p-platform/backend/admin_frontend/
   git commit -m "build(admin): rebuild frontend with quick-116 workflow button fixes"
   ```

4. Push to remote:
   ```
   git push origin main
   ```
  </action>
  <verify>git log -1 shows the build commit, git status is clean</verify>
  <done>Frontend rebuilt with workflow buttons, committed and pushed to main</done>
</task>

<task type="auto">
  <name>Task 2: Deploy staging via CI/CD and smoke test</name>
  <files>scripts/admin-smoke-test.sh</files>
  <action>
1. Trigger staging deploy:
   ```
   gh workflow run deploy-staging.yml --ref main
   ```

2. Wait for staging deploy to complete:
   ```
   gh run list --workflow=deploy-staging.yml --limit 1
   gh run watch <run-id>
   ```

3. Smoke test staging admin endpoints:
   ```
   bash scripts/admin-smoke-test.sh staging
   ```

4. If smoke test passes, proceed to production.
  </action>
  <verify>Staging deploy succeeds, admin smoke test passes on staging</verify>
  <done>Staging deployed and smoke tested</done>
</task>

<task type="auto">
  <name>Task 3: Deploy production via CI/CD and verify</name>
  <files></files>
  <action>
1. Trigger production deploy:
   ```
   gh workflow run deploy-dollar-ai.yml
   ```

2. Monitor production deploy:
   ```
   gh run list --workflow=deploy-dollar-ai.yml --limit 1
   gh run watch <run-id>
   ```

3. Smoke test production admin endpoints:
   ```
   bash scripts/admin-smoke-test.sh production
   ```

4. Verify the new workflow buttons are accessible by curling the admin frontend assets.
  </action>
  <verify>Production deploy succeeds, admin smoke test passes on production</verify>
  <done>Production deployed with workflow button fixes, smoke test green</done>
</task>

</tasks>

<verification>
- Frontend build completes without errors
- Code pushed to main
- Staging deploy via CI/CD succeeds
- Staging smoke test passes
- Production deploy via CI/CD succeeds
- Production smoke test passes
</verification>

<success_criteria>
- Admin portal on production has all workflow transition buttons from quick-116
- Smoke test passes on both staging and production
- Zero manual docker/ecs commands used (CI/CD only)
</success_criteria>

<output>
After completion, create `.planning/quick/117-rebuild-admin-frontend-deploy-to-staging/117-SUMMARY.md`
</output>
