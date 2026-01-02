package com.eatfair.partner.ui.menu

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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage

/**
 * Dollor.ai Restaurant Partner - Menu Management Screen
 * MATCHES iOS: eatffairrestaurant/Views/EnhancedMenuView.swift
 *
 * Structure:
 * 1. Header with title and Add button
 * 2. Quick Stats Bar (Total Items, Available, Out of Stock, Categories)
 * 3. Search Bar
 * 4. Category Tabs (horizontal scroll)
 * 5. Menu Items List with cards
 */

// Brand Colors - Match iOS RestaurantTheme.swift exactly
private val BrandOrange = Color(0xFFF2994A)      // #F2994A - Primary brand
private val BrandGreen = Color(0xFF06C167)       // #06C167 - Success/Available
private val BrandBlue = Color(0xFF2196F3)        // #2196F3 - Info/Total
private val BrandPurple = Color(0xFF9C27B0)      // #9C27B0 - Categories
private val BrandRed = Color(0xFFF44336)         // #F44336 - Error/Out of Stock
private val BrandGrey = Color(0xFFF5F5F5)        // #F5F5F5 - Background
private val BrandBlack = Color(0xFF101010)       // #101010 - Text primary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(
    viewModel: MenuViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<MenuItemData?>(null) }
    var searchText by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }

    // Calculate stats
    val totalItems = uiState.menuItems.size
    val availableCount = uiState.menuItems.count { it.isAvailable }
    val outOfStockCount = uiState.menuItems.count { !it.isAvailable }
    val categories = uiState.menuItems.map { it.category }.distinct().sorted()

    // Filter items
    val filteredItems = uiState.menuItems.filter { item ->
        val matchesCategory = selectedCategory == null || item.category == selectedCategory
        val matchesSearch = searchText.isEmpty() ||
                item.name.contains(searchText, ignoreCase = true) ||
                item.description.contains(searchText, ignoreCase = true)
        matchesCategory && matchesSearch
    }

    // Use Column instead of Scaffold since this is embedded in MainScreen's tab content
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandGrey)
    ) {
        // Header with title and Add button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(horizontal = 16.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Menu",
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp,
                color = BrandBlack
            )
            // Add button - matches iOS plus.circle.fill
            Surface(
                onClick = { showAddDialog = true },
                shape = CircleShape,
                color = Color.Transparent
            ) {
                Icon(
                    imageVector = Icons.Default.AddCircle,
                    contentDescription = "Add Item",
                    tint = BrandOrange,
                    modifier = Modifier.size(32.dp)
                )
            }
        }

        // Quick Stats Bar - matches iOS menuStatsBar
        MenuStatsBar(
            totalItems = totalItems,
            availableCount = availableCount,
            outOfStockCount = outOfStockCount,
            categoriesCount = categories.size
        )

        // Search Bar - matches iOS searchBar
        SearchBar(
            searchText = searchText,
            onSearchChange = { searchText = it }
        )

        // Category Tabs - matches iOS categoryTabs
        CategoryTabs(
            categories = categories,
            selectedCategory = selectedCategory,
            onCategorySelected = { selectedCategory = it },
            itemCounts = uiState.menuItems.groupBy { it.category }.mapValues { it.value.size },
            totalCount = totalItems
        )

        // Menu Items List
        if (filteredItems.isEmpty() && !uiState.isLoading) {
            EmptyMenuView()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // AI Suggestion Banner (if applicable)
                if (outOfStockCount > totalItems / 3 && totalItems > 0) {
                    item {
                        MenuSuggestionBanner(
                            suggestion = "Many items are unavailable. Consider restocking or updating your menu."
                        )
                    }
                } else if (categories.size == 1 && totalItems > 0) {
                    item {
                        MenuSuggestionBanner(
                            suggestion = "Adding more categories can help customers find items faster."
                        )
                    }
                } else if (totalItems in 1..9) {
                    item {
                        MenuSuggestionBanner(
                            suggestion = "Adding more variety to your menu can increase order values."
                        )
                    }
                }

                items(filteredItems) { item ->
                    EnhancedMenuItemCard(
                        item = item,
                        onToggleAvailability = { viewModel.toggleAvailability(item.id) },
                        onEdit = { editingItem = item },
                        onDelete = { viewModel.deleteItem(item.id) }
                    )
                }

                // Bottom padding for scrolling
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }

    // Add/Edit Dialog
    if (showAddDialog) {
        AddEditMenuItemDialog(
            item = null,
            onDismiss = { showAddDialog = false },
            onSave = { name, description, price, category ->
                viewModel.addMenuItem(name, description, price, category)
                showAddDialog = false
            }
        )
    }

    editingItem?.let { item ->
        AddEditMenuItemDialog(
            item = item,
            onDismiss = { editingItem = null },
            onSave = { name, description, price, category ->
                viewModel.updateMenuItem(item.id, name, description, price, category)
                editingItem = null
            }
        )
    }
}

