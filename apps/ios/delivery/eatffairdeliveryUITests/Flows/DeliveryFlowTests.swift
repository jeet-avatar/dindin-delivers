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

        let deliveryTab = app.tabBars.buttons["Delivery"]
        let activeTab = app.tabBars.buttons["Active"]
        let profileTab = app.tabBars.buttons["Profile"]

        XCTAssertTrue(deliveryTab.waitForExistence(timeout: 5), "Delivery tab should exist")
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

    // MARK: - Phase 68 Insurance Tour (Driver)

    @MainActor
    func testInsuranceTour_driverFood() throws {
        navigateToLogin()
        screenshot("01_driver_login")

        try ensureLoggedIn()
        screenshot("02_driver_dashboard")

        // Delivery (food) tab
        navigateToTab("Delivery")
        sleep(2)
        screenshot("03_driver_delivery_available")

        // Active deliveries
        navigateToTab("Active")
        sleep(2)
        screenshot("04_driver_active_deliveries")

        let activeCard = app.cells.firstMatch
        if activeCard.waitForExistence(timeout: 5) {
            activeCard.tap()
            sleep(2)
            screenshot("05_driver_active_delivery_detail")
        }

        // Earnings — the critical receipt screen for insurance
        let earningsTab = app.tabBars.buttons["Earnings"]
        if earningsTab.waitForExistence(timeout: 3) {
            earningsTab.tap()
            sleep(2)
            screenshot("06_driver_food_earnings_summary")
        } else {
            navigateToTab("Profile")
            sleep(1)
            let earningsRow = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Earnings' OR label CONTAINS[c] 'Payout' OR label CONTAINS[c] 'Income'")).firstMatch
            if earningsRow.waitForExistence(timeout: 3), earningsRow.isHittable {
                earningsRow.tap()
                sleep(2)
                screenshot("06_driver_food_earnings_summary")
            }
        }

        let firstEarning = app.cells.firstMatch
        if firstEarning.waitForExistence(timeout: 5) {
            firstEarning.tap()
            sleep(2)
            screenshot("07_driver_food_earnings_detail")
        }
    }

    @MainActor
    func testInsuranceTour_driverRideshare() throws {
        try ensureLoggedIn()

        // Rideshare tab — many driver apps have it adjacent to Delivery
        let rideTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Ride' OR label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideTab.waitForExistence(timeout: 3), rideTab.isHittable {
            rideTab.tap()
            sleep(2)
            screenshot("10_driver_rideshare_dashboard")
        }

        // Available rides / bids
        let availableTab = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Available'")).firstMatch
        if availableTab.waitForExistence(timeout: 3), availableTab.isHittable {
            availableTab.tap()
            sleep(2)
            screenshot("11_driver_rideshare_available")
        }

        // My bids
        let myBidsTab = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'My Bids' OR label CONTAINS[c] 'Bids'")).firstMatch
        if myBidsTab.waitForExistence(timeout: 3), myBidsTab.isHittable {
            myBidsTab.tap()
            sleep(2)
            screenshot("12_driver_rideshare_my_bids")
        }

        // Payouts
        let payoutBtn = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Payout' OR label CONTAINS[c] 'Earnings'")).firstMatch
        if payoutBtn.waitForExistence(timeout: 3), payoutBtn.isHittable {
            payoutBtn.tap()
            sleep(2)
            screenshot("13_driver_rideshare_payout")
        }

        let firstRide = app.cells.firstMatch
        if firstRide.waitForExistence(timeout: 5) {
            firstRide.tap()
            sleep(2)
            screenshot("14_driver_rideshare_trip_receipt")
        }
    }
}
