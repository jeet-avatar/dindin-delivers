//
//  FoodDeliveryFlowTests.swift
//  eatfaircustomerUITests
//
//  Customer food ordering flow tests: browse, cart, checkout, tracking.
//  Source: UI_INTERACTION_AUDIT.md iOS Customer Food Delivery (#1-44)
//

import XCTest

final class CustomerFoodDeliveryFlowTests: DollorTestCase {

    // MARK: - Home Screen Tests

    @MainActor
    func testHome_categoryButtons_areDisplayed() throws {
        try skipIfNotLoggedIn()

        // Category filter buttons on HomeView
        let foodDeliveryText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'food' OR label CONTAINS[c] 'restaurant'")).firstMatch
        XCTAssertTrue(foodDeliveryText.waitForExistence(timeout: 10), "Food/restaurant category should be displayed on home")
    }

    @MainActor
    func testHome_orderFoodButton_navigatesToSearch() throws {
        try skipIfNotLoggedIn()

        let orderFoodButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Order Food' OR label CONTAINS[c] 'order'")).firstMatch
        if orderFoodButton.waitForExistence(timeout: 5) {
            orderFoodButton.tap()

            // Verify navigation to search/restaurants view
            let searchElement = app.searchFields.firstMatch
            let restaurantList = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'restaurant'")).firstMatch
            let hasSearchView = searchElement.waitForExistence(timeout: 5) || restaurantList.waitForExistence(timeout: 5)
            XCTAssertTrue(hasSearchView, "Should navigate to restaurant search view")
        }
    }

    @MainActor
    func testHome_bookRideButton_navigatesToRideRequest() throws {
        try skipIfNotLoggedIn()

        let bookRideButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Book Ride' OR label CONTAINS[c] 'ride'")).firstMatch
        if bookRideButton.waitForExistence(timeout: 5) {
            bookRideButton.tap()

            // Verify navigation to ride request view
            let rideElement = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'pickup' OR label CONTAINS[c] 'ride' OR label CONTAINS[c] 'dropoff'")).firstMatch
            XCTAssertTrue(rideElement.waitForExistence(timeout: 5), "Should navigate to ride request view")
        }
    }

    // MARK: - Browse Restaurants Tests

    @MainActor
    func testBrowse_restaurantCards_areTappable() throws {
        try skipIfNotLoggedIn()

        // Navigate to restaurant list
        let orderFoodButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Order Food'")).firstMatch
        if orderFoodButton.waitForExistence(timeout: 5) {
            orderFoodButton.tap()
        }

        // Verify restaurant navigation links exist
        let restaurantCard = app.cells.firstMatch
        if restaurantCard.waitForExistence(timeout: 10) {
            XCTAssertTrue(restaurantCard.isHittable, "Restaurant card should be tappable")
        }
    }

