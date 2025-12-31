import Foundation

/// Customer delivery address model
/// Aligned with backend schema and Android (Uber/DoorDash pattern)
public struct Address: Identifiable, Codable, Equatable {
    public var id: String?
    public var userId: String
    public var locationName: String // e.g., "Home", "Work"
    public var street: String
    public var unit: String
    public var city: String
    public var state: String
    public var zipCode: String
    public var instructions: String
    public var addressType: String // "Home", "Work", "Other"
    public var latitude: Double
    public var longitude: Double
    public var phoneNumber: String
    public var isDefault: Bool

    // Backward compatibility property
    public var type: String {
        get { addressType }
        set { addressType = newValue }
    }

    public init(
        id: String? = nil,
        userId: String = "",
        locationName: String = "",
        street: String = "",
        unit: String = "",
        city: String = "",
        state: String = "",
        zipCode: String = "",
        instructions: String = "",
        addressType: String = "Home",
        latitude: Double = 0.0,
        longitude: Double = 0.0,
        phoneNumber: String = "",
        isDefault: Bool = false
    ) {
        self.id = id
        self.userId = userId
        self.locationName = locationName
        self.street = street
        self.unit = unit
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.instructions = instructions
        self.addressType = addressType
        self.latitude = latitude
        self.longitude = longitude
        self.phoneNumber = phoneNumber
        self.isDefault = isDefault
    }

    // Coding keys for JSON encoding/decoding - snake_case to match backend API
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case locationName = "location_name"
        case street
        case unit
        case city
        case state
        case zipCode = "zip_code"
        case instructions
        case addressType = "address_type"
        case latitude
        case longitude
        case phoneNumber = "phone_number"
        case isDefault = "is_default"
        case label  // Backward compatibility with backend
    }

    // Custom decoder to handle missing fields and backward compatibility
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Handle id as either String or Int
        if let idInt = try? container.decode(Int.self, forKey: .id) {
            id = String(idInt)
        } else {
            id = try container.decodeIfPresent(String.self, forKey: .id)
        }

        // Handle userId as either String or Int
        if let userIdInt = try? container.decode(Int.self, forKey: .userId) {
            userId = String(userIdInt)
        } else {
            userId = try container.decodeIfPresent(String.self, forKey: .userId) ?? ""
        }

        // Try location_name first, fall back to label for backward compatibility
        if let locName = try container.decodeIfPresent(String.self, forKey: .locationName) {
            locationName = locName
        } else if let labelName = try container.decodeIfPresent(String.self, forKey: .label) {
            locationName = labelName
        } else {
            locationName = ""
        }

        street = try container.decodeIfPresent(String.self, forKey: .street) ?? ""
        unit = try container.decodeIfPresent(String.self, forKey: .unit) ?? ""
        city = try container.decodeIfPresent(String.self, forKey: .city) ?? ""
        state = try container.decodeIfPresent(String.self, forKey: .state) ?? ""
        zipCode = try container.decodeIfPresent(String.self, forKey: .zipCode) ?? ""
        instructions = try container.decodeIfPresent(String.self, forKey: .instructions) ?? ""
        addressType = try container.decodeIfPresent(String.self, forKey: .addressType) ?? "Home"
        latitude = try container.decodeIfPresent(Double.self, forKey: .latitude) ?? 0.0
        longitude = try container.decodeIfPresent(Double.self, forKey: .longitude) ?? 0.0
        phoneNumber = try container.decodeIfPresent(String.self, forKey: .phoneNumber) ?? ""
        isDefault = try container.decodeIfPresent(Bool.self, forKey: .isDefault) ?? false
    }

    // Custom encoder to ensure snake_case output
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(locationName, forKey: .locationName)
        try container.encode(street, forKey: .street)
        try container.encode(unit, forKey: .unit)
        try container.encode(city, forKey: .city)
        try container.encode(state, forKey: .state)
        try container.encode(zipCode, forKey: .zipCode)
        try container.encode(instructions, forKey: .instructions)
        try container.encode(addressType, forKey: .addressType)
        try container.encode(latitude, forKey: .latitude)
        try container.encode(longitude, forKey: .longitude)
        try container.encode(phoneNumber, forKey: .phoneNumber)
        try container.encode(isDefault, forKey: .isDefault)
    }

    /// Formatted single-line address string
    public var formattedAddress: String {
        var parts: [String] = []
        if !street.isEmpty { parts.append(street) }
        if !unit.isEmpty { parts.append("Unit \(unit)") }
        if !city.isEmpty { parts.append(city) }
        if !state.isEmpty { parts.append(state) }
        if !zipCode.isEmpty { parts.append(zipCode) }
        return parts.joined(separator: ", ")
    }

    /// Short display name
    public var displayName: String {
        if !locationName.isEmpty {
            return locationName
        }
        return addressType
    }
}
