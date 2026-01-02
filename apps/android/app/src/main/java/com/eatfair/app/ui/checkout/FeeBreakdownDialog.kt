package com.eatfair.app.ui.checkout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.shared.config.AppConfig

/**
 * Fee Breakdown Dialog
 * Matches iOS FeeBreakdownDetailView for platform parity
 * Shows complete transparency on where every dollar goes
 */

data class FeeBreakdownItem(
    val label: String,
    val amount: Double,
    val description: String,
    val recipient: String, // "Restaurant", "Driver", "Platform", "Government"
    val icon: ImageVector
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeeBreakdownDialog(
    subtotal: Double,
    deliveryFee: Double,
    platformFee: Double,
    tip: Double,
    taxes: Double,
    total: Double,
    restaurantCount: Int = 1,
    onDismiss: () -> Unit
) {
    val fees = listOf(
        FeeBreakdownItem(
            label = "Food Subtotal",
            amount = subtotal,
            description = "100% goes to the restaurant for your food",
            recipient = "Restaurant",
            icon = Icons.Default.Restaurant
        ),
        FeeBreakdownItem(
            label = "Delivery Fee",
            amount = deliveryFee,
            description = "100% goes directly to your driver",
            recipient = "Driver",
            icon = Icons.Default.DeliveryDining
        ),
        FeeBreakdownItem(
            label = "Driver Tip",
            amount = tip,
            description = "100% goes to your driver - we never take a cut",
            recipient = "Driver",
            icon = Icons.Default.Favorite
        ),
        FeeBreakdownItem(
            label = "Platform Fee",
            amount = platformFee,
            description = "Flat \$${String.format("%.0f", platformFee)} matchmaking fee (not percentage-based)",
            recipient = "Platform",
            icon = Icons.Default.Handshake
        ),
        FeeBreakdownItem(
            label = "Taxes & Fees",
            amount = taxes,
            description = "Required by state and local government",
            recipient = "Government",
            icon = Icons.Default.AccountBalance
        )
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Where Your Money Goes",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Complete transparency on every dollar",
                fontSize = 14.sp,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Fee Breakdown Cards
            fees.filter { it.amount > 0 }.forEach { fee ->
                FeeBreakdownCard(fee = fee)
                Spacer(modifier = Modifier.height(12.dp))
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Total
            HorizontalDivider(color = Color(0xFFE0E0E0))

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Total",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = "$${String.format("%.2f", total)}",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFFF6B35)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Money Flow Visualization
            MoneyFlowVisualization(
                restaurantAmount = subtotal,
                driverAmount = deliveryFee + tip,
                platformAmount = platformFee,
                taxAmount = taxes,
                total = total
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Our Promise Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFE8F5E9)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.VerifiedUser,
                            contentDescription = null,
                            tint = Color(0xFF4CAF50)
                        )
                        Text(
                            text = "Our Promise",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF2E7D32)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    PromiseRow(
                        text = "100% of tips go to drivers",
                        icon = Icons.Default.Check
                    )
                    PromiseRow(
                        text = "Flat \$${AppConfig.FoodDelivery.CUSTOMER_FEE.toInt()} fee per restaurant (not percentage)",
                        icon = Icons.Default.Check
                    )
                    PromiseRow(
                        text = "Drivers keep 100% of delivery fee",
                        icon = Icons.Default.Check
                    )
                    PromiseRow(
                        text = "No hidden charges or surge pricing",
                        icon = Icons.Default.Check
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Multi-restaurant note
            if (restaurantCount > 1) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFFF3E0)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFFFF9800),
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Your order includes $restaurantCount restaurants. Platform fee is \$1 per restaurant.",
                            fontSize = 12.sp,
                            color = Color(0xFFE65100)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Close Button
            Button(
                onClick = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFF6B35)
                )
            ) {
                Text(
                    text = "Got It",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun FeeBreakdownCard(fee: FeeBreakdownItem) {
    val recipientColor = when (fee.recipient) {
        "Restaurant" -> Color(0xFF6C63FF)
        "Driver" -> Color(0xFF4CAF50)
        "Platform" -> Color(0xFFFF6B35)
        "Government" -> Color(0xFF9E9E9E)
        else -> Color.Gray
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF8F8F8)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(recipientColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    fee.icon,
                    contentDescription = null,
                    tint = recipientColor,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Content
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = fee.label,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Black
                    )
                    Text(
                        text = "$${String.format("%.2f", fee.amount)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = fee.description,
                    fontSize = 12.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Recipient badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(recipientColor.copy(alpha = 0.1f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "→ ${fee.recipient}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = recipientColor
                    )
                }
            }
        }
    }
}

@Composable
fun MoneyFlowVisualization(
    restaurantAmount: Double,
    driverAmount: Double,
    platformAmount: Double,
    taxAmount: Double,
    total: Double
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF5F5F5)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Money Flow",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Flow bars
            MoneyFlowBar(
                label = "Restaurant",
                amount = restaurantAmount,
                percentage = (restaurantAmount / total * 100).toInt(),
                color = Color(0xFF6C63FF)
            )

            Spacer(modifier = Modifier.height(8.dp))

            MoneyFlowBar(
                label = "Driver",
                amount = driverAmount,
                percentage = (driverAmount / total * 100).toInt(),
                color = Color(0xFF4CAF50)
            )

            Spacer(modifier = Modifier.height(8.dp))

            MoneyFlowBar(
                label = "Platform",
                amount = platformAmount,
                percentage = (platformAmount / total * 100).toInt(),
                color = Color(0xFFFF6B35)
            )

            if (taxAmount > 0) {
                Spacer(modifier = Modifier.height(8.dp))

                MoneyFlowBar(
                    label = "Taxes",
                    amount = taxAmount,
                    percentage = (taxAmount / total * 100).toInt(),
                    color = Color(0xFF9E9E9E)
                )
            }
        }
    }
}

@Composable
fun MoneyFlowBar(
    label: String,
    amount: Double,
    percentage: Int,
    color: Color
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                fontSize = 12.sp,
                color = Color.Gray
            )
            Text(
                text = "$${String.format("%.2f", amount)} ($percentage%)",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Color.Black
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color(0xFFE0E0E0))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(percentage / 100f)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(4.dp))
                    .background(color)
            )
        }
    }
}

@Composable
fun PromiseRow(
    text: String,
    icon: ImageVector
) {
    Row(
        modifier = Modifier.padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = Color(0xFF4CAF50),
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = text,
            fontSize = 13.sp,
            color = Color(0xFF2E7D32)
        )
    }
}
