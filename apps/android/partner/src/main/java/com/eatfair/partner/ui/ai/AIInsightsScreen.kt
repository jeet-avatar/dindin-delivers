package com.eatfair.partner.ui.ai

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Dollor.ai Restaurant Partner - AI Insights Dashboard
 * MATCHES iOS: eatffairrestaurant/Views/AIInsightsView.swift
 *
 * Structure:
 * 1. AI Status Header with gradient
 * 2. Insight Type Selector (Demand, Inventory, Pricing, Staff)
 * 3. Insight Cards based on selection
 * 4. Smart Recommendations Card
 * 5. Real-time Alerts Card
 * 6. AI Learning Progress Card
 *
 * Connected to AIViewModel for backend API integration
 */

// Brand Colors - Match iOS RestaurantTheme.swift exactly
private val BrandOrange = Color(0xFFF2994A)
private val BrandGreen = Color(0xFF06C167)
private val BrandBlue = Color(0xFF2196F3)
private val BrandPurple = Color(0xFF9C27B0)
private val BrandRed = Color(0xFFF44336)

// iOS System Colors
private val BackgroundGrouped = Color(0xFFF2F2F7)  // iOS systemGroupedBackground
private val BackgroundPrimary = Color.White        // iOS backgroundPrimary (cards)
private val TextPrimary = Color(0xFF000000)        // iOS primary label
private val TextSecondary = Color(0xFF8E8E93)      // iOS secondary label
private val SeparatorColor = Color(0xFFC6C6C8)     // iOS separator

enum class AIInsightType(val displayName: String, val icon: ImageVector, val color: Color) {
    DEMAND("Demand", Icons.Default.TrendingUp, BrandPurple),
    INVENTORY("Inventory", Icons.Default.Inventory, BrandOrange),
    PRICING("Pricing", Icons.Default.AttachMoney, BrandGreen),
    STAFF("Staffing", Icons.Default.People, BrandBlue)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIInsightsScreen(
    viewModel: AIViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val aiData = uiState.aiData
    var selectedInsight by remember { mutableStateOf(AIInsightType.DEMAND) }

    // Use Column since this is embedded in MainScreen's tab content
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundGrouped)
    ) {
        // Header - iOS large title style (34sp bold)
        Text(
            "AI Insights",
            modifier = Modifier
                .fillMaxWidth()
                .background(BackgroundGrouped)
                .padding(horizontal = 20.dp, vertical = 8.dp),
            fontWeight = FontWeight.Bold,
            fontSize = 34.sp,  // iOS largeTitle
            color = TextPrimary
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // AI Status Header - matches iOS aiStatusHeader
            item {
                AIStatusHeader(
                    ordersCount = aiData.totalOrders,
                    isActive = uiState.isAIActive
                )
            }

            // Insight Type Selector - matches iOS insightTypeSelector
            item {
                InsightTypeSelector(
                    selectedInsight = selectedInsight,
                    onInsightSelected = { selectedInsight = it }
                )
            }

            // Insight Card based on selection
            item {
                when (selectedInsight) {
                    AIInsightType.DEMAND -> DemandForecastCard(
                        estimatedNextHour = aiData.estimatedOrdersNextHour,
                        peakTime = aiData.peakTime,
                        confidence = aiData.predictionConfidence
                    )
                    AIInsightType.INVENTORY -> InventoryInsightsCard()
                    AIInsightType.PRICING -> PricingInsightsCard()
                    AIInsightType.STAFF -> StaffingInsightsCard(
                        weeklySavings = aiData.weeklyLaborSavings
                    )
                }
            }

            // Smart Recommendations - matches iOS smartRecommendationsCard
            item {
                SmartRecommendationsCard()
            }

            // Real-time Alerts - matches iOS realTimeAlertsCard
            item {
                RealTimeAlertsCard()
            }

            // AI Learning Progress - matches iOS aiLearningCard
            item {
                AILearningProgressCard(ordersCount = aiData.totalOrders)
            }

            // Bottom padding
            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

/**
 * AI Status Header - matches iOS aiStatusHeader
 */
@Composable
private fun AIStatusHeader(ordersCount: Int, isActive: Boolean = true) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            BrandPurple.copy(alpha = 0.1f),
                            BrandBlue.copy(alpha = 0.1f)
                        )
                    )
                )
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Brain icon with gradient background
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(BrandPurple, BrandBlue)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Psychology,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            if (isActive) "AI Engine Active" else "AI Engine Loading",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,  // iOS .headline
                            color = TextPrimary
                        )
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (isActive) BrandGreen else Color.Gray)
                        )
                    }
                    Text(
                        "Analyzing $ordersCount orders to optimize your restaurant",
                        fontSize = 13.sp,  // iOS .caption
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

/**
 * Insight Type Selector - matches iOS insightTypeSelector
 */
@Composable
private fun InsightTypeSelector(
    selectedInsight: AIInsightType,
    onInsightSelected: (AIInsightType) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AIInsightType.entries.forEach { type ->
            Surface(
                onClick = { onInsightSelected(type) },
                shape = RoundedCornerShape(12.dp),
                color = if (selectedInsight == type) type.color else type.color.copy(alpha = 0.1f)
            ) {
                Column(
                    modifier = Modifier
                        .width(80.dp)
                        .padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = type.icon,
                        contentDescription = type.displayName,
                        tint = if (selectedInsight == type) Color.White else type.color,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = type.displayName,
                        fontSize = 13.sp,  // iOS .caption
                        fontWeight = if (selectedInsight == type) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (selectedInsight == type) Color.White else TextPrimary
                    )
                }
            }
        }
    }
}

