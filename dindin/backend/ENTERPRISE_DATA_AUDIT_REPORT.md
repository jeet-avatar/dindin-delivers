# ENTERPRISE DATA AUDIT REPORT
## Dollor.ai Platform - iOS & Android Customer Apps
### Database Schema, API Endpoint & Data Field Alignment Analysis

**Report Date:** December 13, 2025
**Audit Scope:** iOS Customer App, Android Customer App, Backend API, Firebase, RDS PostgreSQL
**Classification:** Internal Technical Audit

---

## EXECUTIVE SUMMARY

This audit identifies **ALL data points, database schemas, API endpoints, and field naming discrepancies** across the Dollor.ai platform. The analysis covers:

- iOS Customer App (Swift/SwiftUI)
- Android Customer App (Kotlin/Jetpack Compose)
- Backend API (Python/FastAPI)
- Firebase Firestore Collections
- PostgreSQL RDS Database (SQLAlchemy)

### Critical Findings Summary

| Category | iOS App | Android App | Backend | Status |
|----------|---------|-------------|---------|--------|
| **Address Fields** | 8 mismatches | 5 mismatches | Fixed | :warning: NEEDS SYNC |
| **Order Fields** | 3 mismatches | 4 mismatches | OK | :warning: NEEDS SYNC |
| **Driver Fields** | 2 mismatches | 3 mismatches | OK | :warning: NEEDS SYNC |
| **Restaurant Fields** | 1 mismatch | 2 mismatches | OK | :warning: NEEDS SYNC |
| **Payment Fields** | 0 mismatches | 0 mismatches | OK | :white_check_mark: ALIGNED |

---

## PART 1: ADDRESS MANAGEMENT - CRITICAL ISSUES

### 1.1 Database Schema (PostgreSQL RDS)

**Table:** `customer_addresses`

| Column Name | Type | Status |
|-------------|------|--------|
| `id` | Integer (PK) | :white_check_mark: |
| `customer_id` | Integer | :white_check_mark: FIXED (was `user_id`) |
| `location_name` | String(100) | :white_check_mark: FIXED (was `label`) |
| `street` | String(255) | :white_check_mark: |
| `unit` | String(50) | :white_check_mark: |
| `city` | String(100) | :white_check_mark: |
| `state` | String(50) | :white_check_mark: |
| `zip_code` | String(20) | :white_check_mark: |
| `instructions` | String(500) | :white_check_mark: |
| `address_type` | String(20) | :white_check_mark: |
| `latitude` | Float | :white_check_mark: |
| `longitude` | Float | :white_check_mark: |
| `phone_number` | String(20) | :white_check_mark: |
| `is_default` | Boolean | :white_check_mark: |
| `created_at` | DateTime | :white_check_mark: |
| `updated_at` | DateTime | :white_check_mark: |

### 1.2 iOS App Address Model

