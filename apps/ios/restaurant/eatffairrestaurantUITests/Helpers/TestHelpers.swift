//
//  TestHelpers.swift
//  eatffairrestaurantUITests
//
//  Shared test helpers for Dollor.ai Restaurant iOS App UI Tests.
//  Provides base test case, login helpers, navigation, and assertion utilities.
//

import XCTest

/// Base test case for all Dollor.ai Restaurant UI tests.
/// Handles app launch, teardown, and common navigation patterns.
class DollorTestCase: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI_TESTING"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Demo Credentials

    private static let demoEmail = "demo.restaurant@dollor.ai"
    private static let demoPassword = "DemoRestaurant2025!"

    // MARK: - Navigation Helpers

    /// Navigates to the login screen. If already logged in, logs out first via Settings > Sign Out.
    func navigateToLogin() {
        // Check if we're already logged in (tab bar present = authenticated)
        let tabBar = app.tabBars.firstMatch
        if tabBar.waitForExistence(timeout: 3) {
            // Logged in -- navigate to Settings tab and sign out
            let settingsTab = app.tabBars.buttons["Settings"]
            if settingsTab.exists {
                settingsTab.tap()
                // Sign Out button is near the bottom; scroll aggressively to find it
                let signOutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Sign out' OR label CONTAINS[c] 'Sign Out' OR label CONTAINS[c] 'Log Out'")).firstMatch
                for _ in 0..<8 {
                    if signOutButton.exists { break }
                    app.swipeUp()
                    Thread.sleep(forTimeInterval: 0.3)
                }
                if signOutButton.waitForExistence(timeout: 5) {
                    signOutButton.tap()
                    // Handle "Sign Out?" confirmation alert
                    let confirmButton = app.alerts.buttons["Sign Out"]
                    if confirmButton.waitForExistence(timeout: 3) {
                        confirmButton.tap()
                    }
                }
            }
        }
        // Wait for login screen identifiers
        _ = app.staticTexts["Dollor AI Restaurant"].waitForExistence(timeout: 5)
    }

    /// Enters email and password credentials and taps the Log In button.
    func loginWithCredentials(email: String, password: String) {
        navigateToLogin()

        let emailField = app.textFields["Enter your email"]
        if emailField.waitForExistence(timeout: 5) {
            emailField.tap()
            emailField.typeText(email)
        }

        let passwordField = app.secureTextFields["Enter your password"]
        if passwordField.waitForExistence(timeout: 3) {
            passwordField.tap()
            passwordField.typeText(password)
        }

        let loginButton = app.buttons["Log in to your account"]
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

    /// Ensures the app is in a logged-in state using demo credentials.
    /// If already logged in (no login screen visible), does nothing.
    /// If on login screen, logs in with demo restaurant credentials.
    /// If login fails, throws XCTSkip.
    func ensureLoggedIn() throws {
        // Check if already on login screen
        let loginButton = app.buttons["Log in to your account"]
        let brandTitle = app.staticTexts["Dollor AI Restaurant"]
        let onLoginScreen = loginButton.waitForExistence(timeout: 3) || brandTitle.waitForExistence(timeout: 1)

        if !onLoginScreen {
            return // Already logged in
        }

        // On login screen -- attempt login with demo credentials
        loginWithCredentials(email: Self.demoEmail, password: Self.demoPassword)

        // Verify login succeeded -- login screen elements should disappear
        let tabBar = app.tabBars.firstMatch
        let stillOnLogin = brandTitle.waitForExistence(timeout: 15)
        if stillOnLogin && !tabBar.exists {
            throw XCTSkip("Demo login failed -- staging may be unreachable (demo.restaurant@dollor.ai)")
        }
    }

    /// Throws `XCTSkip` if the login screen is still visible (user not logged in).
    func skipIfNotLoggedIn() throws {
        let loginButton = app.buttons["Log in to your account"]
        let brandTitle = app.staticTexts["Dollor AI Restaurant"]
        if loginButton.waitForExistence(timeout: 2) || brandTitle.waitForExistence(timeout: 1) {
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
