package com.eatfair.partner.ui.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.local.SessionManager
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    object Initial : AuthState()
    object Loading : AuthState()
    object UnAuthenticated : AuthState()
    object NeedsLegalAcceptance : AuthState()
    data class Authenticated(val vendorId: String, val businessName: String) : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val sessionManager: SessionManager,
    private val secureStorage: SecureStorage,
    private val dollorRepository: DollorRepository
) : ViewModel() {

    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val _authState = MutableStateFlow<AuthState>(AuthState.Initial)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    // Track the auth state check job for proper cleanup
    private var authCheckJob: Job? = null

    val vendorName: String?
        get() = secureStorage.vendorName

    val vendorId: Int
        get() = secureStorage.vendorId

    init {
        checkAuthState()
    }

    private fun checkAuthState() {
        authCheckJob?.cancel() // Cancel any existing job
        authCheckJob = viewModelScope.launch {
            try {
                if (secureStorage.isVendorLoggedIn) {
                    if (!secureStorage.hasAcceptedTerms) {
                        _authState.value = AuthState.NeedsLegalAcceptance
                    } else {
                        _authState.value = AuthState.Authenticated(
                            secureStorage.vendorId.toString(),
                            secureStorage.vendorName ?: ""
                        )
                    }
                } else {
                    // Fallback to SessionManager for backward compatibility
                    sessionManager.isLoggedIn.collect { isLoggedIn ->
                        if (isLoggedIn) {
                            val userId = sessionManager.getUserId() ?: ""
                            val userName = sessionManager.getUserName() ?: ""
                            _authState.value = AuthState.Authenticated(userId, userName)
                        } else {
                            _authState.value = AuthState.UnAuthenticated
                        }
                    }
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Authentication check failed")
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            try {
                // Input validation
                if (email.isBlank()) {
                    _authState.value = AuthState.Error("Email cannot be empty")
                    return@launch
                }
                if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                    _authState.value = AuthState.Error("Please enter a valid email address")
                    return@launch
                }
                if (password.isBlank()) {
                    _authState.value = AuthState.Error("Password cannot be empty")
                    return@launch
                }
                if (password.length < 6) {
                    _authState.value = AuthState.Error("Password must be at least 6 characters")
                    return@launch
                }

                _authState.value = AuthState.Loading

                val result = dollorRepository.vendorLogin(email.trim(), password)
                result.onSuccess { response ->
                    sessionManager.saveSession(
                        response.vendorId.toString(),
                        response.businessName ?: email,
                        response.email ?: email
                    )

                    if (!secureStorage.hasAcceptedTerms) {
                        _authState.value = AuthState.NeedsLegalAcceptance
                    } else {
                        _authState.value = AuthState.Authenticated(
                            response.vendorId.toString(),
                            response.businessName ?: ""
                        )
                    }
                }.onFailure { e ->
                    _authState.value = AuthState.Error(e.message ?: "Login failed")
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Login failed due to unexpected error")
            }
        }
    }

    fun acceptTermsAndPrivacy() {
        secureStorage.acceptTermsAndPrivacy()
        _authState.value = AuthState.Authenticated(
            secureStorage.vendorId.toString(),
            secureStorage.vendorName ?: ""
        )
    }

    /**
     * Login with demo credentials for App Store review
     * Demo credentials are managed server-side - no passwords stored in app
     * Falls back to local test session if API is unavailable (for development testing)
     */
    fun loginWithDemo() {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading

                val result = dollorRepository.vendorDemoLogin(
                    AppConfig.DemoCredentials.VENDOR_EMAIL_HINT
                )
                result.onSuccess { response ->
                    sessionManager.saveSession(
                        response.vendorId.toString(),
                        response.businessName ?: "Demo Restaurant",
                        response.email ?: AppConfig.DemoCredentials.VENDOR_EMAIL_HINT
                    )

                    if (!secureStorage.hasAcceptedTerms) {
                        _authState.value = AuthState.NeedsLegalAcceptance
                    } else {
                        _authState.value = AuthState.Authenticated(
                            response.vendorId.toString(),
                            response.businessName ?: "Demo Restaurant"
                        )
                    }
                }.onFailure { e ->
                    // Fallback: Use local test session for development testing
                    // This allows testing UI when backend API is unavailable
                    Log.w(TAG, "Demo login API failed, using local test session: ${e.message}")
                    useLocalTestSession()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Demo login exception, using local test session: ${e.message}")
                useLocalTestSession()
            }
        }
    }

    /**
     * Create a local test session for development testing when API is unavailable.
     * This allows testing the app UI without a running backend.
     */
    private suspend fun useLocalTestSession() {
        val testVendorId = "999"
        val testBusinessName = "Test Restaurant"
        val testEmail = "test@dollor.ai"

        sessionManager.saveSession(testVendorId, testBusinessName, testEmail)
        secureStorage.saveVendorAuth("test_token", 999, testBusinessName, testEmail)

        if (!secureStorage.hasAcceptedTerms) {
            _authState.value = AuthState.NeedsLegalAcceptance
        } else {
            _authState.value = AuthState.Authenticated(testVendorId, testBusinessName)
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                dollorRepository.vendorLogout()
                sessionManager.clearSession()
                _authState.value = AuthState.UnAuthenticated
            } catch (e: Exception) {
                // Even if logout fails, clear local session
                sessionManager.clearSession()
                _authState.value = AuthState.UnAuthenticated
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        // Cancel auth check job to prevent memory leak
        authCheckJob?.cancel()
        authCheckJob = null
    }
}
