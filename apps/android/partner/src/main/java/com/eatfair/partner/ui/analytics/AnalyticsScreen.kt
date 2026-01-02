package com.eatfair.partner.ui.analytics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Dollor.ai Restaurant Partner - Analytics Dashboard
 * MATCHES iOS: eatffairrestaurant/Views/AnalyticsView.swift
 *
 * Structure:
 * 1. Period Selector (Today, This Week, This Month, This Year)
 * 2. Key Metrics Grid (2x2)
 * 3. Revenue Chart Card
 * 4. Orders by Status Card
 * 5. Top Selling Items Card
 * 6. Peak Hours Card
 * 7. Performance Summary Card
 */

// Brand Colors - Match iOS RestaurantTheme.swift exactly
private val BrandOrange = Color(0xFFF2994A)      // #F2994A - Primary brand
private val BrandGreen = Color(0xFF06C167)       // #06C167 - Success
private val BrandBlue = Color(0xFF2196F3)        // #2196F3 - Info
private val BrandPurple = Color(0xFF9C27B0)      // #9C27B0 - Categories
private val BrandRed = Color(0xFFF44336)         // #F44336 - Error
private val BrandGrey = Color(0xFFF5F5F5)        // #F5F5F5 - Background
private val BrandBlack = Color(0xFF101010)       // #101010 - Text primary

enum class TimePeriod(val displayName: String) {
    TODAY("Today"),
    WEEK("This Week"),
    MONTH("This Month"),
    YEAR("This Year")
}

enum class ChartType(val displayName: String) {
    REVENUE("Revenue"),
    ORDERS("Orders"),
    AVG_ORDER("Avg Order")
}

data class HourlyData(
    val hour: String,
    val revenue: Double,
    val orders: Int,
    val avgOrder: Double
)

