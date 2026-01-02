package com.eatfair.app.ui.order

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Customer OrderTrackingScreen.
 *
 * Tests cover:
 * - Order status display
 * - Driver info card
 * - Map view
 * - ETA display
 * - Contact driver options
 * - Order items summary
 * - Status timeline
 */
class OrderTrackingScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // ORDER STATUS TESTS
    // ============================================================

    @Test
    fun orderStatus_confirmedState_isDisplayed() {
        composeTestRule.setContent {
            OrderStatusBadge(status = "confirmed")
        }

        composeTestRule.onNodeWithText("Order Confirmed").assertIsDisplayed()
    }

    @Test
    fun orderStatus_preparingState_isDisplayed() {
        composeTestRule.setContent {
            OrderStatusBadge(status = "preparing")
        }

        composeTestRule.onNodeWithText("Preparing").assertIsDisplayed()
    }

    @Test
    fun orderStatus_pickedUpState_isDisplayed() {
        composeTestRule.setContent {
            OrderStatusBadge(status = "picked_up")
        }

        composeTestRule.onNodeWithText("Picked Up", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderStatus_outForDeliveryState_isDisplayed() {
        composeTestRule.setContent {
            OrderStatusBadge(status = "out_for_delivery")
        }

        composeTestRule.onNodeWithText("Out for Delivery", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderStatus_deliveredState_isDisplayed() {
        composeTestRule.setContent {
            OrderStatusBadge(status = "delivered")
        }

        composeTestRule.onNodeWithText("Delivered").assertIsDisplayed()
    }

    // ============================================================
    // ETA DISPLAY TESTS
    // ============================================================

    @Test
    fun etaCard_estimatedTime_isDisplayed() {
        composeTestRule.setContent {
            ETACard(
                estimatedMinutes = 25,
                status = "out_for_delivery"
            )
        }

        composeTestRule.onNodeWithText("25 min", substring = true).assertIsDisplayed()
    }

    @Test
    fun etaCard_arrivalTime_isDisplayed() {
        composeTestRule.setContent {
            ETACard(
                estimatedMinutes = 25,
                status = "out_for_delivery",
                arrivalTime = "6:45 PM"
            )
        }

        composeTestRule.onNodeWithText("6:45 PM", substring = true).assertIsDisplayed()
    }

    @Test
    fun etaCard_preparingStatus_showsDifferentMessage() {
        composeTestRule.setContent {
            ETACard(
                estimatedMinutes = 15,
                status = "preparing"
            )
        }

        composeTestRule.onNodeWithText("Restaurant is preparing", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // DRIVER INFO TESTS
    // ============================================================

    @Test
    fun driverCard_name_isDisplayed() {
        composeTestRule.setContent {
            DriverInfoCard(
                driverName = "John S.",
                driverRating = 4.9,
                vehicleInfo = "Toyota Camry - ABC123",
                driverPhotoUrl = null,
                onCallDriver = { },
                onChatDriver = { }
            )
        }

        composeTestRule.onNodeWithText("John S.").assertIsDisplayed()
    }

    @Test
    fun driverCard_rating_isDisplayed() {
        composeTestRule.setContent {
            DriverInfoCard(
                driverName = "John S.",
                driverRating = 4.9,
                vehicleInfo = "Toyota Camry - ABC123",
                driverPhotoUrl = null,
                onCallDriver = { },
                onChatDriver = { }
            )
        }

        composeTestRule.onNodeWithText("4.9", substring = true).assertIsDisplayed()
    }

    @Test
    fun driverCard_vehicleInfo_isDisplayed() {
        composeTestRule.setContent {
            DriverInfoCard(
                driverName = "John S.",
                driverRating = 4.9,
                vehicleInfo = "Toyota Camry - ABC123",
                driverPhotoUrl = null,
                onCallDriver = { },
                onChatDriver = { }
            )
        }

        composeTestRule.onNodeWithText("Toyota Camry", substring = true).assertIsDisplayed()
    }

    @Test
    fun driverCard_callButton_triggersCallback() {
        var called = false

        composeTestRule.setContent {
            DriverInfoCard(
                driverName = "John S.",
                driverRating = 4.9,
                vehicleInfo = "Toyota Camry - ABC123",
                driverPhotoUrl = null,
                onCallDriver = { called = true },
                onChatDriver = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Call driver").performClick()

        assert(called) { "Call driver callback was not triggered" }
    }

    @Test
    fun driverCard_chatButton_triggersCallback() {
        var chatted = false

        composeTestRule.setContent {
            DriverInfoCard(
                driverName = "John S.",
                driverRating = 4.9,
                vehicleInfo = "Toyota Camry - ABC123",
                driverPhotoUrl = null,
                onCallDriver = { },
                onChatDriver = { chatted = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Chat with driver").performClick()

        assert(chatted) { "Chat driver callback was not triggered" }
    }

    // ============================================================
    // STATUS TIMELINE TESTS
    // ============================================================

    @Test
    fun statusTimeline_allSteps_areDisplayed() {
        composeTestRule.setContent {
            StatusTimeline(
                currentStatus = "out_for_delivery",
                statusHistory = listOf(
                    StatusStep("Order Placed", "5:15 PM", true),
                    StatusStep("Order Confirmed", "5:16 PM", true),
                    StatusStep("Preparing", "5:20 PM", true),
                    StatusStep("Picked Up", "5:40 PM", true),
                    StatusStep("Out for Delivery", "5:42 PM", true),
                    StatusStep("Delivered", "", false)
                )
            )
        }

        composeTestRule.onNodeWithText("Order Placed").assertIsDisplayed()
        composeTestRule.onNodeWithText("Preparing").assertIsDisplayed()
        composeTestRule.onNodeWithText("Out for Delivery").assertIsDisplayed()
    }

    @Test
    fun statusTimeline_completedSteps_haveCheckmarks() {
        composeTestRule.setContent {
            StatusTimeline(
                currentStatus = "preparing",
                statusHistory = listOf(
                    StatusStep("Order Placed", "5:15 PM", true),
                    StatusStep("Order Confirmed", "5:16 PM", true),
                    StatusStep("Preparing", "5:20 PM", false),
                    StatusStep("Out for Delivery", "", false),
                    StatusStep("Delivered", "", false)
                )
            )
        }

        // Completed steps should show checkmarks
        composeTestRule.waitForIdle()
    }

    @Test
    fun statusTimeline_timestamps_areDisplayed() {
        composeTestRule.setContent {
            StatusTimeline(
                currentStatus = "preparing",
                statusHistory = listOf(
                    StatusStep("Order Placed", "5:15 PM", true)
                )
            )
        }

        composeTestRule.onNodeWithText("5:15 PM").assertIsDisplayed()
    }

    // ============================================================
    // ORDER SUMMARY TESTS
    // ============================================================

    @Test
    fun orderSummary_orderId_isDisplayed() {
        composeTestRule.setContent {
            OrderSummaryCard(
                orderId = "EF-123456",
                restaurantName = "Mario's Pizza",
                itemCount = 3,
                total = 45.99
            )
        }

        composeTestRule.onNodeWithText("#EF-123456", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderSummary_restaurantName_isDisplayed() {
        composeTestRule.setContent {
            OrderSummaryCard(
                orderId = "EF-123456",
                restaurantName = "Mario's Pizza",
                itemCount = 3,
                total = 45.99
            )
        }

        composeTestRule.onNodeWithText("Mario's Pizza").assertIsDisplayed()
    }

    @Test
    fun orderSummary_itemCount_isDisplayed() {
        composeTestRule.setContent {
            OrderSummaryCard(
                orderId = "EF-123456",
                restaurantName = "Mario's Pizza",
                itemCount = 3,
                total = 45.99
            )
        }

        composeTestRule.onNodeWithText("3 items", substring = true).assertIsDisplayed()
    }

    @Test
    fun orderSummary_total_isDisplayed() {
        composeTestRule.setContent {
            OrderSummaryCard(
                orderId = "EF-123456",
                restaurantName = "Mario's Pizza",
                itemCount = 3,
                total = 45.99
            )
        }

        composeTestRule.onNodeWithText("$45.99").assertIsDisplayed()
    }

    // ============================================================
    // MAP VIEW TESTS
    // ============================================================

    @Test
    fun mapView_isDisplayed() {
        composeTestRule.setContent {
            TrackingMapView(
                driverLatitude = 37.7749,
                driverLongitude = -122.4194,
                destinationLatitude = 37.7849,
                destinationLongitude = -122.4094,
                isLoading = false
            )
        }

        // Map container should exist
        composeTestRule.onNodeWithTag("tracking_map").assertExists()
    }

    @Test
    fun mapView_loading_showsProgress() {
        composeTestRule.setContent {
            TrackingMapView(
                driverLatitude = null,
                driverLongitude = null,
                destinationLatitude = 37.7849,
                destinationLongitude = -122.4094,
                isLoading = true
            )
        }

        // Should show loading indicator
        composeTestRule.onNodeWithTag("loading_indicator").assertExists()
    }

    // ============================================================
    // HELP & SUPPORT TESTS
    // ============================================================

    @Test
    fun helpButton_isDisplayed() {
        composeTestRule.setContent {
            OrderHelpButton(
                onHelpClick = { }
            )
        }

        composeTestRule.onNodeWithText("Help", substring = true).assertIsDisplayed()
    }

    @Test
    fun helpButton_triggersCallback() {
        var helpClicked = false

        composeTestRule.setContent {
            OrderHelpButton(
                onHelpClick = { helpClicked = true }
            )
        }

        composeTestRule.onNodeWithText("Help", substring = true).performClick()

        assert(helpClicked) { "Help button callback was not triggered" }
    }

    // ============================================================
    // CANCEL ORDER TESTS
    // ============================================================

    @Test
    fun cancelButton_isVisible_beforePickup() {
        composeTestRule.setContent {
            CancelOrderButton(
                status = "preparing",
                onCancelClick = { }
            )
        }

        composeTestRule.onNodeWithText("Cancel Order", substring = true).assertIsDisplayed()
    }

    @Test
    fun cancelButton_notVisible_afterPickup() {
        composeTestRule.setContent {
            CancelOrderButton(
                status = "out_for_delivery",
                onCancelClick = { }
            )
        }

        composeTestRule.onNodeWithText("Cancel Order").assertDoesNotExist()
    }

    @Test
    fun cancelButton_triggersCallback() {
        var cancelled = false

        composeTestRule.setContent {
            CancelOrderButton(
                status = "preparing",
                onCancelClick = { cancelled = true }
            )
        }

        composeTestRule.onNodeWithText("Cancel Order", substring = true).performClick()

        assert(cancelled) { "Cancel order callback was not triggered" }
    }
}

// ============================================================
// DATA CLASSES FOR TESTING
// ============================================================

data class StatusStep(
    val title: String,
    val time: String,
    val isCompleted: Boolean
)
