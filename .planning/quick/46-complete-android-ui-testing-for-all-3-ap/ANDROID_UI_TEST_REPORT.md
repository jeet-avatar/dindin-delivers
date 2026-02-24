# Android UI Test Report -- Enterprise Level

**Date:** 2026-02-24
**Platform:** Android (Kotlin, Jetpack Compose)
**Modules:** app (Customer), driver, partner, shared
**Build Variants:** testDebugUnitTest (JVM), connectedDebugAndroidTest (device)
**Repo:** /Users/jeet/StudioProjects/eatfair-android

---

## 1. Executive Summary

### Overall Inventory

| Metric | Unit Tests (JVM) | Instrumented Tests (Device) | Grand Total |
|--------|-------------------|----------------------------|-------------|
| **Total Tests** | 76 | 263 | **339** |
| **Passed** | 75 | N/A (requires device) | 75 |
| **Skipped** | 1 | N/A | 1 |
| **Failed** | 0 | N/A | 0 |
| **Pass Rate** | **100%** (0 failures) | Inventory only | -- |

### Per-Module Breakdown

| Module | Unit Tests | Instrumented Tests | Total | Test Files |
|--------|-----------|-------------------|-------|------------|
| **app** (Customer) | 74 (1 skipped) | 45 | 119 | 9 |
| **driver** | 0 | 63 | 63 | 6 |
| **partner** | 1 | 154 | 155 | 11 |
| **shared** | 1 | 1 | 2 | 2 |
| **Total** | **76** | **263** | **339** | **28** |

The 1 skipped test (`test_15_01_createPaymentIntent_works`) is a staging API test that depends on Stripe configuration. It uses `Assume.assumeTrue` to skip gracefully when the staging environment returns 500 from the Stripe payment intent endpoint.

---

## 2. Unit Test Results by Module

### app (Customer) -- 74 tests, 0 failed, 1 skipped

Gradle task: `:app:testDebugUnitTest`

| Test Class | Tests | Skipped | Failed | Time | Category |
|-----------|-------|---------|--------|------|----------|
| `CustomerAppStagingApiTest` | 57 | 1 | 0 | 10.137s | API Integration |
| `OrderCreationFieldMappingTest` | 12 | 0 | 0 | 2.441s | API Integration |
| `RideshareNavigationTest` | 4 | 0 | 0 | 0.004s | Navigation |
| `ExampleUnitTest` | 1 | 0 | 0 | 0.001s | Setup |

**CustomerAppStagingApiTest** (57 tests) -- Staging API integration tests covering 17 categories:
1. Health Check and Connectivity (2 tests)
2. Authentication -- Login, Register, Google, Demo (6 tests)
3. Restaurant Discovery -- List, Search, Details, Menu (5 tests)
4. Cart and Checkout -- Promo codes, Payment intent (3 tests)
5. Order Management -- Create, Track, Cancel, History (4 tests)
6. Rideshare P2P -- Estimate, Request, Bids, Track (6 tests)
7. Address Management -- CRUD operations (3 tests)
8. Favorites Management (2 tests)
9. Payment Cards Management (2 tests)
10. Promotions and Deals (2 tests)
11. Vendor Menu Items (2 tests)
12. Delivery Operations (3 tests)
13. Ride History and Receipts (2 tests)
14. Chat Integration (2 tests)
15. Payment Processing (1 test -- skipped: Stripe config)
16. Legal and Support (2 tests)
17. Account Management (2 tests)

**OrderCreationFieldMappingTest** (12 tests) -- Verifies Android sends correct field names matching iOS/Webapp:
- `customer_name`, `customer_email`, `customer_phone`, `vendor_id`, `items`, `delivery_address`
- Tests cover: required field presence, optional field handling, items array format, address structure, special characters, empty fields, delivery instructions

**RideshareNavigationTest** (4 tests) -- Navigation routing tests:
- `testRideshareTab_navigatesToRideRequest`
- `testRideRequestScreen_backButton_navigatesToHome`
- `testActiveRideScreen_cancelButton_showsConfirmation`
- `testCompletedRide_ratingScreen_navigatesCorrectly`

