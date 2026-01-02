package com.eatfair.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Dollor.ai Brand Colors - MUST MATCH iOS Theme.swift EXACTLY
 *
 * iOS Reference (Source of Truth):
 * - Theme.brandGreen = #06C167 (Primary brand color)
 * - Theme.brandOrange = #F2994A (Secondary/accent color)
 * - Theme.brandGrey = #F5F5F5 (Background)
 * - Theme.textGrey = Gray (Text secondary)
 * - Theme.brandBlack = #101010 (Text primary)
 *
 * IMPORTANT: These values are synced with:
 * - iOS: eatfair-ios-shared/Sources/EatFairShared/Theme.swift
 * - Web: apps/web/p2p-platform/frontend (CSS variables)
 */

// Brand Colors - Match iOS Theme.swift exactly
val BrandGreen = Color(0xFF06C167)  // iOS: Theme.brandGreen - PRIMARY BRAND COLOR
val BrandGreenLight = Color(0xFF4ADE80)  // Lighter variant for gradients
val BrandOrange = Color(0xFFF2994A)  // iOS: Theme.brandOrange - ACCENT COLOR
val BrandOrangeLight = Color(0xFFFFB876)  // Lighter variant for gradients
val BrandGrey = Color(0xFFF5F5F5)  // iOS: Theme.brandGrey - BACKGROUND
val TextGrey = Color(0xFF757575)  // iOS: Theme.textGrey - SECONDARY TEXT
val BrandBlack = Color(0xFF101010)  // iOS: Theme.brandBlack - PRIMARY TEXT
val BrandWhite = Color(0xFFFFFFFF)  // iOS: Theme.brandWhite
val BrandBlue = Color(0xFF3B82F6)  // For ride/info elements - matches iOS Theme.info
val GoldColor = Color(0xFFFFD700)  // Gold for $ logo and accents

// Primary color scheme - Green is primary (like iOS)
val primary = BrandGreen
val primaryVariant = Color(0xFF059669)  // Darker green
val secondary = BrandOrange
val secondaryVariant = Color(0xFFD97706)  // Darker orange

// Light Theme Colors
val primaryLight = BrandOrange
val onPrimaryLight = Color(0xFFFFFFFF)
val primaryContainerLight = Color(0xFFFFDBCB)
val onPrimaryContainerLight = Color(0xFF341100)
val secondaryLight = BrandGreen
val onSecondaryLight = Color(0xFFFFFFFF)
val secondaryContainerLight = Color(0xFFC8E6C9)
val onSecondaryContainerLight = Color(0xFF1B5E20)
val tertiaryLight = Color(0xFF7C5800)
val onTertiaryLight = Color(0xFFFFFFFF)
val tertiaryContainerLight = Color(0xFFFFDEA1)
val onTertiaryContainerLight = Color(0xFF271900)
val errorLight = Color(0xFFBA1A1A)
val onErrorLight = Color(0xFFFFFFFF)
val errorContainerLight = Color(0xFFFFDAD6)
val onErrorContainerLight = Color(0xFF410002)
val backgroundLight = BrandGrey
val onBackgroundLight = BrandBlack
val surfaceLight = BrandWhite
val onSurfaceLight = BrandBlack
val surfaceVariantLight = Color(0xFFE7E0EC)
val onSurfaceVariantLight = Color(0xFF49454F)
val outlineLight = Color(0xFF79747E)
val outlineVariantLight = Color(0xFFCAC4D0)
val scrimLight = Color(0xFF000000)
val inverseSurfaceLight = Color(0xFF313033)
val inverseOnSurfaceLight = Color(0xFFF4EFF4)
val inversePrimaryLight = Color(0xFFFFB599)
val surfaceDimLight = Color(0xFFDED8DD)
val surfaceBrightLight = Color(0xFFFEF7FC)
val surfaceContainerLowestLight = Color(0xFFFFFFFF)
val surfaceContainerLowLight = Color(0xFFF8F2F7)
val surfaceContainerLight = Color(0xFFF2ECF1)
val surfaceContainerHighLight = Color(0xFFECE6EB)
val surfaceContainerHighestLight = Color(0xFFE6E0E6)

