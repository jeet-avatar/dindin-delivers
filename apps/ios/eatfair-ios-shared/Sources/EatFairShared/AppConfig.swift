import Foundation

/// Centralized configuration for all EatFair apps
/// Configuration is fetched from Dollar.ai (P2P) backend API
/// Firebase/Google is ONLY used for authentication
public class AppConfig: ObservableObject {
    public static let shared = AppConfig()

    // MARK: - P2P API Configuration
    /// Dollar.ai backend base URL - all data comes from here
    @Published public var p2pAPIBaseURL: String = "https://dollor.ai"

    // MARK: - Published Properties (hardcoded defaults, can be fetched from P2P API)
    @Published public var taxRate: Double = 0.09  // 9% tax
    @Published public var baseDeliveryFee: Double = 4.99  // Delivery fee goes to driver
    @Published public var extraStopFee: Double = 2.0
    @Published public var platformFeePerRestaurant: Double = 0.0  // No platform fee to customer
    @Published public var maxRestaurantsPerOrder: Int = 3
    @Published public var serviceFeeRate: Double = 0.05  // Legacy - use serviceFee instead
    @Published public var smallOrderThreshold: Double = 10.0
    @Published public var smallOrderFee: Double = 2.0

    // MARK: - $1 Dollar Store Fee Structure - World's First!
    // ==============================================
    // Customer pays: Food + Tax + Delivery Fee + Tip (NO service fee!)
    // Restaurant pays: $1 flat platform fee (deducted from their payout)
    // Driver receives: Delivery fee + 100% of tip
    // Platform receives: $1 from restaurant per order
    // ==============================================
    @Published public var serviceFee: Double = 0.00  // $0 - NO service fee to customer!
    @Published public var deliveryFee: Double = 4.99  // $4.99 delivery fee from customer (to driver)
    @Published public var restaurantPlatformFee: Double = 1.0  // $1 flat platform fee from restaurant

    // Driver/Delivery Config
    @Published public var defaultTipRate: Double = 0.15
    @Published public var nearbyDistanceMeters: Double = 3218.69 // 2 miles
    @Published public var maxDeliveryDistanceMiles: Double = 10.0

    // AI/Analytics Thresholds
    @Published public var busyLevelThresholds: BusyLevelThresholds = BusyLevelThresholds()
    @Published public var defaultPrepTimeMinutes: Int = 20
    @Published public var maxPrepTimeMinutes: Int = 60
    @Published public var additionalPrepTimePerOrder: Int = 3

    // Support
    @Published public var supportUrl: String = "https://support.eatfair.com"
    @Published public var supportPhone: String = "+1-800-EATFAIR"
    @Published public var supportEmail: String = "support@eatfair.com"

    // Feature Flags - Production defaults
    #if DEBUG
    @Published public var isDummyPaymentMode: Bool = true  // Enable dummy payments in DEBUG only
    #else
    @Published public var isDummyPaymentMode: Bool = false  // Real payments in production
    #endif
    @Published public var isAIFeaturesEnabled: Bool = true
    @Published public var isDynamicPricingEnabled: Bool = false

    private var configLoaded = false

    private init() {}

    // MARK: - Fetch Configuration from P2P (Dollar.ai) Backend

    /// Fetches app configuration from Dollar.ai backend
    /// All data comes from P2P backend - Firebase is only for authentication
    public func fetchConfig(completion: ((Bool) -> Void)? = nil) {
        guard let url = URL(string: "\(p2pAPIBaseURL)/api/config") else {
            print("AppConfig: Invalid URL for config endpoint")
            // Use default values if API fails
            self.configLoaded = true
            completion?(true)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }

            // If API fails, use default values (already set above)
            guard error == nil, let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("AppConfig: Using default configuration (P2P API not available)")
                DispatchQueue.main.async {
                    self.configLoaded = true
                    completion?(true)
                }
                return
            }

            DispatchQueue.main.async {
                // Fees (from P2P API response)
                if let taxRate = json["taxRate"] as? Double { self.taxRate = taxRate }
                if let baseDeliveryFee = json["baseDeliveryFee"] as? Double { self.baseDeliveryFee = baseDeliveryFee }
                if let extraStopFee = json["extraStopFee"] as? Double { self.extraStopFee = extraStopFee }
                if let maxRestaurants = json["maxRestaurantsPerOrder"] as? Int { self.maxRestaurantsPerOrder = maxRestaurants }

                // Uber-style Fee Structure
                if let serviceFee = json["serviceFee"] as? Double { self.serviceFee = serviceFee }
                if let deliveryFee = json["deliveryFee"] as? Double { self.deliveryFee = deliveryFee }
                if let restaurantFee = json["restaurantPlatformFee"] as? Double { self.restaurantPlatformFee = restaurantFee }

                // Delivery
                if let tipRate = json["defaultTipRate"] as? Double { self.defaultTipRate = tipRate }
                if let nearbyDist = json["nearbyDistanceMeters"] as? Double { self.nearbyDistanceMeters = nearbyDist }
                if let maxDist = json["maxDeliveryDistanceMiles"] as? Double { self.maxDeliveryDistanceMiles = maxDist }

                // Prep Time
                if let defaultPrep = json["defaultPrepTimeMinutes"] as? Int { self.defaultPrepTimeMinutes = defaultPrep }
                if let maxPrep = json["maxPrepTimeMinutes"] as? Int { self.maxPrepTimeMinutes = maxPrep }

                // Support
                if let supportUrl = json["supportUrl"] as? String { self.supportUrl = supportUrl }
                if let supportPhone = json["supportPhone"] as? String { self.supportPhone = supportPhone }
                if let supportEmail = json["supportEmail"] as? String { self.supportEmail = supportEmail }

                // Feature Flags
                if let dummyMode = json["isDummyPaymentMode"] as? Bool { self.isDummyPaymentMode = dummyMode }
                if let aiEnabled = json["isAIFeaturesEnabled"] as? Bool { self.isAIFeaturesEnabled = aiEnabled }
                if let dynamicPricing = json["isDynamicPricingEnabled"] as? Bool { self.isDynamicPricingEnabled = dynamicPricing }

                self.configLoaded = true
                print("AppConfig: Configuration loaded from Dollar.ai backend")
                completion?(true)
            }
        }.resume()
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

