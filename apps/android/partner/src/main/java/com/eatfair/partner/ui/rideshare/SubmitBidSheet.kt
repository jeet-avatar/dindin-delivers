package com.eatfair.partner.ui.rideshare

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.eatfair.partner.data.RideshareApiService
import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.model.rideshare.RideRequestForBidding

/**
 * SubmitBidSheet - Submit a competitive bid on a ride request
 * Matches iOS SubmitBidSheet exactly
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubmitBidSheet(
    request: RideRequestForBidding,
    viewModel: RideshareViewModel,
    onDismiss: () -> Unit
) {
    val suggestedPrice = request.suggestedPrice ?: 0.0
    val distanceMiles = request.tripDistanceMiles ?: 0.0
    val durationMinutes = request.estimatedDurationMinutes?.toDouble() ?: 0.0

    // Generate suggested bids using AppConfig
    val suggestedBids = AppConfig.Rideshare.generateSuggestedBids(suggestedPrice, distanceMiles, durationMinutes)

    var selectedBidOption by remember { mutableStateOf<Int?>(1) } // Default to Fair Price (index 1)
    var customPrice by remember { mutableStateOf("") }
    var estimatedArrival by remember { mutableStateOf(5) }
    var message by remember { mutableStateOf("") }

    val isSubmitting by viewModel.isSubmittingBid.collectAsState()

    // Determine the proposed price based on selection
    val proposedAmount = when {
        selectedBidOption != null -> suggestedBids.getOrNull(selectedBidOption!!)?.price ?: 0.0
        else -> customPrice.toDoubleOrNull() ?: 0.0
    }

    val platformFee = AppConfig.Rideshare.calculatePlatformFee(proposedAmount)
    val driverEarnings = maxOf(0.0, proposedAmount - platformFee)
    val earningsPercentage = AppConfig.Rideshare.getDriverEarningsPercentage(proposedAmount)
    val isValidBid = proposedAmount > platformFee

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Header
            Text(
                text = "Submit Your Bid",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Route Summary Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Pickup
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF4CAF50))
                        )
                        Column {
                            Text(
                                text = "Pickup",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = request.pickup.address,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 2
                            )
                        }
                    }

                    // Connector line
                    Box(
                        modifier = Modifier
                            .padding(start = 5.dp, top = 4.dp, bottom = 4.dp)
                            .width(2.dp)
                            .height(20.dp)
                            .background(Color(0xFF2196F3).copy(alpha = 0.3f))
                    )

                    // Dropoff
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF44336))
                        )
                        Column {
                            Text(
                                text = "Drop-off",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = request.dropoff.address,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 2
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Trip Stats
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.SyncAlt,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = Color(0xFF2196F3)
                            )
                            Text(
                                text = request.formattedTripDistance,
                                style = MaterialTheme.typography.labelMedium,
                                color = Color(0xFF2196F3),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = Color(0xFF2196F3)
                            )
                            Text(
                                text = request.formattedDuration,
                                style = MaterialTheme.typography.labelMedium,
                                color = Color(0xFF2196F3),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Suggested Bid Options Section
            Text(
                text = "Choose Your Bid",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Keep 96%+ of every fare. No commission cuts. Your price, your earnings.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Three Suggested Bid Options
            suggestedBids.forEachIndexed { index, bid ->
                val isSelected = selectedBidOption == index
                val borderColor = when {
                    isSelected && bid.isRecommended -> Color(0xFF4CAF50)
                    isSelected -> Color(0xFF2196F3)
                    else -> Color.Transparent
                }
                val backgroundColor = when {
                    isSelected && bid.isRecommended -> Color(0xFF4CAF50).copy(alpha = 0.1f)
                    isSelected -> Color(0xFF2196F3).copy(alpha = 0.1f)
                    else -> MaterialTheme.colorScheme.surface
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(2.dp, borderColor, RoundedCornerShape(16.dp))
                        .clickable { selectedBidOption = index },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = backgroundColor)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = bid.label,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (bid.isRecommended) {
                                        Badge(
                                            containerColor = Color(0xFF4CAF50),
                                            contentColor = Color.White
                                        ) {
                                            Text("RECOMMENDED", style = MaterialTheme.typography.labelSmall)
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = bid.acceptanceHint,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "$${bid.price.toInt()}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color(0xFF2196F3) else MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Divider()
                        Spacer(modifier = Modifier.height(12.dp))

                        // Earnings Breakdown
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = "You Earn",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    text = "$${String.format("%.2f", bid.driverEarnings)}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF4CAF50)
                                )
                            }
                            if (distanceMiles > 0) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "Per Mile",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = "$${String.format("%.2f", bid.perMile)}/mi",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                            if (durationMinutes > 0) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "Per Hour",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    val perHour = AppConfig.Rideshare.calculateEarningsPerHour(bid.price, durationMinutes)
                                    Text(
                                        text = "$${String.format("%.0f", perHour)}/hr",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Arrival Time Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Estimated Arrival",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(3, 5, 10, 15).forEach { minutes ->
                            FilterChip(
                                selected = estimatedArrival == minutes,
                                onClick = { estimatedArrival = minutes },
                                label = { Text("$minutes min") },
                                modifier = Modifier.weight(1f),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFF2196F3),
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Message Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Message to Rider",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "(Optional)",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = message,
                        onValueChange = { message = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = {
                            Text("e.g., I'm nearby and can pick you up quickly!")
                        },
                        minLines = 2,
                        maxLines = 4,
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Platform Fee Transparency Info
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF4CAF50).copy(alpha = 0.1f)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "You keep ${String.format("%.0f", earningsPercentage)}%+ of every fare",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Platform fee: $${platformFee.toInt()} flat (${String.format("%.1f", 100 - earningsPercentage)}% of this fare)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Total transparency - no hidden fees. You set your price, we connect you with riders.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Submit Button
            Button(
                onClick = {
                    viewModel.submitBid(
                        requestId = request.id,
                        proposedPrice = proposedAmount,
                        estimatedArrivalMinutes = estimatedArrival,
                        message = message.ifBlank { null }
                    )
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = isValidBid && !isSubmitting,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2196F3),
                    disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Default.PanTool, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Submit Bid - $${proposedAmount.toInt()} (You earn $${String.format("%.0f", driverEarnings)})",
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }

            if (!isValidBid && proposedAmount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Price must be greater than $${platformFee.toInt()} platform fee",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFF44336),
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
