import Foundation
import FirebaseFirestore

public struct Driver: Identifiable, Codable {
    @DocumentID public var id: String?

    // MARK: - Personal Information
    public var name: String
    public var email: String
    public var phone: String
    public var profileImageUrl: String?
    public var dateOfBirth: Int64?
    public var ssn4: String? // Last 4 digits only for verification

    // MARK: - Address
    public var address: DriverAddress?

    // MARK: - Driver's License
    public var driversLicense: DriversLicense?

    // MARK: - Vehicle Information
    public var vehicle: VehicleInfo?
    public var vehicleType: String // Car, Bike, Scooter, Motorcycle, Truck
    public var licensePlate: String

    // MARK: - Insurance
    public var insurance: InsuranceInfo?

    // MARK: - Bank/Payment Information
    public var bankAccount: BankAccountInfo?

    // MARK: - Status & Location
    public var isOnline: Bool
    public var isApproved: Bool
    public var approvalStatus: String // "pending", "approved", "rejected", "suspended"
    public var currentLatitude: Double
    public var currentLongitude: Double
    public var lastActive: Int64?
    public var currentSessionId: String?

    // MARK: - Stats (embedded for quick access)
    public var stats: DriverStats?

    // MARK: - Preferences
    public var preferences: DriverPreferences?

    // MARK: - Metadata
    public var createdAt: Int64
    public var updatedAt: Int64?
    public var onboardingCompletedAt: Int64?

    // MARK: - Background Check
    public var backgroundCheckStatus: String? // "pending", "passed", "failed"
    public var backgroundCheckDate: Int64?

    public init(
        id: String? = nil,
        name: String = "",
        email: String = "",
        phone: String = "",
        profileImageUrl: String? = nil,
        dateOfBirth: Int64? = nil,
        ssn4: String? = nil,
        address: DriverAddress? = nil,
        driversLicense: DriversLicense? = nil,
        vehicle: VehicleInfo? = nil,
        vehicleType: String = "Car",
        licensePlate: String = "",
        insurance: InsuranceInfo? = nil,
        bankAccount: BankAccountInfo? = nil,
        isOnline: Bool = false,
        isApproved: Bool = false,
        approvalStatus: String = "pending",
        currentLatitude: Double = 0.0,
        currentLongitude: Double = 0.0,
        lastActive: Int64? = nil,
        currentSessionId: String? = nil,
        stats: DriverStats? = nil,
        preferences: DriverPreferences? = nil,
        createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        updatedAt: Int64? = nil,
        onboardingCompletedAt: Int64? = nil,
        backgroundCheckStatus: String? = nil,
        backgroundCheckDate: Int64? = nil
    ) {
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.profileImageUrl = profileImageUrl
        self.dateOfBirth = dateOfBirth
        self.ssn4 = ssn4
        self.address = address
        self.driversLicense = driversLicense
        self.vehicle = vehicle
        self.vehicleType = vehicleType
        self.licensePlate = licensePlate
        self.insurance = insurance
        self.bankAccount = bankAccount
        self.isOnline = isOnline
        self.isApproved = isApproved
        self.approvalStatus = approvalStatus
        self.currentLatitude = currentLatitude
        self.currentLongitude = currentLongitude
        self.lastActive = lastActive
        self.currentSessionId = currentSessionId
        self.stats = stats
        self.preferences = preferences
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.onboardingCompletedAt = onboardingCompletedAt
        self.backgroundCheckStatus = backgroundCheckStatus
        self.backgroundCheckDate = backgroundCheckDate
    }
}

// MARK: - Driver Address
public struct DriverAddress: Codable {
    public var street: String
    public var unit: String?
    public var city: String
    public var state: String
    public var zipCode: String
    public var country: String

    public init(
        street: String = "",
        unit: String? = nil,
        city: String = "",
        state: String = "",
        zipCode: String = "",
        country: String = "USA"
    ) {
        self.street = street
        self.unit = unit
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.country = country
    }

    public var fullAddress: String {
        var parts = [street]
        if let unit = unit, !unit.isEmpty { parts.append("Unit \(unit)") }
        parts.append("\(city), \(state) \(zipCode)")
        return parts.joined(separator: ", ")
    }
}

// MARK: - Driver's License
public struct DriversLicense: Codable {
    public var licenseNumber: String
    public var state: String // Issuing state
    public var expirationDate: Int64
    public var licenseClass: String // "A", "B", "C", "D", "M"
    public var frontImageUrl: String?
    public var backImageUrl: String?
    public var isVerified: Bool
    public var verifiedAt: Int64?

    public init(
        licenseNumber: String = "",
        state: String = "",
        expirationDate: Int64 = Int64(Date().addingTimeInterval(365*24*60*60).timeIntervalSince1970 * 1000),
        licenseClass: String = "C",
        frontImageUrl: String? = nil,
        backImageUrl: String? = nil,
        isVerified: Bool = false,
        verifiedAt: Int64? = nil
    ) {
        self.licenseNumber = licenseNumber
        self.state = state
        self.expirationDate = expirationDate
        self.licenseClass = licenseClass
        self.frontImageUrl = frontImageUrl
        self.backImageUrl = backImageUrl
        self.isVerified = isVerified
        self.verifiedAt = verifiedAt
    }

