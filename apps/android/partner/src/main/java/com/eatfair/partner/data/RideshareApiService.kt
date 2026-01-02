package com.eatfair.partner.data

import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.model.rideshare.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.util.concurrent.TimeUnit

/**
 * RideshareApiService - API client for P2P rideshare bidding (Driver/Partner App)
 * Uses AppConfig for environment-aware API URLs (production)
 *
 * PRODUCTION ENDPOINTS (api.dollor.ai):
 * - GET /api/rides/available - Get available ride requests
 * - GET /api/rides/driver/{driver_id}/bids - Get driver's bids
 * - POST /api/rides/request/{request_id}/bid - Submit bid on ride
 * - POST /api/rides/bid/{bid_id}/withdraw - Withdraw a bid
 * - POST /api/rides/bid/{bid_id}/respond - Respond to counter-offer
 * - POST /api/rides/request/{request_id}/start - Start ride
 * - POST /api/rides/request/{request_id}/complete - Complete ride
 */
object RideshareApiService {

    // Use AppConfig for environment-aware URL - production URL
    private val BASE_URL: String
        get() = AppConfig.API_BASE_URL.removeSuffix("/api")

    // Platform fee from shared AppConfig (Tier 1 default)
    val PLATFORM_FEE get() = AppConfig.Rideshare.TIER_1_FEE

    private val gson = Gson()
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    // Current driver ID - should be set after login
    var currentDriverId: Int? = null
    var currentDriverEmail: String? = null

