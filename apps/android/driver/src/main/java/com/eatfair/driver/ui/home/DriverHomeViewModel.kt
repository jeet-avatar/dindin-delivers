package com.eatfair.driver.ui.home

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
 * Drives the driver Home screen: real online/offline toggle (gated server-side
 * on approval + background check), today's stats from the earnings API, and the
 * current active ride with its arrived/start/complete actions.
 */
@HiltViewModel
class DriverHomeViewModel @Inject constructor(
    private val repository: DollorRepository,
    private val locationManager: DriverLocationManager
) : ViewModel() {

    data class HomeUiState(
        val isOnline: Boolean = false,
        val isToggling: Boolean = false,
        val todayEarnings: Double = 0.0,
        val todayRides: Int = 0,
        val todayHours: Double = 0.0,
        val activeRide: RideRequestForBidding? = null,
        val isRideActionInProgress: Boolean = false,
        val error: String? = null,
        val message: String? = null
    )

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        loadTodayStats()
        loadActiveRide()
    }

    private fun loadTodayStats() {
        viewModelScope.launch {
            repository.getDriverEarningsDetailed("today").onSuccess { earnings ->
                _uiState.update {
                    it.copy(
                        todayEarnings = earnings.today.grossEarnings,
                        todayRides = earnings.today.deliveries,
                        todayHours = earnings.today.activeHours ?: 0.0
                    )
                }
            }
        }
    }

    private fun loadActiveRide() {
        viewModelScope.launch {
            repository.getDriverActiveRideRequests().onSuccess { rides ->
                _uiState.update { it.copy(activeRide = rides.firstOrNull()) }
            }
        }
    }

    fun setOnline(target: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isToggling = true, error = null) }
            repository.setDriverOnline(target)
                .onSuccess { online ->
                    _uiState.update { it.copy(isOnline = online, isToggling = false) }
                    // Drive real-time location updates while online; stop when offline.
                    if (online) {
                        locationManager.startLocationUpdates()
                        loadActiveRide()
                    } else {
                        locationManager.stopLocationUpdates()
                    }
                }
                .onFailure { e ->
                    // Keep the switch in its prior state; surface the server reason
                    // (e.g. "Background check not passed...").
                    _uiState.update { it.copy(isToggling = false, error = e.message) }
                }
        }
    }

    fun markArrived() {
        val id = _uiState.value.activeRide?.id ?: return
        performRideAction { repository.markRideRequestArrived(id) }
    }

    fun startRide() {
        val id = _uiState.value.activeRide?.id ?: return
        performRideAction { repository.startRideRequest(id) }
    }

    fun completeRide() {
        val id = _uiState.value.activeRide?.id ?: return
        performRideAction { repository.completeRideRequest(id) }
    }

    private fun performRideAction(
        action: suspend () -> Result<com.eatfair.shared.model.rideshare.RideStatusResponse>
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isRideActionInProgress = true, error = null) }
            action()
                .onSuccess { resp ->
                    _uiState.update {
                        it.copy(isRideActionInProgress = false, message = resp.message)
                    }
                    loadActiveRide()
                    loadTodayStats()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isRideActionInProgress = false, error = e.message) }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearMessage() {
        _uiState.update { it.copy(message = null) }
    }

    override fun onCleared() {
        super.onCleared()
        locationManager.stopLocationUpdates()
    }
}