/**
 * Menu Stats Bar - matches iOS menuStatsBar
 * Shows: Total Items (blue), Available (green), Out of Stock (red), Categories (purple)
 */
@Composable
private fun MenuStatsBar(
    totalItems: Int,
    availableCount: Int,
    outOfStockCount: Int,
    categoriesCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        MenuStatCard(
            title = "Total Items",
            value = "$totalItems",
            color = BrandBlue,
            icon = Icons.Default.MenuBook,
            modifier = Modifier.weight(1f)
        )
        MenuStatCard(
            title = "Available",
            value = "$availableCount",
            color = BrandGreen,
            icon = Icons.Default.CheckCircle,
            modifier = Modifier.weight(1f)
        )
        MenuStatCard(
            title = "Out of Stock",
            value = "$outOfStockCount",
            color = BrandRed,
            icon = Icons.Default.Cancel,
            modifier = Modifier.weight(1f)
        )
        MenuStatCard(
            title = "Categories",
            value = "$categoriesCount",
            color = BrandPurple,
            icon = Icons.Default.Folder,
            modifier = Modifier.weight(1f)
        )
    }
}

/**
 * Menu Stat Card - matches iOS QuickStatCard
 */
@Composable
private fun MenuStatCard(
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
                fontSize = 9.sp,
                color = Color.Gray
            )
        }
    }
}

/**
 * Search Bar - matches iOS searchBar
 */
@Composable
private fun SearchBar(
    searchText: String,
    onSearchChange: (String) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(12.dp),
        color = BrandGrey
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(20.dp)
            )
            Box(modifier = Modifier.weight(1f)) {
                if (searchText.isEmpty()) {
                    Text(
                        text = "Search menu items...",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }
                androidx.compose.foundation.text.BasicTextField(
                    value = searchText,
                    onValueChange = onSearchChange,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = androidx.compose.ui.text.TextStyle(
                        fontSize = 14.sp,
                        color = BrandBlack
                    ),
                    singleLine = true
                )
            }
            if (searchText.isNotEmpty()) {
                Icon(
                    imageVector = Icons.Default.Cancel,
                    contentDescription = "Clear",
                    tint = Color.Gray,
                    modifier = Modifier
                        .size(20.dp)
                        .clickable { onSearchChange("") }
                )
            }
        }
    }
}

/**
 * Category Tabs - matches iOS categoryTabs
 */
@Composable
private fun CategoryTabs(
    categories: List<String>,
    selectedCategory: String?,
    onCategorySelected: (String?) -> Unit,
    itemCounts: Map<String, Int>,
    totalCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // All tab
        CategoryTab(
            title = "All",
            count = totalCount,
            isSelected = selectedCategory == null,
            onClick = { onCategorySelected(null) }
        )

        // Category tabs
        categories.forEach { category ->
            CategoryTab(
                title = category,
                count = itemCounts[category] ?: 0,
                isSelected = selectedCategory == category,
                onClick = { onCategorySelected(category) }
            )
        }

        // Trailing spacer for last item visibility
        Spacer(modifier = Modifier.width(20.dp))
    }
}

/**
 * Category Tab - matches iOS CategoryTab
 */
