package com.eatfair.app.ui.checkout

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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.shared.config.AppConfig

data class RestaurantOrder(
    val restaurantId: Int,
    val restaurantName: String,
    val items: List<OrderItem>,
    val subtotal: Double,
    val deliveryFee: Double,
    val estimatedTime: String
)

data class OrderItem(
    val id: Int,
    val name: String,
    val price: Double,
    val quantity: Int,
    val customizations: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MultiRestaurantCheckoutScreen(
    orders: List<RestaurantOrder>,
    deliveryAddress: String,
    onBackClick: () -> Unit,
    onPlaceOrder: () -> Unit,
    onEditOrder: (Int) -> Unit
) {
    var selectedTipPercent by remember { mutableStateOf(15) }
    var promoCode by remember { mutableStateOf("") }
    var promoApplied by remember { mutableStateOf(false) }

    // Calculate totals
    val subtotal = orders.sumOf { it.subtotal }
    val deliveryFees = orders.sumOf { it.deliveryFee }
    val platformFee = AppConfig.TieredPricing.calculateCustomerFee(subtotal)
    val tipAmount = subtotal * (selectedTipPercent / 100.0)
    val taxRate = 0.0875
    val tax = subtotal * taxRate
    val discount = if (promoApplied) minOf(subtotal * 0.15, 10.0) else 0.0
    val total = subtotal + deliveryFees + platformFee + tipAmount + tax - discount

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Multi-Restaurant Order", fontWeight = FontWeight.Bold)
                        Text(
                            "${orders.size} restaurants",
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
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF6C63FF),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // Delivery Info
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFF6C63FF),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Deliver to",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                            Text(
                                text = deliveryAddress,
                                fontWeight = FontWeight.Medium,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        TextButton(onClick = { /* Change address */ }) {
                            Text("Change", color = Color(0xFF6C63FF))
                        }
                    }
                }
            }

            // Multi-Restaurant Notice
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFFF3E0)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFFFF9800),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Orders from multiple restaurants may arrive at different times",
                            fontSize = 13.sp,
                            color = Color(0xFFE65100)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Restaurant Orders
            items(orders) { order ->
                RestaurantOrderCard(
                    order = order,
                    onEdit = { onEditOrder(order.restaurantId) }
                )
            }

            // Promo Code
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocalOffer,
                            contentDescription = null,
                            tint = Color(0xFF6C63FF)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        OutlinedTextField(
                            value = promoCode,
                            onValueChange = { promoCode = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("Promo code") },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                unfocusedBorderColor = Color.Transparent,
                                focusedBorderColor = Color.Transparent
                            )
                        )
                        Button(
                            onClick = { promoApplied = promoCode.isNotEmpty() },
                            enabled = promoCode.isNotEmpty() && !promoApplied,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF6C63FF)
                            )
                        ) {
                            Text(if (promoApplied) "Applied" else "Apply")
                        }
                    }
                }
            }

            // Tip Selection
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Driver Tip",
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "100% goes to your drivers",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(0, 10, 15, 20, 25).forEach { percent ->
                                val isSelected = selectedTipPercent == percent
                                Surface(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) Color(0xFF6C63FF) else Color(0xFFF5F5F5),
                                    onClick = { selectedTipPercent = percent }
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 8.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = if (percent == 0) "No tip" else "$percent%",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = if (isSelected) Color.White else Color.Black
                                        )
                                        if (percent > 0) {
                                            Text(
                                                text = "$${String.format("%.2f", subtotal * percent / 100)}",
                                                fontSize = 11.sp,
                                                color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Order Summary
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Order Summary",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        SummaryRow("Subtotal", subtotal)
                        SummaryRow("Delivery (${orders.size} orders)", deliveryFees)
                        SummaryRow("Platform Fee", platformFee)
                        SummaryRow("Driver Tip", tipAmount)
                        SummaryRow("Tax", tax)

                        if (discount > 0) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Discount", color = Color(0xFF4CAF50))
                                Text(
                                    "-$${String.format("%.2f", discount)}",
                                    color = Color(0xFF4CAF50),
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Total",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                            Text(
                                text = "$${String.format("%.2f", total)}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color(0xFF6C63FF)
                            )
                        }
                    }
                }
            }

            // Place Order Button
            item {
                Button(
                    onClick = onPlaceOrder,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 32.dp)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF6C63FF)
                    )
                ) {
                    Text(
                        text = "Place Order • $${String.format("%.2f", total)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }
        }
    }
}

@Composable
fun RestaurantOrderCard(
    order: RestaurantOrder,
    onEdit: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Restaurant Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF6C63FF).copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = order.restaurantName.firstOrNull()?.toString() ?: "R",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF6C63FF)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = order.restaurantName,
                            fontWeight = FontWeight.SemiBold
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = Color.Gray,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = " ${order.estimatedTime}",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }

                TextButton(onClick = onEdit) {
                    Text("Edit", color = Color(0xFF6C63FF))
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

            // Items
            order.items.forEach { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${item.quantity}x",
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF6C63FF)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = item.name,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (item.customizations != null) {
                                Text(
                                    text = item.customizations,
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                    Text(
                        text = "$${String.format("%.2f", item.price * item.quantity)}",
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

            // Subtotals
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Subtotal", color = Color.Gray)
                Text("$${String.format("%.2f", order.subtotal)}")
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Delivery", color = Color.Gray)
                Text("$${String.format("%.2f", order.deliveryFee)}")
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, amount: Double) {
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
