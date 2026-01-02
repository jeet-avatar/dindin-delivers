package com.eatfair.shared.model.search

data class SearchResultDto(
    val id: Int,
    val name: String,
    val category: String,
    val rating: Double,
    val imageUrl: String? = null,
    val deliveryTime: String? = null, // e.g., "25-35 min"
    val distance: Double? = null, // in km
    val priceRange: String? = null // e.g., "$", "$$", "$$$"
)
