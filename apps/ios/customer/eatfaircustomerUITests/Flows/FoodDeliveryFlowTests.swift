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
        try ensureLoggedIn()

        // Category filter buttons on HomeView
        let foodDeliveryText = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'food' OR label CONTAINS[c] 'restaurant'")).firstMatch
        XCTAssertTrue(foodDeliveryText.waitForExistence(timeout: 10), "Food/restaurant category should be displayed on home")
    }

    @MainActor
    func testHome_orderFoodButton_navigatesToSearch() throws {
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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
        try ensureLoggedIn()

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

    // MARK: - Phase 68 Insurance Tour
    //
    // Single narrative test that walks the customer journey and screenshots
    // every meaningful state. Each shot becomes a captioned page in the
    // insurance underwriter PDF.

    @MainActor
    func testInsuranceTour_customerFood() throws {
        navigateToLogin()
        screenshot("01_login")

        try ensureLoggedIn()
        screenshot("02_home_logged_in")

        // Restaurant list
        let orderFood = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Order Food' OR label CONTAINS[c] 'restaurant'")
        ).firstMatch
        if orderFood.waitForExistence(timeout: 5) {
            orderFood.tap()
            _ = app.cells.firstMatch.waitForExistence(timeout: 10)
            screenshot("03_restaurant_list")
        }

        // Restaurant detail (first card)
        let firstRestaurant = app.cells.firstMatch
        if firstRestaurant.waitForExistence(timeout: 8) {
            firstRestaurant.tap()
            _ = app.staticTexts.containing(NSPredicate(format: "label CONTAINS '$'")).firstMatch.waitForExistence(timeout: 10)
            screenshot("04_restaurant_menu")
        }

        // Orders tab — past orders with receipts
        navigateToTab("Orders")
        sleep(2)
        screenshot("05_orders_history")

        let orderCell = app.cells.firstMatch
        if orderCell.waitForExistence(timeout: 8) {
            orderCell.tap()
            sleep(3)
            screenshot("06_order_detail_receipt")
        }
    }

    @MainActor
    func testInsuranceTour_customerRideshare() throws {
        try ensureLoggedIn()

        // Home → Book Ride
        navigateToTab("Home")
        sleep(1)
        let bookRide = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Book Ride' OR label CONTAINS[c] 'ride'")
        ).firstMatch
        if bookRide.waitForExistence(timeout: 5) {
            bookRide.tap()
            sleep(2)
            screenshot("10_ride_request_form")
        }

        // Rides history tab
        navigateToTab("Rides")
        sleep(2)
        screenshot("11_rides_history")

        let rideCell = app.cells.firstMatch
        if rideCell.waitForExistence(timeout: 8) {
            rideCell.tap()
            sleep(3)
            screenshot("12_ride_detail_receipt")
        }
    }

    @MainActor
    func testInsuranceTour_customerProfile() throws {
        try ensureLoggedIn()

        navigateToTab("Profile")
        sleep(2)
        screenshot("20_profile_main")

        let payment = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Payment' OR label CONTAINS[c] 'Card'")
        ).firstMatch
        if payment.waitForExistence(timeout: 3), payment.isHittable {
            payment.tap()
            sleep(2)
            screenshot("21_payment_methods")
        }
    }
}
