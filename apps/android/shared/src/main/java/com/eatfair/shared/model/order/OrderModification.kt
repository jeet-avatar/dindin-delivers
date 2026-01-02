package com.eatfair.shared.model.order

import com.google.gson.annotations.SerializedName

/**
 * Order Modification (Partial Order Support)
 *
 * Used when a restaurant marks items as unavailable and the customer
 * needs to decide whether to proceed with a partial order or cancel.
 *
 * Matches iOS OrderModification struct in EatFairShared/Models/Order.swift
 */
data class OrderModification(
    @SerializedName("modification_number")
    val modificationNumber: String = "",

    @SerializedName("order_id")
    val orderId: Int = 0,

    // Unavailable items
    @SerializedName("unavailable_items")
    val unavailableItems: List<UnavailableItem> = emptyList(),

    @SerializedName("unavailable_count")
    val unavailableCount: Int = 0,

    // Available items (what customer will receive)
    @SerializedName("available_items")
    val availableItems: List<ModifiedOrderItem> = emptyList(),

    @SerializedName("available_count")
    val availableCount: Int = 0,

    // Pricing
    @SerializedName("original_total")
    val originalTotal: Double = 0.0,

    @SerializedName("new_total")
    val newTotal: Double = 0.0,

    @SerializedName("partial_refund_amount")
    val partialRefundAmount: Double = 0.0,

    // Timing
    @SerializedName("time_remaining_seconds")
    val timeRemainingSeconds: Int = 0,

    @SerializedName("expires_at")
    val expiresAt: String = "",

    @SerializedName("is_expired")
    val isExpired: Boolean = false,

    // Restaurant
    @SerializedName("restaurant_name")
    val restaurantName: String? = null
) {
    /**
     * Get the ID for use with Identifiable pattern
     */
    val id: String get() = modificationNumber

    /**
     * Calculate the savings from the partial order
     */
    val savingsAmount: Double get() = originalTotal - newTotal

    /**
     * Check if any items are still available
     */
    val hasAvailableItems: Boolean get() = availableItems.isNotEmpty()

}

/**
 * Unavailable item in an order modification
 */
data class UnavailableItem(
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val reason: String = "out of stock",
    @SerializedName("item_index")
    val itemIndex: Int? = null
) {
    /**
     * Get the ID for use with Identifiable pattern
     */
    val id: String get() = name

    /**
     * Total price for this item (price * quantity)
     */
    val totalPrice: Double get() = price * quantity

    companion object {
        fun fromMap(data: Map<String, Any?>): UnavailableItem {
            return UnavailableItem(
                name = data["name"] as? String ?: "",
                price = (data["price"] as? Number)?.toDouble() ?: 0.0,
                quantity = (data["quantity"] as? Number)?.toInt() ?: 1,
                reason = data["reason"] as? String ?: "out of stock",
                itemIndex = (data["item_index"] as? Number)?.toInt()
            )
        }
    }
}

/**
 * Modified order item (available item in partial order)
 */
data class ModifiedOrderItem(
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    @SerializedName("total_price")
    val totalPrice: Double? = null
) {
    /**
     * Get the ID for use with Identifiable pattern
     */
    val id: String get() = name

    /**
     * Calculate total price if not provided
     */
    val calculatedTotalPrice: Double get() = totalPrice ?: (price * quantity)

    companion object {
        fun fromMap(data: Map<String, Any?>): ModifiedOrderItem {
            return ModifiedOrderItem(
                name = data["name"] as? String ?: "",
                price = (data["price"] as? Number)?.toDouble() ?: 0.0,
                quantity = (data["quantity"] as? Number)?.toInt() ?: 1,
                totalPrice = (data["total_price"] as? Number)?.toDouble()
            )
        }
    }
}

/**
 * Delivery Order Status enum (matches iOS DeliveryOrderStatus)
 */
enum class DeliveryOrderStatus(val value: String) {
    READY("Ready"),
    READY_FOR_PICKUP("ready_for_pickup"),
    PICKED_UP("picked_up"),
    OUT_FOR_DELIVERY("Out for Delivery"),
    DELIVERED("Delivered"),
    CANCELLED("Cancelled"),
    PENDING_MODIFICATION("pending_modification");

    /**
     * Display name for UI
     */
    val displayName: String
        get() = when (this) {
            READY, READY_FOR_PICKUP -> "Ready"
            PICKED_UP, OUT_FOR_DELIVERY -> "Out for Delivery"
            DELIVERED -> "Delivered"
            CANCELLED -> "Cancelled"
            PENDING_MODIFICATION -> "Action Required"
        }

    companion object {
        /**
         * Create from any string status (case-insensitive)
         */
        fun from(status: String?): DeliveryOrderStatus {
            if (status == null) return READY

            return when (status.lowercase()) {
                "ready", "ready_for_pickup" -> READY
                "picked_up", "out_for_delivery", "out for delivery" -> OUT_FOR_DELIVERY
                "delivered" -> DELIVERED
                "cancelled", "canceled" -> CANCELLED
                "pending_modification", "pendingmodification" -> PENDING_MODIFICATION
                else -> READY
            }
        }
    }
}

/**
 * Response for order modification actions
 */
data class OrderModificationResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerializedName("refund_id")
    val refundId: String? = null,
    @SerializedName("refund_amount")
    val refundAmount: Double? = null,
    @SerializedName("new_order_total")
    val newOrderTotal: Double? = null
)

/**
 * Request to accept a partial order
 */
data class AcceptPartialOrderRequest(
    @SerializedName("order_id")
    val orderId: Int,
    @SerializedName("modification_number")
    val modificationNumber: String,
    @SerializedName("accepted_items")
    val acceptedItems: List<Int> // indices of accepted items
)

/**
 * Request to cancel due to unavailable items
 */
data class CancelPartialOrderRequest(
    @SerializedName("order_id")
    val orderId: Int,
    @SerializedName("modification_number")
    val modificationNumber: String,
    val reason: String = "Customer cancelled due to unavailable items"
)
