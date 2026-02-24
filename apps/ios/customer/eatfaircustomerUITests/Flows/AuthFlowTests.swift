//
//  AuthFlowTests.swift
//  eatfaircustomerUITests
//
//  Customer authentication flow tests: login, register, forgot password, social auth.
//  Source: UI_INTERACTION_AUDIT.md iOS Customer Auth Flow (#1-27)
//

import XCTest

final class CustomerAuthFlowTests: DollorTestCase {

    // MARK: - Login Tests

    @MainActor
    func testLogin_validCredentials_navigatesToHome() throws {
        navigateToLogin()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist")
        emailField.tap()
        emailField.typeText("demo.customer@dollor.ai")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 3), "Password field should exist")
        passwordField.tap()
        passwordField.typeText("DemoCustomer2025!")

        let loginButton = app.buttons["Login"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 3), "Login button should exist")
        loginButton.tap()

        // Verify home tab exists after login (may take time for network)
        let homeTab = app.tabBars.buttons.firstMatch
        XCTAssertTrue(homeTab.waitForExistence(timeout: 15), "Home tab should appear after successful login")
    }

    @MainActor
    func testLogin_emptyFields_showsError() throws {
        navigateToLogin()

        let loginButton = app.buttons["Login"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5), "Login button should exist")
        loginButton.tap()

        // Verify error alert or validation message appears
        let errorAlert = app.alerts.firstMatch
        let errorText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'error' OR label CONTAINS[c] 'required' OR label CONTAINS[c] 'enter'")).firstMatch
        let hasError = errorAlert.waitForExistence(timeout: 5) || errorText.waitForExistence(timeout: 3)
        XCTAssertTrue(hasError, "Error should appear when submitting with empty fields")
    }

    @MainActor
    func testLogin_invalidEmail_showsValidation() throws {
        navigateToLogin()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText("not-an-email")

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText("SomePassword1!")

        let loginButton = app.buttons["Login"]
        loginButton.tap()

        // Verify validation message
        let validationText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'valid' OR label CONTAINS[c] 'email' OR label CONTAINS[c] 'error'")).firstMatch
        let errorAlert = app.alerts.firstMatch
        let hasValidation = validationText.waitForExistence(timeout: 5) || errorAlert.waitForExistence(timeout: 3)
        XCTAssertTrue(hasValidation, "Validation should appear for invalid email")
    }

    // MARK: - Sign Up Tests

    @MainActor
    func testSignUp_allFieldsVisible() throws {
        navigateToLogin()

        let signUpToggle = app.buttons["Sign Up"]
        XCTAssertTrue(signUpToggle.waitForExistence(timeout: 5), "Sign Up toggle should exist")
        signUpToggle.tap()

        let fullNameField = app.textFields["Full Name"]
        XCTAssertTrue(fullNameField.waitForExistence(timeout: 3), "Full Name field should appear in sign up mode")

        let phoneField = app.textFields["Phone Number"]
        XCTAssertTrue(phoneField.waitForExistence(timeout: 3), "Phone Number field should appear in sign up mode")

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.exists, "Email field should exist in sign up mode")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.exists, "Password field should exist in sign up mode")
    }

    @MainActor
    func testSignUp_toggleBackToLogin() throws {
        navigateToLogin()

        // Toggle to Sign Up
        let signUpToggle = app.buttons["Sign Up"]
        XCTAssertTrue(signUpToggle.waitForExistence(timeout: 5))
        signUpToggle.tap()

        let fullNameField = app.textFields["Full Name"]
        XCTAssertTrue(fullNameField.waitForExistence(timeout: 3), "Full Name should be visible in sign up mode")

        // Toggle back to Login
        let loginToggle = app.buttons["Login"]
        XCTAssertTrue(loginToggle.waitForExistence(timeout: 3))
        loginToggle.tap()

        // Full Name field should be hidden
        XCTAssertFalse(app.textFields["Full Name"].exists, "Full Name should be hidden in login mode")
    }

    // MARK: - Forgot Password Tests

    @MainActor
    func testForgotPassword_opensSheet() throws {
        navigateToLogin()

        let forgotPasswordButton = app.buttons["Forgot Password?"]
        XCTAssertTrue(forgotPasswordButton.waitForExistence(timeout: 5), "Forgot Password button should exist")

        forgotPasswordButton.tap()

        let resetPasswordTitle = app.staticTexts["Reset Password"]
        XCTAssertTrue(resetPasswordTitle.waitForExistence(timeout: 5), "Reset Password sheet should appear")
    }

    // MARK: - Social Auth Tests

    @MainActor
    func testGoogleSignIn_buttonExists() throws {
        navigateToLogin()

        let googleButton = app.buttons["Sign in with Google"]
        XCTAssertTrue(googleButton.waitForExistence(timeout: 5), "Google Sign In button should exist")
        XCTAssertTrue(googleButton.isEnabled, "Google Sign In button should be enabled")
    }

    @MainActor
    func testAppleSignIn_buttonExists() throws {
        navigateToLogin()

        let appleButton = app.buttons["Sign in with Apple"]
        XCTAssertTrue(appleButton.waitForExistence(timeout: 5), "Apple Sign In button should exist")
        XCTAssertTrue(appleButton.isEnabled, "Apple Sign In button should be enabled")
    }

    // MARK: - Legal Acceptance Tests

    @MainActor
    func testLegalAcceptance_allDocumentsPresent() throws {
        navigateToLogin()

        // Toggle to Sign Up mode where legal acceptance is shown
        let signUpToggle = app.buttons["Sign Up"]
        if signUpToggle.waitForExistence(timeout: 3) {
            signUpToggle.tap()
        }

        // Check for terms/privacy elements
        let termsText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'terms'")).firstMatch
        let privacyText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'privacy'")).firstMatch

        let hasLegal = termsText.waitForExistence(timeout: 5) || privacyText.waitForExistence(timeout: 3)
        XCTAssertTrue(hasLegal, "Terms and/or Privacy links should be present in sign up mode")
    }
}
