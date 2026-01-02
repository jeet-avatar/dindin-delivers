package com.eatfair.partner.ui.orders

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailsScreen(
    orderId: String,
    onBackClick: () -> Unit,
    viewModel: OrderDetailsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order #${orderId.takeLast(6)}") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.error != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = uiState.error ?: "Error loading order",
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadOrder(orderId) }) {
                            Text("Retry")
                        }
                    }
                }
            }
            uiState.order != null -> {
                uiState.order?.let { order ->
                    OrderDetailsContent(
                        order = order,
                        onStatusUpdate = { newStatus ->
                            viewModel.updateOrderStatus(orderId, newStatus)
                        },
                        onAcceptOrder = { viewModel.acceptRestaurantOrder(orderId) },
                        onDeclineOrder = { viewModel.declineRestaurantOrder(orderId) },
                        onAcceptDelivery = { viewModel.acceptDelivery(orderId) },
                        onDeclineDelivery = { viewModel.declineDelivery(orderId) },
                        modifier = Modifier.padding(padding)
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderDetailsContent(
    order: OrderDetails,
    onStatusUpdate: (String) -> Unit,
    onAcceptOrder: () -> Unit = {},
    onDeclineOrder: () -> Unit = {},
    onAcceptDelivery: () -> Unit = {},
    onDeclineDelivery: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Order Status Card
        item {
            OrderStatusCard(
                status = order.status,
                onStatusUpdate = onStatusUpdate,
                onAcceptOrder = onAcceptOrder,
                onDeclineOrder = onDeclineOrder,
                onAcceptDelivery = onAcceptDelivery,
                onDeclineDelivery = onDeclineDelivery
            )
        }

        // Customer Info Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Customer",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(order.customerName)
                    }

                    if (order.customerPhone.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Phone,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(order.customerPhone)
                        }
                    }

                    if (order.deliveryAddress.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Place,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = order.deliveryAddress,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }

        // Order Items Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Order Items",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }

        // Items list
        items(order.items) { item ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("${item.quantity}x ${item.name}")
                Text("$${String.format("%.2f", item.price * item.quantity)}")
            }
        }

        // Pricing Summary
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Order Summary",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    PriceRow("Subtotal", order.subtotal)
                    PriceRow("Delivery Fee", order.deliveryFee)
                    PriceRow("Service Fee", order.serviceFee)
                    PriceRow("Tax", order.tax)

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Total", fontWeight = FontWeight.Bold)
                        Text(
                            "$${String.format("%.2f", order.total)}",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderStatusCard(
    status: String,
    onStatusUpdate: (String) -> Unit,
    onAcceptOrder: () -> Unit = {},
    onDeclineOrder: () -> Unit = {},
    onAcceptDelivery: () -> Unit = {},
    onDeclineDelivery: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = getStatusColor(status).copy(alpha = 0.1f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Status",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = formatStatus(status),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = getStatusColor(status)
                    )
                }
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = getStatusColor(status),
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Status action buttons - supports new order workflow
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                when (status.lowercase()) {
                    // New order waiting for restaurant acceptance (3-min window)
                    "pending_restaurant" -> {
                        Button(
                            onClick = onAcceptOrder,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Text("Accept Order")
                        }
                        Button(
                            onClick = onDeclineOrder,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFF44336)
                            )
                        ) {
                            Text("Decline Order")
                        }
                    }
                    // Order confirmed, start preparing
                    "confirmed", "accepted" -> {
                        Button(
                            onClick = { onStatusUpdate("preparing") },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Start Preparing")
                        }
                    }
                    // Preparing - mark as ready (triggers delivery decision)
                    "preparing" -> {
                        Button(
                            onClick = { onStatusUpdate("ready_for_pickup") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF9800)
                            )
                        ) {
                            Text("Mark Ready for Pickup")
                        }
                    }
                    // Delivery decision window (3-min) - self-deliver or send to drivers
                    "pending_delivery_decision" -> {
                        Button(
                            onClick = onAcceptDelivery,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Text("I'll Deliver (Self-Deliver)")
                        }
                        Button(
                            onClick = onDeclineDelivery,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2196F3)
                            )
                        ) {
                            Text("Send to Driver Pool")
                        }
                    }
                    // Restaurant is self-delivering
                    "restaurant_will_deliver" -> {
                        Button(
                            onClick = { onStatusUpdate("out_for_delivery") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF9C27B0)
                            )
                        ) {
                            Text("Start Delivery")
                        }
                    }
                    // Out for delivery - mark as delivered
                    "out_for_delivery" -> {
                        Button(
                            onClick = { onStatusUpdate("delivered") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Text("Mark as Delivered")
                        }
                    }
                    // Ready for pickup - waiting for driver
                    "ready", "ready_for_pickup" -> {
                        Text(
                            text = "Waiting for driver pickup",
                            color = Color.Gray,
                            fontSize = 14.sp
                        )
                    }
                    // Delivered
                    "delivered" -> {
                        Text(
                            text = "Order completed!",
                            color = Color(0xFF4CAF50),
                            fontSize = 14.sp
                        )
                    }
                    // Cancelled/Declined
                    "cancelled", "declined_by_restaurant", "restaurant_timeout" -> {
                        Text(
                            text = "Order cancelled/declined",
                            color = Color(0xFFF44336),
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PriceRow(label: String, amount: Double) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Color.Gray)
        Text("$${String.format("%.2f", amount)}")
    }
}

