import Foundation
import CoreLocation
import Combine
import FirebaseFirestore
import FirebaseAuth

/// LocationManager handles real-time GPS tracking for delivery drivers
/// Publishes location updates and syncs with Firebase
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
    private let db = Firestore.firestore()
    private var lastLocation: CLLocation?
    private var locationUpdateTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Configuration
    private let minimumUpdateDistance: CLLocationDistance = 10 // meters
    private let firebaseUpdateInterval: TimeInterval = 5 // seconds

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

        // Start periodic Firebase updates
        startFirebaseUpdates()
    }

    /// Stop tracking driver location
    func stopTracking() {
        locationManager.stopUpdatingLocation()
        locationManager.stopUpdatingHeading()
        isTracking = false
        stopFirebaseUpdates()
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

    // MARK: - Firebase Sync

    private func startFirebaseUpdates() {
        stopFirebaseUpdates() // Clear any existing timer

        locationUpdateTimer = Timer.scheduledTimer(withTimeInterval: firebaseUpdateInterval, repeats: true) { [weak self] _ in
            self?.updateLocationInFirebase()
        }
    }

    private func stopFirebaseUpdates() {
        locationUpdateTimer?.invalidate()
        locationUpdateTimer = nil
    }

    private func updateLocationInFirebase() {
        guard let uid = Auth.auth().currentUser?.uid,
              let location = currentLocation else { return }

        let locationData: [String: Any] = [
            "currentLatitude": location.coordinate.latitude,
            "currentLongitude": location.coordinate.longitude,
            "lastActive": Int64(Date().timeIntervalSince1970 * 1000),
            "speed": speed,
            "heading": heading?.trueHeading ?? 0
        ]

        db.collection("drivers").document(uid).updateData(locationData) { error in
            if let error = error {
                print("Error updating location in Firebase: \(error)")
            }
        }
    }

    /// Update location for a specific order (for live tracking by customer)
    func updateOrderLocation(orderId: String) {
        guard let location = currentLocation else { return }

        let locationData: [String: Any] = [
            "driverLatitude": location.coordinate.latitude,
            "driverLongitude": location.coordinate.longitude,
            "driverSpeed": speed,
            "driverHeading": heading?.trueHeading ?? 0,
            "locationUpdatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        db.collection("orders").document(orderId).updateData(locationData)
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

        // Update Firebase for active orders
        if isTracking {
            updateLocationInFirebase()
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

    /// Default San Francisco coordinates for fallback
    static var sanFrancisco: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
    }
}
