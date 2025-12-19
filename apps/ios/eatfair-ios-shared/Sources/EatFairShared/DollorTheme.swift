import SwiftUI

/**
 * Dollor.ai Unified Theme System
 *
 * SOURCE OF TRUTH for all platform colors.
 * Must match exactly across:
 * - Android: app/src/main/java/com/eatfair/app/ui/theme/DollorTheme.kt
 * - Web: apps/web/p2p-platform/frontend/src/app/theme/colors.ts
 *
 * Usage: Import and access colors like DollorTheme.Brand.green
 */
public struct DollorTheme {

    // MARK: - Brand Colors
    public struct Brand {
        public static let green = Color(hex: "06C167")       // Primary - buttons, highlights
        public static let greenLight = Color(hex: "4ADE80")  // Gradients, hover states
        public static let greenDark = Color(hex: "059669")   // Pressed states

        public static let orange = Color(hex: "F2994A")      // Secondary - accents, welcome
        public static let orangeLight = Color(hex: "FFB876") // Gradients
        public static let orangeDark = Color(hex: "D97706")  // Pressed states

        public static let blue = Color(hex: "3B82F6")        // Ride/info elements
        public static let blueLight = Color(hex: "60A5FA")   // Gradients
        public static let blueDark = Color(hex: "2563EB")    // Pressed states

        public static let gold = Color(hex: "FFD700")        // $ logo, premium
        public static let goldLight = Color(hex: "FFE066")   // Gradients
        public static let goldDark = Color(hex: "D4AF37")    // Pressed states

        public static let purple = Color(hex: "8B5CF6")      // AI features, special actions
        public static let purpleLight = Color(hex: "A78BFA") // Gradients
        public static let purpleDark = Color(hex: "7C3AED")  // Pressed states
    }

    // MARK: - Background Colors
    public struct Background {
        public static let primary = Color(hex: "F5F5F5")     // Main background (grey)
        public static let secondary = Color.white            // Cards, surfaces
        public static let tertiary = Color(hex: "F0F0F0")    // Subtle backgrounds
        public static let dark = Color(hex: "1D1B1E")        // Dark mode background
    }

    // MARK: - Text Colors
    public struct Text {
        public static let primary = Color(hex: "101010")     // Main text (black)
        public static let secondary = Color(hex: "757575")   // Subtle text (grey)
        public static let tertiary = Color(hex: "9CA3AF")    // Disabled/placeholder
        public static let inverse = Color.white              // Text on dark backgrounds
        public static let link = Brand.green                 // Clickable text
    }

    // MARK: - Status Colors
    public struct Status {
        public static let success = Color(hex: "06C167")     // Same as brand green
        public static let successBg = Color(hex: "E8F5E9")   // Light green background

        public static let error = Color(hex: "F44336")       // Red
        public static let errorBg = Color(hex: "FFEBEE")     // Light red background

        public static let warning = Color(hex: "FF9800")     // Orange/amber
        public static let warningBg = Color(hex: "FFF8E1")   // Light amber background

        public static let info = Color(hex: "2196F3")        // Blue
        public static let infoBg = Color(hex: "E3F2FD")      // Light blue background

        public static let pending = Color(hex: "FF9800")     // Same as warning
        public static let pendingBg = Color(hex: "FFF3E0")   // Light orange background
    }

    // MARK: - Order Status Colors
    public struct OrderStatus {
        // Placed
        public static let placedBg = Color(hex: "E3F2FD")
        public static let placedText = Color(hex: "1976D2")

        // Accepted
        public static let acceptedBg = Color(hex: "F3E5F5")
        public static let acceptedText = Color(hex: "7B1FA2")

        // Preparing
        public static let preparingBg = Color(hex: "FFF3E0")
        public static let preparingText = Color(hex: "E65100")

        // Ready for Pickup
        public static let readyBg = Color(hex: "E8F5E9")
        public static let readyText = Color(hex: "388E3C")

        // Picked Up / On the Way
        public static let onWayBg = Color(hex: "E8F5E9")
        public static let onWayText = Brand.green

        // Delivered
        public static let deliveredBg = Color(hex: "E8F5E9")
        public static let deliveredText = Color(hex: "2E7D32")

