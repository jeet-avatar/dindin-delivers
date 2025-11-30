# 🏗️ EatFair Enterprise Architecture - Complete System Design

## ❌ WHY THE DISCREPANCY HAPPENED

**Root Cause:** The delivery app was built with **UI-first development** instead of **data-first architecture**.

### What Went Wrong:
1. **No Shared Data Schema** - Each app (Customer, Restaurant, Delivery) was built independently
2. **Mock Data Shortcuts** - Used hardcoded values instead of implementing proper backend queries
3. **Missing Collections** - Driver metrics, ratings, sessions weren't planned in Firestore
4. **No API Contract** - Apps assumed data structures without documented Firestore schema
5. **UI Before Backend** - Designed beautiful screens without confirming data availability

### Enterprise Level Means:
- **Schema-First Development** - Define Firestore collections before building UI
- **Shared Models** - All apps use identical data structures (✅ you have EatFairShared)
- **Real-Time Sync** - Changes in one app instantly reflect in others
- **Proper Metrics** - Track performance, ratings, sessions systematically
- **No Mock Data in Production** - Use feature flags, not hardcoded values

---

## 🔥 FIRESTORE DATABASE SCHEMA (Complete)

### **1. `orders/` Collection**
**Purpose:** Central source of truth for all three apps

```typescript
orders/{orderId} {
  // Identifiers
  id: string (auto-generated)
  orderId: string (unique, e.g., "ORD12345")
  
  // Customer Info
  customerId: string (Auth UID)
  customerName: string
  customerPhone: string?
  customerEmail: string
  
  // Delivery Address
  deliveryAddress: {
    fullAddress: string
    street: string
    city: string
    state: string
    zipCode: string
    latitude: double
    longitude: double
  }
  deliveryInstructions: string
  
  // Restaurant Info
  restaurant: {
    id: string
    name: string
    address: string
    latitude: double
    longitude: double
    imageUrl: string?
  }
  
  // Order Items
  items: [{
    id: string
    menuItemId: string
    name: string
    price: double
    quantity: int
    options: string[]?
  }]
  itemsCount: int
  
  // Pricing
  subtotal: double
  deliveryFee: double
  serviceFee: double
  priorityFee: double
  smallOrderFee: double
  tax: double
  total: double
  
  // Status & Lifecycle
  status: string // "Pending" | "Confirmed" | "Preparing" | "Ready" | "Out for Delivery" | "Delivered" | "Cancelled"
  placedAt: int64 (timestamp ms)
  confirmedAt: int64?
  preparedAt: int64?
  pickedUpAt: int64?
  deliveredAt: int64?
  cancelledAt: int64?
  
  // Driver Assignment
  driverId: string? (Auth UID)
  driverName: string?
  driverPhone: string?
  
  // Restaurant Assignment
  restaurantId: string
  
  // Metadata
  paymentMethod: string
  paymentStatus: string // "Pending" | "Paid" | "Refunded"
}
```

**Indexes Needed:**
```
- status (ascending) + driverId (ascending) + placedAt (descending)
- restaurantId (ascending) + status (ascending) + placedAt (descending)
- customerId (ascending) + placedAt (descending)
- driverId (ascending) + deliveredAt (descending)
```

---

### **2. `drivers/` Collection**
**Purpose:** Driver profiles and real-time metrics

```typescript
drivers/{driverId} {
  // Identity
  id: string (Auth UID)
  name: string
  email: string
  phone: string
  photoUrl: string?
  
  // Vehicle
  vehicleType: string // "Car" | "Bike" | "Scooter" | "Truck"
  licensePlate: string
  
  // Status
  isOnline: boolean
  lastActive: int64 (timestamp ms)
  currentLocation: {
    latitude: double
    longitude: double
    updatedAt: int64
  }?
  
  // Performance Metrics (CALCULATED)
  rating: double (1.0-5.0, average from ratings collection)
  totalDeliveries: int
  completedDeliveries: int
  cancelledDeliveries: int
  totalEarnings: double (lifetime)
  totalDistance: double (miles)
  totalOnlineTime: double (hours)
  
  // Rates (CALCULATED)
  acceptanceRate: double (0-100%)
  completionRate: double (0-100%)
  onTimeRate: double (0-100%)
  
  // Account
  joinedAt: int64
  isVerified: boolean
  isActive: boolean
  bankAccount: {
    accountNumber: string (encrypted)
    routingNumber: string
    accountHolderName: string
  }?
  
  // Weekly Stats (reset every Monday)
  weeklyStats: {
    deliveries: int
    earnings: double
    hours: double
    distance: double
    weekStartDate: int64
  }
}
```

