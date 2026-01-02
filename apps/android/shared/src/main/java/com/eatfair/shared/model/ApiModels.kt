package com.eatfair.shared.model

import com.eatfair.shared.validation.*
import com.google.gson.annotations.SerializedName

// ==========================================
// RESTAURANT API RESPONSE MODELS
// (For API deserialization - converted to domain model in RestaurantRepo)
// ==========================================

data class RestaurantApiResponse(
    val id: Int,
    val name: String,
    val description: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val phone: String? = null,
    val email: String? = null,
    @SerializedName("cuisine_type") val cuisineType: String? = null,
    val rating: Double = 0.0,
    @SerializedName("review_count") val reviewCount: Int = 0,
    @SerializedName("is_open") val isOpen: Boolean = true,
    @SerializedName("is_active") val isActive: Boolean = true,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("delivery_time") val deliveryTime: String? = null,
    @SerializedName("minimum_order") val minimumOrder: Double? = null,
    val tags: List<String>? = null
)

/**
 * Wrapper response for /api/erp/restaurants endpoint
 */
data class RestaurantsListResponse(
    val restaurants: List<RestaurantApiResponse>,
    val total: Int? = null,
    val message: String? = null
)

data class RestaurantDetail(
    val id: Int,
    val name: String,
    val description: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val phone: String? = null,
    @SerializedName("cuisine_type") val cuisineType: String? = null,
    val rating: Double = 0.0,
    @SerializedName("is_open") val isOpen: Boolean = true,
    @SerializedName("image_url") val imageUrl: String? = null,
    val menu: List<MenuItem>? = null,
    @SerializedName("business_hours") val businessHours: Map<String, String>? = null
)

data class MenuItem(
    val id: Int,
    @SerializedName("vendor_id") val vendorId: Int? = null,
    val name: String,
    val description: String? = null,
    val price: Double,
    val category: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    @SerializedName("in_stock") val inStock: Boolean = true,
    @SerializedName("is_vegetarian") val isVegetarian: Boolean = false,
    @SerializedName("is_vegan") val isVegan: Boolean = false,
    @SerializedName("is_gluten_free") val isGlutenFree: Boolean = false,
    @SerializedName("spice_level") val spiceLevel: Int? = null,
    @SerializedName("prep_time_minutes") val prepTimeMinutes: Int? = null
)

data class MenuCategoriesResponse(
    val categories: List<String>
)

// ==========================================
// AUTHENTICATION MODELS
// ==========================================

data class CustomerLoginRequest(
    val email: String,
    val password: String
) {
    fun validate(): ValidationResult = validate {
        validate(email.isValidEmail(), "Invalid email format")
        validate(password.isNotBlank(), "Password cannot be empty")
        validate(password.hasMinLength(6), "Password must be at least 6 characters")
    }
}

data class CustomerLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("customer_id") val customerId: Int,
    val name: String? = null,
    val email: String? = null
)

data class CustomerRegisterRequest(
    val email: String,
    val password: String,
    val name: String,  // Backend expects 'name' field
    val phone: String
) {
    fun validate(): ValidationResult = validate {
        validate(email.isValidEmail(), "Invalid email format")
        validate(password.isValidPassword(), "Password must be at least 8 characters with letters and numbers")
        validate(name.isNotBlank(), "Name cannot be empty")
        validate(name.hasMinLength(2), "Name must be at least 2 characters")
        validate(phone.isNotBlank(), "Phone number cannot be empty")
    }
}

/**
 * Demo login request for App Store review
 * Only demo emails are accepted - server validates and generates session
 */
data class DemoLoginRequest(
    val email: String
)

data class GoogleAuthRequest(
    @SerializedName("id_token") val idToken: String,
    val email: String? = null,
    val name: String? = null,
    @SerializedName("google_id") val googleId: String? = null
) {
    // Convenience constructor for simple idToken auth
    constructor(idToken: String) : this(idToken, null, null, null)
}

data class AppleAuthRequest(
    val email: String,
    val name: String,
    @SerializedName("apple_id") val appleId: String
)

data class PasswordResetRequest(
    val email: String
)

/**
 * Forgot password request - sends reset code to email
 * Matches iOS: POST /auth/customer/forgot-password
 */
data class ForgotPasswordRequest(
    val email: String
)

/**
 * Reset password with code request
 * Matches iOS: POST /auth/customer/reset-password
 */
data class ResetPasswordWithCodeRequest(
    val email: String,
    val code: String,
    @SerializedName("new_password") val newPassword: String
)

data class DriverLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("driver_id") val driverId: Int,
    val name: String? = null,
    val email: String? = null,
    @SerializedName("driver_code") val driverCode: String? = null
)

data class DriverRegisterRequest(
    val email: String,
    val password: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val phone: String
)

data class DriverGoogleAuthRequest(
    @SerializedName("id_token") val idToken: String,
    val email: String,
    val name: String
)

data class VendorLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("vendor_id") val vendorId: Int,
    @SerializedName("business_name") val businessName: String? = null,
    val email: String? = null
)

/**
 * Response from /api/vendors/public registration endpoint
 * Matches iOS P2PVendorRegistrationResponse
 */
data class VendorRegistrationResponse(
    val id: Int,
    @SerializedName("vendor_id") val vendorId: Int,
    @SerializedName("restaurant_name") val restaurantName: String,
    @SerializedName("contact_email") val contactEmail: String,
    val status: String,
    val message: String? = null
)

data class VendorRegisterRequest(
    val email: String,
    val password: String,
    @SerializedName("business_name") val businessName: String,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val address: String,
    val city: String,
    val state: String,
    @SerializedName("zip_code") val zipCode: String
)

// ==========================================
// VENDOR PROFILE & SETTINGS MODELS
// ==========================================

/**
 * Vendor profile response from backend
 */
