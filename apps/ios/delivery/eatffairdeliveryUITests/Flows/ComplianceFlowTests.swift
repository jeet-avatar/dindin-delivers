//
//  ComplianceFlowTests.swift
//  eatffairdeliveryUITests
//
//  TNC Compliance & Safety screen flow tests (background check, inspection).
//  Read-only against production: asserts status rendering, never submits.
//

import XCTest

final class ComplianceFlowTests: DollorTestCase {

    /// Navigates Profile > Settings tab > Compliance & Safety.
    private func openComplianceScreen() throws {
        try ensureLoggedIn()
        navigateToTab("Profile")

        let settingsTab = app.buttons["Settings tab"]
        if settingsTab.waitForExistence(timeout: 5) {
            settingsTab.tap()
        }

        let complianceLink = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Compliance'")
        ).firstMatch
        let complianceText = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] 'Compliance'")
        ).firstMatch

        for _ in 0..<8 {
            if complianceLink.exists || complianceText.exists { break }
            app.swipeUp()
            Thread.sleep(forTimeInterval: 0.3)
        }

        if complianceLink.waitForExistence(timeout: 3), complianceLink.isHittable {
            complianceLink.tap()
        } else if complianceText.waitForExistence(timeout: 3) {
            complianceText.tap()
        } else {
            XCTFail("Compliance & Safety link not found in Profile > Settings")
        }
    }

    @MainActor
    func testCompliance_backgroundCheck_statusLoadsFromAPI() throws {
        try openComplianceScreen()

        let bgLabel = app.staticTexts["Background Check"]
        XCTAssertTrue(bgLabel.waitForExistence(timeout: 15),
                      "Background Check section should render on Compliance screen")

        // Demo driver (id 48) has background_check=true in production, so the
        // badge must show Passed — not the "not_started" default, which would
        // mean the API call failed silently.
        let passedBadge = app.staticTexts["Passed"]
        XCTAssertTrue(passedBadge.waitForExistence(timeout: 15),
                      "Background check badge should show 'Passed' from GET /api/tnc/background-check/{id}/status")

        screenshot("compliance_background_check_passed")
    }

    @MainActor
    func testCompliance_vehicleInspection_sectionRenders() throws {
        try openComplianceScreen()

        let inspectionLabel = app.staticTexts["Vehicle Inspection"]
        XCTAssertTrue(inspectionLabel.waitForExistence(timeout: 15),
                      "Vehicle Inspection section should render")

        let submitButton = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Submit Inspection'")
        ).firstMatch
        XCTAssertTrue(submitButton.waitForExistence(timeout: 10),
                      "Submit Inspection button should exist")

        screenshot("compliance_vehicle_inspection")
    }
}
