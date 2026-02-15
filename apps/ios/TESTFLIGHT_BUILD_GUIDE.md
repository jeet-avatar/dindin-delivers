# Dollor.ai iOS TestFlight Build Guide

> **Last Updated**: February 13, 2026
> **API Contract Version**: 1.0.14
> **Backend Version**: 1.0.18

---

## Current Build Numbers

| App | Bundle ID | Build | Version | Status |
|-----|-----------|-------|---------|--------|
| **Dollor (Customer)** | `com.dollorai.customer` | 1071 | 1.0 | ✅ On TestFlight |
| **Dollor Driver** | `com.dollorai.delivery` | 180 | 1.0 | ✅ On TestFlight |
| **Dollor Restaurant** | `com.dollorai.restaurant` | 154 | 1.0 | ✅ On TestFlight |

---

## Recent Fixes (This Session)

| Issue | Fix | Commit |
|-------|-----|--------|
| **Earnings statement showing $0** | EarningsPaymentSection now uses EarningsViewModel (P2P Dashboard API) instead of hardcoded zeros from profile | Build 178 |
| **P2P Ride Flow Audit** | Complete flow verified between Customer ↔ Driver apps | Build 1067/175 |
| Push notifications missing for ride events | Added bid accepted, ride started, ride completed notifications | `037fc4a2` |
| Backend accept-counter missing null check | Added HTTPException 404, fixed original_price bug | `1a41d8ba` |
| Rating/tip submission ignoring API result | Added proper error handling with switch on result | `1a41d8ba` |
| Driver app hardcoded 1s loading delay | Replaced with ProgressView + disabled state | `1a41d8ba` |
| Driver app missing onDisappear | Added stopRefreshTimer() to prevent battery drain | `1a41d8ba` |
| Driver app missing failure detection | Added connection warning after 3 poll failures | `19f5c7b9` |
| Driver misses customer counter-offers | Added auto-show counter-offer sheet on new counters | `19f5c7b9` |
| WebSocket errors using print() | Changed to logger.error() for proper logging | `6f4ed24d` |
| Missing API methods | Added cancelRideRequest, getCustomerRideRequests, updateBid | `6f4ed24d` |
| Driver app blank screen on order detail tap | Fixed race condition using `.sheet(item:)` binding instead of `.sheet(isPresented:)` with separate state | Build 173 `3ced8d48` |
| Error messages not user-friendly (54%) | Converted 53 raw error.localizedDescription to smart user-friendly messages (100% compliance) | Build 1063/171/143 |
| Customer not notified of bids | Backend v1.0.15 sends push notification when driver bids | Build 168 |
| FareNegotiationSheet white flash | Use .presentationBackground() for immediate background | Build 168 |
| "Failed to submit offer" decode error | Backend v1.0.14 returns required platform_fee_driver/customer fields | Build 167 |
| ActiveDeliveryFullScreen wrong destination | Made view status-aware: shows "Picking up from" + restaurant for pickup phase, "Delivering to" + customer for delivery phase | Build 165 |
| Driver bid blocking unclear | Smart alert detection for "active ride" / "active delivery" with navigation button | `7c273e7a` |
| Logger not in scope errors | Added proper Logger imports across Driver and Restaurant apps | `7c273e7a` |
| P2P bids not persisted | Bids now saved to ride_bids table in database | `251cd524` |
| Customer can't see driver bids | Added bid polling UI, DriverBidsSheet, bid accept/reject | `1aac7996` |
| Driver details not shown | Added AcceptedDriver details section (photo, name, rating, vehicle, ETA, plate) | `1aac7996` |
| Compilation errors | Fixed requestId -> rideId, added AcceptedDriverInfo initializer | `0d42c30f` |
| Delivery buttons showing twice | Split status handling: `pending_delivery_decision` vs `ready_for_pickup` | `dc37ee73` |
| Driver photo missing | Added `vehicle_photo_url` column, demo driver profile with photos | `dc37ee73` |
| Driver rating error | Fixed `accept_delivery` using `driver.rating` (was `driver.average_rating`) | `dc37ee73` |
| Driver earnings showing $0 | Fixed backend response structure (today/this_week/this_month) | `33131dff` |
| Driver earnings still $0 after fix | Changed fetchTodayCompleted() to use dashboard API instead of /active orders | Build 162 |
| Wrong destination shown after accept | Backend fix: Keep status ready_for_pickup until pickup, iOS shows "Heading to Restaurant" correctly | Build 163 |
| Rate driver 404 error | Fixed endpoint URL: `/api/customer/orders/{id}/rate-driver` | `b65d4760` |
| "No Active Delivery" after accept | Added optimistic update in DriverViewModel | `198d9ad1` |
| "Confirming..." stuck on swipe | Fixed SwipeToConfirmButton to reset state when loading completes | Build 123 |
| Debug logging for order flow | Added detailed logging to acceptDeliveryOrder and markOrderPickedUp | Build 123 |
| Order number not visible | Added order number display to Customer OrderCard, Driver OrderCard, OrderDetailSheet, PendingDeliveryCard | Build 134 |
| Build errors in shared code | Fixed self-reference issues in P2PAPIService, added missing logger imports | Build 134 |
| Rideshare bid response format | Fixed backend bid endpoints to return proper RideBidResponse model | `6e679ba0` |
| Ride requests not persisted | Added RideRequest database insert for driver bidding | `7ceac8b4` |
| Driver active-order 404 | Added /api/drivers/{id}/active-order endpoint alias | `04f39eb0` |
| QA safety net | Added pre-deployment critical API validation to qa-runner.sh | `04f39eb0` |

