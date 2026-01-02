package com.eatfair.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.theme.BrandGreen
import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.model.search.SearchResultDto

/**
 * SearchScreen - Matches iOS SearchRestaurantsView exactly
 * Features:
 * - White background (no gradient)
 * - Search bar with X clear button
 * - Cuisine filter chips (always visible)
 * - Sort dropdown with "Sort by:" label
 * - AI Pick purple button
 * - RestaurantSearchCard with 80x80 image and fee display
 */
@Composable
fun SearchScreen(
    searchViewModel: SearchViewModel,
    onBackClick: () -> Unit = {},
    onRecentSearchClick: (String) -> Unit = {},
    onCuisineClick: (String) -> Unit = {},
    onMicClick: () -> Unit = {},
    onSearchResultClick: (SearchResultDto) -> Unit
) {
    val query by searchViewModel.searchQuery.collectAsState()
    val results by searchViewModel.searchResults.collectAsState()
    val isLoading by searchViewModel.isLoading.collectAsState()
    val sortOption by searchViewModel.sortOption.collectAsState()
    val selectedCuisine by searchViewModel.selectedCuisine.collectAsState()

    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    var showSortMenu by remember { mutableStateOf(false) }
    var showAIRecommendations by remember { mutableStateOf(false) }

    // Cuisine filters matching iOS
    val cuisineFilters = listOf("All", "Italian", "Indian", "Chinese", "Mexican", "Japanese", "Thai", "American", "Mediterranean")

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        keyboardController?.show()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White) // White background like iOS
    ) {
        // Search Bar - Matches iOS exactly
        SearchBarWithClear(
            query = query,
            onQueryChange = { searchViewModel.onSearchQueryChange(it) },
            onBackClick = onBackClick,
            onClearClick = { searchViewModel.clearSearch() },
            modifier = Modifier
                .focusRequester(focusRequester)
                .padding(16.dp)
        )

        // Cuisine Filter Chips - Always visible like iOS
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            items(cuisineFilters) { cuisine ->
                FilterChip(
                    title = cuisine,
                    isSelected = (cuisine == "All" && selectedCuisine == null) || selectedCuisine == cuisine,
                    onClick = {
                        if (cuisine == "All") {
                            searchViewModel.setSelectedCuisine(null)
                        } else {
                            searchViewModel.setSelectedCuisine(cuisine)
                            onCuisineClick(cuisine)
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Sort Options Row with "Sort by:" label and AI Pick button - Matches iOS
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // "Sort by:" label
            Text(
                text = "Sort by:",
                fontSize = 14.sp,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.width(8.dp))

            // Sort dropdown
            Box {
                Row(
                    modifier = Modifier.clickable { showSortMenu = true },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = sortOption.displayName(),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = BrandGreen
                    )
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = BrandGreen,
                        modifier = Modifier
                            .size(16.dp)
                            .padding(start = 2.dp)
                    )
                }

                DropdownMenu(
                    expanded = showSortMenu,
                    onDismissRequest = { showSortMenu = false }
                ) {
                    SearchViewModel.SortOption.entries.forEach { option ->
                        DropdownMenuItem(
                            text = {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(option.displayName())
                                    if (sortOption == option) {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            tint = BrandGreen
                                        )
                                    }
                                }
                            },
                            onClick = {
                                searchViewModel.setSortOption(option)
                                showSortMenu = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // AI Pick Button - Matches iOS exactly (purple)
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF9C27B0).copy(alpha = 0.1f))
                    .clickable { showAIRecommendations = true }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "✨",
                    fontSize = 14.sp
                )
                Text(
                    text = "AI Pick",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF9C27B0)
                )
            }
        }

        // Divider
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color(0xFFE0E0E0))
        )

        // Results
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Loading State
            if (isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(color = BrandGreen)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Searching...",
                                fontSize = 14.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }
            } else if (results.isEmpty() && query.isNotBlank()) {
                // Empty State - Matches iOS
                item {
                    EmptySearchResults(query = query)
                }
            } else if (results.isNotEmpty()) {
                // Search Results
                items(results) { item ->
                    RestaurantSearchCard(
                        result = item,
                        onSearchResultClick = onSearchResultClick
                    )
                }
            } else {
                // Initial state - show helpful message
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 60.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                modifier = Modifier.size(50.dp),
                                tint = Color.Gray.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Search for restaurants",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.Gray
                            )
                            Text(
                                text = "or select a cuisine above",
                                fontSize = 14.sp,
                                color = Color.Gray.copy(alpha = 0.7f)
                            )
                        }
                    }
                }
            }

            // Bottom spacing for tab bar
            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }

    // AI Recommendations Sheet
    if (showAIRecommendations) {
        AIRecommendationsSheet(
            onDismiss = { showAIRecommendations = false },
            restaurants = results
        )
    }
}

