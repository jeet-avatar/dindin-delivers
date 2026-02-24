---
phase: quick-35
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
  - apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
autonomous: true
requirements: [fix-16-failing-ios-customer-ui-tests]

must_haves:
  truths:
    - "All 16 previously failing UI tests pass when run against the actual app"
    - "Test identifiers exactly match SwiftUI accessibility labels/placeholder text in the app views"
    - "Tests correctly handle the app flow: MainAppView shows LoginView directly (no WelcomeView)"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift"
      provides: "Fixed navigateToLogin() and skipIfNotLoggedIn() helpers"
    - path: "apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift"
      provides: "Fixed auth flow tests with correct identifiers"
    - path: "apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift"
      provides: "Fixed welcome screen tests matching actual app behavior"
  key_links:
    - from: "TestHelpers.swift navigateToLogin()"
      to: "LoginView.swift UI hierarchy"
      via: "accessibility labels and placeholder text"
      pattern: "Email address|Password|Continue"
    - from: "AuthFlowTests button identifiers"
      to: "LoginView.swift accessibilityLabel values"
      via: "exact string matching"
      pattern: "Sign in with Apple|Sign in with Google|Forgot password"
---

<objective>
Fix 16 failing iOS Customer UI tests by correcting accessibility identifier mismatches between test expectations and actual SwiftUI views.

Purpose: The tests were written from an audit document and assumed button/field labels that don't match the real LoginView.swift, ProfileView.swift, and HomeView.swift. The app also doesn't show WelcomeView at all -- MainAppView goes directly to LoginView when unauthenticated.

Output: All 16 tests pass (or skip gracefully for login-required tests).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/customer/eatfaircustomer/Views/LoginView.swift
@apps/ios/customer/eatfaircustomer/Views/MainAppView.swift
@apps/ios/customer/eatfaircustomer/Views/WelcomeView.swift
@apps/ios/customer/eatfaircustomer/Views/ProfileView.swift
@apps/ios/customer/eatfaircustomer/Views/HomeView.swift
@apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
@apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift
@apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
@apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
@apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix TestHelpers.swift and eatfaircustomerUITests.swift (base helpers + welcome tests)</name>
  <files>
    apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
    apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
  </files>
  <action>
**ROOT CAUSE:** MainAppView.swift:150-152 shows `LoginView(authViewModel: authViewModel)` directly when not authenticated. There is NO WelcomeView in the flow. The "Get Started" button never appears.

**Fix TestHelpers.swift `navigateToLogin()`:**
The current implementation tries to tap "Get Started" or "I already have an account" buttons. Since the app goes directly to LoginView, `navigateToLogin()` should simply wait for the login screen to appear. The login screen is identifiable by the "Dollor.ai" static text (LoginView.swift:42) or the "Welcome back" text (LoginView.swift:48).

Replace `navigateToLogin()` body with:
```swift
func navigateToLogin() {
    // App goes directly to LoginView when not authenticated (no WelcomeView in flow)
    // Wait for login screen identifiers
    let welcomeBackText = app.staticTexts["Welcome back"]
    let dollorText = app.staticTexts["Dollor.ai"]
    _ = welcomeBackText.waitForExistence(timeout: 5) || dollorText.waitForExistence(timeout: 3)
}
```

**Fix TestHelpers.swift `loginWithCredentials()`:**
- Change `app.textFields["Email"]` to `app.textFields["Email address"]` (placeholder in AuthTextField at LoginView.swift:155)
- Change `app.secureTextFields["Password"]` to `app.secureTextFields["Password"]` (this one is correct -- SecureField placeholder at LoginView.swift:385)
- Change `app.buttons["Login"]` to a predicate matching the actual button. The login button has `accessibilityLabel("Continue to sign in")` (LoginView.swift:226). Use: `app.buttons["Continue to sign in"]`

**Fix TestHelpers.swift `skipIfNotLoggedIn()`:**
Current check: `app.buttons["Login"]` or `app.buttons["Get Started"]`. Neither exists. Replace with:
```swift
func skipIfNotLoggedIn() throws {
    // Check if we're on the login screen (LoginView shows "Welcome back" or "Dollor.ai")
    let welcomeBack = app.staticTexts["Welcome back"]
    let createAccount = app.staticTexts["Create your account"]
    let dollorLogo = app.staticTexts["Dollor.ai"]
    if welcomeBack.waitForExistence(timeout: 3) || createAccount.exists || dollorLogo.exists {
        throw XCTSkip("Test requires logged-in state")
    }
}
```

