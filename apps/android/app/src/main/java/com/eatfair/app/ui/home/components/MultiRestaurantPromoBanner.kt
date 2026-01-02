package com.eatfair.app.ui.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.theme.*
import com.eatfair.shared.config.AppConfig

/**
 * Multi-Restaurant Promo Banner - Matches iOS multiRestaurantPromoBanner
 *
 * Features:
 * - Orange → Red horizontal gradient
 * - Star icon with "NEW: Multi-Restaurant Orders" headline
 * - Description text about ordering from 3 restaurants
 * - Per restaurant pricing from AppConfig
 * - "Learn More" link with arrow
 *
 * Only shows when cart is empty (conditional in HomeScreen)
 */
@Composable
fun MultiRestaurantPromoBanner(
    onLearnMoreClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable { onLearnMoreClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.horizontalGradient(
                        colors = listOf(PromoOrange, PromoRed)
                    )
                )
                .padding(16.dp)
        ) {
            Column {
                // Header with star icon
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "New",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "NEW: Multi-Restaurant Orders",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Description
                Text(
                    text = "Order from up to 3 restaurants in one delivery! Just \$${String.format("%.2f", AppConfig.FoodDelivery.CUSTOMER_FEE)} per restaurant.",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.9f),
                    lineHeight = 20.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Learn More link
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onLearnMoreClick() }
                ) {
                    Text(
                        text = "Learn More",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = "Learn More",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun MultiRestaurantPromoBannerPreview() {
    MultiRestaurantPromoBanner(onLearnMoreClick = {})
}
