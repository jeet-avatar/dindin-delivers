package com.eatfair.shared.data.repository

import android.util.Log
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.model.*
import com.eatfair.shared.network.TokenExpiredException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Dollor.AI Repository
 * Provides clean data access layer matching iOS P2PAPIService functionality
 *
 * Error Handling:
 * - All API calls wrapped in comprehensive error handling
 * - Network errors mapped to user-friendly messages
 * - 401 errors handled by TokenRefreshInterceptor
 * - Proper Result.failure() on all error paths
 */
@Singleton
class DollorRepository @Inject constructor(
    private val apiService: DollorApiService,
    private val secureStorage: SecureStorage
) {
    companion object {
        private const val TAG = "DollorRepository"
    }

    /**
     * Safe API call wrapper with comprehensive error handling
     */
    private suspend fun <T> safeApiCall(
        apiCall: suspend () -> T
    ): Result<T> {
        return try {
            Result.success(apiCall())
        } catch (e: TokenExpiredException) {
            Log.e(TAG, "Token expired: ${e.message}")
            Result.failure(Exception("Session expired. Please login again."))
        } catch (e: HttpException) {
            val errorMessage = when (e.code()) {
                400 -> "Invalid request. Please check your input."
                401 -> "Authentication failed. Please login again."
                403 -> "Access denied."
                404 -> "Resource not found."
                409 -> "Conflict. The resource already exists."
                422 -> "Validation error. Please check your input."
                500 -> "Server error. Please try again later."
                502, 503 -> "Service temporarily unavailable. Please try again."
                else -> "Network error: ${e.message()}"
            }
            Log.e(TAG, "HTTP ${e.code()}: $errorMessage")
            Result.failure(Exception(errorMessage))
        } catch (e: SocketTimeoutException) {
            Log.e(TAG, "Request timeout: ${e.message}")
            Result.failure(Exception("Request timed out. Please check your connection and try again."))
        } catch (e: UnknownHostException) {
            Log.e(TAG, "No internet connection: ${e.message}")
            Result.failure(Exception("No internet connection. Please check your network and try again."))
        } catch (e: IOException) {
            Log.e(TAG, "Network error: ${e.message}")
            Result.failure(Exception("Network error. Please check your connection and try again."))
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error: ${e.message}", e)
            Result.failure(Exception("An unexpected error occurred. Please try again."))
        }
    }
    // ==========================================
    // CUSTOMER AUTHENTICATION
    // ==========================================

    suspend fun customerLogin(email: String, password: String): Result<CustomerLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.customerLogin(email, password)
                secureStorage.saveCustomerAuth(
                    token = response.accessToken,
                    id = response.customerId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    suspend fun customerRegister(
        email: String,
        password: String,
        name: String,
        phone: String
    ): Result<CustomerLoginResponse> = withContext(Dispatchers.IO) {
        safeApiCall {
            val request = CustomerRegisterRequest(email, password, name, phone)
            // Validate input before sending to API
            val validation = request.validate()
            if (!validation.isValid()) {
                throw IllegalArgumentException(validation.getErrorsOrNull()?.joinToString(", ") ?: "Invalid input")
            }

            val response = apiService.customerRegister(request)
            secureStorage.saveCustomerAuth(
                token = response.accessToken,
                id = response.customerId,
                name = response.name,
                email = response.email
            )
            response
        }
    }

    suspend fun customerGoogleAuth(idToken: String, email: String? = null, name: String? = null): Result<CustomerLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.customerGoogleAuth(GoogleAuthRequest(idToken, email, name))
                secureStorage.saveCustomerAuth(
                    token = response.accessToken,
                    id = response.customerId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    fun customerLogout() {
        secureStorage.clearCustomerAuth()
    }

    /**
     * Request password reset - sends code to email
     * Matches iOS: P2PAPIService.requestPasswordReset()
     * API: POST /api/customer/password-reset/request
     */
    suspend fun requestPasswordReset(email: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                apiService.requestPasswordReset(ForgotPasswordRequest(email))
            }.map { }
        }

    /**
     * Confirm password reset with code and new password
     * Matches iOS: P2PAPIService.confirmPasswordReset()
     * API: POST /api/customer/password-reset/confirm
     */
    suspend fun confirmPasswordReset(
        email: String,
        code: String,
        newPassword: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        safeApiCall {
            apiService.confirmPasswordResetWithCode(
                ResetPasswordWithCodeRequest(email, code, newPassword)
            )
        }.map { }
    }

    /**
     * Demo login for App Store review
     * Server validates demo accounts without password - no credentials stored in app
     */
    suspend fun customerDemoLogin(email: String): Result<CustomerLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.customerDemoLogin(DemoLoginRequest(email))
                secureStorage.saveCustomerAuth(
                    token = response.accessToken,
                    id = response.customerId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    /**
     * Delete customer account - required by Google Play Store policy
     * Matches iOS: P2PAPIService.deleteCustomerAccount()
     * API: DELETE /api/customers/{customerId}/delete
     */
    suspend fun deleteCustomerAccount(): Result<Unit> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val customerId = secureStorage.customerId
        safeApiCall {
            apiService.deleteCustomerAccount(customerId, token)
            // Clear all auth data after successful deletion
            secureStorage.clearCustomerAuth()
        }
    }

    // ==========================================
    // DRIVER AUTHENTICATION
    // ==========================================

    suspend fun driverLogin(email: String, password: String): Result<DriverLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.driverLogin(email, password)
                secureStorage.saveDriverAuth(
                    token = response.accessToken,
                    id = response.driverId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    suspend fun driverRegister(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String
    ): Result<DriverLoginResponse> = withContext(Dispatchers.IO) {
        safeApiCall {
            val response = apiService.driverRegister(
                DriverRegisterRequest(email, password, firstName, lastName, phone)
            )
            secureStorage.saveDriverAuth(
                token = response.accessToken,
                id = response.driverId,
                name = response.name,
                email = response.email
            )
            response
        }
    }

    fun driverLogout() {
        secureStorage.clearDriverAuth()
    }

    /**
     * Demo login for driver App Store review
     * Server validates demo accounts without password
     */
    suspend fun driverDemoLogin(email: String): Result<DriverLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.driverDemoLogin(DemoLoginRequest(email))
                secureStorage.saveDriverAuth(
                    token = response.accessToken,
                    id = response.driverId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    suspend fun driverGoogleAuth(request: DriverGoogleAuthRequest): Result<DriverLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.driverGoogleAuth(request)
                secureStorage.saveDriverAuth(
                    token = response.accessToken,
                    id = response.driverId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    suspend fun driverAppleAuth(request: AppleAuthRequest): Result<DriverLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.driverAppleAuth(request)
                secureStorage.saveDriverAuth(
                    token = response.accessToken,
                    id = response.driverId,
                    name = response.name,
                    email = response.email
                )
                response
            }
        }

    /**
     * Delete driver account - required by Google Play Store policy
     * Matches iOS: P2PAPIService.deleteDriverAccount()
     * API: DELETE /api/drivers/{driverId}/delete
     */
    suspend fun deleteDriverAccount(): Result<Unit> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall {
            apiService.deleteDriverAccount(driverId, token)
            // Clear all auth data after successful deletion
            secureStorage.clearDriverAuth()
        }
    }

    // ==========================================
    // VENDOR AUTHENTICATION
    // ==========================================

    suspend fun vendorLogin(email: String, password: String): Result<VendorLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.vendorLogin(email, password)
                secureStorage.saveVendorAuth(
                    token = response.accessToken,
                    id = response.vendorId,
                    name = response.businessName,
                    email = response.email
                )
                response
            }
        }

    fun vendorLogout() {
        secureStorage.clearVendorAuth()
    }

    /**
     * Demo login for vendor App Store review
     * Server validates demo accounts without password
     */
    suspend fun vendorDemoLogin(email: String): Result<VendorLoginResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                val response = apiService.vendorDemoLogin(DemoLoginRequest(email))
                secureStorage.saveVendorAuth(
                    token = response.accessToken,
                    id = response.vendorId,
                    name = response.businessName,
                    email = response.email
                )
                response
            }
        }

    /**
     * Public vendor registration with full form data (matching Web 4-step form)
     * Used by RegistrationScreen for complete vendor onboarding
     * Calls /api/vendors/public endpoint
     */
    suspend fun vendorPublicRegister(data: Map<String, Any>): Result<VendorRegistrationResponse> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                apiService.vendorPublicRegister(data)
            }
        }

    /**
     * Delete vendor account - required by App Store/Play Store policy
     * Matches iOS: P2PAPIService.deleteVendorAccount()
     */
    suspend fun deleteVendorAccount(): Result<Unit> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val vendorId = secureStorage.vendorId
        safeApiCall {
            apiService.deleteVendorAccount(vendorId, token)
            // Clear all auth data after successful deletion
            secureStorage.clearVendorAuth()
        }
    }

    // ==========================================
    // VENDOR PROFILE & SETTINGS
    // ==========================================

    /**
     * Get current vendor profile
     */
    suspend fun getVendorProfile(): Result<VendorProfileResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
        safeApiCall {
            apiService.getVendorProfile(token)
        }
    }

    /**
     * Get vendor profile by ID
     */
    suspend fun getVendorById(vendorId: Int): Result<VendorProfileResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
        safeApiCall {
            apiService.getVendorById(vendorId, token)
        }
    }

    /**
     * Update vendor profile
     */
    suspend fun updateVendorProfile(request: UpdateVendorProfileRequest): Result<VendorProfileResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            val vendorId = secureStorage.vendorId
            safeApiCall {
                apiService.updateVendorProfile(vendorId, request, token)
            }
        }

    /**
     * Update vendor business hours
     */
    suspend fun updateVendorBusinessHours(operatingHours: String, prepTime: Int? = null): Result<VendorProfileResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            val vendorId = secureStorage.vendorId
            safeApiCall {
                apiService.updateVendorBusinessHours(
                    vendorId,
                    UpdateBusinessHoursRequest(operatingHours, prepTime),
                    token
                )
            }
        }

    /**
     * Update vendor notification settings
     */
    suspend fun updateVendorNotificationSettings(preferences: NotificationPreferences): Result<VendorProfileResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            val vendorId = secureStorage.vendorId
            safeApiCall {
                apiService.updateVendorNotificationSettings(
                    vendorId,
                    UpdateNotificationSettingsRequest(preferences),
                    token
                )
            }
        }

    /**
     * Update vendor online status
     */
    suspend fun updateVendorOnlineStatus(isOnline: Boolean): Result<VendorProfileResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            val vendorId = secureStorage.vendorId
            safeApiCall {
                apiService.updateVendorOnlineStatus(
                    vendorId,
                    UpdateOnlineStatusRequest(isOnline),
                    token
                )
            }
        }

    /**
     * Get vendor documents
     */
    suspend fun getVendorDocuments(): Result<VendorDocumentsResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
        val vendorId = secureStorage.vendorId
        safeApiCall {
            apiService.getVendorDocuments(vendorId, token)
        }
    }

    /**
     * Upload vendor document
     */
    suspend fun uploadVendorDocument(
        file: okhttp3.MultipartBody.Part,
        documentType: String
    ): Result<DocumentUploadResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
        val vendorId = secureStorage.vendorId
        val docTypePart = documentType.toRequestBody("text/plain".toMediaTypeOrNull())
        safeApiCall {
            apiService.uploadVendorDocument(vendorId, file, docTypePart, token)
        }
    }

    /**
     * Delete vendor document
     */
    suspend fun deleteVendorDocument(documentId: Int): Result<GenericResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
        val vendorId = secureStorage.vendorId
        safeApiCall {
            apiService.deleteVendorDocument(vendorId, documentId, token)
        }
    }

    /**
     * Get vendor payouts info
     */
    suspend fun getVendorPayouts(): Result<VendorPayoutsResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
        val vendorId = secureStorage.vendorId
        safeApiCall {
            apiService.getVendorPayouts(vendorId, token)
        }
    }

    /**
     * Update vendor bank account
     */
    suspend fun updateVendorBankAccount(request: VendorBankAccountRequest): Result<VendorPayoutsResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            val vendorId = secureStorage.vendorId
            safeApiCall {
                apiService.updateVendorBankAccount(vendorId, request, token)
            }
        }

    // ==========================================
    // PUBLIC ENDPOINTS (No Auth)
    // ==========================================

    suspend fun getRestaurants(city: String? = null, cuisine: String? = null): Result<List<RestaurantApiResponse>> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                apiService.getRestaurants(platform = "android", city = city, cuisine = cuisine).restaurants
            }
        }

    suspend fun getRestaurantById(id: Int): Result<RestaurantDetail> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                apiService.getRestaurantById(id)
            }
        }

    suspend fun getVendorMenu(vendorId: Int): Result<List<MenuItem>> =
        withContext(Dispatchers.IO) {
            safeApiCall {
                apiService.getVendorMenu(vendorId)
            }
        }

    // ==========================================
    // VENDOR MENU MANAGEMENT
    // ==========================================

    suspend fun addMenuItem(vendorId: Int, request: CreateMenuItemRequest): Result<MenuItem> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))

            // Validate menu item
            val validation = request.validate()
            if (!validation.isValid()) {
                return@withContext Result.failure(
                    IllegalArgumentException(validation.getErrorsOrNull()?.joinToString(", ") ?: "Invalid menu item")
                )
            }

            safeApiCall {
                apiService.addMenuItem(vendorId, request, token)
            }
        }

    suspend fun updateMenuItem(vendorId: Int, itemId: Int, request: UpdateMenuItemRequest): Result<MenuItem> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            safeApiCall {
                apiService.updateMenuItem(vendorId, itemId, request, token)
            }
        }

    suspend fun patchMenuItem(vendorId: Int, itemId: Int, updates: Map<String, Any>): Result<MenuItem> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            safeApiCall {
                apiService.patchMenuItem(vendorId, itemId, updates, token)
            }
        }

    suspend fun deleteMenuItem(vendorId: Int, itemId: Int): Result<Unit> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            safeApiCall {
                val response = apiService.deleteMenuItem(vendorId, itemId, token)
                if (response.isSuccessful) {
                    Unit
                } else {
                    throw Exception("Failed to delete menu item: ${response.code()}")
                }
            }
        }

    suspend fun getMenuCategories(vendorId: Int): Result<MenuCategoriesResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated as vendor"))
            safeApiCall {
                apiService.getMenuCategories(vendorId, token)
            }
        }

    // ==========================================
    // CUSTOMER ORDERS
    // ==========================================

    suspend fun getCustomerOrders(): Result<List<Order>> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall {
            apiService.getCustomerOrders(token)
        }
    }

    suspend fun getActiveOrders(): Result<ActiveOrdersResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val customerId = secureStorage.customerId
        safeApiCall {
            apiService.getActiveOrders(customerId, token)
        }
    }

    suspend fun createOrder(request: CreateOrderRequest): Result<CreateOrderResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))

            // Validate order before submission
            val validation = request.validate()
            if (!validation.isValid()) {
                return@withContext Result.failure(
                    IllegalArgumentException(validation.getErrorsOrNull()?.joinToString(", ") ?: "Invalid order")
                )
            }

            safeApiCall {
                apiService.createOrder(request, token)
            }
        }

    suspend fun trackOrder(orderId: Int): Result<OrderTrackingResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.trackOrder(orderId, token)
            }
        }

    // ==========================================
    // ORDER CHAT
    // ==========================================

    /**
     * Get chat messages for an order
     */
    suspend fun getOrderChat(orderId: Int): Result<List<ChatMessage>> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.getOrderChat(orderId, token)
            }
        }

    /**
     * Send a chat message for an order
     */
    suspend fun sendOrderChat(orderId: Int, request: ChatMessageRequest): Result<GenericResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.sendOrderChat(orderId, request, token)
            }
        }

    // ==========================================
    // CUSTOMER ADDRESSES
    // ==========================================

    suspend fun getAddresses(): Result<List<Address>> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val customerId = secureStorage.customerId
        safeApiCall {
            apiService.getAddresses(customerId, token)
        }
    }

    suspend fun addAddress(address: AddAddressRequest): Result<Address> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val customerId = secureStorage.customerId

            // Validate input
            val validation = address.validate()
            if (!validation.isValid()) {
                return@withContext Result.failure(
                    IllegalArgumentException(validation.getErrorsOrNull()?.joinToString(", ") ?: "Invalid address")
                )
            }

            safeApiCall {
                apiService.addAddress(customerId, address, token)
            }
        }

    suspend fun updateAddress(addressId: Int, address: UpdateAddressRequest): Result<Address> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val customerId = secureStorage.customerId
            safeApiCall {
                apiService.updateAddress(customerId, addressId, address, token)
            }
        }

    suspend fun deleteAddress(addressId: Int): Result<GenericResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val customerId = secureStorage.customerId
            safeApiCall {
                apiService.deleteAddress(customerId, addressId, token)
            }
        }

    suspend fun setDefaultAddress(addressId: Int): Result<Address> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val customerId = secureStorage.customerId
            safeApiCall {
                apiService.setDefaultAddress(customerId, addressId, token)
            }
        }

    suspend fun getDefaultAddress(): Result<Address> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val customerId = secureStorage.customerId
            safeApiCall {
                apiService.getDefaultAddress(customerId, token)
            }
        }

    // ==========================================
    // CUSTOMER FAVORITES
    // ==========================================

    suspend fun getFavorites(): Result<List<RestaurantApiResponse>> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val customerId = secureStorage.customerId
        safeApiCall {
            apiService.getFavorites(customerId, token)
        }
    }

    suspend fun addFavorite(vendorId: Int): Result<GenericResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val customerId = secureStorage.customerId
        safeApiCall {
            apiService.addFavorite(customerId, vendorId, token)
        }
    }

    suspend fun removeFavorite(vendorId: Int): Result<GenericResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val customerId = secureStorage.customerId
            safeApiCall {
                apiService.removeFavorite(customerId, vendorId, token)
            }
        }

    // ==========================================
    // RIDESHARE - CUSTOMER
    // ==========================================

    suspend fun requestRide(
        pickupLat: Double,
        pickupLng: Double,
        pickupAddress: String,
        dropoffLat: Double,
        dropoffLng: Double,
        dropoffAddress: String
    ): Result<RideResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val customerId = secureStorage.customerId
        safeApiCall {
            val request = RideRequest(
                customerId = customerId,
                pickupLat = pickupLat,
                pickupLng = pickupLng,
                pickupAddress = pickupAddress,
                dropoffLat = dropoffLat,
                dropoffLng = dropoffLng,
                dropoffAddress = dropoffAddress
            )
            apiService.requestRide(request, token)
        }
    }

    suspend fun getCustomerRides(): Result<CustomerRidesResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall {
            apiService.getCustomerRides(token)
        }
    }

    suspend fun trackRide(rideId: Int): Result<RideTrackingResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall {
            apiService.trackRide(rideId, token)
        }
    }

    suspend fun cancelRide(rideId: Int, reason: String): Result<GenericResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.cancelRide(rideId, CancelRideRequest(reason), token)
            }
        }

    suspend fun estimateRideFare(
        pickupLat: Double,
        pickupLng: Double,
        dropoffLat: Double,
        dropoffLng: Double
    ): Result<RideEstimateResponse> = withContext(Dispatchers.IO) {
        safeApiCall {
            val request = RideEstimateRequest(pickupLat, pickupLng, dropoffLat, dropoffLng)
            apiService.estimateRideFare(request)
        }
    }

    // ==========================================
    // DRIVER DELIVERIES
    // ==========================================

    suspend fun getAvailableDeliveries(): Result<List<AvailableDelivery>> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.getAvailableDeliveries(token)
            }
        }

    suspend fun getMyDeliveries(): Result<List<Delivery>> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall {
            apiService.getMyDeliveries(token)
        }
    }

    suspend fun acceptDelivery(deliveryId: Int): Result<DeliveryActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.acceptDelivery(deliveryId, token)
            }
        }

    suspend fun markDeliveryPickedUp(deliveryId: Int): Result<DeliveryActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.markDeliveryPickedUp(deliveryId, token)
            }
        }

    suspend fun completeDelivery(deliveryId: Int): Result<DeliveryActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall {
                apiService.completeDelivery(deliveryId, token)
            }
        }

    suspend fun updateDriverLocation(lat: Double, lng: Double): Result<GenericResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val driverId = secureStorage.driverId
            safeApiCall {
                val request = DriverLocationRequest(driverId, lat, lng)
                apiService.updateDriverLocation(request, token)
            }
        }

    // ==========================================
    // DRIVER RIDESHARE
    // ==========================================

    suspend fun getAvailableRides(): Result<List<AvailableRide>> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall { apiService.getAvailableRides(token) }
    }

    suspend fun acceptRide(rideId: Int): Result<RideActionResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall { apiService.acceptRide(rideId, token) }
    }

    suspend fun markRideArrived(rideId: Int): Result<RideActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.markRideArrived(rideId, token) }
        }

    suspend fun startRide(rideId: Int): Result<RideActionResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall { apiService.startRide(rideId, token) }
    }

    suspend fun completeRide(rideId: Int): Result<RideCompleteResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.completeRide(rideId, token) }
        }

    // ==========================================
    // DRIVER DASHBOARD & EARNINGS
    // ==========================================

    suspend fun getDriverDashboard(): Result<DriverDashboardResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            val driverId = secureStorage.driverId
            safeApiCall { apiService.getDriverDashboard(driverId, token) }
        }

    suspend fun getDriverEarnings(): Result<DriverEarningsResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall { apiService.getDriverEarnings(driverId, token) }
    }

    suspend fun getDriverStats(): Result<DriverStatsResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall { apiService.getDriverStats(driverId, token) }
    }

    // ==========================================
    // DRIVER PAYOUTS (ACH Bank Transfer)
    // ==========================================

    /**
     * Get driver's current balance available for payout
     */
    suspend fun getDriverBalance(): Result<DriverBalanceResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall { apiService.getDriverBalance(driverId, token) }
    }

    /**
     * Link a bank account for receiving payouts via ACH
     */
    suspend fun linkBankAccount(
        accountHolderName: String,
        routingNumber: String,
        accountNumber: String,
        accountType: String = "checking"
    ): Result<com.eatfair.shared.model.driver.LinkBankAccountResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall {
            val request = com.eatfair.shared.model.driver.LinkBankAccountRequest(
                accountHolderName = accountHolderName,
                routingNumber = routingNumber,
                accountNumber = accountNumber,
                accountType = accountType
            )
            apiService.linkBankAccount(driverId, request, token)
        }
    }

    /**
     * Request a payout to linked bank account
     * @param amount Amount to withdraw
     * @param method "standard" (free, 2-3 days) or "instant" ($1.50 fee)
     */
    suspend fun requestPayout(
        amount: Double,
        method: String = "standard"
    ): Result<com.eatfair.shared.model.driver.CreatePayoutResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall {
            val request = com.eatfair.shared.model.driver.CreatePayoutRequest(
                amount = amount,
                method = method
            )
            apiService.requestPayout(driverId, request, token)
        }
    }

    /**
     * Get payout history
     */
    suspend fun getPayoutHistory(
        limit: Int = 20,
        offset: Int = 0
    ): Result<com.eatfair.shared.model.driver.PayoutHistoryResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val driverId = secureStorage.driverId
        safeApiCall { apiService.getPayoutHistory(driverId, limit, offset, token) }
    }

    // ==========================================
    // VENDOR ORDERS
    // ==========================================

    suspend fun getVendorOrders(): Result<List<VendorOrder>> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val vendorId = secureStorage.vendorId
        safeApiCall { apiService.getVendorOrders(vendorId, token) }
    }

    /**
     * Update order status - generic method for any status change
     * Matches iOS updateOrderStatus and verified production backend
     */
    suspend fun updateOrderStatus(orderId: Int, status: String): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.updateOrderStatus(orderId, status, token) }
        }

    suspend fun acceptOrder(orderId: Int): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.acceptOrder(orderId, "confirmed", token) }
        }

    suspend fun rejectOrder(orderId: Int, reason: String): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.rejectOrder(orderId, "cancelled", token) }
        }

    suspend fun markOrderReady(orderId: Int): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.markOrderReady(orderId, "ready_for_pickup", token) }
        }

    // ==========================================
    // RESTAURANT ACCEPTANCE FLOW (3-minute window)
    // ==========================================

    /**
     * Restaurant accepts an order within 3-minute window
     */
    suspend fun restaurantAcceptOrder(orderId: Int): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.restaurantAcceptOrder(orderId, token) }
        }

    /**
     * Restaurant declines an order within 3-minute window
     */
    suspend fun restaurantDeclineOrder(orderId: Int, reason: String = "Restaurant unavailable"): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.restaurantDeclineOrder(orderId, mapOf("reason" to reason), token) }
        }

    // ==========================================
    // DELIVERY DECISION FLOW (3-minute window)
    // ==========================================

    /**
     * Restaurant accepts delivery (will self-deliver)
     */
    suspend fun restaurantAcceptDelivery(orderId: Int): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.restaurantAcceptDelivery(orderId, token) }
        }

    /**
     * Restaurant declines delivery (send to driver pool)
     */
    suspend fun restaurantDeclineDelivery(orderId: Int): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.restaurantDeclineDelivery(orderId, token) }
        }

    /**
     * Get single order details by ID
     * Fetches from vendor orders list and filters by order ID
     */
    suspend fun getOrderDetails(orderId: Int): Result<VendorOrder> =
        withContext(Dispatchers.IO) {
            getVendorOrders().fold(
                onSuccess = { orders ->
                    orders.find { it.id == orderId }
                        ?.let { Result.success(it) }
                        ?: Result.failure(Exception("Order not found"))
                },
                onFailure = { Result.failure(it) }
            )
        }

    // ==========================================
    // PAYMENTS
    // ==========================================

    suspend fun createPaymentIntent(
        amount: Int,
        currency: String = "usd"
    ): Result<PaymentIntentResponse> = withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        safeApiCall {
            val request = CreatePaymentIntentRequest(amount, currency)
            apiService.createPaymentIntent(request, token)
        }
    }

    // ==========================================
    // UTILITY
    // ==========================================

    val isCustomerLoggedIn: Boolean
        get() = secureStorage.isCustomerLoggedIn

    val isDriverLoggedIn: Boolean
        get() = secureStorage.isDriverLoggedIn

    val isVendorLoggedIn: Boolean
        get() = secureStorage.isVendorLoggedIn

    val customerName: String?
        get() = secureStorage.customerName

    val driverName: String?
        get() = secureStorage.driverName

    val vendorName: String?
        get() = secureStorage.vendorName

    // ==========================================
    // PUSH NOTIFICATIONS
    // ==========================================

    /**
     * Register FCM push token with backend
     * Works for all user types (customer, driver, vendor)
     */
    suspend fun registerPushToken(
        token: String,
        platform: String = "android",
        pushService: String = "fcm"
    ): Result<GenericResponse> = withContext(Dispatchers.IO) {
        // Try to get auth token for any logged in user
        val authToken = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
            ?: secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)
            ?: secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated"))

        // Determine user type
        val userType = when {
            secureStorage.isCustomerLoggedIn -> "customer"
            secureStorage.isDriverLoggedIn -> "driver"
            secureStorage.isVendorLoggedIn -> "vendor"
            else -> null
        }

        safeApiCall {
            val request = RegisterPushTokenRequest(
                token = token,
                platform = platform,
                pushService = pushService,
                userType = userType
            )
            apiService.registerPushToken(request, authToken)
        }
    }
}
