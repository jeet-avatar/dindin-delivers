import Foundation
import FirebaseFirestore
import EatFairShared
import os

private let seederLogger = Logger(subsystem: "com.dollorai.customer", category: "DatabaseSeeder")

// =============================================================================
// WARNING: This file is for DEVELOPMENT/TESTING only!
// DO NOT use in production. All functions are gated behind #if DEBUG.
// =============================================================================

/// Firebase collection names
enum FirebaseCollections {
    static let restaurants = "restaurants"
    static let menu = "menu"
    static let orders = "orders"
    static let users = "users"
    static let drivers = "drivers"
}

#if DEBUG

/// Development-only database seeder for testing purposes.
/// This class should NEVER be used in production builds.
class DatabaseSeeder {
    static let shared = DatabaseSeeder()
    private let db = Firestore.firestore()

    private init() {
        // Private initializer to ensure singleton pattern
    }

    /// Seeds real restaurant data for testing.
    /// WARNING: This will write to Firestore. Only use in development.
    func seedMenuData() {
        seederLogger.warning("Seeding database with real restaurant data...")
        seederLogger.warning("This should NEVER run in production!")

        // Real Restaurant 1: Natraj Cuisine
        let natrajCuisine = Restaurant(
            id: "2", // P2P Backend vendor ID
            name: "Natraj Cuisine",
            cuisine: "Indian",
            rating: 4.7,
            deliveryTime: "25-35 min",
            imageUrl: "",
            address: "25380 Marguerite Pkwy, Mission Viejo, CA 92692",
            latitude: 33.5958,
            longitude: -117.6590,
            phone: "949-555-1234"
        )

        saveRestaurant(natrajCuisine)

        let natrajMenu = [
            MenuItem(name: "Chicken Tikka Masala", description: "Tender chicken in rich tomato cream sauce", price: 18.99, imageUrl: "", category: "Main Course"),
            MenuItem(name: "Butter Chicken", description: "Creamy tomato-based curry with tender chicken", price: 17.99, imageUrl: "", category: "Main Course"),
            MenuItem(name: "Lamb Biryani", description: "Fragrant basmati rice with spiced lamb", price: 21.99, imageUrl: "", category: "Rice Dishes"),
            MenuItem(name: "Vegetable Samosas (2pc)", description: "Crispy pastries filled with spiced potatoes", price: 7.99, imageUrl: "", category: "Appetizers"),
            MenuItem(name: "Garlic Naan", description: "Fresh baked bread with garlic butter", price: 4.99, imageUrl: "", category: "Bread"),
            MenuItem(name: "Mango Lassi", description: "Sweet yogurt drink with mango", price: 5.99, imageUrl: "", category: "Beverages")
        ]
        uploadItems(natrajMenu, to: "2")

        // Real Restaurant 2: Tutto Fresco Kitchen & Bar
        let tuttoFresco = Restaurant(
            id: "3", // P2P Backend vendor ID
            name: "Tutto Fresco Kitchen & Bar",
            cuisine: "Italian",
            rating: 4.6,
            deliveryTime: "30-40 min",
            imageUrl: "",
            address: "22332 El Paseo, Rancho Santa Margarita, CA 92688",
            latitude: 33.6405,
            longitude: -117.5931,
            phone: "949-858-3360"
        )

        saveRestaurant(tuttoFresco)

        let tuttoMenu = [
            MenuItem(name: "Margherita Pizza", description: "Fresh mozzarella, tomatoes, basil", price: 16.99, imageUrl: "", category: "Pizza"),
            MenuItem(name: "Fettuccine Alfredo", description: "Creamy parmesan sauce with fettuccine", price: 17.99, imageUrl: "", category: "Pasta"),
            MenuItem(name: "Chicken Parmigiana", description: "Breaded chicken with marinara and cheese", price: 22.99, imageUrl: "", category: "Main Course"),
            MenuItem(name: "Bruschetta", description: "Toasted bread with tomatoes and basil", price: 9.99, imageUrl: "", category: "Appetizers"),
            MenuItem(name: "Tiramisu", description: "Classic Italian coffee dessert", price: 10.99, imageUrl: "", category: "Desserts"),
            MenuItem(name: "Italian Soda", description: "Sparkling water with flavor syrup", price: 4.99, imageUrl: "", category: "Beverages")
        ]
        uploadItems(tuttoMenu, to: "3")

        seederLogger.info("Database seeding complete with Natraj Cuisine and Tutto Fresco")
    }

