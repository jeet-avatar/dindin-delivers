package com.eatfair.shared.model.order

import com.eatfair.shared.model.address.AddressDto
import com.google.gson.annotations.SerializedName

/**
 * Order type enum for differentiating order types
 */
enum class OrderType(val value: String) {
    SINGLE("single"),
    MULTI_RESTAURANT("multi_restaurant");

    companion object {
        fun fromValue(value: String): OrderType {
            return entries.find { it.value == value.lowercase() } ?: SINGLE
        }
    }
}

/**
 * Restaurant info for multi-restaurant orders
 */
data class RestaurantInfo(
    val id: String = "",
    val name: String = "",
    val address: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val imageUrl: String = ""
)

/**
 * Delivery address for orders (matches iOS DeliveryAddress)
 */
data class DeliveryAddress(
    val fullAddress: String = "",
    val street: String = "",
    val city: String = "",
    val state: String = "",
    val zipCode: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val landmark: String? = null,
    val instructions: String? = null
) {
    companion object {
        fun fromAddressDto(dto: AddressDto): DeliveryAddress {
            return DeliveryAddress(
                fullAddress = dto.fullAddress.ifEmpty { dto.getDisplayAddress() },
                street = dto.street,
                city = dto.city,
                state = dto.state,
                zipCode = dto.zipCode,
                latitude = dto.latitude,
                longitude = dto.longitude,
                landmark = null,
                instructions = dto.instructions
            )
        }
    }
}

/**
 * Order item for multi-restaurant orders (matches iOS OrderItem)
 */
data class MultiRestaurantOrderItem(
    val id: String = "",
    val menuItemId: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val options: List<String>? = null,
    val restaurantId: String? = null,
    val restaurantName: String? = null
)

/**
 * Multi-restaurant order structure (matches iOS MultiRestaurantOrder)
 *
 * Supports ordering from up to 3 restaurants in a single order
 * with optimized pickup routing for drivers
 */
