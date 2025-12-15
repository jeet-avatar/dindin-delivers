import Foundation

/// Centralized configuration for all EatFair apps
/// Configuration is fetched from Dollar.ai (P2P) backend API
/// Firebase/Google is ONLY used for authentication
public class AppConfig: ObservableObject {
    public static let shared = AppConfig()

    // MARK: - P2P API Configuration
    /// Dollar.ai backend base URL - all data comes from here
    /// Uses CloudFront CDN for HTTPS (App Store requirement)
    @Published public var p2pAPIBaseURL: String = "https://d3kuu45w6kl8hr.cloudfront.net"

    // MARK: - Published Properties (hardcoded defaults, can be fetched from P2P API)
    // NOTE: These defaults MUST match pricing_config.py in the backend
    @Published public var taxRate: Double = 0.08  // 8% tax (matches backend DEFAULT_TAX_RATE)
    @Published public var baseDeliveryFee: Double = 2.99  // Delivery fee (matches backend DELIVERY_FEE_CONFIG.base_fee)
    @Published public var extraStopFee: Double = 2.0
    @Published public var platformFeePerRestaurant: Double = 1.0  // $1 platform fee (matches PLATFORM_FEE_CONFIG.flat_fee)
    @Published public var maxRestaurantsPerOrder: Int = 3
    @Published public var serviceFeeRate: Double = 0.05  // Legacy - use serviceFee instead
    @Published public var smallOrderThreshold: Double = 10.0
    @Published public var smallOrderFee: Double = 2.0

    // MARK: - TIERED Fee Structure - Revolutionary Pricing!
    // ==============================================
    // NEW TIERED MODEL (Dec 2024):
    //
    // Customer Delivery Fee:
    //   - Order ≤ $35:    $1
    //   - Order $35-$70:  $2
    //   - Order > $70:    $3
    //
    // Restaurant Platform Fee:
    //   - Order ≤ $35:    $1
    //   - Order $35-$70:  $2
    //   - Order > $70:    $3
    //
    // Driver receives: Base pay + per-mile pay + 100% of tip
    // Platform receives: Tiered fee from customer + tiered fee from restaurant
    // ==============================================
    // NOTE: These MUST match pricing_config.py TIERED_PRICING in the backend

    // Tier thresholds
    @Published public var tier1MaxOrder: Double = 35.00   // Orders up to $35
    @Published public var tier2MaxOrder: Double = 70.00   // Orders $35.01 to $70
    // tier3: Everything above $70

    // Customer delivery fees (tiered)
    @Published public var customerTier1Fee: Double = 1.00  // $1 for orders ≤ $35
    @Published public var customerTier2Fee: Double = 2.00  // $2 for orders $35.01-$70
    @Published public var customerTier3Fee: Double = 3.00  // $3 for orders > $70

    // Restaurant platform fees (same tiers)
    @Published public var restaurantTier1Fee: Double = 1.00  // $1 for orders ≤ $35
    @Published public var restaurantTier2Fee: Double = 2.00  // $2 for orders $35.01-$70
    @Published public var restaurantTier3Fee: Double = 3.00  // $3 for orders > $70

    // Legacy flat fees (kept for backwards compatibility)
    @Published public var serviceFee: Double = 1.00  // Legacy - use getCustomerDeliveryFee() instead
    @Published public var deliveryFee: Double = 2.99  // Base delivery fee (legacy)
    @Published public var restaurantPlatformFee: Double = 1.0  // Legacy - use getRestaurantPlatformFee() instead

    /// Get customer delivery fee based on order subtotal (TIERED)
    public func getCustomerDeliveryFee(orderSubtotal: Double) -> Double {
        if orderSubtotal <= tier1MaxOrder {
            return customerTier1Fee
        } else if orderSubtotal <= tier2MaxOrder {
            return customerTier2Fee
        } else {
            return customerTier3Fee
        }
    }

