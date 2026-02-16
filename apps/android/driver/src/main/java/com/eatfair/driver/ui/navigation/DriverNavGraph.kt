package com.eatfair.driver.ui.navigation

import android.app.Activity
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.AttachMoney
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.eatfair.driver.BuildConfig
import com.eatfair.driver.ui.auth.LoginScreen
import com.eatfair.driver.ui.auth.LoginState
import com.eatfair.driver.ui.auth.LoginViewModel
import com.eatfair.driver.ui.compliance.BackgroundCheckConsentScreen
import com.eatfair.driver.ui.compliance.IndependentContractorAgreementScreen
import com.eatfair.driver.ui.compliance.InsuranceDisclosureScreen
import com.eatfair.driver.ui.compliance.VehicleRequirementsScreen
import com.eatfair.driver.ui.earnings.EarningsScreen
import com.eatfair.driver.ui.home.DriverHomeScreen
import com.eatfair.driver.ui.orders.AvailableOrdersScreen
import com.eatfair.driver.ui.profile.ProfileScreen
import com.eatfair.shared.ui.LegalAcceptanceScreen
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

sealed class DriverScreen(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Home : DriverScreen("home", "Home", Icons.Filled.Home, Icons.Outlined.Home)
    object Orders : DriverScreen("orders", "Orders", Icons.Filled.DirectionsCar, Icons.Outlined.DirectionsCar)
    object Earnings : DriverScreen("earnings", "Earnings", Icons.Filled.AttachMoney, Icons.Outlined.AttachMoney)
    object Profile : DriverScreen("profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person)
}

val bottomNavItems = listOf(
    DriverScreen.Home,
    DriverScreen.Orders,
    DriverScreen.Earnings,
    DriverScreen.Profile
)

/**
 * Onboarding steps for driver compliance
 * P2P Matchmaking Platform Requirements:
 * - Legal acceptance (Terms & Privacy)
 * - Insurance disclosure (driver's own coverage)
 * - Background check consent (safety best practice)
 * - Vehicle requirements (quality standards)
 * - Independent contractor agreement (P2P relationship clarity)
 */
enum class OnboardingStep {
    LOGIN,
    LEGAL_ACCEPTANCE,
    INSURANCE_DISCLOSURE,
    BACKGROUND_CHECK,
    VEHICLE_REQUIREMENTS,
    INDEPENDENT_CONTRACTOR,
    COMPLETED
}

@Composable
fun DriverNavGraph(
    navController: NavHostController = rememberNavController(),
    loginViewModel: LoginViewModel = hiltViewModel()
) {
    val loginState by loginViewModel.loginState.collectAsState()
    val context = LocalContext.current

    // Google Sign-In configuration
    val webClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
    val isGoogleSignInConfigured = webClientId.isNotEmpty()

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
                    Log.d("DriverNavGraph", "Google Sign In success: $email")
                    loginViewModel.googleSignIn(idToken, email, name)
                } else {
                    Log.e("DriverNavGraph", "Google Sign In: No ID token received")
                    Toast.makeText(context, "Sign in failed: No token received", Toast.LENGTH_SHORT).show()
                }
            } catch (e: ApiException) {
                Log.e("DriverNavGraph", "Google Sign In failed: ${e.statusCode}", e)
                Toast.makeText(context, "Sign in failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        } else {
            Log.d("DriverNavGraph", "Google Sign In cancelled")
        }
    }

    // Determine which step to show based on login state
    val currentStep = when (loginState) {
        is LoginState.Idle, is LoginState.Loading, is LoginState.Error -> OnboardingStep.LOGIN
        is LoginState.NeedsLegalAcceptance -> OnboardingStep.LEGAL_ACCEPTANCE
        is LoginState.LoggedIn -> OnboardingStep.COMPLETED
    }

    when (currentStep) {
        OnboardingStep.LOGIN -> {
            LoginScreen(
                loginState = loginState,
                onLogin = { email, password ->
                    loginViewModel.login(email, password)
                },
                onGoogleSignInClick = {
                    if (googleSignInClient != null) {
                        Log.d("DriverNavGraph", "Starting Google Sign In")
                        googleSignInLauncher.launch(googleSignInClient.signInIntent)
                    } else {
                        Log.w("DriverNavGraph", "Google Sign-In not configured: Missing GOOGLE_WEB_CLIENT_ID")
                        Toast.makeText(context, "Google Sign-In coming soon!", Toast.LENGTH_SHORT).show()
                    }
                },
                onClearError = { loginViewModel.clearError() }
            )
        }

        OnboardingStep.LEGAL_ACCEPTANCE -> {
            LegalAcceptanceScreen(
                userType = "Driver",
                onAccept = {
                    loginViewModel.acceptTermsAndPrivacy()
                }
            )
        }

        // These onboarding steps are shown linearly after legal acceptance
        // For now, skip straight to COMPLETED since the compliance screens
        // are first-time onboarding only (tracked separately)
        OnboardingStep.INSURANCE_DISCLOSURE,
        OnboardingStep.BACKGROUND_CHECK,
        OnboardingStep.VEHICLE_REQUIREMENTS,
        OnboardingStep.INDEPENDENT_CONTRACTOR -> {
            // Not reached in current flow - kept for future onboarding
        }

        OnboardingStep.COMPLETED -> {
            // Main app with bottom navigation
            Scaffold(
                bottomBar = {
                    DriverBottomNavigation(navController = navController)
                }
            ) { innerPadding ->
                NavHost(
                    navController = navController,
                    startDestination = DriverScreen.Home.route,
                    modifier = Modifier.padding(innerPadding)
                ) {
                    composable(DriverScreen.Home.route) {
                        DriverHomeScreen(
                            navController = navController,
                            driverName = loginViewModel.secureStorage.driverName
                        )
                    }
                    composable(DriverScreen.Orders.route) {
                        AvailableOrdersScreen(navController = navController)
                    }
                    composable(DriverScreen.Earnings.route) {
                        EarningsScreen(navController = navController)
                    }
                    composable(DriverScreen.Profile.route) {
                        ProfileScreen(
                            driverName = loginViewModel.secureStorage.driverName ?: "Driver",
                            driverEmail = loginViewModel.secureStorage.driverEmail ?: "",
                            driverPhone = loginViewModel.secureStorage.driverPhone ?: "",
                            onLogout = { loginViewModel.logout() },
                            onDeleteAccount = { onSuccess, onError ->
                                loginViewModel.deleteAccount(onSuccess, onError)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DriverBottomNavigation(navController: NavHostController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface
    ) {
        bottomNavItems.forEach { screen ->
            val isSelected = currentRoute == screen.route
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = if (isSelected) screen.selectedIcon else screen.unselectedIcon,
                        contentDescription = screen.title
                    )
                },
                label = { Text(screen.title) },
                selected = isSelected,
                onClick = {
                    if (currentRoute != screen.route) {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    }
}
