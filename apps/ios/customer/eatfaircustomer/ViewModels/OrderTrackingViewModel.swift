import SwiftUI
import Combine
import EatFairShared
import CoreLocation

/// Order Tracking ViewModel - Uses P2P API with polling
@MainActor
class OrderTrackingViewModel: ObservableObject {
    @Published var currentOrder: Order?
    @Published var isLoading = false
    @Published var estimatedTime = "Calculating..."
    @Published var driverLocation: CLLocationCoordinate2D?
    @Published var errorMessage: String?

    // Full tracking data from P2P API
    @Published var fullTracking: P2PFullOrderTracking?
    @Published var timelineEvents: [P2PTimelineEvent] = []
    @Published var restaurantInfo: P2PTrackingRestaurant?
    @Published var driverInfo: P2PTrackingDriver?

    // Traffic-aware ETA data
    @Published var etaMinutes: Int?
    @Published var etaDistanceMiles: Double?
    @Published var isTrafficAwareETA: Bool = false

    private let p2pAPI = P2PAPIService.shared
    private var pollingTimer: Timer?
    private var trackingOrderId: Int?

    /// Start tracking the latest order with polling
    func listenToLatestOrder() {
        isLoading = true
        errorMessage = nil

        // Fetch orders to get the latest active one
        fetchLatestOrder()

        // Start polling for updates (every 10 seconds for active orders)
        startPolling()
    }

    /// Track a specific order by ID
    func trackOrder(orderId: Int) {
        trackingOrderId = orderId
        isLoading = true
        errorMessage = nil

        fetchOrderTracking(orderId: orderId)
        startPolling()
    }

