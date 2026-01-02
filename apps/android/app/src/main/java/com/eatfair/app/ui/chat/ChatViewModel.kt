package com.eatfair.app.ui.chat

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.ChatMessage as ApiChatMessage
import com.eatfair.shared.model.ChatMessageRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatUiState(
    val messages: List<ChatMessageUi> = emptyList(),
    val isLoading: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val driverName: String = "Driver",
    val orderId: String = "",
    val orderStatus: String = "In Progress"
)

data class ChatMessageUi(
    val id: String,
    val text: String,
    val isFromCustomer: Boolean,
    val senderName: String?,
    val timestamp: Long,
    val isPending: Boolean = false
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    companion object {
        private const val TAG = "ChatViewModel"
        private const val POLL_INTERVAL_MS = 5000L // 5 seconds
    }

    private val orderId: Int = savedStateHandle.get<String>("orderId")?.toIntOrNull() ?: 0
    private val driverName: String = savedStateHandle.get<String>("driverName") ?: "Driver"

    private val _uiState = MutableStateFlow(
        ChatUiState(
            orderId = orderId.toString(),
            driverName = driverName
        )
    )
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var pollingActive = false

    init {
        if (orderId > 0) {
            loadChatHistory()
            startPolling()
        }
    }

    private fun loadChatHistory() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val result = dollorRepository.getOrderChat(orderId)
                result.fold(
                    onSuccess = { messages ->
                        val uiMessages = messages.map { it.toUiMessage() }
                        _uiState.update {
                            it.copy(
                                messages = uiMessages,
                                isLoading = false
                            )
                        }
                        Log.d(TAG, "Loaded ${messages.size} chat messages")
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to load chat: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Failed to load messages: ${error.message}"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading chat: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Error loading messages: ${e.message}"
                    )
                }
            }
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank() || orderId <= 0) return

        val pendingMessage = ChatMessageUi(
            id = "pending_${System.currentTimeMillis()}",
            text = text,
            isFromCustomer = true,
            senderName = "You",
            timestamp = System.currentTimeMillis(),
            isPending = true
        )

        // Add pending message immediately
        _uiState.update {
            it.copy(
                messages = it.messages + pendingMessage,
                isSending = true
            )
        }

        viewModelScope.launch {
            try {
                val request = ChatMessageRequest(
                    message = text,
                    senderType = "customer"
                )

                val result = dollorRepository.sendOrderChat(orderId, request)
                result.fold(
                    onSuccess = {
                        Log.d(TAG, "Message sent successfully")
                        // Replace pending message with confirmed one
                        _uiState.update { state ->
                            state.copy(
                                messages = state.messages.map { msg ->
                                    if (msg.id == pendingMessage.id) {
                                        msg.copy(isPending = false)
                                    } else msg
                                },
                                isSending = false
                            )
                        }
                        // Refresh to get server-side message ID
                        loadChatHistory()
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Failed to send message: ${error.message}")
                        // Remove failed message
                        _uiState.update { state ->
                            state.copy(
                                messages = state.messages.filter { it.id != pendingMessage.id },
                                isSending = false,
                                error = "Failed to send message. Please try again."
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Exception sending message: ${e.message}")
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.filter { it.id != pendingMessage.id },
                        isSending = false,
                        error = "Error sending message. Please try again."
                    )
                }
            }
        }
    }

    private fun startPolling() {
        pollingActive = true
        viewModelScope.launch {
            while (pollingActive && isActive) {
                delay(POLL_INTERVAL_MS)
                if (pollingActive && orderId > 0 && isActive) {
                    refreshMessages()
                }
            }
        }
    }

    private suspend fun refreshMessages() {
        try {
            val result = dollorRepository.getOrderChat(orderId)
            result.onSuccess { messages ->
                val uiMessages = messages.map { it.toUiMessage() }
                // Only update if there are new messages
                if (uiMessages.size > _uiState.value.messages.filterNot { it.isPending }.size) {
                    _uiState.update {
                        it.copy(
                            messages = uiMessages + it.messages.filter { msg -> msg.isPending }
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error polling messages: ${e.message}")
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    override fun onCleared() {
        pollingActive = false
        super.onCleared()
    }

    private fun ApiChatMessage.toUiMessage(): ChatMessageUi {
        return ChatMessageUi(
            id = id.toString(),
            text = message,
            isFromCustomer = senderType == "customer",
            senderName = senderName,
            timestamp = parseTimestamp(createdAt),
            isPending = false
        )
    }

    private fun parseTimestamp(dateString: String): Long {
        return try {
            // Try ISO format
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
                .parse(dateString)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}
