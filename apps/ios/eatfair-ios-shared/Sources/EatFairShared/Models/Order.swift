import Foundation
import FirebaseFirestore

// MARK: - Order Status (Unified across iOS, Android, Backend)
/// Status flow:
/// pending_payment -> confirmed -> pending_restaurant -> preparing -> ready_for_pickup
/// -> pending_delivery_decision -> restaurant_will_deliver/ready_for_pickup -> out_for_delivery -> delivered
///
/// Restaurant acceptance flow (3-minute window):
/// pending_restaurant -> (accept) -> preparing
/// pending_restaurant -> (decline) -> declined_by_restaurant
/// pending_restaurant -> (timeout) -> restaurant_timeout
///
/// Delivery decision flow (3-minute window after ready_for_pickup):
/// ready_for_pickup -> pending_delivery_decision
/// pending_delivery_decision -> (self-deliver) -> restaurant_will_deliver -> out_for_delivery
/// pending_delivery_decision -> (pass to driver) -> ready_for_pickup (driver pool)
/// pending_delivery_decision -> (timeout) -> delivery_decision_timeout -> ready_for_pickup (driver pool)
public enum OrderStatus: String, CaseIterable {
    // Payment flow
    case pendingPayment = "pending_payment"
    case confirmed = "confirmed"

    // Restaurant acceptance window (3 minutes)
    case pendingRestaurant = "pending_restaurant"
    case declinedByRestaurant = "declined_by_restaurant"
    case restaurantTimeout = "restaurant_timeout"

    // Preparation and delivery flow
    case preparing = "preparing"
    case readyForPickup = "ready_for_pickup"

    // Delivery decision window (3 minutes)
    case pendingDeliveryDecision = "pending_delivery_decision"
    case restaurantWillDeliver = "restaurant_will_deliver"
    case deliveryDecisionTimeout = "delivery_decision_timeout"

    case outForDelivery = "out_for_delivery"
    case delivered = "delivered"
    case cancelled = "cancelled"

    // Modification flow
    case pendingModification = "pending_modification"

    /// Display name for UI
    public var displayName: String {
        switch self {
        case .pendingPayment:
            return "Pending Payment"
        case .confirmed:
            return "Order Confirmed"
        case .pendingRestaurant:
            return "Waiting for Restaurant"
        case .declinedByRestaurant:
            return "Restaurant Declined"
        case .restaurantTimeout:
            return "Restaurant Timeout"
        case .preparing:
            return "Being Prepared"
        case .readyForPickup:
            return "Ready for Pickup"
        case .pendingDeliveryDecision:
            return "Delivery Decision Pending"
        case .restaurantWillDeliver:
            return "Restaurant Delivering"
        case .deliveryDecisionTimeout:
            return "Sent to Drivers"
        case .outForDelivery:
            return "Out for Delivery"
        case .delivered:
            return "Delivered"
        case .cancelled:
            return "Cancelled"
        case .pendingModification:
            return "Action Required"
        }
    }

    /// Check if order is active (not completed, cancelled, or failed)
    public var isActive: Bool {
        switch self {
        case .delivered, .cancelled, .declinedByRestaurant, .restaurantTimeout, .deliveryDecisionTimeout:
            return false
        default:
            return true
        }
    }

    /// Check if order requires restaurant action (accept/decline or delivery decision)
    public var requiresRestaurantAction: Bool {
        switch self {
        case .pendingRestaurant, .pendingDeliveryDecision:
            return true
        default:
            return false
        }
    }

    /// Check if order can be cancelled by customer
    public var canCancel: Bool {
        switch self {
        case .pendingPayment, .confirmed, .pendingRestaurant, .pendingModification:
            return true
        default:
            return false
        }
    }

    /// Check if order is in a terminal/final state
    public var isTerminal: Bool {
        switch self {
        case .delivered, .cancelled, .declinedByRestaurant, .restaurantTimeout:
            return true
        default:
            return false
        }
    }

