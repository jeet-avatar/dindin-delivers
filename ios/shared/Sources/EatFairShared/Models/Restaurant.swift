import Foundation
@preconcurrency import FirebaseFirestore

public struct Restaurant: Identifiable, Codable, Sendable {
    @DocumentID public var id: String?
    public var name: String
    public var cuisine: String
    public var rating: Double
    public var deliveryTime: String // e.g. "30-45"
    public var imageUrl: String
    public var address: String
    public var latitude: Double
    public var longitude: Double
    public var phone: String
    
    // Additional fields for Restaurant App profile
    public var street: String?
    public var unit: String?
    public var city: String?
    public var state: String?
    public var zipCode: String?
    public var instructions: String?
    
    public init(id: String? = nil, name: String, cuisine: String, rating: Double, deliveryTime: String, imageUrl: String, address: String, latitude: Double, longitude: Double, phone: String) {
        self.id = id
        self.name = name
        self.cuisine = cuisine
        self.rating = rating
        self.deliveryTime = deliveryTime
        self.imageUrl = imageUrl
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.phone = phone
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        _id = try container.decode(DocumentID<String>.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Unknown Restaurant"
        cuisine = try container.decodeIfPresent(String.self, forKey: .cuisine) ?? "General"
        rating = try container.decodeIfPresent(Double.self, forKey: .rating) ?? 0.0
        deliveryTime = try container.decodeIfPresent(String.self, forKey: .deliveryTime) ?? "30-45 min"
        imageUrl = try container.decodeIfPresent(String.self, forKey: .imageUrl) ?? ""
        address = try container.decodeIfPresent(String.self, forKey: .address) ?? ""
        latitude = try container.decodeIfPresent(Double.self, forKey: .latitude) ?? 0.0
        longitude = try container.decodeIfPresent(Double.self, forKey: .longitude) ?? 0.0
        phone = try container.decodeIfPresent(String.self, forKey: .phone) ?? ""
        
        street = try container.decodeIfPresent(String.self, forKey: .street)
        unit = try container.decodeIfPresent(String.self, forKey: .unit)
        city = try container.decodeIfPresent(String.self, forKey: .city)
        state = try container.decodeIfPresent(String.self, forKey: .state)
        zipCode = try container.decodeIfPresent(String.self, forKey: .zipCode)
        instructions = try container.decodeIfPresent(String.self, forKey: .instructions)
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case name, cuisine, rating, deliveryTime, imageUrl, address, latitude, longitude, phone
        case street, unit, city, state, zipCode, instructions
    }
}

public struct MenuItem: Identifiable, Codable, Sendable {
    @DocumentID public var id: String?
    public var name: String
    public var description: String
    public var price: Double
    public var imageUrl: String
    public var isAvailable: Bool
    public var category: String?

    // Enhanced fields for restaurant management
    public var isPopular: Bool
    public var prepTime: Int // Preparation time in minutes
    public var createdAt: Int64?
    public var updatedAt: Int64?

    // Nutritional & dietary info for future
    public var calories: Int?
    public var allergens: [String]?
    public var dietaryTags: [String]? // vegetarian, vegan, gluten-free, etc.

    public init(
        id: String? = nil,
        name: String,
        description: String,
        price: Double,
        imageUrl: String,
        isAvailable: Bool = true,
        category: String? = nil,
        isPopular: Bool = false,
        prepTime: Int = 15,
        createdAt: Int64? = nil,
        updatedAt: Int64? = nil,
        calories: Int? = nil,
        allergens: [String]? = nil,
        dietaryTags: [String]? = nil
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.price = price
        self.imageUrl = imageUrl
        self.isAvailable = isAvailable
        self.category = category
        self.isPopular = isPopular
        self.prepTime = prepTime
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.calories = calories
        self.allergens = allergens
        self.dietaryTags = dietaryTags
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        _id = try container.decode(DocumentID<String>.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        price = try container.decodeIfPresent(Double.self, forKey: .price) ?? 0.0
        imageUrl = try container.decodeIfPresent(String.self, forKey: .imageUrl) ?? ""
        isAvailable = try container.decodeIfPresent(Bool.self, forKey: .isAvailable) ?? true
        category = try container.decodeIfPresent(String.self, forKey: .category)
        isPopular = try container.decodeIfPresent(Bool.self, forKey: .isPopular) ?? false
        prepTime = try container.decodeIfPresent(Int.self, forKey: .prepTime) ?? 15
        createdAt = try container.decodeIfPresent(Int64.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Int64.self, forKey: .updatedAt)
        calories = try container.decodeIfPresent(Int.self, forKey: .calories)
        allergens = try container.decodeIfPresent([String].self, forKey: .allergens)
        dietaryTags = try container.decodeIfPresent([String].self, forKey: .dietaryTags)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, description, price, imageUrl, isAvailable, category
        case isPopular, prepTime, createdAt, updatedAt
        case calories, allergens, dietaryTags
    }
}

// MARK: - Restaurant Business Documents

/// Business License information for restaurant verification
public struct BusinessLicense: Codable {
    public var licenseNumber: String
    public var businessName: String
    public var issuingAuthority: String // City/County
    public var issueDate: Int64
    public var expirationDate: Int64
    public var licenseType: String // "food_service", "retail_food", "restaurant"
    public var imageUrl: String?
    public var isVerified: Bool
    public var verifiedAt: Int64?
    public var rejectionReason: String?

