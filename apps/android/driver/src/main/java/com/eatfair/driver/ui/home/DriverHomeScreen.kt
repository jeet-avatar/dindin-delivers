package com.eatfair.driver.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.eatfair.driver.ui.theme.DollorDriverColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverHomeScreen(
    navController: NavHostController
) {
    var isOnline by remember { mutableStateOf(true) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DollorDriverColors.Background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Welcome back,",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray500
                    )
                    Text(
                        text = "Driver",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = DollorDriverColors.Gray900
                    )
                }

                // Online/Offline Toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = if (isOnline) "Online" else "Offline",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Medium
                        ),
                        color = if (isOnline) DollorDriverColors.Green else DollorDriverColors.Gray500
                    )
                    Switch(
                        checked = isOnline,
                        onCheckedChange = { isOnline = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = DollorDriverColors.White,
                            checkedTrackColor = DollorDriverColors.Green,
                            uncheckedThumbColor = DollorDriverColors.White,
                            uncheckedTrackColor = DollorDriverColors.Gray300
                        )
                    )
                }
            }
        }

        // Status Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.horizontalGradient(
                                colors = listOf(
                                    DollorDriverColors.Blue,
                                    DollorDriverColors.BlueDark
                                )
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column {
                        Text(
                            text = if (isOnline) "You're Online" else "You're Offline",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = DollorDriverColors.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (isOnline) "Waiting for ride requests..." else "Go online to receive requests",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DollorDriverColors.White.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        // Today's Stats
        item {
            Text(
                text = "Today's Stats",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.AttachMoney,
                    value = "$127.50",
                    label = "Earnings",
                    color = DollorDriverColors.Green
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.DirectionsCar,
                    value = "8",
                    label = "Rides",
                    color = DollorDriverColors.Blue
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.AccessTime,
                    value = "4.2h",
                    label = "Online",
                    color = DollorDriverColors.Orange
                )
            }
        }

        // Quick Actions
        item {
            Text(
                text = "Quick Actions",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Map,
                    title = "Navigate",
                    onClick = { /* TODO */ }
                )
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.History,
                    title = "History",
                    onClick = { /* TODO */ }
                )
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Support,
                    title = "Support",
                    onClick = { /* TODO */ }
                )
            }
        }

        // Active Ride (placeholder)
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Recent Activity",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.DirectionsCar,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = DollorDriverColors.Gray300
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No recent rides",
                        style = MaterialTheme.typography.bodyLarge,
                        color = DollorDriverColors.Gray500
                    )
                    Text(
                        text = "Complete rides to see them here",
                        style = MaterialTheme.typography.bodySmall,
                        color = DollorDriverColors.Gray400
                    )
                }
            }
        }
    }
}

@Composable
fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    value: String,
    label: String,
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
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900
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
fun QuickActionCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(DollorDriverColors.Blue.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = DollorDriverColors.Blue,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium
                ),
                color = DollorDriverColors.Gray700
            )
        }
    }
}
