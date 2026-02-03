# Dollor.ai iOS TestFlight Build Guide

> **Last Updated**: February 3, 2026
> **API Contract Version**: 1.0.9
> **Backend Version**: 1.0.5

---

## Current Build Numbers

| App | Bundle ID | Build | Version | Status |
|-----|-----------|-------|---------|--------|
| **Dollor (Customer)** | `com.dollorai.customer` | 1037 | 1.0 | Uploaded to TestFlight |
| **Dollor Driver** | `com.dollorai.delivery` | 114 | 1.0 | Uploaded to TestFlight |
| **Dollor Restaurant** | `com.dollorai.restaurant` | 113 | 1.0 | Uploaded to TestFlight |

---

## Recent Fixes (This Session)

| Issue | Fix | Commit |
|-------|-----|--------|
| Delivery buttons showing twice | Split status handling: `pending_delivery_decision` vs `ready_for_pickup` | `dc37ee73` |
| Driver photo missing | Added `vehicle_photo_url` column, demo driver profile with photos | `dc37ee73` |
| Driver rating error | Fixed `accept_delivery` using `driver.rating` (was `driver.average_rating`) | `dc37ee73` |
| Driver earnings showing $0 | Fixed backend response structure (today/this_week/this_month) | `33131dff` |
| Rate driver 404 error | Fixed endpoint URL: `/api/customer/orders/{id}/rate-driver` | `b65d4760` |
| "No Active Delivery" after accept | Added optimistic update in DriverViewModel | `198d9ad1` |

---

## API Endpoints Verified (Production)

**Last Verified**: February 3, 2026

### Core APIs

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /health` | ✅ 200 | Version 1.0.5, DB connected |
| `GET /api/vendors` | ✅ 200 | Returns vendor list |
| `GET /api/v5/driver/{id}/dashboard` | ✅ 200 | iOS-compatible format |
| `POST /api/customer/orders/{id}/rate-driver` | ✅ 401 | Requires auth (correct) |
| `POST /api/customer/orders/{id}/rate-restaurant` | ✅ 401 | Requires auth (correct) |

### Driver Profile APIs

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/admin/drivers` | ✅ 200 | Basic profile + vehicle details |
| `GET /api/drivers/{id}/documents` | ✅ 200 | Documents status (3 types) |
| `GET /api/v5/driver/{id}/dashboard` | ✅ 200 | Earnings (today/week/month) |
| `GET /api/drivers/{id}/status` | ✅ 200 | Online status, location |
| `GET /api/erp/orders/{id}/full-tracking` | ✅ 200 | Customer order tracking |
| `GET /api/erp/orders/vendor/{id}` | ✅ 200 | Restaurant order view |

### Driver Photo & Vehicle Pass-Through Verified

When a driver accepts an order, their photo and vehicle details are passed to both Customer and Restaurant apps:

**Customer App (Order Tracking Response)**:
```json
{
  "driver": {
    "id": 48,
    "name": "Demo Driver",
    "phone": "+1-555-123-4567",
    "rating": 4.9,
    "photo_url": "/uploads/driver_documents/48/photo_verified.png",
    "vehicle": "Toyota Camry",
    "vehicle_color": "Silver",
    "license_plate": "ABC1234"
  }
}
```

**Restaurant App (Vendor Orders Response)**:
```json
{
  "driver": {
    "id": 48,
    "name": "Demo Driver",
    "phone": "+1-555-123-4567",
    "photo_url": "/uploads/driver_documents/48/photo_verified.png",
    "vehicle": "Silver Toyota Camry",
    "license_plate": "ABC1234"
  }
}
```

### Earnings Dashboard Format (iOS-Compatible)

```json
{
  "driver_id": "48",
  "snapshot_time": "2026-02-03T03:19:50Z",
  "today": { "deliveries": 0, "gross_earnings": 0.0, "base_pay": 0, "tips": 0, "bonuses": 0.0, "active_hours": 0.0 },
  "this_week": { "deliveries": 3, "gross_earnings": 38.12, "base_pay": 21.12, "tips": 17.0, "bonuses": 0.0, "active_hours": 1.5 },
  "this_month": { "deliveries": 3, "gross_earnings": 38.12, "base_pay": 21.12, "tips": 17.0, "bonuses": 0.0, "active_hours": 1.5 },
  "ratings": { "average": 4.9, "overall": 4.9, "total_ratings": 155, "on_time_percentage": 95 },
  "tax_info": { "ytd_earnings": 457.44, "estimated_tax": 68.62 },
  "platform_fees_paid": { "today": 0.0, "this_week": 3.0, "this_month": 3.0 },
  "payment_methods": { "instant_pay_available": true, "bank_account_linked": true }
}
```

### Documents Status

| Document Type | Status |
|---------------|--------|
| drivers_license | ✅ verified |
| insurance | ✅ verified |
| background_check | ✅ verified |

---

## TestFlight Testing Verification

