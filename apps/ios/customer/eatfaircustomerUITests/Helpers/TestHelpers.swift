//
//  TestHelpers.swift
//  eatfaircustomerUITests
//
//  Shared test helpers for Dollor.ai Customer iOS App UI Tests.
//  Provides base test case, login helpers, navigation, and assertion utilities.
//

import XCTest

/// Base test case for all Dollor.ai Customer UI tests.
/// Handles app launch, teardown, and common navigation patterns.
class DollorTestCase: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Navigation Helpers

    /// Navigates past the welcome screen to the login screen if needed.
    func navigateToLogin() {
        let getStartedButton = app.buttons["Get Started"]
        if getStartedButton.waitForExistence(timeout: 3) {
            getStartedButton.tap()
        } else {
            // Try "I already have an account" link
            let loginLink = app.buttons["I already have an account"]
            if loginLink.waitForExistence(timeout: 2) {
                loginLink.tap()
            }
        }
        // Wait for login screen to appear
        _ = app.staticTexts["Dollor AI Service"].waitForExistence(timeout: 5)
    }

    /// Enters email and password credentials and taps the Login button.
    func loginWithCredentials(email: String, password: String) {
        navigateToLogin()

        let emailField = app.textFields["Email"]
        if emailField.waitForExistence(timeout: 5) {
            emailField.tap()
            emailField.typeText(email)
        }

        let passwordField = app.secureTextFields["Password"]
        if passwordField.waitForExistence(timeout: 3) {
            passwordField.tap()
            passwordField.typeText(password)
        }

        let loginButton = app.buttons["Login"]
        if loginButton.waitForExistence(timeout: 3) {
            loginButton.tap()
        }
    }

    /// Waits for an element to exist within the given timeout.
    /// - Returns: `true` if the element appeared before timeout.
    @discardableResult
    func waitForElement(_ element: XCUIElement, timeout: TimeInterval = 10) -> Bool {
        return element.waitForExistence(timeout: timeout)
    }

    /// Asserts that an element exists, with a descriptive message.
    func assertElementExists(_ element: XCUIElement, _ message: String) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), message)
    }

    /// Throws `XCTSkip` if the login screen is still visible (user not logged in).
    /// Use at the top of tests that require authenticated state.
    func skipIfNotLoggedIn() throws {
        let loginButton = app.buttons["Login"]
        let getStartedButton = app.buttons["Get Started"]
        if loginButton.waitForExistence(timeout: 2) || getStartedButton.waitForExistence(timeout: 1) {
            throw XCTSkip("Test requires logged-in state")
        }
    }

    /// Taps a tab bar button by name.
    func navigateToTab(_ tabName: String) {
        let tab = app.tabBars.buttons[tabName]
        if tab.waitForExistence(timeout: 5) {
            tab.tap()
        }
    }
}
