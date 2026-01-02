package com.eatfair.app.ui.home.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.theme.*
import com.eatfair.shared.model.home.DealType
import com.eatfair.shared.model.home.FeaturedDeal

/**
 * Featured Deals Section - Matches iOS featuredDealsSection
 *
 * Features:
 * - "Hot Deals" header with flame icon
 * - Horizontal scrolling deal cards
 * - Gradient backgrounds based on deal type
 * - Promo code with copy functionality
 */
@Composable
fun FeaturedDealsSection(
    deals: List<FeaturedDeal>,
    onDealClick: (FeaturedDeal) -> Unit,
    modifier: Modifier = Modifier
) {
    if (deals.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        // Header: "Hot Deals" with flame icon
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.LocalFireDepartment,
                contentDescription = "Hot",
                tint = DealOrange,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Hot Deals",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Horizontal scrolling deal cards
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            items(deals) { deal ->
                FeaturedDealCard(
                    deal = deal,
                    onClick = { onDealClick(deal) }
                )
            }
        }
    }
}

/**
 * Individual Deal Card - Matches iOS HomeFeaturedDealCard
 *
 * Gradient colors based on deal type:
 * - PERCENTAGE: Orange → Red
 * - FLAT_AMOUNT: Purple → Pink
 * - FREE_DELIVERY: Green → Teal
 * - BOGO: Blue → Purple
 */
@Composable
fun FeaturedDealCard(
    deal: FeaturedDeal,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    val gradientColors = when (deal.dealType) {
        DealType.PERCENTAGE -> listOf(DealOrange, DealRed)
        DealType.FLAT_AMOUNT -> listOf(DealPurple, AiPink)
        DealType.FREE_DELIVERY -> listOf(BrandGreen, DealTeal)
        DealType.BOGO -> listOf(DealBlue, DealPurple)
    }

    Card(
        modifier = modifier
            .width(200.dp)
            .height(140.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.linearGradient(colors = gradientColors)
                )
                .padding(12.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top content
                Column {
                    Text(
                        text = deal.headline,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = deal.vendorName,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = deal.description,
                        fontSize = 11.sp,
                        color = Color.White.copy(alpha = 0.8f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Promo code badge
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.White.copy(alpha = 0.2f))
                        .clickable {
                            clipboardManager.setText(AnnotatedString(deal.promoCode))
                            Toast.makeText(context, "Promo code copied!", Toast.LENGTH_SHORT).show()
                        }
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.ConfirmationNumber,
                        contentDescription = "Promo",
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = deal.promoCode,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

// Previews removed - no mock data
