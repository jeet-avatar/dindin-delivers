package com.eatfair.app.ui.rideshare

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.data.RideReceipt

private val Brand = Color(0xFF6C63FF)

/**
 * Itemized ride receipt shown after a ride completes (parity with iOS).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RideReceiptScreen(
    receipt: RideReceipt?,
    isLoading: Boolean,
    onClose: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Receipt", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Color.White
    ) { padding ->
        when {
            isLoading && receipt == null -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }
            receipt == null -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) { Text("Receipt unavailable.", color = Color.Gray) }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(Brand.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Receipt, null, tint = Brand, modifier = Modifier.size(36.dp))
                    }

                    Spacer(Modifier.height(12.dp))
                    Text("Ride Receipt", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    (receipt.rideNumber ?: receipt.rideRequestId?.let { "#$it" })?.let {
                        Text(it, fontSize = 13.sp, color = Color.Gray)
                    }
                    (receipt.completedAt ?: receipt.date)?.let {
                        Text(it, fontSize = 13.sp, color = Color.Gray)
                    }

                    Spacer(Modifier.height(20.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F7F9))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            receipt.driverName?.let { Row2("Driver", it) }
                            receipt.pickupAddress?.let { Row2("From", it) }
                            receipt.dropoffAddress?.let { Row2("To", it) }
                            receipt.distanceMiles?.let { Row2("Distance", String.format("%.1f mi", it)) }
                            receipt.durationMinutes?.let { Row2("Duration", "$it min") }
                            receipt.paymentMethod?.let { Row2("Payment", it) }
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            receipt.fare?.let { AmountRow("Fare", it) }
                            receipt.platformFee?.let { AmountRow("Platform fee", it) }
                            receipt.tip?.let { if (it > 0) AmountRow("Tip", it) }
                            if (receipt.total != null) {
                                Divider(modifier = Modifier.padding(vertical = 8.dp))
                                AmountRow("Total", receipt.total, bold = true)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Row2(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 13.sp, color = Color.Gray)
        Text(
            value,
            fontSize = 13.sp,
            color = Color.Black,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(start = 16.dp)
        )
    }
}

@Composable
private fun AmountRow(label: String, amount: Double, bold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            fontSize = if (bold) 16.sp else 14.sp,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            "$${String.format("%.2f", amount)}",
            fontSize = if (bold) 16.sp else 14.sp,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
        )
    }
}
