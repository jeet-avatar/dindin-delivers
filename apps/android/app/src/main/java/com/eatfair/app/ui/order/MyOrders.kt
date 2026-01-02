package com.eatfair.app.ui.order

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.app.ui.common.EFTopAppBar
import com.eatfair.app.ui.theme.DollorTheme
import com.eatfair.shared.model.Order
import java.text.SimpleDateFormat
import java.util.*

/**
 * Orders Screen - Matches iOS OrderHistoryView exactly
 * Features: Filter tabs, Order cards with status, Track, Reorder, Cancel
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyOrdersScreen(
    ordersViewModel: OrdersViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {},
    onCartClick: () -> Unit = {},
    onStartOrderingClick: () -> Unit = {},
    onTrackOrderClick: (Int) -> Unit = {},
    onRestaurantClick: (Int) -> Unit = {},
    onLoginRequired: () -> Unit = {}
) {
    val orders by ordersViewModel.orders.collectAsState()
    val isLoading by ordersViewModel.isLoading.collectAsState()
    val selectedFilter by ordersViewModel.selectedFilter.collectAsState()
    val isCancelling by ordersViewModel.isCancelling.collectAsState()
    val cancelSuccess by ordersViewModel.cancelSuccess.collectAsState()
    val cancelError by ordersViewModel.cancelError.collectAsState()
    val refundStatuses by ordersViewModel.refundStatuses.collectAsState()
    val tokenExpired by ordersViewModel.tokenExpired.collectAsState()

    val filteredOrders = ordersViewModel.getFilteredOrders()

    // Token expired dialog - prompts user to log in again
    if (tokenExpired) {
        AlertDialog(
            onDismissRequest = { /* Don't allow dismiss without action */ },
            title = { Text("Session Expired") },
            text = { Text("Your session has expired. Please log in again to view your orders.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        ordersViewModel.clearTokenExpired()
                        onLoginRequired()
                    }
                ) {
                    Text("Log In", color = DollorTheme.Brand.green)
                }
            }
        )
    }

    // Cancel success dialog
    if (cancelSuccess) {
        AlertDialog(
            onDismissRequest = { ordersViewModel.clearCancelSuccess() },
            title = { Text("Order Cancelled") },
            text = { Text("Your order has been cancelled. A refund will be processed if applicable.") },
            confirmButton = {
                TextButton(onClick = { ordersViewModel.clearCancelSuccess() }) {
                    Text("OK")
                }
            }
        )
    }

    // Cancel error dialog
    cancelError?.let { error ->
        AlertDialog(
            onDismissRequest = { ordersViewModel.clearError() },
            title = { Text("Error") },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { ordersViewModel.clearError() }) {
                    Text("OK")
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DollorTheme.Background.primary)  // iOS uses Theme.brandGrey (F5F5F5)
    ) {
        // Top App Bar
        EFTopAppBar(
            title = "Your Orders",
            showBackButton = true,
            onBackClick = onBackClick,
            actions = {
                IconButton(onClick = onCartClick) {
                    Icon(
                        imageVector = Icons.Filled.ShoppingCart,
                        contentDescription = "Cart",
                        tint = Color.Black
                    )
                }
            }
        )

        // Filter Tabs - matches iOS filter tabs
        FilterTabs(
            selectedFilter = selectedFilter,
            onFilterSelected = { ordersViewModel.setFilter(it) }
        )

        // Content
        Box(modifier = Modifier.fillMaxSize()) {
            when {
                isLoading -> {
                    // Loading state - matches iOS "Loading orders..."
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(color = DollorTheme.Brand.green)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Loading orders...",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }
                filteredOrders.isEmpty() -> {
                    EmptyOrdersState(
                        filter = selectedFilter,
                        onStartOrderingClick = onStartOrderingClick
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(filteredOrders) { order ->
                            OrderCard(
                                order = order,
                                canCancel = ordersViewModel.canCancelOrder(order),
                                isActive = ordersViewModel.isActiveOrder(order.status),
                                refundStatus = refundStatuses[order.id],
                                onTrackClick = { onTrackOrderClick(order.id) },
                                onReorderClick = { onRestaurantClick(order.vendorId) },
                                onCancelClick = { ordersViewModel.cancelOrder(order) },
                                onFetchRefundStatus = { ordersViewModel.fetchRefundStatus(order) }
                            )
                        }
                        item { Spacer(modifier = Modifier.height(80.dp)) }
                    }
                }
            }

            // Cancelling overlay
            if (isCancelling) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f)),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.7f))
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(color = Color.White)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Cancelling order...",
                                color = Color.White,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Filter Tabs - matches iOS filterTabs
 */
