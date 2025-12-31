import Foundation

// MARK: - Rating Model
public struct Rating: Identifiable, Codable {
    public var id: String?
    public var orderId: String
    public var customerId: String
    public var customerName: String
    public var driverId: String
    public var driverName: String
    public var restaurantId: String
    
    // Rating Details
    public var rating: Int // 1-5 stars
    public var comment: String?
    
    // Category Ratings
    public var onTime: Bool
    public var friendly: Bool
    public var followedInstructions: Bool
    public var foodQuality: Bool
    
    // Metadata
    public var createdAt: Int64
    
    public init(id: String? = nil, orderId: String, customerId: String, customerName: String, driverId: String, driverName: String, restaurantId: String, rating: Int, comment: String? = nil, onTime: Bool = true, friendly: Bool = true, followedInstructions: Bool = true, foodQuality: Bool = true, createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.id = id
        self.orderId = orderId
        self.customerId = customerId
        self.customerName = customerName
        self.driverId = driverId
        self.driverName = driverName
        self.restaurantId = restaurantId
        self.rating = rating
        self.comment = comment
        self.onTime = onTime
        self.friendly = friendly
        self.followedInstructions = followedInstructions
        self.foodQuality = foodQuality
        self.createdAt = createdAt
    }
}

// MARK: - Driver Session Model
public struct DriverSession: Identifiable, Codable {
    public var id: String?
    public var driverId: String
    
    // Session Time
    public var startTime: Int64
    public var endTime: Int64?
    public var duration: Double? // hours
    
    // Location
    public var startLocation: LocationCoordinate?
    public var endLocation: LocationCoordinate?
    
    // Performance
    public var deliveriesCompleted: Int
    public var deliveriesCancelled: Int
    public var totalDistance: Double // miles
    public var totalEarnings: Double
    
    // Metadata
    public var deviceInfo: String?
    public var appVersion: String?
    
    public init(id: String? = nil, driverId: String, startTime: Int64 = Int64(Date().timeIntervalSince1970 * 1000), endTime: Int64? = nil, duration: Double? = nil, startLocation: LocationCoordinate? = nil, endLocation: LocationCoordinate? = nil, deliveriesCompleted: Int = 0, deliveriesCancelled: Int = 0, totalDistance: Double = 0.0, totalEarnings: Double = 0.0, deviceInfo: String? = nil, appVersion: String? = nil) {
        self.id = id
        self.driverId = driverId
        self.startTime = startTime
        self.endTime = endTime
        self.duration = duration
        self.startLocation = startLocation
        self.endLocation = endLocation
        self.deliveriesCompleted = deliveriesCompleted
        self.deliveriesCancelled = deliveriesCancelled
        self.totalDistance = totalDistance
        self.totalEarnings = totalEarnings
        self.deviceInfo = deviceInfo
        self.appVersion = appVersion
    }
}

public struct LocationCoordinate: Codable {
    public var latitude: Double
    public var longitude: Double
    
    public init(latitude: Double = 0.0, longitude: Double = 0.0) {
        self.latitude = latitude
        self.longitude = longitude
    }
}

// MARK: - Promotion Model
public struct Promotion: Identifiable, Codable {
    public var id: String?
    public var restaurantId: String
    public var code: String // "SAVE20", "FREESHIP"
    public var title: String
    public var description: String
    
    // Discount Details
    public var discountType: String // "percentage" | "fixed"
    public var discountValue: Double // 20.0 for 20% or 5.0 for $5 off
    public var maxDiscount: Double? // Max discount for percentage (e.g., $10 max)
    
    // Conditions
    public var minimumOrder: Double // Minimum order amount
    public var applicableOn: String // "subtotal" | "delivery" | "total"
    public var maxUsagePerUser: Int
    public var totalUsageLimit: Int?
    
    // Timing
    public var startDate: Int64
    public var endDate: Int64
    public var isActive: Bool
    
    // Usage Tracking
    public var usageCount: Int
    