    public init(
        licenseNumber: String = "",
        businessName: String = "",
        issuingAuthority: String = "",
        issueDate: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        expirationDate: Int64 = Int64(Date().addingTimeInterval(365*24*60*60).timeIntervalSince1970 * 1000),
        licenseType: String = "restaurant",
        imageUrl: String? = nil,
        isVerified: Bool = false,
        verifiedAt: Int64? = nil,
        rejectionReason: String? = nil
    ) {
        self.licenseNumber = licenseNumber
        self.businessName = businessName
        self.issuingAuthority = issuingAuthority
        self.issueDate = issueDate
        self.expirationDate = expirationDate
        self.licenseType = licenseType
        self.imageUrl = imageUrl
        self.isVerified = isVerified
        self.verifiedAt = verifiedAt
        self.rejectionReason = rejectionReason
    }

    public var isExpired: Bool {
        expirationDate < Int64(Date().timeIntervalSince1970 * 1000)
    }

    public var expiresInDays: Int {
        let expirationSeconds = TimeInterval(expirationDate / 1000)
        let daysRemaining = (expirationSeconds - Date().timeIntervalSince1970) / (24 * 60 * 60)
        return max(0, Int(daysRemaining))
    }
}

/// Tax identification for restaurant business
public struct TaxIdentification: Codable {
    public var ein: String // Employer Identification Number (masked as XXX-XX-XXXX)
    public var ein4: String? // Last 4 digits for display
    public var businessType: String // "sole_proprietor", "llc", "corporation", "partnership"
    public var w9ImageUrl: String?
    public var isVerified: Bool
    public var verifiedAt: Int64?

    public init(
        ein: String = "",
        ein4: String? = nil,
        businessType: String = "llc",
        w9ImageUrl: String? = nil,
        isVerified: Bool = false,
        verifiedAt: Int64? = nil
    ) {
        self.ein = ein
        self.ein4 = ein4
        self.businessType = businessType
        self.w9ImageUrl = w9ImageUrl
        self.isVerified = isVerified
        self.verifiedAt = verifiedAt
    }
}

/// Food Handler Certificate for food safety compliance
public struct FoodHandlerCertificate: Codable {
    public var certificateNumber: String
    public var holderName: String
    public var issuingOrganization: String // "ServSafe", "State Health Dept", etc.
    public var issueDate: Int64
    public var expirationDate: Int64
    public var certificateType: String // "food_handler", "food_manager", "allergen"
    public var imageUrl: String?
    public var isVerified: Bool
    public var verifiedAt: Int64?

    public init(
        certificateNumber: String = "",
        holderName: String = "",
        issuingOrganization: String = "",
        issueDate: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        expirationDate: Int64 = Int64(Date().addingTimeInterval(2*365*24*60*60).timeIntervalSince1970 * 1000),
        certificateType: String = "food_handler",
        imageUrl: String? = nil,
        isVerified: Bool = false,
        verifiedAt: Int64? = nil
    ) {
        self.certificateNumber = certificateNumber
        self.holderName = holderName
        self.issuingOrganization = issuingOrganization
        self.issueDate = issueDate
        self.expirationDate = expirationDate
        self.certificateType = certificateType
        self.imageUrl = imageUrl
        self.isVerified = isVerified
        self.verifiedAt = verifiedAt
    }

    public var isExpired: Bool {
        expirationDate < Int64(Date().timeIntervalSince1970 * 1000)
    }

    public var expiresInDays: Int {
        let expirationSeconds = TimeInterval(expirationDate / 1000)
        let daysRemaining = (expirationSeconds - Date().timeIntervalSince1970) / (24 * 60 * 60)
        return max(0, Int(daysRemaining))
    }
}

/// Health Permit from local health department
public struct HealthPermit: Codable {
    public var permitNumber: String
    public var issuingDepartment: String
    public var issueDate: Int64
    public var expirationDate: Int64
    public var lastInspectionDate: Int64?
    public var lastInspectionScore: Int? // 0-100
    public var imageUrl: String?
    public var isVerified: Bool
    public var verifiedAt: Int64?

