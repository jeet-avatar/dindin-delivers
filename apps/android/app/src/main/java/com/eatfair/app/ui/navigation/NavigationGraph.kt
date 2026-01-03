package com.eatfair.app.ui.navigation

import android.app.Activity
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navigation
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.eatfair.shared.model.address.LocationData
import com.eatfair.app.ui.address.AddAddressDetailsScreen
import com.eatfair.app.ui.address.LocationMapScreen
import com.eatfair.app.ui.address.LocationViewModel
import com.eatfair.app.ui.address.SavedAddressesScreen
import com.eatfair.app.ui.auth.AuthState
import com.eatfair.app.ui.auth.AuthViewModel
import com.eatfair.app.ui.auth.ForgotPasswordScreen
import com.eatfair.app.ui.auth.LoginScreen
import com.eatfair.app.ui.auth.RegisterScreen
import com.eatfair.app.ui.auth.ResetCodeEntryScreen
import com.eatfair.app.ui.auth.LegalAcceptanceScreen
import com.eatfair.app.ui.cart.CartScreen
import com.eatfair.app.ui.cart.CartViewModel
import com.eatfair.app.ui.home.HomeScreen
import com.eatfair.app.ui.home.HomeViewModel
import com.eatfair.app.ui.notification.NotificationScreen
import com.eatfair.app.ui.notification.NotificationViewModel
import com.eatfair.app.ui.order.MyOrdersScreen
import com.eatfair.app.ui.order.OrderTrackingScreen
import com.eatfair.app.ui.profile.EditProfileScreen
import com.eatfair.app.ui.profile.PrivacyPolicyScreen
import com.eatfair.app.ui.profile.ProfileScreen
import com.eatfair.app.ui.profile.ProfileViewModel
import com.eatfair.app.ui.profile.SettingsScreen
import com.eatfair.app.ui.profile.TermsConditionsScreen
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.app.ui.refer.ReferAndEarnScreen
import com.eatfair.app.ui.restaurant.RestaurantListScreen
import com.eatfair.app.ui.restaurant.RestaurantScreen
import com.eatfair.app.ui.restaurant.RestaurantViewModel
import com.eatfair.app.ui.rideshare.RideRequestScreen
import com.eatfair.app.ui.search.SearchScreen
import com.eatfair.app.ui.search.SearchViewModel
import com.eatfair.app.ui.help.HelpSupportScreen
import com.eatfair.app.ui.order.OrderSuccessScreen
import com.eatfair.app.ui.order.OrderSuccessData
import com.eatfair.app.ui.main.MainScreen
import com.eatfair.app.ui.deals.DealsScreen

