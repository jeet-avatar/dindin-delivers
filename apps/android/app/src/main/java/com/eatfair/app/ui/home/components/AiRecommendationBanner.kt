package com.eatfair.app.ui.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.theme.*

/**
 * AI Food Assistant Banner - Matches iOS aiRecommendationBanner
 *
 * Features:
 * - Purple → Pink gradient circle with sparkles icon
 * - "AI Food Assistant" headline
 * - "Tell me what you're craving!" subtitle
 * - "Try Now" CTA button
 * - White background with subtle shadow
 */
@Composable
fun AiRecommendationBanner(
    onTryNowClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = Color.Black.copy(alpha = 0.05f),
                spotColor = Color.Black.copy(alpha = 0.05f)
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Purple-Pink Gradient Circle with Sparkles Icon
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(AiPurple, AiPink)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = "AI",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Text Content
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "AI Food Assistant",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandBlack
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Tell me what you're craving!",
                    fontSize = 14.sp,
                    color = TextGrey
                )
            }

            // Try Now Button - iOS style purple background
            Button(
                onClick = onTryNowClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = AiPurple.copy(alpha = 0.1f)
                ),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "Try Now",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = AiPurple
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun AiRecommendationBannerPreview() {
    AiRecommendationBanner(onTryNowClick = {})
}