private fun getStatusColor(status: String): Color {
    return when (status.lowercase()) {
        "pending_restaurant" -> Color(0xFFFFC107) // Amber/Gold
        "confirmed" -> Color(0xFF2196F3) // Blue
        "accepted" -> Color(0xFF4CAF50) // Green
        "preparing" -> Color(0xFFFF9800) // Orange
        "ready", "ready_for_pickup" -> Color(0xFF673AB7) // Deep Purple
        "pending_delivery_decision" -> Color(0xFFE91E63) // Pink/Magenta
        "restaurant_will_deliver" -> Color(0xFF8BC34A) // Light Green
        "out_for_delivery" -> Color(0xFF9C27B0) // Purple
        "picked_up" -> Color(0xFF00BCD4) // Cyan
        "delivered" -> Color(0xFF4CAF50) // Green
        "cancelled", "declined_by_restaurant", "restaurant_timeout", "delivery_decision_timeout" -> Color(0xFFF44336) // Red
        else -> Color.Gray
    }
}

private fun formatStatus(status: String): String {
    return when (status.lowercase()) {
        "pending_restaurant" -> "New Order - Accept?"
        "confirmed" -> "Order Confirmed"
        "accepted" -> "Accepted"
        "preparing" -> "Preparing"
        "ready", "ready_for_pickup" -> "Ready for Pickup"
        "pending_delivery_decision" -> "Delivery Decision"
        "restaurant_will_deliver" -> "You're Delivering"
        "out_for_delivery" -> "Out for Delivery"
        "picked_up" -> "Picked Up"
        "delivered" -> "Delivered"
        "cancelled" -> "Cancelled"
        "declined_by_restaurant" -> "Declined"
        "restaurant_timeout" -> "Timed Out"
        "delivery_decision_timeout" -> "Sent to Drivers"
        else -> status.replace("_", " ").replaceFirstChar { it.uppercase() }
    }
}

// Data classes
data class OrderDetails(
    val orderId: String,
    val customerName: String,
    val customerPhone: String,
    val deliveryAddress: String,
    val items: List<OrderDetailItem>,
    val subtotal: Double,
    val deliveryFee: Double,
    val serviceFee: Double,
    val tax: Double,
    val total: Double,
    val status: String
)

data class OrderDetailItem(
    val name: String,
    val quantity: Int,
    val price: Double
)

