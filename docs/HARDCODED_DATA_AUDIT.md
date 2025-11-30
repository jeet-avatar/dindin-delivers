# Hardcoded Data Audit Report

## 🔍 Audit Summary

**Date**: November 19, 2025  
**Status**: ⚠️ **Hardcoded Data Found - Needs Attention**

---

## 📊 Findings

### ✅ **Good News: Backend Integration is Active**
- Firebase Firestore is properly integrated
- Real-time listeners are working
- Fallback mechanisms are in place

### ⚠️ **Areas with Hardcoded Data**

---

## 1. **RestaurantRepo** - `shared/src/main/java/com/eatfair/shared/data/repo/RestaurantRepo.kt`

### Current Status: **Hybrid (Firebase + Fallback)**

#### Hardcoded Data:
- ✅ **Restaurants** (2 sample restaurants) - Used as fallback
- ✅ **Menu Items** (6 sample items) - Used as fallback  
- ✅ **Categories** (5 categories) - Used as fallback
- ⚠️ **Carousel Items** (3 items) - **Always hardcoded**
- ⚠️ **Top Rated Food** (4 items) - **Always hardcoded**
- ⚠️ **Recent Searches** (6 items) - **Always hardcoded**
- ⚠️ **Popular Cuisines** (9 items) - **Always hardcoded**
- ⚠️ **Search Results** (3 items) - **Always hardcoded**

#### Implementation:
```kotlin
fun getRestaurants(): Flow<List<Restaurant>> = flow {
    try {
        val snapshot = firestore.collection("restaurants").get().await()
        val restaurants = snapshot.toObjects(Restaurant::class.java)
        if (restaurants.isNotEmpty()) {
            emit(restaurants)  // ✅ Uses Firebase
        } else {
            emit(allRestaurants)  // ⚠️ Fallback to hardcoded
        }
    } catch (e: Exception) {
        emit(allRestaurants)  // ⚠️ Fallback on error
    }
}
```

#### Issues:
- `getMenuItemsForRestaurant()` - **Always returns hardcoded data**
- `getCategoriesForRestaurant()` - **Always returns hardcoded data**
- `getCarouselItems()` - **Always returns hardcoded data**
- `getTopRatedFood()` - **Always returns hardcoded data**
- `getRecentSearches()` - **Always returns hardcoded data**
- `getPopularCuisines()` - **Always returns hardcoded data**
- `getSearchResults()` - **Always returns hardcoded data**

---

## 2. **OrderRepo** - `shared/src/main/java/com/eatfair/shared/data/repo/OrderRepo.kt`

### Current Status: **Hybrid (Firebase + Fallback)**

#### Hardcoded Data:
- ✅ **Orders** (3 sample orders) - Used as fallback

#### Implementation:
```kotlin
fun getOrdersForPartner(partnerId: Int): Flow<List<OrderTracking>> = callbackFlow {
    val listener = collection.addSnapshotListener { snapshot, error ->
        if (snapshot != null && !snapshot.isEmpty) {
            val orders = snapshot.toObjects(OrderTracking::class.java)
            trySend(orders)  // ✅ Uses Firebase
        } else {
            trySend(dummyOrders)  // ⚠️ Fallback to hardcoded
        }
    }
    awaitClose { listener.remove() }
}
```

#### Status: **✅ Acceptable** - Good fallback pattern

---

## 3. **NotificationScreen** - `app/src/main/java/com/eatfair/app/ui/notification/NotificationScreen.kt`

### Current Status: **⚠️ Always Hardcoded**

#### Hardcoded Data:
- ⚠️ **Notifications** (3 sample notifications) - **Always hardcoded**

#### Implementation:
```kotlin
fun getSampleNotifications(): List<NotificationItem> {
    return listOf(
        NotificationItem(id = 1, title = "Order Delivered!", ...),
        NotificationItem(id = 2, title = "New Offer Available", ...),
        NotificationItem(id = 3, title = "Order Confirmed", ...)
    )
}
```

