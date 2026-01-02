package com.eatfair.partner

import android.app.Application
import android.util.Log
import com.eatfair.shared.config.AppConfig
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class PartnerApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize AppConfig with production settings
        AppConfig.initialize(
            apiBaseUrl = BuildConfig.API_BASE_URL,
            isProduction = BuildConfig.IS_PRODUCTION
        )

        Log.d("PartnerApp", "==============================================")
        Log.d("PartnerApp", "Partner App initialized")
        Log.d("PartnerApp", "Environment: PRODUCTION")
        Log.d("PartnerApp", "API_BASE_URL: ${BuildConfig.API_BASE_URL}")
        Log.d("PartnerApp", "==============================================")
    }
}