// ViewModel
data class OrderDetailsUiState(
    val order: OrderDetails? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

/**
 * OrderDetailsViewModel - P2P Backend Only (No Firebase)
 *
 * All order data comes from the Dollor.ai production API.
 * No Firestore dependency - uses only DollorRepository.
 */
@HiltViewModel
class OrderDetailsViewModel @Inject constructor(
    private val dollorRepository: DollorRepository
) : ViewModel() {

    companion object {
        private const val TAG = "OrderDetailsViewModel"
    }

    private val _uiState = MutableStateFlow(OrderDetailsUiState())
    val uiState: StateFlow<OrderDetailsUiState> = _uiState.asStateFlow()

    /**
     * Load order details from P2P backend API
     */
    fun loadOrder(orderId: String) {
        viewModelScope.launch {
            _uiState.value = OrderDetailsUiState(isLoading = true)

            try {
                // Extract numeric order ID if it has prefix
                val numericId = orderId.replace("EF-", "").replace("EF", "")
                    .replace("-", "").toIntOrNull() ?: orderId.toIntOrNull()

                if (numericId == null) {
                    _uiState.value = OrderDetailsUiState(error = "Invalid order ID format")
                    return@launch
                }

                // Fetch order from API
                dollorRepository.getOrderDetails(numericId).fold(
                    onSuccess = { apiOrder ->
                        // Calculate subtotal from items
                        val itemsSubtotal = apiOrder.items?.sumOf {
                            (it.price ?: 0.0) * (it.quantity ?: 1)
                        } ?: 0.0

                        val order = OrderDetails(
                            orderId = orderId,
                            customerName = apiOrder.customerName ?: "Customer",
                            customerPhone = apiOrder.customerPhone ?: "",
                            deliveryAddress = apiOrder.deliveryAddress ?: "Pickup",
                            items = apiOrder.items?.map { item ->
                                OrderDetailItem(
                                    name = item.name ?: "Item",
                                    quantity = item.quantity ?: 1,
                                    price = item.price ?: 0.0
                                )
                            } ?: emptyList(),
                            subtotal = itemsSubtotal,
                            deliveryFee = 0.0, // Vendor doesn't see fee breakdown
                            serviceFee = 0.0,
                            tax = 0.0,
                            total = apiOrder.totalAmount,
                            status = apiOrder.status ?: "placed"
                        )
                        _uiState.value = OrderDetailsUiState(order = order)
                        Log.d(TAG, "Loaded order from API: $orderId")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to load order from API: ${error.message}")
                        _uiState.value = OrderDetailsUiState(
                            error = "Failed to load order: ${error.message}"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load order: ${e.message}")
                _uiState.value = OrderDetailsUiState(error = "Failed to load order: ${e.message}")
            }
        }
    }

    /**
     * Update order status via P2P backend API
     */
    fun updateOrderStatus(orderId: String, newStatus: String) {
        viewModelScope.launch {
            try {
                // Extract numeric order ID
                val numericId = orderId.replace("EF-", "").replace("EF", "")
                    .replace("-", "").toIntOrNull() ?: orderId.toIntOrNull()

                if (numericId == null) {
                    _uiState.value = _uiState.value.copy(
                        error = "Invalid order ID format"
                    )
                    return@launch
                }

                // Map UI status to backend status values (matches iOS + verified production API)
                val backendStatus = when (newStatus.lowercase()) {
                    "accepted", "confirmed" -> "confirmed"
                    "preparing" -> "preparing"
                    "ready", "ready_for_pickup" -> "ready_for_pickup"
                    "out_for_delivery" -> "out_for_delivery"
                    "delivered" -> "delivered"
                    "cancelled" -> "cancelled"
                    else -> null
                }

                if (backendStatus == null) {
                    // For other statuses, update local state only
                    _uiState.value = _uiState.value.copy(
                        order = _uiState.value.order?.copy(status = newStatus)
                    )
                    return@launch
                }

                // Use unified updateOrderStatus method - matches iOS and production API
                val result = dollorRepository.updateOrderStatus(numericId, backendStatus)

                result.fold(
                    onSuccess = {
                        // Update local state on success
                        _uiState.value = _uiState.value.copy(
                            order = _uiState.value.order?.copy(status = newStatus)
                        )
                        Log.d(TAG, "Updated order $orderId status to $newStatus via API")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to update status: ${error.message}")
                        _uiState.value = _uiState.value.copy(
                            error = "Failed to update status: ${error.message}"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update status: ${e.message}")
                _uiState.value = _uiState.value.copy(
                    error = "Failed to update status: ${e.message ?: "Unknown error"}"
                )
            }
        }
    }

    // ==========================================
    // RESTAURANT ACCEPTANCE FLOW (3-minute window)
    // ==========================================

    /**
     * Restaurant accepts an order within 3-minute window
     */
    fun acceptRestaurantOrder(orderId: String) {
        viewModelScope.launch {
            try {
                val numericId = extractOrderId(orderId) ?: return@launch

                dollorRepository.restaurantAcceptOrder(numericId).fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            order = _uiState.value.order?.copy(status = "preparing")
                        )
                        Log.d(TAG, "Restaurant accepted order $orderId")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to accept order: ${error.message}")
                        _uiState.value = _uiState.value.copy(
                            error = "Failed to accept order: ${error.message}"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to accept order: ${e.message}")
                _uiState.value = _uiState.value.copy(
                    error = "Failed to accept order: ${e.message ?: "Unknown error"}"
                )
            }
        }
    }

    /**
     * Restaurant declines an order within 3-minute window
     */
    fun declineRestaurantOrder(orderId: String, reason: String = "Restaurant unavailable") {
        viewModelScope.launch {
            try {
                val numericId = extractOrderId(orderId) ?: return@launch

                dollorRepository.restaurantDeclineOrder(numericId, reason).fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            order = _uiState.value.order?.copy(status = "declined_by_restaurant")
                        )
                        Log.d(TAG, "Restaurant declined order $orderId")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to decline order: ${error.message}")
                        _uiState.value = _uiState.value.copy(
                            error = "Failed to decline order: ${error.message}"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to decline order: ${e.message}")
                _uiState.value = _uiState.value.copy(
                    error = "Failed to decline order: ${e.message ?: "Unknown error"}"
                )
            }
        }
    }

    // ==========================================
    // DELIVERY DECISION FLOW (3-minute window)
    // ==========================================

    /**
     * Restaurant accepts delivery (will self-deliver)
     */
    fun acceptDelivery(orderId: String) {
        viewModelScope.launch {
            try {
                val numericId = extractOrderId(orderId) ?: return@launch

                dollorRepository.restaurantAcceptDelivery(numericId).fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            order = _uiState.value.order?.copy(status = "restaurant_will_deliver")
                        )
                        Log.d(TAG, "Restaurant will self-deliver order $orderId")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to accept delivery: ${error.message}")
                        _uiState.value = _uiState.value.copy(
                            error = "Failed to accept delivery: ${error.message}"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to accept delivery: ${e.message}")
                _uiState.value = _uiState.value.copy(
                    error = "Failed to accept delivery: ${e.message ?: "Unknown error"}"
                )
            }
        }
    }

    /**
     * Restaurant declines delivery (send to driver pool)
     */
    fun declineDelivery(orderId: String) {
        viewModelScope.launch {
            try {
                val numericId = extractOrderId(orderId) ?: return@launch

                dollorRepository.restaurantDeclineDelivery(numericId).fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            order = _uiState.value.order?.copy(status = "ready_for_pickup")
                        )
                        Log.d(TAG, "Order $orderId sent to driver pool")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to send to driver pool: ${error.message}")
                        _uiState.value = _uiState.value.copy(
                            error = "Failed to send to driver pool: ${error.message}"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send to driver pool: ${e.message}")
                _uiState.value = _uiState.value.copy(
                    error = "Failed to send to driver pool: ${e.message ?: "Unknown error"}"
                )
            }
        }
    }

    private fun extractOrderId(orderId: String): Int? {
        val numericId = orderId.replace("EF-", "").replace("EF", "")
            .replace("-", "").toIntOrNull() ?: orderId.toIntOrNull()

        if (numericId == null) {
            _uiState.value = _uiState.value.copy(error = "Invalid order ID format")
        }
        return numericId
    }

    override fun onCleared() {
        super.onCleared()
        Log.d(TAG, "OrderDetailsViewModel cleared")
    }
}
