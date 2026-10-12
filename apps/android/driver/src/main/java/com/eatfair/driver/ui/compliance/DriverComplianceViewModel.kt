package com.eatfair.driver.ui.compliance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Drives the driver background-check (Checkr-Hosted) step of onboarding.
 *
 * - [initiateBackgroundCheck] calls POST /api/checkr/background-check/initiate and
 *   exposes the hosted `invitation_url` for the screen to open (ACTION_VIEW).
 * - [refreshStatus] / the polling loop call GET /api/checkr/background-check/{id}/status
 *   so the UI reflects not_started → pending → clear.
 */
@HiltViewModel
class DriverComplianceViewModel @Inject constructor(
    private val repository: DollorRepository
) : ViewModel() {

    data class UiState(
        val isLoadingStatus: Boolean = true,
        val isInitiating: Boolean = false,
        val backgroundStatus: String = "not_started",
        val isClear: Boolean = false,
        val isPending: Boolean = false,
        val invitationUrl: String? = null,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        refreshStatus()
        startPollingStatus()
    }

    fun refreshStatus() {
        viewModelScope.launch {
            repository.getBackgroundCheckStatus()
                .onSuccess { status ->
                    _uiState.update {
                        it.copy(
                            isLoadingStatus = false,
                            backgroundStatus = status.effectiveStatus,
                            isClear = status.isClear,
                            isPending = status.isPending
                        )
                    }
                }
                .onFailure {
                    // Treat an error as "not started" so the driver can still begin.
                    _uiState.update { it.copy(isLoadingStatus = false, error = it.error ?: null) }
                }
        }
    }

    fun initiateBackgroundCheck() {
        if (_uiState.value.isInitiating) return
        viewModelScope.launch {
            _uiState.update { it.copy(isInitiating = true, error = null) }
            repository.initiateBackgroundCheck()
                .onSuccess { resp ->
                    _uiState.update {
                        it.copy(
                            isInitiating = false,
                            invitationUrl = resp.invitationUrl,
                            backgroundStatus = resp.status ?: "pending",
                            isPending = true,
                            error = if (resp.invitationUrl == null)
                                (resp.message ?: resp.error ?: "Could not start background check")
                            else null
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isInitiating = false, error = e.message) }
                }
        }
    }

    /** Clear the invitation URL once it has been opened so it isn't re-launched. */
    fun onInvitationOpened() {
        _uiState.update { it.copy(invitationUrl = null) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun startPollingStatus() {
        viewModelScope.launch {
            while (isActive) {
                delay(15_000)
                if (_uiState.value.isClear) break
                repository.getBackgroundCheckStatus().onSuccess { status ->
                    _uiState.update {
                        it.copy(
                            backgroundStatus = status.effectiveStatus,
                            isClear = status.isClear,
                            isPending = status.isPending
                        )
                    }
                }
            }
        }
    }
}
