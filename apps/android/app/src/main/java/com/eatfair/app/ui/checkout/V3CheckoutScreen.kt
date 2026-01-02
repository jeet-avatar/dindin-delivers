package com.eatfair.app.ui.checkout

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.shared.config.AppConfig

data class CartItemData(
    val id: Int,
    val name: String,
    val quantity: Int,
    val price: Double,
    val specialInstructions: String? = null
)

data class CheckoutData(
    val items: List<CartItemData>,
    val restaurantName: String,
    val subtotal: Double,
    val deliveryAddress: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun V3CheckoutScreen(
    checkoutData: CheckoutData,
    onBackClick: () -> Unit,
    onPlaceOrder: (tip: Double, promoCode: String?) -> Unit,
    onChangeAddress: () -> Unit,
    onAddPaymentMethod: () -> Unit
) {
    var selectedTipPercent by remember { mutableStateOf(15) }
    var customTip by remember { mutableStateOf("") }
    var promoCode by remember { mutableStateOf("") }
    var isPromoApplied by remember { mutableStateOf(false) }
    var promoDiscount by remember { mutableStateOf(0.0) }
    var showPromoError by remember { mutableStateOf(false) }
    var selectedPaymentMethod by remember { mutableStateOf("card") }
    var showBreakdown by remember { mutableStateOf(false) }

    val tipOptions = listOf(0, 10, 15, 20, 25)

    // Calculate fees using AppConfig tiered pricing
    val subtotal = checkoutData.subtotal
    val platformFee = AppConfig.TieredPricing.calculateCustomerFee(subtotal)
    val tax = subtotal * AppConfig.Tax.DEFAULT_TAX_RATE
    val tipAmount = if (customTip.isNotEmpty()) {
        customTip.toDoubleOrNull() ?: 0.0
    } else {
        subtotal * selectedTipPercent / 100
    }
    val total = subtotal + platformFee + tax + tipAmount - promoDiscount

    // Driver earnings calculation
    val driverBasePay = when {
        subtotal <= AppConfig.TieredPricing.TIER_1_MAX_ORDER -> AppConfig.DriverPay.BASE_PAY_TIER_1
        subtotal <= AppConfig.TieredPricing.TIER_2_MAX_ORDER -> AppConfig.DriverPay.BASE_PAY_TIER_2
        else -> AppConfig.DriverPay.BASE_PAY_TIER_3
    }
    val estimatedMiles = 3.0 // Placeholder
    val driverMileagePay = estimatedMiles * when {
        subtotal <= AppConfig.TieredPricing.TIER_1_MAX_ORDER -> AppConfig.DriverPay.PER_MILE_TIER_1
        subtotal <= AppConfig.TieredPricing.TIER_2_MAX_ORDER -> AppConfig.DriverPay.PER_MILE_TIER_2
        else -> AppConfig.DriverPay.PER_MILE_TIER_3
    }
    val driverTotal = driverBasePay + driverMileagePay + tipAmount

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checkout", fontWeight = FontWeight.Bold) },
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
            // Delivery Address
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
                            .clickable(onClick = onChangeAddress)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFF6C63FF)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Deliver to", fontSize = 12.sp, color = Color.Gray)
                            Text(
                                checkoutData.deliveryAddress,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = Color.Gray
                        )
                    }
                }
            }

            // Order Summary
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                checkoutData.restaurantName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            Text(
                                "${checkoutData.items.size} items",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        checkoutData.items.forEach { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "${item.quantity}x ${item.name}",
                                    fontSize = 14.sp
                                )
                                Text(
                                    "\$${String.format("%.2f", item.price * item.quantity)}",
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }

            // Tip Section
            item {
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Add a tip for your driver",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            "100% of tip goes to your driver",
                            fontSize = 12.sp,
                            color = Color(0xFF4CAF50)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(tipOptions) { percent ->
                                TipChip(
                                    percent = percent,
                                    amount = subtotal * percent / 100,
                                    isSelected = selectedTipPercent == percent && customTip.isEmpty(),
                                    onClick = {
                                        selectedTipPercent = percent
                                        customTip = ""
                                    }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = customTip,
                            onValueChange = { customTip = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Custom tip amount") },
                            prefix = { Text("\$") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
            }

            // Promo Code
            item {
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Promo Code",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = promoCode,
                                onValueChange = {
                                    promoCode = it.uppercase()
                                    showPromoError = false
                                    isPromoApplied = false
                                },
                                modifier = Modifier.weight(1f),
                                placeholder = { Text("Enter code") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                enabled = !isPromoApplied
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Button(
                                onClick = {
                                    // Validate promo code
                                    if (promoCode == "WELCOME50" || promoCode == "FLAT5") {
                                        isPromoApplied = true
                                        promoDiscount = if (promoCode == "FLAT5") 5.0 else subtotal * 0.5
                                        if (promoDiscount > 15.0) promoDiscount = 15.0
                                    } else {
                                        showPromoError = true
                                    }
                                },
                                enabled = promoCode.isNotEmpty() && !isPromoApplied,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF6C63FF)
                                )
                            ) {
                                Text(if (isPromoApplied) "Applied" else "Apply")
                            }
                        }

                        if (showPromoError) {
                            Text(
                                "Invalid promo code",
                                color = Color.Red,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }

                        if (isPromoApplied) {
                            Text(
                                "You saved \$${String.format("%.2f", promoDiscount)}!",
                                color = Color(0xFF4CAF50),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }
            }

            // Payment Method
            item {
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Payment Method",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        PaymentOption(
                            icon = Icons.Default.CreditCard,
                            title = "Credit/Debit Card",
                            subtitle = "•••• 4242",
                            isSelected = selectedPaymentMethod == "card",
                            onClick = { selectedPaymentMethod = "card" }
                        )

                        PaymentOption(
                            icon = Icons.Default.AccountBalance,
                            title = "Google Pay",
                            subtitle = "Fast & secure",
                            isSelected = selectedPaymentMethod == "gpay",
                            onClick = { selectedPaymentMethod = "gpay" }
                        )

                        TextButton(onClick = onAddPaymentMethod) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Payment Method")
                        }
                    }
                }
            }

            // Price Breakdown
            item {
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showBreakdown = !showBreakdown },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Price Breakdown", fontWeight = FontWeight.Bold)
                            Icon(
                                if (showBreakdown) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null
                            )
                        }

                        if (showBreakdown) {
                            Spacer(modifier = Modifier.height(12.dp))

                            PriceRow("Subtotal", subtotal)
                            PriceRow(
                                "Platform Fee",
                                platformFee,
                                subtitle = "Flat \$${platformFee.toInt()} (not 25-35%!)"
                            )
                            PriceRow("Tax", tax)
                            PriceRow("Driver Tip", tipAmount)

                            if (promoDiscount > 0) {
                                PriceRow("Promo Discount", -promoDiscount, isDiscount = true)
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Total", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(
                                    "\$${String.format("%.2f", total)}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp,
                                    color = Color(0xFF6C63FF)
                                )
                            }
                        }
                    }
                }
            }

            // Where Your Money Goes
            item {
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFE8F5E9)
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Where Your Money Goes",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color(0xFF2E7D32)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        MoneyDistributionRow(
                            label = "Restaurant receives",
                            amount = subtotal,
                            color = Color(0xFF4CAF50)
                        )
                        MoneyDistributionRow(
                            label = "Driver receives",
                            amount = driverTotal,
                            color = Color(0xFF2196F3)
                        )
                        MoneyDistributionRow(
                            label = "Platform fee",
                            amount = platformFee,
                            color = Color(0xFF9C27B0)
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            "Unlike other apps charging 25-35%, we charge a flat \$${platformFee.toInt()} fee!",
                            fontSize = 12.sp,
                            color = Color(0xFF388E3C)
                        )
                    }
                }
            }

            // Place Order Button
            item {
                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { onPlaceOrder(tipAmount, if (isPromoApplied) promoCode else null) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF6C63FF)
                    )
                ) {
                    Text(
                        "Place Order • \$${String.format("%.2f", total)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun TipChip(
    percent: Int,
    amount: Double,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = if (isSelected) Color(0xFF6C63FF) else Color(0xFFF5F5F5)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (percent == 0) "None" else "$percent%",
                fontWeight = FontWeight.Bold,
                color = if (isSelected) Color.White else Color.Black
            )
            if (percent > 0) {
                Text(
                    text = "\$${String.format("%.2f", amount)}",
                    fontSize = 11.sp,
                    color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray
                )
            }
        }
    }
}

@Composable
fun PaymentOption(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(
            selected = isSelected,
            onClick = onClick,
            colors = RadioButtonDefaults.colors(
                selectedColor = Color(0xFF6C63FF)
            )
        )
        Icon(icon, contentDescription = null, tint = Color.Gray)
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Medium)
            Text(subtitle, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

@Composable
fun PriceRow(
    label: String,
    amount: Double,
    subtitle: String? = null,
    isDiscount: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(label, fontSize = 14.sp)
            if (subtitle != null) {
                Text(subtitle, fontSize = 11.sp, color = Color(0xFF4CAF50))
            }
        }
        Text(
            text = "${if (isDiscount) "-" else ""}\$${String.format("%.2f", kotlin.math.abs(amount))}",
            fontSize = 14.sp,
            color = if (isDiscount) Color(0xFF4CAF50) else Color.Black
        )
    }
}

@Composable
fun MoneyDistributionRow(
    label: String,
    amount: Double,
    color: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(color)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(label, modifier = Modifier.weight(1f), fontSize = 14.sp)
        Text(
            "\$${String.format("%.2f", amount)}",
            fontWeight = FontWeight.SemiBold,
            color = color
        )
    }
}
