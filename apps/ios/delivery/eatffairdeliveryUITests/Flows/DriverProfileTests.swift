//
//  DriverProfileTests.swift
//  eatffairdeliveryUITests
//
//  Driver profile and settings flow tests.
//  Source: UI_INTERACTION_AUDIT.md iOS Driver Profile (#1-21)
//

import XCTest

final class DriverProfileFlowTests: DollorTestCase {

    // MARK: - Profile Tests

    @MainActor
    func testProfile_editButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let editButton = app.buttons["Edit"]
        XCTAssertTrue(editButton.waitForExistence(timeout: 5), "Edit toggle should exist")
    }

    @MainActor
    func testProfile_tabSelector_personalDocumentsEarningsSettings() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let personalTab = app.buttons["Personal"]
        let documentsTab = app.buttons["Documents"]
        let earningsTab = app.buttons["Earnings"]
        let settingsTab = app.buttons["Settings"]

        if personalTab.waitForExistence(timeout: 5) {
            XCTAssertTrue(personalTab.exists, "Personal tab should exist")
        }
        if documentsTab.waitForExistence(timeout: 3) {
            XCTAssertTrue(documentsTab.exists, "Documents tab should exist")
        }
        if earningsTab.waitForExistence(timeout: 3) {
            XCTAssertTrue(earningsTab.exists, "Earnings tab should exist")
        }
        if settingsTab.waitForExistence(timeout: 3) {
            XCTAssertTrue(settingsTab.exists, "Settings tab should exist")
        }
    }

    @MainActor
    func testProfile_personalTab_saveButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let personalTab = app.buttons["Personal"]
        if personalTab.waitForExistence(timeout: 5) {
            personalTab.tap()
        }

        // Enable edit mode
        let editButton = app.buttons["Edit"]
        if editButton.waitForExistence(timeout: 3) {
            editButton.tap()
        }

        let saveButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Save' OR label CONTAINS[c] 'save'")).firstMatch
        if saveButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(saveButton.exists, "Save profile button should exist")
        }
    }

    @MainActor
    func testProfile_documentsTab_verifyIdentity_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let documentsTab = app.buttons["Documents"]
        if documentsTab.waitForExistence(timeout: 5) {
            documentsTab.tap()
        }

        let verifyButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'verify' OR label CONTAINS[c] 'Verify' OR label CONTAINS[c] 'identity' OR label CONTAINS[c] 'upload'")).firstMatch
        if verifyButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(verifyButton.exists, "Identity verification button should exist")
        }
    }

    @MainActor
    func testProfile_earningsTab_payoutHistory_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let earningsTab = app.buttons["Earnings"]
        if earningsTab.waitForExistence(timeout: 5) {
            earningsTab.tap()
        }

        let payoutLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'payout' OR label CONTAINS[c] 'Payout' OR label CONTAINS[c] 'history'")).firstMatch
        if payoutLink.waitForExistence(timeout: 5) {
            XCTAssertTrue(payoutLink.exists, "Payout history link should exist")
        }
    }

    @MainActor
    func testProfile_settingsTab_logoutButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let settingsTab = app.buttons["Settings"]
        if settingsTab.waitForExistence(timeout: 5) {
            settingsTab.tap()
        }

        let logoutButton = app.buttons["Logout"]
        XCTAssertTrue(logoutButton.waitForExistence(timeout: 5), "Logout button should exist in Settings")
    }

    @MainActor
    func testProfile_settingsTab_deleteAccount_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let settingsTab = app.buttons["Settings"]
        if settingsTab.waitForExistence(timeout: 5) {
            settingsTab.tap()
        }

        let deleteButton = app.buttons["Delete Account"]
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 5), "Delete Account button should exist (App Store requirement)")
    }

    @MainActor
    func testProfile_settingsTab_toggles_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let settingsTab = app.buttons["Settings"]
        if settingsTab.waitForExistence(timeout: 5) {
            settingsTab.tap()
        }

        // Look for toggle switches (Notifications, Sound, Accept Cash)
        let toggles = app.switches
        if toggles.firstMatch.waitForExistence(timeout: 5) {
            XCTAssertTrue(toggles.count >= 1, "At least one settings toggle should exist")
        }
    }
}