/**
 * Demand Forecast Card - matches iOS demandForecastCard
 */
@Composable
private fun DemandForecastCard(
    estimatedNextHour: Int = 12,
    peakTime: String = "7:00 PM",
    confidence: Int = 87
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.TrendingUp, contentDescription = null, tint = BrandPurple)
                    Text("Demand Forecast", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
                }
                TextButton(onClick = { }) {
                    Text("View Details", fontSize = 13.sp, color = BrandPurple)  // iOS .caption
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Simple forecast chart visualization
            DemandChart(modifier = Modifier.fillMaxWidth().height(150.dp))

            Spacer(modifier = Modifier.height(16.dp))

            // Prediction badges with API data
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                PredictionBadge("Next Hour", "$estimatedNextHour", "orders expected", BrandPurple)
                PredictionBadge("Peak Time", peakTime, "prepare extra staff", BrandOrange)
                PredictionBadge("Confidence", "$confidence%", "prediction accuracy", BrandGreen)
            }
        }
    }
}

@Composable
private fun DemandChart(modifier: Modifier = Modifier) {
    val data = remember { listOf(5f, 8f, 15f, 25f, 35f, 30f, 20f) }
    val maxValue = data.maxOrNull() ?: 1f

    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val pointSpacing = width / (data.size - 1)

        // Draw area
        val path = androidx.compose.ui.graphics.Path()
        data.forEachIndexed { index, value ->
            val x = index * pointSpacing
            val y = height - (value / maxValue) * height * 0.8f

            if (index == 0) {
                path.moveTo(x, height)
                path.lineTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }
        path.lineTo(width, height)
        path.close()

        drawPath(path = path, color = BrandPurple.copy(alpha = 0.2f))

        // Draw line
        val linePath = androidx.compose.ui.graphics.Path()
        data.forEachIndexed { index, value ->
            val x = index * pointSpacing
            val y = height - (value / maxValue) * height * 0.8f

            if (index == 0) linePath.moveTo(x, y) else linePath.lineTo(x, y)
        }

        drawPath(
            path = linePath,
            color = BrandPurple,
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
        )

        // Draw points
        data.forEachIndexed { index, value ->
            val x = index * pointSpacing
            val y = height - (value / maxValue) * height * 0.8f
            drawCircle(color = BrandPurple, radius = 5.dp.toPx(), center = Offset(x, y))
        }
    }
}

@Composable
private fun PredictionBadge(label: String, value: String, sublabel: String, color: Color) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(color.copy(alpha = 0.1f))
            .padding(12.dp)
    ) {
        Text(label, fontSize = 11.sp, color = TextSecondary)  // iOS .caption2
        Text(value, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = color)  // iOS .headline
        Text(sublabel, fontSize = 11.sp, color = TextSecondary)  // iOS .caption2
    }
}

/**
 * Inventory Insights Card - matches iOS inventoryInsightsCard
 */
@Composable
private fun InventoryInsightsCard() {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Inventory, contentDescription = null, tint = BrandOrange)
                Text("Inventory Insights", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
            }

            Spacer(modifier = Modifier.height(16.dp))

            InventoryAlertRow("Chicken Breast", "critical", "~8 servings", "Order now")
            InventoryAlertRow("Mozzarella Cheese", "warning", "~20 servings", "Order soon")
            InventoryAlertRow("Olive Oil", "good", "~50 servings", "Well stocked")

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = SeparatorColor)
            Spacer(modifier = Modifier.height(16.dp))

            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("AI Suggestion", fontSize = 13.sp, color = TextSecondary)  // iOS .caption
                    Text("Based on tonight's forecast, order extra chicken and cheese before 3 PM", fontSize = 15.sp, color = TextPrimary)  // iOS .subheadline
                }
                Button(
                    onClick = { },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandOrange),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text("Order", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)  // iOS .subheadline semibold
                }
            }
        }
    }
}

