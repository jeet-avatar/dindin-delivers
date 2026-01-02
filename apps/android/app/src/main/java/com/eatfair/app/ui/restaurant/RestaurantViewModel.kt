package com.eatfair.app.ui.restaurant

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repo.AddressRepo
import com.eatfair.shared.data.repo.RestaurantRepo
import com.eatfair.shared.model.address.AddressDto
import com.eatfair.shared.model.restaurant.MenuItem
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.app.ui.cart.CartViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RestaurantViewModel @Inject constructor(
    private val restaurantRepo: RestaurantRepo,
    private val savedStateHandle: SavedStateHandle,
    private val addressRepo: AddressRepo
) : ViewModel() {

    private val _restaurants = MutableStateFlow<List<Restaurant>>(emptyList())
    val restaurants: StateFlow<List<Restaurant>> = _restaurants.asStateFlow()

    private val _menuItems = MutableStateFlow<List<MenuItem>>(emptyList())
    val menuItems: StateFlow<List<MenuItem>> = _menuItems.asStateFlow()

    // Holds the single restaurant that the user selects
    private val _selectedRestaurant = MutableStateFlow<Restaurant?>(null)
    val selectedRestaurant: StateFlow<Restaurant?> = _selectedRestaurant.asStateFlow()

    private val _deliveryAddress = MutableStateFlow<AddressDto?>(null)
    val deliveryAddress = _deliveryAddress.asStateFlow()

    private val _showReplaceCartDialog = MutableStateFlow<MenuItem?>(null)
    val showReplaceCartDialog = _showReplaceCartDialog.asStateFlow()

    init {

        savedStateHandle.get<String>("restaurantId")?.toIntOrNull()?.let { id ->
            loadRestaurantData(id)
        }

        fetchRestaurants()

        fetchDefaultAddress()
    }

    private fun loadRestaurantData(id: Int) {
        viewModelScope.launch {
            // Use the repository to get data
            _selectedRestaurant.value = restaurantRepo.getRestaurantById(id)

            _menuItems.value = restaurantRepo.getMenuItemsForRestaurant(id)
        }
    }

    fun fetchRestaurants() {
        viewModelScope.launch {
            _restaurants.value = restaurantRepo.getRestaurants().firstOrNull() ?: emptyList()
        }
    }

    fun selectRestaurant(restaurant: Restaurant) {
        _selectedRestaurant.value = restaurant
    }

    fun fetchDefaultAddress() {
        viewModelScope.launch {
            val defaultAddress = addressRepo.getDefaultAddress()
            _deliveryAddress.value = defaultAddress
        }
    }

    fun updateDeliveryAddress(addressDto: AddressDto) {
        _deliveryAddress.value = addressDto
    }

    fun handleAddItem(
        itemToAdd: MenuItem, cartViewModel: CartViewModel
    ) {
        val currentCartRestaurant = cartViewModel.cartRestaurant.value
        val currentRestaurant = _selectedRestaurant.value

        if (currentRestaurant == null) return

        if (currentCartRestaurant == null || currentCartRestaurant.id == currentRestaurant.id) {
            val existingItem = cartViewModel.cartItems.value.find { it.menuItem.id == itemToAdd.id }
            val newQuantity = (existingItem?.quantity ?: 0) + 1

            cartViewModel.updateRestaurant(currentRestaurant)
            cartViewModel.updateItemQuantity(itemToAdd, newQuantity)
        }
        else {
            _showReplaceCartDialog.value = itemToAdd
        }
    }

    fun replaceCartAndAddItem(
        itemToAdd: MenuItem, cartViewModel: CartViewModel
    ) {
        val currentRestaurant = _selectedRestaurant.value
        if (currentRestaurant == null) return

        cartViewModel.clearCart()

        viewModelScope.launch {
            delay(50)
            cartViewModel.updateRestaurant(currentRestaurant)
            cartViewModel.updateItemQuantity(itemToAdd, 1)
        }
    }

    fun dismissReplaceCartDialog() {
        _showReplaceCartDialog.value = null
    }

    override fun onCleared() {
        super.onCleared()
        // All jobs are automatically cancelled by viewModelScope
    }
}