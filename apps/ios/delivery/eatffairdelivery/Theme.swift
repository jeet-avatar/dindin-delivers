import SwiftUI

struct Theme {
    // Primary Brand Colors - Dollor AI Service
    static let brandRed = Color(hex: "EB1700")  // Primary red
    static let brandGreen = Color(hex: "00A651")  // Earnings/success (Dollar green)
    static let brandOrange = Color(hex: "FF6D00")  // Accent orange
    static let brandBlack = Color(hex: "191919")  // Dark text
    static let brandWhite = Color.white
    
    // Background Colors
    static let backgroundGrey = Color(hex: "F8F8F8")
    static let cardBackground = Color.white
    static let lightGrey = Color(hex: "E0E0E0")
    
    // Text Colors
    static let textPrimary = Color(hex: "191919")
    static let textSecondary = Color(hex: "6B7280")
    static let textGrey = Color(hex: "9CA3AF")
    
    // Status Colors
    static let statusActive = Color(hex: "10B981")  // Green
    static let statusWarning = Color(hex: "F59E0B")  // Orange
    static let statusError = Color(hex: "EF4444")  // Red
    static let statusInfo = Color(hex: "3B82F6")  // Blue
    
    // Gradients
    static let earningsGradient = LinearGradient(
        colors: [Color(hex: "10B981"), Color(hex: "059669")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let mapGradient = LinearGradient(
        colors: [Color(hex: "3B82F6"), Color(hex: "1D4ED8")],
        startPoint: .top,
        endPoint: .bottom
    )
}

extension Color {
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
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Corner Radius
extension Theme {
    static let cornerRadiusSmall: CGFloat = 8
    static let cornerRadiusMedium: CGFloat = 12
    static let cornerRadiusLarge: CGFloat = 16
    static let cornerRadiusXL: CGFloat = 20
}

// MARK: - Spacing
extension Theme {
    static let spacingXS: CGFloat = 4
    static let spacingS: CGFloat = 8
    static let spacingM: CGFloat = 12
    static let spacingL: CGFloat = 16
    static let spacingXL: CGFloat = 20
    static let spacingXXL: CGFloat = 24
}

// MARK: - Shadows
extension Theme {
    static let cardShadow = Color.black.opacity(0.1)
    static let cardShadowRadius: CGFloat = 8
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
            .background(isEnabled ? Theme.brandGreen : Color.gray)
            .cornerRadius(Theme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(Theme.brandGreen)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(Theme.brandGreen.opacity(0.1))
            .cornerRadius(Theme.cornerRadiusMedium)
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
            .background(Theme.statusActive)
            .cornerRadius(Theme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(Theme.statusError)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(Theme.statusError.opacity(0.1))
            .cornerRadius(Theme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

// MARK: - Card Modifier
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.cardBackground)
            .cornerRadius(Theme.cornerRadiusLarge)
            .shadow(color: Theme.cardShadow, radius: Theme.cardShadowRadius, x: 0, y: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
