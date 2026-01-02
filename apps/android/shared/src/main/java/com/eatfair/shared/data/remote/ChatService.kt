package com.eatfair.shared.data.remote

import com.eatfair.shared.config.AppConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Chat Service
 * Matches iOS ChatService.swift for platform parity
 * Real-time messaging via WebSocket
 */

// Data Models for Real-time Chat (prefixed to avoid conflict with ApiModels.ChatMessage)
data class RealtimeChatConversation(
    val id: String,
    val orderId: String? = null,
    val rideId: String? = null,
    val customerId: String,
    val driverId: String,
    val customerName: String,
    val driverName: String,
    val lastMessage: String? = null,
    val lastMessageAt: Long? = null,
    val unreadCount: Int = 0,
    val createdAt: Long
)

data class RealtimeChatMessage(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderType: RealtimeSenderType,
    val messageType: RealtimeMessageType,
    val content: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isRead: Boolean = false,
    val createdAt: Long
)

enum class RealtimeSenderType {
    CUSTOMER,
    DRIVER
}

enum class RealtimeMessageType {
    TEXT,
    LOCATION,
    IMAGE,
    QUICK_REPLY
}

data class RealtimeChatEvent(
    val type: RealtimeChatEventType,
    val conversationId: String,
    val message: RealtimeChatMessage? = null,
    val data: Map<String, Any> = emptyMap()
)

enum class RealtimeChatEventType {
    NEW_MESSAGE,
    MESSAGE_READ,
    TYPING,
    STOPPED_TYPING,
    CONNECTION_STATUS
}

sealed class RealtimeChatResult<out T> {
    data class Success<T>(val data: T) : RealtimeChatResult<T>()
    data class Error(val message: String) : RealtimeChatResult<Nothing>()
}