    private func saveRestaurant(_ restaurant: Restaurant) {
        guard let id = restaurant.id else { return }
        do {
            try db.collection(FirebaseCollections.restaurants).document(id).setData(from: restaurant)
            seederLogger.debug("Saved restaurant: \(restaurant.name)")
        } catch {
            seederLogger.error("Error saving restaurant: \(error)")
        }
    }

    private func uploadItems(_ items: [MenuItem], to restaurantId: String) {
        let collection = db.collection(FirebaseCollections.restaurants)
            .document(restaurantId)
            .collection(FirebaseCollections.menu)

        for item in items {
            do {
                let _ = try collection.addDocument(from: item)
                seederLogger.debug("Added menu item: \(item.name)")
            } catch {
                seederLogger.error("Error adding item: \(error)")
            }
        }
    }

    /// Seeds a test order for development testing using real restaurant data.
    /// WARNING: This will write to Firestore. Only use in development.
    func seedTestOrder() {
        seederLogger.warning("Seeding test order...")
        seederLogger.warning("This should NEVER run in production!")

        let restaurantInfo = RestaurantInfo(
            id: "2",
            name: "Natraj Cuisine",
            address: "25380 Marguerite Pkwy, Mission Viejo, CA 92692",
            latitude: 33.5958,
            longitude: -117.6590,
            imageUrl: ""
        )

        let address = DeliveryAddress(
            fullAddress: "123 Main Street, Irvine, CA 92618",
            street: "123 Main Street",
            city: "Irvine",
            state: "CA",
            zipCode: "92618",
            latitude: 33.6846,
            longitude: -117.8265
        )

        let items = [
            OrderItem(menuItemId: "1", name: "Chicken Tikka Masala", price: 18.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "5", name: "Garlic Naan", price: 4.99, quantity: 2, options: nil)
        ]

        let testOrderId = "DEBUG_ORDER_\(Int(Date().timeIntervalSince1970))"

        let order = Order(
            orderId: testOrderId,
            customerId: "DEBUG_CUSTOMER",
            customerName: "Test User",
            customerEmail: "test@example.com",
            deliveryAddress: address,
            deliveryInstructions: "[DEBUG] Test order",
            restaurant: restaurantInfo,
            items: items,
            itemsCount: 3,
            subtotal: 28.97,
            deliveryFee: 5.0,
            serviceFee: 0.0,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            tax: 2.61,
            total: 36.58,
            status: OrderStatusConstants.placed,
            placedAt: Int64(Date().timeIntervalSince1970 * 1000)
        )

        do {
            try db.collection(FirebaseCollections.orders).document(order.orderId).setData(from: order)
            seederLogger.info("Seeded test order: \(testOrderId)")
        } catch {
            seederLogger.error("Error seeding order: \(error)")
        }
    }

    /// Cleans up all debug/test data from Firestore.
    /// Use this before UAT to remove any test artifacts.
    func cleanupTestData() {
        seederLogger.info("Cleaning up test data...")

        // Delete old sample restaurants (not the real ones)
        db.collection(FirebaseCollections.restaurants).document("sample_restaurant_1").delete()

        // Delete debug orders
        db.collection(FirebaseCollections.orders)
            .whereField("customerId", isEqualTo: "DEBUG_CUSTOMER")
            .getDocuments { snapshot, error in
                guard let documents = snapshot?.documents else { return }
                for doc in documents {
                    doc.reference.delete()
                    seederLogger.debug("Deleted test order: \(doc.documentID)")
                }
            }

        // Delete showcase orders
        db.collection(FirebaseCollections.orders)
            .whereField("customerId", isEqualTo: "SHOWCASE_CUSTOMER")
            .getDocuments { snapshot, error in
                guard let documents = snapshot?.documents else { return }
                for doc in documents {
                    doc.reference.delete()
                    seederLogger.debug("Deleted showcase order: \(doc.documentID)")
                }
            }

        seederLogger.info("Cleanup complete")
    }

