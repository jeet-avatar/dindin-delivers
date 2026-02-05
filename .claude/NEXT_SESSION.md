# NEXT SESSION: Android Customer App — Remaining Parity Work

> **Date:** February 5, 2026
> **Priority:** P2 order modification endpoints + Payment Intent investigation
> **Build Command:** `cd /Users/jeet/StudioProjects/eatfair-android && JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home ./gradlew :app:assembleDebug`
> **Rule:** ALL changes in Android repo ONLY. NEVER touch iOS.
> **Rule:** Verify every change against the backend before making it.
> **Commit:** `a8e0a08e` pushed to `origin/main`

---

## WHAT IS DONE (All committed & pushed)

### 1. Update Profile: POST → PUT ✅
- **File:** `DollorApiService.kt` line 73
- **Change:** `@POST` → `@PUT` for `customer/{customerId}/profile`
- **Reason:** Backend only accepts PUT (verified at main_new.py line 19039)

### 2. P0 Fix: confirmOrderPayment ✅ (3 files)
**THE CRITICAL FIX.** Without this, Android orders never reached restaurants.

- **DollorApiService.kt** — Added `@POST("erp/orders/{orderId}/confirm-payment")` endpoint
- **DollorRepository.kt** — Added `confirmOrderPayment(orderId)` wrapper with auth
- **CartViewModel.kt** — Added call to `confirmOrderPayment` after `createOrder` succeeds, triggers 3-min restaurant acceptance window

### 3. P1 Fix: rateRestaurant ✅ (3 files)
- **ApiModels.kt** — Added `RestaurantRatingRequest` data class with validation (rating 1-5, review max 500 chars, food_quality, portion_size, value_for_money, accuracy booleans)
- **DollorApiService.kt** line 199 — Added `@POST("customer/orders/{orderId}/rate-restaurant")` endpoint
- **DollorRepository.kt** line 709 — Added `rateRestaurant(orderId, request)` wrapper with auth

### 4. AppConfig.kt branding fix ✅
- Company name: `Vibing World Inc` → `Zietra Technologies Inc`

### Build Verified ✅
- `assembleDebug` passes with 0 errors (only deprecation warnings for GoogleSignIn, hiltViewModel, DirectionsBike icon)

---

## WHAT STILL NEEDS TO BE DONE

### P2: Order Modification Endpoints (NOT started)

These allow handling unavailable items (restaurant marks items as unavailable after order placed). The endpoint definitions already exist in DollorApiService.kt (lines 161-175) but need repository wrappers and UI integration.

#### getOrderModification — Already in DollorApiService.kt line 161
```kotlin
@GET("orders/{orderId}/modification")
suspend fun getOrderModification(...)
```
- **Needs:** Repository wrapper in DollorRepository.kt
- **Needs:** UI screen/dialog to show modification to customer
- iOS reference: `GET /orders/{orderId}/modification` (P2PAPIService.swift line 10388)

#### respondToOrderModification — Already in DollorApiService.kt line 170
```kotlin
@POST("orders/{orderId}/modification/respond")
suspend fun respondToOrderModification(...)
```
- **Needs:** Repository wrapper in DollorRepository.kt
- **Needs:** UI buttons for customer to accept partial / reject for full refund
- iOS reference: `POST /orders/{orderId}/modification/respond` (P2PAPIService.swift line 10440)
- Body: `{"response": "accept_partial"}` or `{"response": "reject_full_refund"}`

### P3: Payment Intent Path Investigation (NOT started)

- Android: `payments/create-intent`
- iOS: `payments/ride/create-intent`
- Backend: `erp/payments/intent`
- **Neither Android nor iOS matches the backend.** Needs separate investigation to determine if there are aliases or if both are broken.

### P4: iOS addFavorite is Broken (Info only)

- iOS sends POST body `{customer_id, vendor_id}` to `customer/favorites`
- Backend only accepts path params: `customer/favorites/{customer_id}/{vendor_id}`
- Android is CORRECT. iOS needs fixing (not our scope here).

---

## CHANGES INVESTIGATED AND SKIPPED (Backend has aliases)

