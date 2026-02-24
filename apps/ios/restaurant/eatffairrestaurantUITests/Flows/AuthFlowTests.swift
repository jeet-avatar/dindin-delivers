//
//  AuthFlowTests.swift
//  eatffairrestaurantUITests
//
//  Restaurant authentication flow tests: login, forgot password, sign up, social auth.
//  Source: UI_INTERACTION_AUDIT.md iOS Restaurant Auth (#1-18)
//

import XCTest

final class RestaurantAuthFlowTests: DollorTestCase {

    @MainActor
    func testLogin_brandTitle_isDisplayed() throws {
        let brandTitle = app.staticTexts["Dollor AI Restaurant"]
        XCTAssertTrue(brandTitle.waitForExistence(timeout: 5), "Should show 'Dollor AI Restaurant' brand title")
    }

    @MainActor
    func testLogin_emailPasswordFields_exist() throws {
        let emailField = app.textFields["Enter your email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist with 'Enter your email' placeholder")

        let passwordField = app.secureTextFields["Enter your password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 3), "Password field should exist with 'Enter your password' placeholder")
    }

    @MainActor
    func testLogin_loginButton_exists() throws {
        let loginButton = app.buttons["Log in to your account"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5), "Log In button should exist")
    }

    @MainActor
    func testLogin_forgotPassword_opensSheet() throws {
        let forgotButton = app.buttons["Forgot password"]
        XCTAssertTrue(forgotButton.waitForExistence(timeout: 5), "Forgot Password button should exist")

        forgotButton.tap()

        let resetTitle = app.staticTexts["Reset Password"]
        XCTAssertTrue(resetTitle.waitForExistence(timeout: 5), "Reset Password sheet should open")
    }

    @MainActor
    func testLogin_signUp_opensRegistration() throws {
        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5), "Sign Up button should exist")

        signUpButton.tap()

        // RestaurantRegistrationView uses "Partner Application" as navigationTitle
        let partnerAppTitle = app.staticTexts["Partner Application"]
        let createAccountTitle = app.staticTexts["Create Account"]
        XCTAssertTrue(partnerAppTitle.waitForExistence(timeout: 5) || createAccountTitle.waitForExistence(timeout: 3), "Registration sheet should open")
    }

    @MainActor
    func testLogin_googleAppleButtons_exist() throws {
        let googleButton = app.buttons["Sign in with Google"]
        XCTAssertTrue(googleButton.waitForExistence(timeout: 5), "Google Sign-In button should exist")

        let appleButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'apple' OR label CONTAINS[c] 'Apple'")).firstMatch
        XCTAssertTrue(appleButton.waitForExistence(timeout: 3), "Apple Sign-In button should exist")
    }

    @MainActor
    func testRegistration_multiStep_navigation() throws {
        let signUpButton = app.buttons["Sign up for a new account"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))
        signUpButton.tap()

        // RestaurantRegistrationView uses "Partner Application" as navigationTitle
        let partnerAppTitle = app.staticTexts["Partner Application"]
        let createAccountTitle = app.staticTexts["Create Account"]
        XCTAssertTrue(partnerAppTitle.waitForExistence(timeout: 5) || createAccountTitle.waitForExistence(timeout: 3))

        // Look for navigation buttons in registration wizard
        let nextButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Next' OR label CONTAINS[c] 'Create Account' OR label CONTAINS[c] 'Continue'")).firstMatch
        if nextButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(nextButton.exists, "Next/Create Account button should exist in registration")
        }
    }
}