    // MARK: - 10 Showcase Orders with Promotions

    /// Seeds 10 different order types with various promotions for front-end demonstration.
    /// All orders are DELIVERED status to show complete end-to-end journey.
    func seedShowcaseOrders() {
        seederLogger.info("Seeding 10 showcase orders with promotions...")

        let baseTime = Int64(Date().timeIntervalSince1970 * 1000)
        let oneHour: Int64 = 3600000
        let oneDay: Int64 = 86400000

        // Customer delivery address
        let customerAddress = DeliveryAddress(
            fullAddress: "456 Oak Avenue, Irvine, CA 92618",
            street: "456 Oak Avenue",
            city: "Irvine",
            state: "CA",
            zipCode: "92618",
            latitude: 33.6846,
            longitude: -117.8265
        )

        // Restaurant 1: Natraj Cuisine (Indian)
        let natrajInfo = RestaurantInfo(
            id: "2",
            name: "Natraj Cuisine",
            address: "25380 Marguerite Pkwy, Mission Viejo, CA 92692",
            latitude: 33.5958,
            longitude: -117.6590,
            imageUrl: ""
        )

        // Restaurant 2: Tutto Fresco (Italian)
        let tuttoInfo = RestaurantInfo(
            id: "3",
            name: "Tutto Fresco Kitchen & Bar",
            address: "22332 El Paseo, Rancho Santa Margarita, CA 92688",
            latitude: 33.6405,
            longitude: -117.5931,
            imageUrl: ""
        )

        // ===== ORDER 1: Standard Order - No Promotion =====
        let order1Items = [
            OrderItem(menuItemId: "101", name: "Chicken Tikka Masala", price: 18.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "105", name: "Garlic Naan", price: 4.99, quantity: 2, options: nil)
        ]
        let order1 = Order(
            orderId: "EF-20241213-001-STANDARD",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "John Smith",
            customerPhone: "949-555-0101",
            customerEmail: "john.smith@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Leave at door, ring bell",
            restaurant: natrajInfo,
            items: order1Items,
            itemsCount: 3,
            subtotal: 28.97,
            deliveryFee: 4.99,
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 1.0,
            promotionCode: nil,
            discount: 0.0,
            discountType: nil,
            tax: 2.61,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 5.00,
            tipPercentage: 15.0,
            total: 43.56,
            status: "delivered",
            placedAt: baseTime - (oneDay * 7),
            acceptedAt: baseTime - (oneDay * 7) + (5 * 60000),
            preparedAt: baseTime - (oneDay * 7) + (20 * 60000),
            pickedUpAt: baseTime - (oneDay * 7) + (25 * 60000),
            deliveredAt: baseTime - (oneDay * 7) + (45 * 60000),
            driverId: "driver_001",
            driverName: "Mike Johnson",
            driverPhone: "949-555-1001",
            driverRating: 4.9,
            isRated: true,
            isTipped: true
        )
        saveOrder(order1)

        // ===== ORDER 2: 20% Off Promotion (SAVE20) =====
        let order2Items = [
            OrderItem(menuItemId: "201", name: "Margherita Pizza", price: 16.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "202", name: "Fettuccine Alfredo", price: 17.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "205", name: "Tiramisu", price: 10.99, quantity: 1, options: nil)
        ]
        let order2Subtotal = 45.97
        let order2Discount = order2Subtotal * 0.20 // 20% off = $9.19
        let order2 = Order(
            orderId: "EF-20241213-002-PERCENT20",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Sarah Wilson",
            customerPhone: "949-555-0102",
            customerEmail: "sarah.wilson@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Call upon arrival",
            restaurant: tuttoInfo,
            items: order2Items,
            itemsCount: 3,
            subtotal: order2Subtotal,
            deliveryFee: 0.0, // Free delivery over $35
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 2.0,
            promotionCode: "SAVE20",
            discount: order2Discount,
            discountType: "percentage",
            tax: (order2Subtotal - order2Discount) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 8.00,
            tipPercentage: 20.0,
            total: (order2Subtotal - order2Discount) + 0.99 + 2.0 + ((order2Subtotal - order2Discount) * 0.0875) + 8.00,
            status: "delivered",
            placedAt: baseTime - (oneDay * 6),
            acceptedAt: baseTime - (oneDay * 6) + (3 * 60000),
            preparedAt: baseTime - (oneDay * 6) + (25 * 60000),
            pickedUpAt: baseTime - (oneDay * 6) + (30 * 60000),
            deliveredAt: baseTime - (oneDay * 6) + (50 * 60000),
            driverId: "driver_002",
            driverName: "Emily Chen",
            driverPhone: "949-555-1002",
            driverRating: 4.8,
            isRated: true,
            isTipped: true
        )
        saveOrder(order2)

        // ===== ORDER 3: $5 Off Fixed Discount (FLAT5) =====
        let order3Items = [
            OrderItem(menuItemId: "102", name: "Butter Chicken", price: 17.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "103", name: "Lamb Biryani", price: 21.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "106", name: "Mango Lassi", price: 5.99, quantity: 2, options: nil)
        ]
        let order3Subtotal = 51.96
        let order3 = Order(
            orderId: "EF-20241213-003-FLAT5OFF",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "David Lee",
            customerPhone: "949-555-0103",
            customerEmail: "david.lee@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Apartment 204, use side entrance",
            restaurant: natrajInfo,
            items: order3Items,
            itemsCount: 4,
            subtotal: order3Subtotal,
            deliveryFee: 0.0,
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 2.0,
            promotionCode: "FLAT5",
            discount: 5.0,
            discountType: "fixed",
            tax: (order3Subtotal - 5.0) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 10.00,
            tipPercentage: 20.0,
            total: (order3Subtotal - 5.0) + 0.99 + 2.0 + ((order3Subtotal - 5.0) * 0.0875) + 10.00,
            status: "delivered",
            placedAt: baseTime - (oneDay * 5),
            acceptedAt: baseTime - (oneDay * 5) + (4 * 60000),
            preparedAt: baseTime - (oneDay * 5) + (22 * 60000),
            pickedUpAt: baseTime - (oneDay * 5) + (28 * 60000),
            deliveredAt: baseTime - (oneDay * 5) + (48 * 60000),
            driverId: "driver_003",
            driverName: "Alex Rivera",
            driverPhone: "949-555-1003",
            driverRating: 5.0,
            isRated: true,
            isTipped: true
        )
        saveOrder(order3)

        // ===== ORDER 4: Free Delivery Promotion (FREEDELIVERY) =====
        let order4Items = [
            OrderItem(menuItemId: "201", name: "Margherita Pizza", price: 16.99, quantity: 2, options: nil),
            OrderItem(menuItemId: "204", name: "Bruschetta", price: 9.99, quantity: 1, options: nil)
        ]
        let order4Subtotal = 43.97
        let order4 = Order(
            orderId: "EF-20241213-004-FREEDEL",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Maria Garcia",
            customerPhone: "949-555-0104",
            customerEmail: "maria.garcia@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "House with blue door",
            restaurant: tuttoInfo,
            items: order4Items,
            itemsCount: 3,
            subtotal: order4Subtotal,
            deliveryFee: 0.0, // Promo: Free delivery
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 2.0,
            promotionCode: "FREEDELIVERY",
            discount: 4.99, // Delivery fee waived
            discountType: "delivery",
            tax: order4Subtotal * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 7.00,
            tipPercentage: 15.0,
            total: order4Subtotal + 0.99 + 2.0 + (order4Subtotal * 0.0875) + 7.00,
            status: "delivered",
            placedAt: baseTime - (oneDay * 4),
            acceptedAt: baseTime - (oneDay * 4) + (2 * 60000),
            preparedAt: baseTime - (oneDay * 4) + (18 * 60000),
            pickedUpAt: baseTime - (oneDay * 4) + (22 * 60000),
            deliveredAt: baseTime - (oneDay * 4) + (40 * 60000),
            driverId: "driver_001",
            driverName: "Mike Johnson",
            driverPhone: "949-555-1001",
            driverRating: 4.9,
            isRated: true,
            isTipped: true
        )
        saveOrder(order4)

        // ===== ORDER 5: First Order 15% Off (WELCOME15) =====
        let order5Items = [
            OrderItem(menuItemId: "101", name: "Chicken Tikka Masala", price: 18.99, quantity: 2, options: nil),
            OrderItem(menuItemId: "104", name: "Vegetable Samosas (2pc)", price: 7.99, quantity: 2, options: nil),
            OrderItem(menuItemId: "105", name: "Garlic Naan", price: 4.99, quantity: 3, options: nil)
        ]
        let order5Subtotal = 68.93
        let order5Discount = order5Subtotal * 0.15
        let order5 = Order(
            orderId: "EF-20241213-005-WELCOME15",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "James Brown",
            customerPhone: "949-555-0105",
            customerEmail: "james.brown@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Office building, ask for James at reception",
            restaurant: natrajInfo,
            items: order5Items,
            itemsCount: 7,
            subtotal: order5Subtotal,
            deliveryFee: 0.0,
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 2.0,
            promotionCode: "WELCOME15",
            discount: order5Discount,
            discountType: "percentage",
            tax: (order5Subtotal - order5Discount) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 12.00,
            tipPercentage: 20.0,
            total: (order5Subtotal - order5Discount) + 0.99 + 2.0 + ((order5Subtotal - order5Discount) * 0.0875) + 12.00,
            status: "delivered",
            placedAt: baseTime - (oneDay * 3),
            acceptedAt: baseTime - (oneDay * 3) + (5 * 60000),
            preparedAt: baseTime - (oneDay * 3) + (30 * 60000),
            pickedUpAt: baseTime - (oneDay * 3) + (35 * 60000),
            deliveredAt: baseTime - (oneDay * 3) + (55 * 60000),
            driverId: "driver_004",
            driverName: "Jessica Park",
            driverPhone: "949-555-1004",
            driverRating: 4.7,
            isRated: true,
            isTipped: true
        )
        saveOrder(order5)

        // ===== ORDER 6: Large Order - $3 Platform Fee Tier (BIGORDER10) =====
        let order6Items = [
            OrderItem(menuItemId: "203", name: "Chicken Parmigiana", price: 22.99, quantity: 3, options: nil),
            OrderItem(menuItemId: "202", name: "Fettuccine Alfredo", price: 17.99, quantity: 2, options: nil),
            OrderItem(menuItemId: "201", name: "Margherita Pizza", price: 16.99, quantity: 2, options: nil),
            OrderItem(menuItemId: "205", name: "Tiramisu", price: 10.99, quantity: 4, options: nil)
        ]
        let order6Subtotal = 182.89 // Large order over $70
        let order6Discount = order6Subtotal * 0.10 // 10% off large orders
        let order6 = Order(
            orderId: "EF-20241213-006-BIGORDER",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Corporate Event - TechCorp",
            customerPhone: "949-555-0106",
            customerEmail: "events@techcorp.example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Conference room B, 3rd floor. Call when arriving.",
            restaurant: tuttoInfo,
            items: order6Items,
            itemsCount: 11,
            subtotal: order6Subtotal,
            deliveryFee: 0.0,
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 3.0, // Highest tier for orders > $70
            promotionCode: "BIGORDER10",
            discount: order6Discount,
            discountType: "percentage",
            tax: (order6Subtotal - order6Discount) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 30.00,
            tipPercentage: 18.0,
            total: (order6Subtotal - order6Discount) + 0.99 + 3.0 + ((order6Subtotal - order6Discount) * 0.0875) + 30.00,
            status: "delivered",
            placedAt: baseTime - (oneDay * 2),
            acceptedAt: baseTime - (oneDay * 2) + (3 * 60000),
            preparedAt: baseTime - (oneDay * 2) + (40 * 60000),
            pickedUpAt: baseTime - (oneDay * 2) + (45 * 60000),
            deliveredAt: baseTime - (oneDay * 2) + (65 * 60000),
            driverId: "driver_005",
            driverName: "Chris Taylor",
            driverPhone: "949-555-1005",
            driverRating: 4.8,
            isRated: true,
            isTipped: true
        )
        saveOrder(order6)

        // ===== ORDER 7: Priority Delivery + 5% Off (PRIORITY5) =====
        let order7Items = [
            OrderItem(menuItemId: "103", name: "Lamb Biryani", price: 21.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "101", name: "Chicken Tikka Masala", price: 18.99, quantity: 1, options: nil)
        ]
        let order7Subtotal = 40.98
        let order7Discount = order7Subtotal * 0.05
        let order7 = Order(
            orderId: "EF-20241213-007-PRIORITY",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Amanda White",
            customerPhone: "949-555-0107",
            customerEmail: "amanda.white@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "URGENT: Need by 7pm for dinner party!",
            restaurant: natrajInfo,
            items: order7Items,
            itemsCount: 2,
            subtotal: order7Subtotal,
            deliveryFee: 0.0,
            serviceFee: 0.99,
            priorityFee: 2.99, // Priority delivery fee
            smallOrderFee: 0.0,
            platformFee: 2.0,
            promotionCode: "PRIORITY5",
            discount: order7Discount,
            discountType: "percentage",
            tax: (order7Subtotal - order7Discount) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 10.00,
            tipPercentage: 25.0,
            total: (order7Subtotal - order7Discount) + 0.99 + 2.99 + 2.0 + ((order7Subtotal - order7Discount) * 0.0875) + 10.00,
            status: "delivered",
            placedAt: baseTime - oneDay,
            acceptedAt: baseTime - oneDay + (2 * 60000),
            preparedAt: baseTime - oneDay + (15 * 60000),
            pickedUpAt: baseTime - oneDay + (18 * 60000),
            deliveredAt: baseTime - oneDay + (30 * 60000), // Fast delivery!
            driverId: "driver_002",
            driverName: "Emily Chen",
            driverPhone: "949-555-1002",
            driverRating: 4.8,
            isRated: true,
            isTipped: true
        )
        saveOrder(order7)

        // ===== ORDER 8: Weekend Special 25% Off (WEEKEND25) =====
        let order8Items = [
            OrderItem(menuItemId: "201", name: "Margherita Pizza", price: 16.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "203", name: "Chicken Parmigiana", price: 22.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "204", name: "Bruschetta", price: 9.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "206", name: "Italian Soda", price: 4.99, quantity: 2, options: nil)
        ]
        let order8Subtotal = 59.95
        let order8Discount = min(order8Subtotal * 0.25, 15.0) // 25% off, max $15
        let order8 = Order(
            orderId: "EF-20241213-008-WEEKEND",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Robert Miller",
            customerPhone: "949-555-0108",
            customerEmail: "robert.miller@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Backyard BBQ party - come to side gate",
            restaurant: tuttoInfo,
            items: order8Items,
            itemsCount: 5,
            subtotal: order8Subtotal,
            deliveryFee: 0.0,
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 2.0,
            promotionCode: "WEEKEND25",
            discount: order8Discount,
            discountType: "percentage",
            tax: (order8Subtotal - order8Discount) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 12.00,
            tipPercentage: 20.0,
            total: (order8Subtotal - order8Discount) + 0.99 + 2.0 + ((order8Subtotal - order8Discount) * 0.0875) + 12.00,
            status: "delivered",
            placedAt: baseTime - (oneHour * 12),
            acceptedAt: baseTime - (oneHour * 12) + (4 * 60000),
            preparedAt: baseTime - (oneHour * 12) + (25 * 60000),
            pickedUpAt: baseTime - (oneHour * 12) + (30 * 60000),
            deliveredAt: baseTime - (oneHour * 12) + (50 * 60000),
            driverId: "driver_003",
            driverName: "Alex Rivera",
            driverPhone: "949-555-1003",
            driverRating: 5.0,
            isRated: true,
            isTipped: true
        )
        saveOrder(order8)

        // ===== ORDER 9: Loyalty Reward $10 Credit (LOYAL10) =====
        let order9Items = [
            OrderItem(menuItemId: "102", name: "Butter Chicken", price: 17.99, quantity: 1, options: nil),
            OrderItem(menuItemId: "105", name: "Garlic Naan", price: 4.99, quantity: 2, options: nil),
            OrderItem(menuItemId: "106", name: "Mango Lassi", price: 5.99, quantity: 1, options: nil)
        ]
        let order9Subtotal = 33.96
        let order9 = Order(
            orderId: "EF-20241213-009-LOYALTY",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Jennifer Davis",
            customerPhone: "949-555-0109",
            customerEmail: "jennifer.davis@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Ring doorbell twice",
            restaurant: natrajInfo,
            items: order9Items,
            itemsCount: 4,
            subtotal: order9Subtotal,
            deliveryFee: 4.99, // Under $35 threshold
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 1.0,
            promotionCode: "LOYAL10",
            discount: 10.0, // $10 loyalty credit
            discountType: "fixed",
            tax: (order9Subtotal - 10.0) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 6.00,
            tipPercentage: 20.0,
            total: (order9Subtotal - 10.0) + 4.99 + 0.99 + 1.0 + ((order9Subtotal - 10.0) * 0.0875) + 6.00,
            status: "delivered",
            placedAt: baseTime - (oneHour * 6),
            acceptedAt: baseTime - (oneHour * 6) + (3 * 60000),
            preparedAt: baseTime - (oneHour * 6) + (20 * 60000),
            pickedUpAt: baseTime - (oneHour * 6) + (25 * 60000),
            deliveredAt: baseTime - (oneHour * 6) + (45 * 60000),
            driverId: "driver_004",
            driverName: "Jessica Park",
            driverPhone: "949-555-1004",
            driverRating: 4.7,
            isRated: true,
            isTipped: true
        )
        saveOrder(order9)

        // ===== ORDER 10: Buy One Get One Free (BOGO) =====
        let order10Items = [
            OrderItem(menuItemId: "201", name: "Margherita Pizza", price: 16.99, quantity: 2, options: ["BOGO: 2nd pizza FREE"]),
            OrderItem(menuItemId: "206", name: "Italian Soda", price: 4.99, quantity: 2, options: nil)
        ]
        let order10Subtotal = 43.96
        let order10Discount = 16.99 // One pizza free
        let order10 = Order(
            orderId: "EF-20241213-010-BOGO",
            customerId: "SHOWCASE_CUSTOMER",
            customerName: "Kevin Thompson",
            customerPhone: "949-555-0110",
            customerEmail: "kevin.thompson@example.com",
            deliveryAddress: customerAddress,
            deliveryInstructions: "Gate code: 1234",
            restaurant: tuttoInfo,
            items: order10Items,
            itemsCount: 4,
            subtotal: order10Subtotal,
            deliveryFee: 0.0,
            serviceFee: 0.99,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            platformFee: 1.0,
            promotionCode: "BOGO",
            discount: order10Discount,
            discountType: "item",
            tax: (order10Subtotal - order10Discount) * 0.0875,
            taxRate: 0.0875,
            taxState: "CA",
            tip: 5.00,
            tipPercentage: 15.0,
            total: (order10Subtotal - order10Discount) + 0.99 + 1.0 + ((order10Subtotal - order10Discount) * 0.0875) + 5.00,
            status: "delivered",
            placedAt: baseTime - (oneHour * 2),
            acceptedAt: baseTime - (oneHour * 2) + (2 * 60000),
            preparedAt: baseTime - (oneHour * 2) + (18 * 60000),
            pickedUpAt: baseTime - (oneHour * 2) + (22 * 60000),
            deliveredAt: baseTime - (oneHour * 2) + (42 * 60000),
            driverId: "driver_001",
            driverName: "Mike Johnson",
            driverPhone: "949-555-1001",
            driverRating: 4.9,
            isRated: true,
            isTipped: true
        )
        saveOrder(order10)

        // Seed corresponding promotions
        seedShowcasePromotions()

        seederLogger.info("Seeded 10 showcase orders with various promotions")
    }