@Composable
private fun InventoryAlertRow(item: String, status: String, remaining: String, action: String) {
    val (color, icon) = when (status) {
        "critical" -> BrandRed to Icons.Default.Warning
        "warning" -> BrandOrange to Icons.Default.Info
        else -> BrandGreen to Icons.Default.CheckCircle
    }

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = TextPrimary)  // iOS .subheadline medium
            Text(remaining, fontSize = 13.sp, color = TextSecondary)  // iOS .caption
        }
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = color.copy(alpha = 0.1f)
        ) {
            Text(
                action,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                fontSize = 13.sp,  // iOS .caption
                fontWeight = FontWeight.Medium,
                color = color
            )
        }
    }
}

/**
 * Pricing Insights Card - matches iOS pricingInsightsCard
 */
@Composable
private fun PricingInsightsCard() {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.AttachMoney, contentDescription = null, tint = BrandGreen)
                Text("Dynamic Pricing Insights", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
            }

            Spacer(modifier = Modifier.height(16.dp))

            PricingRecommendationRow("Margherita Pizza", 14.99, 16.99, "High demand during dinner hours", "+\$45/day revenue")
            Spacer(modifier = Modifier.height(12.dp))
            PricingRecommendationRow("Caesar Salad", 11.99, 9.99, "Low order volume, price sensitivity detected", "+12 orders/day")

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = SeparatorColor)
            Spacer(modifier = Modifier.height(16.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Lightbulb, contentDescription = null, tint = BrandOrange, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Enable dynamic pricing to automatically adjust prices based on demand",
                    fontSize = 13.sp,  // iOS .caption
                    color = TextSecondary,
                    modifier = Modifier.weight(1f)
                )
                Switch(checked = false, onCheckedChange = { })
            }
        }
    }
}

@Composable
private fun PricingRecommendationRow(item: String, current: Double, suggested: Double, reason: String, impact: String) {
    val isIncrease = suggested > current
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = Color.Gray.copy(alpha = 0.05f)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(item, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = TextPrimary)  // iOS .subheadline medium
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("$${String.format("%.2f", current)}", fontSize = 13.sp, color = TextSecondary)  // iOS .caption
                    Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(12.dp), tint = TextSecondary)
                    Text(
                        "$${String.format("%.2f", suggested)}",
                        fontSize = 13.sp,  // iOS .caption
                        fontWeight = FontWeight.Bold,
                        color = if (isIncrease) BrandGreen else BrandOrange
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(reason, fontSize = 13.sp, color = TextSecondary)  // iOS .caption
            Text(impact, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = BrandGreen)  // iOS .caption medium
        }
    }
}

/**
 * Staffing Insights Card - matches iOS staffingInsightsCard
 */
@Composable
private fun StaffingInsightsCard(weeklySavings: Double = 320.0) {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.People, contentDescription = null, tint = BrandBlue)
                Text("Staffing Optimization", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
            }

            Spacer(modifier = Modifier.height(16.dp))

            StaffingTimeSlot("11 AM - 2 PM", 3, 2, "understaffed")
            StaffingTimeSlot("2 PM - 5 PM", 2, 2, "optimal")
            StaffingTimeSlot("5 PM - 9 PM", 4, 3, "understaffed")
            StaffingTimeSlot("9 PM - Close", 2, 3, "overstaffed")

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = SeparatorColor)
            Spacer(modifier = Modifier.height(16.dp))

            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Weekly Labor Cost Optimization", fontSize = 13.sp, color = TextSecondary)  // iOS .caption
                    Text("Potential savings: \$${String.format("%.0f", weeklySavings)}/week", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = BrandGreen)  // iOS .subheadline
                }
                Button(
                    onClick = { },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Optimize Schedule", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)  // iOS .caption semibold
                }
            }
        }
    }
}

@Composable
private fun StaffingTimeSlot(time: String, recommended: Int, current: Int, status: String) {
    val (color, statusText) = when (status) {
        "understaffed" -> BrandRed to "Need +${recommended - current}"
        "overstaffed" -> BrandOrange to "Overstaffed"
        else -> BrandGreen to "Optimal"
    }

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(time, fontSize = 15.sp, color = TextPrimary, modifier = Modifier.width(100.dp))  // iOS .subheadline
        Spacer(modifier = Modifier.weight(1f))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            repeat(maxOf(recommended, current)) { i ->
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = when {
                        i < current && i < recommended -> BrandGreen
                        i < current -> BrandOrange
                        else -> Color.Gray.copy(alpha = 0.3f)
                    }
                )
            }
        }
        Spacer(modifier = Modifier.weight(1f))
        Text(statusText, fontSize = 13.sp, color = color)  // iOS .caption
    }
}

