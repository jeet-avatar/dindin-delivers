import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import Combine
import EatFairShared

/// Enhanced Orders ViewModel with real-time updates and AI features
class OrdersViewModel: ObservableObject {
    // MARK: - Configuration
    private var config: AppConfig { AppConfig.shared }

    // MARK: - Published Properties
    @Published var allOrders: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - AI Insights
    @Published var averagePrepTime: Int = 20 // Will be updated from config or calculated
    @Published var busyLevel: BusyLevel = .normal
    @Published var estimatedOrdersNextHour: Int = 0
    @Published var aiSuggestion: String?

    // MARK: - Restaurant State
    @Published var isOnline = true
    @Published var restaurantId: String?
    @Published var restaurantName: String = ""

    // MARK: - Private
    private var db = Firestore.firestore()
    private var listener: ListenerRegistration?
    private var cancellables = Set<AnyCancellable>()

    enum BusyLevel: String {
        case slow = "Slow"
        case normal = "Normal"
        case busy = "Busy"
        case veryBusy = "Very Busy"

        var color: Color {
            switch self {
            case .slow: return .blue
            case .normal: return .green
            case .busy: return .orange
            case .veryBusy: return .red
            }
        }

        var icon: String {
            switch self {
            case .slow: return "moon.zzz.fill"
            case .normal: return "checkmark.circle.fill"
            case .busy: return "flame.fill"
            case .veryBusy: return "exclamationmark.triangle.fill"
            }
        }
    }

    // MARK: - Computed Properties

    var newOrders: [Order] {
        allOrders.filter { $0.status == "Placed" }
            .sorted { $0.placedAt > $1.placedAt }
    }

    var preparingOrders: [Order] {
        allOrders.filter { $0.status == "Preparing" || $0.status == "Accepted" }
            .sorted { $0.placedAt < $1.placedAt } // Oldest first
    }

    var readyOrders: [Order] {
        allOrders.filter { $0.status == "Ready" }
            .sorted { $0.placedAt < $1.placedAt }
    }

    var completedOrders: [Order] {
        allOrders.filter { $0.status == "Delivered" || $0.status == "Picked Up" }
            .sorted { $0.placedAt > $1.placedAt }
    }

    var todayRevenue: Double {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return allOrders
            .filter {
                let orderDate = Date(timeIntervalSince1970: TimeInterval($0.placedAt) / 1000)
                return calendar.isDate(orderDate, inSameDayAs: today) &&
                       ($0.status == "Delivered" || $0.status == "Ready" || $0.status == "Picked Up")
            }
            .reduce(0) { $0 + $1.total }
    }