---

### **3. `driver_sessions/` Collection**
**Purpose:** Track when drivers are online/offline

```typescript
driver_sessions/{sessionId} {
  id: string (auto-generated)
  driverId: string (Auth UID)
  
  // Session Time
  startTime: int64 (timestamp ms)
  endTime: int64? (timestamp ms, null if still active)
  duration: double? (hours, calculated on end)
  
  // Location
  startLocation: {
    latitude: double
    longitude: double
  }
  endLocation: {
    latitude: double
    longitude: double
  }?
  
  // Performance
  deliveriesCompleted: int
  deliveriesCancelled: int
  totalDistance: double (miles)
  totalEarnings: double
  
  // Metadata
  deviceInfo: string
  appVersion: string
}
```

**Usage:**
- Create session when driver goes online
- Update deliveriesCompleted/earnings in real-time
- Close session (set endTime) when offline
- Query current week sessions for "Online Time" stat

---

### **4. `ratings/` Collection**
**Purpose:** Customer ratings for drivers

```typescript
ratings/{ratingId} {
  id: string (auto-generated)
  orderId: string
  
  // Parties
  customerId: string (Auth UID)
  customerName: string
  driverId: string (Auth UID)
  driverName: string
  restaurantId: string
  
  // Rating
  rating: int (1-5 stars)
  comment: string?
  
  // Categories (optional)
  onTime: boolean
  friendly: boolean
  followedInstructions: boolean
  
  // Metadata
  createdAt: int64 (timestamp ms)
}
```

**Calculation:**
```swift
// Update driver rating after new rating
let avgRating = ratings
  .filter { $0.driverId == driverId }
  .map { $0.rating }
  .average()

// Update drivers/{driverId}.rating
```

---

### **5. `restaurants/` Collection**
**Purpose:** Restaurant profiles for partner app

```typescript
restaurants/{restaurantId} {
  id: string (auto-generated)
  name: string
  description: string
  email: string
  phone: string
  
  // Location
  address: string
  city: string
  state: string
  zipCode: string
  latitude: double
  longitude: double
  
  // Media
  logoUrl: string
  coverImageUrl: string
  images: string[]
  
  // Business
  cuisine: string[]
  priceRange: string // "$" | "$$" | "$$$" | "$$$$"
  rating: double (from customer reviews)
  reviewCount: int
  
  // Hours
  hours: {
    monday: { open: string, close: string, isClosed: boolean }
    tuesday: { open: string, close: string, isClosed: boolean }
    // ... rest of week
  }
  
  // Status
  isOpen: boolean (real-time)
  acceptingOrders: boolean
  
  // Metrics
  totalOrders: int
  averagePreparationTime: int (minutes)
  
  // Settings
  minimumOrder: double
  deliveryRadius: double (miles)
  estimatedDeliveryTime: int (minutes)
  
  createdAt: int64
}
```

---

### **6. `menu_items/` Collection**
**Purpose:** Restaurant menu items

```typescript
menu_items/{itemId} {
  id: string (auto-generated)
  restaurantId: string (FK to restaurants)
  
  name: string
  description: string
  imageUrl: string?
  
  price: double
  category: string // "Appetizers" | "Entrees" | "Desserts" | "Drinks"
  
  // Options
  options: [{
    name: string // "Size" | "Add-ons"
    choices: [{
      name: string
      price: double
    }]
    isRequired: boolean
    maxSelections: int
  }]?
  
  // Status
  isAvailable: boolean
  isPopular: boolean
  
  // Dietary
  tags: string[] // "Vegan" | "Gluten-Free" | "Spicy"
  
  // Metrics
  orderCount: int
  
  createdAt: int64
}
```

---

### **7. `customers/` Collection**
**Purpose:** Customer profiles

```typescript
customers/{customerId} {
  id: string (Auth UID)
  name: string
  email: string
  phone: string?
  photoUrl: string?
  
  // Addresses
  defaultAddress: {
    fullAddress: string
    street: string
    city: string
    state: string
    zipCode: string
    latitude: double
    longitude: double
    label: string // "Home" | "Work" | "Other"
  }
  savedAddresses: [/* same structure */]
  
  // Payment
  defaultPaymentMethod: string
  
  // Preferences
  dietaryRestrictions: string[]
  favoriteRestaurants: string[] (FK to restaurants)
  
  // Metrics
  totalOrders: int
  totalSpent: double
  
  createdAt: int64
}
```

