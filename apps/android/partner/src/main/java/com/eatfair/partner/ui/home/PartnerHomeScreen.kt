package com.eatfair.partner.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.shared.constants.OrderStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartnerHomeScreen(
    viewModel: PartnerHomeViewModel = hiltViewModel(),
    onNavigateToOrders: () -> Unit = {},
    onNavigateToMenu: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToProfile: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Partner Dashboard",
                        fontWeight = FontWeight.Bold
                    ) 
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = onNavigateToNotifications) {
                        Icon(
                            Icons.Default.Notifications,
                            contentDescription = "Notifications",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = "Profile",
                            tint = Color.White
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF5F5F5))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Stats Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        title = "Today's Orders",
                        value = uiState.todayOrdersCount.toString(),
                        icon = Icons.Default.ShoppingCart,
                        color = Color(0xFF4CAF50),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Revenue",
                        value = "$${uiState.todayRevenue}",
                        icon = Icons.Default.AttachMoney,
                        color = Color(0xFF2196F3),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        title = "Pending",
                        value = uiState.pendingOrdersCount.toString(),
                        icon = Icons.Default.Schedule,
                        color = Color(0xFFFF9800),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Completed",
                        value = uiState.completedOrdersCount.toString(),
                        icon = Icons.Default.CheckCircle,
                        color = Color(0xFF9C27B0),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            // Quick Actions
            item {
                Text(
                    "Quick Actions",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickActionCard(
                        title = "View Orders",
                        icon = Icons.Default.List,
                        onClick = onNavigateToOrders,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionCard(
                        title = "Manage Menu",
                        icon = Icons.Default.Restaurant,
                        onClick = onNavigateToMenu,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            // Recent Orders Section
            item {
                Text(
                    "Recent Orders",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            
            if (uiState.recentOrders.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "No recent orders",
                                color = Color.Gray,
                                fontSize = 16.sp
                            )
                        }
                    }
                }
            } else {
                items(uiState.recentOrders) { order ->
                    OrderCard(order = order)
                }
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.height(120.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = color,
                modifier = Modifier.size(32.dp)
            )
            Column {
                Text(
                    text = value,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = title,
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
fun QuickActionCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.height(100.dp),
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Color.White,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White
            )
        }
    }
}

@Composable
fun OrderCard(order: PartnerOrderItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Order #${order.id}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = order.customerName,
                    fontSize = 14.sp,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$${order.amount}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = when (order.status) {
                    OrderStatus.ORDER_PLACED, OrderStatus.PLACED -> com.eatfair.partner.ui.theme.OrderPlacedBg
                    OrderStatus.PREPARING -> com.eatfair.partner.ui.theme.OrderPreparingBg
                    OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PICKED_UP -> com.eatfair.partner.ui.theme.OrderPickedUpBg
                    OrderStatus.READY -> com.eatfair.partner.ui.theme.OrderReadyBg
                    OrderStatus.DELIVERED -> com.eatfair.partner.ui.theme.OrderDeliveredBg
                    OrderStatus.CANCELLED -> com.eatfair.partner.ui.theme.OrderCancelledBg
                    else -> com.eatfair.partner.ui.theme.OrderPlacedBg
                }
            ) {
                Text(
                    text = order.status.name.replace("_", " "),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = when (order.status) {
                        OrderStatus.ORDER_PLACED, OrderStatus.PLACED -> com.eatfair.partner.ui.theme.OrderPlaced
                        OrderStatus.PREPARING -> com.eatfair.partner.ui.theme.OrderPreparing
                        OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PICKED_UP -> com.eatfair.partner.ui.theme.OrderPickedUp
                        OrderStatus.READY -> com.eatfair.partner.ui.theme.OrderReady
                        OrderStatus.DELIVERED -> com.eatfair.partner.ui.theme.OrderDelivered
                        OrderStatus.CANCELLED -> com.eatfair.partner.ui.theme.OrderCancelled
                        else -> com.eatfair.partner.ui.theme.OrderPlaced
                    }
                )
            }
        }
    }
}

data class PartnerOrderItem(
    val id: Long,
    val customerName: String,
    val amount: Double,
    val status: OrderStatus
)