### shared -- 1 test, 0 failed

| Test Class | Tests | Failed | Time |
|-----------|-------|--------|------|
| `ExampleUnitTest` | 1 | 0 | 0.001s |

### partner -- 1 test, 0 failed

| Test Class | Tests | Failed | Time |
|-----------|-------|--------|------|
| `ExampleUnitTest` | 1 | 0 | 0.001s |

### driver -- No unit tests

The driver module has no `src/test/` directory. All driver testing is through instrumented tests (androidTest).

---

## 3. Instrumented/UI Test Inventory by Module

Instrumented tests require an Android device or emulator to run (`connectedDebugAndroidTest`). The following is a static analysis inventory from reading every `@Test` annotation in the source files.

### Customer App (app) -- 5 files, 45 tests

| File | @Test Count | Category | Screens Tested |
|------|------------|----------|----------------|
| `CustomerAuthFlowTest.kt` | 9 | Authentication | LoginScreen, RegisterScreen, ForgotPasswordScreen, WelcomeScreen |
| `CustomerFoodDeliveryFlowTest.kt` | 12 | Food Delivery | HomeScreen, RestaurantScreen, SearchScreen, CartScreen, CheckoutScreen, OrderTrackingScreen |
| `CustomerRideshareFlowTest.kt` | 14 | Rideshare | RideRequestScreen, BiddingUI, ActiveRideScreen, CompletedRideScreen, RecurringRidesScreen, DriverChatScreen |
| `CustomerProfileSettingsFlowTest.kt` | 9 | Profile/Settings | ProfileScreen, SettingsScreen, EditProfileScreen, SavedAddressesScreen, PaymentMethodsScreen |
| `ExampleInstrumentedTest.kt` | 1 | Setup | Package context verification |

**CustomerAuthFlowTest (9 tests):**
- `testLogin_signInButton_isDisplayed`
- `testLogin_googleButton_isDisplayed`
- `testLogin_appleButton_isDisplayed`
- `testLogin_forgotPassword_navigates`
- `testLogin_register_navigates`
- `testRegister_allFieldsVisible`
- `testForgotPassword_sendCodeButton_exists`
- `testWelcome_getStarted_navigates`
- `testLegalAcceptance_checkbox_exists`

**CustomerFoodDeliveryFlowTest (12 tests):**
- `testHome_orderFoodButton_exists`
- `testHome_restaurantCards_clickable`
- `testHome_notificationIcon_exists`
- `testSearch_results_areClickable`
- `testSearch_voiceSearch_buttonExists`
- `testRestaurant_addToCart_works`
- `testRestaurant_menuSearch_exists`
- `testCart_quantityButtons_exist`
- `testCart_checkoutButton_navigates`
- `testCheckout_placeOrderButton_exists`
- `testCheckout_addressPayment_sections_exist`
- `testOrderTracking_callChatButtons_exist`

**CustomerRideshareFlowTest (14 tests):**
- `testRideRequest_pickupDropoff_exist`
- `testRideRequest_requestRideButton_exists`
- `testRideRequest_tipAmounts_selectable`
- `testBidding_acceptRejectCounter_exist`
- `testActiveRide_cancelButton_showsDialog`
- `testActiveRide_sosButton_showsAlert`
- `testActiveRide_callChatButtons_exist`
- `testActiveRide_shareLocationButton_exists`
- `testCompletedRide_ratingStars_exist`
- `testCompletedRide_tipSubmitButton_exists`
- `testNegotiate_dialog_opensOnTap`
- `testRecurringRides_addDeleteToggle_exist`
- `testDriverChat_sendButton_exists`
- `testRideReceipt_tipDisputeButtons_exist`

