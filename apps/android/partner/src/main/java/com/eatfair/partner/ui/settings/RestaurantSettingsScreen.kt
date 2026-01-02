package com.eatfair.partner.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.shared.config.AppConfig

/**
 * Dollor.ai Restaurant Partner - Settings Screen
 * MATCHES iOS: eatffairrestaurant/Views/RestaurantSettingsView.swift
 *
 * iOS Typography Reference:
 * - .headline = 17sp Bold
 * - .subheadline = 15sp
 * - .body = 17sp
 * - .caption = 12sp
 * - .caption2 = 11sp
 *
 * iOS uses native List with grouped sections
 */

// Brand Colors - Match iOS RestaurantTheme.swift exactly
private val BrandOrange = Color(0xFFF2994A)  // RGB(242, 153, 74)
private val BrandGreen = Color(0xFF06C167)   // RGB(6, 193, 103)
private val BrandBlue = Color(0xFF2196F3)    // RGB(33, 150, 243)
private val BrandPurple = Color(0xFF9C27B0)  // RGB(156, 39, 176)
private val BrandRed = Color(0xFFF44336)     // RGB(244, 67, 54)

// iOS System Colors
private val BackgroundGrouped = Color(0xFFF2F2F7)  // iOS systemGroupedBackground
private val BackgroundSecondary = Color(0xFFFFFFFF)  // iOS secondarySystemBackground (cards)
private val TextPrimary = Color(0xFF000000)
private val TextSecondary = Color(0xFF8E8E93)  // iOS secondary label
private val SeparatorColor = Color(0xFFC6C6C8)  // iOS separator

// iOS Corner Radii
private val CornerRadiusSmall = 8.dp
private val CornerRadiusMedium = 12.dp
private val CornerRadiusLarge = 16.dp

