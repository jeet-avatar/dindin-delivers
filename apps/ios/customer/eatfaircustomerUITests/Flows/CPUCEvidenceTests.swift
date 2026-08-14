//
//  CPUCEvidenceTests.swift
//  eatfaircustomerUITests
//
//  Captures screenshot evidence for the CPUC deficiency response:
//  ACCSS-1/4 (access-needs flow) and ZT-APP/ZT-RECEIPT (safety report + receipt).
//  Read-only: never requests a ride or submits a report.
//

import XCTest

final class CPUCEvidenceTests: DollorTestCase {

    private func dismissLocationAlert() {
        // Location permission alert is presented by springboard, not the app
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = springboard.buttons["Allow While Using App"]
        if allow.waitForExistence(timeout: 3) {
            allow.tap()
            sleep(1)
        } else {
            let allowOnce = springboard.buttons["Allow Once"]
            if allowOnce.exists { allowOnce.tap(); sleep(1) }
        }
    }

    private func openRideRequest() {
        // Home screen card: label "Ride, Get picked up"
        let rideCard = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Get picked up'")).firstMatch
        let rideTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'ride'")).firstMatch
        if rideCard.waitForExistence(timeout: 5), rideCard.isHittable {
            rideCard.tap()
        } else if rideTab.waitForExistence(timeout: 3) {
            rideTab.tap()
        }
        dismissLocationAlert()
        sleep(3)
        screenshot("cpuc_debug_after_open_ride")
    }

    private func setLocationBySearch(fieldLabel: String, query: String) {
        let field = app.buttons[fieldLabel]
        guard field.waitForExistence(timeout: 5), field.isHittable else { return }
        field.tap()
        let search = app.textFields["Search address..."]
        guard search.waitForExistence(timeout: 5) else { return }
        search.tap()
        sleep(1)
        if !(app.keyboards.firstMatch.waitForExistence(timeout: 3)) {
            // Retry focus via coordinate tap (hardware-keyboard quirk)
            search.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            _ = app.keyboards.firstMatch.waitForExistence(timeout: 3)
        }
        app.typeText(query)
        sleep(5)
        let result = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] %@ AND NOT label CONTAINS[c] 'Current'", query)
        ).firstMatch
        if result.waitForExistence(timeout: 8), result.isHittable {
            result.tap()
        } else {
            let cell = app.cells.firstMatch
            if cell.waitForExistence(timeout: 3) { cell.tap() }
        }
        sleep(3)
    }

    @MainActor
    func testEvidence_accessNeeds_flow() throws {
        try ensureLoggedIn()
        openRideRequest()

        // Accessibility section only renders once pickup + dropoff are set
        setLocationBySearch(fieldLabel: "Select pickup location", query: "Googleplex")
        setLocationBySearch(fieldLabel: "Select dropoff location", query: "Stanford")
        screenshot("cpuc_debug_after_locations")

        let accessToggle = app.switches.containing(
            NSPredicate(format: "label CONTAINS[c] 'accessible vehicle'")
        ).firstMatch
        let accessText = app.staticTexts["I need an accessible vehicle"]

        for _ in 0..<10 {
            if accessToggle.exists || accessText.exists { break }
            app.swipeUp()
            Thread.sleep(forTimeInterval: 0.4)
        }

        XCTAssertTrue(accessToggle.waitForExistence(timeout: 5) || accessText.waitForExistence(timeout: 2),
                      "Access-needs toggle should exist on ride request screen")

        if accessToggle.exists, accessToggle.isHittable {
            accessToggle.tap()
        } else if accessText.exists {
            accessText.tap()
        }
        sleep(1)
        screenshot("cpuc_exhibitA_ios_access_needs_expanded")

        // Service animal option should be visible once expanded (ACCSS-4)
        let serviceAnimal = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] 'Service animal'")
        ).firstMatch
        if serviceAnimal.waitForExistence(timeout: 3) {
            serviceAnimal.tap()
            sleep(1)
            screenshot("cpuc_exhibitA_ios_service_animal_selected")
        }
    }

    @MainActor
    func testEvidence_rideReceipt_safetyReport() throws {
        try ensureLoggedIn()

        // Orders tab → "Rides" segmented section → first ride card opens RideReceiptView
        let ordersTab = app.tabBars.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'order'")).firstMatch
        guard ordersTab.waitForExistence(timeout: 5) else { throw XCTSkip("Orders tab not found") }
        ordersTab.tap()
        sleep(2)

        let ridesSegment = app.buttons["Rides"]
        guard ridesSegment.waitForExistence(timeout: 5) else {
            throw XCTSkip("Rides segment not found in order history")
        }
        ridesSegment.tap()
        sleep(3)
        screenshot("cpuc_debug_rides_history")

        // Completed ride cards expose a "View Receipt" button that opens RideReceiptView
        let viewReceipt = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'View Receipt'")
        ).firstMatch
        for _ in 0..<6 {
            if viewReceipt.exists, viewReceipt.isHittable { break }
            app.swipeUp()
            Thread.sleep(forTimeInterval: 0.4)
        }
        guard viewReceipt.waitForExistence(timeout: 6) else {
            throw XCTSkip("No View Receipt button available for receipt evidence")
        }
        viewReceipt.tap()
        sleep(4)
        screenshot("cpuc_exhibitD_ios_ride_receipt")

        let reportButton = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Report Safety'")
        ).firstMatch
        for _ in 0..<8 {
            if reportButton.exists { break }
            app.swipeUp()
            Thread.sleep(forTimeInterval: 0.4)
        }
        guard reportButton.waitForExistence(timeout: 3) else {
            throw XCTSkip("Report Safety Concern button not reachable on this receipt")
        }
        // Scroll to the very bottom so the ZT notice below the button is visible
        app.swipeUp()
        Thread.sleep(forTimeInterval: 0.5)
        app.swipeUp()
        Thread.sleep(forTimeInterval: 0.5)
        screenshot("cpuc_exhibitD_ios_receipt_zt_notice")
        reportButton.tap()
        sleep(2)
        screenshot("cpuc_exhibitC_ios_safety_report_sheet")
        // Do NOT submit — close the sheet
        let cancel = app.buttons["Cancel"]
        if cancel.waitForExistence(timeout: 3) { cancel.tap() }
    }
}
