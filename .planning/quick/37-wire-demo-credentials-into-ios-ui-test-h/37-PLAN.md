---
phase: quick-37
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
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
autonomous: true
requirements: []

must_haves:
  truths:
    - "Flow tests auto-login with demo credentials instead of skipping"
    - "If demo login fails (staging down, creds invalid), tests XCTSkip with descriptive message rather than hard-fail"
    - "Tests that were previously skipped now execute through auth gate"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift"
      provides: "ensureLoggedIn() with customer demo creds"
      contains: "demo.customer@dollor.ai"
    - path: "apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift"
      provides: "ensureLoggedIn() with driver demo creds"
      contains: "demo.driver@dollor.ai"
    - path: "apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift"
      provides: "ensureLoggedIn() with restaurant demo creds"
      contains: "demo.restaurant@dollor.ai"
  key_links:
    - from: "Flow test files (9 files)"
      to: "TestHelpers.swift ensureLoggedIn()"
      via: "try ensureLoggedIn() call replacing try skipIfNotLoggedIn()"
      pattern: "try ensureLoggedIn\\(\\)"
---

<objective>
Wire demo credentials into all 3 iOS app UI test helpers and replace 88 `skipIfNotLoggedIn()` calls with `ensureLoggedIn()` across 9 flow test files.

Purpose: Currently 88 flow tests are skipped because they call `skipIfNotLoggedIn()` which throws XCTSkip when no user is authenticated. By adding `ensureLoggedIn()` that auto-logs in with demo credentials, these tests will actually execute and validate UI flows.

Output: 3 updated TestHelpers.swift files with `ensureLoggedIn()` method, 9 updated flow test files with replaced calls.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
@apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift
@apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ensureLoggedIn() to all 3 TestHelpers.swift files</name>
  <files>
    apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
    apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
  </files>
  <action>
Add demo credential constants and `ensureLoggedIn()` method to each app's `DollorTestCase` class. Keep `skipIfNotLoggedIn()` intact (not removing, just deprecating in practice).

**Customer TestHelpers.swift** (apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift):
Add after the `// MARK: - Navigation Helpers` section, before `navigateToLogin()`:

```swift
// MARK: - Demo Credentials

private static let demoEmail = "demo.customer@dollor.ai"
private static let demoPassword = "DemoCustomer2025!"
```

Add `ensureLoggedIn()` method after `skipIfNotLoggedIn()`:

```swift
/// Ensures the app is in a logged-in state using demo credentials.
/// If already logged in (tab bar visible), does nothing.
/// If on login screen, logs in with demo customer credentials.
/// If login fails (server down, invalid creds), throws XCTSkip.
func ensureLoggedIn() throws {
    // Check if already logged in (tab bar = authenticated)
    let tabBar = app.tabBars.firstMatch
    if tabBar.waitForExistence(timeout: 5) {
        return // Already logged in
    }

    // Not logged in -- attempt login with demo credentials
    loginWithCredentials(email: Self.demoEmail, password: Self.demoPassword)

    // Wait for tab bar to confirm successful auth
    let loggedInTabBar = app.tabBars.firstMatch
    if !loggedInTabBar.waitForExistence(timeout: 15) {
        throw XCTSkip("Demo login failed -- staging may be unreachable (demo.customer@dollor.ai)")
    }
}
```

**Driver TestHelpers.swift** (apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift):
Add demo credential constants:

```swift
// MARK: - Demo Credentials

private static let demoEmail = "demo.driver@dollor.ai"
private static let demoPassword = "DemoDriver2025!"
```

Add `ensureLoggedIn()` method after `skipIfNotLoggedIn()`. The driver app detects logged-in state differently -- check for the Login button/text NOT being present, and look for driver-specific UI (tab bar or dashboard elements):

