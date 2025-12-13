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

    deinit {
        // Clean up any resources if needed
    }

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
        // Try P2P customer data first, then fall back to Firebase Auth
        let customerId: String
        let customerName: String
        let customerPhone: String
        let customerEmail: String

        // Check P2P customer data first
        let p2pCustomerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        let p2pCustomerName = UserDefaults.standard.string(forKey: "p2p_customer_name")
        let p2pCustomerEmail = UserDefaults.standard.string(forKey: "p2p_customer_email")

        if p2pCustomerId > 0 {
            // Use P2P customer data
            customerId = String(p2pCustomerId)
            customerName = p2pCustomerName ?? "Customer"
            customerPhone = ""
            customerEmail = p2pCustomerEmail ?? ""
        } else if let user = Auth.auth().currentUser {
            // Fallback to Firebase Auth
            customerId = user.uid
            customerName = user.displayName ?? "Customer"
            customerPhone = user.phoneNumber ?? ""
            customerEmail = user.email ?? ""
        } else {
            completion(false, nil)
            return
        }

        guard let restaurant = restaurant, !items.isEmpty else {
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
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
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
                    customerId: customerId,
                    customerName: customerName,
                    customerEmail: customerEmail,
                    deliveryAddress: deliveryAddress,
                    completion: completion
                )

            case .failure:
                // Fallback: create order with Firebase-generated ID
                self?.createFallbackOrder(
                    customerId: customerId,
                    customerName: customerName,
                    customerEmail: customerEmail,
                    deliveryAddress: deliveryAddress,
                    completion: completion
                )
            }
        }
    }

    /// Save order to Firebase with the backend-synced order number
    private func saveOrderToFirebase(
        orderNumber: String,
        customerId: String,
        customerName: String,
        customerEmail: String,
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
            customerId: customerId,
            customerName: customerName,
            customerEmail: customerEmail,
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
            try db.collection("orders").addDocument(from: order) { writeError in
                completion(writeError == nil, writeError == nil ? orderNumber : nil)
            }
        } catch {
            completion(false, nil)
        }
    }

    /// Fallback order creation if P2P backend is unavailable
    private func createFallbackOrder(
        customerId: String,
        customerName: String,
        customerEmail: String,
        deliveryAddress: DeliveryAddress,
        completion: @escaping (Bool, String?) -> Void
    ) {
        guard let restaurant = restaurant else {
            completion(false, nil)
            return
        }

        let db = Firestore.firestore()

        // Generate enterprise-level order number locally if backend unavailable
        // Format matches backend: EF-YYYYMMDD-HHMMSS-XXXX
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd-HHmmss"
        let orderNumber = "EF-\(dateFormatter.string(from: Date()))-\(String(format: "%04d", Int.random(in: 1...9999)))"
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
            customerId: customerId,
            customerName: customerName,
            customerEmail: customerEmail,
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
            try db.collection("orders").addDocument(from: order) { writeError in
                completion(writeError == nil, writeError == nil ? orderNumber : nil)
            }
        } catch {
            completion(false, nil)
        }
    }

    func clearCart() {
        self.items = []
        self.restaurant = nil
        self.lastOrderNumber = nil
    }
}
