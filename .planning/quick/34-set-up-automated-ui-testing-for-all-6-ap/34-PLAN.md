---
phase: quick-34
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # iOS Customer UITests
  - apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
  - apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/RideshareFlowTests.swift
  - apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
  # iOS Driver UITests
  - apps/ios/delivery/eatffairdeliveryUITests/eatffairdeliveryUITests.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/AuthFlowTests.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/RideshareDriverFlowTests.swift
  - apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift
  # iOS Restaurant UITests
  - apps/ios/restaurant/eatffairrestaurantUITests/eatffairrestaurantUITests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/AuthFlowTests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/MenuManagementTests.swift
  - apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift
  # Android Customer Tests
  - /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/helpers/TestHelpers.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/AuthFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/FoodDeliveryFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/RideshareFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/ProfileSettingsFlowTest.kt
  # Android Driver Tests
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/helpers/TestHelpers.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/AuthFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/DeliveryFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/RideshareDriverFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/DriverProfileFlowTest.kt
  # Android Partner Tests
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/helpers/TestHelpers.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/AuthFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/OrderManagementFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/MenuManagementFlowTest.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/SettingsFlowTest.kt
  # Test runner script
  - scripts/run-ui-tests.sh
autonomous: true
requirements: []

must_haves:
  truths:
    - "iOS XCUITest suites exist for all 3 apps with flow-organized test files"
    - "Android Compose UI test suites exist for all 3 apps with flow-organized test files"
    - "Each app has shared test helpers for login, navigation, and common assertions"
    - "Test cases cover auth, food delivery, rideshare, and profile/settings flows"
    - "A runner script can execute all UI tests for any platform or app"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift"
      provides: "iOS Customer test helpers (login, navigation, wait utilities)"
    - path: "apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift"
      provides: "Customer auth flow tests (login, register, forgot password, social auth)"
    - path: "apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift"
      provides: "Customer food ordering flow tests (browse, cart, checkout, tracking)"
    - path: "apps/ios/customer/eatfaircustomerUITests/Flows/RideshareFlowTests.swift"
      provides: "Customer rideshare flow tests (request, bidding, active ride, rating)"
    - path: "apps/ios/delivery/eatffairdeliveryUITests/Flows/RideshareDriverFlowTests.swift"
      provides: "Driver rideshare flow tests (bid, accept, active ride, complete)"
    - path: "/Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/RideshareFlowTest.kt"
      provides: "Android customer rideshare flow tests"
    - path: "scripts/run-ui-tests.sh"
      provides: "Cross-platform test runner script"
  key_links:
    - from: "UI_INTERACTION_AUDIT.md"
      to: "all test files"
      via: "audit element IDs map to XCUITest/Compose assertions"
      pattern: "accessibilityIdentifier|testTag"
---

<objective>
Set up comprehensive automated UI testing for all 6 Dollor.ai apps (3 iOS + 3 Android), organized by user flow.

Purpose: Create a scaffolded UI test suite covering critical user flows (auth, food delivery, rideshare, profile/settings) across all apps, enabling regression testing before releases. Tests derived from the UI Interaction Audit (1,844 elements catalogued).

