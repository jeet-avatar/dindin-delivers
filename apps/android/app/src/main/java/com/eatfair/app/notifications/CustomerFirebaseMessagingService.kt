package com.eatfair.app.notifications

import android.content.Intent
import android.util.Log
import com.eatfair.app.MainActivity
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.notifications.DollorFirebaseMessagingService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Firebase Cloud Messaging Service for Dollor.ai Customer App
 *
 * Handles push notifications for:
 * - Order updates (confirmed, preparing, ready, picked up, delivered)
 * - Ride updates (driver accepted, arriving, started, completed)
 * - Promotions and general notifications
 */
@AndroidEntryPoint
class CustomerFirebaseMessagingService : DollorFirebaseMessagingService() {

    @Inject
    lateinit var dollorRepository: DollorRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        private const val TAG = "CustomerFCM"
    }

    override fun onNotificationReceived(type: String, data: Map<String, String>) {
        Log.d(TAG, "Notification received: type=$type, data=$data")

        when (type) {
            // Order notifications
            TYPE_ORDER_CONFIRMED -> handleOrderUpdate(data, "Your order has been confirmed!")
            TYPE_ORDER_PREPARING -> handleOrderUpdate(data, "Your order is being prepared")
            TYPE_ORDER_READY -> handleOrderUpdate(data, "Your order is ready for pickup!")
            TYPE_ORDER_PICKED_UP -> handleOrderUpdate(data, "Driver has picked up your order")
            TYPE_ORDER_DELIVERED -> handleOrderUpdate(data, "Your order has been delivered!")
            TYPE_ORDER_CANCELLED -> handleOrderUpdate(data, "Your order was cancelled")

            // Ride notifications
            TYPE_RIDE_ACCEPTED -> handleRideUpdate(data, "Driver accepted your ride!")
            TYPE_DRIVER_ARRIVING -> handleRideUpdate(data, "Your driver is arriving")
            TYPE_RIDE_STARTED -> handleRideUpdate(data, "Your ride has started")
            TYPE_RIDE_COMPLETED -> handleRideUpdate(data, "Your ride is complete")
            TYPE_RIDE_CANCELLED -> handleRideUpdate(data, "Your ride was cancelled")

            // Promotions
            TYPE_PROMOTION -> handlePromotion(data)

            else -> Log.d(TAG, "Unknown notification type: $type")
        }
    }

    override fun getNotificationIntent(data: Map<String, String>): Intent {
        return Intent(this, MainActivity::class.java).apply {
            // Add deep link data for navigation
            data["order_id"]?.let { putExtra("order_id", it) }
            data["ride_id"]?.let { putExtra("ride_id", it) }
            data["screen"]?.let { putExtra("screen", it) }
        }
    }

    override fun sendTokenToServer(token: String) {
        Log.d(TAG, "Sending FCM token to server: ${token.take(20)}...")
        serviceScope.launch {
            try {
                val result = dollorRepository.registerPushToken(token, "android", "fcm")
                result.fold(
                    onSuccess = { Log.d(TAG, "FCM token registered successfully") },
                    onFailure = { Log.e(TAG, "Failed to register FCM token: ${it.message}") }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error registering FCM token: ${e.message}")
            }
        }
    }

    private fun handleOrderUpdate(data: Map<String, String>, defaultMessage: String) {
        val orderId = data["order_id"]
        Log.d(TAG, "Order update: orderId=$orderId")
        // Could trigger local data refresh here if needed
    }

    private fun handleRideUpdate(data: Map<String, String>, defaultMessage: String) {
        val rideId = data["ride_id"]
        Log.d(TAG, "Ride update: rideId=$rideId")
        // Could trigger local data refresh here if needed
    }

    private fun handlePromotion(data: Map<String, String>) {
        val promoCode = data["promo_code"]
        Log.d(TAG, "Promotion received: promoCode=$promoCode")
    }
}
