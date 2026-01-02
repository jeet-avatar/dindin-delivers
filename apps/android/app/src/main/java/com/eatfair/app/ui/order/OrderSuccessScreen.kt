package com.eatfair.app.ui.order

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.random.Random

/**
 * Order Success Screen
 * Matches iOS OrderSuccessView for platform parity
 * Shows order confirmation with confetti animation
 */

data class OrderSuccessData(
    val orderId: String,
    val restaurantName: String,
    val totalAmount: Double,
    val estimatedDelivery: String,
    val itemCount: Int
)

@Composable
fun OrderSuccessScreen(
    orderData: OrderSuccessData,
    onTrackOrder: () -> Unit,
    onContinueShopping: () -> Unit,
    onRateExperience: () -> Unit
) {
    var showConfetti by remember { mutableStateOf(true) }

    // Animation for the checkmark
    val checkmarkScale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "checkmarkScale"
    )

    // Stop confetti after 4 seconds
    LaunchedEffect(Unit) {
        delay(4000)
        showConfetti = false
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        // Confetti
        if (showConfetti) {
            ConfettiOverlay()
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            // Success Icon and Message
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(checkmarkScale)
                        .clip(CircleShape)
                        .background(Color(0xFF4CAF50).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = "Success",
                        modifier = Modifier.size(80.dp),
                        tint = Color(0xFF4CAF50)
                    )
                }

                Text(
                    text = "Order Confirmed!",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                Text(
                    text = "Your order has been placed successfully",
                    fontSize = 16.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )
            }

            // Order Details Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F8F8))
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Order Details",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )

                    HorizontalDivider(color = Color(0xFFE0E0E0))

                    OrderDetailRow(label = "Order ID", value = "#${orderData.orderId.takeLast(8).uppercase()}")
                    OrderDetailRow(label = "Restaurant", value = orderData.restaurantName)
                    OrderDetailRow(label = "Items", value = "${orderData.itemCount} item(s)")
                    OrderDetailRow(label = "Total", value = "$${String.format("%.2f", orderData.totalAmount)}")

                    HorizontalDivider(color = Color(0xFFE0E0E0))

                    // Estimated Delivery
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
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = Color(0xFFFF6B35),
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Estimated Delivery",
                                fontSize = 14.sp,
                                color = Color.Gray
                            )
                        }

                        Text(
                            text = orderData.estimatedDelivery,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFFF6B35)
                        )
                    }
                }
            }

            // Action Buttons
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onTrackOrder,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF6B35)
                    )
                ) {
                    Icon(
                        Icons.Default.DeliveryDining,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Track My Order",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }

                OutlinedButton(
                    onClick = onRateExperience,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFFFF6B35)
                    )
                ) {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Rate Your Experience",
                        fontWeight = FontWeight.Medium,
                        fontSize = 16.sp
                    )
                }

                TextButton(
                    onClick = onContinueShopping,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Continue Shopping",
                        color = Color.Gray,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun OrderDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 14.sp,
            color = Color.Gray
        )
        Text(
            text = value,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = Color.Black
        )
    }
}

@Composable
fun ConfettiOverlay() {
    val confettiColors = listOf(
        Color(0xFFFF6B35), // Orange
        Color(0xFF4CAF50), // Green
        Color(0xFF2196F3), // Blue
        Color(0xFFFFC107), // Yellow
        Color(0xFFE91E63), // Pink
        Color(0xFF9C27B0)  // Purple
    )

    val particles = remember {
        List(50) {
            ConfettiParticle(
                x = Random.nextFloat(),
                y = Random.nextFloat() * -1f,
                color = confettiColors.random(),
                speed = Random.nextFloat() * 2f + 1f,
                angle = Random.nextFloat() * 40f - 20f
            )
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "confetti")
    val progress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "confettiProgress"
    )

    Canvas(modifier = Modifier.fillMaxSize()) {
        particles.forEach { particle ->
            val adjustedY = ((particle.y + progress * particle.speed) % 1.5f)
            val x = particle.x * size.width + Math.sin((adjustedY * 10 + particle.angle).toDouble()).toFloat() * 20f

            drawCircle(
                color = particle.color,
                radius = 6f,
                center = Offset(x, adjustedY * size.height)
            )
        }
    }
}

data class ConfettiParticle(
    val x: Float,
    val y: Float,
    val color: Color,
    val speed: Float,
    val angle: Float
)
