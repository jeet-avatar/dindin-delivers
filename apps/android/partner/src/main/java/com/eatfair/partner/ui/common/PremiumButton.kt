package com.eatfair.partner.ui.common

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.partner.ui.theme.BrandOrange
import com.eatfair.partner.ui.theme.BrandOrangeDark

/**
 * Premium button with gradient and elevation
 * Matches world-class delivery app standards
 */
@Composable
fun PremiumButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    variant: ButtonVariant = ButtonVariant.PRIMARY
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    val elevation by animateDpAsState(
        targetValue = if (isPressed) 2.dp else 4.dp,
        animationSpec = tween(100),
        label = "elevation"
    )
    
    val backgroundColor = when (variant) {
        ButtonVariant.PRIMARY -> Brush.horizontalGradient(
            colors = listOf(BrandOrange, BrandOrangeDark)
        )
        ButtonVariant.SECONDARY -> Brush.horizontalGradient(
            colors = listOf(Color(0xFF06D6A0), Color(0xFF05B88A))
        )
        ButtonVariant.DANGER -> Brush.horizontalGradient(
            colors = listOf(Color(0xFFEF4444), Color(0xFFDC2626))
        )
    }

    Box(
        modifier = modifier
            .shadow(elevation, RoundedCornerShape(12.dp))
            .background(
                brush = if (enabled) backgroundColor else Brush.horizontalGradient(
                    colors = listOf(Color(0xFFBDBDBD), Color(0xFF9E9E9E))
                ),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(
                onClick = onClick,
                enabled = enabled,
                interactionSource = interactionSource,
                indication = null
            )
            .padding(horizontal = 24.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = text,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

enum class ButtonVariant {
    PRIMARY,
    SECONDARY,
    DANGER
}

/**
 * Premium outlined button for secondary actions
 */
@Composable
fun PremiumOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    color: Color = BrandOrange
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(48.dp),
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = color,
            disabledContentColor = Color.Gray
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 2.dp,
            color = if (enabled) color else Color.Gray
        )
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(
            text = text,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}
