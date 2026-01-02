package com.eatfair.app.ui.home

import android.net.Uri
import android.util.Log
import androidx.core.net.toUri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.local.SessionManager
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.data.repo.AddressRepo
import com.eatfair.shared.data.repo.RestaurantRepo
import com.eatfair.shared.model.address.AddressDto
import com.eatfair.shared.model.home.DealType
import com.eatfair.shared.model.home.FeaturedDeal
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.app.ui.home.components.SortOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject

/**
 * HomeViewModel - Matches iOS HomeViewModel exactly
 * Uses real API data only - no hardcoded data
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val sessionManager: SessionManager,
    private val secureStorage: SecureStorage,
    private val addressRepo: AddressRepo,
    private val restaurantRepo: RestaurantRepo,
    private val dollorApiService: DollorApiService
) : ViewModel() {

    companion object {
        private const val TAG = "HomeViewModel"

        // Cuisine to emoji map - matches iOS HomeViewModel.swift
        private val CUISINE_EMOJI_MAP = mapOf(
            "Indian" to "🍛",
            "Italian" to "🍕",
            "Chinese" to "🥡",
            "Japanese" to "🍣",
            "Mexican" to "🌮",
            "Thai" to "🍜",
            "American" to "🍔",
            "Mediterranean" to "🥗",
            "Korean" to "🍲",
            "Vietnamese" to "🍜",
            "French" to "🥐",
            "Greek" to "🥙",
            "Spanish" to "🥘",
            "Middle Eastern" to "🧆",
            "Caribbean" to "🥥",
            "Ethiopian" to "🍲",
            "Pizza" to "🍕",
            "Burgers" to "🍔",
            "Sushi" to "🍣",
            "Healthy" to "🥗",
            "Cafe" to "☕",
            "Dessert" to "🍰",
            "Bakery" to "🥖",
            "Fast Food" to "🍟",
            "Seafood" to "🦐",
            "BBQ" to "🍖",
            "Vegan" to "🥬",
            "Vegetarian" to "🥕"
        )
    }

    private val _profileImageUri = MutableStateFlow<Uri?>(null)
    val profileImageUri = _profileImageUri.asStateFlow()

    private val _restaurants = MutableStateFlow<List<Restaurant>>(emptyList())
    val restaurants: StateFlow<List<Restaurant>> = _restaurants.asStateFlow()

    private val _defaultAddress = MutableStateFlow<AddressDto?>(null)
    val defaultAddress = _defaultAddress.asStateFlow()

    // Featured Deals - fetched from real API
    private val _featuredDeals = MutableStateFlow<List<FeaturedDeal>>(emptyList())
    val featuredDeals: StateFlow<List<FeaturedDeal>> = _featuredDeals.asStateFlow()

    // Featured Restaurants (top rated) - derived from restaurants like iOS
    private val _featuredRestaurants = MutableStateFlow<List<Restaurant>>(emptyList())
    val featuredRestaurants: StateFlow<List<Restaurant>> = _featuredRestaurants.asStateFlow()

    // Available cuisines - derived from restaurant data like iOS
    private val _availableCuisines = MutableStateFlow<List<CuisineCategory>>(emptyList())
    val availableCuisines: StateFlow<List<CuisineCategory>> = _availableCuisines.asStateFlow()

    // Sort option - matches iOS
    private val _sortOption = MutableStateFlow(SortOption.RECOMMENDED)
    val sortOption: StateFlow<SortOption> = _sortOption.asStateFlow()

    // Selected category for filtering
    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    // Loading state
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    // Error message
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Active order tracking - matches iOS
    private val _hasActiveOrder = MutableStateFlow(false)
    val hasActiveOrder: StateFlow<Boolean> = _hasActiveOrder.asStateFlow()

    private val _activeOrderEta = MutableStateFlow("20-30")
    val activeOrderEta: StateFlow<String> = _activeOrderEta.asStateFlow()

    init {
        checkProfileImage()
        fetchRestaurants()
        fetchFeaturedDeals()
        checkActiveOrders()

        viewModelScope.launch {
            fetchDefaultAddress()
        }
    }

    // Set sort option - matches iOS
    fun setSortOption(option: SortOption) {
        _sortOption.value = option
    }

    // Set selected category - matches iOS
    fun setSelectedCategory(category: String?) {
        _selectedCategory.value = if (_selectedCategory.value == category) null else category
    }

    // Get filtered restaurants - matches iOS filteredRestaurants
    fun getFilteredRestaurants(): List<Restaurant> {
        var result = _restaurants.value

        // Apply category filter
        val category = _selectedCategory.value
        if (category != null) {
            result = result.filter {
                it.cuisineType.contains(category, ignoreCase = true)
            }
        }

        // Apply sorting
        result = when (_sortOption.value) {
            SortOption.RECOMMENDED -> result.sortedByDescending { it.rating }
            SortOption.TOP_RATED -> result.sortedByDescending { it.rating }
            SortOption.FASTEST -> result.sortedBy {
                it.deliveryTime.replace(Regex("[^0-9]"), "").toIntOrNull() ?: 999
            }
            SortOption.NEAREST -> result // Would need user location
        }

        return result
    }

    /**
     * Fetch restaurants from real API
     * Updates featuredRestaurants and availableCuisines
     */
    fun fetchRestaurants() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val restaurantList = restaurantRepo.getRestaurants().firstOrNull() ?: emptyList()
                _restaurants.value = restaurantList

                // Update featured restaurants (top 5 by rating) - matches iOS
                _featuredRestaurants.value = restaurantList
                    .sortedByDescending { it.rating }
                    .take(5)

                // Update available cuisines from restaurant data - matches iOS
                updateAvailableCuisines(restaurantList)

                Log.d(TAG, "Fetched ${restaurantList.size} restaurants from API")
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching restaurants", e)
                _errorMessage.value = "Network error: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Derive available cuisines from restaurant data - matches iOS availableCuisines
     */
    private fun updateAvailableCuisines(restaurants: List<Restaurant>) {
        val cuisineSet = mutableSetOf<String>()

        restaurants.forEach { restaurant ->
            if (restaurant.cuisineType.isNotEmpty()) {
                cuisineSet.add(restaurant.cuisineType)
            }
        }

        _availableCuisines.value = cuisineSet.sorted().map { cuisine ->
            val emoji = CUISINE_EMOJI_MAP[cuisine] ?: "🍽️"
            CuisineCategory(emoji = emoji, name = cuisine)
        }
    }

    /**
     * Fetch featured deals from real API
     */
    private fun fetchFeaturedDeals() {
        viewModelScope.launch {
            try {
                val response = dollorApiService.getFeaturedDeals()
                val deals = response.deals.map { apiDeal ->
                    FeaturedDeal(
                        id = apiDeal.id.toString(),
                        headline = apiDeal.title,
                        vendorName = apiDeal.restaurantName ?: "",
                        vendorId = apiDeal.restaurantId ?: 0,
                        description = apiDeal.description ?: "",
                        promoCode = apiDeal.discountText,
                        dealType = parseDealType(apiDeal.discountText),
                        discountValue = parseDiscountValue(apiDeal.discountText),
                        minOrder = null,
                        expiresAt = apiDeal.validUntil
                    )
                }
                _featuredDeals.value = deals
                Log.d(TAG, "Fetched ${deals.size} featured deals from API")
            } catch (e: HttpException) {
                Log.e(TAG, "HTTP error fetching featured deals: ${e.code()}", e)
                _featuredDeals.value = emptyList()
            } catch (e: IOException) {
                Log.e(TAG, "Network error fetching featured deals", e)
                _featuredDeals.value = emptyList()
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error fetching featured deals", e)
                _featuredDeals.value = emptyList()
            }
        }
    }

    /**
     * Check for active orders - matches iOS checkActiveOrders
     * Uses SecureStorage for customer auth data
     */
    fun checkActiveOrders() {
        viewModelScope.launch {
            try {
                val customerId = secureStorage.customerId
                val token = secureStorage.customerToken

                if (customerId == -1 || token == null) {
                    _hasActiveOrder.value = false
                    return@launch
                }

                val response = dollorApiService.getActiveOrders(customerId, "Bearer $token")
                val activeOrders = response.activeOrders.filter { order ->
                    order.status in listOf("placed", "confirmed", "preparing", "ready", "picked_up", "on_the_way")
                }

                _hasActiveOrder.value = activeOrders.isNotEmpty()

                if (activeOrders.isNotEmpty()) {
                    // Calculate ETA from first active order
                    // Note: Order model doesn't have estimatedDeliveryTime, use default
                    _activeOrderEta.value = "20-30"
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking active orders", e)
                _hasActiveOrder.value = false
            }
        }
    }

    private fun parseDealType(discountText: String): DealType {
        return when {
            discountText.contains("%", ignoreCase = true) -> DealType.PERCENTAGE
            discountText.contains("free", ignoreCase = true) &&
                discountText.contains("delivery", ignoreCase = true) -> DealType.FREE_DELIVERY
            discountText.contains("bogo", ignoreCase = true) ||
                discountText.contains("buy 1 get 1", ignoreCase = true) -> DealType.BOGO
            discountText.contains("$") -> DealType.FLAT_AMOUNT
            else -> DealType.PERCENTAGE
        }
    }

    private fun parseDiscountValue(discountText: String): Double? {
        val numberRegex = Regex("[0-9]+\\.?[0-9]*")
        val match = numberRegex.find(discountText)
        return match?.value?.toDoubleOrNull()
    }

    suspend fun fetchDefaultAddress() {
        val defaultAddress = addressRepo.getDefaultAddress()
        _defaultAddress.value = defaultAddress
    }

    private fun checkProfileImage() {
        sessionManager.profileImageUriFlow
            .onEach { uriString ->
                _profileImageUri.value = uriString?.toUri()
            }
            .launchIn(viewModelScope)
    }

    override fun onCleared() {
        super.onCleared()
    }
}

/**
 * Cuisine category with emoji - matches iOS availableCuisines tuple
 */
data class CuisineCategory(
    val emoji: String,
    val name: String
)
