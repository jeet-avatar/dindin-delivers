package com.eatfair.app.data

import android.util.Log
import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.model.rideshare.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * CustomerRideshareApiService - API client for customer rideshare functionality
 * MATCHES iOS P2PAPIService pattern exactly:
 * - Uses SecureStorage for tokens (like iOS SecureStorage.shared)
 * - Adds Bearer token auth headers on authenticated endpoints
 * - Uses AppConfig for environment-aware API URLs
 *
 * PRODUCTION ENDPOINTS (api.dollor.ai):
 * - POST /api/rides/request - Create ride request
 * - GET /api/rides/customer/{customer_id}/requests - Get customer's ride requests
 * - GET /api/rides/request/{request_id}/bids - Get bids for a ride
 * - POST /api/rides/bid/{bid_id}/respond - Respond to bid (accept/reject/counter)
 * - POST /api/rides/request/{request_id}/cancel - Cancel ride request
 * - GET /api/rides/{ride_id}/track - Track ride
 * - POST /api/rides/estimate - Get fare estimate (public - no auth)
 * - GET /api/chat/messages/{ride_id} - Get chat messages
 * - POST /api/erp/rides/{rideId}/customer-negotiate - Customer fare negotiation
 * - POST /api/erp/rides/{rideId}/customer-accept-fare - Accept driver fare
 */
object CustomerRideshareApiService {

    private const val TAG = "CustomerRideshareAPI"

    // Use AppConfig for environment-aware URL - matches iOS
    private val BASE_URL: String
        get() = AppConfig.apiBaseUrl.removeSuffix("/api")

    // SecureStorage reference - set during app initialization
    // Matches iOS pattern: SecureStorage.shared
    private var _secureStorage: SecureStorage? = null

    /**
     * Initialize with SecureStorage instance
     * Call from Application.onCreate() or DI setup
     * Matches iOS P2PAPIService.init() pattern
     */
    fun initialize(secureStorage: SecureStorage) {
        _secureStorage = secureStorage
        Log.d(TAG, "Initialized with SecureStorage")
    }

    // ==========================================
    // SECURE TOKEN ACCESS (Matches iOS exactly)
    // ==========================================

    /** Get customer access token from secure storage - matches iOS customerToken */
    private val customerToken: String?
        get() = _secureStorage?.customerToken

    /** Get customer ID from secure storage - matches iOS currentCustomerId */
    private val currentCustomerId: Int?
        get() = _secureStorage?.customerId?.takeIf { it > 0 }

    /** Check if customer is authenticated */
    val isAuthenticated: Boolean
        get() = customerToken != null && currentCustomerId != null

    // Pricing constants from shared AppConfig (matches iOS AppConfig.Rideshare)
    val BASE_FARE get() = AppConfig.Rideshare.BASE_FARE
    val PER_MILE_RATE get() = AppConfig.Rideshare.PER_MILE_RATE
    val PER_MINUTE_RATE get() = AppConfig.Rideshare.PER_MINUTE_RATE
    val MINIMUM_FARE get() = AppConfig.Rideshare.MINIMUM_FARE

    // Platform fee tiers from shared AppConfig
    val TIER_1_MAX_FARE get() = AppConfig.Rideshare.TIER_1_MAX_FARE
    val TIER_2_MAX_FARE get() = AppConfig.Rideshare.TIER_2_MAX_FARE
    val TIER_1_FEE get() = AppConfig.Rideshare.TIER_1_FEE
    val TIER_2_FEE get() = AppConfig.Rideshare.TIER_2_FEE
    val TIER_3_FEE get() = AppConfig.Rideshare.TIER_3_FEE

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    /**
     * Add auth header to request - matches iOS pattern:
     * if let token = customerToken {
     *     request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
     * }
     */
    private fun Request.Builder.withCustomerAuth(): Request.Builder {
        customerToken?.let { token ->
            addHeader("Authorization", "Bearer $token")
        }
        return this
    }

    // ==========================================
    // RIDE REQUEST APIs
    // ==========================================

