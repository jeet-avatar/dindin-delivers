package com.eatfair.app.ui.tip

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TipDriverScreen(
    driverName: String,
    driverPhoto: String?,
    orderId: String,
    orderTotal: Double,
    onBackClick: () -> Unit,
    onSubmitTip: (Double) -> Unit
) {
    var selectedTipAmount by remember { mutableStateOf<Double?>(null) }
    var customTipText by remember { mutableStateOf("") }
    var showCustomInput by remember { mutableStateOf(false) }

    val suggestedTips = listOf(
        TipOption(2.0, "Good"),
        TipOption(3.0, "Great"),
        TipOption(5.0, "Excellent"),
        TipOption(10.0, "Amazing!")
    )

    val customTipAmount = customTipText.toDoubleOrNull()
    val finalTipAmount = if (showCustomInput) customTipAmount else selectedTipAmount

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add a Tip") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.White)
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Driver Avatar
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF4CAF50).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = driverName.firstOrNull()?.toString() ?: "D",
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF4CAF50)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "$driverName delivered your order!",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "100% of your tip goes directly to the driver",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Suggested Tip Amounts
                Text(
                    text = "Select a tip amount",
                    fontSize = 14.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    suggestedTips.forEach { tip ->
                        val isSelected = !showCustomInput && selectedTipAmount == tip.amount
                        TipCard(
                            modifier = Modifier.weight(1f),
                            amount = tip.amount,
                            label = tip.label,
                            isSelected = isSelected,
                            onClick = {
                                showCustomInput = false
                                selectedTipAmount = tip.amount
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Custom Amount
                OutlinedButton(
                    onClick = {
                        showCustomInput = true
                        selectedTipAmount = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = if (showCustomInput) Color(0xFF4CAF50).copy(alpha = 0.1f) else Color.Transparent
                    ),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = if (showCustomInput)
                            androidx.compose.ui.graphics.SolidColor(Color(0xFF4CAF50))
                        else
                            ButtonDefaults.outlinedButtonBorder.brush
                    )
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Custom Amount")
                }

                // Custom Input Field
                if (showCustomInput) {
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = customTipText,
                        onValueChange = {
                            if (it.isEmpty() || it.matches(Regex("^\\d*\\.?\\d{0,2}$"))) {
                                customTipText = it
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Enter tip amount") },
                        leadingIcon = {
                            Text(
                                "$",
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp
                            )
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Decimal
                        ),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF4CAF50),
                            focusedLabelColor = Color(0xFF4CAF50)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Info Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF5F5F5)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Favorite,
                            contentDescription = null,
                            tint = Color(0xFFE91E63),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Tips make a difference",
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "Your generosity helps drivers earn a fair income",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }
            }

            // Bottom Action
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(16.dp)
                ) {
                    if (finalTipAmount != null && finalTipAmount > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Tip amount", color = Color.Gray)
                            Text(
                                "$${String.format("%.2f", finalTipAmount)}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color(0xFF4CAF50)
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Button(
                        onClick = {
                            finalTipAmount?.let { onSubmitTip(it) }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = finalTipAmount != null && finalTipAmount > 0,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Text(
                            text = if (finalTipAmount != null && finalTipAmount > 0)
                                "Send $${"%.2f".format(finalTipAmount)} Tip"
                            else
                                "Select a tip amount",
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    TextButton(
                        onClick = onBackClick,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Skip", color = Color.Gray)
                    }
                }
            }
        }
    }
}

data class TipOption(
    val amount: Double,
    val label: String
)

@Composable
fun TipCard(
    modifier: Modifier = Modifier,
    amount: Double,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFF4CAF50) else Color(0xFFF5F5F5)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 0.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "$${"%.0f".format(amount)}",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) Color.White else Color.Black
            )
            Text(
                text = label,
                fontSize = 11.sp,
                color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray
            )
        }
    }
}
