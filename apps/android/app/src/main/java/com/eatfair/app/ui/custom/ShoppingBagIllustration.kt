package com.eatfair.app.ui.custom

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ShoppingBagIllustration() {
    Box(
        modifier = Modifier
            .size(280.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .size(200.dp)
        ) {
            val width = size.width
            val height = size.height

            // Draw shopping bag body (gradient)
            val bagPath = Path().apply {
                moveTo(width * 0.2f, height * 0.3f)
                lineTo(width * 0.15f, height * 0.95f)
                lineTo(width * 0.85f, height * 0.95f)
                lineTo(width * 0.8f, height * 0.3f)
                close()
            }

            drawPath(
                path = bagPath,
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFFFCD34D),
                        Color(0xFFFB923C),
                        Color(0xFFEC4899)
                    )
                )
            )

            // Draw handles
            val handlePath1 = Path().apply {
                moveTo(width * 0.35f, height * 0.3f)
                cubicTo(
                    width * 0.35f, height * 0.15f,
                    width * 0.45f, height * 0.1f,
                    width * 0.5f, height * 0.1f
                )
            }

            val handlePath2 = Path().apply {
                moveTo(width * 0.5f, height * 0.1f)
                cubicTo(
                    width * 0.55f, height * 0.1f,
                    width * 0.65f, height * 0.15f,
                    width * 0.65f, height * 0.3f
                )
            }

            drawPath(
                path = handlePath1,
                color = Color(0xFF6B7280),
                style = Stroke(width = 8f)
            )

            drawPath(
                path = handlePath2,
                color = Color(0xFF6B7280),
                style = Stroke(width = 8f)
            )
        }

        Text(
            text = "Dollor.ai",
            fontSize = 36.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFFD97706),
            style = androidx.compose.ui.text.TextStyle(
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
            ),
            modifier = Modifier.offset(y = 20.dp)
        )
    }
}