    /// Get restaurant platform fee based on order subtotal (TIERED)
    public func getRestaurantPlatformFee(orderSubtotal: Double) -> Double {
        if orderSubtotal <= tier1MaxOrder {
            return restaurantTier1Fee
        } else if orderSubtotal <= tier2MaxOrder {
            return restaurantTier2Fee
        } else {
            return restaurantTier3Fee
        }
    }

    /// Get fee tier description for UI display
    public func getFeeTierDescription(orderSubtotal: Double) -> String {
        if orderSubtotal <= tier1MaxOrder {
            return "Tier 1 (≤$\(Int(tier1MaxOrder))): $\(Int(customerTier1Fee))"
        } else if orderSubtotal <= tier2MaxOrder {
            return "Tier 2 ($\(Int(tier1MaxOrder)+1)-$\(Int(tier2MaxOrder))): $\(Int(customerTier2Fee))"
        } else {
            return "Tier 3 (>$\(Int(tier2MaxOrder))): $\(Int(customerTier3Fee))"
        }
    }

    // Driver/Delivery Config (matches pricing_config.py)
    @Published public var perMileDeliveryFee: Double = 0.50  // Per mile fee (matches DELIVERY_FEE_CONFIG.per_mile_fee)
    @Published public var maxDeliveryFee: Double = 12.99  // Max delivery fee cap (matches DELIVERY_FEE_CONFIG.max_fee)
    @Published public var defaultTipRate: Double = 0.15
    @Published public var nearbyDistanceMeters: Double = 3218.69 // 2 miles
    @Published public var maxDeliveryDistanceMiles: Double = 15.0  // Max distance (matches DELIVERY_FEE_CONFIG.max_delivery_distance)

    // Tip options (in dollars for rideshare, percentages for delivery)
    @Published public var rideTipOptions: [Double] = [0.0, 2.0, 5.0, 10.0]  // Dollar amounts
    @Published public var deliveryTipPercentages: [Int] = [0, 15, 20, 25]   // Percentages

    // Driver earnings info (for transparency display)
    @Published public var driverEarningsPercentage: Int = 90  // Drivers keep 90%+ of fare

    // AI/Analytics Thresholds
    @Published public var busyLevelThresholds: BusyLevelThresholds = BusyLevelThresholds()
    @Published public var defaultPrepTimeMinutes: Int = 20
    @Published public var maxPrepTimeMinutes: Int = 60
    @Published public var additionalPrepTimePerOrder: Int = 3

    // MARK: - Rideshare TIERED Pricing (matches pricing_config.py RIDESHARE_PRICING_CONFIG)
    // NEW TIERED MODEL (Dec 2024):
    //   - Fare ≤ $15:     $1 platform fee
    //   - Fare $15-$35:   $2 platform fee
    //   - Fare > $35:     $3 platform fee

    @Published public var rideBaseFare: Double = 2.00          // Base fare for rideshare
    @Published public var ridePerMileRate: Double = 1.00       // Per mile rate
    @Published public var ridePerMinuteRate: Double = 0.15     // Per minute rate
    @Published public var ridePlatformFee: Double = 1.00       // Legacy $1 platform fee - use getRidesharePlatformFee()
    @Published public var rideMinFare: Double = 5.00           // Minimum fare
    @Published public var rideCancellationFee: Double = 5.00   // Cancellation fee (base)
    @Published public var rideCancellationFeeDriverEnRoute: Double = 5.00  // Fee when driver assigned
    @Published public var rideCancellationFeeInProgress: Double = 10.00    // Fee when ride in progress
    @Published public var rideSurgeEnabled: Bool = true        // Surge pricing enabled
    @Published public var rideMaxSurgeMultiplier: Double = 3.0 // Maximum surge multiplier

    // Rideshare tiered pricing thresholds (different from delivery)
    @Published public var rideshareTier1MaxFare: Double = 15.00   // Fares up to $15
    @Published public var rideshareTier2MaxFare: Double = 35.00   // Fares $15.01 to $35
    // tier3: Everything above $35