**CustomerProfileSettingsFlowTest (9 tests):**
- `testProfile_editProfile_navigates`
- `testProfile_allMenuItems_clickable`
- `testProfile_signOut_showsDialog`
- `testProfile_deleteAccount_showsDialog`
- `testSettings_notificationToggles_exist`
- `testSettings_privacyTerms_navigate`
- `testEditProfile_saveButton_exists`
- `testAddresses_addDeleteButtons_exist`
- `testPaymentMethods_addCard_exists`

### Driver App -- 6 files, 63 tests

| File | @Test Count | Category | Screens Tested |
|------|------------|----------|----------------|
| `DriverAuthFlowTest.kt` | 6 | Authentication | LoginScreen, ForgotPasswordScreen |
| `DriverDeliveryFlowTest.kt` | 10 | Delivery | AvailableOrdersScreen, ActiveDeliveryScreen, DeliveryProofSheet |
| `DriverProfileFlowTest.kt` | 9 | Profile | ProfileScreen, DocumentsScreen, EarningsScreen, MessagesScreen |
| `DriverRideshareFlowTest.kt` | 13 | Rideshare | RideshareTabScreen, ActiveRideScreen, CounterOfferSheet, PayoutDashboardScreen |
| `DriverComplianceScreensTest.kt` | 21 | Compliance | InsuranceDisclosureScreen, BackgroundCheckConsentScreen, VehicleRequirementsScreen, IndependentContractorAgreementScreen |
| `DriverOnboardingFlowTest.kt` | 4 | Onboarding | Full onboarding flow (Login -> Legal -> Insurance -> Background -> Vehicle -> IC -> Main) |

**DriverAuthFlowTest (6 tests):**
- `testLogin_signInButton_exists`
- `testLogin_googleAppleButtons_exist`
- `testLogin_termsCheckbox_exists`
- `testLogin_forgotPassword_navigates`
- `testLogin_registerToggle_works`
- `testForgotPassword_verifyResetFlow`

**DriverDeliveryFlowTest (10 tests):**
- `testNavigation_threeTabsExist`
- `testAvailableOrders_acceptButton_exists`
- `testAvailableOrders_orderCard_clickable`
- `testAvailableOrders_acceptConfirmDialog_exists`
- `testActiveDelivery_navigateButton_exists`
- `testActiveDelivery_callChatButtons_exist`
- `testActiveDelivery_markPickedUp_exists`
- `testActiveDelivery_completeDelivery_showsDialog`
- `testDeliveryProof_photoButtons_exist`
- `testMyDeliveries_refreshButton_exists`

**DriverProfileFlowTest (9 tests):**
- `testProfile_editSaveButtons_exist`
- `testProfile_documentsNavigates`
- `testProfile_earningsNavigates`
- `testProfile_messagesNavigates`
- `testProfile_logoutShowsDialog`
- `testProfile_deleteAccountShowsDialogs`
- `testDocuments_uploadViewButtons_exist`
- `testCompliance_checkboxesExist`
- `testEarnings_periodFilter_exists`

**DriverRideshareFlowTest (13 tests):**
- `testRideshare_onlineToggle_exists`
- `testRideshare_availableMyBidsTabs_exist`
- `testRideshare_bidOnRideButton_exists`
- `testBidSheet_submitBidButton_exists`
- `testBidSheet_quickBidAmounts_exist`
- `testCounterOffer_acceptRejectCounter_exist`
- `testActiveRide_arriveStartComplete_buttons`
- `testActiveRide_noShowButton_exists`
- `testActiveRide_cancelButton_showsDialog`
- `testActiveRide_sosAlert_exists`
- `testActiveRide_chatCallButtons_exist`
- `testCompletedRide_ratePassenger_exists`
- `testPayoutDashboard_stripeButton_exists`