// Dark Theme Colors
val primaryDark = Color(0xFFFFB599)
val onPrimaryDark = Color(0xFF552000)
val primaryContainerDark = Color(0xFF793100)
val onPrimaryContainerDark = Color(0xFFFFDBCB)
val secondaryDark = Color(0xFFA5D6A7)
val onSecondaryDark = Color(0xFF1B5E20)
val secondaryContainerDark = Color(0xFF2E7D32)
val onSecondaryContainerDark = Color(0xFFC8E6C9)
val tertiaryDark = Color(0xFFF5BF4A)
val onTertiaryDark = Color(0xFF412D00)
val tertiaryContainerDark = Color(0xFF5E4200)
val onTertiaryContainerDark = Color(0xFFFFDEA1)
val errorDark = Color(0xFFFFB4AB)
val onErrorDark = Color(0xFF690005)
val errorContainerDark = Color(0xFF93000A)
val onErrorContainerDark = Color(0xFFFFDAD6)
val backgroundDark = Color(0xFF1D1B1E)
val onBackgroundDark = Color(0xFFE6E1E5)
val surfaceDark = Color(0xFF1D1B1E)
val onSurfaceDark = Color(0xFFE6E1E5)
val surfaceVariantDark = Color(0xFF49454F)
val onSurfaceVariantDark = Color(0xFFCAC4D0)
val outlineDark = Color(0xFF938F99)
val outlineVariantDark = Color(0xFF49454F)
val scrimDark = Color(0xFF000000)
val inverseSurfaceDark = Color(0xFFE6E1E5)
val inverseOnSurfaceDark = Color(0xFF313033)
val inversePrimaryDark = BrandOrange
val surfaceDimDark = Color(0xFF1D1B1E)
val surfaceBrightDark = Color(0xFF3B383D)
val surfaceContainerLowestDark = Color(0xFF110F12)
val surfaceContainerLowDark = Color(0xFF1D1B1E)
val surfaceContainerDark = Color(0xFF211F22)
val surfaceContainerHighDark = Color(0xFF2C2A2D)
val surfaceContainerHighestDark = Color(0xFF363438)

// Legacy color names for compatibility
val black = BrandBlack
val black_text = BrandBlack
val white = BrandWhite
val pink = Color(0xFFFEB7C8)
val pink_light = Color(0xFFFFDBE3)
val primary_light = Color(0xFFFF9E6D)

// Status colors
val success = BrandGreen
val error = Color(0xFFF44336)
val warning = Color(0xFFFFC107)
val info = Color(0xFF2196F3)

// Order Status Colors (consistent with iOS)
object OrderStatusColors {
    // Placed
    val placedBg = Color(0xFFE3F2FD)
    val placedText = Color(0xFF1976D2)
    // Accepted
    val acceptedBg = Color(0xFFF3E5F5)
    val acceptedText = Color(0xFF7B1FA2)
    // Preparing
    val preparingBg = Color(0xFFFFF3E0)
    val preparingText = Color(0xFFE65100)
    // Ready
    val readyBg = Color(0xFFE8F5E9)
    val readyText = Color(0xFF388E3C)
    // Delivered
    val deliveredBg = Color(0xFFE8F5E9)
    val deliveredText = Color(0xFF2E7D32)
    // Cancelled
    val cancelledBg = Color(0xFFFFEBEE)
    val cancelledText = Color(0xFFD32F2F)
    // Default
    val defaultBg = Color(0xFFF5F5F5)
    val defaultText = Color.Gray
}

// Payment Status Colors
object PaymentStatusColors {
    val completed = Color(0xFF4CAF50)
    val processing = Color(0xFFFF9800)
    val failed = Color(0xFFF44336)
    val initiated = Color(0xFF2196F3)
}

// Purple accent (for AI features, special buttons)
val PurpleAccent = Color(0xFF8B5CF6)

// Warning/Refund background colors
val WarningBg = Color(0xFFFFF8E1)  // Light amber for refund section
val WarningIcon = Color(0xFFFF9800)  // Amber icon color

// Danger/Delete background colors
val DangerBg = Color(0xFFFFF0F0)  // Light red for delete actions
val DangerBorder = Color(0xFFFFF5F7)  // Light pink border

// AI Banner Colors - Match iOS
val AiPurple = Color(0xFF9C27B0)
val AiPink = Color(0xFFE91E63)

// Deal Card Gradient Colors - Match iOS
val DealOrange = Color(0xFFFF6D00)
val DealRed = Color(0xFFFF5252)
val DealPurple = Color(0xFF9C27B0)
val DealTeal = Color(0xFF009688)
val DealBlue = Color(0xFF2196F3)

// Multi-Restaurant Promo Colors
val PromoOrange = Color(0xFFFF6D00)
val PromoRed = Color(0xFFFF5252)

// Rating Colors
val RatingGreen = Color(0xFF4CAF50)
val StarYellow = Color(0xFFFFD700)
