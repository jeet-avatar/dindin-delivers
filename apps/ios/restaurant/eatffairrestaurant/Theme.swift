import SwiftUI

/// Restaurant App Theme - Consistent styling across the app
struct RestaurantTheme {
    // MARK: - Brand Colors
    static let brandOrange = Color(red: 255/255, green: 107/255, blue: 53/255)
    static let brandRed = Color(red: 220/255, green: 53/255, blue: 69/255)
    static let brandGreen = Color(red: 40/255, green: 167/255, blue: 69/255)
    static let brandBlue = Color(red: 0/255, green: 123/255, blue: 255/255)
    static let brandPurple = Color(red: 111/255, green: 66/255, blue: 193/255)

    // MARK: - Semantic Colors
    static let success = brandGreen
    static let warning = Color(red: 255/255, green: 193/255, blue: 7/255)
    static let danger = brandRed
    static let info = brandBlue

    // MARK: - Order Status Colors
    static let statusNew = brandOrange
    static let statusPreparing = Color(red: 0/255, green: 123/255, blue: 255/255)
    static let statusReady = brandGreen
    static let statusPickedUp = brandPurple
    static let statusDelivered = Color(red: 40/255, green: 167/255, blue: 69/255)
    static let statusRejected = brandRed

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
