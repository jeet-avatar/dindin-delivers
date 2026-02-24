---
phase: quick-42
plan: 01
subsystem: auth
tags: [apple-sign-in, google-sign-in, ios, fastapi, jwt, oauth]

# Dependency graph
requires:
  - phase: 02-security-auth-fix
    provides: Global auth middleware, auth_utils.py
provides:
  - Working driver Google Sign-In (correct URL scheme + OAuth endpoint)
  - Working driver Apple Sign-In for returning users (apple_id lookup)
  - Working vendor Apple Sign-In for returning users (apple_id lookup)
  - apple_id column on Driver and Vendor models
affects: [ios-distribution, android-parity]

# Tech tracking
tech-stack:
  added: []
  patterns: [apple_id lookup pattern for returning Apple Sign-In users]

key-files:
  created: []
  modified:
    - apps/ios/delivery/eatffairdelivery/Info.plist
    - apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "Follow customer_apple_auth pattern for driver/vendor apple_id lookup (apple_id first, email fallback)"
  - "DriverAppleAuthRequest.email made Optional (Apple only provides on first sign-in)"
  - "Removed generateSecureGooglePassword and attemptGoogleReLogin dead code from DriverLoginView"

patterns-established:
  - "Apple Sign-In returning user pattern: apple_id lookup -> identity_token decode -> email fallback"
  - "Google OAuth driver pattern: driverGoogleAuth() -> /auth/driver/google (not driverRegister)"

requirements-completed: [BUG-1, BUG-2, BUG-3, BUG-4]

# Metrics
duration: 11min
completed: 2026-02-24
---

# Quick Task 42: Fix iOS Google and Apple Sign-In (4 Bugs) Summary

**Fixed driver Google Sign-In (wrong URL scheme + called driverRegister instead of OAuth), driver Apple Sign-In (email required, no apple_id lookup), and vendor Apple Sign-In (no apple_id lookup) -- all 4 bugs resolved**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-24T06:31:29Z
- **Completed:** 2026-02-24T06:43:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Driver Google Sign-In now uses correct URL scheme matching GoogleService-Info.plist and calls /auth/driver/google OAuth endpoint
- Driver Apple Sign-In works for returning users via apple_id lookup with identity_token JWT decoding fallback
- Vendor Apple Sign-In works for returning users via apple_id lookup (same pattern as customer)
- Removed ~100 lines of dead code (generateSecureGooglePassword, attemptGoogleReLogin, attemptDeterministicLogin)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Driver Google Sign-In + Apple identity_token (iOS)** - `a572f086` (fix)
2. **Task 2: Fix Driver + Vendor Apple Auth backend** - `56c991ae` (fix)

## Files Created/Modified
- `apps/ios/delivery/eatffairdelivery/Info.plist` - Fixed URL scheme from wrong Google client to correct REVERSED_CLIENT_ID
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - Added driverGoogleAuth() method, added identityToken param to driverAppleAuth()
- `apps/ios/delivery/eatffairdelivery/DriverLoginView.swift` - Replaced driverRegister with driverGoogleAuth in handleGoogleLogin, added identity_token extraction in handleAppleSignIn
- `apps/web/p2p-platform/backend/models.py` - Added apple_id column to Driver and Vendor models
- `apps/web/p2p-platform/backend/main_new.py` - Rewrote driver_apple_auth (apple_id lookup, Optional email, identity_token decode), updated vendor_apple_auth (apple_id lookup), added startup migrations

## Decisions Made
- Followed the customer_apple_auth() pattern exactly for driver/vendor apple_id lookup (apple_id first, then email fallback)
- Made DriverAppleAuthRequest.email Optional (was EmailStr required) since Apple only provides email on first sign-in
- Removed dead Google password generation code (3 methods, ~70 lines) since driverGoogleAuth handles everything via OAuth

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed optional unwrap for user.userID in handleGoogleLogin**
- **Found during:** Task 1 (build verification)
- **Issue:** `user.userID` returns `String?` (optional), but `driverGoogleAuth(googleId:)` expects `String` -- compiler error
- **Fix:** Added `let googleId = user.userID ?? ""` with guard check for empty string
- **Files modified:** `apps/ios/delivery/eatffairdelivery/DriverLoginView.swift`
- **Verification:** Build succeeded after fix
- **Committed in:** a572f086 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial type mismatch fix required for compilation. No scope creep.

## Issues Encountered
- Backend tests require JWT_SECRET_KEY and ADMIN_SECRET_KEY env vars (standard for this project)
- 18 pre-existing test failures (documented in quick-36 as auth middleware integration test issues) -- not related to this change

## Verification Results
- Info.plist URL scheme matches GoogleService-Info.plist REVERSED_CLIENT_ID
- driverGoogleAuth() exists in P2PAPIService.swift
- DriverLoginView calls driverGoogleAuth (not driverRegister) from Google login
- identityToken parameter added to driverAppleAuth() signature
- apple_id column on Customer (pre-existing), Driver (new), Vendor (new) models
- DriverAppleAuthRequest.email is Optional[str]
- Driver app builds clean (BUILD SUCCEEDED)
- 1282 backend tests pass (18 pre-existing failures, 0 new)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 Sign-In bugs fixed, ready for TestFlight build + distribute
- Backend needs deployment for apple_id migration to run in production

---
*Quick Task: 42*
*Completed: 2026-02-24*
