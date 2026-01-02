package com.eatfair.shared.data.remote

import com.eatfair.shared.config.AppConfig
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Call Service
 * Matches iOS CallService.swift for platform parity
 * Privacy-protected phone calls via Twilio number masking
 */

// Data Models
data class CallSession(
    val id: String,
    val orderId: String? = null,
    val rideId: String? = null,
    val customerId: String,
    val driverId: String? = null,
    val customerMaskedNumber: String,
    val driverMaskedNumber: String? = null,
    val status: CallSessionStatus,
    val expiresAt: Long,
    val createdAt: Long
)

enum class CallSessionStatus {
    ACTIVE,
    EXPIRED,
    CLOSED
}

data class CallLog(
    val id: String,
    val sessionId: String,
    val callerId: String,
    val callerType: CallerType,
    val durationSeconds: Int,
    val status: CallStatus,
    val createdAt: Long
)

enum class CallerType {
    CUSTOMER,
    DRIVER
}

enum class CallStatus {
    INITIATED,
    RINGING,
    IN_PROGRESS,
    COMPLETED,
    FAILED,
    NO_ANSWER,
    BUSY
}

sealed class CallResult<out T> {
    data class Success<T>(val data: T) : CallResult<T>()
    data class Error(val message: String) : CallResult<Nothing>()
}

@Singleton
class CallService @Inject constructor() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    // Use AppConfig for environment-aware URL (production)
    private val baseUrl: String
        get() = AppConfig.API_BASE_URL.removeSuffix("/api")

    /**
     * Create a new call session for an order or ride
     * Returns masked phone numbers for privacy
     */
    suspend fun createCallSession(
        orderId: String? = null,
        rideId: String? = null,
        customerId: String,
        token: String
    ): CallResult<CallSession> {
        return try {
            val json = JSONObject().apply {
                orderId?.let { put("order_id", it) }
                rideId?.let { put("ride_id", it) }
                put("customer_id", customerId)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/api/call/sessions")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val session = parseCallSession(JSONObject(responseBody ?: "{}"))
                CallResult.Success(session)
            } else {
                CallResult.Error("Failed to create call session: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Update call session with driver info
     * Called when driver is assigned to add their masked number
     */
    suspend fun updateCallSession(
        sessionId: String,
        driverId: String,
        token: String
    ): CallResult<CallSession> {
        return try {
            val json = JSONObject().apply {
                put("driver_id", driverId)
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/api/call/sessions/$sessionId")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .put(requestBody)
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val session = parseCallSession(JSONObject(responseBody ?: "{}"))
                CallResult.Success(session)
            } else {
                CallResult.Error("Failed to update call session: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Get call session details
     */
    suspend fun getCallSession(
        sessionId: String,
        token: String
    ): CallResult<CallSession> {
        return try {
            val request = Request.Builder()
                .url("$baseUrl/api/call/sessions/$sessionId")
                .addHeader("Authorization", "Bearer $token")
                .get()
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val session = parseCallSession(JSONObject(responseBody ?: "{}"))
                CallResult.Success(session)
            } else {
                CallResult.Error("Failed to get call session: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Get masked phone number to dial
     * Returns the Twilio proxy number that routes to the other party
     */
    suspend fun getMaskedNumber(
        sessionId: String,
        callerType: CallerType,
        token: String
    ): CallResult<String> {
        return try {
            val request = Request.Builder()
                .url("$baseUrl/api/call/masked-number?session_id=$sessionId&caller_type=${callerType.name.lowercase()}")
                .addHeader("Authorization", "Bearer $token")
                .get()
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val json = JSONObject(responseBody ?: "{}")
                val maskedNumber = json.optString("masked_number", "")
                if (maskedNumber.isNotEmpty()) {
                    CallResult.Success(maskedNumber)
                } else {
                    CallResult.Error("No masked number available")
                }
            } else {
                CallResult.Error("Failed to get masked number: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Log call initiation
     * Called when user taps "Call" button
     */
    suspend fun initiateCall(
        sessionId: String,
        callerType: CallerType,
        token: String
    ): CallResult<CallLog> {
        return try {
            val json = JSONObject().apply {
                put("session_id", sessionId)
                put("caller_type", callerType.name.lowercase())
            }

            val requestBody = json.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/api/call/initiate")
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val callLog = parseCallLog(JSONObject(responseBody ?: "{}"))
                CallResult.Success(callLog)
            } else {
                CallResult.Error("Failed to initiate call: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Get call logs for a session
     */
    suspend fun getCallLogs(
        sessionId: String,
        token: String
    ): CallResult<List<CallLog>> {
        return try {
            val request = Request.Builder()
                .url("$baseUrl/api/call/logs/$sessionId")
                .addHeader("Authorization", "Bearer $token")
                .get()
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val jsonArray = JSONArray(responseBody ?: "[]")
                val logs = mutableListOf<CallLog>()
                for (i in 0 until jsonArray.length()) {
                    logs.add(parseCallLog(jsonArray.getJSONObject(i)))
                }
                CallResult.Success(logs)
            } else {
                CallResult.Error("Failed to get call logs: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * End call session
     * Called when order/ride is completed
     */
    suspend fun endCallSession(
        sessionId: String,
        token: String
    ): CallResult<Unit> {
        return try {
            val request = Request.Builder()
                .url("$baseUrl/api/call/sessions/$sessionId")
                .addHeader("Authorization", "Bearer $token")
                .delete()
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                CallResult.Success(Unit)
            } else {
                CallResult.Error("Failed to end call session: ${response.message}")
            }
        } catch (e: Exception) {
            CallResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Check if call session is still valid
     * Sessions expire after 4 hours
     */
    fun isSessionValid(session: CallSession): Boolean {
        return session.status == CallSessionStatus.ACTIVE &&
                session.expiresAt > System.currentTimeMillis()
    }

    /**
     * Format phone number for display
     * Shows masked format: (***) ***-1234
     */
    fun formatMaskedNumberForDisplay(number: String): String {
        return if (number.length >= 4) {
            "(***) ***-${number.takeLast(4)}"
        } else {
            "(***) ***-****"
        }
    }

    private fun parseCallSession(json: JSONObject): CallSession {
        return CallSession(
            id = json.optString("id", ""),
            orderId = json.optString("order_id", null),
            rideId = json.optString("ride_id", null),
            customerId = json.optString("customer_id", ""),
            driverId = json.optString("driver_id", null),
            customerMaskedNumber = json.optString("customer_masked_number", ""),
            driverMaskedNumber = json.optString("driver_masked_number", null),
            status = CallSessionStatus.valueOf(
                json.optString("status", "ACTIVE").uppercase()
            ),
            expiresAt = json.optLong("expires_at", System.currentTimeMillis() + 14400000), // 4 hours
            createdAt = json.optLong("created_at", System.currentTimeMillis())
        )
    }

    private fun parseCallLog(json: JSONObject): CallLog {
        return CallLog(
            id = json.optString("id", ""),
            sessionId = json.optString("session_id", ""),
            callerId = json.optString("caller_id", ""),
            callerType = CallerType.valueOf(
                json.optString("caller_type", "CUSTOMER").uppercase()
            ),
            durationSeconds = json.optInt("duration_seconds", 0),
            status = CallStatus.valueOf(
                json.optString("status", "INITIATED").uppercase()
            ),
            createdAt = json.optLong("created_at", System.currentTimeMillis())
        )
    }
}
