package com.eatfair.driver.ui.orders

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.eatfair.driver.ui.theme.DollorDriverColors

data class RideRequest(
    val id: String,
    val pickup: String,
    val dropoff: String,
    val distance: String,
    val estimatedEarnings: String,
    val customerName: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvailableOrdersScreen(
    navController: NavHostController
) {
    val sampleRides = remember {
        listOf(
            RideRequest("1", "800 N Alameda St, LA", "100 Spectrum Center Dr, Irvine", "42 mi", "$79.50", "John D."),
            RideRequest("2", "123 Main St, Santa Monica", "456 Oak Ave, Pasadena", "28 mi", "$52.00", "Sarah M."),
            RideRequest("3", "LAX Airport", "Downtown LA", "18 mi", "$35.00", "Mike R.")
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Available Orders",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DollorDriverColors.White,
                    titleContentColor = DollorDriverColors.Gray900
                )
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(DollorDriverColors.Background),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(sampleRides) { ride ->
                RideRequestCard(
                    ride = ride,
                    onAccept = { /* TODO: Accept ride */ },
                    onDecline = { /* TODO: Decline ride */ }
                )
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
fun RideRequestCard(
    ride: RideRequest,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
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
            // Header with earnings
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
                        text = ride.customerName,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Medium
                        ),
                        color = DollorDriverColors.Gray900
                    )
                }
                Text(
                    text = ride.estimatedEarnings,
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
                    Text(
                        text = "Pickup",
                        style = MaterialTheme.typography.bodySmall,
                        color = DollorDriverColors.Gray500
                    )
                    Text(
                        text = ride.pickup,
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
                    Text(
                        text = "Dropoff",
                        style = MaterialTheme.typography.bodySmall,
                        color = DollorDriverColors.Gray500
                    )
                    Text(
                        text = ride.dropoff,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DollorDriverColors.Gray900
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Distance
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Route,
                    contentDescription = null,
                    tint = DollorDriverColors.Gray400,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = ride.distance,
                    style = MaterialTheme.typography.bodySmall,
                    color = DollorDriverColors.Gray500
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDecline,
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
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = DollorDriverColors.Blue
                    )
                ) {
                    Text("Accept")
                }
            }
        }
    }
}
