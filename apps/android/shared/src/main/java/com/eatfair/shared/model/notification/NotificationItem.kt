package com.eatfair.shared.model.notification

data class NotificationItem(
    val id: Int,
    val title: String,
    val message: String,
    val time: String,
    val isRead: Boolean = false
)
