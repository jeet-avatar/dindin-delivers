package com.eatfair.partner.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.constants.OrderStatus
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrdersUiState(
    val orders: List<OrderItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

/**
 * OrdersViewModel - P2P Backend Only (No Firebase)
 *
 * All order data comes from the Dollor.ai production API.
 * Uses polling for real-time updates instead of Firestore.
 */
@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val dollorRepository: DollorRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    // Polling interval for order updates (in ms)
    private val pollingInterval = 10_000L // 10 seconds

    // Track polling job for proper cleanup
    private var pollingJob: Job? = null

    init {
        loadOrders()
        startOrderPolling()
    }

    override fun onCleared() {
        super.onCleared()
        // Cancel polling job to prevent memory leak
        pollingJob?.cancel()
        pollingJob = null
    }

    /**
     * Load orders from the P2P backend API
     * This is the ONLY data source - no Firebase fallback
     */
    private fun loadOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            dollorRepository.getVendorOrders().fold(
                onSuccess = { vendorOrders ->
                    val orderItems = vendorOrders.map { order ->
                        OrderItem(
                            id = order.id.toLong(),
                            customerName = order.customerName ?: "Customer",
                            customerPhone = order.customerPhone ?: "",
                            items = order.items?.map { item ->
                                OrderMenuItem(
                                    name = item.name ?: "Item",
                                    quantity = item.quantity ?: 1,
                                    price = item.price ?: 0.0
                                )
                            } ?: emptyList(),
                            totalAmount = order.totalAmount,
                            status = mapStatusFromApi(order.status),
                            time = order.createdAt ?: "",
                            deliveryAddress = order.deliveryAddress ?: "Pickup",
                            orderNumber = order.orderNumber ?: "EF${order.id}"
                        )
                    }
                    _uiState.update { it.copy(orders = orderItems, isLoading = false) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load orders"
                        )
                    }
                    // Retry after a delay instead of falling back to Firestore
                    retryLoadOrders()
                }
            )
        }
    }

    /**
     * Retry loading orders after a delay when initial load fails
     */
    private fun retryLoadOrders() {
        viewModelScope.launch {
            delay(5000) // Wait 5 seconds before retry
            refreshOrders()
        }
    }

    /**
     * Map API status string to OrderStatus enum
     * UNIFIED: Handles both lowercase (new) and uppercase (legacy) formats
     */
    private fun mapStatusFromApi(status: String?): OrderStatus {
        return when (status?.lowercase()) {
            "pending_payment", "placed" -> OrderStatus.ORDER_PLACED
            "confirmed", "accepted" -> OrderStatus.ORDER_PLACED
            "preparing" -> OrderStatus.PREPARING
            "ready", "ready_for_pickup" -> OrderStatus.OUT_FOR_DELIVERY
            "picked_up", "out_for_delivery" -> OrderStatus.OUT_FOR_DELIVERY
            "delivered" -> OrderStatus.DELIVERED
            "cancelled" -> OrderStatus.CANCELLED
            else -> OrderStatus.ORDER_PLACED
        }
    }

    /**
     * Poll for order updates periodically
     * This ensures we catch new orders in real-time
     */
    private fun startOrderPolling() {
        pollingJob?.cancel() // Cancel any existing job
        pollingJob = viewModelScope.launch {
            while (isActive) { // Check isActive instead of true to allow cancellation
                delay(pollingInterval)
                if (isActive) { // Double-check before making network call
                    refreshOrders()
                }
            }
        }
    }

    /**
     * Refresh orders without showing loading indicator
     */
    fun refreshOrders() {
        viewModelScope.launch {
            try {
                dollorRepository.getVendorOrders().fold(
                    onSuccess = { vendorOrders ->
                        val orderItems = vendorOrders.map { order ->
                            OrderItem(
                                id = order.id.toLong(),
                                customerName = order.customerName ?: "Customer",
                                customerPhone = order.customerPhone ?: "",
                                items = order.items?.map { item ->
                                    OrderMenuItem(
                                        name = item.name ?: "Item",
                                        quantity = item.quantity ?: 1,
                                        price = item.price ?: 0.0
                                    )
                                } ?: emptyList(),
                                totalAmount = order.totalAmount,
                                status = mapStatusFromApi(order.status),
                                time = order.createdAt ?: "",
                                deliveryAddress = order.deliveryAddress ?: "Pickup",
                                orderNumber = order.orderNumber ?: "EF${order.id}"
                            )
                        }
                        _uiState.update { it.copy(orders = orderItems, error = null) }
                    },
                    onFailure = { error ->
                        // Log error but don't update UI state on silent refresh
                        android.util.Log.e("OrdersViewModel", "Silent refresh failed: ${error.message}")
                    }
                )
            } catch (e: Exception) {
                // Log error but don't update UI state on silent refresh
                android.util.Log.e("OrdersViewModel", "Exception during refresh: ${e.message}")
            }
        }
    }

    /**
     * Accept an order - calls backend API
     */
    fun acceptOrder(orderId: Long) {
        viewModelScope.launch {
            try {
                dollorRepository.acceptOrder(orderId.toInt()).fold(
                    onSuccess = {
                        updateLocalOrderStatus(orderId, OrderStatus.PREPARING)
                        refreshOrders() // Refresh to get updated data
                    },
                    onFailure = { error ->
                        _uiState.update { it.copy(error = "Failed to accept order: ${error.message}") }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Failed to accept order: ${e.message ?: "Unknown error"}") }
            }
        }
    }

    /**
     * Reject an order - calls backend API
     */
    fun rejectOrder(orderId: Long, reason: String = "Restaurant busy") {
        viewModelScope.launch {
            try {
                dollorRepository.rejectOrder(orderId.toInt(), reason).fold(
                    onSuccess = {
                        // Remove from local state
                        _uiState.update { state ->
                            state.copy(orders = state.orders.filter { it.id != orderId })
                        }
                    },
                    onFailure = { error ->
                        _uiState.update { it.copy(error = "Failed to reject order: ${error.message}") }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Failed to reject order: ${e.message ?: "Unknown error"}") }
            }
        }
    }

    /**
     * Mark order as preparing
     */
    fun markAsPreparing(orderId: Long) {
        acceptOrder(orderId) // Same as accept for now
    }

    /**
     * Mark order as ready for pickup/delivery
     */
    fun markAsReady(orderId: Long) {
        viewModelScope.launch {
            try {
                dollorRepository.markOrderReady(orderId.toInt()).fold(
                    onSuccess = {
                        updateLocalOrderStatus(orderId, OrderStatus.OUT_FOR_DELIVERY)
                        refreshOrders()
                    },
                    onFailure = { error ->
                        _uiState.update { it.copy(error = "Failed to mark order ready: ${error.message}") }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Failed to mark order ready: ${e.message ?: "Unknown error"}") }
            }
        }
    }

    private fun updateLocalOrderStatus(orderId: Long, newStatus: OrderStatus) {
        _uiState.update { state ->
            state.copy(
                orders = state.orders.map { order ->
                    if (order.id == orderId) {
                        order.copy(status = newStatus)
                    } else {
                        order
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
