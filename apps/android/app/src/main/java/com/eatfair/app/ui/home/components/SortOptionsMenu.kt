package com.eatfair.app.ui.home.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.theme.*

/**
 * Sort Options for Restaurant List - Matches iOS SortOption
 */
enum class SortOption(val displayName: String) {
    RECOMMENDED("Recommended"),
    TOP_RATED("Top Rated"),
    FASTEST("Fastest Delivery"),
    NEAREST("Nearest")
}

/**
 * Sort Options Menu - Matches iOS sortOptionsMenu
 *
 * Features:
 * - Dropdown button showing current selection
 * - 4 sort options with checkmark on selected
 * - Clean dropdown menu styling
 */
@Composable
fun SortOptionsMenu(
    selectedOption: SortOption,
    onOptionSelected: (SortOption) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        // Sort Button
        TextButton(
            onClick = { expanded = true }
        ) {
            Text(
                text = selectedOption.displayName,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = BrandGreen
            )
            Spacer(modifier = Modifier.width(4.dp))
            Icon(
                imageVector = Icons.Default.KeyboardArrowDown,
                contentDescription = "Sort",
                tint = BrandGreen,
                modifier = Modifier.size(20.dp)
            )
        }

        // Dropdown Menu
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            SortOption.values().forEach { option ->
                DropdownMenuItem(
                    text = {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = option.displayName,
                                fontSize = 14.sp,
                                color = if (option == selectedOption) BrandGreen else BrandBlack
                            )
                            if (option == selectedOption) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Selected",
                                    tint = BrandGreen,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    },
                    onClick = {
                        onOptionSelected(option)
                        expanded = false
                    }
                )
            }
        }
    }
}

/**
 * All Restaurants Section Header - Matches iOS "All Restaurants" header
 *
 * Features:
 * - "All Restaurants" title
 * - Restaurant count
 * - Sort dropdown menu
 */
@Composable
fun AllRestaurantsHeader(
    restaurantCount: Int,
    selectedSortOption: SortOption,
    onSortOptionSelected: (SortOption) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "All Restaurants",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )
            Text(
                text = "$restaurantCount restaurants",
                fontSize = 13.sp,
                color = TextGrey
            )
        }

        SortOptionsMenu(
            selectedOption = selectedSortOption,
            onOptionSelected = onSortOptionSelected
        )
    }
}

@Preview(showBackground = true)
@Composable
fun SortOptionsMenuPreview() {
    var selectedOption by remember { mutableStateOf(SortOption.RECOMMENDED) }
    SortOptionsMenu(
        selectedOption = selectedOption,
        onOptionSelected = { selectedOption = it }
    )
}

@Preview(showBackground = true)
@Composable
fun AllRestaurantsHeaderPreview() {
    var selectedOption by remember { mutableStateOf(SortOption.RECOMMENDED) }
    AllRestaurantsHeader(
        restaurantCount = 42,
        selectedSortOption = selectedOption,
        onSortOptionSelected = { selectedOption = it }
    )
}
