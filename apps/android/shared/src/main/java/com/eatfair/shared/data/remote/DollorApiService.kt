package com.eatfair.shared.data.remote

import com.eatfair.shared.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Dollor.AI API Service
 * Complete API interface matching iOS P2PAPIService.swift
 * PRODUCTION: https://api.dollor.ai (see AppConfig.API_BASE_URL)
 */
interface DollorApiService {

    // ==========================================
    // PUBLIC ENDPOINTS (No Auth Required)
    // ==========================================

    /**
     * Get list of published/approved restaurants for customer apps
     * Uses /api/vendors/published endpoint which returns only approved & published restaurants
     * Platform filter ensures only restaurants published for Android are returned
     */
    @GET("vendors/published")
    suspend fun getRestaurants(
        @Query("platform") platform: String = "android",
        @Query("city") city: String? = null,
        @Query("cuisine") cuisine: String? = null
    ): RestaurantsListResponse

    @GET("public/restaurants/{id}")
    suspend fun getRestaurantById(@Path("id") id: Int): RestaurantDetail

    // ==========================================
    // CUSTOMER AUTHENTICATION
    // ==========================================

    @FormUrlEncoded
    @POST("auth/customer/login")
    suspend fun customerLogin(
        @Field("username") email: String,
        @Field("password") password: String
    ): CustomerLoginResponse

    @POST("auth/customer/register")
    suspend fun customerRegister(@Body request: CustomerRegisterRequest): CustomerLoginResponse

    @POST("auth/customer/google")
    suspend fun customerGoogleAuth(@Body request: GoogleAuthRequest): CustomerLoginResponse

    @POST("auth/customer/apple-auth")
    suspend fun customerAppleAuth(@Body request: AppleAuthRequest): CustomerLoginResponse

    @POST("customer/password-reset/request")
    suspend fun customerPasswordReset(@Body request: PasswordResetRequest): GenericResponse

    /**
     * Request password reset code - sends code to email
     * Matches iOS: POST /customer/password-reset/request
     * Matches Backend: POST /api/customer/password-reset/request
     */
    @POST("customer/password-reset/request")
    suspend fun requestPasswordReset(@Body request: ForgotPasswordRequest): GenericResponse

    /**
     * Confirm password reset with code
     * Matches iOS: POST /customer/password-reset/confirm
     * Matches Backend: POST /api/customer/password-reset/confirm
     */
    @POST("customer/password-reset/confirm")
    suspend fun confirmPasswordResetWithCode(@Body request: ResetPasswordWithCodeRequest): GenericResponse

    /**
     * Confirm password reset with token
     * Matches iOS: POST /customer/password-reset/confirm
     */
    @POST("customer/password-reset/confirm")
    suspend fun confirmPasswordReset(@Body request: ConfirmPasswordResetRequest): GenericResponse

    /**
     * Update customer profile
     * Matches iOS: POST /customer/{customerId}/profile
     */
    @POST("customer/{customerId}/profile")
    suspend fun updateCustomerProfile(
        @Path("customerId") customerId: Int,
        @Body request: UpdateCustomerProfileRequest,
        @Header("Authorization") token: String
    ): CustomerProfileResponse

    /**
     * Demo login for App Store review - server validates demo accounts
     * No password required - server generates session for verified demo emails
     */
    @POST("customer/demo-login")
    suspend fun customerDemoLogin(@Body request: DemoLoginRequest): CustomerLoginResponse