    /// Check if customer should receive refund for this status
    public var shouldRefund: Bool {
        switch self {
        case .cancelled, .declinedByRestaurant, .restaurantTimeout:
            return true
        default:
            return false
        }
    }

    /// Create from any string status (case-insensitive)
    public static func from(_ status: String?) -> OrderStatus {
        guard let status = status?.lowercased() else { return .confirmed }

        // Direct matches
        if let match = OrderStatus.allCases.first(where: { $0.rawValue == status }) {
            return match
        }

        // Legacy/alternate mappings
        switch status {
        case "order_placed", "placed":
            return .confirmed
        case "accepted":
            return .preparing
        case "ready":
            return .readyForPickup
        case "picked_up":
            return .outForDelivery
        case "out for delivery":
            return .outForDelivery
        case "pending_restaurant_delivery", "pending restaurant delivery":
            return .pendingDeliveryDecision
        case "restaurant_delivering", "self_delivering":
            return .restaurantWillDeliver
        default:
            return .confirmed
        }
    }
}

// MARK: - Legacy Delivery Order Status (Deprecated)
@available(*, deprecated, renamed: "OrderStatus")
public typealias DeliveryOrderStatus = OrderStatus

// MARK: - Order Modification (Partial Order Support)
public struct OrderModification: Codable, Identifiable {
    public var id: String { modificationNumber }
    public let modificationNumber: String
    public let orderId: Int

    // Unavailable items
    public let unavailableItems: [UnavailableItem]
    public let unavailableCount: Int

    // Available items (what customer will receive)
    public let availableItems: [ModifiedOrderItem]
    public let availableCount: Int

    // Pricing
    public let originalTotal: Double
    public let newTotal: Double
    public let partialRefundAmount: Double

    // Timing
    public let timeRemainingSeconds: Int
    public let expiresAt: String
    public let isExpired: Bool

    // Restaurant
    public let restaurantName: String?

    enum CodingKeys: String, CodingKey {
        case modificationNumber = "modification_number"
        case orderId = "order_id"
        case unavailableItems = "unavailable_items"
        case unavailableCount = "unavailable_count"
        case availableItems = "available_items"
        case availableCount = "available_count"
        case originalTotal = "original_total"
        case newTotal = "new_total"
        case partialRefundAmount = "partial_refund_amount"
        case timeRemainingSeconds = "time_remaining_seconds"
        case expiresAt = "expires_at"
        case isExpired = "is_expired"
        case restaurantName = "restaurant_name"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        modificationNumber = try container.decodeIfPresent(String.self, forKey: .modificationNumber) ?? ""
        orderId = try container.decodeIfPresent(Int.self, forKey: .orderId) ?? 0
        unavailableItems = try container.decodeIfPresent([UnavailableItem].self, forKey: .unavailableItems) ?? []
        unavailableCount = try container.decodeIfPresent(Int.self, forKey: .unavailableCount) ?? 0
        availableItems = try container.decodeIfPresent([ModifiedOrderItem].self, forKey: .availableItems) ?? []
        availableCount = try container.decodeIfPresent(Int.self, forKey: .availableCount) ?? 0
        originalTotal = try container.decodeIfPresent(Double.self, forKey: .originalTotal) ?? 0
        newTotal = try container.decodeIfPresent(Double.self, forKey: .newTotal) ?? 0
        partialRefundAmount = try container.decodeIfPresent(Double.self, forKey: .partialRefundAmount) ?? 0
        timeRemainingSeconds = try container.decodeIfPresent(Int.self, forKey: .timeRemainingSeconds) ?? 0
        expiresAt = try container.decodeIfPresent(String.self, forKey: .expiresAt) ?? ""
        isExpired = try container.decodeIfPresent(Bool.self, forKey: .isExpired) ?? false
        restaurantName = try container.decodeIfPresent(String.self, forKey: .restaurantName)
    }
}

