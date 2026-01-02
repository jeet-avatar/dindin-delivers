package com.eatfair.partner.ui.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.local.SessionManager
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

sealed class RegistrationState {
    object Initial : RegistrationState()
    object Loading : RegistrationState()
    data class Success(val vendorId: Int, val message: String) : RegistrationState()
    data class Error(val message: String) : RegistrationState()
}

@HiltViewModel
class RegistrationViewModel @Inject constructor(
    private val sessionManager: SessionManager,
    private val secureStorage: SecureStorage,
    private val dollorRepository: DollorRepository
) : ViewModel() {

    companion object {
        private const val TAG = "RegistrationViewModel"
    }

    private val _registrationState = MutableStateFlow<RegistrationState>(RegistrationState.Initial)
    val registrationState: StateFlow<RegistrationState> = _registrationState.asStateFlow()

    /**
     * Register vendor with full form data matching Web and iOS
     * Calls /api/vendors/public endpoint
     */
    fun registerVendor(formData: RegistrationFormData) {
        viewModelScope.launch {
            try {
                _registrationState.value = RegistrationState.Loading

                // Build operating hours JSON matching Web format
                val operatingHours = JSONObject().apply {
                    put("monday", formData.mondayHours)
                    put("tuesday", formData.tuesdayHours)
                    put("wednesday", formData.wednesdayHours)
                    put("thursday", formData.thursdayHours)
                    put("friday", formData.fridayHours)
                    put("saturday", formData.saturdayHours)
                    put("sunday", formData.sundayHours)
                }

                // Build registration data matching Web API exactly
                val registrationData = mapOf(
                    "company_name" to formData.restaurantName,
                    "restaurant_name" to formData.restaurantName,
                    "cuisine_type" to formData.cuisineType,
                    "contact_name" to formData.contactName,
                    "contact_email" to formData.contactEmail,
                    "contact_phone" to formData.contactPhone,
                    "password" to formData.password,
                    "street" to formData.streetAddress,
                    "city" to formData.city,
                    "state" to formData.state,
                    "zip_code" to formData.zipCode,
                    "website" to formData.website,
                    "operating_hours" to operatingHours.toString(),
                    "seating_capacity" to (formData.seatingCapacity.toIntOrNull() ?: 50),
                    "delivery_available" to formData.deliveryAvailable,
                    "pickup_available" to formData.pickupAvailable,
                    "average_prep_time" to (formData.avgPrepTime.toIntOrNull() ?: 25),
                    "notes" to formData.description,
                    "platform" to "android"
                )

                Log.d(TAG, "Registering vendor: ${formData.restaurantName}")

                val result = dollorRepository.vendorPublicRegister(registrationData)

                result.onSuccess { response ->
                    Log.d(TAG, "Registration successful: vendorId=${response.vendorId}")

                    // Store vendor info for later use
                    sessionManager.saveSession(
                        response.vendorId.toString(),
                        formData.restaurantName,
                        formData.contactEmail
                    )

                    // Also save in secure storage
                    secureStorage.saveVendorAuth(
                        "pending_approval", // Token will be set after login
                        response.vendorId,
                        formData.restaurantName,
                        formData.contactEmail
                    )

                    _registrationState.value = RegistrationState.Success(
                        vendorId = response.vendorId,
                        message = response.message ?: "Application submitted successfully!"
                    )
                }.onFailure { e ->
                    Log.e(TAG, "Registration failed: ${e.message}")
                    _registrationState.value = RegistrationState.Error(
                        e.message ?: "Registration failed. Please try again."
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Registration exception: ${e.message}", e)
                _registrationState.value = RegistrationState.Error(
                    e.message ?: "Registration failed due to unexpected error"
                )
            }
        }
    }

    fun resetState() {
        _registrationState.value = RegistrationState.Initial
    }
}
