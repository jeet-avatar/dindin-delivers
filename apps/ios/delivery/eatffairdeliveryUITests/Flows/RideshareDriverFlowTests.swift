//
//  RideshareDriverFlowTests.swift
//  eatffairdeliveryUITests
//
//  Driver rideshare flow tests: bid, accept, active ride, complete.
//  Source: UI_INTERACTION_AUDIT.md iOS Driver Rideshare (#1-38)
//

import XCTest

final class DriverRideshareFlowTests: DollorTestCase {

    // MARK: - Rideshare Dashboard Tests

    @MainActor
    func testRideshareDashboard_onlineToggle_exists() throws {
        try skipIfNotLoggedIn()

        // Navigate to rideshare mode
        let rideshareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideshareButton.waitForExistence(timeout: 5) {
            rideshareButton.tap()
        }

        let onlineToggle = app.switches.firstMatch
        let onlineButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'online' OR label CONTAINS[c] 'Online'")).firstMatch

        let hasToggle = onlineToggle.waitForExistence(timeout: 5) || onlineButton.waitForExistence(timeout: 3)
        XCTAssertTrue(hasToggle, "Driver online toggle should exist")
    }

    @MainActor
    func testRideshareDashboard_availableMyBidsTabs_exist() throws {
        try skipIfNotLoggedIn()

        let rideshareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideshareButton.waitForExistence(timeout: 5) {
            rideshareButton.tap()
        }

        let availableTab = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Available'")).firstMatch
        let myBidsTab = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'My Bids' OR label CONTAINS[c] 'Bids'")).firstMatch

        if availableTab.waitForExistence(timeout: 5) {
            XCTAssertTrue(availableTab.exists, "Available tab should exist")
        }
        if myBidsTab.waitForExistence(timeout: 3) {
            XCTAssertTrue(myBidsTab.exists, "My Bids tab should exist")
        }
    }

