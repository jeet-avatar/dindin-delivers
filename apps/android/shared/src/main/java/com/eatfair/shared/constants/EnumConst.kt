package com.eatfair.shared.constants

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Work
import androidx.compose.ui.graphics.vector.ImageVector

enum class AddressType(
    val displayName: String,
    val icon: ImageVector
) {
    HOME("Home", Icons.Default.Home),
    WORK("Work", Icons.Default.Work),
    FRIENDS("Friends", Icons.Default.Apartment),
    FAMILY("Family", Icons.Default.FamilyRestroom),
    OTHER("Hotel", Icons.Default.LocationOn),
}


/**
 * UNIFIED Order Status enum matching Backend PostgreSQL schema
 * Aligned across iOS, Android, and Web platforms
 *
 * Status flow (food delivery):
 * pending_payment -> confirmed -> pending_restaurant -> preparing -> ready_for_pickup
 * -> pending_delivery_decision -> restaurant_will_deliver/ready_for_pickup -> out_for_delivery -> delivered
 *
 * Restaurant acceptance flow (3-minute window):
 * pending_restaurant -> (accept) -> preparing
 * pending_restaurant -> (decline) -> declined_by_restaurant
 * pending_restaurant -> (timeout) -> restaurant_timeout
 *
 * Delivery decision flow (3-minute window after ready_for_pickup):
 * ready_for_pickup -> pending_delivery_decision
 * pending_delivery_decision -> (self-deliver) -> restaurant_will_deliver -> out_for_delivery
 * pending_delivery_decision -> (pass to driver) -> ready_for_pickup (driver pool)
 * pending_delivery_decision -> (timeout) -> delivery_decision_timeout -> ready_for_pickup (driver pool)
 *
 * Modification flow:
 * preparing -> pending_modification -> (accept/reject) -> preparing/cancelled
 *
 * OR: Any status -> cancelled
 */
enum class OrderStatus(val value: String, val displayName: String) {
    // Order placed, awaiting payment
    ORDER_PLACED("order_placed", "Order Placed"),

    // Payment pending
    PENDING_PAYMENT("pending_payment", "Pending Payment"),

    // Payment confirmed, order placed
    CONFIRMED("confirmed", "Order Confirmed"),

    // Sent to restaurant, awaiting acceptance (3-min window)
    PENDING_RESTAURANT("pending_restaurant", "Waiting for Restaurant"),

    // Restaurant marked items unavailable, awaiting customer response
    PENDING_MODIFICATION("pending_modification", "Awaiting Your Response"),

    // Restaurant accepted, preparing food
    PREPARING("preparing", "Being Prepared"),

    // Food ready for driver pickup
    READY_FOR_PICKUP("ready_for_pickup", "Ready for Pickup"),

    // Driver picked up, en route to customer
    OUT_FOR_DELIVERY("out_for_delivery", "Out for Delivery"),

    // Order delivered successfully
    DELIVERED("delivered", "Delivered"),

    // Order cancelled
    CANCELLED("cancelled", "Cancelled"),

    // Restaurant declined within 3-min window
    DECLINED_BY_RESTAURANT("declined_by_restaurant", "Restaurant Declined"),

    // Restaurant didn't respond within 3-min window
    RESTAURANT_TIMEOUT("restaurant_timeout", "Restaurant Timeout"),

    // ==========================================
    // DELIVERY DECISION FLOW (3-minute window)
    // ==========================================

    // Waiting for restaurant to decide on delivery (3-min window)
    PENDING_DELIVERY_DECISION("pending_delivery_decision", "Delivery Decision Pending"),

    // Restaurant chose to self-deliver
    RESTAURANT_WILL_DELIVER("restaurant_will_deliver", "Restaurant Delivering"),

    // Restaurant didn't respond to delivery decision within 3-min window
    DELIVERY_DECISION_TIMEOUT("delivery_decision_timeout", "Sent to Drivers"),

    // ==========================================
    // LEGACY/DRIVER-SPECIFIC STATUSES
    // Kept for backward compatibility with existing code
    // ==========================================

    // Legacy: Customer places order (maps to CONFIRMED)
    @Deprecated("Use CONFIRMED instead")
    PLACED("placed", "Order Placed"),

    // Legacy: Restaurant accepts (maps to PREPARING)
    @Deprecated("Use PREPARING instead")
    ACCEPTED("accepted", "Accepted"),