    var todayOrderCount: Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return allOrders
            .filter {
                let orderDate = Date(timeIntervalSince1970: TimeInterval($0.placedAt) / 1000)
                return calendar.isDate(orderDate, inSameDayAs: today)
            }
            .count
    }

    // MARK: - Initialization

    init() {
        setupRestaurant()
    }

    deinit {
        listener?.remove()
    }

    // MARK: - Setup

    private func setupRestaurant() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        restaurantId = uid

        // Fetch restaurant details
        db.collection("restaurants").document(uid).getDocument { [weak self] snapshot, error in
            if let data = snapshot?.data() {
                DispatchQueue.main.async {
                    self?.restaurantName = data["name"] as? String ?? "My Restaurant"
                    self?.isOnline = data["isOnline"] as? Bool ?? true
                }
            }
        }
    }

    // MARK: - Real-time Orders Listener

    func startListening() {
        isLoading = true
        listener?.remove()

        // Listen to all orders and filter client-side for now
        // In production, add restaurantId field to orders for proper querying
        listener = db.collection("orders")
            .order(by: "placedAt", descending: true)
            .limit(to: 100)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                DispatchQueue.main.async {
                    self.isLoading = false

                    if let error = error {
                        self.errorMessage = error.localizedDescription
                        self.showError = true
                        return
                    }

                    guard let documents = snapshot?.documents else { return }

                    self.allOrders = documents.compactMap { doc -> Order? in
                        try? doc.data(as: Order.self)
                    }

                    // Update AI insights
                    self.updateAIInsights()
                }
            }
    }

    func stopListening() {
        listener?.remove()
        listener = nil
    }

    // MARK: - Order Actions

    func acceptOrder(_ order: Order) {
        updateOrderStatus(order, newStatus: "Preparing")

        // Update estimated prep time based on current load
        let estimatedTime = calculateEstimatedPrepTime()
        updateEstimatedTime(order, minutes: estimatedTime)
    }

    func rejectOrder(_ order: Order, reason: String = "") {
        guard let orderId = order.id else { return }

        db.collection("orders").document(orderId).updateData([
            "status": "Rejected",
            "rejectionReason": reason,
            "rejectedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]) { [weak self] error in
            if let error = error {
                self?.errorMessage = error.localizedDescription
                self?.showError = true
            }
        }
    }

    func markOrderReady(_ order: Order) {
        updateOrderStatus(order, newStatus: "Ready")
    }

    func updateOrderStatus(_ order: Order, newStatus: String) {
        guard let orderId = order.id else { return }

        var updateData: [String: Any] = ["status": newStatus]

        switch newStatus {
        case "Preparing":
            updateData["acceptedAt"] = Int64(Date().timeIntervalSince1970 * 1000)
        case "Ready":
            updateData["preparedAt"] = Int64(Date().timeIntervalSince1970 * 1000)
        default:
            break
        }

        db.collection("orders").document(orderId).updateData(updateData) { [weak self] error in
            if let error = error {
                self?.errorMessage = error.localizedDescription
                self?.showError = true
            }
        }
    }

    private func updateEstimatedTime(_ order: Order, minutes: Int) {
        guard let orderId = order.id else { return }

        let estimatedDelivery = Int64(Date().timeIntervalSince1970 * 1000) + Int64(minutes * 60 * 1000)
        db.collection("orders").document(orderId).updateData([
            "estimatedDeliveryTime": estimatedDelivery
        ])
    }

    // MARK: - AI Features

    private func updateAIInsights() {
        // Calculate busy level based on active orders (thresholds from config)
        let activeCount = preparingOrders.count + readyOrders.count + newOrders.count
        let thresholds = config.busyLevelThresholds

        if activeCount <= thresholds.slow {
            busyLevel = .slow
        } else if activeCount <= thresholds.normal {
            busyLevel = .normal
        } else if activeCount <= thresholds.busy {
            busyLevel = .busy
        } else {
            busyLevel = .veryBusy
        }

        // Estimate orders for next hour based on historical patterns
        estimatedOrdersNextHour = estimateNextHourOrders()

        // Generate AI suggestion
        generateAISuggestion()

        // Calculate average prep time
        calculateAveragePrepTime()
    }

    private func estimateNextHourOrders() -> Int {
        // Simple estimation based on current hour's orders
        // In production, use ML model with historical data
        let calendar = Calendar.current
        let now = Date()
        guard let hourAgo = calendar.date(byAdding: .hour, value: -1, to: now) else {
            return 1
        }

        let ordersLastHour = allOrders.filter {
            let orderDate = Date(timeIntervalSince1970: TimeInterval($0.placedAt) / 1000)
            return orderDate >= hourAgo && orderDate <= now
        }.count

        // Add some variance based on time of day
        let hour = calendar.component(.hour, from: now)
        var multiplier = 1.0

        if hour >= 11 && hour <= 14 { // Lunch rush
            multiplier = 1.5
        } else if hour >= 18 && hour <= 21 { // Dinner rush
            multiplier = 1.8
        } else if hour >= 22 || hour <= 6 { // Late night
            multiplier = 0.5
        }

        return max(1, Int(Double(ordersLastHour) * multiplier))
    }

    private func generateAISuggestion() {
        let hour = Calendar.current.component(.hour, from: Date())

        if newOrders.count > 3 {
            aiSuggestion = "High order volume! Consider increasing prep staff."
        } else if busyLevel == .slow && (hour >= 11 && hour <= 13) {
            aiSuggestion = "Slow lunch period. Consider running a flash promotion."
        } else if preparingOrders.count > 5 {
            aiSuggestion = "Multiple orders preparing. Prioritize oldest orders first."
        } else if readyOrders.count > 3 {
            aiSuggestion = "Several orders ready. Check driver availability."
        } else {
            aiSuggestion = nil
        }
    }

    private func calculateAveragePrepTime() {
        let completedToday = completedOrders.filter {
            let orderDate = Date(timeIntervalSince1970: TimeInterval($0.placedAt) / 1000)
            return Calendar.current.isDateInToday(orderDate)
        }

        guard !completedToday.isEmpty else {
            averagePrepTime = config.defaultPrepTimeMinutes // Default from config
            return
        }

        var totalPrepTime: Int64 = 0
        var validOrders = 0

        for order in completedToday {
            if let preparedAt = order.preparedAt {
                let prepTime = (preparedAt - order.placedAt) / 1000 / 60 // minutes
                if prepTime > 0 && prepTime < 120 { // Sanity check
                    totalPrepTime += prepTime
                    validOrders += 1
                }
            }
        }

        if validOrders > 0 {
            averagePrepTime = Int(totalPrepTime / Int64(validOrders))
        }
    }

    private func calculateEstimatedPrepTime() -> Int {
        // Base prep time + additional time based on current load (from config)
        let basePrepTime = averagePrepTime
        let additionalTime = preparingOrders.count * config.additionalPrepTimePerOrder

        return min(basePrepTime + additionalTime, config.maxPrepTimeMinutes)
    }

    // MARK: - Restaurant Status

    func toggleOnlineStatus() {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        isOnline.toggle()

        db.collection("restaurants").document(uid).updateData([
            "isOnline": isOnline
        ])
    }
}
