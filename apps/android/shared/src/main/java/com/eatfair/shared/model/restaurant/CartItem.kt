package com.eatfair.shared.model.restaurant

data class CartItem(
    val menuItem: MenuItem,
    val quantity: Int,
    val customizations: String = ""
)
