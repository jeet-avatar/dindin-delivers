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
        let getStartedButton = app.buttons["Get Started"]
        XCTAssertTrue(getStartedButton.waitForExistence(timeout: 5), "Get Started button should be displayed")
        XCTAssertTrue(getStartedButton.isEnabled, "Get Started button should be enabled")
    }

    @MainActor
    func testWelcomeScreen_getStartedClick_navigatesToLogin() throws {
        let getStartedButton = app.buttons["Get Started"]
        XCTAssertTrue(getStartedButton.waitForExistence(timeout: 5), "Get Started button should exist")
        getStartedButton.tap()

        let dollorAIServiceText = app.staticTexts["Dollor AI Service"]
        XCTAssertTrue(dollorAIServiceText.waitForExistence(timeout: 5), "Should navigate to login screen")
    }
}