        // Cancelled
        public static let cancelledBg = Color(hex: "FFEBEE")
        public static let cancelledText = Color(hex: "D32F2F")

        // Default
        public static let defaultBg = Color(hex: "F5F5F5")
        public static let defaultText = Color.gray

        public static func getColors(for status: String) -> (background: Color, text: Color) {
            switch status {
            case "Placed": return (placedBg, placedText)
            case "Accepted": return (acceptedBg, acceptedText)
            case "Preparing": return (preparingBg, preparingText)
            case "Ready": return (readyBg, readyText)
            case "PickedUp", "OnTheWay": return (onWayBg, onWayText)
            case "Delivered": return (deliveredBg, deliveredText)
            case "Cancelled": return (cancelledBg, cancelledText)
            default: return (defaultBg, defaultText)
            }
        }
    }

    // MARK: - Payment Status Colors
    public struct PaymentStatus {
        public static let completed = Color(hex: "4CAF50")
        public static let processing = Color(hex: "FF9800")
        public static let failed = Color(hex: "F44336")
        public static let initiated = Color(hex: "2196F3")
        public static let refunded = Color(hex: "4CAF50")

        public static func getColor(for status: String) -> Color {
            switch status.lowercased() {
            case "completed", "refunded": return completed
            case "processing", "pending": return processing
            case "failed", "denied": return failed
            case "initiated": return initiated
            default: return Color.gray
            }
        }
    }

    // MARK: - Deal/Promo Card Gradient Colors
    public struct Deals {
        public static let percentage = [Color(hex: "A855F7"), Color(hex: "EC4899")]
        public static let bogo = [Color(hex: "F97316"), Color(hex: "EF4444")]
        public static let freeDelivery = [Brand.green, Color(hex: "14B8A6")]
        public static let flatAmount = [Color(hex: "3B82F6"), Color(hex: "6366F1")]

        public static func getGradient(for type: String) -> [Color] {
            switch type {
            case "percentage": return percentage
            case "bogo": return bogo
            case "free_delivery": return freeDelivery
            case "flat_amount": return flatAmount
            default: return [Color(hex: "6B7280"), Color(hex: "9CA3AF")]
            }
        }

        public static func getBadgeColor(for type: String) -> Color {
            switch type {
            case "percentage": return Color(hex: "A855F7")
            case "bogo": return Color(hex: "F97316")
            case "free_delivery": return Brand.green
            case "flat_amount": return Color(hex: "3B82F6")
            default: return Color(hex: "6B7280")
            }
        }
    }

    // MARK: - Action Colors
    public struct Action {
        public static let primary = Brand.green           // Primary buttons
        public static let secondary = Brand.orange        // Secondary buttons
        public static let danger = Color(hex: "EF4444")   // Delete, cancel
        public static let dangerBg = Color(hex: "FFF0F0") // Danger section background
        public static let dangerBorder = Color(hex: "FFF5F7") // Danger border

        public static let disabled = Color(hex: "E5E5E5")    // Disabled buttons
        public static let disabledText = Color(hex: "9CA3AF")// Disabled text
    }

    // MARK: - Rating Colors
    public struct Rating {
        public static let star = Color(hex: "FFD700")        // Star yellow
        public static let starEmpty = Color(hex: "E5E5E5")   // Empty star
        public static let excellent = Color(hex: "4CAF50")   // 4.5+
        public static let good = Color(hex: "8BC34A")        // 3.5-4.5
        public static let average = Color(hex: "FF9800")     // 2.5-3.5
        public static let poor = Color(hex: "F44336")        // Below 2.5

        public static func getColor(for rating: Double) -> Color {
            switch rating {
            case 4.5...: return excellent
            case 3.5..<4.5: return good
            case 2.5..<3.5: return average
            default: return poor
            }
        }
    }

    // MARK: - AI/Special Features
    public struct AI {
        public static let purple = Color(hex: "9C27B0")
        public static let pink = Color(hex: "E91E63")
        public static let gradient = [purple, pink]
    }

    // MARK: - Border Colors
    public struct Border {
        public static let light = Color(hex: "E5E5E5")
        public static let medium = Color(hex: "D1D5DB")
        public static let dark = Color(hex: "9CA3AF")
        public static let focus = Brand.green
    }
}

// MARK: - Color Extension for Hex
public extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
