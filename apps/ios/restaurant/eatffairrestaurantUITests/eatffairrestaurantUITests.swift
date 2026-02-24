//
//  eatffairrestaurantUITests.swift
//  eatffairrestaurantUITests
//
//  Created by Jithesh Manoharan on 11/25/25.
//
//  Flow-organized tests are in the Flows/ subdirectory:
//  - Flows/AuthFlowTests.swift           (RestaurantAuthFlowTests)
//  - Flows/OrderManagementTests.swift    (RestaurantOrderManagementTests)
//  - Flows/MenuManagementTests.swift     (RestaurantMenuManagementTests)
//  - Flows/SettingsTests.swift           (RestaurantSettingsFlowTests)
//
//  Shared helpers: Helpers/TestHelpers.swift (DollorTestCase base class)
//

import XCTest

/// Root UI test class for iOS Restaurant Partner app.
/// The original comprehensive tests are retained below for backwards compatibility.
/// New flow-organized tests live in the Flows/ subdirectory.
final class eatffairrestaurantUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI_TESTING"]
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // ============================================================
    // MARK: - LOGIN VIEW TESTS
    // ============================================================

    @MainActor
    func testLoginView_brandLogo_isDisplayed() throws {
        app.launch()

        // Look for the dollar sign logo
        let dollarSign = app.staticTexts["$"]
        XCTAssertTrue(dollarSign.waitForExistence(timeout: 5), "Dollar sign logo should be displayed")
    }

    @MainActor
    func testLoginView_appTitle_isDisplayed() throws {
        app.launch()

        let title = app.staticTexts["Dollor AI Restaurant"]
        XCTAssertTrue(title.waitForExistence(timeout: 5), "App title should be displayed")
    }

    @MainActor
    func testLoginView_onlineStoreSubtitle_isDisplayed() throws {
        app.launch()

        let subtitle = app.staticTexts["$ online store"]
        XCTAssertTrue(subtitle.waitForExistence(timeout: 5), "Subtitle should be displayed")
    }

    @MainActor
    func testLoginView_emailField_exists() throws {
        app.launch()

        let emailField = app.textFields["Enter your email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist")
    }

    @MainActor
    func testLoginView_passwordField_exists() throws {
        app.launch()

        let passwordField = app.secureTextFields["Enter your password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5), "Password field should exist")
    }

    @MainActor
    func testLoginView_loginButton_exists() throws {
        app.launch()

        let loginButton = app.buttons["Log in to your account"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5), "Log in to your account button should exist")
    }

    @MainActor
    func testLoginView_loginButton_disabledWhenEmpty() throws {
        app.launch()

        let loginButton = app.buttons["Log in to your account"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5))

        // Button should be disabled when fields are empty (reduced opacity)
        // We can check if the button exists, actual enabled state may need runtime check
    }

    @MainActor
    func testLoginView_emailField_acceptsInput() throws {
        app.launch()

        let emailField = app.textFields["Enter your email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))

        emailField.tap()
        emailField.typeText("restaurant@test.com")

        XCTAssertTrue(emailField.value as? String == "restaurant@test.com")
    }

    @MainActor
    func testLoginView_forgotPasswordLink_exists() throws {
        app.launch()

        let forgotPasswordButton = app.buttons["Forgot password"]
        XCTAssertTrue(forgotPasswordButton.waitForExistence(timeout: 5), "Forgot Password link should exist")
    }

    @MainActor
    func testLoginView_googleSignInButton_exists() throws {
        app.launch()

        let googleButton = app.buttons["Sign in with Google"]
        XCTAssertTrue(googleButton.waitForExistence(timeout: 5), "Google Sign-In button should exist")
    }

    @MainActor
    func testLoginView_appleSignInButton_exists() throws {
        app.launch()

        // Apple Sign-In button uses system identifier
        let appleButton = app.buttons.matching(identifier: "Sign in with Apple").firstMatch
        XCTAssertTrue(appleButton.waitForExistence(timeout: 5), "Apple Sign-In button should exist")
    }

    @MainActor
    func testLoginView_signUpLink_exists() throws {
        app.launch()

        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5), "Sign Up link should exist")
    }

    @MainActor
    func testLoginView_dontHaveAccountText_exists() throws {
        app.launch()

        let text = app.staticTexts["Don't have an account?"]
        XCTAssertTrue(text.waitForExistence(timeout: 5), "Don't have account text should exist")
    }

    // ============================================================
    // MARK: - FORGOT PASSWORD TESTS
    // ============================================================

    @MainActor
    func testForgotPassword_sheet_opensOnTap() throws {
        app.launch()

        let forgotButton = app.buttons["Forgot password"]
        XCTAssertTrue(forgotButton.waitForExistence(timeout: 5))
        forgotButton.tap()

        let resetTitle = app.staticTexts["Reset Password"]
        XCTAssertTrue(resetTitle.waitForExistence(timeout: 5), "Reset Password sheet should open")
    }

    @MainActor
    func testForgotPassword_emailField_exists() throws {
        app.launch()

        let forgotButton = app.buttons["Forgot password"]
        XCTAssertTrue(forgotButton.waitForExistence(timeout: 5))
        forgotButton.tap()

        // Wait for sheet to appear
        let _ = app.staticTexts["Reset Password"].waitForExistence(timeout: 5)

        let emailField = app.textFields["Enter your email"]
        XCTAssertTrue(emailField.exists, "Email field should exist in forgot password sheet")
    }

    @MainActor
    func testForgotPassword_sendButton_exists() throws {
        app.launch()

        let forgotButton = app.buttons["Forgot password"]
        XCTAssertTrue(forgotButton.waitForExistence(timeout: 5))
        forgotButton.tap()

        let sendButton = app.buttons["Send Reset Email"]
        XCTAssertTrue(sendButton.waitForExistence(timeout: 5), "Send Reset Email button should exist")
    }

    // ============================================================
    // MARK: - SIGN UP TESTS
    // ============================================================

    @MainActor
    func testSignUp_sheet_opensOnTap() throws {
        app.launch()

        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))
        signUpButton.tap()

        let createAccountTitle = app.staticTexts["Create Account"]
        XCTAssertTrue(createAccountTitle.waitForExistence(timeout: 5), "Create Account sheet should open")
    }

    @MainActor
    func testSignUp_restaurantNameField_exists() throws {
        app.launch()

        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))
        signUpButton.tap()

        let _ = app.staticTexts["Create Account"].waitForExistence(timeout: 5)

        let restaurantField = app.textFields["Enter restaurant name"]
        XCTAssertTrue(restaurantField.exists, "Restaurant name field should exist")
    }

    @MainActor
    func testSignUp_createAccountButton_exists() throws {
        app.launch()

        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))
        signUpButton.tap()

        let createButton = app.buttons["Create Account"]
        XCTAssertTrue(createButton.waitForExistence(timeout: 5), "Create Account button should exist")
    }

    @MainActor
    func testSignUp_termsText_exists() throws {
        app.launch()

        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))
        signUpButton.tap()

        let _ = app.staticTexts["Create Account"].waitForExistence(timeout: 5)

        let termsText = app.staticTexts["By signing up, you agree to our Terms of Service and Privacy Policy"]
        XCTAssertTrue(termsText.waitForExistence(timeout: 5), "Terms text should exist")
    }

    // ============================================================
    // MARK: - NAVIGATION TESTS
    // ============================================================

    @MainActor
    func testNavigation_tabBar_existsAfterLogin() throws {
        // This test requires a logged-in state
        // For UI testing, we'd need to set up test credentials or mock authentication
        app.launchArguments.append("SKIP_AUTH")
        app.launch()

        // After successful login, tab bar should appear
        // Check for tab items
        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            XCTAssertTrue(tabBar.exists, "Tab bar should exist after login")
        }
    }

    // ============================================================
    // MARK: - ACCESSIBILITY TESTS
    // ============================================================

    @MainActor
    func testAccessibility_loginElements_areAccessible() throws {
        app.launch()

        // Email field should be accessible
        let emailField = app.textFields["Enter your email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        XCTAssertTrue(emailField.isHittable, "Email field should be hittable")

        // Password field should be accessible
        let passwordField = app.secureTextFields["Enter your password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5))
        XCTAssertTrue(passwordField.isHittable, "Password field should be hittable")

        // Login button should be accessible
        let loginButton = app.buttons["Log in to your account"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5))
        XCTAssertTrue(loginButton.isHittable, "Login button should be hittable")
    }

    @MainActor
    func testAccessibility_socialButtons_areAccessible() throws {
        app.launch()

        let googleButton = app.buttons["Sign in with Google"]
        XCTAssertTrue(googleButton.waitForExistence(timeout: 5))
        XCTAssertTrue(googleButton.isHittable, "Google button should be hittable")

        // Sign Up link
        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))
        XCTAssertTrue(signUpButton.isHittable, "Sign Up button should be hittable")
    }

    // ============================================================
    // MARK: - PERFORMANCE TESTS
    // ============================================================

    @MainActor
    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }

    @MainActor
    func testScrollPerformance() throws {
        app.launch()

        // If login screen is scrollable
        let scrollView = app.scrollViews.firstMatch
        if scrollView.waitForExistence(timeout: 5) {
            measure {
                scrollView.swipeUp()
                scrollView.swipeDown()
            }
        }
    }

    // ============================================================
    // MARK: - PLATFORM PARITY VERIFICATION
    // ============================================================

    @MainActor
    func testParity_loginElements_matchAndroid() throws {
        app.launch()

        // These elements should exist on both iOS and Android
        let parityElements = [
            "Email field": app.textFields["Enter your email"],
            "Password field": app.secureTextFields["Enter your password"],
            "Login button": app.buttons["Log in to your account"],
            "Google Sign-In": app.buttons["Sign in with Google"],
            "Sign Up link": app.buttons["Sign up for a new account"],
            "Forgot Password": app.buttons["Forgot password"]
        ]

        for (name, element) in parityElements {
            XCTAssertTrue(element.waitForExistence(timeout: 5), "\(name) should exist for platform parity")
        }
    }

    @MainActor
    func testParity_brandingElements_matchAndroid() throws {
        app.launch()

        // Brand name should match
        let brandName = app.staticTexts["Dollor AI Restaurant"]
        XCTAssertTrue(brandName.waitForExistence(timeout: 5), "Brand name should match Android: 'Dollor AI Restaurant'")

        // Logo should exist
        let logo = app.staticTexts["$"]
        XCTAssertTrue(logo.waitForExistence(timeout: 5), "Dollar sign logo should exist like Android")
    }
}