**DriverComplianceScreensTest (21 tests):**
- Insurance: `insuranceScreen_displaysP2PInfo`, `_continueButtonDisabledByDefault`, `_continueButtonEnabledAfterAcknowledgment`, `_displaysImportantNotice`
- Background: `backgroundCheckScreen_displaysAllVerificationItems`, `_displaysDisqualifyingFactors`, `_displaysFCRARights`, `_requiresBothCheckboxes`
- Vehicle: `vehicleScreen_displaysBasicRequirements`, `_displaysConditionRequirements`, `_displaysDocumentsNeeded`, `_continueButtonRequiresAcknowledgment`
- IC Agreement: `contractorScreen_displaysContractorBenefits`, `_displaysResponsibilities`, `_displaysNotAnEmployeeNotice`, `_displaysP2PCompliance`, `_requiresAllThreeCheckboxes`
- Navigation: `insuranceScreen_backButtonWorks`, `backgroundCheckScreen_backButtonWorks`, `vehicleScreen_backButtonWorks`, `contractorScreen_backButtonWorks`

**DriverOnboardingFlowTest (4 tests):**
- `fullOnboardingFlow_completesSuccessfully` (7-step E2E flow)
- `onboardingFlow_backNavigationWorks`
- `onboardingFlow_logoutReturnsToLogin`
- `onboardingFlow_cannotSkipSteps`

### Partner App -- 10 files, 154 tests

| File | @Test Count | Category | Screens Tested |
|------|------------|----------|----------------|
| `PartnerAuthFlowTest.kt` | 5 | Authentication | LoginScreen, RegistrationScreen |
| `PartnerOrderManagementFlowTest.kt` | 8 | Orders | OrdersScreen, OrderDetailsScreen |
| `PartnerMenuManagementFlowTest.kt` | 7 | Menu | EnhancedMenuScreen |
| `PartnerSettingsFlowTest.kt` | 11 | Settings | RestaurantSettingsScreen, BusinessHoursScreen, NotificationSettingsScreen |
| `PlatformParityTest.kt` | 16 | Platform Parity | Cross-platform screen, feature, color, API, navigation verification |
| `PartnerHomeScreenComponentsTest.kt` | 26 | UI Components | StatCard, QuickActionCard, OrderCard, Dashboard layout, Navigation callbacks |
| `MenuScreenComponentsTest.kt` | 35 | UI Components | MenuItemCard, CategoryTabs, AddItemDialog, EditItemDialog, SearchBar, ImageUpload, EmptyState, DeleteConfirmation |
| `OrdersScreenComponentsTest.kt` | 19 | UI Components | OrderItemCard, action buttons, status display, tab filtering, order numbers |
| `AnalyticsScreenComponentsTest.kt` | 26 | UI Components | AnalyticsHeader, RevenueCard, OrderMetricsCard, TopItemsSection, RevenueChart, PeriodFilter, AIInsightsCard, ComparisonCard |
| `ExampleInstrumentedTest.kt` | 1 | Setup | Package context verification |

### Shared Module -- 1 file, 1 test

| File | @Test Count | Category |
|------|------------|----------|
| `ExampleInstrumentedTest.kt` | 1 | Setup |

---

## 4. Screen Coverage Analysis

### Customer App -- 39 screen files, 15 covered (38.5%)

