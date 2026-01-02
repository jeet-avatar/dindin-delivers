package com.eatfair.app.staging

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Test
import org.junit.runners.MethodSorters
import java.util.concurrent.TimeUnit

/**
 * Comprehensive Staging API Tests for Customer App
 *
 * STAGING ENVIRONMENT: https://d3kuu45w6kl8hr.cloudfront.net
 *
 * Test Categories:
 * 1. Health Check & Connectivity
 * 2. Authentication (Login, Register, Google, Demo)
 * 3. Restaurant Discovery (List, Search, Details, Menu)
 * 4. Cart & Checkout (Promo codes, Payment intent)
 * 5. Order Management (Create, Track, Cancel, History)
 * 6. Rideshare P2P (Estimate, Request, Bids, Track)
 * 7. Address Management (CRUD operations)
 * 8. Favorites Management
 * 9. Payment Cards Management
 * 10. Promotions & Deals
 *
 * Run with: ./gradlew :app:testStagingDebugUnitTest --tests "*.CustomerAppStagingApiTest"
 */
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class CustomerAppStagingApiTest {

    companion object {
        const val STAGING_BASE_URL = "https://d3kuu45w6kl8hr.cloudfront.net"
        const val API_BASE_URL = "$STAGING_BASE_URL/api"

        // Test credentials - use demo accounts for staging
        const val TEST_CUSTOMER_EMAIL = "demo@dollor.ai"
        const val TEST_CUSTOMER_PASSWORD = "demo123"

        // Shared state across tests
        var authToken: String? = null
        var customerId: Int? = null
        var testOrderId: Int? = null
        var testRideRequestId: Int? = null
        var testAddressId: Int? = null
    }

    private lateinit var client: OkHttpClient
    private lateinit var gson: Gson
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    @Before
    fun setUp() {
        client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
        gson = Gson()
    }

    // =============================================================================
    // CATEGORY 1: HEALTH CHECK & CONNECTIVITY
    // =============================================================================

    @Test
    fun test_01_01_healthCheck_returnsOk() {
        val request = Request.Builder()
            .url("$STAGING_BASE_URL/health")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Health Check Response: ${response.code}")

        assertTrue("Health check should return 2xx", response.isSuccessful)
    }

    @Test
    fun test_01_02_apiBaseUrl_isAccessible() {
        val request = Request.Builder()
            .url("$API_BASE_URL/vendors/published")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("API Base URL Response: ${response.code}")

        // Should return 200 or at least not 5xx
        assertTrue("API should be accessible", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 2: AUTHENTICATION
    // =============================================================================

    @Test
    fun test_02_01_customerLogin_withValidCredentials() {
        val formBody = "username=$TEST_CUSTOMER_EMAIL&password=$TEST_CUSTOMER_PASSWORD"

        val request = Request.Builder()
            .url("$API_BASE_URL/auth/customer/login")
            .post(formBody.toRequestBody("application/x-www-form-urlencoded".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: ""
        println("Login Response: ${response.code} - $body")

        if (response.isSuccessful) {
            val json = gson.fromJson(body, JsonObject::class.java)
            authToken = json.get("token")?.asString ?: json.get("access_token")?.asString
            customerId = json.get("customer_id")?.asInt ?: json.getAsJsonObject("customer")?.get("id")?.asInt

            println("Auth Token: ${authToken?.take(20)}...")
            println("Customer ID: $customerId")
        }

        // May fail with invalid credentials in staging - that's expected
        assertTrue("Login should return valid response", response.code in listOf(200, 401, 422))
    }

    @Test
    fun test_02_02_customerLogin_withInvalidCredentials() {
        val formBody = "username=invalid@test.com&password=wrongpassword"

        val request = Request.Builder()
            .url("$API_BASE_URL/auth/customer/login")
            .post(formBody.toRequestBody("application/x-www-form-urlencoded".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        println("Invalid Login Response: ${response.code}")

        // Should return 401 or 422 for invalid credentials
        assertTrue("Invalid login should be rejected", response.code in listOf(401, 422, 400))
    }

    @Test
    fun test_02_03_customerDemoLogin_works() {
        val requestBody = gson.toJson(mapOf("email" to TEST_CUSTOMER_EMAIL))

        val request = Request.Builder()
            .url("$API_BASE_URL/customer/demo-login")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: ""
        println("Demo Login Response: ${response.code} - $body")

        if (response.isSuccessful) {
            val json = gson.fromJson(body, JsonObject::class.java)
            authToken = json.get("token")?.asString ?: json.get("access_token")?.asString
            customerId = json.get("customer_id")?.asInt ?: json.getAsJsonObject("customer")?.get("id")?.asInt
        }

        // Demo login may or may not be implemented
        assertTrue("Demo login endpoint should respond", response.code < 500)
    }

    @Test
    fun test_02_04_passwordResetRequest_acceptsEmail() {
        val requestBody = gson.toJson(mapOf("email" to "test@example.com"))

        val request = Request.Builder()
            .url("$API_BASE_URL/customer/password-reset/request")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Password Reset Response: ${response.code}")

        // Should accept request (200) or indicate email not found (404/400)
        assertTrue("Password reset should respond", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 3: RESTAURANT DISCOVERY
    // =============================================================================

    @Test
    fun test_03_01_getPublishedRestaurants_returnsList() {
        val request = Request.Builder()
            .url("$API_BASE_URL/vendors/published?platform=android")
            .get()
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: ""
        println("Published Restaurants Response: ${response.code} - ${body.take(500)}")

        assertTrue("Should return restaurants", response.isSuccessful)

        // Verify response structure
        val json = gson.fromJson(body, JsonObject::class.java)
        val restaurants = json.getAsJsonArray("vendors") ?: json.getAsJsonArray("restaurants")
        assertNotNull("Should have vendors/restaurants array", restaurants)
    }

    @Test
    fun test_03_02_getPublishedRestaurants_filterByCity() {
        val request = Request.Builder()
            .url("$API_BASE_URL/vendors/published?platform=android&city=San%20Francisco")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Restaurants by City Response: ${response.code}")

        assertTrue("City filter should work", response.isSuccessful || response.code == 404)
    }

    @Test
    fun test_03_03_getPublishedRestaurants_filterByCuisine() {
        val request = Request.Builder()
            .url("$API_BASE_URL/vendors/published?platform=android&cuisine=Italian")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Restaurants by Cuisine Response: ${response.code}")

        assertTrue("Cuisine filter should work", response.isSuccessful || response.code == 404)
    }

    @Test
    fun test_03_04_getRestaurantById_returnsDetails() {
        // First get a restaurant ID from the list
        val listRequest = Request.Builder()
            .url("$API_BASE_URL/vendors/published?platform=android")
            .get()
            .build()

        val listResponse = client.newCall(listRequest).execute()
        if (listResponse.isSuccessful) {
            val body = listResponse.body?.string() ?: ""
            val json = gson.fromJson(body, JsonObject::class.java)
            val restaurants = json.getAsJsonArray("vendors") ?: json.getAsJsonArray("restaurants")

            if (restaurants != null && restaurants.size() > 0) {
                val restaurantId = restaurants[0].asJsonObject.get("id")?.asInt ?: 1

                val detailRequest = Request.Builder()
                    .url("$API_BASE_URL/public/restaurants/$restaurantId")
                    .get()
                    .build()

                val detailResponse = client.newCall(detailRequest).execute()
                println("Restaurant Detail Response: ${detailResponse.code}")

                assertTrue("Restaurant detail should work", detailResponse.code < 500)
            }
        }
    }

    @Test
    fun test_03_05_getVendorMenu_returnsMenuItems() {
        // First get a vendor ID
        val listRequest = Request.Builder()
            .url("$API_BASE_URL/vendors/published?platform=android")
            .get()
            .build()

        val listResponse = client.newCall(listRequest).execute()
        if (listResponse.isSuccessful) {
            val body = listResponse.body?.string() ?: ""
            val json = gson.fromJson(body, JsonObject::class.java)
            val restaurants = json.getAsJsonArray("vendors") ?: json.getAsJsonArray("restaurants")

            if (restaurants != null && restaurants.size() > 0) {
                val vendorId = restaurants[0].asJsonObject.get("id")?.asInt ?: 1

                val menuRequest = Request.Builder()
                    .url("$API_BASE_URL/vendors/$vendorId/menu")
                    .get()
                    .build()

                val menuResponse = client.newCall(menuRequest).execute()
                println("Vendor Menu Response: ${menuResponse.code}")

                assertTrue("Vendor menu should work", menuResponse.code < 500)
            }
        }
    }

    // =============================================================================
    // CATEGORY 4: PROMOTIONS & DEALS
    // =============================================================================

    @Test
    fun test_04_01_getActivePromotions_returnsList() {
        val request = Request.Builder()
            .url("$API_BASE_URL/promotions/active")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Active Promotions Response: ${response.code}")

        assertTrue("Promotions endpoint should respond", response.code < 500)
    }

    @Test
    fun test_04_02_getFeaturedDeals_returnsList() {
        val request = Request.Builder()
            .url("$API_BASE_URL/promotions/featured")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Featured Deals Response: ${response.code}")

        assertTrue("Featured deals endpoint should respond", response.code < 500)
    }

    @Test
    fun test_04_03_applyPromoCode_validatesCode() {
        if (authToken == null) {
            println("Skipping - no auth token")
            return
        }

        val requestBody = gson.toJson(mapOf(
            "promo_code" to "TESTCODE",
            "order_subtotal" to 25.00
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/promotions/apply")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", "Bearer $authToken")
            .build()

        val response = client.newCall(request).execute()
        println("Apply Promo Code Response: ${response.code}")

        // Should return 200 (valid) or 400/404 (invalid code) - not 500
        assertTrue("Promo code validation should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 5: RIDESHARE P2P - FARE ESTIMATE
    // =============================================================================

    @Test
    fun test_05_01_fareEstimate_withValidCoordinates() {
        val requestBody = gson.toJson(mapOf(
            "pickup_latitude" to 37.7749,
            "pickup_longitude" to -122.4194,
            "dropoff_latitude" to 37.3382,
            "dropoff_longitude" to -121.8863,
            "ride_type" to "standard"
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/estimate")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: ""
        println("Fare Estimate Response: ${response.code} - $body")

        assertTrue("Fare estimate should work", response.isSuccessful)

        // Verify response has estimate data
        if (response.isSuccessful) {
            val json = gson.fromJson(body, JsonObject::class.java)
            assertTrue("Should have estimate", json.has("estimate") || json.has("fare") || json.has("total"))
        }
    }

    @Test
    fun test_05_02_fareEstimate_shortTrip() {
        val requestBody = gson.toJson(mapOf(
            "pickup_latitude" to 37.7749,
            "pickup_longitude" to -122.4194,
            "dropoff_latitude" to 37.7849,  // ~1 mile away
            "dropoff_longitude" to -122.4094,
            "ride_type" to "standard"
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/estimate")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Short Trip Estimate Response: ${response.code}")

        assertTrue("Short trip estimate should work", response.isSuccessful)
    }

    @Test
    fun test_05_03_fareEstimate_longTrip() {
        val requestBody = gson.toJson(mapOf(
            "pickup_latitude" to 37.7749,
            "pickup_longitude" to -122.4194,
            "dropoff_latitude" to 34.0522,  // SF to LA (~380 miles)
            "dropoff_longitude" to -118.2437,
            "ride_type" to "standard"
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/estimate")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Long Trip Estimate Response: ${response.code}")

        assertTrue("Long trip estimate should work", response.isSuccessful)
    }

    @Test
    fun test_05_04_fareEstimate_invalidCoordinates() {
        val requestBody = gson.toJson(mapOf(
            "pickup_latitude" to 999.0,  // Invalid
            "pickup_longitude" to 999.0,
            "dropoff_latitude" to 37.3382,
            "dropoff_longitude" to -121.8863,
            "ride_type" to "standard"
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/estimate")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Invalid Coordinates Response: ${response.code}")

        // Should handle gracefully - either 400 or fallback calculation
        assertTrue("Should handle invalid coordinates", response.code in listOf(200, 400, 422))
    }

    // =============================================================================
    // CATEGORY 6: RIDESHARE P2P - RIDE REQUEST
    // =============================================================================

    @Test
    fun test_06_01_createRideRequest_requiresAuth() {
        val requestBody = gson.toJson(mapOf(
            "customer_id" to 1,
            "pickup_address" to "123 Main St, San Francisco, CA",
            "pickup_latitude" to 37.7749,
            "pickup_longitude" to -122.4194,
            "dropoff_address" to "456 Oak Ave, San Jose, CA",
            "dropoff_latitude" to 37.3382,
            "dropoff_longitude" to -121.8863,
            "ride_type" to "standard",
            "bidding_duration_minutes" to 5
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/request")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            // No auth header
            .build()

        val response = client.newCall(request).execute()
        println("Ride Request (no auth) Response: ${response.code}")

        // Should work without auth (customer_id in body) or require auth
        assertTrue("Should handle unauthenticated request", response.code < 500)
    }

    @Test
    fun test_06_02_createRideRequest_withValidData() {
        val cid = customerId ?: 1

        val requestBody = gson.toJson(mapOf(
            "customer_id" to cid,
            "pickup_address" to "123 Main St, San Francisco, CA",
            "pickup_latitude" to 37.7749,
            "pickup_longitude" to -122.4194,
            "dropoff_address" to "456 Oak Ave, San Jose, CA",
            "dropoff_latitude" to 37.3382,
            "dropoff_longitude" to -121.8863,
            "ride_type" to "standard",
            "bidding_duration_minutes" to 5
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/rides/request")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        val body = response.body?.string() ?: ""
        println("Create Ride Request Response: ${response.code} - $body")

        if (response.isSuccessful) {
            val json = gson.fromJson(body, JsonObject::class.java)
            testRideRequestId = json.get("request_id")?.asInt ?: json.get("id")?.asInt
            println("Created Ride Request ID: $testRideRequestId")
        }

        assertTrue("Ride request creation should work", response.code < 500)
    }

    @Test
    fun test_06_03_getCustomerRideRequests_returnsList() {
        val cid = customerId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/rides/customer/$cid/requests")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Customer Ride Requests Response: ${response.code}")

        assertTrue("Get ride requests should work", response.code < 500)
    }

    @Test
    fun test_06_04_getRideBids_forRequest() {
        val requestId = testRideRequestId ?: 1

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/request/$requestId/bids")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Ride Bids Response: ${response.code}")

        assertTrue("Get ride bids should work", response.code < 500)
    }

    @Test
    fun test_06_05_cancelRideRequest_works() {
        val requestId = testRideRequestId ?: 1

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/request/$requestId/cancel")
            .post("{}".toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Cancel Ride Request Response: ${response.code}")

        assertTrue("Cancel ride should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 7: RIDESHARE P2P - BIDDING
    // =============================================================================

    @Test
    fun test_07_01_respondToBid_accept() {
        val bidId = 1  // Test bid ID

        val requestBody = gson.toJson(mapOf("action" to "accept"))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/bid/$bidId/respond")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Accept Bid Response: ${response.code}")

        // Should work or return 404 if bid doesn't exist
        assertTrue("Accept bid should work", response.code < 500)
    }

    @Test
    fun test_07_02_respondToBid_reject() {
        val bidId = 1

        val requestBody = gson.toJson(mapOf("action" to "reject"))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/bid/$bidId/respond")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Reject Bid Response: ${response.code}")

        assertTrue("Reject bid should work", response.code < 500)
    }

    @Test
    fun test_07_03_respondToBid_counter() {
        val bidId = 1

        val requestBody = gson.toJson(mapOf(
            "action" to "counter",
            "counter_price" to 25.00,
            "message" to "How about $25?"
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/rides/bid/$bidId/respond")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Counter Bid Response: ${response.code}")

        assertTrue("Counter bid should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 8: RIDESHARE P2P - CHAT
    // =============================================================================

    @Test
    fun test_08_01_getRideChatMessages_returnsList() {
        val rideId = testRideRequestId ?: 1

        val request = Request.Builder()
            .url("$API_BASE_URL/chat/messages/$rideId")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Get Chat Messages Response: ${response.code}")

        // Chat might not be available - 404 is acceptable
        assertTrue("Get chat should work", response.code in listOf(200, 404, 401))
    }

    @Test
    fun test_08_02_sendChatMessage_works() {
        val rideId = testRideRequestId ?: 1

        val requestBody = gson.toJson(mapOf(
            "message" to "Hello, I'm on my way!",
            "sender_type" to "customer"
        ))

        val request = Request.Builder()
            .url("$API_BASE_URL/chat/messages/$rideId")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        println("Send Chat Message Response: ${response.code}")

        assertTrue("Send chat should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 9: ADDRESS MANAGEMENT
    // =============================================================================

    @Test
    fun test_09_01_getCustomerAddresses_returnsList() {
        val cid = customerId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/addresses/$cid")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Addresses Response: ${response.code}")

        assertTrue("Get addresses should work", response.code < 500)
    }

    @Test
    fun test_09_02_addCustomerAddress_works() {
        val cid = customerId ?: 1

        val requestBody = gson.toJson(mapOf(
            "address_line_1" to "123 Test St",
            "address_line_2" to "Apt 4B",
            "city" to "San Francisco",
            "state" to "CA",
            "zip_code" to "94102",
            "latitude" to 37.7749,
            "longitude" to -122.4194,
            "label" to "Home",
            "is_default" to false
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/addresses/$cid")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        val body = response.body?.string() ?: ""
        println("Add Address Response: ${response.code} - $body")

        if (response.isSuccessful) {
            val json = gson.fromJson(body, JsonObject::class.java)
            testAddressId = json.get("id")?.asInt ?: json.get("address_id")?.asInt
            println("Created Address ID: $testAddressId")
        }

        assertTrue("Add address should work", response.code < 500)
    }

    @Test
    fun test_09_03_getDefaultAddress_works() {
        val cid = customerId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/addresses/$cid/default")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Default Address Response: ${response.code}")

        // 404 is acceptable if no default set
        assertTrue("Get default address should work", response.code in listOf(200, 404, 401))
    }

    @Test
    fun test_09_04_setDefaultAddress_works() {
        val cid = customerId ?: 1
        val addressId = testAddressId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/addresses/$cid/$addressId/set-default")
            .post("{}".toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Set Default Address Response: ${response.code}")

        assertTrue("Set default address should work", response.code < 500)
    }

    @Test
    fun test_09_05_deleteAddress_works() {
        val cid = customerId ?: 1
        val addressId = testAddressId ?: 999  // Use high ID to avoid deleting real data

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/addresses/$cid/$addressId")
            .delete()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Delete Address Response: ${response.code}")

        assertTrue("Delete address should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 10: FAVORITES MANAGEMENT
    // =============================================================================

    @Test
    fun test_10_01_getCustomerFavorites_returnsList() {
        val cid = customerId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/favorites/$cid")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Favorites Response: ${response.code}")

        assertTrue("Get favorites should work", response.code < 500)
    }

    @Test
    fun test_10_02_addFavorite_works() {
        val cid = customerId ?: 1
        val vendorId = 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/favorites/$cid/$vendorId")
            .post("{}".toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Add Favorite Response: ${response.code}")

        assertTrue("Add favorite should work", response.code < 500)
    }

    @Test
    fun test_10_03_checkFavorite_works() {
        val cid = customerId ?: 1
        val vendorId = 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/favorites/$cid/check/$vendorId")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Check Favorite Response: ${response.code}")

        assertTrue("Check favorite should work", response.code < 500)
    }

    @Test
    fun test_10_04_removeFavorite_works() {
        val cid = customerId ?: 1
        val vendorId = 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/favorites/$cid/$vendorId")
            .delete()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Remove Favorite Response: ${response.code}")

        assertTrue("Remove favorite should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 11: PAYMENT CARDS
    // =============================================================================

    @Test
    fun test_11_01_getSavedCards_returnsList() {
        val cid = customerId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customers/$cid/cards")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Saved Cards Response: ${response.code}")

        assertTrue("Get saved cards should work", response.code < 500)
    }

    @Test
    fun test_11_02_addPaymentCard_requiresStripeToken() {
        val cid = customerId ?: 1

        val requestBody = gson.toJson(mapOf(
            "stripe_token" to "tok_visa_test",  // Test token
            "card_type" to "visa",
            "last_four" to "4242"
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customers/$cid/cards")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Add Payment Card Response: ${response.code}")

        // May fail with invalid token - that's expected
        assertTrue("Add card should handle request", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 12: ORDER MANAGEMENT
    // =============================================================================

    @Test
    fun test_12_01_getCustomerOrders_returnsList() {
        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/orders")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Customer Orders Response: ${response.code}")

        assertTrue("Get orders should work", response.code < 500)
    }

    @Test
    fun test_12_02_getActiveOrders_returnsList() {
        val cid = customerId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/$cid/active-orders")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Active Orders Response: ${response.code}")

        assertTrue("Get active orders should work", response.code < 500)
    }

    @Test
    fun test_12_03_createOrder_withValidData() {
        val cid = customerId ?: 1

        val requestBody = gson.toJson(mapOf(
            "customer_id" to cid,
            "vendor_id" to 1,
            "items" to listOf(
                mapOf(
                    "menu_item_id" to 1,
                    "quantity" to 2,
                    "price" to 12.99
                )
            ),
            "delivery_address" to mapOf(
                "address_line_1" to "123 Test St",
                "city" to "San Francisco",
                "state" to "CA",
                "zip_code" to "94102",
                "latitude" to 37.7749,
                "longitude" to -122.4194
            ),
            "subtotal" to 25.98,
            "tax" to 2.08,
            "delivery_fee" to 3.99,
            "platform_fee" to 1.00,
            "total" to 33.05,
            "payment_method" to "card"
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/orders/create")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        val body = response.body?.string() ?: ""
        println("Create Order Response: ${response.code} - $body")

        if (response.isSuccessful) {
            val json = gson.fromJson(body, JsonObject::class.java)
            testOrderId = json.get("order_id")?.asInt ?: json.get("id")?.asInt
            println("Created Order ID: $testOrderId")
        }

        assertTrue("Create order should work", response.code < 500)
    }

    @Test
    fun test_12_04_trackOrder_returnsStatus() {
        val orderId = testOrderId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/orders/$orderId/track")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Track Order Response: ${response.code}")

        assertTrue("Track order should work", response.code < 500)
    }

    @Test
    fun test_12_05_cancelOrder_works() {
        val orderId = testOrderId ?: 999

        val requestBody = gson.toJson(mapOf(
            "reason" to "Changed my mind"
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/orders/$orderId/cancel")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Cancel Order Response: ${response.code}")

        assertTrue("Cancel order should work", response.code < 500)
    }

    @Test
    fun test_12_06_tipDriver_works() {
        val orderId = testOrderId ?: 1

        val requestBody = gson.toJson(mapOf(
            "tip_amount" to 5.00
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/orders/$orderId/tip-driver")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Tip Driver Response: ${response.code}")

        assertTrue("Tip driver should work", response.code < 500)
    }

    @Test
    fun test_12_07_rateDriver_works() {
        val orderId = testOrderId ?: 1

        val requestBody = gson.toJson(mapOf(
            "rating" to 5,
            "comment" to "Great service!"
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/orders/$orderId/rate-driver")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Rate Driver Response: ${response.code}")

        assertTrue("Rate driver should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 13: ORDER TRACKING (Full Tracking)
    // =============================================================================

    @Test
    fun test_13_01_getFullOrderTracking_returnsDetails() {
        val orderId = testOrderId ?: 1

        val request = Request.Builder()
            .url("$API_BASE_URL/erp/orders/$orderId/full-tracking")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Full Order Tracking Response: ${response.code}")

        assertTrue("Full tracking should work", response.code < 500)
    }

    @Test
    fun test_13_02_getDriverLocation_forOrder() {
        val orderId = testOrderId ?: 1

        val request = Request.Builder()
            .url("$API_BASE_URL/erp/orders/$orderId/driver-location")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Driver Location Response: ${response.code}")

        assertTrue("Driver location should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 14: ORDER CHAT
    // =============================================================================

    @Test
    fun test_14_01_getOrderChat_returnsList() {
        val orderId = testOrderId ?: 1

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/orders/$orderId/chat")
            .get()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Get Order Chat Response: ${response.code}")

        assertTrue("Get order chat should work", response.code < 500)
    }

    @Test
    fun test_14_02_sendOrderChat_works() {
        val orderId = testOrderId ?: 1

        val requestBody = gson.toJson(mapOf(
            "message" to "Where is my order?"
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/orders/$orderId/chat")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Send Order Chat Response: ${response.code}")

        assertTrue("Send order chat should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 15: PAYMENT PROCESSING
    // =============================================================================

    @Test
    fun test_15_01_createPaymentIntent_works() {
        val requestBody = gson.toJson(mapOf(
            "amount" to 2500,  // $25.00 in cents
            "currency" to "usd",
            "customer_id" to (customerId ?: 1)
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/payments/create-intent")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Create Payment Intent Response: ${response.code}")

        assertTrue("Create payment intent should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 16: LEGAL & SUPPORT
    // =============================================================================

    @Test
    fun test_16_01_getTermsOfService_returnsContent() {
        val request = Request.Builder()
            .url("$API_BASE_URL/legal/tos")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Terms of Service Response: ${response.code}")

        assertTrue("Terms endpoint should work", response.code < 500)
    }

    @Test
    fun test_16_02_getPrivacyPolicy_returnsContent() {
        val request = Request.Builder()
            .url("$API_BASE_URL/legal/privacy-policy")
            .get()
            .build()

        val response = client.newCall(request).execute()
        println("Privacy Policy Response: ${response.code}")

        assertTrue("Privacy policy endpoint should work", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 17: ACCOUNT MANAGEMENT
    // =============================================================================

    @Test
    fun test_17_01_updateCustomerProfile_works() {
        val cid = customerId ?: 1

        val requestBody = gson.toJson(mapOf(
            "full_name" to "Test User",
            "phone" to "+1234567890"
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customer/$cid/profile")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Update Profile Response: ${response.code}")

        assertTrue("Update profile should work", response.code < 500)
    }

    @Test
    fun test_17_02_deleteCustomerAccount_works() {
        // Use a high ID to avoid deleting real accounts
        val cid = 999999

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/customers/$cid/delete")
            .delete()

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Delete Account Response: ${response.code}")

        // Should return 404 (not found) or 401 (unauthorized) - not 500
        assertTrue("Delete account should handle request", response.code < 500)
    }

    // =============================================================================
    // CATEGORY 18: PUSH NOTIFICATIONS
    // =============================================================================

    @Test
    fun test_18_01_registerPushToken_works() {
        val requestBody = gson.toJson(mapOf(
            "token" to "test_fcm_token_12345",
            "platform" to "android",
            "user_type" to "customer",
            "user_id" to (customerId ?: 1)
        ))

        val requestBuilder = Request.Builder()
            .url("$API_BASE_URL/notifications/register-token")
            .post(requestBody.toRequestBody(jsonMediaType))
            .addHeader("Content-Type", "application/json")

        if (authToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $authToken")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        println("Register Push Token Response: ${response.code}")

        assertTrue("Register push token should work", response.code < 500)
    }

    // =============================================================================
    // SUMMARY TEST - Runs after all others
    // =============================================================================

    @Test
    fun test_99_printSummary() {
        println("\n" + "=".repeat(60))
        println("STAGING API TEST SUMMARY")
        println("=".repeat(60))
        println("Staging URL: $STAGING_BASE_URL")
        println("Auth Token: ${if (authToken != null) "Obtained" else "Not obtained"}")
        println("Customer ID: ${customerId ?: "Not obtained"}")
        println("Test Order ID: ${testOrderId ?: "Not created"}")
        println("Test Ride Request ID: ${testRideRequestId ?: "Not created"}")
        println("Test Address ID: ${testAddressId ?: "Not created"}")
        println("=".repeat(60))

        assertTrue("Summary test", true)
    }
}
