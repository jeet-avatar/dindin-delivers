import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)

    id("kotlin-parcelize")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.eatfair.partner"
    compileSdk = 35

    lint {
        disable += "NullSafeMutableLiveData"
        disable += "FrequentlyChangingValue"
        disable += "RememberInComposition"
        disable += "AutoboxingStateCreation"
        checkReleaseBuilds = false
        abortOnError = false
    }

    // Load properties from local.properties
    val localProperties = Properties()
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        localProperties.load(localPropertiesFile.inputStream())
    }

    signingConfigs {
        create("release") {
            // Release signing - keys loaded from local.properties
            val keystorePath = localProperties.getProperty("RELEASE_KEYSTORE_PATH", "")
            if (keystorePath.isNotEmpty()) {
                storeFile = file(keystorePath)
                storePassword = localProperties.getProperty("RELEASE_KEYSTORE_PASSWORD", "")
                keyAlias = localProperties.getProperty("RELEASE_KEY_ALIAS_PARTNER", localProperties.getProperty("RELEASE_KEY_ALIAS", ""))
                keyPassword = localProperties.getProperty("RELEASE_KEY_PASSWORD", "")
            }
        }
    }

    // Dollor.ai by Vibing World Inc - Partner App
    defaultConfig {
        applicationId = "ai.dollor.partner"
        minSdk = 24
        targetSdk = 35
        versionCode = 13
        versionName = "1.0.12"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // API Keys from local.properties
        buildConfigField("String", "STRIPE_PUBLISHABLE_KEY", "\"${localProperties.getProperty("STRIPE_PUBLISHABLE_KEY", "")}\"")

        // App name
        resValue("string", "app_name", "Dollor Partner")
    }

    // Environment-specific configurations
    flavorDimensions += "environment"
    productFlavors {
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            buildConfigField("Boolean", "IS_PRODUCTION", "false")
            buildConfigField("String", "API_BASE_URL", "\"https://d3kuu45w6kl8hr.cloudfront.net/api\"")
            resValue("string", "app_name", "Dollor Partner Staging")
        }
        create("production") {
            dimension = "environment"
            buildConfigField("Boolean", "IS_PRODUCTION", "true")
            buildConfigField("String", "API_BASE_URL", "\"https://api.dollor.ai/api\"")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            ndk {
                debugSymbolLevel = "FULL"
            }
            // Use release signing config if keystore is configured
            val keystorePath = localProperties.getProperty("RELEASE_KEYSTORE_PATH", "")
            if (keystorePath.isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        jvmToolchain(17)
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.kotlin.stdlib)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)

    implementation(libs.core.splashscreen)
    implementation(libs.androidx.compose.ui.text.google.fonts)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.compose.material.icons.extended)

    // Hilt dependencies
    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)

    // Hilt Compose integration
    implementation(libs.androidx.hilt.navigation.compose)

    // Coil Image Loading
    implementation(libs.coil.kt.coil.compose)

    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.datastore.preferences)

    // Google Maps and Location
    implementation(libs.maps.compose)
    implementation(libs.play.services.maps)
    implementation(libs.play.services.location)

    // Networking for rideshare API
    implementation(libs.okhttp)
    implementation(libs.gson)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

configurations.all {
    resolutionStrategy {
        force("androidx.core:core-ktx:1.15.0")
        force("androidx.core:core:1.15.0")
    }
}