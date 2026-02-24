//
//  eatfaircustomerUITests.swift
//  eatfaircustomerUITests
//
//  Created by Jithesh Manoharan on 11/25/25.
//
//  Flow-organized tests are in the Flows/ subdirectory:
//  - Flows/AuthFlowTests.swift         (CustomerAuthFlowTests)
//  - Flows/FoodDeliveryFlowTests.swift  (CustomerFoodDeliveryFlowTests)
//  - Flows/RideshareFlowTests.swift     (CustomerRideshareFlowTests)
//  - Flows/ProfileSettingsTests.swift   (CustomerProfileSettingsTests)
//
//  Shared helpers: Helpers/TestHelpers.swift (DollorTestCase base class)
//

import XCTest

/// Root UI test class for Dollor.ai Customer iOS App.
/// Retained for launch performance metrics and welcome screen tests.
/// See Flows/ subdirectory for flow-organized test suites.
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

    // MARK: - Launch Performance

    @MainActor
    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }

    // MARK: - Welcome Screen Smoke Tests

    @MainActor
    func testWelcomeScreen_appNameIsDisplayed() throws {
        let appNameText = app.staticTexts["Dollor.ai"]
        XCTAssertTrue(appNameText.waitForExistence(timeout: 5), "App name 'Dollor.ai' should be displayed")
    }

    @MainActor
    func testWelcomeScreen_getStartedButton_isDisplayed() throws {
        // App now goes directly to LoginView (no WelcomeView in current flow)
        // Verify the login screen is displayed with its primary action button
        let continueButton = app.buttons["Continue to sign in"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 5), "Login continue button should be displayed")
        XCTAssertTrue(continueButton.isEnabled, "Login continue button should be enabled")
    }

    @MainActor
    func testWelcomeScreen_getStartedClick_navigatesToLogin() throws {
        // App goes directly to LoginView -- verify login screen has key elements
        let dollorText = app.staticTexts["Dollor.ai"]
        XCTAssertTrue(dollorText.waitForExistence(timeout: 5), "Dollor.ai title should be on login screen")

        let welcomeBack = app.staticTexts["Welcome back"]
        XCTAssertTrue(welcomeBack.exists, "Welcome back text should be displayed")
    }
}
