package com.eatfair.partner.ui.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class ActiveDelivery(
    val orderId: String,
    val driverName: String,
    val driverRating: Float,
    val status: DeliveryStatus,
    val customerName: String,
    val customerAddress: String,
    val estimatedArrival: String,
    val items: Int
)

enum class DeliveryStatus {
    PICKING_UP,
    EN_ROUTE,
    ARRIVING
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryMapScreen(
    onBackClick: () -> Unit
) {
    var selectedDelivery by remember { mutableStateOf<ActiveDelivery?>(null) }

    val activeDeliveries = remember {
        listOf(
            ActiveDelivery(
                orderId = "ORD-001",
                driverName = "Michael S.",
                driverRating = 4.9f,
                status = DeliveryStatus.PICKING_UP,
                customerName = "John D.",
                customerAddress = "123 Main St, Apt 4B",
                estimatedArrival = "12 min",
                items = 3
            ),
            ActiveDelivery(
                orderId = "ORD-002",
                driverName = "Sarah L.",
                driverRating = 4.8f,
                status = DeliveryStatus.EN_ROUTE,
                customerName = "Emily R.",
                customerAddress = "456 Oak Ave",
                estimatedArrival = "8 min",
                items = 2
            ),
            ActiveDelivery(
                orderId = "ORD-003",
                driverName = "David K.",
                driverRating = 4.7f,
                status = DeliveryStatus.ARRIVING,
                customerName = "Mike T.",
                customerAddress = "789 Pine Rd",
                estimatedArrival = "2 min",
                items = 5
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Live Deliveries", fontWeight = FontWeight.Bold)
                        Text(
                            "${activeDeliveries.size} active",
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Refresh */ }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Map Placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color(0xFFE8F5E9)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Map,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color(0xFF4CAF50).copy(alpha = 0.5f)
                    )
                    Text(
                        text = "Live Map View",
                        color = Color(0xFF4CAF50).copy(alpha = 0.5f),
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Track all active deliveries in real-time",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }

                // Map Controls
                Column(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FloatingActionButton(
                        onClick = { /* Center on restaurant */ },
                        modifier = Modifier.size(40.dp),
                        containerColor = Color.White
                    ) {
                        Icon(
                            Icons.Default.Store,
                            contentDescription = "Restaurant",
                            tint = Color(0xFFFF5722)
                        )
                    }
                    FloatingActionButton(
                        onClick = { /* Zoom in */ },
                        modifier = Modifier.size(40.dp),
                        containerColor = Color.White
                    ) {
                        Icon(Icons.Default.ZoomIn, contentDescription = "Zoom In", tint = Color.Gray)
                    }
                    FloatingActionButton(
                        onClick = { /* Zoom out */ },
                        modifier = Modifier.size(40.dp),
                        containerColor = Color.White
                    ) {
                        Icon(Icons.Default.ZoomOut, contentDescription = "Zoom Out", tint = Color.Gray)
                    }
                }
            }

            // Active Deliveries List
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Active Deliveries",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        TextButton(onClick = { /* View all */ }) {
                            Text("View All", color = Color(0xFFFF5722))
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    LazyColumn(
                        modifier = Modifier.heightIn(max = 300.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(activeDeliveries) { delivery ->
                            ActiveDeliveryCard(
                                delivery = delivery,
                                isSelected = selectedDelivery == delivery,
                                onClick = { selectedDelivery = delivery }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ActiveDeliveryCard(
    delivery: ActiveDelivery,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFFFBE9E7) else Color(0xFFF5F5F5)
        ),
        border = if (isSelected) {
            ButtonDefaults.outlinedButtonBorder.copy(
                brush = androidx.compose.ui.graphics.SolidColor(Color(0xFFFF5722))
            )
        } else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        when (delivery.status) {
                            DeliveryStatus.PICKING_UP -> Color(0xFFFFA726)
                            DeliveryStatus.EN_ROUTE -> Color(0xFF2196F3)
                            DeliveryStatus.ARRIVING -> Color(0xFF4CAF50)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    when (delivery.status) {
                        DeliveryStatus.PICKING_UP -> Icons.Default.Restaurant
                        DeliveryStatus.EN_ROUTE -> Icons.Default.DeliveryDining
                        DeliveryStatus.ARRIVING -> Icons.Default.CheckCircle
                    },
                    contentDescription = null,
                    tint = Color.White
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = delivery.driverName,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "#${delivery.orderId.takeLast(3)}",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }

                Text(
                    text = when (delivery.status) {
                        DeliveryStatus.PICKING_UP -> "Picking up order"
                        DeliveryStatus.EN_ROUTE -> "On the way to customer"
                        DeliveryStatus.ARRIVING -> "Arriving at destination"
                    },
                    fontSize = 13.sp,
                    color = when (delivery.status) {
                        DeliveryStatus.PICKING_UP -> Color(0xFFFFA726)
                        DeliveryStatus.EN_ROUTE -> Color(0xFF2196F3)
                        DeliveryStatus.ARRIVING -> Color(0xFF4CAF50)
                    }
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${delivery.items} items → ${delivery.customerName}",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = "ETA: ${delivery.estimatedArrival}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFFF5722)
                    )
                }
            }
        }
    }
}