@Composable
private fun CategoryTab(
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

/**
 * Menu Suggestion Banner - matches iOS MenuSuggestionBanner
 */
@Composable
private fun MenuSuggestionBanner(suggestion: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFFFF8E1) // Light yellow/orange gradient approximation
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Lightbulb,
                contentDescription = null,
                tint = Color(0xFFFFC107), // Yellow
                modifier = Modifier.size(24.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "AI Suggestion",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Gray
                )
                Text(
                    text = suggestion,
                    fontSize = 14.sp,
                    color = BrandBlack
                )
            }
        }
    }
}

/**
 * Enhanced Menu Item Card - matches iOS MenuItemCard
 */
@Composable
private fun EnhancedMenuItemCard(
    item: MenuItemData,
    onToggleAvailability: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 4.dp,
                shape = RoundedCornerShape(16.dp)
            )
            .animateContentSize(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Item Image - matches iOS 70x70
            Box(
                modifier = Modifier
                    .size(70.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Gray.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                if (!item.imageUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = item.imageUrl,
                        contentDescription = item.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(28.dp)
                    )
                }

                // Sold Out Overlay - matches iOS
                if (!item.isAvailable) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "SOLD\nOUT",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            lineHeight = 12.sp
                        )
                    }
                }
            }

            // Item Details
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Name + Popular Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = item.name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandBlack,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (item.isPopular) {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = BrandOrange
                        ) {
                            Text(
                                text = "POPULAR",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                // Description
                if (item.description.isNotEmpty()) {
                    Text(
                        text = item.description,
                        fontSize = 12.sp,
                        color = Color.Gray,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Price + Category
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "$${String.format("%.2f", item.price)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandGreen
                    )
                    Text(
                        text = "•",
                        color = Color.Gray
                    )
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Gray.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = item.category.ifEmpty { "General" },
                            fontSize = 12.sp,
                            color = Color.Gray,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Toggle + Menu Column - matches iOS
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Availability Toggle
                Switch(
                    checked = item.isAvailable,
                    onCheckedChange = { onToggleAvailability() },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = BrandGreen,
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = Color.Gray.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.height(24.dp)
                )

                // Menu Button
                Box {
                    IconButton(
                        onClick = { showMenu = true },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "More options",
                            tint = Color.Gray
                        )
                    }

                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Edit Item") },
                            onClick = {
                                showMenu = false
                                onEdit()
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Edit, contentDescription = null)
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete Item", color = BrandRed) },
                            onClick = {
                                showMenu = false
                                showDeleteConfirm = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Delete, contentDescription = null, tint = BrandRed)
                            }
                        )
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Item?") },
            text = { Text("Are you sure you want to delete \"${item.name}\"? This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete()
                        showDeleteConfirm = false
                    }
                ) {
                    Text("Delete", color = BrandRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/**
 * Empty Menu View - matches iOS EmptyMenuView
 */
@Composable
private fun EmptyMenuView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.MenuBook,
                contentDescription = null,
                modifier = Modifier.size(50.dp),
                tint = Color.Gray.copy(alpha = 0.5f)
            )
            Text(
                text = "No menu items",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Gray
            )
            Text(
                text = "Add your first menu item to get started",
                fontSize = 14.sp,
                color = Color.Gray.copy(alpha = 0.7f)
            )
        }
    }
}

/**
 * Add/Edit Menu Item Dialog
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditMenuItemDialog(
    item: MenuItemData?,
    onDismiss: () -> Unit,
    onSave: (String, String, Double, String) -> Unit
) {
    var name by remember { mutableStateOf(item?.name ?: "") }
    var description by remember { mutableStateOf(item?.description ?: "") }
    var price by remember { mutableStateOf(item?.price?.toString() ?: "") }
    var category by remember { mutableStateOf(item?.category ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (item == null) "Add Item" else "Edit Item") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )

                OutlinedTextField(
                    value = price,
                    onValueChange = { newValue ->
                        if (newValue.isEmpty() || newValue.matches(Regex("^\\d*\\.?\\d*$"))) {
                            price = newValue
                        }
                    },
                    label = { Text("Price") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    prefix = { Text("$") }
                )

                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("Category") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val priceValue = price.toDoubleOrNull() ?: 0.0
                    if (name.isNotBlank() && priceValue > 0) {
                        onSave(name, description, priceValue, category)
                    }
                },
                enabled = name.isNotBlank() && (price.toDoubleOrNull() ?: 0.0) > 0,
                colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