    /// Seeds the promotions used by showcase orders
    private func seedShowcasePromotions() {
        let promotions: [[String: Any]] = [
            [
                "id": "promo_save20",
                "restaurantId": "3",
                "code": "SAVE20",
                "title": "20% Off Your Order",
                "description": "Save 20% on your entire order at Tutto Fresco",
                "discountType": "percentage",
                "discountValue": 20.0,
                "minimumOrder": 25.0,
                "isActive": true,
                "usageCount": 156
            ],
            [
                "id": "promo_flat5",
                "restaurantId": "2",
                "code": "FLAT5",
                "title": "$5 Off Any Order",
                "description": "Get $5 off any order at Natraj Cuisine",
                "discountType": "fixed",
                "discountValue": 5.0,
                "minimumOrder": 20.0,
                "isActive": true,
                "usageCount": 89
            ],
            [
                "id": "promo_freedel",
                "restaurantId": "3",
                "code": "FREEDELIVERY",
                "title": "Free Delivery",
                "description": "Free delivery on your next order",
                "discountType": "delivery",
                "discountValue": 4.99,
                "minimumOrder": 15.0,
                "isActive": true,
                "usageCount": 234
            ],
            [
                "id": "promo_welcome",
                "restaurantId": "2",
                "code": "WELCOME15",
                "title": "Welcome! 15% Off First Order",
                "description": "New customer special - 15% off your first order",
                "discountType": "percentage",
                "discountValue": 15.0,
                "minimumOrder": 0.0,
                "maxUsagePerUser": 1,
                "isActive": true,
                "usageCount": 412
            ],
            [
                "id": "promo_bigorder",
                "restaurantId": "3",
                "code": "BIGORDER10",
                "title": "10% Off Large Orders",
                "description": "Save 10% on orders over $100",
                "discountType": "percentage",
                "discountValue": 10.0,
                "minimumOrder": 100.0,
                "isActive": true,
                "usageCount": 67
            ],
            [
                "id": "promo_priority",
                "restaurantId": "2",
                "code": "PRIORITY5",
                "title": "5% Off Priority Orders",
                "description": "Get 5% off when you choose priority delivery",
                "discountType": "percentage",
                "discountValue": 5.0,
                "minimumOrder": 30.0,
                "isActive": true,
                "usageCount": 45
            ],
            [
                "id": "promo_weekend",
                "restaurantId": "3",
                "code": "WEEKEND25",
                "title": "Weekend Special - 25% Off",
                "description": "25% off this weekend only (max $15)",
                "discountType": "percentage",
                "discountValue": 25.0,
                "maxDiscount": 15.0,
                "minimumOrder": 35.0,
                "isActive": true,
                "usageCount": 178
            ],
            [
                "id": "promo_loyalty",
                "restaurantId": "2",
                "code": "LOYAL10",
                "title": "$10 Loyalty Reward",
                "description": "Thank you for being a loyal customer! Enjoy $10 off",
                "discountType": "fixed",
                "discountValue": 10.0,
                "minimumOrder": 25.0,
                "isActive": true,
                "usageCount": 523
            ],
            [
                "id": "promo_bogo",
                "restaurantId": "3",
                "code": "BOGO",
                "title": "Buy One Get One Free Pizza",
                "description": "Order any pizza, get the second one FREE!",
                "discountType": "item",
                "discountValue": 16.99,
                "minimumOrder": 16.99,
                "isActive": true,
                "usageCount": 301
            ]
        ]

        for promo in promotions {
            guard let id = promo["id"] as? String else { continue }
            db.collection("promotions").document(id).setData(promo) { error in
                if let error = error {
                    seederLogger.error("Error saving promotion: \(error)")
                } else {
                    seederLogger.debug("Saved promotion: \(promo["code"] ?? "")")
                }
            }
        }
    }

    private func saveOrder(_ order: Order) {
        do {
            try db.collection(FirebaseCollections.orders).document(order.orderId).setData(from: order)
            seederLogger.debug("Saved order: \(order.orderId) - \(order.promotionCode ?? "No promo")")
        } catch {
            seederLogger.error("Error saving order: \(error)")
        }
    }
}

#else

/// Stub class for release builds - does nothing
class DatabaseSeeder {
    static let shared = DatabaseSeeder()
    private init() {}

    func seedMenuData() {
        // No-op in release builds
        assertionFailure("DatabaseSeeder should never be called in release builds")
    }

    func seedTestOrder() {
        // No-op in release builds
        assertionFailure("DatabaseSeeder should never be called in release builds")
    }

    func seedShowcaseOrders() {
        // No-op in release builds
        assertionFailure("DatabaseSeeder should never be called in release builds")
    }

    func cleanupTestData() {
        // No-op in release builds
    }
}

#endif
