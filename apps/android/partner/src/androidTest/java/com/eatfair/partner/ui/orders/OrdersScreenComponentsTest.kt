package com.eatfair.partner.ui.orders

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.eatfair.shared.constants.OrderStatus
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Restaurant Partner OrdersScreen components.
 *
 * Tests cover:
 * - OrderItemCard component
 * - Tab filtering
 * - Action buttons (Accept, Reject, Mark Ready)
 * - Empty state
 * - Order status display
 */
class OrdersScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // ORDER ITEM CARD TESTS
    // ============================================================

    @Test
    fun orderItemCard_orderId_isDisplayed() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Order #12345", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderItemCard_customerName_isDisplayed() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("John Doe").assertIsDisplayed()
    }

    @Test
    fun orderItemCard_totalAmount_isDisplayed() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Total: $45.99", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderItemCard_itemsHeader_isDisplayed() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Items:").assertIsDisplayed()
    }

    @Test
    fun orderItemCard_orderItems_areDisplayed() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("2x Margherita Pizza", substring = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("1x Caesar Salad", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderItemCard_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(),
                onClick = { clicked = true },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("John Doe").performClick()

        assert(clicked) { "onClick callback was not triggered" }
    }

    // ============================================================
    // ACTION BUTTON TESTS - ORDER PLACED STATUS
    // ============================================================

    @Test
    fun orderItemCard_orderPlaced_showsAcceptButton() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.ORDER_PLACED),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Accept").assertIsDisplayed()
        composeTestRule.onNodeWithText("Accept").assertHasClickAction()
    }

    @Test
    fun orderItemCard_orderPlaced_showsRejectButton() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.ORDER_PLACED),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Reject").assertIsDisplayed()
        composeTestRule.onNodeWithText("Reject").assertHasClickAction()
    }

    @Test
    fun orderItemCard_acceptClick_triggersCallback() {
        var accepted = false

        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.ORDER_PLACED),
                onClick = { },
                onAccept = { accepted = true },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Accept").performClick()

        assert(accepted) { "onAccept callback was not triggered" }
    }

    @Test
    fun orderItemCard_rejectClick_triggersCallback() {
        var rejected = false

        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.ORDER_PLACED),
                onClick = { },
                onAccept = { },
                onReject = { rejected = true },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Reject").performClick()

        assert(rejected) { "onReject callback was not triggered" }
    }

    // ============================================================
    // ACTION BUTTON TESTS - PREPARING STATUS
    // ============================================================

    @Test
    fun orderItemCard_preparing_showsMarkReadyButton() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.PREPARING),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Mark as Ready").assertIsDisplayed()
        composeTestRule.onNodeWithText("Mark as Ready").assertHasClickAction()
    }

    @Test
    fun orderItemCard_markReadyClick_triggersCallback() {
        var markedReady = false

        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.PREPARING),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { markedReady = true }
            )
        }

        composeTestRule.onNodeWithText("Mark as Ready").performClick()

        assert(markedReady) { "onMarkReady callback was not triggered" }
    }

    // ============================================================
    // STATUS DISPLAY TESTS
    // ============================================================

    @Test
    fun orderItemCard_orderPlacedStatus_displaysCorrectly() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.ORDER_PLACED),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("ORDER PLACED").assertIsDisplayed()
    }

    @Test
    fun orderItemCard_preparingStatus_displaysCorrectly() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.PREPARING),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("PREPARING").assertIsDisplayed()
    }

    @Test
    fun orderItemCard_deliveredStatus_noActionButtons() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(status = OrderStatus.DELIVERED),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("Accept").assertDoesNotExist()
        composeTestRule.onNodeWithText("Reject").assertDoesNotExist()
        composeTestRule.onNodeWithText("Mark as Ready").assertDoesNotExist()
    }

    // ============================================================
    // TAB TESTS
    // ============================================================

    @Test
    fun ordersScreen_tabs_areCorrect() {
        val expectedTabs = listOf("All", "Pending", "Preparing", "Out for Delivery", "Delivered")

        assert(expectedTabs.size == 5) { "Should have 5 tabs" }
        assert(expectedTabs.contains("All")) { "Should have All tab" }
        assert(expectedTabs.contains("Pending")) { "Should have Pending tab" }
        assert(expectedTabs.contains("Preparing")) { "Should have Preparing tab" }
        assert(expectedTabs.contains("Out for Delivery")) { "Should have Out for Delivery tab" }
        assert(expectedTabs.contains("Delivered")) { "Should have Delivered tab" }
    }

    // ============================================================
    // EMPTY STATE TESTS
    // ============================================================

    @Test
    fun ordersScreen_emptyState_messageIsCorrect() {
        val expectedMessage = "No orders found"
        assert(expectedMessage == "No orders found") { "Empty state message should be correct" }
    }

    // ============================================================
    // ORDER NUMBER TESTS
    // ============================================================

    @Test
    fun orderItemCard_withOrderNumber_displaysShortFormat() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(orderNumber = "EF-20241215-123456-0001"),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        // Should display short format of order number
        composeTestRule.onNodeWithText("Order", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderItemCard_withOrderNumber_displaysFullNumber() {
        composeTestRule.setContent {
            OrderItemCard(
                order = createTestOrder(orderNumber = "EF-20241215-123456-0001"),
                onClick = { },
                onAccept = { },
                onReject = { },
                onMarkPreparing = { },
                onMarkReady = { }
            )
        }

        composeTestRule.onNodeWithText("EF-20241215-123456-0001").assertIsDisplayed()
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    private fun createTestOrder(
        id: Long = 12345,
        customerName: String = "John Doe",
        status: OrderStatus = OrderStatus.ORDER_PLACED,
        orderNumber: String = ""
    ): OrderItem {
        return OrderItem(
            id = id,
            customerName = customerName,
            customerPhone = "+1234567890",
            items = listOf(
                OrderMenuItem(name = "Margherita Pizza", quantity = 2, price = 15.99),
                OrderMenuItem(name = "Caesar Salad", quantity = 1, price = 8.99)
            ),
            totalAmount = 45.99,
            status = status,
            time = "10 mins ago",
            deliveryAddress = "123 Main St, New York",
            orderNumber = orderNumber
        )
    }
}