// Legal URLs - Using AppConfig for environment-aware URLs (production)
private val TERMS_URL: String get() = AppConfig.Legal.TERMS_OF_SERVICE_URL
private val PRIVACY_URL: String get() = AppConfig.Legal.PRIVACY_POLICY_URL
private val FAQ_URL: String get() = AppConfig.Legal.SUPPORT_URL  // Reuse support URL for FAQ
private val RESTAURANT_AGREEMENT_URL: String get() = AppConfig.Legal.RESTAURANT_TERMS_URL
private val HELP_CENTER_URL: String get() = AppConfig.Legal.SUPPORT_URL
private const val SUPPORT_EMAIL = "support@dollor.ai"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RestaurantSettingsScreen(
    onBackClick: () -> Unit = {},
    onEditProfile: () -> Unit = {},
    onBusinessHours: () -> Unit = {},
    onPaymentSettings: () -> Unit = {},
    onNotifications: () -> Unit = {},
    onDocuments: () -> Unit = {},
    onSupport: () -> Unit = {},
    onSignOut: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val vendorData = uiState.vendorData

    var showLogoutDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    // Handle sign out success
    LaunchedEffect(uiState.signOutSuccess) {
        if (uiState.signOutSuccess) {
            viewModel.resetSignOutSuccess()
            onSignOut()
        }
    }

    // Handle delete success
    LaunchedEffect(uiState.deleteSuccess) {
        if (uiState.deleteSuccess) {
            viewModel.resetDeleteSuccess()
            onSignOut()
        }
    }

    // Helper function to open URLs
    fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    }

    // Helper function to send email
    fun sendSupportEmail() {
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("mailto:$SUPPORT_EMAIL")
            putExtra(Intent.EXTRA_SUBJECT, "Dollor.ai Partner Support")
        }
        context.startActivity(intent)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundGrouped)
    ) {
        // iOS-style large title header
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = BackgroundGrouped
        ) {
            Text(
                "Settings",
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Restaurant Profile Section
            item {
                SettingsCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Restaurant avatar
                        Box(
                            modifier = Modifier
                                .size(70.dp)
                                .clip(CircleShape)
                                .background(BrandOrange.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Restaurant,
                                contentDescription = null,
                                tint = BrandOrange,
                                modifier = Modifier.size(32.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                vendorData.name.ifEmpty { "My Restaurant" },
                                fontSize = 17.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                vendorData.cuisine.ifEmpty { "Restaurant" },
                                fontSize = 13.sp,
                                color = BrandOrange
                            )
                            Text(
                                vendorData.address.ifEmpty { "Address not set" },
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(if (vendorData.isOnline) BrandGreen else BrandRed)
                                )
                                Text(
                                    if (vendorData.isOnline) "Online" else "Offline",
                                    fontSize = 13.sp,
                                    color = if (vendorData.isOnline) BrandGreen else BrandRed
                                )
                            }
                        }

                        TextButton(onClick = onEditProfile) {
                            Text("Edit", fontSize = 17.sp, color = BrandOrange)
                        }
                    }

                    HorizontalDivider(color = SeparatorColor.copy(alpha = 0.3f), modifier = Modifier.padding(start = 16.dp))

                    // Contact info
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Phone, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(vendorData.phone.ifEmpty { "Phone not set" }, fontSize = 15.sp, color = TextPrimary)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Email, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(vendorData.email.ifEmpty { "Email not set" }, fontSize = 15.sp, color = TextPrimary)
                        }
                    }
                }
            }

            // Quick Actions Section
            item {
                SectionHeader("QUICK ACTIONS")
                SettingsCard {
                    ToggleRow(
                        icon = if (vendorData.isOnline) Icons.Default.CheckCircle else Icons.Default.Cancel,
                        iconColor = if (vendorData.isOnline) BrandGreen else BrandRed,
                        title = "Accept Orders",
                        subtitle = if (vendorData.isOnline) "Your restaurant is visible to customers" else "Customers cannot place orders",
                        checked = vendorData.isOnline,
                        onCheckedChange = { viewModel.updateOnlineStatus(it) },
                        tintColor = BrandGreen
                    )
                    ToggleRow(
                        icon = Icons.Default.DeliveryDining,
                        iconColor = BrandBlue,
                        title = "Delivery Orders",
                        subtitle = "Allow customers to order for delivery",
                        checked = vendorData.acceptingDelivery,
                        onCheckedChange = { viewModel.updateDeliveryStatus(it) },
                        tintColor = BrandBlue
                    )
                    ToggleRow(
                        icon = Icons.Default.ShoppingBag,
                        iconColor = BrandPurple,
                        title = "Pickup Orders",
                        subtitle = "Allow customers to pick up orders",
                        checked = vendorData.acceptingPickup,
                        onCheckedChange = { viewModel.updatePickupStatus(it) },
                        tintColor = BrandPurple,
                        showDivider = false
                    )
                }
            }

            // Operating Hours Section
            item {
                SectionHeader("OPERATING HOURS")
                SettingsCard {
                    NavigationRow(
                        icon = Icons.Default.Schedule,
                        title = "Business Hours",
                        value = "Mon-Sat: 10am-10pm",
                        onClick = onBusinessHours
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Timer, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Prep Time Buffer", fontSize = 17.sp, color = TextPrimary, modifier = Modifier.weight(1f))

                        // iOS-style picker menu
                        var expanded by remember { mutableStateOf(false) }
                        Box {
                            TextButton(onClick = { expanded = true }) {
                                Text("${vendorData.prepTimeBuffer} min", fontSize = 17.sp, color = TextSecondary)
                                Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = TextSecondary)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                listOf(5, 10, 15, 20, 30).forEach { mins ->
                                    DropdownMenuItem(
                                        text = { Text("$mins min") },
                                        onClick = { viewModel.updatePrepTimeBuffer(mins); expanded = false }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Notifications Section
            item {
                SectionHeader("NOTIFICATIONS")
                SettingsCard {
                    NavigationRow(
                        icon = Icons.Default.Notifications,
                        title = "Push Notifications",
                        value = "Enabled",
                        onClick = onNotifications
                    )
                    ToggleRow(
                        icon = Icons.Default.VolumeUp,
                        iconColor = TextSecondary,
                        title = "Order Sound Alerts",
                        subtitle = null,
                        checked = vendorData.soundEnabled,
                        onCheckedChange = { viewModel.updateSoundEnabled(it) },
                        tintColor = BrandOrange
                    )
                    ToggleRow(
                        icon = Icons.Default.Vibration,
                        iconColor = TextSecondary,
                        title = "Vibration",
                        subtitle = null,
                        checked = vendorData.vibrationEnabled,
                        onCheckedChange = { viewModel.updateVibrationEnabled(it) },
                        tintColor = BrandOrange,
                        showDivider = false
                    )
                }
            }

            // Business Documents Section
            item {
                SectionHeader("BUSINESS DOCUMENTS")
                SettingsCard {
                    NavigationRow(
                        icon = Icons.Default.Description,
                        title = "Verification Documents",
                        subtitle = "License, Tax ID, Health Permit",
                        badge = "Required",
                        badgeColor = BrandOrange,
                        onClick = onDocuments,
                        showDivider = false
                    )
                }
            }

            // Payment & Payouts Section
            item {
                SectionHeader("PAYMENT & PAYOUTS")
                SettingsCard {
                    NavigationRow(
                        icon = Icons.Default.CreditCard,
                        title = "Payout Settings",
                        onClick = onPaymentSettings
                    )
                    InfoRow(
                        icon = Icons.Default.AttachMoney,
                        title = "Platform Fee",
                        value = "\$${String.format("%.2f", AppConfig.FoodDelivery.RESTAURANT_FEE)}/order"
                    )
                    InfoRow(
                        icon = Icons.Default.AccountBalance,
                        iconColor = BrandGreen,
                        title = "This Month's Earnings",
                        value = "$2,450.00",
                        valueColor = BrandGreen,
                        valueBold = true,
                        showDivider = false
                    )
                }
            }

            // AI Features Section
            item {
                SectionHeader("AI FEATURES")
                SettingsCard {
                    ToggleRow(
                        icon = Icons.Default.Psychology,
                        iconColor = BrandPurple,
                        title = "Demand Prediction",
                        subtitle = "AI predicts busy periods",
                        checked = vendorData.aiDemandPrediction,
                        onCheckedChange = { viewModel.updateAIDemandPrediction(it) },
                        tintColor = BrandPurple
                    )
                    ToggleRow(
                        icon = Icons.Default.Schedule,
                        iconColor = BrandBlue,
                        title = "Prep Time Optimization",
                        subtitle = "AI optimizes estimated times",
                        checked = vendorData.aiPrepTimeOptimization,
                        onCheckedChange = { viewModel.updateAIPrepTimeOptimization(it) },
                        tintColor = BrandBlue
                    )
                    ToggleRow(
                        icon = Icons.Default.Lightbulb,
                        iconColor = Color(0xFFFFCC00),
                        title = "Menu Suggestions",
                        subtitle = "AI suggests menu optimizations",
                        checked = vendorData.aiMenuSuggestions,
                        onCheckedChange = { viewModel.updateAIMenuSuggestions(it) },
                        tintColor = Color(0xFFFFCC00),
                        showDivider = false
                    )
                }
            }

            // Support Section
            item {
                SectionHeader("SUPPORT")
                SettingsCard {
                    NavigationRow(
                        icon = Icons.AutoMirrored.Filled.Help,
                        title = "Help Center",
                        onClick = { openUrl(HELP_CENTER_URL) }
                    )
                    NavigationRow(
                        icon = Icons.AutoMirrored.Filled.Chat,
                        title = "Contact Support",
                        onClick = { sendSupportEmail() }
                    )
                    NavigationRow(
                        icon = Icons.Default.QuestionAnswer,
                        title = "FAQs",
                        onClick = { openUrl(FAQ_URL) },
                        showDivider = false
                    )
                }
            }

            // Legal Section
            item {
                SectionHeader("LEGAL")
                SettingsCard {
                    NavigationRow(
                        icon = Icons.Default.Description,
                        title = "Terms of Service",
                        onClick = { openUrl(TERMS_URL) }
                    )
                    NavigationRow(
                        icon = Icons.Default.PrivacyTip,
                        title = "Privacy Policy",
                        onClick = { openUrl(PRIVACY_URL) }
                    )
                    NavigationRow(
                        icon = Icons.Default.Handshake,
                        title = "Restaurant Agreement",
                        onClick = { openUrl(RESTAURANT_AGREEMENT_URL) },
                        showDivider = false
                    )
                }
            }

            // Account Section
            item {
                SettingsCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showLogoutDialog = true }
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = BrandRed, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Sign Out", fontSize = 17.sp, color = BrandRed)
                    }
                    HorizontalDivider(color = SeparatorColor.copy(alpha = 0.3f))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showDeleteDialog = true }
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = BrandRed, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Delete Account", fontSize = 17.sp, color = BrandRed)
                    }
                }
            }

            // App Info Section
            item {
                SettingsCard {
                    InfoRow(
                        title = "App Version",
                        value = "1.0.0 (1)"
                    )
                    InfoRow(
                        title = "Restaurant ID",
                        value = if (vendorData.vendorId > 0) "REST-${vendorData.vendorId}" else "Not set",
                        showDivider = false
                    )
                }
            }

            // Bottom padding
            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }

    // Dialogs
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { if (!uiState.isSigningOut) showLogoutDialog = false },
            title = { Text("Sign Out?", fontWeight = FontWeight.SemiBold) },
            text = { Text("Are you sure you want to sign out of your account?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.signOut()
                    },
                    enabled = !uiState.isSigningOut
                ) {
                    if (uiState.isSigningOut) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = BrandRed
                        )
                    } else {
                        Text("Sign Out", color = BrandRed)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showLogoutDialog = false },
                    enabled = !uiState.isSigningOut
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { if (!uiState.isDeletingAccount) showDeleteDialog = false },
            title = { Text("Delete Account?", fontWeight = FontWeight.SemiBold) },
            text = { Text("This will permanently delete your restaurant account, including all menu items, order history, and earnings data. This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteAccount()
                    },
                    enabled = !uiState.isDeletingAccount
                ) {
                    if (uiState.isDeletingAccount) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = BrandRed
                        )
                    } else {
                        Text("Delete Forever", color = BrandRed)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteDialog = false },
                    enabled = !uiState.isDeletingAccount
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    // Error dialog
    uiState.error?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            title = { Text("Error", fontWeight = FontWeight.SemiBold) },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearError() }) {
                    Text("OK", color = BrandOrange)
                }
            }
        )
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        title,
        modifier = Modifier.padding(start = 16.dp, bottom = 6.dp),
        fontSize = 13.sp,
        fontWeight = FontWeight.Normal,
        color = TextSecondary,
        letterSpacing = 0.5.sp
    )
}

