import FirebaseFirestore

struct MenuItem: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var name: String
    var description: String
    var price: Double
    var imageUrl: String?
    var selectedSpiceLevel: String? // For cart selection
    var category: String?
    var isAvailable: Bool?
    var preparationTime: Int? // in minutes

    // Customization options
    var customizations: [MenuItemCustomization]?
    var selectedCustomizations: [SelectedCustomization]?
}

// MARK: - Menu Item Customization
struct MenuItemCustomization: Codable, Sendable, Identifiable {
    var id: String { name }
    var name: String // e.g., "Size", "Toppings", "Extras"
    var type: CustomizationType
    var required: Bool
    var minSelections: Int?
    var maxSelections: Int?
    var options: [CustomizationOption]

    enum CustomizationType: String, Codable, Sendable {
        case single = "single"      // Radio buttons (pick one)
        case multiple = "multiple"  // Checkboxes (pick many)
    }
}

// MARK: - Customization Option
struct CustomizationOption: Codable, Sendable, Identifiable {
    var id: String { name }
    var name: String
    var price: Double // Additional price (0 if free)
    var isDefault: Bool?
    var isAvailable: Bool?
}

// MARK: - Selected Customization (for cart)
struct SelectedCustomization: Codable, Sendable, Identifiable {
    var id: String { customizationName }
    var customizationName: String
    var selectedOptions: [String]
    var additionalPrice: Double
}

// MARK: - Helper Extensions
extension MenuItem {
    var totalCustomizationPrice: Double {
        guard let customizations = selectedCustomizations else { return 0 }
        return customizations.reduce(0) { $0 + $1.additionalPrice }
    }

    var totalPrice: Double {
        price + totalCustomizationPrice
    }

    var customizationSummary: String? {
        guard let customizations = selectedCustomizations, !customizations.isEmpty else { return nil }
        return customizations.flatMap { $0.selectedOptions }.joined(separator: ", ")
    }
}
