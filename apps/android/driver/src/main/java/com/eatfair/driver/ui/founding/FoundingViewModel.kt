package com.eatfair.driver.ui.founding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.payment.PaymentSheetKeys
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Drives the driver Founding Member ($100 lifetime fee-lock) screen.
 *
 * Mirrors the customer FoundingViewModel: loads GET /api/founding/driver/status,
 * and "Join for $100" reuses the Stripe PaymentSheet flow (a driver-authenticated
 * PaymentIntent via DollorRepository.createPaymentIntent) before calling
 * POST /api/founding/driver/join. Demo accounts bypass payment.
 */
@HiltViewModel
class FoundingViewModel @Inject constructor(
    private val repository: DollorRepository
) : ViewModel() {

    data class UiState(
        val isLoading: Boolean = true,
        val isMember: Boolean = false,
        val eligible: Boolean = false,
        val slotsRemaining: Int? = null,
        val slotsTotal: Int? = null,
        val membershipFee: Double = 100.0,
        val feeLock: String? = null,
        val isDemo: Boolean = false,
        val isJoining: Boolean = false,
        val error: String? = null,
        val message: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _paymentSheetEvent = MutableSharedFlow<PaymentSheetKeys>()
    val paymentSheetEvent = _paymentSheetEvent.asSharedFlow()

    init {
        loadStatus()
    }

    fun loadStatus() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            repository.getDriverFoundingStatus()
                .onSuccess { s ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isMember = s.isMember,
                            eligible = s.eligible,
                            slotsRemaining = s.slotsRemaining,
                            slotsTotal = s.slotsTotal,
                            membershipFee = s.membershipFee ?: 100.0,
                            feeLock = s.feeLock,
                            isDemo = s.isDemo
                        )
                    }
                }
                .onFailure { e -> _uiState.update { it.copy(isLoading = false, error = e.message) } }
        }
    }

    fun onJoinClicked() {
        val state = _uiState.value
        if (state.isDemo) {
            join(paymentIntentId = null, paymentMethodId = null)
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isJoining = true, error = null) }
            val amountCents = (state.membershipFee * 100).toInt()
            repository.createPaymentIntent(amountCents, "usd", SecureStorage.UserType.DRIVER)
                .onSuccess { resp ->
                    _paymentSheetEvent.emit(
                        PaymentSheetKeys(
                            paymentIntent = resp.clientSecret,
                            ephemeralKey = resp.ephemeralKey ?: "",
                            customer = resp.customer ?: "",
                            publishableKey = resp.publishableKey
                        )
                    )
                }
                .onFailure { e -> _uiState.update { it.copy(isJoining = false, error = e.message) } }
        }
    }

    fun onPaymentCompleted(paymentIntentClientSecret: String?) {
        val intentId = paymentIntentClientSecret?.substringBefore("_secret")
        join(paymentIntentId = intentId, paymentMethodId = null)
    }

    fun onPaymentCancelled() {
        _uiState.update { it.copy(isJoining = false) }
    }

    fun onPaymentFailed(message: String?) {
        _uiState.update { it.copy(isJoining = false, error = message ?: "Payment failed") }
    }

    private fun join(paymentIntentId: String?, paymentMethodId: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isJoining = true, error = null) }
            repository.joinDriverFounding(paymentMethodId, paymentIntentId)
                .onSuccess { r ->
                    _uiState.update {
                        it.copy(
                            isJoining = false,
                            isMember = r.isMember || r.success,
                            message = r.message ?: "Welcome, Founding Member!"
                        )
                    }
                    loadStatus()
                }
                .onFailure { e -> _uiState.update { it.copy(isJoining = false, error = e.message) } }
        }
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }
    fun clearMessage() { _uiState.update { it.copy(message = null) } }
}
