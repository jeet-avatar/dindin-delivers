package com.eatfair.app.ui.restaurant

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBackIos
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.BottomSheetScaffold
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberBottomSheetScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.TextUnitType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.eatfair.app.R
import com.eatfair.shared.model.restaurant.CartItem
import com.eatfair.shared.model.restaurant.MenuItem
import com.eatfair.app.ui.cart.CartViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RestaurantScreen(
    restaurantViewModel: RestaurantViewModel,
    cartViewModel: CartViewModel,
    onBackClick: () -> Unit,
    onViewCart: () -> Unit
) {
    var selectedFilter by remember { mutableStateOf("Highly reordered") }

    val restaurant by restaurantViewModel.selectedRestaurant.collectAsState()
    val menuItems by restaurantViewModel.menuItems.collectAsState()
    val cartItems by cartViewModel.cartItems.collectAsState()

    val scaffoldState = rememberBottomSheetScaffoldState()
    val sheetPeekHeight = 450.dp // Adjust this to your liking

    val itemForCartReplacement by restaurantViewModel.showReplaceCartDialog.collectAsState()

    // --- NEW: Show the confirmation dialog when the state is not null ---
    itemForCartReplacement?.let { itemToAdd ->
        ReplaceCartDialog(
            onConfirm = {
                // Call the ViewModel to perform the replacement.
                restaurantViewModel.replaceCartAndAddItem(itemToAdd, cartViewModel)
                restaurantViewModel.dismissReplaceCartDialog()
            },
            onDismiss = {
                // Just dismiss the dialog.
                restaurantViewModel.dismissReplaceCartDialog()
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight()
        ) {
            AsyncImage(
                model = restaurant?.imageUrl,
                contentDescription = restaurant?.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.2f),
                                Color.Black.copy(alpha = 0.8f)
                            ),
                            startY = 0f,
                            endY = Float.POSITIVE_INFINITY
                        )
                    )
            )
        }

        BottomSheetScaffold(
            scaffoldState = scaffoldState,
            sheetContent = {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        // Give it a max height to allow it to expand, but not infinitely.
                        // This is important to prevent layout errors.
                        .fillMaxHeight(0.85f),
                    contentPadding = PaddingValues(bottom = if (cartItems.isNotEmpty()) 80.dp else 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                            if (restaurant?.isPureVeg == true) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(16.dp)
                                            .background(Color(0xFF2E7D32), CircleShape)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Pure Veg",
                                        fontSize = 13.sp,
                                        color = Color(0xFF2E7D32),
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                            }

                            Text(
                                text = restaurant?.name ?: "",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Black
                            )

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color(0xFF2E7D32)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(
                                            horizontal = 6.dp,
                                            vertical = 3.dp
                                        ),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Star,
                                            contentDescription = "Rating",
                                            tint = Color.White,
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(2.dp))
                                        // Fix: Handle null rating to prevent crash
                                        Text(
                                            text = restaurant?.rating?.toString() ?: "0.0",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                Text(
                                    text = "By ${restaurant?.reviews}",
                                    fontSize = 13.sp,
                                    color = Color.Gray
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = "Distance",
                                    tint = Color.DarkGray,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "${restaurant?.distance} • ${restaurant?.cuisineType}",
                                    fontSize = 13.sp,
                                    color = Color.DarkGray
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Schedule,
                                    contentDescription = "Time",
                                    tint = Color.DarkGray,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "${restaurant?.deliveryTime} • Address....",
                                    fontSize = 13.sp,
                                    color = Color.DarkGray
                                )
                            }
                        }
                    }

                    item {
                        DeliveryInfoBanner()
                    }

                    item {
                        FilterChipsRow(
                            filters = restaurant?.tags ?: emptyList(),
                            selectedFilter = selectedFilter,
                            onFilterSelected = { selectedFilter = it }
                        )
                    }

                    item {
                        Text(
                            text = "Recommended for you",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }

                    // The rest of the menu items
                    items(menuItems) { item ->
                        val cartItem = cartItems.find { it.menuItem.id == item.id }
                        val quantityInCart = cartItem?.quantity ?: 0
                        MenuItemCard(
                            menuItem = item,
                            quantityInCart = quantityInCart,
                            onQuantityChange = { newQty ->

                                if (newQty > quantityInCart) { // This means the '+' button was pressed
                                    restaurantViewModel.handleAddItem(item, cartViewModel)
                                } else {
                                    cartViewModel.updateItemQuantity(item, newQty)
                                }
                            }
                        )
                    }
                }
            },
            sheetPeekHeight = sheetPeekHeight,
            sheetShape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
            sheetContainerColor = Color.White,
            sheetShadowElevation = 8.dp,
            containerColor = Color.Transparent,
        ) {
            // --- This is the background content that stays fixed ---
        }

        IconButton(
            onClick = onBackClick,
            modifier = Modifier
                .align(Alignment.TopStart) // Align to the top-start of the Box
                .padding(16.dp)
                .windowInsetsPadding(WindowInsets.statusBars) // Respect status bar
                .background(
                    color = Color.White.copy(alpha = 0.8f),
                    shape = RoundedCornerShape(8.dp)
                )
                .size(38.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBackIos,
                contentDescription = "Back",
                tint = Color.Black,
                modifier = Modifier
                    .size(20.dp)
                    .padding(start = 4.dp)
            )
        }

        if (cartItems.isNotEmpty()) {
            ViewCartFooter(
                cartItems = cartItems,
                onViewCartClick = onViewCart,
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }

}