**File:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Address.swift`

| Swift Property | JSON CodingKey | Backend Field | Match |
|----------------|----------------|---------------|-------|
| `id` | `id` | `id` | :white_check_mark: |
| `userId` | `user_id` | `customer_id` | :x: **MISMATCH** |
| `locationName` | `location_name` | `location_name` | :white_check_mark: |
| `street` | `street` | `street` | :white_check_mark: |
| `unit` | `unit` | `unit` | :white_check_mark: |
| `city` | `city` | `city` | :white_check_mark: |
| `state` | `state` | `state` | :white_check_mark: |
| `zipCode` | `zip_code` | `zip_code` | :white_check_mark: |
| `instructions` | `instructions` | `instructions` | :white_check_mark: |
| `type` | `type` | `address_type` | :x: **MISMATCH** |
| `latitude` | `latitude` | `latitude` | :white_check_mark: |
| `longitude` | `longitude` | `longitude` | :white_check_mark: |
| `phoneNumber` | `phone_number` | `phone_number` | :white_check_mark: |
| `isDefault` | `is_default` | `is_default` | :white_check_mark: |

**iOS Address Issues:**
1. `user_id` vs `customer_id` - Backend returns `user_id` in response but stores as `customer_id`
2. `type` vs `address_type` - Field name inconsistency

### 1.3 Android App Address Model

**File:** `shared/src/main/java/com/eatfair/shared/data/model/ApiModels.kt`

| Kotlin Property | @SerializedName | Backend Field | Match |
|-----------------|-----------------|---------------|-------|
| `id` | `id` | `id` | :white_check_mark: |
| `customerId` | `customer_id` | `customer_id` | :white_check_mark: |
| `label` | `label` | `location_name` | :x: **MISMATCH** |
| `addressLine1` | `address_line_1` | `street` | :x: **MISMATCH** |
| `addressLine2` | `address_line_2` | `unit` | :x: **MISMATCH** |
| `city` | `city` | `city` | :white_check_mark: |
| `state` | `state` | `state` | :white_check_mark: |
| `zipCode` | `zip_code` | `zip_code` | :white_check_mark: |
| `latitude` | `latitude` | `latitude` | :white_check_mark: |
| `longitude` | `longitude` | `longitude` | :white_check_mark: |
| `isDefault` | `is_default` | `is_default` | :white_check_mark: |

**Android Address Issues:**
1. `label` vs `location_name` - Different field names
2. `address_line_1` vs `street` - Different field names
3. `address_line_2` vs `unit` - Different field names
4. Missing `instructions` field
5. Missing `phone_number` field
6. Missing `address_type` field

### 1.4 Address API Endpoints

| Endpoint | iOS Calls | Android Calls | Backend | Status |
|----------|-----------|---------------|---------|--------|
| `GET /api/addresses/{user_id}` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/addresses/{user_id}/default` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/addresses/{user_id}` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `PUT /api/addresses/{user_id}/{address_id}` | :white_check_mark: | :x: Missing | :white_check_mark: | :warning: |
| `DELETE /api/addresses/{user_id}/{address_id}` | :white_check_mark: | :x: Missing | :white_check_mark: | :warning: |
| `POST /api/addresses/{user_id}/{address_id}/set-default` | :white_check_mark: | :x: Missing | :white_check_mark: | :warning: |

---

## PART 2: ORDER MANAGEMENT

### 2.1 Database Schema (PostgreSQL RDS)

**Table:** `orders`

| Column Name | Type | iOS Field | Android Field | Match |
|-------------|------|-----------|---------------|-------|
| `id` | Integer | `id` | `id` | :white_check_mark: |
| `order_number` | String | `orderId` | `orderNumber` | :x: iOS uses wrong name |
| `customer_id` | Integer | `customerId` | `customerId` | :white_check_mark: |
| `customer_name` | String | `customerName` | `customerName` | :white_check_mark: |
| `customer_email` | String | `customerEmail` | N/A | :warning: Android missing |
| `customer_phone` | String | `customerPhone` | N/A | :warning: Android missing |
| `vendor_id` | Integer | `restaurant.id` | `vendorId` | :x: Different structure |
| `driver_id` | Integer | `driverId` | `driverId` | :white_check_mark: |
| `items` | JSON | `items` | `items` | :white_check_mark: |
| `subtotal` | Float | `subtotal` | `subtotal` | :white_check_mark: |
| `tax_rate` | Float | `taxRate` | N/A | :warning: Android missing |
| `tax_amount` | Float | `tax` | `tax` | :white_check_mark: |
| `delivery_fee` | Float | `deliveryFee` | `deliveryFee` | :white_check_mark: |
| `tip` | Float | `tip` | `tip` | :white_check_mark: |
| `platform_fee` | Float | `platformFee` | `platformFee` | :white_check_mark: |
| `total_amount` | Float | `total` | `grandTotal` | :x: Different names |
| `status` | Enum | `status` | `status` | :white_check_mark: |
| `delivery_address` | JSON | `deliveryAddress` | `deliveryAddress` | :white_check_mark: |
| `estimated_delivery_time` | DateTime | `estimatedDeliveryTime` | `estimatedDeliveryTime` | :white_check_mark: |

### 2.2 Order Status Enum Alignment

| Backend Status | iOS Status | Android Status | Match |
|----------------|------------|----------------|-------|
| `PENDING_PAYMENT` | N/A | N/A | :warning: Not handled |
| `CONFIRMED` | `confirmed` | `ORDER_PLACED` | :x: Different |
| `PREPARING` | `preparing` | `PREPARING` | :white_check_mark: |
| `READY_FOR_PICKUP` | `ready_for_pickup` | N/A | :warning: Android missing |
| `OUT_FOR_DELIVERY` | `out_for_delivery` | `OUT_FOR_DELIVERY` | :white_check_mark: |
| `DELIVERED` | `delivered` | `DELIVERED` | :white_check_mark: |
| `CANCELLED` | `cancelled` | `CANCELLED` | :white_check_mark: |
| `PENDING_MODIFICATION` | `pending_modification` | N/A | :warning: Android missing |

### 2.3 Order API Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `POST /api/orders/create` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/customer/orders` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/customer/{id}/active-orders` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/customer/orders/{id}/track` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/orders/{id}/tip-driver` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/customer/orders/{id}/rate-driver` | :white_check_mark: | N/A | :white_check_mark: | :warning: |
| `POST /api/customer/orders/{id}/chat` | :white_check_mark: | N/A | :white_check_mark: | :warning: |