    // Rideshare platform fees (tiered)
    @Published public var rideshareTier1Fee: Double = 1.00  // $1 for fares ≤ $15
    @Published public var rideshareTier2Fee: Double = 2.00  // $2 for fares $15.01-$35
    @Published public var rideshareTier3Fee: Double = 3.00  // $3 for fares > $35

    /// Get rideshare platform fee based on fare amount (TIERED)
    public func getRidesharePlatformFee(fareAmount: Double) -> Double {
        if fareAmount <= rideshareTier1MaxFare {
            return rideshareTier1Fee
        } else if fareAmount <= rideshareTier2MaxFare {
            return rideshareTier2Fee
        } else {
            return rideshareTier3Fee
        }
    }

    /// Get rideshare fee tier description for UI display
    public func getRideshareTierDescription(fareAmount: Double) -> String {
        if fareAmount <= rideshareTier1MaxFare {
            return "Tier 1 (≤$\(Int(rideshareTier1MaxFare))): $\(Int(rideshareTier1Fee))"
        } else if fareAmount <= rideshareTier2MaxFare {
            return "Tier 2 ($\(Int(rideshareTier1MaxFare)+1)-$\(Int(rideshareTier2MaxFare))): $\(Int(rideshareTier2Fee))"
        } else {
            return "Tier 3 (>$\(Int(rideshareTier2MaxFare))): $\(Int(rideshareTier3Fee))"
        }
    }

    // Support - Using CloudFront CDN for HTTPS
    @Published public var supportUrl: String = "https://d3kuu45w6kl8hr.cloudfront.net/support"
    @Published public var supportPhone: String = "+1-800-365-5671"
    @Published public var supportEmail: String = "support@dollor.ai"

    // Legal URLs (Required for App Store - Apple Guideline 5.1.1)
    public var termsOfServiceUrl: String { AppConstants.termsOfServiceURL }
    public var privacyPolicyUrl: String { AppConstants.privacyPolicyURL }

    // Feature Flags - Production defaults
    // LIVE PAYMENTS ENABLED - Real Stripe integration active
    @Published public var isDummyPaymentMode: Bool = false  // Real payments enabled
    @Published public var isAIFeaturesEnabled: Bool = true
    @Published public var isDynamicPricingEnabled: Bool = false

    private var configLoaded = false

    private init() {}

    // MARK: - Fetch Configuration from P2P (Dollar.ai) Backend

