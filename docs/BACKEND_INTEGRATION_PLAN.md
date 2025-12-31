# Backend Integration Roadmap for EatFair Delivery

## 🎯 Current Status

### ✅ What We Have (Frontend)
- **3 fully functional Android apps** with premium UI/UX
- **Centralized data layer** (`:shared` module)
- **Repository pattern** ready for backend integration
- **Hilt dependency injection** configured
- **Clean architecture** with MVVM

### ❌ What's Missing (Backend)
- **No real database** - Currently using hardcoded dummy data
- **No API server** - No backend to communicate with
- **No real-time sync** - Data doesn't persist or sync across devices
- **No authentication** - No real user login system
- **No file storage** - No image uploads for menus/profiles

---

## 🏗️ Recommended Backend Architecture

### Option 1: Firebase (Fastest - Recommended for MVP)

**Why Firebase?**
- ✅ **Quick setup** - Can be integrated in 1-2 days
- ✅ **Real-time database** - Perfect for live order updates
- ✅ **Authentication** built-in (Email, Google, Phone)
- ✅ **Cloud Storage** for images
- ✅ **Push notifications** (FCM) included
- ✅ **Scalable** - Handles millions of users
- ✅ **Free tier** available for testing

**Firebase Services Needed:**

1. **Firestore Database** (NoSQL)
   - Collections: `users`, `restaurants`, `orders`, `menu_items`, `addresses`
   - Real-time listeners for live updates
   
2. **Firebase Authentication**
   - Email/Password, Google Sign-In, Phone Auth
   - Separate auth for customers, partners, drivers
   
3. **Cloud Storage**
   - Restaurant images
   - Menu item photos
   - User profile pictures
   
4. **Cloud Functions** (Backend logic)
   - Order placement triggers
   - Payment processing
   - Notification sending
   
5. **Firebase Cloud Messaging (FCM)**
   - Push notifications for new orders
   - Order status updates
   - Promotional messages

**Estimated Timeline:** 1-2 weeks for full integration

---

### Option 2: Custom Backend (More Control)

**Tech Stack:**
- **Backend**: Node.js + Express.js (or Spring Boot for Java)
- **Database**: PostgreSQL (relational) or MongoDB (NoSQL)
- **API**: REST or GraphQL
- **Real-time**: Socket.io or WebSockets
- **File Storage**: AWS S3 or Google Cloud Storage
- **Authentication**: JWT tokens
- **Hosting**: AWS, Google Cloud, or DigitalOcean

**Estimated Timeline:** 4-6 weeks for full implementation

---

## 📋 Backend Integration Checklist

### Phase 1: Database Schema Design (Week 1)

#### Core Tables/Collections Needed:

**1. Users**
```sql
- id (UUID)
- email (unique)
- password_hash
- name
- phone
- role (customer/partner/driver)
- profile_image_url
- created_at
- updated_at
```

**2. Restaurants**
```sql
- id
- owner_id (FK to Users)
- name
- description
- address
- latitude
- longitude
- phone
- image_url
- rating
- is_active
- operating_hours (JSON)
- created_at
```

**3. Menu Items**
```sql
- id
- restaurant_id (FK)
- name
- description
- price
- category_id (FK)
- image_url
- is_veg
- is_available
- is_highly_ordered
- created_at
```

**4. Categories**
```sql
- id
- restaurant_id (FK)
- name
- emoji
- display_order
```

**5. Orders**
```sql
- id
- customer_id (FK to Users)
- restaurant_id (FK)
- driver_id (FK to Users, nullable)
- status (placed/preparing/ready/out_for_delivery/delivered/cancelled)
- total_amount
- delivery_address_id (FK)
- pickup_address (JSON)
- delivery_instructions
- estimated_delivery_time
- actual_delivery_time
- created_at
- updated_at
```

**6. Order Items**
```sql
- id
- order_id (FK)
- menu_item_id (FK)
- quantity
- price_at_time (snapshot of price)
- customizations (JSON)
```