// MARK: - API Endpoints (P2P Backend / Dollar.ai)
// NOTE: Firebase is ONLY used for authentication
// All data comes from Dollar.ai P2P backend

public struct APIEndpoints {
    public static let baseURL = "https://dollor.ai"

    // Customer endpoints
    public static let customerAuth = "/api/customer/google-auth"
    public static let customerOrders = "/api/customer/orders"
    public static let restaurants = "/api/restaurants"
    public static let restaurantMenu = "/api/restaurants"  // + /{id}/menu

    // Vendor endpoints
    public static let vendorAuth = "/api/vendors/google-auth"
    public static let vendorOrders = "/api/vendors/orders"
    public static let vendorMenu = "/api/vendors/menu"

    // Driver endpoints
    public static let driverAuth = "/api/erp/drivers/login"
    public static let driverRegister = "/api/erp/drivers/register"
    public static let availableOrders = "/api/erp/orders/available-for-delivery"
    public static let driverDeliveries = "/api/erp/orders/driver"  // + /{id}/active

    // Order flow endpoints
    public static let createOrder = "/api/erp/orders/create"
    public static let orderStatus = "/api/erp/orders"  // + /{id}/status
    public static let assignDriver = "/api/erp/orders"  // + /{id}/assign-driver

    // Config endpoint
    public static let appConfig = "/api/config"
}

// MARK: - Map Configuration

public struct MapConfig {
    public static let defaultZoomSpan: Double = 0.05
    public static let detailedZoomSpan: Double = 0.01
    public static let overviewZoomSpan: Double = 0.1

    // Default fallback coordinates (San Francisco, CA)
    // These are only used when user location is unavailable
    // In production, always prioritize user's actual location
    public static let defaultLatitude: Double = 37.7749
    public static let defaultLongitude: Double = -122.4194

    /// Returns default coordinates as CLLocationCoordinate2D
    /// Only use this as a fallback when user location is unavailable
    public static var defaultCoordinate: (latitude: Double, longitude: Double) {
        (defaultLatitude, defaultLongitude)
    }
}

// MARK: - UserDefaults Keys (Centralized)

public struct UserDefaultsKeys {
    // MARK: - Customer App
    public static let selectedAddressId = "selectedAddressId"
    public static let customerAccessToken = "p2p_customer_access_token"
    public static let customerId = "p2p_customer_id"
    public static let customerName = "p2p_customer_name"
    public static let customerEmail = "p2p_customer_email"

    // MARK: - Vendor/Restaurant App
    public static let vendorAccessToken = "p2p_access_token"
    public static let vendorId = "p2p_vendor_id"
    public static let vendorName = "p2p_vendor_name"
    public static let vendorEmail = "p2p_vendor_email"

    // MARK: - Driver App
    public static let driverAccessToken = "p2p_driver_access_token"
    public static let driverId = "p2p_driver_id"
    public static let driverName = "p2p_driver_name"
    public static let driverEmail = "p2p_driver_email"
    public static let driverCode = "p2p_driver_code"
    public static let driverTermsAccepted = "p2p_driver_terms_accepted"
    public static let driverFCMToken = "driver_fcm_token"

    // MARK: - App Settings
    public static let notificationsEnabled = "notifications_enabled"
    public static let darkModeEnabled = "dark_mode_enabled"
    public static let lastKnownLatitude = "last_known_latitude"
    public static let lastKnownLongitude = "last_known_longitude"

    // MARK: - Terms & Conditions
    public static let driverTermsAcceptedAt = "p2p_driver_terms_accepted_at"
    public static let driverTermsVersion = "p2p_driver_terms_version"
}

// MARK: - App Constants

public struct AppConstants {
    // Current terms version - increment when terms change
    public static let termsVersion = "1.0"

    // Support URLs
    public static let termsOfServiceURL = "https://eatfair.com/terms"
    public static let privacyPolicyURL = "https://eatfair.com/privacy"
}
