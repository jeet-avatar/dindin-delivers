package com.eatfair.app.ui.home

import android.annotation.SuppressLint
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.TextUnitType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.eatfair.app.R
import com.eatfair.app.ui.theme.BrandGreen
import com.eatfair.app.ui.theme.BrandBlue
import com.eatfair.app.ui.theme.BrandGrey
import com.eatfair.shared.model.home.CarouselItem
import com.eatfair.shared.model.home.Category
import com.eatfair.shared.model.home.FeaturedDeal
import com.eatfair.shared.model.home.FoodItem
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.app.ui.cart.CartSnackBar
import com.eatfair.app.ui.cart.CartViewModel
import com.eatfair.app.ui.home.components.AiRecommendationBanner
import com.eatfair.app.ui.home.components.FeaturedDealsSection
import com.eatfair.app.ui.home.components.FeaturedRestaurantsSection
import com.eatfair.app.ui.home.components.MultiRestaurantPromoBanner
import com.eatfair.app.ui.home.components.AllRestaurantsHeader
import com.eatfair.app.ui.home.components.SortOption
import com.eatfair.app.ui.order.TrackOrderSnackBar
import com.eatfair.app.ui.restaurant.RestaurantCard
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@Composable
fun HomeScreen(
    homeViewModel: HomeViewModel,
    cartViewModel: CartViewModel,
    onProfileClick: () -> Unit = {},
    onLocationClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onCategoryClick: (Category) -> Unit = {},
    onFoodItemClick: (FoodItem) -> Unit = {},
    onRestaurantClick: (Restaurant) -> Unit = {},
    onViewCartClick: () -> Unit = {},
    onTrackOrderClick: (String) -> Unit,
    onRideshareClick: () -> Unit = {},
    onAiAssistantClick: () -> Unit = {},
    onDealClick: (FeaturedDeal) -> Unit = {},
    onMultiRestaurantLearnMore: () -> Unit = {},
    onSeeAllRestaurantsClick: () -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    val restaurants = homeViewModel.restaurants.collectAsState()
    val profileImageUri by homeViewModel.profileImageUri.collectAsState()
    val defaultAddress by homeViewModel.defaultAddress.collectAsState()

    // iOS parity state - dynamic cuisines from restaurant data
    val featuredDeals by homeViewModel.featuredDeals.collectAsState()
    val featuredRestaurants by homeViewModel.featuredRestaurants.collectAsState()
    val availableCuisines by homeViewModel.availableCuisines.collectAsState()
    val selectedCategory by homeViewModel.selectedCategory.collectAsState()
    val sortOption by homeViewModel.sortOption.collectAsState()
    val isLoading by homeViewModel.isLoading.collectAsState()
    val errorMessage by homeViewModel.errorMessage.collectAsState()
    val hasActiveOrder by homeViewModel.hasActiveOrder.collectAsState()
    val activeOrderEta by homeViewModel.activeOrderEta.collectAsState()

    // Get filtered restaurants using ViewModel logic
    val filteredRestaurants = homeViewModel.getFilteredRestaurants()

    val cartItems by cartViewModel.cartItems.collectAsState()
    val activeOrder by cartViewModel.activeOrder.collectAsState()

    val context = LocalContext.current

    Scaffold(
        bottomBar = {
            val order = activeOrder

            // Priority: Active Order Tracker > Cart Snackbar
            if (order != null) {
                // iOS-style Active Order Tracker
                ActiveOrderTrackerCard(
                    eta = activeOrderEta,
                    onClick = { onTrackOrderClick(order.orderId) }
                )
            } else if (hasActiveOrder) {
                // Fallback for ViewModel-tracked active orders
                ActiveOrderTrackerCard(
                    eta = activeOrderEta,
                    onClick = { /* Navigate to track order */ }
                )
            } else if (cartItems.isNotEmpty()) {
                CartSnackBar(
                    cartItems,
                    onClick = onViewCartClick
                )
            }
        }
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(BrandGrey)  // iOS: Theme.brandGrey (#F5F5F5)
        ) {
            // Header Section - matches iOS exactly (white background with shadow)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .shadow(
                            elevation = 2.dp,
                            ambientColor = Color.Black.copy(alpha = 0.05f),
                            spotColor = Color.Black.copy(alpha = 0.05f)
                        )
                        .padding(top = 8.dp)
                ) {
                    // Top Bar - Address & Profile (matches iOS headerSection)
                    TopBar(
                        onProfileClick = onProfileClick,
                        onLocationClick = onLocationClick,
                        profileImageUri = profileImageUri,
                        addressLine1 = defaultAddress?.addressType ?: "Select Address",
                        streetAddress = defaultAddress?.let { "${it.street}, ${it.city}" }
                    )

                    // Search Bar with Voice Search (matches iOS)
                    SearchBarWithVoice(
                        onSearchClick = onSearchClick,
                        onVoiceClick = {
                            Toast.makeText(context, "Voice search coming soon!", Toast.LENGTH_SHORT).show()
                        }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Service Mode Selector - Food Delivery vs Rideshare
                    // iOS: Food -> SearchRestaurantsView, Ride -> RideRequestView
                    ServiceModeSelector(
                        onFoodClick = onSearchClick,  // Navigate to search like iOS
                        onRideshareClick = onRideshareClick
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                }
            }

//        Spacer(modifier = Modifier.height(12.dp))

            // Categories Section - uses dynamic cuisines from restaurants like iOS
            if (availableCuisines.isNotEmpty()) {
                item {
                    DynamicCategoriesSection(
                        cuisines = availableCuisines,
                        selectedCategory = selectedCategory,
                        onCategoryClick = { cuisine ->
                            homeViewModel.setSelectedCategory(cuisine.name)
                        }
                    )
                }
            }

            // AI Recommendation Banner - ALWAYS visible like iOS
            item {
                Spacer(modifier = Modifier.height(16.dp))
                AiRecommendationBanner(
                    onTryNowClick = onAiAssistantClick
                )
            }

            // Featured Deals Section - only shows if API returns real deals
            if (featuredDeals.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(20.dp))
                    FeaturedDealsSection(
                        deals = featuredDeals,
                        onDealClick = { deal ->
                            Toast.makeText(context, "Promo code: ${deal.promoCode}", Toast.LENGTH_SHORT).show()
                            onDealClick(deal)
                        }
                    )
                }
            }

            // Multi-Restaurant Promo Banner - shows when cart is EMPTY like iOS
            if (cartItems.isEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    MultiRestaurantPromoBanner(
                        onLearnMoreClick = onMultiRestaurantLearnMore
                    )
                }
            }

            // NEW: Featured Restaurants Section - matches iOS
            item {
                Spacer(modifier = Modifier.height(20.dp))
                FeaturedRestaurantsSection(
                    restaurants = featuredRestaurants,
                    onRestaurantClick = onRestaurantClick,
                    onSeeAllClick = onSeeAllRestaurantsClick
                )
            }

            // All Restaurants Header with Sort Menu - matches iOS
            item {
                Spacer(modifier = Modifier.height(24.dp))
                AllRestaurantsHeader(
                    restaurantCount = filteredRestaurants.size,
                    selectedSortOption = sortOption,
                    onSortOptionSelected = { option ->
                        homeViewModel.setSortOption(option)
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Loading state - matches iOS
            if (isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 50.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            androidx.compose.material3.CircularProgressIndicator(
                                color = BrandGreen
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Loading restaurants...",
                                fontSize = 14.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }
            }

            // Error state - matches iOS
            if (errorMessage != null && !isLoading) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 50.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Warning,
                            contentDescription = "Connection Issue",
                            modifier = Modifier.size(50.dp),
                            tint = Color(0xFFFFA500)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Connection Issue",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage ?: "",
                            fontSize = 12.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 40.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        androidx.compose.material3.Button(
                            onClick = { homeViewModel.fetchRestaurants() },
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = BrandGreen
                            )
                        ) {
                            Text("Retry")
                        }
                    }
                }
            }

            // Empty state - matches iOS
            if (filteredRestaurants.isEmpty() && !isLoading && errorMessage == null) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 50.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Restaurant,
                            contentDescription = "No restaurants",
                            modifier = Modifier.size(60.dp),
                            tint = Color.Gray.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No Restaurants Found",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "We couldn't find any restaurants in your area. Try changing your delivery address.",
                            fontSize = 14.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 40.dp)
                        )
                    }
                }
            }

            // The Restaurant List - uses filtered and sorted restaurants
            items(filteredRestaurants) { restaurant ->
                RestaurantCard(
                    restaurant = restaurant,
                    onClick = {
                        onRestaurantClick(restaurant)
                    },
                    modifier = Modifier.padding(
                        horizontal = 16.dp,
                        vertical = 8.dp
                    )
                )
            }

            // Bottom Navigation Bar if required
            item {
                Spacer(modifier = Modifier.height(100.dp))
            }
        }
    }

}