    public init(
        permitNumber: String = "",
        issuingDepartment: String = "",
        issueDate: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        expirationDate: Int64 = Int64(Date().addingTimeInterval(365*24*60*60).timeIntervalSince1970 * 1000),
        lastInspectionDate: Int64? = nil,
        lastInspectionScore: Int? = nil,
        imageUrl: String? = nil,
        isVerified: Bool = false,
        verifiedAt: Int64? = nil
    ) {
        self.permitNumber = permitNumber
        self.issuingDepartment = issuingDepartment
        self.issueDate = issueDate
        self.expirationDate = expirationDate
        self.lastInspectionDate = lastInspectionDate
        self.lastInspectionScore = lastInspectionScore
        self.imageUrl = imageUrl
        self.isVerified = isVerified
        self.verifiedAt = verifiedAt
    }

    public var isExpired: Bool {
        expirationDate < Int64(Date().timeIntervalSince1970 * 1000)
    }
}

/// Restaurant Bank Account for payouts
public struct RestaurantBankAccount: Codable {
    public var bankName: String
    public var accountHolderName: String
    public var accountType: String // "checking", "savings"
    public var routingNumber: String // Masked for security
    public var accountNumber4: String // Last 4 digits only
    public var isVerified: Bool
    public var verifiedAt: Int64?
    public var stripeConnectId: String? // For Stripe Connect integration

    public init(
        bankName: String = "",
        accountHolderName: String = "",
        accountType: String = "checking",
        routingNumber: String = "",
        accountNumber4: String = "",
        isVerified: Bool = false,
        verifiedAt: Int64? = nil,
        stripeConnectId: String? = nil
    ) {
        self.bankName = bankName
        self.accountHolderName = accountHolderName
        self.accountType = accountType
        self.routingNumber = routingNumber
        self.accountNumber4 = accountNumber4
        self.isVerified = isVerified
        self.verifiedAt = verifiedAt
        self.stripeConnectId = stripeConnectId
    }

    public var maskedAccountNumber: String {
        "••••••\(accountNumber4)"
    }
}

/// Container for all restaurant documents
public struct RestaurantDocuments: Codable {
    public var businessLicense: BusinessLicense?
    public var taxIdentification: TaxIdentification?
    public var foodHandlerCertificate: FoodHandlerCertificate?
    public var healthPermit: HealthPermit?
    public var bankAccount: RestaurantBankAccount?
    public var approvalStatus: String // "pending", "approved", "rejected", "incomplete"
    public var submittedAt: Int64?
    public var reviewedAt: Int64?
    public var reviewedBy: String?
    public var notes: String?

    public init(
        businessLicense: BusinessLicense? = nil,
        taxIdentification: TaxIdentification? = nil,
        foodHandlerCertificate: FoodHandlerCertificate? = nil,
        healthPermit: HealthPermit? = nil,
        bankAccount: RestaurantBankAccount? = nil,
        approvalStatus: String = "incomplete",
        submittedAt: Int64? = nil,
        reviewedAt: Int64? = nil,
        reviewedBy: String? = nil,
        notes: String? = nil
    ) {
        self.businessLicense = businessLicense
        self.taxIdentification = taxIdentification
        self.foodHandlerCertificate = foodHandlerCertificate
        self.healthPermit = healthPermit
        self.bankAccount = bankAccount
        self.approvalStatus = approvalStatus
        self.submittedAt = submittedAt
        self.reviewedAt = reviewedAt
        self.reviewedBy = reviewedBy
        self.notes = notes
    }

    public var completionPercentage: Int {
        var completed = 0
        let total = 4 // Required documents

        if businessLicense != nil && businessLicense?.imageUrl != nil { completed += 1 }
        if taxIdentification != nil { completed += 1 }
        if foodHandlerCertificate != nil && foodHandlerCertificate?.imageUrl != nil { completed += 1 }
        if healthPermit != nil && healthPermit?.imageUrl != nil { completed += 1 }

        return (completed * 100) / total
    }

    public var hasExpiringDocuments: Bool {
        let thirtyDays = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let threshold = now + Int64(thirtyDays)

        if let bl = businessLicense, bl.expirationDate < threshold { return true }
        if let fh = foodHandlerCertificate, fh.expirationDate < threshold { return true }
        if let hp = healthPermit, hp.expirationDate < threshold { return true }

        return false
    }
}
