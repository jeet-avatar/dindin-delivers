package com.eatfair.shared.model.restaurant

data class MenuItem(
    val id: Int,
    val name: String,
    val price: Float,
    val description: String,
    val isVeg: Boolean,
    val isHighlyOrdered: Boolean,
    val isCustomizable: Boolean,
    val categoryId: Int,
    val imageUrl: String,
    val restaurantId: Int,
    val isAvailable: Boolean = true
)