package com.eatfair.shared.model.home

import androidx.compose.ui.graphics.Color

data class CarouselItem(
    val id: Int,
    val title: String,
    val subtitle: String,
    val description: String,
    val backgroundColor: Color,
    val imageUrl: String? = null
)
