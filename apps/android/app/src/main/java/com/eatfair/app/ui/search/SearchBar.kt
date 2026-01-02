package com.eatfair.app.ui.search

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SearchBar
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdvancedSearchBarMaterial3(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onBackClick: () -> Unit = {},
    onMicClick: () -> Unit = {},
    placeholder: String = "Restaurant name or a dish...",
    modifier: Modifier = Modifier
) {
    SearchBar(
        query = searchQuery,
        onQueryChange = onSearchQueryChange,
        onSearch = { /* Handle search */ },
        active = false,
        onActiveChange = { /* Handle active state */ },
        modifier = modifier.fillMaxWidth(),
        placeholder = {
            Text(
                text = placeholder,
                fontSize = 14.sp,
                color = Color(0xFF9E9E9E)
            )
        },
        leadingIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        },
//        trailingIcon = {
//            IconButton(onClick = onMicClick) {
//                Icon(
//                    imageVector = Icons.Filled.Mic,
//                    contentDescription = "Voice Search",
//                    tint = Color(0xFF2E7D32)
//                )
//            }
//        },
        shape = RoundedCornerShape(12.dp),
        colors = SearchBarDefaults.colors(
            containerColor = Color.White,
            dividerColor = Color(0xFFE0E0E0)
        )
    ) {
        // Search suggestions can go here
    }
}

// Usage Examples
/*
// In your screen composable:
@Composable
fun MySearchScreen() {
    var searchQuery by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
        AdvancedSearchBar(
            searchQuery = searchQuery,
            onSearchQueryChange = { searchQuery = it },
            onBackClick = { /* Navigate back */ },
            onMicClick = { /* Start voice search */ },
            modifier = Modifier.padding(16.dp)
        )

        // Your search results or suggestions here
    }
}

// Or use the complete screen:
AdvancedSearchScreen(
    onBackClick = { navController.navigateUp() },
    onSearchQueryChange = { query ->
        viewModel.search(query)
    },
    onRecentSearchClick = { search ->
        viewModel.searchByTerm(search)
    },
    onCuisineClick = { cuisine ->
        navController.navigate("results/$cuisine")
    },
    onMicClick = {
        // Start voice recognition
    }
)
*/
