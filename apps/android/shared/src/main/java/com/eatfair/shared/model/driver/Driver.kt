package com.eatfair.shared.model.driver

/**
 * Driver model for driver management (API-based)
 * Used for driver profile, onboarding, and status tracking
 */
data class Driver(
    val id: Int = 0,  // Backend returns Integer
    val driverId: String = "",  // Business ID like "DRV-00002"
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val profileImageUrl: String? = null,
    val dateOfBirth: Long? = null,
    val ssn4: String? = null,  // Last 4 digits only for security

    // Address
    val address: DriverAddress? = null,

    // Driver's License
    val driversLicense: DriversLicense? = null,

    // Vehicle
    val vehicle: VehicleInfo? = null,
    val vehicleType: String = "car",  // "car", "bike", "scooter", "motorcycle"
    val licensePlate: String = "",

    // Insurance
    val insurance: InsuranceInfo? = null,

    // Bank Account
    val bankAccount: BankAccountInfo? = null,

    // Status - matches backend field name
    val isOnline: Boolean = false,
    val isApproved: Boolean = false,
    val status: String = "pending",  // "pending", "active", "suspended", "deactivated"
    val backgroundCheckStatus: String? = null,  // "pending", "passed", "failed"
    val backgroundCheckDate: Long? = null,

    // Current Location
    val currentLatitude: Double = 0.0,
    val currentLongitude: Double = 0.0,
    val lastActive: Long? = null,
    val currentSessionId: String? = null,

    // Stats (CRITICAL - was missing in Android)
    val stats: DriverStats? = null,

    // Preferences
    val preferences: DriverPreferences? = null,

    // Timestamps
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long? = null,
    val onboardingCompletedAt: Long? = null
)

data class DriverAddress(
    val street: String = "",
    val unit: String? = null,
    val city: String = "",
    val state: String = "",
    val zipCode: String = "",
    val country: String = "US"
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "street" to street,
        "unit" to unit,
        "city" to city,
        "state" to state,
        "zipCode" to zipCode,
        "country" to country
    )

    companion object {
        fun fromMap(data: Map<String, Any?>): DriverAddress {
            return DriverAddress(
                street = data["street"] as? String ?: "",
                unit = data["unit"] as? String,
                city = data["city"] as? String ?: "",
                state = data["state"] as? String ?: "",
                zipCode = data["zipCode"] as? String ?: "",
                country = data["country"] as? String ?: "US"
            )
        }
    }
}

data class DriversLicense(
    val licenseNumber: String = "",
    val state: String = "",  // Issuing state
    val expirationDate: Long = 0,
    val licenseClass: String = "C",  // "A", "B", "C", "D", "M"
    val frontImageUrl: String? = null,
    val backImageUrl: String? = null,
    val isVerified: Boolean = false,
    val verifiedAt: Long? = null
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "licenseNumber" to licenseNumber,
        "state" to state,
        "expirationDate" to expirationDate,
        "licenseClass" to licenseClass,
        "frontImageUrl" to frontImageUrl,
        "backImageUrl" to backImageUrl,
        "isVerified" to isVerified,
        "verifiedAt" to verifiedAt
    )

    companion object {
        fun fromMap(data: Map<String, Any?>): DriversLicense {
            return DriversLicense(
                licenseNumber = data["licenseNumber"] as? String ?: "",
                state = data["state"] as? String ?: "",
                expirationDate = (data["expirationDate"] as? Number)?.toLong() ?: 0,
                licenseClass = data["licenseClass"] as? String ?: "C",
                frontImageUrl = data["frontImageUrl"] as? String,
                backImageUrl = data["backImageUrl"] as? String,
                isVerified = data["isVerified"] as? Boolean ?: false,
                verifiedAt = (data["verifiedAt"] as? Number)?.toLong()
            )
        }
    }
}

