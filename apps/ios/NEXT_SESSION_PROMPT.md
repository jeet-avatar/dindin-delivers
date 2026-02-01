# Next Session Prompt - Build 61

Copy and paste this into your next Claude Code session:

---

## Session Start Command

```
/gsd:resume-work
```

If that doesn't work or you're starting fresh, use:

```
/gsd:progress
```

---

## Context for New Session

**Previous Build:** 60 - Ride Tracking Fix, Document Upload Removal
**Current Build:** 61

### What Was Deployed in Build 60

1. **Critical Fix: Ride Tracking API Returns Real Driver Details**
   - `/api/rides/{ride_id}/track` was returning hardcoded "John D." and "Toyota Camry - ABC 123"
   - Now queries real RideRequest and Driver from database
   - Returns both iOS flat fields AND Android nested driver object for cross-platform support
   - File: `main_new.py` (lines ~12353-12473)
   ```python
   # Response includes:
   driver_name, driver_phone, driver_photo_url, driver_rating,
   driver_vehicle, driver_vehicle_color, driver_license_plate
   # Plus nested "driver" object for Android
   ```

2. **iOS Customer App - Driver Details Display**
   - Added `driverPhotoUrl` and `driverRating` to RideTrackingInfo struct
   - RideRequestView shows driver photo (AsyncImage), rating (star icon), vehicle info
   - File: `P2PAPIService.swift` (RideTrackingInfo struct)
   - File: `RideRequestView.swift` (lines ~1458-1526)

3. **Document Upload Removed from iOS Apps (Web Portal Only)**
   - **Restaurant App:** RestaurantSettingsView replaced NavigationLink with "Go to Admin Portal" button
   - **Driver App:** VehiclePhotoUploadView removed from DriverProfileView
   - Approval workflow now happens exclusively via web portal

4. **Document Upload Removed from Android Apps (Web Portal Only)**
   - **Driver App:** DocumentsScreen.kt updated with web portal info and redirect button
   - **Restaurant App:** RestaurantDocumentsScreen.kt updated with web portal info
   - Both apps show document status but upload via web only

5. **Bug Fix: RateRestaurantView.swift**
   - Line 242 had error: "initializer for conditional binding must have Optional type"
   - Fixed: `guard let restaurantId = Int(order.restaurant.id)` (id is String, not Optional)

### Git Status (All Pushed)

iOS Repo (eatfair-ios):
- Branch: main (up to date with origin/main)
- Key commits: `4e77c7f7`, `d8ac47d1`, `e490773b`, `db113140`

Android Repo (eatfair-android):
- Branch: main
- Key commit: `7974661b`

Backend: Auto-deployed to production via GitHub Actions

---

## Build 60 TestFlight Status

**Uploaded via Xcode Organizer** (fastlane MATCH_PASSWORD issue bypassed):

| App | Build | Status |
|-----|-------|--------|
| Customer | 1008 | Uploading to TestFlight |
| Restaurant | 69 | Ready to upload |
| Driver | 60 | Ready to upload (bumped from 5) |

All using Team **PRKZ4UVCD7** with automatic signing.

### Play Store Build (Android)
```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Build production AAB for Play Store
./gradlew :app:bundleProductionRelease        # Customer AAB
./gradlew :orderapp:assembleProductionRelease # Driver APK
./gradlew :partner:assembleProductionRelease  # Restaurant APK
```

---

## Build 61 Priority: Driver Document Email Upload (Web Portal)

**Feature Request:** Allow drivers to upload documents via mobile when they don't have files on computer.

### Flow:
1. Driver logs into web portal on computer
2. Click "Send upload link to my email/phone"
3. Backend generates secure temporary upload link
4. Email/SMS sent with link to driver's registered email/phone
5. Driver opens link on mobile → Camera + Gallery upload options
6. Takes photo or uploads from gallery
7. Document syncs back to web portal
8. Driver continues onboarding on web

### Requirements:
- **Backend:**
  - `POST /api/drivers/{id}/send-document-link` - Generate secure temp link, send email/SMS
  - `POST /api/drivers/upload-mobile/{token}` - Mobile upload endpoint with token validation
  - Document type validation (only accept valid document types)
