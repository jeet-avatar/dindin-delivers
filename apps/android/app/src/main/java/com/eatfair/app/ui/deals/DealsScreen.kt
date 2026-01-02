package com.eatfair.app.ui.deals

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.shared.model.FeaturedDeal
import com.eatfair.app.ui.theme.DollorTheme

/**
 * DealsScreen - Matches iOS DealsView
 * Shows featured deals and all deals from the API
 *
 * Brand Colors: Uses theme constants from Color.kt
 * - BrandGreen = #06C167 (Primary brand color)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DealsScreen(
    dealsViewModel: DealsViewModel = hiltViewModel(),
    onBackClick: () -> Unit,
    onDealClick: (FeaturedDeal) -> Unit,
    onRestaurantClick: (Int) -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    val deals by dealsViewModel.deals.collectAsState()
    val isLoading by dealsViewModel.isLoading.collectAsState()
    val errorMessage by dealsViewModel.errorMessage.collectAsState()
    val selectedFilter by dealsViewModel.selectedFilter.collectAsState()

    var copiedCode by remember { mutableStateOf<String?>(null) }

    // Get filtered and featured deals
    val filteredDeals = dealsViewModel.getFilteredDeals()
    val featuredDeals = dealsViewModel.getFeaturedDeals()

    // Use theme brand color (matches iOS Theme.brandGreen)
    val brandGreen = DollorTheme.Brand.green

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Deals & Offers", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { dealsViewModel.fetchDeals() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color.Black,
                    navigationIconContentColor = Color.Black,
                    actionIconContentColor = Color.Black
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading && deals.isEmpty() -> {
                    // Loading state
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = Color(0xFF6C63FF))
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Loading deals...", color = Color.Gray)
                        }
                    }
                }

                errorMessage != null && deals.isEmpty() -> {
                    // Error state with retry
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.ErrorOutline,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = Color.Gray
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = errorMessage ?: "Failed to load deals",
                                color = Color.Gray
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { dealsViewModel.fetchDeals() },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF6C63FF)
                                )
                            ) {
                                Text("Retry")
                            }
                        }
                    }
                }

                deals.isEmpty() -> {
                    // Empty state
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.LocalOffer,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = Color.LightGray
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "No deals available",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.Gray
                            )
                            Text(
                                text = "Check back later for new offers",
                                fontSize = 14.sp,
                                color = Color.LightGray
                            )
                        }
                    }
                }

                else -> {
                    // Deals list with pull-to-refresh - matches iOS .refreshable
                    PullToRefreshBox(
                        isRefreshing = isLoading,
                        onRefresh = { dealsViewModel.fetchDeals() },
                        modifier = Modifier.fillMaxSize()
                    ) {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0xFFF5F5F5))
                        ) {
                        // Featured Deals Carousel - matches iOS "Hot Deals"
                        if (featuredDeals.isNotEmpty()) {
                            item {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocalFireDepartment,
                                        contentDescription = null,
                                        tint = DollorTheme.Brand.orange, // Orange like iOS
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Hot Deals",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(featuredDeals) { deal ->
                                        FeaturedDealCard(
                                            deal = deal,
                                            onClick = {
                                                deal.restaurantId?.let { onRestaurantClick(it) }
                                            }
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))
                            }
                        }

                        // Filter chips - matches iOS order and style
                        item {
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // iOS order: All Deals, % Off, BOGO, Free Delivery, $ Off
                                val orderedFilters = listOf(
                                    DealsViewModel.DealFilter.ALL,
                                    DealsViewModel.DealFilter.PERCENTAGE,
                                    DealsViewModel.DealFilter.BOGO,
                                    DealsViewModel.DealFilter.FREE_DELIVERY,
                                    DealsViewModel.DealFilter.FLAT_AMOUNT
                                )
                                items(orderedFilters) { filter ->
                                    FilterChip(
                                        selected = selectedFilter == filter,
                                        onClick = { dealsViewModel.setFilter(filter) },
                                        label = { Text(filter.displayName()) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = brandGreen,
                                            selectedLabelColor = Color.White
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        // Available Offers header - matches iOS
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Available Offers",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "${filteredDeals.size} deals",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        // Deals list
                        items(filteredDeals) { deal ->
                            DealCard(
                                deal = deal,
                                onCopyCode = {
                                    clipboardManager.setText(AnnotatedString(deal.discountText))
                                    copiedCode = deal.discountText
                                },
                                isCopied = copiedCode == deal.discountText,
                                onClick = {
                                    onDealClick(deal)
                                    deal.restaurantId?.let { onRestaurantClick(it) }
                                }
                            )
                        }

                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }
                }  // Close PullToRefreshBox
            }  // Close else
        }  // Close when
    }  // Close Box
}  // Close Scaffold

    // Clear copied code after delay
    if (copiedCode != null) {
        LaunchedEffect(copiedCode) {
            kotlinx.coroutines.delay(2000)
            copiedCode = null
        }
    }
}

/**
 * Display name for filter enum - matches iOS exactly
 */
private fun DealsViewModel.DealFilter.displayName(): String {
    return when (this) {
        DealsViewModel.DealFilter.ALL -> "All Deals"  // iOS uses "All Deals"
        DealsViewModel.DealFilter.PERCENTAGE -> "% Off"
        DealsViewModel.DealFilter.FLAT_AMOUNT -> "$ Off"
        DealsViewModel.DealFilter.FREE_DELIVERY -> "Free Delivery"
        DealsViewModel.DealFilter.BOGO -> "BOGO"
    }
}

