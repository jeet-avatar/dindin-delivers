package com.eatfair.app.ui.checkout

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

data class SavedCart(
    val id: String,
    val restaurantId: Int,
    val restaurantName: String,
    val restaurantImage: String?,
    val items: List<SavedCartItem>,
    val subtotal: Double,
    val savedAt: Long,
    val expiresAt: Long?
)

data class SavedCartItem(
    val id: Int,
    val name: String,
    val price: Double,
    val quantity: Int,
    val customizations: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartialOrderScreen(
    onBackClick: () -> Unit,
    onResumeCart: (SavedCart) -> Unit,
    onDeleteCart: (SavedCart) -> Unit
) {
    val dateFormat = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())

    // Sample saved carts - in production, fetch from local storage/API
    val savedCarts = remember {
        mutableStateListOf(
            SavedCart(
                id = "1",
                restaurantId = 1,
                restaurantName = "Bella Italia",
                restaurantImage = null,
                items = listOf(
                    SavedCartItem(1, "Margherita Pizza", 14.99, 1),
                    SavedCartItem(2, "Caesar Salad", 8.99, 1, "No croutons"),
                    SavedCartItem(3, "Tiramisu", 7.99, 2)
                ),
                subtotal = 39.96,
                savedAt = System.currentTimeMillis() - 3600000, // 1 hour ago
                expiresAt = System.currentTimeMillis() + 86400000 // 24 hours
            ),
            SavedCart(
                id = "2",
                restaurantId = 2,
                restaurantName = "Sakura Sushi",
                restaurantImage = null,
                items = listOf(
                    SavedCartItem(4, "Dragon Roll", 16.99, 2),
                    SavedCartItem(5, "Miso Soup", 4.99, 1)
                ),
                subtotal = 38.97,
                savedAt = System.currentTimeMillis() - 7200000, // 2 hours ago
                expiresAt = null
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Saved Carts", fontWeight = FontWeight.Bold) },
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
        if (savedCarts.isEmpty()) {
            EmptySavedCartsView()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Color(0xFFF5F5F5)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "${savedCarts.size} saved cart${if (savedCarts.size != 1) "s" else ""}",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }

                items(savedCarts, key = { it.id }) { cart ->
                    SavedCartCard(
                        cart = cart,
                        dateFormat = dateFormat,
                        onResume = { onResumeCart(cart) },
                        onDelete = {
                            savedCarts.remove(cart)
                            onDeleteCart(cart)
                        }
                    )
                }

                item {
                    // Info Card
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
                                Icons.Default.Info,
                                contentDescription = null,
                                tint = Color(0xFF6C63FF),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "About Saved Carts",
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Carts are automatically saved when you leave checkout. Items and prices may change.",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SavedCartCard(
    cart: SavedCart,
    dateFormat: SimpleDateFormat,
    onResume: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF6C63FF).copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = cart.restaurantName.firstOrNull()?.toString() ?: "R",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF6C63FF)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = cart.restaurantName,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "Saved ${dateFormat.format(Date(cart.savedAt))}",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Delete cart",
                        tint = Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Expiry Warning
            cart.expiresAt?.let { expiresAt ->
                val hoursLeft = ((expiresAt - System.currentTimeMillis()) / 3600000).toInt()
                if (hoursLeft < 24) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFFFF3E0)
                    ) {
                        Row(
                            modifier = Modifier.padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = Color(0xFFFF9800),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Expires in $hoursLeft hours",
                                fontSize = 12.sp,
                                color = Color(0xFFE65100)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }

            // Items Preview
            HorizontalDivider(color = Color(0xFFF0F0F0))
            Spacer(modifier = Modifier.height(12.dp))

            cart.items.take(3).forEach { item ->
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
                            color = Color(0xFF6C63FF),
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = item.name,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text(
                        text = "$${String.format("%.2f", item.price * item.quantity)}",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }
            }

            if (cart.items.size > 3) {
                Text(
                    text = "+${cart.items.size - 3} more item${if (cart.items.size - 3 > 1) "s" else ""}",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF0F0F0))
            Spacer(modifier = Modifier.height(12.dp))

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Subtotal",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = "$${String.format("%.2f", cart.subtotal)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }

                Button(
                    onClick = onResume,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF6C63FF)
                    )
                ) {
                    Icon(
                        Icons.Default.ShoppingCart,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Resume Order")
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Saved Cart?") },
            text = {
                Text("Are you sure you want to delete your saved cart from ${cart.restaurantName}?")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete()
                        showDeleteDialog = false
                    }
                ) {
                    Text("Delete", color = Color(0xFFF44336))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun EmptySavedCartsView() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF5F5F5)),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.ShoppingCart,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = Color.LightGray
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "No saved carts",
                fontSize = 20.sp,
                fontWeight = FontWeight.Medium,
                color = Color.Gray
            )
            Text(
                text = "When you start an order and leave,\nit will be saved here",
                fontSize = 14.sp,
                color = Color.LightGray,
                modifier = Modifier.padding(top = 8.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}