public struct UnavailableItem: Codable, Identifiable {
    public var id: String { name }
    public let name: String
    public let price: Double
    public let quantity: Int
    public let reason: String
    public let itemIndex: Int?

    enum CodingKeys: String, CodingKey {
        case name, price, quantity, reason
        case itemIndex = "item_index"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        price = try container.decodeIfPresent(Double.self, forKey: .price) ?? 0
        quantity = try container.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        reason = try container.decodeIfPresent(String.self, forKey: .reason) ?? "out of stock"
        itemIndex = try container.decodeIfPresent(Int.self, forKey: .itemIndex)
    }
}

public struct ModifiedOrderItem: Codable, Identifiable {
    public var id: String { name }
    public let name: String
    public let price: Double
    public let quantity: Int
    public let totalPrice: Double?

    enum CodingKeys: String, CodingKey {
        case name, price, quantity
        case totalPrice = "total_price"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        price = try container.decodeIfPresent(Double.self, forKey: .price) ?? 0
        quantity = try container.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        totalPrice = try container.decodeIfPresent(Double.self, forKey: .totalPrice)
    }
}

public struct Order: Identifiable, Codable {
    public var id: String?
    public var orderId: String
    public var customerId: String
    public var customerName: String
    public var customerPhone: String?
    public var customerEmail: String
    
    public var deliveryAddress: DeliveryAddress
    public var deliveryInstructions: String
    
    public var restaurant: RestaurantInfo
    
    public var items: [OrderItem]
    public var itemsCount: Int
    
    public var subtotal: Double
    public var deliveryFee: Double
    public var serviceFee: Double
    public var priorityFee: Double
    public var smallOrderFee: Double
    public var platformFee: Double // Tiered: $1 (≤$35), $2 ($35-$70), $3 (>$70)

    // Promotions & Discounts
    public var promotionCode: String?
    public var discount: Double
    public var discountType: String? // "percentage" | "fixed"

    // Tax Details
    public var tax: Double
    public var taxRate: Double // Actual percentage (e.g., 7.25)
    public var taxState: String? // "CA", "NY", etc.
    
    // Tip
    public var tip: Double
    public var tipPercentage: Double? // 15, 20, 25
    
    public var total: Double
    
    public var status: String
    public var placedAt: Int64
    public var acceptedAt: Int64?
    public var preparedAt: Int64?
    public var pickedUpAt: Int64?
    public var deliveredAt: Int64?
    
    public var estimatedDeliveryTime: Int64?
    
    // Driver Info
    public var driverId: String?
    public var driverName: String?
    public var driverPhone: String?
    public var driverRating: Double? // Driver's current rating when assigned
    
    // Distance (calculated)
    public var restaurantToCustomerDistance: Double? // miles
    
    // Rating & Tip Status
    public var isRated: Bool  // Driver rated
    public var isRestaurantRated: Bool  // Restaurant rated
    public var isTipped: Bool

    enum CodingKeys: String, CodingKey {
        case id, orderId, customerId, customerName, customerPhone, customerEmail
        case deliveryAddress, deliveryInstructions, restaurant, items, itemsCount
        case subtotal, deliveryFee, serviceFee, priorityFee, smallOrderFee, platformFee
        case promotionCode, discount, discountType
        case tax, taxRate, taxState
        case tip, tipPercentage
        case total
        case status, placedAt, acceptedAt, preparedAt, pickedUpAt, deliveredAt
        case estimatedDeliveryTime, driverId, driverName, driverPhone, driverRating
        case restaurantToCustomerDistance, isRated, isRestaurantRated, isTipped
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decodeIfPresent(String.self, forKey: .id)
        orderId = try container.decodeIfPresent(String.self, forKey: .orderId) ?? ""
        customerId = try container.decodeIfPresent(String.self, forKey: .customerId) ?? ""
        customerName = try container.decodeIfPresent(String.self, forKey: .customerName) ?? ""
        customerPhone = try container.decodeIfPresent(String.self, forKey: .customerPhone)
        customerEmail = try container.decodeIfPresent(String.self, forKey: .customerEmail) ?? ""
        
