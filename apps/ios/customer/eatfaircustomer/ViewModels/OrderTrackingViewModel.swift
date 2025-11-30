import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared
import CoreLocation

@MainActor
class OrderTrackingViewModel: ObservableObject {
    @Published var currentOrder: Order?
    @Published var isLoading = false
    @Published var estimatedTime = "Calculating..."
    @Published var driverLocation: CLLocationCoordinate2D?
    
    private var db = Firestore.firestore()
    private var orderListener: ListenerRegistration?
    private var driverListener: ListenerRegistration?
    
    func listenToLatestOrder() {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        isLoading = true
        
        // Listen to the most recent order for this user
        // Note: Ideally we should use .order(by: "placedAt", descending: true).limit(to: 1)
        // But that requires a composite index. For now, client-side sorting is fine for low volume.
        orderListener = db.collection("orders")
            .whereField("customerId", isEqualTo: userId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                self.isLoading = false
                
                if let error = error {
                    print("Error listening to order: \(error)")
                    return
                }
                
                let orders = snapshot?.documents.compactMap { try? $0.data(as: Order.self) } ?? []
                let latestOrder = orders.sorted(by: { $0.placedAt > $1.placedAt }).first
                
                // Check if order changed or status changed to trigger driver tracking
                if latestOrder?.id != self.currentOrder?.id || latestOrder?.status != self.currentOrder?.status {
                    self.currentOrder = latestOrder
                    self.updateEstimatedTime()
                    self.handleDriverTracking(for: latestOrder)
                } else {
                    self.currentOrder = latestOrder
                }
            }
    }
    
    private func handleDriverTracking(for order: Order?) {
        // Stop existing listener if any
        driverListener?.remove()
        driverListener = nil
        driverLocation = nil
        
        guard let order = order,
              order.status == "Out for Delivery",
              let driverId = order.driverId else {
            return
        }
        
        print("Starting driver tracking for driver: \(driverId)")
        
        driverListener = db.collection("drivers").document(driverId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let data = snapshot?.data() else { return }
                
                if let lat = data["currentLatitude"] as? Double,
                   let lon = data["currentLongitude"] as? Double {
                    self.driverLocation = CLLocationCoordinate2D(latitude: lat, longitude: lon)
                }
            }
    }
    
    private func updateEstimatedTime() {
        guard let status = currentOrder?.status else { return }
        
        switch status {
        case "Placed":
            estimatedTime = "30-40 mins"
        case "Preparing":
            estimatedTime = "20-30 mins"
        case "Ready":
            estimatedTime = "15-20 mins"
        case "Out for Delivery":
            estimatedTime = "10-15 mins"
        case "Delivered":
            estimatedTime = "Arrived"
        default:
            estimatedTime = "--"
        }
    }
    
    deinit {
        orderListener?.remove()
        driverListener?.remove()
    }
}