    /**
     * Fetch available ride requests open for bidding
     * Production: GET /api/rides/available
     *
     * Required query params per OpenAPI spec:
     * - driver_id: Int (required)
     * - latitude: Double (optional, for distance calculation)
     * - longitude: Double (optional, for distance calculation)
     */
    suspend fun fetchAvailableRideRequests(
        latitude: Double,
        longitude: Double
    ): Result<List<RideRequestForBidding>> = withContext(Dispatchers.IO) {
        try {
            val driverId = currentDriverId
                ?: return@withContext Result.failure(Exception("Driver not logged in"))

            val url = "$BASE_URL/api/rides/available?driver_id=$driverId&latitude=$latitude&longitude=$longitude"

            val request = Request.Builder()
                .url(url)
                .get()
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                // Parse the response - may be wrapped in {success, available_requests} or just array
                val type = object : TypeToken<List<RideRequestForBidding>>() {}.type
                val requests: List<RideRequestForBidding> = try {
                    // Try direct array first
                    gson.fromJson(body, type) ?: emptyList()
                } catch (e: Exception) {
                    // Try wrapped response
                    val wrapped = gson.fromJson(body, AvailableRidesResponse::class.java)
                    wrapped?.availableRequests ?: emptyList()
                }
                Result.success(requests)
            } else {
                Result.failure(Exception("Failed to fetch requests: ${response.code} - $body"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Response wrapper for available rides
    private data class AvailableRidesResponse(
        val success: Boolean = false,
        @com.google.gson.annotations.SerializedName("available_requests")
        val availableRequests: List<RideRequestForBidding> = emptyList()
    )

    /**
     * Fetch driver's submitted bids
     * Production: GET /api/rides/driver/{driver_id}/bids
     */
    suspend fun fetchDriverBids(): Result<List<RideBid>> = withContext(Dispatchers.IO) {
        try {
            val driverId = currentDriverId ?: return@withContext Result.failure(Exception("Not logged in"))
            val url = "$BASE_URL/api/rides/driver/$driverId/bids"

            val request = Request.Builder()
                .url(url)
                .get()
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val type = object : TypeToken<List<RideBid>>() {}.type
                val bids: List<RideBid> = gson.fromJson(body, type) ?: emptyList()
                Result.success(bids)
            } else {
                Result.failure(Exception("Failed to fetch bids: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Submit a bid on a ride request
     * Production: POST /api/rides/request/{request_id}/bid
     */
    suspend fun submitBid(
        requestId: Int,
        proposedPrice: Double,
        estimatedArrivalMinutes: Int,
        message: String?
    ): Result<SubmitBidResponse> = withContext(Dispatchers.IO) {
        try {
            val driverId = currentDriverId ?: return@withContext Result.failure(Exception("Not logged in"))
            val url = "$BASE_URL/api/rides/request/$requestId/bid"

            val jsonBody = gson.toJson(mapOf(
                "driver_id" to driverId,
                "proposed_price" to proposedPrice,
                "estimated_arrival_minutes" to estimatedArrivalMinutes,
                "message" to message
            ))

            val request = Request.Builder()
                .url(url)
                .post(jsonBody.toRequestBody(JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val submitResponse = gson.fromJson(body, SubmitBidResponse::class.java)
                    ?: SubmitBidResponse(true, "Bid submitted successfully")
                Result.success(submitResponse)
            } else {
                Result.failure(Exception("Failed to submit bid: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Withdraw a pending bid
     * Production: POST /api/rides/bid/{bid_id}/withdraw
     */
    suspend fun withdrawBid(bidId: Int): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL/api/rides/bid/$bidId/withdraw"

            val request = Request.Builder()
                .url(url)
                .post("{}".toRequestBody(JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to withdraw bid: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Respond to customer's counter-offer
     * Production: POST /api/rides/bid/{bid_id}/respond
     * @param action: "accept", "reject", or "counter"
     */
    suspend fun respondToCounterOffer(
        bidId: Int,
        action: String,
        counterPrice: Double?
    ): Result<CounterOfferResponse> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL/api/rides/bid/$bidId/respond"

            val jsonBody = gson.toJson(mapOf(
                "action" to action,
                "counter_price" to counterPrice
            ))

            val request = Request.Builder()
                .url(url)
                .post(jsonBody.toRequestBody(JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val counterResponse = gson.fromJson(body, CounterOfferResponse::class.java)
                    ?: CounterOfferResponse(true, "Response sent successfully")
                Result.success(counterResponse)
            } else {
                Result.failure(Exception("Failed to respond: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Start a matched ride (picked up passenger)
     * Production: POST /api/rides/request/{request_id}/start
     */
    suspend fun startRide(rideRequestId: Int): Result<RideStatusResponse> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL/api/rides/request/$rideRequestId/start"

            val request = Request.Builder()
                .url(url)
                .post("{}".toRequestBody(JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val statusResponse = gson.fromJson(body, RideStatusResponse::class.java)
                    ?: RideStatusResponse(true, "Ride started")
                Result.success(statusResponse)
            } else {
                Result.failure(Exception("Failed to start ride: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Complete a ride (dropped off passenger)
     * Production: POST /api/rides/request/{request_id}/complete
     */
    suspend fun completeRide(rideRequestId: Int): Result<RideStatusResponse> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL/api/rides/request/$rideRequestId/complete"

            val request = Request.Builder()
                .url(url)
                .post("{}".toRequestBody(JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val statusResponse = gson.fromJson(body, RideStatusResponse::class.java)
                    ?: RideStatusResponse(true, "Ride completed")
                Result.success(statusResponse)
            } else {
                Result.failure(Exception("Failed to complete ride: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Fetch chat messages for a ride
     * Production: GET /api/chat/messages/{ride_id}
     */
    suspend fun fetchChatMessages(rideRequestId: Int): Result<List<RideChatMessage>> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL/api/chat/messages/$rideRequestId"

            val request = Request.Builder()
                .url(url)
                .get()
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val type = object : TypeToken<List<RideChatMessage>>() {}.type
                val messages: List<RideChatMessage> = gson.fromJson(body, type) ?: emptyList()
                Result.success(messages)
            } else {
                // Chat may not be available for rides - return empty list
                Result.success(emptyList())
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Send a chat message
     * Production: POST /api/chat/messages/{ride_id}
     */
    suspend fun sendChatMessage(
        rideRequestId: Int,
        message: String
    ): Result<RideChatMessage> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL/api/chat/messages/$rideRequestId"

            val jsonBody = gson.toJson(mapOf(
                "sender_type" to "driver",
                "message" to message
            ))

            val request = Request.Builder()
                .url(url)
                .post(jsonBody.toRequestBody(JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val chatMessage = gson.fromJson(body, RideChatMessage::class.java)
                Result.success(chatMessage)
            } else {
                Result.failure(Exception("Failed to send message: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Calculate driver earnings after platform fee
     */
    fun calculateEarnings(proposedPrice: Double): Double {
        return maxOf(0.0, proposedPrice - PLATFORM_FEE)
    }
}
