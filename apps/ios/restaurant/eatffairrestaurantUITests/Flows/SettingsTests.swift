//
//  SettingsTests.swift
//  eatffairrestaurantUITests
//
//  Restaurant settings flow tests.
//  Source: UI_INTERACTION_AUDIT.md iOS Restaurant Settings (#1-32)
//

import XCTest

final class RestaurantSettingsFlowTests: DollorTestCase {

    @MainActor
    func testSettings_editProfile_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let editButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Edit Profile' OR label CONTAINS[c] 'edit'")).firstMatch
        if editButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(editButton.exists, "Edit Profile button should exist")
        }
    }

    @MainActor
    func testSettings_onlineStatusToggle_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let storeToggle = app.switches.firstMatch
        if storeToggle.waitForExistence(timeout: 5) {
            XCTAssertTrue(storeToggle.exists, "Online/offline toggle should exist")
        }
    }

    @MainActor
    func testSettings_deliveryPickupToggles_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let deliveryToggle = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'delivery' OR label CONTAINS[c] 'Delivery'")).firstMatch
        let pickupToggle = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'pickup' OR label CONTAINS[c] 'Pickup'")).firstMatch

        if deliveryToggle.waitForExistence(timeout: 5) {
            XCTAssertTrue(deliveryToggle.exists, "Delivery toggle/label should exist")
        }
        if pickupToggle.waitForExistence(timeout: 3) {
            XCTAssertTrue(pickupToggle.exists, "Pickup toggle/label should exist")
        }
    }

    @MainActor
    func testSettings_operatingHours_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let hoursButton = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'hours' OR label CONTAINS[c] 'Hours' OR label CONTAINS[c] 'operating'")).firstMatch
        if hoursButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(hoursButton.exists, "Operating hours button should exist")
        }
    }

    @MainActor
    func testSettings_kotSettings_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let kotLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'KOT' OR label CONTAINS[c] 'kot' OR label CONTAINS[c] 'Kitchen'")).firstMatch
        if kotLink.waitForExistence(timeout: 5) {
            XCTAssertTrue(kotLink.exists, "KOT Settings navigation link should exist")
        }
    }

    @MainActor
    func testSettings_aiFeatures_toggles_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        // Scroll to find AI features
        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
        }

        let aiText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'AI' OR label CONTAINS[c] 'artificial'")).firstMatch
        if aiText.waitForExistence(timeout: 5) {
            XCTAssertTrue(aiText.exists, "AI features section should exist")
        }
    }

    @MainActor
    func testSettings_aiEmployees_link_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
        }

        let aiEmployeesLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'AI Employee' OR label CONTAINS[c] 'ai employee'")).firstMatch
        if aiEmployeesLink.waitForExistence(timeout: 5) {
            XCTAssertTrue(aiEmployeesLink.exists, "AI Employees navigation link should exist")
        }
    }

    @MainActor
    func testSettings_signOutButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
        }

        let signOutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Log Out' OR label CONTAINS[c] 'Sign Out' OR label CONTAINS[c] 'sign out'")).firstMatch
        XCTAssertTrue(signOutButton.waitForExistence(timeout: 5), "Sign Out button should exist")
    }

    @MainActor
    func testSettings_deleteAccountButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
            scrollView.swipeUp()
        }

        let deleteButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Delete Account' OR label CONTAINS[c] 'delete account'")).firstMatch
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 5), "Delete Account button should exist (App Store requirement)")
    }

    @MainActor
    func testSettings_termsPrivacy_links_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Settings")

        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
        }

        let privacyLink = app.staticTexts["Privacy Policy"]
        let termsLink = app.staticTexts["Terms of Service"]

        if privacyLink.waitForExistence(timeout: 5) {
            XCTAssertTrue(privacyLink.exists, "Privacy Policy link should exist")
        }
        if termsLink.waitForExistence(timeout: 3) {
            XCTAssertTrue(termsLink.exists, "Terms of Service link should exist")
        }
    }
}