@Singleton
class ChatService @Inject constructor() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null

    // Use AppConfig for environment-aware URLs (production)
    private val baseUrl: String
        get() = AppConfig.API_BASE_URL.removeSuffix("/api")

    private val wsUrl: String
        get() {
            val httpUrl = AppConfig.API_BASE_URL.removeSuffix("/api")
            return httpUrl.replace("http://", "ws://").replace("https://", "wss://")
        }

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _chatEvents = MutableSharedFlow<RealtimeChatEvent>()
    val chatEvents: Flow<RealtimeChatEvent> = _chatEvents

    private val _messages = MutableStateFlow<List<RealtimeChatMessage>>(emptyList())
    val messages: StateFlow<List<RealtimeChatMessage>> = _messages.asStateFlow()

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        ERROR
    }

    // Quick reply templates
    val customerQuickReplies = listOf(
        "I'm at pickup",
        "Running late",
        "Can you call me?",
        "Thank you!",
        "Where are you?",
        "I'm coming down"
    )

    val driverQuickReplies = listOf(
        "On my way!",
        "I've arrived",
        "Share your location?",
        "I'll wait here",
        "Be there in 5 min",
        "Having trouble finding you"
    )

    /**
     * Create a new conversation
     */
    suspend fun createConversation(
        orderId: String? = null,
        rideId: String? = null,
        customerId: String,
        driverId: String,
        token: String
    ): RealtimeChatResult<RealtimeChatConversation> {
        return try {
            val json = JSONObject().apply {
                orderId?.let { put("order_id", it) }
                rideId?.let { put("ride_id", it) }
                put("customer_id", customerId)
                put("driver_id", driverId)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/api/chat/conversations")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val conversation = parseConversation(JSONObject(responseBody ?: "{}"))
                RealtimeChatResult.Success(conversation)
            } else {
                RealtimeChatResult.Error("Failed to create conversation: ${response.message}")
            }
        } catch (e: Exception) {
            RealtimeChatResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Send a text message
     */
    suspend fun sendMessage(
        conversationId: String,
        content: String,
        senderType: RealtimeSenderType,
        token: String
    ): RealtimeChatResult<RealtimeChatMessage> {
        return try {
            val json = JSONObject().apply {
                put("content", content)
                put("sender_type", senderType.name.lowercase())
                put("message_type", "text")
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/api/chat/conversations/$conversationId/messages")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val message = parseMessage(JSONObject(responseBody ?: "{}"))
                // Add to local messages
                _messages.value = _messages.value + message
                RealtimeChatResult.Success(message)
            } else {
                RealtimeChatResult.Error("Failed to send message: ${response.message}")
            }
        } catch (e: Exception) {
            RealtimeChatResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Send location message
     */
    suspend fun sendLocation(
        conversationId: String,
        latitude: Double,
        longitude: Double,
        senderType: RealtimeSenderType,
        token: String
    ): RealtimeChatResult<RealtimeChatMessage> {
        return try {
            val json = JSONObject().apply {
                put("content", "Shared location")
                put("sender_type", senderType.name.lowercase())
                put("message_type", "location")
                put("latitude", latitude)
                put("longitude", longitude)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/api/chat/conversations/$conversationId/messages")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val message = parseMessage(JSONObject(responseBody ?: "{}"))
                _messages.value = _messages.value + message
                RealtimeChatResult.Success(message)
            } else {
                RealtimeChatResult.Error("Failed to send location: ${response.message}")
            }
        } catch (e: Exception) {
            RealtimeChatResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Fetch message history
     */
    suspend fun fetchMessages(
        conversationId: String,
        token: String,
        limit: Int = 50,
        before: Long? = null
    ): RealtimeChatResult<List<RealtimeChatMessage>> {
        return try {
            var url = "$baseUrl/api/chat/conversations/$conversationId/messages?limit=$limit"
            before?.let { url += "&before=$it" }

            val request = Request.Builder()
                .url(url)
                .addHeader("Authorization", "Bearer $token")
                .get()
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val jsonArray = JSONArray(responseBody ?: "[]")
                val messages = mutableListOf<RealtimeChatMessage>()
                for (i in 0 until jsonArray.length()) {
                    messages.add(parseMessage(jsonArray.getJSONObject(i)))
                }
                _messages.value = messages
                RealtimeChatResult.Success(messages)
            } else {
                RealtimeChatResult.Error("Failed to fetch messages: ${response.message}")
            }
        } catch (e: Exception) {
            RealtimeChatResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Mark messages as read
     */
    suspend fun markAsRead(
        conversationId: String,
        token: String
    ): RealtimeChatResult<Unit> {
        return try {
            val request = Request.Builder()
                .url("$baseUrl/api/chat/conversations/$conversationId/read")
                .addHeader("Authorization", "Bearer $token")
                .post("".toRequestBody(null))
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                // Update local messages to mark as read
                _messages.value = _messages.value.map { it.copy(isRead = true) }
                RealtimeChatResult.Success(Unit)
            } else {
                RealtimeChatResult.Error("Failed to mark as read: ${response.message}")
            }
        } catch (e: Exception) {
            RealtimeChatResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Connect to WebSocket for real-time messaging
     */
    fun connectWebSocket(conversationId: String, token: String) {
        _connectionState.value = ConnectionState.CONNECTING

        val request = Request.Builder()
            .url("$wsUrl/ws/chat/$conversationId")
            .addHeader("Authorization", "Bearer $token")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connectionState.value = ConnectionState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val event = parseChatEvent(json)
                    _chatEvents.tryEmit(event)

                    // Add new message to local list
                    event.message?.let { message ->
                        _messages.value = _messages.value + message
                    }
                } catch (e: Exception) {
                    // Handle parse error
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _connectionState.value = ConnectionState.ERROR
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                _connectionState.value = ConnectionState.DISCONNECTED
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _connectionState.value = ConnectionState.DISCONNECTED
            }
        })
    }

    /**
     * Send typing indicator via WebSocket
     */
    fun sendTypingIndicator(isTyping: Boolean) {
        val json = JSONObject().apply {
            put("type", if (isTyping) "typing" else "stopped_typing")
        }
        webSocket?.send(json.toString())
    }

    /**
     * Disconnect WebSocket
     */
    fun disconnectWebSocket() {
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    /**
     * Clear local messages
     */
    fun clearMessages() {
        _messages.value = emptyList()
    }

    private fun parseConversation(json: JSONObject): RealtimeChatConversation {
        return RealtimeChatConversation(
            id = json.optString("id", ""),
            orderId = json.optString("order_id", null),
            rideId = json.optString("ride_id", null),
            customerId = json.optString("customer_id", ""),
            driverId = json.optString("driver_id", ""),
            customerName = json.optString("customer_name", "Customer"),
            driverName = json.optString("driver_name", "Driver"),
            lastMessage = json.optString("last_message", null),
            lastMessageAt = if (json.has("last_message_at")) json.optLong("last_message_at") else null,
            unreadCount = json.optInt("unread_count", 0),
            createdAt = json.optLong("created_at", System.currentTimeMillis())
        )
    }

    private fun parseMessage(json: JSONObject): RealtimeChatMessage {
        return RealtimeChatMessage(
            id = json.optString("id", ""),
            conversationId = json.optString("conversation_id", ""),
            senderId = json.optString("sender_id", ""),
            senderType = RealtimeSenderType.valueOf(
                json.optString("sender_type", "CUSTOMER").uppercase()
            ),
            messageType = RealtimeMessageType.valueOf(
                json.optString("message_type", "TEXT").uppercase()
            ),
            content = json.optString("content", ""),
            latitude = if (json.has("latitude")) json.optDouble("latitude") else null,
            longitude = if (json.has("longitude")) json.optDouble("longitude") else null,
            isRead = json.optBoolean("is_read", false),
            createdAt = json.optLong("created_at", System.currentTimeMillis())
        )
    }

    private fun parseChatEvent(json: JSONObject): RealtimeChatEvent {
        val typeString = json.optString("type", "NEW_MESSAGE")
        val type = try {
            RealtimeChatEventType.valueOf(typeString.uppercase().replace(" ", "_"))
        } catch (e: Exception) {
            RealtimeChatEventType.NEW_MESSAGE
        }

        val message = if (json.has("message")) {
            parseMessage(json.getJSONObject("message"))
        } else null

        return RealtimeChatEvent(
            type = type,
            conversationId = json.optString("conversation_id", ""),
            message = message
        )
    }
}
