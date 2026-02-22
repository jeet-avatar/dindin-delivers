import Foundation
import Combine

// MARK: - Dollor V3 Models

/// Order item for V3 API
public struct V3OrderItem: Codable {
    public let name: String
    public let quantity: Int
    public let price: Double

    public init(name: String, quantity: Int, price: Double) {
        self.name = name
        self.quantity = quantity
        self.price = price
    }
}

/// Create order request for V3 API
public struct V3CreateOrderRequest: Codable {
    public let customerEmail: String
    public let customerName: String
    public let customerPhone: String
    public let restaurantId: String
    public let restaurantStripeAccount: String
    public let items: [V3OrderItem]
    public let deliveryAddress: String
    public let deliveryLat: Double
    public let deliveryLng: Double
    public let tipAmount: Double
    public let promoCode: String?

    enum CodingKeys: String, CodingKey {
        case customerEmail = "customer_email"
        case customerName = "customer_name"
        case customerPhone = "customer_phone"
        case restaurantId = "restaurant_id"
        case restaurantStripeAccount = "restaurant_stripe_account"
        case items
        case deliveryAddress = "delivery_address"
        case deliveryLat = "delivery_lat"
        case deliveryLng = "delivery_lng"
        case tipAmount = "tip_amount"
        case promoCode = "promo_code"
    }

    public init(
        customerEmail: String,
        customerName: String,
        customerPhone: String,
        restaurantId: String,
        restaurantStripeAccount: String,
        items: [V3OrderItem],
        deliveryAddress: String,
        deliveryLat: Double,
        deliveryLng: Double,
        tipAmount: Double = 0,
        promoCode: String? = nil
    ) {
        self.customerEmail = customerEmail
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.restaurantId = restaurantId
        self.restaurantStripeAccount = restaurantStripeAccount
        self.items = items
        self.deliveryAddress = deliveryAddress
        self.deliveryLat = deliveryLat
        self.deliveryLng = deliveryLng
        self.tipAmount = tipAmount
        self.promoCode = promoCode
    }
}

/// Order response from V3 API
public struct V3OrderResponse: Codable {
    public let orderId: String
    public let status: String
    public let paymentIntentClientSecret: String

    // Pricing breakdown
    public let subtotal: Double
    public let tax: Double
    public let deliveryFee: Double
    public let serviceFee: Double
    public let tip: Double
    public let discount: Double
    public let total: Double

    // Who gets what (transparency)
    public let restaurantReceives: Double
    public let driverReceives: Double
    public let platformReceives: Double

    public let estimatedDelivery: String

    enum CodingKeys: String, CodingKey {
        case orderId = "order_id"
        case status
        case paymentIntentClientSecret = "payment_intent_client_secret"
        case subtotal, tax
        case deliveryFee = "delivery_fee"
        case serviceFee = "service_fee"
        case tip, discount, total
        case restaurantReceives = "restaurant_receives"
        case driverReceives = "driver_receives"
        case platformReceives = "platform_receives"
        case estimatedDelivery = "estimated_delivery"
    }
}

/// Referral response
public struct V3ReferralResponse: Codable {
    public let referralCode: String
    public let referralLink: String
    public let shareMessage: String
    public let rewards: ReferralRewards

    enum CodingKeys: String, CodingKey {
        case referralCode = "referral_code"
        case referralLink = "referral_link"
        case shareMessage = "share_message"
        case rewards
    }

    public struct ReferralRewards: Codable {
        public let youGet: String
        public let friendGets: String
        public let noLimit: Bool

        enum CodingKeys: String, CodingKey {
            case youGet = "you_get"
            case friendGets = "friend_gets"
            case noLimit = "no_limit"
        }
    }
}

/// Group order response
public struct V3GroupOrderResponse: Codable {
    public let groupId: String
    public let joinLink: String
    public let shareMessage: String
    public let hostReward: String
    public let expiresIn: String

    enum CodingKeys: String, CodingKey {
        case groupId = "group_id"
        case joinLink = "join_link"
        case shareMessage = "share_message"
        case hostReward = "host_reward"
        case expiresIn = "expires_in"
    }
}

// MARK: - Dollor V3 Service

// TODO: [CRITICAL] API mismatch — No /api/v3/ routes exist in backend. All 4 endpoints will 404.
/// Service for Dollor V3 API - Viral Investor-Ready Model
public class DollorV3Service {
    public static let shared = DollorV3Service()

    private let baseURL: String
    private let session: URLSession

    private init() {
        self.baseURL = AppConfig.shared.p2pAPIBaseURL + "/api/v3"
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
    }

    // MARK: - Order Creation

    /// Create a V3 order with automatic payment splitting
    public func createOrder(_ request: V3CreateOrderRequest) async throws -> V3OrderResponse {
        guard let url = URL(string: "\(baseURL)/order/create") else {
            throw V3Error.invalidResponse
        }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw V3Error.orderCreationFailed
        }