data class PopularItem(
    val name: String,
    val quantity: Int,
    val revenue: Double
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(
    viewModel: AnalyticsViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedChartType by remember { mutableStateOf(ChartType.REVENUE) }

    // Get data from ViewModel (connected to backend API)
    val analyticsData = uiState.analyticsData
    val selectedPeriod = uiState.selectedPeriod

    // Key metrics from ViewModel
    val totalRevenue = analyticsData.totalRevenue
    val totalOrders = analyticsData.totalOrders
    val avgOrderValue = analyticsData.avgOrderValue
    val avgPrepTime = analyticsData.avgPrepTime

    // Orders by status from ViewModel
    val completedOrders = analyticsData.completedOrders
    val preparingOrders = analyticsData.preparingOrders
    val readyOrders = analyticsData.readyOrders
    val newOrders = analyticsData.newOrders

    // Convert to local data types for charts
    val hourlyData = remember(analyticsData.hourlyData) {
        analyticsData.hourlyData.map { data ->
            HourlyData(data.hour, data.revenue, data.orders, data.avgOrder)
        }.ifEmpty {
            (9..21).map { hour ->
                val hourStr = if (hour > 12) "${hour - 12}PM" else if (hour == 12) "12PM" else "${hour}AM"
                HourlyData(hourStr, (100..500).random().toDouble(), (2..15).random(), (15..35).random().toDouble())
            }
        }
    }

    val popularItems = remember(analyticsData.popularItems) {
        analyticsData.popularItems.map { item ->
            PopularItem(item.name, item.quantity, item.revenue)
        }
    }

    // Performance metrics from ViewModel
    val performanceMetrics = analyticsData.performanceMetrics

    // Use Column instead of Scaffold since this is embedded in MainScreen's tab content
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandGrey)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(horizontal = 16.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Analytics",
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp,
                color = BrandBlack
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Period Selector - matches iOS periodSelector
            item {
                PeriodSelector(
                    selectedPeriod = selectedPeriod,
                    onPeriodSelected = { viewModel.setSelectedPeriod(it) }
                )
            }

            // Key Metrics Grid - matches iOS keyMetricsGrid (2x2)
            item {
                KeyMetricsGrid(
                    totalRevenue = totalRevenue,
                    totalOrders = totalOrders,
                    avgOrderValue = avgOrderValue,
                    avgPrepTime = avgPrepTime
                )
            }

            // Revenue Chart Card - matches iOS revenueChartCard
            item {
                RevenueChartCard(
                    selectedChartType = selectedChartType,
                    onChartTypeSelected = { selectedChartType = it },
                    hourlyData = hourlyData
                )
            }

            // Orders by Status - matches iOS ordersByStatusCard
            item {
                OrdersByStatusCard(
                    completedCount = completedOrders,
                    preparingCount = preparingOrders,
                    readyCount = readyOrders,
                    newCount = newOrders
                )
            }

            // Top Selling Items - matches iOS popularItemsCard
            item {
                TopSellingItemsCard(
                    items = popularItems,
                    period = selectedPeriod
                )
            }

            // Peak Hours - matches iOS peakHoursCard
            item {
                PeakHoursCard(hourlyData = hourlyData)
            }

            // Performance Summary - matches iOS performanceSummaryCard
            item {
                PerformanceSummaryCard(
                    completionRate = performanceMetrics.completionRate,
                    onTimeRate = performanceMetrics.onTimeRate,
                    customerRating = performanceMetrics.customerRating,
                    repeatCustomerRate = performanceMetrics.repeatCustomerRate
                )
            }

            // Bottom padding
            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

/**
 * Period Selector - matches iOS periodSelector
 */
@Composable
private fun PeriodSelector(
    selectedPeriod: TimePeriod,
    onPeriodSelected: (TimePeriod) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        TimePeriod.entries.forEach { period ->
            Surface(
                onClick = { onPeriodSelected(period) },
                shape = RoundedCornerShape(20.dp),
                color = if (selectedPeriod == period) BrandOrange else Color.Gray.copy(alpha = 0.1f)
            ) {
                Text(
                    text = period.displayName,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                    fontSize = 14.sp,
                    fontWeight = if (selectedPeriod == period) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (selectedPeriod == period) Color.White else Color.Gray
                )
            }
        }
    }
}

/**
 * Key Metrics Grid - matches iOS keyMetricsGrid (2x2)
 */
@Composable
private fun KeyMetricsGrid(
    totalRevenue: Double,
    totalOrders: Int,
    avgOrderValue: Double,
    avgPrepTime: Int
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Total Revenue",
                value = "$${totalRevenue.toInt()}",
                change = "+12.5%",
                isPositive = true,
                icon = Icons.Default.AttachMoney,
                color = BrandGreen
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Total Orders",
                value = "$totalOrders",
                change = "+8.3%",
                isPositive = true,
                icon = Icons.Default.ShoppingBag,
                color = BrandBlue
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Avg Order Value",
                value = "$${avgOrderValue.toInt()}",
                change = "+5.2%",
                isPositive = true,
                icon = Icons.Default.TrendingUp,
                color = BrandPurple
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Avg Prep Time",
                value = "$avgPrepTime min",
                change = "-2 min",
                isPositive = true,
                icon = Icons.Default.Schedule,
                color = BrandOrange
            )
        }
    }
}

/**
 * Metric Card - matches iOS MetricCard
 */
@Composable
private fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    change: String,
    isPositive: Boolean,
    icon: ImageVector,
    color: Color
) {
    Card(
        modifier = modifier
            .shadow(
                elevation = 4.dp,
                shape = RoundedCornerShape(16.dp)
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Icon(
                        imageVector = if (isPositive) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                        contentDescription = null,
                        tint = if (isPositive) BrandGreen else BrandRed,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = change,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (isPositive) BrandGreen else BrandRed
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = value,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )
            Text(
                text = title,
                fontSize = 12.sp,
                color = Color.Gray
            )
        }
    }
}

/**
 * Revenue Chart Card - matches iOS revenueChartCard
 */
@Composable
private fun RevenueChartCard(
    selectedChartType: ChartType,
    onChartTypeSelected: (ChartType) -> Unit,
    hourlyData: List<HourlyData>
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 4.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Revenue Trend",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandBlack
                )

                // Chart Type Selector
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(BrandGrey),
                    horizontalArrangement = Arrangement.spacedBy(0.dp)
                ) {
                    ChartType.entries.forEach { chartType ->
                        Surface(
                            onClick = { onChartTypeSelected(chartType) },
                            color = if (selectedChartType == chartType) Color.White else Color.Transparent,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = chartType.displayName,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                fontSize = 11.sp,
                                fontWeight = if (selectedChartType == chartType) FontWeight.Medium else FontWeight.Normal,
                                color = if (selectedChartType == chartType) BrandBlack else Color.Gray
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Bar Chart
            BarChart(
                data = hourlyData,
                chartType = selectedChartType,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            )
        }
    }
}