/**
 * TopBar - Matches iOS headerSection exactly
 * Shows: Deliver to + location name + street address + notification + profile
 */
@Composable
fun TopBar(
    onProfileClick: () -> Unit,
    onLocationClick: () -> Unit,
    onNotificationsClick: () -> Unit = {},
    profileImageUri: Uri?,
    addressLine1: String? = null,
    streetAddress: String? = null  // NEW: Street address like iOS
) {

    var isSheetOpen by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val locationName = addressLine1 ?: "Select Address"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {

        // Location - iOS style with "Deliver to" label + street address
        Column(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onLocationClick)
        ) {
            // "Deliver to" caption - iOS .caption
            Text(
                text = "Deliver to",
                fontSize = 12.sp,
                color = Color.Gray
            )
            // Location name with chevron - iOS .headline .bold
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = locationName,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    imageVector = Icons.Default.KeyboardArrowDown,
                    contentDescription = "Change Location",
                    modifier = Modifier.size(12.dp),
                    tint = Color.Black
                )
            }
            // Street address - iOS shows this below location name
            if (streetAddress != null) {
                Text(
                    text = streetAddress,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Right side icons - matching iOS
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Notification Bell - iOS parity
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onNotificationsClick),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Notifications,
                    contentDescription = "Notifications",
                    modifier = Modifier.size(24.dp),
                    tint = Color.Black
                )
                // Notification badge dot
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 2.dp, y = (-2).dp)
                        .size(8.dp)
                        .background(Color.Red, CircleShape)
                )
            }

            // Profile Icon - matching iOS green style
            IconButton(
                onClick = onProfileClick,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(BrandGreen)
            ) {
                if (profileImageUri != null) {
                    AsyncImage(
                        model = profileImageUri,
                        contentDescription = "Profile Image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        error = painterResource(id = R.drawable.ic_person_placeholder),
                        placeholder = painterResource(id = R.drawable.ic_person_placeholder)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Outlined.Person,
                        contentDescription = "Profile",
                        tint = Color.White
                    )
                }
            }
        }
    }

    LocationBottomSheet(
        isOpen = isSheetOpen,
        onDismissRequest = { isSheetOpen = false },
        onItemClick = {
            // Handle item clicks and close the sheet
            isSheetOpen = false
            // You can add navigation/logic based on the item clicked here
        }
    )
}