@Composable
fun NavigationGraph(
//    innerPadding: PaddingValues,
    startDestination: String = "auth_flow"
) {
    val context = LocalContext.current

    val authViewModel: AuthViewModel = hiltViewModel()
    val authState = authViewModel.authState.collectAsState().value

    val cartViewModel: CartViewModel = hiltViewModel()
    val profileViewModel: ProfileViewModel = hiltViewModel()
    val homeViewModel: HomeViewModel = hiltViewModel()

    val navController = rememberNavController()

    // Track previous auth state to detect login success
    var previousAuthState by remember { mutableStateOf<AuthState?>(null) }

    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Initial, AuthState.Loading -> {
                // Stay on splash/loading screen while the session check is ongoing
            }

            is AuthState.Authenticated -> {
                // Show success toast only when transitioning from Loading (actual login)
                if (previousAuthState is AuthState.Loading) {
                    android.widget.Toast.makeText(
                        context,
                        "Welcome back! You're now logged in.",
                        android.widget.Toast.LENGTH_SHORT
                    ).show()
                }
                // User logged in: Redirect to Main (with bottom tabs), clearing the back stack
                navController.navigate(Screen.Main.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                    launchSingleTop = true
                }
            }

            AuthState.NeedsLegalAcceptance -> {
                // Navigate to legal acceptance screen
                navController.navigate(Screen.LegalAcceptance.route) {
                    popUpTo(Screen.Login.route) { inclusive = false }
                    launchSingleTop = true
                }
            }

            AuthState.UnAuthenticated -> {
                // User logged out: Redirect to Login, clearing back stack
                navController.navigate(Screen.Login.route) {
                    popUpTo(Screen.Login.route) { inclusive = false }
                    launchSingleTop = true
                }
            }

            is AuthState.Error -> {
                // Stay on login screen - error displayed via authState
            }
        }
        // Update previous state for next comparison
        previousAuthState = authState
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {

        authGraph(navController, authViewModel)

        // Main Screen with Bottom Navigation (5 tabs: Home, Search, Deals, Orders, Profile)
        composable(route = Screen.Main.route) {
            val searchViewModel: SearchViewModel = hiltViewModel()

            MainScreen(
                homeViewModel = homeViewModel,
                cartViewModel = cartViewModel,
                searchViewModel = searchViewModel,
                profileViewModel = profileViewModel,
                onProfileClick = {
                    navController.navigate(Screen.Profile.route)
                },
                onLocationClick = {
                    navController.navigate(Screen.LocationMap.route)
                },
                onRestaurantClick = { restaurant ->
                    navController.navigate(Screen.RestaurantFlow.createRoute(restaurant.id.toString()))
                },
                onViewCartClick = {
                    navController.navigate(Screen.Cart.route)
                },
                onTrackOrderClick = { orderId ->
                    navController.navigate(Screen.OrderTrackingScreen.createRoute(orderId))
                },
                onRideshareClick = {
                    // Navigate directly to RideRequest - matches iOS RideRequestView
                    navController.navigate(Screen.RideRequest.route)
                },
                onOrderHistoryClick = {
                    navController.navigate(Screen.MyOrders.route)
                },
                onEditProfileClick = {
                    navController.navigate(Screen.EditProfile.route)
                },
                onNotificationsClick = {
                    navController.navigate(Screen.Notifications.route)
                },
                onReferAndEarnClick = {
                    navController.navigate(Screen.ReferAndEarn.route)
                },
                onSavedAddressClick = {
                    navController.navigate(Screen.SavedAddressesScreen.route)
                },
                onSettingsClick = {
                    navController.navigate(Screen.Settings.route)
                },
                onHelpSupportClick = {
                    navController.navigate(Screen.HelpSupport.route)
                },
                onPaymentMethodClick = {
                    navController.navigate(Screen.PaymentMethods.route)
                },
                onFavoritesClick = {
                    navController.navigate(Screen.Favorites.route)
                },
                onWhatDriversSeeClick = {
                    navController.navigate(Screen.WhatDriversSee.route)
                },
                onYourPrivacyClick = {
                    navController.navigate(Screen.YourPrivacy.route)
                },
                onSafetyFeaturesClick = {
                    navController.navigate(Screen.SafetyFeatures.route)
                },
                onDeleteAccountClick = {
                    // Call delete account API - matches Settings screen behavior
                    authViewModel.deleteAccount(
                        onSuccess = {
                            // Account deleted, logout and navigate to welcome
                            authViewModel.logout()
                        },
                        onError = { error ->
                            // Log error but still logout for safety
                            android.util.Log.e("NavigationGraph", "Delete account failed: $error")
                            authViewModel.logout()
                        }
                    )
                },
                onLogoutClick = {
                    authViewModel.logout()
                },
                onSearchResultClick = { result ->
                    navController.navigate(Screen.RestaurantFlow.createRoute(result.id.toString()))
                },
                onDealRestaurantClick = { restaurantId ->
                    navController.navigate(Screen.RestaurantFlow.createRoute(restaurantId.toString()))
                }
            )
        }

        composable(route = Screen.Home.route) {
            HomeScreen(
                homeViewModel = homeViewModel,
                cartViewModel = cartViewModel,
                onProfileClick = {
                    navController.navigate(Screen.Profile.route)
                },
                onLocationClick = {
                    navController.navigate(Screen.LocationMap.route)
                },
                onSearchClick = { navController.navigate(Screen.Search.route) },
                onCategoryClick = {},
                onFoodItemClick = {},
                onRestaurantClick = {
                    navController.navigate(Screen.RestaurantFlow.createRoute(it.id.toString()))
                },
                onViewCartClick = {
                    navController.navigate(Screen.Cart.route)
                },
                onTrackOrderClick = { orderId ->
                    navController.navigate(Screen.OrderTrackingScreen.createRoute(orderId))
                },
                onRideshareClick = {
                    // Navigate directly to RideRequest - matches iOS RideRequestView
                    navController.navigate(Screen.RideRequest.route)
                }
            )
        }

        composable(route = Screen.Search.route) {
            val searchViewModel: SearchViewModel = hiltViewModel()

            SearchScreen(
                searchViewModel = searchViewModel,
                onBackClick = { navController.navigateUp() },
                onRecentSearchClick = { search ->
                    searchViewModel.searchByTerm(search)
                },
                onCuisineClick = { cuisine ->
                    searchViewModel.searchByTerm(cuisine)
                },
                onSearchResultClick = { result ->
                    navController.navigate(Screen.RestaurantFlow.createRoute(result.id.toString()))
                }
            )
        }

        composable(route = Screen.Cart.route) { backStackEntry ->

            val selectedRestaurant by cartViewModel.cartRestaurant.collectAsState()

            selectedRestaurant?.let { restaurant ->
                CartScreen(
                    cartViewModel = cartViewModel,
                    onBackClick = { navController.navigateUp() },
                    onAddMoreItems = {
                        //check if can go back to restaurant screen
                        navController.navigate(Screen.Restaurant.route) {
                            popUpTo(Screen.Restaurant.route) {
                                inclusive = true
                            }
                        }

                    },
                    onPlaceOrderSuccess = { newOrder ->
                        navController.navigate(Screen.OrderTrackingScreen.createRoute(newOrder.orderId)) {
                            popUpTo(Screen.Main.route) {
                                inclusive = false
                            }
                        }
                    },
                )
            }
        }

        composable(Screen.OrderTrackingScreen.route) { backStackEntry ->

            val orderId = backStackEntry.arguments?.getString("orderId")

            OrderTrackingScreen(
                cartViewModel = cartViewModel,
                onBackClick = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Main.route) {
                            inclusive = true
                        }
                    }
                },
                onCallPartner = {
                    // Make phone call
                },
                onAddInstructions = {
                    // Show instruction dialog
                },
            )
        }

        // Order Success Screen - Shown after successful order placement
        composable(
            route = Screen.OrderSuccess.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType; defaultValue = "" },
                navArgument("restaurantName") { type = NavType.StringType; defaultValue = "" },
                navArgument("totalAmount") { type = NavType.FloatType; defaultValue = 0f },
                navArgument("itemCount") { type = NavType.IntType; defaultValue = 0 }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            val restaurantName = backStackEntry.arguments?.getString("restaurantName") ?: ""
            val totalAmount = backStackEntry.arguments?.getFloat("totalAmount")?.toDouble() ?: 0.0
            val itemCount = backStackEntry.arguments?.getInt("itemCount") ?: 0

            OrderSuccessScreen(
                orderData = OrderSuccessData(
                    orderId = orderId,
                    restaurantName = restaurantName,
                    totalAmount = totalAmount,
                    estimatedDelivery = "25-35 min",
                    itemCount = itemCount
                ),
                onTrackOrder = {
                    navController.navigate(Screen.OrderTrackingScreen.createRoute(orderId)) {
                        popUpTo(Screen.Main.route) { inclusive = false }
                    }
                },
                onContinueShopping = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Main.route) { inclusive = true }
                    }
                },
                onRateExperience = {
                    // Navigate to rate screen (can be implemented later)
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Main.route) { inclusive = true }
                    }
                }
            )
        }

        addressGraph(navController)

        restaurantGraph(navController, cartViewModel)

        rideshareGraph(navController)

        profileGraph(navController, authViewModel, profileViewModel)
    }
}