**7. Addresses**
```sql
- id
- user_id (FK)
- location_name
- house_number
- street
- complete_address
- latitude
- longitude
- phone_number
- is_default
- type (home/work/other)
```

**8. Notifications**
```sql
- id
- user_id (FK)
- title
- message
- type (order/payment/review/system)
- is_read
- created_at
```

---

### Phase 2: API Endpoints Design (Week 1-2)

#### Authentication APIs
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
GET    /api/auth/me
```

#### Restaurant APIs
```
GET    /api/restaurants
GET    /api/restaurants/:id
GET    /api/restaurants/:id/menu
GET    /api/restaurants/:id/categories
POST   /api/restaurants (partner only)
PUT    /api/restaurants/:id (partner only)
```

#### Menu APIs (Partner)
```
GET    /api/menu-items
POST   /api/menu-items
PUT    /api/menu-items/:id
DELETE /api/menu-items/:id
PATCH  /api/menu-items/:id/availability
```

#### Order APIs
```
POST   /api/orders (customer)
GET    /api/orders (get user's orders)
GET    /api/orders/:id
PATCH  /api/orders/:id/status (partner/driver)
GET    /api/partner/orders (partner's orders)
GET    /api/driver/orders (driver's orders)
```

#### Address APIs
```
GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses/:id
DELETE /api/addresses/:id
PATCH  /api/addresses/:id/set-default
```

#### Notification APIs
```
GET    /api/notifications
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id
POST   /api/notifications/clear-all
```

---

### Phase 3: Android Integration (Week 2-3)

#### Step 1: Add Retrofit Dependencies

```kotlin
// In shared/build.gradle.kts
dependencies {
    // Retrofit for API calls
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

#### Step 2: Create API Service Interfaces

**Example: RestaurantApiService.kt**
```kotlin
package com.eatfair.shared.data.remote

interface RestaurantApiService {
    @GET("restaurants")
    suspend fun getRestaurants(): List<Restaurant>
    
    @GET("restaurants/{id}")
    suspend fun getRestaurantById(@Path("id") id: Int): Restaurant
    
    @GET("restaurants/{id}/menu")
    suspend fun getMenuItems(@Path("id") restaurantId: Int): List<MenuItem>
}
```

**Example: OrderApiService.kt**
```kotlin
interface OrderApiService {
    @POST("orders")
    suspend fun placeOrder(@Body order: OrderRequest): OrderResponse
    
    @GET("orders")
    suspend fun getUserOrders(): List<Order>
    
    @PATCH("orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: String,
        @Body status: OrderStatusUpdate
    ): Order
}
```

#### Step 3: Update Repositories

**Before (Dummy Data):**
```kotlin
class RestaurantRepo @Inject constructor() {
    fun getRestaurants(): Flow<List<Restaurant>> = flow {
        emit(dummyRestaurants) // Hardcoded data
    }
}
```

**After (Real API):**
```kotlin
class RestaurantRepo @Inject constructor(
    private val apiService: RestaurantApiService
) {
    fun getRestaurants(): Flow<List<Restaurant>> = flow {
        try {
            val restaurants = apiService.getRestaurants()
            emit(restaurants)
        } catch (e: Exception) {
            // Handle error
            emit(emptyList())
        }
    }
}
```

#### Step 4: Add Local Caching with Room

```kotlin
class RestaurantRepo @Inject constructor(
    private val apiService: RestaurantApiService,
    private val restaurantDao: RestaurantDao
) {
    fun getRestaurants(): Flow<List<Restaurant>> = flow {
        // 1. Emit cached data first (fast)
        val cached = restaurantDao.getAllRestaurants()
        if (cached.isNotEmpty()) {
            emit(cached)
        }
        
        // 2. Fetch fresh data from API
        try {
            val fresh = apiService.getRestaurants()
            restaurantDao.insertAll(fresh) // Update cache
            emit(fresh)
        } catch (e: Exception) {
            // If API fails, use cache
            if (cached.isEmpty()) {
                throw e
            }
        }
    }
}
```

---

### Phase 4: Real-time Features (Week 3-4)

#### Firebase Realtime Database for Live Orders

**Setup:**
```kotlin
// In shared/build.gradle.kts
dependencies {
    implementation("com.google.firebase:firebase-database-ktx:20.3.0")
}
```

**Listen for Order Updates:**
```kotlin
class OrderRepo @Inject constructor(
    private val database: FirebaseDatabase
) {
    fun listenToPartnerOrders(partnerId: String): Flow<List<Order>> = callbackFlow {
        val ordersRef = database.getReference("orders")
            .orderByChild("restaurantId")
            .equalTo(partnerId)
        
        val listener = ordersRef.addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val orders = snapshot.children.mapNotNull { 
                    it.getValue(Order::class.java) 
                }
                trySend(orders)
            }
            
            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        })
        
        awaitClose { ordersRef.removeEventListener(listener) }
    }
}
```

---

### Phase 5: Push Notifications (Week 4)

#### Firebase Cloud Messaging Setup

**1. Add FCM Dependency:**
```kotlin
implementation("com.google.firebase:firebase-messaging-ktx:23.4.0")
```

**2. Create FCM Service:**
```kotlin
class EatFairMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        // Show notification
        val notification = message.notification
        showNotification(notification?.title, notification?.body)
    }
    
    override fun onNewToken(token: String) {
        // Send token to backend
        sendTokenToServer(token)
    }
}
```

**3. Trigger from Backend (Cloud Function):**
```javascript
// When order is placed
exports.onOrderPlaced = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const restaurantId = order.restaurantId;
        
        // Get partner's FCM token
        const partner = await admin.firestore()
            .collection('users')
            .doc(restaurantId)
            .get();
        
        // Send notification
        await admin.messaging().send({
            token: partner.data().fcmToken,
            notification: {
                title: 'New Order!',
                body: `Order #${order.id} - $${order.total}`
            }
        });
    });
