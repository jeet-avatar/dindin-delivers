package com.eatfair.app.ui.profile

import com.eatfair.shared.data.local.SessionManager
import android.net.Uri
import androidx.core.net.toUri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _profileImageUri = MutableStateFlow<Uri?>(null)
    val profileImageUri = _profileImageUri.asStateFlow()

    val userNameFlow = sessionManager.userNameFlow
    val userEmailFlow = sessionManager.userEmailFlow

    init {
        sessionManager.profileImageUriFlow
            .onEach { uriString ->
                _profileImageUri.value = uriString?.toUri()
            }
            .launchIn(viewModelScope)
    }

    // Called from the UI when a new image is selected
    fun onProfileImageChange(uri: Uri?) {
        viewModelScope.launch {
            sessionManager.saveProfileImageUri(uri?.toString())
        }
    }

    override fun onCleared() {
        super.onCleared()
        // All jobs are automatically cancelled by viewModelScope
    }
}
