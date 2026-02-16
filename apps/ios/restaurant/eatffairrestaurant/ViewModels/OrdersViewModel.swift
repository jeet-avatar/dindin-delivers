import SwiftUI
import Combine
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "OrdersViewModel")

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

    /// Orders waiting for restaurant acceptance (3-minute window)
    var pendingRestaurantOrders: [Order] {
        allOrders.filter { $0.status.lowercased() == "pending_restaurant" }
            .sorted { $0.placedAt > $1.placedAt }
    }

    /// Orders pending delivery decision (3-minute window after ready)
    var pendingDeliveryDecisionOrders: [Order] {
        allOrders.filter { $0.status.lowercased() == "pending_delivery_decision" }
            .sorted { $0.placedAt > $1.placedAt }
    }

    /// New orders - includes pending_restaurant and confirmed
    var newOrders: [Order] {
        allOrders.filter {
            let status = $0.status.lowercased()
            return status == "pending_restaurant" || status == "confirmed" || status == "placed"
        }
        .sorted { $0.placedAt > $1.placedAt }
    }

    var preparingOrders: [Order] {
        allOrders.filter {
            let status = $0.status.lowercased()
            return status == "preparing" || status == "accepted"
        }
        .sorted { $0.placedAt < $1.placedAt } // Oldest first
    }

    var readyOrders: [Order] {
        allOrders.filter {
            let status = $0.status.lowercased()
            return status == "ready_for_pickup" || status == "ready" || status == "pending_delivery_decision"
        }
        .sorted { $0.placedAt < $1.placedAt }
    }

    /// Orders restaurant is self-delivering
    var selfDeliveryOrders: [Order] {
        allOrders.filter { $0.status.lowercased() == "restaurant_will_deliver" }
            .sorted { $0.placedAt < $1.placedAt }
    }

    /// All orders currently being delivered (by driver OR self-delivery)
    var deliveringOrders: [Order] {
        allOrders.filter {
            let status = $0.status.lowercased()
            // Note: Backend status gets mapped in P2PVendorOrder.toOrder():
            // "out_for_delivery" -> "OnTheWay"
            // "picked_up" -> "PickedUp"
            return status == "restaurant_will_deliver" ||
                   status == "ontheway" ||
                   status == "pickedup"
        }
        .sorted { $0.placedAt < $1.placedAt }
    }

    var completedOrders: [Order] {
        allOrders.filter {
            let status = $0.status.lowercased()
            return status == "delivered" || status == "pickedup" || status == "ontheway"
        }
        .sorted { $0.placedAt > $1.placedAt }
    }

    /// Orders that require restaurant action (accept order or delivery decision)
    var actionRequiredOrders: [Order] {
        allOrders.filter {
            let status = $0.status.lowercased()
            return status == "pending_restaurant" || status == "pending_delivery_decision"
        }
        .sorted { $0.placedAt > $1.placedAt }
    }

    var todayRevenue: Double {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return allOrders
            .filter {
                let orderDate = Date(timeIntervalSince1970: TimeInterval($0.placedAt) / 1000)
                let status = $0.status.lowercased()
                return calendar.isDate(orderDate, inSameDayAs: today) &&
                       (status == "delivered" || status == "ready" || status == "ready_for_pickup" || status == "pickedup" || status == "ontheway")
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
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("network") || errorMsg.contains("connection") || errorMsg.contains("internet") {
                        self.errorMessage = "Unable to connect. Please check your internet connection."
                    } else if errorMsg.contains("unauthorized") || errorMsg.contains("401") {
                        self.errorMessage = "Session expired. Please log in again."
                    } else {
                        self.errorMessage = "Unable to load orders. Please try again."
                    }
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
        // Use order.id (database ID) not order.orderId (display number)
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh and try again."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            // Log the issue for debugging - order ID format mismatch
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer - API expects numeric ID")
            #endif
            errorMessage = "Unable to process order. Please contact support if this persists."
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
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("already") || errorMsg.contains("cannot cancel") {
                        self?.errorMessage = "This order can no longer be cancelled."
                    } else {
                        self?.errorMessage = "Unable to reject order. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
    }

    // MARK: - Restaurant Acceptance Flow (3-minute window)

    /// Restaurant accepts an order within the 3-minute window
    func acceptRestaurantOrder(_ order: Order) {
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh and try again."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer for acceptance")
            #endif
            errorMessage = "Unable to accept order. Please contact support if this persists."
            showError = true
            return
        }

        p2pAPI.restaurantAcceptOrder(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("expired") || errorMsg.contains("timeout") || errorMsg.contains("window") {
                        self?.errorMessage = "Acceptance window expired. Order was auto-cancelled."
                    } else if errorMsg.contains("already") {
                        self?.errorMessage = "This order has already been processed."
                    } else {
                        self?.errorMessage = "Unable to accept order. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
    }

    /// Restaurant declines an order within the 3-minute window
    func declineRestaurantOrder(_ order: Order, reason: String = "Restaurant unavailable") {
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer")
            #endif
            errorMessage = "Unable to process order. Please contact support."
            showError = true
            return
        }

        p2pAPI.restaurantDeclineOrder(orderId: orderIdInt, reason: reason) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("already") || errorMsg.contains("processed") {
                        self?.errorMessage = "This order has already been processed."
                    } else {
                        self?.errorMessage = "Unable to decline order. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
    }

    // MARK: - Delivery Decision Flow (3-minute window)

    /// Restaurant accepts delivery (will self-deliver)
    func acceptDelivery(_ order: Order) {
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer")
            #endif
            errorMessage = "Unable to process order. Please contact support."
            showError = true
            return
        }

        p2pAPI.restaurantAcceptDelivery(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("expired") || errorMsg.contains("timeout") || errorMsg.contains("window") {
                        self?.errorMessage = "Delivery decision window expired. Order sent to driver pool."
                    } else if errorMsg.contains("already") || errorMsg.contains("assigned") {
                        self?.errorMessage = "A driver has already been assigned to this order."
                    } else {
                        self?.errorMessage = "Unable to accept delivery. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
    }

    /// Restaurant declines delivery (send to driver pool)
    func declineDelivery(_ order: Order) {
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer")
            #endif
            errorMessage = "Unable to process order. Please contact support."
            showError = true
            return
        }

        p2pAPI.restaurantDeclineDelivery(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("already") || errorMsg.contains("assigned") {
                        self?.errorMessage = "A driver has already been assigned to this order."
                    } else {
                        self?.errorMessage = "Unable to decline delivery. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
    }

    /// Restaurant marks self-delivery order as delivered
    func markOrderDelivered(_ order: Order) {
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer")
            #endif
            errorMessage = "Unable to process order. Please contact support."
            showError = true
            return
        }

        p2pAPI.restaurantCompleteDelivery(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.fetchP2POrders() // Refresh orders
                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("already") || errorMsg.contains("completed") {
                        self?.errorMessage = "This order has already been marked as delivered."
                    } else {
                        self?.errorMessage = "Unable to mark order as delivered. Please try again."
                    }
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
        guard let idString = order.id else {
            errorMessage = "Order ID not found. Please refresh."
            showError = true
            return
        }
        guard let orderIdInt = Int(idString) else {
            #if DEBUG
            logger.error("[OrdersViewModel] Cannot parse order ID '\(idString)' as integer")
            #endif
            errorMessage = "Unable to process order. Please contact support."
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
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("invalid") || errorMsg.contains("transition") {
                        self?.errorMessage = "Cannot update order to this status."
                    } else if errorMsg.contains("already") {
                        self?.errorMessage = "This order status has already been updated."
                    } else {
                        self?.errorMessage = "Unable to update order status. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
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
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("network") || errorMsg.contains("connection") {
                        self?.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self?.errorMessage = "Unable to update status. Please try again."
                    }
                    self?.showError = true
                }
            }
        }
    }
}
