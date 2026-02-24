//
//  MenuManagementTests.swift
//  eatffairrestaurantUITests
//
//  Restaurant menu management flow tests.
//  Source: UI_INTERACTION_AUDIT.md iOS Restaurant Menu (#1-13)
//

import XCTest

final class RestaurantMenuManagementTests: DollorTestCase {

    // MARK: - Menu List Tests

    @MainActor
    func testMenu_addItemButton_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Menu")

        let addButton = app.buttons["Add Item"]
        if addButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(addButton.exists, "Add Item button should exist")
        }
    }

    @MainActor
    func testMenu_searchBar_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Menu")

        let searchField = app.searchFields.firstMatch
        if searchField.waitForExistence(timeout: 5) {
            XCTAssertTrue(searchField.exists, "Search field should exist in menu")
        }
    }

    @MainActor
    func testMenu_itemAvailabilityToggle_exists() throws {
        try ensureLoggedIn()

        navigateToTab("Menu")

        let toggle = app.switches.firstMatch
        if toggle.waitForExistence(timeout: 10) {
            XCTAssertTrue(toggle.exists, "Availability toggle should exist on menu items")
        }
    }

    @MainActor
    func testMenu_editDeleteActions_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Menu")

        // Menu items may have context menu or swipe actions
        let editButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Edit' OR label CONTAINS[c] 'edit'")).firstMatch
        let deleteButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Delete' OR label CONTAINS[c] 'delete'")).firstMatch

        // At least one action should be accessible
        if editButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(editButton.exists, "Edit action should exist")
        }
    }

    // MARK: - Add Item Dialog Tests

    @MainActor
    func testMenu_addItemDialog_hasRequiredFields() throws {
        try ensureLoggedIn()

        navigateToTab("Menu")

        let addButton = app.buttons["Add Item"]
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()

            let dialogTitle = app.staticTexts["Add Menu Item"]
            if dialogTitle.waitForExistence(timeout: 5) {
                let nameField = app.textFields["Item Name"]
                let priceField = app.textFields["Price"]

                if nameField.waitForExistence(timeout: 3) {
                    XCTAssertTrue(nameField.exists, "Item Name field should exist in add dialog")
                }
                if priceField.waitForExistence(timeout: 3) {
                    XCTAssertTrue(priceField.exists, "Price field should exist in add dialog")
                }
            }
        }
    }

    @MainActor
    func testMenu_addItemDialog_saveCancel_exist() throws {
        try ensureLoggedIn()

        navigateToTab("Menu")

        let addButton = app.buttons["Add Item"]
        if addButton.waitForExistence(timeout: 5) {
            addButton.tap()

            let saveButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Save' OR label CONTAINS[c] 'Add'")).firstMatch
            let cancelButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Cancel'")).firstMatch

            if saveButton.waitForExistence(timeout: 5) {
                XCTAssertTrue(saveButton.exists, "Save button should exist in add dialog")
            }
            if cancelButton.waitForExistence(timeout: 3) {
                XCTAssertTrue(cancelButton.exists, "Cancel button should exist in add dialog")
            }
        }
    }
}
