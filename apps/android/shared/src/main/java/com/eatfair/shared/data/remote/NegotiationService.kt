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
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Negotiation Service
 * Matches iOS NegotiationService.swift for platform parity
 * Real-time price negotiation via WebSocket
 */

// Data Models
data class Negotiation(
    val id: String,
    val orderId: String? = null,
    val rideId: String? = null,
    val customerId: String,
    val driverId: String? = null,
    val suggestedPrice: Double,
    val currentPrice: Double,
    val customerOffer: Double? = null,
    val driverOffer: Double? = null,
    val platformFee: Double,
    val status: NegotiationStatus,
    val createdAt: Long,
    val expiresAt: Long
)

enum class NegotiationStatus {
    PENDING,
    CUSTOMER_OFFERED,
    DRIVER_OFFERED,
    ACCEPTED,
    REJECTED,
    EXPIRED,
    CANCELLED
}

data class NegotiationEvent(
    val type: NegotiationEventType,
    val negotiationId: String,
    val data: Map<String, Any>
)

enum class NegotiationEventType {
    PRICE_UPDATE,
    CUSTOMER_OFFER,
    DRIVER_OFFER,
    ACCEPTED,
    REJECTED,
    EXPIRED,
    ERROR
}

data class CreateNegotiationRequest(
    val orderId: String? = null,
    val rideId: String? = null,
    val customerId: String,
    val pickupLat: Double,
    val pickupLng: Double,
    val dropoffLat: Double,
    val dropoffLng: Double,
    val estimatedDistance: Double,
    val estimatedDuration: Int
)

data class CounterOfferRequest(
    val negotiationId: String,
    val offeredPrice: Double
)

sealed class NegotiationResult<out T> {
    data class Success<T>(val data: T) : NegotiationResult<T>()
    data class Error(val message: String) : NegotiationResult<Nothing>()
}

@Singleton
class NegotiationService @Inject constructor() {

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

    private val _negotiationEvents = MutableSharedFlow<NegotiationEvent>()
    val negotiationEvents: Flow<NegotiationEvent> = _negotiationEvents