Output: Flow-organized test files for all 6 apps, shared test helpers, and a cross-platform runner script.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md
@apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
@apps/ios/delivery/eatffairdeliveryUITests/eatffairdeliveryUITests.swift
@apps/ios/restaurant/eatffairrestaurantUITests/eatffairrestaurantUITests.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: iOS XCUITest suites for all 3 apps</name>
  <files>
    apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/AuthFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/FoodDeliveryFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/RideshareFlowTests.swift
    apps/ios/customer/eatfaircustomerUITests/Flows/ProfileSettingsTests.swift
    apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/AuthFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/DeliveryFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/RideshareDriverFlowTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/Flows/DriverProfileTests.swift
    apps/ios/delivery/eatffairdeliveryUITests/eatffairdeliveryUITests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/AuthFlowTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/OrderManagementTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/MenuManagementTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/Flows/SettingsTests.swift
    apps/ios/restaurant/eatffairrestaurantUITests/eatffairrestaurantUITests.swift
  </files>
  <action>
    Restructure and expand existing iOS XCUITest suites into flow-organized test files. Each app already has a UITests target in the Xcode project -- just add new .swift files to existing target directories.

    **IMPORTANT**: Existing UITest files already have tests that work. Keep the existing test class in the main file (trim to just the MARK comments pointing to the flow files), and create NEW flow-specific files alongside them. All new files must `import XCTest` and be in the same UITest target (Xcode auto-discovers .swift files in the target directory).

    **For each app, create a TestHelpers.swift with:**
    - `DollorTestCase` base class extending `XCTestCase` with shared `app: XCUIApplication!`, `setUpWithError()` launching app, `tearDownWithError()` cleanup
    - `navigateToLogin()` -- handles welcome screen skip if needed
    - `loginWithCredentials(email:password:)` -- types email/password and taps login
    - `waitForElement(_ element: XCUIElement, timeout: TimeInterval = 10)` -- returns Bool
    - `assertElementExists(_ element: XCUIElement, _ message: String)` -- wrapper
    - `skipIfNotLoggedIn()` -- throws `XCTSkip` if login screen visible
    - `navigateToTab(_ tabName: String)` -- taps tab bar button

    **iOS Customer App (eatfaircustomerUITests/) -- 4 flow files:**

    1. `Flows/AuthFlowTests.swift` (class `CustomerAuthFlowTests: DollorTestCase`):
       - `testLogin_validCredentials_navigatesToHome` -- enter demo.customer@dollor.ai / DemoCustomer2025!, tap Login, verify Home tab exists
       - `testLogin_emptyFields_showsError` -- tap Login with empty fields, verify error alert
       - `testLogin_invalidEmail_showsValidation` -- type bad email, verify validation
       - `testSignUp_allFieldsVisible` -- toggle to Sign Up, verify Full Name, Phone, Email, Password fields
       - `testSignUp_toggleBackToLogin` -- toggle Sign Up then back, verify fields hidden
       - `testForgotPassword_opensSheet` -- tap Forgot Password, verify Reset Password sheet
       - `testGoogleSignIn_buttonExists` -- verify Google Sign In button present and enabled
       - `testAppleSignIn_buttonExists` -- verify Apple Sign In button present and enabled
       - `testLegalAcceptance_allDocumentsPresent` -- verify terms toggle, privacy toggle, Read More buttons
       Source: UI_INTERACTION_AUDIT.md iOS Customer Auth Flow (#1-27)

    2. `Flows/FoodDeliveryFlowTests.swift` (class `CustomerFoodDeliveryFlowTests: DollorTestCase`):
       - `testHome_categoryButtons_areDisplayed` -- verify category filter buttons on HomeView
       - `testHome_orderFoodButton_navigatesToSearch` -- tap "Order Food", verify SearchRestaurantsView
       - `testHome_bookRideButton_navigatesToRideRequest` -- tap "Book Ride", verify RideRequestView
       - `testBrowse_restaurantCards_areTappable` -- verify restaurant NavigationLinks exist
       - `testBrowse_sortMenu_isAccessible` -- verify sort options menu works
       - `testRestaurantDetail_menuItems_areDisplayed` -- navigate to restaurant, verify menu section
       - `testRestaurantDetail_addToCart_works` -- tap add to cart on menu item
       - `testCart_itemQuantity_canBeChanged` -- verify +/- buttons in cart
       - `testCart_checkoutButton_navigatesToCheckout` -- tap Checkout, verify checkout sheet
       - `testCheckout_placeOrderButton_exists` -- verify Place Order button in checkout
       - `testCheckout_addressSection_exists` -- verify delivery address section
       - `testCheckout_paymentSection_exists` -- verify payment method section
       All tests use `skipIfNotLoggedIn()` guard. Source: UI_INTERACTION_AUDIT.md iOS Customer Food Delivery (#1-44)

    3. `Flows/RideshareFlowTests.swift` (class `CustomerRideshareFlowTests: DollorTestCase`):
       - `testRideRequest_pickupDropoff_fieldsExist` -- verify Set Pickup and Set Dropoff buttons
       - `testRideRequest_tipAmounts_areSelectable` -- verify tip amount buttons
       - `testRideRequest_requestRideButton_exists` -- verify Request Ride button
       - `testRideRequest_negotiateFareButton_exists` -- verify Negotiate Fare button
       - `testActiveRide_cancelButton_showsConfirmation` -- verify cancel confirmation dialog
       - `testActiveRide_chatButton_opensSheet` -- verify chat sheet opens
       - `testActiveRide_sosButton_showsAlert` -- verify SOS emergency alert
       - `testActiveRide_shareLocationButton_exists` -- verify share location button
       - `testCompletedRide_ratingStars_exist` -- verify star rating buttons
       - `testCompletedRide_tipSelection_exists` -- verify tip amount selection
       - `testRecurringRides_addButton_exists` -- verify recurring ride setup
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Customer Rideshare (#1-57)

    4. `Flows/ProfileSettingsTests.swift` (class `CustomerProfileSettingsTests: DollorTestCase`):
       - `testProfile_editProfileButton_exists` -- verify Edit profile button
       - `testProfile_navigationLinks_allPresent` -- verify Addresses, Payment, Favorites, Settings, Notifications, Help links
       - `testProfile_signOutButton_exists` -- verify Sign Out button
       - `testProfile_deleteAccountButton_exists` -- verify Delete Account button (App Store requirement)
       - `testSettings_languageButton_exists` -- verify language selection
       - `testSettings_privacyTermsLinks_exist` -- verify Privacy Policy and Terms links
       - `testPaymentMethods_addCardButton_exists` -- verify Add Card button
       - `testAddresses_addAddressButton_exists` -- verify Add Address button
       Source: UI_INTERACTION_AUDIT.md iOS Customer Profile (#1-44)

    **iOS Driver App (eatffairdeliveryUITests/) -- 4 flow files:**

    1. `Flows/AuthFlowTests.swift` (class `DriverAuthFlowTests: DollorTestCase`):
       - `testLogin_driverLoginTitle_isDisplayed` -- verify "Driver Login" title
       - `testLogin_emailPasswordFields_exist` -- verify Email and Password fields
       - `testLogin_signUpMode_showsDriverFields` -- toggle to Sign Up, verify First Name, Last Name, Phone, Confirm Password
       - `testLogin_termsCheckbox_inSignUpMode` -- verify Terms & Conditions in sign up
       - `testLogin_forgotPassword_exists` -- verify Forgot Password button exists (note: DriverLoginView uses different label than customer)
       - `testLogin_googleAppleButtons_exist` -- verify social sign-in buttons
       Source: UI_INTERACTION_AUDIT.md iOS Driver Auth (#1-12)

    2. `Flows/DeliveryFlowTests.swift` (class `DriverDeliveryFlowTests: DollorTestCase`):
       - `testDashboard_tabBar_hasCorrectTabs` -- verify Available/My Deliveries/Rideshare tabs
       - `testAvailableOrders_onlineToggle_exists` -- verify online status toggle
       - `testAvailableOrders_refreshButton_works` -- verify refresh button
       - `testAvailableOrders_listMapToggle_exists` -- verify view mode toggle
       - `testAvailableOrders_acceptOrderButton_exists` -- verify Accept order button on card
       - `testMyDeliveries_activeDeliveryCard_exists` -- verify delivery card
       - `testActiveDelivery_navigateButton_exists` -- verify Open Maps navigation button
       - `testActiveDelivery_callCustomerButton_exists` -- verify call customer button
       - `testActiveDelivery_completeDeliveryFlow` -- verify complete delivery confirmation
       - `testDeliveryProof_photoOptions_exist` -- verify Take Photo and Choose from Library
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Driver Delivery (#1-22)

    3. `Flows/RideshareDriverFlowTests.swift` (class `DriverRideshareFlowTests: DollorTestCase`):
       - `testRideshareDashboard_onlineToggle_exists` -- verify driver online toggle
       - `testRideshareDashboard_availableMyBidsTabs_exist` -- verify Available/My Bids tabs
       - `testRideshareDashboard_payoutButton_exists` -- verify Payout Dashboard button
       - `testBidOnRide_bidSheet_opens` -- verify bid sheet opens on ride request
       - `testBidOnRide_quickBidAmounts_exist` -- verify 3 quick bid amount buttons
       - `testBidOnRide_submitBidButton_exists` -- verify Submit Bid button
       - `testActiveRide_arriveAtPickup_exists` -- verify Arrive at Pickup button
       - `testActiveRide_startRideButton_exists` -- verify Start Ride button
       - `testActiveRide_completeRideButton_exists` -- verify Complete Ride button
       - `testActiveRide_noShowButton_exists` -- verify No-Show button
       - `testActiveRide_sosAlert_exists` -- verify SOS emergency alert
       - `testActiveRide_chatWithRider_opens` -- verify chat opens
       - `testCompletedRide_ratePassenger_works` -- verify star rating for passenger
       - `testCounterOffer_acceptRejectCounter_buttons` -- verify Accept/Reject/Counter buttons
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Driver Rideshare (#1-38)

    4. `Flows/DriverProfileTests.swift` (class `DriverProfileFlowTests: DollorTestCase`):
       - `testProfile_editButton_exists` -- verify Edit toggle
       - `testProfile_tabSelector_personalDocumentsEarningsSettings` -- verify 4 profile tabs
       - `testProfile_personalTab_saveButton_exists` -- verify Save profile button
       - `testProfile_documentsTab_verifyIdentity_exists` -- verify identity verification button
       - `testProfile_earningsTab_payoutHistory_exists` -- verify payout history link
       - `testProfile_settingsTab_logoutButton_exists` -- verify Logout button
       - `testProfile_settingsTab_deleteAccount_exists` -- verify Delete Account (App Store req)
       - `testProfile_settingsTab_toggles_exist` -- verify Notifications, Sound, Accept Cash toggles
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Driver Profile (#1-21)

    **iOS Restaurant App (eatffairrestaurantUITests/) -- 4 flow files:**

    1. `Flows/AuthFlowTests.swift` (class `RestaurantAuthFlowTests: DollorTestCase`):
       - `testLogin_brandTitle_isDisplayed` -- verify "Dollor AI Restaurant"
       - `testLogin_emailPasswordFields_exist` -- verify "Enter your email" / "Enter your password"
       - `testLogin_loginButton_exists` -- verify "Log In" button
       - `testLogin_forgotPassword_opensSheet` -- tap "Forgot Password?", verify Reset Password
       - `testLogin_signUp_opensRegistration` -- tap "Sign Up", verify Create Account or registration flow
       - `testLogin_googleAppleButtons_exist` -- verify social sign-in
       - `testRegistration_multiStep_navigation` -- verify Back/Next buttons in registration wizard
       Source: UI_INTERACTION_AUDIT.md iOS Restaurant Auth (#1-18)

    2. `Flows/OrderManagementTests.swift` (class `RestaurantOrderManagementTests: DollorTestCase`):
       - `testDashboard_statsCards_exist` -- verify Today's Revenue, Orders, Rating cards
       - `testDashboard_onlineToggle_exists` -- verify store online status toggle
       - `testOrders_filterTabs_exist` -- verify order filter tabs (All/Pending/Preparing)
       - `testOrders_acceptOrderButton_exists` -- verify Accept button on order card
       - `testOrders_startPreparingButton_exists` -- verify Start Preparing action
       - `testOrders_markReadyButton_exists` -- verify Mark Ready action
       - `testOrders_printKOTButton_exists` -- verify Print KOT button
       - `testOrders_cancelOrderButton_exists` -- verify Cancel order action
       - `testOrders_contactCustomerDriver_exist` -- verify contact buttons
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Restaurant Dashboard (#1-19)

    3. `Flows/MenuManagementTests.swift` (class `RestaurantMenuManagementTests: DollorTestCase`):
       - `testMenu_addItemButton_exists` -- verify Add Item button
       - `testMenu_searchBar_exists` -- verify search field
       - `testMenu_itemAvailabilityToggle_exists` -- verify availability toggle on items
       - `testMenu_editDeleteActions_exist` -- verify Edit/Delete in item context menu
       - `testMenu_addItemDialog_hasRequiredFields` -- verify Item Name, Price, Description, Category fields
       - `testMenu_addItemDialog_saveCancel_exist` -- verify Save and Cancel buttons
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Restaurant Menu (#1-13)

    4. `Flows/SettingsTests.swift` (class `RestaurantSettingsFlowTests: DollorTestCase`):
       - `testSettings_editProfile_exists` -- verify Edit Profile button
       - `testSettings_onlineStatusToggle_exists` -- verify online/offline toggle
       - `testSettings_deliveryPickupToggles_exist` -- verify delivery and pickup toggles
       - `testSettings_operatingHours_exists` -- verify operating hours button
       - `testSettings_kotSettings_exists` -- verify KOT Settings navigation link
       - `testSettings_aiFeatures_toggles_exist` -- verify AI Demand, AI Prep Time, AI Menu toggles
       - `testSettings_aiEmployees_link_exists` -- verify AI Employees navigation link
       - `testSettings_signOutButton_exists` -- verify Sign Out button
       - `testSettings_deleteAccountButton_exists` -- verify Delete Account (App Store req)
       - `testSettings_termsPrivacy_links_exist` -- verify Terms and Privacy navigation links
       All tests use `skipIfNotLoggedIn()`. Source: UI_INTERACTION_AUDIT.md iOS Restaurant Settings (#1-32)

    **Slim down the original test files**: Replace existing bloated test classes with a slim index file that imports XCTest and contains only:
    - Launch performance test
    - A brief comment directing readers to Flows/ subdirectory
    - Keep `eatffairrestaurantUITests.swift` existing classes but add comments pointing to Flows/

    **Patterns to follow across ALL iOS test files:**
    - Every test method annotated with `@MainActor`
    - Use `waitForExistence(timeout:)` before assertions (never assume element is immediately present)
    - Use `XCTSkip` for tests requiring authenticated state when not logged in
    - Test naming: `test{Screen}_{element}_{behavior}`
    - Use predicate-based matching for buttons with dynamic labels: `app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'keyword'"))`
  </action>
  <verify>
    Verify all files exist:
    - `ls apps/ios/customer/eatfaircustomerUITests/Helpers/TestHelpers.swift`
    - `ls apps/ios/customer/eatfaircustomerUITests/Flows/*.swift` (should show 4 files)
    - `ls apps/ios/delivery/eatffairdeliveryUITests/Helpers/TestHelpers.swift`
    - `ls apps/ios/delivery/eatffairdeliveryUITests/Flows/*.swift` (should show 4 files)
    - `ls apps/ios/restaurant/eatffairrestaurantUITests/Helpers/TestHelpers.swift`
    - `ls apps/ios/restaurant/eatffairrestaurantUITests/Flows/*.swift` (should show 4 files)
    - `grep -c "func test" apps/ios/customer/eatfaircustomerUITests/Flows/*.swift` (should total 40+ tests)
    - `grep -c "func test" apps/ios/delivery/eatffairdeliveryUITests/Flows/*.swift` (should total 36+ tests)
    - `grep -c "func test" apps/ios/restaurant/eatffairrestaurantUITests/Flows/*.swift` (should total 30+ tests)
  </verify>
  <done>
    All 3 iOS apps have flow-organized XCUITest suites:
    - Customer: 4 flow files + helpers covering auth (9), food delivery (12), rideshare (11), profile (8) = 40+ tests
    - Driver: 4 flow files + helpers covering auth (6), delivery (10), rideshare (14), profile (8) = 38+ tests
    - Restaurant: 4 flow files + helpers covering auth (7), orders (9), menu (6), settings (10) = 32+ tests
    - Total: 110+ organized iOS UI tests derived from UI Interaction Audit
  </done>
</task>

<task type="auto">
  <name>Task 2: Android Compose UI test suites for all 3 apps</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/helpers/TestHelpers.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/AuthFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/FoodDeliveryFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/RideshareFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/ProfileSettingsFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/helpers/TestHelpers.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/AuthFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/DeliveryFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/RideshareDriverFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/DriverProfileFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/helpers/TestHelpers.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/AuthFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/OrderManagementFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/MenuManagementFlowTest.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/SettingsFlowTest.kt
  </files>
  <action>
    Create flow-organized Compose UI test suites for all 3 Android apps. All modules already have `androidTestImplementation` for Compose UI test, Espresso, and JUnit4 in build.gradle.kts. Existing tests in `androidTest/` should NOT be deleted -- add new files alongside them.

    **For each app, create a TestHelpers.kt with:**
    - `fun ComposeTestRule.waitForText(text: String, timeout: Long = 5000)` -- poll `onNodeWithText` until displayed
    - `fun ComposeTestRule.waitForContentDescription(desc: String, timeout: Long = 5000)` -- similar for contentDescription
    - `fun ComposeTestRule.loginWithCredentials(email: String, password: String)` -- find email/password fields, input, click Sign In
    - `fun ComposeTestRule.navigateToTab(tabName: String)` -- click bottom navigation item
    - `fun ComposeTestRule.assertTextDisplayed(text: String)` -- `onNodeWithText(text).assertIsDisplayed()`
    - `fun ComposeTestRule.assertButtonExists(text: String)` -- `onNodeWithText(text).assertExists()`
    - `fun ComposeTestRule.skipIfLoginVisible()` -- check if login screen is showing, assume in test logic
    - Constants: `TEST_EMAIL = "demo.customer@dollor.ai"`, `TEST_PASSWORD = "DemoCustomer2025!"`
    - Driver helpers use: `TEST_EMAIL = "demo.driver@dollor.ai"`, `TEST_PASSWORD = "DemoDriver2025!"`
    - Partner helpers use: `TEST_EMAIL = "demo.restaurant@dollor.ai"`, `TEST_PASSWORD = "DemoRestaurant2025!"`

    **Android Customer App (:app) -- 4 flow files:**

    1. `flows/AuthFlowTest.kt` (class `CustomerAuthFlowTest`):
       - `testLogin_signInButton_isDisplayed` -- verify "Sign In" button exists
       - `testLogin_googleButton_isDisplayed` -- verify Google Sign In button
       - `testLogin_appleButton_isDisplayed` -- verify Apple Sign In button
       - `testLogin_forgotPassword_navigates` -- tap "Forgot Password?", verify navigation
       - `testLogin_register_navigates` -- tap "Register", verify RegisterScreen
       - `testRegister_allFieldsVisible` -- verify name, email, phone, password fields
       - `testForgotPassword_sendCodeButton_exists` -- verify send code button
       - `testWelcome_getStarted_navigates` -- verify "Get Started" navigates to login
       - `testLegalAcceptance_checkbox_exists` -- verify terms checkbox and continue button
       Source: UI_INTERACTION_AUDIT.md Android Customer Auth (#1-15)

    2. `flows/FoodDeliveryFlowTest.kt` (class `CustomerFoodDeliveryFlowTest`):
       - `testHome_orderFoodButton_exists` -- verify "Order Food" button navigates to search
       - `testHome_restaurantCards_clickable` -- verify restaurant card click
       - `testHome_notificationIcon_exists` -- verify notifications icon button
       - `testSearch_results_areClickable` -- verify search result cards navigate
       - `testSearch_voiceSearch_buttonExists` -- verify voice search button
       - `testRestaurant_addToCart_works` -- verify add to cart button
       - `testRestaurant_menuSearch_exists` -- verify menu search icon
       - `testCart_quantityButtons_exist` -- verify +/- quantity buttons
       - `testCart_checkoutButton_navigates` -- verify "Checkout" navigates
       - `testCheckout_placeOrderButton_exists` -- verify "Place Order" button
       - `testCheckout_addressPayment_sections_exist` -- verify address and payment sections
       - `testOrderTracking_callChatButtons_exist` -- verify call/chat driver buttons
       Source: UI_INTERACTION_AUDIT.md Android Customer Food Delivery (#1-33)

    3. `flows/RideshareFlowTest.kt` (class `CustomerRideshareFlowTest`):
       - `testRideRequest_pickupDropoff_exist` -- verify pickup/dropoff buttons
       - `testRideRequest_requestRideButton_exists` -- verify "Request Ride" button
       - `testRideRequest_tipAmounts_selectable` -- verify tip amount buttons
       - `testBidding_acceptRejectCounter_exist` -- verify bid action buttons
       - `testActiveRide_cancelButton_showsDialog` -- verify cancel ride confirmation
       - `testActiveRide_sosButton_showsAlert` -- verify SOS emergency dialog
       - `testActiveRide_callChatButtons_exist` -- verify call/chat driver
       - `testActiveRide_shareLocationButton_exists` -- verify share location
       - `testCompletedRide_ratingStars_exist` -- verify star rating
       - `testCompletedRide_tipSubmitButton_exists` -- verify tip submission
       - `testNegotiate_dialog_opensOnTap` -- verify negotiate dialog
       - `testRecurringRides_addDeleteToggle_exist` -- verify recurring ride actions
       - `testDriverChat_sendButton_exists` -- verify chat send button
       - `testRideReceipt_tipDisputeButtons_exist` -- verify receipt actions
       Source: UI_INTERACTION_AUDIT.md Android Customer Rideshare (#1-30)

    4. `flows/ProfileSettingsFlowTest.kt` (class `CustomerProfileSettingsFlowTest`):
       - `testProfile_editProfile_navigates` -- verify edit profile click
       - `testProfile_allMenuItems_clickable` -- verify Addresses, Payment, Favorites, Settings, Notifications, Help, Recurring Rides
       - `testProfile_signOut_showsDialog` -- verify logout confirmation dialog
       - `testProfile_deleteAccount_showsDialog` -- verify delete confirmation
       - `testSettings_notificationToggles_exist` -- verify 3 notification switches
       - `testSettings_privacyTerms_navigate` -- verify Privacy/Terms navigation
       - `testEditProfile_saveButton_exists` -- verify save profile button
       - `testAddresses_addDeleteButtons_exist` -- verify address management
       - `testPaymentMethods_addCard_exists` -- verify add card button
       Source: UI_INTERACTION_AUDIT.md Android Customer Profile (#1-25)

    **Android Driver App (:driver) -- 4 flow files:**

    1. `flows/AuthFlowTest.kt` (class `DriverAuthFlowTest`):
       - `testLogin_signInButton_exists` -- verify Sign In
       - `testLogin_googleAppleButtons_exist` -- verify social auth
       - `testLogin_termsCheckbox_exists` -- verify terms checkbox
       - `testLogin_forgotPassword_navigates` -- verify Forgot Password navigation
       - `testLogin_registerToggle_works` -- verify register mode toggle
       - `testForgotPassword_verifyResetFlow` -- verify send/verify/reset buttons
       Source: UI_INTERACTION_AUDIT.md Android Driver Auth (#1-8)

    2. `flows/DeliveryFlowTest.kt` (class `DriverDeliveryFlowTest`):
       - `testNavigation_threeTabsExist` -- verify Available/Active/Profile tabs
       - `testAvailableOrders_acceptButton_exists` -- verify accept order
       - `testAvailableOrders_orderCard_clickable` -- verify order card tap
       - `testAvailableOrders_acceptConfirmDialog_exists` -- verify confirmation
       - `testActiveDelivery_navigateButton_exists` -- verify Open Maps
       - `testActiveDelivery_callChatButtons_exist` -- verify call/chat customer
       - `testActiveDelivery_markPickedUp_exists` -- verify pickup confirmation
       - `testActiveDelivery_completeDelivery_showsDialog` -- verify complete confirmation
       - `testDeliveryProof_photoButtons_exist` -- verify Take/Choose photo
       - `testMyDeliveries_refreshButton_exists` -- verify refresh
       Source: UI_INTERACTION_AUDIT.md Android Driver Delivery (#1-15)

    3. `flows/RideshareDriverFlowTest.kt` (class `DriverRideshareFlowTest`):
       - `testRideshare_onlineToggle_exists` -- verify online switch
       - `testRideshare_availableMyBidsTabs_exist` -- verify tabs
       - `testRideshare_bidOnRideButton_exists` -- verify bid button on ride card
       - `testBidSheet_submitBidButton_exists` -- verify submit bid
       - `testBidSheet_quickBidAmounts_exist` -- verify quick bid options
       - `testCounterOffer_acceptRejectCounter_exist` -- verify counter offer actions
       - `testActiveRide_arriveStartComplete_buttons` -- verify ride lifecycle buttons
       - `testActiveRide_noShowButton_exists` -- verify no-show
       - `testActiveRide_cancelButton_showsDialog` -- verify cancel confirmation
       - `testActiveRide_sosAlert_exists` -- verify SOS
       - `testActiveRide_chatCallButtons_exist` -- verify chat/call
       - `testCompletedRide_ratePassenger_exists` -- verify passenger rating
       - `testPayoutDashboard_stripeButton_exists` -- verify Stripe dashboard link
       Source: UI_INTERACTION_AUDIT.md Android Driver Rideshare (#1-29)

    4. `flows/DriverProfileFlowTest.kt` (class `DriverProfileFlowTest`):
       - `testProfile_editSaveButtons_exist` -- verify edit/save profile
       - `testProfile_documentsNavigates` -- verify documents click
       - `testProfile_earningsNavigates` -- verify earnings click
       - `testProfile_messagesNavigates` -- verify messages click
       - `testProfile_logoutShowsDialog` -- verify logout confirmation
       - `testProfile_deleteAccountShowsDialogs` -- verify double confirmation delete
       - `testDocuments_uploadViewButtons_exist` -- verify document upload/view
       - `testCompliance_checkboxesExist` -- verify 7 compliance checkboxes
       - `testEarnings_periodFilter_exists` -- verify period toggle
       Source: UI_INTERACTION_AUDIT.md Android Driver Profile (#1-17)

    **Android Partner App (:partner) -- 4 flow files:**

    1. `flows/AuthFlowTest.kt` (class `PartnerAuthFlowTest`):
       - `testLogin_signInButton_exists`
       - `testLogin_googleButton_exists`
       - `testLogin_registerNavigates`
       - `testRegistration_nextBackButtons_exist`
       - `testRegistration_termsPrivacyCheckboxes_exist`
       Source: UI_INTERACTION_AUDIT.md Android Partner Auth (#1-8)

    2. `flows/OrderManagementFlowTest.kt` (class `PartnerOrderManagementFlowTest`):
       - `testOrders_tabFilterExists` -- verify New/Active/Complete tabs
       - `testOrders_orderCard_clickable` -- verify order card
       - `testOrders_acceptRejectButtons_exist` -- verify accept/reject
       - `testOrders_statusProgression_buttonsExist` -- verify Start Preparing -> Mark Ready -> Complete
       - `testOrderDetails_printKOT_exists` -- verify Print KOT
       - `testOrderDetails_contactButtons_exist` -- verify customer/driver contact
       - `testOrderDetails_invoiceButton_exists` -- verify invoice view
       - `testDeliveryDecision_selfDeliverWaitButtons_exist` -- verify delivery decision
       Source: UI_INTERACTION_AUDIT.md Android Partner Orders (#1-17)

    3. `flows/MenuManagementFlowTest.kt` (class `PartnerMenuManagementFlowTest`):
       - `testMenu_addItemButton_exists`
       - `testMenu_itemAvailabilityToggle_exists`
       - `testMenu_editDeleteActions_exist`
       - `testMenu_categoryFilter_clickable`
       - `testMenu_deleteConfirmDialog_exists`
       - `testAddEditItem_saveCancel_exist`
       - `testAddEditItem_imageUpload_exists`
       Source: UI_INTERACTION_AUDIT.md Android Partner Menu (#1-11)

    4. `flows/SettingsFlowTest.kt` (class `PartnerSettingsFlowTest`):
       - `testSettings_editProfile_navigates`
       - `testSettings_onlineStatusToggle_exists`
       - `testSettings_businessHoursNavigates`
       - `testSettings_notificationsNavigates`
       - `testSettings_paymentNavigates`
       - `testSettings_kotSettingsNavigates`
       - `testSettings_logoutShowsDialog`
       - `testSettings_deleteAccountShowsDialog`
       - `testSettings_termsPrivacy_navigate`
       - `testNotifications_toggles_exist` -- verify 5 notification switches
       - `testBusinessHours_dayToggles_exist` -- verify day open/close toggles
       Source: UI_INTERACTION_AUDIT.md Android Partner Settings (#1-27)

    **Patterns to follow across ALL Android test files:**
    - Use `createComposeRule()` not `createAndroidComposeRule` (lighter, no Activity dependency for component tests)
    - For screen-level tests that need NavController, use `createAndroidComposeRule<MainActivity>()` and document the requirement
    - Use `onNodeWithText("text").assertIsDisplayed()` for visible checks
    - Use `onNodeWithText("text").assertExists()` for existence checks (may be scrolled off)
    - Use `onNodeWithText("text", substring = true)` for partial text matches
    - Use `performScrollTo()` before asserting elements below fold
    - Use `waitForIdle()` after navigation actions
    - Test naming: `test{Screen}_{element}_{behavior}`
    - Each test class annotated with `@RunWith(AndroidJUnit4::class)` if needed
  </action>
  <verify>
    Verify all files exist:
    - `ls /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/helpers/TestHelpers.kt`
    - `ls /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/*.kt` (4 files)
    - `ls /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/helpers/TestHelpers.kt`
    - `ls /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/*.kt` (4 files)
    - `ls /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/helpers/TestHelpers.kt`
    - `ls /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/*.kt` (4 files)
    - `grep -c "fun test" /Users/jeet/StudioProjects/eatfair-android/app/src/androidTest/java/ai/dollor/customer/flows/*.kt` (total 44+ tests)
    - `grep -c "fun test" /Users/jeet/StudioProjects/eatfair-android/driver/src/androidTest/java/ai/dollor/driver/flows/*.kt` (total 38+ tests)
    - `grep -c "fun test" /Users/jeet/StudioProjects/eatfair-android/partner/src/androidTest/java/ai/dollor/partner/flows/*.kt` (total 30+ tests)
  </verify>
  <done>
    All 3 Android apps have flow-organized Compose UI test suites:
    - Customer: 4 flow files + helpers covering auth (9), food delivery (12), rideshare (14), profile (9) = 44+ tests
    - Driver: 4 flow files + helpers covering auth (6), delivery (10), rideshare (13), profile (9) = 38+ tests
    - Partner: 4 flow files + helpers covering auth (5), orders (8), menu (7), settings (11) = 31+ tests
    - Total: 113+ organized Android UI tests derived from UI Interaction Audit
  </done>
</task>

<task type="auto">
  <name>Task 3: Cross-platform test runner script</name>
  <files>
    scripts/run-ui-tests.sh
  </files>
  <action>
    Create a bash script `scripts/run-ui-tests.sh` that orchestrates running UI tests across both platforms.

    **Script should support:**
    ```
    Usage: scripts/run-ui-tests.sh [platform] [app] [flow]
      platform: ios | android | all (default: all)
      app:      customer | driver | restaurant | all (default: all)
      flow:     auth | food | ride | profile | settings | orders | menu | all (default: all)
    ```

    **iOS test execution (using xcodebuild):**
    ```bash
    # Customer app
    xcodebuild test \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatfaircustomer \
      -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
      -only-testing:eatfaircustomerUITests/CustomerAuthFlowTests \
      2>&1 | tee /tmp/dollor-ui-tests/ios-customer-auth.log

    # Driver app
    xcodebuild test \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatffairdelivery \
      -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
      -only-testing:eatffairdeliveryUITests \
      2>&1 | tee /tmp/dollor-ui-tests/ios-driver.log

    # Restaurant app (use -project if scheme not in workspace)
    xcodebuild test \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatffairrestaurant \
      -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
      -only-testing:eatffairrestaurantUITests \
      2>&1 | tee /tmp/dollor-ui-tests/ios-restaurant.log
    ```

    **Android test execution (using Gradle):**
    ```bash
    # Customer app
    cd /Users/jeet/StudioProjects/eatfair-android
    ./gradlew :app:connectedAndroidTest \
      -Pandroid.testInstrumentationRunnerArguments.class=ai.dollor.customer.flows.AuthFlowTest \
      2>&1 | tee /tmp/dollor-ui-tests/android-customer-auth.log

    # Driver app
    ./gradlew :driver:connectedAndroidTest \
      -Pandroid.testInstrumentationRunnerArguments.class=ai.dollor.driver.flows.AuthFlowTest

    # Partner app
    ./gradlew :partner:connectedAndroidTest \
      -Pandroid.testInstrumentationRunnerArguments.class=ai.dollor.partner.flows.AuthFlowTest
    ```

    **Script features:**
    1. Creates output directory `/tmp/dollor-ui-tests/` for logs
    2. Prints a summary table at the end: app | flow | pass/fail | duration
    3. Returns exit code 0 only if all selected tests pass
    4. Supports `--dry-run` flag to show what would be executed without running
    5. Color-coded output (green pass, red fail)
    6. Maps flow names to test class names per platform:
       - `auth` -> `CustomerAuthFlowTests` (iOS) / `CustomerAuthFlowTest` (Android)
       - `food` -> `CustomerFoodDeliveryFlowTests` / `CustomerFoodDeliveryFlowTest`
       - `ride` -> `CustomerRideshareFlowTests` / `CustomerRideshareFlowTest`
       - `profile` -> `CustomerProfileSettingsTests` / `CustomerProfileSettingsFlowTest`
       - `orders` -> `RestaurantOrderManagementTests` / `PartnerOrderManagementFlowTest`
       - `menu` -> `RestaurantMenuManagementTests` / `PartnerMenuManagementFlowTest`
       - `settings` -> `RestaurantSettingsFlowTests` / `PartnerSettingsFlowTest`

    Make script executable with `chmod +x`.
  </action>
  <verify>
    - `ls -la scripts/run-ui-tests.sh` (exists and is executable)
    - `scripts/run-ui-tests.sh --dry-run ios customer auth` (shows xcodebuild command without executing)
    - `scripts/run-ui-tests.sh --dry-run android driver ride` (shows gradle command without executing)
    - `scripts/run-ui-tests.sh --dry-run all all all` (shows all 18 test executions)
  </verify>
  <done>
    Cross-platform test runner script exists at `scripts/run-ui-tests.sh` with:
    - Platform/app/flow filtering
    - Dry-run mode showing exact commands
    - Log output to /tmp/dollor-ui-tests/
    - Summary table with pass/fail per test suite
  </done>
</task>

</tasks>

<verification>
1. iOS: All 3 apps have `Helpers/TestHelpers.swift` + 4 flow test files each = 15 new files
2. Android: All 3 apps have `helpers/TestHelpers.kt` + 4 flow test files each = 15 new files
3. Total: 30 new test files + 1 runner script = 31 files
4. Test count: 110+ iOS tests + 113+ Android tests = 223+ UI tests
5. Runner script: `scripts/run-ui-tests.sh --dry-run all all all` shows all 18 test suite executions
6. All test cases trace back to UI_INTERACTION_AUDIT.md element IDs
</verification>

<success_criteria>
- 15 new iOS XCUITest files organized by flow across 3 apps
- 15 new Android Compose UI test files organized by flow across 3 apps
- Each app has TestHelpers with login, navigation, and assertion utilities
- 223+ total test cases covering auth, food delivery, rideshare, profile/settings, orders, menu
- Cross-platform runner script with platform/app/flow filtering and dry-run mode
- Existing tests NOT deleted -- new files added alongside them
</success_criteria>

<output>
After completion, create `.planning/quick/34-set-up-automated-ui-testing-for-all-6-ap/34-SUMMARY.md`
</output>
