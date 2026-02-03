# Dollor.ai iOS TestFlight Build Guide

> **Last Updated**: February 3, 2026
> **API Contract Version**: 1.0.8
> **Backend Version**: 1.0.5

---

## Current Build Numbers

| App | Bundle ID | Build | Version | Status |
|-----|-----------|-------|---------|--------|
| **Dollor (Customer)** | `com.dollorai.customer` | 1035 | 1.0 | Ready for TestFlight |
| **Dollor Driver** | `com.dollorai.delivery` | 111 | 1.0 | Ready for TestFlight |
| **Dollor Restaurant** | `com.dollorai.restaurant` | 111 | 1.0 | Ready for TestFlight |

---

## Recent Fixes (This Session)

| Issue | Fix | Commit |
|-------|-----|--------|
| Driver earnings showing $0 | Fixed backend response structure (today/this_week/this_month) | `33131dff` |
| Rate driver 404 error | Fixed endpoint URL: `/api/customer/orders/{id}/rate-driver` | `b65d4760` |
| "No Active Delivery" after accept | Added optimistic update in DriverViewModel | `198d9ad1` |

---

## API Endpoints Verified (Production)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /health` | ✅ 200 | Version 1.0.5, DB connected |
| `GET /api/vendors` | ✅ 200 | Returns vendor list |
| `GET /api/v5/driver/{id}/dashboard` | ✅ 200 | iOS-compatible format |
| `POST /api/customer/orders/{id}/rate-driver` | ✅ 401 | Requires auth (correct) |
| `POST /api/customer/orders/{id}/rate-restaurant` | ✅ 401 | Requires auth (correct) |

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

### Build Numbers
- Customer: 1035 (Bundle: com.dollorai.customer)
- Driver: 111 (Bundle: com.dollorai.delivery)
- Restaurant: 111 (Bundle: com.dollorai.restaurant)

### Backend Status
- API Version: 1.0.8 (Contract)
- Backend Version: 1.0.5
- Staging: https://d3kuu45w6kl8hr.cloudfront.net (healthy)
- Production: https://api.dollor.ai (healthy)

### Recent Fixes Applied
1. Driver earnings dashboard - now returns iOS-compatible format (today/this_week/this_month)
2. Rate driver endpoint - fixed URL from /api/orders/ to /api/customer/orders/
3. Order acceptance - added optimistic update for instant UI feedback

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
