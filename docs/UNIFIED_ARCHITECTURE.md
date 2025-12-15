# EatFair Unified Architecture - DoorDash/Uber Style

## Overview

This document defines the **single source of truth** for data models and Firestore collections across Android and iOS platforms. Both platforms MUST conform to this structure.

---

## Firestore Collections

### 1. `orders` Collection

The primary collection for all order data.

```
orders/{orderId}
├── id: String (Firestore document ID)
├── orderId: String (e.g., "EF-20241212-143052-A1B2")
│
├── # Customer Info
├── customerId: String
├── customerName: String
├── customerPhone: String?
├── customerEmail: String
│
├── # Delivery Address (embedded object)
├── deliveryAddress: {
│   ├── fullAddress: String (complete formatted address)
│   ├── street: String
│   ├── unit: String?
│   ├── city: String
│   ├── state: String
│   ├── zipCode: String
│   ├── latitude: Double
│   ├── longitude: Double
│   ├── landmark: String?
│   └── instructions: String?
│   }
├── deliveryInstructions: String
│
├── # Restaurant Info (embedded object)
├── restaurant: {
│   ├── id: String
│   ├── name: String
│   ├── address: String
│   ├── latitude: Double
│   ├── longitude: Double
│   └── imageUrl: String
│   }
│
├── # Order Items
├── items: [
│   {
│       ├── id: String (UUID)
│       ├── menuItemId: String
│       ├── name: String
│       ├── price: Double
│       ├── quantity: Int
│       └── options: [String]?
│   }
│   ]
├── itemsCount: Int
│
├── # Pricing (DoorDash/Uber style breakdown)
├── subtotal: Double
├── deliveryFee: Double
├── serviceFee: Double
├── platformFee: Double
├── smallOrderFee: Double (if subtotal < $10)
├── priorityFee: Double (for express delivery)
├── tax: Double
├── taxRate: Double (e.g., 8.75)
├── taxState: String? (e.g., "CA")
├── tip: Double
├── tipPercentage: Double?
├── discount: Double
├── discountType: String? ("percentage" | "fixed")
├── promotionCode: String?
├── total: Double
│
├── # Order Status
├── status: String (see Status Values below)
│
├── # Timestamps (Unix milliseconds)
├── placedAt: Int64
├── acceptedAt: Int64?
├── preparingAt: Int64?
├── readyAt: Int64?
├── pickedUpAt: Int64?
├── deliveredAt: Int64?
├── cancelledAt: Int64?
├── estimatedDeliveryTime: Int64?
│
├── # Driver Assignment
├── driverId: String?
├── driverName: String?
├── driverPhone: String?
├── driverRating: Double?
├── driverLatitude: Double?
├── driverLongitude: Double?
│
├── # Distance & Time
├── restaurantToCustomerDistance: Double? (miles)
├── estimatedPrepTime: Int? (minutes)
├── estimatedDeliveryTime: Int? (minutes)
│
├── # Ratings
├── isRated: Bool
├── isTipped: Bool
└── rating: Int? (1-5)
```

### Order Status Values (UNIFIED)

| Status | Description | Who Sets It |
|--------|-------------|-------------|
| `placed` | Order placed, awaiting restaurant | Customer App |
| `accepted` | Restaurant accepted order | Partner App |
| `preparing` | Restaurant is preparing food | Partner App |
| `ready` | Food ready for pickup | Partner App |
| `driver_assigned` | Driver assigned to order | System |
| `driver_en_route_pickup` | Driver heading to restaurant | Driver App |
| `driver_arrived_pickup` | Driver at restaurant | Driver App |
| `picked_up` | Driver picked up order | Driver App |
| `out_for_delivery` | Driver heading to customer | Driver App |
| `driver_arrived` | Driver at customer location | Driver App |
| `delivered` | Order delivered | Driver App |
| `cancelled` | Order cancelled | Any App |

---

### 2. `users` Collection

Customer profiles.

```
users/{userId}
├── id: String
├── email: String
├── name: String
├── phone: String?
├── profileImageUrl: String?
├── createdAt: Int64
├── updatedAt: Int64?
│
├── # Preferences
├── defaultAddressId: String?
├── paymentMethodId: String?
├── notificationsEnabled: Bool
│
├── # Stats
├── totalOrders: Int
├── totalSpent: Double
└── favoriteRestaurants: [String]
```

### 3. `addresses` Subcollection

```
users/{userId}/addresses/{addressId}
├── id: String
├── userId: String
├── locationName: String (e.g., "Home", "Work")
├── street: String
├── unit: String?
├── city: String
├── state: String
├── zipCode: String
├── instructions: String?
├── addressType: String ("home" | "work" | "other")
├── latitude: Double
├── longitude: Double
├── phoneNumber: String?
├── isDefault: Bool
├── createdAt: Int64
└── updatedAt: Int64?
```