**Last Tested**: February 3, 2026 @ 8:08 PM PST

### Build Availability on App Store Connect

| App | Build | TestFlight Status |
|-----|-------|-------------------|
| Dollor (Customer) | 1037 | ✅ Available for Testing |
| Dollor Driver | 114 | ✅ Available for Testing |
| Dollor Restaurant | 113 | ✅ Available for Testing |

### Demo Accounts (For App Store Review)

| App | Email | Password | Login Status |
|-----|-------|----------|--------------|
| **Customer** | demo.customer@dollor.ai | DemoCustomer2025! | ✅ Verified |
| **Driver** | demo.driver@dollor.ai | DemoDriver2025! | ✅ Verified |
| **Restaurant** | demo.restaurant@dollor.ai | DemoRestaurant2025! | ✅ Verified |

### API Verification Results

| Test | Result | Details |
|------|--------|---------|
| Health Check | ✅ Pass | API v1.0.5 healthy, DB connected |
| Vendor List | ✅ Pass | 91 restaurants returned |
| Vendor Menu | ✅ Pass | Menu items loaded |
| Order Tracking | ✅ Pass | Driver photo/vehicle included |
| Driver Profile | ✅ Pass | Name, rating, photo, vehicle |
| Driver Documents | ✅ Pass | 3/3 verified |
| Driver Earnings | ✅ Pass | iOS-compatible format |
| Driver Status | ✅ Pass | Online status, location |
| Vendor Orders | ✅ Pass | 76 orders, driver info included |
| Customer Login | ✅ Pass | Token received, ID: 74 |
| Driver Login | ✅ Pass | Token received, ID: 48 |
| Vendor Login | ✅ Pass | Token received, ID: 40 |

### Manual Testing Checklist

**Customer App:**
- [ ] Login with demo.customer@dollor.ai
- [ ] Browse restaurant list (91 restaurants)
- [ ] View menu items
- [ ] Add items to cart
- [ ] Complete checkout with payment
- [ ] Track order (verify driver photo/vehicle visible)
- [ ] Rate driver after delivery

**Driver App:**
- [ ] Login with demo.driver@dollor.ai
- [ ] View earnings dashboard (today/week/month breakdown)
- [ ] Verify $38.12 earnings this week
- [ ] View documents status (3/3 verified)
- [ ] Toggle online/offline status
- [ ] View available delivery orders
- [ ] Accept a delivery order
- [ ] Navigate to restaurant pickup
- [ ] Mark order as picked up
- [ ] Navigate to customer delivery
- [ ] Mark order as delivered

**Restaurant App:**
- [ ] Login with demo.restaurant@dollor.ai
- [ ] View incoming orders
- [ ] Accept order (move to preparing)
- [ ] Mark order ready for pickup
- [ ] View assigned driver details (photo, vehicle, phone)
- [ ] Confirm driver pickup

---

## App Store Connect Configuration

| Setting | Value |
|---------|-------|
| **Team ID** | `PRKZ4UVCD7` |
| **API Key ID** | `9K626GB728` |
| **Issuer ID** | `80d10e49-f379-462f-9668-5ea53016812e` |
| **API Key File** | `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8` |
| **API Key JSON** | `~/.appstoreconnect/private_keys/api_key.json` |

### API Key JSON Format
```json
{
  "key_id": "9K626GB728",
  "issuer_id": "80d10e49-f379-462f-9668-5ea53016812e",
  "key": "-----BEGIN PRIVATE KEY-----\n...(key content)...\n-----END PRIVATE KEY-----\n",
  "in_house": false
}
```

---

## App Locations

| App | Directory | Workspace | Scheme |
|-----|-----------|-----------|--------|
| **Customer** | `apps/ios/customer/` | `eatfaircustomer.xcworkspace` | `eatfaircustomer` |
| **Driver** | `apps/ios/delivery/` | `eatffairdelivery.xcworkspace` | `eatffairdelivery` |
| **Restaurant** | `apps/ios/restaurant/` | `eatffairrestaurant.xcworkspace` | `eatffairrestaurant` |

---

## Build & Upload Commands

### Step 1: Bump Build Numbers
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios

# Check current
grep "CURRENT_PROJECT_VERSION" customer/eatfaircustomer.xcodeproj/project.pbxproj | head -1
grep "CURRENT_PROJECT_VERSION" delivery/eatffairdelivery.xcodeproj/project.pbxproj | head -1
grep "CURRENT_PROJECT_VERSION" restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | head -1
```

### Step 2: Install Dependencies
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer && pod install
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery && pod install
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant && pod install
```

### Step 3: Archive All Apps
```bash
# Customer
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace -scheme eatfaircustomer -configuration Release -archivePath build/DollorCustomer.xcarchive archive -allowProvisioningUpdates

# Driver
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
xcodebuild -workspace eatffairdelivery.xcworkspace -scheme eatffairdelivery -configuration Release -archivePath build/DollorDriver.xcarchive archive -allowProvisioningUpdates

# Restaurant
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
xcodebuild -workspace eatffairrestaurant.xcworkspace -scheme eatffairrestaurant -configuration Release -archivePath build/DollorRestaurant.xcarchive archive -allowProvisioningUpdates
```

