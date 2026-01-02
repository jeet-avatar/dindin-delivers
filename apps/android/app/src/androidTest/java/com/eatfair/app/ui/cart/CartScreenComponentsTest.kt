package com.eatfair.app.ui.cart

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Customer CartScreen components.
 *
 * Tests cover:
 * - CartItem component (display, quantity adjustment)
 * - Cart summary (subtotal, fees, total)
 * - Checkout button states
 * - Empty cart state
 * - Multi-restaurant cart banner
 * - Fee breakdown display
 */
class CartScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // CART ITEM TESTS
    // ============================================================

    @Test
    fun cartItem_itemName_isDisplayed() {
        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(),
                onQuantityIncrease = { },
                onQuantityDecrease = { },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithText("Margherita Pizza").assertIsDisplayed()
    }

    @Test
    fun cartItem_price_isDisplayed() {
        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(price = 15.99),
                onQuantityIncrease = { },
                onQuantityDecrease = { },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithText("$15.99", substring = true).assertIsDisplayed()
    }

    @Test
    fun cartItem_quantity_isDisplayed() {
        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(quantity = 3),
                onQuantityIncrease = { },
                onQuantityDecrease = { },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithText("3").assertIsDisplayed()
    }

    @Test
    fun cartItem_restaurantName_isDisplayed() {
        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(restaurantName = "Mario's Italian"),
                onQuantityIncrease = { },
                onQuantityDecrease = { },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithText("Mario's Italian").assertIsDisplayed()
    }

    @Test
    fun cartItem_increaseQuantity_triggersCallback() {
        var increased = false

        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(),
                onQuantityIncrease = { increased = true },
                onQuantityDecrease = { },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Increase quantity").performClick()

        assert(increased) { "Quantity increase callback was not triggered" }
    }

    @Test
    fun cartItem_decreaseQuantity_triggersCallback() {
        var decreased = false

        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(quantity = 2),
                onQuantityIncrease = { },
                onQuantityDecrease = { decreased = true },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Decrease quantity").performClick()

        assert(decreased) { "Quantity decrease callback was not triggered" }
    }

    @Test
    fun cartItem_removeItem_triggersCallback() {
        var removed = false

        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(),
                onQuantityIncrease = { },
                onQuantityDecrease = { },
                onRemove = { removed = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Remove item").performClick()

        assert(removed) { "Remove item callback was not triggered" }
    }

    @Test
    fun cartItem_customizations_areDisplayed() {
        composeTestRule.setContent {
            CartItemCard(
                item = createTestCartItem(customizations = "Extra cheese, No onions"),
                onQuantityIncrease = { },
                onQuantityDecrease = { },
                onRemove = { }
            )
        }

        composeTestRule.onNodeWithText("Extra cheese, No onions", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // CART SUMMARY TESTS
    // ============================================================

    @Test
    fun cartSummary_subtotal_isDisplayed() {
        composeTestRule.setContent {
            CartSummaryCard(
                subtotal = 45.99,
                deliveryFee = 4.99,
                serviceFee = 1.00,
                tax = 3.68,
                total = 55.66
            )
        }

        composeTestRule.onNodeWithText("Subtotal").assertIsDisplayed()
        composeTestRule.onNodeWithText("$45.99").assertIsDisplayed()
    }

    @Test
    fun cartSummary_deliveryFee_isDisplayed() {
        composeTestRule.setContent {
            CartSummaryCard(
                subtotal = 45.99,
                deliveryFee = 4.99,
                serviceFee = 1.00,
                tax = 3.68,
                total = 55.66
            )
        }

        composeTestRule.onNodeWithText("Delivery Fee").assertIsDisplayed()
        composeTestRule.onNodeWithText("$4.99").assertIsDisplayed()
    }

    @Test
    fun cartSummary_platformFee_shows1Dollar() {
        composeTestRule.setContent {
            CartSummaryCard(
                subtotal = 45.99,
                deliveryFee = 4.99,
                serviceFee = 1.00,
                tax = 3.68,
                total = 55.66
            )
        }

        // Platform fee should be $1.00 flat (matchmaking fee)
        composeTestRule.onNodeWithText("Service Fee").assertIsDisplayed()
        composeTestRule.onNodeWithText("$1.00").assertIsDisplayed()
    }

    @Test
    fun cartSummary_tax_isDisplayed() {
        composeTestRule.setContent {
            CartSummaryCard(
                subtotal = 45.99,
                deliveryFee = 4.99,
                serviceFee = 1.00,
                tax = 3.68,
                total = 55.66
            )
        }

        composeTestRule.onNodeWithText("Tax").assertIsDisplayed()
        composeTestRule.onNodeWithText("$3.68").assertIsDisplayed()
    }

    @Test
    fun cartSummary_total_isDisplayedProminent() {
        composeTestRule.setContent {
            CartSummaryCard(
                subtotal = 45.99,
                deliveryFee = 4.99,
                serviceFee = 1.00,
                tax = 3.68,
                total = 55.66
            )
        }

        composeTestRule.onNodeWithText("Total").assertIsDisplayed()
        composeTestRule.onNodeWithText("$55.66").assertIsDisplayed()
    }

    // ============================================================
    // CHECKOUT BUTTON TESTS
    // ============================================================

    @Test
    fun checkoutButton_isDisplayed() {
        composeTestRule.setContent {
            CheckoutButton(
                total = 55.66,
                itemCount = 3,
                onClick = { },
                enabled = true
            )
        }

        composeTestRule.onNodeWithText("Checkout", substring = true).assertIsDisplayed()
    }

    @Test
    fun checkoutButton_showsItemCount() {
        composeTestRule.setContent {
            CheckoutButton(
                total = 55.66,
                itemCount = 3,
                onClick = { },
                enabled = true
            )
        }

        composeTestRule.onNodeWithText("3 items", substring = true).assertIsDisplayed()
    }

    @Test
    fun checkoutButton_showsTotal() {
        composeTestRule.setContent {
            CheckoutButton(
                total = 55.66,
                itemCount = 3,
                onClick = { },
                enabled = true
            )
        }

        composeTestRule.onNodeWithText("$55.66", substring = true).assertIsDisplayed()
    }

    @Test
    fun checkoutButton_enabled_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            CheckoutButton(
                total = 55.66,
                itemCount = 3,
                onClick = { clicked = true },
                enabled = true
            )
        }

        composeTestRule.onNodeWithText("Checkout", substring = true).performClick()

        assert(clicked) { "Checkout button callback was not triggered" }
    }

    @Test
    fun checkoutButton_disabled_doesNotTriggerCallback() {
        var clicked = false

        composeTestRule.setContent {
            CheckoutButton(
                total = 0.0,
                itemCount = 0,
                onClick = { clicked = true },
                enabled = false
            )
        }

        composeTestRule.onNodeWithText("Checkout", substring = true).performClick()

        assert(!clicked) { "Disabled checkout button should not trigger callback" }
    }

    // ============================================================
    // EMPTY CART TESTS
    // ============================================================

    @Test
    fun emptyCart_illustration_isDisplayed() {
        composeTestRule.setContent {
            EmptyCartView(onBrowseRestaurants = { })
        }

        // Empty cart should show shopping bag illustration
        composeTestRule.onNodeWithContentDescription("Empty Cart").assertExists()
    }

    @Test
    fun emptyCart_message_isDisplayed() {
        composeTestRule.setContent {
            EmptyCartView(onBrowseRestaurants = { })
        }

        composeTestRule.onNodeWithText("Your cart is empty", substring = true).assertIsDisplayed()
    }

    @Test
    fun emptyCart_browseButton_triggersCallback() {
        var browsed = false

        composeTestRule.setContent {
            EmptyCartView(onBrowseRestaurants = { browsed = true })
        }

        composeTestRule.onNodeWithText("Browse Restaurants", substring = true).performClick()

        assert(browsed) { "Browse restaurants callback was not triggered" }
    }

    // ============================================================
    // MULTI-RESTAURANT CART TESTS
    // ============================================================

    @Test
    fun multiRestaurantBanner_isDisplayedWhenMultiple() {
        composeTestRule.setContent {
            MultiRestaurantCartBanner(
                restaurantCount = 2,
                onLearnMore = { }
            )
        }

        composeTestRule.onNodeWithText("2 restaurants", substring = true).assertIsDisplayed()
    }

    @Test
    fun multiRestaurantBanner_showsSavingsMessage() {
        composeTestRule.setContent {
            MultiRestaurantCartBanner(
                restaurantCount = 3,
                onLearnMore = { }
            )
        }

        // Should show single delivery message
        composeTestRule.onNodeWithText("One delivery, multiple restaurants", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // FEE BREAKDOWN TESTS
    // ============================================================

    @Test
    fun feeBreakdown_showsInfoIcon() {
        composeTestRule.setContent {
            FeeBreakdownRow(
                label = "Service Fee",
                amount = 1.00,
                hasInfoButton = true,
                onInfoClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Info").assertExists()
    }

    @Test
    fun feeBreakdown_infoClick_triggersCallback() {
        var infoClicked = false

        composeTestRule.setContent {
            FeeBreakdownRow(
                label = "Service Fee",
                amount = 1.00,
                hasInfoButton = true,
                onInfoClick = { infoClicked = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Info").performClick()

        assert(infoClicked) { "Info button callback was not triggered" }
    }

    // ============================================================
    // PROMO CODE TESTS
    // ============================================================

    @Test
    fun promoCodeSection_isDisplayed() {
        composeTestRule.setContent {
            PromoCodeSection(
                promoCode = "",
                onPromoCodeChange = { },
                onApplyPromo = { },
                isApplied = false
            )
        }

        composeTestRule.onNodeWithText("Promo Code", substring = true).assertIsDisplayed()
    }

    @Test
    fun promoCodeSection_applyButton_triggersCallback() {
        var applied = false

        composeTestRule.setContent {
            PromoCodeSection(
                promoCode = "SAVE10",
                onPromoCodeChange = { },
                onApplyPromo = { applied = true },
                isApplied = false
            )
        }

        composeTestRule.onNodeWithText("Apply").performClick()

        assert(applied) { "Apply promo callback was not triggered" }
    }

    @Test
    fun promoCodeSection_appliedState_showsDiscount() {
        composeTestRule.setContent {
            PromoCodeSection(
                promoCode = "SAVE10",
                onPromoCodeChange = { },
                onApplyPromo = { },
                isApplied = true,
                discountAmount = 5.00
            )
        }

        composeTestRule.onNodeWithText("-$5.00", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // DELIVERY ADDRESS TESTS
    // ============================================================

    @Test
    fun deliveryAddress_isDisplayed() {
        composeTestRule.setContent {
            DeliveryAddressCard(
                address = "123 Main St, San Francisco, CA 94102",
                onChangeAddress = { }
            )
        }

        composeTestRule.onNodeWithText("123 Main St", substring = true).assertIsDisplayed()
    }

    @Test
    fun deliveryAddress_changeButton_triggersCallback() {
        var changed = false

        composeTestRule.setContent {
            DeliveryAddressCard(
                address = "123 Main St, San Francisco, CA 94102",
                onChangeAddress = { changed = true }
            )
        }

        composeTestRule.onNodeWithText("Change").performClick()

        assert(changed) { "Change address callback was not triggered" }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    private fun createTestCartItem(
        name: String = "Margherita Pizza",
        price: Double = 15.99,
        quantity: Int = 1,
        restaurantName: String = "Mario's Italian",
        customizations: String = ""
    ) = CartItem(
        id = "item_123",
        name = name,
        price = price,
        quantity = quantity,
        restaurantName = restaurantName,
        customizations = customizations,
        imageUrl = null
    )
}

// ============================================================
// PLACEHOLDER COMPOSABLES FOR TESTING
// These would be actual composables in the app
// ============================================================

data class CartItem(
    val id: String,
    val name: String,
    val price: Double,
    val quantity: Int,
    val restaurantName: String,
    val customizations: String,
    val imageUrl: String?
)
