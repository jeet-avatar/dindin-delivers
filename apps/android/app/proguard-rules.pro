# ============================================================
# Dollor.AI Customer App - ProGuard Rules
# ============================================================

# Keep source file names and line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================================
# Kotlin
# ============================================================
-dontwarn kotlin.**
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# ============================================================
# Android Jetpack / AndroidX
# ============================================================
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# Lifecycle
-keepclassmembers class * implements androidx.lifecycle.LifecycleObserver {
    <init>(...);
}
-keepclassmembers class * extends androidx.lifecycle.ViewModel {
    <init>(...);
}
-keepclassmembers class androidx.lifecycle.Lifecycle$State { *; }
-keepclassmembers class androidx.lifecycle.Lifecycle$Event { *; }

# Navigation
-keepnames class androidx.navigation.fragment.NavHostFragment

# DataStore
-keepclassmembers class * extends com.google.protobuf.GeneratedMessageLite {
    <fields>;
}

# ============================================================
# Jetpack Compose
# ============================================================
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Keep Compose runtime classes
-keep class androidx.compose.runtime.** { *; }
-keep class androidx.compose.ui.** { *; }
-keep class androidx.compose.material3.** { *; }
-keep class androidx.compose.foundation.** { *; }

# ============================================================
# Hilt / Dagger
# ============================================================
-dontwarn dagger.**
-keep class dagger.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ComponentSupplier { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

-keepclasseswithmembers class * {
    @dagger.* <methods>;
}
-keepclasseswithmembers class * {
    @javax.inject.* <fields>;
}
-keepclasseswithmembers class * {
    @javax.inject.* <init>(...);
}

# Hilt ViewModels - CRITICAL: Keep all HiltViewModel annotated classes
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * extends androidx.lifecycle.ViewModel {
    <init>(...);
    *;
}

# Keep Hilt generated ViewModel factories
-keep class **_HiltModules* { *; }
-keep class **_Factory { *; }
-keep class **_GeneratedInjector { *; }
-keep class *Hilt_* { *; }

# Keep all Hilt internal classes
-keep class dagger.hilt.** { *; }
-keep class hilt_aggregated_deps.** { *; }

# Keep ViewModel with @Inject constructor
-keepclasseswithmembers class * extends androidx.lifecycle.ViewModel {
    @javax.inject.Inject <init>(...);
}

# ============================================================
# Room Database
# ============================================================
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

-keepclassmembers class * {
    @androidx.room.* <methods>;
}

# ============================================================
# Retrofit / OkHttp / Networking
# ============================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# Retrofit - CRITICAL: Keep generic signatures for response type parsing
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keepattributes Signature
-keepattributes Exceptions
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations

# Keep Retrofit service interfaces with their generic return types
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Keep API service interfaces - CRITICAL for type resolution
-keep interface com.eatfair.shared.data.remote.DollorApiService { *; }
-keep class com.eatfair.shared.data.remote.** { *; }

# ============================================================
# Gson / JSON Serialization
# ============================================================
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep model classes - CRITICAL: Don't obfuscate SerializedName fields
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep all fields in classes with SerializedName annotations
-keep class * {
    @com.google.gson.annotations.SerializedName *;
}

# ============================================================
# Google Play Services / Maps
# ============================================================
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.android.libraries.maps.** { *; }
-keep class com.google.maps.android.** { *; }

# ============================================================
# Stripe Payment SDK
# ============================================================
-keep class com.stripe.android.** { *; }
-dontwarn com.stripe.android.**
-keepclassmembers class com.stripe.android.** { *; }

# ============================================================
# Firebase
# ============================================================
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.internal.** { *; }

# ============================================================
# Coil Image Loading
# ============================================================
-keep class coil.** { *; }
-dontwarn coil.**

# ============================================================
# App-specific classes
# ============================================================
# Keep all model/data classes
-keep class com.eatfair.shared.model.** { *; }
-keep class com.eatfair.shared.config.** { *; }
-keep class com.eatfair.app.data.** { *; }

# Keep ALL ViewModels - CRITICAL for Hilt injection
-keep class com.eatfair.app.ui.** extends androidx.lifecycle.ViewModel { *; }
-keepclassmembers class com.eatfair.app.ui.** extends androidx.lifecycle.ViewModel {
    <init>(...);
}

# Keep ViewModel constructors for Hilt
-keepclasseswithmembers class * extends androidx.lifecycle.ViewModel {
    <init>(...);
}

# Keep UI components that use reflection
-keep class com.eatfair.app.ui.common.ConfettiAnimationKt { *; }

# Keep Parcelable implementations
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep Serializable implementations
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================
# Enums
# ============================================================
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ============================================================
# Native Methods
# ============================================================
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================================
# Annotations
# ============================================================
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ============================================================
# PRODUCTION: Strip all Android Log statements
# ============================================================
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
    public static int wtf(...);
}

# ============================================================
# Missing Class Suppressions (Google Tink / API Client)
# ============================================================
-dontwarn com.google.api.client.http.GenericUrl
-dontwarn com.google.api.client.http.HttpHeaders
-dontwarn com.google.api.client.http.HttpRequest
-dontwarn com.google.api.client.http.HttpRequestFactory
-dontwarn com.google.api.client.http.HttpResponse
-dontwarn com.google.api.client.http.HttpTransport
-dontwarn com.google.api.client.http.javanet.NetHttpTransport$Builder
-dontwarn com.google.api.client.http.javanet.NetHttpTransport
-dontwarn org.joda.time.Instant
