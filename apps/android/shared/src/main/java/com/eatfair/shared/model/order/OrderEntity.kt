package com.eatfair.shared.model.order

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.eatfair.shared.constants.OrderStatus

@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val orderId: String,
    val restaurantName: String,
    val restaurantImageUrl: String?,
    val orderStatus: OrderStatus,
    val estimatedTime: String,
    val orderTotal: Double,
    val orderTimestamp: Long = System.currentTimeMillis()
)