package com.eatfair.partner.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class QuickStat(
    val label: String,
    val value: String,
    val change: String,
    val isPositive: Boolean,
    val icon: ImageVector
)

data class RecentOrder(
    val id: String,
    val customerName: String,
    val items: Int,
    val total: Double,
    val status: String,
    val time: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EnhancedDashboardScreen(
    restaurantName: String,
    isOpen: Boolean,
    onToggleStatus: () -> Unit,
    onMenuClick: () -> Unit,
    onOrdersClick: () -> Unit,
    onAnalyticsClick: () -> Unit,
    onPromotionsClick: () -> Unit,
    onReviewsClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onAIInsightsClick: () -> Unit
) {
    val quickStats = remember {
        listOf(
            QuickStat("Today's Revenue", "$1,247", "+12%", true, Icons.Default.AttachMoney),
            QuickStat("Orders", "45", "+8%", true, Icons.Default.Receipt),
            QuickStat("Avg Rating", "4.8", "+0.2", true, Icons.Default.Star),
            QuickStat("Prep Time", "18m", "-2m", true, Icons.Default.Schedule)
        )
    }

    val recentOrders = remember {
        listOf(
            RecentOrder("001", "John D.", 3, 42.50, "Preparing", "2 min ago"),
            RecentOrder("002", "Sarah M.", 2, 28.99, "Ready", "8 min ago"),
            RecentOrder("003", "Mike T.", 5, 67.50, "Delivered", "15 min ago")
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = restaurantName.firstOrNull()?.toString() ?: "R",
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = restaurantName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(if (isOpen) Color(0xFF4CAF50) else Color(0xFFF44336))
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (isOpen) "Open" else "Closed",
                                    fontSize = 12.sp,
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onSettingsClick) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status Toggle Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isOpen) Color(0xFF4CAF50) else Color(0xFFF44336)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onToggleStatus)
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = if (isOpen) "Restaurant is Open" else "Restaurant is Closed",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color.White
                            )
                            Text(
                                text = if (isOpen) "Tap to pause orders" else "Tap to start accepting orders",
                                fontSize = 13.sp,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                        Switch(
                            checked = isOpen,
                            onCheckedChange = { onToggleStatus() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color.White.copy(alpha = 0.3f),
                                uncheckedThumbColor = Color.White,
                                uncheckedTrackColor = Color.White.copy(alpha = 0.3f)
                            )
                        )
                    }
                }
            }

            // Quick Stats
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(quickStats) { stat ->
                        QuickStatCard(stat = stat)
                    }
                }
            }

            // AI Insights Banner
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onAIInsightsClick),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(Color(0xFF6C63FF), Color(0xFF8B83FF))
                                )
                            )
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Lightbulb,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "3 New AI Insights",
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "View recommendations to boost sales",
                                    fontSize = 12.sp,
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }
                            Icon(
                                Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = Color.White
                            )
                        }
                    }
                }
            }

            // Quick Actions
            item {
                Text(
                    text = "Quick Actions",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickActionCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.MenuBook,
                        title = "Menu",
                        subtitle = "Manage items",
                        color = Color(0xFFFF9800),
                        onClick = onMenuClick
                    )
                    QuickActionCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Receipt,
                        title = "Orders",
                        subtitle = "View active",
                        color = Color(0xFF2196F3),
                        onClick = onOrdersClick
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickActionCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Analytics,
                        title = "Analytics",
                        subtitle = "View reports",
                        color = Color(0xFF4CAF50),
                        onClick = onAnalyticsClick
                    )
                    QuickActionCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.LocalOffer,
                        title = "Promotions",
                        subtitle = "Create deals",
                        color = Color(0xFFE91E63),
                        onClick = onPromotionsClick
                    )
                }
            }

            // Recent Orders
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Orders",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    TextButton(onClick = onOrdersClick) {
                        Text("View All", color = Color(0xFFFF5722))
                    }
                }
            }

            items(recentOrders) { order ->
                RecentOrderCard(order = order)
            }
        }
    }
}

@Composable
fun QuickStatCard(stat: QuickStat) {
    Card(
        modifier = Modifier.width(140.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Icon(
                    stat.icon,
                    contentDescription = null,
                    tint = Color(0xFFFF5722),
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = stat.change,
                    fontSize = 11.sp,
                    color = if (stat.isPositive) Color(0xFF4CAF50) else Color(0xFFF44336)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stat.value,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
            Text(
                text = stat.label,
                fontSize = 12.sp,
                color = Color.Gray
            )
        }
    }
}

@Composable
fun QuickActionCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = Color.Gray
            )
        }
    }
}

@Composable
fun RecentOrderCard(order: RecentOrder) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFFF5722).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = order.customerName.firstOrNull()?.toString() ?: "C",
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFFF5722)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = order.customerName,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${order.items} items • #${order.id}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$${String.format("%.2f", order.total)}",
                    fontWeight = FontWeight.SemiBold
                )
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = when (order.status) {
                        "Preparing" -> Color(0xFFFFA726)
                        "Ready" -> Color(0xFF4CAF50)
                        "Delivered" -> Color(0xFF2196F3)
                        else -> Color.Gray
                    }.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = order.status,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontSize = 11.sp,
                        color = when (order.status) {
                            "Preparing" -> Color(0xFFFFA726)
                            "Ready" -> Color(0xFF4CAF50)
                            "Delivered" -> Color(0xFF2196F3)
                            else -> Color.Gray
                        }
                    )
                }
            }
        }
    }
}
