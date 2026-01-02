package com.eatfair.app.ui.restaurant

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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.eatfair.shared.model.restaurant.MenuItem

/**
 * Menu Item Customization Dialog
 * Matches iOS MenuItemCustomizationView for platform parity
 * Allows users to customize menu items with options, quantity, and special instructions
 */

data class CustomizationOption(
    val id: String,
    val name: String,
    val price: Double = 0.0,
    val isRequired: Boolean = false
)

data class CustomizationGroup(
    val id: String,
    val name: String,
    val options: List<CustomizationOption>,
    val isMultiSelect: Boolean = false,
    val isRequired: Boolean = false,
    val minSelections: Int = 0,
    val maxSelections: Int = 1
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuItemCustomizationDialog(
    menuItem: MenuItem,
    onDismiss: () -> Unit,
    onAddToCart: (quantity: Int, selectedOptions: Map<String, List<String>>, specialInstructions: String) -> Unit
) {
    var quantity by remember { mutableStateOf(1) }
    var specialInstructions by remember { mutableStateOf("") }
    var selectedOptions by remember { mutableStateOf(mapOf<String, List<String>>()) }

    // Customization groups - empty until API provides real customization data
    // When backend implements /api/vendors/{id}/menu-items/{id}/customizations endpoint,
    // this should be fetched and passed as parameter to this dialog
    val customizationGroups = remember { emptyList<CustomizationGroup>() }

    // Calculate total price (base price * quantity, no extras without real customization data)
    val totalPrice = menuItem.price * quantity

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = true
        )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            color = Color.White
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header with close button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                ) {
                    AsyncImage(
                        model = menuItem.imageUrl,
                        contentDescription = menuItem.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    // Close button
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.9f))
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.Black
                        )
                    }
                }

                // Content
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Item Details
                    item {
                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = menuItem.name,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = menuItem.description ?: "",
                            fontSize = 14.sp,
                            color = Color.Gray,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "$${String.format("%.2f", menuItem.price)}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFFF6B35) // Brand orange
                        )
                    }

                    // Customization Groups (only shown if API provides customization data)
                    if (customizationGroups.isNotEmpty()) {
                        items(customizationGroups) { group ->
                            CustomizationGroupSection(
                                group = group,
                                selectedOptions = selectedOptions[group.id] ?: emptyList(),
                                onSelectionChange = { newSelection ->
                                    selectedOptions = selectedOptions + (group.id to newSelection)
                                }
                            )
                        }
                    } else if (menuItem.isCustomizable) {
                        // Item is marked customizable but no options available from API
                        item {
                            Text(
                                text = "Customization options not available. Please add any preferences in special instructions below.",
                                fontSize = 14.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }

                    // Special Instructions
                    item {
                        Text(
                            text = "Special Instructions",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.Black
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = specialInstructions,
                            onValueChange = { specialInstructions = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Add any special requests (allergies, no onions, etc.)") },
                            minLines = 2,
                            maxLines = 4,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFFF6B35),
                                unfocusedBorderColor = Color(0xFFE0E0E0)
                            )
                        )

                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }

                // Bottom Bar with Quantity and Add to Cart
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 8.dp,
                    color = Color.White
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        // Quantity Selector
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Quantity",
                                fontWeight = FontWeight.Medium,
                                fontSize = 16.sp
                            )

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                IconButton(
                                    onClick = { if (quantity > 1) quantity-- },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFF0F0F0))
                                ) {
                                    Icon(
                                        Icons.Default.Remove,
                                        contentDescription = "Decrease",
                                        tint = if (quantity > 1) Color.Black else Color.Gray
                                    )
                                }

                                Text(
                                    text = "$quantity",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.width(40.dp),
                                    textAlign = TextAlign.Center
                                )

                                IconButton(
                                    onClick = { if (quantity < 10) quantity++ },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFFF6B35))
                                ) {
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = "Increase",
                                        tint = Color.White
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Add to Cart Button
                        Button(
                            onClick = {
                                onAddToCart(quantity, selectedOptions, specialInstructions)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF6B35)
                            )
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "Add to Cart",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "$${String.format("%.2f", totalPrice)}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
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
fun CustomizationGroupSection(
    group: CustomizationGroup,
    selectedOptions: List<String>,
    onSelectionChange: (List<String>) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = group.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            if (group.isRequired) {
                Text(
                    text = "Required",
                    fontSize = 12.sp,
                    color = Color(0xFFFF6B35),
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        group.options.forEach { option ->
            val isSelected = selectedOptions.contains(option.id)

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val newSelection = if (group.isMultiSelect) {
                            if (isSelected) {
                                selectedOptions - option.id
                            } else {
                                if (selectedOptions.size < group.maxSelections) {
                                    selectedOptions + option.id
                                } else {
                                    selectedOptions
                                }
                            }
                        } else {
                            listOf(option.id)
                        }
                        onSelectionChange(newSelection)
                    }
                    .padding(vertical = 8.dp),
                color = if (isSelected) Color(0xFFFF6B35).copy(alpha = 0.1f) else Color.Transparent,
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (group.isMultiSelect) {
                            Checkbox(
                                checked = isSelected,
                                onCheckedChange = null,
                                colors = CheckboxDefaults.colors(
                                    checkedColor = Color(0xFFFF6B35),
                                    uncheckedColor = Color.Gray
                                )
                            )
                        } else {
                            RadioButton(
                                selected = isSelected,
                                onClick = null,
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = Color(0xFFFF6B35),
                                    unselectedColor = Color.Gray
                                )
                            )
                        }

                        Text(
                            text = option.name,
                            fontSize = 14.sp,
                            color = if (isSelected) Color(0xFFFF6B35) else Color.Black
                        )
                    }

                    if (option.price > 0) {
                        Text(
                            text = "+$${String.format("%.2f", option.price)}",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}
