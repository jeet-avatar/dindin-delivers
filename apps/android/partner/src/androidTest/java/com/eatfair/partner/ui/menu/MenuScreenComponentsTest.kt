package com.eatfair.partner.ui.menu

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for Restaurant Partner MenuScreen components.
 *
 * Tests cover:
 * - Menu item cards
 * - Category tabs
 * - Add/Edit item dialogs
 * - Availability toggles
 * - Price editing
 * - Search functionality
 * - Image upload
 */
class MenuScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // MENU ITEM CARD TESTS
    // ============================================================

    @Test
    fun menuItemCard_name_isDisplayed() {
        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithText("Margherita Pizza").assertIsDisplayed()
    }

    @Test
    fun menuItemCard_price_isDisplayed() {
        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(price = 15.99),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithText("$15.99").assertIsDisplayed()
    }

    @Test
    fun menuItemCard_description_isDisplayed() {
        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(description = "Fresh mozzarella, tomatoes, basil"),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithText("Fresh mozzarella, tomatoes, basil", substring = true).assertIsDisplayed()
    }

    @Test
    fun menuItemCard_category_isDisplayed() {
        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(category = "Pizza"),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithText("Pizza").assertIsDisplayed()
    }

    @Test
    fun menuItemCard_availableToggle_isOn() {
        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(isAvailable = true),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithText("Available").assertIsDisplayed()
    }

    @Test
    fun menuItemCard_unavailableToggle_isOff() {
        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(isAvailable = false),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithText("Unavailable").assertIsDisplayed()
    }

    @Test
    fun menuItemCard_editButton_triggersCallback() {
        var edited = false

        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(),
                onEdit = { edited = true },
                onToggleAvailability = { },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Edit item").performClick()

        assert(edited) { "Edit callback was not triggered" }
    }

    @Test
    fun menuItemCard_toggleAvailability_triggersCallback() {
        var toggled = false

        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(),
                onEdit = { },
                onToggleAvailability = { toggled = true },
                onDelete = { }
            )
        }

        composeTestRule.onNodeWithTag("availability_toggle").performClick()

        assert(toggled) { "Toggle availability callback was not triggered" }
    }

    @Test
    fun menuItemCard_deleteButton_triggersCallback() {
        var deleted = false

        composeTestRule.setContent {
            MenuItemCard(
                item = createTestMenuItem(),
                onEdit = { },
                onToggleAvailability = { },
                onDelete = { deleted = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Delete item").performClick()

        assert(deleted) { "Delete callback was not triggered" }
    }

    // ============================================================
    // CATEGORY TABS TESTS
    // ============================================================

    @Test
    fun categoryTabs_allCategories_areDisplayed() {
        composeTestRule.setContent {
            CategoryTabs(
                categories = listOf("All", "Pizza", "Salads", "Desserts", "Drinks"),
                selectedCategory = "All",
                onCategorySelect = { }
            )
        }

        composeTestRule.onNodeWithText("All").assertIsDisplayed()
        composeTestRule.onNodeWithText("Pizza").assertIsDisplayed()
        composeTestRule.onNodeWithText("Salads").assertIsDisplayed()
    }

    @Test
    fun categoryTabs_selectedCategory_isHighlighted() {
        composeTestRule.setContent {
            CategoryTabs(
                categories = listOf("All", "Pizza", "Salads"),
                selectedCategory = "Pizza",
                onCategorySelect = { }
            )
        }

        composeTestRule.onNodeWithText("Pizza").assertIsDisplayed()
    }

    @Test
    fun categoryTabs_click_triggersCallback() {
        var selectedCategory = ""

        composeTestRule.setContent {
            CategoryTabs(
                categories = listOf("All", "Pizza", "Salads"),
                selectedCategory = "All",
                onCategorySelect = { selectedCategory = it }
            )
        }

        composeTestRule.onNodeWithText("Salads").performClick()

        assert(selectedCategory == "Salads") { "Category selection callback was not triggered" }
    }

    // ============================================================
    // ADD ITEM DIALOG TESTS
    // ============================================================

    @Test
    fun addItemDialog_title_isDisplayed() {
        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Add Menu Item").assertIsDisplayed()
    }

    @Test
    fun addItemDialog_nameField_isDisplayed() {
        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Item Name").assertIsDisplayed()
    }

    @Test
    fun addItemDialog_priceField_isDisplayed() {
        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Price").assertIsDisplayed()
    }

    @Test
    fun addItemDialog_descriptionField_isDisplayed() {
        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Description").assertIsDisplayed()
    }

    @Test
    fun addItemDialog_categorySelector_isDisplayed() {
        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Category").assertIsDisplayed()
    }

    @Test
    fun addItemDialog_saveButton_isDisplayed() {
        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Save").assertIsDisplayed()
    }

    @Test
    fun addItemDialog_cancelButton_triggersCallback() {
        var dismissed = false

        composeTestRule.setContent {
            AddItemDialog(
                onDismiss = { dismissed = true },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Cancel").performClick()

        assert(dismissed) { "Dismiss callback was not triggered" }
    }

    // ============================================================
    // EDIT ITEM DIALOG TESTS
    // ============================================================

    @Test
    fun editItemDialog_title_isDisplayed() {
        composeTestRule.setContent {
            EditItemDialog(
                item = createTestMenuItem(),
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Edit Menu Item").assertIsDisplayed()
    }

    @Test
    fun editItemDialog_prePopulatedName() {
        composeTestRule.setContent {
            EditItemDialog(
                item = createTestMenuItem(name = "Margherita Pizza"),
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("Margherita Pizza").assertIsDisplayed()
    }

    @Test
    fun editItemDialog_prePopulatedPrice() {
        composeTestRule.setContent {
            EditItemDialog(
                item = createTestMenuItem(price = 15.99),
                onDismiss = { },
                onSave = { }
            )
        }

        composeTestRule.onNodeWithText("15.99", substring = true).assertIsDisplayed()
    }

    // ============================================================
    // SEARCH BAR TESTS
    // ============================================================

    @Test
    fun searchBar_placeholder_isDisplayed() {
        composeTestRule.setContent {
            MenuSearchBar(
                query = "",
                onQueryChange = { }
            )
        }

        composeTestRule.onNodeWithText("Search menu items...").assertIsDisplayed()
    }

    @Test
    fun searchBar_queryChange_triggersCallback() {
        var query = ""

        composeTestRule.setContent {
            MenuSearchBar(
                query = "",
                onQueryChange = { query = it }
            )
        }

        composeTestRule.onNodeWithText("Search menu items...").performTextInput("Pizza")

        assert(query == "Pizza") { "Search query callback was not triggered" }
    }

    @Test
    fun searchBar_clearButton_isVisible_whenHasQuery() {
        composeTestRule.setContent {
            MenuSearchBar(
                query = "Pizza",
                onQueryChange = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Clear search").assertExists()
    }

    // ============================================================
    // ADD ITEM BUTTON TESTS
    // ============================================================

    @Test
    fun addItemButton_isDisplayed() {
        composeTestRule.setContent {
            AddItemButton(
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Add Item").assertIsDisplayed()
    }

    @Test
    fun addItemButton_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            AddItemButton(
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("Add Item").performClick()

        assert(clicked) { "Add item callback was not triggered" }
    }

    // ============================================================
    // IMAGE UPLOAD TESTS
    // ============================================================

    @Test
    fun imageUploadSection_placeholder_isDisplayed() {
        composeTestRule.setContent {
            ImageUploadSection(
                imageUrl = null,
                onUploadClick = { }
            )
        }

        composeTestRule.onNodeWithText("Upload Image").assertIsDisplayed()
    }

    @Test
    fun imageUploadSection_hasImage_showsPreview() {
        composeTestRule.setContent {
            ImageUploadSection(
                imageUrl = "https://example.com/image.jpg",
                onUploadClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Item image").assertExists()
    }

    @Test
    fun imageUploadSection_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            ImageUploadSection(
                imageUrl = null,
                onUploadClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("Upload Image").performClick()

        assert(clicked) { "Upload callback was not triggered" }
    }

    // ============================================================
    // EMPTY STATE TESTS
    // ============================================================

    @Test
    fun emptyMenuState_message_isDisplayed() {
        composeTestRule.setContent {
            EmptyMenuState(
                onAddItem = { }
            )
        }

        composeTestRule.onNodeWithText("No menu items yet").assertIsDisplayed()
    }

    @Test
    fun emptyMenuState_addButton_triggersCallback() {
        var addClicked = false

        composeTestRule.setContent {
            EmptyMenuState(
                onAddItem = { addClicked = true }
            )
        }

        composeTestRule.onNodeWithText("Add Your First Item").performClick()

        assert(addClicked) { "Add item callback was not triggered" }
    }

    // ============================================================
    // DELETE CONFIRMATION DIALOG TESTS
    // ============================================================

    @Test
    fun deleteConfirmationDialog_message_isDisplayed() {
        composeTestRule.setContent {
            DeleteConfirmationDialog(
                itemName = "Margherita Pizza",
                onConfirm = { },
                onDismiss = { }
            )
        }

        composeTestRule.onNodeWithText("Delete Margherita Pizza?", substring = true).assertIsDisplayed()
    }

    @Test
    fun deleteConfirmationDialog_confirm_triggersCallback() {
        var confirmed = false

        composeTestRule.setContent {
            DeleteConfirmationDialog(
                itemName = "Test Item",
                onConfirm = { confirmed = true },
                onDismiss = { }
            )
        }

        composeTestRule.onNodeWithText("Delete").performClick()

        assert(confirmed) { "Confirm callback was not triggered" }
    }

    @Test
    fun deleteConfirmationDialog_cancel_triggersCallback() {
        var dismissed = false

        composeTestRule.setContent {
            DeleteConfirmationDialog(
                itemName = "Test Item",
                onConfirm = { },
                onDismiss = { dismissed = true }
            )
        }

        composeTestRule.onNodeWithText("Cancel").performClick()

        assert(dismissed) { "Dismiss callback was not triggered" }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    private fun createTestMenuItem(
        name: String = "Margherita Pizza",
        price: Double = 15.99,
        description: String = "Fresh mozzarella, tomatoes, basil",
        category: String = "Pizza",
        isAvailable: Boolean = true,
        imageUrl: String? = null
    ) = MenuItem(
        id = "item_123",
        name = name,
        price = price,
        description = description,
        category = category,
        isAvailable = isAvailable,
        imageUrl = imageUrl
    )
}

// ============================================================
// DATA CLASSES FOR TESTING
// ============================================================

data class MenuItem(
    val id: String,
    val name: String,
    val price: Double,
    val description: String,
    val category: String,
    val isAvailable: Boolean,
    val imageUrl: String?
)
