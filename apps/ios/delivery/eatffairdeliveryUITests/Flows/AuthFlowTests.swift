//
//  AuthFlowTests.swift
//  eatffairdeliveryUITests
//
//  Driver authentication flow tests: login, register, social auth.
//  Source: UI_INTERACTION_AUDIT.md iOS Driver Auth (#1-12)
//

import XCTest

final class DriverAuthFlowTests: DollorTestCase {

    @MainActor
    func testLogin_driverLoginTitle_isDisplayed() throws {
        let driverLoginText = app.staticTexts["Driver Login"]
        XCTAssertTrue(driverLoginText.waitForExistence(timeout: 5), "Should show 'Driver Login' title")
    }

    @MainActor
    func testLogin_emailPasswordFields_exist() throws {
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 3), "Password field should exist")
    }

    @MainActor
    func testLogin_signUpMode_showsDriverFields() throws {
        let signUpToggle = app.buttons["Don't have an account? Sign Up"]
        XCTAssertTrue(signUpToggle.waitForExistence(timeout: 5), "Sign Up toggle should exist")
        signUpToggle.tap()

        let driverSignUpText = app.staticTexts["Driver Sign Up"]
        XCTAssertTrue(driverSignUpText.waitForExistence(timeout: 3), "Should show 'Driver Sign Up' title")

        let firstNameField = app.textFields["First Name"]
        XCTAssertTrue(firstNameField.waitForExistence(timeout: 3), "First Name field should appear")

        let lastNameField = app.textFields["Last Name"]
        XCTAssertTrue(lastNameField.exists, "Last Name field should appear")

        let phoneField = app.textFields["Phone Number"]
        XCTAssertTrue(phoneField.exists, "Phone Number field should appear")

        let confirmPasswordField = app.secureTextFields["Confirm Password"]
        XCTAssertTrue(confirmPasswordField.exists, "Confirm Password field should appear")
    }

    @MainActor
    func testLogin_termsCheckbox_inSignUpMode() throws {
        let signUpToggle = app.buttons["Don't have an account? Sign Up"]
        XCTAssertTrue(signUpToggle.waitForExistence(timeout: 5))
        signUpToggle.tap()

        let termsText = app.staticTexts["Terms & Conditions"]
        XCTAssertTrue(termsText.waitForExistence(timeout: 3), "Terms & Conditions text should be displayed in sign up mode")
    }

    @MainActor
    func testLogin_forgotPassword_exists() throws {
        // Driver login view uses Forgot Password button
        let forgotButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Forgot'")).firstMatch
        XCTAssertTrue(forgotButton.waitForExistence(timeout: 5), "Forgot Password button should exist")
    }

    @MainActor
    func testLogin_googleAppleButtons_exist() throws {
        let googleButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'google' OR label CONTAINS[c] 'Google'")).firstMatch
        let appleButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'apple' OR label CONTAINS[c] 'Apple'")).firstMatch

        let hasGoogle = googleButton.waitForExistence(timeout: 5)
        let hasApple = appleButton.waitForExistence(timeout: 3)

        XCTAssertTrue(hasGoogle || hasApple, "At least one social sign-in button should exist")
    }
}
