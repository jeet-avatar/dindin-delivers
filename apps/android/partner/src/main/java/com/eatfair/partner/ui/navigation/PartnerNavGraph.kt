package com.eatfair.partner.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.eatfair.partner.ui.auth.AuthState
import com.eatfair.partner.ui.auth.AuthViewModel
import com.eatfair.partner.ui.auth.LoginScreen
import com.eatfair.partner.ui.main.MainScreen
import com.eatfair.partner.ui.orders.OrdersScreen
import com.eatfair.partner.ui.orders.OrderDetailsScreen
import com.eatfair.partner.ui.menu.MenuScreen
import com.eatfair.partner.ui.promotions.PromotionsScreen
import com.eatfair.partner.ui.delivery.DeliveryMapScreen
import com.eatfair.partner.ui.earnings.EarningsScreen
import com.eatfair.partner.ui.profile.ProfileScreen
import com.eatfair.partner.ui.settings.RestaurantSettingsScreen
import com.eatfair.partner.ui.settings.EditProfileScreen
import com.eatfair.partner.ui.settings.BusinessHoursScreen
import com.eatfair.partner.ui.settings.PaymentSettingsScreen
import com.eatfair.partner.ui.settings.NotificationSettingsScreen
import com.eatfair.partner.ui.settings.DocumentsScreen
import com.eatfair.partner.ui.auth.RegistrationScreen
import com.eatfair.partner.ui.rideshare.RideshareDashboardScreen
import com.eatfair.partner.ui.rideshare.ActiveRideScreen
import com.eatfair.partner.ui.rideshare.RiderChatScreen
import com.eatfair.partner.ui.rideshare.RideshareViewModel
import com.eatfair.shared.model.rideshare.RideBid
import com.google.gson.Gson

sealed class PartnerScreen(val route: String) {
    data object Main : PartnerScreen("main")
    data object Login : PartnerScreen("login")
    data object Registration : PartnerScreen("registration")
    data object OrderDetails : PartnerScreen("order_details/{orderId}") {
        fun createRoute(orderId: String) = "order_details/$orderId"
    }
    data object EditProfile : PartnerScreen("edit_profile")
    data object BusinessHours : PartnerScreen("business_hours")
    data object PaymentSettings : PartnerScreen("payment_settings")
    data object NotificationSettings : PartnerScreen("notification_settings")
    data object Documents : PartnerScreen("documents")

    // Rideshare screens
    data object Rideshare : PartnerScreen("rideshare")
    data object ActiveRide : PartnerScreen("active_ride/{bidJson}") {
        fun createRoute(bidJson: String) = "active_ride/${java.net.URLEncoder.encode(bidJson, "UTF-8")}"
    }
    data object RiderChat : PartnerScreen("rider_chat/{rideRequestId}/{riderName}") {
        fun createRoute(rideRequestId: Int, riderName: String) =
            "rider_chat/$rideRequestId/${java.net.URLEncoder.encode(riderName, "UTF-8")}"
    }
}

