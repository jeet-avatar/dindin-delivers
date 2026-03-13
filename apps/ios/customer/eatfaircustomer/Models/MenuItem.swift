import Foundation

/// Menu item model - aligned with Android and backend (Uber/DoorDash pattern)
struct MenuItem: Identifiable, Codable, Sendable {
    var id: String?
    var name: String
    var description: String
    var price: Double
    var imageUrl: String?
    var selectedSpiceLevel: String? // For cart selection
    var category: String?
    var isAvailable: Bool?
    var preparationTime: Int? // in minutes
    var quantity: Int = 1 // Cart quantity

    // Dietary information - aligned with Android
    var isVegetarian: Bool?
    var isVegan: Bool?
    var isGlutenFree: Bool?
    var spiceLevel: Int?  // 0-5 scale
    var calories: Int?
    var allergens: [String]?
    var dietaryTags: [String]?  // ["vegetarian", "vegan", "gluten-free"]

    // Customization options
    var customizations: [MenuItemCustomization]?
    var selectedCustomizations: [SelectedCustomization]?

    // Bestseller / Combo fields
    var isBestseller: Bool?
    var isCombo: Bool?
    var comboItems: [ComboItemDetail]?
    var comboSavings: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case price
        case imageUrl = "image_url"
        case selectedSpiceLevel
        case category
        case isAvailable = "is_available"
        case preparationTime = "prep_time_minutes"
        case quantity
        case isVegetarian = "is_vegetarian"
        case isVegan = "is_vegan"
        case isGlutenFree = "is_gluten_free"
        case spiceLevel = "spice_level"
        case calories
        case allergens
        case dietaryTags = "dietary_tags"
        case customizations
        case selectedCustomizations
        case isBestseller = "is_bestseller"
        case isCombo = "is_combo"
        case comboItems = "combo_items"
        case comboSavings = "combo_savings"
    }

    // Dietary display helpers
    var dietaryBadges: [String] {
        var badges: [String] = []
        if isVegetarian == true { badges.append("🥬 Vegetarian") }
        if isVegan == true { badges.append("🌱 Vegan") }
        if isGlutenFree == true { badges.append("🌾 Gluten-Free") }
        return badges
    }

    var spiceLevelDisplay: String? {
        guard let level = spiceLevel, level > 0 else { return nil }
        return String(repeating: "🌶️", count: min(level, 5))
    }

    var hasDietaryInfo: Bool {
        isVegetarian == true || isVegan == true || isGlutenFree == true || (spiceLevel ?? 0) > 0
    }
}

// MARK: - Combo Item Detail
struct ComboItemDetail: Codable, Sendable {
    var itemId: Int
    var itemName: String
    var originalPrice: Double

    enum CodingKeys: String, CodingKey {
        case itemId = "item_id"
        case itemName = "item_name"
        case originalPrice = "original_price"
    }
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

    // Bestseller / Combo display helpers
    var isBestsellerItem: Bool { isBestseller == true }
    var isComboItem: Bool { isCombo == true }

    var comboItemNames: String? {
        guard let items = comboItems, !items.isEmpty else { return nil }
        return items.map { $0.itemName }.joined(separator: ", ")
    }

    var savingsDisplay: String? {
        guard let savings = comboSavings, savings > 0 else { return nil }
        return String(format: "Save $%.2f", savings)
    }
}
