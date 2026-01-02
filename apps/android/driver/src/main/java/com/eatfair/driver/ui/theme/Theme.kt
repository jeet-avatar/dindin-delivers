package com.eatfair.driver.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = DollorDriverColors.Blue,
    onPrimary = DollorDriverColors.White,
    primaryContainer = DollorDriverColors.BlueLight,
    onPrimaryContainer = DollorDriverColors.BlueDark,
    secondary = DollorDriverColors.Green,
    onSecondary = DollorDriverColors.White,
    secondaryContainer = DollorDriverColors.GreenLight,
    onSecondaryContainer = DollorDriverColors.GreenDark,
    tertiary = DollorDriverColors.Orange,
    onTertiary = DollorDriverColors.White,
    tertiaryContainer = DollorDriverColors.Orange.copy(alpha = 0.2f),
    onTertiaryContainer = DollorDriverColors.OrangeDark,
    error = DollorDriverColors.Error,
    onError = DollorDriverColors.White,
    errorContainer = DollorDriverColors.Error.copy(alpha = 0.1f),
    onErrorContainer = DollorDriverColors.Error,
    background = DollorDriverColors.Background,
    onBackground = DollorDriverColors.Gray900,
    surface = DollorDriverColors.Surface,
    onSurface = DollorDriverColors.Gray900,
    surfaceVariant = DollorDriverColors.SurfaceVariant,
    onSurfaceVariant = DollorDriverColors.Gray600,
    outline = DollorDriverColors.Gray300,
    outlineVariant = DollorDriverColors.Gray200
)

private val DarkColorScheme = darkColorScheme(
    primary = DollorDriverColors.BlueLight,
    onPrimary = DollorDriverColors.BlueDark,
    primaryContainer = DollorDriverColors.BlueDark,
    onPrimaryContainer = DollorDriverColors.BlueLight,
    secondary = DollorDriverColors.GreenLight,
    onSecondary = DollorDriverColors.GreenDark,
    secondaryContainer = DollorDriverColors.GreenDark,
    onSecondaryContainer = DollorDriverColors.GreenLight,
    tertiary = DollorDriverColors.Orange,
    onTertiary = DollorDriverColors.White,
    tertiaryContainer = DollorDriverColors.OrangeDark,
    onTertiaryContainer = DollorDriverColors.Orange,
    error = DollorDriverColors.Error,
    onError = DollorDriverColors.White,
    errorContainer = DollorDriverColors.Error.copy(alpha = 0.2f),
    onErrorContainer = DollorDriverColors.Error,
    background = DollorDriverColors.Gray900,
    onBackground = DollorDriverColors.White,
    surface = DollorDriverColors.Gray800,
    onSurface = DollorDriverColors.White,
    surfaceVariant = DollorDriverColors.Gray700,
    onSurfaceVariant = DollorDriverColors.Gray300,
    outline = DollorDriverColors.Gray600,
    outlineVariant = DollorDriverColors.Gray700
)

@Composable
fun DollorDriverTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