data class VendorProfileResponse(
    val id: Int,
    @SerializedName("vendor_id") val vendorId: String? = null,
    @SerializedName("company_name") val companyName: String? = null,
    @SerializedName("restaurant_name") val restaurantName: String? = null,
    @SerializedName("cuisine_type") val cuisineType: String? = null,
    val description: String? = null,
    @SerializedName("contact_name") val contactName: String? = null,
    @SerializedName("contact_email") val contactEmail: String? = null,
    @SerializedName("contact_phone") val contactPhone: String? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    val street: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,
    val country: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("operating_hours") val operatingHours: String? = null,
    @SerializedName("average_prep_time") val averagePrepTime: Int? = null,
    @SerializedName("delivery_available") val deliveryAvailable: Boolean = true,
    @SerializedName("pickup_available") val pickupAvailable: Boolean = true,
    @SerializedName("seating_capacity") val seatingCapacity: Int? = null,
    @SerializedName("onboarding_status") val onboardingStatus: String? = null,
    @SerializedName("notification_preferences") val notificationPreferences: NotificationPreferences? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("w9_form") val w9Form: Boolean = false,
    val insurance: Boolean = false,
    @SerializedName("health_permit") val healthPermit: Boolean = false,
    @SerializedName("food_license") val foodLicense: Boolean = false,
    @SerializedName("compliance_certs") val complianceCerts: Boolean = false,
    @SerializedName("is_online") val isOnline: Boolean? = false
)

/**
 * Notification preferences stored as JSON in vendor profile
 */
data class NotificationPreferences(
    @SerializedName("new_orders") val newOrders: Boolean = true,
    @SerializedName("order_updates") val orderUpdates: Boolean = true,
    @SerializedName("driver_assigned") val driverAssigned: Boolean = true,
    @SerializedName("low_stock_alerts") val lowStockAlerts: Boolean = true,
    @SerializedName("reviews") val reviews: Boolean = true,
    @SerializedName("weekly_report") val weeklyReport: Boolean = true,
    @SerializedName("promotions") val promotions: Boolean = false,
    @SerializedName("sound_enabled") val soundEnabled: Boolean = true,
    @SerializedName("vibration_enabled") val vibrationEnabled: Boolean = true
)

/**
 * Request to update vendor profile
 */
data class UpdateVendorProfileRequest(
    @SerializedName("restaurant_name") val restaurantName: String? = null,
    @SerializedName("cuisine_type") val cuisineType: String? = null,
    val description: String? = null,
    @SerializedName("contact_name") val contactName: String? = null,
    @SerializedName("contact_email") val contactEmail: String? = null,
    @SerializedName("contact_phone") val contactPhone: String? = null,
    @SerializedName("street_address") val streetAddress: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,
    @SerializedName("average_prep_time") val averagePrepTime: Int? = null,
    @SerializedName("delivery_available") val deliveryAvailable: Boolean? = null,
    @SerializedName("pickup_available") val pickupAvailable: Boolean? = null
)

/**
 * Request to update business hours
 * Operating hours stored as JSON string: {"monday": {"open": "09:00", "close": "21:00", "is_open": true}, ...}
 */
data class UpdateBusinessHoursRequest(
    @SerializedName("operating_hours") val operatingHours: String,
    @SerializedName("average_prep_time") val averagePrepTime: Int? = null
)

/**
 * Business hours for a single day
 */
data class DayHours(
    val open: String = "10:00",
    val close: String = "22:00",
    @SerializedName("is_open") val isOpen: Boolean = true
)

/**
 * Request to update notification settings
 */
data class UpdateNotificationSettingsRequest(
    @SerializedName("notification_preferences") val notificationPreferences: NotificationPreferences
)

/**
 * Update vendor online status request
 */
data class UpdateOnlineStatusRequest(
    @SerializedName("is_online") val isOnline: Boolean
)

/**
 * Vendor documents response
 */
data class VendorDocumentsResponse(
    val documents: List<VendorDocument>,
    val count: Int
)

/**
 * Single vendor document
 */
data class VendorDocument(
    val id: Int,
    @SerializedName("document_type") val documentType: String,
    @SerializedName("file_name") val fileName: String? = null,
    @SerializedName("file_url") val fileUrl: String? = null,
    @SerializedName("upload_date") val uploadDate: String? = null,
    @SerializedName("expiry_date") val expiryDate: String? = null,
    val status: String = "pending", // pending, approved, rejected
    @SerializedName("admin_notes") val adminNotes: String? = null
)

/**
 * Vendor payouts response
 */
data class VendorPayoutsResponse(
    @SerializedName("available_balance") val availableBalance: Double = 0.0,
    @SerializedName("pending_balance") val pendingBalance: Double = 0.0,
    @SerializedName("total_earnings") val totalEarnings: Double = 0.0,
    @SerializedName("this_month_earnings") val thisMonthEarnings: Double = 0.0,
    @SerializedName("platform_fee_rate") val platformFeeRate: Double = 1.0, // $1 flat fee
    @SerializedName("bank_account") val bankAccount: VendorBankAccount? = null,
    @SerializedName("payout_history") val payoutHistory: List<VendorPayout>? = null
)

/**
 * Vendor bank account details
 */
data class VendorBankAccount(
    @SerializedName("account_holder_name") val accountHolderName: String? = null,
    @SerializedName("routing_number_last4") val routingNumberLast4: String? = null,
    @SerializedName("account_number_last4") val accountNumberLast4: String? = null,
    @SerializedName("account_type") val accountType: String = "checking", // checking, savings
    @SerializedName("bank_name") val bankName: String? = null,
    @SerializedName("is_verified") val isVerified: Boolean = false
)

/**
 * Request to update vendor bank account
 */
data class VendorBankAccountRequest(
    @SerializedName("account_holder_name") val accountHolderName: String,
    @SerializedName("routing_number") val routingNumber: String,
    @SerializedName("account_number") val accountNumber: String,
    @SerializedName("account_type") val accountType: String = "checking"
)

/**
 * Single payout record
 */
data class VendorPayout(
    val id: Int,
    val amount: Double,
    val status: String, // pending, processing, completed, failed
    @SerializedName("initiated_at") val initiatedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("failure_reason") val failureReason: String? = null
)

// ==========================================
// ORDER MODELS
// ==========================================

