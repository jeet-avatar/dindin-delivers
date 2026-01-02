package com.eatfair.app.ui.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.cart.CartViewModel
import com.eatfair.app.ui.deals.DealsScreen
import com.eatfair.app.ui.home.HomeScreen
import com.eatfair.app.ui.home.HomeViewModel
import com.eatfair.app.ui.order.MyOrdersScreen
import com.eatfair.app.ui.profile.ProfileScreen
import com.eatfair.app.ui.profile.ProfileViewModel
import com.eatfair.app.ui.search.SearchScreen
import com.eatfair.app.ui.search.SearchViewModel
import com.eatfair.shared.model.FeaturedDeal
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.app.ui.theme.BrandGreen

/**
 * Bottom navigation tab items matching iOS TabView
 * iOS has: Home, Search, Deals, Orders, Profile
 */
data class BottomNavItem(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val route: String
)

val bottomNavItems = listOf(
    BottomNavItem(
        title = "Home",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home,
        route = "home"
    ),
    BottomNavItem(
        title = "Search",
        selectedIcon = Icons.Filled.Search,
        unselectedIcon = Icons.Outlined.Search,
        route = "search"
    ),
    BottomNavItem(
        title = "Deals",
        selectedIcon = Icons.Filled.LocalOffer,
        unselectedIcon = Icons.Outlined.LocalOffer,
        route = "deals"
    ),
    BottomNavItem(
        title = "Orders",
        selectedIcon = Icons.Filled.Receipt,
        unselectedIcon = Icons.Outlined.Receipt,
        route = "orders"
    ),
    BottomNavItem(
        title = "Profile",
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person,
        route = "profile"
    )
)

@Composable
fun MainScreen(
    homeViewModel: HomeViewModel,
    cartViewModel: CartViewModel,
    searchViewModel: SearchViewModel,
    profileViewModel: ProfileViewModel,
    onProfileClick: () -> Unit,
    onLocationClick: () -> Unit,
    onRestaurantClick: (Restaurant) -> Unit,
    onViewCartClick: () -> Unit,
    onTrackOrderClick: (String) -> Unit,
    onRideshareClick: () -> Unit,
    onOrderHistoryClick: () -> Unit,
    onEditProfileClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onReferAndEarnClick: () -> Unit,
    onSavedAddressClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onHelpSupportClick: () -> Unit,
    onPaymentMethodClick: () -> Unit,
    onFavoritesClick: () -> Unit,
    onWhatDriversSeeClick: () -> Unit,
    onYourPrivacyClick: () -> Unit,
    onSafetyFeaturesClick: () -> Unit,
    onDeleteAccountClick: () -> Unit,
    onLogoutClick: () -> Unit,
    onSearchResultClick: (com.eatfair.shared.model.search.SearchResultDto) -> Unit,
    onDealRestaurantClick: (Int) -> Unit
) {
    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                contentColor = BrandGreen
            ) {
                bottomNavItems.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        icon = {
                            Icon(
                                imageVector = if (selectedTabIndex == index) item.selectedIcon else item.unselectedIcon,
                                contentDescription = item.title
                            )
                        },
                        label = {
                            Text(
                                text = item.title,
                                fontSize = 11.sp,
                                fontWeight = if (selectedTabIndex == index) FontWeight.SemiBold else FontWeight.Normal
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandGreen,
                            selectedTextColor = BrandGreen,
                            unselectedIconColor = Color.Gray,
                            unselectedTextColor = Color.Gray,
                            indicatorColor = BrandGreen.copy(alpha = 0.1f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (selectedTabIndex) {
                0 -> {
                    // Home Tab
                    HomeScreen(
                        homeViewModel = homeViewModel,
                        cartViewModel = cartViewModel,
                        onProfileClick = { selectedTabIndex = 4 }, // Switch to Profile tab
                        onLocationClick = onLocationClick,
                        onSearchClick = { selectedTabIndex = 1 }, // Switch to Search tab
                        onCategoryClick = {},
                        onFoodItemClick = {},
                        onRestaurantClick = onRestaurantClick,
                        onViewCartClick = onViewCartClick,
                        onTrackOrderClick = onTrackOrderClick,
                        onRideshareClick = onRideshareClick
                    )
                }
                1 -> {
                    // Search Tab
                    SearchScreen(
                        searchViewModel = searchViewModel,
                        onBackClick = { selectedTabIndex = 0 }, // Go back to Home
                        onRecentSearchClick = { search ->
                            searchViewModel.searchByTerm(search)
                        },
                        onCuisineClick = { cuisine ->
                            searchViewModel.searchByTerm(cuisine)
                        },
                        onSearchResultClick = onSearchResultClick
                    )
                }
                2 -> {
                    // Deals Tab
                    DealsScreen(
                        onBackClick = { selectedTabIndex = 0 }, // Go back to Home
                        onDealClick = { deal ->
                            // Handle deal click - could navigate to restaurant
                            deal.restaurantId?.let { onDealRestaurantClick(it) }
                        },
                        onRestaurantClick = onDealRestaurantClick
                    )
                }
                3 -> {
                    // Orders Tab
                    MyOrdersScreen(
                        onBackClick = { selectedTabIndex = 0 }, // Go back to Home
                        onCartClick = onViewCartClick,
                        onStartOrderingClick = { selectedTabIndex = 0 }, // Go to Home to order
                        onTrackOrderClick = { orderId -> onTrackOrderClick(orderId.toString()) },
                        onRestaurantClick = { vendorId -> onDealRestaurantClick(vendorId) }
                    )
                }
                4 -> {
                    // Profile Tab
                    ProfileScreen(
                        profileViewModel = profileViewModel,
                        onBackClick = { selectedTabIndex = 0 }, // Go back to Home
                        onOrderHistoryClick = { selectedTabIndex = 3 }, // Switch to Orders tab
                        onEditProfileClick = onEditProfileClick,
                        onNotificationsClick = onNotificationsClick,
                        onReferAndEarnClick = onReferAndEarnClick,
                        onSavedAddressClick = onSavedAddressClick,
                        onSettingsClick = onSettingsClick,
                        onPaymentMethodClick = onPaymentMethodClick,
                        onFavoritesClick = onFavoritesClick,
                        onHelpSupportClick = onHelpSupportClick,
                        onWhatDriversSeeClick = onWhatDriversSeeClick,
                        onYourPrivacyClick = onYourPrivacyClick,
                        onSafetyFeaturesClick = onSafetyFeaturesClick,
                        onDeleteAccountClick = onDeleteAccountClick,
                        onLogoutClick = onLogoutClick
                    )
                }
            }
        }
    }
}