---

### **8. `driver_earnings/` Collection (Detailed Breakdown)
**Purpose:** Granular earnings tracking per order

```typescript
driver_earnings/{earningId} {
  id: string (auto-generated)
  driverId: string (Auth UID)
  orderId: string (FK to orders)
  
  // Earnings Breakdown
  deliveryFee: double
  priorityFee: double
  bonus: double
  tip: double // actual tip if customer adds it
  estimatedTip: double // 15% of total if no tip yet
  
  total: double
  
  // Metadata
  earnedAt: int64 (timestamp ms)
  payoutStatus: string // "Pending" | "Paid" | "Withheld"
  payoutDate: int64?
}
```

---

## 🔄 DATA FLOW: How the 3 Apps Communicate

### **Scenario: Customer Places Order**

```
CUSTOMER APP                    FIRESTORE                   RESTAURANT APP              DELIVERY APP
─────────────────────────────────────────────────────────────────────────────────────────────────────
1. Customer clicks             
   "Place Order"                →  CREATE orders/{id}
                                   status: "Pending"
                                   restaurantId: "rest123"
                                                          
                                                          ← 2. Snapshot listener
                                                             triggers for restaurantId
                                                             
                                                          3. Restaurant sees new order
                                                             "New Order Alert!"
                                                             
                                                          4. Restaurant clicks "Accept"
                                                          
                                   ← UPDATE orders/{id}  
                                      status: "Confirmed"
                                      
← 5. Snapshot listener             confirmedAt: timestamp
   updates customer UI
   "Restaurant confirmed!"
   
                                                          6. Restaurant prepares food
                                                             Updates status to "Preparing"
                                                             
                                                          7. Food ready, click "Ready"
                                                          
                                   ← UPDATE orders/{id}
                                      status: "Ready"
                                      preparedAt: timestamp
                                                                                        
                                                                                        ← 8. Snapshot listener
                                                                                           triggers for status=="Ready"
                                                                                           AND driverId==null
                                                                                           
                                                                                        9. Driver sees in "Available Orders"
                                                                                        
                                                                                        10. Driver clicks "Accept"
                                                                                        
                                   ← UPDATE orders/{id}                              
                                      status: "Out for Delivery"
                                      driverId: "driver456"
                                      pickedUpAt: timestamp
                                      
← 11. Snapshot updates                                                                  12. Order moves to "My Deliveries"
   customer UI                                                                             Real-time tracking starts
   "Driver John is on the way!"
   
                                                                                        13. Driver delivers, clicks "Delivered"
                                                                                        
                                   ← UPDATE orders/{id}
                                      status: "Delivered"
                                      deliveredAt: timestamp
                                      
← 14. Customer sees                                       ← 15. Restaurant sees          ← 16. Order moves to history
   "Order delivered!"                                         completion stats               Earnings calculated
   Rate driver prompt                                         update                          
   
17. Customer rates driver      →  CREATE ratings/{id}
                                   driverId: "driver456"
                                   rating: 5
                                                                                        ← 18. Driver rating updates
                                                                                           drivers/{id}.rating recalculated
```

### **Key Points:**
- **Single Source of Truth:** `orders` collection
- **Real-Time Updates:** All apps use `.addSnapshotListener()`
- **No Polling:** Firebase pushes changes instantly
- **Atomic Updates:** Status changes trigger cascading updates
- **Automatic Sync:** No manual refresh needed

---

## 📊 CALCULATED METRICS (Not Stored)

### **QuickStatsGrid Values:**

#### **1. Online Time**
```swift
func calculateOnlineTime() -> String {
    // Query driver_sessions WHERE driverId == uid AND weekStartDate == thisWeek
    let sessions = queryCurrentWeekSessions()
    let totalMinutes = sessions.reduce(0) { sum, session in
        if let end = session.endTime {
            return sum + (end - session.startTime) / 60000 // ms to minutes
        } else {
            // Currently active session
            return sum + (Date().timeIntervalSince1970 * 1000 - Double(session.startTime)) / 60000
        }
    }
    return "\(totalMinutes / 60)h \(totalMinutes % 60)m"
}
```

