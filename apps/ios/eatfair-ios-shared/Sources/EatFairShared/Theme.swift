import SwiftUI

/**
 * Dollor.ai Brand Colors - SOURCE OF TRUTH
 *
 * All platforms MUST match these values:
 * - iOS Customer: eatfaircustomer/Theme/Theme.swift
 * - Android: app/src/main/java/com/eatfair/app/ui/theme/Color.kt
 * - Web: apps/web/p2p-platform/frontend/src/app/theme/colors.ts
 */
public struct Theme {
    // Primary Brand Color - Green
    public static let brandGreen = Color(hex: "06C167")  // #06C167

    // Secondary/Accent Color - Orange
    public static let brandOrange = Color(hex: "F2994A")  // #F2994A

    // Background Colors
    public static let brandGrey = Color(hex: "F5F5F5")  // #F5F5F5

    // Text Colors
    public static let brandBlack = Color(hex: "101010")  // #101010
    public static let textGrey = Color.gray
    public static let brandWhite = Color.white

    // Blue for ride/info elements
    public static let brandBlue = Color(hex: "3B82F6")  // #3B82F6

    // Gold for $ logo and premium accents
    public static let gold = Color(hex: "FFD700")  // #FFD700

    // Status Colors
    public static let success = brandGreen
    public static let error = Color(hex: "EF4444")  // #EF4444
    public static let warning = Color(hex: "F59E0B")  // #F59E0B
    public static let info = brandBlue
}

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
