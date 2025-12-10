import SwiftUI
import Combine
import EatFairShared

/// Enhanced Orders ViewModel with real-time updates and AI features
/// Uses P2P backend as single source of truth (no Firebase)
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
    private var cancellables = Set<AnyCancellable>()
    private let p2pAPI = P2PAPIService.shared

    // P2P Backend Integration
    @Published var p2pVendorId: Int?  // Numeric vendor ID for P2P backend
    private var p2pRefreshTimer: Timer?

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
        // "Placed" = new order, "Confirmed" = confirmed but not yet accepted by restaurant
        allOrders.filter { $0.status == "Placed" || $0.status == "Confirmed" }
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
        allOrders.filter { $0.status == "Delivered" || $0.status == "Picked Up" || $0.status == "Out for Delivery" }
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
        p2pRefreshTimer?.invalidate()
    }

    // MARK: - Setup

    private func setupRestaurant() {
        // Get P2P vendor ID from shared API service (single source of truth)
        p2pVendorId = p2pAPI.currentVendorId

        if let vendorId = p2pVendorId {
            restaurantId = String(vendorId)
            restaurantName = "My Restaurant" // Will be updated when orders load
        }
    }

    /// Set the P2P vendor ID manually (called after vendor login)
    func setP2PVendorId(_ vendorId: Int) {
        p2pVendorId = vendorId
        restaurantId = String(vendorId)
        fetchP2POrders()  // Fetch orders immediately
    }

    // MARK: - Real-time Orders Listener

    func startListening() {
        isLoading = true

        // Re-check P2P vendor ID from UserDefaults (in case login just happened)
        if p2pVendorId == nil {
            p2pVendorId = p2pAPI.currentVendorId
            if let vendorId = p2pVendorId {
                restaurantId = String(vendorId)
            }
        }

        // Fetch P2P orders from backend
        fetchP2POrders()

        // Start periodic refresh for P2P orders (every 30 seconds)
        p2pRefreshTimer?.invalidate()
        p2pRefreshTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.fetchP2POrders()
        }
    }

    /// Fetch orders from P2P backend
    private func fetchP2POrders() {
        guard let vendorId = p2pVendorId else {
            isLoading = false
            return
        }

        p2pAPI.fetchVendorOrders(vendorId: vendorId) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isLoading = false

                switch result {
                case .success(let p2pVendorOrders):
                    // Convert to Order models
                    self.allOrders = p2pVendorOrders.map { vendorOrder in
                        vendorOrder.toOrder(
                            vendorId: String(vendorId),
                            restaurantName: self.restaurantName
                        )
                    }.sorted { $0.placedAt > $1.placedAt }

                    // Update AI insights
                    self.updateAIInsights()

                case .failure(let error):
                    self.errorMessage = "Failed to fetch orders: \(error.localizedDescription)"
                    self.showError = true
                }
            }
        }
    }

    func stopListening() {
        p2pRefreshTimer?.invalidate()
        p2pRefreshTimer = nil
    }

    // MARK: - Order Actions

    func acceptOrder(_ order: Order) {
        // Calculate estimated prep time based on current load
        let estimatedTime = calculateEstimatedPrepTime()

        // API expects uppercase status: PREPARING - include estimated prep time
        updateOrderStatus(order, newStatus: "PREPARING", estimatedMinutes: estimatedTime)
    }

    func rejectOrder(_ order: Order, reason: String = "") {
        // Extract order ID from orderId (e.g., "EF123" -> 123)
        guard let orderIdInt = extractOrderId(from: order.orderId) else {
            errorMessage = "Invalid order ID"
            showError = true
            return
        }

        // API expects uppercase status: CANCELLED
        p2pAPI.updateOrderStatus(orderId: orderIdInt, status: "CANCELLED") { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                }
            }
        }
    }

    func markOrderReady(_ order: Order) {
        // API expects uppercase status: READY_FOR_PICKUP
        updateOrderStatus(order, newStatus: "READY_FOR_PICKUP")
    }

    func updateOrderStatus(_ order: Order, newStatus: String, estimatedMinutes: Int? = nil) {
        // Use the database ID from order.id (not the display order number)
        guard let idString = order.id, let orderIdInt = Int(idString) else {
            errorMessage = "Invalid order ID"
            showError = true
            return
        }

        // API expects uppercase statuses - pass estimated prep time if provided
        p2pAPI.updateOrderStatus(orderId: orderIdInt, status: newStatus, estimatedMinutes: estimatedMinutes) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                }
            }
        }
    }


    private func extractOrderId(from orderId: String) -> Int? {
        // Handle formats like "EF123" or just "123"
        let digits = orderId.filter { $0.isNumber }
        return Int(digits)
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
        guard let vendorId = p2pVendorId else {
            errorMessage = "No vendor ID - please log in again"
            showError = true
            return
        }

        isOnline.toggle()

        // Update online status via P2P API
        p2pAPI.updateVendorStatus(vendorId: vendorId, isOnline: isOnline) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    break
                case .failure(let error):
                    // Revert the toggle on failure
                    self?.isOnline.toggle()
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                }
            }
        }
    }
}