/**
 * Simple Bar Chart
 */
@Composable
private fun BarChart(
    data: List<HourlyData>,
    chartType: ChartType,
    modifier: Modifier = Modifier
) {
    val values = data.map { hourly ->
        when (chartType) {
            ChartType.REVENUE -> hourly.revenue
            ChartType.ORDERS -> hourly.orders.toDouble()
            ChartType.AVG_ORDER -> hourly.avgOrder
        }
    }
    val maxValue = values.maxOrNull() ?: 1.0

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom
        ) {
            data.forEachIndexed { index, hourly ->
                val value = values[index]
                val heightFraction = (value / maxValue).toFloat()

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight(heightFraction.coerceIn(0.05f, 1f))
                            .width(16.dp)
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(
                                BrandOrange.copy(alpha = 0.6f + (heightFraction * 0.4f))
                            )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // X-axis labels (show every other)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            data.forEachIndexed { index, hourly ->
                if (index % 2 == 0) {
                    Text(
                        text = hourly.hour,
                        fontSize = 9.sp,
                        color = Color.Gray,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

/**
 * Orders by Status Card - matches iOS ordersByStatusCard
 */
@Composable
private fun OrdersByStatusCard(
    completedCount: Int,
    preparingCount: Int,
    readyCount: Int,
    newCount: Int
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 4.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Orders by Status",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatusDonutItem(label = "Completed", value = completedCount, color = BrandGreen)
                StatusDonutItem(label = "Preparing", value = preparingCount, color = BrandBlue)
                StatusDonutItem(label = "Ready", value = readyCount, color = BrandOrange)
                StatusDonutItem(label = "New", value = newCount, color = BrandPurple)
            }
        }
    }
}

/**
 * Status Donut Item - matches iOS StatusDonutItem
 */
@Composable
private fun StatusDonutItem(
    label: String,
    value: Int,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier.size(50.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                // Background circle
                drawArc(
                    color = color.copy(alpha = 0.2f),
                    startAngle = 0f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                )
                // Progress arc
                val progress = (value.coerceIn(0, 20) / 20f) * 360f
                drawArc(
                    color = color,
                    startAngle = -90f,
                    sweepAngle = progress,
                    useCenter = false,
                    style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                )
            }
            Text(
                text = "$value",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = label,
            fontSize = 10.sp,
            color = Color.Gray
        )
    }
}

/**
 * Top Selling Items Card - matches iOS popularItemsCard
 */
@Composable
private fun TopSellingItemsCard(
    items: List<PopularItem>,
    period: TimePeriod
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 4.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Top Selling Items",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandBlack
                )
                Text(
                    text = period.displayName,
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (items.isEmpty()) {
                Text(
                    text = "No order data available",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(vertical = 20.dp)
                )
            } else {
                items.forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Rank badge
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(if (index < 3) BrandOrange else Color.Gray),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${index + 1}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = item.name,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = BrandBlack
                            )
                            Text(
                                text = "${item.quantity} orders",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }

                        Text(
                            text = "$${item.revenue.toInt()}",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = BrandGreen
                        )
                    }

                    if (index < items.size - 1) {
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = Color(0xFFEEEEEE)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Peak Hours Card - matches iOS peakHoursCard
 */
@Composable
private fun PeakHoursCard(hourlyData: List<HourlyData>) {
    // Calculate peak hours
    val lunchOrders = hourlyData.filter {
        val hour = it.hour.replace("AM", "").replace("PM", "").toIntOrNull() ?: 0
        hour in 11..14 || (it.hour.contains("PM") && hour in 1..2)
    }.sumOf { it.orders }

    val dinnerOrders = hourlyData.filter {
        val hour = it.hour.replace("AM", "").replace("PM", "").toIntOrNull() ?: 0
        it.hour.contains("PM") && hour in 5..9
    }.sumOf { it.orders }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 4.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Peak Hours",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Area Chart
            AreaChart(
                data = hourlyData,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Peak Hour Info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PeakHourInfoCard(
                    modifier = Modifier.weight(1f),
                    label = "Lunch Peak",
                    time = "12:00 - 2:00 PM",
                    orders = lunchOrders
                )
                PeakHourInfoCard(
                    modifier = Modifier.weight(1f),
                    label = "Dinner Peak",
                    time = "6:00 - 9:00 PM",
                    orders = dinnerOrders
                )
            }
        }
    }
}

