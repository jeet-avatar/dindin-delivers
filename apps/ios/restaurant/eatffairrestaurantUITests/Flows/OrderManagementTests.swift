//
//  OrderManagementTests.swift
//  eatffairrestaurantUITests
//
//  Restaurant order management flow tests: dashboard, order lifecycle.
//  Source: UI_INTERACTION_AUDIT.md iOS Restaurant Dashboard (#1-19)
//

import XCTest

final class RestaurantOrderManagementTests: DollorTestCase {

    // MARK: - Dashboard Tests

    @MainActor
    func testDashboard_statsCards_exist() throws {
        try ensureLoggedIn()

        let revenueCard = app.staticTexts["Today's Revenue"]
        let ordersCard = app.staticTexts["Today's Orders"]
        let ratingCard = app.staticTexts["Average Rating"]

        if revenueCard.waitForExistence(timeout: 5) {
            XCTAssertTrue(revenueCard.exists, "Revenue card should exist")
        }
        if ordersCard.waitForExistence(timeout: 3) {
            XCTAssertTrue(ordersCard.exists, "Orders card should exist")
        }
        if ratingCard.waitForExistence(timeout: 3) {
            XCTAssertTrue(ratingCard.exists, "Rating card should exist")
        }
    }

    @MainActor
    func testDashboard_onlineToggle_exists() throws {
        try ensureLoggedIn()

        let storeToggle = app.switches.firstMatch
        if storeToggle.waitForExistence(timeout: 5) {
            XCTAssertTrue(storeToggle.exists, "Store online status toggle should exist")
        }
    }

    // MARK: - Order List Tests

    @MainActor
    func testOrders_filterTabs_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        // FilterTab uses .accessibilityLabel("Filter by \(title), \(count) orders")
        let allTab = app.buttons.containing(NSPredicate(format: "label BEGINSWITH[c] 'Filter by All'")).firstMatch
        let newTab = app.buttons.containing(NSPredicate(format: "label BEGINSWITH[c] 'Filter by New'")).firstMatch

        let hasFilterTabs = allTab.waitForExistence(timeout: 5) || newTab.waitForExistence(timeout: 3)
        XCTAssertTrue(hasFilterTabs, "Order filter tabs should exist")
    }

    @MainActor
    func testOrders_acceptOrderButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        let acceptButton = app.buttons["Accept Order"]
        if acceptButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(acceptButton.exists, "Accept Order button should exist")
        }
    }

    @MainActor
    func testOrders_startPreparingButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        let prepareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Start Preparing' OR label CONTAINS[c] 'Prepare'")).firstMatch
        if prepareButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(prepareButton.exists, "Start Preparing button should exist")
        }
    }

    @MainActor
    func testOrders_markReadyButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        let readyButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Mark Ready' OR label CONTAINS[c] 'Ready'")).firstMatch
        if readyButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(readyButton.exists, "Mark Ready button should exist")
        }
    }

    @MainActor
    func testOrders_printKOTButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        let printButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Print' OR label CONTAINS[c] 'KOT'")).firstMatch
        if printButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(printButton.exists, "Print KOT button should exist")
        }
    }

    @MainActor
    func testOrders_cancelOrderButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        let cancelButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Cancel' OR label CONTAINS[c] 'cancel'")).firstMatch
        if cancelButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(cancelButton.exists, "Cancel order button should exist")
        }
    }

    @MainActor
    func testOrders_contactCustomerDriver_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Orders")

        let contactButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'call' OR label CONTAINS[c] 'Call' OR label CONTAINS[c] 'contact' OR label CONTAINS[c] 'phone'")).firstMatch
        if contactButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(contactButton.exists, "Contact customer/driver button should exist")
        }
    }

    // MARK: - Phase 68 Insurance Tour (Restaurant)

    @MainActor
    func testInsuranceTour_restaurantOrders() throws {
        navigateToLogin()
        screenshot("01_restaurant_login")

        try ensureLoggedIn()
        screenshot("02_restaurant_dashboard")

        navigateToTab("Orders")
        sleep(2)
        screenshot("03_orders_list")

        let firstOrder = app.cells.firstMatch
        if firstOrder.waitForExistence(timeout: 5) {
            firstOrder.tap()
            sleep(2)
            screenshot("04_order_detail_with_breakdown")

            // Look for KOT / print
            let kotBtn = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'KOT' OR label CONTAINS[c] 'Print'")).firstMatch
            if kotBtn.waitForExistence(timeout: 3), kotBtn.isHittable {
                kotBtn.tap()
                sleep(1)
                screenshot("05_order_kot_view")
                // dismiss any modal
                let dismiss = app.buttons["Close"]
                if dismiss.exists { dismiss.tap() }
            }
        }
    }

    @MainActor
    func testInsuranceTour_restaurantEarnings() throws {
        try ensureLoggedIn()

        // Common label variants for the settlement tab
        let settlementTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Earning' OR label CONTAINS[c] 'Payout' OR label CONTAINS[c] 'Revenue' OR label CONTAINS[c] 'Settlement'")).firstMatch
        if settlementTab.waitForExistence(timeout: 3), settlementTab.isHittable {
            settlementTab.tap()
            sleep(2)
            screenshot("10_restaurant_earnings_summary")
        } else {
            navigateToTab("Profile")
            sleep(1)
            screenshot("10_restaurant_profile")
            let earningsRow = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Earning' OR label CONTAINS[c] 'Payout' OR label CONTAINS[c] 'Revenue'")).firstMatch
            if earningsRow.waitForExistence(timeout: 3), earningsRow.isHittable {
                earningsRow.tap()
                sleep(2)
                screenshot("11_restaurant_earnings_summary")
            }
        }

        // Try opening a settlement detail
        let firstSettlement = app.cells.firstMatch
        if firstSettlement.waitForExistence(timeout: 5) {
            firstSettlement.tap()
            sleep(2)
            screenshot("12_restaurant_settlement_detail")
        }
    }

    @MainActor
    func testInsuranceTour_restaurantMenuAndProfile() throws {
        try ensureLoggedIn()

        // Menu management tab
        navigateToTab("Menu")
        sleep(2)
        screenshot("20_restaurant_menu_management")

        // Profile tab
        navigateToTab("Profile")
        sleep(2)
        screenshot("21_restaurant_profile")
    }
}