/**
 * Sort option display name
 */
private fun SearchViewModel.SortOption.displayName(): String {
    return when (this) {
        SearchViewModel.SortOption.RECOMMENDED -> "Recommended"
        SearchViewModel.SortOption.TOP_RATED -> "Top Rated"
        SearchViewModel.SortOption.FASTEST -> "Fastest"
        SearchViewModel.SortOption.NEAREST -> "Nearest"
    }
}

/**
 * Search Bar with Clear Button - Matches iOS
 */
@Composable
fun SearchBarWithClear(
    query: String,
    onQueryChange: (String) -> Unit,
    onBackClick: () -> Unit,
    onClearClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = {
            Text(
                text = "Search restaurants or dishes...",
                fontSize = 16.sp,
                color = Color.Gray
            )
        },
        leadingIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.Gray
                )
            }
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = onClearClick) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear",
                        tint = Color.Gray
                    )
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = Color(0xFFF2F2F7),
            unfocusedContainerColor = Color(0xFFF2F2F7),
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent
        )
    )
}

/**
 * Filter Chip - Matches iOS FilterChip
 */
@Composable
fun FilterChip(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (isSelected) BrandGreen else Color(0xFFF2F2F7))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = title,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (isSelected) Color.White else Color.Black
        )
    }
}

/**
 * Restaurant Search Card - Matches iOS RestaurantSearchCard exactly
 * - 80x80 gray placeholder with fork.knife icon
 * - Restaurant name, cuisine
 * - Rating (star), delivery time (clock), fee (green)
 * - Chevron right
 */
@Composable
fun RestaurantSearchCard(
    result: SearchResultDto,
    onSearchResultClick: (SearchResultDto) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSearchResultClick(result) },
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 80x80 Image placeholder with fork.knife icon - Matches iOS
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Gray.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Restaurant,
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = Color.Gray
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                modifier = Modifier.weight(1f)
            ) {
                // Restaurant name
                Text(
                    text = result.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Cuisine type
                Text(
                    text = result.category,
                    fontSize = 14.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Meta info row - Matches iOS exactly
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Rating with star
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFFFFA000) // Orange color for star
                        )
                        Text(
                            text = String.format("%.1f", result.rating),
                            fontSize = 13.sp,
                            color = Color.DarkGray
                        )
                    }

                    Text(text = "•", color = Color.Gray, fontSize = 13.sp)

                    // Delivery time
                    result.deliveryTime?.let {
                        Text(
                            text = "$it min",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }

                    Text(text = "•", color = Color.Gray, fontSize = 13.sp)

                    // Platform fee - Matches iOS "$X fee" in green
                    Text(
                        text = "$${AppConfig.FoodDelivery.RESTAURANT_FEE.toInt()} fee",
                        fontSize = 13.sp,
                        color = BrandGreen
                    )
                }
            }

            // Chevron right
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * Empty search results view - Matches iOS
 */
@Composable
fun EmptySearchResults(query: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 60.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.Search,
            contentDescription = null,
            modifier = Modifier.size(50.dp),
            tint = Color.Gray.copy(alpha = 0.5f)
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "No restaurants found",
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = Color.Gray
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "Try a different search term or filter",
            fontSize = 14.sp,
            color = Color.Gray.copy(alpha = 0.7f)
        )
    }
}

/**
 * AI Recommendations Sheet - Matches iOS AIRecommendationsSheet
 */
@Composable
fun AIRecommendationsSheet(
    onDismiss: () -> Unit,
    restaurants: List<SearchResultDto>
) {
    // Simple dialog implementation
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Text(
                    text = "✨",
                    fontSize = 40.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "AI Food Assistant",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Tell me what you're craving and I'll find the perfect meal",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    lineHeight = 20.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Quick suggestions
                Text(
                    text = "Quick picks:",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    modifier = Modifier.align(Alignment.Start)
                )

                Spacer(modifier = Modifier.height(8.dp))

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        QuickSuggestionChip("🍕 Comfort food")
                    }
                    item {
                        QuickSuggestionChip("🥗 Healthy option")
                    }
                    item {
                        QuickSuggestionChip("🌶️ Spicy")
                    }
                    item {
                        QuickSuggestionChip("💰 Budget")
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Close button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF9C27B0))
                        .clickable { onDismiss() }
                        .padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Done",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

/**
 * Quick suggestion chip for AI recommendations
 */
@Composable
fun QuickSuggestionChip(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF9C27B0).copy(alpha = 0.1f))
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = text,
            fontSize = 12.sp,
            color = Color(0xFF9C27B0)
        )
    }
}
