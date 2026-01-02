package com.eatfair.partner.ui.orders

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.shared.constants.OrderStatus
import com.eatfair.shared.util.OrderNumberFormatter

/**
 * Dollor.ai Restaurant Partner - Orders Dashboard
 * MATCHES iOS: eatffairrestaurant/Views/EnhancedDashboardView.swift OrdersDashboardView
 *
 * Structure:
 * 1. Status bar (busy level, avg prep time)
 * 2. Quick stats bar (New, Preparing, Ready, Today's revenue)
 * 3. Filter tabs (All, New, Preparing, Ready)
 * 4. Orders list with enhanced cards
 */

// Brand Colors - Match iOS RestaurantTheme.swift exactly
private val BrandOrange = Color(0xFFF2994A)      // #F2994A - Primary brand
private val BrandGreen = Color(0xFF06C167)       // #06C167 - Success/Ready
private val BrandBlue = Color(0xFF2196F3)        // #2196F3 - Info/Preparing
private val BrandPurple = Color(0xFF9C27B0)      // #9C27B0 - Revenue
private val BrandRed = Color(0xFFF44336)         // #F44336 - Error/Reject
private val BrandGrey = Color(0xFFF5F5F5)        // #F5F5F5 - Background
private val BrandBlack = Color(0xFF101010)       // #101010 - Text primary
private val CardShadow = Color(0x1A000000)       // Black 10% opacity

enum class OrderFilter(val displayName: String) {
    ALL("All"),
    NEW("New"),
    PREPARING("Preparing"),
    READY("Ready")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    viewModel: OrdersViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {},
    onOrderClick: (Long) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedFilter by remember { mutableStateOf(OrderFilter.ALL) }
    var isOnline by remember { mutableStateOf(true) }

    // Group orders by status
    val newOrders = uiState.orders.filter {
        it.status == OrderStatus.ORDER_PLACED || it.status == OrderStatus.PLACED
    }
    val preparingOrders = uiState.orders.filter { it.status == OrderStatus.PREPARING }
    val readyOrders = uiState.orders.filter { it.status == OrderStatus.READY }

    val filteredOrders = when (selectedFilter) {
        OrderFilter.ALL -> newOrders + preparingOrders + readyOrders
        OrderFilter.NEW -> newOrders
        OrderFilter.PREPARING -> preparingOrders
        OrderFilter.READY -> readyOrders
    }

    // Calculate today's revenue (simplified)
    val todayRevenue = uiState.orders
        .filter { it.status == OrderStatus.DELIVERED }
        .sumOf { it.totalAmount }

    // Use Column instead of Scaffold since this is embedded in MainScreen's tab content
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandGrey)
    ) {
        // Header with title and Online toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(horizontal = 16.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Orders",
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp,
                color = BrandBlack
            )
            // Online/Offline toggle - matches iOS
            Surface(
                onClick = { isOnline = !isOnline },
                shape = RoundedCornerShape(12.dp),
                color = if (isOnline) BrandGreen.copy(alpha = 0.1f) else BrandRed.copy(alpha = 0.1f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (isOnline) BrandGreen else BrandRed)
                    )
                    Text(
                        text = if (isOnline) "Online" else "Offline",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (isOnline) BrandGreen else BrandRed
                    )
                }
            }
        }

        // Status Bar - matches iOS statusBar
        StatusBar(
            busyLevel = if (newOrders.size > 5) "Very Busy" else if (newOrders.size > 2) "Busy" else "Normal",
            avgPrepTime = 15
        )

        // Quick Stats Bar - matches iOS quickStatsBar
        QuickStatsBar(
            newCount = newOrders.size,
            preparingCount = preparingOrders.size,
            readyCount = readyOrders.size,
            todayRevenue = todayRevenue.toInt()
        )

        // Filter Tabs - matches iOS filterTabs
        FilterTabs(
            selectedFilter = selectedFilter,
            onFilterSelected = { selectedFilter = it },
            newCount = newOrders.size,
            preparingCount = preparingOrders.size,
            readyCount = readyOrders.size,
            allCount = newOrders.size + preparingOrders.size + readyOrders.size
        )

        // Orders List
        if (filteredOrders.isEmpty() && !uiState.isLoading) {
            EmptyOrdersView(filter = selectedFilter)
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filteredOrders) { order ->
                    EnhancedOrderCard(
                        order = order,
                        onTap = { onOrderClick(order.id) },
                        onAccept = { viewModel.acceptOrder(order.id) },
                        onReject = { viewModel.rejectOrder(order.id) },
                        onMarkReady = { viewModel.markAsReady(order.id) }
                    )
                }
            }
        }
    }
}

