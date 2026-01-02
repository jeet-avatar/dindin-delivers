package com.eatfair.partner.notifications

import android.content.Intent
import android.util.Log
import com.eatfair.partner.MainActivity
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.notifications.DollorFirebaseMessagingService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Firebase Cloud Messaging Service for Dollor.ai Partner (Restaurant) App
 *
 * Handles push notifications for:
 * - New order notifications
 * - Driver assigned to order
 * - Order pickup notifications
 */
@AndroidEntryPoint
class PartnerFirebaseMessagingService : DollorFirebaseMessagingService() {

    @Inject
    lateinit var dollorRepository: DollorRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        private const val TAG = "PartnerFCM"
    }

    override fun onNotificationReceived(type: String, data: Map<String, String>) {
        Log.d(TAG, "Notification received: type=$type, data=$data")

        when (type) {
            // New order - CRITICAL for restaurant
            TYPE_NEW_ORDER -> handleNewOrder(data)

            // Driver updates
            TYPE_DRIVER_ASSIGNED -> handleDriverAssigned(data)
            "DRIVER_ARRIVED" -> handleDriverArrived(data)
            TYPE_ORDER_PICKED_UP -> handleOrderPickedUp(data)

            // Order status
            TYPE_ORDER_CANCELLED -> handleOrderCancelled(data)

            else -> Log.d(TAG, "Unknown notification type: $type")
        }
    }

    override fun getNotificationIntent(data: Map<String, String>): Intent {
        return Intent(this, MainActivity::class.java).apply {
            // Add deep link data for navigation
            data["order_id"]?.let { putExtra("order_id", it) }
            data["screen"]?.let { putExtra("screen", it) }

            // For new orders, navigate to orders screen
            if (data["type"] == TYPE_NEW_ORDER) {
                putExtra("screen", "orders")
            }
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

    private fun handleNewOrder(data: Map<String, String>) {
        val orderId = data["order_id"]
        val customerName = data["customer_name"]
        val orderTotal = data["order_total"]
        val itemCount = data["item_count"]
        Log.d(TAG, "New order received: orderId=$orderId, customer=$customerName, total=$orderTotal, items=$itemCount")

        // This is a critical notification - restaurant needs to see and accept quickly
        // Play sound / vibrate
    }

    private fun handleDriverAssigned(data: Map<String, String>) {
        val orderId = data["order_id"]
        val driverName = data["driver_name"]
        val eta = data["driver_eta"]
        Log.d(TAG, "Driver assigned: orderId=$orderId, driver=$driverName, eta=$eta")
    }

    private fun handleDriverArrived(data: Map<String, String>) {
        val orderId = data["order_id"]
        val driverName = data["driver_name"]
        Log.d(TAG, "Driver arrived for pickup: orderId=$orderId, driver=$driverName")

        // Important notification - driver is waiting
    }

    private fun handleOrderPickedUp(data: Map<String, String>) {
        val orderId = data["order_id"]
        Log.d(TAG, "Order picked up: orderId=$orderId")
    }

    private fun handleOrderCancelled(data: Map<String, String>) {
        val orderId = data["order_id"]
        val reason = data["cancellation_reason"]
        Log.d(TAG, "Order cancelled: orderId=$orderId, reason=$reason")
    }
}
