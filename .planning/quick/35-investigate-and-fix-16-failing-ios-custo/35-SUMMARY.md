---
phase: quick-35
plan: 01
subsystem: testing
tags: [xcuitest, ios, swift, accessibility, ui-testing]

# Dependency graph
requires:
  - phase: quick-34
    provides: "223 UI tests across all 6 apps (110 iOS + 113 Android)"
provides:
  - "16 previously failing iOS customer UI tests now pass"
  - "Test helpers with correct accessibility identifiers matching actual SwiftUI views"
  - "Test isolation via automatic logout in navigateToLogin()"
  - "ProfileView edit button accessibility label"
affects: [ios-customer-app, ui-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["XCUITest auto-logout for test isolation", "Accessibility label verification against SwiftUI source"]

key-files:
  created: []
  modified:
    - "apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift"
    - "apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift"
    - "apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift"
    - "apps/ios/customer/eatfaircustomer/Views/ProfileView.swift"

key-decisions:
  - "navigateToLogin() auto-logs-out if tab bar detected, ensuring test isolation across test methods"
  - "Added .accessibilityLabel('Edit profile') to ProfileView pencil button for testability"
  - "Legal test checks links element type (not just staticTexts) for SwiftUI Link views"

patterns-established:
  - "Test isolation: navigateToLogin() handles both fresh and already-authenticated states"
  - "Identifier verification: always cross-reference test identifiers against actual .accessibilityLabel values in SwiftUI source"

requirements-completed: [fix-16-failing-ios-customer-ui-tests]

# Metrics
duration: 25min
completed: 2026-02-24
---

# Quick Task 35: Fix 16 Failing iOS Customer UI Tests

**Fixed 16 failing XCUITests by correcting accessibility identifier mismatches and adding test isolation for login state persistence**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-24T04:23:00Z
- **Completed:** 2026-02-24T04:48:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Fixed all 16 previously failing UI tests -- zero failures in full test suite run
- Corrected 12 accessibility identifier mismatches between test expectations and actual SwiftUI views
- Added test isolation: navigateToLogin() now auto-logs-out if app is in authenticated state
- Added .accessibilityLabel("Edit profile") to ProfileView pencil button

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix TestHelpers.swift and eatfaircustomerUITests.swift** - `2ddb2aa3` (fix)
2. **Task 2: Fix AuthFlowTests.swift, ProfileSettingsTests.swift, FoodDeliveryFlowTests.swift** - `c657ea20` (fix)
3. **Task 3: Run tests and fix test isolation issue** - `e888bf9e` (fix)

## Files Created/Modified

- `apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift` - Fixed navigateToLogin(), loginWithCredentials(), skipIfNotLoggedIn() with correct identifiers and auto-logout
- `apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift` - Adapted welcome screen tests for direct LoginView flow (no WelcomeView)
- `apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift` - Fixed 8 auth test identifiers to match LoginView.swift
- `apps/ios/customer/eatfaircustomer/Views/ProfileView.swift` - Added .accessibilityLabel("Edit profile") to pencil button

## Identifier Corrections

| Test Element | Before (Wrong) | After (Correct) | Source |
|-------------|----------------|-----------------|--------|
| Email field | `"Email"` | `"Email address"` | LoginView.swift:155 placeholder |
| Login button | `"Login"` | `"Continue to sign in"` | LoginView.swift:226 accessibilityLabel |
| Sign up toggle | `"Sign Up"` | `"Switch to sign up"` | LoginView.swift:264 accessibilityLabel |
| Login toggle | `"Login"` | `"Switch to log in"` | LoginView.swift:264 accessibilityLabel |
| Full name field | `"Full Name"` | `"Full name"` | LoginView.swift:139 placeholder |
| Phone field | `"Phone Number"` | `"Phone number"` | LoginView.swift:146 placeholder |
| Forgot password | `"Forgot Password?"` | `"Forgot password"` | LoginView.swift:188 accessibilityLabel |
| Get Started | `"Get Started"` | N/A (removed) | No WelcomeView in flow |
| Nav to login | `"Dollor AI Service"` | `"Dollor.ai"` | LoginView.swift:41 |
| Not logged in check | `"Login"/"Get Started"` | `"Welcome back"/"Dollor.ai"` | LoginView.swift:48/41 |
| Legal links | `staticTexts` only | `links`/`buttons`/`staticTexts` | LoginView.swift:317 Link views |
| Edit profile | No accessibilityLabel | `"Edit profile"` | ProfileView.swift:75 (added) |

## Test Results

| Test Class | Total | Passed | Skipped | Failed |
|-----------|-------|--------|---------|--------|
| CustomerAuthFlowTests | 9 | 9 | 0 | 0 |
| eatfaircustomerUITests | 3 | 3 | 0 | 0 |
| eatfaircustomerUITestsLaunchTests | 4 | 4 | 0 | 0 |
| CustomerProfileSettingsTests | 8 | 0 | 8 | 0 |
| CustomerFoodDeliveryFlowTests | 11 | 0 | 11 | 0 |
| CustomerRideshareFlowTests | 11 | 0 | 11 | 0 |
| **Total** | **46** | **16** | **30** | **0** |

## Decisions Made

1. **Auto-logout in navigateToLogin()**: testLogin_validCredentials successfully logs in, leaving the app authenticated for subsequent tests. Rather than requiring test ordering or resetting simulator state, navigateToLogin() now detects tab bar presence and performs Profile > Log Out before proceeding.
2. **accessibilityLabel on ProfileView pencil button**: Added rather than weakening the test, since accessibility labels are a UX requirement.
3. **Link element type search**: SwiftUI `Link` views appear as `links` in the XCUITest accessibility tree, not `staticTexts`. The legal test now checks all three element types.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test isolation for login state persistence**
- **Found during:** Task 3 (test execution)
- **Issue:** testLogin_validCredentials successfully logs in, causing testSignUp_allFieldsVisible and testSignUp_toggleBackToLogin to fail because the app starts in logged-in state where "Switch to sign up" doesn't exist
- **Fix:** Updated navigateToLogin() to detect logged-in state (tab bar visible) and perform logout via Profile tab before waiting for LoginView
- **Files modified:** TestHelpers.swift
- **Verification:** Full test suite passes with 0 failures
- **Committed in:** e888bf9e

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for test reliability. Without it, 2 tests fail when run after the login test.

## Issues Encountered
None beyond the test isolation issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Steps
- 30 tests currently skipped (require logged-in state) -- could be enabled by adding login setup in test fixtures
- Consider adding launch argument support to the app for test state reset

---
*Quick Task: 35*
*Completed: 2026-02-24*