/**
 * Status Bar - matches iOS statusBar
 * Shows busy level indicator and average prep time
 */
@Composable
private fun StatusBar(
    busyLevel: String,
    avgPrepTime: Int
) {
    val busyColor = when (busyLevel) {
        "Very Busy" -> BrandRed
        "Busy" -> BrandOrange
        else -> BrandGreen
    }

    val busyIcon = when (busyLevel) {
        "Very Busy" -> Icons.Default.LocalFireDepartment
        "Busy" -> Icons.Default.TrendingUp
        else -> Icons.Default.CheckCircle
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Busy Level Indicator
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = busyColor.copy(alpha = 0.1f)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = busyIcon,
                    contentDescription = null,
                    tint = busyColor,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = busyLevel,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = busyColor
                )
            }
        }

        // Avg Prep Time
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Schedule,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(14.dp)
            )
            Text(
                text = "~$avgPrepTime min",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Color.Gray
            )
        }
    }
}

/**
 * Quick Stats Bar - matches iOS quickStatsBar
 * Shows: New (orange), Preparing (blue), Ready (green), Today's revenue (purple)
 */
@Composable
private fun QuickStatsBar(
    newCount: Int,
    preparingCount: Int,
    readyCount: Int,
    todayRevenue: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickStatCard(
            title = "New",
            value = "$newCount",
            color = BrandOrange,
            icon = Icons.Default.Notifications,
            modifier = Modifier.weight(1f)
        )
        QuickStatCard(
            title = "Preparing",
            value = "$preparingCount",
            color = BrandBlue,
            icon = Icons.Default.LocalFireDepartment,
            modifier = Modifier.weight(1f)
        )
        QuickStatCard(
            title = "Ready",
            value = "$readyCount",
            color = BrandGreen,
            icon = Icons.Default.ShoppingBag,
            modifier = Modifier.weight(1f)
        )
        QuickStatCard(
            title = "Today",
            value = "$$todayRevenue",
            color = BrandPurple,
            icon = Icons.Default.AttachMoney,
            modifier = Modifier.weight(1f)
        )
    }
}

/**
 * Quick Stat Card - matches iOS QuickStatCard
 */
@Composable
private fun QuickStatCard(
    title: String,
    value: String,
    color: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text = value,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            }
            Text(
                text = title,
                fontSize = 10.sp,
                color = Color.Gray
            )
        }
    }
}

/**
 * Filter Tabs - matches iOS filterTabs
 */
@Composable
private fun FilterTabs(
    selectedFilter: OrderFilter,
    onFilterSelected: (OrderFilter) -> Unit,
    newCount: Int,
    preparingCount: Int,
    readyCount: Int,
    allCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterTab(
            title = "All",
            count = allCount,
            isSelected = selectedFilter == OrderFilter.ALL,
            onClick = { onFilterSelected(OrderFilter.ALL) }
        )
        FilterTab(
            title = "New",
            count = newCount,
            isSelected = selectedFilter == OrderFilter.NEW,
            onClick = { onFilterSelected(OrderFilter.NEW) }
        )
        FilterTab(
            title = "Preparing",
            count = preparingCount,
            isSelected = selectedFilter == OrderFilter.PREPARING,
            onClick = { onFilterSelected(OrderFilter.PREPARING) }
        )
        FilterTab(
            title = "Ready",
            count = readyCount,
            isSelected = selectedFilter == OrderFilter.READY,
            onClick = { onFilterSelected(OrderFilter.READY) }
        )
    }
}

/**
 * Filter Tab - matches iOS FilterTab
 */
