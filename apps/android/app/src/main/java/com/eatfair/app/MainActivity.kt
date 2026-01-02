package com.eatfair.app

import android.animation.ObjectAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.OvershootInterpolator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.core.animation.doOnEnd
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.navigation.compose.rememberNavController
import com.eatfair.app.ui.navigation.NavigationGraph
import com.eatfair.app.ui.theme.DollorTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    var showSplashScreen = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        installSplashScreen().apply {
            setKeepOnScreenCondition { showSplashScreen }

            setOnExitAnimationListener { splashScreenView ->
                // Safely get iconView - can be null on some devices
                val iconView = splashScreenView.iconView
                if (iconView == null) {
                    splashScreenView.remove()
                    return@setOnExitAnimationListener
                }

                val zoomX = ObjectAnimator.ofFloat(
                    iconView,
                    View.SCALE_X, 0.5f, 0.0f
                )

                val zoomY = ObjectAnimator.ofFloat(
                    iconView,
                    View.SCALE_Y, 0.5f, 0.0f
                )
                zoomX.duration = 500L
                zoomY.duration = 500L

                zoomX.interpolator = OvershootInterpolator()
                zoomY.interpolator = OvershootInterpolator()

                zoomX.doOnEnd { splashScreenView.remove() }
                zoomY.doOnEnd { splashScreenView.remove() }

                zoomX.start()
                zoomY.start()

            }
        }

        enableEdgeToEdge()

        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            DollorTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        NavigationGraph()
                    }
                }
            }
        }

        CoroutineScope(Dispatchers.IO).launch {
            delay(2000)
            showSplashScreen = false
        }
    }
}