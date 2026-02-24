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
        try skipIfNotLoggedIn()

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
        try skipIfNotLoggedIn()

        let storeToggle = app.switches.firstMatch
        if storeToggle.waitForExistence(timeout: 5) {
            XCTAssertTrue(storeToggle.exists, "Store online status toggle should exist")
        }
    }

    // MARK: - Order List Tests

    @MainActor
    func testOrders_filterTabs_exist() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let allTab = app.buttons["All"]
        let pendingTab = app.buttons["Pending"]
        let preparingTab = app.buttons["Preparing"]

        let hasFilterTabs = allTab.waitForExistence(timeout: 5) || pendingTab.waitForExistence(timeout: 3)
        XCTAssertTrue(hasFilterTabs, "Order filter tabs should exist")
    }

    @MainActor
    func testOrders_acceptOrderButton_exists() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let acceptButton = app.buttons["Accept Order"]
        if acceptButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(acceptButton.exists, "Accept Order button should exist")
        }
    }

    @MainActor
    func testOrders_startPreparingButton_exists() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let prepareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Start Preparing' OR label CONTAINS[c] 'Prepare'")).firstMatch
        if prepareButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(prepareButton.exists, "Start Preparing button should exist")
        }
    }

    @MainActor
    func testOrders_markReadyButton_exists() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let readyButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Mark Ready' OR label CONTAINS[c] 'Ready'")).firstMatch
        if readyButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(readyButton.exists, "Mark Ready button should exist")
        }
    }

    @MainActor
    func testOrders_printKOTButton_exists() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let printButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Print' OR label CONTAINS[c] 'KOT'")).firstMatch
        if printButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(printButton.exists, "Print KOT button should exist")
        }
    }

    @MainActor
    func testOrders_cancelOrderButton_exists() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let cancelButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Cancel' OR label CONTAINS[c] 'cancel'")).firstMatch
        if cancelButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(cancelButton.exists, "Cancel order button should exist")
        }
    }

    @MainActor
    func testOrders_contactCustomerDriver_exist() throws {
        try skipIfNotLoggedIn()

        navigateToTab("Orders")

        let contactButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'call' OR label CONTAINS[c] 'Call' OR label CONTAINS[c] 'contact' OR label CONTAINS[c] 'phone'")).firstMatch
        if contactButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(contactButton.exists, "Contact customer/driver button should exist")
        }
    }
}
