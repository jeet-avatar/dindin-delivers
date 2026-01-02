package com.eatfair.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repo.RestaurantRepo
import com.eatfair.shared.model.search.SearchResultDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * SearchViewModel - Matches iOS QuickSearchViewModel
 * Handles search, filtering, sorting, and recent searches
 */
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val restaurantRepo: RestaurantRepo
) : ViewModel() {

    // Sort options matching iOS
    enum class SortOption {
        RECOMMENDED, TOP_RATED, FASTEST, NEAREST
    }

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _searchResults = MutableStateFlow<List<SearchResultDto>>(emptyList())
    val searchResults: StateFlow<List<SearchResultDto>> = _searchResults.asStateFlow()

    private val _recentSearches = MutableStateFlow<List<String>>(emptyList())
    val recentSearches: StateFlow<List<String>> = _recentSearches.asStateFlow()

    private val _popularCuisines = MutableStateFlow<List<CuisineItem>>(emptyList())
    val popularCuisines: StateFlow<List<CuisineItem>> = _popularCuisines.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _sortOption = MutableStateFlow(SortOption.RECOMMENDED)
    val sortOption: StateFlow<SortOption> = _sortOption.asStateFlow()

    private val _selectedCuisine = MutableStateFlow<String?>(null)
    val selectedCuisine: StateFlow<String?> = _selectedCuisine.asStateFlow()

    init {
        observeSearchQuery()
        fetchRecentSearches()
        loadPopularCuisines()
    }

    @OptIn(FlowPreview::class)
    private fun observeSearchQuery() {
        viewModelScope.launch {
            _searchQuery
                .debounce(300L)
                .distinctUntilChanged()
                .onEach { query ->
                    if (query.isNotBlank()) {
                        _isLoading.value = true
                        val results = restaurantRepo.getSearchResults(query).firstOrNull() ?: emptyList()
                        _searchResults.value = sortResults(results)
                        _isLoading.value = false
                    } else {
                        _searchResults.value = emptyList()
                    }
                }
                .launchIn(viewModelScope)
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun searchByTerm(item: String) {
        _searchQuery.value = item
        addToRecentSearches(item)
    }

    fun setSortOption(option: SortOption) {
        _sortOption.value = option
        // Re-sort current results
        _searchResults.value = sortResults(_searchResults.value)
    }

    fun setSelectedCuisine(cuisine: String?) {
        _selectedCuisine.value = cuisine
        if (cuisine != null) {
            _searchQuery.value = cuisine
            addToRecentSearches(cuisine)
        }
    }

    fun clearSearch() {
        _searchQuery.value = ""
        _searchResults.value = emptyList()
        _selectedCuisine.value = null
    }

    fun clearRecentSearches() {
        _recentSearches.value = emptyList()
        // TODO: Also clear from local storage
    }

    private fun addToRecentSearches(term: String) {
        val current = _recentSearches.value.toMutableList()
        current.removeAll { it.equals(term, ignoreCase = true) }
        current.add(0, term)
        // Keep only last 10
        _recentSearches.value = current.take(10)
    }

    private fun sortResults(results: List<SearchResultDto>): List<SearchResultDto> {
        return when (_sortOption.value) {
            SortOption.RECOMMENDED -> results // Default order from API
            SortOption.TOP_RATED -> results.sortedByDescending { it.rating }
            SortOption.FASTEST -> results.sortedBy {
                // Parse delivery time like "25-35 min" to get first number
                it.deliveryTime?.split("-")?.firstOrNull()?.filter { c -> c.isDigit() }?.toIntOrNull() ?: 999
            }
            SortOption.NEAREST -> results.sortedBy {
                it.distance ?: Double.MAX_VALUE
            }
        }
    }

    private fun fetchRecentSearches() {
        viewModelScope.launch {
            _recentSearches.value = restaurantRepo.getRecentSearches().firstOrNull() ?: emptyList()
        }
    }

    private fun loadPopularCuisines() {
        // No hardcoded data - fetch from API when endpoint exists
        _popularCuisines.value = emptyList()
    }

    override fun onCleared() {
        super.onCleared()
    }
}

/**
 * Cuisine item with name and emoji icon
 */
data class CuisineItem(
    val name: String,
    val emoji: String
)
