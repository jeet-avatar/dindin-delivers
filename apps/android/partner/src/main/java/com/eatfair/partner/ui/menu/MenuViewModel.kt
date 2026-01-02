package com.eatfair.partner.ui.menu

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.CreateMenuItemRequest
import com.eatfair.shared.model.UpdateMenuItemRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MenuItemData(
    val id: Int,
    val name: String,
    val description: String,
    val price: Double,
    val category: String,
    val imageUrl: String? = null,
    val isAvailable: Boolean = true,
    val isPopular: Boolean = false,
    val prepTime: Int = 15
)

data class MenuUiState(
    val menuItems: List<MenuItemData> = emptyList(),
    val categories: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class MenuViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "MenuViewModel"
    }

    private val _uiState = MutableStateFlow(MenuUiState())
    val uiState: StateFlow<MenuUiState> = _uiState.asStateFlow()

    // Track active jobs for proper cleanup
    private var loadMenuJob: Job? = null

    private val vendorId: Int
        get() = secureStorage.vendorId

    init {
        loadMenuItems()
    }

    private fun loadMenuItems() {
        loadMenuJob?.cancel() // Cancel any existing job
        loadMenuJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Get menu items
                val menuResult = dollorRepository.getVendorMenu(vendorId)

                menuResult.fold(
                    onSuccess = { items ->
                        val menuItems = items.map { item ->
                            MenuItemData(
                                id = item.id,
                                name = item.name,
                                description = item.description ?: "",
                                price = item.price.toDouble(),
                                category = item.category ?: "Other",
                                imageUrl = item.imageUrl,
                                isAvailable = item.isAvailable
                            )
                        }

                        // Extract unique categories
                        val categories = menuItems.map { it.category }.distinct().sorted()

                        _uiState.update {
                            it.copy(
                                menuItems = menuItems,
                                categories = categories,
                                isLoading = false,
                                error = null
                            )
                        }
                        Log.d(TAG, "Loaded ${menuItems.size} menu items")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to load menu: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Failed to load menu: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading menu: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Error loading menu: ${e.message}"
                    )
                }
            }
        }
    }

    fun addMenuItem(name: String, description: String, price: Double, category: String) {
        viewModelScope.launch {
            try {
                _uiState.update { it.copy(isLoading = true, error = null) }

                val request = CreateMenuItemRequest(
                    name = name,
                    description = description,
                    price = price,
                    category = category
                )

                dollorRepository.addMenuItem(vendorId, request).fold(
                    onSuccess = { newItem ->
                        Log.d(TAG, "Menu item added: ${newItem.id}")

                        val menuItemData = MenuItemData(
                            id = newItem.id,
                            name = newItem.name,
                            description = newItem.description ?: "",
                            price = newItem.price.toDouble(),
                            category = newItem.category ?: category,
                            imageUrl = newItem.imageUrl,
                            isAvailable = newItem.isAvailable
                        )

                        _uiState.update { state ->
                            val updatedCategories = if (category !in state.categories) {
                                (state.categories + category).sorted()
                            } else state.categories

                            state.copy(
                                menuItems = state.menuItems + menuItemData,
                                categories = updatedCategories,
                                isLoading = false,
                                successMessage = "Menu item added successfully"
                            )
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to add menu item: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Failed to add item: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception adding menu item: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to add item: ${e.message ?: "Unknown error"}"
                    )
                }
            }
        }
    }

    fun updateMenuItem(id: Int, name: String, description: String, price: Double, category: String) {
        viewModelScope.launch {
            try {
                _uiState.update { it.copy(isLoading = true, error = null) }

                val request = UpdateMenuItemRequest(
                    name = name,
                    description = description,
                    price = price,
                    category = category
                )

                dollorRepository.updateMenuItem(vendorId, id, request).fold(
                    onSuccess = { updatedItem ->
                        Log.d(TAG, "Menu item updated: $id")

                        _uiState.update { state ->
                            state.copy(
                                menuItems = state.menuItems.map { item ->
                                    if (item.id == id) {
                                        item.copy(
                                            name = updatedItem.name,
                                            description = updatedItem.description ?: "",
                                            price = updatedItem.price.toDouble(),
                                            category = updatedItem.category ?: category
                                        )
                                    } else item
                                },
                                isLoading = false,
                                successMessage = "Menu item updated successfully"
                            )
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to update menu item: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Failed to update item: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception updating menu item: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to update item: ${e.message ?: "Unknown error"}"
                    )
                }
            }
        }
    }

    fun deleteItem(id: Int) {
        viewModelScope.launch {
            try {
                _uiState.update { it.copy(isLoading = true, error = null) }

                dollorRepository.deleteMenuItem(vendorId, id).fold(
                    onSuccess = {
                        Log.d(TAG, "Menu item deleted: $id")

                        _uiState.update { state ->
                            state.copy(
                                menuItems = state.menuItems.filter { it.id != id },
                                isLoading = false,
                                successMessage = "Menu item deleted successfully"
                            )
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to delete menu item: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Failed to delete item: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception deleting menu item: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to delete item: ${e.message ?: "Unknown error"}"
                    )
                }
            }
        }
    }

    fun toggleAvailability(id: Int) {
        viewModelScope.launch {
            try {
                val currentItem = _uiState.value.menuItems.find { it.id == id } ?: return@launch
                val newAvailability = !currentItem.isAvailable

                // Optimistic update
                _uiState.update { state ->
                    state.copy(
                        menuItems = state.menuItems.map { item ->
                            if (item.id == id) item.copy(isAvailable = newAvailability) else item
                        }
                    )
                }

                // API call using PATCH
                val updates = mapOf("is_available" to newAvailability)

                dollorRepository.patchMenuItem(vendorId, id, updates).fold(
                    onSuccess = {
                        Log.d(TAG, "Availability updated for item $id: $newAvailability")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to update availability: ${error.message}")
                        // Revert on failure
                        _uiState.update { state ->
                            state.copy(
                                menuItems = state.menuItems.map { item ->
                                    if (item.id == id) item.copy(isAvailable = !newAvailability) else item
                                },
                                error = "Failed to update availability: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception toggling availability: ${e.message}")
                _uiState.update {
                    it.copy(error = "Failed to update availability: ${e.message ?: "Unknown error"}")
                }
            }
        }
    }

    fun refreshMenu() {
        loadMenuItems()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    override fun onCleared() {
        super.onCleared()
        // Cancel all active jobs to prevent memory leaks
        loadMenuJob?.cancel()
        loadMenuJob = null
        Log.d(TAG, "MenuViewModel cleared")
    }
}