data class MultiRestaurantOrder(
    val id: String? = null,
    val orderId: String = "",
    val orderType: OrderType = OrderType.SINGLE,
    val customerId: String = "",
    val customerName: String = "",
    val customerPhone: String? = null,
    val customerEmail: String = "",

    val deliveryAddress: DeliveryAddress = DeliveryAddress(),
    val deliveryInstructions: String = "",

    // Multiple restaurants (up to 3)
    val restaurants: List<RestaurantInfo> = emptyList(),
    val itemsByRestaurant: Map<String, List<MultiRestaurantOrderItem>> = emptyMap(),
    val pickupOrder: List<String> = emptyList(), // Ordered list of restaurantIds for pickup route
    val pickupStatuses: Map<String, String> = emptyMap(), // restaurantId -> status

    // Aggregated items for display
    val allItems: List<MultiRestaurantOrderItem> = emptyList(),
    val totalItemsCount: Int = 0,

    // Pricing
    val subtotal: Double = 0.0,
    @SerializedName("platform_fee")
    val platformFee: Double = 0.0, // $1 per restaurant (max $3)
    @SerializedName("delivery_fee")
    val deliveryFee: Double = 0.0, // Base $5 + $2 per extra stop
    @SerializedName("driver_bonus")
    val driverBonus: Double = 0.0, // Extra incentive for multi-stop
    @SerializedName("service_fee")
    val serviceFee: Double = 0.0,
    val tax: Double = 0.0,
    @SerializedName("tax_rate")
    val taxRate: Double = 0.0,

    // Discounts & Promotions
    @SerializedName("promotion_codes")
    val promotionCodes: Map<String, String>? = null, // restaurantId -> promoCode
    val discounts: Map<String, Double>? = null, // restaurantId -> discount
    @SerializedName("total_discount")
    val totalDiscount: Double = 0.0,

    // Tip
    val tip: Double = 0.0,
    @SerializedName("tip_percentage")
    val tipPercentage: Double? = null,
    @SerializedName("suggested_tip")
    val suggestedTip: Double = 0.0, // Higher for multi-restaurant

    val total: Double = 0.0,

    // Status & Tracking
    val status: String = "Placed",
    @SerializedName("placed_at")
    val placedAt: Long = System.currentTimeMillis(),
    @SerializedName("accepted_at")
    val acceptedAt: Long? = null,
    @SerializedName("completed_at")
    val completedAt: Long? = null,
    @SerializedName("estimated_delivery_time")
    val estimatedDeliveryTime: Long? = null,

    // Driver Assignment
    @SerializedName("driver_id")
    val driverId: String? = null,
    @SerializedName("driver_name")
    val driverName: String? = null,
    @SerializedName("driver_phone")
    val driverPhone: String? = null,
    @SerializedName("preferred_driver_id")
    val preferredDriverId: String? = null, // Customer's favorite driver
    @SerializedName("is_high_ticket")
    val isHighTicket: Boolean = false, // True for multi-restaurant orders

    // Rating
    @SerializedName("is_rated")
    val isRated: Boolean = false,
    @SerializedName("is_tipped")
    val isTipped: Boolean = false
) {
    companion object {
        // Pricing constants (matching iOS AppConfig)
        private const val PLATFORM_FEE_PER_RESTAURANT = 1.0
        private const val BASE_DELIVERY_FEE = 5.0
        private const val EXTRA_STOP_FEE = 2.0
        private const val DEFAULT_TAX_RATE = 0.08
        private const val DEFAULT_TIP_RATE = 0.20

        /**
         * Create a new multi-restaurant order with calculated pricing
         */
        fun create(
            customerId: String,
            customerName: String,
            customerPhone: String?,
            customerEmail: String,
            deliveryAddress: DeliveryAddress,
            deliveryInstructions: String,
            restaurants: List<RestaurantInfo>,
            itemsByRestaurant: Map<String, List<MultiRestaurantOrderItem>>,
            tip: Double = 0.0,
            tipPercentage: Double? = null,
            preferredDriverId: String? = null
        ): MultiRestaurantOrder {
            val allItems = itemsByRestaurant.values.flatten()
            val totalItemsCount = allItems.sumOf { it.quantity }
            val subtotal = allItems.sumOf { it.price * it.quantity }

            val platformFee = restaurants.size * PLATFORM_FEE_PER_RESTAURANT
            val deliveryFee = BASE_DELIVERY_FEE + (maxOf(0, restaurants.size - 1) * EXTRA_STOP_FEE)
            val driverBonus = if (restaurants.size > 1) (restaurants.size - 1) * EXTRA_STOP_FEE else 0.0
            val tax = subtotal * DEFAULT_TAX_RATE
            val suggestedTip = subtotal * DEFAULT_TIP_RATE
            val total = subtotal + platformFee + deliveryFee + tax + tip

            return MultiRestaurantOrder(
                orderId = java.util.UUID.randomUUID().toString(),
                orderType = if (restaurants.size > 1) OrderType.MULTI_RESTAURANT else OrderType.SINGLE,
                customerId = customerId,
                customerName = customerName,
                customerPhone = customerPhone,
                customerEmail = customerEmail,
                deliveryAddress = deliveryAddress,
                deliveryInstructions = deliveryInstructions,
                restaurants = restaurants,
                itemsByRestaurant = itemsByRestaurant,
                pickupOrder = restaurants.map { it.id },
                pickupStatuses = restaurants.associate { it.id to "pending" },
                allItems = allItems,
                totalItemsCount = totalItemsCount,
                subtotal = subtotal,
                platformFee = platformFee,
                deliveryFee = deliveryFee,
                driverBonus = driverBonus,
                serviceFee = 0.0,
                tax = tax,
                taxRate = DEFAULT_TAX_RATE * 100,
                tip = tip,
                tipPercentage = tipPercentage,
                suggestedTip = suggestedTip,
                total = total,
                preferredDriverId = preferredDriverId,
                isHighTicket = restaurants.size > 1
            )
        }
    }

    /**
     * Recalculates all pricing fields
     */
    fun recalculatePricing(): MultiRestaurantOrder {
        val recalculatedItems = itemsByRestaurant.values.flatten()
        val recalculatedCount = recalculatedItems.sumOf { it.quantity }
        val recalculatedSubtotal = recalculatedItems.sumOf { it.price * it.quantity }

        val recalculatedPlatformFee = restaurants.size * PLATFORM_FEE_PER_RESTAURANT
        val recalculatedDeliveryFee = BASE_DELIVERY_FEE + (maxOf(0, restaurants.size - 1) * EXTRA_STOP_FEE)
        val recalculatedDriverBonus = if (restaurants.size > 1) (restaurants.size - 1) * EXTRA_STOP_FEE else 0.0
        val recalculatedTax = recalculatedSubtotal * DEFAULT_TAX_RATE
        val recalculatedSuggestedTip = recalculatedSubtotal * DEFAULT_TIP_RATE
        val recalculatedTotal = recalculatedSubtotal + recalculatedPlatformFee + recalculatedDeliveryFee +
            serviceFee + recalculatedTax + tip - totalDiscount

        return copy(
            allItems = recalculatedItems,
            totalItemsCount = recalculatedCount,
            subtotal = recalculatedSubtotal,
            platformFee = recalculatedPlatformFee,
            deliveryFee = recalculatedDeliveryFee,
            driverBonus = recalculatedDriverBonus,
            tax = recalculatedTax,
            taxRate = DEFAULT_TAX_RATE * 100,
            suggestedTip = recalculatedSuggestedTip,
            total = recalculatedTotal,
            isHighTicket = restaurants.size > 1
        )
    }
}
