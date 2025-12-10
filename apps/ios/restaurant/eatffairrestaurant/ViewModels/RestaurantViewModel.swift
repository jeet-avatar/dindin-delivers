import SwiftUI
import FirebaseFirestore
import FirebaseAuth
import EatFairShared
import Combine

class RestaurantViewModel: ObservableObject {
    @Published var newOrders: [Order] = []
    @Published var inProgressOrders: [Order] = []
    @Published var isLoading = false
    
    private var db = Firestore.firestore()
    
    private var restaurantId: String {
        Auth.auth().currentUser?.uid ?? "12" // Fallback to 12 for testing if not logged in (shouldn't happen)
    } 
    
    func fetchOrders() {
        isLoading = true
        
        // In a real app, we would filter by restaurantId.
        // For now, since our Order model might not have restaurantId indexed properly or we want to see ALL orders for testing:
        // We will fetch all orders and filter client side, or assume we are the only restaurant.
        // Actually, let's try to filter by restaurantName or ID if available.
        // The Customer App saves 'restaurantName'. It doesn't seem to save 'restaurantId' in the top level Order object based on my previous read.
        // Let's check Order.swift in Customer App again.
        
        db.collection("orders")
            // .whereField("restaurantId", isEqualTo: restaurantId) // Uncomment when added
            // .order(by: "placedAt", descending: true) // Removed to avoid index error, sort client-side
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                self.isLoading = false

                if error != nil {
                    return
                }
                
                guard let documents = snapshot?.documents else { return }
                
                let allOrders = documents.compactMap { doc -> Order? in
                    do {
                        var order = try doc.data(as: Order.self)
                        order.id = doc.documentID
                        return order
                    } catch {
                        return nil
                    }
                }.sorted(by: { $0.placedAt > $1.placedAt })
                
                // Filter locally for now if needed, or just split by status
                self.newOrders = allOrders.filter { $0.status == "Placed" }
                self.inProgressOrders = allOrders.filter { $0.status == "Preparing" || $0.status == "Ready" }
            }
    }
    
    func updateStatus(order: Order, newStatus: String) {
        guard let orderId = order.id else { return }
        
        var updateData: [String: Any] = ["status": newStatus]
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        
        switch newStatus {
        case "Preparing":
            updateData["acceptedAt"] = timestamp
            // Set estimated delivery time (e.g., +30 mins)
            updateData["estimatedDeliveryTime"] = timestamp + (30 * 60 * 1000)
        case "Ready":
            updateData["preparedAt"] = timestamp
        case "Out for Delivery":
            updateData["pickedUpAt"] = timestamp
        case "Delivered":
            updateData["deliveredAt"] = timestamp
        default:
            break
        }
        
        db.collection("orders").document(orderId).updateData(updateData) { error in
            if error == nil {
                self.fetchOrders() // Refresh
            }
        }
    }
}
