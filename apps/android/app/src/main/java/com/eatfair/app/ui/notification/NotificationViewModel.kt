package com.eatfair.app.ui.notification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.model.notification.NotificationItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * NotificationViewModel - Handles notification fetching from API
 *
 * PRODUCTION NOTE: Backend /api/notifications endpoint not yet implemented.
 * Returns empty list until endpoint is available.
 * This matches the iOS implementation for consistency.
 */
@HiltViewModel
class NotificationViewModel @Inject constructor() : ViewModel() {

    private val _notifications = MutableStateFlow<List<NotificationItem>>(emptyList())
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadNotifications()
    }

    /**
     * Load notifications from production API
     * Currently returns empty list as backend endpoint is not yet implemented
     *
     * TODO: Implement when backend /api/notifications endpoint is available
     * Expected endpoints:
     * - GET /api/notifications - Fetch user notifications
     * - PUT /api/notifications/{id}/read - Mark notification as read
     * - DELETE /api/notifications - Clear all notifications
     */
    fun loadNotifications() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            try {
                // TODO: Replace with actual API call when backend is ready
                // val result = dollorRepository.getNotifications()
                // _notifications.value = result.getOrDefault(emptyList())

                // Graceful degradation: Return empty list (matches iOS behavior)
                _notifications.value = emptyList()
            } catch (e: Exception) {
                _error.value = e.message
                _notifications.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Mark a notification as read
     */
    fun markAsRead(notificationId: Int) {
        viewModelScope.launch {
            try {
                // TODO: Call API when available
                // dollorRepository.markNotificationAsRead(notificationId)

                // Update local state
                _notifications.value = _notifications.value.map { notification ->
                    if (notification.id == notificationId) {
                        notification.copy(isRead = true)
                    } else {
                        notification
                    }
                }
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    /**
     * Clear all notifications
     */
    fun clearAllNotifications() {
        viewModelScope.launch {
            try {
                // TODO: Call API when available
                // dollorRepository.clearAllNotifications()

                // Update local state
                _notifications.value = emptyList()
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
}