    private func fetchLatestOrder() {
        p2pAPI.fetchActiveOrders { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                self.isLoading = false

                switch result {
                case .success(let orders):
                    // Get the most recent active order
                    if let latestP2POrder = orders.sorted(by: {
                        ($0.createdAt ?? "") > ($1.createdAt ?? "")
                    }).first {
                        self.trackingOrderId = latestP2POrder.id
                        self.updateFromP2POrder(latestP2POrder)
                    } else {
                        // No active orders, try to get the most recent order
                        self.fetchAllOrdersForLatest()
                    }

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    print("Error fetching active orders: \(error)")
                }
            }
        }
    }

    private func fetchAllOrdersForLatest() {
        p2pAPI.fetchCustomerOrders { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                switch result {
                case .success(let orders):
                    if let latestP2POrder = orders.first {
                        self.trackingOrderId = latestP2POrder.id
                        self.updateFromP2POrder(latestP2POrder)
                    }

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    print("Error fetching orders: \(error)")
                }
            }
        }
    }

    private func fetchOrderTracking(orderId: Int) {
        // First try full tracking for timeline and driver info
        fetchFullOrderTracking(orderId: orderId)

        // Also fetch basic tracking for compatibility
        p2pAPI.trackOrder(orderId: orderId) { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                self.isLoading = false

                switch result {
                case .success(let tracking):
                    self.updateFromTracking(tracking)

                case .failure:
                    // Fallback to regular order fetch
                    self.fetchOrderById(orderId: orderId)
                }
            }
        }
    }

    /// Fetch full order tracking with timeline, restaurant, and driver info
    private func fetchFullOrderTracking(orderId: Int) {
        p2pAPI.getFullOrderTracking(orderId: orderId) { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                switch result {
                case .success(let tracking):
                    self.fullTracking = tracking
                    self.timelineEvents = tracking.timeline
                    self.restaurantInfo = tracking.restaurant
                    self.driverInfo = tracking.driver

                    // Update driver location from full tracking
                    if let driverLoc = tracking.driver?.location,
                       let lat = driverLoc.latitude,
                       let lng = driverLoc.longitude {
                        self.driverLocation = CLLocationCoordinate2D(
                            latitude: lat,
                            longitude: lng
                        )
                    }

                    // Update ETA from server (traffic-aware when available)
                    if let etaData = tracking.eta {
                        // Use precise server ETA with traffic data
                        self.etaMinutes = etaData.minutes
                        self.etaDistanceMiles = etaData.distanceMiles
                        self.isTrafficAwareETA = etaData.isTrafficAware
                        self.estimatedTime = "\(etaData.minutes) mins"

                        #if DEBUG
                        print("[OrderTracking] Traffic-aware ETA: \(etaData.minutes) mins, \(etaData.distanceMiles) mi, traffic: \(etaData.isTrafficAware)")
                        #endif
                    } else if let eta = tracking.estimatedDelivery {
                        // Fallback to string-based estimate
                        self.estimatedTime = eta
                        self.isTrafficAwareETA = false
                        self.etaMinutes = nil
                        self.etaDistanceMiles = nil
                    }

                    #if DEBUG
                    print("[OrderTracking] Full tracking loaded with \(tracking.timeline.count) timeline events")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[OrderTracking] Full tracking failed: \(error.localizedDescription)")
                    #endif
                    // Basic tracking will handle updates
                }
            }
        }
    }

    private func fetchOrderById(orderId: Int) {
        p2pAPI.fetchCustomerOrders { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                switch result {
                case .success(let orders):
                    if let order = orders.first(where: { $0.id == orderId }) {
                        self.updateFromP2POrder(order)
                    }

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func updateFromP2POrder(_ p2pOrder: P2PCustomerOrder) {
        let previousStatus = currentOrder?.status
        currentOrder = p2pOrder.toOrder()

        // Update driver location if available
        if let driverLoc = p2pOrder.parsedDriverLocation {
            driverLocation = CLLocationCoordinate2D(
                latitude: driverLoc.latitude,
                longitude: driverLoc.longitude
            )
        }

        // Update estimated time if status changed
        if previousStatus != currentOrder?.status {
            updateEstimatedTime()
        }
    }

    private func updateFromTracking(_ tracking: P2POrderTracking) {
        // Update driver location
        if let lat = tracking.driverLatitude, let lng = tracking.driverLongitude {
            driverLocation = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }

        // Update estimated time
        if let eta = tracking.estimatedDeliveryTime {
            estimatedTime = eta
        } else {
            // Re-calculate ETA with new driver location
            updateEstimatedTimeFromStatus(tracking.displayStatus)
        }
    }

    private func startPolling() {
        pollingTimer?.invalidate()

        // Poll every 10 seconds for real-time feel
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self else { return }

                if let orderId = self.trackingOrderId {
                    self.fetchOrderTracking(orderId: orderId)
                } else {
                    self.fetchLatestOrder()
                }
            }
        }
    }

    func stopPolling() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    private func updateEstimatedTime() {
        guard let status = currentOrder?.status else { return }
        updateEstimatedTimeFromStatus(status)
    }

    private func updateEstimatedTimeFromStatus(_ status: String) {
        // If we have traffic-aware ETA from server, prefer that
        if isTrafficAwareETA, let mins = etaMinutes, status == "out_for_delivery" {
            estimatedTime = "\(mins) mins"
            return
        }

        // Calculate local ETA if we have driver location and delivery address
        // (only as fallback when server ETA is not available)
        if let driverLoc = driverLocation,
           let order = currentOrder,
           status == "out_for_delivery",
           !isTrafficAwareETA {
            // Calculate local ETA based on driver distance to delivery
            let deliveryCoord = CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )
            let distanceMeters = calculateDistance(from: driverLoc, to: deliveryCoord)
            let localEtaMinutes = calculateETAMinutes(distanceMeters: distanceMeters)
            estimatedTime = "\(localEtaMinutes) mins"
            return
        }

        // Fallback to status-based estimates
        switch status {
        case "Placed", "Pending":
            estimatedTime = "30-40 mins"
        case "Confirmed":
            estimatedTime = "25-35 mins"
        case "Preparing":
            estimatedTime = "20-30 mins"
        case "Ready":
            estimatedTime = "15-20 mins"
        case "out_for_delivery":
            estimatedTime = "10-15 mins"
        case "Delivered":
            estimatedTime = "Arrived"
        default:
            estimatedTime = "--"
        }
    }

    /// Calculate distance between two coordinates in meters
    private func calculateDistance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
        let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
        return fromLocation.distance(from: toLocation)
    }

    /// Calculate ETA in minutes based on distance (assuming avg speed of 25 mph in urban delivery)
    private func calculateETAMinutes(distanceMeters: Double) -> Int {
        // Average urban delivery speed: ~25 mph = ~40 km/h = ~667 m/min
        let avgSpeedMetersPerMinute: Double = 667.0
        let etaMinutes = distanceMeters / avgSpeedMetersPerMinute
        // Add 2 minutes buffer for parking, walking to door, etc.
        return max(1, Int(ceil(etaMinutes + 2)))
    }

    deinit {
        pollingTimer?.invalidate()
    }
}