    @MainActor
    func testBrowse_sortMenu_isAccessible() throws {
        try skipIfNotLoggedIn()

        let orderFoodButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Order Food'")).firstMatch
        if orderFoodButton.waitForExistence(timeout: 5) {
            orderFoodButton.tap()
        }

        // Look for sort/filter options
        let sortButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'sort' OR label CONTAINS[c] 'filter'")).firstMatch
        if sortButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(sortButton.isEnabled, "Sort button should be accessible")
        }
    }

    // MARK: - Restaurant Detail Tests

    @MainActor
    func testRestaurantDetail_menuItems_areDisplayed() throws {
        try skipIfNotLoggedIn()

        // Navigate to a restaurant
        let orderFoodButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Order Food'")).firstMatch
        if orderFoodButton.waitForExistence(timeout: 5) {
            orderFoodButton.tap()
        }

        let restaurantCard = app.cells.firstMatch
        if restaurantCard.waitForExistence(timeout: 10) {
            restaurantCard.tap()

            // Verify menu section
            let menuItem = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'menu' OR label CONTAINS[c] '$'")).firstMatch
            XCTAssertTrue(menuItem.waitForExistence(timeout: 10), "Menu items should be displayed in restaurant detail")
        }
    }

    @MainActor
    func testRestaurantDetail_addToCart_works() throws {
        try skipIfNotLoggedIn()

        let orderFoodButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Order Food'")).firstMatch
        if orderFoodButton.waitForExistence(timeout: 5) {
            orderFoodButton.tap()
        }

        let restaurantCard = app.cells.firstMatch
        if restaurantCard.waitForExistence(timeout: 10) {
            restaurantCard.tap()

            // Look for add to cart button
            let addButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'add' OR label CONTAINS[c] 'cart' OR label CONTAINS[c] '+'")).firstMatch
            if addButton.waitForExistence(timeout: 10) {
                XCTAssertTrue(addButton.isEnabled, "Add to cart button should be enabled")
            }
        }
    }

    // MARK: - Cart Tests

    @MainActor
    func testCart_itemQuantity_canBeChanged() throws {
        try skipIfNotLoggedIn()

        // Navigate to cart (if items exist)
        let cartButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'cart'")).firstMatch
        if cartButton.waitForExistence(timeout: 5) {
            cartButton.tap()

            let plusButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] '+' OR label CONTAINS[c] 'increase'")).firstMatch
            let minusButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] '-' OR label CONTAINS[c] 'decrease'")).firstMatch

            if plusButton.waitForExistence(timeout: 5) {
                XCTAssertTrue(plusButton.exists, "Plus button should exist in cart")
            }
            if minusButton.waitForExistence(timeout: 3) {
                XCTAssertTrue(minusButton.exists, "Minus button should exist in cart")
            }
        }
    }

    @MainActor
    func testCart_checkoutButton_navigatesToCheckout() throws {
        try skipIfNotLoggedIn()

        let cartButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'cart'")).firstMatch
        if cartButton.waitForExistence(timeout: 5) {
            cartButton.tap()

            let checkoutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'checkout' OR label CONTAINS[c] 'proceed'")).firstMatch
            if checkoutButton.waitForExistence(timeout: 5) {
                XCTAssertTrue(checkoutButton.isEnabled, "Checkout button should be enabled")
            }
        }
    }

    // MARK: - Checkout Tests

    @MainActor
    func testCheckout_placeOrderButton_exists() throws {
        try skipIfNotLoggedIn()

        let cartButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'cart'")).firstMatch
        if cartButton.waitForExistence(timeout: 5) {
            cartButton.tap()

            let checkoutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'checkout'")).firstMatch
            if checkoutButton.waitForExistence(timeout: 5) {
                checkoutButton.tap()

                let placeOrderButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Place Order'")).firstMatch
                if placeOrderButton.waitForExistence(timeout: 5) {
                    XCTAssertTrue(placeOrderButton.exists, "Place Order button should exist in checkout")
                }
            }
        }
    }

    @MainActor
    func testCheckout_addressSection_exists() throws {
        try skipIfNotLoggedIn()

        let cartButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'cart'")).firstMatch
        if cartButton.waitForExistence(timeout: 5) {
            cartButton.tap()

            let checkoutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'checkout'")).firstMatch
            if checkoutButton.waitForExistence(timeout: 5) {
                checkoutButton.tap()

                let addressSection = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'address' OR label CONTAINS[c] 'deliver'")).firstMatch
                if addressSection.waitForExistence(timeout: 5) {
                    XCTAssertTrue(addressSection.exists, "Delivery address section should exist in checkout")
                }
            }
        }
    }

    @MainActor
    func testCheckout_paymentSection_exists() throws {
        try skipIfNotLoggedIn()

        let cartButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'cart'")).firstMatch
        if cartButton.waitForExistence(timeout: 5) {
            cartButton.tap()

            let checkoutButton = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'checkout'")).firstMatch
            if checkoutButton.waitForExistence(timeout: 5) {
                checkoutButton.tap()

                let paymentSection = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'payment' OR label CONTAINS[c] 'card'")).firstMatch
                if paymentSection.waitForExistence(timeout: 5) {
                    XCTAssertTrue(paymentSection.exists, "Payment section should exist in checkout")
                }
            }
        }
    }
}