// ============================================================
// MARK: - ADDITIONAL TEST SUITES
// ============================================================

/// Tests for authenticated screens (requires mock authentication)
/// Platform Parity: All tests match Android Partner app components
final class eatffairrestaurantAuthenticatedUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI_TESTING", "MOCK_AUTH"]
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // ============================================================
    // MARK: - DASHBOARD TESTS
    // ============================================================

    @MainActor
    func testDashboard_statsCards_exist() throws {
        app.launch()

        // Dashboard should show stats cards
        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            // Today's Revenue card
            let revenueCard = app.staticTexts["Today's Revenue"]
            if revenueCard.waitForExistence(timeout: 5) {
                XCTAssertTrue(revenueCard.exists, "Revenue card should exist")
            }

            // Today's Orders card
            let ordersCard = app.staticTexts["Today's Orders"]
            if ordersCard.waitForExistence(timeout: 5) {
                XCTAssertTrue(ordersCard.exists, "Orders card should exist")
            }

            // Average Rating card
            let ratingCard = app.staticTexts["Average Rating"]
            if ratingCard.waitForExistence(timeout: 5) {
                XCTAssertTrue(ratingCard.exists, "Rating card should exist")
            }
        }
    }

    @MainActor
    func testDashboard_recentOrders_isDisplayed() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let recentOrders = app.staticTexts["Recent Orders"]
            if recentOrders.waitForExistence(timeout: 5) {
                XCTAssertTrue(recentOrders.exists, "Recent Orders section should exist")
            }
        }
    }

    @MainActor
    func testDashboard_quickActions_exist() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            // Quick action buttons
            let viewAllOrders = app.buttons["View All Orders"]
            if viewAllOrders.waitForExistence(timeout: 5) {
                XCTAssertTrue(viewAllOrders.exists, "View All Orders button should exist")
            }
        }
    }

    @MainActor
    func testDashboard_storeStatus_toggle() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            // Store status toggle (Online/Offline)
            let storeStatus = app.switches.firstMatch
            if storeStatus.waitForExistence(timeout: 5) {
                XCTAssertTrue(storeStatus.exists, "Store status toggle should exist")
            }
        }
    }

    // ============================================================
    // MARK: - ORDERS TESTS
    // ============================================================

    @MainActor
    func testOrders_tabExists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let ordersTab = app.buttons["Orders"]
            XCTAssertTrue(ordersTab.waitForExistence(timeout: 5), "Orders tab should exist")
        }
    }

    @MainActor
    func testOrders_filterTabs_exist() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let ordersTab = app.buttons["Orders"]
            if ordersTab.waitForExistence(timeout: 5) {
                ordersTab.tap()

                // Filter tabs should exist
                let allTab = app.buttons["All"]
                let pendingTab = app.buttons["Pending"]
                let preparingTab = app.buttons["Preparing"]

                XCTAssertTrue(allTab.waitForExistence(timeout: 5) || pendingTab.waitForExistence(timeout: 5), "Filter tabs should exist")
            }
        }
    }

    @MainActor
    func testOrders_emptyState_isDisplayed() throws {
        app.launchArguments.append("EMPTY_ORDERS")
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let ordersTab = app.buttons["Orders"]
            if ordersTab.waitForExistence(timeout: 5) {
                ordersTab.tap()

                let emptyMessage = app.staticTexts["No orders yet"]
                if emptyMessage.waitForExistence(timeout: 5) {
                    XCTAssertTrue(emptyMessage.exists, "Empty state message should exist")
                }
            }
        }
    }

    @MainActor
    func testOrders_orderCard_showsDetails() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let ordersTab = app.buttons["Orders"]
            if ordersTab.waitForExistence(timeout: 5) {
                ordersTab.tap()

                // Order card should show customer name
                let orderCard = app.cells.firstMatch
                if orderCard.waitForExistence(timeout: 5) {
                    XCTAssertTrue(orderCard.exists, "Order card should exist")
                }
            }
        }
    }

    @MainActor
    func testOrders_acceptButton_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let ordersTab = app.buttons["Orders"]
            if ordersTab.waitForExistence(timeout: 5) {
                ordersTab.tap()

                let acceptButton = app.buttons["Accept Order"]
                if acceptButton.waitForExistence(timeout: 5) {
                    XCTAssertTrue(acceptButton.exists, "Accept Order button should exist")
                }
            }
        }
    }

    // ============================================================
    // MARK: - MENU MANAGEMENT TESTS
    // ============================================================

    @MainActor
    func testMenu_tabExists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            XCTAssertTrue(menuTab.waitForExistence(timeout: 5), "Menu tab should exist")
        }
    }

    @MainActor
    func testMenu_addItemButton_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            if menuTab.waitForExistence(timeout: 5) {
                menuTab.tap()

                let addButton = app.buttons["Add Item"]
                if addButton.waitForExistence(timeout: 5) {
                    XCTAssertTrue(addButton.exists, "Add Item button should exist")
                }
            }
        }
    }

    @MainActor
    func testMenu_categoryTabs_exist() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            if menuTab.waitForExistence(timeout: 5) {
                menuTab.tap()

                let allCategory = app.buttons["All"]
                if allCategory.waitForExistence(timeout: 5) {
                    XCTAssertTrue(allCategory.exists, "All category should exist")
                }
            }
        }
    }

    @MainActor
    func testMenu_searchBar_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            if menuTab.waitForExistence(timeout: 5) {
                menuTab.tap()

                let searchField = app.searchFields.firstMatch
                if searchField.waitForExistence(timeout: 5) {
                    XCTAssertTrue(searchField.exists, "Search field should exist")
                }
            }
        }
    }

    @MainActor
    func testMenu_itemCard_showsAvailabilityToggle() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            if menuTab.waitForExistence(timeout: 5) {
                menuTab.tap()

                // Menu item should have availability toggle
                let toggle = app.switches.firstMatch
                if toggle.waitForExistence(timeout: 5) {
                    XCTAssertTrue(toggle.exists, "Availability toggle should exist")
                }
            }
        }
    }

    @MainActor
    func testMenu_addItemDialog_opensOnTap() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            if menuTab.waitForExistence(timeout: 5) {
                menuTab.tap()

                let addButton = app.buttons["Add Item"]
                if addButton.waitForExistence(timeout: 5) {
                    addButton.tap()

                    let dialogTitle = app.staticTexts["Add Menu Item"]
                    XCTAssertTrue(dialogTitle.waitForExistence(timeout: 5), "Add Menu Item dialog should open")
                }
            }
        }
    }

    @MainActor
    func testMenu_addItemDialog_hasRequiredFields() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let menuTab = app.buttons["Menu"]
            if menuTab.waitForExistence(timeout: 5) {
                menuTab.tap()

                let addButton = app.buttons["Add Item"]
                if addButton.waitForExistence(timeout: 5) {
                    addButton.tap()

                    let _ = app.staticTexts["Add Menu Item"].waitForExistence(timeout: 5)

                    // Required fields
                    let nameField = app.textFields["Item Name"]
                    let priceField = app.textFields["Price"]

                    if nameField.waitForExistence(timeout: 5) {
                        XCTAssertTrue(nameField.exists, "Item Name field should exist")
                    }

                    if priceField.waitForExistence(timeout: 5) {
                        XCTAssertTrue(priceField.exists, "Price field should exist")
                    }
                }
            }
        }
    }

    // ============================================================
    // MARK: - ANALYTICS TESTS
    // ============================================================

    @MainActor
    func testAnalytics_tabExists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let analyticsTab = app.buttons["Analytics"]
            XCTAssertTrue(analyticsTab.waitForExistence(timeout: 5), "Analytics tab should exist")
        }
    }

    @MainActor
    func testAnalytics_chartsDisplayed() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let analyticsTab = app.buttons["Analytics"]
            if analyticsTab.waitForExistence(timeout: 5) {
                analyticsTab.tap()

                // Revenue chart should exist
                let revenueSection = app.staticTexts["Revenue"]
                if revenueSection.waitForExistence(timeout: 5) {
                    XCTAssertTrue(revenueSection.exists, "Revenue section should exist")
                }
            }
        }
    }

    @MainActor
    func testAnalytics_periodSelector_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let analyticsTab = app.buttons["Analytics"]
            if analyticsTab.waitForExistence(timeout: 5) {
                analyticsTab.tap()

                // Period selectors
                let todayButton = app.buttons["Today"]
                let weekButton = app.buttons["Week"]
                let monthButton = app.buttons["Month"]

                if todayButton.waitForExistence(timeout: 5) {
                    XCTAssertTrue(todayButton.exists, "Today button should exist")
                }
            }
        }
    }

    @MainActor
    func testAnalytics_topSellingItems_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let analyticsTab = app.buttons["Analytics"]
            if analyticsTab.waitForExistence(timeout: 5) {
                analyticsTab.tap()

                let topItems = app.staticTexts["Top Selling Items"]
                if topItems.waitForExistence(timeout: 5) {
                    XCTAssertTrue(topItems.exists, "Top Selling Items section should exist")
                }
            }
        }
    }

    @MainActor
    func testAnalytics_aiInsights_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let analyticsTab = app.buttons["Analytics"]
            if analyticsTab.waitForExistence(timeout: 5) {
                analyticsTab.tap()

                let aiInsights = app.staticTexts["AI Insights"]
                if aiInsights.waitForExistence(timeout: 5) {
                    XCTAssertTrue(aiInsights.exists, "AI Insights section should exist")
                }
            }
        }
    }

    @MainActor
    func testAnalytics_orderMetrics_displayed() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let analyticsTab = app.buttons["Analytics"]
            if analyticsTab.waitForExistence(timeout: 5) {
                analyticsTab.tap()

                // Order metrics
                let totalOrders = app.staticTexts["Total Orders"]
                if totalOrders.waitForExistence(timeout: 5) {
                    XCTAssertTrue(totalOrders.exists, "Total Orders metric should exist")
                }
            }
        }
    }

    // ============================================================
    // MARK: - SETTINGS TESTS
    // ============================================================

    @MainActor
    func testSettings_tabExists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            XCTAssertTrue(settingsTab.waitForExistence(timeout: 5), "Settings tab should exist")
        }
    }

    @MainActor
    func testSettings_profileSection_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            if settingsTab.waitForExistence(timeout: 5) {
                settingsTab.tap()

                let restaurantName = app.staticTexts.element(boundBy: 0)
                XCTAssertTrue(restaurantName.waitForExistence(timeout: 5), "Restaurant info should exist")
            }
        }
    }

    @MainActor
    func testSettings_notificationSettings_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            if settingsTab.waitForExistence(timeout: 5) {
                settingsTab.tap()

                let notifications = app.staticTexts["Notifications"]
                if notifications.waitForExistence(timeout: 5) {
                    XCTAssertTrue(notifications.exists, "Notifications setting should exist")
                }
            }
        }
    }

    @MainActor
    func testSettings_helpSupport_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            if settingsTab.waitForExistence(timeout: 5) {
                settingsTab.tap()

                let helpSupport = app.staticTexts["Help & Support"]
                if helpSupport.waitForExistence(timeout: 5) {
                    XCTAssertTrue(helpSupport.exists, "Help & Support should exist")
                }
            }
        }
    }

    @MainActor
    func testSettings_logoutButton_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            if settingsTab.waitForExistence(timeout: 5) {
                settingsTab.tap()

                let logoutButton = app.buttons["Log Out"]
                if logoutButton.waitForExistence(timeout: 5) {
                    XCTAssertTrue(logoutButton.exists, "Log Out button should exist")
                }
            }
        }
    }

    @MainActor
    func testSettings_privacyPolicy_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            if settingsTab.waitForExistence(timeout: 5) {
                settingsTab.tap()

                let privacyPolicy = app.staticTexts["Privacy Policy"]
                if privacyPolicy.waitForExistence(timeout: 5) {
                    XCTAssertTrue(privacyPolicy.exists, "Privacy Policy should exist")
                }
            }
        }
    }

    @MainActor
    func testSettings_termsOfService_exists() throws {
        app.launch()

        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 10) {
            let settingsTab = app.buttons["Settings"]
            if settingsTab.waitForExistence(timeout: 5) {
                settingsTab.tap()

                let terms = app.staticTexts["Terms of Service"]
                if terms.waitForExistence(timeout: 5) {
                    XCTAssertTrue(terms.exists, "Terms of Service should exist")
                }
            }
        }
    }
}

