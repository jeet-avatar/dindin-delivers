# Customer App Data Models

> **Source:** `eatfair-android/shared/src/main/java/com/eatfair/shared/model/ApiModels.kt`
> **Verified:** December 26, 2025

---

## Restaurant Models

### Restaurant
```kotlin
data class Restaurant(
    val id: Int,
    val name: String,
    val description: String?,
    val address: String?,
    val city: String?,
    val state: String?,
    @SerializedName("zip_code") val zipCode: String?,
    val latitude: Double?,
    val longitude: Double?,
    val phone: String?,
    val email: String?,
    @SerializedName("cuisine_type") val cuisineType: String?,
    val rating: Double = 0.0,
    @SerializedName("review_count") val reviewCount: Int = 0,
    @SerializedName("is_open") val isOpen: Boolean = true,
    @SerializedName("is_active") val isActive: Boolean = true,
    @SerializedName("image_url") val imageUrl: String?,
    @SerializedName("delivery_time") val deliveryTime: String?,
    @SerializedName("minimum_order") val minimumOrder: Double?,
    val tags: List<String>?
)
```

### RestaurantsListResponse
```kotlin
data class RestaurantsListResponse(
    val restaurants: List<Restaurant>,
    val total: Int?,
    val message: String?
)
```

### MenuItem
```kotlin
data class MenuItem(
    val id: Int,
    @SerializedName("vendor_id") val vendorId: Int?,
    val name: String,
    val description: String?,
    val price: Double,
    val category: String?,
    @SerializedName("image_url") val imageUrl: String?,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    @SerializedName("in_stock") val inStock: Boolean = true,
    @SerializedName("is_vegetarian") val isVegetarian: Boolean = false,
    @SerializedName("is_vegan") val isVegan: Boolean = false,
    @SerializedName("is_gluten_free") val isGlutenFree: Boolean = false,
    @SerializedName("spice_level") val spiceLevel: Int?,
    @SerializedName("prep_time_minutes") val prepTimeMinutes: Int?
)
```

---

## Authentication Models

### CustomerLoginResponse
```kotlin
data class CustomerLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("customer_id") val customerId: Int,
    val name: String?,
    val email: String?
)
```

### CustomerRegisterRequest
```kotlin
data class CustomerRegisterRequest(
    val email: String,
    val password: String,
    val name: String,      // Backend expects 'name' field
    val phone: String
)
```

### GoogleAuthRequest
```kotlin
data class GoogleAuthRequest(
    @SerializedName("id_token") val idToken: String,
    val email: String?,
    val name: String?,
    @SerializedName("google_id") val googleId: String?
)
```

### AppleAuthRequest
```kotlin
data class AppleAuthRequest(
    val email: String,
    val name: String,
    @SerializedName("apple_id") val appleId: String
)
```

### DemoLoginRequest
```kotlin
data class DemoLoginRequest(
    val email: String
)
```

### Password Reset Models
```kotlin
data class ForgotPasswordRequest(
    val email: String
)

data class ResetPasswordWithCodeRequest(
    val email: String,
    val code: String,
    @SerializedName("new_password") val newPassword: String
)
```

---

## Driver Models

### DriverLoginResponse
```kotlin
data class DriverLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("driver_id") val driverId: Int,
    val name: String?,
    val email: String?,
    @SerializedName("driver_code") val driverCode: String?
)
```

### DriverRegisterRequest
```kotlin
data class DriverRegisterRequest(
    val email: String,
    val password: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val phone: String
)
```

---

## Vendor Models

### VendorLoginResponse
```kotlin
data class VendorLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("vendor_id") val vendorId: Int,
    @SerializedName("business_name") val businessName: String?,
    val email: String?
)
```

---

## Common Response Models

### GenericResponse
```kotlin
data class GenericResponse(
    val success: Boolean,
    val message: String?
)
```

---

## JSON Field Mappings (SerializedName)

| Kotlin Field | JSON Field |
|--------------|------------|
| `zipCode` | `zip_code` |
| `cuisineType` | `cuisine_type` |
| `reviewCount` | `review_count` |
| `isOpen` | `is_open` |
| `isActive` | `is_active` |
| `imageUrl` | `image_url` |
| `deliveryTime` | `delivery_time` |
| `minimumOrder` | `minimum_order` |
| `vendorId` | `vendor_id` |
| `isAvailable` | `is_available` |
| `inStock` | `in_stock` |
| `isVegetarian` | `is_vegetarian` |
| `isVegan` | `is_vegan` |
| `isGlutenFree` | `is_gluten_free` |
| `spiceLevel` | `spice_level` |
| `prepTimeMinutes` | `prep_time_minutes` |
| `accessToken` | `access_token` |
| `tokenType` | `token_type` |
| `customerId` | `customer_id` |
| `driverId` | `driver_id` |
| `driverCode` | `driver_code` |
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `idToken` | `id_token` |
| `googleId` | `google_id` |
| `appleId` | `apple_id` |
| `newPassword` | `new_password` |
| `businessName` | `business_name` |

---

*Last Updated: December 26, 2025*
