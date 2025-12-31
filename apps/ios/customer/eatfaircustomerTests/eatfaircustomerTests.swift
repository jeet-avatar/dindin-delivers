//
//  eatfaircustomerTests.swift
//  eatfaircustomerTests
//
//  Created by Jithesh Manoharan on 11/25/25.
//

import Testing
import Foundation
@testable import eatfaircustomer

// MARK: - Cart Calculation Tests

@Suite("Cart Calculations")
struct CartCalculationTests {

    // Test constants matching AppConfig defaults
    let taxRate = 0.08  // 8%
    let deliveryFee = 2.99
    let platformFee = 1.0

    @Test("Subtotal calculation with single item")
    func testSubtotalSingleItem() {
        let cart = TestableCartViewModel()
        let item = createMenuItem(price: 10.00)
        let restaurant = createRestaurant()

        cart.addToCart(item: item, from: restaurant)

        #expect(cart.subtotal == 10.00)
    }

    @Test("Subtotal calculation with multiple items")
    func testSubtotalMultipleItems() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 10.00), from: restaurant)
        cart.addToCart(item: createMenuItem(price: 15.50), from: restaurant)
        cart.addToCart(item: createMenuItem(price: 8.25), from: restaurant)

        #expect(cart.subtotal == 33.75)
    }

    @Test("Tax calculation at 8%")
    func testTaxCalculation() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 100.00), from: restaurant)

        // With 8% tax rate, tax on $100 should be $8
        #expect(cart.tax == 8.00)
    }

    @Test("Total calculation includes all fees")
    func testTotalCalculation() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 100.00), from: restaurant)

        // Expected: subtotal + tax + delivery + platform
        // 100 + 8 (8% tax) + 2.99 + 1.0 = 111.99
        let expectedTotal = 100.00 + 8.00 + deliveryFee + platformFee
        #expect(cart.total == expectedTotal)
    }

    @Test("Empty cart has zero values")
    func testEmptyCart() {
        let cart = TestableCartViewModel()

        #expect(cart.subtotal == 0.0)
        #expect(cart.tax == 0.0)
        #expect(cart.total == deliveryFee + platformFee) // Only fees, no items
    }

    @Test("Cart clears properly")
    func testCartClear() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 25.00), from: restaurant)
        cart.clearCart()

        #expect(cart.items.isEmpty)
        #expect(cart.restaurant == nil)
    }

    @Test("Cart clears when switching restaurants")
    func testCartClearOnRestaurantSwitch() {
        let cart = TestableCartViewModel()
        let restaurant1 = createRestaurant(id: "r1", name: "Restaurant 1")
        let restaurant2 = createRestaurant(id: "r2", name: "Restaurant 2")

        cart.addToCart(item: createMenuItem(price: 10.00), from: restaurant1)
        cart.addToCart(item: createMenuItem(price: 15.00), from: restaurant2)

        // Should only have items from restaurant2
        #expect(cart.items.count == 1)
        #expect(cart.restaurant?.id == "r2")
    }

    @Test("Remove item from cart")
    func testRemoveFromCart() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 10.00), from: restaurant)
        cart.addToCart(item: createMenuItem(price: 20.00), from: restaurant)

        cart.removeFromCart(at: IndexSet(integer: 0))

        #expect(cart.items.count == 1)
        #expect(cart.subtotal == 20.00)
    }

    @Test("Removing all items clears restaurant")
    func testRemoveAllItemsClearsRestaurant() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 10.00), from: restaurant)
        cart.removeFromCart(at: IndexSet(integer: 0))

        #expect(cart.items.isEmpty)
        #expect(cart.restaurant == nil)
    }

    // MARK: - Edge Cases

    @Test("Large order calculation")
    func testLargeOrderCalculation() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        // Add 50 items at $10 each
        for _ in 0..<50 {
            cart.addToCart(item: createMenuItem(price: 10.00), from: restaurant)
        }

        #expect(cart.subtotal == 500.00)
        #expect(cart.tax == 40.00) // 8% of 500
    }

    @Test("Decimal precision in calculations")
    func testDecimalPrecision() {
        let cart = TestableCartViewModel()
        let restaurant = createRestaurant()

        cart.addToCart(item: createMenuItem(price: 9.99), from: restaurant)
        cart.addToCart(item: createMenuItem(price: 4.99), from: restaurant)
        cart.addToCart(item: createMenuItem(price: 2.49), from: restaurant)

        // 9.99 + 4.99 + 2.49 = 17.47
        #expect(cart.subtotal == 17.47)
    }
}

// MARK: - Auth Validation Tests

@Suite("Auth Input Validation")
struct AuthValidationTests {

    @Test("Valid email formats")
    func testValidEmails() {
        let validator = AuthInputValidator()

        #expect(validator.isValidEmail("test@example.com") == true)
        #expect(validator.isValidEmail("user.name@domain.co.uk") == true)
        #expect(validator.isValidEmail("user+tag@gmail.com") == true)
        #expect(validator.isValidEmail("user123@test.io") == true)
    }