fun NavGraphBuilder.authGraph(navController: NavHostController, authViewModel: AuthViewModel) {
    navigation(
        startDestination = Screen.Login.route,  // Skip WelcomeScreen, go directly to Login
        route = "auth_flow"
    ) {
        // WelcomeScreen removed - users go directly to LoginScreen with Apple/Google sign-in

        composable(route = Screen.SignUp.route) {
            RegisterScreen(
                onJoinClick = { email, password, name, phone, zipCode ->
                    // Handle sign up logic
                    // For now, navigate to login or main screen
                    // You can pass data to ViewModel here
                    Log.d("NavigationGraph", "Sign Up: $email, $name, $phone, $zipCode")

                    // After successful signup, navigate to login or main screen
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Login.route) {
                            inclusive = false
                        }
                    }
                },
                onLoginClick = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Login.route) {
                            inclusive = false
                        }
                    }
                }
            )
        }

        composable(route = Screen.Login.route) {
            val context = LocalContext.current
            val activity = context as? Activity

            // Google Sign-In configuration
            // Web Client ID is configured in local.properties: GOOGLE_WEB_CLIENT_ID=...
            val webClientId = com.eatfair.app.BuildConfig.GOOGLE_WEB_CLIENT_ID
            val isGoogleSignInConfigured = webClientId.isNotEmpty()

            // Only create GoogleSignInClient if Web Client ID is configured
            val googleSignInClient = remember(webClientId) {
                if (isGoogleSignInConfigured) {
                    val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(webClientId)
                        .requestEmail()
                        .build()
                    GoogleSignIn.getClient(context, gso)
                } else {
                    null
                }
            }

            // Google Sign-In launcher
            val googleSignInLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.StartActivityForResult()
            ) { result ->
                if (result.resultCode == Activity.RESULT_OK) {
                    val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                    try {
                        val account = task.getResult(ApiException::class.java)
                        val idToken = account?.idToken
                        val email = account?.email ?: ""
                        val name = account?.displayName ?: ""

                        if (idToken != null) {
                            Log.d("NavigationGraph", "Google Sign In success: $email")
                            authViewModel.googleSignIn(idToken, email, name)
                        } else {
                            Log.e("NavigationGraph", "Google Sign In: No ID token received")
                            android.widget.Toast.makeText(context, "Sign in failed: No token received", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: ApiException) {
                        Log.e("NavigationGraph", "Google Sign In failed: ${e.statusCode}", e)
                        android.widget.Toast.makeText(context, "Sign in failed: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Log.d("NavigationGraph", "Google Sign In cancelled")
                }
            }

            val currentAuthState by authViewModel.authState.collectAsState()
            val isLoading = currentAuthState is AuthState.Loading
            val errorMessage = (currentAuthState as? AuthState.Error)?.message

            // Track if signup was just completed to show success toast
            var justSignedUp by remember { mutableStateOf(false) }

            // Show success toast when signup completes
            LaunchedEffect(currentAuthState) {
                if (justSignedUp && currentAuthState is AuthState.NeedsLegalAcceptance) {
                    android.widget.Toast.makeText(
                        context,
                        "Account created successfully! Welcome to Dollor.ai",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                    justSignedUp = false
                }
            }

            LoginScreen(
                onLoginClick = { email, password ->
                    // Handle login logic
                    Log.d("NavigationGraph", "Login: $email")
                    authViewModel.login(email, password)
                },
                onSignUpClick = { email, password, fullName, phone ->
                    // Handle sign up logic
                    Log.d("NavigationGraph", "SignUp: $email, $fullName")
                    justSignedUp = true
                    authViewModel.signUp(email, password, fullName, phone, "")
                },
                isLoading = isLoading,
                errorMessage = errorMessage,
                onGoogleSignInClick = {
                    if (googleSignInClient != null) {
                        // Launch Google Sign-In
                        Log.d("NavigationGraph", "Starting Google Sign In")
                        googleSignInLauncher.launch(googleSignInClient.signInIntent)
                    } else {
                        // Google Sign-In not configured
                        Log.w("NavigationGraph", "Google Sign-In not configured: Missing GOOGLE_WEB_CLIENT_ID")
                        android.widget.Toast.makeText(context, "Google Sign-In coming soon!", android.widget.Toast.LENGTH_SHORT).show()
                    }
                },
                onForgotPasswordClick = {
                    Log.d("NavigationGraph", "Navigating to Forgot Password")
                    navController.navigate(Screen.ForgotPassword.route)
                },
                onTermsClick = {
                    navController.navigate(Screen.TermsConditions.route)
                },
                onPrivacyClick = {
                    navController.navigate(Screen.PrivacyPolicy.route)
                }
            )
        }

        composable(route = Screen.LegalAcceptance.route) {
            LegalAcceptanceScreen(
                onAccept = {
                    authViewModel.acceptTermsAndPrivacy()
                }
            )
        }

        // Forgot Password Screen - Matches iOS ForgotPasswordView
        composable(route = Screen.ForgotPassword.route) {
            val isLoading by authViewModel.isLoadingState.collectAsState()
            val errorMessage by authViewModel.errorMessageState.collectAsState()

            ForgotPasswordScreen(
                onSendCodeClick = { email ->
                    authViewModel.requestPasswordReset(email) { success ->
                        if (success) {
                            navController.navigate(Screen.ResetCodeEntry.createRoute(email))
                        }
                    }
                },
                onCancelClick = {
                    navController.navigateUp()
                },
                isLoading = isLoading,
                errorMessage = errorMessage
            )
        }

        // Reset Code Entry Screen - Matches iOS ResetCodeEntryView
        composable(
            route = Screen.ResetCodeEntry.route,
            arguments = listOf(
                navArgument("email") { type = NavType.StringType; defaultValue = "" }
            )
        ) { backStackEntry ->
            val email = backStackEntry.arguments?.getString("email") ?: ""
            val isLoading by authViewModel.isLoadingState.collectAsState()
            val errorMessage by authViewModel.errorMessageState.collectAsState()

            ResetCodeEntryScreen(
                email = email,
                onResetPasswordClick = { code, newPassword ->
                    authViewModel.confirmPasswordReset(email, code, newPassword) { success ->
                        if (success) {
                            android.widget.Toast.makeText(
                                navController.context,
                                "Password reset successfully! Please login.",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                            navController.navigate(Screen.Login.route) {
                                popUpTo(Screen.Login.route) { inclusive = false }
                            }
                        }
                    }
                },
                onCancelClick = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Login.route) { inclusive = false }
                    }
                },
                isLoading = isLoading,
                errorMessage = errorMessage
            )
        }

    }
}

