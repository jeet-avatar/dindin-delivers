import SwiftUI
import EatFairShared

/**
 * Dollor.ai Brand Colors - SYNCED WITH SHARED THEME
 *
 * Source of Truth: eatfair-ios-shared/Sources/EatFairShared/Theme.swift
 *
 * MUST MATCH:
 * - Android: app/src/main/java/com/eatfair/app/ui/theme/Color.kt
 * - Web: apps/web/p2p-platform/frontend/src/app/theme/colors.ts
 */
struct Theme {
    // Primary Brand Color - Green
    static let brandGreen = Color(hex: "06C167")  // #06C167 - PRIMARY

    // Secondary/Accent Color - Orange
    static let brandOrange = Color(hex: "F2994A")  // #F2994A

    // Background Colors
    static let brandGrey = Color(hex: "F5F5F5")  // #F5F5F5

    // Text Colors
    static let brandBlack = Color(hex: "101010")  // #101010
    static let textGrey = Color.gray
    static let brandWhite = Color.white

    // Gold for $ logo and premium accents
    static let gold = Color(hex: "FFD700")  // #FFD700

    // Blue for ride/info elements
    static let brandBlue = Color(hex: "3B82F6")  // #3B82F6

    // Status Colors
    static let success = brandGreen
    static let error = Color(hex: "EF4444")  // #EF4444
    static let warning = Color(hex: "F59E0B")  // #F59E0B
    static let info = brandBlue  // Same as brandBlue

    // Gradients
    static let brandGradient = LinearGradient(
        gradient: Gradient(colors: [brandOrange, Color(hex: "FFB876")]),
        startPoint: .top,
        endPoint: .bottom
    )

    // MARK: - Luxury Theme (black + orange) — the app-wide redesign palette
    // Orange is the Dollor accent/identity (matches the orange smiley stickers on driver cars).
    static let lxBg           = Color(hex: "0B0B0D")  // page canvas (rich black)
    static let lxSurface      = Color(hex: "17171A")  // cards / inputs
    static let lxSurface2     = Color(hex: "202024")  // elevated surfaces
    static let lxHairline     = Color(hex: "2A2A2E")  // borders / dividers
    static let lxOrange       = Color(hex: "FF7A1A")  // primary accent
    static let lxOrangeBright = Color(hex: "FF9A3D")  // gradient top / highlight
    static let lxOrangeDeep   = Color(hex: "E85D04")  // pressed
    static let lxText         = Color.white           // primary text
    static let lxTextSecondary = Color(hex: "A1A1AA") // secondary text
    static let lxTextMuted    = Color(hex: "6E6E78")  // muted / placeholders
    static let lxSuccess      = Color(hex: "30D158")
    static let lxError        = Color(hex: "FF453A")

    // Primary CTA gradient (orange)
    static let lxButtonGradient = LinearGradient(
        colors: [lxOrangeBright, lxOrange],
        startPoint: .top, endPoint: .bottom
    )
}

// Note: Color.init(hex:) extension is provided by EatFairShared module
// Do NOT duplicate it here to avoid "ambiguous use of init(hex:)" error

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
            .background(Theme.success)
            .cornerRadius(Theme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.semibold)
            .foregroundColor(Theme.error)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(Theme.error.opacity(0.1))
            .cornerRadius(Theme.cornerRadiusMedium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

// MARK: - Card Modifier
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color(.systemBackground))
            .cornerRadius(Theme.cornerRadiusLarge)
            .shadow(color: Theme.cardShadow, radius: Theme.cardShadowRadius, x: 0, y: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
