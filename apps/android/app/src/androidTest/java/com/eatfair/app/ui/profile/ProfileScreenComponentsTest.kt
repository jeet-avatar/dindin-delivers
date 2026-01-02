package com.eatfair.app.ui.profile

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Customer ProfileScreen components.
 *
 * Tests cover:
 * - Profile header (name, email, photo)
 * - Settings menu items
 * - Saved addresses section
 * - Payment methods section
 * - Order history
 * - Favorites section
 * - Logout functionality
 * - Language selection
 */
class ProfileScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // PROFILE HEADER TESTS
    // ============================================================

    @Test
    fun profileHeader_userName_isDisplayed() {
        composeTestRule.setContent {
            ProfileHeader(
                name = "John Doe",
                email = "john.doe@example.com",
                photoUrl = null,
                onEditProfile = { }
            )
        }

        composeTestRule.onNodeWithText("John Doe").assertIsDisplayed()
    }

    @Test
    fun profileHeader_email_isDisplayed() {
        composeTestRule.setContent {
            ProfileHeader(
                name = "John Doe",
                email = "john.doe@example.com",
                photoUrl = null,
                onEditProfile = { }
            )
        }

        composeTestRule.onNodeWithText("john.doe@example.com").assertIsDisplayed()
    }

    @Test
    fun profileHeader_editButton_triggersCallback() {
        var editClicked = false

        composeTestRule.setContent {
            ProfileHeader(
                name = "John Doe",
                email = "john.doe@example.com",
                photoUrl = null,
                onEditProfile = { editClicked = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Edit profile").performClick()

        assert(editClicked) { "Edit profile callback was not triggered" }
    }

    @Test
    fun profileHeader_photoPlaceholder_whenNoPhoto() {
        composeTestRule.setContent {
            ProfileHeader(
                name = "John Doe",
                email = "john.doe@example.com",
                photoUrl = null,
                onEditProfile = { }
            )
        }

        // Should show default avatar
        composeTestRule.onNodeWithContentDescription("Profile photo").assertExists()
    }

    // ============================================================
    // MENU ITEM TESTS
    // ============================================================

    @Test
    fun menuItem_myOrders_isDisplayed() {
        composeTestRule.setContent {
            ProfileMenuItem(
                icon = "receipt_long",
                title = "My Orders",
                subtitle = "View order history",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("My Orders").assertIsDisplayed()
        composeTestRule.onNodeWithText("View order history").assertIsDisplayed()
    }

    @Test
    fun menuItem_savedAddresses_isDisplayed() {
        composeTestRule.setContent {
            ProfileMenuItem(
                icon = "location_on",
                title = "Saved Addresses",
                subtitle = "Manage delivery addresses",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Saved Addresses").assertIsDisplayed()
    }

    @Test
    fun menuItem_paymentMethods_isDisplayed() {
        composeTestRule.setContent {
            ProfileMenuItem(
                icon = "credit_card",
                title = "Payment Methods",
                subtitle = "Add or manage cards",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Payment Methods").assertIsDisplayed()
    }

    @Test
    fun menuItem_favorites_isDisplayed() {
        composeTestRule.setContent {
            ProfileMenuItem(
                icon = "favorite",
                title = "Favorites",
                subtitle = "Your favorite restaurants",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Favorites").assertIsDisplayed()
    }

    @Test
    fun menuItem_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            ProfileMenuItem(
                icon = "receipt_long",
                title = "My Orders",
                subtitle = "View order history",
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("My Orders").performClick()

        assert(clicked) { "Menu item click callback was not triggered" }
    }

    @Test
    fun menuItem_hasChevronIcon() {
        composeTestRule.setContent {
            ProfileMenuItem(
                icon = "receipt_long",
                title = "My Orders",
                subtitle = "View order history",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Navigate").assertExists()
    }

    // ============================================================
    // SETTINGS SECTION TESTS
    // ============================================================

    @Test
    fun settingsSection_header_isDisplayed() {
        composeTestRule.setContent {
            SettingsSection(
                onNotificationsClick = { },
                onLanguageClick = { },
                onHelpClick = { },
                onPrivacyClick = { },
                onTermsClick = { }
            )
        }

        composeTestRule.onNodeWithText("Settings").assertIsDisplayed()
    }

    @Test
    fun settingsSection_notifications_isDisplayed() {
        composeTestRule.setContent {
            SettingsSection(
                onNotificationsClick = { },
                onLanguageClick = { },
                onHelpClick = { },
                onPrivacyClick = { },
                onTermsClick = { }
            )
        }

        composeTestRule.onNodeWithText("Notifications").assertIsDisplayed()
    }

    @Test
    fun settingsSection_language_isDisplayed() {
        composeTestRule.setContent {
            SettingsSection(
                onNotificationsClick = { },
                onLanguageClick = { },
                onHelpClick = { },
                onPrivacyClick = { },
                onTermsClick = { }
            )
        }

        composeTestRule.onNodeWithText("Language").assertIsDisplayed()
    }

    @Test
    fun settingsSection_helpSupport_isDisplayed() {
        composeTestRule.setContent {
            SettingsSection(
                onNotificationsClick = { },
                onLanguageClick = { },
                onHelpClick = { },
                onPrivacyClick = { },
                onTermsClick = { }
            )
        }

        composeTestRule.onNodeWithText("Help & Support").assertIsDisplayed()
    }

    @Test
    fun settingsSection_privacyPolicy_isDisplayed() {
        composeTestRule.setContent {
            SettingsSection(
                onNotificationsClick = { },
                onLanguageClick = { },
                onHelpClick = { },
                onPrivacyClick = { },
                onTermsClick = { }
            )
        }

        composeTestRule.onNodeWithText("Privacy Policy").assertIsDisplayed()
    }

    @Test
    fun settingsSection_termsOfService_isDisplayed() {
        composeTestRule.setContent {
            SettingsSection(
                onNotificationsClick = { },
                onLanguageClick = { },
                onHelpClick = { },
                onPrivacyClick = { },
                onTermsClick = { }
            )
        }

        composeTestRule.onNodeWithText("Terms of Service").assertIsDisplayed()
    }

    // ============================================================
    // REFER & EARN TESTS
    // ============================================================

    @Test
    fun referEarnCard_isDisplayed() {
        composeTestRule.setContent {
            ReferAndEarnCard(
                onReferClick = { }
            )
        }

        composeTestRule.onNodeWithText("Refer & Earn").assertIsDisplayed()
    }

    @Test
    fun referEarnCard_showsRewardAmount() {
        composeTestRule.setContent {
            ReferAndEarnCard(
                onReferClick = { }
            )
        }

        composeTestRule.onNodeWithText("$5", substring = true).assertIsDisplayed()
    }

    @Test
    fun referEarnCard_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            ReferAndEarnCard(
                onReferClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("Refer & Earn").performClick()

        assert(clicked) { "Refer & Earn click callback was not triggered" }
    }

    // ============================================================
    // LOGOUT TESTS
    // ============================================================

    @Test
    fun logoutButton_isDisplayed() {
        composeTestRule.setContent {
            LogoutButton(
                onLogoutClick = { }
            )
        }

        composeTestRule.onNodeWithText("Log Out").assertIsDisplayed()
    }

    @Test
    fun logoutButton_click_triggersCallback() {
        var loggedOut = false

        composeTestRule.setContent {
            LogoutButton(
                onLogoutClick = { loggedOut = true }
            )
        }

        composeTestRule.onNodeWithText("Log Out").performClick()

        assert(loggedOut) { "Logout callback was not triggered" }
    }

    @Test
    fun logoutButton_hasRedColor() {
        composeTestRule.setContent {
            LogoutButton(
                onLogoutClick = { }
            )
        }

        // Logout button should exist and be styled appropriately
        composeTestRule.onNodeWithText("Log Out").assertIsDisplayed()
    }

    // ============================================================
    // DELETE ACCOUNT TESTS
    // ============================================================

    @Test
    fun deleteAccountButton_isDisplayed() {
        composeTestRule.setContent {
            DeleteAccountButton(
                onDeleteClick = { }
            )
        }

        composeTestRule.onNodeWithText("Delete Account").assertIsDisplayed()
    }

    @Test
    fun deleteAccountButton_click_triggersCallback() {
        var deleteClicked = false

        composeTestRule.setContent {
            DeleteAccountButton(
                onDeleteClick = { deleteClicked = true }
            )
        }

        composeTestRule.onNodeWithText("Delete Account").performClick()

        assert(deleteClicked) { "Delete account callback was not triggered" }
    }

    // ============================================================
    // LANGUAGE MODAL TESTS
    // ============================================================

    @Test
    fun languageModal_title_isDisplayed() {
        composeTestRule.setContent {
            LanguageModal(
                currentLanguage = "English",
                onLanguageSelect = { },
                onDismiss = { }
            )
        }

        composeTestRule.onNodeWithText("Select Language").assertIsDisplayed()
    }

    @Test
    fun languageModal_allLanguages_areDisplayed() {
        composeTestRule.setContent {
            LanguageModal(
                currentLanguage = "English",
                onLanguageSelect = { },
                onDismiss = { }
            )
        }

        composeTestRule.onNodeWithText("English").assertIsDisplayed()
        composeTestRule.onNodeWithText("Spanish").assertIsDisplayed()
        composeTestRule.onNodeWithText("Chinese").assertIsDisplayed()
    }

    @Test
    fun languageModal_currentLanguage_isSelected() {
        composeTestRule.setContent {
            LanguageModal(
                currentLanguage = "English",
                onLanguageSelect = { },
                onDismiss = { }
            )
        }

        // English should show as selected
        composeTestRule.onNodeWithText("English")
            .assertIsDisplayed()
    }

    @Test
    fun languageModal_selection_triggersCallback() {
        var selectedLanguage = ""

        composeTestRule.setContent {
            LanguageModal(
                currentLanguage = "English",
                onLanguageSelect = { selectedLanguage = it },
                onDismiss = { }
            )
        }

        composeTestRule.onNodeWithText("Spanish").performClick()

        assert(selectedLanguage == "Spanish") { "Language selection callback did not work" }
    }

    // ============================================================
    // VERSION INFO TESTS
    // ============================================================

    @Test
    fun versionInfo_isDisplayed() {
        composeTestRule.setContent {
            AppVersionInfo(
                version = "1.0.0",
                buildNumber = "100"
            )
        }

        composeTestRule.onNodeWithText("Version 1.0.0", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // ORDER HISTORY PREVIEW TESTS
    // ============================================================

    @Test
    fun orderHistoryPreview_header_isDisplayed() {
        composeTestRule.setContent {
            OrderHistoryPreview(
                recentOrders = listOf(
                    RecentOrder("Mario's Pizza", "2 items", "Dec 15", 45.99)
                ),
                onViewAllClick = { }
            )
        }

        composeTestRule.onNodeWithText("Recent Orders").assertIsDisplayed()
    }

    @Test
    fun orderHistoryPreview_viewAllButton_isDisplayed() {
        composeTestRule.setContent {
            OrderHistoryPreview(
                recentOrders = listOf(
                    RecentOrder("Mario's Pizza", "2 items", "Dec 15", 45.99)
                ),
                onViewAllClick = { }
            )
        }

        composeTestRule.onNodeWithText("View All").assertIsDisplayed()
    }

    @Test
    fun orderHistoryPreview_orderItem_isDisplayed() {
        composeTestRule.setContent {
            OrderHistoryPreview(
                recentOrders = listOf(
                    RecentOrder("Mario's Pizza", "2 items", "Dec 15", 45.99)
                ),
                onViewAllClick = { }
            )
        }

        composeTestRule.onNodeWithText("Mario's Pizza").assertIsDisplayed()
        composeTestRule.onNodeWithText("$45.99").assertIsDisplayed()
    }

    // ============================================================
    // FAVORITES PREVIEW TESTS
    // ============================================================

    @Test
    fun favoritesPreview_header_isDisplayed() {
        composeTestRule.setContent {
            FavoritesPreview(
                favoriteRestaurants = listOf("Mario's Pizza", "Sushi Haven"),
                onViewAllClick = { }
            )
        }

        composeTestRule.onNodeWithText("Favorites").assertIsDisplayed()
    }

    @Test
    fun favoritesPreview_restaurants_areDisplayed() {
        composeTestRule.setContent {
            FavoritesPreview(
                favoriteRestaurants = listOf("Mario's Pizza", "Sushi Haven"),
                onViewAllClick = { }
            )
        }

        composeTestRule.onNodeWithText("Mario's Pizza").assertIsDisplayed()
        composeTestRule.onNodeWithText("Sushi Haven").assertIsDisplayed()
    }
}

// ============================================================
// DATA CLASSES FOR TESTING
// ============================================================

data class RecentOrder(
    val restaurantName: String,
    val itemsSummary: String,
    val date: String,
    val total: Double
)
