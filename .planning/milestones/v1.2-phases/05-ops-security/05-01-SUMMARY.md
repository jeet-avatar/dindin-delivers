---
phase: 05-ops-security
plan: 01
subsystem: infra
tags: [git, gitignore, pre-commit, secrets, p8, credential-hygiene]

# Dependency graph
requires:
  - phase: none
    provides: n/a
provides:
  - ".gitignore blocks *.p8, **/fastlane/keys/, api_key.json"
  - "Pre-commit hook blocks Stripe keys, AWS keys, private key PEM, .p8 files, .env files"
  - "No tracked secrets in git"
affects: [05-ops-security]

# Tech tracking
tech-stack:
  added: []
  patterns: ["shell-based pre-commit hook for secret detection", "gitignore layered defense for credential files"]

key-files:
  created: [".git/hooks/pre-commit"]
  modified: [".gitignore"]

key-decisions:
  - "Used git rm (not git filter-repo) -- key will be revoked in ASC, making history copies useless"
  - "Shell-based pre-commit hook (zero dependencies) instead of detect-secrets framework"
  - "sk_test_ pattern requires 20+ chars to avoid matching placeholder sk_test_your_key_here"

patterns-established:
  - "Pre-commit hook: all secret-bearing commits blocked at git level"
  - "Gitignore: *.p8 + **/fastlane/keys/ + api_key.json prevent re-addition"

requirements-completed: [OPS-01, OPS-02, OPS-03]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 05 Plan 01: Credential Cleanup Summary

**Removed 3 tracked .p8 keys from git, deleted local backend/.env with RDS password, added .gitignore protection for secret file types, installed pre-commit hook blocking Stripe/AWS/PEM/p8 secrets**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T10:33:18Z
- **Completed:** 2026-02-21T10:35:01Z
- **Tasks:** 2
- **Files modified:** 4 (3 deleted .p8 + 1 modified .gitignore) + 1 local hook created

## Accomplishments
- Removed all 3 copies of unused AuthKey_JFVA7628SX.p8 from git tracking and disk
- Deleted root backend/.env containing production RDS password (Dollor2024SecureDB) from disk
- Added *.p8, **/fastlane/keys/, api_key.json to .gitignore
- Installed pre-commit hook that blocks: Stripe live/test keys, AWS access keys (AKIA*), private key PEM blocks, .p8 files, .env files
- Production key 9K626GB728 at ~/.appstoreconnect/ was NOT touched

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove .p8 keys from git and add .gitignore protection** - `453a90d9` (chore)
2. **Task 2: Install pre-commit hook to block secret commits** - local-only (.git/hooks/ is not tracked by git)

## Files Created/Modified
- `.gitignore` - Added *.p8, **/fastlane/keys/, api_key.json patterns
- `apps/ios/customer/fastlane/keys/AuthKey_JFVA7628SX.p8` - DELETED from git
- `apps/ios/delivery/fastlane/keys/AuthKey_JFVA7628SX.p8` - DELETED from git
- `apps/ios/restaurant/fastlane/keys/AuthKey_JFVA7628SX.p8` - DELETED from git
- `backend/.env` - DELETED from disk (was never in git)
- `.git/hooks/pre-commit` - NEW: secret detection hook (local-only, not tracked)

## Decisions Made
- **git rm (not git filter-repo):** Simpler, no force push. The JFVA7628SX key should be revoked in App Store Connect, making any copies in git history useless. History rewrite can be done later if desired.
- **Shell-based pre-commit hook:** Zero dependencies, immediate protection. Can upgrade to detect-secrets later if team grows.
- **sk_test_ requires 20+ chars:** Avoids false positive on the placeholder `sk_test_your_key_here` in stripe_integration.py.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**IMPORTANT: Key revocation required (manual step)**

The JFVA7628SX .p8 key has been removed from git but still exists in git HISTORY and potentially at `~/.appstoreconnect/private_keys/AuthKey_JFVA7628SX.p8` on disk. To complete the security cleanup:

1. Revoke key `JFVA7628SX` in App Store Connect (Keys > Integrations)
2. Delete `~/.appstoreconnect/private_keys/AuthKey_JFVA7628SX.p8` from disk if present
3. DO NOT revoke key `9K626GB728` -- this is the active production key

This is handled by Plan 05-03 (checkpoint:human-action).

## Next Phase Readiness
- .gitignore and pre-commit hook are in place for future protection
- Plan 05-02 (staging URL fixes) and 05-03 (CLAUDE.md update + key revocation) can proceed
- No blockers

## Self-Check: PASSED

All 6 verification items confirmed:
- .gitignore exists and has new patterns
- All 3 .p8 files deleted from disk and git
- backend/.env deleted from disk
- Pre-commit hook exists and is executable
- Commit 453a90d9 exists in git log
- 05-01-SUMMARY.md created

---
*Phase: 05-ops-security*
*Completed: 2026-02-21*