fun NavGraphBuilder.addressGraph(navController: NavHostController) {
    navigation(
        startDestination = Screen.LocationMap.route,
        route = "address_flow"
    ) {

        composable(route = Screen.LocationMap.route) { backStackEntry ->

            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry("address_flow")
            }

            val locationViewModel: LocationViewModel = hiltViewModel(parentEntry)

            LocationMapScreen(
                locationViewModel = locationViewModel,
                onBackClick = { navController.navigateUp() },
                onConfirmLocation = { locationData ->
                    navController.currentBackStackEntry?.savedStateHandle?.set(
                        "location", locationData
                    )
                    navController.navigate(Screen.AddAddressDetailsScreen.route)
                }
            )
        }

        composable(route = Screen.AddAddressDetailsScreen.route) { backStackEntry ->

            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry("address_flow")
            }

            val locationViewModel: LocationViewModel = hiltViewModel(parentEntry)

            val location = navController.previousBackStackEntry
                ?.savedStateHandle?.get<LocationData>("location")

            val addressIdToEdit =
                backStackEntry.arguments?.getString("addressId")?.toIntOrNull() ?: 0

            if (location != null || addressIdToEdit != 0) {
                AddAddressDetailsScreen(
                    location = location,
                    addressId = addressIdToEdit,
                    locationViewModel = locationViewModel,
                    onBackClick = { navController.navigateUp() },
                    onSaveAddress = {
                        navController.navigateUp()
                    }
                )
            }
        }

        composable(route = Screen.SavedAddressesScreen.route) { backStackEntry ->

            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry("address_flow")
            }

            val locationViewModel: LocationViewModel = hiltViewModel(parentEntry)

            SavedAddressesScreen(
                locationViewModel = locationViewModel,
                onBackClick = { navController.navigateUp() },
                onAddAddressClick = {
                    navController.navigate(Screen.LocationMap.route)
                },
                onEditAddress = { addressDto ->
                    navController.navigate(
                        Screen.AddAddressDetailsScreen.createRoute(addressDto.id)
                    )
                },
            )
        }
    }
}