    /**
     * Create a new ride request
     * Matches iOS: P2PAPIService.requestRide()
     * Production: POST /api/rides/request
     *
     * Required fields per OpenAPI spec:
     * - customer_id: Int
     * - pickup_address: String
     * - pickup_latitude: Double
     * - pickup_longitude: Double
     * - dropoff_address: String
     * - dropoff_latitude: Double
     * - dropoff_longitude: Double
     */
    suspend fun createRideRequest(
        pickup: RideLocation,
        dropoff: RideLocation,
        customerName: String,
        customerPhone: String?,
        specialRequests: String?,
        suggestedPrice: Double?
    ): Result<CreateRideResponse> = withContext(Dispatchers.IO) {
        try {
            val customerId = currentCustomerId
                ?: return@withContext Result.failure(Exception("Customer not logged in - please login first"))

            // Build request body matching production API schema (flat structure)
            // Matches iOS P2PAPIService.requestRide() body structure
            val requestBody = mutableMapOf<String, Any?>(
                "customer_id" to customerId,
                "pickup_address" to (pickup.address ?: "Pickup Location"),
                "pickup_latitude" to pickup.latitude,
                "pickup_longitude" to pickup.longitude,
                "dropoff_address" to (dropoff.address ?: "Dropoff Location"),
                "dropoff_latitude" to dropoff.latitude,
                "dropoff_longitude" to dropoff.longitude,
                "ride_type" to "standard",
                "bidding_duration_minutes" to 5
            )

            // Add optional fields
            if (!specialRequests.isNullOrBlank()) {
                requestBody["special_requests"] = specialRequests
            }
            if (suggestedPrice != null && suggestedPrice > 0) {
                requestBody["customer_preferred_price"] = suggestedPrice
            }

            Log.d(TAG, "Creating ride request for customer $customerId")

            val request = Request.Builder()
                .url("$BASE_URL/api/rides/request")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val createResponse = gson.fromJson(responseBody, CreateRideResponse::class.java)
                Log.d(TAG, "Ride request created successfully: ${createResponse.rideRequestId}")
                Result.success(createResponse)
            } else {
                Log.e(TAG, "Failed to create ride request: ${response.code} - $responseBody")
                Result.failure(Exception("Failed to create ride request: ${response.code} - ${responseBody ?: ""}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception creating ride request", e)
            Result.failure(e)
        }
    }

    /**
     * Get customer's active ride requests
     * Matches iOS: fetching customer rides
     * Production: GET /api/rides/customer/{customer_id}/requests
     */
    suspend fun getMyRideRequests(): Result<List<CustomerRideRequest>> = withContext(Dispatchers.IO) {
        try {
            val customerId = currentCustomerId
                ?: return@withContext Result.failure(Exception("Customer not logged in"))

            val request = Request.Builder()
                .url("$BASE_URL/api/rides/customer/$customerId/requests")
                .get()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val type = object : TypeToken<List<CustomerRideRequest>>() {}.type
                val requests: List<CustomerRideRequest> = gson.fromJson(responseBody, type)
                Result.success(requests)
            } else {
                Result.failure(Exception("Failed to fetch ride requests: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get bids for a specific ride request
     * Production: GET /api/rides/request/{request_id}/bids
     */
    suspend fun getBidsForRide(rideRequestId: Int): Result<List<DriverBidForCustomer>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/request/$rideRequestId/bids")
                .get()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val type = object : TypeToken<List<DriverBidForCustomer>>() {}.type
                val bids: List<DriverBidForCustomer> = gson.fromJson(responseBody, type)
                Result.success(bids)
            } else {
                Result.failure(Exception("Failed to fetch bids: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Accept a driver's bid
     * Matches iOS bid acceptance flow
     * Production: POST /api/rides/bid/{bid_id}/respond with action="accept"
     */
    suspend fun acceptBid(bidId: Int): Result<CounterOfferResponse> = withContext(Dispatchers.IO) {
        try {
            val requestBody = mapOf("action" to "accept")

            Log.d(TAG, "Accepting bid $bidId")

            val request = Request.Builder()
                .url("$BASE_URL/api/rides/bid/$bidId/respond")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val counterResponse = gson.fromJson(responseBody, CounterOfferResponse::class.java)
                Log.d(TAG, "Bid accepted successfully")
                Result.success(counterResponse)
            } else {
                Log.e(TAG, "Failed to accept bid: ${response.code}")
                Result.failure(Exception("Failed to accept bid: ${response.code}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception accepting bid", e)
            Result.failure(e)
        }
    }

    /**
     * Reject a driver's bid
     * Production: POST /api/rides/bid/{bid_id}/respond with action="reject"
     */
    suspend fun rejectBid(bidId: Int): Result<CounterOfferResponse> = withContext(Dispatchers.IO) {
        try {
            val requestBody = mapOf("action" to "reject")

            val request = Request.Builder()
                .url("$BASE_URL/api/rides/bid/$bidId/respond")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val counterResponse = gson.fromJson(responseBody, CounterOfferResponse::class.java)
                Result.success(counterResponse)
            } else {
                Result.failure(Exception("Failed to reject bid: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Counter a driver's bid with a new price
     * Matches iOS: respondToCounterOffer with action="counter"
     * Production: POST /api/rides/bid/{bid_id}/respond with action="counter"
     */
    suspend fun counterBid(
        bidId: Int,
        counterPrice: Double,
        message: String?
    ): Result<CounterOfferResponse> = withContext(Dispatchers.IO) {
        try {
            val requestBody = mutableMapOf<String, Any?>(
                "action" to "counter",
                "counter_price" to counterPrice
            )
            if (!message.isNullOrBlank()) {
                requestBody["message"] = message
            }

            Log.d(TAG, "Countering bid $bidId with price $counterPrice")

            val request = Request.Builder()
                .url("$BASE_URL/api/rides/bid/$bidId/respond")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val counterResponse = gson.fromJson(responseBody, CounterOfferResponse::class.java)
                Log.d(TAG, "Counter offer sent successfully")
                Result.success(counterResponse)
            } else {
                Log.e(TAG, "Failed to counter bid: ${response.code}")
                Result.failure(Exception("Failed to counter bid: ${response.code}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception countering bid", e)
            Result.failure(e)
        }
    }

    /**
     * Customer fare negotiation - submit counter offer
     * Matches iOS: P2PAPIService.customerSubmitFareOffer()
     * Production: POST /api/erp/rides/{rideId}/customer-negotiate?proposed_fare={fare}
     */
    suspend fun customerSubmitFareOffer(
        rideId: Int,
        proposedFare: Double
    ): Result<FareNegotiationResponse> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Submitting fare offer $proposedFare for ride $rideId")

            // Backend expects proposed_fare as query parameter (matches iOS exactly)
            val request = Request.Builder()
                .url("$BASE_URL/api/erp/rides/$rideId/customer-negotiate?proposed_fare=$proposedFare")
                .post("".toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val fareResponse = gson.fromJson(responseBody, FareNegotiationResponse::class.java)
                Log.d(TAG, "Fare offer submitted successfully")
                Result.success(fareResponse)
            } else {
                Log.e(TAG, "Failed to submit fare offer: ${response.code}")
                Result.failure(Exception("Failed to submit fare offer: ${response.code}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception submitting fare offer", e)
            Result.failure(e)
        }
    }

    /**
     * Customer accepts driver's fare offer
     * Matches iOS: P2PAPIService.customerAcceptDriverFare()
     * Production: POST /api/erp/rides/{rideId}/customer-accept-fare?accepted_fare={fare}
     */
    suspend fun customerAcceptDriverFare(
        rideId: Int,
        acceptedFare: Double
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Accepting driver fare $acceptedFare for ride $rideId")

            // Backend expects accepted_fare as query parameter (matches iOS exactly)
            val request = Request.Builder()
                .url("$BASE_URL/api/erp/rides/$rideId/customer-accept-fare?accepted_fare=$acceptedFare")
                .post("".toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                Log.d(TAG, "Driver fare accepted successfully")
                Result.success(Unit)
            } else {
                Log.e(TAG, "Failed to accept driver fare: ${response.code}")
                Result.failure(Exception("Failed to accept fare: ${response.code}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception accepting driver fare", e)
            Result.failure(e)
        }
    }

    /**
     * Get negotiation status for a ride
     * Matches iOS: P2PAPIService.getRideNegotiationStatus()
     * Production: GET /api/erp/rides/{rideId}/negotiation-status
     */
    suspend fun getRideNegotiationStatus(rideId: Int): Result<NegotiationStatusResponse> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/erp/rides/$rideId/negotiation-status")
                .get()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val statusResponse = gson.fromJson(responseBody, NegotiationStatusResponse::class.java)
                Result.success(statusResponse)
            } else {
                Result.failure(Exception("Failed to get negotiation status: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Cancel a ride request
     * Matches iOS: P2PAPIService.cancelRide()
     * Production: POST /api/rides/request/{request_id}/cancel
     */
    suspend fun cancelRideRequest(rideRequestId: Int, reason: String? = null): Result<RideStatusResponse> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Cancelling ride request $rideRequestId")

            val requestBody = mutableMapOf<String, Any>("ride_id" to rideRequestId)
            if (!reason.isNullOrBlank()) {
                requestBody["reason"] = reason
            }

            val request = Request.Builder()
                .url("$BASE_URL/api/rides/request/$rideRequestId/cancel")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val statusResponse = gson.fromJson(responseBody, RideStatusResponse::class.java)
                Log.d(TAG, "Ride cancelled successfully")
                Result.success(statusResponse)
            } else {
                Log.e(TAG, "Failed to cancel ride: ${response.code}")
                Result.failure(Exception("Failed to cancel ride: ${response.code}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception cancelling ride", e)
            Result.failure(e)
        }
    }

    // ==========================================
    // RIDE TRACKING APIs
    // ==========================================

    /**
     * Get active ride tracking info
     * Matches iOS: P2PAPIService.trackMyRide()
     * Production: GET /api/rides/{ride_id}/track
     */
    suspend fun trackRide(rideRequestId: Int): Result<CustomerRideTracking> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/$rideRequestId/track")
                .get()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val tracking = gson.fromJson(responseBody, CustomerRideTracking::class.java)
                Result.success(tracking)
            } else {
                Result.failure(Exception("Failed to get tracking: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // CHAT APIs (Matches iOS P2PAPIService)
    // ==========================================

    /**
     * Fetch chat messages for a ride
     * Matches iOS: P2PAPIService.fetchRideChatMessages()
     * Production: GET /api/p2p/ride-requests/{id}/chat
     */
    suspend fun fetchChatMessages(rideRequestId: Int): Result<List<RideChatMessage>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/p2p/ride-requests/$rideRequestId/chat")
                .get()
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val type = object : TypeToken<List<RideChatMessage>>() {}.type
                val messages: List<RideChatMessage> = gson.fromJson(responseBody, type)
                Result.success(messages)
            } else {
                // Chat may not be available for rides - return empty list (matches iOS)
                Result.success(emptyList())
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Send a chat message
     * Matches iOS: P2PAPIService.sendRideChatMessage()
     * Production: POST /api/p2p/ride-requests/{id}/chat
     */
    suspend fun sendChatMessage(
        rideRequestId: Int,
        message: String
    ): Result<RideChatMessage> = withContext(Dispatchers.IO) {
        try {
            val requestBody = mapOf(
                "message" to message,
                "sender_type" to "customer"
            )

            val request = Request.Builder()
                .url("$BASE_URL/api/p2p/ride-requests/$rideRequestId/chat")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val chatMessage = gson.fromJson(responseBody, RideChatMessage::class.java)
                Result.success(chatMessage)
            } else {
                Result.failure(Exception("Failed to send message: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // FARE ESTIMATE API (Public - No Auth)
    // ==========================================

    /**
     * Fare estimate response from API
     */
    data class FareEstimateResponse(
        val estimate: FareEstimate
    )

    data class FareEstimate(
        val distanceMiles: Double,
        val durationMinutes: Int,
        val breakdown: FareBreakdown,
        val total: Double,
        val platformFee: Double,
        val tier: Int
    )

    data class FareBreakdown(
        val baseFare: Double,
        val distanceCost: Double,
        val timeCost: Double
    )

    /**
     * Get fare estimate from backend API (uses real driving distance)
     * Matches iOS: P2PAPIService.estimateRideFare()
     * PUBLIC ENDPOINT - No auth required
     * Production: POST /api/rides/estimate
     *
     * Required fields per OpenAPI FareEstimateInput schema:
     * - pickup_latitude: Double
     * - pickup_longitude: Double
     * - dropoff_latitude: Double
     * - dropoff_longitude: Double
     */
    suspend fun getFareEstimate(
        pickupLat: Double,
        pickupLng: Double,
        dropoffLat: Double,
        dropoffLng: Double,
        stateCode: String = "CA"
    ): Result<FareEstimateResponse> = withContext(Dispatchers.IO) {
        try {
            // Use full field names per production OpenAPI spec
            val requestBody = mapOf(
                "pickup_latitude" to pickupLat,
                "pickup_longitude" to pickupLng,
                "dropoff_latitude" to dropoffLat,
                "dropoff_longitude" to dropoffLng,
                "ride_type" to "standard"
            )

            // Public endpoint - no auth needed (matches iOS)
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/estimate")
                .post(gson.toJson(requestBody).toRequestBody(jsonMediaType))
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val fareResponse = gson.fromJson(responseBody, FareEstimateResponse::class.java)
                Result.success(fareResponse)
            } else {
                Result.failure(Exception("Failed to get fare estimate: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // LOCAL FARE CALCULATION (Fallback)
    // Matches iOS AppConfig.Rideshare calculations
    // ==========================================

    /**
     * Calculate estimated fare based on distance and duration (fallback if API fails)
     * Matches iOS: AppConfig.Rideshare.calculateFare()
     */
    fun calculateEstimatedFare(distanceKm: Double, durationMinutes: Int): Double {
        val distanceMiles = distanceKm * 0.621371
        val distanceFee = distanceMiles * PER_MILE_RATE
        val timeFee = durationMinutes * PER_MINUTE_RATE
        val fare = BASE_FARE + distanceFee + timeFee
        return maxOf(fare, MINIMUM_FARE)
    }

    /**
     * Calculate tiered platform fee based on fare amount
     * Matches iOS: AppConfig.Rideshare.calculatePlatformFee()
     *
     * Tier pricing:
     * - Up to $35 fare: $1 rider + $1 driver
     * - $35.01 - $70 fare: $2 rider + $2 driver
     * - Above $70 fare: $3 rider + $3 driver
     */
    fun calculatePlatformFee(fare: Double): Double {
        return when {
            fare <= TIER_1_MAX_FARE -> TIER_1_FEE
            fare <= TIER_2_MAX_FARE -> TIER_2_FEE
            else -> TIER_3_FEE
        }
    }

    /**
     * Get tier number for display (1, 2, or 3)
     * Matches iOS: AppConfig.Rideshare.getTier()
     */
    fun getTier(fare: Double): Int {
        return when {
            fare <= TIER_1_MAX_FARE -> 1
            fare <= TIER_2_MAX_FARE -> 2
            else -> 3
        }
    }

    /**
     * Get tier name for display
     * Matches iOS: AppConfig.Rideshare.getTierName()
     */
    fun getTierName(fare: Double): String {
        return when {
            fare <= TIER_1_MAX_FARE -> "Tier 1 (up to $35)"
            fare <= TIER_2_MAX_FARE -> "Tier 2 ($35-$70)"
            else -> "Tier 3 (above $70)"
        }
    }

    /**
     * Calculate total with platform fee
     * Matches iOS: AppConfig.Rideshare.calculateRiderTotal()
     */
    fun calculateTotal(fare: Double): Double {
        return fare + calculatePlatformFee(fare)
    }

    /**
     * Calculate driver earnings (driver pays same platform fee)
     * Matches iOS: AppConfig.Rideshare.calculateDriverEarnings()
     */
    fun calculateDriverEarnings(fare: Double): Double {
        return maxOf(0.0, fare - calculatePlatformFee(fare))
    }

    /**
     * Calculate driver's percentage of total payment
     * Matches iOS calculation for transparency display
     */
    fun calculateDriverPercentage(fare: Double): Double {
        val platformFee = calculatePlatformFee(fare)
        val totalPayment = fare + platformFee
        val driverEarnings = fare - platformFee
        return (driverEarnings / totalPayment) * 100
    }

    /**
     * Get platform fee percentage for display
     * Shows how much of the fare the platform takes
     * Matches iOS: AppConfig.Rideshare.getPlatformFeePercentage()
     */
    fun getPlatformFeePercentage(fare: Double): Double {
        val fee = calculatePlatformFee(fare)
        return if (fare > 0) (fee / fare) * 100.0 else 0.0
    }
}

/**
 * Negotiation status response - matches iOS FareNegotiationResponse
 */
data class NegotiationStatusResponse(
    val success: Boolean = false,
    val status: String? = null,
    val currentFare: Double? = null,
    val customerOffer: Double? = null,
    val driverOffer: Double? = null,
    val message: String? = null
)

/**
 * Fare negotiation response - matches iOS FareNegotiationResponse
 */
data class FareNegotiationResponse(
    val success: Boolean = false,
    val message: String? = null,
    val negotiationId: Int? = null,
    val status: String? = null,
    val proposedFare: Double? = null,
    val acceptedFare: Double? = null
)
