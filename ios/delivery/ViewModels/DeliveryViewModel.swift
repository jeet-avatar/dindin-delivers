import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared

/// DeliveryViewModel manages all delivery-related data
/// Connected to Firebase Firestore with real-time listeners
/// NO hardcoded mock data - all data comes from Firebase
class DeliveryViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var availableOrders: [Order] = []
    @Published var myDeliveries: [Order] = []
    @Published var completedDeliveries: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - Stats (computed from real data)
    @Published var todayCompletedCount = 0
    @Published var todayEarnings: Double = 0.0

    // MARK: - Private Properties
    private let db = Firestore.firestore()
    private var availableOrdersListener: ListenerRegistration?
    private var myDeliveriesListener: ListenerRegistration?
    private var completedListener: ListenerRegistration?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init() {
        setupAuthStateListener()
    }

    deinit {
        removeListeners()
    }

    // MARK: - Auth State Listener
    private var authStateListener: AuthStateDidChangeListenerHandle?

    private func setupAuthStateListener() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            if user != nil {
                self?.startListening()
            } else {
                self?.removeListeners()
                self?.clearData()
            }
        }
    }

    private func startListening() {
        fetchAvailableOrders()
        fetchMyDeliveries()
        fetchTodayCompleted()
    }

    private func removeListeners() {
        availableOrdersListener?.remove()
        myDeliveriesListener?.remove()
        completedListener?.remove()
    }

    private func clearData() {
        availableOrders = []
        myDeliveries = []
        completedDeliveries = []
        todayCompletedCount = 0
        todayEarnings = 0.0
    }

    // MARK: - Fetch Available Orders
    /// Fetches orders that are ready for pickup and don't have a driver assigned
    func fetchAvailableOrders() {
        isLoading = true

        // Remove existing listener
        availableOrdersListener?.remove()

        // Listen for orders with status "Ready" that have no driver
        availableOrdersListener = db.collection("orders")
            .whereField("status", isEqualTo: "Ready")
            .order(by: "placedAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let error = error {
                        self?.handleError(error)
                        return
                    }

                    guard let documents = snapshot?.documents else {
                        self?.availableOrders = []
                        return
                    }

                    self?.availableOrders = documents.compactMap { doc -> Order? in
                        do {
                            var order = try doc.data(as: Order.self)
                            order.id = doc.documentID
                            return order
                        } catch {
                            print("Error decoding order \(doc.documentID): \(error)")
                            return nil
                        }
                    }
                    // Filter orders without a driver
                    .filter { $0.driverId == nil || $0.driverId?.isEmpty == true }
                }
            }
    }

    // MARK: - Fetch My Deliveries
    /// Fetches orders assigned to the current driver that are not yet delivered
    func fetchMyDeliveries() {
        guard let uid = Auth.auth().currentUser?.uid else {
            myDeliveries = []
            return
        }

        isLoading = true

        // Remove existing listener
        myDeliveriesListener?.remove()

        // Listen for orders assigned to this driver that are active
        myDeliveriesListener = db.collection("orders")
            .whereField("driverId", isEqualTo: uid)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let error = error {
                        self?.handleError(error)
                        return
                    }

                    guard let documents = snapshot?.documents else {
                        self?.myDeliveries = []
                        return
                    }

                    // Filter for active deliveries (not delivered)
                    self?.myDeliveries = documents.compactMap { doc -> Order? in
                        do {
                            var order = try doc.data(as: Order.self)
                            order.id = doc.documentID
                            return order
                        } catch {
                            print("Error decoding my delivery \(doc.documentID): \(error)")
                            return nil
                        }
                    }
                    .filter { $0.status != "Delivered" && $0.status != "Cancelled" }
                    .sorted { order1, order2 in
                        // Sort: Out for Delivery first, then Ready
                        if order1.status == "Out for Delivery" && order2.status != "Out for Delivery" {
                            return true
                        }
                        return false
                    }
                }
            }
    }

    // MARK: - Fetch Today's Completed Deliveries
    /// Fetches completed deliveries for today to calculate stats
    func fetchTodayCompleted() {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let startOfToday = Calendar.current.startOfDay(for: Date())
        let startTimestamp = Int64(startOfToday.timeIntervalSince1970 * 1000)

        completedListener?.remove()

        completedListener = db.collection("orders")
            .whereField("driverId", isEqualTo: uid)
            .whereField("status", isEqualTo: "Delivered")
            .whereField("deliveredAt", isGreaterThanOrEqualTo: startTimestamp)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.completedDeliveries = documents.compactMap { doc -> Order? in
                        do {
                            var order = try doc.data(as: Order.self)
                            order.id = doc.documentID
                            return order
                        } catch {
                            return nil
                        }
                    }

                    self?.todayCompletedCount = self?.completedDeliveries.count ?? 0
                    self?.todayEarnings = self?.completedDeliveries.reduce(0) { total, order in
                        total + order.deliveryFee + order.priorityFee + order.tip
                    } ?? 0.0
                }
            }
    }

    // MARK: - Accept Order
    /// Driver accepts an order for delivery
    func acceptOrder(_ order: Order) {
        guard let orderId = order.id,
              let user = Auth.auth().currentUser else {
            showErrorMessage("Unable to accept order. Please try again.")
            return
        }

        // Fetch driver info
        db.collection("drivers").document(user.uid).getDocument { [weak self] snapshot, error in
            guard let driverData = snapshot?.data() else {
                self?.showErrorMessage("Driver profile not found.")
                return
            }

            let driverName = driverData["name"] as? String ?? user.displayName ?? "Driver"
            let driverPhone = driverData["phone"] as? String ?? user.phoneNumber ?? ""
            let driverRating = (driverData["stats"] as? [String: Any])?["rating"] as? Double ?? 5.0

            let updateData: [String: Any] = [
                "status": "Out for Delivery",
                "driverId": user.uid,
                "driverName": driverName,
                "driverPhone": driverPhone,
                "driverRating": driverRating,
                "acceptedAt": Int64(Date().timeIntervalSince1970 * 1000),
                "pickedUpAt": Int64(Date().timeIntervalSince1970 * 1000)
            ]

            self?.db.collection("orders").document(orderId).updateData(updateData) { error in
                if let error = error {
                    self?.showErrorMessage("Failed to accept order: \(error.localizedDescription)")
                } else {
                    // Update driver's current delivery count
                    self?.incrementDriverDeliveryCount()
                }
            }
        }
    }

    // MARK: - Mark as Delivered
    /// Marks an order as delivered
    func markAsDelivered(_ order: Order) {
        guard let orderId = order.id else { return }

        let updateData: [String: Any] = [
            "status": "Delivered",
            "deliveredAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        db.collection("orders").document(orderId).updateData(updateData) { [weak self] error in
            if let error = error {
                self?.showErrorMessage("Failed to complete delivery: \(error.localizedDescription)")
            } else {
                // Update driver stats
                self?.updateDriverStatsOnDelivery(order)
            }
        }
    }

    // MARK: - Cancel Delivery
    /// Driver cancels/unassigns from a delivery
    func cancelDelivery(_ order: Order) {
        guard let orderId = order.id else { return }

        let updateData: [String: Any] = [
            "status": "Ready",
            "driverId": FieldValue.delete(),
            "driverName": FieldValue.delete(),
            "driverPhone": FieldValue.delete(),
            "driverRating": FieldValue.delete(),
            "acceptedAt": FieldValue.delete(),
            "pickedUpAt": FieldValue.delete()
        ]

        db.collection("orders").document(orderId).updateData(updateData) { [weak self] error in
            if let error = error {
                self?.showErrorMessage("Failed to cancel delivery: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Update Driver Location on Order
    /// Updates the driver's live location on an active order
    func updateDriverLocationOnOrder(_ order: Order, latitude: Double, longitude: Double) {
        guard let orderId = order.id else { return }

        let locationData: [String: Any] = [
            "driverLatitude": latitude,
            "driverLongitude": longitude,
            "driverLocationUpdatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        db.collection("orders").document(orderId).updateData(locationData)
    }

    // MARK: - Private Helpers

    private func incrementDriverDeliveryCount() {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        db.collection("drivers").document(uid).updateData([
            "stats.totalDeliveries": FieldValue.increment(Int64(1))
        ])
    }

    private func updateDriverStatsOnDelivery(_ order: Order) {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let earnings = order.deliveryFee + order.priorityFee + order.tip

        db.collection("drivers").document(uid).updateData([
            "stats.completedDeliveries": FieldValue.increment(Int64(1)),
            "stats.totalEarnings": FieldValue.increment(earnings),
            "stats.weeklyDeliveries": FieldValue.increment(Int64(1)),
            "stats.weeklyEarnings": FieldValue.increment(earnings)
        ])
    }

    private func handleError(_ error: Error) {
        print("DeliveryViewModel Error: \(error.localizedDescription)")
        errorMessage = error.localizedDescription
        showError = true
    }

    private func showErrorMessage(_ message: String) {
        DispatchQueue.main.async {
            self.errorMessage = message
            self.showError = true
        }
    }
}

// MARK: - Preview Helper
#if DEBUG
extension DeliveryViewModel {
    /// Creates a preview instance with sample data for SwiftUI previews
    /// This is ONLY for Xcode previews, not for the actual app
    static var preview: DeliveryViewModel {
        let vm = DeliveryViewModel()
        // Preview will show empty state since we're not using mock data
        return vm
    }
}
#endif
