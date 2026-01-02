package com.eatfair.driver.ui.navigation

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.eatfair.driver.ui.theme.DollorDriverTheme
import org.junit.Rule
import org.junit.Test

/**
 * Integration Tests for Driver Onboarding Flow
 * Tests the complete P2P compliance journey from login to main app
 *
 * Flow:
 * Login -> Legal Acceptance -> Insurance -> Background Check -> Vehicle -> IC Agreement -> Main App
 */
class DriverOnboardingFlowTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun fullOnboardingFlow_completesSuccessfully() {
        composeTestRule.setContent {
            DollorDriverTheme {
                DriverNavGraph()
            }
        }

        // Step 1: Login Screen
        composeTestRule.onNodeWithText("DOLLOR").assertIsDisplayed()
        composeTestRule.onNodeWithText("DRIVER").assertIsDisplayed()

        composeTestRule.onNodeWithText("Email").performTextInput("test@driver.com")
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
        composeTestRule.onNodeWithText("Sign In").performClick()

        // Step 2: Legal Acceptance Screen
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Welcome to Dollor").assertIsDisplayed()
        composeTestRule.onNodeWithText("How Dollor Works").assertIsDisplayed()

        composeTestRule.onNodeWithText("I have read and agree to the Terms of Service", substring = true).performClick()
        composeTestRule.onNodeWithText("I have read and agree to the Privacy Policy", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").performClick()

        // Step 3: Insurance Disclosure Screen (P2P model)
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Insurance Disclosure").assertIsDisplayed()
        composeTestRule.onNodeWithText("How Dollor Works").assertIsDisplayed()

        composeTestRule.onNodeWithText("I understand the insurance requirements", substring = true).performClick()
        composeTestRule.onNodeWithText("Continue").performClick()

        // Step 4: Background Check Screen
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Background Check Authorization").assertIsDisplayed()
        composeTestRule.onNodeWithText("What We Verify").assertIsDisplayed()

        composeTestRule.onNodeWithText("I authorize Dollor and its screening partners", substring = true).performClick()
        composeTestRule.onNodeWithText("I have read and understand my rights", substring = true).performClick()
        composeTestRule.onNodeWithText("Authorize Background Check").performClick()

        // Step 5: Vehicle Requirements Screen
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Vehicle Requirements").assertIsDisplayed()
        composeTestRule.onNodeWithText("Basic Requirements").assertIsDisplayed()

        composeTestRule.onNodeWithText("My vehicle meets all requirements", substring = true).performClick()
        composeTestRule.onNodeWithText("Continue").performClick()

        // Step 6: Independent Contractor Agreement Screen (P2P)
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Independent Contractor Agreement").assertIsDisplayed()
        composeTestRule.onNodeWithText("Peer-to-Peer Platform").assertIsDisplayed()

        composeTestRule.onNodeWithText("I agree to operate as an independent contractor", substring = true).performClick()
        composeTestRule.onNodeWithText("I understand that I control my own schedule", substring = true).performClick()
        composeTestRule.onNodeWithText("I acknowledge that I am responsible", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").performClick()

        // Step 7: Main App (Home Screen)
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Home").assertIsDisplayed()
        composeTestRule.onNodeWithText("Orders").assertIsDisplayed()
        composeTestRule.onNodeWithText("Earnings").assertIsDisplayed()
        composeTestRule.onNodeWithText("Profile").assertIsDisplayed()
    }

    @Test
    fun onboardingFlow_backNavigationWorks() {
        composeTestRule.setContent {
            DollorDriverTheme {
                DriverNavGraph()
            }
        }

        // Login
        composeTestRule.onNodeWithText("Email").performTextInput("test@driver.com")
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
        composeTestRule.onNodeWithText("Sign In").performClick()

        // Legal acceptance
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("I have read and agree to the Terms of Service", substring = true).performClick()
        composeTestRule.onNodeWithText("I have read and agree to the Privacy Policy", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").performClick()

        // Insurance screen - verify we can go back
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Insurance Disclosure").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Back").performClick()

        // Should be back at legal acceptance
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Welcome to Dollor").assertIsDisplayed()
    }

    @Test
    fun onboardingFlow_logoutReturnsToLogin() {
        composeTestRule.setContent {
            DollorDriverTheme {
                DriverNavGraph()
            }
        }

        // Complete the full onboarding flow
        composeTestRule.onNodeWithText("Email").performTextInput("test@driver.com")
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
        composeTestRule.onNodeWithText("Sign In").performClick()

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("I have read and agree to the Terms of Service", substring = true).performClick()
        composeTestRule.onNodeWithText("I have read and agree to the Privacy Policy", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").performClick()

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("I understand the insurance requirements", substring = true).performClick()
        composeTestRule.onNodeWithText("Continue").performClick()

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("I authorize Dollor and its screening partners", substring = true).performClick()
        composeTestRule.onNodeWithText("I have read and understand my rights", substring = true).performClick()
        composeTestRule.onNodeWithText("Authorize Background Check").performClick()

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("My vehicle meets all requirements", substring = true).performClick()
        composeTestRule.onNodeWithText("Continue").performClick()

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("I agree to operate as an independent contractor", substring = true).performClick()
        composeTestRule.onNodeWithText("I understand that I control my own schedule", substring = true).performClick()
        composeTestRule.onNodeWithText("I acknowledge that I am responsible", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").performClick()

        // Now in main app - navigate to profile and logout
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Profile").performClick()

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Logout").performClick()

        // Should be back at login
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("DOLLOR").assertIsDisplayed()
        composeTestRule.onNodeWithText("DRIVER").assertIsDisplayed()
    }

    @Test
    fun onboardingFlow_cannotSkipSteps() {
        composeTestRule.setContent {
            DollorDriverTheme {
                DriverNavGraph()
            }
        }

        // Login
        composeTestRule.onNodeWithText("Email").performTextInput("test@driver.com")
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
        composeTestRule.onNodeWithText("Sign In").performClick()

        // Try to skip legal acceptance (button should be disabled)
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Accept & Continue").assertIsNotEnabled()

        // Accept terms only (not privacy)
        composeTestRule.onNodeWithText("I have read and agree to the Terms of Service", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").assertIsNotEnabled()

        // Accept privacy too
        composeTestRule.onNodeWithText("I have read and agree to the Privacy Policy", substring = true).performClick()
        composeTestRule.onNodeWithText("Accept & Continue").assertIsEnabled()
    }
}
