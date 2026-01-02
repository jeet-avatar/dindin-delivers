package com.eatfair.shared.model.order

import com.eatfair.shared.constants.OrderStatus
import com.eatfair.shared.model.address.AddressDto
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.shared.util.OrderNumberFormatter

data class OrderTracking(
    val orderId: String = "",
    val orderNumber: String = "", // Enterprise order number (EF-YYYYMMDD-HHMMSS-XXXX)
    val restaurant: Restaurant? = null,
    val status: OrderStatus = OrderStatus.CONFIRMED,
    val deliveryPartner: DeliveryPartner = DeliveryPartner(),
    val estimatedTime: String = "",
    val pickupLocation: PickUpLocation = PickUpLocation(),
    val deliveryLocation: AddressDto? = null,
    val deliveryInstructions: String = "",
    val isDelayed: Boolean = false,
    // Additional fields for full order tracking
    val vendorId: Int? = null,
    val customerId: String? = null,
    val driverId: String? = null,
    val subtotal: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val serviceFee: Double = 0.0,
    val tax: Double = 0.0,
    val tip: Double = 0.0,
    val total: Double = 0.0,
    val placedAt: Long? = null,
    val acceptedAt: Long? = null,
    val pickedUpAt: Long? = null,
    val deliveredAt: Long? = null
) {
    /**
     * Get formatted display for order number
     * Returns "#0042" for enterprise format or "#orderId" for legacy
     */
    val displayOrderNumber: String
        get() = if (orderNumber.isNotEmpty())
            OrderNumberFormatter.getShortDisplay(orderNumber)
        else
            "#$orderId"

    /**
     * Get full order number for display
     */
    val fullOrderNumber: String
        get() = orderNumber.ifEmpty { orderId }

    /**
     * Get formatted time from order number
     */
    val orderPlacedTime: String
        get() = if (orderNumber.isNotEmpty())
            OrderNumberFormatter.formatOrderTime(orderNumber)
        else
            ""

}

data class DeliveryPartner(
    val name: String = "",
    val phone: String = "",
    val avatar: String? = null
)

data class PickUpLocation(
    val address: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
)