---

### 4. `restaurants` Collection

```
restaurants/{restaurantId}
├── id: String
├── name: String
├── cuisine: String
├── rating: Double
├── reviewCount: Int
├── deliveryTime: String (e.g., "30-45")
├── imageUrl: String
├── coverImageUrl: String?
├── address: String
├── street: String?
├── unit: String?
├── city: String?
├── state: String?
├── zipCode: String?
├── latitude: Double
├── longitude: Double
├── phone: String
├── email: String?
│
├── # Operating Hours
├── isOpen: Bool
├── operatingHours: {
│   monday: { open: String, close: String },
│   tuesday: { open: String, close: String },
│   ...
│   }
│
├── # Features
├── isPureVeg: Bool
├── hasDelivery: Bool
├── hasPickup: Bool
├── minimumOrder: Double
├── deliveryRadius: Double (miles)
│
├── # Partner Info
├── partnerId: String
├── commissionRate: Double (e.g., 0.15 for 15%)
├── stripeConnectId: String?
│
├── # Stats
├── totalOrders: Int
├── totalRevenue: Double
├── averageRating: Double
│
├── createdAt: Int64
└── updatedAt: Int64?
```

### 5. `menu` Subcollection

```
restaurants/{restaurantId}/menu/{menuItemId}
├── id: String
├── name: String
├── description: String
├── price: Double
├── imageUrl: String?
├── category: String
├── isAvailable: Bool
├── isPopular: Bool
├── prepTime: Int (minutes)
│
├── # Nutrition
├── calories: Int?
├── allergens: [String]?
├── dietaryTags: [String]? ("vegetarian", "vegan", "gluten-free")
│
├── # Customizations
├── customizations: [
│   {
│       name: String,
│       type: String ("single" | "multiple"),
│       required: Bool,
│       minSelections: Int?,
│       maxSelections: Int?,
│       options: [
│           { name: String, price: Double, isDefault: Bool }
│       ]
│   }
│   ]
│
├── createdAt: Int64
└── updatedAt: Int64?
```

---

### 6. `drivers` Collection

```
drivers/{driverId}
├── id: String
├── name: String
├── email: String
├── phone: String
├── profileImageUrl: String?
├── dateOfBirth: Int64?
├── ssn4: String? (last 4 only)
│
├── # Address
├── address: {
│   street: String,
│   unit: String?,
│   city: String,
│   state: String,
│   zipCode: String
│   }
│
├── # Driver's License
├── driversLicense: {
│   licenseNumber: String,
│   state: String,
│   expirationDate: Int64,
│   licenseClass: String,
│   frontImageUrl: String?,
│   backImageUrl: String?,
│   isVerified: Bool
│   }
│
├── # Vehicle
├── vehicle: {
│   make: String,
│   model: String,
│   year: Int,
│   color: String,
│   licensePlate: String,
│   state: String,
│   vehicleType: String ("car" | "bike" | "scooter" | "motorcycle"),
│   imageUrl: String?,
│   isVerified: Bool
│   }
│
├── # Insurance
├── insurance: {
│   provider: String,
│   policyNumber: String,
│   expirationDate: Int64,
│   imageUrl: String?,
│   isVerified: Bool
│   }
│
├── # Bank Account
├── bankAccount: {
│   bankName: String,
│   accountHolderName: String,
│   accountType: String ("checking" | "savings"),
│   accountNumberLast4: String,
│   isVerified: Bool,
│   stripeConnectId: String?
│   }
│
├── # Status
├── isOnline: Bool
├── isApproved: Bool
├── approvalStatus: String ("pending" | "approved" | "rejected" | "suspended")
├── backgroundCheckStatus: String? ("pending" | "passed" | "failed")
│
├── # Current Location
├── currentLatitude: Double
├── currentLongitude: Double
├── lastActive: Int64?
├── currentSessionId: String?
│
├── # Stats (CRITICAL - was missing in Android)
├── stats: {
│   rating: Double,
│   totalDeliveries: Int,
│   completedDeliveries: Int,
│   cancelledDeliveries: Int,
│   totalEarnings: Double,
│   totalDistance: Double,
│   totalOnlineTime: Double,
│   acceptanceRate: Double,
│   completionRate: Double,
│   onTimeRate: Double,
│   weeklyDeliveries: Int,
│   weeklyEarnings: Double,
│   weeklyHours: Double
│   }
│
├── # Preferences
├── preferences: {
│   maxDeliveryDistance: Double,
│   preferredAreas: [String],
│   acceptCashOrders: Bool,
│   notificationsEnabled: Bool,
│   autoAcceptOrders: Bool
│   }
│
├── createdAt: Int64
└── updatedAt: Int64?
```

