import Foundation
import CoreLocation
import Combine
import EatFairShared

/// LocationManager handles real-time GPS tracking for delivery drivers
/// Publishes location updates and syncs with P2P backend (PostgreSQL)
class LocationManager: NSObject, ObservableObject {
    static let shared = LocationManager()

    // MARK: - Published Properties
    @Published var currentLocation: CLLocation?
    @Published var currentCoordinate: CLLocationCoordinate2D?
    @Published var heading: CLHeading?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var isTracking = false
    @Published var locationError: String?
    @Published var speed: CLLocationSpeed = 0 // m/s
    @Published var distanceTraveled: CLLocationDistance = 0

    // MARK: - Private Properties
    private let locationManager = CLLocationManager()
    private let p2pService = P2PAPIService.shared
    private var lastLocation: CLLocation?
    private var locationUpdateTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // Current active order ID for location updates
    var activeOrderId: Int?

    // MARK: - Configuration
    private let minimumUpdateDistance: CLLocationDistance = 10 // meters
    private let p2pUpdateInterval: TimeInterval = 5 // seconds (update driver location to P2P backend)

    override init() {
        super.init()
        setupLocationManager()
    }

    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.distanceFilter = minimumUpdateDistance
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
        locationManager.activityType = .automotiveNavigation

        authorizationStatus = locationManager.authorizationStatus
    }

    // MARK: - Public Methods

    /// Request location permissions
    func requestPermission() {
        locationManager.requestWhenInUseAuthorization()
    }

    /// Request always-on location permission for background tracking
    func requestAlwaysPermission() {
        locationManager.requestAlwaysAuthorization()
    }

    /// Start tracking driver location
    func startTracking() {
        guard authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways else {
            requestPermission()
            return
        }

        locationManager.startUpdatingLocation()
        locationManager.startUpdatingHeading()
        isTracking = true
        distanceTraveled = 0

        // Start periodic P2P backend updates
        startP2PUpdates()
    }

    /// Stop tracking driver location
    func stopTracking() {
        locationManager.stopUpdatingLocation()
        locationManager.stopUpdatingHeading()
        isTracking = false
        stopP2PUpdates()
    }

    /// Get current location once
    func getCurrentLocation() {
        locationManager.requestLocation()
    }

    /// Calculate distance from current location to a coordinate
    func distanceTo(latitude: Double, longitude: Double) -> CLLocationDistance? {
        guard let current = currentLocation else { return nil }
        let destination = CLLocation(latitude: latitude, longitude: longitude)
        return current.distance(from: destination)
    }

    /// Calculate ETA to destination based on current speed
    func etaTo(latitude: Double, longitude: Double) -> TimeInterval? {
        guard let distance = distanceTo(latitude: latitude, longitude: longitude) else { return nil }
        let averageSpeed = speed > 0 ? speed : 8.0 // Default 8 m/s (~18 mph) if stationary
        return distance / averageSpeed
    }

    /// Format distance for display
    func formatDistance(_ meters: CLLocationDistance) -> String {
        if meters < 1000 {
            return String(format: "%.0f m", meters)
        } else {
            let miles = meters / 1609.34
            return String(format: "%.1f mi", miles)
        }
    }

    /// Format ETA for display
    func formatETA(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds / 60)
        if minutes < 1 {
            return "< 1 min"
        } else if minutes < 60 {
            return "\(minutes) min"
        } else {
            let hours = minutes / 60
            let remainingMins = minutes % 60
            return "\(hours)h \(remainingMins)m"
        }
    }

    // MARK: - P2P Backend Sync

    private func startP2PUpdates() {
        stopP2PUpdates() // Clear any existing timer

        locationUpdateTimer = Timer.scheduledTimer(withTimeInterval: p2pUpdateInterval, repeats: true) { [weak self] _ in
            self?.updateLocationInP2P()
        }
    }

    private func stopP2PUpdates() {
        locationUpdateTimer?.invalidate()
        locationUpdateTimer = nil
    }

    private func updateLocationInP2P() {
        guard let location = currentLocation else { return }

        // Update driver's general location
        p2pService.updateDriverLocation(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude
        ) { result in
            if case .failure(let error) = result {
                print("Error updating driver location in P2P: \(error)")
            }
        }

        // If there's an active order, update that order's driver location
        if let orderId = activeOrderId {
            updateOrderLocationInP2P(orderId: orderId)
        }
    }

    /// Update location for a specific order (for live tracking by customer)
    func updateOrderLocation(orderId: String) {
        guard let orderIdInt = Int(orderId) else { return }
        updateOrderLocationInP2P(orderId: orderIdInt)
    }

    /// Update location for a specific order using P2P API
    private func updateOrderLocationInP2P(orderId: Int) {
        guard let location = currentLocation else { return }

        p2pService.updateDriverLocation(
            orderId: orderId,
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude
        ) { result in
            if case .failure(let error) = result {
                print("Error updating order location in P2P: \(error)")
            }
        }
    }

    /// Start tracking for a specific delivery order
    func startDeliveryTracking(orderId: Int) {
        activeOrderId = orderId
        startTracking()
    }

    /// Stop tracking for delivery (when order is complete)
    func stopDeliveryTracking() {
        activeOrderId = nil
        stopTracking()
    }
}

// MARK: - CLLocationManagerDelegate
extension LocationManager: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        // Filter out inaccurate readings
        guard location.horizontalAccuracy >= 0 && location.horizontalAccuracy < 100 else { return }

        // Calculate distance traveled
        if let last = lastLocation {
            let distance = location.distance(from: last)
            if distance > 0 {
                distanceTraveled += distance
            }
        }

        lastLocation = location
        currentLocation = location
        currentCoordinate = location.coordinate
        speed = max(location.speed, 0)

        // Update P2P for active orders
        if isTracking {
            updateLocationInP2P()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        heading = newHeading
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationError = error.localizedDescription
        print("Location error: \(error)")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus

        switch authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            if isTracking {
                locationManager.startUpdatingLocation()
            }
        case .denied, .restricted:
            locationError = "Location access denied. Please enable in Settings."
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        authorizationStatus = status
    }
}

// MARK: - Location Extensions
// Retroactive conformance - CLLocationCoordinate2D needs Equatable for SwiftUI's onChange
extension CLLocationCoordinate2D: @retroactive Equatable {
    public static func == (lhs: CLLocationCoordinate2D, rhs: CLLocationCoordinate2D) -> Bool {
        return lhs.latitude == rhs.latitude && lhs.longitude == rhs.longitude
    }
}

extension CLLocationCoordinate2D {
    /// Returns true if coordinates are valid (not 0,0)
    var isValid: Bool {
        return latitude != 0 && longitude != 0
    }

    /// Default fallback coordinates from centralized config
    /// Only use when user location is unavailable
    static var defaultFallback: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: MapConfig.defaultLatitude,
            longitude: MapConfig.defaultLongitude
        )
    }
}
