package com.eatfair.app.ui.order

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.model.CancelOrderRequest
import com.eatfair.shared.model.Order
import com.eatfair.shared.model.RefundStatusResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

/**
 * ViewModel for Orders screen - matches iOS OrderHistoryViewModel
 * Handles order list, filtering, cancellation, and refund status
 */
@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val apiService: DollorApiService,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "OrdersViewModel"
    }

    // Order filter - matches iOS OrderFilter enum
    enum class OrderFilter {
        ALL, ACTIVE, COMPLETED
    }

    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _selectedFilter = MutableStateFlow(OrderFilter.ALL)
    val selectedFilter: StateFlow<OrderFilter> = _selectedFilter.asStateFlow()

    // Cancel order states
    private val _isCancelling = MutableStateFlow(false)
    val isCancelling: StateFlow<Boolean> = _isCancelling.asStateFlow()

    private val _cancelSuccess = MutableStateFlow(false)
    val cancelSuccess: StateFlow<Boolean> = _cancelSuccess.asStateFlow()

    private val _cancelError = MutableStateFlow<String?>(null)
    val cancelError: StateFlow<String?> = _cancelError.asStateFlow()

    // Refund status cache
    private val _refundStatuses = MutableStateFlow<Map<Int, RefundStatusResponse>>(emptyMap())
    val refundStatuses: StateFlow<Map<Int, RefundStatusResponse>> = _refundStatuses.asStateFlow()

    // Authentication state - exposed to UI for handling token expiration
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _tokenExpired = MutableStateFlow(false)
    val tokenExpired: StateFlow<Boolean> = _tokenExpired.asStateFlow()

    init {
        // Check initial auth state
        _isAuthenticated.value = secureStorage.isCustomerLoggedIn
        fetchOrders()
    }

    /**
     * Handle token expiration - clears auth and notifies UI
     */
    private fun handleTokenExpired() {
        Log.w(TAG, "Token expired - clearing auth and notifying UI")
        secureStorage.clearCustomerAuth()
        _isAuthenticated.value = false
        _tokenExpired.value = true
        _errorMessage.value = "Your session has expired. Please log in again."
    }

    /**
     * Check if an exception indicates token expiration (401 Unauthorized)
     */
    private fun isTokenExpiredError(e: Exception): Boolean {
        return e is HttpException && e.code() == 401
    }

    /**
     * Reset token expired flag (call after navigating to login)
     */
    fun clearTokenExpired() {
        _tokenExpired.value = false
    }

    fun setFilter(filter: OrderFilter) {
        _selectedFilter.value = filter
    }

    fun fetchOrders() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val token = secureStorage.customerToken
                if (token.isNullOrEmpty()) {
                    Log.w(TAG, "No access token available")
                    _orders.value = emptyList()
                    _isAuthenticated.value = false
                    return@launch
                }

                val ordersList = apiService.getCustomerOrders("Bearer $token")
                _orders.value = ordersList.sortedByDescending { it.createdAt }
                _isAuthenticated.value = true
                Log.d(TAG, "Fetched ${ordersList.size} orders")
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching orders", e)
                if (isTokenExpiredError(e)) {
                    handleTokenExpired()
                } else {
                    _errorMessage.value = e.message ?: "Failed to load orders"
                }
                _orders.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Get filtered orders based on selected filter
     */
    fun getFilteredOrders(): List<Order> {
        val allOrders = _orders.value
        return when (_selectedFilter.value) {
            OrderFilter.ALL -> allOrders
            OrderFilter.ACTIVE -> allOrders.filter { isActiveOrder(it.status) }
            OrderFilter.COMPLETED -> allOrders.filter { isCompletedOrder(it.status) }
        }
    }

    /**
     * Check if order status is active (can be tracked)
     * Uses backend snake_case status values
     */
    fun isActiveOrder(status: String): Boolean {
        return status.lowercase() in listOf(
            "pending_payment",
            "confirmed",
            "pending_restaurant",
            "pending_modification",
            "preparing",
            "ready_for_pickup",
            "out_for_delivery",
            "picked_up"
        )
    }

    /**
     * Check if order status is completed (delivered, cancelled, or failed)
     * Uses backend snake_case status values
     */
    fun isCompletedOrder(status: String): Boolean {
        return status.lowercase() in listOf(
            "delivered",
            "cancelled",
            "declined_by_restaurant",
            "restaurant_timeout"
        )
    }

    /**
     * Check if order can be cancelled
     * Only early statuses before restaurant accepts
     */
    fun canCancelOrder(order: Order): Boolean {
        return order.status.lowercase() in listOf(
            "pending_payment",
            "confirmed",
            "pending_restaurant",
            "pending_modification"
        )
    }

    /**
     * Cancel an order
     */
    fun cancelOrder(order: Order, reason: String = "Customer requested cancellation") {
        viewModelScope.launch {
            _isCancelling.value = true
            _cancelError.value = null

            try {
                val token = secureStorage.customerToken
                if (token.isNullOrEmpty()) {
                    Log.w(TAG, "No access token available for cancel")
                    _cancelError.value = "Please log in to cancel orders"
                    return@launch
                }

                val request = CancelOrderRequest(reason = reason)
                apiService.cancelOrder(order.id, request, "Bearer $token")
                _cancelSuccess.value = true
                // Refresh orders after cancellation
                fetchOrders()
                Log.d(TAG, "Order ${order.id} cancelled successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Error cancelling order", e)
                if (isTokenExpiredError(e)) {
                    handleTokenExpired()
                } else {
                    _cancelError.value = e.message ?: "Failed to cancel order"
                }
            } finally {
                _isCancelling.value = false
            }
        }
    }

    /**
     * Fetch refund status for a cancelled order
     * Checks for all refundable statuses (backend returns lowercase snake_case)
     */
    fun fetchRefundStatus(order: Order) {
        val refundableStatuses = listOf("cancelled", "declined_by_restaurant", "restaurant_timeout")
        if (order.status.lowercase() !in refundableStatuses) return

        viewModelScope.launch {
            try {
                val token = secureStorage.customerToken
                if (token.isNullOrEmpty()) {
                    Log.w(TAG, "No access token available for refund status")
                    return@launch
                }

                val status = apiService.getRefundStatus(order.id, "Bearer $token")
                _refundStatuses.value = _refundStatuses.value + (order.id to status)
                Log.d(TAG, "Fetched refund status for order ${order.id}")
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching refund status", e)
                if (isTokenExpiredError(e)) {
                    handleTokenExpired()
                }
                // Don't show error for refund status - it's a secondary fetch
            }
        }
    }

    fun clearCancelSuccess() {
        _cancelSuccess.value = false
    }

    fun clearError() {
        _errorMessage.value = null
        _cancelError.value = null
    }
}