/**
 * Smart Recommendations Card - matches iOS smartRecommendationsCard
 */
@Composable
private fun SmartRecommendationsCard() {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = BrandPurple)
                Text("Smart Recommendations", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
            }

            Spacer(modifier = Modifier.height(16.dp))

            RecommendationRow(Icons.Default.Schedule, "Reduce Prep Time", "Pre-prep pizza dough 30 min before dinner rush", "Save 5 min per order", BrandBlue)
            Spacer(modifier = Modifier.height(12.dp))
            RecommendationRow(Icons.Default.ShoppingBag, "Bundle Suggestion", "Create 'Family Meal Deal' - projected +15% order value", "+\$180/day revenue", BrandGreen)
            Spacer(modifier = Modifier.height(12.dp))
            RecommendationRow(Icons.Default.Star, "Trending Item", "Chicken Tikka orders up 45% - feature on homepage", "Increase visibility", BrandOrange)
        }
    }
}

@Composable
private fun RecommendationRow(icon: ImageVector, title: String, description: String, impact: String, color: Color) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = color.copy(alpha = 0.05f)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = TextPrimary)  // iOS .subheadline medium
                Text(description, fontSize = 13.sp, color = TextSecondary)  // iOS .caption
                Text(impact, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = BrandGreen)  // iOS .caption medium
            }
            Icon(Icons.Default.ArrowForward, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        }
    }
}

/**
 * Real-time Alerts Card - matches iOS realTimeAlertsCard
 */
@Composable
private fun RealTimeAlertsCard() {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Notifications, contentDescription = null, tint = BrandRed)
                    Text("Real-time Alerts", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
                }
                Surface(shape = RoundedCornerShape(10.dp), color = BrandRed) {
                    Text(
                        "3 active",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 13.sp,  // iOS .caption
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            AlertRow("warning", "Prep time above average (28 min vs 20 min target)", "2 min ago")
            Spacer(modifier = Modifier.height(8.dp))
            AlertRow("info", "Unusual spike in orders from Downtown area", "15 min ago")
            Spacer(modifier = Modifier.height(8.dp))
            AlertRow("success", "Customer rating improved to 4.8 this week", "1 hour ago")
        }
    }
}

@Composable
private fun AlertRow(type: String, message: String, time: String) {
    val (color, icon) = when (type) {
        "warning" -> BrandOrange to Icons.Default.Warning
        "info" -> BrandBlue to Icons.Default.Info
        else -> BrandGreen to Icons.Default.CheckCircle
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
            Column {
                Text(message, fontSize = 13.sp, color = TextPrimary)  // iOS .caption
                Text(time, fontSize = 11.sp, color = TextSecondary)  // iOS .caption2
            }
        }
    }
}

/**
 * AI Learning Progress Card - matches iOS aiLearningCard
 */
@Composable
private fun AILearningProgressCard(ordersCount: Int) {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BackgroundPrimary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Psychology, contentDescription = null, tint = BrandPurple)
                Text("AI Learning Progress", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)  // iOS .headline
            }

            Spacer(modifier = Modifier.height(16.dp))

            LearningProgressRow("Order Pattern Recognition", 0.92f, "Excellent")
            Spacer(modifier = Modifier.height(12.dp))
            LearningProgressRow("Customer Preference Model", 0.78f, "Good")
            Spacer(modifier = Modifier.height(12.dp))
            LearningProgressRow("Prep Time Optimization", 0.85f, "Very Good")
            Spacer(modifier = Modifier.height(12.dp))
            LearningProgressRow("Demand Forecasting", 0.67f, "Learning")

            Spacer(modifier = Modifier.height(16.dp))

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Info, contentDescription = null, tint = BrandBlue, modifier = Modifier.size(16.dp))
                Text(
                    "AI accuracy improves as more orders are processed. Current dataset: $ordersCount orders",
                    fontSize = 13.sp,  // iOS .caption
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
private fun LearningProgressRow(label: String, progress: Float, status: String) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontSize = 13.sp, color = TextSecondary)  // iOS .caption
            Text("${(progress * 100).toInt()}%", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = BrandPurple)  // iOS .caption semibold
        }

        Spacer(modifier = Modifier.height(6.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(BrandPurple.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(3.dp))
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(BrandPurple, BrandBlue)
                        )
                    )
            )
        }
    }
}