/**
 * Get gradient colors based on discount type - Matches iOS FeaturedDealCard exactly
 * iOS uses: percentage=purple→pink, bogo=orange→red, free_delivery=green→teal, default=blue→indigo
 */
private fun getGradientForDeal(discountText: String): List<Color> {
    return when {
        discountText.contains("%", ignoreCase = true) ->
            listOf(Color(0xFF9C27B0), Color(0xFFE91E63)) // Purple → Pink (iOS percentage)
        discountText.contains("bogo", ignoreCase = true) ||
            discountText.contains("buy 1", ignoreCase = true) ->
            listOf(Color(0xFFFF9800), Color(0xFFF44336)) // Orange → Red (iOS bogo)
        discountText.contains("free", ignoreCase = true) ->
            listOf(Color(0xFF06C167), Color(0xFF009688)) // Green → Teal (iOS free_delivery)
        else ->
            listOf(Color(0xFF2196F3), Color(0xFF3F51B5)) // Blue → Indigo (iOS default)
    }
}

/**
 * Get solid badge color for deal type - Matches iOS DealCard badgeColor exactly
 * iOS uses: percentage=purple, flat_amount=blue, bogo=orange, free_delivery=green
 */
private fun getBadgeColorForDeal(discountText: String): Color {
    return when {
        discountText.contains("%", ignoreCase = true) -> Color(0xFF9C27B0) // Purple
        discountText.contains("$", ignoreCase = true) -> Color(0xFF2196F3) // Blue
        discountText.contains("bogo", ignoreCase = true) ||
            discountText.contains("buy 1", ignoreCase = true) -> Color(0xFFFF9800) // Orange
        discountText.contains("free", ignoreCase = true) -> Color(0xFF06C167) // Green
        else -> Color.Gray
    }
}

@Composable
fun FeaturedDealCard(
    deal: FeaturedDeal,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(200.dp)  // iOS: 200
            .height(180.dp) // iOS: 180
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = getGradientForDeal(deal.discountText)
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    // Discount badge
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.White.copy(alpha = 0.25f)
                    ) {
                        Text(
                            text = deal.discountText,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 16.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = deal.title,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    deal.description?.let { desc ->
                        Text(
                            text = desc,
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.8f),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Restaurant name if available
                    deal.restaurantName?.let { name ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Store,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = name,
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.8f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // Valid until if available
                    deal.validUntil?.let { validUntil ->
                        Text(
                            text = "Valid: $validUntil",
                            fontSize = 10.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DealCard(
    deal: FeaturedDeal,
    onCopyCode: () -> Unit,
    isCopied: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Discount badge - Matches iOS dealBadge exactly (70x70 solid color)
            Box(
                modifier = Modifier
                    .size(70.dp)  // iOS: 70x70
                    .clip(RoundedCornerShape(12.dp))
                    .background(getBadgeColorForDeal(deal.discountText)),  // Solid color like iOS
                contentAlignment = Alignment.Center
            ) {
                val discountDisplay = parseDiscountText(deal.discountText)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = discountDisplay.first,
                        fontSize = 18.sp,  // iOS: .title3
                        fontWeight = FontWeight.Black,  // iOS: .black
                        color = Color.White
                    )
                    if (discountDisplay.second.isNotEmpty()) {
                        Text(
                            text = discountDisplay.second,
                            fontSize = 10.sp,  // iOS: .caption2
                            fontWeight = FontWeight.Medium,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Deal info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = deal.title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )

                deal.description?.let { desc ->
                    Text(
                        text = desc,
                        fontSize = 12.sp,
                        color = Color.Gray,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                deal.restaurantName?.let { name ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Icon(
                            Icons.Default.Store,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = DollorTheme.Brand.green
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = name,
                            fontSize = 11.sp,
                            color = DollorTheme.Brand.green
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Discount text and action
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFFF0F0F0)
                    ) {
                        Text(
                            text = deal.discountText,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    TextButton(
                        onClick = onCopyCode,
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        val copiedColor = DollorTheme.Status.success // Success green
                        Icon(
                            if (isCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = if (isCopied) copiedColor else DollorTheme.Brand.green
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isCopied) "Copied!" else "Copy",
                            fontSize = 12.sp,
                            color = if (isCopied) copiedColor else DollorTheme.Brand.green
                        )
                    }
                }
            }

            // Arrow for navigation
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.LightGray,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

/**
 * Parse discount text to extract display values
 * e.g., "50% OFF" -> ("50%", "OFF"), "$5 OFF" -> ("$5", "OFF")
 */
private fun parseDiscountText(text: String): Pair<String, String> {
    val upper = text.uppercase()
    return when {
        upper.contains("%") -> {
            val percent = Regex("""(\d+)%""").find(text)?.value ?: text
            Pair(percent, "OFF")
        }
        upper.contains("$") -> {
            val amount = Regex("""\$\d+""").find(text)?.value ?: text
            Pair(amount, "OFF")
        }
        upper.contains("FREE") -> {
            Pair("FREE", "DELIVERY")
        }
        upper.contains("BOGO") || upper.contains("BUY 1") -> {
            Pair("BOGO", "")
        }
        else -> {
            Pair(text.take(6), "")
        }
    }
}
