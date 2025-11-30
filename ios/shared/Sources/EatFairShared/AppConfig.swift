import Foundation
import FirebaseFirestore

/// Centralized configuration for all EatFair apps
/// All configurable values should be fetched from Firebase Remote Config or Firestore
public class AppConfig: ObservableObject {
    public static let shared = AppConfig()

    // MARK: - Published Properties (fetched from Firebase)
    @Published public var taxRate: Double = 0.10
    @Published public var baseDeliveryFee: Double = 5.0
    @Published public var extraStopFee: Double = 2.0
    @Published public var platformFeePerRestaurant: Double = 1.0
    @Published public var maxRestaurantsPerOrder: Int = 3
    @Published public var serviceFeeRate: Double = 0.05
    @Published public var smallOrderThreshold: Double = 10.0
    @Published public var smallOrderFee: Double = 2.0

    // Driver/Delivery Config
    @Published public var defaultTipRate: Double = 0.15
    @Published public var nearbyDistanceMeters: Double = 3218.69 // 2 miles
    @Published public var maxDeliveryDistanceMiles: Double = 10.0

    // Restaurant Commission
    @Published public var restaurantCommissionRate: Double = 0.15

    // AI/Analytics Thresholds
    @Published public var busyLevelThresholds: BusyLevelThresholds = BusyLevelThresholds()
    @Published public var defaultPrepTimeMinutes: Int = 20
    @Published public var maxPrepTimeMinutes: Int = 60
    @Published public var additionalPrepTimePerOrder: Int = 3

    // Support
    @Published public var supportUrl: String = "https://support.eatfair.com"
    @Published public var supportPhone: String = "+1-800-EATFAIR"
    @Published public var supportEmail: String = "support@eatfair.com"

    // Feature Flags
    @Published public var isDummyPaymentMode: Bool = true
    @Published public var isAIFeaturesEnabled: Bool = true
    @Published public var isDynamicPricingEnabled: Bool = false

    private let db = Firestore.firestore()
    private var configLoaded = false

    private init() {}

    // MARK: - Fetch Configuration from Firebase

    public func fetchConfig(completion: ((Bool) -> Void)? = nil) {
        db.collection("config").document("app").getDocument { [weak self] snapshot, error in
            guard let self = self, let data = snapshot?.data() else {
                print("AppConfig: Failed to fetch config - \(error?.localizedDescription ?? "No data")")
                completion?(false)
                return
            }

            DispatchQueue.main.async {
                // Fees
                self.taxRate = data["taxRate"] as? Double ?? 0.10
                self.baseDeliveryFee = data["baseDeliveryFee"] as? Double ?? 5.0
                self.extraStopFee = data["extraStopFee"] as? Double ?? 2.0
                self.platformFeePerRestaurant = data["platformFeePerRestaurant"] as? Double ?? 1.0
                self.maxRestaurantsPerOrder = data["maxRestaurantsPerOrder"] as? Int ?? 3
                self.serviceFeeRate = data["serviceFeeRate"] as? Double ?? 0.05
                self.smallOrderThreshold = data["smallOrderThreshold"] as? Double ?? 10.0
                self.smallOrderFee = data["smallOrderFee"] as? Double ?? 2.0

                // Delivery
                self.defaultTipRate = data["defaultTipRate"] as? Double ?? 0.15
                self.nearbyDistanceMeters = data["nearbyDistanceMeters"] as? Double ?? 3218.69
                self.maxDeliveryDistanceMiles = data["maxDeliveryDistanceMiles"] as? Double ?? 10.0

                // Restaurant
                self.restaurantCommissionRate = data["restaurantCommissionRate"] as? Double ?? 0.15

                // Prep Time
                self.defaultPrepTimeMinutes = data["defaultPrepTimeMinutes"] as? Int ?? 20
                self.maxPrepTimeMinutes = data["maxPrepTimeMinutes"] as? Int ?? 60
                self.additionalPrepTimePerOrder = data["additionalPrepTimePerOrder"] as? Int ?? 3

                // Support
                self.supportUrl = data["supportUrl"] as? String ?? "https://support.eatfair.com"
                self.supportPhone = data["supportPhone"] as? String ?? "+1-800-EATFAIR"
                self.supportEmail = data["supportEmail"] as? String ?? "support@eatfair.com"

                // Feature Flags
                self.isDummyPaymentMode = data["isDummyPaymentMode"] as? Bool ?? true
                self.isAIFeaturesEnabled = data["isAIFeaturesEnabled"] as? Bool ?? true
                self.isDynamicPricingEnabled = data["isDynamicPricingEnabled"] as? Bool ?? false

                // Busy Level Thresholds
                if let thresholds = data["busyLevelThresholds"] as? [String: Any] {
                    self.busyLevelThresholds = BusyLevelThresholds(
                        slow: thresholds["slow"] as? Int ?? 2,
                        normal: thresholds["normal"] as? Int ?? 5,
                        busy: thresholds["busy"] as? Int ?? 8
                    )
                }

                self.configLoaded = true
                print("AppConfig: Configuration loaded successfully")
                completion?(true)
            }
        }
    }

    // MARK: - App Version

    public var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }

    public var bundleIdentifier: String {
        Bundle.main.bundleIdentifier ?? "com.eatfair.unknown"
    }
}

// MARK: - Supporting Types

public struct BusyLevelThresholds {
    public var slow: Int = 2
    public var normal: Int = 5
    public var busy: Int = 8

    public init(slow: Int = 2, normal: Int = 5, busy: Int = 8) {
        self.slow = slow
        self.normal = normal
        self.busy = busy
    }
}

// MARK: - Order Status Constants

public struct OrderStatusConstants {
    public static let placed = "Placed"
    public static let accepted = "Accepted"
    public static let preparing = "Preparing"
    public static let ready = "Ready"
    public static let pickedUp = "Picked Up"
    public static let outForDelivery = "Out for Delivery"
    public static let delivered = "Delivered"
    public static let rejected = "Rejected"
    public static let cancelled = "Cancelled"

    public static let activeStatuses = [placed, accepted, preparing, ready, pickedUp, outForDelivery]
    public static let completedStatuses = [delivered]
    public static let cancelledStatuses = [rejected, cancelled]
}

// MARK: - Firebase Collection Names

public struct FirebaseCollections {
    public static let users = "users"
    public static let restaurants = "restaurants"
    public static let orders = "orders"
    public static let drivers = "drivers"
    public static let config = "config"
    public static let promotions = "promotions"
    public static let reviews = "reviews"
    public static let payouts = "payouts"

    // Subcollections
    public static let menu = "menu"
    public static let addresses = "addresses"
    public static let earnings = "earnings"
}

// MARK: - Map Configuration

public struct MapConfig {
    public static let defaultZoomSpan: Double = 0.05
    public static let detailedZoomSpan: Double = 0.01
    public static let overviewZoomSpan: Double = 0.1

    public static let defaultLatitude: Double = 37.7749
    public static let defaultLongitude: Double = -122.4194
}
