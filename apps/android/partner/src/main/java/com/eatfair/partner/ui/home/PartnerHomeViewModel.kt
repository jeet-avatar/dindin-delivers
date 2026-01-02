package com.eatfair.partner.ui.home

import androidx.lifecycle.ViewModel
import com.eatfair.shared.constants.OrderStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PartnerHomeUiState(
    val todayOrdersCount: Int = 0,
    val todayRevenue: Double = 0.0,
    val pendingOrdersCount: Int = 0,
    val completedOrdersCount: Int = 0,
    val recentOrders: List<PartnerOrderItem> = emptyList()
)

@HiltViewModel
class PartnerHomeViewModel @Inject constructor(
    private val orderRepo: com.eatfair.shared.data.repo.OrderRepo
) : ViewModel() {

    private val _uiState = MutableStateFlow(PartnerHomeUiState())
    val uiState: StateFlow<PartnerHomeUiState> = _uiState.asStateFlow()

    // Track dashboard data job for proper cleanup
    private var dashboardJob: Job? = null

    init {
        loadDashboardData()
    }

    private fun loadDashboardData() {
        dashboardJob?.cancel() // Cancel any existing job
        dashboardJob = viewModelScope.launch {
            try {
                orderRepo.getOrdersForPartner(12).collect { orders ->
                    val todayOrders = orders.size
                    val revenue = orders.sumOf { 45.0 } // Dummy revenue logic
                    val pending = orders.count { order -> order.status == OrderStatus.ORDER_PLACED || order.status == OrderStatus.PREPARING }
                    val completed = orders.count { it.status == OrderStatus.DELIVERED }

                    _uiState.value = PartnerHomeUiState(
                        todayOrdersCount = todayOrders,
                        todayRevenue = revenue,
                        pendingOrdersCount = pending,
                        completedOrdersCount = completed,
                        recentOrders = orders.map { order ->
                            PartnerOrderItem(
                                id = order.orderId?.replace("EF", "")?.toLongOrNull() ?: 0L,
                                customerName = "Customer", // Placeholder as OrderTracking doesn't have customer name yet
                                amount = 45.0,
                                status = order.status
                            )
                        }
                    )
                }
            } catch (e: Exception) {
                // Handle error gracefully - leave UI in current state or set error state
                // For now, just log the error
                android.util.Log.e("PartnerHomeViewModel", "Error loading dashboard data: ${e.message}")
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        // Cancel dashboard job to prevent memory leak
        dashboardJob?.cancel()
        dashboardJob = null
    }
}
