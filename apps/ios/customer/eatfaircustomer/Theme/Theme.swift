import SwiftUI

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
}

// Color hex extension (matches shared Theme)
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
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