| Screen | Covered | Test File(s) | Tests |
|--------|---------|-------------|-------|
| LoginScreen | Yes | AuthFlowTest | 3 |
| RegisterScreen | Yes | AuthFlowTest | 2 |
| ForgotPasswordScreen | Yes | AuthFlowTest | 2 |
| WelcomeScreen | Yes | AuthFlowTest | 1 |
| LegalAcceptanceScreen | Yes | AuthFlowTest | 1 |
| HomeScreen | Yes | FoodDeliveryFlowTest | 3 |
| RestaurantScreen | Yes | FoodDeliveryFlowTest | 2 |
| SearchScreen | Yes | FoodDeliveryFlowTest | 2 |
| CartScreen | Yes | FoodDeliveryFlowTest | 2 |
| V3CheckoutScreen | Yes | FoodDeliveryFlowTest | 2 |
| OrderTrackingScreen | Yes | FoodDeliveryFlowTest | 1 |
| RideRequestScreen | Yes | RideshareFlowTest | 3 |
| ProfileScreen | Yes | ProfileSettingsFlowTest | 3 |
| SettingsScreen | Yes | ProfileSettingsFlowTest | 2 |
| EditProfileScreen | Yes | ProfileSettingsFlowTest | 1 |
| **Not Covered:** | | | |
| DealsScreen | No | -- | 0 |
| FavoritesScreen | No | -- | 0 |
| PaymentMethodsScreen | Partial | ProfileSettingsFlowTest | 1 |
| SavedAddressesScreen | Partial | ProfileSettingsFlowTest | 1 |
| NotificationScreen | No | -- | 0 |
| RestaurantListScreen | No | -- | 0 |
| MultiRestaurantCheckoutScreen | No | -- | 0 |
| RateDriverScreen | No | -- | 0 |
| RateRestaurantScreen | No | -- | 0 |
| ReferAndEarnScreen | No | -- | 0 |
| DisputeScreen | No | -- | 0 |
| DriverChatScreen | Partial | RideshareFlowTest | 1 |
| RecurringRidesScreen | Partial | RideshareFlowTest | 1 |
| RideReceiptScreen | Partial | RideshareFlowTest | 1 |
| TipDriverScreen | No | -- | 0 |
| HelpSupportScreen | No | -- | 0 |
| PrivacyPolicyScreen | No | -- | 0 |
| TermsConditionsScreen | No | -- | 0 |
| EmailVerificationScreen | No | -- | 0 |
| OrderSuccessScreen | No | -- | 0 |
| PartialOrderScreen | No | -- | 0 |

### Driver App -- 21 screen files, 14 covered (66.7%)

| Screen | Covered | Test File(s) | Tests |
|--------|---------|-------------|-------|
| LoginScreen | Yes | AuthFlowTest | 3 |
| ForgotPasswordScreen | Yes | AuthFlowTest | 2 |
| AvailableOrdersScreen | Yes | DeliveryFlowTest | 4 |
| ActiveDeliveryScreen | Yes | DeliveryFlowTest | 3 |
| DeliveryProofSheet | Yes | DeliveryFlowTest | 1 |
| MyDeliveriesScreen | Yes | DeliveryFlowTest | 1 |
| ProfileScreen | Yes | ProfileFlowTest | 3 |
| DocumentsScreen | Yes | ProfileFlowTest | 1 |
| EarningsScreen | Yes | ProfileFlowTest | 1 |
| MessagesScreen | Yes | ProfileFlowTest | 1 |
| RideshareTabScreen | Yes | RideshareFlowTest | 3 |
| ActiveRideScreen | Yes | RideshareFlowTest | 5 |
| InsuranceDisclosureScreen | Yes | ComplianceScreensTest | 4 |
| BackgroundCheckConsentScreen | Yes | ComplianceScreensTest | 4 |
| VehicleRequirementsScreen | Yes | ComplianceScreensTest | 4 |
| IndependentContractorAgreementScreen | Yes | ComplianceScreensTest | 5 |
| DriverNavGraph (onboarding) | Yes | OnboardingFlowTest | 4 |
| **Not Covered:** | | | |
| ActiveTabScreen | No | -- | 0 |
| PayoutDashboardScreen | Partial | RideshareFlowTest | 1 |
| RideChatScreen | No | -- | 0 |
| CounterOfferResponseSheet | Partial | RideshareFlowTest | 1 |
| FareNegotiationSheet | No | -- | 0 |
| RideDetailSheet | No | -- | 0 |
| AvailableRidesScreen | No | -- | 0 |

### Partner App -- 26 screen files, 14 covered (53.8%)

