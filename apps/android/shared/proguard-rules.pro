# ============================================================
# Shared Module ProGuard Rules
# ============================================================

# Keep source file names and line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================================
# API Service Interfaces - CRITICAL for Retrofit
# ============================================================
-keep interface com.eatfair.shared.data.remote.DollorApiService { *; }
-keep class com.eatfair.shared.data.remote.** { *; }

# ============================================================
# Model Classes - CRITICAL for Gson serialization
# ============================================================
-keep class com.eatfair.shared.model.** { *; }
-keepclassmembers class com.eatfair.shared.model.** { *; }

# ============================================================
# Config Classes
# ============================================================
-keep class com.eatfair.shared.config.** { *; }

# ============================================================
# Repository Classes
# ============================================================
-keep class com.eatfair.shared.data.repository.** { *; }

# ============================================================
# Retrofit Generic Type Preservation
# ============================================================
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*

# Keep Kotlin coroutines continuation for suspend functions
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation