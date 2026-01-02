package com.eatfair.shared.model.driver

/**
 * DriverSession model for tracking driver work sessions (API-based)
 * Tracks online time, distance driven, earnings per session, and work hours for compliance
 */
data class DriverSession(
    val id: String = "",
    val driverId: String = "",

    // Session timing
    val startTime: Long = System.currentTimeMillis(),
    val endTime: Long? = null,
    val duration: Double? = null,  // hours

    // Location tracking
    val startLatitude: Double = 0.0,
    val startLongitude: Double = 0.0,
    val endLatitude: Double? = null,
    val endLongitude: Double? = null,

    // Session performance
    val deliveriesCompleted: Int = 0,
    val deliveriesCancelled: Int = 0,
    val totalDistance: Double = 0.0,  // miles
    val totalEarnings: Double = 0.0,

    // Device info for debugging
    val deviceInfo: String? = null,
    val appVersion: String? = null
) {
    /**
     * Calculate session duration in hours
     */
    fun calculateDuration(): Double {
        val end = endTime ?: System.currentTimeMillis()
        return (end - startTime) / (1000.0 * 60 * 60)  // Convert ms to hours
    }

    /**
     * Check if session is currently active
     */
    fun isActive(): Boolean = endTime == null

    companion object {
        /**
         * Create a new session for a driver going online
         */
        fun createNew(
            driverId: String,
            latitude: Double,
            longitude: Double,
            deviceInfo: String? = null,
            appVersion: String? = null
        ): DriverSession {
            return DriverSession(
                id = java.util.UUID.randomUUID().toString(),
                driverId = driverId,
                startTime = System.currentTimeMillis(),
                startLatitude = latitude,
                startLongitude = longitude,
                deviceInfo = deviceInfo,
                appVersion = appVersion
            )
        }
    }
}

/**
 * Promotion model for discount codes (API-based)
 */
data class Promotion(
    val id: String = "",
    val restaurantId: String? = null,  // null = platform-wide promo
    val code: String = "",
    val title: String = "",
    val description: String = "",
    val discountType: String = "percentage",  // "percentage", "fixed"
    val discountValue: Double = 0.0,
    val maxDiscount: Double? = null,
    val minimumOrder: Double = 0.0,
    val applicableOn: String = "subtotal",  // "subtotal", "delivery", "total"
    val maxUsagePerUser: Int = 1,
    val totalUsageLimit: Int? = null,
    val startDate: Long = 0,
    val endDate: Long = 0,
    val isActive: Boolean = true,
    val usageCount: Int = 0
) {
    /**
     * Check if promotion is currently valid
     */
    fun isValid(): Boolean {
        val now = System.currentTimeMillis()
        return isActive && now >= startDate && now <= endDate &&
                (totalUsageLimit == null || usageCount < totalUsageLimit)
    }

    /**
     * Calculate discount amount for a given subtotal
     */
    fun calculateDiscount(subtotal: Double): Double {
        if (subtotal < minimumOrder) return 0.0

        val discount = when (discountType) {
            "percentage" -> subtotal * (discountValue / 100)
            "fixed" -> discountValue
            else -> 0.0
        }

        return maxDiscount?.let { minOf(discount, it) } ?: discount
    }
}
