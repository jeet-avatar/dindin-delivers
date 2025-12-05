import SwiftUI
import Combine
import EatFairShared
import CoreLocation

/// ViewModel for customer ride requests (Uber-style ride-sharing)
/// World-class pricing: $1 platform fee + distance/time based driver earnings
class RideRequestViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var pickupAddress: RideAddressInput?
    @Published var dropoffAddress: RideAddressInput?
    @Published var notes: String = ""
    @Published var tip: Double = 0.0

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // Fare Estimation (World-class pricing)
    @Published var estimatedDistance: Double = 0.0  // miles
    @Published var estimatedDuration: Double = 0.0  // minutes
    @Published var baseFare: Double = 2.50
    @Published var distanceFee: Double = 0.0
    @Published var timeFee: Double = 0.0
    @Published var surgeMultiplier: Double = 1.0

    // Active ride tracking
    @Published var activeRide: RideRequestResponse?
    @Published var rideTracking: RideTrackingInfo?
    @Published var isRideActive = false

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

    // MARK: - Pricing Constants (matches backend - $1 ONLY platform fee)
    static let platformFeeConst: Double = 1.00      // $1 platform fee - ONLY fee to EatFair
    static let baseFareConst: Double = 2.00         // $2.00 base fare (goes to driver)
    static let perMileRate: Double = 1.00           // $1.00 per mile (goes to driver)
    static let perMinuteRate: Double = 0.15         // $0.15 per minute (goes to driver)
    static let minimumFare: Double = 5.00           // $5 minimum total fare

    // MARK: - State Tax Rates (US states)
    static let stateTaxRates: [String: Double] = [
        "AL": 0.04, "AK": 0.00, "AZ": 0.056, "AR": 0.065, "CA": 0.0725,
        "CO": 0.029, "CT": 0.0635, "DE": 0.00, "FL": 0.06, "GA": 0.04,
        "HI": 0.04, "ID": 0.06, "IL": 0.0625, "IN": 0.07, "IA": 0.06,
        "KS": 0.065, "KY": 0.06, "LA": 0.0445, "ME": 0.055, "MD": 0.06,
        "MA": 0.0625, "MI": 0.06, "MN": 0.06875, "MS": 0.07, "MO": 0.04225,
        "MT": 0.00, "NE": 0.055, "NV": 0.0685, "NH": 0.00, "NJ": 0.06625,
        "NM": 0.05125, "NY": 0.08875, "NC": 0.0475, "ND": 0.05, "OH": 0.0575,
        "OK": 0.045, "OR": 0.00, "PA": 0.06, "RI": 0.07, "SC": 0.06,
        "SD": 0.045, "TN": 0.07, "TX": 0.0625, "UT": 0.061, "VT": 0.06,
        "VA": 0.053, "WA": 0.065, "WV": 0.06, "WI": 0.05, "WY": 0.04, "DC": 0.06
    ]

    // MARK: - Computed Properties
    var platformFee: Double { Self.platformFeeConst }

    /// Tax rate based on pickup state
    var taxRate: Double {
        guard let state = pickupAddress?.state.uppercased() else { return 0.0 }
        // Handle full state names
        let stateCode = stateCodeFromName(state)
        return Self.stateTaxRates[stateCode] ?? 0.0
    }

    /// Tax amount on the fare
    var taxAmount: Double {
        fareBeforeTax * taxRate
    }

    /// Fare before tax (driver earnings + platform fee)
    var fareBeforeTax: Double {
        let driverPortion = (baseFare + distanceFee + timeFee) * surgeMultiplier
        return max(driverPortion + platformFee, Self.minimumFare)
    }

    /// Driver's earnings (90%+ of fare goes to driver!)
    var driverEarnings: Double {
        let driverPortion = (baseFare + distanceFee + timeFee) * surgeMultiplier
        return max(driverPortion, Self.minimumFare - platformFee) + tip
    }

    /// What platform earns ($1.00 ONLY)
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

    /// Convert state name to state code
    private func stateCodeFromName(_ state: String) -> String {
        let stateNames: [String: String] = [
            "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
            "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
            "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
            "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
            "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
            "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
            "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
            "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
            "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
            "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
            "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
            "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
            "WISCONSIN": "WI", "WYOMING": "WY", "DISTRICT OF COLUMBIA": "DC"
        ]
        // If already a code, return it
        if state.count == 2 { return state }
        return stateNames[state.uppercased()] ?? state
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

    // MARK: - Fare Estimation (Haversine + pricing formula)
    private func estimateFare() {
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
        distanceFee = distance * Self.perMileRate
        timeFee = duration * Self.perMinuteRate
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

        isLoading = true

        p2pService.requestRide(
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
            pickupAddress: pickup,
            dropoffAddress: dropoff,
            notes: notes.isEmpty ? nil : notes,
            tip: tip
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    self?.activeRide = response
                    self?.isRideActive = true
                    self?.currentStep = .waitingForDriver
                    self?.startTrackingRide()

                case .failure(let error):
                    self?.showErrorMessage("Failed to request ride: \(error.localizedDescription)")
                }
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
}