```swift
/// Ensures the app is in a logged-in state using demo credentials.
/// If already logged in (no login screen visible), does nothing.
/// If on login screen, logs in with demo driver credentials.
/// If login fails, throws XCTSkip.
func ensureLoggedIn() throws {
    // Check if already on login screen
    let loginButton = app.buttons["Login"]
    let driverLoginText = app.staticTexts["Driver Login"]
    let onLoginScreen = loginButton.waitForExistence(timeout: 3) || driverLoginText.waitForExistence(timeout: 1)

    if !onLoginScreen {
        return // Already logged in
    }

    // On login screen -- attempt login with demo credentials
    loginWithCredentials(email: Self.demoEmail, password: Self.demoPassword)

    // Verify login succeeded -- login screen elements should disappear
    // Wait a moment for navigation, then check login screen is gone
    let tabBar = app.tabBars.firstMatch
    let stillOnLogin = driverLoginText.waitForExistence(timeout: 15)
    if stillOnLogin && !tabBar.exists {
        throw XCTSkip("Demo login failed -- staging may be unreachable (demo.driver@dollor.ai)")
    }
}
```

**Restaurant TestHelpers.swift** (apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift):
Add demo credential constants:

```swift
// MARK: - Demo Credentials

private static let demoEmail = "demo.restaurant@dollor.ai"
private static let demoPassword = "DemoRestaurant2025!"
```

Add `ensureLoggedIn()` method after `skipIfNotLoggedIn()`:

```swift
/// Ensures the app is in a logged-in state using demo credentials.
/// If already logged in (no login screen visible), does nothing.
/// If on login screen, logs in with demo restaurant credentials.
/// If login fails, throws XCTSkip.
func ensureLoggedIn() throws {
    // Check if already on login screen
    let loginButton = app.buttons["Log In"]
    let brandTitle = app.staticTexts["Dollor AI Restaurant"]
    let onLoginScreen = loginButton.waitForExistence(timeout: 3) || brandTitle.waitForExistence(timeout: 1)

    if !onLoginScreen {
        return // Already logged in
    }

    // On login screen -- attempt login with demo credentials
    loginWithCredentials(email: Self.demoEmail, password: Self.demoPassword)

    // Verify login succeeded -- login screen elements should disappear
    let tabBar = app.tabBars.firstMatch
    let stillOnLogin = brandTitle.waitForExistence(timeout: 15)
    if stillOnLogin && !tabBar.exists {
        throw XCTSkip("Demo login failed -- staging may be unreachable (demo.restaurant@dollor.ai)")
    }
}
```

IMPORTANT NOTES:
- Customer app's `loginWithCredentials()` already calls `navigateToLogin()` internally, which handles logout-if-needed. So `ensureLoggedIn()` does NOT need to call `navigateToLogin()` separately for customer -- only call `loginWithCredentials()`.
- Driver and restaurant `loginWithCredentials()` also call `navigateToLogin()` internally.
- The timeout for post-login verification should be 15 seconds to account for network latency to staging API.
- Keep `skipIfNotLoggedIn()` method in place -- do not delete it. It may still be useful for manual/local test runs.
  </action>
  <verify>
Each TestHelpers.swift file compiles with `ensureLoggedIn()` method present. Grep confirms: `grep -n "ensureLoggedIn\|demoEmail\|demoPassword" apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift`
  </verify>
  <done>
All 3 TestHelpers.swift files have demo credential constants and `ensureLoggedIn()` method that: (1) returns immediately if already logged in, (2) calls loginWithCredentials with app-specific demo creds if on login screen, (3) throws XCTSkip with descriptive message if login fails.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace all skipIfNotLoggedIn() calls with ensureLoggedIn() in 9 flow test files</name>
  <files>
    apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/RideshareFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/RideshareDriverFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/MenuManagementTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift
  </files>
  <action>
In all 9 flow test files, perform a straight text replacement:

Replace: `try skipIfNotLoggedIn()`
With: `try ensureLoggedIn()`

This is a 1:1 replacement -- same line, same position, same `try` prefix. No other changes needed in these files.