        deliveryAddress = try container.decodeIfPresent(DeliveryAddress.self, forKey: .deliveryAddress) ?? DeliveryAddress()
        deliveryInstructions = try container.decodeIfPresent(String.self, forKey: .deliveryInstructions) ?? ""
        restaurant = try container.decodeIfPresent(RestaurantInfo.self, forKey: .restaurant) ?? RestaurantInfo()
        items = try container.decodeIfPresent([OrderItem].self, forKey: .items) ?? []
        itemsCount = try container.decodeIfPresent(Int.self, forKey: .itemsCount) ?? 0
        
        subtotal = try container.decodeIfPresent(Double.self, forKey: .subtotal) ?? 0.0
        deliveryFee = try container.decodeIfPresent(Double.self, forKey: .deliveryFee) ?? 0.0
        serviceFee = try container.decodeIfPresent(Double.self, forKey: .serviceFee) ?? 0.0
        priorityFee = try container.decodeIfPresent(Double.self, forKey: .priorityFee) ?? 0.0
        smallOrderFee = try container.decodeIfPresent(Double.self, forKey: .smallOrderFee) ?? 0.0
        platformFee = try container.decodeIfPresent(Double.self, forKey: .platformFee) ?? 0.0

        promotionCode = try container.decodeIfPresent(String.self, forKey: .promotionCode)
        discount = try container.decodeIfPresent(Double.self, forKey: .discount) ?? 0.0
        discountType = try container.decodeIfPresent(String.self, forKey: .discountType)
        
        tax = try container.decodeIfPresent(Double.self, forKey: .tax) ?? 0.0
        taxRate = try container.decodeIfPresent(Double.self, forKey: .taxRate) ?? 0.0
        taxState = try container.decodeIfPresent(String.self, forKey: .taxState)
        
        tip = try container.decodeIfPresent(Double.self, forKey: .tip) ?? 0.0
        tipPercentage = try container.decodeIfPresent(Double.self, forKey: .tipPercentage)
        
        total = try container.decodeIfPresent(Double.self, forKey: .total) ?? 0.0
        
        status = try container.decodeIfPresent(String.self, forKey: .status) ?? "Placed"
        placedAt = try container.decodeIfPresent(Int64.self, forKey: .placedAt) ?? Int64(Date().timeIntervalSince1970 * 1000)
        acceptedAt = try container.decodeIfPresent(Int64.self, forKey: .acceptedAt)
        preparedAt = try container.decodeIfPresent(Int64.self, forKey: .preparedAt)
        pickedUpAt = try container.decodeIfPresent(Int64.self, forKey: .pickedUpAt)
        deliveredAt = try container.decodeIfPresent(Int64.self, forKey: .deliveredAt)
        
        // Custom decoding for estimatedDeliveryTime
        if let timeInt = try? container.decode(Int64.self, forKey: .estimatedDeliveryTime) {
            estimatedDeliveryTime = timeInt
        } else if let timeStr = try? container.decode(String.self, forKey: .estimatedDeliveryTime), let timeInt = Int64(timeStr) {
            estimatedDeliveryTime = timeInt
        } else {
            estimatedDeliveryTime = nil
        }
        
        driverId = try container.decodeIfPresent(String.self, forKey: .driverId)
        driverName = try container.decodeIfPresent(String.self, forKey: .driverName)
        driverPhone = try container.decodeIfPresent(String.self, forKey: .driverPhone)
        driverRating = try container.decodeIfPresent(Double.self, forKey: .driverRating)
        
