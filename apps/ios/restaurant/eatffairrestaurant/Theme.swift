import SwiftUI

/// Restaurant App Theme - Consistent styling across the app
/// MUST MATCH: Android partner/ui/theme/Color.kt & EatFairShared Theme.swift
struct RestaurantTheme {
    // MARK: - Brand Colors (Source of Truth: eatfair-ios-shared/Theme.swift)
    static let brandOrange = Color(red: 242/255, green: 153/255, blue: 74/255)   // #F2994A - PRIMARY BRAND COLOR
    static let brandOrangeLight = Color(red: 255/255, green: 184/255, blue: 118/255)  // #FFB876
    static let brandRed = Color(red: 244/255, green: 67/255, blue: 54/255)       // #F44336 - Error/Danger
    static let brandGreen = Color(red: 6/255, green: 193/255, blue: 103/255)     // #06C167 - SUCCESS/READY
    static let brandGreenLight = Color(red: 74/255, green: 222/255, blue: 128/255) // #4ADE80
    static let brandBlue = Color(red: 33/255, green: 150/255, blue: 243/255)     // #2196F3 - Info/Preparing
    static let brandPrimaryBlue = Color(red: 52/255, green: 96/255, blue: 231/255) // #3460E7 - Login/Brand
    static let brandPurple = Color(red: 156/255, green: 39/255, blue: 176/255)   // #9C27B0 - Revenue

    // MARK: - Semantic Colors
    static let success = brandGreen
    static let warning = Color(red: 255/255, green: 193/255, blue: 7/255)
    static let danger = brandRed
    static let info = brandBlue

    // MARK: - Order Status Colors (Matched with Android partner/ui/theme/Color.kt)
    static let statusNew = brandOrange       // #F2994A - New orders
    static let statusPreparing = brandBlue   // #2196F3 - Being prepared
    static let statusReady = brandGreen      // #06C167 - Ready for pickup
    static let statusPickedUp = brandPurple  // #9C27B0 - Out for delivery
    static let statusDelivered = brandGreen  // #06C167 - Delivered
    static let statusRejected = brandRed     // #F44336 - Rejected/Cancelled

    // MARK: - Text Colors
    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
    static let textMuted = Color.gray

    // MARK: - Background Colors
    static let backgroundPrimary = Color(.systemBackground)
    static let backgroundSecondary = Color(.secondarySystemBackground)
    static let backgroundGrouped = Color(.systemGroupedBackground)

    // MARK: - Gradient
    static let primaryGradient = LinearGradient(
        colors: [brandOrange, brandRed],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let successGradient = LinearGradient(
        colors: [brandGreen, Color(red: 32/255, green: 201/255, blue: 151/255)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Shadows
    static let cardShadow = Color.black.opacity(0.1)
    static let cardShadowRadius: CGFloat = 8

    // MARK: - Corner Radius
    static let cornerRadiusSmall: CGFloat = 8
    static let cornerRadiusMedium: CGFloat = 12
    static let cornerRadiusLarge: CGFloat = 16
    static let cornerRadiusXL: CGFloat = 20

    // MARK: - Spacing
    static let spacingXS: CGFloat = 4
    static let spacingS: CGFloat = 8
    static let spacingM: CGFloat = 12
    static let spacingL: CGFloat = 16
    static let spacingXL: CGFloat = 20
    static let spacingXXL: CGFloat = 24
}

// MARK: - Order Status Helper
enum OrderStatus: String, CaseIterable {
    case placed = "Placed"
    case accepted = "Accepted"
    case preparing = "Preparing"
    case ready = "Ready"
    case pickedUp = "Picked Up"
    case delivered = "Delivered"
    case rejected = "Rejected"
    case cancelled = "Cancelled"

    var color: Color {
        switch self {
        case .placed: return RestaurantTheme.statusNew
        case .accepted, .preparing: return RestaurantTheme.statusPreparing
        case .ready: return RestaurantTheme.statusReady
        case .pickedUp: return RestaurantTheme.statusPickedUp
        case .delivered: return RestaurantTheme.statusDelivered
        case .rejected, .cancelled: return RestaurantTheme.statusRejected
        }
    }

    var icon: String {
        switch self {
        case .placed: return "bell.badge.fill"
        case .accepted: return "checkmark.circle.fill"
        case .preparing: return "flame.fill"
        case .ready: return "takeoutbag.and.cup.and.straw.fill"
        case .pickedUp: return "bicycle"
        case .delivered: return "checkmark.seal.fill"
        case .rejected, .cancelled: return "xmark.circle.fill"
        }
    }

    var displayName: String {
        switch self {
        case .placed: return "New Order"
        case .accepted: return "Accepted"
        case .preparing: return "Preparing"
        case .ready: return "Ready for Pickup"
        case .pickedUp: return "Out for Delivery"
        case .delivered: return "Delivered"
        case .rejected: return "Rejected"
        case .cancelled: return "Cancelled"
        }
    }
}

// MARK: - Custom Button Styles
struct PrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(isEnabled ? RestaurantTheme.brandOrange : Color.gray)
            .cornerRadius(RestaurantTheme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(RestaurantTheme.brandOrange)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(RestaurantTheme.brandOrange.opacity(0.1))
            .cornerRadius(RestaurantTheme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

struct SuccessButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(RestaurantTheme.brandGreen)
            .cornerRadius(RestaurantTheme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(RestaurantTheme.brandRed)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(RestaurantTheme.brandRed.opacity(0.1))
            .cornerRadius(RestaurantTheme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

// MARK: - Card Modifier
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(RestaurantTheme.backgroundPrimary)
            .cornerRadius(RestaurantTheme.cornerRadiusLarge)
            .shadow(color: RestaurantTheme.cardShadow, radius: RestaurantTheme.cardShadowRadius, x: 0, y: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