---

### 7. `driver_sessions` Collection

Track driver work sessions for earnings calculation.

```
driver_sessions/{sessionId}
├── id: String
├── driverId: String
├── startTime: Int64
├── endTime: Int64?
├── duration: Double? (hours)
├── startLatitude: Double
├── startLongitude: Double
├── endLatitude: Double?
├── endLongitude: Double?
├── deliveriesCompleted: Int
├── deliveriesCancelled: Int
├── totalDistance: Double (miles)
├── totalEarnings: Double
├── deviceInfo: String?
└── appVersion: String?
```

---

### 8. `ratings` Collection

```
ratings/{ratingId}
├── id: String
├── orderId: String
├── customerId: String
├── customerName: String
├── driverId: String
├── driverName: String
├── restaurantId: String
├── restaurantName: String
├── rating: Int (1-5)
├── comment: String?
│
├── # Detailed Feedback
├── onTime: Bool
├── friendly: Bool
├── followedInstructions: Bool
├── foodQuality: Bool
│
└── createdAt: Int64
```

---

### 9. `promotions` Collection

```
promotions/{promotionId}
├── id: String
├── restaurantId: String?
├── code: String
├── title: String
├── description: String
├── discountType: String ("percentage" | "fixed")
├── discountValue: Double
├── maxDiscount: Double?
├── minimumOrder: Double
├── applicableOn: String ("subtotal" | "delivery" | "total")
├── maxUsagePerUser: Int
├── totalUsageLimit: Int?
├── startDate: Int64
├── endDate: Int64
├── isActive: Bool
└── usageCount: Int
```

---

## Key Differences Fixed

| Field | Android (OLD) | iOS/Unified (NEW) |
|-------|---------------|-------------------|
| Total Amount | `totalAmount` | `total` |
| Address | `deliveryAddress.completeAddress` | `deliveryAddress.fullAddress` |
| House Number | `deliveryAddress.houseNumber` | `deliveryAddress.unit` |
| Road | `deliveryAddress.apartmentRoad` | `deliveryAddress.street` |
| Status: Placed | `ORDER_PLACED` | `placed` |
| Status: Preparing | `PREPARING` | `preparing` |
| Status: Out for Delivery | `OUT_FOR_DELIVERY` | `out_for_delivery` |
| Status: Delivered | `DELIVERED` | `delivered` |
| Driver Stats | NOT TRACKED | Full stats object |
| Ratings | NOT IMPLEMENTED | Full ratings collection |
| Sessions | NOT IMPLEMENTED | driver_sessions collection |

---

## API Endpoints (P2P/Dollor Backend)

### Order Management
- `POST /api/v3/order/create` - Create new order
- `GET /api/v3/order/{orderId}` - Get order details
- `PUT /api/v3/order/{orderId}/status` - Update order status
- `GET /api/v3/vendor/{vendorId}/orders` - Get restaurant orders

### Driver Management
- `GET /api/v3/driver/dashboard` - Get driver dashboard stats
- `GET /api/v3/driver/deliveries` - Get available deliveries
- `PUT /api/v3/driver/delivery/{orderId}/pickup` - Mark as picked up
- `PUT /api/v3/driver/delivery/{orderId}/complete` - Mark as delivered

### Restaurant Management
- `GET /api/v3/restaurants` - List restaurants
- `GET /api/v3/restaurant/{id}/menu` - Get menu items
- `PUT /api/v3/vendor/order/{orderId}/accept` - Accept order
- `PUT /api/v3/vendor/order/{orderId}/ready` - Mark as ready

---

## Pricing Structure (DoorDash/Uber Style)

```
Subtotal: Sum of (item price * quantity)
Delivery Fee: $2.99 base + $0.50/mile (max $8.99, FREE over $35)
Service Fee: $0.99 flat
Small Order Fee: $2.00 (if subtotal < $10)
Priority Fee: $1.99 (optional express delivery)
Tax: 8.75% of subtotal (varies by state)
Tip: Customer selected (15%, 20%, 25%, or custom)
─────────────────────────────────────────────
Total: Subtotal + Fees + Tax + Tip - Discount
```

---

## Revenue Split

| Party | Percentage |
|-------|------------|
| Restaurant | 85% of subtotal |
| Platform (EatFair) | 15% commission + service fee |
| Driver | Delivery fee + tips + priority bonus |

---

## Implementation Priority

1. **CRITICAL**: Update Android models to match this schema
2. **HIGH**: Add driver stats tracking to Android
3. **HIGH**: Implement ratings collection on Android
4. **MEDIUM**: Add driver sessions tracking
5. **MEDIUM**: Align status values across platforms

---

Last Updated: December 12, 2025
