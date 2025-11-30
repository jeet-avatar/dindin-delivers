import Foundation
import FirebaseFirestore
import EatFairShared

// =============================================================================
// WARNING: This file is for DEVELOPMENT/TESTING only!
// DO NOT use in production. All functions are gated behind #if DEBUG.
// =============================================================================

#if DEBUG

/// Development-only database seeder for testing purposes.
/// This class should NEVER be used in production builds.
class DatabaseSeeder {
    static let shared = DatabaseSeeder()
    private let db = Firestore.firestore()

    private init() {
        // Private initializer to ensure singleton pattern
    }

    /// Seeds sample restaurant and menu data for testing.
    /// WARNING: This will write to Firestore. Only use in development.
    func seedMenuData() {
        print("⚠️ [DEBUG] Seeding database with test data...")
        print("⚠️ [DEBUG] This should NEVER run in production!")

        // Sample Restaurant 1
        let sampleRestaurant1 = Restaurant(
            id: "sample_restaurant_1",
            name: "Sample Indian Kitchen",
            cuisine: "Indian",
            rating: 4.5,
            deliveryTime: "25-35 min",
            imageUrl: "",
            address: "123 Test Street, Test City, CA 90210",
            latitude: 34.0522,
            longitude: -118.2437,
            phone: "555-000-0001"
        )

        saveRestaurant(sampleRestaurant1)

        let sampleItems1 = [
            MenuItem(name: "Sample Naan", description: "Sample bread item", price: 5.0, imageUrl: "", category: "Breads"),
            MenuItem(name: "Sample Curry", description: "Sample curry dish", price: 18.0, imageUrl: "", category: "Main Course"),
            MenuItem(name: "Sample Rice", description: "Sample rice dish", price: 6.0, imageUrl: "", category: "Rice")
        ]
        uploadItems(sampleItems1, to: "sample_restaurant_1")

        print("✅ [DEBUG] Database seeding complete")
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

    /// Seeds a test order for development testing.
    /// WARNING: This will write to Firestore. Only use in development.
    func seedTestOrder() {
        print("⚠️ [DEBUG] Seeding test order...")
        print("⚠️ [DEBUG] This should NEVER run in production!")

        let restaurantInfo = RestaurantInfo(
            id: "sample_restaurant_1",
            name: "Sample Indian Kitchen",
            address: "123 Test Street, Test City, CA 90210",
            latitude: 34.0522,
            longitude: -118.2437,
            imageUrl: ""
        )

        let address = DeliveryAddress(
            fullAddress: "456 Customer Ave, Test City, CA 90210",
            street: "456 Customer Ave",
            city: "Test City",
            state: "CA",
            zipCode: "90210",
            latitude: 34.0525,
            longitude: -118.2440
        )

        let items = [
            OrderItem(menuItemId: "sample_1", name: "Sample Naan", price: 5.0, quantity: 2, options: nil)
        ]

        let testOrderId = "DEBUG_ORDER_\(Int(Date().timeIntervalSince1970))"

        let order = Order(
            orderId: testOrderId,
            customerId: "DEBUG_CUSTOMER",
            customerName: "Debug Test User",
            customerEmail: "debug@test.local",
            deliveryAddress: address,
            deliveryInstructions: "[DEBUG] Test order - please ignore",
            restaurant: restaurantInfo,
            items: items,
            itemsCount: 2,
            subtotal: 10.0,
            deliveryFee: 5.0,
            serviceFee: 1.0,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            tax: 1.60,
            total: 17.60,
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

        // Delete sample restaurants
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
