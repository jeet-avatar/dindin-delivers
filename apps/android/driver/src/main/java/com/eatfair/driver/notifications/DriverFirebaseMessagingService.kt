package com.eatfair.driver.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.eatfair.driver.MainActivity
import com.eatfair.driver.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class DriverFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // Handle data payload
        remoteMessage.data.isNotEmpty().let {
            handleDataMessage(remoteMessage.data)
        }

        // Handle notification payload
        remoteMessage.notification?.let {
            showNotification(it.title ?: "New Ride Request", it.body ?: "")
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: Send token to backend
    }

    private fun handleDataMessage(data: Map<String, String>) {
        val type = data["type"]
        when (type) {
            "ride_request" -> {
                val title = data["title"] ?: "New Ride Request"
                val body = data["body"] ?: "You have a new ride request"
                showNotification(title, body)
            }
            "ride_update" -> {
                val title = data["title"] ?: "Ride Update"
                val body = data["body"] ?: "Your ride status has been updated"
                showNotification(title, body)
            }
        }
    }

    private fun showNotification(title: String, body: String) {
        val channelId = "dollor_rides"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Ride Requests",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for new ride requests"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