    private val _currentNegotiation = MutableStateFlow<Negotiation?>(null)
    val currentNegotiation: StateFlow<Negotiation?> = _currentNegotiation.asStateFlow()

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        ERROR
    }

    /**
     * Create a new negotiation session
     */
    suspend fun createNegotiation(
        request: CreateNegotiationRequest,
        token: String
    ): NegotiationResult<Negotiation> {
        return try {
            val json = JSONObject().apply {
                request.orderId?.let { put("order_id", it) }
                request.rideId?.let { put("ride_id", it) }
                put("customer_id", request.customerId)
                put("pickup_lat", request.pickupLat)
                put("pickup_lng", request.pickupLng)
                put("dropoff_lat", request.dropoffLat)
                put("dropoff_lng", request.dropoffLng)
                put("estimated_distance", request.estimatedDistance)
                put("estimated_duration", request.estimatedDuration)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val httpRequest = Request.Builder()
                .url("$baseUrl/api/negotiations")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(httpRequest).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val negotiation = parseNegotiation(JSONObject(responseBody ?: "{}"))
                _currentNegotiation.value = negotiation
                NegotiationResult.Success(negotiation)
            } else {
                NegotiationResult.Error("Failed to create negotiation: ${response.message}")
            }
        } catch (e: Exception) {
            NegotiationResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Submit customer counter-offer
     */
    suspend fun submitCustomerOffer(
        negotiationId: String,
        offeredPrice: Double,
        token: String
    ): NegotiationResult<Negotiation> {
        return try {
            val json = JSONObject().apply {
                put("offered_price", offeredPrice)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val httpRequest = Request.Builder()
                .url("$baseUrl/api/negotiations/$negotiationId/customer-offer")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(httpRequest).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val negotiation = parseNegotiation(JSONObject(responseBody ?: "{}"))
                _currentNegotiation.value = negotiation
                NegotiationResult.Success(negotiation)
            } else {
                NegotiationResult.Error("Failed to submit offer: ${response.message}")
            }
        } catch (e: Exception) {
            NegotiationResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Submit driver counter-offer
     */
    suspend fun submitDriverOffer(
        negotiationId: String,
        offeredPrice: Double,
        token: String
    ): NegotiationResult<Negotiation> {
        return try {
            val json = JSONObject().apply {
                put("offered_price", offeredPrice)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val httpRequest = Request.Builder()
                .url("$baseUrl/api/negotiations/$negotiationId/driver-offer")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(httpRequest).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val negotiation = parseNegotiation(JSONObject(responseBody ?: "{}"))
                _currentNegotiation.value = negotiation
                NegotiationResult.Success(negotiation)
            } else {
                NegotiationResult.Error("Failed to submit offer: ${response.message}")
            }
        } catch (e: Exception) {
            NegotiationResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Accept current negotiated price
     */
    suspend fun acceptNegotiation(
        negotiationId: String,
        token: String
    ): NegotiationResult<Negotiation> {
        return try {
            val httpRequest = Request.Builder()
                .url("$baseUrl/api/negotiations/$negotiationId/accept")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post("".toRequestBody(null))
                .build()

            val response = client.newCall(httpRequest).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val negotiation = parseNegotiation(JSONObject(responseBody ?: "{}"))
                _currentNegotiation.value = negotiation
                NegotiationResult.Success(negotiation)
            } else {
                NegotiationResult.Error("Failed to accept: ${response.message}")
            }
        } catch (e: Exception) {
            NegotiationResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    fun connectWebSocket(negotiationId: String, token: String) {
        _connectionState.value = ConnectionState.CONNECTING

        val request = Request.Builder()
            .url("$wsUrl/ws/negotiation/$negotiationId")
            .addHeader("Authorization", "Bearer $token")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connectionState.value = ConnectionState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val event = parseNegotiationEvent(json)
                    _negotiationEvents.tryEmit(event)

                    // Update current negotiation if data is present
                    if (json.has("negotiation")) {
                        val negotiation = parseNegotiation(json.getJSONObject("negotiation"))
                        _currentNegotiation.value = negotiation
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
     * Disconnect WebSocket
     */
    fun disconnectWebSocket() {
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    /**
     * Calculate platform fee based on tiered pricing
     * $1 for fares ≤ $35
     * $2 for fares $35-$70
     * $3 for fares > $70
     */
    fun calculatePlatformFee(fare: Double): Double {
        return when {
            fare <= 35.0 -> 1.0
            fare <= 70.0 -> 2.0
            else -> 3.0
        }
    }

    /**
     * Generate quick offer options (60%, 70%, 80%, 90% of suggested price)
     */
    fun getQuickOfferOptions(suggestedPrice: Double): List<Double> {
        return listOf(0.6, 0.7, 0.8, 0.9).map { percentage ->
            Math.round(suggestedPrice * percentage * 100) / 100.0
        }
    }

    private fun parseNegotiation(json: JSONObject): Negotiation {
        return Negotiation(
            id = json.optString("id", ""),
            orderId = json.optString("order_id", null),
            rideId = json.optString("ride_id", null),
            customerId = json.optString("customer_id", ""),
            driverId = json.optString("driver_id", null),
            suggestedPrice = json.optDouble("suggested_price", 0.0),
            currentPrice = json.optDouble("current_price", 0.0),
            customerOffer = if (json.has("customer_offer")) json.optDouble("customer_offer") else null,
            driverOffer = if (json.has("driver_offer")) json.optDouble("driver_offer") else null,
            platformFee = json.optDouble("platform_fee", 1.0),
            status = NegotiationStatus.valueOf(
                json.optString("status", "PENDING").uppercase()
            ),
            createdAt = json.optLong("created_at", System.currentTimeMillis()),
            expiresAt = json.optLong("expires_at", System.currentTimeMillis() + 300000)
        )
    }

    private fun parseNegotiationEvent(json: JSONObject): NegotiationEvent {
        val typeString = json.optString("type", "PRICE_UPDATE")
        val type = try {
            NegotiationEventType.valueOf(typeString.uppercase())
        } catch (e: Exception) {
            NegotiationEventType.PRICE_UPDATE
        }

        val data = mutableMapOf<String, Any>()
        json.keys().forEach { key ->
            if (key != "type" && key != "negotiation_id") {
                data[key] = json.get(key)
            }
        }

        return NegotiationEvent(
            type = type,
            negotiationId = json.optString("negotiation_id", ""),
            data = data
        )
    }
}
