---
phase: quick-50
plan: 01
subsystem: auth
tags: [oauth, apple-sign-in, google-sign-in, registration, 403, ios, android, fastapi]

# Dependency graph
requires:
  - phase: quick-48
    provides: "Multi-role Apple auth fix (role-agnostic User query)"
provides:
  - "403 + registration_url responses for vendor/driver OAuth (no auto-create)"
  - "iOS registration-required alert with Safari link in driver/restaurant apps"
  - "Android registration-required AlertDialog with browser link in driver/partner apps"
  - "RegistrationRequiredException in Android safeApiCall"
  - "P2PRegistrationRequiredResponse model in iOS P2PAPIService"
affects: [deployment, ios-testflight, android-firebase]

# Tech tracking
tech-stack:
  added: []
  patterns: ["403 + registration_url pattern for gated OAuth endpoints", "RegistrationRequiredException for cross-layer error propagation"]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/AuthViewModel.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/LoginScreen.kt
    - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginViewModel.kt
    - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginScreen.kt

key-decisions:
  - "Used JSONResponse (not HTTPException) for 403 to include registration_url and requires_registration in body"
  - "Used clearRegistrationState() (sets AuthState.UnAuthenticated) instead of setError('') to dismiss partner AlertDialog -- avoids blank red error card"
  - "Driver app uses clearRegistrationPrompt() matching existing pattern in LoginViewModel"

patterns-established:
  - "403 + registration_url: Backend returns JSON {detail, registration_url, requires_registration} for gated OAuth"
  - "iOS P2PAPIError.registrationRequired(message, url): Propagates registration gate through completion handlers"
  - "Android RegistrationRequiredException: safeApiCall detects 403 + registration_url before generic error extraction"

requirements-completed: [QUICK-50]

# Metrics
duration: 18min
completed: 2026-02-24
---

# Quick Task 50: Multi-Role OAuth No Auto-Create Summary

**Vendor/driver OAuth returns 403 + registration_url instead of auto-creating empty shell accounts; iOS/Android apps show registration alert with browser link**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-24T22:41:50Z
- **Completed:** 2026-02-24T22:59:42Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Removed auto-create logic from 4 vendor/driver OAuth endpoints (Google + Apple), replacing with 403 + registration_url JSON response
- iOS driver and restaurant apps parse registrationRequired error and show "Registration Required" alert with Safari link
- Android driver and partner apps detect RegistrationRequiredException and show AlertDialog with browser link
- Customer OAuth auto-create remains unchanged
- All 39 backend auth tests pass (7 new/updated tests for 403 behavior)
- All 3 iOS apps build, all 3 Android apps compile, all Android unit tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend -- Replace auto-create with 403 + registration_url** - `7b6358f3` (feat)
2. **Task 2: iOS -- Parse registration_url and show Safari-open alert** - `debb2b39` (feat)
3. **Task 3: Android -- Handle registration_url error in driver/partner auth** - `f1319a8a` (feat, in eatfair-android repo)

## Files Created/Modified

**Backend (doordash-p2p):**
- `apps/web/p2p-platform/backend/main_new.py` - 4 OAuth endpoints: vendor_google_auth, vendor_apple_auth, driver_google_auth, driver_apple_auth -- replaced auto-create else branches with JSONResponse 403 + registration_url
- `apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py` - Updated 2 existing tests to expect 403, added 4 new tests (Google auth no-role, brand new Apple auth), updated 1 existing test to accept 403

**iOS (doordash-p2p):**
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - Added P2PRegistrationRequiredResponse model, registrationRequired error case in P2PAPIError, 403 parsing in 4 OAuth methods
- `apps/ios/delivery/eatffairdelivery/DriverLoginView.swift` - Added showRegistrationAlert state, handled registrationRequired in Apple + Google completion handlers, added .alert modifier
- `apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift` - Same pattern as driver, plus handled in email/password login switch + Google auth switch

**Android (eatfair-android):**
- `shared/src/main/java/ai/dollor/shared/model/ApiModels.kt` - Added RegistrationRequiredResponse data class
- `shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt` - Added RegistrationRequiredException, 403 + registration_url detection in safeApiCall (reads errorBody once, reuses for both checks)
- `partner/src/main/java/ai/dollor/partner/ui/auth/AuthViewModel.kt` - Added AuthState.RegistrationRequired, clearRegistrationState(), handled in googleSignIn + login onFailure
- `partner/src/main/java/ai/dollor/partner/ui/auth/LoginScreen.kt` - AlertDialog for RegistrationRequired state with Intent.ACTION_VIEW
- `driver/src/main/java/ai/dollor/driver/ui/auth/LoginViewModel.kt` - Added registrationUrl to LoginUiState, clearRegistrationPrompt(), handled in googleSignIn + login onFailure
- `driver/src/main/java/ai/dollor/driver/ui/auth/LoginScreen.kt` - AlertDialog for registrationUrl with Intent.ACTION_VIEW

## Decisions Made
- Used JSONResponse (not HTTPException) for 403 to include registration_url and requires_registration fields in JSON body -- HTTPException only supports `detail` string
- Partner app dismisses registration dialog via `clearRegistrationState()` which sets `AuthState.UnAuthenticated`, not `setError("")` which would show a blank red error card
- Driver app uses `clearRegistrationPrompt()` to clear both registrationUrl and error state in one call
- Handled registration-required in email/password login paths too (in addition to OAuth), since a user could email-login to vendor/driver endpoint without the right role

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exhaustive switch in restaurant LoginView.swift email/password login handler**
- **Found during:** Task 2 (iOS build)
- **Issue:** Restaurant LoginView.swift line 549 had an exhaustive `switch apiError` without `default` case. Adding `.registrationRequired` to P2PAPIError enum caused Swift compiler error.
- **Fix:** Added `.registrationRequired` case to the email/password login handler's switch block (3 total switch blocks in file; 2 already had `default:`).
- **Files modified:** apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift
- **Verification:** BUILD SUCCEEDED for all 3 iOS apps
- **Committed in:** debb2b39 (Task 2 commit)

**2. [Rule 1 - Bug] Updated test_driver_google_auth_invalid_token to accept 403**
- **Found during:** Task 1 (backend tests)
- **Issue:** Existing test sent a new email to driver Google auth expecting [200, 201, 400, 401, 422, 500] -- now returns 403 (correct new behavior).
- **Fix:** Added 403 to the acceptable status codes list.
- **Files modified:** apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py
- **Verification:** All 39 auth tests pass
- **Committed in:** 7b6358f3 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both were direct consequences of the planned changes (new enum case requires switch exhaustiveness, new 403 behavior invalidates old test expectation). No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend changes ready for staging deployment via CI/CD
- iOS builds ready for TestFlight upload (build numbers need incrementing)
- Android builds ready for Firebase App Distribution upload
- Registration URLs (dollor.ai/restaurant/apply, dollor.ai/driver/apply) need to be live web pages for the links to work

## Self-Check: PASSED
- 50-SUMMARY.md: FOUND
- 7b6358f3 (Task 1 backend): FOUND
- debb2b39 (Task 2 iOS): FOUND
- f1319a8a (Task 3 Android): FOUND