**Fix eatfaircustomerUITests.swift:**

`testWelcomeScreen_appNameIsDisplayed()` -- This actually should work since LoginView.swift:42 shows `Text("Dollor.ai")`. Keep as-is (it checks `app.staticTexts["Dollor.ai"]`).

`testWelcomeScreen_getStartedButton_isDisplayed()` -- "Get Started" doesn't exist. The app now shows LoginView directly. Convert to test the actual login screen entry point. Replace with a test that verifies the login screen is displayed:
```swift
@MainActor
func testWelcomeScreen_getStartedButton_isDisplayed() throws {
    // App now goes directly to LoginView (no WelcomeView in current flow)
    // Verify the login screen is displayed with its primary action button
    let continueButton = app.buttons["Continue to sign in"]
    XCTAssertTrue(continueButton.waitForExistence(timeout: 5), "Login continue button should be displayed")
    XCTAssertTrue(continueButton.isEnabled, "Login continue button should be enabled")
}
```

`testWelcomeScreen_getStartedClick_navigatesToLogin()` -- Already on login screen. Convert to test that login screen elements are present:
```swift
@MainActor
func testWelcomeScreen_getStartedClick_navigatesToLogin() throws {
    // App goes directly to LoginView -- verify login screen has key elements
    let dollorText = app.staticTexts["Dollor.ai"]
    XCTAssertTrue(dollorText.waitForExistence(timeout: 5), "Dollor.ai title should be on login screen")

    let welcomeBack = app.staticTexts["Welcome back"]
    XCTAssertTrue(welcomeBack.exists, "Welcome back text should be displayed")
}
```
  </action>
  <verify>Build the UI test target to confirm no compile errors: `xcodebuild build-for-testing -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:eatfaircustomerUITests 2>&1 | tail -5`</verify>
  <done>TestHelpers.swift helpers use correct identifiers matching LoginView.swift. Welcome screen tests adapted to actual app flow (LoginView shown directly). No compile errors.</done>
</task>

<task type="auto">
  <name>Task 2: Fix AuthFlowTests.swift, ProfileSettingsTests.swift, and FoodDeliveryFlowTests.swift</name>
  <files>
    apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
  </files>
  <action>
**Fix AuthFlowTests.swift -- 8 failing tests:**

All auth tests call `navigateToLogin()` first (fixed in Task 1). Now fix the individual test identifiers:

1. `testLogin_validCredentials_navigatesToHome()`:
   - `app.textFields["Email"]` -> `app.textFields["Email address"]` (LoginView.swift:155 placeholder)
   - `app.secureTextFields["Password"]` stays as-is (LoginView.swift:385 placeholder is "Password")
   - `app.buttons["Login"]` -> `app.buttons["Continue to sign in"]` (LoginView.swift:226 accessibilityLabel)

2. `testLogin_emptyFields_showsError()`:
   - `app.buttons["Login"]` -> `app.buttons["Continue to sign in"]`
   - Error detection: Keep predicate-based search for error/required/enter text, but ALSO check for the inline email validation error text that LoginView shows (LoginView.swift:162-166 shows emailError). The `EmailValidator.validate("")` will return an error message. Add check for `app.staticTexts` containing "email" or "valid".

3. `testLogin_invalidEmail_showsValidation()`:
   - `app.textFields["Email"]` -> `app.textFields["Email address"]`
   - `app.secureTextFields["Password"]` stays
   - `app.buttons["Login"]` -> `app.buttons["Continue to sign in"]`
   - Validation text: LoginView.swift:162-166 shows inline error from `EmailValidator`. The predicate searching for "valid"/"email"/"error" should work.

4. `testSignUp_allFieldsVisible()`:
   - `app.buttons["Sign Up"]` -> Use predicate: `app.buttons["Switch to sign up"]` (LoginView.swift:264 accessibilityLabel)
   - `app.textFields["Full Name"]` -> `app.textFields["Full name"]` (LoginView.swift:139 placeholder, lowercase 'n')
   - `app.textFields["Phone Number"]` -> `app.textFields["Phone number"]` (LoginView.swift:147 placeholder, lowercase 'n')
   - `app.textFields["Email"]` -> `app.textFields["Email address"]`
   - `app.secureTextFields["Password"]` stays