        restaurantToCustomerDistance = try container.decodeIfPresent(Double.self, forKey: .restaurantToCustomerDistance)
        isRated = try container.decodeIfPresent(Bool.self, forKey: .isRated) ?? false
        isRestaurantRated = try container.decodeIfPresent(Bool.self, forKey: .isRestaurantRated) ?? false
        isTipped = try container.decodeIfPresent(Bool.self, forKey: .isTipped) ?? false
    }
    
    public init(id: String? = nil, orderId: String, customerId: String, customerName: String, customerPhone: String? = nil, customerEmail: String, deliveryAddress: DeliveryAddress, deliveryInstructions: String, restaurant: RestaurantInfo, items: [OrderItem], itemsCount: Int, subtotal: Double, deliveryFee: Double, serviceFee: Double, priorityFee: Double, smallOrderFee: Double, platformFee: Double = 0.0, promotionCode: String? = nil, discount: Double = 0.0, discountType: String? = nil, tax: Double, taxRate: Double = 0.0, taxState: String? = nil, tip: Double = 0.0, tipPercentage: Double? = nil, total: Double, status: String, placedAt: Int64, acceptedAt: Int64? = nil, preparedAt: Int64? = nil, pickedUpAt: Int64? = nil, deliveredAt: Int64? = nil, estimatedDeliveryTime: Int64? = nil, driverId: String? = nil, driverName: String? = nil, driverPhone: String? = nil, driverRating: Double? = nil, restaurantToCustomerDistance: Double? = nil, isRated: Bool = false, isRestaurantRated: Bool = false, isTipped: Bool = false) {
        self.id = id
        self.orderId = orderId
        self.customerId = customerId
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.customerEmail = customerEmail
        self.deliveryAddress = deliveryAddress
        self.deliveryInstructions = deliveryInstructions
        self.restaurant = restaurant
        self.items = items
        self.itemsCount = itemsCount
        self.subtotal = subtotal
        self.deliveryFee = deliveryFee
        self.serviceFee = serviceFee
        self.priorityFee = priorityFee
        self.smallOrderFee = smallOrderFee
        self.platformFee = platformFee
        self.promotionCode = promotionCode
        self.discount = discount
        self.discountType = discountType
        self.tax = tax
        self.taxRate = taxRate
        self.taxState = taxState
        self.tip = tip
        self.tipPercentage = tipPercentage
        self.total = total
        self.status = status
        self.placedAt = placedAt
        self.acceptedAt = acceptedAt
        self.preparedAt = preparedAt
        self.pickedUpAt = pickedUpAt
        self.deliveredAt = deliveredAt
        self.estimatedDeliveryTime = estimatedDeliveryTime
        self.driverId = driverId
        self.driverName = driverName
        self.driverPhone = driverPhone
        self.driverRating = driverRating
        self.restaurantToCustomerDistance = restaurantToCustomerDistance
        self.isRated = isRated
        self.isRestaurantRated = isRestaurantRated
        self.isTipped = isTipped
    }
    
    public init() {
        self.orderId = UUID().uuidString
        self.customerId = ""
        self.customerName = ""
        self.customerEmail = ""
        self.deliveryAddress = DeliveryAddress()
        self.deliveryInstructions = ""
        self.restaurant = RestaurantInfo()
        self.items = []
        self.itemsCount = 0
        self.subtotal = 0.0
        self.deliveryFee = 0.0
        self.serviceFee = 0.0
        self.priorityFee = 0.0
        self.smallOrderFee = 0.0
        self.platformFee = 0.0
        self.promotionCode = nil
        self.discount = 0.0
        self.discountType = nil
        self.tax = 0.0
        self.taxRate = 0.0
        self.taxState = nil
        self.tip = 0.0
        self.tipPercentage = nil
        self.total = 0.0
        self.status = "Placed"
        self.placedAt = Int64(Date().timeIntervalSince1970 * 1000)
        self.driverRating = nil
        self.restaurantToCustomerDistance = nil
        self.isRated = false
        self.isRestaurantRated = false
        self.isTipped = false
    }
}

