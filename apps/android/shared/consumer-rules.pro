# ============================================================
# Shared Module Consumer ProGuard Rules
# These rules are applied to all modules that depend on :shared
# ============================================================

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