---

## PART 3: RESTAURANT/VENDOR MANAGEMENT

### 3.1 Database Schema (PostgreSQL RDS)

**Table:** `vendors`

| Column Name | iOS Field | Android Field | Match |
|-------------|-----------|---------------|-------|
| `id` | `id` | `id` | :white_check_mark: |
| `restaurant_name` | `name` | `name` | :white_check_mark: |
| `cuisine_type` | `cuisine` | `cuisineType` | :x: Different names |
| `latitude` | `latitude` | `latitude` | :white_check_mark: |
| `longitude` | `longitude` | `longitude` | :white_check_mark: |
| `street` | `address` | `address` | :white_check_mark: |
| `city` | `city` | `city` | :white_check_mark: |
| `state` | `state` | `state` | :white_check_mark: |
| `zip_code` | `zipCode` | `zipCode` | :white_check_mark: |
| `contact_phone` | `phone` | `phone` | :white_check_mark: |
| `delivery_available` | N/A | N/A | :warning: Not exposed |
| `pickup_available` | N/A | N/A | :warning: Not exposed |
| `average_prep_time` | N/A | N/A | :warning: Not exposed |

### 3.2 Menu Item Schema

**Table:** `vendor_menu_items`

| Column Name | iOS Field | Android Field | Match |
|-------------|-----------|---------------|-------|
| `id` | `id` | `id` | :white_check_mark: |
| `item_name` | `name` | `name` | :white_check_mark: |
| `description` | `description` | `description` | :white_check_mark: |
| `price` | `price` | `price` | :white_check_mark: |
| `category` | `category` | `category` | :white_check_mark: |
| `is_available` | `isAvailable` | `isAvailable` | :white_check_mark: |
| `is_vegetarian` | N/A | `isVegetarian` | :warning: iOS missing |
| `is_vegan` | N/A | `isVegan` | :warning: iOS missing |
| `is_gluten_free` | N/A | `isGlutenFree` | :warning: iOS missing |
| `spice_level` | N/A | `spiceLevel` | :warning: iOS missing |
| `prep_time` | `prepTime` | `prepTimeMinutes` | :x: Different names |
| `image_url` | `imageUrl` | `imageUrl` | :white_check_mark: |
| `customizations` | `customizations` | N/A | :warning: Android missing |

### 3.3 Restaurant API Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `GET /api/public/restaurants` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/public/restaurants/{id}` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/vendors/{id}/menu` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/vendors/{id}/menu/categories` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |

---

## PART 4: CUSTOMER FAVORITES

### 4.1 Database Schema (PostgreSQL RDS)

**Table:** `customer_favorites`

| Column Name | iOS Field | Android Field | Match |
|-------------|-----------|---------------|-------|
| `id` | `id` | N/A | :warning: Android uses vendor_id |
| `customer_id` | `customerId` | `customerId` | :white_check_mark: |
| `vendor_id` | `restaurantId` | `vendorId` | :x: Different names |
| `restaurant_name` | `name` | `name` | :white_check_mark: |
| `cuisine` | `cuisine` | `cuisineType` | :x: Different names |
| `rating` | `rating` | `rating` | :white_check_mark: |
| `image_url` | `imageUrl` | `imageUrl` | :white_check_mark: |

### 4.2 Favorites API Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `GET /api/customer/favorites/{id}` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/customer/favorites/{id}/{vendor_id}` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `DELETE /api/customer/favorites/{id}/{vendor_id}` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/customer/favorites/{id}/check/{vendor_id}` | :white_check_mark: | N/A | :white_check_mark: | :warning: |

---

## PART 5: PAYMENT INTEGRATION

### 5.1 Stripe Payment Fields

| Backend Field | iOS Field | Android Field | Match |
|---------------|-----------|---------------|-------|
| `client_secret` | `clientSecret` | `clientSecret` | :white_check_mark: |
| `publishable_key` | `publishableKey` | `publishableKey` | :white_check_mark: |
| `payment_intent` | `paymentIntent` | `paymentIntent` | :white_check_mark: |
| `ephemeral_key` | `ephemeralKey` | `ephemeralKey` | :white_check_mark: |
| `customer` | `customer` | `customer` | :white_check_mark: |

