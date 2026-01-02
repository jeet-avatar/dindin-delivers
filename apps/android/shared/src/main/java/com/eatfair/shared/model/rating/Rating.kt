package com.eatfair.shared.model.rating

/**
 * Rating model for driver feedback (API-based)
 * Used for rating drivers after delivery completion
 */
data class Rating(
    val id: String = "",
    val orderId: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val driverId: String = "",
    val driverName: String = "",
    val restaurantId: String = "",
    val restaurantName: String = "",
    val rating: Int = 5,
    val comment: String? = null,
    val onTime: Boolean = true,
    val friendly: Boolean = true,
    val followedInstructions: Boolean = true,
    val foodQuality: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Tip model for post-delivery tips (API-based)
 */
data class Tip(
    val id: String = "",
    val orderId: String = "",
    val customerId: String = "",
    val driverId: String = "",
    val amount: Double = 0.0,
    val tipType: String = "percentage",
    val percentage: Double? = null,
    val driverThankYouMessage: String? = null,
    val driverThankedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)
