package com.eatfair.driver.ui.earnings

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.eatfair.driver.ui.theme.DollorDriverColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EarningsScreen(
    navController: NavHostController
) {
    var selectedPeriod by remember { mutableStateOf("Today") }
    val periods = listOf("Today", "This Week", "This Month")

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DollorDriverColors.Background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Text(
                text = "Earnings",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900
            )
        }

        // Period Selector
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                periods.forEach { period ->
                    FilterChip(
                        selected = selectedPeriod == period,
                        onClick = { selectedPeriod = period },
                        label = { Text(period) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = DollorDriverColors.Blue,
                            selectedLabelColor = DollorDriverColors.White
                        )
                    )
                }
            }
        }

        // Total Earnings Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.horizontalGradient(
                                colors = listOf(
                                    DollorDriverColors.Green,
                                    DollorDriverColors.GreenDark
                                )
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Total Earnings",
                            style = MaterialTheme.typography.bodyLarge,
                            color = DollorDriverColors.White.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "$127.50",
                            style = MaterialTheme.typography.displayMedium.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = DollorDriverColors.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = DollorDriverColors.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "+15% from yesterday",
                                style = MaterialTheme.typography.bodySmall,
                                color = DollorDriverColors.White.copy(alpha = 0.9f)
                            )
                        }
                    }
                }
            }
        }

        // Stats Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                EarningsStatCard(
                    modifier = Modifier.weight(1f),
                    label = "Rides",
                    value = "8",
                    icon = Icons.Default.DirectionsCar
                )
                EarningsStatCard(
                    modifier = Modifier.weight(1f),
                    label = "Hours",
                    value = "4.2",
                    icon = Icons.Default.AccessTime
                )
                EarningsStatCard(
                    modifier = Modifier.weight(1f),
                    label = "Tips",
                    value = "$18.50",
                    icon = Icons.Default.Paid
                )
            }
        }

        // Earnings Breakdown
        item {
            Text(
                text = "Breakdown",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = DollorDriverColors.Gray900,
                modifier = Modifier.padding(top = 8.dp)
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
                        .padding(16.dp)
                ) {
                    EarningsBreakdownRow("Base Fare", "$95.00")
                    Divider(modifier = Modifier.padding(vertical = 12.dp))
                    EarningsBreakdownRow("Tips", "$18.50")
                    Divider(modifier = Modifier.padding(vertical = 12.dp))
                    EarningsBreakdownRow("Bonuses", "$14.00")
                    Divider(modifier = Modifier.padding(vertical = 12.dp))
                    EarningsBreakdownRow("Platform Fee", "-$0.00", isNegative = true)
                    Divider(modifier = Modifier.padding(vertical = 12.dp))
                    EarningsBreakdownRow("Total", "$127.50", isTotal = true)
                }
            }
        }

        // Payout Button
        item {
            Button(
                onClick = { /* TODO: Request payout */ },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = DollorDriverColors.Blue
                )
            ) {
                Icon(
                    imageVector = Icons.Default.AccountBalance,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Request Payout",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
fun EarningsStatCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
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
fun EarningsBreakdownRow(
    label: String,
    value: String,
    isNegative: Boolean = false,
    isTotal: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = if (isTotal) {
                MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
            } else {
                MaterialTheme.typography.bodyMedium
            },
            color = if (isTotal) DollorDriverColors.Gray900 else DollorDriverColors.Gray600
        )
        Text(
            text = value,
            style = if (isTotal) {
                MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
            } else {
                MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
            },
            color = when {
                isTotal -> DollorDriverColors.Green
                isNegative -> DollorDriverColors.Error
                else -> DollorDriverColors.Gray900
            }
        )
    }
}
