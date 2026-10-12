package com.eatfair.driver.ui.home

import android.content.Intent
import android.net.Uri
import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.eatfair.driver.ui.theme.DollorDriverColors
import com.eatfair.shared.model.rideshare.RideRequestForBidding

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverHomeScreen(
    navController: NavHostController,
    driverName: String? = null,
    viewModel: DriverHomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Surface server messages / errors (e.g. "Background check not passed...").
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearError()
        }
    }
    LaunchedEffect(uiState.message) {
        uiState.message?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessage()
        }
    }

    val isOnline = uiState.isOnline

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
                        text = driverName?.ifBlank { null } ?: "Driver",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = DollorDriverColors.Gray900
                    )
                }

                // Online/Offline Toggle (real: PUT /api/auth/driver/online)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (uiState.isToggling) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = DollorDriverColors.Blue
                        )
                    }
                    Text(
                        text = if (isOnline) "Online" else "Offline",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Medium
                        ),
                        color = if (isOnline) DollorDriverColors.Green else DollorDriverColors.Gray500
                    )
                    Switch(
                        checked = isOnline,
                        onCheckedChange = { target -> viewModel.setOnline(target) },
                        enabled = !uiState.isToggling,
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
                    value = "$" + String.format("%.2f", uiState.todayEarnings),
                    label = "Earnings",
                    color = DollorDriverColors.Green
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.DirectionsCar,
                    value = uiState.todayRides.toString(),
                    label = "Rides",
                    color = DollorDriverColors.Blue
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.AccessTime,
                    value = String.format("%.1fh", uiState.todayHours),
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
                    onClick = {
                        val ride = uiState.activeRide
                        if (ride != null) {
                            val label = Uri.encode(ride.pickup.address)
                            val uri = Uri.parse(
                                "geo:${ride.pickup.latitude},${ride.pickup.longitude}?q=" +
                                    "${ride.pickup.latitude},${ride.pickup.longitude}($label)"
                            )
                            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                                setPackage("com.google.android.apps.maps")
                            }
                            if (intent.resolveActivity(context.packageManager) != null) {
                                context.startActivity(intent)
                            } else {
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                            }
                        } else {
                            Toast.makeText(context, "No active ride to navigate", Toast.LENGTH_SHORT).show()
                        }
                    }
                )
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.History,
                    title = "History",
                    onClick = { navController.navigate("earnings") }
                )
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Support,
                    title = "Support",
                    onClick = {
                        val intent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("mailto:support@dollor.ai")
                            putExtra(Intent.EXTRA_SUBJECT, "Dollor Driver Support")
                        }
                        if (intent.resolveActivity(context.packageManager) != null) {
                            context.startActivity(intent)
                        } else {
                            Toast.makeText(context, "support@dollor.ai", Toast.LENGTH_LONG).show()
                        }
                    }
                )
            }
        }

        // Active Ride
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (uiState.activeRide != null) "Active Ride" else "Recent Activity",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900
            )
        }

        item {
            val ride = uiState.activeRide
            if (ride != null) {
                ActiveRideCard(
                    ride = ride,
                    isActionInProgress = uiState.isRideActionInProgress,
                    onArrived = { viewModel.markArrived() },
                    onStart = { viewModel.startRide() },
                    onComplete = { viewModel.completeRide() }
                )
            } else {
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
                            text = "No active ride",
                            style = MaterialTheme.typography.bodyLarge,
                            color = DollorDriverColors.Gray500
                        )
                        Text(
                            text = if (isOnline) "You'll see your matched ride here" else "Go online to receive requests",
                            style = MaterialTheme.typography.bodySmall,
                            color = DollorDriverColors.Gray400
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiveRideCard(
    ride: RideRequestForBidding,
    isActionInProgress: Boolean,
    onArrived: () -> Unit,
    onStart: () -> Unit,
    onComplete: () -> Unit
) {
    val status = ride.status ?: ""
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.TripOrigin,
                    contentDescription = null,
                    tint = DollorDriverColors.Blue,
                    modifier = Modifier.size(20.dp)
                )
                Column {
                    Text("Pickup", style = MaterialTheme.typography.bodySmall, color = DollorDriverColors.Gray500)
                    Text(
                        ride.pickup.address,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray900
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = DollorDriverColors.Orange,
                    modifier = Modifier.size(20.dp)
                )
                Column {
                    Text("Dropoff", style = MaterialTheme.typography.bodySmall, color = DollorDriverColors.Gray500)
                    Text(
                        ride.dropoff.address,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray900
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Status-driven actions. MATCHED -> arrived then start; IN_PROGRESS -> complete.
            when (status.lowercase()) {
                "in_progress" -> {
                    Button(
                        onClick = onComplete,
                        enabled = !isActionInProgress,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = DollorDriverColors.Green)
                    ) { ActionButtonContent(isActionInProgress, "Complete Ride") }
                }
                else -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onArrived,
                            enabled = !isActionInProgress,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Arrived") }
                        Button(
                            onClick = onStart,
                            enabled = !isActionInProgress,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DollorDriverColors.Blue)
                        ) { ActionButtonContent(isActionInProgress, "Start Ride") }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionButtonContent(loading: Boolean, label: String) {
    if (loading) {
        CircularProgressIndicator(
            modifier = Modifier.size(20.dp),
            color = DollorDriverColors.White,
            strokeWidth = 2.dp
        )
    } else {
        Text(label, fontWeight = FontWeight.Bold)
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