| Screen | Covered | Test File(s) | Tests |
|--------|---------|-------------|-------|
| LoginScreen | Yes | AuthFlowTest | 2 |
| RegistrationScreen | Yes | AuthFlowTest | 3 |
| OrdersScreen | Yes | OrderManagementFlowTest, OrdersScreenComponentsTest | 27 |
| OrderDetailsScreen | Yes | OrderManagementFlowTest | 2 |
| EnhancedMenuScreen | Yes | MenuManagementFlowTest, MenuScreenComponentsTest | 42 |
| RestaurantSettingsScreen | Yes | SettingsFlowTest | 4 |
| BusinessHoursScreen | Yes | SettingsFlowTest | 1 |
| NotificationSettingsScreen | Yes | SettingsFlowTest | 1 |
| MainScreen (Dashboard) | Yes | PartnerHomeScreenComponentsTest | 26 |
| AnalyticsScreen | Yes | AnalyticsScreenComponentsTest | 26 |
| DeliveryDecisionScreen | Yes | OrderManagementFlowTest | 1 |
| ProfileScreen | Partial | SettingsFlowTest | 1 |
| MenuScreen (basic) | Partial | MenuManagementFlowTest | 2 |
| MarkItemsUnavailableScreen | Partial | MenuManagementFlowTest | 1 |
| **Not Covered:** | | | |
| AIInsightsScreen | No | -- | 0 |
| AIEmployeesScreen | No | -- | 0 |
| DeliveryMapScreen | No | -- | 0 |
| PromotionsScreen | No | -- | 0 |
| CreatePromotionScreen | No | -- | 0 |
| ReviewsScreen | No | -- | 0 |
| RestaurantDocumentsScreen | No | -- | 0 |
| EditProfileScreen | No | -- | 0 |
| KOTSettingsScreen | No | -- | 0 |
| PaymentSettingsScreen | No | -- | 0 |
| FAQScreen | No | -- | 0 |
| EarningsScreen | No | -- | 0 |
| LegalDocumentScreen | No | -- | 0 |
| NotificationsScreen | No | -- | 0 |

### Coverage Summary

| App | Screen Files | Covered | Coverage % |
|-----|-------------|---------|-----------|
| Customer | 39 | 15 | 38.5% |
| Driver | 21 | 14 | 66.7% |
| Partner | 26 | 14 | 53.8% |
| **Overall** | **86** | **43** | **50.0%** |

---

## 5. Test Category Breakdown

| Category | Tests | Modules | Description |
|----------|-------|---------|-------------|
| **Authentication** | 20 | All 3 apps | Login, register, forgot password, social auth, terms acceptance |
| **Food Delivery** | 22 | Customer, Partner | Ordering flow, restaurant browsing, cart, checkout, order management |
| **Rideshare** | 27 | Customer, Driver | Ride request, bidding, active ride, cancel, SOS, negotiation, chat |
| **Profile/Settings** | 29 | All 3 apps | Edit profile, addresses, payments, logout, delete account, notifications |
| **UI Components** | 106 | Partner | StatCard, MenuItemCard, OrderItemCard, CategoryTabs, dialogs, search, charts |
| **Platform Parity** | 16 | Partner | Cross-platform screen/feature/color/API/navigation verification |
| **Compliance/Onboarding** | 25 | Driver | Insurance disclosure, background check, vehicle requirements, IC agreement |
| **API Integration** | 69 | Customer | Staging API tests (57), order field mapping (12) |
| **Navigation** | 4 | Customer | Rideshare screen navigation routing |
| **Setup** | 3 | All modules | Package context verification (ExampleInstrumentedTest) |

---

## 6. Test Infrastructure

### Frameworks and Libraries

| Framework | Module(s) | Purpose |
|-----------|----------|---------|
| JUnit 4 | All | Test runner, assertions, `@Test`, `@Before`, `@Rule` |
| Compose Testing (`ui-test-junit4`) | All 3 apps | `createAndroidComposeRule`, `createComposeRule`, semantic node queries |
| Espresso | All 3 apps | `AndroidJUnit4` runner, instrumentation context |
| OkHttp | Customer (unit) | HTTP client for staging API integration tests |
| Gson | Customer (unit) | JSON serialization for API request/response |
| Assume (JUnit) | Customer, Driver, Partner | `Assume.assumeTrue`/`assumeFalse` for conditional test skipping |

