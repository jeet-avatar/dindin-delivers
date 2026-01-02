package com.eatfair.partner.ui.notifications

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsUiState(
    val notifications: List<PartnerNotification> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val unreadCount: Int = 0
)

/**
 * NotificationsViewModel - P2P Backend Only (No Firebase Firestore)
 *
 * Notifications are received via:
 * 1. FCM Push (PartnerFirebaseMessagingService) - stored locally
 * 2. API polling for any missed notifications
 *
 * NO Firestore listener - all data from production API
 */
@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "NotificationsViewModel"
        private const val POLLING_INTERVAL = 30_000L // 30 seconds
    }

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    // Local notifications cache (would persist to DataStore in production)
    private val localNotifications = mutableListOf<PartnerNotification>()
    private var nextId = 1

    private var pollingJob: Job? = null

    private val vendorId: Int
        get() = secureStorage.vendorId ?: 0

    init {
        loadNotifications()
        startPolling()
    }

    /**
     * Load notifications - currently from local cache
     * In future, can fetch from API: GET /api/vendors/{id}/notifications
     */
    private fun loadNotifications() {
        _uiState.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            try {
                // TODO: When API endpoint exists, fetch from:
                // dollorRepository.getVendorNotifications(vendorId)

                // For now, use local cache populated by FCM push
                val unreadCount = localNotifications.count { !it.isRead }

                _uiState.update {
                    it.copy(
                        notifications = localNotifications.toList(),
                        unreadCount = unreadCount,
                        isLoading = false,
                        error = null
                    )
                }
                Log.d(TAG, "Loaded ${localNotifications.size} notifications ($unreadCount unread)")
            } catch (e: Exception) {
                Log.e(TAG, "Error loading notifications: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Error loading notifications: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Poll for notifications periodically
     */
    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(POLLING_INTERVAL)
                if (isActive) {
                    refreshNotifications()
                }
            }
        }
    }

    /**
     * Refresh notifications silently
     */
    fun refreshNotifications() {
        viewModelScope.launch {
            try {
                // TODO: Fetch from API when endpoint exists
                // For now, just update UI from local cache
                val unreadCount = localNotifications.count { !it.isRead }
                _uiState.update {
                    it.copy(
                        notifications = localNotifications.toList(),
                        unreadCount = unreadCount
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Silent refresh failed: ${e.message}")
            }
        }
    }

    /**
     * Mark a notification as read (local update)
     */
    fun markAsRead(notification: PartnerNotification) {
        viewModelScope.launch {
            try {
                // Update local cache
                val index = localNotifications.indexOfFirst { it.id == notification.id }
                if (index >= 0) {
                    localNotifications[index] = localNotifications[index].copy(isRead = true)
                }

                // Update UI
                _uiState.update { state ->
                    state.copy(
                        notifications = localNotifications.toList(),
                        unreadCount = localNotifications.count { !it.isRead }
                    )
                }

                // TODO: When API endpoint exists, call:
                // dollorRepository.markNotificationRead(vendorId, notification.id)

                Log.d(TAG, "Marked notification ${notification.id} as read")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to mark as read: ${e.message}")
            }
        }
    }

    /**
     * Mark all notifications as read
     */
    fun markAllAsRead() {
        viewModelScope.launch {
            try {
                // Update local cache
                localNotifications.replaceAll { it.copy(isRead = true) }

                // Update UI
                _uiState.update { state ->
                    state.copy(
                        notifications = localNotifications.toList(),
                        unreadCount = 0
                    )
                }

                // TODO: When API endpoint exists, call:
                // dollorRepository.markAllNotificationsRead(vendorId)

                Log.d(TAG, "Marked all notifications as read")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to mark all as read: ${e.message}")
            }
        }
    }

    /**
     * Clear all notifications
     */
    fun clearAll() {
        viewModelScope.launch {
            try {
                localNotifications.clear()

                _uiState.update {
                    it.copy(notifications = emptyList(), unreadCount = 0)
                }

                Log.d(TAG, "Cleared all notifications")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to clear notifications: ${e.message}")
                _uiState.update { it.copy(error = "Failed to clear notifications") }
            }
        }
    }

    /**
     * Add a notification from FCM push
     * Called by PartnerFirebaseMessagingService when push is received
     */
    fun addNotification(notification: PartnerNotification) {
        viewModelScope.launch {
            try {
                // Add to local cache with generated ID
                val newNotification = notification.copy(id = nextId++)
                localNotifications.add(0, newNotification) // Add to front

                // Keep max 50 notifications
                if (localNotifications.size > 50) {
                    localNotifications.removeAt(localNotifications.lastIndex)
                }

                // Update UI
                _uiState.update { state ->
                    state.copy(
                        notifications = localNotifications.toList(),
                        unreadCount = localNotifications.count { !it.isRead }
                    )
                }

                Log.d(TAG, "Added notification: ${notification.title}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to add notification: ${e.message}")
            }
        }
    }

    /**
     * Add notification from push data
     */
    fun addNotificationFromPush(title: String, message: String, type: String) {
        val notification = PartnerNotification(
            id = nextId++,
            title = title,
            message = message,
            time = "Just now",
            type = parseNotificationType(type),
            isRead = false
        )
        addNotification(notification)
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun parseNotificationType(type: String?): NotificationType {
        return when (type?.lowercase()) {
            "new_order" -> NotificationType.NEW_ORDER
            "order_cancelled" -> NotificationType.ORDER_CANCELLED
            "payment_received" -> NotificationType.PAYMENT_RECEIVED
            "review_received" -> NotificationType.REVIEW_RECEIVED
            "system" -> NotificationType.SYSTEM
            else -> NotificationType.SYSTEM
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
        Log.d(TAG, "NotificationsViewModel cleared")
    }
}

/**
 * Partner notification data class (no Firestore dependency)
 */
data class PartnerNotification(
    val id: Int,
    val title: String,
    val message: String,
    val time: String,
    val type: NotificationType,
    val isRead: Boolean = false
)

enum class NotificationType {
    NEW_ORDER,
    ORDER_CANCELLED,
    PAYMENT_RECEIVED,
    REVIEW_RECEIVED,
    SYSTEM
}