### Step 4: Export IPAs
```bash
# Customer
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
xcodebuild -exportArchive -archivePath build/DollorCustomer.xcarchive -exportPath build/export -exportOptionsPlist ExportOptionsLocal.plist

# Driver
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
xcodebuild -exportArchive -archivePath build/DollorDriver.xcarchive -exportPath build/export -exportOptionsPlist ../customer/ExportOptionsLocal.plist

# Restaurant
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
xcodebuild -exportArchive -archivePath build/DollorRestaurant.xcarchive -exportPath build/export -exportOptionsPlist ../customer/ExportOptionsLocal.plist
```

### Step 5: Upload to TestFlight

**IMPORTANT:** Use absolute paths to avoid "file not found" errors.

```bash
# Customer
fastlane run upload_to_testflight \
  ipa:/Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer/build/export/Dollor.ipa \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true

# Driver
fastlane run upload_to_testflight \
  ipa:"/Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/build/export/Dollor Driver.ipa" \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true

# Restaurant
fastlane run upload_to_testflight \
  ipa:/Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant/build/export/eatffairrestaurant.ipa \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Could not find ipa file at path" | Use absolute paths for IPA files |
| "Unable to find module dependency: GoogleMaps" | Use `.xcworkspace` not `.xcodeproj` |
| "Couldn't find app on the account" | Check `api_key.json` credentials |
| "API key JSON is missing field: key" | JSON must contain actual key content |
| "Build number already used" | Increment `CURRENT_PROJECT_VERSION` |
| Driver earnings showing $0 | Backend fixed in v1.0.8 - redeploy if needed |
| Rate driver returns 404 | Use `/api/customer/orders/` not `/api/orders/` |

---

## Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **API Contract** | `API_CONTRACT.md` | Endpoint specifications, status values |
| **Deployment Guide** | `DEPLOYMENT.md` | Backend deployment procedures |
| **Session Handoffs** | `apps/ios/SESSION_HANDOFF_*.md` | Previous session context |

---

## Session Handoff Prompt

Copy this prompt to continue in a new session:

```
Continuing Dollor.ai iOS development.

## Current State (February 3, 2026)

### Build Numbers (Uploaded to TestFlight)
- Customer: 1037 (Bundle: com.dollorai.customer)
- Driver: 114 (Bundle: com.dollorai.delivery)
- Restaurant: 113 (Bundle: com.dollorai.restaurant)

### Backend Status
- API Version: 1.0.9 (Contract)
- Backend Version: 1.0.5
- Staging: https://d3kuu45w6kl8hr.cloudfront.net (healthy)
- Production: https://api.dollor.ai (healthy)

### Recent Fixes Applied
1. Driver earnings dashboard - iOS-compatible format (today/this_week/this_month)
2. Rate driver endpoint - fixed URL: /api/customer/orders/{id}/rate-driver
3. Order acceptance - optimistic update for instant UI feedback
4. Driver photo & vehicle details - verified pass-through to Customer/Restaurant apps

### APIs Verified (All Pass)
- Driver Profile, Documents, Earnings, Status
- Order Tracking with driver photo/vehicle
- Restaurant view with driver details

### Key Files
- API Contract: API_CONTRACT.md (v1.0.8)
- Deployment: DEPLOYMENT.md
- Build Guide: apps/ios/TESTFLIGHT_BUILD_GUIDE.md

### App Store Connect
- Team ID: PRKZ4UVCD7
- API Key ID: 9K626GB728
- Issuer ID: 80d10e49-f379-462f-9668-5ea53016812e

### Commands to Verify
```bash
# Check API health
curl https://api.dollor.ai/health

# Check driver dashboard format
curl https://api.dollor.ai/api/v5/driver/48/dashboard | python3 -m json.tool

# Check git status
git log --oneline -5
```

### Next Actions
[Describe what you want to do next]
```

---

## Quick Verification Commands

```bash
# Verify all systems before building
echo "=== API Status ===" && \
curl -s https://api.dollor.ai/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Production: {d[\"status\"]} v{d[\"version\"]}')" && \
curl -s https://d3kuu45w6kl8hr.cloudfront.net/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Staging: {d[\"status\"]} v{d[\"version\"]}')" && \
echo "" && \
echo "=== Build Versions ===" && \
grep "CURRENT_PROJECT_VERSION" /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | head -1 | awk '{print "Customer: "$3}' && \
grep "CURRENT_PROJECT_VERSION" /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | head -1 | awk '{print "Driver: "$3}' && \
grep "CURRENT_PROJECT_VERSION" /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | head -1 | awk '{print "Restaurant: "$3}'
```

---

*Generated by Claude Code - Dollor.ai AI Employee*
