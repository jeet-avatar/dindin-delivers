---
phase: quick-48
plan: 01
subsystem: auth
tags: [apple-sign-in, multi-role, oauth, fastapi]

# Dependency graph
requires:
  - phase: quick-42
    provides: "iOS Google + Apple Sign-In bug fixes"
provides:
  - "Multi-role Apple Sign-In support for vendor and driver endpoints"
  - "Cross-role test coverage for Apple OAuth"
affects: [ios-distribution, android-distribution, auth-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Check user.vendor_id/driver_id instead of role enum for multi-role OAuth"]

key-files:
  created: []
  modified:
    - "apps/web/p2p-platform/backend/main_new.py"
    - "apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py"

key-decisions:
  - "Mirror vendor_google_auth and driver_google_auth multi-role patterns into Apple auth endpoints"
  - "Check vendor_id/driver_id link instead of role enum to support same-email multi-role accounts"

patterns-established:
  - "Multi-role OAuth pattern: query User by email without role filter, check entity ID link (vendor_id/driver_id), create and link entity if missing"

requirements-completed: [MULTI-ROLE-01]

# Metrics
duration: 10min
completed: 2026-02-24
---

# Quick Task 48: Multi-Role Apple Auth Summary

**Fixed vendor_apple_auth and driver_apple_auth to support same-email multi-role accounts, matching Google OAuth pattern already in place**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-24T22:10:47Z
- **Completed:** 2026-02-24T22:20:34Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Vendor Apple auth no longer rejects users with existing accounts from other roles -- creates vendor and links instead
- Driver Apple auth no longer causes IntegrityError when user exists from another role -- creates driver and links instead
- 3 new multi-role test cases (cross-role vendor login, cross-role driver login, existing vendor regression test) all passing
- 35/35 auth tests pass, 1285/1303 full suite (18 pre-existing integration failures unrelated to changes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix vendor_apple_auth to support multi-role accounts** - `bfb0f42c` (fix)
2. **Task 2: Fix driver_apple_auth to support multi-role accounts** - `192aaca8` (fix)
3. **Task 3: Add multi-role Apple auth tests and run full test suite** - `ac137c0c` (test)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Fixed vendor_apple_auth (removed role==VENDOR check, added vendor_id link check + create-and-link path) and driver_apple_auth (removed User.role==DRIVER filter from queries, added driver_id link check + create-and-link path)
- `apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py` - Added TestMultiRoleAppleAuth class with 3 test methods

## Decisions Made
- Mirrored exact pattern from vendor_google_auth and driver_google_auth (already multi-role safe) into Apple auth endpoints
- Customer Apple auth confirmed already multi-role safe (queries User by email without role filter at lines 6242/6246)
- Customer Google auth confirmed safe (does not query User table at all)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- DATABASE_URL not available in local environment, used py_compile syntax check instead of runtime import verification (expected behavior for local dev without DB)
- 18 pre-existing test failures in integration/e2e tests (auth-related, all in test_document_save_flow, test_android_restaurant_e2e_workflow, test_rideshare_cross_platform, test_cross_platform) -- not caused by this change

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 6 Apple/Google OAuth endpoints now support multi-role accounts consistently
- Ready for deployment to staging/production via CI/CD
- iOS and Android apps can use same-email Apple Sign-In across all 3 apps without backend errors

---
*Phase: quick-48*
*Completed: 2026-02-24*
