import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared
import Combine

class OrderHistoryViewModel: ObservableObject {
    @Published var orders: [Order] = []
    @Published var isLoading = false
    private var db = Firestore.firestore()
    
    func fetchOrders() {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        isLoading = true
        db.collection("orders")
            .whereField("customerId", isEqualTo: userId)
            // .order(by: "placedAt", descending: true) // Removed
            .addSnapshotListener { (querySnapshot, error) in
                guard let documents = querySnapshot?.documents else {
                    print("No orders found")
                    self.isLoading = false
                    return
                }
                
                self.orders = documents.compactMap { queryDocumentSnapshot -> Order? in
                    return try? queryDocumentSnapshot.data(as: Order.self)
                }.sorted(by: { $0.placedAt > $1.placedAt })
                self.isLoading = false
            }
    }
}
