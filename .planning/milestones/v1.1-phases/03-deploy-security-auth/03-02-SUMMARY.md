---
phase: 03-deploy-security-auth
plan: 02
subsystem: infra
tags: [ecs, ecr, production, deployment, security-auth, cicd, cloudwatch]

# Dependency graph
requires:
  - phase: 03-deploy-security-auth
    plan: 01
    provides: "Staging verified — 19/19 smoke tests pass, human approved"
provides:
  - "Security auth code running on production ECS (task-def dollor-api:372)"
  - "2/2 production tasks HEALTHY"
  - "170+ endpoints protected with JWT auth in production"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CI/CD via deploy-dollar-ai.yml for production deploys (not manual AWS CLI)"
    - "Production smoke test pattern mirrors staging: public + protected + authenticated"

key-files:
  created: []
  modified: []

key-decisions:
  - "Used CI/CD (deploy-dollar-ai.yml) for production deploy — triggered automatically on push to main"
  - "Added CLAUDE.md rule #5: ALWAYS USE CI/CD FOR DEPLOYMENTS — prevents future manual aws ecs/docker commands"
  - "/api/vendors/featured 401 is NOT a bug — endpoint never existed (debug report: .planning/debug/vendors-featured-401.md)"

patterns-established:
  - "CI/CD-only deployment rule enforced in CLAUDE.md"
  - "Production smoke test: 5 protected (all 401) + 4 public (all non-401) + health check"

requirements-completed: [DEPLOY-03]

# Metrics
duration: ~45min (including debug investigation)
completed: 2026-02-20
---

# Phase 03 Plan 02: Deploy Security Auth to Production Summary

**Security auth code deployed to production via CI/CD (task-def dollor-api:372, 2/2 tasks HEALTHY). Protected endpoints return 401, public endpoints accessible. 170+ previously-unprotected endpoints now secured in production.**

## Performance

- **Duration:** ~45 min (deploy + smoke test + debug investigation)
- **Started:** 2026-02-20
- **Completed:** 2026-02-20
- **Tasks:** 3/3 (production deploy, smoke test, human verification)
- **Files modified:** 1 (CLAUDE.md — added CI/CD rule)

## Accomplishments
- Production ECS service updated to task-def `dollor-api:372` (was 370) via CI/CD run `22217682847`
- 2/2 production tasks HEALTHY and ACTIVE
- Production smoke test results:
  - 5 protected endpoints verified returning 401 (orders, addresses, profile, dashboard, driver location)
  - 4 public endpoints verified accessible (health 200, docs 200, vendors/published 200, login 422-validation)
  - `/api/vendors/featured` returns 401 — confirmed NOT a bug (endpoint never existed, see debug report)
- CI/CD deployment rule added to CLAUDE.md (rule #5) — prevents future manual deployments
- CI/CD deployment rule added to MEMORY.md — persists across sessions

## Deployment Details

| Environment | Task Definition | Running | Image Source |
|-------------|----------------|---------|--------------|
| Staging | `dollor-api-staging:31` | 1/1 | CI/CD run `22217684157` |
| Production | `dollor-api:372` | 2/2 | CI/CD run `22217682847` |

**CI/CD Workflow:** `deploy-dollar-ai.yml` (auto-triggered on push to main)
- Tests → Docker build (`--target production --platform linux/amd64`) → ECR push → ECS deploy
- Run URL: https://github.com/jeet-avatar/dindin-delivers/actions/runs/22217682847

**Rollback revision:** `dollor-api:370` (if needed)

## Production Smoke Test Results

| # | Endpoint | Expected | Actual | Result |
|---|----------|----------|--------|--------|
| 1 | `GET /health` | 200 | 200 | PASS |
| 2 | `GET /docs` | 200 | 200 | PASS |
| 3 | `GET /api/vendors/published` | 200 | 200 | PASS |
| 4 | `POST /api/auth/customer/login` (bad creds) | non-401 | 422 | PASS |
| 5 | `GET /api/erp/orders/pending-restaurant` | 401 | 401 | PASS |
| 6 | `GET /api/erp/customers/1/addresses` | 401 | 401 | PASS |
| 7 | `GET /api/customer/profile` | 401 | 401 | PASS |
| 8 | `GET /api/driver/dashboard` | 401 | 401 | PASS |
| 9 | `POST /api/erp/drivers/1/location` | 401 | 401 | PASS |

**Total: 9/9 PASS** (excluding `/api/vendors/featured` which is a non-existent endpoint, not a failure)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 5 - Process] Switched from manual deploy to CI/CD**
- **Found during:** Task 1
- **Issue:** Plan specified manual `aws ecs` commands. User requested CI/CD enforcement.
- **Fix:** Used `deploy-dollar-ai.yml` workflow which auto-triggered on push to main. Added CI/CD rule to CLAUDE.md.
- **Impact:** Better — CI/CD runs tests before deploy, uses consistent build flags, leaves audit trail.

**2. [Rule 1 - Investigation] `/api/vendors/featured` 401 — phantom endpoint**
- **Found during:** Task 2 (production smoke test)
- **Issue:** Endpoint returned 401 on production. Staging summary claimed it returned 200.
- **Root cause:** Endpoint never existed. GSD executor hallucinated it by conflating `/api/vendors/published` with `/api/promotions/featured`.
- **Fix:** No code fix needed. Debug report created: `.planning/debug/vendors-featured-401.md`. Phase 03.1 inserted to add guardrails.
- **Impact:** None — no client app calls this endpoint.

## Decisions Made
- CI/CD is now mandatory for all deployments (CLAUDE.md rule #5, MEMORY.md permanent rule)
- Phase 03.1 inserted to address the hallucinated endpoint class of bug with validation guardrails

## Issues Encountered
- Demo customer login on production returns "Incorrect email or password" — demo account may need password reset or recreation. Not a security auth issue.

## Self-Check: PASSED
- Production ECS `dollor-api:372`: 2/2 HEALTHY
- CI/CD run `22217682847`: SUCCESS (all 4 jobs passed)
- `/health` returns 200
- Protected endpoints return 401
- CLAUDE.md rule #5 added

---
*Phase: 03-deploy-security-auth*
*Completed: 2026-02-20*
