package com.eatfair.driver.ui.navigation

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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.eatfair.driver.ui.auth.LoginScreen
import com.eatfair.driver.ui.compliance.BackgroundCheckConsentScreen
import com.eatfair.driver.ui.compliance.IndependentContractorAgreementScreen
import com.eatfair.driver.ui.compliance.InsuranceDisclosureScreen
import com.eatfair.driver.ui.compliance.VehicleRequirementsScreen
import com.eatfair.driver.ui.earnings.EarningsScreen
import com.eatfair.driver.ui.home.DriverHomeScreen
import com.eatfair.driver.ui.orders.AvailableOrdersScreen
import com.eatfair.driver.ui.profile.ProfileScreen
import com.eatfair.shared.ui.LegalAcceptanceScreen

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
    navController: NavHostController = rememberNavController()
) {
    // Track login and onboarding state
    var onboardingStep by rememberSaveable { mutableStateOf(OnboardingStep.LOGIN) }

    when (onboardingStep) {
        OnboardingStep.LOGIN -> {
            LoginScreen(
                onLoginSuccess = {
                    onboardingStep = OnboardingStep.LEGAL_ACCEPTANCE
                }
            )
        }

        OnboardingStep.LEGAL_ACCEPTANCE -> {
            LegalAcceptanceScreen(
                userType = "Driver",
                onAccept = {
                    onboardingStep = OnboardingStep.INSURANCE_DISCLOSURE
                }
            )
        }

        OnboardingStep.INSURANCE_DISCLOSURE -> {
            InsuranceDisclosureScreen(
                onContinue = {
                    onboardingStep = OnboardingStep.BACKGROUND_CHECK
                },
                onBackClick = {
                    onboardingStep = OnboardingStep.LEGAL_ACCEPTANCE
                }
            )
        }

        OnboardingStep.BACKGROUND_CHECK -> {
            BackgroundCheckConsentScreen(
                onContinue = {
                    onboardingStep = OnboardingStep.VEHICLE_REQUIREMENTS
                },
                onBackClick = {
                    onboardingStep = OnboardingStep.INSURANCE_DISCLOSURE
                }
            )
        }

        OnboardingStep.VEHICLE_REQUIREMENTS -> {
            VehicleRequirementsScreen(
                onContinue = {
                    onboardingStep = OnboardingStep.INDEPENDENT_CONTRACTOR
                },
                onBackClick = {
                    onboardingStep = OnboardingStep.BACKGROUND_CHECK
                }
            )
        }

        OnboardingStep.INDEPENDENT_CONTRACTOR -> {
            IndependentContractorAgreementScreen(
                onAccept = {
                    onboardingStep = OnboardingStep.COMPLETED
                },
                onBackClick = {
                    onboardingStep = OnboardingStep.VEHICLE_REQUIREMENTS
                }
            )
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
                        DriverHomeScreen(navController = navController)
                    }
                    composable(DriverScreen.Orders.route) {
                        AvailableOrdersScreen(navController = navController)
                    }
                    composable(DriverScreen.Earnings.route) {
                        EarningsScreen(navController = navController)
                    }
                    composable(DriverScreen.Profile.route) {
                        ProfileScreen(
                            onLogout = {
                                onboardingStep = OnboardingStep.LOGIN
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