@Composable
fun DeliveryInfoBanner() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.6f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = "Delivery",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "100% goes to restaurants & drivers. You only pay \$1 transaction fee.",
                fontSize = 12.sp,
                color = Color.Black,
                fontWeight = FontWeight.Medium,
                lineHeight = TextUnit(value = 14f, type = TextUnitType.Sp)

            )
        }
    }
}

@Composable
fun FilterChipsRow(
    filters: List<String> = emptyList(),
    selectedFilter: String,
    onFilterSelected: (String) -> Unit
) {
//    val filters = listOf("Filters", "Highly reordered", "Spicy", "Healthy")

    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(filters) { filter ->
            FilterChip(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                label = { Text(text = filter, fontSize = 13.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Color.White,
                    selectedContainerColor = MaterialTheme.colorScheme.tertiaryContainer,
                    labelColor = Color.Black,
                    selectedLabelColor = MaterialTheme.colorScheme.tertiary
                ),
            )
        }
    }
}

@Composable
fun MenuItemCard(
    menuItem: MenuItem,
    quantityInCart: Int,
    onQuantityChange: (Int) -> Unit,
) {
    Surface(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 16.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.Top
                ) {
                    Box(
                        modifier = Modifier
                            .offset(y = 4.dp)
                            .size(12.dp)
                            .border(
                                width = 1.dp,
                                color = if (menuItem.isVeg) Color(0xFF2E7D32) else Color(0xFFD32F2F),
                                shape = RoundedCornerShape(4.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .background(
                                    if (menuItem.isVeg) Color(0xFF2E7D32) else Color(0xFFD32F2F),
                                    CircleShape
                                )
                        )
                    }

                    Spacer(modifier = Modifier.width(4.dp))

                    Text(
                        text = menuItem.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black,
                    )
                }

                if (menuItem.isHighlyOrdered) {
                    Text(
                        text = "⭐ Highly reordered",
                        fontSize = 11.sp,
                        color = Color(0xFFF57C00)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "$ ${menuItem.price.toInt()}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = menuItem.description,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = TextUnit(value = 14f, type = TextUnitType.Sp)
                )

                if (menuItem.isCustomizable) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Customisable",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.tertiary,
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Box(modifier = Modifier.size(120.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFE3F2FD)),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = menuItem.imageUrl,
                        contentDescription = "Profile Image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        error = painterResource(id = R.drawable.ic_fork_knife),
                        placeholder = painterResource(id = R.drawable.ic_fork_knife)
                    )
                }

//                Button(
//                    onClick = onAddClick,
//                    modifier = Modifier
//                        .align(Alignment.BottomCenter)
//                        .offset(y = 8.dp)
//                        .height(36.dp),
//                    colors = ButtonDefaults.buttonColors(
//                        containerColor = Color.White,
//                        contentColor = Color(0xFF2E7D32)
//                    ),
//                    border = BorderStroke(1.dp, Color(0xFF2E7D32)),
//                    shape = RoundedCornerShape(8.dp),
//                    contentPadding = PaddingValues(horizontal = 16.dp)
//                ) {
//                    Text(
//                        text = "ADD",
//                        fontSize = 13.sp,
//                        fontWeight = FontWeight.Bold
//                    )
//                    Spacer(modifier = Modifier.width(4.dp))
//                    Text(text = "+", fontSize = 16.sp, fontWeight = FontWeight.Bold)
//                }

                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .offset(y = 8.dp)
                        .height(36.dp),
                ) {

                    if (quantityInCart == 0) {
                        // If item is not in cart, show the "ADD" button
                        AddButton {
                            onQuantityChange(1) // Set quantity to 1 to add
                        }
                    } else {
                        // If item is in cart, show the +/- stepper
                        QuantityStepper(
                            quantity = quantityInCart,
                            onIncrement = { onQuantityChange(quantityInCart + 1) },
                            onDecrement = { onQuantityChange(quantityInCart - 1) } // Quantity will be 0 to remove
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AddButton(onClick: () -> Unit) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.White,
            contentColor = MaterialTheme.colorScheme.primary
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)),
        contentPadding = PaddingValues(horizontal = 26.dp)
    ) {
        Text("ADD", fontWeight = FontWeight.Bold)
    }
}

@Composable
fun QuantityStepper(
    quantity: Int,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .border(
                BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(8.dp)
            )
            .background(Color.White)
            .padding(horizontal = 8.dp, vertical = 5.dp)
    ) {
        // Decrement Button
        IconButton(onClick = onDecrement, modifier = Modifier.size(24.dp)) {
            Icon(
                painter = painterResource(id = R.drawable.ic_remove), // You'll need to add this drawable
                contentDescription = "Remove",
                tint = MaterialTheme.colorScheme.primary
            )
        }

        // Quantity Text
        Text(
            text = "$quantity",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 8.dp)
        )

        // Increment Button
        IconButton(onClick = onIncrement, modifier = Modifier.size(24.dp)) {
            Icon(
                painter = painterResource(id = R.drawable.ic_add), // You'll need to add this drawable
                contentDescription = "Add",
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun ViewCartFooter(
    cartItems: List<CartItem>,
    onViewCartClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val totalItems = cartItems.sumOf { it.quantity }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onViewCartClick)
            .padding(16.dp)
            .clip(RoundedCornerShape(12.dp)),
        color = Color(0xFF2E7D32),
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color.White.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = totalItems.toString(),
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "items added",
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "View cart",
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = "View cart",
                    tint = Color.White
                )
            }
        }
    }
}

@Composable
fun ReplaceCartDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Replace cart items?") },
        text = { Text("Your cart contains dishes from another restaurant. Would you like to clear the cart and add this item?") },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Replace")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("No")
            }
        }
    )
}