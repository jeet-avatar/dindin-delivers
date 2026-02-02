# Session Handoff - Dollor iOS Apps

> **Date:** 2026-02-01
> **Previous Session:** Customer Order History & API Fixes

---

## Current State

### iOS Apps (All on TestFlight)

| App | Build | Status | Bundle ID |
|-----|-------|--------|-----------|
| Customer | 1027 | TestFlight | `com.dollorai.customer` |
| Driver | 101 | TestFlight | `com.dollorai.delivery` |
| Restaurant | 102 | TestFlight | `com.dollorai.restaurant` |

**Team ID:** `PRKZ4UVCD7`

### Demo Accounts (App Store Review)

| App | Email | Password |
|-----|-------|----------|
| Customer | `demo.customer@dollor.ai` | `DemoCustomer2025!` |
| Driver | `demo.driver@dollor.ai` | `DemoDriver2025!` |
| Restaurant | `demo.restaurant@dollor.ai` | `DemoRestaurant2025!` |

---

## Completed This Session

### 1. Customer App Order History Fixed
- Orders now show in "All My Orders" page
- Each order displays correct timestamp (not same time)
- Full order details visible with items, pricing, status

### 2. Backend API Fixes

| Commit | Fix |
|--------|-----|
| `54a9656a` | Add timezone suffix (Z) to timestamps for iOS parsing |
| `3524a795` | Match `/api/customer/orders` response to iOS P2PCustomerOrder model |
| `bb2f5266` | Remove non-existent `ready_at`/`picked_up_at` fields from active-orders |
| `7d4ac22a` | Use explicit `and_()` in active-orders query |

### 3. Driver App Setup for App Review
- Added vehicle details: Toyota Camry 2022, Silver, ABC1234
- Set all documents as verified (`requires_documents: false`)
- Disabled broken Xcode Cloud workflow

### 4. Restaurant App - Mark Delivered Feature
- Added "Delivering" filter tab for self-delivery orders
- Added "Mark as Delivered" button for `RESTAURANT_WILL_DELIVER` status
- Restaurant can now complete self-delivery orders

### 5. Documentation Created
- `apps/ios/TESTFLIGHT_MANUAL_BUILD.md` - Manual build commands for all 3 apps
- `apps/ios/ExportOptions.plist` - Reusable export configuration

---

## Key API Endpoints Fixed

### Customer Orders
```
GET /api/customer/orders          - Order history (with auth)
GET /api/customer/{id}/active-orders - Active orders for tracking
```

**Response now includes:**
- `customer_name`, `customer_phone`
- `items` as JSON string (not array)
- `pickup_latitude`, `pickup_longitude`
- All timestamps with `Z` suffix for iOS parsing

### Restaurant Self-Delivery
```
POST /api/erp/orders/{id}/restaurant-accept-delivery - Accept self-delivery
POST /api/erp/orders/{id}/delivered                  - Mark as delivered
```

---

## Manual TestFlight Build Commands

```bash
# Customer App
cd apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -archivePath /tmp/eatfaircustomer.xcarchive \
  archive DEVELOPMENT_TEAM=PRKZ4UVCD7

xcodebuild -exportArchive \
  -archivePath /tmp/eatfaircustomer.xcarchive \
  -exportPath /tmp/eatfaircustomer-export \
  -exportOptionsPlist apps/ios/ExportOptions.plist

# Driver App
cd apps/ios/delivery
xcodebuild -workspace eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery -configuration Release \
  -archivePath /tmp/eatffairdelivery.xcarchive \
  archive DEVELOPMENT_TEAM=PRKZ4UVCD7

# Restaurant App
cd apps/ios/restaurant
xcodebuild -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant -configuration Release \
  -archivePath /tmp/eatffairrestaurant.xcarchive \
  archive DEVELOPMENT_TEAM=PRKZ4UVCD7
```

---

## Production URLs

| Service | URL |
|---------|-----|
| API | `https://api.dollor.ai` |
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net` |

---

## Known Issues

1. **Xcode Cloud for Driver App** - Disabled (was misconfigured with wrong scheme)
2. **Deploy workflow sometimes fails** - But changes still deploy to production

---

## Next Session Tasks

### Priority 1: End-to-End Testing
- [ ] Place order with Customer app → Accept in Restaurant app → Complete delivery
- [ ] Test self-delivery flow: Restaurant "I Will Deliver" → "Mark as Delivered"
- [ ] Verify customer receives push notifications for order status changes

### Priority 2: App Store Submission
- [ ] Submit Customer App for review
- [ ] Submit Driver App for review
- [ ] Submit Restaurant App for review

### Priority 3: Outstanding Features
- [ ] Order tracking map view
- [ ] Driver location updates
- [ ] Chat between customer and driver

---

## Files Location

```
/Users/jeet/StudioProjects/eatfair-ios/
├── apps/ios/
│   ├── customer/                    # Customer App (Build 1027)
│   ├── delivery/                    # Driver App (Build 101)
│   ├── restaurant/                  # Restaurant App (Build 102)
│   ├── eatfair-ios-shared/          # Shared Swift package
│   ├── TESTFLIGHT_MANUAL_BUILD.md   # Build commands
│   └── ExportOptions.plist          # Export config
└── apps/web/p2p-platform/backend/   # Python FastAPI backend
    └── main_new.py                  # Main API file
```

---

**END OF HANDOFF**
