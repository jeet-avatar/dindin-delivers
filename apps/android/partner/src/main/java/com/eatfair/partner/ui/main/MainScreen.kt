package com.eatfair.partner.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.outlined.AttachMoney
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Restaurant
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
import com.eatfair.partner.ui.theme.BrandOrange

// Background color to match iOS
private val BrandGrey = Color(0xFFF5F5F5)

/**
 * Bottom navigation tabs for Restaurant Partner app
 * Matches iOS: Orders, Menu, Promotions, Map, Earnings, Profile
 */
data class BottomNavItem(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val route: String
)

val bottomNavItems = listOf(
    BottomNavItem(
        title = "Orders",
        selectedIcon = Icons.Filled.Receipt,
        unselectedIcon = Icons.Outlined.Receipt,
        route = "orders"
    ),
    BottomNavItem(
        title = "Rideshare",
        selectedIcon = Icons.Filled.DirectionsCar,
        unselectedIcon = Icons.Outlined.DirectionsCar,
        route = "rideshare"
    ),
    BottomNavItem(
        title = "Map",
        selectedIcon = Icons.Filled.Map,
        unselectedIcon = Icons.Outlined.Map,
        route = "map"
    ),
    BottomNavItem(
        title = "Earnings",
        selectedIcon = Icons.Filled.AttachMoney,
        unselectedIcon = Icons.Outlined.AttachMoney,
        route = "earnings"
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
    ordersContent: @Composable () -> Unit,
    rideshareContent: @Composable () -> Unit,
    mapContent: @Composable () -> Unit,
    earningsContent: @Composable () -> Unit,
    profileContent: @Composable () -> Unit
) {
    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }

    Scaffold(
        containerColor = BrandGrey,
        bottomBar = {
            NavigationBar(
                containerColor = Color.White
            ) {
                bottomNavItems.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        icon = {
                            Icon(
                                imageVector = if (selectedTabIndex == index) {
                                    item.selectedIcon
                                } else {
                                    item.unselectedIcon
                                },
                                contentDescription = item.title
                            )
                        },
                        label = {
                            Text(
                                text = item.title,
                                fontSize = 11.sp,
                                fontWeight = if (selectedTabIndex == index) {
                                    FontWeight.Bold
                                } else {
                                    FontWeight.Normal
                                }
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandOrange,
                            selectedTextColor = BrandOrange,
                            unselectedIconColor = Color.Gray,
                            unselectedTextColor = Color.Gray,
                            indicatorColor = BrandOrange.copy(alpha = 0.1f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BrandGrey)
                .padding(innerPadding)
        ) {
            when (selectedTabIndex) {
                0 -> ordersContent()
                1 -> rideshareContent()
                2 -> mapContent()
                3 -> earningsContent()
                4 -> profileContent()
            }
        }
    }
}
