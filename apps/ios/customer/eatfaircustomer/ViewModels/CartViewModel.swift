import SwiftUI
import FirebaseAuth
import Combine
import EatFairShared
import FirebaseFirestore

class CartViewModel: ObservableObject {
    @Published var items: [MenuItem] = []
    @Published var restaurant: Restaurant? // Cart can only be from one restaurant at a time
    @Published var lastOrderNumber: String? // Backend-synced order number

    private let p2pAPI = P2PAPIService.shared

    var subtotal: Double {
        items.reduce(0) { $0 + $1.price }
    }

    var tax: Double {
        subtotal * AppConfig.shared.taxRate
    }

    var deliveryFee: Double {
        AppConfig.shared.baseDeliveryFee
    }

    var platformFee: Double {
        AppConfig.shared.restaurantPlatformFee  // $1 flat fee
    }

    var total: Double {
        subtotal + tax + deliveryFee + platformFee
    }

    func addToCart(item: MenuItem, from restaurant: Restaurant) {
        // If cart has items from another restaurant, clear it first (simple logic for now)
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

    /// Place order via P2P backend to get synced order number
    /// This ensures the same order number is visible in Customer, Restaurant, and Delivery apps
    func placeOrder(deliveryAddress: DeliveryAddress, completion: @escaping (Bool, String?) -> Void) {
        guard let user = Auth.auth().currentUser, let restaurant = restaurant, !items.isEmpty else {
            print("User not logged in or cart empty")
            completion(false, nil)
            return
        }

        // Convert items to API format
        let orderItems: [[String: Any]] = items.map { item in
            [
                "menu_item_id": Int(item.id ?? "0") ?? 0,
                "name": item.name,
                "price": item.price,
                "quantity": 1
            ]
        }

        // Get vendor ID from restaurant (numeric ID for P2P backend)
        guard let vendorId = Int(restaurant.id ?? "0") else {
            print("Invalid vendor ID")
            completion(false, nil)
            return
        }

        // Build delivery address dictionary for backend
        let addressDict: [String: String] = [
            "street": deliveryAddress.street,
            "city": deliveryAddress.city,
            "state": deliveryAddress.state,
            "zip": deliveryAddress.zipCode
        ]

        // Create order via P2P API to get backend-synced order number
        p2pAPI.createOrder(
            vendorId: vendorId,
            customerName: user.displayName ?? "Customer",
            customerEmail: user.email ?? "",
            customerPhone: user.phoneNumber ?? "",
            deliveryAddress: addressDict,
            deliveryInstructions: deliveryAddress.instructions,
            items: orderItems,
            tip: 0.0
        ) { [weak self] result in
            switch result {
            case .success(let response):
                // Store the backend-synced order number
                self?.lastOrderNumber = response.orderNumber

                // Also save to Firebase for real-time updates
                self?.saveOrderToFirebase(
                    orderNumber: response.orderNumber,
                    user: user,
                    deliveryAddress: deliveryAddress,
                    completion: completion
                )

            case .failure(let error):
                print("P2P order creation failed: \(error.localizedDescription)")
                // Fallback: create order with Firebase-generated ID
                self?.createFallbackOrder(user: user, deliveryAddress: deliveryAddress, completion: completion)
            }
        }
    }

    /// Save order to Firebase with the backend-synced order number
    private func saveOrderToFirebase(
        orderNumber: String,
        user: FirebaseAuth.User,
        deliveryAddress: DeliveryAddress,
        completion: @escaping (Bool, String?) -> Void
    ) {
        guard let restaurant = restaurant else {
            completion(false, nil)
            return
        }

        let db = Firestore.firestore()

        let restaurantInfo = RestaurantInfo(
            id: restaurant.id ?? "0",
            name: restaurant.name,
            address: restaurant.address,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            imageUrl: restaurant.imageUrl
        )

        let orderItems = items.map { item in
            OrderItem(
                menuItemId: item.id ?? "",
                name: item.name,
                price: item.price,
                quantity: 1,
                options: nil
            )
        }

        // Use the backend-synced order number
        let order = Order(
            orderId: orderNumber,  // Backend-synced order number
            customerId: user.uid,
            customerName: user.displayName ?? "Customer",
            customerEmail: user.email ?? "",
            deliveryAddress: deliveryAddress,
            deliveryInstructions: deliveryAddress.instructions ?? "",
            restaurant: restaurantInfo,
            items: orderItems,
            itemsCount: items.count,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            serviceFee: 0.0,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            tax: tax,
            total: total,
            status: "Placed",
            placedAt: Int64(Date().timeIntervalSince1970 * 1000)
        )

        do {
            try db.collection("orders").addDocument(from: order) { error in
                if let error = error {
                    print("Error saving to Firebase: \(error)")
                    completion(false, nil)
                } else {
                    completion(true, orderNumber)
                }
            }
        } catch {
            print("Error encoding order: \(error)")
            completion(false, nil)
        }
    }

    /// Fallback order creation if P2P backend is unavailable
    private func createFallbackOrder(
        user: FirebaseAuth.User,
        deliveryAddress: DeliveryAddress,
        completion: @escaping (Bool, String?) -> Void
    ) {
        guard let restaurant = restaurant else {
            completion(false, nil)
            return
        }

        let db = Firestore.firestore()

        // Generate order number locally if backend unavailable
        let orderNumber = "ORD-\(Int(Date().timeIntervalSince1970))-\(Int.random(in: 1000...9999))"
        self.lastOrderNumber = orderNumber

        let restaurantInfo = RestaurantInfo(
            id: restaurant.id ?? "0",
            name: restaurant.name,
            address: restaurant.address,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            imageUrl: restaurant.imageUrl
        )

        let orderItems = items.map { item in
            OrderItem(
                menuItemId: item.id ?? "",
                name: item.name,
                price: item.price,
                quantity: 1,
                options: nil
            )
        }

        let order = Order(
            orderId: orderNumber,
            customerId: user.uid,
            customerName: user.displayName ?? "Customer",
            customerEmail: user.email ?? "",
            deliveryAddress: deliveryAddress,
            deliveryInstructions: deliveryAddress.instructions ?? "",
            restaurant: restaurantInfo,
            items: orderItems,
            itemsCount: items.count,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            serviceFee: 0.0,
            priorityFee: 0.0,
            smallOrderFee: 0.0,
            tax: tax,
            total: total,
            status: "Placed",
            placedAt: Int64(Date().timeIntervalSince1970 * 1000)
        )

        do {
            try db.collection("orders").addDocument(from: order) { error in
                if let error = error {
                    print("Error placing fallback order: \(error)")
                    completion(false, nil)
                } else {
                    completion(true, orderNumber)
                }
            }
        } catch {
            print("Error encoding fallback order: \(error)")
            completion(false, nil)
        }
    }

    func clearCart() {
        self.items = []
        self.restaurant = nil
        self.lastOrderNumber = nil
    }
}
