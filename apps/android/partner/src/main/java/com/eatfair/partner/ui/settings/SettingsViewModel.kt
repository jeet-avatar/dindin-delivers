package com.eatfair.partner.ui.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Vendor Settings Data
 */
data class VendorSettingsData(
    val vendorId: Int = -1,
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val address: String = "",
    val cuisine: String = "",
    val isOnline: Boolean = true,
    val acceptingDelivery: Boolean = true,
    val acceptingPickup: Boolean = true,
    val prepTimeBuffer: Int = 15,
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val aiDemandPrediction: Boolean = true,
    val aiPrepTimeOptimization: Boolean = true,
    val aiMenuSuggestions: Boolean = true,
    val monthlyEarnings: Double = 0.0
)

data class SettingsUiState(
    val vendorData: VendorSettingsData = VendorSettingsData(),
    val isLoading: Boolean = false,
    val isSigningOut: Boolean = false,
    val isDeletingAccount: Boolean = false,
    val signOutSuccess: Boolean = false,
    val deleteSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "SettingsViewModel"
    }

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadVendorSettings()
    }

    private fun loadVendorSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                // Load vendor data from secure storage
                val vendorData = VendorSettingsData(
                    vendorId = secureStorage.vendorId,
                    name = secureStorage.vendorName ?: "My Restaurant",
                    email = secureStorage.vendorEmail ?: "",
                    phone = "(555) 123-4567",  // Would come from profile API
                    address = "123 Main Street, City",  // Would come from profile API
                    cuisine = "Indian Cuisine"  // Would come from profile API
                )

                _uiState.update {
                    it.copy(
                        vendorData = vendorData,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading vendor settings: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load settings"
                    )
                }
            }
        }
    }

    /**
     * Sign out the vendor - clears all auth data
     */
    fun signOut() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSigningOut = true) }

            try {
                // Clear vendor auth data
                dollorRepository.vendorLogout()
                Log.d(TAG, "Vendor signed out successfully")

                _uiState.update {
                    it.copy(
                        isSigningOut = false,
                        signOutSuccess = true
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error signing out: ${e.message}")
                _uiState.update {
                    it.copy(
                        isSigningOut = false,
                        error = "Failed to sign out: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Delete vendor account - calls backend API
     */
    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.update { it.copy(isDeletingAccount = true) }

            try {
                val result = dollorRepository.deleteVendorAccount()

                result.fold(
                    onSuccess = {
                        Log.d(TAG, "Vendor account deleted successfully")
                        _uiState.update {
                            it.copy(
                                isDeletingAccount = false,
                                deleteSuccess = true
                            )
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to delete account: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isDeletingAccount = false,
                                error = "Failed to delete account: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception deleting account: ${e.message}")
                _uiState.update {
                    it.copy(
                        isDeletingAccount = false,
                        error = "Failed to delete account: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Update online status
     */
    fun updateOnlineStatus(isOnline: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(isOnline = isOnline))
        }
        // TODO: Call API to update vendor status
    }

    /**
     * Update delivery acceptance
     */
    fun updateDeliveryStatus(acceptingDelivery: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(acceptingDelivery = acceptingDelivery))
        }
        // TODO: Call API to update
    }

    /**
     * Update pickup acceptance
     */
    fun updatePickupStatus(acceptingPickup: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(acceptingPickup = acceptingPickup))
        }
        // TODO: Call API to update
    }

    /**
     * Update prep time buffer
     */
    fun updatePrepTimeBuffer(minutes: Int) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(prepTimeBuffer = minutes))
        }
        // TODO: Call API to update
    }

    /**
     * Update sound alerts
     */
    fun updateSoundEnabled(enabled: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(soundEnabled = enabled))
        }
    }

    /**
     * Update vibration
     */
    fun updateVibrationEnabled(enabled: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(vibrationEnabled = enabled))
        }
    }

    /**
     * Update AI demand prediction
     */
    fun updateAIDemandPrediction(enabled: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(aiDemandPrediction = enabled))
        }
    }

    /**
     * Update AI prep time optimization
     */
    fun updateAIPrepTimeOptimization(enabled: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(aiPrepTimeOptimization = enabled))
        }
    }

    /**
     * Update AI menu suggestions
     */
    fun updateAIMenuSuggestions(enabled: Boolean) {
        _uiState.update { state ->
            state.copy(vendorData = state.vendorData.copy(aiMenuSuggestions = enabled))
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun resetSignOutSuccess() {
        _uiState.update { it.copy(signOutSuccess = false) }
    }

    fun resetDeleteSuccess() {
        _uiState.update { it.copy(deleteSuccess = false) }
    }
}