data class VehicleInfo(
    val make: String = "",  // Toyota, Honda, Ford
    val model: String = "",  // Camry, Civic, F-150
    val year: Int = 0,
    val color: String = "",
    val licensePlate: String = "",
    val state: String = "",  // License plate state
    val vehicleType: String = "sedan",  // "sedan", "suv", "truck", "motorcycle", "bicycle", "scooter"
    val frontImageUrl: String? = null,
    val sideImageUrl: String? = null,
    val backImageUrl: String? = null,
    val registrationNumber: String? = null,
    val registrationExpirationDate: Long? = null,
    val registrationImageUrl: String? = null,
    val isVerified: Boolean = false
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "make" to make,
        "model" to model,
        "year" to year,
        "color" to color,
        "licensePlate" to licensePlate,
        "state" to state,
        "vehicleType" to vehicleType,
        "frontImageUrl" to frontImageUrl,
        "sideImageUrl" to sideImageUrl,
        "backImageUrl" to backImageUrl,
        "registrationNumber" to registrationNumber,
        "registrationExpirationDate" to registrationExpirationDate,
        "registrationImageUrl" to registrationImageUrl,
        "isVerified" to isVerified
    )

    companion object {
        fun fromMap(data: Map<String, Any?>): VehicleInfo {
            return VehicleInfo(
                make = data["make"] as? String ?: "",
                model = data["model"] as? String ?: "",
                year = (data["year"] as? Number)?.toInt() ?: 0,
                color = data["color"] as? String ?: "",
                licensePlate = data["licensePlate"] as? String ?: "",
                state = data["state"] as? String ?: "",
                vehicleType = data["vehicleType"] as? String ?: "sedan",
                frontImageUrl = data["frontImageUrl"] as? String,
                sideImageUrl = data["sideImageUrl"] as? String,
                backImageUrl = data["backImageUrl"] as? String,
                registrationNumber = data["registrationNumber"] as? String,
                registrationExpirationDate = (data["registrationExpirationDate"] as? Number)?.toLong(),
                registrationImageUrl = data["registrationImageUrl"] as? String,
                isVerified = data["isVerified"] as? Boolean ?: false
            )
        }
    }
}

data class InsuranceInfo(
    val provider: String = "",  // State Farm, Geico, Progressive
    val policyNumber: String = "",
    val expirationDate: Long = 0,
    val coverageType: String = "liability",  // "liability", "full_coverage"
    val insuranceCardImageUrl: String? = null,
    val isVerified: Boolean = false
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "provider" to provider,
        "policyNumber" to policyNumber,
        "expirationDate" to expirationDate,
        "coverageType" to coverageType,
        "insuranceCardImageUrl" to insuranceCardImageUrl,
        "isVerified" to isVerified
    )

    companion object {
        fun fromMap(data: Map<String, Any?>): InsuranceInfo {
            return InsuranceInfo(
                provider = data["provider"] as? String ?: "",
                policyNumber = data["policyNumber"] as? String ?: "",
                expirationDate = (data["expirationDate"] as? Number)?.toLong() ?: 0,
                coverageType = data["coverageType"] as? String ?: "liability",
                insuranceCardImageUrl = data["insuranceCardImageUrl"] as? String,
                isVerified = data["isVerified"] as? Boolean ?: false
            )
        }
    }
}

data class BankAccountInfo(
    val bankName: String = "",
    val accountHolderName: String = "",
    val accountType: String = "checking",  // "checking", "savings"
    val routingNumber: String = "",  // Masked for security
    val accountNumberLast4: String = "",  // Only last 4 digits stored
    val isVerified: Boolean = false,
    val stripeConnectId: String? = null  // For Stripe Connect payouts
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "bankName" to bankName,
        "accountHolderName" to accountHolderName,
        "accountType" to accountType,
        "routingNumber" to routingNumber,
        "accountNumberLast4" to accountNumberLast4,
        "isVerified" to isVerified,
        "stripeConnectId" to stripeConnectId
    )

    companion object {
        fun fromMap(data: Map<String, Any?>): BankAccountInfo {
            return BankAccountInfo(
                bankName = data["bankName"] as? String ?: "",
                accountHolderName = data["accountHolderName"] as? String ?: "",
                accountType = data["accountType"] as? String ?: "checking",
                routingNumber = data["routingNumber"] as? String ?: "",
                accountNumberLast4 = data["accountNumberLast4"] as? String ?: "",
                isVerified = data["isVerified"] as? Boolean ?: false,
                stripeConnectId = data["stripeConnectId"] as? String
            )
        }
    }
}

/**
 * CRITICAL: Driver stats - was completely missing in Android
 * This enables proper earnings tracking, ratings, and performance metrics
 */
