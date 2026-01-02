package com.eatfair.partner.ui.rideshare

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.partner.data.RideshareApiService
import com.eatfair.shared.model.rideshare.*
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * RideshareViewModel - Manages P2P rideshare bidding state
 * Matches iOS RideBiddingViewModel functionality
 */
class RideshareViewModel : ViewModel() {

    // Available ride requests open for bidding
    private val _availableRequests = MutableStateFlow<List<RideRequestForBidding>>(emptyList())
    val availableRequests: StateFlow<List<RideRequestForBidding>> = _availableRequests.asStateFlow()

    // Driver's submitted bids
    private val _myBids = MutableStateFlow<List<RideBid>>(emptyList())
    val myBids: StateFlow<List<RideBid>> = _myBids.asStateFlow()

    // Filtered bids
    val pendingBids: List<RideBid>
        get() = _myBids.value.filter { it.status == "pending" }

    val counteredBids: List<RideBid>
        get() = _myBids.value.filter { it.status == "countered" }

    val activeRides: List<RideBid>
        get() = _myBids.value.filter { it.status == "accepted" }

    // Loading states
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSubmittingBid = MutableStateFlow(false)
    val isSubmittingBid: StateFlow<Boolean> = _isSubmittingBid.asStateFlow()

    // Error handling
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _showError = MutableStateFlow(false)
    val showError: StateFlow<Boolean> = _showError.asStateFlow()

    // Success handling
    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    private val _showSuccess = MutableStateFlow(false)
    val showSuccess: StateFlow<Boolean> = _showSuccess.asStateFlow()

    // Current location
    private val _currentLocation = MutableStateFlow<Location?>(null)
    val currentLocation: StateFlow<Location?> = _currentLocation.asStateFlow()

    // Platform fee
    val platformFee: Double = RideshareApiService.PLATFORM_FEE

    // Refresh timer
    private var refreshJob: Job? = null
    private var locationClient: FusedLocationProviderClient? = null

    fun initialize(context: Context) {
        locationClient = LocationServices.getFusedLocationProviderClient(context)
        getCurrentLocation(context)
        startRefreshTimer()
    }

    private fun startRefreshTimer() {
        refreshJob?.cancel()
        refreshJob = viewModelScope.launch {
            while (isActive) {
                refreshData()
                delay(5000) // Poll every 5 seconds
            }
        }
    }

    fun refreshData() {
        fetchAvailableRequests()
        fetchMyBids()
    }

    private fun getCurrentLocation(context: Context) {
        if (ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            locationClient?.lastLocation?.addOnSuccessListener { location ->
                _currentLocation.value = location
            }
        }
    }

    fun fetchAvailableRequests() {
        val location = _currentLocation.value
        val latitude = location?.latitude ?: 0.0
        val longitude = location?.longitude ?: 0.0

        viewModelScope.launch {
            val result = RideshareApiService.fetchAvailableRideRequests(latitude, longitude)
            result.onSuccess { requests ->
                _availableRequests.value = requests
            }.onFailure { error ->
                // Silent fail for polling
            }
        }
    }

    fun fetchMyBids() {
        viewModelScope.launch {
            val result = RideshareApiService.fetchDriverBids()
            result.onSuccess { bids ->
                _myBids.value = bids
            }.onFailure { error ->
                // Silent fail for polling
            }
        }
    }

    fun submitBid(
        requestId: Int,
        proposedPrice: Double,
        estimatedArrivalMinutes: Int,
        message: String?
    ) {
        if (proposedPrice <= 0) {
            showErrorMessage("Please enter a valid price")
            return
        }

        _isSubmittingBid.value = true

        viewModelScope.launch {
            val result = RideshareApiService.submitBid(
                requestId = requestId,
                proposedPrice = proposedPrice,
                estimatedArrivalMinutes = estimatedArrivalMinutes,
                message = message
            )

            _isSubmittingBid.value = false

            result.onSuccess { response ->
                showSuccessMessage(response.message)
                // Remove from available requests since we bid on it
                _availableRequests.value = _availableRequests.value.filter { it.id != requestId }
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to submit bid: ${error.message}")
            }
        }
    }

    fun withdrawBid(bid: RideBid) {
        _isLoading.value = true

        viewModelScope.launch {
            val result = RideshareApiService.withdrawBid(bid.id)

            _isLoading.value = false

            result.onSuccess {
                showSuccessMessage("Bid withdrawn successfully")
                _myBids.value = _myBids.value.filter { it.id != bid.id }
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to withdraw bid: ${error.message}")
            }
        }
    }

    fun acceptCounterOffer(bid: RideBid) {
        val counterPrice = bid.customerCounterPrice ?: run {
            showErrorMessage("Invalid counter-offer")
            return
        }

        _isLoading.value = true

        viewModelScope.launch {
            val result = RideshareApiService.respondToCounterOffer(
                bidId = bid.id,
                action = "accept",
                counterPrice = counterPrice
            )

            _isLoading.value = false

            result.onSuccess { response ->
                showSuccessMessage("Counter-offer accepted! Ride matched.")
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to accept: ${error.message}")
            }
        }
    }

    fun rejectCounterOffer(bid: RideBid) {
        _isLoading.value = true

        viewModelScope.launch {
            val result = RideshareApiService.respondToCounterOffer(
                bidId = bid.id,
                action = "reject",
                counterPrice = null
            )

            _isLoading.value = false

            result.onSuccess {
                showSuccessMessage("Counter-offer rejected")
                _myBids.value = _myBids.value.filter { it.id != bid.id }
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to reject: ${error.message}")
            }
        }
    }

    fun submitNewCounterOffer(bid: RideBid, newPrice: Double) {
        _isLoading.value = true

        viewModelScope.launch {
            val result = RideshareApiService.respondToCounterOffer(
                bidId = bid.id,
                action = "counter",
                counterPrice = newPrice
            )

            _isLoading.value = false

            result.onSuccess {
                showSuccessMessage("New offer sent to customer")
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to send offer: ${error.message}")
            }
        }
    }

    fun startRide(bid: RideBid) {
        val requestId = bid.rideRequest?.id ?: bid.rideRequestId

        _isLoading.value = true

        viewModelScope.launch {
            val result = RideshareApiService.startRide(requestId)

            _isLoading.value = false

            result.onSuccess {
                showSuccessMessage("Ride started!")
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to start ride: ${error.message}")
            }
        }
    }

    fun completeRide(bid: RideBid) {
        val requestId = bid.rideRequest?.id ?: bid.rideRequestId

        _isLoading.value = true

        viewModelScope.launch {
            val result = RideshareApiService.completeRide(requestId)

            _isLoading.value = false

            result.onSuccess {
                showSuccessMessage("Ride completed! Earnings added.")
                refreshData()
            }.onFailure { error ->
                showErrorMessage("Failed to complete ride: ${error.message}")
            }
        }
    }

    fun calculateEarnings(proposedPrice: Double): Double {
        return RideshareApiService.calculateEarnings(proposedPrice)
    }

    private fun showErrorMessage(message: String) {
        _errorMessage.value = message
        _showError.value = true
    }

    private fun showSuccessMessage(message: String) {
        _successMessage.value = message
        _showSuccess.value = true
    }

    fun dismissError() {
        _showError.value = false
        _errorMessage.value = null
    }

    fun dismissSuccess() {
        _showSuccess.value = false
        _successMessage.value = null
    }

    override fun onCleared() {
        super.onCleared()
        refreshJob?.cancel()
    }
}
