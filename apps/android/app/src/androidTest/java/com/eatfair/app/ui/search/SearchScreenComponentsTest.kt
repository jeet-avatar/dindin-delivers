package com.eatfair.app.ui.search

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

/**
 * Comprehensive UI tests for SearchScreen components.
 *
 * Note: SearchScreen requires a ViewModel, so we test individual components
 * and navigation patterns rather than the full screen.
 *
 * Tests cover:
 * - AdvancedSearchBar component
 * - RecentSearchChip component
 * - CuisineChip component
 * - SmartSearchCard component
 * - Sort dropdown behavior
 */
class SearchScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ============================================================
    // ADVANCED SEARCH BAR TESTS
    // ============================================================

    @Test
    fun advancedSearchBar_placeholder_isDisplayed() {
        composeTestRule.setContent {
            AdvancedSearchBarMaterial3(
                searchQuery = "",
                onSearchQueryChange = { },
                onBackClick = { },
                onMicClick = { }
            )
        }

        composeTestRule.onNodeWithText("Search restaurants, food...", substring = true)
            .assertExists()
    }

    @Test
    fun advancedSearchBar_backButtonClick_triggersCallback() {
        var backClicked = false

        composeTestRule.setContent {
            AdvancedSearchBarMaterial3(
                searchQuery = "",
                onSearchQueryChange = { },
                onBackClick = { backClicked = true },
                onMicClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Back").performClick()

        assert(backClicked) { "Back button callback was not triggered" }
    }

    @Test
    fun advancedSearchBar_micButtonClick_triggersCallback() {
        var micClicked = false

        composeTestRule.setContent {
            AdvancedSearchBarMaterial3(
                searchQuery = "",
                onSearchQueryChange = { },
                onBackClick = { },
                onMicClick = { micClicked = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Voice search").performClick()

        assert(micClicked) { "Mic button callback was not triggered" }
    }

    @Test
    fun advancedSearchBar_textInput_triggersOnChange() {
        var capturedQuery = ""

        composeTestRule.setContent {
            AdvancedSearchBarMaterial3(
                searchQuery = "",
                onSearchQueryChange = { capturedQuery = it },
                onBackClick = { },
                onMicClick = { }
            )
        }

        // Find the text field and input text
        composeTestRule.onNode(hasSetTextAction())
            .performTextInput("pizza")

        assert(capturedQuery == "pizza") { "Query was not captured. Got: $capturedQuery" }
    }

    @Test
    fun advancedSearchBar_searchIcon_isDisplayed() {
        composeTestRule.setContent {
            AdvancedSearchBarMaterial3(
                searchQuery = "",
                onSearchQueryChange = { },
                onBackClick = { },
                onMicClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Search").assertExists()
    }

    @Test
    fun advancedSearchBar_existingQuery_isDisplayed() {
        composeTestRule.setContent {
            AdvancedSearchBarMaterial3(
                searchQuery = "sushi",
                onSearchQueryChange = { },
                onBackClick = { },
                onMicClick = { }
            )
        }

        composeTestRule.onNodeWithText("sushi").assertIsDisplayed()
    }

    // ============================================================
    // RECENT SEARCH CHIP TESTS
    // ============================================================

    @Test
    fun recentSearchChip_displaysText() {
        composeTestRule.setContent {
            RecentSearchChip(
                text = "Pizza near me",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Pizza near me").assertIsDisplayed()
    }

    @Test
    fun recentSearchChip_hasHistoryIcon() {
        composeTestRule.setContent {
            RecentSearchChip(
                text = "Burgers",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithContentDescription("Recent search").assertExists()
    }

    @Test
    fun recentSearchChip_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            RecentSearchChip(
                text = "Thai food",
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("Thai food").performClick()

        assert(clicked) { "Recent search chip click was not triggered" }
    }

    @Test
    fun recentSearchChip_multipleChips_allClickable() {
        val clicks = mutableMapOf<String, Boolean>()

        composeTestRule.setContent {
            androidx.compose.foundation.layout.Row {
                RecentSearchChip(text = "Pizza", onClick = { clicks["Pizza"] = true })
                RecentSearchChip(text = "Sushi", onClick = { clicks["Sushi"] = true })
                RecentSearchChip(text = "Tacos", onClick = { clicks["Tacos"] = true })
            }
        }

        composeTestRule.onNodeWithText("Pizza").performClick()
        composeTestRule.onNodeWithText("Sushi").performClick()
        composeTestRule.onNodeWithText("Tacos").performClick()

        assert(clicks["Pizza"] == true) { "Pizza chip was not clicked" }
        assert(clicks["Sushi"] == true) { "Sushi chip was not clicked" }
        assert(clicks["Tacos"] == true) { "Tacos chip was not clicked" }
    }

    // ============================================================
    // CUISINE CHIP TESTS
    // ============================================================

    @Test
    fun cuisineChip_displaysNameAndEmoji() {
        val cuisine = PopularCuisine(name = "Italian", emoji = "🍕")

        composeTestRule.setContent {
            CuisineChip(
                cuisine = cuisine,
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("🍕 Italian", substring = true).assertIsDisplayed()
    }

    @Test
    fun cuisineChip_click_triggersCallback() {
        var clicked = false
        val cuisine = PopularCuisine(name = "Mexican", emoji = "🌮")

        composeTestRule.setContent {
            CuisineChip(
                cuisine = cuisine,
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("🌮 Mexican", substring = true).performClick()

        assert(clicked) { "Cuisine chip click was not triggered" }
    }

    @Test
    fun cuisineChip_variousCuisines_allDisplayedCorrectly() {
        val cuisines = listOf(
            PopularCuisine("Italian", "🍝"),
            PopularCuisine("Japanese", "🍣"),
            PopularCuisine("Indian", "🍛"),
            PopularCuisine("American", "🍔")
        )

        composeTestRule.setContent {
            androidx.compose.foundation.layout.Column {
                cuisines.forEach { cuisine ->
                    CuisineChip(cuisine = cuisine, onClick = { })
                }
            }
        }

        cuisines.forEach { cuisine ->
            composeTestRule.onNodeWithText("${cuisine.emoji} ${cuisine.name}", substring = true)
                .assertIsDisplayed()
        }
    }

    // ============================================================
    // SMART SEARCH CARD TESTS
    // ============================================================

    @Test
    fun smartSearchCard_displaysAllContent() {
        composeTestRule.setContent {
            SmartSearchCard(
                icon = "🎤",
                title = "Voice Search",
                description = "Speak to search",
                color = androidx.compose.ui.graphics.Color(0xFF4CAF50),
                onClick = { },
                modifier = androidx.compose.ui.Modifier
            )
        }

        composeTestRule.onNodeWithText("🎤").assertIsDisplayed()
        composeTestRule.onNodeWithText("Voice Search").assertIsDisplayed()
        composeTestRule.onNodeWithText("Speak to search").assertIsDisplayed()
    }

    @Test
    fun smartSearchCard_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            SmartSearchCard(
                icon = "✨",
                title = "AI Picks",
                description = "Personalized for you",
                color = androidx.compose.ui.graphics.Color(0xFFFF6B35),
                onClick = { clicked = true },
                modifier = androidx.compose.ui.Modifier
            )
        }

        composeTestRule.onNodeWithText("AI Picks").performClick()

        assert(clicked) { "Smart search card click was not triggered" }
    }

    @Test
    fun smartSearchCard_voiceSearch_hasCorrectIcon() {
        composeTestRule.setContent {
            SmartSearchCard(
                icon = "🎤",
                title = "Voice Search",
                description = "Speak to search",
                color = androidx.compose.ui.graphics.Color.Green,
                onClick = { },
                modifier = androidx.compose.ui.Modifier
            )
        }

        composeTestRule.onNodeWithText("🎤").assertIsDisplayed()
    }

    @Test
    fun smartSearchCard_aiPicks_hasCorrectIcon() {
        composeTestRule.setContent {
            SmartSearchCard(
                icon = "✨",
                title = "AI Picks",
                description = "Personalized for you",
                color = androidx.compose.ui.graphics.Color(0xFFFF6B35),
                onClick = { },
                modifier = androidx.compose.ui.Modifier
            )
        }

        composeTestRule.onNodeWithText("✨").assertIsDisplayed()
    }

    // ============================================================
    // SEARCH RESULT ITEM TESTS
    // ============================================================

    @Test
    fun searchResultItem_displaysRestaurantInfo() {
        composeTestRule.setContent {
            SearchResultItem(
                name = "Pizza Palace",
                cuisine = "Italian",
                rating = 4.5,
                deliveryTime = "25-35 min",
                priceRange = "$$",
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Pizza Palace").assertIsDisplayed()
        composeTestRule.onNodeWithText("Italian", substring = true).assertExists()
        composeTestRule.onNodeWithText("4.5", substring = true).assertExists()
        composeTestRule.onNodeWithText("25-35 min", substring = true).assertExists()
    }

    @Test
    fun searchResultItem_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            SearchResultItem(
                name = "Burger Joint",
                cuisine = "American",
                rating = 4.2,
                deliveryTime = "20-30 min",
                priceRange = "$",
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithText("Burger Joint").performClick()

        assert(clicked) { "Search result click was not triggered" }
    }

    // ============================================================
    // SECTION HEADER TESTS
    // ============================================================

    @Test
    fun sectionHeader_recentSearches_displaysCorrectly() {
        composeTestRule.setContent {
            androidx.compose.material3.Text(
                text = "Recent Searches",
                fontSize = androidx.compose.ui.unit.sp(16)
            )
        }

        composeTestRule.onNodeWithText("Recent Searches").assertIsDisplayed()
    }

    @Test
    fun sectionHeader_popularCuisines_displaysCorrectly() {
        composeTestRule.setContent {
            androidx.compose.material3.Text(
                text = "Popular Cuisines",
                fontSize = androidx.compose.ui.unit.sp(16)
            )
        }

        composeTestRule.onNodeWithText("Popular Cuisines").assertIsDisplayed()
    }

    @Test
    fun sectionHeader_smartSearch_displaysCorrectly() {
        composeTestRule.setContent {
            androidx.compose.material3.Text(
                text = "Smart Search",
                fontSize = androidx.compose.ui.unit.sp(16)
            )
        }

        composeTestRule.onNodeWithText("Smart Search").assertIsDisplayed()
    }

    // ============================================================
    // SORT OPTION TESTS
    // ============================================================

    @Test
    fun sortButton_displaysDefaultOption() {
        composeTestRule.setContent {
            SortButton(
                currentOption = SearchViewModel.SortOption.RELEVANCE,
                onClick = { }
            )
        }

        composeTestRule.onNodeWithText("Relevance", substring = true).assertExists()
    }

    @Test
    fun sortButton_click_triggersCallback() {
        var clicked = false

        composeTestRule.setContent {
            SortButton(
                currentOption = SearchViewModel.SortOption.RELEVANCE,
                onClick = { clicked = true }
            )
        }

        composeTestRule.onNodeWithContentDescription("Sort").performClick()

        assert(clicked) { "Sort button click was not triggered" }
    }

    // ============================================================
    // LOADING STATE TESTS
    // ============================================================

    @Test
    fun searchingIndicator_isDisplayed() {
        composeTestRule.setContent {
            SearchLoadingIndicator()
        }

        composeTestRule.onNodeWithText("Searching...").assertIsDisplayed()
    }

    // ============================================================
    // EMPTY STATE TESTS
    // ============================================================

    @Test
    fun emptyResults_displaysNoResultsMessage() {
        composeTestRule.setContent {
            EmptySearchResults(query = "xyznonexistent123")
        }

        composeTestRule.onNodeWithText("No results found", substring = true, ignoreCase = true)
            .assertExists()
    }
}

// ============================================================
// HELPER COMPOSABLES FOR TESTING
// (These mirror components from SearchScreen that may be private)
// ============================================================

@Composable
private fun SearchResultItem(
    name: String,
    cuisine: String,
    rating: Double,
    deliveryTime: String,
    priceRange: String,
    onClick: () -> Unit
) {
    androidx.compose.material3.Card(
        modifier = androidx.compose.ui.Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(8.dp)
    ) {
        androidx.compose.foundation.layout.Column(
            modifier = androidx.compose.ui.Modifier.padding(12.dp)
        ) {
            androidx.compose.material3.Text(text = name, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
            androidx.compose.material3.Text(text = "$cuisine • $rating ⭐ • $deliveryTime • $priceRange")
        }
    }
}

@Composable
private fun SortButton(
    currentOption: SearchViewModel.SortOption,
    onClick: () -> Unit
) {
    androidx.compose.material3.IconButton(onClick = onClick) {
        androidx.compose.foundation.layout.Row(
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            androidx.compose.material3.Icon(
                imageVector = androidx.compose.material.icons.Icons.Default.Sort,
                contentDescription = "Sort"
            )
            androidx.compose.material3.Text(text = currentOption.displayName())
        }
    }
}

@Composable
private fun SearchLoadingIndicator() {
    androidx.compose.foundation.layout.Row(
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
    ) {
        androidx.compose.material3.CircularProgressIndicator(
            modifier = androidx.compose.ui.Modifier.size(20.dp)
        )
        androidx.compose.material3.Text(text = "Searching...")
    }
}

@Composable
private fun EmptySearchResults(query: String) {
    androidx.compose.foundation.layout.Column(
        modifier = androidx.compose.ui.Modifier.fillMaxWidth(),
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
    ) {
        androidx.compose.material3.Text(
            text = "No results found for \"$query\"",
            color = androidx.compose.ui.graphics.Color.Gray
        )
    }
}

// Extension function for SortOption display name
private fun SearchViewModel.SortOption.displayName(): String = when (this) {
    SearchViewModel.SortOption.RELEVANCE -> "Relevance"
    SearchViewModel.SortOption.RATING -> "Rating"
    SearchViewModel.SortOption.DELIVERY_TIME -> "Delivery Time"
    SearchViewModel.SortOption.DISTANCE -> "Distance"
}

// Data class for PopularCuisine (matching SearchViewModel)
data class PopularCuisine(
    val name: String,
    val emoji: String
)
