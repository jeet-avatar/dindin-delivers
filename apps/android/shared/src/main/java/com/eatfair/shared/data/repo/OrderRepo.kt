package com.eatfair.shared.data.repo

import android.util.Log
import com.eatfair.shared.constants.OrderStatus
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.order.DeliveryPartner
import com.eatfair.shared.model.order.OrderTracking
import com.eatfair.shared.model.order.PickUpLocation
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OrderRepo - API-only order management (NO FIRESTORE)
 *
 * Single source of truth: REST API via DollorRepository (PostgreSQL backend)
 * Uses polling for "real-time" updates instead of Firestore listeners
 *
 * Production API - https://api.dollor.ai
 */
@Singleton
class OrderRepo @Inject constructor(
    private val dollorRepository: DollorRepository
) {
    companion object {
        private const val TAG = "OrderRepo"
        private const val POLLING_INTERVAL_MS = 5000L // 5 seconds
    }

    /**
     * Get orders for a restaurant partner (vendor)
     * Uses API with polling for updates
     */
    fun getOrdersForPartner(partnerId: Int): Flow<List<OrderTracking>> = flow {
        Log.d(TAG, "Fetching orders for partner: $partnerId via API")

        while (true) {
            try {
                val result = dollorRepository.getVendorOrders()
                result.fold(
                    onSuccess = { orders ->
                        val trackingOrders = orders
                            .filter { order ->
                                order.status in listOf(
                                    "placed", "accepted", "preparing", "ready",
                                    "driver_assigned", "picked_up", "out_for_delivery"
                                )
                            }
                            .map { order ->
                                OrderTracking(
                                    orderId = order.id.toString(),
                                    orderNumber = order.orderNumber ?: "#${order.id}",
                                    restaurant = null,
                                    status = OrderStatus.fromValue(order.status),
                                    deliveryPartner = DeliveryPartner(),
                                    estimatedTime = "30 mins",
                                    pickupLocation = PickUpLocation(),
                                    deliveryLocation = null,
                                    deliveryInstructions = order.specialInstructions ?: "",
                                    isDelayed = false
                                )
                            }
                        Log.d(TAG, "Received ${trackingOrders.size} orders from API")
                        emit(trackingOrders)
                    },
                    onFailure = { error ->
                        Log.e(TAG, "API error fetching partner orders: ${error.message}")
                        emit(emptyList())
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching partner orders: ${e.message}")
                emit(emptyList())
            }

            delay(POLLING_INTERVAL_MS)
        }
    }

    /**
     * Get active order for customer tracking
     * Uses API with polling for updates
     */
    fun getActiveOrder(customerId: String): Flow<OrderTracking?> = flow {
        Log.d(TAG, "Fetching active order for customer: $customerId via API")

        while (true) {
            try {
                val result = dollorRepository.getActiveOrders()
                result.fold(
                    onSuccess = { response ->
                        val activeOrder = response.activeOrders.firstOrNull()
                        if (activeOrder != null) {
                            val tracking = OrderTracking(
                                orderId = activeOrder.id.toString(),
                                orderNumber = "#${activeOrder.id}",
                                restaurant = null,
                                status = OrderStatus.fromValue(activeOrder.status),
                                deliveryPartner = DeliveryPartner(),
                                estimatedTime = "30 mins",
                                pickupLocation = PickUpLocation(),
                                deliveryLocation = null,
                                deliveryInstructions = "",
                                isDelayed = false
                            )
                            emit(tracking)
                        } else {
                            emit(null)
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "API error fetching active order: ${error.message}")
                        emit(null)
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching active order: ${e.message}")
                emit(null)
            }

            delay(POLLING_INTERVAL_MS)
        }
    }

    /**
     * Get available deliveries for driver
     */
    suspend fun getAvailableDeliveries() = dollorRepository.getAvailableDeliveries()

    /**
     * Get driver's current/past deliveries
     */
    suspend fun getMyDeliveries() = dollorRepository.getMyDeliveries()

    /**
     * Accept a delivery
     */
    suspend fun acceptDelivery(deliveryId: Int) = dollorRepository.acceptDelivery(deliveryId)

    /**
     * Mark delivery as picked up
     */
    suspend fun markDeliveryPickedUp(deliveryId: Int) = dollorRepository.markDeliveryPickedUp(deliveryId)

    /**
     * Complete delivery
     */
    suspend fun completeDelivery(deliveryId: Int) = dollorRepository.completeDelivery(deliveryId)

    /**
     * Get order by ID from API
     */
    suspend fun getOrderById(orderId: String): Result<OrderTracking> {
        return try {
            val orderIdInt = orderId.toIntOrNull() ?: 0
            val result = dollorRepository.trackOrder(orderIdInt)
            result.fold(
                onSuccess = { tracking ->
                    Result.success(OrderTracking(
                        orderId = orderId,
                        orderNumber = "#$orderId",
                        restaurant = null,
                        status = OrderStatus.fromValue(tracking.status),
                        deliveryPartner = tracking.driver?.let { driver ->
                            DeliveryPartner(driver.name, driver.phone ?: "")
                        } ?: DeliveryPartner(),
                        estimatedTime = tracking.estimatedDelivery ?: "30 mins",
                        pickupLocation = PickUpLocation(),
                        deliveryLocation = null,
                        deliveryInstructions = "",
                        isDelayed = false
                    ))
                },
                onFailure = { Result.failure(it) }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error getting order: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Get orders for driver via API with polling
     */
    fun getOrdersForDriver(driverId: String): Flow<List<OrderTracking>> = flow {
        Log.d(TAG, "Fetching orders for driver: $driverId via API")

        while (true) {
            try {
                val result = dollorRepository.getMyDeliveries()
                result.fold(
                    onSuccess = { deliveries ->
                        val activeDeliveries = deliveries
                            .filter { delivery ->
                                delivery.status in listOf(
                                    "driver_assigned", "driver_en_route_pickup", "driver_arrived_pickup",
                                    "picked_up", "out_for_delivery", "driver_arrived"
                                )
                            }
                            .map { delivery ->
                                OrderTracking(
                                    orderId = delivery.id.toString(),
                                    orderNumber = "#${delivery.orderId}",
                                    restaurant = null,
                                    status = OrderStatus.fromValue(delivery.status),
                                    deliveryPartner = DeliveryPartner(),
                                    estimatedTime = "15 mins",
                                    pickupLocation = PickUpLocation(
                                        address = delivery.restaurantAddress
                                    ),
                                    deliveryLocation = null,
                                    deliveryInstructions = "",
                                    isDelayed = false
                                )
                            }
                        Log.d(TAG, "Received ${activeDeliveries.size} active deliveries for driver")
                        emit(activeDeliveries)
                    },
                    onFailure = { error ->
                        Log.e(TAG, "API error fetching driver deliveries: ${error.message}")
                        emit(emptyList())
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching driver deliveries: ${e.message}")
                emit(emptyList())
            }

            delay(POLLING_INTERVAL_MS)
        }
    }
}