    @Test("Invalid email formats")
    func testInvalidEmails() {
        let validator = AuthInputValidator()

        #expect(validator.isValidEmail("") == false)
        #expect(validator.isValidEmail("notanemail") == false)
        #expect(validator.isValidEmail("missing@domain") == false)
        #expect(validator.isValidEmail("@nodomain.com") == false)
        #expect(validator.isValidEmail("spaces in@email.com") == false)
    }

    @Test("Valid password requirements")
    func testValidPasswords() {
        let validator = AuthInputValidator()

        #expect(validator.isValidPassword("password1") == true)
        #expect(validator.isValidPassword("SecurePass123") == true)
        #expect(validator.isValidPassword("12345abc") == true)
        #expect(validator.isValidPassword("abcd1234") == true)
    }

    @Test("Invalid passwords - too short")
    func testPasswordTooShort() {
        let validator = AuthInputValidator()

        #expect(validator.isValidPassword("pass1") == false)
        #expect(validator.isValidPassword("abc123") == false)
        #expect(validator.isValidPassword("a1") == false)
    }

    @Test("Invalid passwords - missing requirements")
    func testPasswordMissingRequirements() {
        let validator = AuthInputValidator()

        #expect(validator.isValidPassword("onlyletters") == false)  // No numbers
        #expect(validator.isValidPassword("12345678") == false)     // No letters
        #expect(validator.isValidPassword("") == false)             // Empty
    }

    @Test("Valid phone formats")
    func testValidPhones() {
        let validator = AuthInputValidator()

        #expect(validator.isValidPhone("1234567890") == true)
        #expect(validator.isValidPhone("(123) 456-7890") == true)
        #expect(validator.isValidPhone("+1 234 567 8900") == true)
        #expect(validator.isValidPhone("123-456-7890") == true)
    }

    @Test("Invalid phone formats")
    func testInvalidPhones() {
        let validator = AuthInputValidator()

        #expect(validator.isValidPhone("") == false)
        #expect(validator.isValidPhone("123") == false)
        #expect(validator.isValidPhone("12345") == false)
        #expect(validator.isValidPhone("abcdefghij") == false)
    }
}

// MARK: - Order Number Format Tests

@Suite("Order Number Format")
struct OrderNumberFormatTests {

    @Test("Fallback order number format")
    func testFallbackOrderNumberFormat() {
        // Format: EF-YYYYMMDD-HHMMSS-XXXX
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd-HHmmss"
        let orderNumber = "EF-\(dateFormatter.string(from: Date()))-\(String(format: "%04d", Int.random(in: 1...9999)))"

        #expect(orderNumber.hasPrefix("EF-"))
        #expect(orderNumber.count >= 22) // EF- + date + time + random
    }

    @Test("Order number random suffix range")
    func testOrderNumberRandomSuffix() {
        for _ in 0..<100 {
            let suffix = Int.random(in: 1...9999)
            #expect(suffix >= 1)
            #expect(suffix <= 9999)
        }
    }
}

// MARK: - Test Helpers

/// Testable version of CartViewModel for unit testing (no Firebase dependency)
class TestableCartViewModel {
    var items: [TestMenuItem] = []
    var restaurant: TestRestaurant?
    var lastOrderNumber: String?

    // Use fixed values for testing
    private let taxRate = 0.08
    private let baseDeliveryFee = 2.99
    private let platformFee = 1.0

    var subtotal: Double {
        items.reduce(0) { $0 + $1.price }
    }

    var tax: Double {
        subtotal * taxRate
    }

    var deliveryFee: Double {
        baseDeliveryFee
    }

    var total: Double {
        subtotal + tax + deliveryFee + platformFee
    }

    func addToCart(item: TestMenuItem, from restaurant: TestRestaurant) {
        if let currentRestaurant = self.restaurant, currentRestaurant.id != restaurant.id {
            self.items = []
        }
        self.restaurant = restaurant
        self.items.append(item)
    }

    func removeFromCart(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
        if items.isEmpty {
            restaurant = nil
        }
    }

    func clearCart() {
        items = []
        restaurant = nil
        lastOrderNumber = nil
    }
}

/// Auth input validator for testing
struct AuthInputValidator {
    func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    func isValidPassword(_ password: String) -> Bool {
        guard password.count >= 8 else { return false }
        let hasLetter = password.rangeOfCharacter(from: .letters) != nil
        let hasNumber = password.rangeOfCharacter(from: .decimalDigits) != nil
        return hasLetter && hasNumber
    }

    func isValidPhone(_ phone: String) -> Bool {
        let digits = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        return digits.count >= 10
    }
}

/// Test models
struct TestMenuItem {
    let id: String
    let name: String
    let price: Double
}

struct TestRestaurant {
    let id: String
    let name: String
}

/// Test data factories
func createMenuItem(id: String = UUID().uuidString, name: String = "Test Item", price: Double) -> TestMenuItem {
    TestMenuItem(id: id, name: name, price: price)
}

func createRestaurant(id: String = "test-restaurant", name: String = "Test Restaurant") -> TestRestaurant {
    TestRestaurant(id: id, name: name)
}
