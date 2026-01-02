package com.eatfair.partner.ui.menu

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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

data class MenuCategory(
    val id: Int,
    val name: String,
    val itemCount: Int
)

data class MenuItem(
    val id: Int,
    val name: String,
    val description: String,
    val price: Double,
    val originalPrice: Double? = null,
    val imageUrl: String?,
    val categoryId: Int,
    val isAvailable: Boolean = true,
    val isPopular: Boolean = false,
    val preparationTime: Int = 15 // minutes
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EnhancedMenuScreen(
    onBackClick: () -> Unit,
    onAddItem: () -> Unit,
    onEditItem: (MenuItem) -> Unit,
    onMarkUnavailable: () -> Unit
) {
    var selectedCategory by remember { mutableStateOf<Int?>(null) }
    var searchQuery by remember { mutableStateOf("") }

    val categories = remember {
        listOf(
            MenuCategory(1, "Appetizers", 8),
            MenuCategory(2, "Main Course", 12),
            MenuCategory(3, "Pizza", 6),
            MenuCategory(4, "Pasta", 5),
            MenuCategory(5, "Desserts", 4),
            MenuCategory(6, "Drinks", 10)
        )
    }

    val menuItems = remember {
        listOf(
            MenuItem(1, "Bruschetta", "Toasted bread with tomatoes, garlic, and basil", 8.99, null, null, 1, true, true),
            MenuItem(2, "Calamari", "Crispy fried squid with marinara sauce", 12.99, null, null, 1),
            MenuItem(3, "Margherita Pizza", "Classic tomato, mozzarella, and basil", 14.99, 16.99, null, 3, true, true),
            MenuItem(4, "Pepperoni Pizza", "Pepperoni with mozzarella cheese", 16.99, null, null, 3),
            MenuItem(5, "Spaghetti Carbonara", "Creamy pasta with bacon and parmesan", 15.99, null, null, 4, true, true),
            MenuItem(6, "Tiramisu", "Classic Italian coffee dessert", 7.99, null, null, 5, true, true),
            MenuItem(7, "Caesar Salad", "Romaine lettuce with caesar dressing", 10.99, null, null, 1, false),
            MenuItem(8, "Chicken Parmesan", "Breaded chicken with marinara and cheese", 18.99, null, null, 2)
        )
    }

    val filteredItems = menuItems.filter { item ->
        (selectedCategory == null || item.categoryId == selectedCategory) &&
        (searchQuery.isEmpty() || item.name.contains(searchQuery, ignoreCase = true))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Menu Management", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onMarkUnavailable) {
                        Icon(Icons.Default.DoNotDisturbOn, contentDescription = "Mark Unavailable")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddItem,
                containerColor = Color(0xFFFF5722),
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add Item")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("Search menu items...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null)
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = Color(0xFFFF5722),
                    unfocusedBorderColor = Color.Transparent
                )
            )

            // Category Filter
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategory == null,
                        onClick = { selectedCategory = null },
                        label = { Text("All") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFFFF5722),
                            selectedLabelColor = Color.White
                        )
                    )
                }
                items(categories) { category ->
                    FilterChip(
                        selected = selectedCategory == category.id,
                        onClick = { selectedCategory = category.id },
                        label = { Text("${category.name} (${category.itemCount})") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFFFF5722),
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Menu Items
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "${filteredItems.size} items",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }

                items(filteredItems) { item ->
                    MenuItemCard(
                        item = item,
                        onEdit = { onEditItem(item) }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}

@Composable
fun MenuItemCard(
    item: MenuItem,
    onEdit: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onEdit),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (item.isAvailable) Color.White else Color.White.copy(alpha = 0.7f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // Item Image
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFF5F5F5)),
                contentAlignment = Alignment.Center
            ) {
                if (item.imageUrl != null) {
                    AsyncImage(
                        model = item.imageUrl,
                        contentDescription = item.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(
                        Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(32.dp)
                    )
                }

                // Unavailable Overlay
                if (!item.isAvailable) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "N/A",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Item Details
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = item.name,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (item.isPopular) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = Color(0xFFFF5722)
                                ) {
                                    Text(
                                        text = "POPULAR",
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                        Text(
                            text = item.description,
                            fontSize = 13.sp,
                            color = Color.Gray,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Price
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "$${String.format("%.2f", item.price)}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color(0xFFFF5722)
                        )
                        if (item.originalPrice != null) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "$${String.format("%.2f", item.originalPrice)}",
                                fontSize = 13.sp,
                                color = Color.Gray,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                    }

                    // Prep time
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            tint = Color.Gray,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = " ${item.preparationTime} min",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    // Toggle Availability
                    IconButton(
                        onClick = { /* Toggle availability */ },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            if (item.isAvailable) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = "Toggle availability",
                            tint = if (item.isAvailable) Color(0xFF4CAF50) else Color.Gray
                        )
                    }

                    // Edit
                    IconButton(
                        onClick = onEdit,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit",
                            tint = Color(0xFFFF5722)
                        )
                    }

                    // Delete
                    IconButton(
                        onClick = { /* Delete */ },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete",
                            tint = Color(0xFFF44336)
                        )
                    }
                }
            }
        }
    }
}
