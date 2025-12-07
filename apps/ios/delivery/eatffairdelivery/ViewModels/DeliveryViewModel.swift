import SwiftUI
import Combine
import EatFairShared

/// DeliveryViewModel manages all delivery-related data
/// Connected to P2P API for unified database with Customer and Restaurant apps
/// Supports both Food Delivery and Rideshare modes
class DeliveryViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var availableOrders: [Order] = []
    @Published var myDeliveries: [Order] = []
    @Published var completedDeliveries: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - Rideshare Support
    @Published var availableRides: [P2PRide] = []
    @Published var myActiveRides: [P2PRide] = []
    @Published var driverMode: DriverMode = .foodDelivery

    // MARK: - Negotiation Support (Rideshare Only)
    @Published var pendingNegotiations: [RideNegotiation] = []
    @Published var activeNegotiation: RideNegotiation?
    @Published var showNegotiationSheet = false

    // MARK: - Stats (computed from real data)
    @Published var todayCompletedCount = 0
    @Published var todayEarnings: Double = 0.0
    @Published var todayTips: Double = 0.0
    @Published var hoursOnline: Double = 0.0
    @Published var weeklyEarnings: Double = 0.0
    @Published var weeklyDeliveries: Int = 0
    @Published var isOnline: Bool = false

    // Computed property for average per trip
    var averagePerTrip: Double {
        guard todayCompletedCount > 0 else { return 0.0 }
        return todayEarnings / Double(todayCompletedCount)
    }

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
        if driverMode == .rideShare {
            fetchAvailableRides()
        }
    }

    // MARK: - Driver Mode Toggle
    func setDriverMode(_ mode: DriverMode) {
        driverMode = mode
        refreshAllData()
    }

    // MARK: - Online Status Toggle
    func setOnlineStatus(_ online: Bool) {
        guard let driverId = p2pService.currentDriverId else {
            VoiceAssistantManager.shared.speak("Unable to update status. Please log in again.")
            return
        }

        isOnline = online
        // Update backend with driver online status
        p2pService.updateDriverOnlineStatus(driverId: driverId, isOnline: online) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    VoiceAssistantManager.shared.speak(online ? "You are now online and receiving orders" : "You are now offline")
                case .failure:
                    self?.isOnline = !online // Revert on failure
                    self?.handleError(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to update online status"]))
                }
            }
        }
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
                            let status = DeliveryOrderStatus.from($0.status)
                            return status != .delivered && status != .cancelled
                        }
                        .compactMap { self?.convertToOrder($0) }
                        .sorted { order1, order2 in
                            // Sort: Out for Delivery first, then Ready
                            let status1 = DeliveryOrderStatus.from(order1.status)
                            let status2 = DeliveryOrderStatus.from(order2.status)
                            let isOutForDelivery1 = status1 == .outForDelivery || status1 == .pickedUp
                            let isOutForDelivery2 = status2 == .outForDelivery || status2 == .pickedUp
                            if isOutForDelivery1 && !isOutForDelivery2 {
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
                            DeliveryOrderStatus.from(order.status) == .delivered &&
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

    // MARK: - Mark as Picked Up
    /// Marks an order as picked up from restaurant (status: Ready -> Out for Delivery)
    func markAsPickedUp(_ order: Order) {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else {
            showErrorMessage("Unable to mark as picked up. Please try again.")
            return
        }

        isLoading = true

        p2pService.markOrderPickedUp(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to mark as picked up: \(error.localizedDescription)")
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

        // Map P2P status to app status using enum
        let status = DeliveryOrderStatus.from(p2pOrder.status).displayName

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
        #if DEBUG
        print("DeliveryViewModel Error: \(error.localizedDescription)")
        #endif
        errorMessage = error.localizedDescription
        showError = true
    }

    private func showErrorMessage(_ message: String) {
        DispatchQueue.main.async {
            self.errorMessage = message
            self.showError = true
        }
    }

    // MARK: - Rideshare Methods

    /// Fetch available rides for drivers
    func fetchAvailableRides() {
        isLoading = true

        p2pService.fetchAvailableRides { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let rides):
                    self?.availableRides = rides

                case .failure(let error):
                    self?.handleError(error)
                }
            }
        }
    }

    /// Accept a ride request
    func acceptRide(_ ride: P2PRide) {
        isLoading = true

        p2pService.acceptRide(rideId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    // Start location tracking for this ride
                    LocationManager.shared.startDeliveryTracking(orderId: ride.rideId)
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to accept ride: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Mark passenger as picked up
    func markRidePickedUp(_ ride: P2PRide) {
        isLoading = true

        p2pService.ridePickedUp(rideId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to mark ride as picked up: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Complete a ride (drop off passenger)
    func completeRide(_ ride: P2PRide) {
        isLoading = true

        p2pService.completeRide(rideId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    LocationManager.shared.stopDeliveryTracking()
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to complete ride: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Fare Negotiation (Rideshare Only - $1+$1 Platform Fee Model)

    /// Submit a counter-offer for a ride fare
    func submitCounterOffer(rideId: Int, counterFare: Double) {
        isLoading = true

        // Negotiation: Driver offers a fare, customer can accept or counter
        // Platform charges $1 to driver + $1 to customer = $2 total (unique selling point!)
        p2pService.submitFareNegotiation(
            rideId: rideId,
            proposedFare: counterFare,
            isDriverOffer: true
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    if response.status == "accepted" {
                        // Fare accepted - ride will proceed
                        self?.refreshAllData()
                    } else {
                        // Counter-offer submitted, waiting for customer response
                        self?.activeNegotiation = RideNegotiation(
                            rideId: rideId,
                            customerOffer: response.customerOffer,
                            driverOffer: counterFare,
                            status: response.status,
                            platformFeeDriver: AppConfig.shared.ridePlatformFee,
                            platformFeeCustomer: AppConfig.shared.ridePlatformFee
                        )
                    }

                case .failure(let error):
                    self?.showErrorMessage("Failed to submit offer: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Accept customer's proposed fare
    func acceptCustomerFare(rideId: Int, fare: Double) {
        isLoading = true

        p2pService.acceptFareNegotiation(rideId: rideId, acceptedFare: fare) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.activeNegotiation = nil
                    self?.showNegotiationSheet = false
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to accept fare: \(error.localizedDescription)")
                }
            }
        }
    }
}

// MARK: - Ride Negotiation Model
struct RideNegotiation: Identifiable {
    let id = UUID()
    let rideId: Int
    let customerOffer: Double
    let driverOffer: Double?
    let status: String // "pending", "counter_offered", "accepted", "rejected"
    let platformFeeDriver: Double // $1
    let platformFeeCustomer: Double // $1

    var totalPlatformFee: Double { platformFeeDriver + platformFeeCustomer } // $2 total
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