    public var isExpired: Bool {
        return expirationDate < Int64(Date().timeIntervalSince1970 * 1000)
    }

    public var expirationDateFormatted: String {
        let date = Date(timeIntervalSince1970: TimeInterval(expirationDate / 1000))
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

// MARK: - Vehicle Information
public struct VehicleInfo: Codable {
    public var make: String // Toyota, Honda, Ford
    public var model: String // Camry, Civic, F-150
    public var year: Int
    public var color: String
    public var licensePlate: String
    public var vehicleType: String // Sedan, SUV, Truck, Motorcycle, Bicycle, Scooter

    // Registration
    public var registrationNumber: String?
    public var registrationExpirationDate: Int64?
    public var registrationImageUrl: String?

    public var isVerified: Bool

    public init(
        make: String = "",
        model: String = "",
        year: Int = Calendar.current.component(.year, from: Date()),
        color: String = "",
        licensePlate: String = "",
        vehicleType: String = "Sedan",
        registrationNumber: String? = nil,
        registrationExpirationDate: Int64? = nil,
        registrationImageUrl: String? = nil,
        isVerified: Bool = false
    ) {
        self.make = make
        self.model = model
        self.year = year
        self.color = color
        self.licensePlate = licensePlate
        self.vehicleType = vehicleType
        self.registrationNumber = registrationNumber
        self.registrationExpirationDate = registrationExpirationDate
        self.registrationImageUrl = registrationImageUrl
        self.isVerified = isVerified
    }

    public var displayName: String {
        return "\(year) \(make) \(model)"
    }
}

// MARK: - Insurance Information
public struct InsuranceInfo: Codable {
    public var provider: String // State Farm, Geico, Progressive
    public var policyNumber: String
    public var expirationDate: Int64
    public var coverageType: String // "liability", "full_coverage"
    public var insuranceCardImageUrl: String?
    public var isVerified: Bool

    public init(
        provider: String = "",
        policyNumber: String = "",
        expirationDate: Int64 = Int64(Date().addingTimeInterval(180*24*60*60).timeIntervalSince1970 * 1000),
        coverageType: String = "full_coverage",
        insuranceCardImageUrl: String? = nil,
        isVerified: Bool = false
    ) {
        self.provider = provider
        self.policyNumber = policyNumber
        self.expirationDate = expirationDate
        self.coverageType = coverageType
        self.insuranceCardImageUrl = insuranceCardImageUrl
        self.isVerified = isVerified
    }

    public var isExpired: Bool {
        return expirationDate < Int64(Date().timeIntervalSince1970 * 1000)
    }
}

// MARK: - Bank Account Information
public struct BankAccountInfo: Codable {
    public var bankName: String
    public var accountHolderName: String
    public var accountType: String // "checking", "savings"
    public var routingNumber: String // Should be encrypted in production
    public var accountNumberLast4: String // Only store last 4 digits
    public var isVerified: Bool
    public var stripeConnectId: String? // For Stripe Connect payouts

    public init(
        bankName: String = "",
        accountHolderName: String = "",
        accountType: String = "checking",
        routingNumber: String = "",
        accountNumberLast4: String = "",
        isVerified: Bool = false,
        stripeConnectId: String? = nil
    ) {
        self.bankName = bankName
        self.accountHolderName = accountHolderName
        self.accountType = accountType
        self.routingNumber = routingNumber
        self.accountNumberLast4 = accountNumberLast4
        self.isVerified = isVerified
        self.stripeConnectId = stripeConnectId
    }
}

// MARK: - Driver Preferences
public struct DriverPreferences: Codable {
    public var maxDeliveryDistance: Double // miles
    public var preferredAreas: [String] // Zip codes or neighborhoods
    public var acceptCashOrders: Bool
    public var notificationsEnabled: Bool
    public var soundEnabled: Bool
    public var autoAcceptOrders: Bool
    public var preferredShifts: [String] // "morning", "afternoon", "evening", "night"

    public init(
        maxDeliveryDistance: Double = 10.0,
        preferredAreas: [String] = [],
        acceptCashOrders: Bool = true,
        notificationsEnabled: Bool = true,
        soundEnabled: Bool = true,
        autoAcceptOrders: Bool = false,
        preferredShifts: [String] = ["morning", "afternoon", "evening"]
    ) {
        self.maxDeliveryDistance = maxDeliveryDistance
        self.preferredAreas = preferredAreas
        self.acceptCashOrders = acceptCashOrders
        self.notificationsEnabled = notificationsEnabled
        self.soundEnabled = soundEnabled
        self.autoAcceptOrders = autoAcceptOrders
        self.preferredShifts = preferredShifts
    }
}