public struct DeliveryAddress: Codable {
    public var fullAddress: String
    public var street: String
    public var city: String
    public var state: String
    public var zipCode: String
    public var latitude: Double
    public var longitude: Double
    public var landmark: String?
    public var instructions: String?

    public init(fullAddress: String = "", street: String = "", city: String = "", state: String = "", zipCode: String = "", latitude: Double = 0.0, longitude: Double = 0.0, landmark: String? = nil, instructions: String? = nil) {
        self.fullAddress = fullAddress
        self.street = street
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.latitude = latitude
        self.longitude = longitude
        self.landmark = landmark
        self.instructions = instructions
    }
}

public struct RestaurantInfo: Codable {
    public var id: String
    public var name: String
    public var address: String
    public var latitude: Double
    public var longitude: Double
    public var imageUrl: String
    
    public init(id: String = "", name: String = "", address: String = "", latitude: Double = 0.0, longitude: Double = 0.0, imageUrl: String = "") {
        self.id = id
        self.name = name
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.imageUrl = imageUrl
    }
}

public struct OrderItem: Codable, Identifiable {
    public var id: String
    public var menuItemId: String
    public var name: String
    public var price: Double
    public var quantity: Int
    public var options: [String]?
    public var restaurantId: String? // For multi-restaurant orders
    public var restaurantName: String? // For display purposes

    public init(id: String = UUID().uuidString, menuItemId: String, name: String, price: Double, quantity: Int, options: [String]? = nil, restaurantId: String? = nil, restaurantName: String? = nil) {
        self.id = id
        self.menuItemId = menuItemId
        self.name = name
        self.price = price
        self.quantity = quantity
        self.options = options
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
    }
}

// MARK: - Multi-Restaurant Order Support

/// Order type enum for differentiating order types
public enum OrderType: String, Codable {
    case single = "single"
    case multiRestaurant = "multi_restaurant"
}

/// Multi-restaurant order structure
public struct MultiRestaurantOrder: Identifiable, Codable {
    public var id: String?
    public var orderId: String
    public var orderType: OrderType
    public var customerId: String
    public var customerName: String
    public var customerPhone: String?
    public var customerEmail: String

    public var deliveryAddress: DeliveryAddress
    public var deliveryInstructions: String

    // Multiple restaurants (up to 3)
    public var restaurants: [RestaurantInfo]
    public var itemsByRestaurant: [String: [OrderItem]] // restaurantId -> items
    public var pickupOrder: [String] // Ordered list of restaurantIds for pickup route
    public var pickupStatuses: [String: String] // restaurantId -> status

    // Aggregated items for display
    public var allItems: [OrderItem]
    public var totalItemsCount: Int

    // Pricing
    public var subtotal: Double
    public var platformFee: Double // $1 per restaurant (max $3)
    public var deliveryFee: Double // Base $5 + $2 per extra stop
    public var driverBonus: Double // Extra incentive for multi-stop
    public var serviceFee: Double
    public var tax: Double
    public var taxRate: Double

    // Discounts & Promotions
    public var promotionCodes: [String: String]? // restaurantId -> promoCode
    public var discounts: [String: Double]? // restaurantId -> discount
    public var totalDiscount: Double

    // Tip
    public var tip: Double
    public var tipPercentage: Double?
    public var suggestedTip: Double // Higher for multi-restaurant

    public var total: Double

    // Status & Tracking
    public var status: String
    public var placedAt: Int64
    public var acceptedAt: Int64?
    public var completedAt: Int64?
    public var estimatedDeliveryTime: Int64?

    // Driver Assignment
    public var driverId: String?
    public var driverName: String?
    public var driverPhone: String?
    public var preferredDriverId: String? // Customer's favorite driver
    public var isHighTicket: Bool // True for multi-restaurant orders

    // Rating
    public var isRated: Bool  // Driver rated
    public var isRestaurantRated: Bool  // Restaurant rated
    public var isTipped: Bool