### 5.2 Payment API Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `POST /api/payments/create-intent` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |

---

## PART 6: RIDESHARE (Customer Side)

### 6.1 Database Schema (PostgreSQL RDS)

**Table:** `rides`

| Column Name | iOS Field | Android Field | Match |
|-------------|-----------|---------------|-------|
| `id` | `id` | `id` | :white_check_mark: |
| `ride_number` | `rideId` | `rideId` | :white_check_mark: |
| `customer_id` | `customerId` | `customerId` | :white_check_mark: |
| `pickup_street` | `pickupAddress` | `pickupAddress` | :white_check_mark: |
| `pickup_lat` | `pickupLat` | `pickupLat` | :white_check_mark: |
| `pickup_lng` | `pickupLng` | `pickupLng` | :white_check_mark: |
| `dropoff_street` | `dropoffAddress` | `dropoffAddress` | :white_check_mark: |
| `dropoff_lat` | `dropoffLat` | `dropoffLat` | :white_check_mark: |
| `dropoff_lng` | `dropoffLng` | `dropoffLng` | :white_check_mark: |
| `distance_miles` | `distanceMiles` | `distanceMiles` | :white_check_mark: |
| `total_fare` | `fare` | `fareAmount` | :x: Different names |
| `status` | `status` | `status` | :white_check_mark: |
| `driver_id` | `driverId` | `driverId` | :white_check_mark: |

### 6.2 Rideshare API Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `POST /api/rides/request` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/rides/{id}/track` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/rides/{id}/cancel` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/rides/{id}/rate` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/rides/estimate` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/customer/rides` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |

---

## PART 7: FIREBASE INTEGRATION

### 7.1 Firestore Collections Used

| Collection | iOS Uses | Android Uses | Purpose |
|------------|----------|--------------|---------|
| `restaurants` | :white_check_mark: | :x: Uses API | Restaurant data |
| `restaurants/{id}/menu` | :white_check_mark: | :x: Uses API | Menu items |
| `orders` | :white_check_mark: | :white_check_mark: | Order tracking |
| `promotions` | :white_check_mark: | :x: Uses API | Promotions |
| `users/{id}/addresses` | :x: Uses API | :white_check_mark: | Addresses |

### 7.2 Firebase vs API Data Source Inconsistency

| Data Type | iOS Source | Android Source | Recommendation |
|-----------|------------|----------------|----------------|
| Restaurants | Firebase + API | API Only | Standardize to API |
| Menu Items | Firebase | API | Standardize to API |
| Orders | Firebase + API | API | Standardize to API |
| Addresses | API | Firebase + Room | Standardize to API |
| Promotions | Firebase | API | Standardize to API |

---

## PART 8: AUTHENTICATION

### 8.1 Customer Authentication Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `POST /api/customer/login` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/customer/register` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/customer/google-auth` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/customer/apple-auth` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `POST /api/customer/password-reset/request` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |
| `DELETE /api/customers/{id}/delete` | :white_check_mark: | :white_check_mark: | :white_check_mark: | OK |

### 8.2 Auth Response Fields

| Backend Field | iOS Field | Android Field | Match |
|---------------|-----------|---------------|-------|
| `access_token` | `accessToken` | `accessToken` | :white_check_mark: |
| `token_type` | N/A | `tokenType` | :warning: iOS missing |
| `customer_id` | `customerId` | `customerId` | :white_check_mark: |
| `name` | `name` | `name` | :white_check_mark: |
| `email` | `email` | `email` | :white_check_mark: |

---

## PART 9: TRIP BOARD (iOS Only Feature)

### 9.1 Trip Board Models - iOS Only

| Model | iOS Has | Android Has | Backend Has |
|-------|---------|-------------|-------------|
| `TripListing` | :white_check_mark: | :x: | :white_check_mark: |
| `TripMatch` | :white_check_mark: | :x: | :white_check_mark: |
| `TripSafetyAgreement` | :white_check_mark: | :x: | :white_check_mark: |
| `CreateTripListingRequest` | :white_check_mark: | :x: | :white_check_mark: |

### 9.2 Trip Board Endpoints

| Endpoint | iOS | Android | Backend |
|----------|-----|---------|---------|
| `GET /api/trip-board/listings` | :white_check_mark: | :x: | :white_check_mark: |
| `POST /api/trip-board/listings` | :white_check_mark: | :x: | :white_check_mark: |
| `GET /api/trip-board/my-matches` | :white_check_mark: | :x: | :white_check_mark: |
| `POST /api/trip-board/matches/propose` | :white_check_mark: | :x: | :white_check_mark: |
| All safety endpoints | :white_check_mark: | :x: | :white_check_mark: |

