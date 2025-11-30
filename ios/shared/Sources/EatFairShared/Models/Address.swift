import Foundation
import FirebaseFirestore

public struct Address: Identifiable, Codable, Equatable {
    @DocumentID public var id: String?
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
    
    public init(id: String? = nil, userId: String, locationName: String, street: String, unit: String, city: String, state: String, zipCode: String, instructions: String, type: String, latitude: Double, longitude: Double, phoneNumber: String, isDefault: Bool) {
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
}
