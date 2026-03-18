import SwiftUI
import Combine
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.delivery", category: "DeliveryViewModel")

/// DeliveryViewModel manages all delivery-related data
/// Connected to P2P API for unified database with Customer and Restaurant apps
/// Supports both Food Delivery and Rideshare modes
/// Issues #34-38, #41-42 Fixed: Thread safety, rate limiting, input validation, offline handling
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
    /// Driver's currently MATCHED and IN_PROGRESS rideshare rides.
    /// Populated from GET /api/rides/driver/active via fetchMyActiveRides().
    @Published var myActiveRides: [RideRequestForBidding] = []
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
    /// Computed proxy — reads from OnlineStatusManager.shared (single source of truth).
    var isOnline: Bool { OnlineStatusManager.shared.isOnline }

    // MARK: - Delivery Proof Photo
    @Published var showDeliveryProofCamera = false
    @Published var pendingDeliveryOrder: Order?
    @Published var deliveryProofImage: UIImage?
    @Published var isUploadingProof = false

    // Computed property for average per trip
    var averagePerTrip: Double {
        guard todayCompletedCount > 0 else { return 0.0 }
        return todayEarnings / Double(todayCompletedCount)
    }

    // MARK: - Private Properties
    private let p2pService = P2PAPIService.shared
    private var refreshTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // Issue #34: Thread-safe access using serial queue
    private let stateQueue = DispatchQueue(label: "com.dollor.driver.deliveryvm.state")

    // Issue #36: Rate limiting for order acceptance (prevent double-tap)
    private var orderAcceptanceInProgress: Set<String> = []
    private var rateLimitInterval: TimeInterval { AppConfig.shared.orderAcceptanceRateLimitInterval }

    // Issue #41: Location update throttling
    private var lastLocationUpdate: Date = .distantPast
    private var locationUpdateMinInterval: TimeInterval { AppConfig.shared.locationUpdateMinInterval }

    // Issue #42: Offline mode handling
    private var isNetworkAvailable: Bool = true
    private var pendingActions: [(action: () -> Void, description: String)] = []

    // MARK: - Initialization
    init() {
        setupRefreshTimer()
        setupNetworkMonitoring()
    }

    /// Issue #35 Fixed: Proper cleanup in deinit
    deinit {
        refreshTimer?.invalidate()
        refreshTimer = nil
        cancellables.removeAll()
        #if DEBUG
        logger.info("[DeliveryViewModel] Deinitialized, timer and cancellables cleaned up")
        #endif
    }

    /// Issue #42: Setup network monitoring for offline mode
    private func setupNetworkMonitoring() {
        // Observe LocationManager's network status
        LocationManager.shared.$isNetworkAvailable
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isAvailable in
                self?.handleNetworkChange(isAvailable: isAvailable)
            }
            .store(in: &cancellables)
    }

    /// Issue #42: Handle network status changes
    private func handleNetworkChange(isAvailable: Bool) {
        let wasOffline = !isNetworkAvailable
        isNetworkAvailable = isAvailable

        if isAvailable && wasOffline {
            // Network restored - retry pending actions
            #if DEBUG
            logger.info("[DeliveryViewModel] Network restored, retrying \(self.pendingActions.count) pending actions")
            #endif
            let actions = pendingActions
            pendingActions.removeAll()
            for pending in actions {
                pending.action()
            }
        }
    }

    // MARK: - Refresh Timer for Real-time Updates
    private func setupRefreshTimer() {
        // Poll on driverPollingInterval (5s by default, matches Android standard — Quick-64)
        refreshTimer = Timer.scheduledTimer(withTimeInterval: AppConfig.shared.driverPollingInterval, repeats: true) { [weak self] _ in
            self?.refreshAllData()
        }
    }

    func refreshAllData() {
        fetchAvailableOrders()
        fetchMyDeliveries()
        fetchTodayCompleted()
        if driverMode == .rideShare {
            fetchAvailableRides()
            fetchMyActiveRides()
        }
    }

    // MARK: - Driver Mode Toggle
    func setDriverMode(_ mode: DriverMode) {
        driverMode = mode
        refreshAllData()
    }

    // MARK: - Online Status Toggle
    /// Delegates to OnlineStatusManager — single API call, single location tracking start/stop.
    func setOnlineStatus(_ online: Bool) {
        OnlineStatusManager.shared.setOnlineStatus(online)
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
        #if DEBUG
        print("[DeliveryViewModel] fetchAvailableOrders called")
        #endif

        p2pService.fetchAvailableDeliveryOrders { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let p2pOrders):
                    #if DEBUG
                    print("[DeliveryViewModel] fetchAvailableOrders received \(p2pOrders.count) P2P orders")
                    #endif
                    let converted = p2pOrders.compactMap { self?.convertToOrder($0) }
                    #if DEBUG
                    print("[DeliveryViewModel] fetchAvailableOrders converted to \(converted.count) Order objects")
                    #endif
                    self?.availableOrders = converted

                case .failure(let error):
                    #if DEBUG
                    print("[DeliveryViewModel] fetchAvailableOrders FAILED: \(error.localizedDescription)")
                    #endif
                    self?.handleError(error)
                }
            }
        }
    }

    // MARK: - Fetch My Deliveries
    /// Fetches orders assigned to the current driver that are not yet delivered
    func fetchMyDeliveries() {
        isLoading = true
        #if DEBUG
        print("[DeliveryViewModel] fetchMyDeliveries called")
        print("[DeliveryViewModel] currentDriverId: \(String(describing: p2pService.currentDriverId))")
        #endif

        p2pService.fetchMyDeliveries { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let p2pOrders):
                    #if DEBUG
                    print("[DeliveryViewModel] fetchMyDeliveries received \(p2pOrders.count) P2P orders from API")
                    for (i, order) in p2pOrders.prefix(5).enumerated() {
                        print("[DeliveryViewModel]   [\(i)] id=\(order.id), status=\(order.status ?? "?"), vendor=\(order.restaurantName)")
                    }
                    #endif

                    let filtered = p2pOrders.filter {
                        let status = DeliveryOrderStatus.from($0.status)
                        return status != .delivered && status != .cancelled
                    }
                    #if DEBUG
                    print("[DeliveryViewModel] After filtering (non-delivered/cancelled): \(filtered.count) orders")
                    #endif

                    self?.myDeliveries = filtered
                        .compactMap { self?.convertToOrder($0) }
                        .sorted { order1, order2 in
                            // Sort: Out for Delivery first, then Ready
                            let status1 = DeliveryOrderStatus.from(order1.status)
                            let status2 = DeliveryOrderStatus.from(order2.status)
                            let isOutForDelivery1 = status1 == .outForDelivery || status1 == .restaurantWillDeliver
                            let isOutForDelivery2 = status2 == .outForDelivery || status2 == .restaurantWillDeliver
                            if isOutForDelivery1 && !isOutForDelivery2 {
                                return true
                            }
                            return false
                        }

                    #if DEBUG
                    print("[DeliveryViewModel] myDeliveries final count: \(self?.myDeliveries.count ?? 0)")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[DeliveryViewModel] fetchMyDeliveries FAILED: \(error.localizedDescription)")
                    #endif
                    // Don't clear existing data on failure - preserve optimistic updates
                    // Only show error if we have no data at all
                    if self?.myDeliveries.isEmpty == true {
                        self?.handleError(error)
                    }
                    #if DEBUG
                    print("fetchMyDeliveries failed but preserving existing \(self?.myDeliveries.count ?? 0) orders: \(error)")
                    #endif
                }
            }
        }
    }

    // MARK: - Fetch Today's Completed Deliveries
    /// Fetches earnings from dashboard API (includes all completed deliveries + rides)
    func fetchTodayCompleted() {
        guard let driverId = p2pService.currentDriverId else {
            #if DEBUG
            print("[DeliveryViewModel] fetchTodayCompleted: No driver ID")
            #endif
            return
        }

        // Use dashboard API for accurate earnings (includes delivered orders)
        p2pService.getDriverDashboard(driverId: String(driverId)) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let dashboard):
                    // Update stats from dashboard API (accurate totals)
                    self?.todayCompletedCount = dashboard.today.deliveries
                    self?.todayEarnings = dashboard.today.grossEarnings
                    self?.todayTips = dashboard.today.tips ?? 0.0
                    self?.hoursOnline = dashboard.today.activeHours ?? 0.0
                    self?.weeklyEarnings = dashboard.thisWeek.grossEarnings
                    self?.weeklyDeliveries = dashboard.thisWeek.deliveries

                    #if DEBUG
                    print("[DeliveryViewModel] Dashboard loaded: today=\(dashboard.today.deliveries) deliveries, $\(dashboard.today.grossEarnings)")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[DeliveryViewModel] Dashboard API failed: \(error.localizedDescription)")
                    #endif
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
    /// Issue #36 Fixed: Rate limiting to prevent double-tap
    /// Issue #37 Fixed: Input sanitization for order IDs
    func acceptOrder(_ order: Order) {
        // Issue #37: Validate and sanitize order ID
        guard let orderId = order.id,
              !orderId.isEmpty,
              let orderIdInt = Int(orderId),
              orderIdInt > 0 else {
            showErrorMessage("Invalid order ID. Please try again.")
            return
        }

        // Issue #36: Rate limiting - prevent double acceptance
        let isAlreadyInProgress = stateQueue.sync { () -> Bool in
            if orderAcceptanceInProgress.contains(orderId) {
                return true
            }
            orderAcceptanceInProgress.insert(orderId)
            return false
        }

        if isAlreadyInProgress {
            #if DEBUG
            logger.info("[DeliveryViewModel] Order acceptance already in progress for order: \(orderId)")
            #endif
            return
        }

        // Issue #42: Check network availability
        guard isNetworkAvailable else {
            showErrorMessage("No network connection. Please try again when online.")
            stateQueue.sync { _ = orderAcceptanceInProgress.remove(orderId) }
            return
        }

        isLoading = true

        // Calculate ETA to restaurant for early driver notification
        let driverEtaMinutes: Int? = {
            let restaurantLat = order.restaurant.latitude
            let restaurantLon = order.restaurant.longitude

            // Only calculate if we have valid restaurant coordinates
            guard restaurantLat != 0 && restaurantLon != 0 else { return nil }

            // Calculate ETA from driver's current location to restaurant
            if let etaSeconds = LocationManager.shared.etaTo(latitude: restaurantLat, longitude: restaurantLon) {
                return max(1, Int(ceil(etaSeconds / 60))) // Convert to minutes, minimum 1 minute
            }
            return nil
        }()

        #if DEBUG
        logger.info("[DeliveryViewModel] Calculated driver ETA to restaurant: \(String(describing: driverEtaMinutes)) minutes")
        #endif

        p2pService.acceptDeliveryOrder(orderId: orderIdInt, driverEtaMinutes: driverEtaMinutes) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                // Issue #36: Remove from in-progress after delay to prevent rapid re-acceptance
                DispatchQueue.main.asyncAfter(deadline: .now() + (self?.rateLimitInterval ?? 2.0)) {
                    self?.stateQueue.sync { _ = self?.orderAcceptanceInProgress.remove(orderId) }
                }

                switch result {
                case .success:
                    // CRITICAL FIX: Immediately update local state for instant UI feedback
                    // This ensures the Active tab shows the order right away while the
                    // full refresh happens in the background (fixes timing issue where
                    // driver sees "No Active Delivery" after accepting)
                    if let self = self {
                        // Remove from available orders immediately
                        self.availableOrders.removeAll { $0.id == orderId }

                        // Add to my deliveries immediately (if not already there)
                        if !self.myDeliveries.contains(where: { $0.id == orderId }) {
                            self.myDeliveries.insert(order, at: 0)
                        }
                    }

                    // Start real-time location tracking for this order
                    LocationManager.shared.startDeliveryTracking(orderId: orderIdInt)
                    // Refresh data to reconcile with server state
                    self?.refreshAllData()

                case .failure(let error):
                    // CRITICAL: Rollback local state on API failure
                    if let self = self {
                        // Remove from myDeliveries if we optimistically added it
                        self.myDeliveries.removeAll { $0.id == orderId }
                        // Add back to available orders if it was there
                        if !self.availableOrders.contains(where: { $0.id == orderId }) {
                            self.availableOrders.insert(order, at: 0)
                        }
                    }
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("busy") || errorMsg.contains("active") {
                        self?.showErrorMessage("You already have an active delivery. Complete it first before accepting another.")
                    } else if errorMsg.contains("assigned") || errorMsg.contains("taken") {
                        self?.showErrorMessage("This order was already taken by another driver.")
                    } else {
                        self?.showErrorMessage("Unable to accept order. Please try again.")
                    }
                    logger.error("Accept order error: \(error.localizedDescription)")
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
                    self?.showErrorMessage("Unable to mark as picked up. Please try again.")
                    logger.error("Mark picked up error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Mark as Delivered (triggers photo requirement)
    /// Initiates delivery completion — backend will require a proof photo
    func markAsDelivered(_ order: Order) {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else { return }

        isLoading = true

        p2pService.completeDelivery(orderId: orderIdInt) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    if response.requiresPhoto {
                        // Backend requires proof photo — open camera
                        self?.pendingDeliveryOrder = order
                        self?.deliveryProofImage = nil
                        self?.showDeliveryProofCamera = true
                    } else {
                        // Completed without photo (e.g. photo was already uploaded)
                        LocationManager.shared.stopDeliveryTracking()
                        self?.refreshAllData()
                    }

                case .failure(let error):
                    self?.showErrorMessage("Unable to complete delivery. Please try again or contact support.")
                    logger.error("Complete delivery error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Uploads proof photo and completes the delivery
    func submitDeliveryWithProof() {
        guard let order = pendingDeliveryOrder,
              let orderId = order.id,
              let orderIdInt = Int(orderId),
              let image = deliveryProofImage else { return }

        guard let imageData = image.jpegData(compressionQuality: 0.7) else {
            showErrorMessage("Failed to process photo. Please retake.")
            return
        }

        isUploadingProof = true

        p2pService.uploadDeliveryPhoto(orderId: orderIdInt, imageData: imageData) { [weak self] result in
            DispatchQueue.main.async {
                self?.isUploadingProof = false

                switch result {
                case .success:
                    // Delivery completed with proof
                    LocationManager.shared.stopDeliveryTracking()
                    self?.pendingDeliveryOrder = nil
                    self?.deliveryProofImage = nil
                    self?.showDeliveryProofCamera = false
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to upload proof photo. Please try again.")
                    logger.error("Upload delivery proof error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Cancel the proof photo flow without completing delivery
    func cancelDeliveryProof() {
        pendingDeliveryOrder = nil
        deliveryProofImage = nil
        showDeliveryProofCamera = false
        isUploadingProof = false
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
                    self?.showErrorMessage("Unable to cancel this delivery. Please contact support if needed.")
                    logger.error("Cancel delivery error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Update Driver Location on Order
    /// Updates the driver's live location on an active order
    /// Issue #41 Fixed: Location update throttling to reduce API calls
    func updateDriverLocationOnOrder(_ order: Order, latitude: Double, longitude: Double) {
        // Issue #37: Validate order ID
        guard let orderId = order.id,
              !orderId.isEmpty,
              let orderIdInt = Int(orderId),
              orderIdInt > 0 else { return }

        // Issue #41: Throttle location updates to prevent excessive API calls
        let now = Date()
        guard now.timeIntervalSince(lastLocationUpdate) >= locationUpdateMinInterval else {
            #if DEBUG
            logger.info("[DeliveryViewModel] Location update throttled, last update was \(now.timeIntervalSince(self.lastLocationUpdate))s ago")
            #endif
            return
        }
        lastLocationUpdate = now

        // Issue #42: Skip if offline
        guard isNetworkAvailable else { return }

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
            deliveryInstructions: p2pOrder.deliveryInstructions ?? "",
            restaurant: restaurant,
            items: [],
            itemsCount: p2pOrder.itemsCount ?? 0,
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
            estimatedDeliveryTime: p2pOrder.estimatedDuration.map { Int64($0 * 60 * 1000) },
            estimatedPrepMinutes: p2pOrder.estimatedPrepMinutes,
            estimatedReadyAt: p2pOrder.estimatedReadyAt,
            minutesUntilReady: p2pOrder.minutesUntilReady,
            isReady: p2pOrder.isReady,
            driverEnRoute: p2pOrder.driverEnRoute,
            driverAcceptedAt: p2pOrder.driverAcceptedAt,
            driverEtaToRestaurant: p2pOrder.driverEtaToRestaurant,
            driverEtaText: p2pOrder.driverEtaText
        )
    }

    // MARK: - Private Helpers
    private func handleError(_ error: Error) {
        let errorMsg = error.localizedDescription.lowercased()
        if errorMsg.contains("network") || errorMsg.contains("connection") || errorMsg.contains("offline") {
            errorMessage = "Unable to connect. Please check your internet connection."
        } else if errorMsg.contains("unauthorized") || errorMsg.contains("token") {
            errorMessage = "Session expired. Please log in again."
        } else {
            errorMessage = "Something went wrong. Please try again."
        }
        showError = true
        logger.error("DeliveryViewModel error: \(error.localizedDescription)")
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

    /// Fetch MATCHED and IN_PROGRESS rides for this driver (populates myActiveRides).
    /// Calls GET /api/rides/driver/active — only runs when driverMode == .rideShare.
    func fetchMyActiveRides() {
        p2pService.fetchDriverActiveRides { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let rides):
                    self?.myActiveRides = rides
                case .failure(let error):
                    logger.error("fetchMyActiveRides error: \(error.localizedDescription)")
                    // Silently fail — myActiveRides stays at last-known value
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
                    // Fetch active rides immediately so banner appears without waiting for next poll
                    self?.fetchMyActiveRides()
                    self?.refreshAllData()

                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("busy") || errorMsg.contains("active") {
                        self?.showErrorMessage("You already have an active ride or delivery. Complete it first.")
                    } else if errorMsg.contains("taken") || errorMsg.contains("assigned") {
                        self?.showErrorMessage("This ride was already accepted by another driver.")
                    } else {
                        self?.showErrorMessage("Unable to accept this ride. Please try again.")
                    }
                    logger.error("Accept ride error: \(error.localizedDescription)")
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
                    self?.showErrorMessage("Unable to update ride status. Please try again.")
                    logger.error("Mark ride picked up error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Complete a ride (drop off passenger)
    /// Uses canonical POST /api/rides/request/{id}/complete endpoint
    func completeRide(_ ride: P2PRide) {
        isLoading = true

        p2pService.completeRideRequest(rideRequestId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    LocationManager.shared.stopDeliveryTracking()
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Unable to complete ride. Please try again or contact support.")
                    logger.error("Complete ride error: \(error.localizedDescription)")
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
                            platformFeeDriver: AppConfig.shared.calculateRidesharePlatformFee(fareAmount: counterFare),
                            platformFeeCustomer: AppConfig.shared.calculateRidesharePlatformFee(fareAmount: counterFare)
                        )
                    }

                case .failure(let error):
                    self?.showErrorMessage("Unable to submit your fare offer. Please try again.")
                    logger.error("Submit fare offer error: \(error.localizedDescription)")
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
                    self?.showErrorMessage("Unable to accept the customer's fare. Please try again.")
                    logger.error("Accept fare error: \(error.localizedDescription)")
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