    // Legacy: Food ready (maps to READY_FOR_PICKUP)
    @Deprecated("Use READY_FOR_PICKUP instead")
    READY("ready", "Ready for Pickup"),

    // Driver-specific: Driver assigned to order
    DRIVER_ASSIGNED("driver_assigned", "Driver Assigned"),

    // Driver-specific: Driver en route to restaurant
    DRIVER_EN_ROUTE_PICKUP("driver_en_route_pickup", "Driver En Route"),

    // Driver-specific: Driver arrived at restaurant
    DRIVER_ARRIVED_PICKUP("driver_arrived_pickup", "Driver at Restaurant"),

    // Driver-specific: Driver picked up order
    PICKED_UP("picked_up", "Picked Up"),

    // Driver-specific: Driver arrived at customer
    DRIVER_ARRIVED("driver_arrived", "Driver Arriving");

    companion object {
        /**
         * Convert from backend/API string value to enum
         */
        fun fromValue(value: String): OrderStatus {
            return entries.find { it.value.equals(value, ignoreCase = true) }
                ?: when (value.lowercase()) {
                    // Legacy mappings for backward compatibility
                    "order_placed" -> CONFIRMED
                    "placed" -> CONFIRMED
                    "accepted" -> PREPARING
                    "ready" -> READY_FOR_PICKUP
                    else -> CONFIRMED // Default to confirmed for unknown
                }
        }

        /**
         * Check if order is active (not completed, cancelled, or failed)
         */
        fun isActive(status: OrderStatus): Boolean {
            return status !in listOf(
                DELIVERED,
                CANCELLED,
                DECLINED_BY_RESTAURANT,
                RESTAURANT_TIMEOUT,
                DELIVERY_DECISION_TIMEOUT
            )
        }

        /**
         * Check if order requires restaurant action (accept/decline or delivery decision)
         */
        fun requiresRestaurantAction(status: OrderStatus): Boolean {
            return status in listOf(
                PENDING_RESTAURANT,
                PENDING_DELIVERY_DECISION
            )
        }

        /**
         * Check if order can be cancelled by customer
         */
        fun canCancel(status: OrderStatus): Boolean {
            return status in listOf(
                PENDING_PAYMENT,
                CONFIRMED,
                PENDING_RESTAURANT,
                PENDING_MODIFICATION
            )
        }

        /**
         * Check if order is in a terminal/final state
         */
        fun isTerminal(status: OrderStatus): Boolean {
            return status in listOf(
                DELIVERED,
                CANCELLED,
                DECLINED_BY_RESTAURANT,
                RESTAURANT_TIMEOUT,
                DELIVERY_DECISION_TIMEOUT
            )
        }

        /**
         * Check if customer should receive refund for this status
         */
        fun shouldRefund(status: OrderStatus): Boolean {
            return status in listOf(
                CANCELLED,
                DECLINED_BY_RESTAURANT,
                RESTAURANT_TIMEOUT
            )
        }

        /**
         * Get next status in the standard flow
         */
        fun getNextStatus(current: OrderStatus): OrderStatus? {
            return when (current) {
                PENDING_PAYMENT -> CONFIRMED
                CONFIRMED -> PENDING_RESTAURANT
                PENDING_RESTAURANT -> PREPARING
                PREPARING -> READY_FOR_PICKUP
                READY_FOR_PICKUP -> PENDING_DELIVERY_DECISION
                // Delivery decision flow
                PENDING_DELIVERY_DECISION -> RESTAURANT_WILL_DELIVER // or READY_FOR_PICKUP for driver
                RESTAURANT_WILL_DELIVER -> OUT_FOR_DELIVERY
                OUT_FOR_DELIVERY -> DELIVERED
                // Driver-specific flow
                DRIVER_ASSIGNED -> DRIVER_EN_ROUTE_PICKUP
                DRIVER_EN_ROUTE_PICKUP -> DRIVER_ARRIVED_PICKUP
                DRIVER_ARRIVED_PICKUP -> PICKED_UP
                PICKED_UP -> OUT_FOR_DELIVERY
                DRIVER_ARRIVED -> DELIVERED
                // Legacy mappings
                PLACED -> PREPARING
                ACCEPTED -> READY_FOR_PICKUP
                READY -> OUT_FOR_DELIVERY
                else -> null
            }
        }
    }
}