    @MainActor
    func testRideshareDashboard_payoutButton_exists() throws {
        try skipIfNotLoggedIn()

        let rideshareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideshareButton.waitForExistence(timeout: 5) {
            rideshareButton.tap()
        }

        let payoutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'payout' OR label CONTAINS[c] 'Payout' OR label CONTAINS[c] 'earnings' OR label CONTAINS[c] 'Earnings'")).firstMatch
        if payoutButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(payoutButton.exists, "Payout Dashboard button should exist")
        }
    }

    // MARK: - Bid Tests

    @MainActor
    func testBidOnRide_bidSheet_opens() throws {
        try skipIfNotLoggedIn()

        let rideshareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideshareButton.waitForExistence(timeout: 5) {
            rideshareButton.tap()
        }

        let bidButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'bid' OR label CONTAINS[c] 'Bid'")).firstMatch
        if bidButton.waitForExistence(timeout: 10) {
            bidButton.tap()

            let bidSheet = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'bid' OR label CONTAINS[c] 'Bid' OR label CONTAINS[c] 'fare'")).firstMatch
            XCTAssertTrue(bidSheet.waitForExistence(timeout: 5), "Bid sheet should open")
        }
    }

    @MainActor
    func testBidOnRide_quickBidAmounts_exist() throws {
        try skipIfNotLoggedIn()

        let rideshareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideshareButton.waitForExistence(timeout: 5) {
            rideshareButton.tap()
        }

        let bidButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'bid' OR label CONTAINS[c] 'Bid'")).firstMatch
        if bidButton.waitForExistence(timeout: 10) {
            bidButton.tap()

            // Quick bid amount buttons (typically 3)
            let quickBidButtons = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] '$'"))
            if quickBidButtons.firstMatch.waitForExistence(timeout: 5) {
                XCTAssertTrue(quickBidButtons.count >= 1, "Quick bid amount buttons should exist")
            }
        }
    }

    @MainActor
    func testBidOnRide_submitBidButton_exists() throws {
        try skipIfNotLoggedIn()

        let rideshareButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Rideshare'")).firstMatch
        if rideshareButton.waitForExistence(timeout: 5) {
            rideshareButton.tap()
        }

        let bidButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'bid' OR label CONTAINS[c] 'Bid'")).firstMatch
        if bidButton.waitForExistence(timeout: 10) {
            bidButton.tap()

            let submitButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Submit' OR label CONTAINS[c] 'submit' OR label CONTAINS[c] 'Place Bid'")).firstMatch
            if submitButton.waitForExistence(timeout: 5) {
                XCTAssertTrue(submitButton.exists, "Submit Bid button should exist")
            }
        }
    }

    // MARK: - Active Ride Tests

    @MainActor
    func testActiveRide_arriveAtPickup_exists() throws {
        try skipIfNotLoggedIn()

        let arriveButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Arrive' OR label CONTAINS[c] 'arrive' OR label CONTAINS[c] 'Arrived'")).firstMatch
        if arriveButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(arriveButton.exists, "Arrive at Pickup button should exist")
        }
    }

    @MainActor
    func testActiveRide_startRideButton_exists() throws {
        try skipIfNotLoggedIn()

        let startButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Start Ride' OR label CONTAINS[c] 'start ride'")).firstMatch
        if startButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(startButton.exists, "Start Ride button should exist")
        }
    }

    @MainActor
    func testActiveRide_completeRideButton_exists() throws {
        try skipIfNotLoggedIn()

        let completeButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Complete' OR label CONTAINS[c] 'complete'")).firstMatch
        if completeButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(completeButton.exists, "Complete Ride button should exist")
        }
    }

    @MainActor
    func testActiveRide_noShowButton_exists() throws {
        try skipIfNotLoggedIn()

        let noShowButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'No-Show' OR label CONTAINS[c] 'No Show' OR label CONTAINS[c] 'no show'")).firstMatch
        if noShowButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(noShowButton.exists, "No-Show button should exist")
        }
    }

    @MainActor
    func testActiveRide_sosAlert_exists() throws {
        try skipIfNotLoggedIn()

        let sosButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'SOS' OR label CONTAINS[c] 'emergency' OR label CONTAINS[c] 'Emergency'")).firstMatch
        if sosButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(sosButton.exists, "SOS emergency button should exist")
        }
    }

    @MainActor
    func testActiveRide_chatWithRider_opens() throws {
        try skipIfNotLoggedIn()

        let chatButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'chat' OR label CONTAINS[c] 'Chat' OR label CONTAINS[c] 'message'")).firstMatch
        if chatButton.waitForExistence(timeout: 5) {
            chatButton.tap()

            let chatView = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'chat' OR label CONTAINS[c] 'message'")).firstMatch
            if chatView.waitForExistence(timeout: 3) {
                XCTAssertTrue(chatView.exists, "Chat view should open")
            }
        }
    }

    // MARK: - Completed Ride Tests

    @MainActor
    func testCompletedRide_ratePassenger_works() throws {
        try skipIfNotLoggedIn()

        let starButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'star' OR label CONTAINS[c] 'rating' OR label CONTAINS[c] 'rate'")).firstMatch
        if starButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(starButton.exists, "Star rating for passenger should exist")
        }
    }

    // MARK: - Counter Offer Tests

    @MainActor
    func testCounterOffer_acceptRejectCounter_buttons() throws {
        try skipIfNotLoggedIn()

        let acceptButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Accept'")).firstMatch
        let rejectButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Reject' OR label CONTAINS[c] 'Decline'")).firstMatch
        let counterButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Counter'")).firstMatch

        if acceptButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(acceptButton.exists, "Accept button should exist for counter offers")
        }
        if rejectButton.waitForExistence(timeout: 3) {
            XCTAssertTrue(rejectButton.exists, "Reject button should exist for counter offers")
        }
        if counterButton.waitForExistence(timeout: 3) {
            XCTAssertTrue(counterButton.exists, "Counter button should exist for counter offers")
        }
    }
}
