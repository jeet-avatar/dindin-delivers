package com.eatfair.partner.ui.common

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

/**
 * Premium loading indicator with smooth animation
 * Inspired by world-class delivery apps
 */
@Composable
fun LoadingIndicator(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFFFF6B35)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "loading")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    Canvas(modifier = modifier.size(48.dp)) {
        val canvasWidth = size.width
        val canvasHeight = size.height
        val radius = size.minDimension / 2
        val centerX = canvasWidth / 2
        val centerY = canvasHeight / 2

        // Draw arc
        drawArc(
            color = color,
            startAngle = rotation,
            sweepAngle = 270f,
            useCenter = false,
            topLeft = Offset(centerX - radius, centerY - radius),
            size = androidx.compose.ui.geometry.Size(radius * 2, radius * 2),
            style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

/**
 * Pulsing dot indicator for real-time updates
 */
@Composable
fun PulsingDot(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF10B981)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    Canvas(modifier = modifier.size(12.dp)) {
        drawCircle(
            color = color.copy(alpha = alpha),
            radius = size.minDimension / 2 * scale
        )
    }
}
