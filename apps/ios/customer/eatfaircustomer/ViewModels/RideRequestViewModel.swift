import SwiftUI
import Combine
import EatFairShared
import CoreLocation

/// ViewModel for P2P rideshare matchmaking
/// Dollor.ai connects riders with independent drivers - NOT a TNC service
/// $1 connection fee for using our matchmaking platform
class RideRequestViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var pickupAddress: RideAddressInput?
    @Published var dropoffAddress: RideAddressInput?
    @Published var notes: String = ""
    @Published var tip: Double = 0.0

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // Suggested Offer Calculation (for matchmaking)
    @Published var estimatedDistance: Double = 0.0  // miles
    @Published var estimatedDuration: Double = 0.0  // minutes
    @Published var baseFare: Double = AppConfig.shared.rideBaseFare
    @Published var distanceFee: Double = 0.0
    @Published var timeFee: Double = 0.0
    @Published var surgeMultiplier: Double = 1.0  // Demand indicator only

    // Active ride tracking
    @Published var activeRide: RideRequestResponse?
    @Published var rideTracking: RideTrackingInfo?
    @Published var isRideActive = false

    // Fare Negotiation ($1+$1 platform fee model)
    @Published var isNegotiating = false
    @Published var driverOfferAmount: Double?
    @Published var showNegotiationSheet = false
    @Published var negotiationMessage: String?
    @Published var initialFareOffer: Double? = nil  // Customer's initial offer before request

    // Ride Cancellation
    @Published var showCancelSheet = false
    @Published var cancellationFee: Double = 0.0
    @Published var cancellationReason: String = ""

    // Payment
    @Published var paymentIntentClientSecret: String?
    @Published var showPaymentSheet = false

    // UI State
    @Published var currentStep: RideRequestStep = .selectPickup

    enum RideRequestStep {
        case selectPickup
        case selectDropoff
        case confirmRide
        case waitingForDriver
        case driverEnRoute
        case rideInProgress
        case completed
    }

    // MARK: - Private Properties
    private let p2pService = P2PAPIService.shared
    private var trackingTimer: Timer?
    private var negotiationTimer: Timer?

    // MARK: - Pricing Constants (from AppConfig - matches backend pricing_config.py)
    // All pricing values come from centralized AppConfig - no hardcodes!
    private let config = AppConfig.shared

    // MARK: - Computed Properties (from AppConfig)
    // Platform fee is FARE-BASED (tiered by fare value):
    //   Fares ≤$35: $1, $35-$70: $2, >$70: $3
    //   Both rider AND driver pay this same fee

    /// Estimated fare for tier calculation (driver portion before platform fee)
    private var fareForTierCalculation: Double {
        let driverPortion = (baseFare + distanceFee + timeFee) * surgeMultiplier
        return max(driverPortion, minimumFare)
    }

    var platformFee: Double {
        // Calculate platform fee based on FARE (not distance)
        return config.calculateRidesharePlatformFee(fareAmount: fareForTierCalculation)
    }

    /// Platform fee description for UI display (fare-based)
    var platformFeeTierDescription: String {
        return config.getRideshareFeeDescription(fareAmount: fareForTierCalculation)
    }

    /// Driver's platform fee (same as rider)
    var driverPlatformFee: Double {
        return platformFee
    }

    var baseFareConst: Double { config.rideBaseFare }
    var perMileRate: Double { config.ridePerMileRate }
    var perMinuteRate: Double { config.ridePerMinuteRate }
    var minimumFare: Double { config.rideMinFare }
    var cancellationFeeAmount: Double { config.rideCancellationFee }

    /// Tax rate based on pickup state (from centralized StateTaxRates)
    var taxRate: Double {
        guard let state = pickupAddress?.state else { return 0.0 }
        let stateCode = StateTaxRates.stateCode(from: state)
        return StateTaxRates.rate(for: stateCode)
    }

    /// Tax amount on the fare
    var taxAmount: Double {
        fareBeforeTax * taxRate
    }

    /// Fare before tax (driver earnings + platform fee)
    var fareBeforeTax: Double {
        let driverPortion = (baseFare + distanceFee + timeFee) * surgeMultiplier
        return max(driverPortion + platformFee, minimumFare)
    }

    /// What driver receives (fare - driver's platform fee + tip)
    /// Driver pays tiered fee based on fare: $1 (≤$35), $2 ($35-$70), $3 (>$70)
    var driverEarnings: Double {
        let driverPortion = (baseFare + distanceFee + timeFee) * surgeMultiplier
        let fare = max(driverPortion, minimumFare)
        return fare - driverPlatformFee + tip
    }

    /// Connection fee for matchmaking service (tiered: $1-$3 based on fare)
    var platformEarnings: Double {
        platformFee
    }

    /// Total fare before tip (includes tax)
    var subtotal: Double {
        fareBeforeTax + taxAmount
    }

    /// Total amount customer pays
    var totalAmount: Double {
        subtotal + tip
    }

    /// Estimated fare (used in UI before tip)
    var estimatedFare: Double {
        fareBeforeTax + taxAmount
    }

    var canRequestRide: Bool {
        pickupAddress != nil && dropoffAddress != nil
    }

    /// Formatted estimated time
    var estimatedTimeText: String {
        if estimatedDuration > 0 {
            return "\(Int(estimatedDuration)) min"
        }
        return "--"
    }

    /// Formatted estimated distance
    var estimatedDistanceText: String {
        if estimatedDistance > 0 {
            return String(format: "%.1f mi", estimatedDistance)
        }
        return "--"
    }

    // MARK: - Initialization
    init() {}

    deinit {
        trackingTimer?.invalidate()
        negotiationTimer?.invalidate()
    }

    // MARK: - Set Pickup Location
    func setPickupLocation(street: String, city: String, state: String, zip: String, lat: Double, lng: Double) {
        pickupAddress = RideAddressInput(
            street: street,
            city: city,
            state: state,
            zip: zip,
            lat: lat,
            lng: lng
        )
        currentStep = .selectDropoff
    }

    // MARK: - Set Dropoff Location
    func setDropoffLocation(street: String, city: String, state: String, zip: String, lat: Double, lng: Double) {
        dropoffAddress = RideAddressInput(
            street: street,
            city: city,
            state: state,
            zip: zip,
            lat: lat,
            lng: lng
        )
        currentStep = .confirmRide

        // Calculate fare estimate
        estimateFare()
    }

    // MARK: - Fare Estimation (from Staging API - consistent with Android)
    /// Fetches fare estimate from staging API instead of local calculation
    /// This ensures consistent pricing between iOS and Android platforms
    private func estimateFare() {
        guard let pickup = pickupAddress, let dropoff = dropoffAddress else { return }

        isLoading = true

        // Get state code for tax calculation
        let stateCode = StateTaxRates.stateCode(from: pickup.state)

        // Call staging API for fare estimate (same endpoint as Android)
        p2pService.estimateRideFare(
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            dropoffLat: dropoff.lat,
            dropoffLng: dropoff.lng,
            stateCode: stateCode
        ) { [weak self] result in
            guard let self = self else { return }
            self.isLoading = false

            switch result {
            case .success(let response):
                let estimate = response.estimate
                // Update published properties from API response
                self.estimatedDistance = estimate.distanceMiles
                self.estimatedDuration = estimate.durationMinutes
                self.baseFare = estimate.breakdown.baseFare
                self.distanceFee = estimate.breakdown.distanceCost
                self.timeFee = estimate.breakdown.timeCost

                #if DEBUG
                print("[RideRequestViewModel] Fare estimate from staging API:")
                print("  Distance: \(estimate.distanceMiles) miles")
                print("  Duration: \(estimate.durationMinutes) min")
                print("  Total: $\(estimate.total)")
                print("  Platform fee: $\(estimate.platformFee)")
                #endif

            case .failure(let error):
                #if DEBUG
                print("[RideRequestViewModel] Fare estimate API error: \(error)")
                #endif
                // Fallback to local calculation if API fails
                self.estimateFareLocally()
            }
        }
    }

    /// Fallback local calculation if API is unavailable
    private func estimateFareLocally() {
        guard let pickup = pickupAddress, let dropoff = dropoffAddress else { return }

        // Calculate distance using Haversine formula
        let distance = haversineDistance(
            lat1: pickup.lat, lon1: pickup.lng,
            lat2: dropoff.lat, lon2: dropoff.lng
        )

        // Estimate duration (25 mph average urban speed + 20% buffer)
        let duration = (distance / 25.0) * 60 * 1.2

        // Update published properties
        estimatedDistance = distance
        estimatedDuration = duration
        distanceFee = distance * perMileRate
        timeFee = duration * perMinuteRate

        #if DEBUG
        print("[RideRequestViewModel] Using local fallback calculation")
        #endif
    }

    /// Haversine formula to calculate distance between two coordinates
    private func haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let R = 3959.0 // Earth's radius in miles

        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180

        let a = sin(dLat/2) * sin(dLat/2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLon/2) * sin(dLon/2)

        let c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c
    }

    // MARK: - Request Ride
    func requestRide(customerName: String, customerEmail: String, customerPhone: String) {
        guard let pickup = pickupAddress, let dropoff = dropoffAddress else {
            showErrorMessage("Please select pickup and dropoff locations")
            return
        }

        // Get customer ID from UserDefaults (set during login)
        let customerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        guard customerId > 0 else {
            showErrorMessage("Please login to request a ride")
            return
        }

        isLoading = true

        p2pService.requestRide(
            customerId: customerId,
            pickupAddress: pickup,
            dropoffAddress: dropoff,
            notes: notes.isEmpty ? nil : notes,
            preferredPrice: initialFareOffer
        ) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }

                switch result {
                case .success(let response):
                    self.activeRide = response
                    self.isRideActive = true
                    self.currentStep = .waitingForDriver
                    self.startTrackingRide()

                    // If customer set an initial fare offer, submit it automatically
                    if let initialOffer = self.initialFareOffer {
                        self.submitInitialFareOffer(rideId: response.rideId, offer: initialOffer)
                    } else {
                        self.isLoading = false
                    }

                case .failure(let error):
                    self.isLoading = false
                    self.showErrorMessage("Failed to request ride: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Submit initial fare offer after ride creation (for pre-request negotiation)
    private func submitInitialFareOffer(rideId: Int, offer: Double) {
        p2pService.customerSubmitFareOffer(rideId: rideId, proposedFare: offer) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isLoading = false

                switch result {
                case .success(let response):
                    self.isNegotiating = true
                    self.negotiationMessage = "Your offer of $\(String(format: "%.2f", offer)) sent to drivers"

                    if response.status == "accepted" {
                        self.negotiationMessage = "Fare accepted! Driver is on the way."
                        self.isNegotiating = false
                    } else {
                        // Start polling for driver response
                        self.startNegotiationPolling()
                    }

                case .failure(let error):
                    // Negotiation failed but ride is still active
                    self.negotiationMessage = "Offer could not be sent: \(error.localizedDescription)"
                }

                // Clear the initial offer
                self.initialFareOffer = nil
            }
        }
    }

    // MARK: - Track Ride
    private func startTrackingRide() {
        trackingTimer?.invalidate()
        trackingTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            self?.fetchRideStatus()
        }
        // Fetch immediately
        fetchRideStatus()
    }

    private func fetchRideStatus() {
        guard let rideId = activeRide?.rideId else { return }

        p2pService.trackMyRide(rideId: rideId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let tracking):
                    self?.rideTracking = tracking
                    self?.updateRideStep(from: tracking.status)

                case .failure:
                    // Silent failure for tracking
                    break
                }
            }
        }
    }

    private func updateRideStep(from status: String) {
        switch status.lowercased() {
        case "preparing", "waiting_for_driver":
            currentStep = .waitingForDriver
        case "out_for_delivery", "driver_assigned":
            currentStep = .driverEnRoute
        case "picked_up", "in_progress":
            currentStep = .rideInProgress
        case "delivered", "completed":
            currentStep = .completed
            stopTracking()
        default:
            break
        }
    }

    private func stopTracking() {
        trackingTimer?.invalidate()
        trackingTimer = nil
        stopNegotiationPolling()
    }

    // MARK: - Negotiation Status Polling

    /// Start polling for negotiation status updates (driver counter-offers)
    private func startNegotiationPolling() {
        negotiationTimer?.invalidate()
        negotiationTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            self?.fetchNegotiationStatus()
        }
        // Fetch immediately
        fetchNegotiationStatus()
    }

    /// Stop negotiation polling
    private func stopNegotiationPolling() {
        negotiationTimer?.invalidate()
        negotiationTimer = nil
    }

    /// Fetch current negotiation status from backend
    private func fetchNegotiationStatus() {
        guard let rideId = activeRide?.rideId, isNegotiating else { return }

        p2pService.getRideNegotiationStatus(rideId: rideId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let status):
                    self?.handleNegotiationStatusUpdate(status)

                case .failure:
                    // Silent failure for polling
                    break
                }
            }
        }
    }

    /// Handle negotiation status update from backend
    private func handleNegotiationStatusUpdate(_ status: RideNegotiationStatus) {
        switch status.negotiationStatus.lowercased() {
        case "driver_countered":
            // Driver has submitted a counter-offer
            if let driverOffer = status.driverOffer, driverOffer != driverOfferAmount {
                driverOfferAmount = driverOffer
                negotiationMessage = "Driver counter-offered $\(String(format: "%.2f", driverOffer))"
                showNegotiationSheet = true
            }

        case "accepted":
            // Negotiation accepted - fare agreed!
            isNegotiating = false
            stopNegotiationPolling()
            if let agreedFare = status.agreedFare {
                negotiationMessage = "Fare agreed at $\(String(format: "%.2f", agreedFare))! Driver is on the way."
            } else {
                negotiationMessage = "Fare accepted! Driver is on the way."
            }
            showNegotiationSheet = false

        case "rejected":
            // Negotiation rejected
            isNegotiating = false
            stopNegotiationPolling()
            negotiationMessage = status.message ?? "Negotiation was not accepted"
            driverOfferAmount = nil

        case "customer_offered":
            // Waiting for driver response
            negotiationMessage = "Waiting for driver's response..."

        case "none":
            // No active negotiation
            break

        default:
            break
        }
    }

    // MARK: - Reset
    func resetRide() {
        stopTracking()
        pickupAddress = nil
        dropoffAddress = nil
        notes = ""
        tip = 0.0
        activeRide = nil
        rideTracking = nil
        isRideActive = false
        currentStep = .selectPickup
    }

    // MARK: - Helpers
    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
    }

    // MARK: - Ride Cancellation

    /// Cancel ride with calculated fee
    func cancelRide(reason: String?) {
        guard let rideId = activeRide?.rideId else {
            showErrorMessage("No active ride to cancel")
            return
        }

        isLoading = true
        cancellationReason = reason ?? ""

        p2pService.cancelRide(rideId: rideId, reason: reason) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    self?.cancellationFee = response.cancellationFee
                    if response.cancellationFee > 0 {
                        self?.negotiationMessage = "Cancelled with $\(String(format: "%.2f", response.cancellationFee)) fee"
                    }
                    self?.resetRide()

                case .failure(let error):
                    self?.showErrorMessage("Failed to cancel: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Get estimated cancellation fee based on ride status (from AppConfig)
    var estimatedCancellationFee: Double {
        // Fee structure from centralized config
        switch currentStep {
        case .waitingForDriver:
            return 0.0  // Free cancellation
        case .driverEnRoute:
            return config.rideCancellationFeeDriverEnRoute  // Driver assigned
        case .rideInProgress:
            return config.rideCancellationFeeInProgress  // Ride in progress
        default:
            return 0.0
        }
    }

    // MARK: - Fare Negotiation ($1+$1 Platform Fee Model)

    /// Submit counter-offer for fare
    func submitFareOffer(proposedFare: Double) {
        guard let rideId = activeRide?.rideId else {
            showErrorMessage("No active ride to negotiate")
            return
        }

        isLoading = true
        isNegotiating = true

        p2pService.customerSubmitFareOffer(rideId: rideId, proposedFare: proposedFare) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    if response.status == "accepted" {
                        self?.negotiationMessage = "Fare accepted! Driver is on the way."
                        self?.isNegotiating = false
                        self?.showNegotiationSheet = false
                        self?.stopNegotiationPolling()
                    } else {
                        self?.driverOfferAmount = response.driverOffer
                        self?.negotiationMessage = response.message ?? "Waiting for driver response..."
                        // Start polling for driver's counter-offer
                        self?.startNegotiationPolling()
                    }

                case .failure(let error):
                    self?.isNegotiating = false
                    self?.showErrorMessage("Negotiation failed: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Accept driver's counter-offer
    func acceptDriverOffer() {
        guard let rideId = activeRide?.rideId,
              let driverOffer = driverOfferAmount else {
            showErrorMessage("No driver offer to accept")
            return
        }

        isLoading = true

        p2pService.customerAcceptDriverFare(rideId: rideId, acceptedFare: driverOffer) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.isNegotiating = false
                    self?.showNegotiationSheet = false
                    self?.stopNegotiationPolling()
                    self?.negotiationMessage = "Fare agreed at $\(String(format: "%.2f", driverOffer))! Driver is on the way."
                    self?.driverOfferAmount = nil

                case .failure(let error):
                    self?.showErrorMessage("Failed to accept: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Decline driver's offer and optionally submit counter
    func declineDriverOffer() {
        driverOfferAmount = nil
        negotiationMessage = "Offer declined. Submit a new counter-offer."
    }

    // MARK: - Stripe Payment

    /// Create payment intent for ride
    func createPaymentIntent() {
        guard let rideId = activeRide?.rideId else {
            showErrorMessage("No active ride for payment")
            return
        }

        isLoading = true

        p2pService.createRidePaymentIntent(rideId: rideId, amount: totalAmount) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    self?.paymentIntentClientSecret = response.clientSecret
                    self?.showPaymentSheet = true

                case .failure(let error):
                    self?.showErrorMessage("Payment setup failed: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Confirm payment completed
    func confirmPayment(paymentIntentId: String) {
        guard let rideId = activeRide?.rideId else { return }

        isLoading = true

        p2pService.confirmRidePayment(rideId: rideId, paymentIntentId: paymentIntentId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let confirmation):
                    self?.negotiationMessage = confirmation.message ?? "Payment successful!"

                case .failure(let error):
                    self?.showErrorMessage("Payment confirmation failed: \(error.localizedDescription)")
                }
            }
        }
    }
}