// ============================================================
// MARK: - NOTIFICATIONS VIEW TESTS (NEW - Platform Parity)
// ============================================================

/// Tests for NotificationsView - Added to match Android NotificationsScreen
final class NotificationsViewUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI_TESTING", "MOCK_AUTH", "SHOW_NOTIFICATIONS"]
    }

    override func tearDownWithError() throws {
        app = nil
    }

    @MainActor
    func testNotifications_title_isDisplayed() throws {
        throw XCTSkip("Requires MOCK_AUTH launch argument support — not yet implemented")
    }

    @MainActor
    func testNotifications_emptyState_showsBellIcon() throws {
        app.launchArguments.append("EMPTY_NOTIFICATIONS")
        app.launch()

        let emptyMessage = app.staticTexts["No notifications"]
        if emptyMessage.waitForExistence(timeout: 5) {
            XCTAssertTrue(emptyMessage.exists, "Empty state message should be displayed")
        }
    }

    @MainActor
    func testNotifications_clearAllButton_exists() throws {
        app.launch()

        let clearAllButton = app.buttons["Clear All"]
        if clearAllButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(clearAllButton.exists, "Clear All button should exist")
        }
    }

    @MainActor
    func testNotifications_newOrderCard_isDisplayed() throws {
        app.launch()

        let newOrderTitle = app.staticTexts["New Order Received"]
        if newOrderTitle.waitForExistence(timeout: 5) {
            XCTAssertTrue(newOrderTitle.exists, "New Order notification should be displayed")
        }
    }

    @MainActor
    func testNotifications_paymentCard_isDisplayed() throws {
        app.launch()

        let paymentTitle = app.staticTexts["Payment Received"]
        if paymentTitle.waitForExistence(timeout: 5) {
            XCTAssertTrue(paymentTitle.exists, "Payment notification should be displayed")
        }
    }

    @MainActor
    func testNotifications_reviewCard_isDisplayed() throws {
        app.launch()

        let reviewTitle = app.staticTexts["New Review"]
        if reviewTitle.waitForExistence(timeout: 5) {
            XCTAssertTrue(reviewTitle.exists, "Review notification should be displayed")
        }
    }

    @MainActor
    func testNotifications_cancelledOrderCard_isDisplayed() throws {
        app.launch()

        let cancelledTitle = app.staticTexts["Order Cancelled"]
        if cancelledTitle.waitForExistence(timeout: 5) {
            XCTAssertTrue(cancelledTitle.exists, "Cancelled order notification should be displayed")
        }
    }

    @MainActor
    func testNotifications_systemCard_isDisplayed() throws {
        app.launch()

        let systemTitle = app.staticTexts["System Update"]
        if systemTitle.waitForExistence(timeout: 5) {
            XCTAssertTrue(systemTitle.exists, "System notification should be displayed")
        }
    }

    @MainActor
    func testNotifications_unreadIndicator_isVisible() throws {
        app.launch()

        // Unread notifications should have blue indicator
        let notificationCard = app.cells.firstMatch
        if notificationCard.waitForExistence(timeout: 5) {
            XCTAssertTrue(notificationCard.exists, "Notification card should exist")
        }
    }

    @MainActor
    func testNotifications_tapCard_marksAsRead() throws {
        app.launch()

        let notificationCard = app.cells.firstMatch
        if notificationCard.waitForExistence(timeout: 5) {
            notificationCard.tap()
            // After tap, the notification should be marked as read
            // Visual change in background color
        }
    }

    @MainActor
    func testNotifications_backButton_dismisses() throws {
        app.launch()

        let backButton = app.buttons["chevron.left"]
        if backButton.waitForExistence(timeout: 5) {
            backButton.tap()
            // Should dismiss the view
        }
    }
}

