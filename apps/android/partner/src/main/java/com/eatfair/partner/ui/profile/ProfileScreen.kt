package com.eatfair.partner.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Profile data class for displaying restaurant profile information
 */
data class ProfileData(
    val restaurantName: String = "",
    val email: String = "",
    val address: String = "",
    val isVerified: Boolean = false,
    val phone: String = "",
    val cuisineType: String = "",
    val isOnline: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBackClick: () -> Unit = {},
    onLogout: () -> Unit = {},
    onDeleteAccount: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val profileData = uiState.profileData
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showFinalDeleteDialog by remember { mutableStateOf(false) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Profile",
                        fontWeight = FontWeight.Bold
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF5F5F5))
                .verticalScroll(rememberScrollState())
        ) {
            // Profile Header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Restaurant,
                        contentDescription = null,
                        modifier = Modifier.size(50.dp),
                        tint = Color.White
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = profileData.restaurantName.ifEmpty { "Restaurant Name" },
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (profileData.restaurantName.isEmpty()) Color.Gray else Color.Black
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = profileData.email.ifEmpty { "email@example.com" },
                    fontSize = 14.sp,
                    color = Color.Gray
                )

                // Phone display
                if (profileData.phone.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = profileData.phone,
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Badges row - Verified and Cuisine Type
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (profileData.isVerified) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFFC8E6C9)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = Color(0xFF4CAF50)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Verified Partner",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF2E7D32)
                                )
                            }
                        }
                    }

                    // Cuisine Type Badge
                    if (profileData.cuisineType.isNotEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Restaurant,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = profileData.cuisineType,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    }
                }

                // Online Status Toggle
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (profileData.isOnline) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (profileData.isOnline) Icons.Default.CheckCircle else Icons.Default.Cancel,
                                contentDescription = null,
                                tint = if (profileData.isOnline) Color(0xFF4CAF50) else Color(0xFFE53935),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = if (profileData.isOnline) "Restaurant Online" else "Restaurant Offline",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = if (profileData.isOnline) Color(0xFF2E7D32) else Color(0xFFC62828)
                                )
                                Text(
                                    text = if (profileData.isOnline) "Accepting orders" else "Not accepting orders",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                        Switch(
                            checked = profileData.isOnline,
                            onCheckedChange = { viewModel.toggleOnlineStatus(it) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF4CAF50),
                                uncheckedThumbColor = Color.White,
                                uncheckedTrackColor = Color.Gray
                            )
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Restaurant Info Section
            Text(
                text = "Restaurant Information",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
            ProfileMenuItem(
                icon = Icons.Default.Store,
                title = "Restaurant Details",
                subtitle = "Name, address, hours",
                onClick = { }
            )
            
            ProfileMenuItem(
                icon = Icons.Default.Phone,
                title = "Contact Information",
                subtitle = "Phone, email",
                onClick = { }
            )
            
            ProfileMenuItem(
                icon = Icons.Default.LocationOn,
                title = "Location",
                subtitle = profileData.address.ifEmpty { "Not set" },
                onClick = { }
            )

            ProfileMenuItem(
                icon = Icons.Default.Description,
                title = "Business Documents",
                subtitle = "Upload and manage documents",
                onClick = { }
            )

            Spacer(modifier = Modifier.height(16.dp))
            
            // Settings Section
            Text(
                text = "Settings",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
            ProfileMenuItem(
                icon = Icons.Default.Notifications,
                title = "Notification Settings",
                subtitle = "Manage notification preferences",
                onClick = { }
            )
            
            ProfileMenuItem(
                icon = Icons.Default.Schedule,
                title = "Operating Hours",
                subtitle = "Set restaurant hours",
                onClick = { }
            )
            
            ProfileMenuItem(
                icon = Icons.Default.AttachMoney,
                title = "Payment Settings",
                subtitle = "Bank account, payout schedule",
                onClick = { }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Legal Section
            Text(
                text = "Legal",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            ProfileMenuItem(
                icon = Icons.Default.Description,
                title = "Terms of Service",
                subtitle = "Read our terms and conditions",
                onClick = { viewModel.openTermsOfService() }
            )

            ProfileMenuItem(
                icon = Icons.Default.PrivacyTip,
                title = "Privacy Policy",
                subtitle = "How we handle your data",
                onClick = { viewModel.openPrivacyPolicy() }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Support Section
            Text(
                text = "Support",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            ProfileMenuItem(
                icon = Icons.Default.Help,
                title = "Help Center",
                subtitle = "FAQs and support",
                onClick = { viewModel.openHelpCenter() }
            )

            ProfileMenuItem(
                icon = Icons.Default.Info,
                title = "About",
                subtitle = "App version 1.0.0",
                onClick = { }
            )
            
            Spacer(modifier = Modifier.height(16.dp))

            // Account Actions
            Text(
                text = "Account",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Logout
            ProfileMenuItem(
                icon = Icons.AutoMirrored.Filled.Logout,
                title = "Logout",
                subtitle = "",
                onClick = { showLogoutDialog = true },
                iconTint = Color.Red,
                titleColor = Color.Red
            )

            // Delete Account
            ProfileMenuItem(
                icon = Icons.Default.Delete,
                title = "Delete Account",
                subtitle = "Permanently delete your account",
                onClick = { showDeleteDialog = true },
                iconTint = Color.Red,
                titleColor = Color.Red
            )

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
    
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text("Logout", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // First delete confirmation dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            icon = {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color.Red,
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    "Delete Account?",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    "This action cannot be undone. All your restaurant data, orders, and account information will be permanently deleted.",
                    fontSize = 14.sp
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        showFinalDeleteDialog = true
                    }
                ) {
                    Text("Continue", color = Color.Red, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Final confirmation dialog
    if (showFinalDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showFinalDeleteDialog = false },
            icon = {
                Icon(
                    Icons.Default.Error,
                    contentDescription = null,
                    tint = Color.Red,
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    "Final Confirmation",
                    fontWeight = FontWeight.Bold,
                    color = Color.Red
                )
            },
            text = {
                Column {
                    Text(
                        "Are you absolutely sure you want to delete your account?",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "This is your last chance to cancel. Once confirmed, your account will be permanently deleted and cannot be recovered.",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showFinalDeleteDialog = false
                        onDeleteAccount()
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color.White
                    )
                ) {
                    Surface(
                        color = Color.Red,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            "Delete My Account",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showFinalDeleteDialog = false }) {
                    Text("Cancel", fontWeight = FontWeight.Medium)
                }
            }
        )
    }
}

@Composable
fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    iconTint: Color = Color.Gray,
    titleColor: Color = Color.Black
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                modifier = Modifier.size(24.dp),
                tint = iconTint
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = titleColor
                )
                if (subtitle.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