@Composable
fun PartnerNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.authState.collectAsState()

    // Determine start destination based on auth state
    val startDestination = when (authState) {
        is AuthState.Authenticated -> PartnerScreen.Main.route
        is AuthState.UnAuthenticated -> PartnerScreen.Login.route
        else -> PartnerScreen.Login.route
    }

    // Handle auth state changes for navigation
    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.UnAuthenticated -> {
                // Navigate to login and clear back stack
                navController.navigate(PartnerScreen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
            is AuthState.Authenticated -> {
                // Navigate to main if coming from login
                if (navController.currentDestination?.route == PartnerScreen.Login.route) {
                    navController.navigate(PartnerScreen.Main.route) {
                        popUpTo(PartnerScreen.Login.route) { inclusive = true }
                    }
                }
            }
            else -> { /* No navigation needed */ }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        // Login Screen
        composable(PartnerScreen.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate(PartnerScreen.Main.route) {
                        popUpTo(PartnerScreen.Login.route) { inclusive = true }
                    }
                },
                onNeedsLegalAcceptance = {
                    // Handle legal acceptance - for now just proceed to main
                    authViewModel.acceptTermsAndPrivacy()
                },
                onSignUpClick = {
                    navController.navigate(PartnerScreen.Registration.route)
                }
            )
        }

        // Registration Screen (4-step form matching Web and iOS)
        composable(PartnerScreen.Registration.route) {
            RegistrationScreen(
                onRegistrationSuccess = {
                    navController.navigate(PartnerScreen.Main.route) {
                        popUpTo(PartnerScreen.Login.route) { inclusive = true }
                    }
                },
                onBackClick = {
                    navController.navigateUp()
                }
            )
        }

        // Main Screen with 5 tabs: Orders, Rideshare, Map, Earnings, Profile (Staging)
        composable(PartnerScreen.Main.route) {
            MainScreen(
                ordersContent = {
                    OrdersScreen(
                        onBackClick = { /* Already on main screen */ },
                        onOrderClick = { orderId ->
                            navController.navigate(PartnerScreen.OrderDetails.createRoute(orderId.toString()))
                        }
                    )
                },
                rideshareContent = {
                    RideshareDashboardScreen(
                        onNavigateToActiveRide = { bid ->
                            val bidJson = Gson().toJson(bid)
                            navController.navigate(PartnerScreen.ActiveRide.createRoute(bidJson))
                        },
                        onNavigateToChat = { rideRequestId, riderName ->
                            navController.navigate(PartnerScreen.RiderChat.createRoute(rideRequestId, riderName))
                        }
                    )
                },
                mapContent = {
                    DeliveryMapScreen(
                        onBackClick = { /* Already on main screen */ }
                    )
                },
                earningsContent = {
                    EarningsScreen(
                        onBackClick = { /* Already on main screen */ }
                    )
                },
                profileContent = {
                    ProfileScreen(
                        onBackClick = { /* Already on main screen */ },
                        onLogout = {
                            authViewModel.logout()
                        },
                        onDeleteAccount = {
                            // TODO: Implement account deletion
                            authViewModel.logout()
                        }
                    )
                }
            )
        }

        // Order Details
        composable(
            route = PartnerScreen.OrderDetails.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            OrderDetailsScreen(
                orderId = orderId,
                onBackClick = { navController.navigateUp() }
            )
        }

        // Edit Profile
        composable(PartnerScreen.EditProfile.route) {
            EditProfileScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Business Hours
        composable(PartnerScreen.BusinessHours.route) {
            BusinessHoursScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Payment Settings
        composable(PartnerScreen.PaymentSettings.route) {
            PaymentSettingsScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Notification Settings
        composable(PartnerScreen.NotificationSettings.route) {
            NotificationSettingsScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Documents
        composable(PartnerScreen.Documents.route) {
            DocumentsScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Rideshare Dashboard
        composable(PartnerScreen.Rideshare.route) {
            RideshareDashboardScreen(
                onNavigateToActiveRide = { bid ->
                    val bidJson = Gson().toJson(bid)
                    navController.navigate(PartnerScreen.ActiveRide.createRoute(bidJson))
                },
                onNavigateToChat = { rideRequestId, riderName ->
                    navController.navigate(PartnerScreen.RiderChat.createRoute(rideRequestId, riderName))
                }
            )
        }

        // Active Ride Screen
        composable(
            route = PartnerScreen.ActiveRide.route,
            arguments = listOf(
                navArgument("bidJson") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val bidJson = backStackEntry.arguments?.getString("bidJson") ?: ""
            val decodedJson = java.net.URLDecoder.decode(bidJson, "UTF-8")
            val bid = try {
                Gson().fromJson(decodedJson, RideBid::class.java)
            } catch (e: Exception) {
                null
            }

            bid?.let {
                ActiveRideScreen(
                    bid = it,
                    onNavigateToChat = { rideRequestId, riderName ->
                        navController.navigate(PartnerScreen.RiderChat.createRoute(rideRequestId, riderName))
                    },
                    onNavigateBack = { navController.navigateUp() }
                )
            }
        }

        // Rider Chat Screen
        composable(
            route = PartnerScreen.RiderChat.route,
            arguments = listOf(
                navArgument("rideRequestId") { type = NavType.IntType },
                navArgument("riderName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val rideRequestId = backStackEntry.arguments?.getInt("rideRequestId") ?: 0
            val riderName = backStackEntry.arguments?.getString("riderName") ?: "Rider"
            val decodedName = java.net.URLDecoder.decode(riderName, "UTF-8")

            RiderChatScreen(
                rideRequestId = rideRequestId,
                riderName = decodedName,
                onNavigateBack = { navController.navigateUp() }
            )
        }
    }
}
