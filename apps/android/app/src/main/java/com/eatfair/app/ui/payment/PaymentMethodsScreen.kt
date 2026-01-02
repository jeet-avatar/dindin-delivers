package com.eatfair.app.ui.payment

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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

data class PaymentMethod(
    val id: String,
    val type: PaymentType,
    val lastFourDigits: String? = null,
    val brand: String? = null,
    val expiryDate: String? = null,
    val isDefault: Boolean = false,
    val email: String? = null
)

enum class PaymentType {
    CARD,
    GOOGLE_PAY,
    APPLE_PAY,
    PAYPAL,
    CASH
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodsScreen(
    onBackClick: () -> Unit,
    onAddCardClick: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf<PaymentMethod?>(null) }

    // Sample payment methods - in production, fetch from API
    val paymentMethods = remember {
        mutableStateListOf(
            PaymentMethod(
                id = "1",
                type = PaymentType.CARD,
                lastFourDigits = "4242",
                brand = "Visa",
                expiryDate = "12/26",
                isDefault = true
            ),
            PaymentMethod(
                id = "2",
                type = PaymentType.CARD,
                lastFourDigits = "5555",
                brand = "Mastercard",
                expiryDate = "08/25"
            ),
            PaymentMethod(
                id = "3",
                type = PaymentType.GOOGLE_PAY,
                email = "user@gmail.com"
            ),
            PaymentMethod(
                id = "4",
                type = PaymentType.PAYPAL,
                email = "user@email.com"
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment Methods", fontWeight = FontWeight.Bold) },
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
                .background(Color(0xFFF5F5F5)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Add New Payment Method
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onAddCardClick),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF6C63FF).copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = null,
                                tint = Color(0xFF6C63FF)
                            )
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        Column {
                            Text(
                                text = "Add Payment Method",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp
                            )
                            Text(
                                text = "Add a new card or link account",
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                        }

                        Spacer(modifier = Modifier.weight(1f))

                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = Color.Gray
                        )
                    }
                }
            }

            // Saved Cards Section
            item {
                Text(
                    text = "Saved Cards",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            items(paymentMethods.filter { it.type == PaymentType.CARD }) { method ->
                PaymentMethodCard(
                    method = method,
                    onSetDefault = {
                        val index = paymentMethods.indexOf(method)
                        if (index >= 0) {
                            paymentMethods.forEachIndexed { i, m ->
                                paymentMethods[i] = m.copy(isDefault = i == index)
                            }
                        }
                    },
                    onDelete = { showDeleteDialog = method }
                )
            }

            // Other Payment Methods Section
            item {
                Text(
                    text = "Other Payment Methods",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }

            items(paymentMethods.filter { it.type != PaymentType.CARD }) { method ->
                PaymentMethodCard(
                    method = method,
                    onSetDefault = {
                        val index = paymentMethods.indexOf(method)
                        if (index >= 0) {
                            paymentMethods.forEachIndexed { i, m ->
                                paymentMethods[i] = m.copy(isDefault = i == index)
                            }
                        }
                    },
                    onDelete = { showDeleteDialog = method }
                )
            }

            // Cash Option
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF4CAF50).copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.AttachMoney,
                                contentDescription = null,
                                tint = Color(0xFF4CAF50),
                                modifier = Modifier.size(28.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Cash",
                                fontWeight = FontWeight.Medium,
                                fontSize = 16.sp
                            )
                            Text(
                                text = "Pay driver directly",
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                        }

                        Text(
                            text = "Available",
                            fontSize = 12.sp,
                            color = Color(0xFF4CAF50)
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))

                // Security Notice
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFF6C63FF).copy(alpha = 0.05f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Security,
                            contentDescription = null,
                            tint = Color(0xFF6C63FF),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Your payment info is secure",
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "We use industry-standard encryption to protect your data",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (showDeleteDialog != null) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = null },
            title = { Text("Remove Payment Method?") },
            text = {
                Text("Are you sure you want to remove this payment method?")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog?.let { method ->
                            paymentMethods.remove(method)
                        }
                        showDeleteDialog = null
                    }
                ) {
                    Text("Remove", color = Color(0xFFF44336))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun PaymentMethodCard(
    method: PaymentMethod,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = if (method.isDefault) {
            ButtonDefaults.outlinedButtonBorder.copy(
                brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF6C63FF))
            )
        } else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Payment Method Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(getPaymentMethodColor(method.type).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    getPaymentMethodIcon(method.type),
                    contentDescription = null,
                    tint = getPaymentMethodColor(method.type),
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = getPaymentMethodTitle(method),
                        fontWeight = FontWeight.Medium,
                        fontSize = 16.sp
                    )
                    if (method.isDefault) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFF6C63FF)
                        ) {
                            Text(
                                text = "DEFAULT",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
                Text(
                    text = getPaymentMethodSubtitle(method),
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }

            // Actions Menu
            var showMenu by remember { mutableStateOf(false) }

            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(
                        Icons.Default.MoreVert,
                        contentDescription = "More options",
                        tint = Color.Gray
                    )
                }

                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    if (!method.isDefault) {
                        DropdownMenuItem(
                            text = { Text("Set as Default") },
                            onClick = {
                                onSetDefault()
                                showMenu = false
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Check, contentDescription = null)
                            }
                        )
                    }
                    DropdownMenuItem(
                        text = { Text("Remove", color = Color(0xFFF44336)) },
                        onClick = {
                            onDelete()
                            showMenu = false
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = null,
                                tint = Color(0xFFF44336)
                            )
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun getPaymentMethodIcon(type: PaymentType): androidx.compose.ui.graphics.vector.ImageVector {
    return when (type) {
        PaymentType.CARD -> Icons.Default.CreditCard
        PaymentType.GOOGLE_PAY -> Icons.Default.Wallet
        PaymentType.APPLE_PAY -> Icons.Default.PhoneIphone
        PaymentType.PAYPAL -> Icons.Default.AccountBalanceWallet
        PaymentType.CASH -> Icons.Default.AttachMoney
    }
}

fun getPaymentMethodColor(type: PaymentType): Color {
    return when (type) {
        PaymentType.CARD -> Color(0xFF2196F3)
        PaymentType.GOOGLE_PAY -> Color(0xFF4285F4)
        PaymentType.APPLE_PAY -> Color.Black
        PaymentType.PAYPAL -> Color(0xFF003087)
        PaymentType.CASH -> Color(0xFF4CAF50)
    }
}

fun getPaymentMethodTitle(method: PaymentMethod): String {
    return when (method.type) {
        PaymentType.CARD -> "${method.brand} •••• ${method.lastFourDigits}"
        PaymentType.GOOGLE_PAY -> "Google Pay"
        PaymentType.APPLE_PAY -> "Apple Pay"
        PaymentType.PAYPAL -> "PayPal"
        PaymentType.CASH -> "Cash"
    }
}

fun getPaymentMethodSubtitle(method: PaymentMethod): String {
    return when (method.type) {
        PaymentType.CARD -> "Expires ${method.expiryDate}"
        PaymentType.GOOGLE_PAY, PaymentType.PAYPAL -> method.email ?: ""
        PaymentType.APPLE_PAY -> "Linked to your Apple ID"
        PaymentType.CASH -> "Pay driver directly"
    }
}