@Composable
fun SearchBar(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onSearchClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }

    LaunchedEffect(interactionSource) {
        interactionSource.interactions.collect { interaction ->
            if (interaction is PressInteraction.Release) {
                onSearchClick() // Call the navigation callback
            }
        }
    }

    OutlinedTextField(
        value = searchQuery,
        onValueChange = onSearchQueryChange,
        singleLine = true,
        maxLines = 1,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        placeholder = {
            Text(
                text = "Search restaurants or dishes...",
                color = Color.Gray,
                fontSize = 14.sp
            )
        },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = Color.Gray
            )
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Color(0xFFF5F5F5),
            unfocusedContainerColor = Color(0xFFF5F5F5),
            disabledContainerColor = Color(0xFFF5F5F5),
            focusedBorderColor = Color.Transparent,
            unfocusedBorderColor = Color.Transparent,
        ),
        shape = RoundedCornerShape(12.dp),
        readOnly = true,
        interactionSource = interactionSource
    )
}

/**
 * SearchBarWithVoice - Matches iOS search bar exactly
 * Gray filled background with search icon and green mic button
 */
@Composable
fun SearchBarWithVoice(
    onSearchClick: () -> Unit,
    onVoiceClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(
                color = Color(0xFFF2F2F7),  // iOS systemGray6
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onSearchClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Search icon
        Icon(
            imageVector = Icons.Default.Search,
            contentDescription = "Search",
            modifier = Modifier.size(20.dp),
            tint = Color.Gray
        )

        Spacer(modifier = Modifier.width(12.dp))

        // Placeholder text
        Text(
            text = "Search restaurants or dishes...",
            fontSize = 16.sp,
            color = Color.Gray,
            modifier = Modifier.weight(1f)
        )

        // Voice search mic button - iOS style green
        IconButton(
            onClick = onVoiceClick,
            modifier = Modifier.size(32.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Mic,
                contentDescription = "Voice Search",
                modifier = Modifier.size(22.dp),
                tint = BrandGreen
            )
        }
    }
}

@Composable
fun CarouselSection(items: List<CarouselItem>) {
    val pagerState = rememberPagerState(pageCount = { items.size })
    val pagerIsDragged by pagerState.interactionSource.collectIsDraggedAsState()

    val pageInteractionSource = remember { MutableInteractionSource() }
    val pageIsPressed by pageInteractionSource.collectIsPressedAsState()

    // Stop auto-advancing when pager is dragged or one of the pages is pressed
    val autoAdvance = !pagerIsDragged && !pageIsPressed

    if (autoAdvance) {
        LaunchedEffect(pagerState, pageInteractionSource) {
            while (isActive) {
                delay(3000)
                val nextPage = (pagerState.currentPage + 1) % items.size
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 14.dp),
            modifier = Modifier.height(140.dp),
        ) { page ->
            CarouselCard(item = items[page])
        }

        Spacer(modifier = Modifier.height(12.dp))

        PagerIndicator(items.size, pagerState.currentPage)
    }
}

@Composable
fun PagerIndicator(pageCount: Int, currentPageIndex: Int, modifier: Modifier = Modifier) {
    Box(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .wrapContentHeight()
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            repeat(pageCount) { iteration ->
                val color =
                    if (currentPageIndex == iteration) MaterialTheme.colorScheme.primaryContainer else Color.LightGray
                Box(
                    modifier = modifier
                        .padding(2.dp)
                        .clip(CircleShape)
                        .background(color)
                        .size(height = 4.dp, width = 12.dp)
                )
            }
        }
    }
}

@Composable
fun CarouselCard(item: CarouselItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = item.backgroundColor
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = item.title,
                    fontSize = 10.sp,
                    color = Color.Black.copy(alpha = 0.7f)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.subtitle,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.description,
                    fontSize = 11.sp,
                    color = Color.Black.copy(alpha = 0.8f),
                    lineHeight = 14.sp
                )
            }

            // Placeholder for image
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(Color.White.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_logo),
                    contentDescription = "Carousel Image",
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(12.dp))
                )
            }
        }
    }
}

/**
 * CategoriesSection - Compact layout for Android
 */
@Composable
fun CategoriesSection(
    categories: List<Category>,
    onCategoryClick: (Category) -> Unit,
) {
    var selectedCategoryId by remember { mutableStateOf(categories.firstOrNull()?.id ?: 0) }

    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Title
        Text(
            text = "Categories",
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Black,
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .padding(top = 12.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Horizontal scroll with compact spacing
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(categories) { category ->
                val isSelected = category.id == selectedCategoryId

                CategoryItem(
                    category = category,
                    isSelected = isSelected,
                    onClick = {
                        selectedCategoryId = category.id
                        onCategoryClick(category)
                    }
                )
            }
        }
    }
}

/**
 * CategoryItem - Compact design for Android
 */
