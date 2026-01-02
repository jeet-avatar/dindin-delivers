package com.eatfair.shared.model.restaurant

import com.google.gson.annotations.SerializedName

/**
 * Restaurant model matching backend Vendor table and iOS P2PRestaurant
 * Used for displaying restaurant listings and details
 */
data class Restaurant(
    val id: Int = 0,
    @SerializedName("vendor_id") val vendorId: String? = null,
    val name: String = "",
    val description: String? = null,
    val rating: Float = 0f,
    @SerializedName("review_count") val reviewCount: Int = 0,
    val reviews: String = "",  // Backward compatibility
    val distance: String = "",
    @SerializedName("average_prep_time") val averagePrepTime: Int? = null,  // Minutes
    val deliveryTime: String = "",  // Backward compatibility display string
    @SerializedName("cuisine_type") val cuisineType: String = "",
    @SerializedName("is_pure_veg") val isPureVeg: Boolean = false,
    @SerializedName("is_open") val isOpen: Boolean = false,
    val tags: List<String> = emptyList(),
    @SerializedName("image_url") val imageUrl: String = "",
    @SerializedName("preview_images") val previewImages: List<String>? = null,

    // Address fields (can be flat or nested)
    val address: String = "",
    val street: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,

    // Location
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,

    // Contact
    val phone: String? = null,
    val email: String? = null,

    // Delivery options
    @SerializedName("delivery_available") val deliveryAvailable: Boolean = true,
    @SerializedName("pickup_available") val pickupAvailable: Boolean = true,
    @SerializedName("minimum_order") val minimumOrder: Double? = null,

    // Operating hours
    @SerializedName("operating_hours") val operatingHours: String? = null
) {
    /**
     * Formatted full address
     */
    val fullAddress: String
        get() = listOfNotNull(street, city, state, zipCode)
            .filter { it.isNotBlank() }
            .joinToString(", ")
            .takeIf { it.isNotBlank() } ?: address

    /**
     * Display delivery time from averagePrepTime or fallback to deliveryTime string
     */
    val displayDeliveryTime: String
        get() = averagePrepTime?.let { "$it mins" } ?: deliveryTime.takeIf { it.isNotBlank() } ?: "30-45 mins"
}