    public init(id: String? = nil, restaurantId: String, code: String, title: String, description: String, discountType: String, discountValue: Double, maxDiscount: Double? = nil, minimumOrder: Double = 0.0, applicableOn: String = "subtotal", maxUsagePerUser: Int = 1, totalUsageLimit: Int? = nil, startDate: Int64 = Int64(Date().timeIntervalSince1970 * 1000), endDate: Int64 = Int64(Date().addingTimeInterval(30*24*60*60).timeIntervalSince1970 * 1000), isActive: Bool = true, usageCount: Int = 0) {
        self.id = id
        self.restaurantId = restaurantId
        self.code = code
        self.title = title
        self.description = description
        self.discountType = discountType
        self.discountValue = discountValue
        self.maxDiscount = maxDiscount
        self.minimumOrder = minimumOrder
        self.applicableOn = applicableOn
        self.maxUsagePerUser = maxUsagePerUser
        self.totalUsageLimit = totalUsageLimit
        self.startDate = startDate
        self.endDate = endDate
        self.isActive = isActive
        self.usageCount = usageCount
    }
}

// MARK: - Tip Model
public struct Tip: Identifiable, Codable {
    public var id: String?
    public var orderId: String
    public var customerId: String
    public var driverId: String
    
    // Tip Details
    public var amount: Double
    public var tipType: String // "percentage" | "custom" | "preset"
    public var percentage: Double? // 10, 15, 20, 25
    
    // Thank You
    public var driverThankYouMessage: String?
    public var driverThankedAt: Int64?
    
    // Metadata
    public var createdAt: Int64
    
    public init(id: String? = nil, orderId: String, customerId: String, driverId: String, amount: Double, tipType: String = "percentage", percentage: Double? = nil, driverThankYouMessage: String? = nil, driverThankedAt: Int64? = nil, createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.id = id
        self.orderId = orderId
        self.customerId = customerId
        self.driverId = driverId
        self.amount = amount
        self.tipType = tipType
        self.percentage = percentage
        self.driverThankYouMessage = driverThankYouMessage
        self.driverThankedAt = driverThankedAt
        self.createdAt = createdAt
    }
}

// MARK: - Tax Rate Model (US State-wise)
public struct TaxRate: Codable {
    public var state: String // "CA", "NY", "TX"
    public var stateName: String // "California"
    public var rate: Double // 7.25 for 7.25%
    public var localRate: Double? // Additional local tax
    
    public init(state: String, stateName: String, rate: Double, localRate: Double? = nil) {
        self.state = state
        self.stateName = stateName
        self.rate = rate
        self.localRate = localRate
    }
    
    public var totalRate: Double {
        return rate + (localRate ?? 0.0)
    }
}

// MARK: - Driver Stats Model
public struct DriverStats: Codable {
    public var rating: Double // 1.0-5.0
    public var totalDeliveries: Int
    public var completedDeliveries: Int
    public var cancelledDeliveries: Int
    public var totalEarnings: Double
    public var totalDistance: Double
    public var totalOnlineTime: Double // hours
    
    // Rates
    public var acceptanceRate: Double // 0-100
    public var completionRate: Double // 0-100
    public var onTimeRate: Double // 0-100
    
    // Weekly Stats
    public var weeklyDeliveries: Int
    public var weeklyEarnings: Double
    public var weeklyHours: Double
    public var weeklyDistance: Double
    public var weekStartDate: Int64
    
    public init(rating: Double = 5.0, totalDeliveries: Int = 0, completedDeliveries: Int = 0, cancelledDeliveries: Int = 0, totalEarnings: Double = 0.0, totalDistance: Double = 0.0, totalOnlineTime: Double = 0.0, acceptanceRate: Double = 100.0, completionRate: Double = 100.0, onTimeRate: Double = 100.0, weeklyDeliveries: Int = 0, weeklyEarnings: Double = 0.0, weeklyHours: Double = 0.0, weeklyDistance: Double = 0.0, weekStartDate: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.rating = rating
        self.totalDeliveries = totalDeliveries
        self.completedDeliveries = completedDeliveries
        self.cancelledDeliveries = cancelledDeliveries
        self.totalEarnings = totalEarnings
        self.totalDistance = totalDistance
        self.totalOnlineTime = totalOnlineTime
        self.acceptanceRate = acceptanceRate
        self.completionRate = completionRate
        self.onTimeRate = onTimeRate
        self.weeklyDeliveries = weeklyDeliveries
        self.weeklyEarnings = weeklyEarnings
        self.weeklyHours = weeklyHours
        self.weeklyDistance = weeklyDistance
        self.weekStartDate = weekStartDate
    }
}