    /// Fetches app configuration from Dollar.ai backend
    /// All data comes from P2P backend - Firebase is only for authentication
    public func fetchConfig(completion: ((Bool) -> Void)? = nil) {
        guard let url = URL(string: "\(p2pAPIBaseURL)/api/config") else {
            #if DEBUG
            print("[AppConfig] Invalid URL for config endpoint")
            #endif
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
                #if DEBUG
                print("[AppConfig] Using default configuration (P2P API not available)")
                #endif
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
                // APP STORE FIX: Never allow dummy payment mode in Release builds
                #if DEBUG
                if let dummyMode = json["isDummyPaymentMode"] as? Bool { self.isDummyPaymentMode = dummyMode }
                #else
                // In Release builds, always use real payments - ignore backend flag
                self.isDummyPaymentMode = false
                #endif
                if let aiEnabled = json["isAIFeaturesEnabled"] as? Bool { self.isAIFeaturesEnabled = aiEnabled }
                if let dynamicPricing = json["isDynamicPricingEnabled"] as? Bool { self.isDynamicPricingEnabled = dynamicPricing }

                // Rideshare Pricing (from backend)
                if let rideBaseFare = json["rideBaseFare"] as? Double { self.rideBaseFare = rideBaseFare }
                if let ridePerMileRate = json["ridePerMileRate"] as? Double { self.ridePerMileRate = ridePerMileRate }
                if let ridePerMinuteRate = json["ridePerMinuteRate"] as? Double { self.ridePerMinuteRate = ridePerMinuteRate }
                if let ridePlatformFee = json["ridePlatformFee"] as? Double { self.ridePlatformFee = ridePlatformFee }
                if let rideMinFare = json["rideMinFare"] as? Double { self.rideMinFare = rideMinFare }
                if let rideCancellationFee = json["rideCancellationFee"] as? Double { self.rideCancellationFee = rideCancellationFee }
                if let rideCancellationFeeDriverEnRoute = json["rideCancellationFeeDriverEnRoute"] as? Double { self.rideCancellationFeeDriverEnRoute = rideCancellationFeeDriverEnRoute }
                if let rideCancellationFeeInProgress = json["rideCancellationFeeInProgress"] as? Double { self.rideCancellationFeeInProgress = rideCancellationFeeInProgress }
                if let rideSurgeEnabled = json["rideSurgeEnabled"] as? Bool { self.rideSurgeEnabled = rideSurgeEnabled }
                if let rideMaxSurgeMultiplier = json["rideMaxSurgeMultiplier"] as? Double { self.rideMaxSurgeMultiplier = rideMaxSurgeMultiplier }

                // Per mile delivery fee
                if let perMileDeliveryFee = json["perMileDeliveryFee"] as? Double { self.perMileDeliveryFee = perMileDeliveryFee }
                if let maxDeliveryFee = json["maxDeliveryFee"] as? Double { self.maxDeliveryFee = maxDeliveryFee }

                self.configLoaded = true
                #if DEBUG
                print("[AppConfig] Configuration loaded from Dollar.ai backend")
                #endif
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
        Bundle.main.bundleIdentifier ?? "com.dollor.unknown"
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
    public static let baseURL = "https://d3kuu45w6kl8hr.cloudfront.net"

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
    public static let termsVersion = "1.1"

    // Legal URLs (Required for App Store - Apple Guideline 5.1.1)
    // Using CloudFront CDN for HTTPS support
    public static let termsOfServiceURL = "https://d3kuu45w6kl8hr.cloudfront.net/terms"
    public static let privacyPolicyURL = "https://d3kuu45w6kl8hr.cloudfront.net/privacy"
}

// MARK: - State Tax Rates (matches pricing_config.py STATE_TAX_RATES)
// US state tax rates for rideshare/delivery services
public struct StateTaxRates {
    /// State tax rate lookup - matches backend pricing_config.py
    public static let rates: [String: Double] = [
        "AL": 0.04, "AK": 0.0, "AZ": 0.056, "AR": 0.065,
        "CA": 0.0725, "CO": 0.029, "CT": 0.0635, "DE": 0.0,
        "FL": 0.06, "GA": 0.04, "HI": 0.04, "ID": 0.06,
        "IL": 0.0625, "IN": 0.07, "IA": 0.06, "KS": 0.065,
        "KY": 0.06, "LA": 0.0445, "ME": 0.055, "MD": 0.06,
        "MA": 0.0625, "MI": 0.06, "MN": 0.06875, "MS": 0.07,
        "MO": 0.04225, "MT": 0.0, "NE": 0.055, "NV": 0.0685,
        "NH": 0.0, "NJ": 0.06625, "NM": 0.05125, "NY": 0.08,
        "NC": 0.0475, "ND": 0.05, "OH": 0.0575, "OK": 0.045,
        "OR": 0.0, "PA": 0.06, "RI": 0.07, "SC": 0.06,
        "SD": 0.045, "TN": 0.07, "TX": 0.0625, "UT": 0.061,
        "VT": 0.06, "VA": 0.053, "WA": 0.065, "WV": 0.06,
        "WI": 0.05, "WY": 0.04, "DC": 0.06
    ]

    /// Get tax rate for a state code (e.g., "CA", "NY")
    public static func rate(for stateCode: String) -> Double {
        return rates[stateCode.uppercased()] ?? 0.0
    }

    /// Convert full state name to state code
    public static func stateCode(from name: String) -> String {
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
        let upper = name.uppercased()
        // If already a code, return it
        if upper.count == 2 { return upper }
        return stateNames[upper] ?? upper
    }
}
