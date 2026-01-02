package com.eatfair.app.ui.address

import android.app.Application
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repo.AddressRepo
import com.eatfair.shared.model.address.AddressDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AutocompleteResult(
    val placeId: String,
    val primaryText: String,
    val secondaryText: String
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    application: Application,
    private val addressRepo: AddressRepo
) : ViewModel() {

    companion object {
        private const val TAG = "LocationViewModel"
    }

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _searchResults = MutableStateFlow<List<AutocompleteResult>>(emptyList())
    val searchResults = _searchResults.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    val allAddresses: StateFlow<List<AddressDto>> = addressRepo.getAddresses()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    init {
        // Fetch addresses from API on init
        fetchAddresses()
    }

    /**
     * Fetch addresses from API and sync to local cache
     */
    fun fetchAddresses() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            addressRepo.fetchAddressesFromApi().fold(
                onSuccess = { addresses ->
                    Log.d(TAG, "Fetched ${addresses.size} addresses")
                },
                onFailure = { e ->
                    Log.e(TAG, "Failed to fetch addresses: ${e.message}")
                    _error.value = e.message
                }
            )

            _isLoading.value = false
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun clearSearch() {
        _searchQuery.value = ""
        _searchResults.value = emptyList()
    }

    fun clearError() {
        _error.value = null
    }

    /**
     * Save address - creates new or updates existing via API
     */
    fun saveAddress(addressDto: AddressDto) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            // Check if this is a new address (no API ID) or existing
            val result = if (addressDto.apiId == null) {
                Log.d(TAG, "Creating new address")
                addressRepo.insertAddress(addressDto)
            } else {
                Log.d(TAG, "Updating address: ${addressDto.apiId}")
                addressRepo.updateAddress(addressDto)
            }

            result.fold(
                onSuccess = { savedAddress ->
                    Log.d(TAG, "Address saved successfully: ${savedAddress.id}")
                },
                onFailure = { e ->
                    Log.e(TAG, "Failed to save address: ${e.message}")
                    _error.value = e.message
                }
            )

            _isLoading.value = false
        }
    }

    fun getAddressById(id: String): AddressDto? {
        return allAddresses.value.find { it.id == id }
    }

    /**
     * Delete address via API
     */
    fun deleteAddress(addressDto: AddressDto) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            addressRepo.deleteAddress(addressDto).fold(
                onSuccess = {
                    Log.d(TAG, "Address deleted successfully")
                },
                onFailure = { e ->
                    Log.e(TAG, "Failed to delete address: ${e.message}")
                    _error.value = e.message
                }
            )

            _isLoading.value = false
        }
    }

    /**
     * Set address as default
     */
    fun setDefaultAddress(addressDto: AddressDto) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            addressRepo.setDefaultAddress(addressDto).fold(
                onSuccess = {
                    Log.d(TAG, "Default address set successfully")
                },
                onFailure = { e ->
                    Log.e(TAG, "Failed to set default address: ${e.message}")
                    _error.value = e.message
                }
            )

            _isLoading.value = false
        }
    }

    override fun onCleared() {
        super.onCleared()
        // All jobs are automatically cancelled by viewModelScope
    }
}
