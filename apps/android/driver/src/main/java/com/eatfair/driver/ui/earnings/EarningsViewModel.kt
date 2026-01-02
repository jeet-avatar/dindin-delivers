package com.eatfair.driver.ui.earnings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.model.DriverEarningsResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EarningsUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val earnings: DriverEarningsResponse? = null,
    val selectedPeriod: String = "week"
)

@HiltViewModel
class EarningsViewModel @Inject constructor(
    private val apiService: DollorApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(EarningsUiState())
    val uiState: StateFlow<EarningsUiState> = _uiState.asStateFlow()

    // TODO: Get from auth/session manager
    private var driverId: Int = 1
    private var authToken: String = ""

    fun setDriverCredentials(driverId: Int, token: String) {
        this.driverId = driverId
        this.authToken = "Bearer $token"
        loadEarnings()
    }

    fun loadEarnings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                val response = apiService.getDriverEarnings(driverId, authToken)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    earnings = response,
                    error = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load earnings"
                )
            }
        }
    }

    fun selectPeriod(period: String) {
        _uiState.value = _uiState.value.copy(selectedPeriod = period)
        // Earnings data already contains all periods, just update selected
    }
}
