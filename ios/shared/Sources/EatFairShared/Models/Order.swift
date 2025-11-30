import Foundation
import FirebaseFirestore

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
    public var isRated: Bool
    public var isTipped: Bool
    
    enum CodingKeys: String, CodingKey {
        case id, orderId, customerId, customerName, customerPhone, customerEmail
        case deliveryAddress, deliveryInstructions, restaurant, items, itemsCount
        case subtotal, deliveryFee, serviceFee, priorityFee, smallOrderFee
        case promotionCode, discount, discountType
        case tax, taxRate, taxState
        case tip, tipPercentage
        case total
        case status, placedAt, acceptedAt, preparedAt, pickedUpAt, deliveredAt
        case estimatedDeliveryTime, driverId, driverName, driverPhone, driverRating
        case restaurantToCustomerDistance, isRated, isTipped
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
        isTipped = try container.decodeIfPresent(Bool.self, forKey: .isTipped) ?? false
    }
    
    public init(id: String? = nil, orderId: String, customerId: String, customerName: String, customerPhone: String? = nil, customerEmail: String, deliveryAddress: DeliveryAddress, deliveryInstructions: String, restaurant: RestaurantInfo, items: [OrderItem], itemsCount: Int, subtotal: Double, deliveryFee: Double, serviceFee: Double, priorityFee: Double, smallOrderFee: Double, promotionCode: String? = nil, discount: Double = 0.0, discountType: String? = nil, tax: Double, taxRate: Double = 0.0, taxState: String? = nil, tip: Double = 0.0, tipPercentage: Double? = nil, total: Double, status: String, placedAt: Int64, estimatedDeliveryTime: Int64? = nil, driverId: String? = nil, driverName: String? = nil, driverPhone: String? = nil, driverRating: Double? = nil, restaurantToCustomerDistance: Double? = nil, isRated: Bool = false, isTipped: Bool = false) {
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
        self.estimatedDeliveryTime = estimatedDeliveryTime
        self.driverId = driverId
        self.driverName = driverName
        self.driverPhone = driverPhone
        self.driverRating = driverRating
        self.restaurantToCustomerDistance = restaurantToCustomerDistance
        self.isRated = isRated
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
    
    public init(fullAddress: String = "", street: String = "", city: String = "", state: String = "", zipCode: String = "", latitude: Double = 0.0, longitude: Double = 0.0, landmark: String? = nil) {
        self.fullAddress = fullAddress
        self.street = street
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.latitude = latitude
        self.longitude = longitude
        self.landmark = landmark
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
    public var isRated: Bool
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

        // Calculate pricing
        self.subtotal = allItems.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        self.platformFee = Double(restaurants.count) * 1.0 // $1 per restaurant
        self.deliveryFee = 5.0 + Double(max(0, restaurants.count - 1)) * 2.0 // Base + $2 per extra stop
        self.driverBonus = restaurants.count > 1 ? Double(restaurants.count - 1) * 2.0 : 0.0 // Bonus for multi-stop
        self.serviceFee = 0.0
        self.tax = subtotal * 0.10 // 10% tax
        self.taxRate = 10.0

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
        self.isTipped = false
    }

    /// Recalculates all pricing fields
    public mutating func recalculatePricing() {
        self.allItems = itemsByRestaurant.values.flatMap { $0 }
        self.totalItemsCount = allItems.reduce(0) { $0 + $1.quantity }
        self.subtotal = allItems.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        self.platformFee = Double(restaurants.count) * 1.0
        self.deliveryFee = 5.0 + Double(max(0, restaurants.count - 1)) * 2.0
        self.driverBonus = restaurants.count > 1 ? Double(restaurants.count - 1) * 2.0 : 0.0
        self.tax = subtotal * (taxRate / 100.0)
        self.suggestedTip = subtotal * 0.20
        self.total = subtotal + platformFee + deliveryFee + serviceFee + tax + tip - totalDiscount
        self.isHighTicket = restaurants.count > 1
    }
}
