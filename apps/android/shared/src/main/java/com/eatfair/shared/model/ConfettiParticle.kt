package com.eatfair.shared.model

import androidx.compose.ui.graphics.Color

data class ConfettiParticle(
    val x: Float,
    val y: Float,
    val size: Float,
    val color: Color,
    val rotation: Float,
    val velocity: Float
)
