---
phase: quick-37
plan: 01
subsystem: testing
tags: [ios, ui-tests, xctest, demo-credentials, xcskip]

# Dependency graph
requires:
  - phase: quick-34
    provides: UI test infrastructure with DollorTestCase, skipIfNotLoggedIn(), loginWithCredentials()
provides:
  - ensureLoggedIn() method in all 3 iOS app test helpers with demo auto-login
  - 88 flow tests converted from skip-on-no-auth to auto-login-and-execute
affects: [ios-testing, quick-35]

# Tech tracking
tech-stack:
  added: []
  patterns: [ensureLoggedIn with XCTSkip fallback, demo credential constants as static class properties]

key-files:
  modified:
    - apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
    - apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift
    - apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
    - apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
    - apps/ios/customer/eatfaircustomerUITests/Flows/RideshareFlowTests.swift
    - apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
    - apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift
    - apps/ios/delivery/eatffairdeliveryUITests/Flows/RideshareDriverFlowTests.swift
    - apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift
    - apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift
    - apps/ios/restaurant/eatffairrestaurantUITests/Flows/MenuManagementTests.swift
    - apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift

key-decisions:
  - "Keep skipIfNotLoggedIn() method intact for backward compatibility -- only replaced call sites"
  - "Each app uses app-specific login detection: customer checks tab bar, driver/restaurant check login screen elements"
  - "15-second post-login timeout to account for staging API network latency"

patterns-established:
  - "ensureLoggedIn() pattern: check-if-logged-in, login-with-demo-creds, XCTSkip-on-failure"
  - "Demo credentials as private static constants on DollorTestCase class"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-02-24
---

# Quick Task 37: Wire Demo Credentials Summary

**Auto-login with demo credentials (ensureLoggedIn) replaces 88 skipIfNotLoggedIn calls across 9 flow test files in all 3 iOS apps**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-24T05:01:36Z
- **Completed:** 2026-02-24T05:11:49Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Added `ensureLoggedIn()` method to all 3 iOS app TestHelpers.swift with app-specific demo credentials and login detection
- Replaced all 88 `try skipIfNotLoggedIn()` calls with `try ensureLoggedIn()` across 9 flow test files
- Customer and Restaurant UI test targets compile successfully; Driver UI test build has pre-existing unit test errors (unrelated to changes)
- Flow tests now auto-login with demo credentials instead of skipping, with graceful XCTSkip fallback if staging is unreachable

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ensureLoggedIn() to all 3 TestHelpers.swift files** - `da481b2c` (feat)
2. **Task 2: Replace all skipIfNotLoggedIn() calls with ensureLoggedIn() in 9 flow test files** - `2d4dc919` (feat)
3. **Task 3: Build all 3 UI test targets to verify compilation** - (verification only, no code changes)

## Files Created/Modified
- `apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift` - Added demo customer credentials + ensureLoggedIn() with tab bar detection
- `apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift` - Added demo driver credentials + ensureLoggedIn() with login screen detection
- `apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift` - Added demo restaurant credentials + ensureLoggedIn() with brand title detection
- `apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift` - 12 replacements
- `apps/ios/customer/eatfaircustomerUITests/Flows/RideshareFlowTests.swift` - 11 replacements
- `apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift` - 8 replacements
- `apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift` - 10 replacements
- `apps/ios/delivery/eatffairdeliveryUITests/Flows/RideshareDriverFlowTests.swift` - 14 replacements
- `apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift` - 8 replacements
- `apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift` - 9 replacements
- `apps/ios/restaurant/eatffairrestaurantUITests/Flows/MenuManagementTests.swift` - 6 replacements
- `apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift` - 10 replacements

## Decisions Made
- Kept `skipIfNotLoggedIn()` method definitions intact in all 3 TestHelpers.swift for backward compatibility -- only replaced call sites in flow test files
- Each app uses app-specific login detection logic: customer checks for tab bar presence, driver checks for "Login" button / "Driver Login" text, restaurant checks for "Log In" button / "Dollor AI Restaurant" text
- 15-second post-login timeout to account for staging API network latency
- Demo credentials stored as `private static` constants (not exposed outside test case class)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Driver `build-for-testing` fails due to pre-existing unit test errors in `eatffairdeliveryTests.swift` (missing `EarningsBreakdown` and `DailyEarning` types in scope). This is unrelated to quick-37 changes -- the UI test target (`eatffairdeliveryUITests`) compiles without errors. The unit test errors are from a previous task that modified driver model types.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 88 flow tests across 3 apps are now wired to auto-login with demo credentials
- Tests will execute through auth gate when run against staging API
- If staging is down or credentials are invalid, tests gracefully XCTSkip with descriptive message
- Pre-existing driver unit test compilation error should be fixed separately (missing EarningsBreakdown/DailyEarning types)

## Self-Check: PASSED

- All 12 modified files: FOUND
- Summary file: FOUND
- Commit da481b2c (Task 1): FOUND
- Commit 2d4dc919 (Task 2): FOUND

---
*Phase: quick-37*
*Completed: 2026-02-24*