@Composable
fun CategoryItem(
    category: Category,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable(onClick = onClick)
    ) {
        // Compact circle with emoji
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(
                    color = if (isSelected) BrandGreen else Color(0xFFF2F2F7),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = category.emoji,
                fontSize = 18.sp
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Category name
        Text(
            text = category.name,
            fontSize = 11.sp,
            color = if (isSelected) BrandGreen else Color.Black,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1
        )
    }
}

/**
 * DynamicCategoriesSection - Categories derived from restaurant cuisines like iOS
 * Matches iOS categoriesSection in HomeView.swift
 */
@Composable
fun DynamicCategoriesSection(
    cuisines: List<CuisineCategory>,
    selectedCategory: String?,
    onCategoryClick: (CuisineCategory) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Title - matches iOS .headline
        Text(
            text = "Categories",
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Black,
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .padding(top = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Horizontal scroll - matches iOS ScrollView(.horizontal)
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(cuisines) { cuisine ->
                val isSelected = cuisine.name == selectedCategory

                DynamicCategoryButton(
                    cuisine = cuisine,
                    isSelected = isSelected,
                    onClick = { onCategoryClick(cuisine) }
                )
            }
        }
    }
}

/**
 * DynamicCategoryButton - Matches iOS CategoryButton exactly
 * Circle 60x60, emoji .title, name .caption
 */
@Composable
fun DynamicCategoryButton(
    cuisine: CuisineCategory,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        // Circle with emoji - iOS: 60x60 with systemGray6 background
        Box(
            modifier = Modifier
                .size(60.dp)
                .background(
                    color = if (isSelected) BrandGreen else Color(0xFFF2F2F7), // iOS systemGray6
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = cuisine.emoji,
                fontSize = 28.sp  // iOS .title
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Cuisine name - iOS .caption
        Text(
            text = cuisine.name,
            fontSize = 12.sp,
            color = if (isSelected) BrandGreen else Color.Black,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1
        )
    }
}

/**
 * Service Mode Selector - Toggle between Food Delivery and Rideshare
 * Matches iOS ServiceOptionCard design exactly
 * iOS: Food -> navigates to SearchRestaurantsView
 * iOS: Ride -> navigates to RideRequestView
 */
@Composable
fun ServiceModeSelector(
    onFoodClick: () -> Unit = {},
    onRideshareClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Food Card - CLICKABLE like iOS (navigates to SearchRestaurantsView)
        Card(
            modifier = Modifier
                .weight(1f)
                .clickable { onFoodClick() },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Circular icon background - iOS style
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(
                            color = BrandGreen.copy(alpha = 0.15f),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ShoppingBag,
                        contentDescription = "Food",
                        modifier = Modifier.size(24.dp),
                        tint = BrandGreen
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Food",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Text(
                    text = "Order delivery",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }
        }

        // Ride Card - matches iOS exactly
        Card(
            modifier = Modifier
                .weight(1f)
                .clickable { onRideshareClick() },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Circular icon background - iOS style (blue for ride)
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(
                            color = BrandBlue.copy(alpha = 0.15f),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.DirectionsCar,
                        contentDescription = "Ride",
                        modifier = Modifier.size(24.dp),
                        tint = BrandBlue
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Ride",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Text(
                    text = "Get picked up",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

/**
 * ActiveOrderTrackerCard - Matches iOS activeOrderTracker exactly
 * Floating card at bottom with bicycle icon, ETA, and TRACK button
 */
@Composable
fun ActiveOrderTrackerCard(
    eta: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 100.dp)  // Space for bottom nav
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Animated delivery icon - iOS style
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        color = BrandGreen.copy(alpha = 0.2f),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.DirectionsBike,
                    contentDescription = "Delivery",
                    modifier = Modifier.size(24.dp),
                    tint = BrandGreen
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Order status text
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "Your order is on its way!",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Text(
                    text = "Est. arrival: $eta mins",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            // TRACK button - iOS style
            Box(
                modifier = Modifier
                    .background(
                        color = BrandGreen,
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "TRACK",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun TopBarPreview() {
    TopBar(
        onProfileClick = {},
        onLocationClick = {},
        onNotificationsClick = {},
        profileImageUri = null
    )
}