package com.eatfair.shared.data.repo

import android.util.Log
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.model.home.CarouselItem
import com.eatfair.shared.model.home.Category
import com.eatfair.shared.model.restaurant.MenuItem
import com.eatfair.shared.model.restaurant.Restaurant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RestaurantRepo @Inject constructor(
    private val dollorApiService: DollorApiService
) {
    companion object {
        private const val TAG = "RestaurantRepo"
    }

    // No hardcoded data - all data comes from API

    /**
     * Fetch restaurants from real API
     * Returns empty list on error - no fake fallback data
     */
    fun getRestaurants(): Flow<List<Restaurant>> = flow {
        try {
            val response = dollorApiService.getRestaurants()
            // Convert API models to local models (response is wrapped in RestaurantsListResponse)
            val restaurants = response.restaurants.map { apiRestaurant ->
                Restaurant(
                    id = apiRestaurant.id,
                    name = apiRestaurant.name,
                    rating = apiRestaurant.rating.toFloat(),
                    reviews = "${apiRestaurant.reviewCount}+",
                    distance = "5 km",
                    deliveryTime = apiRestaurant.deliveryTime ?: "30 mins",
                    cuisineType = apiRestaurant.cuisineType ?: "American",
                    isPureVeg = apiRestaurant.cuisineType?.contains("Veg", ignoreCase = true) ?: false,
                    isOpen = apiRestaurant.isOpen,
                    tags = listOfNotNull(
                        if (apiRestaurant.rating >= 4.5) "Featured" else null,
                        apiRestaurant.cuisineType
                    ),
                    imageUrl = apiRestaurant.imageUrl ?: "",
                    address = apiRestaurant.address ?: "",
                    latitude = apiRestaurant.latitude ?: 0.0,
                    longitude = apiRestaurant.longitude ?: 0.0
                )
            }
            Log.d(TAG, "Fetched ${restaurants.size} restaurants from API")
            emit(restaurants)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching restaurants: ${e.code()}", e)
            emit(emptyList())
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching restaurants", e)
            emit(emptyList())
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error fetching restaurants", e)
            emit(emptyList())
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Fetch restaurant by ID from API
     * Returns null on error - no fake fallback data
     */
    suspend fun getRestaurantByIdFromApi(id: Int): Restaurant? {
        if (id <= 0) {
            Log.e(TAG, "Invalid restaurant ID: $id")
            return null
        }

        return try {
            val apiRestaurant = dollorApiService.getRestaurantById(id)
            Restaurant(
                id = apiRestaurant.id,
                name = apiRestaurant.name,
                rating = apiRestaurant.rating.toFloat(),
                reviews = "100+",
                distance = "5 km",
                deliveryTime = "30 mins",
                cuisineType = apiRestaurant.cuisineType ?: "American",
                isPureVeg = apiRestaurant.cuisineType?.contains("Veg", ignoreCase = true) ?: false,
                isOpen = apiRestaurant.isOpen,
                tags = listOfNotNull(
                    if (apiRestaurant.rating >= 4.5) "Featured" else null,
                    apiRestaurant.cuisineType
                ),
                imageUrl = apiRestaurant.imageUrl ?: "",
                address = apiRestaurant.address ?: "",
                latitude = apiRestaurant.latitude ?: 0.0,
                longitude = apiRestaurant.longitude ?: 0.0
            )
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching restaurant $id: ${e.code()}", e)
            null
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching restaurant $id", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error fetching restaurant $id", e)
            null
        }
    }

    /**
     * Fetch menu items for a restaurant from API
     * Returns empty list on error - no fake fallback data
     */
    suspend fun getMenuItemsForRestaurantFromApi(restaurantId: Int): List<MenuItem> {
        if (restaurantId <= 0) {
            Log.e(TAG, "Invalid restaurant ID: $restaurantId")
            return emptyList()
        }

        return try {
            val apiMenu = dollorApiService.getVendorMenu(restaurantId)
            apiMenu.map { item ->
                MenuItem(
                    id = item.id,
                    name = item.name,
                    price = item.price.toFloat(),
                    description = item.description ?: "",
                    isVeg = item.isVegetarian,
                    isHighlyOrdered = false,
                    isCustomizable = false,
                    isAvailable = item.isAvailable,
                    categoryId = 0,
                    imageUrl = item.imageUrl ?: "",
                    restaurantId = restaurantId
                )
            }
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching menu for restaurant $restaurantId: ${e.code()}", e)
            emptyList()
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching menu for restaurant $restaurantId", e)
            emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error fetching menu for restaurant $restaurantId", e)
            emptyList()
        }
    }

    /**
     * Get categories from API
     * TODO: Add API endpoint for categories when available
     */
    fun getCategories(): Flow<List<Category>> = flow {
        emit(emptyList()) // No hardcoded data - fetch from API when endpoint exists
    }

    /**
     * Get carousel/banner items from API
     * TODO: Add API endpoint for banners when available
     */
    fun getCarouselItems(): Flow<List<CarouselItem>> = flow {
        emit(emptyList()) // No hardcoded data - fetch from API when endpoint exists
    }

    /**
     * Get recent searches - should be stored locally per user
     * TODO: Implement local storage for user search history
     */
    fun getRecentSearches(): Flow<List<String>> = flow {
        emit(emptyList()) // No hardcoded data
    }

    /**
     * Get popular cuisines from API
     * TODO: Add API endpoint for popular cuisines when available
     */
    fun getPopularCuisines(): Flow<List<String>> = flow {
        emit(emptyList()) // No hardcoded data - fetch from API when endpoint exists
    }

    /**
     * Get restaurant by ID (synchronous wrapper for backward compatibility)
     * Calls API via suspend function
     */
    suspend fun getRestaurantById(id: Int): Restaurant? {
        return getRestaurantByIdFromApi(id)
    }

    /**
     * Get menu items for restaurant (synchronous wrapper for backward compatibility)
     * Calls API via suspend function
     */
    suspend fun getMenuItemsForRestaurant(restaurantId: Int): List<MenuItem> {
        return getMenuItemsForRestaurantFromApi(restaurantId)
    }

    /**
     * Search restaurants by query
     * Searches from real API data
     */
    fun getSearchResults(query: String): Flow<List<com.eatfair.shared.model.search.SearchResultDto>> = flow {
        if (query.isBlank()) {
            emit(emptyList())
            return@flow
        }

        try {
            val response = dollorApiService.getRestaurants()
            val results = response.restaurants
                .filter { restaurant ->
                    restaurant.name.contains(query, ignoreCase = true) ||
                    (restaurant.cuisineType?.contains(query, ignoreCase = true) ?: false)
                }
                .map { restaurant ->
                    com.eatfair.shared.model.search.SearchResultDto(
                        id = restaurant.id,
                        name = restaurant.name,
                        category = restaurant.cuisineType ?: "Restaurant",
                        rating = restaurant.rating,
                        imageUrl = restaurant.imageUrl ?: ""
                    )
                }
            emit(results)
        } catch (e: Exception) {
            Log.e(TAG, "Error searching restaurants", e)
            emit(emptyList<com.eatfair.shared.model.search.SearchResultDto>())
        }
    }.flowOn(Dispatchers.IO)
}
