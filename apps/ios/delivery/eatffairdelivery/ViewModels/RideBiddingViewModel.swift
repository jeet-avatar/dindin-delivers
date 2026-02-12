import SwiftUI
import Combine
import EatFairShared
import CoreLocation
import os

private let logger = Logger(subsystem: "com.dollorai.delivery", category: "RideBiddingViewModel")

/// RideBiddingViewModel manages the P2P rideshare bidding workflow
/// Matches web app RideBidding.tsx functionality
/// Features: Browse requests, submit bids, manage bids, handle counter-offers
class RideBiddingViewModel: ObservableObject {
    // MARK: - Published Properties

    /// Available ride requests open for bidding
    @Published var availableRequests: [RideRequestForBidding] = []

    /// Driver's submitted bids
    @Published var myBids: [RideBid] = []

    /// Active/matched rides
    @Published var activeRides: [RideBid] = []

    /// Loading states
    @Published var isLoading = false
    @Published var isSubmittingBid = false

    /// Error handling
    @Published var errorMessage: String?
    @Published var showError = false

    /// Success message
    @Published var successMessage: String?
    @Published var showSuccess = false

    /// Selected request for bidding
    @Published var selectedRequest: RideRequestForBidding?

    /// Counter-offer handling
    @Published var pendingCounterOffers: [RideBid] = []
    @Published var selectedCounterOffer: RideBid?
    @Published var showCounterOfferSheet = false

    // MARK: - Computed Properties

    /// Bids waiting for customer response
    var pendingBids: [RideBid] {
        myBids.filter { $0.status == "pending" }
    }

    /// Bids that were accepted
    var acceptedBids: [RideBid] {
        myBids.filter { $0.status == "accepted" }
    }

    /// Bids with counter-offers from customers
    var counteredBids: [RideBid] {
        myBids.filter { $0.status == "countered" }
    }

    /// Platform connection fee
    var platformFee: Double {
        AppConfig.shared.rideshareTier1Fee
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
        refreshTimer = nil
        cancellables.removeAll()
    }

    // MARK: - Refresh Timer

