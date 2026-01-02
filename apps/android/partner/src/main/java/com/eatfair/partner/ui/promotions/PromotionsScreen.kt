package com.eatfair.partner.ui.promotions

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class Promotion(
    val id: String,
    val code: String,
    val title: String,
    val description: String,
    val discountType: DiscountType,
    val discountValue: Double,
    val minOrderValue: Double?,
    val maxDiscount: Double?,
    val usageCount: Int,
    val usageLimit: Int?,
    val startDate: String,
    val endDate: String?,
    val isActive: Boolean
)

enum class DiscountType {
    PERCENTAGE,
    FLAT_AMOUNT,
    FREE_DELIVERY
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PromotionsScreen(
    onBackClick: () -> Unit,
    onCreatePromotion: () -> Unit,
    onEditPromotion: (Promotion) -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Active", "Scheduled", "Expired")

    // Sample promotions
    val promotions = remember {
        listOf(
            Promotion(
                id = "1",
                code = "SUMMER20",
                title = "Summer Special",
                description = "20% off on all orders",
                discountType = DiscountType.PERCENTAGE,
                discountValue = 20.0,
                minOrderValue = 25.0,
                maxDiscount = 15.0,
                usageCount = 45,
                usageLimit = 100,
                startDate = "Dec 1, 2024",
                endDate = "Dec 31, 2024",
                isActive = true
            ),
            Promotion(
                id = "2",
                code = "FREEDEL",
                title = "Free Delivery",
                description = "Free delivery on orders $30+",
                discountType = DiscountType.FREE_DELIVERY,
                discountValue = 0.0,
                minOrderValue = 30.0,
                maxDiscount = null,
                usageCount = 78,
                usageLimit = null,
                startDate = "Nov 15, 2024",
                endDate = null,
                isActive = true
            ),
            Promotion(
                id = "3",
                code = "FLAT5",
                title = "$5 Off",
                description = "Flat $5 discount",
                discountType = DiscountType.FLAT_AMOUNT,
                discountValue = 5.0,
                minOrderValue = 20.0,
                maxDiscount = null,
                usageCount = 120,
                usageLimit = 200,
                startDate = "Oct 1, 2024",
                endDate = "Nov 30, 2024",
                isActive = false
            )
        )
    }

    val activePromotions = promotions.filter { it.isActive }
    val expiredPromotions = promotions.filter { !it.isActive }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Promotions", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onCreatePromotion,
                containerColor = Color(0xFFFF5722),
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Create Promotion")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // Tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Color(0xFFFF5722)
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            // Stats Summary
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFFF5722)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    PromoStat(value = "${activePromotions.size}", label = "Active")
                    PromoStat(value = "${promotions.sumOf { it.usageCount }}", label = "Total Uses")
                    PromoStat(value = "$${String.format("%.0f", promotions.sumOf { it.usageCount * 5.0 })}", label = "Saved")
                }
            }

            // Promotions List
            when (selectedTab) {
                0 -> PromotionsList(
                    promotions = activePromotions,
                    onEdit = onEditPromotion
                )
                1 -> EmptyPromotionsView("No scheduled promotions")
                2 -> PromotionsList(
                    promotions = expiredPromotions,
                    onEdit = onEditPromotion
                )
            }
        }
    }
}

@Composable
fun PromoStat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontWeight = FontWeight.Bold,
            fontSize = 24.sp,
            color = Color.White
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.White.copy(alpha = 0.8f)
        )
    }
}

@Composable
fun PromotionsList(
    promotions: List<Promotion>,
    onEdit: (Promotion) -> Unit
) {
    if (promotions.isEmpty()) {
        EmptyPromotionsView("No promotions found")
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(promotions) { promo ->
                PromotionCard(
                    promotion = promo,
                    onEdit = { onEdit(promo) }
                )
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
fun PromotionCard(
    promotion: Promotion,
    onEdit: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onEdit),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Header with gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = if (promotion.isActive)
                                listOf(Color(0xFFFF5722), Color(0xFFFF8A65))
                            else
                                listOf(Color.Gray, Color.LightGray)
                        )
                    )
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = promotion.code,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = Color.White
                        )
                        Text(
                            text = promotion.title,
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = when (promotion.discountType) {
                                DiscountType.PERCENTAGE -> "${promotion.discountValue.toInt().coerceAtLeast(0)}% OFF"
                                DiscountType.FLAT_AMOUNT -> "$${promotion.discountValue.toInt().coerceAtLeast(0)} OFF"
                                DiscountType.FREE_DELIVERY -> "FREE DELIVERY"
                            },
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }

            // Details
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = promotion.description,
                    color = Color.Gray,
                    fontSize = 14.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Usage Progress
                if (promotion.usageLimit != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Usage",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                        Text(
                            text = "${promotion.usageCount} / ${promotion.usageLimit}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { promotion.usageCount.toFloat() / promotion.usageLimit.toFloat() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = Color(0xFFFF5722),
                        trackColor = Color(0xFFE0E0E0)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Info Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CalendarToday,
                            contentDescription = null,
                            tint = Color.Gray,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (promotion.endDate != null)
                                "${promotion.startDate} - ${promotion.endDate}"
                            else
                                "Started ${promotion.startDate}",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }

                    if (promotion.minOrderValue != null) {
                        Text(
                            text = "Min. $${promotion.minOrderValue.toInt().coerceAtLeast(0)}",
                            fontSize = 12.sp,
                            color = Color(0xFFFF5722)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    if (promotion.isActive) {
                        OutlinedButton(
                            onClick = { /* Pause */ },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color.Gray
                            )
                        ) {
                            Icon(
                                Icons.Default.Pause,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Pause")
                        }
                    } else {
                        OutlinedButton(
                            onClick = { /* Reactivate */ },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Icon(
                                Icons.Default.PlayArrow,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Reactivate")
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = onEdit,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF5722)
                        )
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Edit")
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyPromotionsView(message: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.LocalOffer,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = Color.LightGray
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = message,
                fontSize = 16.sp,
                color = Color.Gray
            )
        }
    }
}