- **Mobile Web Page:**
  - Camera access via HTML5 `<input type="file" capture="camera">`
  - File upload from gallery
  - Show upload progress
  - Sync status confirmation
- **Web Portal:**
  - "Send to my phone" button
  - Real-time sync status
  - Refresh when document uploaded

---

## Other Build 61 Tasks

### Option A: Complete TestFlight Upload
```
/gsd:quick

Task: Upload iOS apps to TestFlight
1. Fix MATCH_PASSWORD or use Xcode Organizer
2. Export and upload Customer app
3. Export and upload Driver app
4. Export and upload Restaurant app
5. Verify all 3 apps available in TestFlight
```

### Option B: Play Store Build & Upload
```
/gsd:quick

Task: Build and upload Android apps to Play Store
1. Build production AABs for all 3 apps
2. Upload to Play Console
3. Submit for review
```

### Option C: End-to-End Rideshare Test
```
/gsd:quick

Task: Test complete rideshare flow with real driver details
1. Customer requests ride
2. Driver accepts ride
3. Verify customer sees real driver: name, photo, rating, vehicle, plate
4. Test call button functionality
5. Complete ride and verify rating flow
```

### Option D: Food Delivery Driver Details
```
/gsd:plan-phase

Phase: Verify food delivery shows driver details to customer
Goal: When driver accepts food order, customer sees driver info

Check:
1. Does customer app show driver photo, name, vehicle when order accepted?
2. Does restaurant app show driver info?
3. Is the push notification payload correct?
```

---

## Key Files Modified in Build 60

| File | Changes |
|------|---------|
| `main_new.py` (~12353-12473) | Fixed `/api/rides/{ride_id}/track` to return real driver data |
| `P2PAPIService.swift` (RideTrackingInfo) | Added `driverPhotoUrl`, `driverRating` |
| `RideRequestView.swift` (~1458-1526) | AsyncImage for driver photo, star rating display |
| `RestaurantSettingsView.swift` (~270-291) | Replaced document upload with web portal link |
| `DriverProfileView.swift` (~557) | Removed VehiclePhotoUploadView |
| `RateRestaurantView.swift` (line 242) | Fixed optional binding error |
| `DocumentsScreen.kt` (Android driver) | Added web portal redirect, disabled upload |
| `RestaurantDocumentsScreen.kt` (Android partner) | Added web portal redirect, disabled upload |

---

## API Response Format (Ride Tracking)

The `/api/rides/{ride_id}/track` endpoint now returns:

```json
{
  "ride_id": 123,
  "status": "driver_assigned",
  "driver_name": "John Smith",
  "driver_phone": "+1234567890",
  "driver_photo_url": "https://...",
  "driver_rating": 4.8,
  "driver_vehicle": "Toyota Camry",
  "driver_vehicle_color": "Silver",
  "driver_license_plate": "ABC123",
  "pickup_location": {...},
  "dropoff_location": {...},
  "driver": {
    "id": 1,
    "name": "John Smith",
    "phone": "+1234567890",
    "photo_url": "https://...",
    "rating": 4.8,
    "vehicle": "Toyota Camry",
    "vehicle_color": "Silver",
    "license_plate": "ABC123"
  }
}
```

Note: Both flat fields (iOS) and nested `driver` object (Android) are included for cross-platform compatibility.

---

## Deployment Notes

**Production API:** https://api.dollor.ai
**Branch:** main

All code changes pushed to main trigger auto-deployment via GitHub Actions.

```bash
# Verify deployment
curl https://api.dollor.ai/api/health

# Check ride tracking (example)
curl https://api.dollor.ai/api/rides/123/track
```

---

## Environment

- **Production API:** https://api.dollor.ai
- **Admin Portal:** https://admin.dollor.ai
- **Branch:** main
- **iOS Archive:** Ready for export/upload
- **Android:** Needs production build

---

*Generated: January 31, 2026*
*Build 60 Complete → Ready for Build 61*
