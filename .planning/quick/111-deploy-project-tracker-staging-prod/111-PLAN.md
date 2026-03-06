# Quick Task 111: Deploy Project Tracker to Staging & Production

## Task 1: Push code to remote & deploy staging
- **files**: All committed code on main branch
- **action**: `git push origin main` then `gh workflow run deploy-staging.yml --ref main`
- **verify**: `gh run list --workflow=deploy-staging.yml --limit 1` shows success
- **done**: Staging deployment workflow completes successfully

## Task 2: Smoke test staging project tracker API
- **action**: curl staging endpoints to verify project tracker API is live
  - `GET /api/admin/project-tracker/stats`
  - `GET /api/admin/project-tracker/cases`
- **verify**: Both return 200 with valid JSON data
- **done**: Staging API returns project tracker data

## Task 3: Deploy production
- **action**: `gh workflow run deploy-dollar-ai.yml`
- **verify**: `gh run watch <run-id>` shows all jobs passed
- **done**: Production deployment succeeds

## Task 4: Verify production UI accessibility
- **action**: curl production project tracker endpoints, confirm admin portal serves frontend
- **verify**: Production API returns project tracker stats, frontend bundle loads
- **done**: Project tracker is live and accessible in production UI
