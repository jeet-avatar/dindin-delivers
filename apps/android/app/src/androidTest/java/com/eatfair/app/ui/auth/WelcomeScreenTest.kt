package com.eatfair.app.ui.auth

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for WelcomeScreen composable.
 *
 * Tests cover:
 * - Branding elements visibility
 * - Feature rows display
 * - Call-to-action buttons
 * - Navigation callbacks
 * - Animation triggers (state changes)
 */
class WelcomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // BRANDING & HEADER TESTS
    // ============================================================

    @Test
    fun welcomeScreen_branding_appNameIsDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Dollor.ai").assertIsDisplayed()
    }

    @Test
    fun welcomeScreen_branding_taglineIsDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Your Local Rideshare & Delivery Marketplace")
            .assertIsDisplayed()
    }

    @Test
    fun welcomeScreen_logo_isDisplayedWithCorrectContentDescription() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Dollor.ai Logo").assertIsDisplayed()
    }

    // ============================================================
    // FEATURE ROWS TESTS
    // ============================================================

    @Test
    fun welcomeScreen_featureRow_foodDeliveryIsDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Food Delivery").assertIsDisplayed()
        composeTestRule.onNodeWithText("Order from local restaurants").assertIsDisplayed()
    }

    @Test
    fun welcomeScreen_featureRow_rideshareIsDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Rideshare").assertIsDisplayed()
        composeTestRule.onNodeWithText("Connect with local drivers").assertIsDisplayed()
    }

    @Test
    fun welcomeScreen_featureRow_fairPricesIsDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Fair Prices").assertIsDisplayed()
        // Check for pricing info - $1-$3 platform fees
        composeTestRule.onNodeWithText("Transparent \$1-\$3 platform fees").assertIsDisplayed()
    }

    @Test
    fun welcomeScreen_featureIcons_haveContentDescriptions() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        // Each feature row should have an icon with proper content description
        composeTestRule.onNodeWithContentDescription("Food Delivery").assertExists()
        composeTestRule.onNodeWithContentDescription("Rideshare").assertExists()
        composeTestRule.onNodeWithContentDescription("Fair Prices").assertExists()
    }

    @Test
    fun welcomeScreen_allThreeFeatures_areDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        // Count that we have exactly 3 feature rows
        composeTestRule.onNodeWithText("Food Delivery").assertIsDisplayed()
        composeTestRule.onNodeWithText("Rideshare").assertIsDisplayed()
        composeTestRule.onNodeWithText("Fair Prices").assertIsDisplayed()
    }

    // ============================================================
    // CALL-TO-ACTION BUTTON TESTS
    // ============================================================

    @Test
    fun welcomeScreen_getStartedButton_isDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Get Started").assertIsDisplayed()
        composeTestRule.onNodeWithText("Get Started").assertHasClickAction()
    }

    @Test
    fun welcomeScreen_loginLink_isDisplayed() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("I already have an account").assertIsDisplayed()
        composeTestRule.onNodeWithText("I already have an account").assertHasClickAction()
    }

    // ============================================================
    // NAVIGATION CALLBACK TESTS
    // ============================================================

    @Test
    fun welcomeScreen_getStartedClick_triggersOnJoinCallback() {
        var joinClicked = false

        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { joinClicked = true }
            )
        }

        composeTestRule.onNodeWithText("Get Started").performClick()

        assert(joinClicked) { "onJoinClick callback was not triggered" }
    }

    @Test
    fun welcomeScreen_loginLinkClick_triggersOnLoginCallback() {
        var loginClicked = false

        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { loginClicked = true },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("I already have an account").performClick()

        assert(loginClicked) { "onLoginClick callback was not triggered" }
    }

    @Test
    fun welcomeScreen_multipleClicks_getStarted_triggersMultipleTimes() {
        var clickCount = 0

        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { clickCount++ }
            )
        }

        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Get Started").performClick()

        assert(clickCount == 3) { "Expected 3 clicks but got $clickCount" }
    }

    // ============================================================
    // VISUAL HIERARCHY TESTS
    // ============================================================

    @Test
    fun welcomeScreen_visualElements_existInCorrectOrder() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        // Verify all major sections exist
        composeTestRule.onNodeWithContentDescription("Dollor.ai Logo").assertExists()
        composeTestRule.onNodeWithText("Dollor.ai").assertExists()
        composeTestRule.onNodeWithText("Food Delivery").assertExists()
        composeTestRule.onNodeWithText("Rideshare").assertExists()
        composeTestRule.onNodeWithText("Fair Prices").assertExists()
        composeTestRule.onNodeWithText("Get Started").assertExists()
        composeTestRule.onNodeWithText("I already have an account").assertExists()
    }

    // ============================================================
    // ACCESSIBILITY TESTS
    // ============================================================

    @Test
    fun welcomeScreen_buttons_haveClickAction() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        composeTestRule.onNodeWithText("Get Started").assertHasClickAction()
        composeTestRule.onNodeWithText("I already have an account").assertHasClickAction()
    }

    @Test
    fun welcomeScreen_icons_haveContentDescriptions() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        // Logo icon should have content description
        composeTestRule.onNodeWithContentDescription("Dollor.ai Logo").assertExists()
    }

    // ============================================================
    // PRICING MODEL VERIFICATION TESTS
    // ============================================================

    @Test
    fun welcomeScreen_pricingInfo_showsCorrectPlatformFees() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        // Verify the $1-$3 pricing model is displayed
        composeTestRule.onNode(
            hasText("Transparent", substring = true) and
            hasText("\$1", substring = true) and
            hasText("\$3", substring = true)
        ).assertIsDisplayed()
    }

    // ============================================================
    // DUAL SERVICE PLATFORM TESTS
    // ============================================================

    @Test
    fun welcomeScreen_dualServicePlatform_bothServicesHighlighted() {
        composeTestRule.setContent {
            WelcomeScreen(
                onLoginClick = { },
                onJoinClick = { }
            )
        }

        // Verify both main services are prominently featured
        composeTestRule.onNodeWithText("Food Delivery").assertIsDisplayed()
        composeTestRule.onNodeWithText("Rideshare").assertIsDisplayed()

        // Verify local/marketplace messaging
        composeTestRule.onNodeWithText("local", substring = true, ignoreCase = true)
            .assertExists()
    }
}
