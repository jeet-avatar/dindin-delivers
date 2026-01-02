package com.eatfair.app.constants

/**
 * Centralized configuration constants.
 * These values should eventually be fetched from backend config API.
 */
object PricingConfig {
    // Tax rates by state (default to CA)
    const val DEFAULT_TAX_RATE = 0.0725 // 7.25% California

    // Delivery fee tiers based on order subtotal
    fun getDeliveryFee(subtotal: Double): Double {
        return when {
            subtotal <= 35.0 -> 1.00
            subtotal <= 70.0 -> 2.00
            else -> 3.00
        }
    }

    // Platform fee
    const val PLATFORM_FEE = 0.0 // Currently $0 for customers

    // Driver base pay
    const val DRIVER_BASE_PAY = 3.00
    const val DRIVER_PER_MILE = 0.50
}

object AppConstants {
    const val SUPPORT_EMAIL = "support@dollor.ai"
    const val COMPANY_WEBSITE = "https://dollor.ai"
}
