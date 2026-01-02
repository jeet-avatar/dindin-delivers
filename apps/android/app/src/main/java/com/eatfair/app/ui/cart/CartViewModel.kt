package com.eatfair.app.ui.cart

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repo.AddressRepo
import com.eatfair.app.data.repo.PaymentRepo
import com.eatfair.shared.data.local.SessionManager
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.address.AddressDto
import com.eatfair.shared.model.order.OrderTracking
import com.eatfair.shared.model.payment.PaymentSheetKeys
import com.eatfair.shared.model.restaurant.CartItem
import com.eatfair.shared.model.restaurant.MenuItem
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.shared.model.CreateOrderRequest
import com.eatfair.shared.model.DeliveryAddressDict
import com.eatfair.shared.model.OrderItemRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject

@HiltViewModel
class CartViewModel @Inject constructor(
    private val addressRepo: AddressRepo,
    private val paymentRepo: PaymentRepo,
    private val sessionManager: SessionManager,
    private val dollorRepository: DollorRepository  // API-only - no Firestore
) : ViewModel() {

    // Fix: Add mutex for thread-safe cart operations
    private val cartMutex = Mutex()

    private val _cartItems = MutableStateFlow<List<CartItem>>(emptyList())
    val cartItems: StateFlow<List<CartItem>> = _cartItems.asStateFlow()

    private val _cartRestaurant = MutableStateFlow<Restaurant?>(null)
    val cartRestaurant: StateFlow<Restaurant?> = _cartRestaurant.asStateFlow()

    private val _deliveryAddress = MutableStateFlow<AddressDto?>(null)
    val deliveryAddress = _deliveryAddress.asStateFlow()

    private val _paymentSheetEvent = MutableSharedFlow<PaymentSheetKeys>()
    val paymentSheetEvent = _paymentSheetEvent.asSharedFlow()

    private val _paymentErrorEvent = MutableSharedFlow<String>()
    val paymentErrorEvent = _paymentErrorEvent.asSharedFlow()

    private val _activeOrder = MutableStateFlow<OrderTracking?>(null)
    val activeOrder: StateFlow<OrderTracking?> = _activeOrder.asStateFlow()

//    private val _showOrderSuccessSheet = MutableStateFlow(false)
//    val showOrderSuccessSheet: StateFlow<Boolean> = _showOrderSuccessSheet.asStateFlow()

    init {
        fetchDefaultAddress()
    }

    fun updateRestaurant(restaurant: Restaurant) {
        _cartRestaurant.value = restaurant
    }

    fun updateItemQuantity(menuItem: MenuItem, newQuantity: Int) {
        // Fix: Add thread synchronization for cart modifications
        viewModelScope.launch {
            cartMutex.withLock {
                val currentList = _cartItems.value.toMutableList()
                val existingItem = currentList.find { it.menuItem.id == menuItem.id }

                if (newQuantity > 0) {
                    if (existingItem != null) {
                        val itemIdx = currentList.indexOf(existingItem)
                        // Fix: Check if index is valid before accessing array
                        if (itemIdx >= 0) {
                            currentList[itemIdx] = existingItem.copy(quantity = newQuantity)
                        }
                    } else {
                        currentList.add(CartItem(menuItem, newQuantity, ""))
                    }
                } else {
                    if (existingItem != null) {
                        currentList.remove(existingItem)
                    }
                }

                _cartItems.value = currentList

                // If the cart is now empty, clear the restaurant as well.
                if (currentList.isEmpty()) {
                    _cartRestaurant.value = null
                }
            }
        }
    }

    fun updateItemQuantity(cartItem: CartItem, newQuantity: Int) {
        // Fix: Add thread synchronization for cart modifications
        viewModelScope.launch {
            cartMutex.withLock {
                val currentList = _cartItems.value.toMutableList()
                val existingItem = cartItem

                if (newQuantity > 0) {
                    val itemIdx = currentList.indexOf(existingItem)
                    // Fix: Check if index is valid before accessing array
                    if (itemIdx >= 0) {
                        currentList[itemIdx] = existingItem.copy(quantity = newQuantity)
                    }
                } else {
                    currentList.remove(existingItem)
                }
                _cartItems.value = currentList
            }
        }
    }


    fun removeFromCart(item: CartItem) {
        // Logic to remove an item from _cartItems.value
        _cartItems.value = _cartItems.value - item
    }

    fun clearCart() {
        // Logic to clear the cart
        _cartItems.value = emptyList()
        _cartRestaurant.value = null
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

    // This function will be called from the UI
    fun onPlaceOrderClicked(totalAmount: Double) {
        viewModelScope.launch {
            // Use the repository to get the keys
            val result = paymentRepo.getPaymentSheetKeys(totalAmount)

            result.onSuccess { keys ->
                // Emit the keys as a one-time event to the UI
                _paymentSheetEvent.emit(keys)
            }.onFailure { error ->
                // Emit an error event
                _paymentErrorEvent.emit(error.message ?: "An unknown error occurred")
            }
        }
    }

    /**
     * Create order via API only - Single source of truth (PostgreSQL backend)
     *
     * FLOW:
     * 1. Call POST /api/orders/create to create order in backend
     * 2. Backend returns orderId and pricing
     * 3. Update local state
     * 4. Clear cart
     *
     * NO FIRESTORE - All data flows through P2P backend API
     */
    fun onOrderPlacedSuccessfully(order: OrderTracking, paymentIntentId: String? = null) {
        viewModelScope.launch {
            try {
                // Get customer info from session (matching iOS/Webapp flow)
                val customerName = sessionManager.getUserName() ?: "Customer"
                val customerEmail = sessionManager.getUserEmail() ?: ""
                val customerPhone = "" // Phone not stored in session, backend accepts empty

                // Validate customer info before proceeding
                if (customerEmail.isBlank()) {
                    android.util.Log.e("CartViewModel", "Invalid customer email")
                    _paymentErrorEvent.emit("Unable to place order: Invalid customer session")
                    return@launch
                }

                val restaurant = _cartRestaurant.value
                val items = _cartItems.value
                val address = order.deliveryLocation

                // Build delivery address dict matching iOS/Webapp format
                val deliveryAddressDict = DeliveryAddressDict(
                    street = address?.street ?: "",
                    city = address?.city ?: "",
                    state = address?.state ?: "",
                    zip = address?.zipCode ?: ""
                )

                // Create order via API (single source of truth)
                // Matches iOS CartViewModel.swift and Webapp Checkout.tsx
                val orderRequest = CreateOrderRequest(
                    customerName = customerName,
                    customerEmail = customerEmail,
                    customerPhone = customerPhone,
                    vendorId = restaurant?.id ?: 0,
                    items = items.map { cartItem ->
                        OrderItemRequest(
                            menuItemId = cartItem.menuItem.id,
                            quantity = cartItem.quantity,
                            specialInstructions = null
                        )
                    },
                    deliveryAddress = deliveryAddressDict,
                    deliveryInstructions = order.deliveryInstructions,
                    tip = null
                )

                // Call API to create order in backend (PostgreSQL - source of truth)
                val result = dollorRepository.createOrder(orderRequest)
                result.fold(
                    onSuccess = { response ->
                        val orderId = response.orderId.toString()
                        android.util.Log.d("CartViewModel", "Order created successfully: $orderId")

                        // Update local state with API response
                        _activeOrder.value = order.copy(orderId = orderId)

                        // Clear cart after successful order
                        clearCart()
                    },
                    onFailure = { error ->
                        android.util.Log.e("CartViewModel", "Order creation failed: ${error.message}")
                        _paymentErrorEvent.emit("Failed to create order: ${error.message}")
                    }
                )

            } catch (e: Exception) {
                android.util.Log.e("CartViewModel", "Error creating order: ${e.message}", e)
                _paymentErrorEvent.emit("Failed to create order: ${e.message}")
            }
        }
    }

    fun dismissOrderSuccessSheet() {
//        _showOrderSuccessSheet.value = false
    }

    fun completeActiveOrder() {
        _activeOrder.value = null
    }

    override fun onCleared() {
        super.onCleared()
        // All jobs are automatically cancelled by viewModelScope
    }
}