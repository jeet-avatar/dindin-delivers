# 🔒 FIRESTORE SECURITY RULES & DEPLOYMENT

Complete guide for deploying Firestore collections, indexes, and security rules.

## 📋 TABLE OF CONTENTS
1. [Security Rules](#security-rules)
2. [Composite Indexes](#composite-indexes)
3. [Collection Setup](#collection-setup)
4. [Testing](#testing)

---

## 🔒 SECURITY RULES

Copy these rules to **Firebase Console → Firestore Database → Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // ORDERS
    match /orders/{orderId} {
      allow read: if isAuthenticated() && (
        resource.data.customerId == request.auth.uid ||
        resource.data.driverId == request.auth.uid ||
        resource.data.restaurantId == request.auth.uid
      );
      
      allow create: if isAuthenticated() && 
        request.resource.data.customerId == request.auth.uid;
      
      allow update: if isAuthenticated() && (
        resource.data.customerId == request.auth.uid ||
        resource.data.driverId == request.auth.uid ||
        resource.data.restaurantId == request.auth.uid
      );
    }
    
    // RATINGS
    match /ratings/{ratingId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        request.resource.data.customerId == request.auth.uid;
      allow update, delete: if false;
    }
    
    // DRIVER SESSIONS
    match /driver_sessions/{sessionId} {
      allow read, update: if isAuthenticated() && 
        resource.data.driverId == request.auth.uid;
      allow create: if isAuthenticated() && 
        request.resource.data.driverId == request.auth.uid;
      allow delete: if false;
    }
    
    // PROMOTIONS
    match /promotions/{promotionId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && 
        resource.data.restaurantId == request.auth.uid;
    }
    
    // TIPS
    match /tips/{tipId} {
      allow read: if isAuthenticated() && (
        resource.data.customerId == request.auth.uid ||
        resource.data.driverId == request.auth.uid
      );
      allow create: if isAuthenticated() && 
        request.resource.data.customerId == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.driverId == request.auth.uid;
      allow delete: if false;
    }
    
    // PROMOTION USAGE
    match /promotion_usage/{usageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        request.resource.data.customerId == request.auth.uid;
      allow update, delete: if false;
    }
    
    // DRIVERS
    match /drivers/{driverId} {
      allow read: if isAuthenticated();
      allow update: if isOwner(driverId);
      allow create, delete: if false;
    }
    
    // CUSTOMERS
    match /customers/{customerId} {
      allow read, update: if isOwner(customerId);
      allow create, delete: if false;
    }
    
    // RESTAURANTS
    match /restaurants/{restaurantId} {
      allow read: if isAuthenticated();
      allow update: if isOwner(restaurantId);
      allow create, delete: if false;
    }
    
    // MENU ITEMS
    match /menu_items/{itemId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
        request.resource.data.restaurantId == request.auth.uid;
    }
  }
}
```

---

## 📊 COMPOSITE INDEXES

Create these in **Firebase Console → Firestore Database → Indexes**

### 1. Orders by Driver
- Collection: `orders`
- Fields: `driverId` (Asc), `status` (Asc), `createdAt` (Desc)

### 2. Orders by Restaurant
- Collection: `orders`
- Fields: `restaurantId` (Asc), `status` (Asc), `createdAt` (Desc)

### 3. Orders by Customer
- Collection: `orders`
- Fields: `customerId` (Asc), `createdAt` (Desc)

### 4. Ratings by Driver
- Collection: `ratings`
- Fields: `driverId` (Asc), `createdAt` (Desc)

### 5. Driver Sessions
- Collection: `driver_sessions`
- Fields: `driverId` (Asc), `startTime` (Desc)

### 6. Promotions by Restaurant
- Collection: `promotions`
- Fields: `restaurantId` (Asc), `isActive` (Asc), `endDate` (Desc)

### 7. Promotions by Code
- Collection: `promotions`
- Fields: `code` (Asc), `isActive` (Asc)

### 8. Tips by Driver
- Collection: `tips`
- Fields: `driverId` (Asc), `createdAt` (Desc)

### 9. Promotion Usage
- Collection: `promotion_usage`
- Fields: `promotionId` (Asc), `customerId` (Asc)

---

## 🗂️ COLLECTION SETUP

### Create Collections in Firebase Console:

#### 1. **ratings** collection
```json
{
  "id": "rating_001",
  "orderId": "order_123",
  "customerId": "customer_456",
  "driverId": "driver_789",
  "rating": 5,
  "comment": "Great service!",
  "onTime": true,
  "friendly": true,
  "followedInstructions": true,
  "foodQuality": true,
  "createdAt": 1732694400000
}
```

#### 2. **driver_sessions** collection
```json
{
  "id": "session_001",
  "driverId": "driver_789",
  "startTime": 1732694400000,
  "endTime": 1732708800000,
  "duration": 4.0,
  "deliveriesCompleted": 8,
  "totalDistance": 25.5,
  "totalEarnings": 125.50
}
```

#### 3. **promotions** collection
```json
{
  "id": "promo_001",
  "restaurantId": "rest_123",
  "code": "SAVE20",
  "title": "20% Off",
  "discountType": "percentage",
  "discountValue": 20.0,
  "minimumOrder": 25.0,
  "isActive": true,
  "startDate": 1732694400000,
  "endDate": 1735286400000,
  "usageCount": 0
}
```

#### 4. **tips** collection
```json
{
  "id": "tip_001",
  "orderId": "order_123",
  "customerId": "customer_456",
  "driverId": "driver_789",
  "amount": 5.50,
  "tipType": "percentage",
  "percentage": 15.0,
  "createdAt": 1732694400000
}
```

#### 5. **promotion_usage** collection
```json
{
  "id": "usage_001",
  "promotionId": "promo_001",
  "customerId": "customer_456",
  "orderId": "order_123",
  "discountAmount": 5.00,
  "usedAt": 1732694400000
}
```

### Update Existing Collections:

#### Update **drivers** collection - Add stats:
```json
{
  "stats": {
    "rating": 4.8,
    "totalDeliveries": 450,
    "completedDeliveries": 445,
    "totalEarnings": 5250.50,
    "totalDistance": 1250.5,
    "totalOnlineTime": 280.5,
    "acceptanceRate": 95.0,
    "completionRate": 98.9,
    "onTimeRate": 96.5,
    "weeklyDeliveries": 45,
    "weeklyEarnings": 550.25
  },
  "currentSessionId": null,
  "isOnline": false
}
```

#### Update **orders** collection - Add new fields:
```json
{
  "promotionCode": null,
  "discount": 0,
  "taxRate": 7.25,
  "taxState": "CA",
  "tip": 0,
  "tipPercentage": null,
  "driverRating": 4.8,
  "restaurantToCustomerDistance": 2.5,
  "isRated": false,
  "isTipped": false
}
```

---

## 🧪 TESTING

### Test Flow:
1. ✅ Create test documents in each collection
2. ✅ Test reading with customer/driver/restaurant accounts
3. ✅ Test security rules (try unauthorized access)
4. ✅ Verify indexes are working (check query performance)
5. ✅ Test promotion application in customer app
6. ✅ Test rating submission in customer app
7. ✅ Test tip notification in driver app
8. ✅ Test session tracking in driver app

---

## 🚀 DEPLOYMENT STEPS

1. **Create Collections** - Add dummy documents
2. **Create Indexes** - Wait for build (5-10 min)
3. **Deploy Security Rules** - Copy & publish
4. **Update Existing Data** - Add new fields
5. **Test in Apps** - Verify all features work

---

**All set! Your Firestore is ready for production.** 🎉
