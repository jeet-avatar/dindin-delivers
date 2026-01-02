package com.eatfair.driver.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.driver.ui.theme.DollorDriverColors

/**
 * Driver Profile Screen - Aligned with iOS DriverProfileView.swift and Web Profile.tsx
 *
 * Features matched:
 * - Profile header with avatar, name, email, phone
 * - Earnings summary (Today, This Week, Total)
 * - Menu items (Earnings History, Vehicle Info, Documents, Settings, Help)
 * - Logout button
 * - Delete Account with two-step confirmation (Apple App Store Guideline 5.1.1)
 */

data class DriverProfile(
    val id: Int = 0,
    val name: String = "Driver",
    val email: String = "driver@dollor.ai",
    val phone: String = "+1 (555) 123-4567",
    val rating: Float = 4.9f,
    val totalRides: Int = 342,
    val memberSince: String = "March 2024"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogout: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var showDeleteConfirmDialog by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }

    val profile = remember { DriverProfile() }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DollorDriverColors.Background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile Header Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(
                                        DollorDriverColors.Blue,
                                        DollorDriverColors.BlueDark
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = profile.name.first().uppercase(),
                            style = MaterialTheme.typography.displaySmall.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = DollorDriverColors.White
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Name
                    Text(
                        text = profile.name,
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = DollorDriverColors.Gray900
                    )

                    // Email
                    Text(
                        text = profile.email,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray500
                    )

                    // Phone
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            tint = DollorDriverColors.Blue,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = profile.phone,
                            style = MaterialTheme.typography.bodyMedium,
                            color = DollorDriverColors.Gray600
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Rating and Rides
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(24.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = DollorDriverColors.Orange,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = profile.rating.toString(),
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold
                                    ),
                                    color = DollorDriverColors.Gray900
                                )
                            }
                            Text(
                                text = "Rating",
                                style = MaterialTheme.typography.bodySmall,
                                color = DollorDriverColors.Gray500
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = profile.totalRides.toString(),
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold
                                ),
                                color = DollorDriverColors.Gray900
                            )
                            Text(
                                text = "Total Rides",
                                style = MaterialTheme.typography.bodySmall,
                                color = DollorDriverColors.Gray500
                            )
                        }
                    }
                }
            }
        }

        // Earnings Summary
        item {
            Text(
                text = "EARNINGS",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = DollorDriverColors.Gray500
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                EarningsSummaryCard(
                    modifier = Modifier.weight(1f),
                    label = "Today",
                    value = "$127.50",
                    color = DollorDriverColors.Green
                )
                EarningsSummaryCard(
                    modifier = Modifier.weight(1f),
                    label = "This Week",
                    value = "$847.00",
                    color = DollorDriverColors.Blue
                )
                EarningsSummaryCard(
                    modifier = Modifier.weight(1f),
                    label = "Total",
                    value = "$12,450",
                    color = DollorDriverColors.Orange
                )
            }
        }

        // Menu Section
        item {
            Text(
                text = "ACCOUNT",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = DollorDriverColors.Gray500,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
            ) {
                Column {
                    ProfileMenuItem(
                        icon = Icons.Outlined.AttachMoney,
                        title = "Earnings History",
                        subtitle = "View detailed earnings",
                        onClick = { /* TODO */ }
                    )
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    ProfileMenuItem(
                        icon = Icons.Outlined.DirectionsCar,
                        title = "Vehicle Information",
                        subtitle = "Manage your vehicle",
                        onClick = { /* TODO */ }
                    )
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    ProfileMenuItem(
                        icon = Icons.Outlined.Description,
                        title = "Documents",
                        subtitle = "License, insurance, registration",
                        onClick = { /* TODO */ }
                    )
                }
            }
        }

        // Settings Section
        item {
            Text(
                text = "SETTINGS",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = DollorDriverColors.Gray500,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
            ) {
                Column {
                    ProfileMenuItem(
                        icon = Icons.Outlined.Settings,
                        title = "Settings",
                        subtitle = "App preferences",
                        onClick = { /* TODO */ }
                    )
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    ProfileMenuItem(
                        icon = Icons.Outlined.Notifications,
                        title = "Notifications",
                        subtitle = "Manage alerts",
                        onClick = { /* TODO */ }
                    )
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    ProfileMenuItem(
                        icon = Icons.Outlined.Help,
                        title = "Help & Support",
                        subtitle = "FAQs and contact",
                        onClick = { /* TODO */ }
                    )
                }
            }
        }

        // Logout Button
        item {
            Button(
                onClick = { showLogoutDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = DollorDriverColors.Gray900
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Logout,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Log Out",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }

        // Delete Account Button (Apple App Store Guideline 5.1.1)
        item {
            OutlinedButton(
                onClick = { showDeleteAccountDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = DollorDriverColors.Error
                ),
                border = ButtonDefaults.outlinedButtonBorder.copy(
                    brush = Brush.linearGradient(
                        colors = listOf(DollorDriverColors.Error, DollorDriverColors.Error)
                    )
                )
            ) {
                Icon(
                    imageVector = Icons.Default.DeleteForever,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Delete Account",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }

        // Footer
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Member since ${profile.memberSince}",
                    style = MaterialTheme.typography.bodySmall,
                    color = DollorDriverColors.Gray400
                )
                Text(
                    text = "Dollor Driver App v1.0.0",
                    style = MaterialTheme.typography.bodySmall,
                    color = DollorDriverColors.Gray400
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }

    // Logout Confirmation Dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Log Out?") },
            text = { Text("Are you sure you want to log out of your account?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text("Log Out", color = DollorDriverColors.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete Account First Dialog
    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = DollorDriverColors.Error,
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    "Delete Account?",
                    textAlign = TextAlign.Center
                )
            },
            text = {
                Text(
                    "This will permanently delete your account, including all your earnings history, documents, and personal data. This action cannot be undone.",
                    textAlign = TextAlign.Center
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteAccountDialog = false
                        showDeleteConfirmDialog = true
                    }
                ) {
                    Text("Continue", color = DollorDriverColors.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete Account Final Confirmation Dialog
    if (showDeleteConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.DeleteForever,
                    contentDescription = null,
                    tint = DollorDriverColors.Error,
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    "Final Confirmation",
                    textAlign = TextAlign.Center,
                    color = DollorDriverColors.Error
                )
            },
            text = {
                Text(
                    "Are you absolutely sure? Your account and all associated data will be permanently deleted.",
                    textAlign = TextAlign.Center
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        isDeleting = true
                        // TODO: Call delete account API
                        showDeleteConfirmDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = DollorDriverColors.Error
                    ),
                    enabled = !isDeleting
                ) {
                    if (isDeleting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = DollorDriverColors.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Delete Forever")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteConfirmDialog = false },
                    enabled = !isDeleting
                ) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun EarningsSummaryCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    color: androidx.compose.ui.graphics.Color
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = color
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = DollorDriverColors.Gray500
            )
        }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(DollorDriverColors.Blue.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = DollorDriverColors.Blue,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium
                ),
                color = DollorDriverColors.Gray900
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = DollorDriverColors.Gray500
            )
        }
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = DollorDriverColors.Gray300
        )
    }
}

