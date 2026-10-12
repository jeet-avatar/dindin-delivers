package com.eatfair.app.ui.founding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.app.data.repo.PaymentRepo
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
 * Drives the customer Founding Member ($100 lifetime fee-lock) screen.
 *
 * - Loads eligibility / slots / membership state from GET /api/founding/status.
 * - "Join for $100" reuses the app's existing Stripe PaymentSheet flow (via
 *   [PaymentRepo]); demo accounts bypass payment. On a successful charge the
 *   PaymentIntent id is passed to POST /api/founding/join.
 */
@HiltViewModel
class FoundingViewModel @Inject constructor(
    private val repository: DollorRepository,
    private val paymentRepo: PaymentRepo
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
            repository.getFoundingStatus()
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

    /** Join tapped: demo accounts bypass payment, others get the Stripe sheet. */
    fun onJoinClicked() {
        val state = _uiState.value
        if (state.isDemo) {
            join(paymentIntentId = null, paymentMethodId = null)
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isJoining = true, error = null) }
            paymentRepo.getPaymentSheetKeys(state.membershipFee)
                .onSuccess { keys -> _paymentSheetEvent.emit(keys) }
                .onFailure { e -> _uiState.update { it.copy(isJoining = false, error = e.message) } }
        }
    }

    /** Stripe PaymentSheet completed successfully. */
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
            repository.joinFounding(paymentMethodId, paymentIntentId)
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