@Composable
private fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadiusMedium),
        color = BackgroundSecondary
    ) {
        Column(content = content)
    }
}

@Composable
private fun NavigationRow(
    icon: ImageVector? = null,
    title: String,
    subtitle: String? = null,
    value: String? = null,
    badge: String? = null,
    badgeColor: Color = BrandOrange,
    onClick: () -> Unit,
    showDivider: Boolean = true
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 17.sp, color = TextPrimary)
                if (subtitle != null) {
                    Text(subtitle, fontSize = 13.sp, color = TextSecondary)
                }
            }
            if (badge != null) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = badgeColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        badge,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        color = badgeColor
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
            }
            if (value != null) {
                Text(value, fontSize = 17.sp, color = TextSecondary)
                Spacer(modifier = Modifier.width(4.dp))
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextSecondary.copy(alpha = 0.5f), modifier = Modifier.size(20.dp))
        }
        if (showDivider) {
            HorizontalDivider(
                color = SeparatorColor.copy(alpha = 0.3f),
                modifier = Modifier.padding(start = if (icon != null) 50.dp else 16.dp)
            )
        }
    }
}

@Composable
private fun ToggleRow(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    subtitle: String?,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    tintColor: Color,
    showDivider: Boolean = true
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = if (subtitle != null) 10.dp else 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 17.sp, color = TextPrimary)
                if (subtitle != null) {
                    Text(subtitle, fontSize = 13.sp, color = TextSecondary)
                }
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = tintColor,
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = Color(0xFFE9E9EB)
                )
            )
        }
        if (showDivider) {
            HorizontalDivider(
                color = SeparatorColor.copy(alpha = 0.3f),
                modifier = Modifier.padding(start = 50.dp)
            )
        }
    }
}

@Composable
private fun InfoRow(
    icon: ImageVector? = null,
    iconColor: Color = TextSecondary,
    title: String,
    value: String,
    valueColor: Color = TextSecondary,
    valueBold: Boolean = false,
    showDivider: Boolean = true
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(12.dp))
            }
            Text(title, fontSize = 17.sp, color = TextPrimary, modifier = Modifier.weight(1f))
            Text(
                value,
                fontSize = 17.sp,
                color = valueColor,
                fontWeight = if (valueBold) FontWeight.SemiBold else FontWeight.Normal
            )
        }
        if (showDivider) {
            HorizontalDivider(
                color = SeparatorColor.copy(alpha = 0.3f),
                modifier = Modifier.padding(start = if (icon != null) 50.dp else 16.dp)
            )
        }
    }
}