/**
 * Simple Area Chart
 */
@Composable
private fun AreaChart(
    data: List<HourlyData>,
    modifier: Modifier = Modifier
) {
    val values = data.map { it.orders.toFloat() }
    val maxValue = values.maxOrNull() ?: 1f

    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val pointSpacing = width / (values.size - 1)

        // Draw area
        val path = androidx.compose.ui.graphics.Path()
        values.forEachIndexed { index, value ->
            val x = index * pointSpacing
            val y = height - (value / maxValue) * height

            if (index == 0) {
                path.moveTo(x, height)
                path.lineTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }
        path.lineTo(width, height)
        path.close()

        drawPath(
            path = path,
            color = BrandBlue.copy(alpha = 0.2f)
        )

        // Draw line
        val linePath = androidx.compose.ui.graphics.Path()
        values.forEachIndexed { index, value ->
            val x = index * pointSpacing
            val y = height - (value / maxValue) * height

            if (index == 0) {
                linePath.moveTo(x, y)
            } else {
                linePath.lineTo(x, y)
            }
        }

        drawPath(
            path = linePath,
            color = BrandBlue,
            style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

/**
 * Peak Hour Info Card - matches iOS PeakHourInfo
 */
@Composable
private fun PeakHourInfoCard(
    modifier: Modifier = Modifier,
    label: String,
    time: String,
    orders: Int
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = BrandBlue.copy(alpha = 0.1f)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = label,
                fontSize = 11.sp,
                color = Color.Gray
            )
            Text(
                text = time,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = BrandBlack
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ShoppingBag,
                    contentDescription = null,
                    tint = BrandBlue,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text = "$orders orders",
                    fontSize = 12.sp,
                    color = BrandBlue
                )
            }
        }
    }
}

/**
 * Performance Summary Card - matches iOS performanceSummaryCard
 */
@Composable
private fun PerformanceSummaryCard(
    completionRate: Double = 0.98,
    onTimeRate: Double = 0.94,
    customerRating: Double = 4.8,
    repeatCustomerRate: Double = 0.67
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 4.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Performance Summary",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )

            Spacer(modifier = Modifier.height(16.dp))

            PerformanceRow(
                label = "Order Completion Rate",
                value = "${(completionRate * 100).toInt()}.0%",
                progress = completionRate.toFloat(),
                color = BrandGreen
            )
            Spacer(modifier = Modifier.height(12.dp))
            PerformanceRow(
                label = "On-Time Delivery",
                value = "${(onTimeRate * 100).toInt()}.0%",
                progress = onTimeRate.toFloat(),
                color = BrandBlue
            )
            Spacer(modifier = Modifier.height(12.dp))
            PerformanceRow(
                label = "Customer Rating",
                value = "${"%.1f".format(customerRating)}/5",
                progress = (customerRating / 5).toFloat(),
                color = BrandOrange
            )
            Spacer(modifier = Modifier.height(12.dp))
            PerformanceRow(
                label = "Repeat Customers",
                value = "${(repeatCustomerRate * 100).toInt()}%",
                progress = repeatCustomerRate.toFloat(),
                color = BrandPurple
            )
        }
    }
}

/**
 * Performance Row - matches iOS PerformanceRow
 */
@Composable
private fun PerformanceRow(
    label: String,
    value: String,
    progress: Float,
    color: Color
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                fontSize = 14.sp,
                color = Color.Gray
            )
            Text(
                text = value,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = color
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Progress bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(color.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(4.dp))
                    .background(color)
            )
        }
    }
}
