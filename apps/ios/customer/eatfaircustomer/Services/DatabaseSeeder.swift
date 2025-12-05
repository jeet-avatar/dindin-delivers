import Foundation
import FirebaseFirestore
import EatFairShared

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
        print("⚠️ [DEBUG] Seeding database with real restaurant data...")
        print("⚠️ [DEBUG] This should NEVER run in production!")

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

        print("✅ [DEBUG] Database seeding complete with Natraj Cuisine and Tutto Fresco")
    }

    private func saveRestaurant(_ restaurant: Restaurant) {
        guard let id = restaurant.id else { return }
        do {
            try db.collection(FirebaseCollections.restaurants).document(id).setData(from: restaurant)
            print("[DEBUG] Saved restaurant: \(restaurant.name)")
        } catch {
            print("[DEBUG] Error saving restaurant: \(error)")
        }
    }

    private func uploadItems(_ items: [MenuItem], to restaurantId: String) {
        let collection = db.collection(FirebaseCollections.restaurants)
            .document(restaurantId)
            .collection(FirebaseCollections.menu)

        for item in items {
            do {
                let _ = try collection.addDocument(from: item)
                print("[DEBUG] Added menu item: \(item.name)")
            } catch {
                print("[DEBUG] Error adding item: \(error)")
            }
        }
    }

    /// Seeds a test order for development testing using real restaurant data.
    /// WARNING: This will write to Firestore. Only use in development.
    func seedTestOrder() {
        print("⚠️ [DEBUG] Seeding test order...")
        print("⚠️ [DEBUG] This should NEVER run in production!")

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
            print("✅ [DEBUG] Seeded test order: \(testOrderId)")
        } catch {
            print("[DEBUG] Error seeding order: \(error)")
        }
    }

    /// Cleans up all debug/test data from Firestore.
    /// Use this before UAT to remove any test artifacts.
    func cleanupTestData() {
        print("🧹 [DEBUG] Cleaning up test data...")

        // Delete old sample restaurants (not the real ones)
        db.collection(FirebaseCollections.restaurants).document("sample_restaurant_1").delete()

        // Delete debug orders
        db.collection(FirebaseCollections.orders)
            .whereField("customerId", isEqualTo: "DEBUG_CUSTOMER")
            .getDocuments { snapshot, error in
                guard let documents = snapshot?.documents else { return }
                for doc in documents {
                    doc.reference.delete()
                    print("[DEBUG] Deleted test order: \(doc.documentID)")
                }
            }

        print("✅ [DEBUG] Cleanup complete")
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

    func cleanupTestData() {
        // No-op in release builds
    }
}

#endif
