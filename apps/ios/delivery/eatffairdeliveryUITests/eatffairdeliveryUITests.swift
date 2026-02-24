//
//  eatffairdeliveryUITests.swift
//  eatffairdeliveryUITests
//
//  Created by Jithesh Manoharan on 11/26/25.
//
//  Flow-organized tests are in the Flows/ subdirectory:
//  - Flows/AuthFlowTests.swift              (DriverAuthFlowTests)
//  - Flows/DeliveryFlowTests.swift          (DriverDeliveryFlowTests)
//  - Flows/RideshareDriverFlowTests.swift   (DriverRideshareFlowTests)
//  - Flows/DriverProfileTests.swift         (DriverProfileFlowTests)
//
//  Shared helpers: Helpers/TestHelpers.swift (DollorTestCase base class)
//

import XCTest

/// Root UI test class for Dollor.ai Driver iOS App.
/// Retained for launch performance metrics and login smoke tests.
/// See Flows/ subdirectory for flow-organized test suites.
final class eatffairdeliveryUITests: XCTestCase {

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

    // MARK: - Login Smoke Tests

    @MainActor
    func testLoginScreen_driverLoginTitle_isDisplayed() throws {
        let driverLoginText = app.staticTexts["Driver Login"]
        XCTAssertTrue(driverLoginText.waitForExistence(timeout: 5), "Should show 'Driver Login' title")
    }

    @MainActor
    func testLoginScreen_emailPasswordFields_exist() throws {
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 3), "Password field should exist")
    }

    @MainActor
    func testLoginScreen_loginButton_isDisplayed() throws {
        let loginButton = app.buttons["Login"]
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5), "Login button should be displayed")
        XCTAssertTrue(loginButton.isEnabled, "Login button should be enabled")
    }
}
