---
phase: quick-75
plan: 75
subsystem: deploy, ios
tags: [ci-cd, testflight, fare-estimate, auth-allowlist, ecs]

# Dependency graph
requires:
  - phase: quick-73
    provides: "Backend fare estimate 401 fix (commit 2bec7fe7)"
provides:
  - "Fare estimate fix deployed to staging + production"
  - "iOS Customer build 1109 on TestFlight"
affects: [app-store-submission, rideshare]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - CLAUDE.md

key-decisions:
  - "422 from staging smoke test accepted (field name mismatch in plan's curl, not a bug -- correct field names return 200)"

patterns-established: []

requirements-completed: [DEPLOY-FARE-FIX, IOS-REBUILD]

# Metrics
duration: 32min
completed: 2026-03-04
---

# Quick Task 75: Deploy Fare Estimate Fix + Rebuild iOS Customer Summary

**Fare estimate 401 fix deployed to staging + production via CI/CD; iOS Customer build 1109 archived and uploaded to TestFlight**

## Performance

- **Duration:** 32 min
- **Started:** 2026-03-04T12:42:28Z
- **Completed:** 2026-03-04T13:14:32Z
- **Tasks:** 2 of 2 auto tasks complete (checkpoint pending)
- **Files modified:** 2

## Accomplishments
- Pushed 4 unpushed commits (including fare estimate fix 2bec7fe7) to remote
- Deployed backend to staging via `deploy-staging.yml` (run 22669830734 -- success)
- Smoke tested staging: `POST /api/rides/estimate` returns HTTP 200 without auth token
- Deployed backend to production via `deploy-dollar-ai.yml` (run 22670395036 -- success)
- Smoke tested production: `POST /api/rides/estimate` returns HTTP 200 without auth token
- Bumped iOS Customer build 1108 -> 1109 (6 occurrences in project.pbxproj)
- Archived and uploaded iOS Customer build 1109 to TestFlight (export succeeded)
- Updated CLAUDE.md and MEMORY.md build version tables

## Task Commits

1. **Task 1: Push and deploy backend to staging + production** - No file commit (deployment-only task)
   - Staging deploy: run 22669830734 (success)
   - Production deploy: run 22670395036 (success)
2. **Task 2: Bump iOS Customer build and upload to TestFlight** - `30278c14` + `3530de4f`
   - `30278c14`: build(ios): bump customer build 1108 -> 1109
   - `3530de4f`: build(quick-75): bump iOS customer build 1108 -> 1109 + update version table

## Files Created/Modified
- `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj` - Build number 1108 -> 1109 (6 occurrences)
- `CLAUDE.md` - Updated build version table: Customer 1108 -> 1109

## Decisions Made
- Plan's curl smoke test used `pickup_lat` field names but backend expects `pickup_latitude` -- tested with correct field names, confirmed HTTP 200 on both environments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Plan's curl test body used abbreviated field names (`pickup_lat`) that returned 422 on staging. Tested with correct field names (`pickup_latitude`) and confirmed HTTP 200. This is a plan documentation issue, not a code issue.
- dSYM warnings during TestFlight upload for Firebase/gRPC third-party frameworks -- non-blocking, cosmetic only

## Verification Results

| Check | Result |
|-------|--------|
| Staging `POST /api/rides/estimate` (no auth) | HTTP 200 |
| Production `POST /api/rides/estimate` (no auth) | HTTP 200 |
| `CURRENT_PROJECT_VERSION = 1109` count | 6/6 |
| xcodebuild archive | SUCCEEDED |
| xcodebuild exportArchive + upload | SUCCEEDED |

## Next Steps
- Task 3 (checkpoint:human-verify): User needs to verify build 1109 on TestFlight and test fare estimate in-app

---
*Quick Task: 75*
*Completed: 2026-03-04*