#### **2. Total Distance**
```swift
func calculateTotalDistance() -> Double {
    // Query driver_sessions WHERE driverId == uid AND weekStartDate == thisWeek
    let sessions = queryCurrentWeekSessions()
    return sessions.reduce(0) { $0 + $1.totalDistance }
}
```

#### **3. Acceptance Rate**
```swift
func calculateAcceptanceRate() -> Double {
    // Query orders WHERE driverId == uid AND placedAt >= weekStart
    let accepted = orders.filter { $0.driverId == uid }.count
    
    // Need to track "offered orders" (new collection: driver_offers)
    // For now, calculate from delivered + cancelled
    let total = orders.filter { $0.driverId == uid || $0.offeredTo.contains(uid) }.count
    
    return total > 0 ? Double(accepted) / Double(total) * 100 : 0.0
}
```

#### **4. Completion Rate**
```swift
func calculateCompletionRate() -> Double {
    // Query orders WHERE driverId == uid AND weekStartDate == thisWeek
    let accepted = orders.filter { $0.driverId == uid }
    let completed = accepted.filter { $0.status == "Delivered" }.count
    let total = accepted.count
    
    return total > 0 ? Double(completed) / Double(total) * 100 : 0.0
}
```

---

## 🛠️ IMPLEMENTATION PLAN

### **Phase 1: Remove Fake Data (Immediate)**
- ❌ Delete hardcoded values in QuickStatsGrid
- ❌ Remove `Double.random()` distance calculations
- ❌ Remove hardcoded "4.8 Rating"
- ❌ Remove mock earnings breakdown
- ✅ Keep only Firebase-connected components

### **Phase 2: Add Missing Collections (1-2 days)**
- 📝 Create `driver_sessions` collection
- 📝 Create `ratings` collection
- 📝 Create `driver_earnings` collection
- 📝 Create `driver_offers` collection (track shown orders)

### **Phase 3: Implement Real Calculations (2-3 days)**
- 🧮 Session tracking (online time, distance)
- 🧮 Rating aggregation
- 🧮 Acceptance/Completion rate calculations
- 🧮 Earnings breakdown (fees, tips, bonuses)

### **Phase 4: Real-Time Updates (1 day)**
- 🔄 Snapshot listeners for all metrics
- 🔄 Update drivers collection on delivery completion
- 🔄 Recalculate ratings after new rating

### **Phase 5: Cross-App Testing (2 days)**
- 🧪 Customer places order → Restaurant receives
- 🧪 Restaurant prepares → Driver sees available
- 🧪 Driver accepts → Customer sees tracking
- 🧪 Driver delivers → All apps update
- 🧪 Customer rates → Driver rating updates

---

## 🎯 ENTERPRISE CHECKLIST

**Data Architecture:**
- [x] Shared data models (EatFairShared package)
- [ ] Complete Firestore schema documented
- [ ] Indexes created for all queries
- [ ] Security rules implemented

**Real-Time Sync:**
- [x] Orders collection snapshot listeners
- [ ] Driver sessions tracking
- [ ] Rating system implemented
- [ ] Metrics auto-calculation

**App Communication:**
- [x] Customer → Firestore → Restaurant flow
- [ ] Restaurant → Firestore → Delivery flow
- [ ] Delivery → Firestore → Customer tracking
- [ ] All status transitions tested

**Performance Metrics:**
- [ ] Driver stats calculation
- [ ] Earnings breakdown by type
- [ ] Rating aggregation
- [ ] Session tracking

**Production Ready:**
- [ ] No mock data in production builds
- [ ] Feature flags for testing
- [ ] Error handling for all Firestore queries
- [ ] Offline support with local cache

---

## 🚨 WHY THIS MATTERS

**Before (Current State):**
- Beautiful UI with **fake data underneath**
- Apps work independently, **don't communicate**
- **No single source of truth**
- **Can't go to production** with hardcoded values

**After (Enterprise Architecture):**
- **Real-time sync** across all apps
- **Single Firestore database** as truth
- **Calculated metrics** from actual data
- **Production-ready** system
- **Scalable** to thousands of orders/day

---

**Bottom Line:** The UI is world-class. The backend connection is 85% there. But the missing 15% (driver metrics, ratings, sessions) makes it feel disconnected. Once we implement proper calculations instead of hardcoded values, this becomes a true enterprise system.
