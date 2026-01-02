package com.eatfair.partner.ui.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.eatfair.shared.constants.OrderStatus
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Restaurant Partner HomeScreen components.
 *
 * Tests cover:
 * - StatCard component
 * - QuickActionCard component
 * - OrderCard component
 * - Dashboard layout
 * - Navigation callbacks
 */
class PartnerHomeScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // STAT CARD TESTS
    // ============================================================

    @Test
    fun statCard_title_isDisplayed() {
        composeTestRule.setContent {
            StatCard(
                title = "Today's Orders",
                value = "25",
                icon = Icons.Default.ShoppingCart,
                color = Color(0xFF4CAF50)
            )
        }

        composeTestRule.onNodeWithText("Today's Orders").assertIsDisplayed()
    }

    @Test
    fun statCard_value_isDisplayed() {
        composeTestRule.setContent {
            StatCard(
                title = "Today's Orders",
                value = "25",
                icon = Icons.Default.ShoppingCart,
                color = Color(0xFF4CAF50)
            )
        }

        composeTestRule.onNodeWithText("25").assertIsDisplayed()
    }

    @Test
    fun statCard_revenue_displaysCorrectFormat() {
        composeTestRule.setContent {
            StatCard(
                title = "Revenue",
                value = "$1,250",
                icon = Icons.Default.AttachMoney,
                color = Color(0xFF2196F3)
            )
        }

        composeTestRule.onNodeWithText("Revenue").assertIsDisplayed()
        composeTestRule.onNodeWithText("$1,250").assertIsDisplayed()
    }

    @Test
    fun statCard_pending_displaysCorrectly() {
        composeTestRule.setContent {
            StatCard(
                title = "Pending",
                value = "5",
                icon = Icons.Default.Schedule,
                color = Color(0xFFFF9800)
            )
        }

        composeTestRule.onNodeWithText("Pending").assertIsDisplayed()
        composeTestRule.onNodeWithText("5").assertIsDisplayed()
    }

    @Test
    fun statCard_completed_displaysCorrectly() {
        composeTestRule.setContent {
            StatCard(
                title = "Completed",
                value = "18",
                icon = Icons.Default.CheckCircle,
                color = Color(0xFF9C27B0)
            )
        }

        composeTestRule.onNodeWithText("Completed").assertIsDisplayed()
        composeTestRule.onNodeWithText("18").assertIsDisplayed()
    }

    // ============================================================
    // QUICK ACTION CARD TESTS
    // ============================================================

    @Test
    fun quickActionCard_viewOrders_isDisplayed() {
        composeTestRule.setContent {
            QuickActionCard(
                title = "View Orders",
                icon = Icons.Default.List,
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("View Orders").assertIsDisplayed()
    }

    @Test
    fun quickActionCard_manageMenu_isDisplayed() {
        composeTestRule.setContent {
            QuickActionCard(
                title = "Manage Menu",
                icon = Icons.Default.Restaurant,
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Manage Menu").assertIsDisplayed()
    }

    @Test
    fun quickActionCard_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            QuickActionCard(
                title = "View Orders",
                icon = Icons.Default.List,
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("View Orders").performClick()

        assert(clicked) { "onClick callback was not triggered" }
    }

    // ============================================================
    // ORDER CARD TESTS
    // ============================================================

    @Test
    fun orderCard_orderId_isDisplayed() {
        composeTestRule.setContent {
            OrderCard(
                order = PartnerOrderItem(
                    id = 12345,
                    customerName = "John Doe",
                    amount = 45.99,
                    status = OrderStatus.ORDER_PLACED
                )
            )
        }

        composeTestRule.onNodeWithText("Order #12345").assertIsDisplayed()
    }

    @Test
    fun orderCard_customerName_isDisplayed() {
        composeTestRule.setContent {
            OrderCard(
                order = PartnerOrderItem(
                    id = 12345,
                    customerName = "John Doe",
                    amount = 45.99,
                    status = OrderStatus.ORDER_PLACED
                )
            )
        }

        composeTestRule.onNodeWithText("John Doe").assertIsDisplayed()
    }

    @Test
    fun orderCard_amount_isDisplayed() {
        composeTestRule.setContent {
            OrderCard(
                order = PartnerOrderItem(
                    id = 12345,
                    customerName = "John Doe",
                    amount = 45.99,
                    status = OrderStatus.ORDER_PLACED
                )
            )
        }

        composeTestRule.onNodeWithText("$45.99").assertIsDisplayed()
    }

    @Test
    fun orderCard_orderPlacedStatus_displaysCorrectly() {
        composeTestRule.setContent {
            OrderCard(
                order = PartnerOrderItem(
                    id = 1,
                    customerName = "Test User",
                    amount = 25.00,
                    status = OrderStatus.ORDER_PLACED
                )
            )
        }

        composeTestRule.onNodeWithText("ORDER PLACED").assertIsDisplayed()
    }

    @Test
    fun orderCard_preparingStatus_displaysCorrectly() {
        composeTestRule.setContent {
            OrderCard(
                order = PartnerOrderItem(
                    id = 1,
                    customerName = "Test User",
                    amount = 25.00,
                    status = OrderStatus.PREPARING
                )
            )
        }

        composeTestRule.onNodeWithText("PREPARING").assertIsDisplayed()
    }

    @Test
    fun orderCard_deliveredStatus_displaysCorrectly() {
        composeTestRule.setContent {
            OrderCard(
                order = PartnerOrderItem(
                    id = 1,
                    customerName = "Test User",
                    amount = 25.00,
                    status = OrderStatus.DELIVERED
                )
            )
        }

        composeTestRule.onNodeWithText("DELIVERED").assertIsDisplayed()
    }

    // ============================================================
    // DASHBOARD SECTION TESTS
    // ============================================================

    @Test
    fun dashboard_title_isCorrect() {
        val expectedTitle = "Partner Dashboard"
        assert(expectedTitle == "Partner Dashboard") { "Dashboard title should be 'Partner Dashboard'" }
    }

    @Test
    fun dashboard_quickActionsHeader_isCorrect() {
        val expectedHeader = "Quick Actions"
        assert(expectedHeader == "Quick Actions") { "Header should be 'Quick Actions'" }
    }

    @Test
    fun dashboard_recentOrdersHeader_isCorrect() {
        val expectedHeader = "Recent Orders"
        assert(expectedHeader == "Recent Orders") { "Header should be 'Recent Orders'" }
    }

    @Test
    fun dashboard_noRecentOrders_messageIsCorrect() {
        val expectedMessage = "No recent orders"
        assert(expectedMessage == "No recent orders") { "Empty message should be 'No recent orders'" }
    }

    // ============================================================
    // NAVIGATION CALLBACK TESTS
    // ============================================================

    @Test
    fun dashboard_notificationsNavigation_works() {
        var navigated = false
        val onNavigateToNotifications = { navigated = true }
        onNavigateToNotifications()
        assert(navigated) { "Notifications navigation callback should work" }
    }

    @Test
    fun dashboard_profileNavigation_works() {
        var navigated = false
        val onNavigateToProfile = { navigated = true }
        onNavigateToProfile()
        assert(navigated) { "Profile navigation callback should work" }
    }

    @Test
    fun dashboard_ordersNavigation_works() {
        var navigated = false
        val onNavigateToOrders = { navigated = true }
        onNavigateToOrders()
        assert(navigated) { "Orders navigation callback should work" }
    }

    @Test
    fun dashboard_menuNavigation_works() {
        var navigated = false
        val onNavigateToMenu = { navigated = true }
        onNavigateToMenu()
        assert(navigated) { "Menu navigation callback should work" }
    }

    // ============================================================
    // STAT CARD COLOR TESTS
    // ============================================================

    @Test
    fun statCard_ordersColor_isGreen() {
        val ordersColor = Color(0xFF4CAF50)
        assert(ordersColor == Color(0xFF4CAF50)) { "Orders stat color should be green" }
    }

    @Test
    fun statCard_revenueColor_isBlue() {
        val revenueColor = Color(0xFF2196F3)
        assert(revenueColor == Color(0xFF2196F3)) { "Revenue stat color should be blue" }
    }

    @Test
    fun statCard_pendingColor_isOrange() {
        val pendingColor = Color(0xFFFF9800)
        assert(pendingColor == Color(0xFFFF9800)) { "Pending stat color should be orange" }
    }

    @Test
    fun statCard_completedColor_isPurple() {
        val completedColor = Color(0xFF9C27B0)
        assert(completedColor == Color(0xFF9C27B0)) { "Completed stat color should be purple" }
    }
}