5. `testSignUp_toggleBackToLogin()`:
   - `app.buttons["Sign Up"]` -> `app.buttons["Switch to sign up"]`
   - `app.textFields["Full Name"]` -> `app.textFields["Full name"]`
   - `app.buttons["Login"]` (toggle back) -> `app.buttons["Switch to log in"]` (LoginView.swift:264 accessibilityLabel when isSignUp=true)
   - `app.textFields["Full Name"]` (hidden check) -> `app.textFields["Full name"]`

6. `testForgotPassword_opensSheet()`:
   - `app.buttons["Forgot Password?"]` -> `app.buttons["Forgot password"]` (LoginView.swift:188 accessibilityLabel -- no question mark, lowercase 'p')
   - `app.staticTexts["Reset Password"]` stays -- ForgotPasswordView.swift:439 shows `Text("Reset Password")`

7. `testGoogleSignIn_buttonExists()` (NOT failing but verify):
   - `app.buttons["Sign in with Google"]` matches LoginView.swift:113 accessibilityLabel. Should pass.

8. `testAppleSignIn_buttonExists()` (NOT failing but verify):
   - `app.buttons["Sign in with Apple"]` matches LoginView.swift:83 accessibilityLabel. Should pass.

9. `testLegalAcceptance_allDocumentsPresent()`:
   - `app.buttons["Sign Up"]` -> `app.buttons["Switch to sign up"]`
   - LoginView.swift:317-324 has `Link("Terms of Use", ...)` and `Link("Privacy Policy", ...)` as footer links. These are `Link` views, which may not appear as `staticTexts`. They appear as buttons or links in the accessibility tree. Change the predicate to search `app.buttons` OR `app.links` in addition to `app.staticTexts`:
   ```swift
   let termsLink = app.links.containing(NSPredicate(format: "label CONTAINS[c] 'terms'")).firstMatch
   let privacyLink = app.links.containing(NSPredicate(format: "label CONTAINS[c] 'privacy'")).firstMatch
   let termsButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'terms'")).firstMatch
   let termsText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'terms'")).firstMatch

   let hasLegal = termsLink.waitForExistence(timeout: 5) || termsButton.exists || termsText.exists || privacyLink.exists
   ```
   NOTE: The footer links ("Terms of Use" / "Privacy Policy") are ALWAYS visible on LoginView, not just in sign-up mode. The test toggles to sign-up mode unnecessarily but that doesn't hurt. The key fix is searching `links` element type.

**Fix ProfileSettingsTests.swift -- 3 failing tests:**

All 3 use `skipIfNotLoggedIn()` (fixed in Task 1). If not logged in, they'll skip gracefully. The remaining logic when logged in:

10. `testProfile_editProfileButton_exists()`:
    - ProfileView.swift:75 has a `Button` with `Image(systemName: "pencil.circle.fill")`. This has no explicit text label or accessibilityLabel. The predicate searches for "edit" or "Edit" -- the pencil icon button won't match. Two options: (a) add `.accessibilityLabel("Edit profile")` to the button in ProfileView.swift, or (b) change the test to look for the pencil icon button differently. PREFERRED: Add `.accessibilityLabel("Edit profile")` to the button in ProfileView.swift:75 since the test is checking correct UX. Add file `apps/ios/customer/eatfaircustomer/Views/ProfileView.swift` to files_modified.

11. `testProfile_signOutButton_exists()`:
    - ProfileView.swift:198 has `Text("Log Out")`. The test searches for "sign out"/"Sign Out"/"logout"/"Log Out". "Log Out" should match the predicate `label CONTAINS[c] 'Log Out'`. This should pass IF the scroll finds it. The test swipes up once on scrollView. May need to also handle the case where ProfileView is in a NavigationView + ScrollView hierarchy. Keep as-is -- should work.

12. `testProfile_deleteAccountButton_exists()`:
    - ProfileView.swift:324 has `Text("Delete Account")`. Test searches for "Delete Account"/"delete account". Should match. The test swipes up twice. Should work if scroll reaches it.

**Fix FoodDeliveryFlowTests.swift -- 1 failing test:**

13. `testHome_categoryButtons_areDisplayed()`:
    - Uses `skipIfNotLoggedIn()` (fixed in Task 1). When logged in, HomeView.swift shows "Food" (line 214) and "Ride" (line 224) as service option titles. The test predicate looks for "food" or "restaurant" -- "Food" matches case-insensitive. HOWEVER: if categories haven't loaded from the API, `viewModel.availableCuisines` could be empty and the Categories section won't render.
    - The more reliable element is the `ServiceOptionCard` "Food" text. Change the predicate to also match the exact service card text:
    ```swift
    let foodText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'food' OR label CONTAINS[c] 'restaurant' OR label CONTAINS[c] 'Food'")).firstMatch
    ```
    Actually the existing predicate already matches "Food" case-insensitive. The issue is likely just that the test requires login. If `skipIfNotLoggedIn()` is fixed, this will correctly skip when not logged in.