    private func setupRefreshTimer() {
        // Poll every 5 seconds for real-time updates
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            self?.refreshData()
        }
    }

    func refreshData() {
        fetchAvailableRequests()
        fetchMyBids()
    }

    // MARK: - Fetch Available Ride Requests

    /// Fetches ride requests open for bidding
    func fetchAvailableRequests() {
        guard p2pService.currentDriverId != nil else {
            showErrorMessage("Please log in to view available rides")
            return
        }

        let location = LocationManager.shared.currentLocation
        let latitude = location?.coordinate.latitude ?? 0.0
        let longitude = location?.coordinate.longitude ?? 0.0

        // Use large radius if location unavailable to show all requests
        let radiusKm: Double = (location == nil) ? 50000.0 : 100.0

        p2pService.fetchAvailableRideRequests(
            latitude: latitude,
            longitude: longitude,
            radiusKm: radiusKm
        ) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let requests):
                    self?.availableRequests = requests

                case .failure(let error):
                    // Silent fail for polling - only show error on manual refresh
                    #if DEBUG
                    logger.info("[RideBiddingViewModel] fetchAvailableRequests error: \(error)")
                    #endif
                }
            }
        }
    }

    // MARK: - Fetch My Bids

    /// Fetches driver's submitted bids
    func fetchMyBids() {
        guard p2pService.currentDriverId != nil else { return }

        p2pService.fetchDriverBids { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let bids):
                    self?.myBids = bids
                    // Filter counter-offers that need response
                    self?.pendingCounterOffers = bids.filter { $0.status == "countered" }
                    // Filter active rides (accepted bids)
                    self?.activeRides = bids.filter { $0.status == "accepted" }

                case .failure(let error):
                    #if DEBUG
                    logger.info("[RideBiddingViewModel] fetchMyBids error: \(error)")
                    #endif
                }
            }
        }
    }

    // MARK: - Submit Bid

    /// Submit a competitive bid on a ride request
    func submitBid(
        requestId: Int,
        proposedPrice: Double,
        estimatedArrivalMinutes: Int,
        message: String?
    ) {
        guard p2pService.currentDriverId != nil else {
            showErrorMessage("Please log in to submit a bid")
            return
        }

        // Validate price
        guard proposedPrice > 0 else {
            showErrorMessage("Please enter a valid price")
            return
        }

        isSubmittingBid = true

        p2pService.submitRideBid(
            requestId: requestId,
            proposedPrice: proposedPrice,
            message: message,
            estimatedArrivalMinutes: estimatedArrivalMinutes
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isSubmittingBid = false

                switch result {
                case .success(let response):
                    self?.showSuccessMessage(response.message)
                    self?.refreshData()
                    // Remove from available requests since we bid on it
                    self?.availableRequests.removeAll { $0.id == requestId }

                case .failure(let error):
                    // Show the backend message directly for known blocking errors
                    let message = error.localizedDescription.lowercased()
                    if message.contains("active ride") || message.contains("active delivery") {
                        // Backend message is clear and actionable - use original case
                        self?.showErrorMessage(error.localizedDescription)
                    } else if message.contains("busy") {
                        self?.showErrorMessage("You already have active work. Complete it first before bidding.")
                    } else {
                        self?.showErrorMessage("Unable to submit your bid. Please try again.")
                    }
                    logger.error("Submit bid error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Withdraw Bid

    /// Withdraw a pending bid
    func withdrawBid(_ bid: RideBid) {
        isLoading = true

        p2pService.withdrawBid(bidId: bid.id) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.showSuccessMessage("Bid withdrawn successfully")
                    self?.myBids.removeAll { $0.id == bid.id }
                    self?.refreshData()

                case .failure(let error):
                    self?.showErrorMessage("Unable to withdraw your bid. Please try again.")
                    logger.error("Withdraw bid error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Respond to Counter-Offer

    /// Accept a customer's counter-offer
    func acceptCounterOffer(_ bid: RideBid) {
        guard let counterPrice = bid.customer_counter_price else {
            showErrorMessage("Invalid counter-offer")
            return
        }

        isLoading = true

        p2pService.respondToCounterOffer(
            bidId: bid.id,
            action: "accept",
            counterPrice: counterPrice
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    self?.showSuccessMessage("Counter-offer accepted! Ride matched.")
                    self?.showCounterOfferSheet = false
                    self?.selectedCounterOffer = nil
                    self?.refreshData()

                    // Start location tracking for this ride
                    if let rideRequest = response.ride_request {
                        LocationManager.shared.startDeliveryTracking(orderId: rideRequest.id)
                    }

                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("expired") || errorMsg.contains("no longer") {
                        self?.showErrorMessage("This offer has expired. The ride may no longer be available.")
                    } else {
                        self?.showErrorMessage("Unable to accept this offer. Please try again.")
                    }
                    logger.error("Accept counter error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Reject a customer's counter-offer
    func rejectCounterOffer(_ bid: RideBid) {
        isLoading = true

        p2pService.respondToCounterOffer(
            bidId: bid.id,
            action: "reject",
            counterPrice: nil
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.showSuccessMessage("Counter-offer rejected")
                    self?.showCounterOfferSheet = false
                    self?.selectedCounterOffer = nil
                    self?.myBids.removeAll { $0.id == bid.id }
                    self?.refreshData()

                case .failure(let error):
                    self?.showErrorMessage("Unable to reject this offer. Please try again.")
                    logger.error("Reject counter error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Submit a new counter-offer price (driver to customer)
    /// Uses the dedicated /rides/bid/{id}/driver-counter endpoint
    func submitNewCounterOffer(_ bid: RideBid, newPrice: Double) {
        isLoading = true

        p2pService.driverSubmitCounter(
            bidId: bid.id,
            counterPrice: newPrice,
            message: nil
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    if response.is_final_round == true {
                        self?.showSuccessMessage("Final offer sent! Customer must accept or reject.")
                    } else {
                        self?.showSuccessMessage("Counter-offer sent to customer")
                    }
                    self?.showCounterOfferSheet = false
                    self?.selectedCounterOffer = nil
                    self?.refreshData()

                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("limit") || errorMsg.contains("maximum") {
                        self?.showErrorMessage("You've reached the maximum counter-offers for this ride.")
                    } else {
                        self?.showErrorMessage("Unable to send your counter-offer. Please try again.")
                    }
                    logger.error("Submit counter error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Active Ride Actions

    /// Start ride (picked up passenger)
    func startRide(_ bid: RideBid) {
        guard let requestId = bid.ride_request?.id ?? Optional(bid.ride_request_id) else { return }

        isLoading = true

        p2pService.startRide(rideRequestId: requestId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.showSuccessMessage("Ride started!")
                    self?.refreshData()

                case .failure(let error):
                    self?.showErrorMessage("Unable to start the ride. Please try again.")
                    logger.error("Start ride error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Complete ride (dropped off passenger)
    func completeRide(_ bid: RideBid) {
        guard let requestId = bid.ride_request?.id ?? Optional(bid.ride_request_id) else { return }

        isLoading = true

        p2pService.completeRideRequest(rideRequestId: requestId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.showSuccessMessage("Ride completed! Earnings added.")
                    LocationManager.shared.stopDeliveryTracking()
                    self?.refreshData()

                case .failure(let error):
                    self?.showErrorMessage("Unable to complete the ride. Please try again or contact support.")
                    logger.error("Complete ride error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Helpers

    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
    }

    private func showSuccessMessage(_ message: String) {
        successMessage = message
        showSuccess = true
    }

    /// Calculate driver earnings after platform fee
    func calculateEarnings(proposedPrice: Double) -> Double {
        return max(0, proposedPrice - platformFee)
    }

    /// Format distance for display
    func formatDistance(_ km: Double?) -> String {
        guard let km = km else { return "--" }
        let miles = km * 0.621371
        return String(format: "%.1f mi", miles)
    }

    /// Format ETA for display
    func formatETA(_ minutes: Int?) -> String {
        guard let minutes = minutes else { return "--" }
        if minutes < 60 {
            return "\(minutes) min"
        } else {
            let hours = minutes / 60
            let mins = minutes % 60
            return "\(hours)h \(mins)m"
        }
    }

    /// Check if bid is expiring soon (within 5 minutes)
    func isBidExpiringSoon(_ bid: RideBid) -> Bool {
        guard let expiresAt = bid.expires_at else { return false }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let expiryDate = formatter.date(from: expiresAt) else { return false }
        let timeRemaining = expiryDate.timeIntervalSinceNow
        return timeRemaining > 0 && timeRemaining < 300 // 5 minutes
    }

    // MARK: - Competitive Pricing Helpers

    /// Calculate suggested bid options (Quick Accept 92%, Fair Price 100%, Premium 108%)
    func calculateSuggestedBids(baseFare: Double) -> (quickAccept: Double, fairPrice: Double, premium: Double) {
        let quickAccept = baseFare * 0.92  // 8% discount to win quickly
        let fairPrice = baseFare             // Market rate
        let premium = baseFare * 1.08       // 8% premium for guaranteed earnings
        return (quickAccept, fairPrice, premium)
    }

    /// Calculate earnings per mile
    func calculateEarningsPerMile(proposedPrice: Double, distanceKm: Double?) -> Double? {
        guard let distanceKm = distanceKm, distanceKm > 0 else { return nil }
        let distanceMiles = distanceKm * 0.621371
        let earnings = calculateEarnings(proposedPrice: proposedPrice)
        return earnings / distanceMiles
    }

    /// Calculate earnings per hour based on estimated trip duration
    func calculateEarningsPerHour(proposedPrice: Double, durationMinutes: Int?) -> Double? {
        guard let durationMinutes = durationMinutes, durationMinutes > 0 else { return nil }
        let earnings = calculateEarnings(proposedPrice: proposedPrice)
        let hours = Double(durationMinutes) / 60.0
        return earnings / hours
    }

    /// Calculate what percentage of the fare the driver keeps
    func calculateDriverKeepPercentage(proposedPrice: Double) -> Double {
        guard proposedPrice > 0 else { return 0 }
        let earnings = calculateEarnings(proposedPrice: proposedPrice)
        return (earnings / proposedPrice) * 100
    }

    /// Get platform fee based on fare tier
    func getPlatformFee(for fareAmount: Double) -> Double {
        return AppConfig.shared.calculateRidesharePlatformFee(fareAmount: fareAmount)
    }
}

// MARK: - Preview Helper

#if DEBUG
extension RideBiddingViewModel {
    static var preview: RideBiddingViewModel {
        let vm = RideBiddingViewModel()
        return vm
    }
}
#endif
