---
phase: quick-43
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/AuthFlowTests.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/AuthFlowTests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift
autonomous: true
---

<objective>
Fix all 15 remaining iOS UI test failures (5 Driver + 10 Restaurant). Root causes: accessibilityLabel overrides, wrong tab names, persisted auth state, wrong filter enum.

Target: 216/216 pass (or 214/216 + 2 correct XCTSkips) across all 3 apps.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Fix 5 Driver UI test failures</name>
  <files>
    apps/ios/delivery/eatffairdeliveryUITests/Flows/AuthFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift
  </files>
  <action>
Fix 5 identifier mismatches — SwiftUI `.accessibilityLabel()` overrides button text:

**AuthFlowTests.swift line 56-57** — `testLogin_termsCheckbox_inSignUpMode`:
```
OLD: let termsText = app.staticTexts["Terms & Conditions"]
NEW: let termsText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Terms'")).firstMatch
```
The actual Toggle label is "I accept the Terms & Conditions", not standalone "Terms & Conditions".

**DeliveryFlowTests.swift line 19** — `testDashboard_tabBar_hasCorrectTabs`:
```
OLD: let ordersTab = app.tabBars.buttons["Orders"]
NEW: let ordersTab = app.tabBars.buttons["Delivery"]
```
The actual tab name is "Delivery" not "Orders" (from DriverDashboardView.swift).

**DriverProfileTests.swift line 21** — `testProfile_editButton_exists`:
```
OLD: let editButton = app.buttons["Edit"]
NEW: let editButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Edit'")).firstMatch
```
The accessibilityLabel is "Edit profile", not "Edit".

**DriverProfileTests.swift line 62-63** — also update `testProfile_personalTab_saveButton_exists`:
```
OLD: let editButton = app.buttons["Edit"]
NEW: let editButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Edit'")).firstMatch
```

**DriverProfileTests.swift line 118** — `testProfile_settingsTab_logoutButton_exists`:
```
OLD: let logoutButton = app.buttons["Logout"]
NEW: let logoutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Logout' OR label CONTAINS[c] 'Log Out' OR label CONTAINS[c] 'Sign Out'")).firstMatch
```
The accessibilityLabel is "Logout from account".

**DriverProfileTests.swift line 133** — `testProfile_settingsTab_deleteAccount_exists`:
```
OLD: let deleteButton = app.buttons["Delete Account"]
NEW: let deleteButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Delete Account' OR label CONTAINS[c] 'delete account'")).firstMatch
```
The accessibilityLabel is "Delete account permanently".

Also ensure these two assertions use `waitForExistence` properly (the current code for logout/delete uses hard XCTAssertTrue without if-guard).
  </action>
  <verify>
Build driver UI tests: `xcodebuild build-for-testing -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -destination 'platform=iOS Simulator,name=iPhone 16' -quiet 2>&1 | tail -5` shows BUILD SUCCEEDED.
  </verify>
  <done>
5 Driver test identifier mismatches fixed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix 10 Restaurant UI test failures</name>
  <files>
    apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/AuthFlowTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift
  </files>
  <action>