    public init(
        id: String? = nil,
        orderId: String = UUID().uuidString,
        customerId: String,
        customerName: String,
        customerPhone: String? = nil,
        customerEmail: String,
        deliveryAddress: DeliveryAddress,
        deliveryInstructions: String = "",
        restaurants: [RestaurantInfo],
        itemsByRestaurant: [String: [OrderItem]],
        tip: Double = 0.0,
        tipPercentage: Double? = nil,
        preferredDriverId: String? = nil
    ) {
        self.id = id
        self.orderId = orderId
        self.orderType = restaurants.count > 1 ? .multiRestaurant : .single
        self.customerId = customerId
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.customerEmail = customerEmail
        self.deliveryAddress = deliveryAddress
        self.deliveryInstructions = deliveryInstructions
        self.restaurants = restaurants
        self.itemsByRestaurant = itemsByRestaurant
        self.pickupOrder = restaurants.map { $0.id }
        self.pickupStatuses = Dictionary(uniqueKeysWithValues: restaurants.map { ($0.id, "pending") })

        // Calculate all items
        self.allItems = itemsByRestaurant.values.flatMap { $0 }
        self.totalItemsCount = allItems.reduce(0) { $0 + $1.quantity }

        // Calculate pricing using centralized config
        self.subtotal = allItems.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        self.platformFee = Double(restaurants.count) * AppConfig.shared.platformFeePerRestaurant // $1 per restaurant (from AppConfig)
        self.deliveryFee = AppConfig.shared.baseDeliveryFee + Double(max(0, restaurants.count - 1)) * AppConfig.shared.extraStopFee // Base + $2 per extra stop
        self.driverBonus = restaurants.count > 1 ? Double(restaurants.count - 1) * AppConfig.shared.extraStopFee : 0.0 // Bonus for multi-stop
        self.serviceFee = 0.0
        self.tax = subtotal * AppConfig.shared.taxRate // Tax rate from AppConfig (e.g., 0.08 = 8%)
        self.taxRate = AppConfig.shared.taxRate * 100 // Convert decimal to percentage for display

        self.promotionCodes = nil
        self.discounts = nil
        self.totalDiscount = 0.0

        self.tip = tip
        self.tipPercentage = tipPercentage
        self.suggestedTip = subtotal * 0.20 // 20% suggested for multi-restaurant

        self.total = subtotal + platformFee + deliveryFee + serviceFee + tax + tip - totalDiscount

        self.status = "Placed"
        self.placedAt = Int64(Date().timeIntervalSince1970 * 1000)
        self.estimatedDeliveryTime = nil

        self.driverId = nil
        self.driverName = nil
        self.driverPhone = nil
        self.preferredDriverId = preferredDriverId
        self.isHighTicket = restaurants.count > 1

        self.isRated = false
        self.isRestaurantRated = false
        self.isTipped = false
    }

    /// Recalculates all pricing fields using centralized config
    public mutating func recalculatePricing() {
        self.allItems = itemsByRestaurant.values.flatMap { $0 }
        self.totalItemsCount = allItems.reduce(0) { $0 + $1.quantity }
        self.subtotal = allItems.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        self.platformFee = Double(restaurants.count) * AppConfig.shared.platformFeePerRestaurant
        self.deliveryFee = AppConfig.shared.baseDeliveryFee + Double(max(0, restaurants.count - 1)) * AppConfig.shared.extraStopFee
        self.driverBonus = restaurants.count > 1 ? Double(restaurants.count - 1) * AppConfig.shared.extraStopFee : 0.0
        self.tax = subtotal * AppConfig.shared.taxRate
        self.taxRate = AppConfig.shared.taxRate * 100
        self.suggestedTip = subtotal * AppConfig.shared.defaultTipRate
        self.total = subtotal + platformFee + deliveryFee + serviceFee + tax + tip - totalDiscount
        self.isHighTicket = restaurants.count > 1
    }
}