**ALSO add ProfileView.swift to fix edit profile accessibility:**
In ProfileView.swift, find the edit profile button (line 75, `Button(action: { showEditProfile = true })`) and add:
```swift
.accessibilityLabel("Edit profile")
```
right after the closing brace of the Button's label (after line 81, `}` closing the button content).
  </action>
  <verify>Build the UI test target: `xcodebuild build-for-testing -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:eatfaircustomerUITests 2>&1 | tail -5`</verify>
  <done>All 16 failing test identifiers corrected to match actual SwiftUI view hierarchy. Auth tests use "Email address", "Continue to sign in", "Switch to sign up", "Switch to log in", "Forgot password", "Full name", "Phone number". Profile edit button has accessibilityLabel. Legal test checks links element type. Tests compile without errors.</done>
</task>

<task type="auto">
  <name>Task 3: Run tests on simulator and verify all 16 pass or skip correctly</name>
  <files>
    apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
  </files>
  <action>
Run the specific failing test classes on the iOS Simulator to verify fixes:

```bash
xcodebuild test \
  -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatfaircustomer \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:eatfaircustomerUITests/CustomerAuthFlowTests \
  -only-testing:eatfaircustomerUITests/CustomerProfileSettingsTests \
  -only-testing:eatfaircustomerUITests/CustomerFoodDeliveryFlowTests \
  -only-testing:eatfaircustomerUITests/eatfaircustomerUITests \
  -resultBundlePath /tmp/ui-test-results \
  2>&1 | grep -E 'Test Case|passed|failed|SKIPPED|BUILD'
```

**Expected results:**
- Auth flow tests that don't require login (testLogin_emptyFields, testLogin_invalidEmail, testSignUp_allFieldsVisible, testSignUp_toggleBackToLogin, testForgotPassword_opensSheet, testLegalAcceptance_allDocumentsPresent, testGoogleSignIn_buttonExists, testAppleSignIn_buttonExists): PASS
- testLogin_validCredentials_navigatesToHome: PASS if staging API reachable, may timeout otherwise
- Profile tests (editProfile, signOut, deleteAccount): SKIP (requires logged-in state)
- Food delivery test (categoryButtons): SKIP (requires logged-in state)
- Welcome/root tests (getStartedButton, getStartedClick, appNameIsDisplayed): PASS

**If any test fails**, diagnose by reading the failure message. Common fixes:
- If `textFields["Email address"]` not found: The AuthTextField component might expose the placeholder differently. Try `app.textFields.element(boundBy: 0)` as fallback, or search by predicate `label CONTAINS[c] 'email'`.
- If `buttons["Continue to sign in"]` not found: The accessibilityLabel might be overridden by the button text. Try `app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'continue' OR label CONTAINS[c] 'Continue'")).firstMatch`.
- If `buttons["Switch to sign up"]` not found: Try `app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'sign up' OR label CONTAINS[c] 'Sign up'")).firstMatch`.

Apply any needed adjustments and re-run until all pass.
  </action>
  <verify>All test output shows 0 failures for the 16 previously failing tests (passed or skipped is acceptable)</verify>
  <done>All 16 previously failing tests either pass or skip with XCTSkip (for tests requiring login state). Zero test failures in the CustomerAuthFlowTests, CustomerProfileSettingsTests, CustomerFoodDeliveryFlowTests, and eatfaircustomerUITests classes.</done>
</task>

</tasks>

<verification>
1. `xcodebuild build-for-testing` succeeds with no compilation errors in UI test target
2. `xcodebuild test` for the 4 test classes shows 0 failures
3. Tests that require logged-in state properly skip with XCTSkip
4. No changes to app production code except adding `.accessibilityLabel("Edit profile")` to ProfileView button
</verification>

<success_criteria>
- All 16 previously failing tests pass or skip correctly (0 failures)
- Test identifiers exactly match the actual SwiftUI view accessibility labels
- TestHelpers navigateToLogin() works without WelcomeView
- skipIfNotLoggedIn() correctly detects LoginView as the unauthenticated state
</success_criteria>

<output>
After completion, create `.planning/quick/35-investigate-and-fix-16-failing-ios-custo/35-SUMMARY.md`
</output>
