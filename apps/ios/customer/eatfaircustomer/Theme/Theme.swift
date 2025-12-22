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
}

// Note: Color.init(hex:) extension is provided by EatFairShared module
// Do NOT duplicate it here to avoid "ambiguous use of init(hex:)" error
