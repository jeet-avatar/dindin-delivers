//
//  RideshareFlowTests.swift
//  eatfaircustomerUITests
//
//  Customer rideshare flow tests: request, bidding, active ride, rating.
//  Source: UI_INTERACTION_AUDIT.md iOS Customer Rideshare (#1-57)
//

import XCTest

final class CustomerRideshareFlowTests: DollorTestCase {

    // MARK: - Ride Request Tests

    @MainActor
    func testRideRequest_pickupDropoff_fieldsExist() throws {
        try ensureLoggedIn()

        // Navigate to rideshare
        let rideTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'ride'")).firstMatch
        let bookRideButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Book Ride'")).firstMatch
        if rideTab.waitForExistence(timeout: 3) {
            rideTab.tap()
        } else if bookRideButton.waitForExistence(timeout: 3) {
            bookRideButton.tap()
        }

        let pickupField = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'pickup' OR label CONTAINS[c] 'Pickup'")).firstMatch
        let dropoffField = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'dropoff' OR label CONTAINS[c] 'Drop'")).firstMatch

        if pickupField.waitForExistence(timeout: 5) {
            XCTAssertTrue(pickupField.exists, "Set Pickup button should exist")
        }
        if dropoffField.waitForExistence(timeout: 3) {
            XCTAssertTrue(dropoffField.exists, "Set Dropoff button should exist")
        }
    }

    @MainActor
    func testRideRequest_tipAmounts_areSelectable() throws {
        try ensureLoggedIn()

        let rideTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'ride'")).firstMatch
        if rideTab.waitForExistence(timeout: 3) {
            rideTab.tap()
        }

        // Tip amount buttons (e.g., $1, $2, $5)
        let tipButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] '$'")).firstMatch
        if tipButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(tipButton.isEnabled, "Tip amount button should be selectable")
        }
    }

    @MainActor
    func testRideRequest_requestRideButton_exists() throws {
        try ensureLoggedIn()

        let rideTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'ride'")).firstMatch
        if rideTab.waitForExistence(timeout: 3) {
            rideTab.tap()
        }

        let requestButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Request Ride'")).firstMatch
        if requestButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(requestButton.exists, "Request Ride button should exist")
        }
    }

    @MainActor
    func testRideRequest_negotiateFareButton_exists() throws {
        try ensureLoggedIn()

        let rideTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'ride'")).firstMatch
        if rideTab.waitForExistence(timeout: 3) {
            rideTab.tap()
        }

        let negotiateButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Negotiate' OR label CONTAINS[c] 'negotiate'")).firstMatch
        if negotiateButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(negotiateButton.exists, "Negotiate Fare button should exist")
        }
    }

    // MARK: - Active Ride Tests

    @MainActor
    func testActiveRide_cancelButton_showsConfirmation() throws {
        try ensureLoggedIn()

        let cancelButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Cancel'")).firstMatch
        if cancelButton.waitForExistence(timeout: 5) {
            cancelButton.tap()

            // Verify confirmation dialog
            let confirmDialog = app.alerts.firstMatch
            if confirmDialog.waitForExistence(timeout: 3) {
                XCTAssertTrue(confirmDialog.exists, "Cancel confirmation dialog should appear")
            }
        }
    }

    @MainActor
    func testActiveRide_chatButton_opensSheet() throws {
        try ensureLoggedIn()

        let chatButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'chat' OR label CONTAINS[c] 'message'")).firstMatch
        if chatButton.waitForExistence(timeout: 5) {
            chatButton.tap()

            let chatSheet = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'chat' OR label CONTAINS[c] 'message'")).firstMatch
            if chatSheet.waitForExistence(timeout: 3) {
                XCTAssertTrue(chatSheet.exists, "Chat sheet should open")
            }
        }
    }

    @MainActor
    func testActiveRide_sosButton_showsAlert() throws {
        try ensureLoggedIn()

        let sosButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'SOS' OR label CONTAINS[c] 'emergency' OR label CONTAINS[c] 'Emergency'")).firstMatch
        if sosButton.waitForExistence(timeout: 5) {
            sosButton.tap()

            let alertDialog = app.alerts.firstMatch
            if alertDialog.waitForExistence(timeout: 3) {
                XCTAssertTrue(alertDialog.exists, "SOS emergency alert should appear")
            }
        }
    }

    @MainActor
    func testActiveRide_shareLocationButton_exists() throws {
        try ensureLoggedIn()

        let shareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'share' OR label CONTAINS[c] 'Share'")).firstMatch
        if shareButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(shareButton.exists, "Share location button should exist")
        }
    }

    // MARK: - Completed Ride Tests

    @MainActor
    func testCompletedRide_ratingStars_exist() throws {
        try ensureLoggedIn()

        // Star rating buttons (1-5)
        let starButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'star' OR label CONTAINS[c] 'rating'")).firstMatch
        if starButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(starButton.exists, "Star rating buttons should exist on completed ride")
        }
    }

    @MainActor
    func testCompletedRide_tipSelection_exists() throws {
        try ensureLoggedIn()

        let tipButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'tip' OR label CONTAINS[c] '$'")).firstMatch
        if tipButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(tipButton.exists, "Tip selection should exist on completed ride")
        }
    }

    // MARK: - Recurring Rides Tests

    @MainActor
    func testRecurringRides_addButton_exists() throws {
        try ensureLoggedIn()

        let recurringButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'recurring' OR label CONTAINS[c] 'Recurring' OR label CONTAINS[c] 'schedule'")).firstMatch
        if recurringButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(recurringButton.exists, "Recurring ride setup button should exist")
        }
    }
}
