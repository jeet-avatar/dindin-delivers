package com.eatfair.partner.ui.profile

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = true,
    val profileData: ProfileData = ProfileData(),
    val errorMessage: String? = null
)

/**
 * ProfileViewModel - P2P Backend Only
 *
 * Profile data comes from:
 * 1. SecureStorage for cached vendor info (name, email)
 * 2. DollorRepository for full profile from API
 */
@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val secureStorage: SecureStorage,
    private val dollorRepository: DollorRepository
) : ViewModel() {

    companion object {
        private const val TAG = "ProfileViewModel"
    }

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                // First, load from SecureStorage (cached data)
                val cachedName = secureStorage.vendorName ?: ""
                val cachedEmail = secureStorage.vendorEmail ?: ""

                // Show cached data immediately
                _uiState.value = _uiState.value.copy(
                    profileData = ProfileData(
                        restaurantName = cachedName,
                        email = cachedEmail,
                        address = "",
                        isVerified = false,
                        phone = "",
                        cuisineType = "",
                        isOnline = false
                    )
                )

                // Then fetch fresh data from API
                dollorRepository.getVendorProfile().fold(
                    onSuccess = { vendor ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            profileData = ProfileData(
                                restaurantName = vendor.restaurantName ?: vendor.companyName ?: cachedName,
                                email = vendor.contactEmail ?: cachedEmail,
                                address = buildAddress(vendor.street, vendor.city, vendor.state, vendor.zipCode),
                                isVerified = vendor.onboardingStatus == "approved",
                                phone = vendor.phoneNumber ?: vendor.contactPhone ?: "",
                                cuisineType = vendor.cuisineType ?: "",
                                isOnline = vendor.isOnline ?: false
                            )
                        )
                        Log.d(TAG, "Loaded vendor profile from API")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to load profile from API: ${error.message}")
                        // Keep cached data, just stop loading
                        _uiState.value = _uiState.value.copy(isLoading = false)
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load profile: ${e.message}")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Failed to load profile"
                )
            }
        }
    }

    private fun buildAddress(street: String?, city: String?, state: String?, zip: String?): String {
        return listOfNotNull(street, city, state, zip)
            .filter { it.isNotBlank() }
            .joinToString(", ")
    }

    fun openTermsOfService() {
        openUrl(AppConfig.Legal.TERMS_OF_SERVICE_URL)
    }

    fun openPrivacyPolicy() {
        openUrl(AppConfig.Legal.PRIVACY_POLICY_URL)
    }

    fun openHelpCenter() {
        openUrl(AppConfig.Legal.SUPPORT_URL)
    }

    private fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "Could not open link"
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun toggleOnlineStatus(isOnline: Boolean) {
        viewModelScope.launch {
            try {
                // Optimistically update UI
                _uiState.value = _uiState.value.copy(
                    profileData = _uiState.value.profileData.copy(isOnline = isOnline)
                )

                // Update via API
                dollorRepository.updateVendorOnlineStatus(isOnline).fold(
                    onSuccess = {
                        Log.d(TAG, "Updated online status to: $isOnline")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to update online status: ${error.message}")
                        // Revert on failure
                        _uiState.value = _uiState.value.copy(
                            profileData = _uiState.value.profileData.copy(isOnline = !isOnline),
                            errorMessage = "Failed to update online status"
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling online status: ${e.message}")
                // Revert on error
                _uiState.value = _uiState.value.copy(
                    profileData = _uiState.value.profileData.copy(isOnline = !isOnline),
                    errorMessage = "Failed to update online status"
                )
            }
        }
    }
}