**ROOT CAUSE for 7 Auth test failures:** The app persists auth tokens in Keychain. When the test suite runs, if OrderManagement/Settings/Menu tests run first and call `ensureLoggedIn()`, the token is saved. When AuthFlowTests runs next, the app launches into the dashboard instead of the login screen. The restaurant `navigateToLogin()` only waits for brand title — it does NOT log out if already authenticated (unlike the customer app's implementation).

**Fix 1: Update restaurant `navigateToLogin()` in TestHelpers.swift** to handle logout-if-already-logged-in (same pattern as customer app):
```swift
func navigateToLogin() {
    // Check if we're already logged in (tab bar present = authenticated)
    let tabBar = app.tabBars.firstMatch
    if tabBar.waitForExistence(timeout: 3) {
        // Logged in -- navigate to Settings tab and sign out
        let settingsTab = app.tabBars.buttons["Settings"]
        if settingsTab.exists {
            settingsTab.tap()
            // Scroll down to find Sign Out button
            let scrollView = app.scrollViews.firstMatch
            if scrollView.waitForExistence(timeout: 3) {
                scrollView.swipeUp()
            }
            let signOutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Sign out' OR label CONTAINS[c] 'Sign Out' OR label CONTAINS[c] 'Log Out'")).firstMatch
            if signOutButton.waitForExistence(timeout: 5) {
                signOutButton.tap()
                // Handle confirmation alert if any
                let confirmButton = app.alerts.buttons.firstMatch
                if confirmButton.waitForExistence(timeout: 3) {
                    confirmButton.tap()
                }
            }
        }
    }
    // Wait for login screen identifiers
    _ = app.staticTexts["Dollor AI Restaurant"].waitForExistence(timeout: 5)
}
```

**Fix 2: Add `navigateToLogin()` to each auth test in AuthFlowTests.swift** — each test should call `navigateToLogin()` at the start to ensure we're on the login screen:
- testLogin_brandTitle_isDisplayed: add `navigateToLogin()` before the staticTexts check
- testLogin_emailPasswordFields_exist: add `navigateToLogin()` before field checks
- testLogin_loginButton_exists: add `navigateToLogin()` before button check
- testLogin_forgotPassword_opensSheet: add `navigateToLogin()` before forgot button check
- testLogin_signUp_opensRegistration: add `navigateToLogin()` before sign up check
- testLogin_googleAppleButtons_exist: add `navigateToLogin()` before button checks
- testRegistration_multiStep_navigation: add `navigateToLogin()` before sign up check

**Fix 3: Order filter tab** in OrderManagementTests.swift line 53:
```
OLD: let pendingTab = app.buttons["Pending"]
NEW: let newTab = app.buttons["New"]
```
The actual enum is `case new = "New"`, not `"Pending"`. Also update line 56 from `pendingTab` → `newTab`.

**Fix 4: Settings sign out/delete** in SettingsTests.swift:
For `testSettings_signOutButton_exists` (line 124): The predicate looks correct, but may need more scroll. Add extra `scrollView.swipeUp()` to ensure button is visible.
For `testSettings_deleteAccountButton_exists` (line 140): Already has double swipeUp. The predicate uses `CONTAINS[c]` which should match "Delete account" accessibilityLabel. May need triple swipe.

Actually, the more likely fix: the accessibilityLabel is "Sign out" (lowercase 'o') and "Delete account" (lowercase 'a'). The predicate already has `CONTAINS[c]` (case-insensitive) so that should match. The real issue may be that these tests are timing-dependent or the scroll doesn't go far enough. Add `scrollView.swipeUp()` one more time for both, and increase the wait timeout to 10s.
  </action>
  <verify>
Build restaurant UI tests: `xcodebuild build-for-testing -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -destination 'platform=iOS Simulator,name=iPhone 16' -quiet 2>&1 | tail -5` shows BUILD SUCCEEDED.
  </verify>
  <done>
10 Restaurant test failures fixed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Re-run both test suites and verify all green</name>
  <files></files>
  <action>
Run both test suites on simulator:

```bash
# Driver
xcodebuild test -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -destination 'platform=iOS Simulator,id=0C3822BC-A554-4674-AF7A-FED6148F441B' -only-testing:eatffairdeliveryUITests 2>&1 | tee /tmp/driver-ui-test-run-43.log

# Restaurant
xcodebuild test -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -destination 'platform=iOS Simulator,id=0C3822BC-A554-4674-AF7A-FED6148F441B' -only-testing:eatffairrestaurantUITests 2>&1 | tee /tmp/restaurant-ui-test-run-43.log
```

Analyze results. If any test still fails, investigate and fix. Iterate until both show `** TEST SUCCEEDED **` or all failures are pre-existing unrelated issues (not identifier mismatches).
  </action>
  <verify>
Both logs show pass counts matching or exceeding previous runs. No new failures introduced.
  </verify>
  <done>
Both Driver and Restaurant test suites verified.
  </done>
</task>

</tasks>
