---
phase: quick-70
plan: 01
subsystem: infra
tags: [app-store-connect, demo-account, api, production]

# Dependency graph
requires:
  - phase: quick-69
    provides: Audit report identifying 4 blockers
  - phase: quick-67
    provides: Build 1108 uploaded to TestFlight
provides:
  - All 4 App Store blockers resolved
  - Version in PREPARE_FOR_SUBMISSION state
  - Demo account working on production
  - Privacy and support URLs using www prefix
affects: [app-store-submission]

# Tech tracking
tech-stack:
  added: []
  patterns: [app-store-connect-api-jwt-auth, aws-secrets-manager-lookup]

key-files:
  created: []
  modified: []

key-decisions:
  - "Used www.dollor.ai for both privacy and support URLs (bare domain has Let's Encrypt SSL cert issues)"
  - "Edited existing REJECTED version rather than creating new version (Apple allows editing rejected versions)"
  - "Admin secret retrieved from dollor/production/admin (not admin-yCDIFY as documented in CLAUDE.md)"

patterns-established:
  - "App Store Connect API: generate JWT with ES256, kid=9K626GB728, iss=80d10e49-..."
  - "Demo account reset: POST /api/demo/setup?secret_key=<ADMIN_SECRET_KEY> on production before any App Store submission"

requirements-completed: [APPSTORE-BLOCKERS]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Quick Task 70: Fix 4 App Store Blockers Summary

**Resolved all 4 App Store submission blockers: demo account 401, privacy URL SSL failure, wrong build (1037 vs 1108), and REJECTED version state -- now PREPARE_FOR_SUBMISSION**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T10:40:46Z
- **Completed:** 2026-03-04T10:43:08Z
- **Tasks:** 2
- **Files modified:** 0 (all fixes via API calls)

## Accomplishments

- Demo customer account reset on production -- login now returns 200 with JWT access_token
- Privacy policy URL updated from `https://dollor.ai/privacy` to `https://www.dollor.ai/privacy` in App Store Connect
- Support URL updated from `https://dollor.ai/support` to `https://www.dollor.ai/support` in App Store Connect
- Build 1108 (ID `cf874071`) attached to App Store version (was build 1037 from Jan 23 rejection)
- Version state transitioned from `REJECTED` to `PREPARE_FOR_SUBMISSION`
- Full rerun audit: 5/5 checks PASS

## Task Commits

No source code files were modified -- all fixes were production API calls (App Store Connect API + backend demo setup endpoint). Plan file tracked in docs commit.

1. **Task 1: Fix all 4 App Store blockers** - API calls only (no commit)
2. **Task 2: Rerun audit to verify all blockers resolved** - Verification only (no commit)

**Plan metadata:** See docs commit below.

## Audit Rerun Results

| Check | Status | Details |
|-------|--------|---------|
| 1.4 Demo login | PASS | HTTP 200, token: eyJhbGciOiJIUzI1NiIs... |
| 7.5 Privacy URL | PASS | https://www.dollor.ai/privacy -> HTTP 200 |
| 7.6 Support URL | PASS | https://www.dollor.ai/support -> HTTP 200 |
| 8.4 Build 1108 | PASS | Build 1108 (ID cf874071...) attached |
| 9.2 Version state | PASS | State: PREPARE_FOR_SUBMISSION (not REJECTED) |

## Blocker Resolution Details

### Blocker 1: Demo Account 401

- **Root cause:** Demo accounts existed in production DB but needed reset
- **Fix:** `POST https://api.dollor.ai/api/demo/setup?secret_key=<ADMIN_SECRET_KEY>`
- **Result:** All 4 demo accounts confirmed (customer, driver, restaurant, admin)
- **Verification:** Login returns 200 with `access_token`, `customer_id: 74`, `customer_code: DEMO-CUST-001`
- **Note:** ADMIN_SECRET_KEY retrieved from AWS Secrets Manager at `dollor/production/admin` (not `dollor/production/admin-yCDIFY` as listed in CLAUDE.md -- secret was renamed)

### Blocker 2: Privacy Policy URL SSL Failure

- **Root cause:** Bare domain `dollor.ai` has Let's Encrypt SSL cert causing connection failures; `www.dollor.ai` works
- **Fix:** PATCH `appInfoLocalizations/84795f5e-ba2a-494e-8842-48e07a33436d` with `privacyPolicyUrl: https://www.dollor.ai/privacy`
- **Bonus:** Also updated support URL on `appStoreVersionLocalizations/b43df02d-dbe1-4a41-8841-1489202a10c4` to `https://www.dollor.ai/support`
- **Verification:** Both URLs return HTTP 200

### Blocker 3: Wrong Build Attached

- **Root cause:** Version still had build 1037 (from Jan 23, 2026 rejection) instead of build 1108 (uploaded Mar 4, 2026)
- **Fix:** PATCH `/v1/appStoreVersions/30ad500d/relationships/build` with build ID `cf874071`
- **Verification:** GET version with `include=build` confirms build 1108 attached, `processingState: VALID`

### Blocker 4: REJECTED State

- **Root cause:** Version was in REJECTED state from Jan 23 submission
- **Fix:** Editing the version (attaching new build + updating metadata) automatically transitions the state
- **Result:** State changed from `REJECTED` to `PREPARE_FOR_SUBMISSION`
- **Note:** NO submission for review was triggered -- version is ready for manual submission

## Decisions Made

- Used `www.dollor.ai` canonical domain for both privacy and support URLs (bare domain has SSL cert issues)
- Edited the existing REJECTED version rather than creating a new version (Apple allows editing rejected versions, and the metadata/screenshots were already set up)
- AWS Secrets Manager secret name is `dollor/production/admin` (not `dollor/production/admin-yCDIFY` as documented)

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

- AWS Secrets Manager secret ID `dollor/production/admin-yCDIFY` (from CLAUDE.md) returned ResourceNotFoundException. The correct ID is `dollor/production/admin`. Found via `aws secretsmanager list-secrets` query. This is a documentation drift issue, not a code bug.

## User Setup Required

None -- no external service configuration required. App is ready for manual submission via App Store Connect.

## Next Steps

- **DO NOT auto-submit** -- version is in PREPARE_FOR_SUBMISSION state, ready for manual review submission
- Consider cleaning up description formatting (extra spaces -- WARNING from audit, not a blocker)
- Consider adding iPhone 6.7" screenshot set (WARNING from audit, not a blocker)
- Update CLAUDE.md to correct AWS Secrets Manager ARN for admin secret

## Self-Check: PASSED

- FOUND: 70-PLAN.md
- FOUND: 70-SUMMARY.md
- No source code commits (all fixes were API calls to production + App Store Connect)
- Audit rerun: 5/5 checks PASS

---
*Phase: quick-70*
*Completed: 2026-03-04*
