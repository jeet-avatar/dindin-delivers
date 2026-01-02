package com.eatfair.partner.ui.rideshare

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.eatfair.partner.data.RideshareApiService
import com.eatfair.shared.model.rideshare.RideBid
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

/**
 * ActiveRideScreen - Track and manage an active matched ride
 * Matches iOS ActiveRideView exactly
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveRideScreen(
    bid: RideBid,
    viewModel: RideshareViewModel = viewModel(),
    onNavigateToChat: (Int, String) -> Unit = { _, _ -> },
    onNavigateBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val request = bid.rideRequest
    val finalPrice = bid.customerCounterPrice ?: bid.proposedPrice
    val driverEarnings = maxOf(0.0, finalPrice - RideshareApiService.PLATFORM_FEE)

    var rideStatus by remember { mutableStateOf(RideStatus.MATCHED) }
    var showCompleteDialog by remember { mutableStateOf(false) }

    val isLoading by viewModel.isLoading.collectAsState()
    val currentLocation by viewModel.currentLocation.collectAsState()

    // Map camera position
    val pickupLatLng = request?.let { LatLng(it.pickup.latitude, it.pickup.longitude) }
    val dropoffLatLng = request?.let { LatLng(it.dropoff.latitude, it.dropoff.longitude) }
    val driverLatLng = currentLocation?.let { LatLng(it.latitude, it.longitude) }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            pickupLatLng ?: driverLatLng ?: LatLng(0.0, 0.0),
            14f
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Active Ride", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        request?.let {
                            onNavigateToChat(it.id, it.customerName ?: "Rider")
                        }
                    }) {
                        Icon(Icons.Default.Chat, contentDescription = "Chat")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Map
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(isMyLocationEnabled = true),
                uiSettings = MapUiSettings(
                    myLocationButtonEnabled = true,
                    compassEnabled = true
                )
            ) {
                // Pickup marker
                pickupLatLng?.let {
                    Marker(
                        state = MarkerState(position = it),
                        title = "Pickup",
                        snippet = request?.pickup?.address
                    )
                }

                // Dropoff marker
                dropoffLatLng?.let {
                    Marker(
                        state = MarkerState(position = it),
                        title = "Dropoff",
                        snippet = request?.dropoff?.address
                    )
                }
            }

            // Status Card (Top)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .align(Alignment.TopCenter),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Status Badge & Earnings
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(rideStatus.color.copy(alpha = 0.15f))
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = rideStatus.icon,
                                contentDescription = null,
                                tint = rideStatus.color
                            )
                            Text(
                                text = rideStatus.label,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = rideStatus.color
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "$${String.format("%.2f", driverEarnings)}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4CAF50)
                            )
                            Text(
                                text = "earnings",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Rider Info
                    request?.let { req ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Avatar
                                Box(
                                    modifier = Modifier
                                        .size(50.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF2196F3).copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = (req.customerName ?: "R").take(1).uppercase(),
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF2196F3)
                                    )
                                }

                                Column {
                                    Text(
                                        text = req.customerName ?: "Rider",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "Passenger",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            // Quick Actions
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilledIconButton(
                                    onClick = {
                                        onNavigateToChat(req.id, req.customerName ?: "Rider")
                                    },
                                    colors = IconButtonDefaults.filledIconButtonColors(
                                        containerColor = Color(0xFF2196F3).copy(alpha = 0.1f)
                                    )
                                ) {
                                    Icon(
                                        Icons.Default.Chat,
                                        contentDescription = "Chat",
                                        tint = Color(0xFF2196F3)
                                    )
                                }

                                FilledIconButton(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_DIAL).apply {
                                            data = Uri.parse("tel:")
                                        }
                                        context.startActivity(intent)
                                    },
                                    colors = IconButtonDefaults.filledIconButtonColors(
                                        containerColor = Color(0xFF4CAF50).copy(alpha = 0.1f)
                                    )
                                ) {
                                    Icon(
                                        Icons.Default.Phone,
                                        contentDescription = "Call",
                                        tint = Color(0xFF4CAF50)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Action Card (Bottom)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter),
                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Current Destination
                    request?.let { req ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (rideStatus == RideStatus.IN_PROGRESS)
                                            Color(0xFFF44336)
                                        else Color(0xFF4CAF50)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    if (rideStatus == RideStatus.IN_PROGRESS)
                                        Icons.Default.LocationOn
                                    else Icons.Default.Person,
                                    contentDescription = null,
                                    tint = Color.White
                                )
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (rideStatus == RideStatus.IN_PROGRESS) "DROP-OFF" else "PICKUP",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    text = if (rideStatus == RideStatus.IN_PROGRESS)
                                        req.dropoff.address
                                    else req.pickup.address,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            IconButton(
                                onClick = {
                                    val destination = if (rideStatus == RideStatus.IN_PROGRESS)
                                        req.dropoff else req.pickup
                                    val gmmIntentUri = Uri.parse(
                                        "google.navigation:q=${destination.latitude},${destination.longitude}"
                                    )
                                    val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                                    mapIntent.setPackage("com.google.android.apps.maps")
                                    context.startActivity(mapIntent)
                                }
                            ) {
                                Icon(
                                    Icons.Default.Navigation,
                                    contentDescription = "Navigate",
                                    tint = Color(0xFF2196F3),
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Divider()
                    Spacer(modifier = Modifier.height(16.dp))

                    // Action Button
                    when (rideStatus) {
                        RideStatus.MATCHED, RideStatus.EN_ROUTE_TO_PICKUP -> {
                            Button(
                                onClick = { rideStatus = RideStatus.ARRIVED_AT_PICKUP },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("I've Arrived", fontWeight = FontWeight.SemiBold)
                            }
                        }
                        RideStatus.ARRIVED_AT_PICKUP -> {
                            Button(
                                onClick = {
                                    viewModel.startRide(bid)
                                    rideStatus = RideStatus.IN_PROGRESS
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                enabled = !isLoading,
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0))
                            ) {
                                if (isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(Icons.Default.DirectionsCar, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Start Ride", fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        RideStatus.IN_PROGRESS -> {
                            Button(
                                onClick = { showCompleteDialog = true },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                enabled = !isLoading,
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                            ) {
                                if (isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(Icons.Default.Flag, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Complete Ride", fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        RideStatus.COMPLETED -> {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(64.dp),
                                    tint = Color(0xFF4CAF50)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Ride Completed!",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF4CAF50)
                                )
                                Text(
                                    text = "$${String.format("%.2f", driverEarnings)} earned",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Complete Ride Dialog
    if (showCompleteDialog) {
        AlertDialog(
            onDismissRequest = { showCompleteDialog = false },
            title = { Text("Complete Ride?") },
            text = { Text("Confirm that you have dropped off the passenger at their destination.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCompleteDialog = false
                        viewModel.completeRide(bid)
                        rideStatus = RideStatus.COMPLETED
                    }
                ) {
                    Text("Complete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCompleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/**
 * Ride status enum matching iOS RideStatus
 */
enum class RideStatus(
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val color: Color
) {
    MATCHED("Matched", Icons.Default.CheckCircle, Color(0xFF2196F3)),
    EN_ROUTE_TO_PICKUP("En Route", Icons.Default.DirectionsCar, Color(0xFFFF9800)),
    ARRIVED_AT_PICKUP("Arrived", Icons.Default.LocationOn, Color(0xFF4CAF50)),
    IN_PROGRESS("In Progress", Icons.Default.ArrowForward, Color(0xFF9C27B0)),
    COMPLETED("Completed", Icons.Default.Flag, Color(0xFF4CAF50))
}