    /**
     * Delete customer account - required by Google Play Store policy
     * Matches iOS: DELETE /api/customers/{customerId}/delete
     */
    @DELETE("customers/{customerId}/delete")
    suspend fun deleteCustomerAccount(
        @Path("customerId") customerId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // EMAIL VERIFICATION
    // ==========================================

    /**
     * Send email verification code to customer
     * POST /customer/email/send-verification
     */
    @POST("customer/email/send-verification")
    suspend fun sendEmailVerification(
        @Header("Authorization") token: String
    ): EmailVerificationSendResponse

    /**
     * Verify customer email with 6-digit code
     * POST /customer/email/verify
     */
    @POST("customer/email/verify")
    suspend fun verifyEmail(
        @Body request: VerifyEmailRequest,
        @Header("Authorization") token: String
    ): EmailVerificationResponse

    /**
     * Get email verification status
     * GET /customer/email/status
     */
    @GET("customer/email/status")
    suspend fun getEmailVerificationStatus(
        @Header("Authorization") token: String
    ): EmailVerificationStatusResponse

    // ==========================================
    // CUSTOMER ORDERS
    // ==========================================

    @GET("customer/orders")
    suspend fun getCustomerOrders(@Header("Authorization") token: String): List<Order>

    @GET("customer/{customerId}/active-orders")
    suspend fun getActiveOrders(
        @Path("customerId") customerId: Int,
        @Header("Authorization") token: String
    ): ActiveOrdersResponse

    @GET("customer/orders/{orderId}/track")
    suspend fun trackOrder(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderTrackingResponse

    @POST("orders/create")
    suspend fun createOrder(
        @Body request: CreateOrderRequest,
        @Header("Authorization") token: String
    ): CreateOrderResponse

    @POST("orders/{orderId}/tip-driver")
    suspend fun tipDriver(
        @Path("orderId") orderId: Int,
        @Body request: TipRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    /**
     * Cancel order - Matches iOS: POST /orders/{orderId}/cancel
     */
    @POST("orders/{orderId}/cancel")
    suspend fun cancelOrder(
        @Path("orderId") orderId: Int,
        @Body request: CancelOrderRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    /**
     * Get refund status - Matches iOS: GET /orders/{orderId}/refund-status
     */
    @GET("orders/{orderId}/refund-status")
    suspend fun getRefundStatus(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): RefundStatusResponse

    /**
     * Get order modification - Matches iOS: GET /orders/{orderId}/modification
     */
    @GET("orders/{orderId}/modification")
    suspend fun getOrderModification(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderModificationResponse

    /**
     * Respond to order modification - Matches iOS: POST /orders/{orderId}/modification/respond
     */
    @POST("orders/{orderId}/modification/respond")
    suspend fun respondToOrderModification(
        @Path("orderId") orderId: Int,
        @Body request: OrderModificationResponseRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    /**
     * Mark items unavailable - Matches iOS: POST /orders/{orderId}/mark-unavailable
     */
    @POST("orders/{orderId}/mark-unavailable")
    suspend fun markItemsUnavailable(
        @Path("orderId") orderId: Int,
        @Body request: MarkItemsUnavailableRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    @POST("customer/orders/{orderId}/rate-driver")
    suspend fun rateDriver(
        @Path("orderId") orderId: Int,
        @Body request: DriverRatingRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    @POST("customer/orders/{orderId}/chat")
    suspend fun sendOrderChat(
        @Path("orderId") orderId: Int,
        @Body request: ChatMessageRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    @GET("customer/orders/{orderId}/chat")
    suspend fun getOrderChat(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): List<ChatMessage>

    // ==========================================
    // CUSTOMER ADDRESSES
    // Aligned with iOS P2PAPIService (Uber/DoorDash pattern)
    // ==========================================

    @GET("addresses/{customerId}")
    suspend fun getAddresses(
        @Path("customerId") customerId: Int,
        @Header("Authorization") token: String
    ): List<Address>

    @GET("addresses/{customerId}/default")
    suspend fun getDefaultAddress(
        @Path("customerId") customerId: Int,
        @Header("Authorization") token: String
    ): Address

    @POST("addresses/{customerId}")
    suspend fun addAddress(
        @Path("customerId") customerId: Int,
        @Body address: AddAddressRequest,
        @Header("Authorization") token: String
    ): Address

    @PUT("addresses/{customerId}/{addressId}")
    suspend fun updateAddress(
        @Path("customerId") customerId: Int,
        @Path("addressId") addressId: Int,
        @Body address: UpdateAddressRequest,
        @Header("Authorization") token: String
    ): Address

    @DELETE("addresses/{customerId}/{addressId}")
    suspend fun deleteAddress(
        @Path("customerId") customerId: Int,
        @Path("addressId") addressId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    @POST("addresses/{customerId}/{addressId}/set-default")
    suspend fun setDefaultAddress(
        @Path("customerId") customerId: Int,
        @Path("addressId") addressId: Int,
        @Header("Authorization") token: String
    ): Address

    // ==========================================
    // CUSTOMER FAVORITES
    // Aligned with iOS P2PAPIService (Uber/DoorDash pattern)
    // ==========================================

    @GET("customer/favorites/{customerId}")
    suspend fun getFavorites(
        @Path("customerId") customerId: Int,
        @Header("Authorization") token: String
    ): List<RestaurantApiResponse>

    @POST("customer/favorites/{customerId}/{vendorId}")
    suspend fun addFavorite(
        @Path("customerId") customerId: Int,
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    @DELETE("customer/favorites/{customerId}/{vendorId}")
    suspend fun removeFavorite(
        @Path("customerId") customerId: Int,
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    @GET("customer/favorites/{customerId}/check/{vendorId}")
    suspend fun checkFavorite(
        @Path("customerId") customerId: Int,
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): FavoriteCheckResponse

    // ==========================================
    // CUSTOMER RIDESHARE
    // ==========================================

    @POST("rides/request")
    suspend fun requestRide(
        @Body request: RideRequest,
        @Header("Authorization") token: String
    ): RideResponse

    @GET("customer/rides")
    suspend fun getCustomerRides(@Header("Authorization") token: String): CustomerRidesResponse

    @GET("rides/{rideId}/track")
    suspend fun trackRide(
        @Path("rideId") rideId: Int,
        @Header("Authorization") token: String
    ): RideTrackingResponse

    @POST("rides/{rideId}/cancel")
    suspend fun cancelRide(
        @Path("rideId") rideId: Int,
        @Body request: CancelRideRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    @POST("rides/{rideId}/rate")
    suspend fun rateRide(
        @Path("rideId") rideId: Int,
        @Body request: RateRideRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    @POST("rides/estimate")
    suspend fun estimateRideFare(@Body request: RideEstimateRequest): RideEstimateResponse

    /**
     * Customer submit fare offer for negotiation
     * Matches iOS: POST /erp/rides/{rideId}/customer-negotiate
     */
    @POST("erp/rides/{rideId}/customer-negotiate")
    suspend fun customerSubmitFareOffer(
        @Path("rideId") rideId: Int,
        @Body request: CustomerFareOfferRequest,
        @Header("Authorization") token: String
    ): FareNegotiationResponse

    /**
     * Customer accept driver's fare offer
     * Matches iOS: POST /erp/rides/{rideId}/customer-accept-fare
     */
    @POST("erp/rides/{rideId}/customer-accept-fare")
    suspend fun customerAcceptDriverFare(
        @Path("rideId") rideId: Int,
        @Header("Authorization") token: String
    ): FareNegotiationResponse

    // ==========================================
    // CUSTOMER PAYMENT CARDS
    // Matches iOS P2PAPIService card management
    // ==========================================

    /**
     * Get saved payment cards
     * Matches iOS: GET /customers/{customerId}/cards
     */
    @GET("customers/{customerId}/cards")
    suspend fun getSavedCards(
        @Path("customerId") customerId: Int,
        @Header("Authorization") token: String
    ): SavedCardsResponse

    /**
     * Add new payment card
     * Matches iOS: POST /customers/{customerId}/cards
     */
    @POST("customers/{customerId}/cards")
    suspend fun addPaymentCard(
        @Path("customerId") customerId: Int,
        @Body request: AddCardRequest,
        @Header("Authorization") token: String
    ): PaymentCard

    /**
     * Delete payment card
     * Matches iOS: DELETE /customers/{customerId}/cards/{cardId}
     */
    @DELETE("customers/{customerId}/cards/{cardId}")
    suspend fun deletePaymentCard(
        @Path("customerId") customerId: Int,
        @Path("cardId") cardId: String,
        @Header("Authorization") token: String
    ): GenericResponse

    /**
     * Set default payment card
     * Matches iOS: POST /customers/{customerId}/cards/{cardId}/default
     */
    @POST("customers/{customerId}/cards/{cardId}/default")
    suspend fun setDefaultCard(
        @Path("customerId") customerId: Int,
        @Path("cardId") cardId: String,
        @Header("Authorization") token: String
    ): PaymentCard

    // ==========================================
    // PROMOTIONS & DEALS (Customer)
    // Matches iOS P2PAPIService promotions
    // ==========================================

    /**
     * Get active promotions for customers
     * Matches iOS: GET /api/promotions/active
     */
    @GET("promotions/active")
    suspend fun getActivePromotions(): ActivePromotionsResponse

    /**
     * Get featured deals for homepage
     * Matches iOS: GET /promotions/featured
     */
    @GET("promotions/featured")
    suspend fun getFeaturedDeals(): FeaturedDealsResponse

    /**
     * Apply promo code to order
     * Matches iOS: POST /promotions/apply
     */
    @POST("promotions/apply")
    suspend fun applyPromoCode(
        @Body request: ApplyPromoCodeRequest,
        @Header("Authorization") token: String
    ): ApplyPromoCodeResponse

    // ==========================================
    // DRIVER AUTHENTICATION
    // ==========================================

    @FormUrlEncoded
    @POST("auth/driver/login")
    suspend fun driverLogin(
        @Field("username") email: String,
        @Field("password") password: String
    ): DriverLoginResponse

    @POST("auth/driver/register")
    suspend fun driverRegister(@Body request: DriverRegisterRequest): DriverLoginResponse

    @POST("auth/driver/google")
    suspend fun driverGoogleAuth(@Body request: DriverGoogleAuthRequest): DriverLoginResponse

    @POST("auth/driver/apple-auth")
    suspend fun driverAppleAuth(@Body request: AppleAuthRequest): DriverLoginResponse

    @POST("auth/driver/forgot-password")
    suspend fun driverForgotPassword(@Body request: PasswordResetRequest): GenericResponse

    /**
     * Refresh driver auth token
     * Matches iOS: POST /auth/driver/refresh
     */
    @POST("auth/driver/refresh")
    suspend fun refreshDriverToken(
        @Header("Authorization") token: String
    ): DriverLoginResponse

    /**
     * Demo login for driver App Store review - server validates demo accounts
     */
    @POST("auth/driver/demo-login")
    suspend fun driverDemoLogin(@Body request: DemoLoginRequest): DriverLoginResponse

    // ==========================================
    // DRIVER PROFILE
    // ==========================================

    @GET("erp/drivers/{driverId}")
    suspend fun getDriverProfile(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverProfile

    @PUT("erp/drivers/{driverId}")
    suspend fun updateDriverProfile(
        @Path("driverId") driverId: Int,
        @Body request: UpdateDriverRequest,
        @Header("Authorization") token: String
    ): DriverProfile

    @GET("drivers/{driverId}/documents")
    suspend fun getDriverDocuments(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverDocumentsResponse

    @Multipart
    @POST("drivers/{driverId}/documents")
    suspend fun uploadDriverDocument(
        @Path("driverId") driverId: Int,
        @Part file: okhttp3.MultipartBody.Part,
        @Part("document_type") documentType: okhttp3.RequestBody,
        @Header("Authorization") token: String
    ): DocumentUploadResponse

    @GET("drivers/{driverId}/status")
    suspend fun getDriverStatus(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverStatusResponse

    @POST("drivers/{driverId}/status")
    suspend fun updateDriverStatus(
        @Path("driverId") driverId: Int,
        @Body request: UpdateDriverStatusRequest,
        @Header("Authorization") token: String
    ): DriverStatusResponse

    /**
     * Delete driver account - required by Google Play Store policy
     * Matches iOS: DELETE /api/drivers/{driverId}/delete
     */
    @DELETE("drivers/{driverId}/delete")
    suspend fun deleteDriverAccount(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // DRIVER DELIVERIES
    // ==========================================

    @GET("v2/driver/deliveries/available")
    suspend fun getAvailableDeliveries(
        @Header("Authorization") token: String
    ): List<AvailableDelivery>

    @GET("v2/driver/deliveries")
    suspend fun getMyDeliveries(
        @Header("Authorization") token: String
    ): List<Delivery>

    @GET("erp/driver/{driverId}/deliveries")
    suspend fun getDriverDeliveries(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): List<Delivery>

    @POST("v2/driver/deliveries/{deliveryId}/accept")
    suspend fun acceptDelivery(
        @Path("deliveryId") deliveryId: Int,
        @Header("Authorization") token: String
    ): DeliveryActionResponse

    @POST("v2/driver/deliveries/{deliveryId}/pickup")
    suspend fun markDeliveryPickedUp(
        @Path("deliveryId") deliveryId: Int,
        @Header("Authorization") token: String
    ): DeliveryActionResponse

    @POST("v2/driver/deliveries/{deliveryId}/complete")
    suspend fun completeDelivery(
        @Path("deliveryId") deliveryId: Int,
        @Header("Authorization") token: String
    ): DeliveryActionResponse

    @POST("driver/location")
    suspend fun updateDriverLocation(
        @Body request: DriverLocationRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // DRIVER DELIVERY DECISION (iOS Parity)
    // Matches iOS delivery decision flow
    // ==========================================

    /**
     * Start delivery decision flow
     * Matches iOS: POST /driver/start-delivery-decision
     */
    @POST("driver/start-delivery-decision")
    suspend fun startDeliveryDecision(
        @Body request: StartDeliveryDecisionRequest,
        @Header("Authorization") token: String
    ): DeliveryDecisionResponse

    /**
     * Make delivery decision (accept/reject)
     * Matches iOS: POST /driver/make-delivery-decision
     */
    @POST("driver/make-delivery-decision")
    suspend fun makeDeliveryDecision(
        @Body request: MakeDeliveryDecisionRequest,
        @Header("Authorization") token: String
    ): DeliveryDecisionResponse

    /**
     * Get delivery decision status
     * Matches iOS: GET /driver/delivery-decision-status/{id}
     */
    @GET("driver/delivery-decision-status/{decisionId}")
    suspend fun getDeliveryDecisionStatus(
        @Path("decisionId") decisionId: Int,
        @Header("Authorization") token: String
    ): DeliveryDecisionStatusResponse

    /**
     * Get pending delivery orders for driver
     * Matches iOS: GET /erp/orders/driver/{driverId}/pending
     */
    @GET("erp/orders/driver/{driverId}/pending")
    suspend fun getPendingDeliveryOrders(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): List<PendingDeliveryOrder>

    /**
     * Mark order as picked up (ERP endpoint)
     * Matches iOS: POST /erp/orders/{orderId}/picked-up
     */
    @POST("erp/orders/{orderId}/picked-up")
    suspend fun markOrderPickedUp(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Mark order as delivered (ERP endpoint)
     * Matches iOS: POST /erp/orders/{orderId}/delivered
     */
    @POST("erp/orders/{orderId}/delivered")
    suspend fun markOrderDelivered(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Unassign driver from delivery
     * Matches iOS: POST /erp/orders/{orderId}/unassign-driver
     */
    @POST("erp/orders/{orderId}/unassign-driver")
    suspend fun cancelDeliveryAssignment(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // DRIVER RIDESHARE
    // ==========================================

    @GET("v2/driver/rides/available")
    suspend fun getAvailableRides(
        @Header("Authorization") token: String
    ): List<AvailableRide>

    @GET("erp/driver/{driverId}/rides")
    suspend fun getDriverRides(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverRidesResponse

    @POST("v2/driver/rides/{rideId}/accept")
    suspend fun acceptRide(
        @Path("rideId") rideId: Int,
        @Header("Authorization") token: String
    ): RideActionResponse

    @POST("v2/driver/rides/{rideId}/arrive")
    suspend fun markRideArrived(
        @Path("rideId") rideId: Int,
        @Header("Authorization") token: String
    ): RideActionResponse

    @POST("v2/driver/rides/{rideId}/start")
    suspend fun startRide(
        @Path("rideId") rideId: Int,
        @Header("Authorization") token: String
    ): RideActionResponse

    @POST("v2/driver/rides/{rideId}/complete")
    suspend fun completeRide(
        @Path("rideId") rideId: Int,
        @Header("Authorization") token: String
    ): RideCompleteResponse

    @POST("v2/driver/rides/{rideId}/cancel")
    suspend fun driverCancelRide(
        @Path("rideId") rideId: Int,
        @Body request: CancelRideRequest,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // DRIVER EARNINGS & DASHBOARD
    // ==========================================

    @GET("drivers/{driverId}/earnings")
    suspend fun getDriverEarnings(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverEarningsResponse

    @GET("v2/driver/dashboard/{driverId}")
    suspend fun getDriverDashboard(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverDashboardResponse

    @GET("erp/driver/{driverId}/stats")
    suspend fun getDriverStats(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverStatsResponse

    // ==========================================
    // DRIVER PAYOUTS (ACH Bank Transfer)
    // ==========================================

    /**
     * Link bank account for payouts (Stripe Connect)
     */
    @POST("v2/driver/{driverId}/bank-account")
    suspend fun linkBankAccount(
        @Path("driverId") driverId: Int,
        @Body request: com.eatfair.shared.model.driver.LinkBankAccountRequest,
        @Header("Authorization") token: String
    ): com.eatfair.shared.model.driver.LinkBankAccountResponse

    /**
     * Get payout history
     */
    @GET("v2/driver/{driverId}/payouts")
    suspend fun getPayoutHistory(
        @Path("driverId") driverId: Int,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Header("Authorization") token: String
    ): com.eatfair.shared.model.driver.PayoutHistoryResponse

    /**
     * Request a payout (standard: 2-3 business days, instant: immediate with fee)
     */
    @POST("v2/driver/{driverId}/payouts")
    suspend fun requestPayout(
        @Path("driverId") driverId: Int,
        @Body request: com.eatfair.shared.model.driver.CreatePayoutRequest,
        @Header("Authorization") token: String
    ): com.eatfair.shared.model.driver.CreatePayoutResponse

    /**
     * Get available balance for payout
     */
    @GET("v2/driver/{driverId}/balance")
    suspend fun getDriverBalance(
        @Path("driverId") driverId: Int,
        @Header("Authorization") token: String
    ): DriverBalanceResponse

    // ==========================================
    // VENDOR/RESTAURANT AUTHENTICATION
    // ==========================================

    @FormUrlEncoded
    @POST("auth/vendor/login")
    suspend fun vendorLogin(
        @Field("username") email: String,
        @Field("password") password: String
    ): VendorLoginResponse

    @POST("auth/vendor/register")
    suspend fun vendorRegister(@Body request: VendorRegisterRequest): VendorLoginResponse

    @POST("auth/vendor/google-auth")
    suspend fun vendorGoogleAuth(@Body request: GoogleAuthRequest): VendorLoginResponse

    @POST("auth/vendor/apple-auth")
    suspend fun vendorAppleAuth(@Body request: AppleAuthRequest): VendorLoginResponse

    /**
     * Demo login for vendor App Store review - server validates demo accounts
     */
    @POST("auth/vendor/demo-login")
    suspend fun vendorDemoLogin(@Body request: DemoLoginRequest): VendorLoginResponse

    /**
     * Public vendor registration with full form data (matching Web 4-step form)
     * Used by RegistrationScreen for complete vendor onboarding
     * Backend: POST /api/vendors/public
     */
    @POST("vendors/public")
    suspend fun vendorPublicRegister(@Body data: Map<String, @JvmSuppressWildcards Any>): VendorRegistrationResponse

    /**
     * Delete vendor account - required by App Store/Play Store policy
     * Matches iOS: DELETE /vendors/{vendorId}/delete
     */
    @DELETE("vendors/{vendorId}/delete")
    suspend fun deleteVendorAccount(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // VENDOR PROFILE & SETTINGS
    // ==========================================

    /**
     * Get current vendor profile (uses auth token)
     * Backend: GET /api/vendor/profile
     */
    @GET("vendor/profile")
    suspend fun getVendorProfile(
        @Header("Authorization") token: String
    ): VendorProfileResponse

    /**
     * Get vendor by ID
     * Backend: GET /api/vendors/{vendorId}
     */
    @GET("vendors/{vendorId}")
    suspend fun getVendorById(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): VendorProfileResponse

    /**
     * Update vendor profile (partial update)
     * Backend: PATCH /api/vendors/{vendorId}
     */
    @PATCH("vendors/{vendorId}")
    suspend fun updateVendorProfile(
        @Path("vendorId") vendorId: Int,
        @Body request: UpdateVendorProfileRequest,
        @Header("Authorization") token: String
    ): VendorProfileResponse

    /**
     * Update vendor operating hours
     * Backend: PATCH /api/vendors/{vendorId} with operating_hours field
     */
    @PATCH("vendors/{vendorId}")
    suspend fun updateVendorBusinessHours(
        @Path("vendorId") vendorId: Int,
        @Body request: UpdateBusinessHoursRequest,
        @Header("Authorization") token: String
    ): VendorProfileResponse

    /**
     * Update vendor notification preferences
     * Backend: PATCH /api/vendors/{vendorId} with notification_preferences field
     */
    @PATCH("vendors/{vendorId}")
    suspend fun updateVendorNotificationSettings(
        @Path("vendorId") vendorId: Int,
        @Body request: UpdateNotificationSettingsRequest,
        @Header("Authorization") token: String
    ): VendorProfileResponse

    /**
     * Update vendor online status
     * Backend: PATCH /api/vendors/{vendorId} with is_online field
     */
    @PATCH("vendors/{vendorId}")
    suspend fun updateVendorOnlineStatus(
        @Path("vendorId") vendorId: Int,
        @Body request: UpdateOnlineStatusRequest,
        @Header("Authorization") token: String
    ): VendorProfileResponse

    // ==========================================
    // VENDOR DOCUMENTS
    // ==========================================

    /**
     * Get vendor documents
     * Backend: GET /api/vendors/{vendorId}/documents
     */
    @GET("vendors/{vendorId}/documents")
    suspend fun getVendorDocuments(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): VendorDocumentsResponse

    /**
     * Upload vendor document
     * Backend: POST /api/vendors/{vendorId}/documents
     */
    @Multipart
    @POST("vendors/{vendorId}/documents")
    suspend fun uploadVendorDocument(
        @Path("vendorId") vendorId: Int,
        @Part file: okhttp3.MultipartBody.Part,
        @Part("document_type") documentType: okhttp3.RequestBody,
        @Header("Authorization") token: String
    ): DocumentUploadResponse

    /**
     * Delete vendor document
     * Backend: DELETE /api/vendors/{vendorId}/documents/{documentId}
     */
    @DELETE("vendors/{vendorId}/documents/{documentId}")
    suspend fun deleteVendorDocument(
        @Path("vendorId") vendorId: Int,
        @Path("documentId") documentId: Int,
        @Header("Authorization") token: String
    ): GenericResponse

    // ==========================================
    // VENDOR PAYOUTS
    // ==========================================

    /**
     * Get vendor payout balance and settings
     * Backend: GET /api/vendors/{vendorId}/payouts
     */
    @GET("vendors/{vendorId}/payouts")
    suspend fun getVendorPayouts(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): VendorPayoutsResponse

    /**
     * Update vendor bank account for payouts
     * Backend: POST /api/vendors/{vendorId}/bank-account
     */
    @POST("vendors/{vendorId}/bank-account")
    suspend fun updateVendorBankAccount(
        @Path("vendorId") vendorId: Int,
        @Body request: VendorBankAccountRequest,
        @Header("Authorization") token: String
    ): VendorPayoutsResponse

    // ==========================================
    // VENDOR ORDERS
    // ==========================================

    @GET("erp/orders/vendor/{vendorId}")
    suspend fun getVendorOrders(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): List<VendorOrder>

    @GET("vendors/{vendorId}/orders")
    suspend fun getVendorOrdersAlt(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): List<VendorOrder>

    /**
     * Update order status - matches iOS and verified backend
     * Use status values: confirmed, preparing, ready_for_pickup, cancelled
     */
    @PATCH("orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Path("orderId") orderId: Int,
        @Query("status") status: String,
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Accept order - alias for updateOrderStatus with status=confirmed
     * Matches verified backend endpoint
     */
    @PATCH("orders/{orderId}/status")
    suspend fun acceptOrder(
        @Path("orderId") orderId: Int,
        @Query("status") status: String = "confirmed",
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Reject order via status update
     */
    @PATCH("orders/{orderId}/status")
    suspend fun rejectOrder(
        @Path("orderId") orderId: Int,
        @Query("status") status: String = "cancelled",
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Mark order ready for pickup
     * Matches verified backend: PATCH /api/orders/{id}/status?status=ready_for_pickup
     */
    @PATCH("orders/{orderId}/status")
    suspend fun markOrderReady(
        @Path("orderId") orderId: Int,
        @Query("status") status: String = "ready_for_pickup",
        @Header("Authorization") token: String
    ): OrderActionResponse

    // ==========================================
    // RESTAURANT ACCEPTANCE FLOW (3-minute window)
    // ==========================================

    /**
     * Restaurant accepts an order within 3-minute window
     * POST /api/erp/orders/{orderId}/restaurant-accept
     */
    @POST("erp/orders/{orderId}/restaurant-accept")
    suspend fun restaurantAcceptOrder(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Restaurant declines an order within 3-minute window
     * POST /api/erp/orders/{orderId}/restaurant-decline
     */
    @POST("erp/orders/{orderId}/restaurant-decline")
    suspend fun restaurantDeclineOrder(
        @Path("orderId") orderId: Int,
        @Body reason: Map<String, String>,
        @Header("Authorization") token: String
    ): OrderActionResponse

    // ==========================================
    // DELIVERY DECISION FLOW (3-minute window)
    // ==========================================

    /**
     * Restaurant accepts delivery (will self-deliver)
     * POST /api/erp/orders/{orderId}/restaurant-accept-delivery
     */
    @POST("erp/orders/{orderId}/restaurant-accept-delivery")
    suspend fun restaurantAcceptDelivery(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderActionResponse

    /**
     * Restaurant declines delivery (send to driver pool)
     * POST /api/erp/orders/{orderId}/restaurant-decline-delivery
     */
    @POST("erp/orders/{orderId}/restaurant-decline-delivery")
    suspend fun restaurantDeclineDelivery(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderActionResponse

    // ==========================================
    // VENDOR MENU MANAGEMENT
    // ==========================================

    @GET("vendors/{vendorId}/menu")
    suspend fun getVendorMenu(
        @Path("vendorId") vendorId: Int
    ): List<MenuItem>

    @GET("vendors/{vendorId}/menu/categories")
    suspend fun getMenuCategories(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): MenuCategoriesResponse

    @POST("vendors/{vendorId}/menu")
    suspend fun addMenuItem(
        @Path("vendorId") vendorId: Int,
        @Body item: CreateMenuItemRequest,
        @Header("Authorization") token: String
    ): MenuItem

    @PUT("vendors/{vendorId}/menu/{itemId}")
    suspend fun updateMenuItem(
        @Path("vendorId") vendorId: Int,
        @Path("itemId") itemId: Int,
        @Body updates: UpdateMenuItemRequest,
        @Header("Authorization") token: String
    ): MenuItem

    @PATCH("vendors/{vendorId}/menu/{itemId}")
    suspend fun patchMenuItem(
        @Path("vendorId") vendorId: Int,
        @Path("itemId") itemId: Int,
        @Body updates: Map<String, @JvmSuppressWildcards Any>,
        @Header("Authorization") token: String
    ): MenuItem

    @DELETE("vendors/{vendorId}/menu/{itemId}")
    suspend fun deleteMenuItem(
        @Path("vendorId") vendorId: Int,
        @Path("itemId") itemId: Int,
        @Header("Authorization") token: String
    ): Response<Unit>

    // ==========================================
    // VENDOR PROMOTIONS
    // ==========================================

    @GET("promotions/vendor/{vendorId}")
    suspend fun getVendorPromotions(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): PromotionsResponse

    @POST("promotions/create")
    suspend fun createPromotion(
        @Query("vendor_id") vendorId: Int,
        @Body promotion: CreatePromotionRequest,
        @Header("Authorization") token: String
    ): Promotion

    @PUT("promotions/{promotionId}")
    suspend fun updatePromotion(
        @Path("promotionId") promotionId: Int,
        @Body updates: Map<String, @JvmSuppressWildcards Any>,
        @Header("Authorization") token: String
    ): Promotion

    @DELETE("promotions/{promotionId}")
    suspend fun deletePromotion(
        @Path("promotionId") promotionId: Int,
        @Header("Authorization") token: String
    ): Response<Unit>

    @GET("promotions/analytics/{vendorId}")
    suspend fun getPromotionAnalytics(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): PromotionAnalyticsResponse

    @GET("promotions/suggestions/{vendorId}")
    suspend fun getPromotionSuggestions(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): PromotionSuggestionsResponse

    // ==========================================
    // PAYMENTS
    // ==========================================

    @POST("payments/create-intent")
    suspend fun createPaymentIntent(
        @Body request: CreatePaymentIntentRequest,
        @Header("Authorization") token: String
    ): PaymentIntentResponse

    // ==========================================
    // ORDER TRACKING & DRIVER LOCATION
    // ==========================================

    @GET("erp/orders/{orderId}/full-tracking")
    suspend fun getFullOrderTracking(
        @Path("orderId") orderId: Int
    ): FullOrderTrackingResponse

    @GET("erp/orders/{orderId}/driver-location")
    suspend fun getDriverLocation(
        @Path("orderId") orderId: Int
    ): DriverLocationResponse

    // ==========================================
    // LEGAL & PUBLIC PAGES
    // ==========================================

    @GET("legal/tos")
    suspend fun getTermsOfService(): Response<String>

    @GET("legal/privacy-policy")
    suspend fun getPrivacyPolicy(): Response<String>

    // ==========================================
    // AI EMPLOYEES & ANALYTICS
    // ==========================================

    @GET("erp/analytics/ai-employees")
    suspend fun getAIEmployeesStats(
        @Header("Authorization") token: String
    ): AIEmployeesStatsResponse

    @GET("menu-verification/status/{vendorId}")
    suspend fun getMenuVerificationStatus(
        @Path("vendorId") vendorId: Int,
        @Header("Authorization") token: String
    ): MenuVerificationStatusResponse

    // ==========================================
    // PUSH NOTIFICATIONS
    // ==========================================

    /**
     * Register FCM push token with backend
     * Called when app starts and when token refreshes
     */
    @POST("notifications/register-token")
    suspend fun registerPushToken(
        @Body request: RegisterPushTokenRequest,
        @Header("Authorization") token: String
    ): GenericResponse
}