| Change | Android Current | iOS Uses | Backend | Verdict |
|--------|----------------|----------|---------|---------|
| Apple Auth path | `auth/customer/apple-auth` | `customer/apple-auth` | Both aliased (main_new.py lines 19054-19056) | SKIP — both work |
| Create Order path | `orders/create` | `erp/orders/create` | Android alias at line 12598 | SKIP — both work |
| Order Chat path | `customer/orders/{id}/chat` | `orders/{id}/chat` | Only `customer/` version exists (line 13927) | SKIP — Android is correct |
| Track Ride path | `rides/{id}/track` | `erp/rides/{id}/track` | Primary is `/api/rides/`, erp is iOS alias (line 12407) | SKIP — Android hits primary |
| Cancel Ride path | `rides/{id}/cancel` | `erp/rides/{id}/cancel` | Primary is `/api/rides/`, erp is iOS alias (line 12421) | SKIP — Android hits primary |
| Payment Intent path | `payments/create-intent` | `payments/ride/create-intent` | Neither matches backend (`erp/payments/intent`) | SKIP — needs separate investigation |
| addFavorite format | Path params `/{customerId}/{vendorId}` | Body `{customer_id, vendor_id}` | Path params (line 13871) | SKIP — Android is correct, iOS is broken |

---

## COMPLETE ORDER FLOW (Verified by 4 research agents)

### Backend Order Statuses (13 total, from models.py line 383)
```
pending_payment → confirmed → pending_restaurant → preparing → ready_for_pickup →
pending_delivery_decision → restaurant_will_deliver / out_for_delivery → delivered

Terminal: declined_by_restaurant, restaurant_timeout, delivery_decision_timeout, cancelled
```

### Android Customer Order Flow (AFTER all fixes — COMPLETE)
1. Cart → Checkout → Payment
2. `POST /orders/create` (alias works) → order created (status: pending_payment)
3. `POST /erp/orders/{id}/confirm-payment` → restaurant notified (status: pending_restaurant) ✅
4. Restaurant 3-min window → accept (preparing) / decline / timeout
5. Restaurant marks ready → pending_delivery_decision (3-min window)
6. Self-deliver or driver pool
7. Driver picks up → out_for_delivery → delivered
8. Post-delivery: rate driver ✅, rate restaurant ✅, tip, chat

### Driver App Flow (iOS verified)
- 10-second polling: `GET /erp/orders/available-for-delivery`
- Accept: `POST /erp/orders/{id}/assign-driver` (with driver_eta_minutes)
- Pick up: `POST /erp/orders/{id}/picked-up`
- Deliver: `PUT /erp/orders/{id}/complete-delivery`
- Location: `PUT /erp/orders/{id}/driver-location`

### Restaurant App Flow (iOS & Android verified)
- Receives orders via push notification + polling
- Accept: `POST /erp/orders/{id}/restaurant-accept`
- Decline: `POST /erp/orders/{id}/restaurant-decline`
- Mark ready: `PATCH /orders/{id}/status?status=READY_FOR_PICKUP`
- Self-deliver: `POST /erp/orders/{id}/restaurant-accept-delivery`
- Decline delivery: `POST /erp/orders/{id}/restaurant-decline-delivery`

---

## BUILD ENVIRONMENT NOTE

Default JDK is Java 25 (openjdk-25.0.1) which is **incompatible with Gradle/AGP**. Must use JDK 17:
```bash
cd /Users/jeet/StudioProjects/eatfair-android
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home ./gradlew :app:assembleDebug
```
- There is NO `staging` build variant — only `debug` and `release`
- Available JDKs: Java 25 (default, broken), Java 17 (works)

---

## KEY FILE PATHS

| File | Path | Purpose |
|------|------|---------|
| Android Retrofit API | `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt` | API endpoint definitions |
| Android Repository | `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt` | API call wrappers with auth |
| Android Models | `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt` | Request/Response data classes |
| Android CartViewModel | `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt` | Order placement logic |
| iOS API (reference) | `/Users/jeet/StudioProjects/eatfair-ios/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` | ~10,500 lines, source of truth |
| Backend order flow | `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/order_flow.py` | Order state machine |
| Backend main | `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/main_new.py` | All API routes + aliases |
| Backend models | `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/models.py` | OrderStatus enum (line 383) |

---

## SAFETY RULES

1. **NEVER edit any file in `/Users/jeet/StudioProjects/eatfair-ios`** — iOS is READ-ONLY reference
2. **ALL changes in `/Users/jeet/StudioProjects/eatfair-android` ONLY**
3. **Verify EVERY endpoint against the backend** before changing Android — the backend has many aliases
4. **Read file before editing. Read file after editing. Verify the change.**
5. **Build after changes**: Use JDK 17 (see build environment note above)
6. **Take permission from user before each change** — user wants step-by-step approval

---

## EXECUTION ORDER FOR NEXT SESSION

1. **First:** Add repository wrappers for order modification endpoints (API definitions already exist)
2. **Second:** Investigate Payment Intent path mismatch
3. **Third:** Build and verify
4. **Fourth:** If user wants, add UI for order modifications

---

*Last Updated: February 5, 2026*
*Session: Android Order Flow Parity — ALL P0/P1 COMPLETE, committed & pushed as a8e0a08e*