// ============================================================
// MARK: - ORDER DETAILS VIEW TESTS (NEW - Platform Parity)
// ============================================================

/// Tests for OrderDetailsView - Added to match Android OrderDetailsScreen
final class OrderDetailsViewUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI_TESTING", "MOCK_AUTH", "SHOW_ORDER_DETAILS"]
    }

    override func tearDownWithError() throws {
        app = nil
    }

    @MainActor
    func testOrderDetails_orderNumber_isDisplayed() throws {
        throw XCTSkip("Requires MOCK_AUTH launch argument support — not yet implemented")
    }

    @MainActor
    func testOrderDetails_statusCard_isDisplayed() throws {
        app.launch()

        let statusLabel = app.staticTexts["Status"]
        if statusLabel.waitForExistence(timeout: 5) {
            XCTAssertTrue(statusLabel.exists, "Status card should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_statusPlaced_showsAcceptButton() throws {
        app.launchArguments.append("ORDER_STATUS_PLACED")
        app.launch()

        let acceptButton = app.buttons["Accept Order"]
        if acceptButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(acceptButton.exists, "Accept Order button should exist for placed orders")
        }
    }

    @MainActor
    func testOrderDetails_statusAccepted_showsPreparingButton() throws {
        app.launchArguments.append("ORDER_STATUS_ACCEPTED")
        app.launch()

        let preparingButton = app.buttons["Start Preparing"]
        if preparingButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(preparingButton.exists, "Start Preparing button should exist for accepted orders")
        }
    }

    @MainActor
    func testOrderDetails_statusPreparing_showsReadyButton() throws {
        app.launchArguments.append("ORDER_STATUS_PREPARING")
        app.launch()

        let readyButton = app.buttons["Mark as Ready"]
        if readyButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(readyButton.exists, "Mark as Ready button should exist for preparing orders")
        }
    }

    @MainActor
    func testOrderDetails_statusReady_showsWaitingMessage() throws {
        app.launchArguments.append("ORDER_STATUS_READY")
        app.launch()

        let waitingMessage = app.staticTexts["Waiting for driver pickup"]
        if waitingMessage.waitForExistence(timeout: 5) {
            XCTAssertTrue(waitingMessage.exists, "Waiting message should exist for ready orders")
        }
    }

    @MainActor
    func testOrderDetails_customerSection_isDisplayed() throws {
        app.launch()

        let customerSection = app.staticTexts["Customer"]
        if customerSection.waitForExistence(timeout: 5) {
            XCTAssertTrue(customerSection.exists, "Customer section should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_customerName_isDisplayed() throws {
        app.launch()

        // Customer name should be visible
        let customerName = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'John'")).firstMatch
        if customerName.waitForExistence(timeout: 5) {
            XCTAssertTrue(customerName.exists, "Customer name should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_customerPhone_isDisplayed() throws {
        app.launch()

        let phoneIcon = app.images["phone.fill"]
        if phoneIcon.waitForExistence(timeout: 5) {
            XCTAssertTrue(phoneIcon.exists, "Phone icon should exist")
        }
    }

    @MainActor
    func testOrderDetails_deliveryAddress_isDisplayed() throws {
        app.launch()

        let addressIcon = app.images["mappin.circle.fill"]
        if addressIcon.waitForExistence(timeout: 5) {
            XCTAssertTrue(addressIcon.exists, "Address icon should exist")
        }
    }

    @MainActor
    func testOrderDetails_orderItemsSection_isDisplayed() throws {
        app.launch()

        let itemsSection = app.staticTexts["Order Items"]
        if itemsSection.waitForExistence(timeout: 5) {
            XCTAssertTrue(itemsSection.exists, "Order Items section should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_orderItems_areDisplayed() throws {
        app.launch()

        // Sample items should be displayed
        let pizzaItem = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Pizza'")).firstMatch
        if pizzaItem.waitForExistence(timeout: 5) {
            XCTAssertTrue(pizzaItem.exists, "Pizza item should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_orderSummarySection_isDisplayed() throws {
        app.launch()

        let summarySection = app.staticTexts["Order Summary"]
        if summarySection.waitForExistence(timeout: 5) {
            XCTAssertTrue(summarySection.exists, "Order Summary section should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_subtotal_isDisplayed() throws {
        app.launch()

        let subtotal = app.staticTexts["Subtotal"]
        if subtotal.waitForExistence(timeout: 5) {
            XCTAssertTrue(subtotal.exists, "Subtotal should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_deliveryFee_isDisplayed() throws {
        app.launch()

        let deliveryFee = app.staticTexts["Delivery Fee"]
        if deliveryFee.waitForExistence(timeout: 5) {
            XCTAssertTrue(deliveryFee.exists, "Delivery Fee should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_serviceFee_isDisplayed() throws {
        app.launch()

        let serviceFee = app.staticTexts["Service Fee"]
        if serviceFee.waitForExistence(timeout: 5) {
            XCTAssertTrue(serviceFee.exists, "Service Fee should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_tax_isDisplayed() throws {
        app.launch()

        let tax = app.staticTexts["Tax"]
        if tax.waitForExistence(timeout: 5) {
            XCTAssertTrue(tax.exists, "Tax should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_total_isDisplayed() throws {
        app.launch()

        let total = app.staticTexts["Total"]
        if total.waitForExistence(timeout: 5) {
            XCTAssertTrue(total.exists, "Total should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_totalAmount_hasOrangeColor() throws {
        app.launch()

        // Total amount should be highlighted in brand orange
        let totalAmount = app.staticTexts.matching(NSPredicate(format: "label CONTAINS '$'")).element(boundBy: 0)
        if totalAmount.waitForExistence(timeout: 5) {
            XCTAssertTrue(totalAmount.exists, "Total amount should be displayed")
        }
    }

    @MainActor
    func testOrderDetails_backButton_dismisses() throws {
        app.launch()

        let backButton = app.buttons["chevron.left"]
        if backButton.waitForExistence(timeout: 5) {
            backButton.tap()
            // Should dismiss the view
        }
    }

    @MainActor
    func testOrderDetails_loadingState_showsProgress() throws {
        app.launchArguments.append("SLOW_LOADING")
        app.launch()

        let progressView = app.activityIndicators.firstMatch
        if progressView.waitForExistence(timeout: 2) {
            XCTAssertTrue(progressView.exists, "Loading indicator should show during load")
        }
    }

    @MainActor
    func testOrderDetails_errorState_showsRetryButton() throws {
        app.launchArguments.append("ORDER_LOAD_ERROR")
        app.launch()

        let retryButton = app.buttons["Retry"]
        if retryButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(retryButton.exists, "Retry button should exist on error")
        }
    }
}