data class Order(
    val id: Int,
    @SerializedName("order_number") val orderNumber: String? = null,
    @SerializedName("customer_id") val customerId: Int,
    @SerializedName("customer_name") val customerName: String? = null,
    @SerializedName("customer_email") val customerEmail: String? = null,
    @SerializedName("customer_phone") val customerPhone: String? = null,
    @SerializedName("vendor_id") val vendorId: Int,
    @SerializedName("driver_id") val driverId: Int? = null,
    @SerializedName("driver_name") val driverName: String? = null,
    val status: String,
    @SerializedName("payment_status") val paymentStatus: String? = null,
    val subtotal: Double,
    @SerializedName("tax_amount") val taxAmount: Double? = null,
    @SerializedName("delivery_fee") val deliveryFee: Double? = null,
    val tip: Double? = null,
    @SerializedName("platform_fee") val platformFee: Double? = null,
    @SerializedName("total_amount") val totalAmount: Double? = null,
    @SerializedName("delivery_address") val deliveryAddress: String? = null,
    @SerializedName("delivery_instructions") val deliveryInstructions: String? = null,
    val items: List<OrderItem>? = null,
    @SerializedName("restaurant_name") val restaurantName: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("confirmed_at") val confirmedAt: String? = null,
    @SerializedName("preparing_at") val preparingAt: String? = null,
    @SerializedName("delivered_at") val deliveredAt: String? = null,
    @SerializedName("dispatched_at") val dispatchedAt: String? = null,
    @SerializedName("cancelled_at") val cancelledAt: String? = null,
    @SerializedName("sent_to_restaurant_at") val sentToRestaurantAt: String? = null,
    @SerializedName("restaurant_accepted_at") val restaurantAcceptedAt: String? = null,
    @SerializedName("restaurant_declined_at") val restaurantDeclinedAt: String? = null,
    @SerializedName("restaurant_decline_reason") val restaurantDeclineReason: String? = null,
    @SerializedName("restaurant_timeout_at") val restaurantTimeoutAt: String? = null,
    @SerializedName("ready_for_pickup_at") val readyForPickupAt: String? = null
)

data class OrderItem(
    val id: Int,
    @SerializedName("menu_item_id") val menuItemId: Int,
    val name: String,
    val quantity: Int,
    val price: Double,
    @SerializedName("special_instructions") val specialInstructions: String? = null
)

data class ActiveOrdersResponse(
    @SerializedName("active_orders") val activeOrders: List<Order>,
    val count: Int
)

data class OrderTrackingResponse(
    @SerializedName("order_id") val orderId: Int,
    val status: String,
    @SerializedName("status_history") val statusHistory: List<StatusHistoryItem>? = null,
    @SerializedName("estimated_delivery") val estimatedDelivery: String? = null,
    val driver: DriverInfo? = null
)

data class StatusHistoryItem(
    val status: String,
    val timestamp: String,
    val message: String? = null
)

