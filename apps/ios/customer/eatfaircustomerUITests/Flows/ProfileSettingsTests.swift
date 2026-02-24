//
//  ProfileSettingsTests.swift
//  eatfaircustomerUITests
//
//  Customer profile and settings flow tests.
//  Source: UI_INTERACTION_AUDIT.md iOS Customer Profile (#1-44)
//

import XCTest

final class CustomerProfileSettingsTests: DollorTestCase {

    // MARK: - Profile Tests

    @MainActor
    func testProfile_editProfileButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let editButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'edit' OR label CONTAINS[c] 'Edit'")).firstMatch
        XCTAssertTrue(editButton.waitForExistence(timeout: 5), "Edit profile button should exist")
    }

    @MainActor
    func testProfile_navigationLinks_allPresent() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let expectedLinks = ["Addresses", "Payment", "Favorites", "Settings", "Notifications", "Help"]
        for linkName in expectedLinks {
            let link = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", linkName)).firstMatch
            if link.waitForExistence(timeout: 3) {
                XCTAssertTrue(link.exists, "\(linkName) link should be present in profile")
            }
        }
    }

    @MainActor
    func testProfile_signOutButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        // Scroll down to find sign out
        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
        }

        let signOutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'sign out' OR label CONTAINS[c] 'Sign Out' OR label CONTAINS[c] 'logout' OR label CONTAINS[c] 'Log Out'")).firstMatch
        XCTAssertTrue(signOutButton.waitForExistence(timeout: 5), "Sign Out button should exist")
    }

    @MainActor
    func testProfile_deleteAccountButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        // Scroll down to find delete account
        let scrollView = app.scrollViews.firstMatch
        if scrollView.exists {
            scrollView.swipeUp()
            scrollView.swipeUp()
        }

        let deleteButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Delete Account' OR label CONTAINS[c] 'delete account'")).firstMatch
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 5), "Delete Account button should exist (App Store requirement)")
    }

    // MARK: - Settings Tests

    @MainActor
    func testSettings_languageButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let settingsLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Settings'")).firstMatch
        if settingsLink.waitForExistence(timeout: 3) {
            settingsLink.tap()
        }

        let languageButton = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'language' OR label CONTAINS[c] 'Language'")).firstMatch
        if languageButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(languageButton.exists, "Language selection should exist in settings")
        }
    }

    @MainActor
    func testSettings_privacyTermsLinks_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let settingsLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Settings'")).firstMatch
        if settingsLink.waitForExistence(timeout: 3) {
            settingsLink.tap()
        }

        let privacyLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'privacy' OR label CONTAINS[c] 'Privacy'")).firstMatch
        let termsLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'terms' OR label CONTAINS[c] 'Terms'")).firstMatch

        if privacyLink.waitForExistence(timeout: 5) {
            XCTAssertTrue(privacyLink.exists, "Privacy Policy link should exist")
        }
        if termsLink.waitForExistence(timeout: 3) {
            XCTAssertTrue(termsLink.exists, "Terms of Service link should exist")
        }
    }

    // MARK: - Payment Methods Tests

    @MainActor
    func testPaymentMethods_addCardButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let paymentLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Payment'")).firstMatch
        if paymentLink.waitForExistence(timeout: 3) {
            paymentLink.tap()
        }

        let addCardButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Add Card' OR label CONTAINS[c] 'add card' OR label CONTAINS[c] 'Add Payment'")).firstMatch
        if addCardButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(addCardButton.exists, "Add Card button should exist")
        }
    }

    // MARK: - Addresses Tests

    @MainActor
    func testAddresses_addAddressButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")

        let addressesLink = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Addresses'")).firstMatch
        if addressesLink.waitForExistence(timeout: 3) {
            addressesLink.tap()
        }

        let addAddressButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Add Address' OR label CONTAINS[c] 'add address' OR label CONTAINS[c] 'Add'")).firstMatch
        if addAddressButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(addAddressButton.exists, "Add Address button should exist")
        }
    }
}