---

## PART 10: LEGAL & COMPLIANCE

### 10.1 Legal Document Endpoints

| Endpoint | iOS | Android | Backend | Status |
|----------|-----|---------|---------|--------|
| `GET /api/platform-legal/food-delivery/customer-tos` | :white_check_mark: | N/A | :white_check_mark: | :warning: |
| `GET /api/platform-legal/privacy-policy` | :white_check_mark: | N/A | :white_check_mark: | :warning: |
| `GET /api/legal/tos` | N/A | :white_check_mark: | :white_check_mark: | OK |
| `GET /api/legal/privacy-policy` | N/A | :white_check_mark: | :white_check_mark: | OK |

**Issue:** iOS and Android use different legal endpoints.

---

## PART 11: MISSING FEATURES COMPARISON

### 11.1 Features in iOS but NOT in Android

| Feature | iOS Status | Android Status | Priority |
|---------|------------|----------------|----------|
| Trip Board | :white_check_mark: Complete | :x: Missing | Medium |
| Order Modification Flow | :white_check_mark: Complete | :x: Missing | High |
| V3 Viral Features | :white_check_mark: Complete | :x: Missing | Medium |
| Group Orders | :white_check_mark: Complete | :x: Missing | Medium |
| Order Chat | :white_check_mark: Complete | :x: Missing | Low |
| Menu Customizations | :white_check_mark: Complete | :x: Missing | High |
| Dietary Filters (Veg/Vegan) | :x: Missing | :white_check_mark: Has | Medium |

### 11.2 Features in Android but NOT in iOS

| Feature | Android Status | iOS Status | Priority |
|---------|----------------|------------|----------|
| Dietary Tags Display | :white_check_mark: | :x: | Low |
| Spice Level Display | :white_check_mark: | :x: | Low |

---

## PART 12: CRITICAL FIXES REQUIRED

### 12.1 HIGH PRIORITY - Data Will Fail

| Issue | Location | Fix Required |
|-------|----------|--------------|
| Android `label` vs Backend `location_name` | Android ApiModels.kt | Change `@SerializedName("label")` to `@SerializedName("location_name")` |
| Android `address_line_1` vs Backend `street` | Android ApiModels.kt | Change `@SerializedName("address_line_1")` to `@SerializedName("street")` |
| Android `address_line_2` vs Backend `unit` | Android ApiModels.kt | Change `@SerializedName("address_line_2")` to `@SerializedName("unit")` |
| Android missing `instructions` field | Android Address model | Add `instructions` field |
| Android missing `phone_number` field | Android Address model | Add `phone_number` field |
| Android missing `address_type` field | Android Address model | Add `address_type` field |

### 12.2 MEDIUM PRIORITY - Partial Functionality

| Issue | Location | Fix Required |
|-------|----------|--------------|
| iOS `type` vs Backend `address_type` | iOS Address.swift | Change CodingKey from `type` to `address_type` |
| iOS `orderId` vs Backend `order_number` | iOS Order.swift | Verify CodingKey mapping |
| Android missing order modification | Android | Implement partial order flow |
| Android missing menu customizations | Android | Implement customization UI |
| Different cuisine field names | Both apps | Standardize to `cuisine_type` |
| Different total field names | Both apps | Standardize to `total_amount` |

### 12.3 LOW PRIORITY - Enhancement

| Issue | Location | Fix Required |
|-------|----------|--------------|
| iOS missing dietary tags | iOS MenuItem | Add isVegetarian, isVegan, isGlutenFree |
| iOS missing spice level | iOS MenuItem | Add spiceLevel field |
| Firebase/API data source inconsistency | Both apps | Standardize all data to API |
| Trip Board not in Android | Android | Implement Trip Board feature |

---

## PART 13: ENDPOINT COVERAGE MATRIX

### Customer App Required Endpoints

