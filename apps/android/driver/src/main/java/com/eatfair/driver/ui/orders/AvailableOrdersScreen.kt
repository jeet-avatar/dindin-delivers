package com.eatfair.driver.ui.orders

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.eatfair.driver.ui.theme.DollorDriverColors
import com.eatfair.shared.model.rideshare.RideRequestForBidding

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvailableOrdersScreen(
    navController: NavHostController,
    viewModel: AvailableRidesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Available Rides",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )
                },
                actions = {
                    IconButton(onClick = { viewModel.load() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DollorDriverColors.White,
                    titleContentColor = DollorDriverColors.Gray900
                )
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(DollorDriverColors.Background)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = DollorDriverColors.Blue
                    )
                }

                uiState.rides.isEmpty() -> {
                    EmptyRidesState(modifier = Modifier.align(Alignment.Center))
                }

                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.rides, key = { it.id }) { ride ->
                            RideRequestCard(
                                ride = ride,
                                isAccepting = uiState.acceptingId == ride.id,
                                onAccept = { viewModel.accept(ride) },
                                onDecline = { viewModel.decline(ride) }
                            )
                        }
                        item { Spacer(modifier = Modifier.height(80.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyRidesState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(32.dp),
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
            text = "No ride requests right now",
            style = MaterialTheme.typography.bodyLarge,
            color = DollorDriverColors.Gray500
        )
        Text(
            text = "Make sure you're online. New requests appear here.",
            style = MaterialTheme.typography.bodySmall,
            color = DollorDriverColors.Gray400
        )
    }
}

@Composable
fun RideRequestCard(
    ride: RideRequestForBidding,
    isAccepting: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    val fare = ride.suggestedPrice
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
            // Header with customer + fare
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = DollorDriverColors.Blue
                    )
                    Text(
                        text = ride.customerName ?: "Rider",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Medium
                        ),
                        color = DollorDriverColors.Gray900
                    )
                }
                Text(
                    text = if (fare != null) "$" + String.format("%.2f", fare) else "--",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = DollorDriverColors.Green
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Pickup
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
                        text = ride.pickup.address,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray900
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Dropoff
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
                        text = ride.dropoff.address,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray900
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Distances
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Route,
                        contentDescription = null,
                        tint = DollorDriverColors.Gray400,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Trip ${ride.formattedTripDistance}",
                        style = MaterialTheme.typography.bodySmall,
                        color = DollorDriverColors.Gray500
                    )
                }
                if (ride.distanceToPickupKm != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.NearMe,
                            contentDescription = null,
                            tint = DollorDriverColors.Gray400,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "${ride.formattedPickupDistance} away",
                            style = MaterialTheme.typography.bodySmall,
                            color = DollorDriverColors.Gray500
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDecline,
                    enabled = !isAccepting,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = DollorDriverColors.Gray600
                    )
                ) {
                    Text("Decline")
                }
                Button(
                    onClick = onAccept,
                    enabled = !isAccepting && fare != null,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = DollorDriverColors.Blue
                    )
                ) {
                    if (isAccepting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = DollorDriverColors.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Accept")
                    }
                }
            }
        }
    }
}