#### Usage:
```kotlin
// In NavigationGraph.kt
NotificationScreen(
    notifications = getSampleNotifications(),  // ⚠️ Always hardcoded
    ...
)
```

---

## 4. **LanguageModal** - `app/src/main/java/com/eatfair/app/ui/profile/LanguageModal.kt`

### Current Status: **✅ Acceptable** - Static reference data

#### Hardcoded Data:
- ✅ **Languages** (10 languages) - Static reference data

#### Status: **✅ OK** - Languages are static configuration data

---

## 5. **PaymentRepo** - `app/src/main/java/com/eatfair/app/data/repo/PaymentRepo.kt`

### Current Status: **⚠️ Test/Demo Keys**

#### Hardcoded Data:
- ⚠️ **Payment Keys** - Dummy Stripe keys

#### Status: **⚠️ Needs Real Keys** - Currently using test data

---

## 🎯 Priority Fixes Required

### **HIGH PRIORITY** 🔴

1. **Menu Items** - Should fetch from Firestore
   ```kotlin
   // Current: Always returns hardcoded
   fun getMenuItemsForRestaurant(restaurantId: Int): List<MenuItem> {
       return allMenuItems.filter { it.restaurantId == restaurantId }
   }
   
   // Should be: Fetch from Firestore
   fun getMenuItemsForRestaurant(restaurantId: Int): Flow<List<MenuItem>> = flow {
       try {
           val snapshot = firestore.collection("restaurants")
               .document(restaurantId.toString())
               .collection("menu")
               .get().await()
           emit(snapshot.toObjects(MenuItem::class.java))
       } catch (e: Exception) {
           emit(allMenuItems.filter { it.restaurantId == restaurantId })
       }
   }
   ```

2. **Categories** - Should fetch from Firestore
3. **Notifications** - Should fetch from Firestore/FCM

### **MEDIUM PRIORITY** 🟡

4. **Carousel Items** - Should fetch from Firestore (for dynamic promotions)
5. **Top Rated Food** - Should calculate from order data
6. **Search Results** - Should query Firestore

### **LOW PRIORITY** 🟢

7. **Recent Searches** - Should store in local database (Room)
8. **Popular Cuisines** - Could be static or from Firestore

---

## 📋 Recommended Actions

### Immediate (Before Production):
1. ✅ Create Firestore collections:
   - `restaurants/{restaurantId}/menu` - Menu items
   - `restaurants/{restaurantId}/categories` - Categories
   - `notifications/{userId}/messages` - User notifications
   - `promotions/carousel` - Carousel items

2. ✅ Update Repository methods to fetch from Firestore

3. ✅ Keep fallback data for offline/error scenarios

### Future Enhancements:
1. Implement caching with Room database
2. Add pagination for large datasets
3. Implement search indexing (Algolia or Firebase Extensions)

---

## 🔧 Current Data Flow

```
Customer App
    ↓
RestaurantRepo.getRestaurants()
    ↓
Firestore.collection("restaurants") → ✅ LIVE DATA
    ↓ (if empty or error)
Fallback to hardcoded → ⚠️ DUMMY DATA
```

```
Customer App
    ↓
RestaurantRepo.getMenuItems()
    ↓
Hardcoded array filter → ❌ ALWAYS DUMMY DATA
```

---

## ✅ What's Working Well

1. **Order Tracking** - Real-time Firebase sync ✅
2. **Restaurant List** - Firebase with fallback ✅
3. **Authentication** - Firebase Auth ✅
4. **Session Management** - DataStore + Firebase ✅

---

## 🎯 Conclusion

**Current State**: The app has a **hybrid approach** with Firebase integration for core features (restaurants, orders) but still relies on hardcoded data for several secondary features.

**Recommendation**: 
- **For Testing**: Current setup is acceptable
- **For Production**: Need to implement Firestore collections for menu items, categories, and notifications

**Risk Level**: 🟡 **Medium** - App will work but with limited data until Firestore is populated
