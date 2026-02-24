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

    /// Waits for the login screen to appear.
    /// The app goes directly to LoginView when not authenticated (no WelcomeView in flow).
    func navigateToLogin() {
        // App shows LoginView directly when unauthenticated (MainAppView.swift:152)
        // Wait for login screen identifiers
        let welcomeBackText = app.staticTexts["Welcome back"]
        let dollorText = app.staticTexts["Dollor.ai"]
        _ = welcomeBackText.waitForExistence(timeout: 5) || dollorText.waitForExistence(timeout: 3)
    }

    /// Enters email and password credentials and taps the Continue button.
    func loginWithCredentials(email: String, password: String) {
        navigateToLogin()

        let emailField = app.textFields["Email address"]
        if emailField.waitForExistence(timeout: 5) {
            emailField.tap()
            emailField.typeText(email)
        }

        let passwordField = app.secureTextFields["Password"]
        if passwordField.waitForExistence(timeout: 3) {
            passwordField.tap()
            passwordField.typeText(password)
        }

        let loginButton = app.buttons["Continue to sign in"]
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
        // LoginView shows "Welcome back" or "Create your account" or "Dollor.ai" when unauthenticated
        let welcomeBack = app.staticTexts["Welcome back"]
        let createAccount = app.staticTexts["Create your account"]
        let dollorLogo = app.staticTexts["Dollor.ai"]
        if welcomeBack.waitForExistence(timeout: 3) || createAccount.exists || dollorLogo.exists {
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