        return try JSONDecoder().decode(V3OrderResponse.self, from: data)
    }

    // MARK: - Viral Features

    /// Get referral code for sharing
    public func getReferralCode(userEmail: String) async throws -> V3ReferralResponse {
        guard var components = URLComponents(string: "\(baseURL)/viral/referral") else {
            throw V3Error.invalidResponse
        }
        components.queryItems = [URLQueryItem(name: "user_email", value: userEmail)]

        guard let url = components.url else {
            throw V3Error.invalidResponse
        }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw V3Error.referralFailed
        }

        return try JSONDecoder().decode(V3ReferralResponse.self, from: data)
    }

    /// Create a group order
    public func createGroupOrder(
        hostEmail: String,
        restaurantId: String,
        groupName: String
    ) async throws -> V3GroupOrderResponse {
        guard var components = URLComponents(string: "\(baseURL)/viral/group-order") else {
            throw V3Error.invalidResponse
        }
        components.queryItems = [
            URLQueryItem(name: "host_email", value: hostEmail),
            URLQueryItem(name: "restaurant_id", value: restaurantId),
            URLQueryItem(name: "group_name", value: groupName)
        ]

        guard let url = components.url else {
            throw V3Error.invalidResponse
        }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw V3Error.groupOrderFailed
        }

        return try JSONDecoder().decode(V3GroupOrderResponse.self, from: data)
    }

    // MARK: - Order Status

    /// Get order status
    public func getOrderStatus(orderId: String) async throws -> V3OrderStatus {
        guard let url = URL(string: "\(baseURL)/order/\(orderId)/status") else {
            throw V3Error.invalidResponse
        }
        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw V3Error.statusFetchFailed
        }

        return try JSONDecoder().decode(V3OrderStatus.self, from: data)
    }
}

// MARK: - Order Status Model

public struct V3OrderStatus: Codable {
    public let orderId: String
    public let status: String
    public let statusMessage: String?
    public let estimatedDelivery: String?
    public let driver: DriverInfo?

    enum CodingKeys: String, CodingKey {
        case orderId = "order_id"
        case status
        case statusMessage = "status_message"
        case estimatedDelivery = "estimated_delivery"
        case driver
    }

    public struct DriverInfo: Codable {
        public let name: String
        public let phone: String?
        public let rating: Double?
        public let eta: String?
    }
}

// MARK: - Errors

public enum V3Error: Error, LocalizedError {
    case orderCreationFailed
    case referralFailed
    case groupOrderFailed
    case statusFetchFailed
    case paymentFailed
    case invalidResponse

    public var errorDescription: String? {
        switch self {
        case .orderCreationFailed:
            return "Failed to create order. Please try again."
        case .referralFailed:
            return "Failed to get referral code."
        case .groupOrderFailed:
            return "Failed to create group order."
        case .statusFetchFailed:
            return "Failed to fetch order status."
        case .paymentFailed:
            return "Payment failed. Please try again."
        case .invalidResponse:
            return "Invalid response from server."
        }
    }
}

// MARK: - Pricing Calculator

/// Client-side pricing calculator (mirrors backend logic)
public struct V3PricingCalculator {
    // Platform config - DOLLOR.AI FLAT FEE MODEL
    public static let restaurantCommission = 0.00  // $0 - use flat $1 fee instead
    public static let restaurantFlatFee = 1.00     // $1 flat per order
    public static let customerServiceFee = 1.00    // $1 flat fee
    public static let driverPlatformFee = 0.00     // $0 (competitive advantage!)

    // Delivery pricing
    public static let baseDeliveryFee = 2.99
    public static let perMileRate = 0.50
    public static let maxDeliveryFee = 8.99
    public static let freeDeliveryThreshold = 35.00

    // Tax
    public static let taxRate = 0.0875  // 8.75% CA tax

    /// Calculate pricing breakdown
    public static func calculate(
        items: [V3OrderItem],
        distanceMiles: Double = 3.0,
        tip: Double = 0,
        promoDiscount: Double = 0
    ) -> V3PricingBreakdown {
        let subtotal = items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        let tax = (subtotal * taxRate).rounded(toPlaces: 2)

        // Delivery fee (free over $35)
        var deliveryFee: Double
        if subtotal >= freeDeliveryThreshold {
            deliveryFee = 0.0
        } else {
            deliveryFee = min(baseDeliveryFee + (distanceMiles * perMileRate), maxDeliveryFee)
        }

        let serviceFee = customerServiceFee
        let discount = promoDiscount
        let total = subtotal + tax + deliveryFee + serviceFee + tip - discount

        // Revenue split
        let restaurantCommissionAmount = subtotal * restaurantCommission
        let restaurantReceives = subtotal + tax - restaurantCommissionAmount
        let driverReceives = deliveryFee + tip
        let platformReceives = restaurantCommissionAmount + serviceFee

        return V3PricingBreakdown(
            subtotal: subtotal,
            tax: tax,
            deliveryFee: deliveryFee,
            serviceFee: serviceFee,
            tip: tip,
            discount: discount,
            total: total,
            restaurantReceives: restaurantReceives,
            driverReceives: driverReceives,
            platformReceives: platformReceives,
            isFreeDelivery: subtotal >= freeDeliveryThreshold
        )
    }
}

public struct V3PricingBreakdown {
    public let subtotal: Double
    public let tax: Double
    public let deliveryFee: Double
    public let serviceFee: Double
    public let tip: Double
    public let discount: Double
    public let total: Double

    public let restaurantReceives: Double
    public let driverReceives: Double
    public let platformReceives: Double

    public let isFreeDelivery: Bool
}

// MARK: - Extensions

extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let divisor = pow(10.0, Double(places))
        return (self * divisor).rounded() / divisor
    }
}