data class DriverStats(
    val rating: Double = 5.0,  // 1.0-5.0
    val totalDeliveries: Int = 0,
    val completedDeliveries: Int = 0,
    val cancelledDeliveries: Int = 0,
    val totalEarnings: Double = 0.0,
    val totalDistance: Double = 0.0,  // miles
    val totalOnlineTime: Double = 0.0,  // hours
    val acceptanceRate: Double = 100.0,  // 0-100%
    val completionRate: Double = 100.0,  // 0-100%
    val onTimeRate: Double = 100.0,  // 0-100%
    val weeklyDeliveries: Int = 0,
    val weeklyEarnings: Double = 0.0,
    val weeklyHours: Double = 0.0,
    val weeklyDistance: Double = 0.0,
    val weekStartDate: Long = 0
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "rating" to rating,
        "totalDeliveries" to totalDeliveries,
        "completedDeliveries" to completedDeliveries,
        "cancelledDeliveries" to cancelledDeliveries,
        "totalEarnings" to totalEarnings,
        "totalDistance" to totalDistance,
        "totalOnlineTime" to totalOnlineTime,
        "acceptanceRate" to acceptanceRate,
        "completionRate" to completionRate,
        "onTimeRate" to onTimeRate,
        "weeklyDeliveries" to weeklyDeliveries,
        "weeklyEarnings" to weeklyEarnings,
        "weeklyHours" to weeklyHours,
        "weeklyDistance" to weeklyDistance,
        "weekStartDate" to weekStartDate
    )

    companion object {
        fun fromMap(data: Map<String, Any?>): DriverStats {
            return DriverStats(
                rating = (data["rating"] as? Number)?.toDouble() ?: 5.0,
                totalDeliveries = (data["totalDeliveries"] as? Number)?.toInt() ?: 0,
                completedDeliveries = (data["completedDeliveries"] as? Number)?.toInt() ?: 0,
                cancelledDeliveries = (data["cancelledDeliveries"] as? Number)?.toInt() ?: 0,
                totalEarnings = (data["totalEarnings"] as? Number)?.toDouble() ?: 0.0,
                totalDistance = (data["totalDistance"] as? Number)?.toDouble() ?: 0.0,
                totalOnlineTime = (data["totalOnlineTime"] as? Number)?.toDouble() ?: 0.0,
                acceptanceRate = (data["acceptanceRate"] as? Number)?.toDouble() ?: 100.0,
                completionRate = (data["completionRate"] as? Number)?.toDouble() ?: 100.0,
                onTimeRate = (data["onTimeRate"] as? Number)?.toDouble() ?: 100.0,
                weeklyDeliveries = (data["weeklyDeliveries"] as? Number)?.toInt() ?: 0,
                weeklyEarnings = (data["weeklyEarnings"] as? Number)?.toDouble() ?: 0.0,
                weeklyHours = (data["weeklyHours"] as? Number)?.toDouble() ?: 0.0,
                weeklyDistance = (data["weeklyDistance"] as? Number)?.toDouble() ?: 0.0,
                weekStartDate = (data["weekStartDate"] as? Number)?.toLong() ?: 0
            )
        }
    }
}

data class DriverPreferences(
    val maxDeliveryDistance: Double = 10.0,  // miles
    val preferredAreas: List<String> = emptyList(),  // Zip codes or neighborhoods
    val acceptCashOrders: Boolean = true,
    val notificationsEnabled: Boolean = true,
    val soundEnabled: Boolean = true,
    val autoAcceptOrders: Boolean = false,
    val preferredShifts: List<String> = emptyList()  // "morning", "afternoon", "evening", "night"
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "maxDeliveryDistance" to maxDeliveryDistance,
        "preferredAreas" to preferredAreas,
        "acceptCashOrders" to acceptCashOrders,
        "notificationsEnabled" to notificationsEnabled,
        "soundEnabled" to soundEnabled,
        "autoAcceptOrders" to autoAcceptOrders,
        "preferredShifts" to preferredShifts
    )

    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(data: Map<String, Any?>): DriverPreferences {
            return DriverPreferences(
                maxDeliveryDistance = (data["maxDeliveryDistance"] as? Number)?.toDouble() ?: 10.0,
                preferredAreas = (data["preferredAreas"] as? List<String>) ?: emptyList(),
                acceptCashOrders = data["acceptCashOrders"] as? Boolean ?: true,
                notificationsEnabled = data["notificationsEnabled"] as? Boolean ?: true,
                soundEnabled = data["soundEnabled"] as? Boolean ?: true,
                autoAcceptOrders = data["autoAcceptOrders"] as? Boolean ?: false,
                preferredShifts = (data["preferredShifts"] as? List<String>) ?: emptyList()
            )
        }
    }
}