### Test Helpers (3 files)

Each app has a dedicated `TestHelpers.kt` with shared utilities:

| App | File | Key Functions |
|-----|------|---------------|
| Customer | `app/.../helpers/TestHelpers.kt` | `waitForText`, `waitForTextSubstring`, `waitForContentDescription`, `loginWithCredentials`, `navigateToTab`, `isLoginVisible` |
| Driver | `driver/.../helpers/TestHelpers.kt` | Same function set with driver-specific demo credentials |
| Partner | `partner/.../helpers/TestHelpers.kt` | Same function set with partner-specific demo credentials |

### Demo Credentials (Wired into TestHelpers)

| App | Email | Password |
|-----|-------|----------|
| Customer | `demo.customer@dollor.ai` | `DemoCustomer2025!` |
| Driver | `demo.driver@dollor.ai` | `DemoDriver2025!` |
| Partner | `demo.restaurant@dollor.ai` | `DemoRestaurant2025!` |

### Build Variants

| Task | Type | Requires |
|------|------|----------|
| `testDebugUnitTest` | JVM unit tests | Gradle only (no device) |
| `connectedDebugAndroidTest` | Instrumented tests | Physical device or emulator |

### Test Patterns

- **Auth guard**: Tests requiring logged-in state use `skipIfNotLoggedIn()` with `Assume.assumeFalse(isLoginVisible())` -- graceful skip when unauthenticated
- **Compose component tests**: Partner UI component tests use `createComposeRule()` (no Activity) with `setContent {}` for isolated component rendering
- **Flow tests**: Customer/Driver/Partner flow tests use `createAndroidComposeRule<MainActivity>()` for full-app context
- **API tests**: Customer staging tests use `@FixMethodOrder(MethodSorters.NAME_ASCENDING)` with shared companion state for sequential API calls

---

## 7. Accessibility / TestTag Audit

### Current Query Patterns

| Pattern | Usage | Count (approx.) |
|---------|-------|-----------------|
| `onNodeWithText(exact)` | Primary element queries | ~180 |
| `onNodeWithText(substring=true)` | Flexible text matching | ~120 |
| `onNodeWithContentDescription` | Icon/image buttons | ~12 |
| `onNodeWithTag` | Semantic test tags | ~3 (partner only) |

### Observations

1. **Text-based queries dominate**: Nearly all tests use `onNodeWithText` rather than `Modifier.testTag()`. This makes tests fragile to text changes but readable.

2. **Partner component tests use testTag**: `MenuScreenComponentsTest` uses `onNodeWithTag("availability_toggle")` and `onNodeWithTag("revenue_chart")` -- the only module with testTag usage.

3. **Content description used sparingly**: Only driver compliance screens use `onNodeWithContentDescription("Back")` for navigation testing. Partner menu tests use `onNodeWithContentDescription("Edit item")`, `"Delete item"`, `"Clear search"`, `"Item image"`.

4. **waitForText pattern**: All 3 apps use the same `waitForText`/`waitForTextSubstring` helper pattern with 5-second timeout and `ComposeTimeoutException` catch. This is robust for device tests but adds latency.

5. **No accessibility label testing**: No tests verify `Modifier.semantics { contentDescription = ... }` or `Modifier.clearAndSetSemantics {}` patterns. Accessibility compliance is untested.

### Improvement Opportunities

- Add `Modifier.testTag()` to critical UI elements across all apps (buttons, inputs, cards) for more robust selectors
- Create accessibility-specific tests verifying screen reader labels on interactive elements
- Consider migrating text-based queries to testTag-based queries for elements where the display text may change (localization)

---

## 8. Recommendations

### High Priority

1. **Add unit tests for driver module** -- Currently 0 unit tests. Add at minimum:
   - API integration tests (mirroring CustomerAppStagingApiTest pattern)
   - Navigation routing tests
   - ViewModel logic tests for earnings calculation, online status