data class DriverInfo(
    val id: Int,
    val name: String,
    val phone: String? = null,
    @SerializedName("vehicle_type") val vehicleType: String? = null,
    @SerializedName("vehicle_color") val vehicleColor: String? = null,
    @SerializedName("license_plate") val licensePlate: String? = null,
    val rating: Double? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

/**
 * Delivery address dictionary matching backend schema
 * Aligned with iOS/Webapp format
 */
data class DeliveryAddressDict(
    val street: String,
    val city: String,
    val state: String,
    val zip: String
)

/**
 * Create order request matching backend schema
 * Aligned with iOS (CartViewModel.swift) and Webapp (Checkout.tsx)
 */
data class CreateOrderRequest(
    @SerializedName("customer_name") val customerName: String,
    @SerializedName("customer_email") val customerEmail: String,
    @SerializedName("customer_phone") val customerPhone: String,
    @SerializedName("vendor_id") val vendorId: Int,
    val items: List<OrderItemRequest>,
    @SerializedName("delivery_address") val deliveryAddress: DeliveryAddressDict,
    @SerializedName("delivery_instructions") val deliveryInstructions: String? = null,
    val tip: Double? = null
) {
    fun validate(): ValidationResult = validate {
        validate(customerName.isNotBlank(), "Customer name cannot be empty")
        validate(customerEmail.isNotBlank(), "Customer email cannot be empty")
        validate(vendorId > 0, "Invalid vendor ID")
        validate(items.isNotEmpty(), "Order must contain at least one item")
        validate(items.all { it.validate().isValid() }, "One or more order items are invalid")
        validate(deliveryAddress.street.isNotBlank(), "Street address cannot be empty")
        validate(deliveryAddress.city.isNotBlank(), "City cannot be empty")
        validate(deliveryAddress.state.isNotBlank(), "State cannot be empty")
        validate(deliveryAddress.zip.isNotBlank(), "ZIP code cannot be empty")
        tip?.let { validate(it.isValidPrice(), "Tip amount must be non-negative") }
    }
}

data class OrderItemRequest(
    @SerializedName("menu_item_id") val menuItemId: Int,
    val quantity: Int,
    @SerializedName("special_instructions") val specialInstructions: String? = null
) {
    fun validate(): ValidationResult = validate {
        validate(menuItemId > 0, "Invalid menu item ID")
        validate(quantity.isValidQuantity(), "Quantity must be at least 1")
        validate(quantity <= 99, "Quantity cannot exceed 99")
        specialInstructions?.let {
            validate(it.hasMaxLength(500), "Special instructions cannot exceed 500 characters")
        }
    }
}

data class CreateOrderResponse(
    @SerializedName("order_id") val orderId: Int,
    val status: String,
    val total: Double,
    val message: String? = null
)

data class TipRequest(
    val amount: Double
)

// ==========================================
// ADDRESS MODELS
// Aligned with backend schema (Uber/DoorDash pattern)
// ==========================================

data class Address(
    val id: Int,
    @SerializedName("user_id") val userId: Int,  // Backend returns user_id
    @SerializedName("location_name") val locationName: String? = null,  // "Home", "Work", etc.
    val street: String,
    val unit: String? = null,
    val city: String,
    val state: String,
    @SerializedName("zip_code") val zipCode: String,
    val instructions: String? = null,
    @SerializedName("address_type") val addressType: String? = "Home",  // "Home", "Work", "Other"
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("is_default") val isDefault: Boolean = false,
    val label: String? = null  // Backward compatibility - same as location_name
) {
    // Convenience properties for backward compatibility
    val addressLine1: String get() = street
    val addressLine2: String? get() = unit
    val customerId: Int get() = userId

    // Formatted address for display
    val formattedAddress: String
        get() = listOfNotNull(
            street,
            unit?.let { "Unit $it" },
            city,
            state,
            zipCode
        ).joinToString(", ")

    // Display name (location name or address type)
    val displayName: String
        get() = locationName?.takeIf { it.isNotEmpty() } ?: addressType ?: "Home"
}

data class AddAddressRequest(
    @SerializedName("location_name") val locationName: String? = null,
    val street: String,
    val unit: String? = null,
    val city: String,
    val state: String,
    @SerializedName("zip_code") val zipCode: String,
    val instructions: String? = null,
    @SerializedName("address_type") val addressType: String? = "Home",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("is_default") val isDefault: Boolean = false
) {
    fun validate(): ValidationResult = validate {
        validate(street.isNotBlank(), "Street address cannot be empty")
        validate(street.hasMinLength(3), "Street address must be at least 3 characters")
        validate(city.isNotBlank(), "City cannot be empty")
        validate(city.hasMinLength(2), "City must be at least 2 characters")
        validate(state.isNotBlank(), "State cannot be empty")
        validate(state.length == 2, "State must be 2-letter code (e.g., CA)")
        validate(zipCode.isValidZipCode(), "Invalid ZIP code format")
        latitude?.let { validate(it.isValidLatitude(), "Invalid latitude value") }
        longitude?.let { validate(it.isValidLongitude(), "Invalid longitude value") }
        phoneNumber?.let {
            if (it.isNotBlank()) {
                validate(it.isValidPhone(), "Invalid phone number format")
            }
        }
    }
}

data class UpdateAddressRequest(
    @SerializedName("location_name") val locationName: String? = null,
    val street: String? = null,
    val unit: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,
    val instructions: String? = null,
    @SerializedName("address_type") val addressType: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("is_default") val isDefault: Boolean? = null
)

// ==========================================
// RIDESHARE MODELS
// ==========================================

data class RideRequest(
    @SerializedName("customer_id") val customerId: Int,
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("dropoff_lat") val dropoffLat: Double,
    @SerializedName("dropoff_lng") val dropoffLng: Double,
    @SerializedName("dropoff_address") val dropoffAddress: String
)

data class RideResponse(
    @SerializedName("ride_id") val rideId: Int,
    val status: String,
    @SerializedName("estimated_fare") val estimatedFare: Double,
    @SerializedName("estimated_time") val estimatedTime: String? = null,
    @SerializedName("distance_miles") val distanceMiles: Double? = null
)

data class CustomerRidesResponse(
    val rides: List<Ride>,
    val count: Int
)

data class Ride(
    val id: Int,
    @SerializedName("customer_id") val customerId: Int,
    @SerializedName("driver_id") val driverId: Int? = null,
    val status: String,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("dropoff_address") val dropoffAddress: String,
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("dropoff_lat") val dropoffLat: Double,
    @SerializedName("dropoff_lng") val dropoffLng: Double,
    @SerializedName("distance_miles") val distanceMiles: Double? = null,
    @SerializedName("fare_amount") val fareAmount: Double? = null,
    @SerializedName("platform_fee") val platformFee: Double? = null,
    @SerializedName("driver_earnings") val driverEarnings: Double? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("started_at") val startedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    val driver: DriverInfo? = null
)

data class RideTrackingResponse(
    @SerializedName("ride_id") val rideId: Int,
    val status: String,
    val driver: DriverInfo? = null,
    @SerializedName("driver_location") val driverLocation: DriverLocation? = null,
    val eta: String? = null
)

data class DriverLocation(
    val lat: Double,
    val lng: Double,
    val heading: Double? = null
)

data class CancelRideRequest(
    val reason: String? = null
)

data class RateRideRequest(
    val rating: Int,
    val comment: String? = null
)

data class RideEstimateRequest(
    @SerializedName("pickup_latitude") val pickupLat: Double,
    @SerializedName("pickup_longitude") val pickupLng: Double,
    @SerializedName("dropoff_latitude") val dropoffLat: Double,
    @SerializedName("dropoff_longitude") val dropoffLng: Double
)

data class RideEstimateResponse(
    @SerializedName("distance_miles") val distanceMiles: Double,
    @SerializedName("estimated_fare") val estimatedFare: Double,
    @SerializedName("estimated_time") val estimatedTime: String,
    val breakdown: FareBreakdown? = null
)

data class FareBreakdown(
    val base: Double,
    val distance: Double,
    @SerializedName("platform_fee") val platformFee: Double
)

data class AvailableRide(
    @SerializedName("ride_id") val rideId: Int,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("dropoff_address") val dropoffAddress: String,
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("dropoff_lat") val dropoffLat: Double,
    @SerializedName("dropoff_lng") val dropoffLng: Double,
    @SerializedName("distance_miles") val distanceMiles: Double,
    @SerializedName("estimated_fare") val estimatedFare: Double,
    @SerializedName("customer_name") val customerName: String? = null
)

data class RideActionResponse(
    val success: Boolean,
    val ride: Ride? = null,
    val message: String? = null
)

data class RideCompleteResponse(
    val success: Boolean,
    val status: String,
    val earnings: Double,
    val tip: Double? = null,
    @SerializedName("total_earned") val totalEarned: Double
)

data class DriverRidesResponse(
    val rides: List<Ride>,
    @SerializedName("total_rides") val totalRides: Int,
    @SerializedName("total_earnings") val totalEarnings: Double
)

// ==========================================
// DRIVER MODELS
// ==========================================

data class DriverProfile(
    val id: Int,
    @SerializedName("driver_id") val driverId: String? = null,  // Business ID like "DRV-00002"
    val email: String,
    val name: String? = null,  // Backend returns combined name
    @SerializedName("first_name") val firstName: String? = null,  // Optional - may not be returned
    @SerializedName("last_name") val lastName: String? = null,  // Optional - may not be returned
    val phone: String? = null,
    val status: String? = null,  // "pending", "active", "suspended", "deactivated"
    @SerializedName("vehicle_type") val vehicleType: String? = null,
    @SerializedName("vehicle_color") val vehicleColor: String? = null,
    @SerializedName("license_plate") val licensePlate: String? = null,
    @SerializedName("drivers_license") val driversLicense: Boolean = false,
    val insurance: Boolean = false,
    @SerializedName("background_check") val backgroundCheck: Boolean = false,
    @SerializedName("is_online") val isOnline: Boolean = false,
    @SerializedName("driver_type") val driverType: String? = null,
    @SerializedName("current_lat") val currentLat: Double? = null,
    @SerializedName("current_lng") val currentLng: Double? = null,
    val rating: Double = 0.0,
    @SerializedName("total_deliveries") val totalDeliveries: Int = 0,
    @SerializedName("total_rides") val totalRides: Int = 0,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null
) {
    // Helper to get display name (prefers combined name, falls back to first+last)
    val displayName: String
        get() = name ?: listOfNotNull(firstName, lastName).joinToString(" ").ifEmpty { "Driver" }
}

data class UpdateDriverRequest(
    @SerializedName("first_name") val firstName: String? = null,
    @SerializedName("last_name") val lastName: String? = null,
    val phone: String? = null,
    @SerializedName("vehicle_type") val vehicleType: String? = null,
    @SerializedName("vehicle_color") val vehicleColor: String? = null,
    @SerializedName("license_plate") val licensePlate: String? = null,
    @SerializedName("driver_type") val driverType: String? = null
)

data class DriverDocumentsResponse(
    @SerializedName("driver_id") val driverId: Int,
    val documents: List<DriverDocument>,
    val count: Int,
    @SerializedName("all_verified") val allVerified: Boolean
)

data class DriverDocument(
    val id: Int,
    @SerializedName("document_type") val documentType: String,
    @SerializedName("file_name") val fileName: String,
    @SerializedName("file_url") val fileUrl: String? = null,
    @SerializedName("upload_date") val uploadDate: String? = null,
    @SerializedName("expiry_date") val expiryDate: String? = null,
    val status: String,
    val verified: Boolean
)

data class DocumentUploadResponse(
    @SerializedName("document_id") val documentId: Int,
    val status: String,
    val message: String? = null
)

data class DriverStatusResponse(
    @SerializedName("driver_id") val driverId: Int,
    @SerializedName("is_online") val isOnline: Boolean,
    @SerializedName("driver_type") val driverType: String? = null
)

data class UpdateDriverStatusRequest(
    @SerializedName("is_online") val isOnline: Boolean,
    @SerializedName("driver_type") val driverType: String? = null
)

data class DriverLocationRequest(
    @SerializedName("driver_id") val driverId: Int,
    val latitude: Double,
    val longitude: Double,
    val heading: Double? = null,
    val speed: Double? = null
)

data class DriverLocationResponse(
    val latitude: Double,
    val longitude: Double,
    val heading: Double? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

// ==========================================
// DELIVERY MODELS
// ==========================================

data class AvailableDelivery(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("restaurant_name") val restaurantName: String,
    @SerializedName("restaurant_address") val restaurantAddress: String,
    @SerializedName("delivery_address") val deliveryAddress: String,
    val earnings: Double,
    val distance: Double,
    @SerializedName("estimated_time") val estimatedTime: String? = null,
    @SerializedName("item_count") val itemCount: Int? = null
)

data class Delivery(
    val id: Int,
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("driver_id") val driverId: Int,
    val status: String,
    @SerializedName("restaurant_name") val restaurantName: String,
    @SerializedName("restaurant_address") val restaurantAddress: String,
    @SerializedName("delivery_address") val deliveryAddress: String,
    val earnings: Double,
    val tip: Double? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null
)

data class DeliveryActionResponse(
    val success: Boolean,
    val order: Order? = null,
    val status: String? = null,
    val message: String? = null
)

// ==========================================
// DRIVER EARNINGS MODELS
// ==========================================

data class DriverEarningsResponse(
    val today: Double,
    val week: Double,
    val month: Double,
    val pending: Double,
    @SerializedName("total_tips") val totalTips: Double? = null,
    @SerializedName("deliveries_today") val deliveriesToday: Int? = null,
    @SerializedName("rides_today") val ridesToday: Int? = null
)

data class DriverDashboardResponse(
    val stats: DriverStats,
    val earnings: DriverEarningsResponse,
    @SerializedName("active_delivery") val activeDelivery: Delivery? = null,
    @SerializedName("active_ride") val activeRide: Ride? = null
)

data class DriverStats(
    @SerializedName("total_deliveries") val totalDeliveries: Int,
    @SerializedName("total_rides") val totalRides: Int,
    val rating: Double,
    @SerializedName("acceptance_rate") val acceptanceRate: Double? = null,
    @SerializedName("completion_rate") val completionRate: Double? = null
)

data class DriverStatsResponse(
    @SerializedName("driver_id") val driverId: Int,
    val stats: DriverStats,
    @SerializedName("weekly_summary") val weeklySummary: WeeklySummary? = null
)

data class WeeklySummary(
    val deliveries: Int,
    val rides: Int,
    val earnings: Double,
    val tips: Double,
    @SerializedName("hours_online") val hoursOnline: Double? = null
)

/**
 * Driver balance for payouts
 */
data class DriverBalanceResponse(
    @SerializedName("available_balance") val availableBalance: Double = 0.0,
    @SerializedName("pending_balance") val pendingBalance: Double = 0.0,
    @SerializedName("instant_payout_available") val instantPayoutAvailable: Boolean = false,
    @SerializedName("instant_payout_fee") val instantPayoutFee: Double = 1.50,
    @SerializedName("min_payout_amount") val minPayoutAmount: Double = 10.0,
    @SerializedName("has_bank_account") val hasBankAccount: Boolean = false,
    @SerializedName("bank_last4") val bankLast4: String? = null,
    @SerializedName("bank_name") val bankName: String? = null
)

// ==========================================
// VENDOR ORDER MODELS
// ==========================================

data class VendorOrder(
    val id: Int,
    @SerializedName("order_number") val orderNumber: String? = null,
    @SerializedName("customer_id") val customerId: Int,
    @SerializedName("customer_name") val customerName: String? = null,
    @SerializedName("customer_phone") val customerPhone: String? = null,
    val status: String,
    @SerializedName("total_amount") val totalAmount: Double,
    @SerializedName("platform_fee") val platformFee: Double? = null,
    val items: List<OrderItem>? = null,
    @SerializedName("special_instructions") val specialInstructions: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("delivery_address") val deliveryAddress: String? = null
)

data class OrderActionResponse(
    val success: Boolean,
    val status: String? = null,
    @SerializedName("prep_time") val prepTime: Int? = null,
    @SerializedName("driver_notified") val driverNotified: Boolean? = null,
    @SerializedName("refund_initiated") val refundInitiated: Boolean? = null,
    val message: String? = null
)

data class RejectOrderRequest(
    val reason: String
)

// ==========================================
// MENU MANAGEMENT MODELS
// ==========================================

data class CreateMenuItemRequest(
    val name: String,
    val description: String? = null,
    val price: Double,
    val category: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("is_vegetarian") val isVegetarian: Boolean = false,
    @SerializedName("is_vegan") val isVegan: Boolean = false,
    @SerializedName("is_gluten_free") val isGlutenFree: Boolean = false,
    @SerializedName("spice_level") val spiceLevel: Int? = null,
    @SerializedName("prep_time_minutes") val prepTimeMinutes: Int? = null
) {
    fun validate(): ValidationResult = validate {
        validate(name.isNotBlank(), "Menu item name cannot be empty")
        validate(name.hasMinLength(2), "Menu item name must be at least 2 characters")
        validate(name.hasMaxLength(100), "Menu item name cannot exceed 100 characters")
        validate(price.isValidPrice(), "Price must be non-negative")
        validate(price <= 9999.99, "Price cannot exceed $9,999.99")
        description?.let {
            validate(it.hasMaxLength(1000), "Description cannot exceed 1000 characters")
        }
        spiceLevel?.let {
            validate(it in 0..5, "Spice level must be between 0 and 5")
        }
        prepTimeMinutes?.let {
            validate(it > 0, "Prep time must be positive")
            validate(it <= 480, "Prep time cannot exceed 8 hours (480 minutes)")
        }
    }
}

data class UpdateMenuItemRequest(
    val name: String? = null,
    val description: String? = null,
    val price: Double? = null,
    val category: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean? = null,
    @SerializedName("in_stock") val inStock: Boolean? = null
)

// ==========================================
// PROMOTION MODELS
// ==========================================

data class Promotion(
    val id: Int,
    @SerializedName("vendor_id") val vendorId: Int,
    val name: String,
    val description: String? = null,
    @SerializedName("discount_type") val discountType: String,
    @SerializedName("discount_value") val discountValue: Double,
    @SerializedName("minimum_order") val minimumOrder: Double? = null,
    @SerializedName("max_discount") val maxDiscount: Double? = null,
    @SerializedName("promo_code") val promoCode: String? = null,
    @SerializedName("start_date") val startDate: String? = null,
    @SerializedName("end_date") val endDate: String? = null,
    @SerializedName("is_active") val isActive: Boolean = true,
    @SerializedName("usage_count") val usageCount: Int = 0,
    @SerializedName("max_usage") val maxUsage: Int? = null
)

data class PromotionsResponse(
    val promotions: List<Promotion>
)

data class CreatePromotionRequest(
    val name: String,
    val description: String? = null,
    @SerializedName("discount_type") val discountType: String,
    @SerializedName("discount_value") val discountValue: Double,
    @SerializedName("minimum_order") val minimumOrder: Double? = null,
    @SerializedName("promo_code") val promoCode: String? = null,
    @SerializedName("start_date") val startDate: String? = null,
    @SerializedName("end_date") val endDate: String? = null,
    @SerializedName("max_usage") val maxUsage: Int? = null
)

data class PromotionAnalyticsResponse(
    @SerializedName("vendor_id") val vendorId: Int,
    @SerializedName("total_promotions") val totalPromotions: Int,
    @SerializedName("active_promotions") val activePromotions: Int,
    @SerializedName("total_redemptions") val totalRedemptions: Int,
    @SerializedName("total_savings") val totalSavings: Double,
    @SerializedName("top_promotions") val topPromotions: List<Promotion>? = null
)

data class PromotionSuggestionsResponse(
    val suggestions: List<PromotionSuggestion>
)

data class PromotionSuggestion(
    val type: String,
    val name: String,
    val description: String,
    @SerializedName("discount_type") val discountType: String,
    @SerializedName("discount_value") val discountValue: Double,
    @SerializedName("expected_impact") val expectedImpact: String? = null
)

// ==========================================
// PAYMENT MODELS
// ==========================================

data class CreatePaymentIntentRequest(
    val amount: Int, // in cents
    val currency: String = "usd",
    @SerializedName("customer_id") val customerId: Int? = null
)

data class PaymentIntentResponse(
    @SerializedName("clientSecret") val clientSecret: String,
    @SerializedName("publishableKey") val publishableKey: String,
    @SerializedName("paymentIntent") val paymentIntent: String? = null,
    @SerializedName("ephemeralKey") val ephemeralKey: String? = null,
    val customer: String? = null
)

// ==========================================
// TRACKING MODELS
// ==========================================

data class FullOrderTrackingResponse(
    @SerializedName("order_id") val orderId: Int,
    val status: String,
    val restaurant: RestaurantInfo,
    val driver: DriverInfo? = null,
    @SerializedName("delivery_location") val deliveryLocation: LocationInfo,
    @SerializedName("estimated_delivery") val estimatedDelivery: String? = null,
    @SerializedName("status_updates") val statusUpdates: List<StatusUpdate>? = null
)

data class RestaurantInfo(
    val id: Int,
    val name: String,
    val address: String,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class LocationInfo(
    val address: String,
    val latitude: Double,
    val longitude: Double
)

data class StatusUpdate(
    val status: String,
    val timestamp: String,
    val message: String? = null
)

// ==========================================
// AI & ANALYTICS MODELS
// ==========================================

data class AIEmployeesStatsResponse(
    @SerializedName("total_ai_employees") val totalAIEmployees: Int,
    @SerializedName("active_tasks") val activeTasks: Int,
    @SerializedName("tasks_completed_today") val tasksCompletedToday: Int,
    val employees: List<AIEmployee>? = null
)

data class AIEmployee(
    val id: String,
    val name: String,
    val role: String,
    val status: String,
    @SerializedName("tasks_completed") val tasksCompleted: Int
)

data class MenuVerificationStatusResponse(
    @SerializedName("vendor_id") val vendorId: Int,
    @SerializedName("is_verified") val isVerified: Boolean,
    @SerializedName("items_verified") val itemsVerified: Int,
    @SerializedName("items_pending") val itemsPending: Int,
    @SerializedName("last_verified") val lastVerified: String? = null
)

// ==========================================
// GENERIC RESPONSE
// ==========================================

data class GenericResponse(
    val success: Boolean = true,
    val message: String? = null,
    val error: String? = null
)

data class ErrorResponse(
    val detail: String
)

// ==========================================
// DRIVER RATING & CHAT MODELS
// Aligned with iOS (Uber/DoorDash pattern)
// ==========================================

data class DriverRatingRequest(
    val rating: Int,  // 1-5
    val comment: String? = null,
    @SerializedName("on_time") val onTime: Boolean? = null,
    val friendly: Boolean? = null,
    @SerializedName("followed_instructions") val followedInstructions: Boolean? = null
) {
    fun validate(): ValidationResult = validate {
        validate(rating.isValidRating(), "Rating must be between 1 and 5")
        comment?.let {
            validate(it.hasMaxLength(500), "Comment cannot exceed 500 characters")
        }
    }
}

data class ChatMessageRequest(
    val message: String,
    @SerializedName("sender_type") val senderType: String = "customer"  // customer, driver, restaurant
)

data class ChatMessage(
    val id: Int,
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("sender_type") val senderType: String,
    @SerializedName("sender_id") val senderId: Int,
    @SerializedName("sender_name") val senderName: String? = null,
    val message: String,
    @SerializedName("created_at") val createdAt: String
)

data class FavoriteCheckResponse(
    @SerializedName("is_favorite") val isFavorite: Boolean
)

// ==========================================
// ORDER MODIFICATION MODELS
// Aligned with iOS (Uber/DoorDash pattern)
// ==========================================

data class OrderModification(
    @SerializedName("modification_number") val modificationNumber: String,
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("unavailable_items") val unavailableItems: List<UnavailableItem>,
    @SerializedName("unavailable_count") val unavailableCount: Int,
    @SerializedName("available_items") val availableItems: List<ModifiedOrderItem>,
    @SerializedName("available_count") val availableCount: Int,
    @SerializedName("original_total") val originalTotal: Double,
    @SerializedName("new_total") val newTotal: Double,
    @SerializedName("partial_refund_amount") val partialRefundAmount: Double,
    @SerializedName("time_remaining_seconds") val timeRemainingSeconds: Int,
    @SerializedName("expires_at") val expiresAt: String,
    @SerializedName("is_expired") val isExpired: Boolean = false,
    @SerializedName("restaurant_name") val restaurantName: String? = null
)

data class UnavailableItem(
    @SerializedName("menu_item_id") val menuItemId: Int,
    val name: String,
    val quantity: Int,
    val price: Double,
    val reason: String? = null
)

data class ModifiedOrderItem(
    @SerializedName("menu_item_id") val menuItemId: Int,
    val name: String,
    val quantity: Int,
    val price: Double
)

data class OrderModificationResponse(
    val response: String  // "accept" or "reject"
)

// ==========================================
// MENU CUSTOMIZATION MODELS
// Aligned with iOS (Uber/DoorDash pattern)
// ==========================================

data class MenuItemCustomization(
    val id: String,
    val name: String,  // "Size", "Toppings", "Extras"
    val type: String,  // "single" or "multiple"
    val required: Boolean = false,
    @SerializedName("min_selections") val minSelections: Int? = null,
    @SerializedName("max_selections") val maxSelections: Int? = null,
    val options: List<CustomizationOption>
)

data class CustomizationOption(
    val id: String,
    val name: String,
    val price: Double = 0.0,
    @SerializedName("is_default") val isDefault: Boolean = false,
    @SerializedName("is_available") val isAvailable: Boolean = true
)

data class SelectedCustomization(
    val id: String,
    @SerializedName("customization_name") val customizationName: String,
    @SerializedName("selected_options") val selectedOptions: List<String>,
    @SerializedName("additional_price") val additionalPrice: Double = 0.0
)

// Extended MenuItem with customizations
data class MenuItemWithCustomizations(
    val id: Int,
    @SerializedName("vendor_id") val vendorId: Int? = null,
    val name: String,
    val description: String? = null,
    val price: Double,
    val category: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    @SerializedName("in_stock") val inStock: Boolean = true,
    @SerializedName("is_vegetarian") val isVegetarian: Boolean = false,
    @SerializedName("is_vegan") val isVegan: Boolean = false,
    @SerializedName("is_gluten_free") val isGlutenFree: Boolean = false,
    @SerializedName("spice_level") val spiceLevel: Int? = null,
    @SerializedName("prep_time_minutes") val prepTimeMinutes: Int? = null,
    val calories: Int? = null,
    val allergens: List<String>? = null,
    @SerializedName("dietary_tags") val dietaryTags: List<String>? = null,
    val customizations: List<MenuItemCustomization>? = null
)

// ==========================================
// ORDER STATUS ENUM
// NOTE: Use com.eatfair.shared.constants.OrderStatus instead
// This import alias is provided for backward compatibility
// ==========================================
// OrderStatus is defined in EnumConst.kt with all 11 backend statuses:
// PENDING_PAYMENT, CONFIRMED, PENDING_RESTAURANT, PENDING_MODIFICATION,
// PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED,
// DECLINED_BY_RESTAURANT, RESTAURANT_TIMEOUT

// ==========================================
// PUSH NOTIFICATION MODELS
// ==========================================

/**
 * Request to register FCM push token with backend
 */
data class RegisterPushTokenRequest(
    val token: String,
    val platform: String = "android",  // "ios" or "android"
    @SerializedName("push_service") val pushService: String = "fcm",  // "fcm" or "apns"
    @SerializedName("device_id") val deviceId: String? = null,
    @SerializedName("app_version") val appVersion: String? = null,
    @SerializedName("user_type") val userType: String? = null  // "customer", "driver", "vendor"
)

// ==========================================
// iOS PARITY - ADDITIONAL MODELS
// These models match iOS P2PAPIService.swift endpoints
// ==========================================

/**
 * Confirm password reset with token
 * Matches iOS: POST /customer/password-reset/confirm
 */
data class ConfirmPasswordResetRequest(
    val token: String,
    @SerializedName("new_password") val newPassword: String
)

/**
 * Update customer profile
 * Matches iOS: POST /customer/{customerId}/profile
 */
data class UpdateCustomerProfileRequest(
    val name: String? = null,
    val phone: String? = null,
    val email: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null
)

data class CustomerProfileResponse(
    val id: Int,
    val name: String?,
    val email: String,
    val phone: String?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("created_at") val createdAt: String?
)

/**
 * Cancel order request
 * Matches iOS: POST /orders/{orderId}/cancel
 * Fields aligned with iOS for cross-platform parity
 */
data class CancelOrderRequest(
    val reason: String? = null,
    @SerializedName("reason_details") val reasonDetails: String? = null
)

/**
 * Refund status response
 * Matches iOS: GET /orders/{orderId}/refund-status
 */
data class RefundStatusResponse(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("refund_status") val refundStatus: String,
    @SerializedName("refund_amount") val refundAmount: Double?,
    @SerializedName("refund_date") val refundDate: String?,
    val message: String?
)

/**
 * Order modification response request
 * Matches iOS: POST /orders/{orderId}/modification/respond
 */
data class OrderModificationResponseRequest(
    val response: String  // "accept" or "reject"
)

/**
 * Mark items unavailable request
 * Matches iOS: POST /orders/{orderId}/mark-unavailable
 */
data class MarkItemsUnavailableRequest(
    @SerializedName("item_ids") val itemIds: List<Int>,
    val reason: String? = null
)

// ==========================================
// RIDESHARE FARE NEGOTIATION MODELS
// Matches iOS negotiation-service integration
// ==========================================

/**
 * Customer fare offer for negotiation
 * Matches iOS: POST /erp/rides/{rideId}/customer-negotiate
 */
data class CustomerFareOfferRequest(
    @SerializedName("offered_fare") val offeredFare: Double,
    val message: String? = null
)

/**
 * Fare negotiation response
 * Matches iOS negotiation responses
 */
data class FareNegotiationResponse(
    @SerializedName("ride_id") val rideId: Int,
    @SerializedName("negotiation_status") val negotiationStatus: String,
    @SerializedName("current_fare") val currentFare: Double,
    @SerializedName("customer_offer") val customerOffer: Double?,
    @SerializedName("driver_offer") val driverOffer: Double?,
    @SerializedName("platform_suggested_fare") val platformSuggestedFare: Double,
    @SerializedName("is_accepted") val isAccepted: Boolean,
    val message: String?
)

// ==========================================
// PAYMENT CARD MODELS
// Matches iOS P2PAPIService card management
// ==========================================

/**
 * Saved payment cards response
 * Matches iOS: GET /customers/{customerId}/cards
 */
data class SavedCardsResponse(
    val cards: List<PaymentCard>
)

/**
 * Payment card details
 */
data class PaymentCard(
    val id: String,
    val brand: String,  // "visa", "mastercard", "amex", etc.
    @SerializedName("last4") val last4: String,
    @SerializedName("exp_month") val expMonth: Int,
    @SerializedName("exp_year") val expYear: Int,
    @SerializedName("is_default") val isDefault: Boolean = false,
    @SerializedName("cardholder_name") val cardholderName: String? = null
)

/**
 * Add new payment card request
 * Matches iOS: POST /customers/{customerId}/cards
 */
data class AddCardRequest(
    @SerializedName("payment_method_id") val paymentMethodId: String,  // Stripe PaymentMethod ID
    @SerializedName("set_as_default") val setAsDefault: Boolean = false
)

// ==========================================
// PROMOTIONS & DEALS MODELS
// Matches iOS P2PAPIService promotions
// ==========================================

/**
 * Active promotions for customers
 * Matches iOS: GET /api/promotions/active
 */
data class ActivePromotionsResponse(
    val promotions: List<CustomerPromotion>
)

/**
 * Customer-facing promotion
 */
data class CustomerPromotion(
    val id: Int,
    @SerializedName("promo_code") val promoCode: String?,
    val name: String,
    val description: String?,
    @SerializedName("discount_type") val discountType: String,  // "percentage", "fixed"
    @SerializedName("discount_value") val discountValue: Double,
    @SerializedName("minimum_order") val minimumOrder: Double?,
    @SerializedName("max_discount") val maxDiscount: Double?,
    @SerializedName("valid_until") val validUntil: String?,
    @SerializedName("restaurant_name") val restaurantName: String?,
    @SerializedName("restaurant_id") val restaurantId: Int?
)

/**
 * Featured deals for homepage
 * Matches iOS: GET /promotions/featured
 */
data class FeaturedDealsResponse(
    val deals: List<FeaturedDeal>
)

data class FeaturedDeal(
    val id: Int,
    val title: String,
    val description: String?,
    @SerializedName("image_url") val imageUrl: String?,
    @SerializedName("discount_text") val discountText: String,
    @SerializedName("restaurant_id") val restaurantId: Int?,
    @SerializedName("restaurant_name") val restaurantName: String?,
    @SerializedName("valid_until") val validUntil: String?
)

/**
 * Apply promo code request
 * Matches iOS: POST /promotions/apply
 */
data class ApplyPromoCodeRequest(
    @SerializedName("promo_code") val promoCode: String,
    @SerializedName("order_subtotal") val orderSubtotal: Double,
    @SerializedName("vendor_id") val vendorId: Int? = null
)

/**
 * Apply promo code response
 */
data class ApplyPromoCodeResponse(
    @SerializedName("is_valid") val isValid: Boolean,
    val discount: Double?,
    @SerializedName("discount_type") val discountType: String?,
    @SerializedName("new_total") val newTotal: Double?,
    val message: String?,
    @SerializedName("promo_details") val promoDetails: CustomerPromotion?
)

// ==========================================
// DRIVER DELIVERY DECISION MODELS
// Matches iOS delivery decision flow
// ==========================================

/**
 * Start delivery decision request
 * Matches iOS: POST /driver/start-delivery-decision
 */
data class StartDeliveryDecisionRequest(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("driver_id") val driverId: Int
)

/**
 * Make delivery decision request
 * Matches iOS: POST /driver/make-delivery-decision
 */
data class MakeDeliveryDecisionRequest(
    @SerializedName("decision_id") val decisionId: Int,
    val decision: String,  // "accept" or "reject"
    val reason: String? = null
)

/**
 * Delivery decision response
 */
data class DeliveryDecisionResponse(
    @SerializedName("decision_id") val decisionId: Int,
    @SerializedName("order_id") val orderId: Int,
    val status: String,
    @SerializedName("expires_at") val expiresAt: String?,
    val message: String?
)

/**
 * Delivery decision status response
 * Matches iOS: GET /driver/delivery-decision-status/{id}
 */
data class DeliveryDecisionStatusResponse(
    @SerializedName("decision_id") val decisionId: Int,
    @SerializedName("order_id") val orderId: Int,
    val status: String,  // "pending", "accepted", "rejected", "expired"
    @SerializedName("decided_at") val decidedAt: String?,
    @SerializedName("is_expired") val isExpired: Boolean
)

/**
 * Pending delivery order for driver
 * Matches iOS: GET /erp/orders/driver/{driverId}/pending
 */
data class PendingDeliveryOrder(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("restaurant_name") val restaurantName: String,
    @SerializedName("restaurant_address") val restaurantAddress: String,
    @SerializedName("restaurant_lat") val restaurantLat: Double?,
    @SerializedName("restaurant_lng") val restaurantLng: Double?,
    @SerializedName("delivery_address") val deliveryAddress: String,
    @SerializedName("delivery_lat") val deliveryLat: Double?,
    @SerializedName("delivery_lng") val deliveryLng: Double?,
    @SerializedName("item_count") val itemCount: Int,
    @SerializedName("order_total") val orderTotal: Double,
    @SerializedName("estimated_earnings") val estimatedEarnings: Double,
    @SerializedName("estimated_distance_miles") val estimatedDistanceMiles: Double?,
    @SerializedName("estimated_time_minutes") val estimatedTimeMinutes: Int?,
    @SerializedName("created_at") val createdAt: String
)
