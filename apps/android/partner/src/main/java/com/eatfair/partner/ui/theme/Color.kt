package com.eatfair.partner.ui.theme

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
val BrandOrangeDark = Color(0xFFD97706)  // Darker orange for gradients
val BrandGrey = Color(0xFFF5F5F5)  // iOS: Theme.brandGrey - BACKGROUND
val TextGrey = Color(0xFF757575)  // iOS: Theme.textGrey - SECONDARY TEXT
val BrandBlack = Color(0xFF101010)  // iOS: Theme.brandBlack - PRIMARY TEXT
val BrandWhite = Color(0xFFFFFFFF)  // iOS: Theme.brandWhite

// Primary color scheme (Orange theme)
val primary = BrandOrange
val primaryVariant = Color(0xFFE65100)
val secondary = BrandGreen
val secondaryVariant = Color(0xFF388E3C)

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

// Restaurant/Partner-specific Order Status Colors
val OrderPlaced = Color(0xFFFFC107)       // Amber for new orders
val OrderPlacedBg = Color(0xFFFFF8E1)     // Light amber background
val OrderPreparing = BrandOrange          // Brand orange for preparing
val OrderPreparingBg = Color(0xFFFFE0B2)  // Light orange background
val OrderReady = BrandGreen               // Green for ready
val OrderReadyBg = Color(0xFFC8E6C9)      // Light green background
val OrderPickedUp = Color(0xFF2196F3)     // Blue for picked up
val OrderPickedUpBg = Color(0xFFBBDEFB)   // Light blue background
val OrderDelivered = BrandGreen           // Green for delivered
val OrderDeliveredBg = Color(0xFFC8E6C9)  // Light green background
val OrderCancelled = Color(0xFFF44336)    // Red for cancelled
val OrderCancelledBg = Color(0xFFFFCDD2)  // Light red background

// Neutral Colors for UI
val NeutralGray50 = Color(0xFFFAFAFA)
val NeutralGray100 = Color(0xFFF5F5F5)
val NeutralGray200 = Color(0xFFEEEEEE)
val NeutralGray300 = Color(0xFFE0E0E0)
val NeutralGray400 = Color(0xFFBDBDBD)
val NeutralGray500 = Color(0xFF9E9E9E)
val NeutralGray600 = Color(0xFF757575)
val NeutralGray700 = Color(0xFF616161)
val NeutralGray800 = Color(0xFF424242)
val NeutralGray900 = Color(0xFF212121)
