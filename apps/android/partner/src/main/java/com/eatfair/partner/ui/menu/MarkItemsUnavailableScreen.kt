package com.eatfair.partner.ui.menu

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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class UnavailableMenuItem(
    val id: Int,
    val name: String,
    val category: String,
    val isCurrentlyUnavailable: Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarkItemsUnavailableScreen(
    onBackClick: () -> Unit,
    onSave: (List<Int>) -> Unit
) {
    val menuItems = remember {
        mutableStateListOf(
            UnavailableMenuItem(1, "Margherita Pizza", "Pizza", false),
            UnavailableMenuItem(2, "Pepperoni Pizza", "Pizza", false),
            UnavailableMenuItem(3, "Caesar Salad", "Appetizers", true),
            UnavailableMenuItem(4, "Bruschetta", "Appetizers", false),
            UnavailableMenuItem(5, "Spaghetti Carbonara", "Pasta", false),
            UnavailableMenuItem(6, "Fettuccine Alfredo", "Pasta", true),
            UnavailableMenuItem(7, "Tiramisu", "Desserts", false),
            UnavailableMenuItem(8, "Chicken Parmesan", "Main Course", false),
            UnavailableMenuItem(9, "Garlic Bread", "Appetizers", false),
            UnavailableMenuItem(10, "Minestrone Soup", "Appetizers", true)
        )
    }

    var selectedItems by remember { mutableStateOf(setOf<Int>()) }
    var searchQuery by remember { mutableStateOf("") }

    // Initialize with currently unavailable items
    LaunchedEffect(Unit) {
        selectedItems = menuItems.filter { it.isCurrentlyUnavailable }.map { it.id }.toSet()
    }

    val filteredItems = menuItems.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
        it.category.contains(searchQuery, ignoreCase = true)
    }

    val groupedItems = filteredItems.groupBy { it.category }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Mark Items Unavailable", fontWeight = FontWeight.Bold)
                        Text(
                            "${selectedItems.size} items selected",
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { onSave(selectedItems.toList()) }
                    ) {
                        Text("Save", color = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // Info Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
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
                        tint = Color(0xFFFF9800)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Selected items will be marked as unavailable and hidden from customers until you make them available again.",
                        fontSize = 13.sp,
                        color = Color(0xFFE65100)
                    )
                }
            }

            // Search
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                placeholder = { Text("Search items...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null)
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

            Spacer(modifier = Modifier.height(8.dp))

            // Quick Actions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { selectedItems = menuItems.map { it.id }.toSet() },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Select All", fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = { selectedItems = emptySet() },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Clear All", fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Items List
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                groupedItems.forEach { (category, items) ->
                    item {
                        Text(
                            text = category,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = Color.Gray,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }

                    items(items) { item ->
                        UnavailableItemRow(
                            item = item,
                            isSelected = selectedItems.contains(item.id),
                            onToggle = {
                                selectedItems = if (selectedItems.contains(item.id)) {
                                    selectedItems - item.id
                                } else {
                                    selectedItems + item.id
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun UnavailableItemRow(
    item: UnavailableMenuItem,
    isSelected: Boolean,
    onToggle: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFFFBE9E7) else Color.White
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onToggle() },
                colors = CheckboxDefaults.colors(
                    checkedColor = Color(0xFFFF5722),
                    uncheckedColor = Color.Gray
                )
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    fontWeight = FontWeight.Medium
                )
                if (item.isCurrentlyUnavailable) {
                    Text(
                        text = "Currently unavailable",
                        fontSize = 12.sp,
                        color = Color(0xFFF44336)
                    )
                }
            }

            if (isSelected) {
                Icon(
                    Icons.Default.DoNotDisturbOn,
                    contentDescription = null,
                    tint = Color(0xFFF44336)
                )
            }
        }
    }
}
