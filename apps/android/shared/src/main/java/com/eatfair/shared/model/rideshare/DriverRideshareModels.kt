package com.eatfair.shared.model.rideshare

import com.google.gson.annotations.SerializedName

/**
 * Driver-side rideshare request/response models that map to the REAL backend
 * (bid_routes.py, prefix /api/rides, and main_new.py). These replace reliance on
 * the non-existent v2/driver/rides endpoints for the Android driver app.
 */

/**
 * Body for PUT /api/auth/driver/online
 */
data class DriverOnlineRequest(
    @SerializedName("is_online") val isOnline: Boolean
)

/**
 * Response from PUT /api/auth/driver/online -> {"success": true, "is_online": bool}
 */
data class DriverOnlineResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("is_online") val isOnline: Boolean = false,
    @SerializedName("message") val message: String? = null
)

/**
 * GET /api/rides/available -> {"success", "available_requests":[...], "count"}
 */
data class AvailableRideRequestsResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("available_requests") val availableRequests: List<RideRequestForBidding> = emptyList(),
    @SerializedName("count") val count: Int = 0
)

/**
 * GET /api/rides/driver/active -> {"success", "active_rides":[...], "count"}
 */
data class DriverActiveRidesResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("active_rides") val activeRides: List<RideRequestForBidding> = emptyList(),
    @SerializedName("count") val count: Int = 0
)

/**
 * Body for POST /api/rides/request/{request_id}/bid (SubmitBidInput).
 * driver_id is required by the pydantic schema but is overwritten server-side
 * with the authenticated driver's id.
 */
data class SubmitRideBidRequest(
    @SerializedName("driver_id") val driverId: Int,
    @SerializedName("proposed_price") val proposedPrice: Double,
    @SerializedName("message") val message: String? = null,
    @SerializedName("estimated_arrival_minutes") val estimatedArrivalMinutes: Int? = null
)