```

---

## 💰 Cost Estimates

### Firebase (Recommended for MVP)
- **Free Tier**: Up to 50K reads/day, 20K writes/day
- **Paid (Blaze Plan)**: Pay as you go
  - ~$25-100/month for 10K-50K users
  - ~$500-1000/month for 100K-500K users

### Custom Backend
- **Development**: $5,000 - $15,000 (if outsourced)
- **Hosting**: $50-200/month (DigitalOcean/AWS)
- **Database**: $25-100/month
- **Total First Year**: ~$6,000 - $18,000

---

## 🚀 Quick Start: Firebase Integration (1 Week Plan)

### Day 1: Firebase Setup
1. Create Firebase project at console.firebase.google.com
2. Add Android apps (3 apps, 3 package names)
3. Download `google-services.json` for each app
4. Add Firebase SDK to all modules

### Day 2-3: Firestore Database
1. Design Firestore collections
2. Set up security rules
3. Create test data
4. Update repositories to use Firestore

### Day 4-5: Authentication
1. Enable Email/Password auth
2. Implement login/register screens
3. Update SessionManager to use Firebase Auth
4. Add auth state listeners

### Day 6: Cloud Storage
1. Enable Cloud Storage
2. Implement image upload for menu items
3. Add profile picture upload

### Day 7: Testing & FCM
1. Test all features end-to-end
2. Set up FCM for notifications
3. Test real-time order flow

---

## 📝 Next Immediate Steps

**I recommend:**

1. **Choose Firebase** for fastest time-to-market (1-2 weeks)
2. **Start with Firestore** for the database
3. **Implement authentication** first
4. **Then add real-time orders**
5. **Finally add notifications**

**Would you like me to:**
- ✅ Set up Firebase configuration files?
- ✅ Create the Firestore database schema?
- ✅ Implement the API service interfaces?
- ✅ Update the repositories to use real backend?

Let me know and I'll start implementing the backend integration right away! 🚀
