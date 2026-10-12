package com.eatfair.driver.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.driver.location.DriverLocationManager
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.rideshare.RideRequestForBidding
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Loads real available ride requests (GET /api/rides/available) and lets the
 * driver accept (submit a bid at the suggested price) or decline (dismiss).
 */
@HiltViewModel
class AvailableRidesViewModel @Inject constructor(
    private val repository: DollorRepository,
    private val locationManager: DriverLocationManager
) : ViewModel() {

    data class UiState(
        val isLoading: Boolean = true,
        val rides: List<RideRequestForBidding> = emptyList(),
        val acceptingId: Int? = null,
        val error: String? = null,
        val message: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            // Include the driver's current location so the backend can rank/filter
            // nearby ride requests (GET /api/rides/available?latitude=&longitude=).
            val loc = locationManager.lastLocation.value
            repository.getAvailableRideRequests(loc?.latitude, loc?.longitude)
                .onSuccess { rides ->
                    _uiState.update { it.copy(isLoading = false, rides = rides) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    /** Accept a ride by submitting a bid at the customer's suggested price. */
    fun accept(ride: RideRequestForBidding) {
        val price = ride.suggestedPrice
        if (price == null || price <= 0.0) {
            _uiState.update { it.copy(error = "This request has no suggested price to accept.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(acceptingId = ride.id, error = null) }
            repository.submitRideBid(requestId = ride.id, proposedPrice = price)
                .onSuccess { resp ->
                    _uiState.update {
                        it.copy(
                            acceptingId = null,
                            rides = it.rides.filterNot { r -> r.id == ride.id },
                            message = resp.message.ifBlank { "Bid submitted" }
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(acceptingId = null, error = e.message) }
                }
        }
    }

    /** Decline a ride request = remove it from this driver's list locally. */
    fun decline(ride: RideRequestForBidding) {
        _uiState.update { it.copy(rides = it.rides.filterNot { r -> r.id == ride.id }) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearMessage() {
        _uiState.update { it.copy(message = null) }
    }
}
