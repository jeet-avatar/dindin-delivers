package com.eatfair.app.ui.deals

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.model.FeaturedDeal
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for Deals screen - matches iOS DealsViewModel
 * Fetches deals from real API
 */
@HiltViewModel
class DealsViewModel @Inject constructor(
    private val apiService: DollorApiService
) : ViewModel() {

    companion object {
        private const val TAG = "DealsViewModel"
    }

    enum class DealFilter {
        ALL, PERCENTAGE, FLAT_AMOUNT, FREE_DELIVERY, BOGO
    }

    private val _deals = MutableStateFlow<List<FeaturedDeal>>(emptyList())
    val deals: StateFlow<List<FeaturedDeal>> = _deals.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _selectedFilter = MutableStateFlow(DealFilter.ALL)
    val selectedFilter: StateFlow<DealFilter> = _selectedFilter.asStateFlow()

    init {
        fetchDeals()
    }

    fun setFilter(filter: DealFilter) {
        _selectedFilter.value = filter
    }

    fun fetchDeals() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val response = apiService.getFeaturedDeals()
                _deals.value = response.deals
                Log.d(TAG, "Fetched ${response.deals.size} deals from API")
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching deals", e)
                _errorMessage.value = e.message
                // Use fallback sample data if API fails
                _deals.value = getSampleDeals()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun getFilteredDeals(): List<FeaturedDeal> {
        val allDeals = _deals.value
        return when (_selectedFilter.value) {
            DealFilter.ALL -> allDeals
            DealFilter.PERCENTAGE -> allDeals.filter {
                it.discountText.contains("%", ignoreCase = true)
            }
            DealFilter.FLAT_AMOUNT -> allDeals.filter {
                it.discountText.contains("$") && !it.discountText.contains("free", ignoreCase = true)
            }
            DealFilter.FREE_DELIVERY -> allDeals.filter {
                it.discountText.contains("free", ignoreCase = true) &&
                it.discountText.contains("delivery", ignoreCase = true)
            }
            DealFilter.BOGO -> allDeals.filter {
                it.discountText.contains("bogo", ignoreCase = true) ||
                it.discountText.contains("buy 1 get 1", ignoreCase = true)
            }
        }
    }

    fun getFeaturedDeals(): List<FeaturedDeal> {
        return _deals.value.take(5)
    }

    private fun getSampleDeals(): List<FeaturedDeal> {
        // Fallback sample data when API fails
        return listOf(
            FeaturedDeal(
                id = 1,
                title = "50% Off First Order",
                description = "Get 50% off on your first order. New users only!",
                discountText = "50% OFF",
                restaurantId = null,
                restaurantName = null,
                imageUrl = null,
                validUntil = null
            ),
            FeaturedDeal(
                id = 2,
                title = "Free Delivery",
                description = "Free delivery on orders above \$25",
                discountText = "FREE DELIVERY",
                restaurantId = null,
                restaurantName = null,
                imageUrl = null,
                validUntil = null
            ),
            FeaturedDeal(
                id = 3,
                title = "\$5 Off Any Order",
                description = "Flat \$5 discount on any order above \$20",
                discountText = "\$5 OFF",
                restaurantId = null,
                restaurantName = null,
                imageUrl = null,
                validUntil = null
            )
        )
    }
}