@Composable
private fun FilterTab(
    title: String,
    count: Int,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) BrandOrange.copy(alpha = 0.1f) else Color.Transparent
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected) BrandOrange else Color.Gray
            )
            if (count > 0) {
                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (isSelected) BrandOrange else Color.Gray
                ) {
                    Text(
                        text = "$count",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

/**
 * Enhanced Order Card - matches iOS EnhancedOrderCard
 */
@Composable
private fun EnhancedOrderCard(
    order: OrderItem,
    onTap: () -> Unit,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    onMarkReady: () -> Unit
) {
    val statusColor = when (order.status) {
        OrderStatus.ORDER_PLACED, OrderStatus.PLACED -> BrandOrange
        OrderStatus.PREPARING -> BrandBlue
        OrderStatus.READY -> BrandGreen
        OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY -> BrandPurple
        OrderStatus.DELIVERED -> BrandGreen
        OrderStatus.CANCELLED -> BrandRed
        else -> BrandOrange
    }

    val statusIcon = when (order.status) {
        OrderStatus.ORDER_PLACED, OrderStatus.PLACED -> Icons.Default.Notifications
        OrderStatus.PREPARING -> Icons.Default.LocalFireDepartment
        OrderStatus.READY -> Icons.Default.ShoppingBag
        OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY -> Icons.Default.DirectionsBike
        OrderStatus.DELIVERED -> Icons.Default.CheckCircle
        OrderStatus.CANCELLED -> Icons.Default.Cancel
        else -> Icons.Default.Notifications
    }

    val statusDisplayName = when (order.status) {
        OrderStatus.ORDER_PLACED, OrderStatus.PLACED -> "New Order"
        OrderStatus.PREPARING -> "Preparing"
        OrderStatus.READY -> "Ready for Pickup"
        OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY -> "Out for Delivery"
        OrderStatus.DELIVERED -> "Delivered"
        OrderStatus.CANCELLED -> "Cancelled"
        else -> order.status.name.replace("_", " ")
    }

    val isNewOrder = order.status == OrderStatus.ORDER_PLACED || order.status == OrderStatus.PLACED
    val isPreparing = order.status == OrderStatus.PREPARING

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = CardShadow,
                spotColor = CardShadow
            )
            .animateContentSize(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header - matches iOS header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onTap)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Status Badge - matches iOS ZStack with circle
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(statusColor.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = statusIcon,
                        contentDescription = null,
                        tint = statusColor,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Order Info
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = if (order.orderNumber.isNotEmpty())
                                "#${OrderNumberFormatter.getShortDisplay(order.orderNumber).uppercase()}"
                            else
                                "#${order.id}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = BrandBlack
                        )
                        // NEW badge for placed orders
                        if (isNewOrder) {
                            Surface(
                                shape = RoundedCornerShape(50),
                                color = BrandOrange
                            ) {
                                Text(
                                    text = "NEW",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    Text(
                        text = "${order.items.size} items • ${
                            if (order.orderNumber.isNotEmpty())
                                OrderNumberFormatter.formatRelativeTime(order.orderNumber)
                            else
                                order.time
                        }",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }

                // Price and Status
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "$${String.format("%.2f", order.totalAmount)}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandGreen
                    )
                    Text(
                        text = statusDisplayName,
                        fontSize = 12.sp,
                        color = statusColor
                    )
                }
            }

            // Items Preview - only for new or preparing orders (matches iOS)
            if (isNewOrder || isPreparing) {
                HorizontalDivider(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    color = Color(0xFFEEEEEE)
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    order.items.take(3).forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    text = "${item.quantity}x",
                                    fontSize = 12.sp,
                                    color = Color.Gray,
                                    modifier = Modifier.width(24.dp)
                                )
                                Text(
                                    text = item.name,
                                    fontSize = 14.sp,
                                    color = BrandBlack,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            Text(
                                text = "$${String.format("%.2f", item.price * item.quantity)}",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                    if (order.items.size > 3) {
                        Text(
                            text = "+ ${order.items.size - 3} more items",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }
            }

            // Action Buttons - matches iOS
            if (isNewOrder) {
                HorizontalDivider(color = Color(0xFFEEEEEE))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Reject Button
                    Surface(
                        onClick = onReject,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        color = BrandRed.copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                tint = BrandRed,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Reject",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = BrandRed
                            )
                        }
                    }

                    // Accept Button
                    Surface(
                        onClick = onAccept,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        color = BrandGreen
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Accept",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White
                            )
                        }
                    }
                }
            } else if (isPreparing) {
                HorizontalDivider(color = Color(0xFFEEEEEE))

                Surface(
                    onClick = onMarkReady,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(10.dp),
                    color = BrandOrange
                ) {
                    Row(
                        modifier = Modifier.padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Mark Ready for Pickup",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

/**
 * Empty Orders View - matches iOS EmptyOrdersView
 */
@Composable
private fun EmptyOrdersView(filter: OrderFilter) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Inbox,
                contentDescription = null,
                modifier = Modifier.size(50.dp),
                tint = Color.Gray.copy(alpha = 0.5f)
            )
            Text(
                text = "No ${if (filter == OrderFilter.ALL) "" else filter.displayName.lowercase() + " "}orders",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Gray
            )
            Text(
                text = "New orders will appear here automatically",
                fontSize = 14.sp,
                color = Color.Gray.copy(alpha = 0.7f)
            )
        }
    }
}

// Data classes
data class OrderItem(
    val id: Long,
    val customerName: String,
    val customerPhone: String,
    val items: List<OrderMenuItem>,
    val totalAmount: Double,
    val status: OrderStatus,
    val time: String,
    val deliveryAddress: String,
    val orderNumber: String = ""
)

data class OrderMenuItem(
    val name: String,
    val quantity: Int,
    val price: Double
)
