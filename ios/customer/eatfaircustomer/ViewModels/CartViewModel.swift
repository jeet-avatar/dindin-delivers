import SwiftUI
import FirebaseAuth
import Combine
import EatFairShared
import FirebaseFirestore

class CartViewModel: ObservableObject {
    @Published var items: [MenuItem] = []
    @Published var restaurant: Restaurant? // Cart can only be from one restaurant at a time
    
    var subtotal: Double {
        items.reduce(0) { $0 + $1.price }
    }
    
    var tax: Double {
        subtotal * 0.10 // 10% tax
    }
    
    var deliveryFee: Double {
        5.00 // Flat fee
    }
    
    var total: Double {
        subtotal + tax + deliveryFee
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
    
    func placeOrder(deliveryAddress: DeliveryAddress, completion: @escaping (Bool) -> Void) {
        guard let user = Auth.auth().currentUser, let restaurant = restaurant, !items.isEmpty else {
            print("User not logged in or cart empty")
            completion(false)
            return
        }
        
        let db = Firestore.firestore()
        
        // Create Order object (using dictionary for Firestore)
        // We need to match the Android structure manually or use Codable.
        // Using Codable is safer but addDocument expects dictionary or Encodable.
        // Let's create the Order struct and encode it.
        
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
            orderId: String(Int.random(in: 10000...99999)),
            customerId: user.uid,
            customerName: user.displayName ?? "Customer",
            customerEmail: user.email ?? "",
            deliveryAddress: deliveryAddress,
            deliveryInstructions: "",
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
                    print("Error placing order: \(error)")
                    completion(false)
                } else {
                    completion(true)
                }
            }
        } catch {
            print("Error encoding order: \(error)")
            completion(false)
        }
    }
    
    func clearCart() {
        self.items = []
        self.restaurant = nil
    }
}