@Composable
fun FilterTabs(
    selectedFilter: OrdersViewModel.OrderFilter,
    onFilterSelected: (OrdersViewModel.OrderFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        OrdersViewModel.OrderFilter.values().forEach { filter ->
            val isSelected = selectedFilter == filter
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onFilterSelected(filter) }
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = when (filter) {
                        OrdersViewModel.OrderFilter.ALL -> "All"
                        OrdersViewModel.OrderFilter.ACTIVE -> "Active"
                        OrdersViewModel.OrderFilter.COMPLETED -> "Completed"
                    },
                    fontSize = 14.sp,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (isSelected) DollorTheme.Brand.green else Color.Gray
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.dp)
                        .background(if (isSelected) DollorTheme.Brand.green else Color.Transparent)
                )
            }
        }
    }
}

/**
 * Order Card - matches iOS OrderCard
 */
@Composable
fun OrderCard(
    order: Order,
    canCancel: Boolean,
    isActive: Boolean,
    refundStatus: com.eatfair.shared.model.RefundStatusResponse?,
    onTrackClick: () -> Unit,
    onReorderClick: () -> Unit,
    onCancelClick: () -> Unit,
    onFetchRefundStatus: () -> Unit
) {
    var isExpanded by remember { mutableStateOf(false) }
    var showCancelDialog by remember { mutableStateOf(false) }

    // Cancel confirmation dialog
    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Cancel Order") },
            text = { Text("Are you sure you want to cancel this order? If payment was already processed, a refund will be initiated.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCancelDialog = false
                        onCancelClick()
                    }
                ) {
                    Text("Cancel Order", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) {
                    Text("Keep Order")
                }
            }
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Restaurant icon
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Gray.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Color.Gray
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = order.restaurantName ?: "Restaurant #${order.vendorId}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${order.items?.size ?: 0} items • $${String.format("%.2f", order.totalAmount ?: order.subtotal)}",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }

                // Status Badge
                StatusBadge(status = order.status)
            }

            // Date
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.DateRange,
                    contentDescription = null,
                    tint = Color.Gray,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = formatOrderDate(order.createdAt),
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            // Expandable Details
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    // Order items
                    order.items?.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "${item.quantity}x",
                                fontSize = 13.sp,
                                color = Color.Gray,
                                modifier = Modifier.width(30.dp)
                            )
                            Text(
                                text = item.name,
                                fontSize = 14.sp,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "$${String.format("%.2f", item.price * item.quantity)}",
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    // Order breakdown
                    OrderSummaryRow("Subtotal", order.subtotal)
                    order.deliveryFee?.let { OrderSummaryRow("Delivery", it) }
                    order.platformFee?.let { OrderSummaryRow("Platform Fee", it) }
                    order.taxAmount?.let { OrderSummaryRow("Tax", it) }
                    order.tip?.let { if (it > 0) OrderSummaryRow("Tip", it) }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Total",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = "$${String.format("%.2f", order.totalAmount ?: order.subtotal)}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = DollorTheme.Brand.green
                        )
                    }
                }
            }

            // Refund Status Section (for cancelled/failed orders)
            if (order.status in listOf("cancelled", "declined_by_restaurant", "restaurant_timeout")) {
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DollorTheme.Status.warningBg)
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Outlined.Refresh,
                            contentDescription = null,
                            tint = DollorTheme.Status.warning
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Refund Status",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (refundStatus != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(getRefundStatusColor(refundStatus.refundStatus))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = refundStatus.refundStatus.replaceFirstChar { it.uppercase() },
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = getRefundStatusColor(refundStatus.refundStatus)
                            )
                        }
                        refundStatus.refundAmount?.let { amount ->
                            if (amount > 0) {
                                Text(
                                    text = "Amount: $${String.format("%.2f", amount)}",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Tap to check refund status",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                            TextButton(onClick = onFetchRefundStatus) {
                                Text("Check", color = DollorTheme.Brand.green)
                            }
                        }
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            // Action Buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Details toggle
                TextButton(onClick = { isExpanded = !isExpanded }) {
                    Text(
                        text = if (isExpanded) "Less" else "Details",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Cancel button (for cancellable orders)
                    if (canCancel) {
                        Button(
                            onClick = { showCancelDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Cancel", fontSize = 12.sp)
                        }
                    }

                    // Track button (for active orders)
                    if (isActive) {
                        Button(
                            onClick = onTrackClick,
                            colors = ButtonDefaults.buttonColors(containerColor = DollorTheme.Brand.green),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Track", fontSize = 12.sp)
                        }
                    }

                    // Reorder button (for delivered orders)
                    if (order.status == "delivered") {
                        Button(
                            onClick = onReorderClick,
                            colors = ButtonDefaults.buttonColors(containerColor = DollorTheme.Brand.orange),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Reorder", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

/**
 * Status Badge - matches iOS StatusBadge
 * Uses backend snake_case status values for proper matching
 */
@Composable
fun StatusBadge(status: String) {
    val statusLower = status.lowercase()

    val (backgroundColor, textColor) = when (statusLower) {
        // Payment & Initial stages
        "pending_payment" -> DollorTheme.OrderStatus.placedBg to DollorTheme.OrderStatus.placedText
        "confirmed" -> DollorTheme.OrderStatus.placedBg to DollorTheme.OrderStatus.placedText
        "pending_restaurant" -> DollorTheme.OrderStatus.acceptedBg to DollorTheme.OrderStatus.acceptedText
        "pending_modification" -> DollorTheme.OrderStatus.acceptedBg to DollorTheme.Status.warning

        // Preparation stages
        "preparing" -> DollorTheme.OrderStatus.preparingBg to DollorTheme.OrderStatus.preparingText
        "ready_for_pickup" -> DollorTheme.OrderStatus.readyBg to DollorTheme.OrderStatus.readyText

        // Delivery stages
        "out_for_delivery", "picked_up" -> DollorTheme.OrderStatus.readyBg to DollorTheme.Brand.green

        // Completed
        "delivered" -> DollorTheme.OrderStatus.deliveredBg to DollorTheme.OrderStatus.deliveredText

        // Failed/Cancelled states
        "cancelled" -> DollorTheme.OrderStatus.cancelledBg to DollorTheme.OrderStatus.cancelledText
        "declined_by_restaurant" -> DollorTheme.OrderStatus.cancelledBg to Color.Red
        "restaurant_timeout" -> DollorTheme.OrderStatus.cancelledBg to DollorTheme.Status.warning

        else -> DollorTheme.OrderStatus.defaultBg to DollorTheme.OrderStatus.defaultText
    }

    val displayStatus = when (statusLower) {
        "pending_payment" -> "Pending Payment"
        "confirmed" -> "Order Placed"
        "pending_restaurant" -> "Waiting for Restaurant"
        "pending_modification" -> "Action Required"
        "preparing" -> "Preparing"
        "ready_for_pickup" -> "Ready for Pickup"
        "out_for_delivery" -> "Out for Delivery"
        "picked_up" -> "Picked Up"
        "delivered" -> "Delivered"
        "cancelled" -> "Cancelled"
        "declined_by_restaurant" -> "Restaurant Declined"
        "restaurant_timeout" -> "Restaurant Timeout"
        else -> status.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = backgroundColor
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(textColor)
            )
            Text(
                text = displayStatus,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = textColor
            )
        }
    }
}

/**
 * Order Summary Row
 */
@Composable
fun OrderSummaryRow(label: String, value: Double) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.Gray
        )
        Text(
            text = "$${String.format("%.2f", value)}",
            fontSize = 12.sp,
            color = Color.Gray
        )
    }
}

/**
 * Empty Orders State - matches iOS emptyState exactly
 * Uses bicycle icon for active, clock icon otherwise
 */
@Composable
fun EmptyOrdersState(
    filter: OrdersViewModel.OrderFilter,
    onStartOrderingClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // iOS uses bicycle icon for active, clock for others
        Icon(
            imageVector = if (filter == OrdersViewModel.OrderFilter.ACTIVE)
                Icons.Outlined.DirectionsBike
            else
                Icons.Outlined.Schedule,
            contentDescription = null,
            modifier = Modifier.size(60.dp),
            tint = Color.Gray.copy(alpha = 0.5f)
        )

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = when (filter) {
                OrdersViewModel.OrderFilter.ACTIVE -> "No active orders"
                else -> "No orders yet"
            },
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Black,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = when (filter) {
                OrdersViewModel.OrderFilter.ACTIVE -> "Your active orders will appear here"
                else -> "Start exploring restaurants and place your first order!"
            },
            fontSize = 14.sp,
            color = Color.Gray,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp,
            modifier = Modifier.padding(horizontal = 40.dp)
        )
    }
}

// Helper functions

private fun formatOrderDate(dateString: String?): String {
    if (dateString.isNullOrEmpty()) return "Unknown date"
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MMM d, yyyy 'at' h:mm a", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        date?.let { outputFormat.format(it) } ?: dateString
    } catch (e: Exception) {
        dateString
    }
}

private fun getRefundStatusColor(status: String): Color {
    return when (status.lowercase()) {
        "completed", "refunded" -> DollorTheme.PaymentStatus.completed
        "processing", "pending" -> DollorTheme.PaymentStatus.processing
        "failed", "denied" -> DollorTheme.PaymentStatus.failed
        "initiated" -> DollorTheme.PaymentStatus.initiated
        else -> Color.Gray
    }
}
