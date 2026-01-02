package com.eatfair.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.common.EFTopAppBar
import com.eatfair.app.ui.theme.primaryVerticalGradient

/**
 * Settings Screen for Customer App
 * Required for Google Play Store compliance - includes account deletion
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit,
    onPrivacyPolicyClick: () -> Unit,
    onTermsClick: () -> Unit,
    onCaliforniaPrivacyClick: () -> Unit = {},
    onDeleteAccount: (onSuccess: () -> Unit, onError: (String) -> Unit) -> Unit,
    onAccountDeleted: () -> Unit
) {
    var notificationsEnabled by remember { mutableStateOf(true) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }

    // Delete Account Confirmation Dialog
    if (showDeleteDialog) {
        DeleteAccountDialog(
            isDeleting = isDeleting,
            error = deleteError,
            onDismiss = {
                showDeleteDialog = false
                deleteError = null
            },
            onConfirm = {
                isDeleting = true
                deleteError = null
                onDeleteAccount(
                    {
                        isDeleting = false
                        showDeleteDialog = false
                        onAccountDeleted()
                    },
                    { error ->
                        isDeleting = false
                        deleteError = error
                    }
                )
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(primaryVerticalGradient())
    ) {
        EFTopAppBar("Settings", true, onBackClick)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Manage your preferences and account settings",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Preferences Section
            Text(
                text = "Preferences",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Language
            SettingsMenuItem(
                icon = Icons.Default.Language,
                title = "Language",
                subtitle = "English",
                onClick = { }
            )

            // Notifications Toggle
            SettingsMenuItemWithSwitch(
                icon = Icons.Default.Notifications,
                title = "Push Notifications",
                checked = notificationsEnabled,
                onCheckedChange = { notificationsEnabled = it }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Legal Section
            Text(
                text = "Legal",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Privacy Policy
            SettingsMenuItem(
                icon = Icons.Default.Security,
                title = "Privacy Policy",
                onClick = onPrivacyPolicyClick
            )

            // Terms & Conditions
            SettingsMenuItem(
                icon = Icons.Default.Description,
                title = "Terms & Conditions",
                onClick = onTermsClick
            )

            // California Privacy Rights (CCPA/CPRA)
            SettingsMenuItem(
                icon = Icons.Default.PrivacyTip,
                title = "California Privacy Rights",
                subtitle = "CCPA/CPRA Consumer Rights",
                onClick = onCaliforniaPrivacyClick
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Support Section
            Text(
                text = "Support",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Contact Support
            SettingsMenuItem(
                icon = Icons.Default.Email,
                title = "Contact Support",
                subtitle = "support@dollor.ai",
                onClick = { }
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Delete Account Section - Required by Google Play Store
            Text(
                text = "Account",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(12.dp))

            DeleteAccountButton(onClick = { showDeleteDialog = true })

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun SettingsMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    modifier = Modifier.size(24.dp),
                    tint = Color(0xFF666666)
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = title,
                        fontSize = 15.sp,
                        color = Color.Black
                    )
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            fontSize = 13.sp,
                            color = Color(0xFF999999)
                        )
                    }
                }
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = "Navigate",
                tint = Color(0xFF999999),
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
fun SettingsMenuItemWithSwitch(
    icon: ImageVector,
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    modifier = Modifier.size(24.dp),
                    tint = Color(0xFF666666)
                )
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = title,
                    fontSize = 15.sp,
                    color = Color.Black
                )
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = Color(0xFF4CAF50),
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = Color(0xFFE0E0E0)
                )
            )
        }
    }
}

/**
 * Delete Account Button - Required by Google Play Store policy
 */
@Composable
fun DeleteAccountButton(onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = Color(0xFFD32F2F)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Icon(
            imageVector = Icons.Default.DeleteForever,
            contentDescription = null,
            tint = Color(0xFFD32F2F)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "Delete Account",
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * Delete Account Confirmation Dialog
 * Shows warning about permanent deletion and requires confirmation
 */
@Composable
fun DeleteAccountDialog(
    isDeleting: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = { if (!isDeleting) onDismiss() },
        icon = {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = Color(0xFFD32F2F)
            )
        },
        title = {
            Text(
                text = "Delete Account?",
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        },
        text = {
            Column {
                Text(
                    text = "This action cannot be undone. Deleting your account will:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "- Remove all your personal information\n" +
                            "- Delete your order history\n" +
                            "- Remove saved addresses and payment methods\n" +
                            "- Cancel any active orders",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF999999)
                )

                if (error != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = error,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFD32F2F)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !isDeleting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFD32F2F)
                )
            ) {
                if (isDeleting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Delete My Account")
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isDeleting
            ) {
                Text("Cancel", color = Color(0xFF666666))
            }
        }
    )
}
