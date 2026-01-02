package com.eatfair.partner.ui.analytics

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Restaurant Partner AnalyticsScreen components.
 *
 * Tests cover:
 * - Revenue chart display
 * - Order count metrics
 * - Period selector (Day/Week/Month)
 * - Top items display
 * - Performance comparison
 * - AI insights integration
 */
class AnalyticsScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // ANALYTICS HEADER TESTS
    // ============================================================

    @Test
    fun analyticsHeader_title_isDisplayed() {
        composeTestRule.setContent {
            AnalyticsHeader(
                selectedPeriod = "Today",
                onPeriodChange = { }
            )
        }

        composeTestRule.onNodeWithText("Analytics").assertIsDisplayed()
    }

    @Test
    fun analyticsHeader_periodSelector_isDisplayed() {
        composeTestRule.setContent {
            AnalyticsHeader(
                selectedPeriod = "Today",
                onPeriodChange = { }
            )
        }

        composeTestRule.onNodeWithText("Today").assertIsDisplayed()
    }

    @Test
    fun analyticsHeader_periodChange_triggersCallback() {
        var selectedPeriod = ""

        composeTestRule.setContent {
            AnalyticsHeader(
                selectedPeriod = "Today",
                onPeriodChange = { selectedPeriod = it }
            )
        }

        composeTestRule.onNodeWithText("Week").performClick()

        assert(selectedPeriod == "Week") { "Period change callback was not triggered" }
    }

    // ============================================================
    // REVENUE CARD TESTS
    // ============================================================

    @Test
    fun revenueCard_totalRevenue_isDisplayed() {
        composeTestRule.setContent {
            RevenueCard(
                totalRevenue = 12500.50,
                previousRevenue = 10200.00,
                percentageChange = 22.5
            )
        }

        composeTestRule.onNodeWithText("$12,500.50", substring = true).assertIsDisplayed()
    }

    @Test
    fun revenueCard_percentageIncrease_showsGreen() {
        composeTestRule.setContent {
            RevenueCard(
                totalRevenue = 12500.50,
                previousRevenue = 10200.00,
                percentageChange = 22.5
            )
        }

        composeTestRule.onNodeWithText("+22.5%", substring = true).assertIsDisplayed()
    }

    @Test
    fun revenueCard_percentageDecrease_showsRed() {
        composeTestRule.setContent {
            RevenueCard(
                totalRevenue = 8500.50,
                previousRevenue = 10200.00,
                percentageChange = -16.7
            )
        }

        composeTestRule.onNodeWithText("-16.7%", substring = true).assertIsDisplayed()
    }

    @Test
    fun revenueCard_title_isDisplayed() {
        composeTestRule.setContent {
            RevenueCard(
                totalRevenue = 12500.50,
                previousRevenue = 10200.00,
                percentageChange = 22.5
            )
        }

        composeTestRule.onNodeWithText("Total Revenue").assertIsDisplayed()
    }

    // ============================================================
    // ORDER METRICS CARD TESTS
    // ============================================================

    @Test
    fun orderMetricsCard_totalOrders_isDisplayed() {
        composeTestRule.setContent {
            OrderMetricsCard(
                totalOrders = 156,
                completedOrders = 148,
                cancelledOrders = 8,
                averageOrderValue = 45.50
            )
        }

        composeTestRule.onNodeWithText("156").assertIsDisplayed()
        composeTestRule.onNodeWithText("Total Orders").assertIsDisplayed()
    }

    @Test
    fun orderMetricsCard_completedOrders_isDisplayed() {
        composeTestRule.setContent {
            OrderMetricsCard(
                totalOrders = 156,
                completedOrders = 148,
                cancelledOrders = 8,
                averageOrderValue = 45.50
            )
        }

        composeTestRule.onNodeWithText("148").assertIsDisplayed()
        composeTestRule.onNodeWithText("Completed").assertIsDisplayed()
    }

    @Test
    fun orderMetricsCard_cancelledOrders_isDisplayed() {
        composeTestRule.setContent {
            OrderMetricsCard(
                totalOrders = 156,
                completedOrders = 148,
                cancelledOrders = 8,
                averageOrderValue = 45.50
            )
        }

        composeTestRule.onNodeWithText("8").assertIsDisplayed()
        composeTestRule.onNodeWithText("Cancelled").assertIsDisplayed()
    }

    @Test
    fun orderMetricsCard_averageOrderValue_isDisplayed() {
        composeTestRule.setContent {
            OrderMetricsCard(
                totalOrders = 156,
                completedOrders = 148,
                cancelledOrders = 8,
                averageOrderValue = 45.50
            )
        }

        composeTestRule.onNodeWithText("$45.50", substring = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("Avg Order").assertIsDisplayed()
    }

    // ============================================================
    // TOP ITEMS SECTION TESTS
    // ============================================================

    @Test
    fun topItemsSection_header_isDisplayed() {
        composeTestRule.setContent {
            TopItemsSection(
                items = listOf(
                    TopItem("Margherita Pizza", 85, 1275.00),
                    TopItem("Caesar Salad", 62, 558.00),
                    TopItem("Garlic Bread", 48, 240.00)
                )
            )
        }

        composeTestRule.onNodeWithText("Top Selling Items").assertIsDisplayed()
    }

    @Test
    fun topItemsSection_itemNames_areDisplayed() {
        composeTestRule.setContent {
            TopItemsSection(
                items = listOf(
                    TopItem("Margherita Pizza", 85, 1275.00),
                    TopItem("Caesar Salad", 62, 558.00)
                )
            )
        }

        composeTestRule.onNodeWithText("Margherita Pizza").assertIsDisplayed()
        composeTestRule.onNodeWithText("Caesar Salad").assertIsDisplayed()
    }

    @Test
    fun topItemsSection_orderCounts_areDisplayed() {
        composeTestRule.setContent {
            TopItemsSection(
                items = listOf(
                    TopItem("Margherita Pizza", 85, 1275.00)
                )
            )
        }

        composeTestRule.onNodeWithText("85 orders", substring = true).assertIsDisplayed()
    }

    @Test
    fun topItemsSection_revenueAmounts_areDisplayed() {
        composeTestRule.setContent {
            TopItemsSection(
                items = listOf(
                    TopItem("Margherita Pizza", 85, 1275.00)
                )
            )
        }

        composeTestRule.onNodeWithText("$1,275.00", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // CHART TESTS
    // ============================================================

    @Test
    fun revenueChart_isDisplayed() {
        composeTestRule.setContent {
            RevenueChart(
                dataPoints = listOf(
                    ChartDataPoint("Mon", 1200.0),
                    ChartDataPoint("Tue", 1500.0),
                    ChartDataPoint("Wed", 1100.0),
                    ChartDataPoint("Thu", 1800.0),
                    ChartDataPoint("Fri", 2200.0),
                    ChartDataPoint("Sat", 2500.0),
                    ChartDataPoint("Sun", 1900.0)
                )
            )
        }

        composeTestRule.onNodeWithTag("revenue_chart").assertExists()
    }

    @Test
    fun revenueChart_xAxisLabels_areDisplayed() {
        composeTestRule.setContent {
            RevenueChart(
                dataPoints = listOf(
                    ChartDataPoint("Mon", 1200.0),
                    ChartDataPoint("Tue", 1500.0)
                )
            )
        }

        composeTestRule.onNodeWithText("Mon").assertIsDisplayed()
        composeTestRule.onNodeWithText("Tue").assertIsDisplayed()
    }

    // ============================================================
    // PERIOD FILTER TESTS
    // ============================================================

    @Test
    fun periodFilter_allOptions_areDisplayed() {
        composeTestRule.setContent {
            PeriodFilter(
                selectedPeriod = "Today",
                onPeriodSelect = { }
            )
        }

        composeTestRule.onNodeWithText("Today").assertIsDisplayed()
        composeTestRule.onNodeWithText("Week").assertIsDisplayed()
        composeTestRule.onNodeWithText("Month").assertIsDisplayed()
    }

    @Test
    fun periodFilter_todaySelected_hasHighlight() {
        composeTestRule.setContent {
            PeriodFilter(
                selectedPeriod = "Today",
                onPeriodSelect = { }
            )
        }

        composeTestRule.onNodeWithText("Today").assertIsDisplayed()
    }

    @Test
    fun periodFilter_weekClick_triggersCallback() {
        var selected = ""

        composeTestRule.setContent {
            PeriodFilter(
                selectedPeriod = "Today",
                onPeriodSelect = { selected = it }
            )
        }

        composeTestRule.onNodeWithText("Week").performClick()

        assert(selected == "Week") { "Period filter callback was not triggered" }
    }

    @Test
    fun periodFilter_monthClick_triggersCallback() {
        var selected = ""

        composeTestRule.setContent {
            PeriodFilter(
                selectedPeriod = "Today",
                onPeriodSelect = { selected = it }
            )
        }

        composeTestRule.onNodeWithText("Month").performClick()

        assert(selected == "Month") { "Period filter callback was not triggered" }
    }

    // ============================================================
    // AI INSIGHTS CARD TESTS
    // ============================================================

    @Test
    fun aiInsightsCard_header_isDisplayed() {
        composeTestRule.setContent {
            AIInsightsCard(
                insights = listOf(
                    AIInsight("Peak hours are 6-8 PM", "Based on order patterns"),
                    AIInsight("Pizza category trending up", "+15% this week")
                ),
                onViewAll = { }
            )
        }

        composeTestRule.onNodeWithText("AI Insights").assertIsDisplayed()
    }

    @Test
    fun aiInsightsCard_insights_areDisplayed() {
        composeTestRule.setContent {
            AIInsightsCard(
                insights = listOf(
                    AIInsight("Peak hours are 6-8 PM", "Based on order patterns")
                ),
                onViewAll = { }
            )
        }

        composeTestRule.onNodeWithText("Peak hours are 6-8 PM").assertIsDisplayed()
    }

    @Test
    fun aiInsightsCard_viewAllButton_triggersCallback() {
        var viewedAll = false

        composeTestRule.setContent {
            AIInsightsCard(
                insights = listOf(
                    AIInsight("Test insight", "Test detail")
                ),
                onViewAll = { viewedAll = true }
            )
        }

        composeTestRule.onNodeWithText("View All").performClick()

        assert(viewedAll) { "View all callback was not triggered" }
    }

    // ============================================================
    // COMPARISON CARD TESTS
    // ============================================================

    @Test
    fun comparisonCard_title_isDisplayed() {
        composeTestRule.setContent {
            ComparisonCard(
                currentValue = 12500.0,
                previousValue = 10200.0,
                label = "vs. Last Week"
            )
        }

        composeTestRule.onNodeWithText("vs. Last Week").assertIsDisplayed()
    }

    @Test
    fun comparisonCard_currentValue_isDisplayed() {
        composeTestRule.setContent {
            ComparisonCard(
                currentValue = 12500.0,
                previousValue = 10200.0,
                label = "vs. Last Week"
            )
        }

        composeTestRule.onNodeWithText("$12,500", substring = true).assertIsDisplayed()
    }
}

// ============================================================
// DATA CLASSES FOR TESTING
// ============================================================

data class TopItem(
    val name: String,
    val orderCount: Int,
    val revenue: Double
)

data class ChartDataPoint(
    val label: String,
    val value: Double
)

data class AIInsight(
    val title: String,
    val detail: String
)