fun NavGraphBuilder.profileGraph(
    navController: NavHostController,
    authViewModel: AuthViewModel,
    profileViewModel: ProfileViewModel,
    dollorRepository: DollorRepository? = null
) {
    navigation(
        startDestination = Screen.Login.route,
        route = "profile_flow"
    ) {
        composable(route = Screen.Profile.route) {
            ProfileScreen(
                profileViewModel = profileViewModel,
                onBackClick = { navController.navigateUp() },
                onOrderHistoryClick = { navController.navigate(Screen.MyOrders.route) },
                onEditProfileClick = { navController.navigate(Screen.EditProfile.route) },
                onNotificationsClick = { navController.navigate(Screen.Notifications.route) },
                onReferAndEarnClick = { navController.navigate(Screen.ReferAndEarn.route) },
                onSavedAddressClick = { navController.navigate(Screen.SavedAddressesScreen.route) },
                onSettingsClick = { navController.navigate(Screen.Settings.route) },
                onPaymentMethodClick = { navController.navigate(Screen.PaymentMethods.route) },
                onFavoritesClick = { navController.navigate(Screen.Favorites.route) },
                onHelpSupportClick = { navController.navigate(Screen.HelpSupport.route) },
                onWhatDriversSeeClick = { navController.navigate(Screen.WhatDriversSee.route) },
                onYourPrivacyClick = { navController.navigate(Screen.YourPrivacy.route) },
                onSafetyFeaturesClick = { navController.navigate(Screen.SafetyFeatures.route) },
                onDeleteAccountClick = {
                    // Delete account handled in ProfileScreen dialog, then logout
                    authViewModel.deleteAccount(
                        onSuccess = { authViewModel.logout() },
                        onError = { /* Error already shown in ProfileScreen */ }
                    )
                },
                onLogoutClick = { authViewModel.logout() }
            )
        }

        composable(route = Screen.MyOrders.route) {
            MyOrdersScreen(
                onBackClick = { navController.navigateUp() },
                onCartClick = { navController.navigate("cart") },
                onStartOrderingClick = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Main.route) {
                            inclusive = true
                        }
                    }
                },
                onLoginRequired = {
                    // Token expired - navigate to login screen
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.EditProfile.route) {
            EditProfileScreen(
//                userName = userViewModel.userName,
//                userEmail = userViewModel.userEmail,
                onBackClick = { navController.navigateUp() },
                onSaveClick = { name, email, phone, address ->
//                    userViewModel.updateProfile(name, email, phone, address)
                    navController.navigateUp()
                }
            )
        }

        composable(Screen.Notifications.route) {
            val notificationViewModel: NotificationViewModel = hiltViewModel()
            val notifications by notificationViewModel.notifications.collectAsState()

            NotificationScreen(
                notifications = notifications,
                onBackClick = { navController.navigateUp() },
                onNotificationClick = { notification ->
                    // Mark as read
                    notificationViewModel.markAsRead(notification.id)
                },
                onClearAllClick = {
                    // Clear all notifications via API
                    notificationViewModel.clearAllNotifications()
                }
            )
        }

        composable(Screen.ReferAndEarn.route) {
            ReferAndEarnScreen(
                onBackClick = { navController.navigateUp() },
                onShareClick = {
                    // Share via system share sheet
                },
                onCopyCodeClick = {
                    // Copy to clipboard
                }
            )
        }

        // Settings Screen - Required for Google Play Store compliance
        composable(Screen.Settings.route) {
            SettingsScreen(
                onBackClick = { navController.navigateUp() },
                onPrivacyPolicyClick = { navController.navigate(Screen.PrivacyPolicy.route) },
                onTermsClick = { navController.navigate(Screen.TermsConditions.route) },
                onDeleteAccount = { onSuccess, onError ->
                    authViewModel.deleteAccount(onSuccess, onError)
                },
                onAccountDeleted = {
                    // Navigate back to welcome screen after account deletion
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // Privacy Policy Screen
        composable(Screen.PrivacyPolicy.route) {
            PrivacyPolicyScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Terms & Conditions Screen
        composable(Screen.TermsConditions.route) {
            TermsConditionsScreen(
                onBackClick = { navController.navigateUp() }
            )
        }

        // Help & Support Screen
        composable(Screen.HelpSupport.route) {
            HelpSupportScreen(
                onBackClick = { navController.navigateUp() },
                onContactSupport = {
                    // Handle email support
                },
                onChatWithUs = {
                    // Handle chat support
                },
                onCallSupport = {
                    // Handle phone support
                }
            )
        }

        // Favorites Screen
        composable(Screen.Favorites.route) {
            com.eatfair.app.ui.favorites.FavoritesScreen(
                onBackClick = { navController.navigateUp() },
                onRestaurantClick = { restaurantId ->
                    navController.navigate(Screen.RestaurantFlow.createRoute(restaurantId.toString()))
                }
            )
        }

        // Payment Methods Screen
        composable(Screen.PaymentMethods.route) {
            com.eatfair.app.ui.payment.PaymentMethodsScreen(
                onBackClick = { navController.navigateUp() },
                onAddCardClick = { /* TODO: Navigate to add card screen */ }
            )
        }

        // Privacy & Safety Screens - Uber Eats style transparency
        composable(Screen.WhatDriversSee.route) {
            com.eatfair.app.ui.privacy.WhatDriversSeePage(
                onBackClick = { navController.navigateUp() }
            )
        }

        composable(Screen.YourPrivacy.route) {
            com.eatfair.app.ui.privacy.YourPrivacyPage(
                onBackClick = { navController.navigateUp() }
            )
        }

        composable(Screen.SafetyFeatures.route) {
            com.eatfair.app.ui.privacy.SafetyFeaturesPage(
                onBackClick = { navController.navigateUp() }
            )
        }
    }
}

fun NavGraphBuilder.restaurantGraph(
    navController: NavHostController,
    cartViewModel: CartViewModel
) {
    val restaurantGraphRoute = "restaurant_flow?restaurantId={restaurantId}"
    navigation(
        startDestination = Screen.RestaurantList.route,
        route = restaurantGraphRoute
    ) {

        composable(route = Screen.RestaurantList.route) { backStackEntry ->

            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry(restaurantGraphRoute)
            }
            val restaurantViewModel: RestaurantViewModel = hiltViewModel(parentEntry)

            RestaurantListScreen(
                restaurantViewModel = restaurantViewModel,
                onBackClick = { navController.navigateUp() },
                onRestaurantClick = { restaurant ->
                    restaurantViewModel.selectRestaurant(restaurant)
                    navController.navigate(Screen.Restaurant.route)
                }
            )
        }

        composable(
            route = Screen.Restaurant.route,
            arguments = listOf(navArgument("restaurantId") {
                type = NavType.StringType
                defaultValue = ""
                nullable = true
            })
        ) { backStackEntry ->

            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry(restaurantGraphRoute)
            }
            val restaurantViewModel: RestaurantViewModel = hiltViewModel(parentEntry)

            RestaurantScreen(
                restaurantViewModel = restaurantViewModel,
                cartViewModel = cartViewModel,
                onBackClick = { navController.navigateUp() },
                onViewCart = {
                    navController.navigate(Screen.Cart.route)
                }
            )
        }
    }
}

fun NavGraphBuilder.rideshareGraph(navController: NavHostController) {
    navigation(
        // Start directly at RideRequest - matches iOS RideRequestView
        startDestination = Screen.RideRequest.route,
        route = "rideshare_flow"
    ) {
        // Ride Request - Request a ride with P2P bidding (START DESTINATION - matches iOS)
        composable(route = Screen.RideRequest.route) {
            com.eatfair.app.ui.rideshare.RideRequestScreen(
                onBackClick = { navController.navigateUp() },
                onNavigateToActiveRide = { rideRequestId ->
                    // Navigate to ride tracking
                },
                onNavigateToChat = { rideRequestId, driverName ->
                    navController.navigate(Screen.DriverChat.createRoute(rideRequestId, driverName))
                }
            )
        }

        // Driver Chat - Chat with driver during active ride
        composable(
            route = Screen.DriverChat.route,
            arguments = listOf(
                navArgument("rideRequestId") { type = NavType.IntType },
                navArgument("driverName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val rideRequestId = backStackEntry.arguments?.getInt("rideRequestId") ?: 0
            val driverName = backStackEntry.arguments?.getString("driverName") ?: "Driver"
            val decodedName = java.net.URLDecoder.decode(driverName, "UTF-8")

            com.eatfair.app.ui.rideshare.DriverChatScreen(
                rideRequestId = rideRequestId,
                driverName = decodedName,
                onNavigateBack = { navController.navigateUp() }
            )
        }
    }
}

