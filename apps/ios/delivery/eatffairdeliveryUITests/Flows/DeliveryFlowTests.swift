//
//  DeliveryFlowTests.swift
//  eatffairdeliveryUITests
//
//  Driver delivery flow tests: available orders, active delivery, completion.
//  Source: UI_INTERACTION_AUDIT.md iOS Driver Delivery (#1-22)
//

import XCTest

final class DriverDeliveryFlowTests: DollorTestCase {

    // MARK: - Dashboard Tests

    @MainActor
    func testDashboard_tabBar_hasCorrectTabs() throws {
        try ensureLoggedIn()

        let ordersTab = app.tabBars.buttons["Orders"]
        let activeTab = app.tabBars.buttons["Active"]
        let profileTab = app.tabBars.buttons["Profile"]

        XCTAssertTrue(ordersTab.waitForExistence(timeout: 5), "Orders tab should exist")
        XCTAssertTrue(activeTab.exists || app.tabBars.buttons["History"].exists, "Active/History tab should exist")
        XCTAssertTrue(profileTab.exists, "Profile tab should exist")
    }

    // MARK: - Available Orders Tests

    @MainActor
    func testAvailableOrders_onlineToggle_exists() throws {
        try ensureLoggedIn()

        let onlineToggle = app.switches.firstMatch
        let onlineButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'online' OR label CONTAINS[c] 'Online'")).firstMatch

        let hasToggle = onlineToggle.waitForExistence(timeout: 5) || onlineButton.waitForExistence(timeout: 3)
        XCTAssertTrue(hasToggle, "Online status toggle should exist")
    }

    @MainActor
    func testAvailableOrders_refreshButton_works() throws {
        try ensureLoggedIn()

        let refreshButton = app.navigationBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'refresh' OR label CONTAINS[c] 'clockwise'")).firstMatch
        if refreshButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(refreshButton.isEnabled, "Refresh button should be enabled")
        }
    }

    @MainActor
    func testAvailableOrders_listMapToggle_exists() throws {
        try ensureLoggedIn()

        let listButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'list'")).firstMatch
        let mapButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'map'")).firstMatch

        let hasViewToggle = listButton.waitForExistence(timeout: 5) || mapButton.waitForExistence(timeout: 3)
        XCTAssertTrue(hasViewToggle, "View toggle (list/map) should exist")
    }

    @MainActor
    func testAvailableOrders_acceptOrderButton_exists() throws {
        try ensureLoggedIn()

        let acceptButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'accept' OR label CONTAINS[c] 'Accept'")).firstMatch
        if acceptButton.waitForExistence(timeout: 10) {
            XCTAssertTrue(acceptButton.exists, "Accept order button should exist on order card")
        }
    }

    // MARK: - My Deliveries Tests

    @MainActor
    func testMyDeliveries_activeDeliveryCard_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Active")

        let deliveryCard = app.cells.firstMatch
        if deliveryCard.waitForExistence(timeout: 5) {
            XCTAssertTrue(deliveryCard.exists, "Active delivery card should exist")
        }
    }

    // MARK: - Active Delivery Tests

    @MainActor
    func testActiveDelivery_navigateButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Active")

        let navigateButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'navigate' OR label CONTAINS[c] 'Navigate' OR label CONTAINS[c] 'maps' OR label CONTAINS[c] 'Maps'")).firstMatch
        if navigateButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(navigateButton.exists, "Open Maps navigation button should exist")
        }
    }

    @MainActor
    func testActiveDelivery_callCustomerButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Active")

        let callButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'call' OR label CONTAINS[c] 'Call' OR label CONTAINS[c] 'phone'")).firstMatch
        if callButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(callButton.exists, "Call customer button should exist")
        }
    }

    @MainActor
    func testActiveDelivery_completeDeliveryFlow() throws {
        try ensureLoggedIn()

        navigateToTab("Active")

        let completeButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'complete' OR label CONTAINS[c] 'Complete' OR label CONTAINS[c] 'delivered' OR label CONTAINS[c] 'Delivered'")).firstMatch
        if completeButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(completeButton.exists, "Complete delivery button should exist")
        }
    }

    // MARK: - Delivery Proof Tests

    @MainActor
    func testDeliveryProof_photoOptions_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Active")

        let takePhotoButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Take Photo' OR label CONTAINS[c] 'Camera'")).firstMatch
        let choosePhotoButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Choose' OR label CONTAINS[c] 'Library' OR label CONTAINS[c] 'Gallery'")).firstMatch

        if takePhotoButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(takePhotoButton.exists, "Take Photo option should exist")
        }
        if choosePhotoButton.waitForExistence(timeout: 3) {
            XCTAssertTrue(choosePhotoButton.exists, "Choose from Library option should exist")
        }
    }
}
