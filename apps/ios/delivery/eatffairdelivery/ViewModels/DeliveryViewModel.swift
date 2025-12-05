import SwiftUI
import Combine
import EatFairShared

/// DeliveryViewModel manages all delivery-related data
/// Connected to P2P API for unified database with Customer and Restaurant apps
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
    private let p2pService = P2PAPIService.shared
    private var refreshTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init() {
        setupRefreshTimer()
    }

    deinit {
        refreshTimer?.invalidate()
    }

    // MARK: - Refresh Timer for Real-time Updates
    private func setupRefreshTimer() {
        // Poll every 10 seconds for updates (P2P doesn't have real-time listeners like Firebase)
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            self?.refreshAllData()
        }
    }

    func refreshAllData() {
        fetchAvailableOrders()
        fetchMyDeliveries()
        fetchTodayCompleted()
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

        p2pService.fetchAvailableDeliveryOrders { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let p2pOrders):
                    self?.availableOrders = p2pOrders.compactMap { self?.convertToOrder($0) }

                case .failure(let error):
                    self?.handleError(error)
                }
            }
        }
    }

    // MARK: - Fetch My Deliveries
    /// Fetches orders assigned to the current driver that are not yet delivered
    func fetchMyDeliveries() {
        isLoading = true

        p2pService.fetchMyDeliveries { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let p2pOrders):
                    self?.myDeliveries = p2pOrders
                        .filter {
                            let status = $0.status?.lowercased() ?? ""
                            return status != "delivered" && status != "cancelled"
                        }
                        .compactMap { self?.convertToOrder($0) }
                        .sorted { order1, order2 in
                            // Sort: Out for Delivery first, then Ready
                            if order1.status == "Out for Delivery" && order2.status != "Out for Delivery" {
                                return true
                            }
                            return false
                        }

                case .failure(let error):
                    self?.handleError(error)
                }
            }
        }
    }

    // MARK: - Fetch Today's Completed Deliveries
    /// Fetches completed deliveries for today to calculate stats
    func fetchTodayCompleted() {
        p2pService.fetchMyDeliveries { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let p2pOrders):
                    let today = Calendar.current.startOfDay(for: Date())

                    self?.completedDeliveries = p2pOrders
                        .filter { order in
                            (order.status?.lowercased() ?? "") == "delivered" &&
                            self?.isOrderFromToday(order, today: today) == true
                        }
                        .compactMap { self?.convertToOrder($0) }

                    self?.todayCompletedCount = self?.completedDeliveries.count ?? 0
                    self?.todayEarnings = self?.completedDeliveries.reduce(0) { total, order in
                        total + order.deliveryFee + order.priorityFee + order.tip
                    } ?? 0.0

                case .failure:
                    break // Silently fail for stats
                }
            }
        }
    }

    private func isOrderFromToday(_ order: P2PDeliveryOrder, today: Date) -> Bool {
        guard let deliveredAt = order.deliveredAt else { return false }
        // Parse ISO date string
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: deliveredAt) {
            return Calendar.current.isDate(date, inSameDayAs: today)
        }
        // Try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: deliveredAt) {
            return Calendar.current.isDate(date, inSameDayAs: today)
        }
        return false
    }

    // MARK: - Accept Order
    /// Driver accepts an order for delivery
    func acceptOrder(_ order: Order) {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else {
            showErrorMessage("Unable to accept order. Please try again.")
            return
        }

        isLoading = true

        p2pService.acceptDeliveryOrder(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    // Start real-time location tracking for this order
                    LocationManager.shared.startDeliveryTracking(orderId: orderIdInt)
                    // Refresh data to show updated orders
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to accept order: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Mark as Delivered
    /// Marks an order as delivered
    func markAsDelivered(_ order: Order) {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else { return }

        isLoading = true

        p2pService.completeDelivery(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    // Stop location tracking since delivery is complete
                    LocationManager.shared.stopDeliveryTracking()
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to complete delivery: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Cancel Delivery
    /// Driver cancels/unassigns from a delivery
    func cancelDelivery(_ order: Order) {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else { return }

        isLoading = true

        p2pService.cancelDeliveryAssignment(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to cancel delivery: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Update Driver Location on Order
    /// Updates the driver's live location on an active order
    func updateDriverLocationOnOrder(_ order: Order, latitude: Double, longitude: Double) {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else { return }

        p2pService.updateDriverLocation(
            orderId: orderIdInt,
            latitude: latitude,
            longitude: longitude
        ) { _ in
            // Silent update, no need to handle response
        }
    }

    // MARK: - Convert P2PDeliveryOrder to Order
    private func convertToOrder(_ p2pOrder: P2PDeliveryOrder) -> Order {
        let restaurant = RestaurantInfo(
            id: String(p2pOrder.orderId),
            name: p2pOrder.restaurantName,
            address: p2pOrder.restaurantAddress,
            latitude: p2pOrder.pickupLatitude ?? 0,
            longitude: p2pOrder.pickupLongitude ?? 0,
            imageUrl: ""
        )

        // Use the computed property that handles both string and object formats
        let addressString = p2pOrder.deliveryAddressString
        let deliveryAddress = DeliveryAddress(
            fullAddress: addressString,
            street: p2pOrder.deliveryAddressObj?.street ?? addressString,
            city: p2pOrder.deliveryAddressObj?.city ?? "",
            state: p2pOrder.deliveryAddressObj?.state ?? "",
            zipCode: p2pOrder.deliveryAddressObj?.zip ?? "",
            latitude: p2pOrder.dropoffLatitude ?? 0,
            longitude: p2pOrder.dropoffLongitude ?? 0
        )

        // Map P2P status to app status
        let status: String
        let orderStatus = p2pOrder.status?.lowercased() ?? "ready"
        switch orderStatus {
        case "ready", "ready_for_pickup":
            status = "Ready"
        case "picked_up", "out_for_delivery":
            status = "Out for Delivery"
        case "delivered":
            status = "Delivered"
        case "cancelled":
            status = "Cancelled"
        default:
            status = p2pOrder.status?.capitalized ?? "Ready"
        }

        let totalEarnings = p2pOrder.totalEarnings ?? (p2pOrder.deliveryFee + (p2pOrder.tip ?? 0))

        return Order(
            id: String(p2pOrder.id),
            orderId: p2pOrder.orderNumber,
            customerId: "",
            customerName: p2pOrder.customerName ?? "Customer",
            customerPhone: p2pOrder.customerPhone,
            customerEmail: "",
            deliveryAddress: deliveryAddress,
            deliveryInstructions: "",
            restaurant: restaurant,
            items: [],
            itemsCount: 0,
            subtotal: 0,
            deliveryFee: p2pOrder.deliveryFee,
            serviceFee: 0,
            priorityFee: 0,
            smallOrderFee: 0,
            tax: 0,
            taxRate: 0,
            tip: p2pOrder.tip ?? 0,
            total: totalEarnings,
            status: status,
            placedAt: Int64(Date().timeIntervalSince1970 * 1000),
            estimatedDeliveryTime: p2pOrder.estimatedDuration.map { Int64($0 * 60 * 1000) }
        )
    }

    // MARK: - Private Helpers
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
    static var preview: DeliveryViewModel {
        let vm = DeliveryViewModel()
        return vm
    }
}
#endif