2. **Add unit tests for partner module** -- Only 1 placeholder test. Add:
   - API integration tests for order management, menu CRUD
   - ViewModel tests for analytics calculations, order status transitions

3. **Add testTag modifiers to key UI elements** across all apps:
   - Login form fields and buttons
   - Navigation tabs
   - Order/ride action buttons
   - Profile menu items

### Medium Priority

4. **Screen coverage gaps -- top 5 untested screens per app:**

   **Customer:** DealsScreen, FavoritesScreen, NotificationScreen, RateDriverScreen, RateRestaurantScreen

   **Driver:** ActiveTabScreen, RideChatScreen, FareNegotiationSheet, RideDetailSheet, AvailableRidesScreen

   **Partner:** AIInsightsScreen, AIEmployeesScreen, PromotionsScreen, ReviewsScreen, RestaurantDocumentsScreen

5. **Consider Robolectric** for running Compose instrumented tests on JVM without an emulator. This would enable:
   - Running all 263 instrumented tests in CI without device provisioning
   - Faster feedback loops (seconds vs minutes)
   - Partner component tests are already device-independent (`createComposeRule`) and could migrate easily

6. **Add screenshot/snapshot tests** for visual regression detection:
   - Partner component tests are ideal candidates (isolated rendering with `setContent`)
   - Consider Paparazzi (JVM-based, no device needed) or Roborazzi

### Low Priority

7. **Test data isolation** -- Customer staging API tests share state via companion object. Consider:
   - Creating fresh test accounts per test run
   - Using `@Before`/`@After` cleanup hooks
   - Adding test-specific demo account creation via `POST /api/demo/setup`

8. **Performance benchmarks** -- Add `@LargeTest` annotated performance tests for:
   - App cold start time
   - Screen transition latency
   - List scrolling performance (restaurant list, order list)

9. **Error state testing** -- Currently no tests verify:
   - Network error handling (no connectivity)
   - Empty state displays (no orders, no restaurants)
   - Invalid input validation (email format, password requirements)
   - Token expiration handling

---

## Appendix: Test File Locations

### Unit Tests (src/test/)

```
app/src/test/java/ai/dollor/customer/
    ExampleUnitTest.kt
    staging/CustomerAppStagingApiTest.kt
    staging/OrderCreationFieldMappingTest.kt
    ui/navigation/RideshareNavigationTest.kt
shared/src/test/java/ai/dollor/shared/ExampleUnitTest.kt
partner/src/test/java/ai/dollor/partner/ExampleUnitTest.kt
```

### Instrumented Tests (src/androidTest/)

```
app/src/androidTest/java/ai/dollor/customer/
    ExampleInstrumentedTest.kt
    flows/AuthFlowTest.kt
    flows/FoodDeliveryFlowTest.kt
    flows/RideshareFlowTest.kt
    flows/ProfileSettingsFlowTest.kt
    helpers/TestHelpers.kt

driver/src/androidTest/java/ai/dollor/driver/
    flows/AuthFlowTest.kt
    flows/DeliveryFlowTest.kt
    flows/DriverProfileFlowTest.kt
    flows/RideshareDriverFlowTest.kt
    ui/compliance/DriverComplianceScreensTest.kt
    ui/navigation/DriverOnboardingFlowTest.kt
    helpers/TestHelpers.kt

partner/src/androidTest/java/ai/dollor/partner/
    ExampleInstrumentedTest.kt
    PlatformParityTest.kt
    flows/AuthFlowTest.kt
    flows/OrderManagementFlowTest.kt
    flows/MenuManagementFlowTest.kt
    flows/SettingsFlowTest.kt
    ui/home/PartnerHomeScreenComponentsTest.kt
    ui/menu/MenuScreenComponentsTest.kt
    ui/orders/OrdersScreenComponentsTest.kt
    ui/analytics/AnalyticsScreenComponentsTest.kt
    helpers/TestHelpers.kt

shared/src/androidTest/java/ai/dollor/shared/
    ExampleInstrumentedTest.kt
```
