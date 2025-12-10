import Foundation

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
    public var type: String // "Home", "Work", "Other"
    public var latitude: Double
    public var longitude: Double
    public var phoneNumber: String
    public var isDefault: Bool

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
        type: String = "Home",
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
        self.type = type
        self.latitude = latitude
        self.longitude = longitude
        self.phoneNumber = phoneNumber
        self.isDefault = isDefault
    }

    // Coding keys for JSON encoding/decoding
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case locationName
        case street
        case unit
        case city
        case state
        case zipCode
        case instructions
        case type
        case latitude
        case longitude
        case phoneNumber
        case isDefault
    }

    // Custom decoder to handle missing fields gracefully
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decodeIfPresent(String.self, forKey: .id)
        userId = try container.decodeIfPresent(String.self, forKey: .userId) ?? ""
        locationName = try container.decodeIfPresent(String.self, forKey: .locationName) ?? ""
        street = try container.decodeIfPresent(String.self, forKey: .street) ?? ""
        unit = try container.decodeIfPresent(String.self, forKey: .unit) ?? ""
        city = try container.decodeIfPresent(String.self, forKey: .city) ?? ""
        state = try container.decodeIfPresent(String.self, forKey: .state) ?? ""
        zipCode = try container.decodeIfPresent(String.self, forKey: .zipCode) ?? ""
        instructions = try container.decodeIfPresent(String.self, forKey: .instructions) ?? ""
        type = try container.decodeIfPresent(String.self, forKey: .type) ?? "Home"
        latitude = try container.decodeIfPresent(Double.self, forKey: .latitude) ?? 0.0
        longitude = try container.decodeIfPresent(Double.self, forKey: .longitude) ?? 0.0
        phoneNumber = try container.decodeIfPresent(String.self, forKey: .phoneNumber) ?? ""
        isDefault = try container.decodeIfPresent(Bool.self, forKey: .isDefault) ?? false
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
        return type
    }
}