---

## API Endpoints Verified (Production)

**Last Verified**: February 11, 2026

### Core APIs

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /health` | ✅ 200 | Version 1.0.18, DB connected |
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

**Last Tested**: February 14, 2026

### Build Availability on App Store Connect

| App | Build | TestFlight Status |
|-----|-------|-------------------|
| Dollor (Customer) | 1071 | ✅ Uploaded (2026-02-14 20:10 PST) |
| Dollor Driver | 180 | ✅ Uploaded (2026-02-14 20:10 PST) |
| Dollor Restaurant | 154 | ✅ Uploaded (2026-02-14 20:20 PST) |

### Demo Accounts (For App Store Review)

| App | Email | Password | Login Status |
|-----|-------|----------|--------------|
| **Customer** | demo.customer@dollor.ai | DemoCustomer2025! | ✅ Verified |
| **Driver** | demo.driver@dollor.ai | DemoDriver2025! | ✅ Verified |
| **Restaurant** | demo.restaurant@dollor.ai | DemoRestaurant2025! | ✅ Verified |

### API Verification Results

| Test | Result | Details |
|------|--------|---------|
| Health Check | ✅ Pass | API v1.0.18 healthy, DB connected |
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

> **CRITICAL**: Always use `cd` to change to the app directory BEFORE running xcodebuild.
> Restaurant builds will fail if run from the wrong directory because workspace paths are relative.

```bash
# Customer
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer && \
xcodebuild -workspace eatfaircustomer.xcworkspace -scheme eatfaircustomer -configuration Release -archivePath build/DollorCustomer.xcarchive archive -allowProvisioningUpdates

# Driver
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery && \
xcodebuild -workspace eatffairdelivery.xcworkspace -scheme eatffairdelivery -configuration Release -archivePath build/DollorDriver.xcarchive archive -allowProvisioningUpdates

# Restaurant (MUST cd first - fails otherwise!)
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant && \
xcodebuild -workspace eatffairrestaurant.xcworkspace -scheme eatffairrestaurant -configuration Release -archivePath build/DollorRestaurant.xcarchive archive -allowProvisioningUpdates
```

### Step 4: Export IPAs

> **CRITICAL**: Same as archive - always use `cd &&` to change directory first!

```bash
# Customer
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer && \
xcodebuild -exportArchive -archivePath build/DollorCustomer.xcarchive -exportPath build/export -exportOptionsPlist ExportOptionsLocal.plist

# Driver
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery && \
xcodebuild -exportArchive -archivePath build/DollorDriver.xcarchive -exportPath build/export -exportOptionsPlist ../customer/ExportOptionsLocal.plist

# Restaurant (MUST cd first!)
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant && \
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
| **Restaurant archive/export fails first time** | **ALWAYS use `cd` to change to app directory before running xcodebuild** - Restaurant builds fail if run from wrong directory because workspace path is relative. Example: `cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant && xcodebuild ...` |
| "Dollor Driver.ipa" upload fails | Wrap path in quotes: `ipa:"/path/Dollor Driver.ipa"` - quotes handle spaces correctly |

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

## Current State (February 13, 2026)

### Build Numbers (Uploaded to TestFlight)
- Customer: 1070 (Bundle: com.dollorai.customer)
- Driver: 179 (Bundle: com.dollorai.delivery)
- Restaurant: 151 (Bundle: com.dollorai.restaurant)

### Backend Status
- API Contract Version: 1.0.14
- Backend Version: 1.0.18
- Staging: https://d3kuu45w6kl8hr.cloudfront.net (healthy)
- Production: https://api.dollor.ai (healthy)

### Recent Fixes Applied
1. Driver app blank screen on order detail tap - fixed race condition using .sheet(item:)
2. Error messages made user-friendly (100% compliance - 53 patterns fixed)
3. P2P rideshare bidding flow complete (bid polling, accept/reject, driver details)
4. Push notifications for driver bids

### Key Files
- Build Guide: apps/ios/TESTFLIGHT_BUILD_GUIDE.md
- API Contract: API_CONTRACT.md (v1.0.14)
- Deployment: DEPLOYMENT.md

### App Store Connect
- Team ID: PRKZ4UVCD7
- API Key ID: 9K626GB728
- Issuer ID: 80d10e49-f379-462f-9668-5ea53016812e

### Commands to Verify
```bash
# Check API health
curl https://api.dollor.ai/health

# Check build versions
grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | head -1
grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | head -1
grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | head -1

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