| Category | Endpoint | iOS | Android | Backend |
|----------|----------|-----|---------|---------|
| **Auth** | Login | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Auth** | Register | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Auth** | Google OAuth | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Auth** | Apple OAuth | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Auth** | Password Reset | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Auth** | Delete Account | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Profile** | Update | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Address** | List | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Address** | Create | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Address** | Update | :white_check_mark: | :x: | :white_check_mark: |
| **Address** | Delete | :white_check_mark: | :x: | :white_check_mark: |
| **Address** | Set Default | :white_check_mark: | :x: | :white_check_mark: |
| **Restaurant** | List | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Restaurant** | Detail | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Menu** | Get Items | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Menu** | Categories | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Order** | Create | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Order** | List | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Order** | Track | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Order** | Active | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Order** | Tip Driver | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Order** | Rate Driver | :white_check_mark: | :x: | :white_check_mark: |
| **Order** | Chat | :white_check_mark: | :x: | :white_check_mark: |
| **Favorites** | List | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Favorites** | Add | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Favorites** | Remove | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Favorites** | Check | :white_check_mark: | :x: | :white_check_mark: |
| **Payment** | Create Intent | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Ride** | Request | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Ride** | Track | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Ride** | Cancel | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Ride** | Rate | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Ride** | Estimate | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Ride** | History | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Legal** | TOS | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Legal** | Privacy | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Trip Board** | All | :white_check_mark: | :x: | :white_check_mark: |

---

## RECOMMENDATIONS

### Immediate Actions (This Sprint)

1. **Fix Android Address Model** - Update field names to match backend
2. **Add Missing Android Address Endpoints** - Update, Delete, Set Default
3. **Standardize iOS Address Type Field** - Change `type` to `address_type`
4. **Add Missing Android Endpoints** - Rate driver, Check favorite

### Short Term (Next 2 Sprints)

1. **Implement Order Modification in Android** - Critical for partial order flow
2. **Add Menu Customizations to Android** - Required for proper ordering
3. **Standardize Data Sources** - Move all data from Firebase to API
4. **Unify Legal Endpoints** - Use same endpoints for both platforms

### Long Term (Roadmap)

1. **Implement Trip Board in Android** - Feature parity
2. **Add V3 Viral Features to Android** - Group orders, referrals
3. **Add Dietary Filters to iOS** - Feature parity with Android
4. **Implement Order Chat in Android** - Customer support feature

---

## APPENDIX A: Complete Field Mapping Reference

### Address Fields - Complete Mapping

| Backend (RDS) | Backend API Response | iOS Swift | iOS CodingKey | Android Kotlin | Android @SerializedName |
|---------------|---------------------|-----------|---------------|----------------|------------------------|
| `id` | `id` | `id` | `id` | `id` | `id` |
| `customer_id` | `user_id` | `userId` | `user_id` | `customerId` | `customer_id` |
| `location_name` | `location_name` | `locationName` | `location_name` | `label` | `label` |
| `street` | `street` | `street` | `street` | `addressLine1` | `address_line_1` |
| `unit` | `unit` | `unit` | `unit` | `addressLine2` | `address_line_2` |
| `city` | `city` | `city` | `city` | `city` | `city` |
| `state` | `state` | `state` | `state` | `state` | `state` |
| `zip_code` | `zip_code` | `zipCode` | `zip_code` | `zipCode` | `zip_code` |
| `instructions` | `instructions` | `instructions` | `instructions` | N/A | N/A |
| `address_type` | `address_type` | `type` | `type` | N/A | N/A |
| `latitude` | `latitude` | `latitude` | `latitude` | `latitude` | `latitude` |
| `longitude` | `longitude` | `longitude` | `longitude` | `longitude` | `longitude` |
| `phone_number` | `phone_number` | `phoneNumber` | `phone_number` | N/A | N/A |
| `is_default` | `is_default` | `isDefault` | `is_default` | `isDefault` | `is_default` |

---

## APPENDIX B: Database Tables Not Yet Used by Apps

The following backend tables exist but are not currently consumed by either customer app:

1. `vendor_purchase_orders` - B2B feature
2. `vendor_payouts` - Partner dashboard only
3. `vendor_analytics` - Partner dashboard only
4. `ai_employees` - Internal ERP only
5. `ai_employee_activities` - Internal ERP only
6. `ai_employee_hourly_reports` - Internal ERP only
7. `ai_employee_daily_reports` - Internal ERP only
8. `journal_entries` - Accounting only
9. `journal_entry_lines` - Accounting only
10. `dashboard_metrics` - Admin dashboard only
11. `communications` - Backend notification system
12. `realtime_events` - Backend event system
13. `stripe_payment_logs` - Backend logging
14. `background_check_requests` - Driver verification only
15. `driver_verification_history` - Driver management only

---

**Report Generated:** December 13, 2025
**Audit Performed By:** Claude Code Enterprise Audit System
**Next Audit Recommended:** After Android address model fixes are deployed