**Expected replacement counts per file:**
- Customer FoodDeliveryFlowTests.swift: 12 replacements
- Customer RideshareFlowTests.swift: 11 replacements
- Customer ProfileSettingsTests.swift: 8 replacements
- Driver DeliveryFlowTests.swift: 10 replacements
- Driver RideshareDriverFlowTests.swift: 14 replacements
- Driver DriverProfileTests.swift: 8 replacements
- Restaurant OrderManagementTests.swift: 9 replacements
- Restaurant MenuManagementTests.swift: 6 replacements
- Restaurant SettingsTests.swift: 10 replacements
- **Total: 88 replacements**

After replacement, verify zero remaining `skipIfNotLoggedIn()` calls in flow test files (only the method definition in TestHelpers.swift should remain).
  </action>
  <verify>
Run: `grep -rn "skipIfNotLoggedIn" apps/ios/*/eatfair*UITests/Flows/` -- should return zero results.
Run: `grep -c "ensureLoggedIn" apps/ios/*/eatfair*UITests/Flows/*.swift` -- should show 88 total across 9 files.
Run: `grep -rn "skipIfNotLoggedIn" apps/ios/*/eatfair*UITests/Helpers/TestHelpers.swift` -- should show exactly 3 results (one definition per app, kept for backward compatibility).
  </verify>
  <done>
All 88 `try skipIfNotLoggedIn()` calls replaced with `try ensureLoggedIn()` across 9 flow test files. Zero `skipIfNotLoggedIn()` calls remain in flow test files. The method definitions remain in TestHelpers.swift for backward compatibility.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build all 3 UI test targets to verify compilation</name>
  <files></files>
  <action>
Build (not run) the UI test targets for all 3 apps to confirm the changes compile without errors. Use `xcodebuild build-for-testing` which compiles both the app and test targets without running tests.

```bash
# Customer UI tests
xcodebuild build-for-testing \
  -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatfaircustomer \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -quiet 2>&1 | tail -5

# Driver UI tests
xcodebuild build-for-testing \
  -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairdelivery \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -quiet 2>&1 | tail -5

# Restaurant UI tests
xcodebuild build-for-testing \
  -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairrestaurant \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -quiet 2>&1 | tail -5
```

All 3 should show `** BUILD SUCCEEDED **`. If any fail, fix the compilation error (likely a typo or missing method reference) and re-build.

NOTE: If restaurant scheme is not found in workspace, use `-project apps/ios/restaurant/eatffairrestaurant.xcodeproj` instead of `-workspace`.
  </action>
  <verify>
All 3 `xcodebuild build-for-testing` commands succeed with `** BUILD SUCCEEDED **`.
  </verify>
  <done>
All 3 iOS app UI test targets compile successfully with the new `ensureLoggedIn()` method and all 88 call site replacements.
  </done>
</task>

</tasks>

<verification>
1. `grep -rn "ensureLoggedIn" apps/ios/` shows method definition in 3 TestHelpers.swift files + 88 call sites in 9 flow files = 91 total matches
2. `grep -rn "skipIfNotLoggedIn" apps/ios/*/eatfair*UITests/Flows/` returns zero results
3. `grep -rn "skipIfNotLoggedIn" apps/ios/*/eatfair*UITests/Helpers/` returns exactly 3 results (definitions preserved)
4. `grep -rn "demo.*@dollor.ai" apps/ios/*/eatfair*UITests/Helpers/TestHelpers.swift` returns 3 results (one per app with correct email)
5. All 3 UI test targets build successfully
</verification>

<success_criteria>
- 3 TestHelpers.swift files each have: demo credential constants, ensureLoggedIn() method
- 88 skipIfNotLoggedIn() calls replaced with ensureLoggedIn() across 9 flow test files
- Zero skipIfNotLoggedIn() calls remain in flow test files
- All 3 app UI test targets compile without errors
- ensureLoggedIn() gracefully XCTSkips (not hard-fails) if demo login fails
</success_criteria>

<output>
After completion, create `.planning/quick/37-wire-demo-credentials-into-ios-ui-test-h/37-SUMMARY.md`
</output>
