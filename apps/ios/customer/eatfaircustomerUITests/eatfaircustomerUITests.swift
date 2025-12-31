//
//  eatfaircustomerUITests.swift
//  eatfaircustomerUITests
//
//  Created by Jithesh Manoharan on 11/25/25.
//  Updated with comprehensive UI tests for platform parity
//

import XCTest

/// Comprehensive UI tests for the Dollor.ai Customer iOS App
/// Tests mirror Android counterpart for platform parity
final class eatfaircustomerUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // ============================================================
    // MARK: - WELCOME SCREEN TESTS
    // ============================================================

    @MainActor
    func testWelcomeScreen_appNameIsDisplayed() throws {
        // Look for the app name on the welcome screen
        let appNameText = app.staticTexts["Dollor.ai"]
        XCTAssertTrue(appNameText.waitForExistence(timeout: 5), "App name 'Dollor.ai' should be displayed")
    }

    @MainActor
    func testWelcomeScreen_taglineIsDisplayed() throws {
        let tagline = app.staticTexts["Your Local Rideshare & Delivery Marketplace"]
        XCTAssertTrue(tagline.waitForExistence(timeout: 5), "Tagline should be displayed")
    }

    @MainActor
    func testWelcomeScreen_featureRows_foodDeliveryIsDisplayed() throws {
        let foodDeliveryText = app.staticTexts["Food Delivery"]
        XCTAssertTrue(foodDeliveryText.waitForExistence(timeout: 5), "Food Delivery feature should be displayed")

        let foodDeliverySubtitle = app.staticTexts["Order from local restaurants"]
        XCTAssertTrue(foodDeliverySubtitle.exists, "Food Delivery subtitle should be displayed")
    }

    @MainActor
    func testWelcomeScreen_featureRows_rideshareIsDisplayed() throws {
        let rideshareText = app.staticTexts["Rideshare"]
        XCTAssertTrue(rideshareText.waitForExistence(timeout: 5), "Rideshare feature should be displayed")

        let rideshareSubtitle = app.staticTexts["Connect with local drivers"]
        XCTAssertTrue(rideshareSubtitle.exists, "Rideshare subtitle should be displayed")
    }

    @MainActor
    func testWelcomeScreen_featureRows_fairPricesIsDisplayed() throws {
        let fairPricesText = app.staticTexts["Fair Prices"]
        XCTAssertTrue(fairPricesText.waitForExistence(timeout: 5), "Fair Prices feature should be displayed")

        // Verify pricing info $1-$3
        let pricingSubtitle = app.staticTexts["Transparent $1-$3 platform fees"]
        XCTAssertTrue(pricingSubtitle.exists, "Pricing info should show $1-$3 platform fees")
    }

    @MainActor
    func testWelcomeScreen_getStartedButton_isDisplayed() throws {
        let getStartedButton = app.buttons["Get Started"]
        XCTAssertTrue(getStartedButton.waitForExistence(timeout: 5), "Get Started button should be displayed")
        XCTAssertTrue(getStartedButton.isEnabled, "Get Started button should be enabled")
    }

    @MainActor
    func testWelcomeScreen_loginLink_isDisplayed() throws {
        let loginLink = app.buttons["I already have an account"]
        XCTAssertTrue(loginLink.waitForExistence(timeout: 5), "Login link should be displayed")
    }

    @MainActor
    func testWelcomeScreen_getStartedClick_navigatesToLogin() throws {
        let getStartedButton = app.buttons["Get Started"]
        XCTAssertTrue(getStartedButton.waitForExistence(timeout: 5), "Get Started button should exist")

        getStartedButton.tap()

        // Verify navigation to login screen
        let dollorAIServiceText = app.staticTexts["Dollor AI Service"]
        XCTAssertTrue(dollorAIServiceText.waitForExistence(timeout: 5), "Should navigate to login screen")
    }

    @MainActor
    func testWelcomeScreen_loginLinkClick_navigatesToLogin() throws {
        let loginLink = app.buttons["I already have an account"]
        XCTAssertTrue(loginLink.waitForExistence(timeout: 5), "Login link should exist")

        loginLink.tap()

        // Verify navigation to login screen
        let dollorAIServiceText = app.staticTexts["Dollor AI Service"]
        XCTAssertTrue(dollorAIServiceText.waitForExistence(timeout: 5), "Should navigate to login screen")
    }

    // ============================================================
    // MARK: - LOGIN SCREEN TESTS
    // ============================================================

    @MainActor
    func testLoginScreen_initialState_showsLoginMode() throws {
        // Navigate to login screen first
        navigateToLoginScreen()

        // Verify header elements
        let dollorAIServiceText = app.staticTexts["Dollor AI Service"]
        XCTAssertTrue(dollorAIServiceText.waitForExistence(timeout: 5), "Header should show 'Dollor AI Service'")

        let subtitleText = app.staticTexts["$ online store"]
        XCTAssertTrue(subtitleText.exists, "Subtitle should show '$ online store'")

        // Verify Login button is shown
        let loginButton = app.buttons["Login"]
        XCTAssertTrue(loginButton.exists, "Login button should be displayed")

        // Verify email and password fields exist
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.exists, "Email field should exist")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.exists, "Password field should exist")
    }

    @MainActor
    func testLoginScreen_dollarSignLogo_isDisplayed() throws {
        navigateToLoginScreen()

        // Dollar sign is displayed as text in the logo area
        let dollarSign = app.staticTexts["$"]
        XCTAssertTrue(dollarSign.waitForExistence(timeout: 5), "Dollar sign logo should be displayed")
    }

    @MainActor
    func testLoginScreen_toggleToSignUpMode_showsAdditionalFields() throws {
        navigateToLoginScreen()

        // Find and tap Sign Up toggle
        let signUpToggle = app.buttons["Sign Up"]
        XCTAssertTrue(signUpToggle.waitForExistence(timeout: 5), "Sign Up toggle should exist")
        signUpToggle.tap()

        // Verify Full Name field appears
        let fullNameField = app.textFields["Full Name"]
        XCTAssertTrue(fullNameField.waitForExistence(timeout: 3), "Full Name field should appear in sign up mode")

        // Verify Phone Number field appears
        let phoneField = app.textFields["Phone Number"]
        XCTAssertTrue(phoneField.exists, "Phone Number field should appear in sign up mode")

        // Footer text should change
        let alreadyHaveAccountText = app.staticTexts["Already have an account?"]
        XCTAssertTrue(alreadyHaveAccountText.exists, "Footer should show 'Already have an account?'")
    }

    @MainActor
    func testLoginScreen_toggleBackToLoginMode_hidesSignUpFields() throws {
        navigateToLoginScreen()

        // Toggle to Sign Up mode
        let signUpToggle = app.buttons["Sign Up"]
        XCTAssertTrue(signUpToggle.waitForExistence(timeout: 5))
        signUpToggle.tap()

        // Verify Sign Up mode
        let fullNameField = app.textFields["Full Name"]
        XCTAssertTrue(fullNameField.waitForExistence(timeout: 3), "Full Name should be visible in sign up mode")

        // Toggle back to Login mode
        let loginToggle = app.buttons["Login"]
        XCTAssertTrue(loginToggle.waitForExistence(timeout: 3))
        loginToggle.tap()

        // Verify Full Name field is hidden
        XCTAssertFalse(app.textFields["Full Name"].exists, "Full Name should be hidden in login mode")

        // Verify Forgot Password appears
        let forgotPasswordButton = app.buttons["Forgot Password?"]
        XCTAssertTrue(forgotPasswordButton.waitForExistence(timeout: 3), "Forgot Password should be visible in login mode")
    }

    @MainActor
    func testLoginScreen_emailInput_acceptsText() throws {
        navigateToLoginScreen()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))

        emailField.tap()
        emailField.typeText("test@example.com")

        XCTAssertEqual(emailField.value as? String, "test@example.com", "Email field should contain typed text")
    }

    @MainActor
    func testLoginScreen_passwordInput_acceptsText() throws {
        navigateToLoginScreen()

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5))

        passwordField.tap()
        passwordField.typeText("password123")

        // Password field won't show the actual text due to secure input
        XCTAssertTrue(passwordField.exists, "Password field should accept input")
    }

    @MainActor
    func testLoginScreen_googleSignInButton_isDisplayed() throws {
        navigateToLoginScreen()

        let googleSignInButton = app.buttons["Sign in with Google"]
        XCTAssertTrue(googleSignInButton.waitForExistence(timeout: 5), "Google Sign In button should be displayed")
        XCTAssertTrue(googleSignInButton.isEnabled, "Google Sign In button should be enabled")
    }

    @MainActor
    func testLoginScreen_appleSignInButton_isDisplayed() throws {
        navigateToLoginScreen()

        let appleSignInButton = app.buttons["Sign in with Apple"]
        XCTAssertTrue(appleSignInButton.waitForExistence(timeout: 5), "Apple Sign In button should be displayed")
        XCTAssertTrue(appleSignInButton.isEnabled, "Apple Sign In button should be enabled")
    }

    @MainActor
    func testLoginScreen_forgotPasswordButton_isDisplayed() throws {
        navigateToLoginScreen()

        let forgotPasswordButton = app.buttons["Forgot Password?"]
        XCTAssertTrue(forgotPasswordButton.waitForExistence(timeout: 5), "Forgot Password button should be displayed")
    }

    @MainActor
    func testLoginScreen_forgotPasswordButton_opensSheet() throws {
        navigateToLoginScreen()

        let forgotPasswordButton = app.buttons["Forgot Password?"]
        XCTAssertTrue(forgotPasswordButton.waitForExistence(timeout: 5))

        forgotPasswordButton.tap()

        // Verify sheet is displayed with Reset Password title
        let resetPasswordTitle = app.staticTexts["Reset Password"]
        XCTAssertTrue(resetPasswordTitle.waitForExistence(timeout: 5), "Reset Password sheet should appear")
    }

    @MainActor
    func testLoginScreen_signUpMode_allFieldsAcceptInput() throws {
        navigateToLoginScreen()

        // Toggle to Sign Up mode
        let signUpToggle = app.buttons["Sign Up"]
        signUpToggle.tap()

        // Input Full Name
        let fullNameField = app.textFields["Full Name"]
        XCTAssertTrue(fullNameField.waitForExistence(timeout: 3))
        fullNameField.tap()
        fullNameField.typeText("John Doe")

        // Input Phone Number
        let phoneField = app.textFields["Phone Number"]
        phoneField.tap()
        phoneField.typeText("4155551234")

        // Input Email
        let emailField = app.textFields["Email"]
        emailField.tap()
        emailField.typeText("john@test.com")

        // Input Password
        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText("password123")

        // Verify all fields have content
        XCTAssertEqual(fullNameField.value as? String, "John Doe")
        XCTAssertEqual(phoneField.value as? String, "4155551234")
        XCTAssertEqual(emailField.value as? String, "john@test.com")
    }

    // ============================================================
    // MARK: - ACCESSIBILITY TESTS
    // ============================================================

    @MainActor
    func testAccessibility_loginScreen_buttonsAreAccessible() throws {
        navigateToLoginScreen()

        let loginButton = app.buttons["Login"]
        XCTAssertTrue(loginButton.isHittable, "Login button should be accessible")

        let googleButton = app.buttons["Sign in with Google"]
        XCTAssertTrue(googleButton.isHittable, "Google Sign In button should be accessible")

        let appleButton = app.buttons["Sign in with Apple"]
        XCTAssertTrue(appleButton.isHittable, "Apple Sign In button should be accessible")
    }

    @MainActor
    func testAccessibility_loginScreen_textFieldsAreAccessible() throws {
        navigateToLoginScreen()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.isHittable, "Email field should be accessible")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.isHittable, "Password field should be accessible")
    }

    // ============================================================
    // MARK: - PERFORMANCE TESTS
    // ============================================================

    @MainActor
    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }

    // ============================================================
    // MARK: - HELPER METHODS
    // ============================================================

    private func navigateToLoginScreen() {
        // Check if we're on welcome screen or already on login screen
        let getStartedButton = app.buttons["Get Started"]
        if getStartedButton.waitForExistence(timeout: 3) {
            getStartedButton.tap()
        }

        // Wait for login screen
        let dollorAIServiceText = app.staticTexts["Dollor AI Service"]
        _ = dollorAIServiceText.waitForExistence(timeout: 5)
    }
}
