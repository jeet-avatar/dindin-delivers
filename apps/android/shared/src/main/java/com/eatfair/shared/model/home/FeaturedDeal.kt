package com.eatfair.shared.model.home

/**
 * Featured Deal model - matches iOS P2PFeaturedDeal
 * Used for displaying promotional deals on the home screen
 */
data class FeaturedDeal(
    val id: String,
    val headline: String,
    val vendorName: String,
    val vendorId: Int,
    val description: String,
    val promoCode: String,
    val dealType: DealType,
    val discountValue: Double? = null,
    val minOrder: Double? = null,
    val expiresAt: String? = null
)

/**
 * Deal types - determines card gradient color
 * Matches iOS implementation
 */
enum class DealType {
    PERCENTAGE,      // Orange → Red gradient
    FLAT_AMOUNT,     // Purple → Pink gradient
    FREE_DELIVERY,   // Green → Teal gradient
    BOGO             // Blue → Purple gradient
}

// No mock data - all deals come from API
