---
phase: quick-137
plan: 137
subsystem: backend, android, docs
tags: [s3, apscheduler, delivery-proof, camera, android-partner, notifications, privacy]

# Dependency graph
requires:
  - phase: quick-127
    provides: self-delivery flow improvements
provides:
  - S3 delivery photo 12-hour cleanup job (hourly APScheduler)
  - Android Partner delivery proof camera sheet for self-delivery
  - Delivery notification audit report for self-delivery flow
affects: [android-builds, backend-deploy, self-delivery-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "APScheduler cleanup job pattern: sync def, SessionLocal(), asyncio.run() for async S3 calls"
    - "Partner delivery proof: camera via FileProvider + TakePicture contract, vendor auth token for upload"

key-files:
  created:
    - partner/src/main/java/ai/dollor/partner/ui/orders/DeliveryProofSheet.kt
    - partner/src/main/res/xml/file_paths.xml
    - .planning/quick/137-s3-photo-12h-retention-android-partner-d/137-DELIVERY-NOTIFICATION-AUDIT.md
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
    - partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt
    - partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
    - partner/src/main/AndroidManifest.xml
    - shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt

key-decisions:
  - "Used asyncio.run() to call async S3 delete_file from sync BackgroundScheduler job"
  - "Added FileProvider to partner AndroidManifest (was missing) for camera temp file access"
  - "Wired delivery proof into both OrdersScreen and OrderDetailsScreen for consistent UX"

patterns-established:
  - "Vendor photo upload: uploadDeliveryPhotoAsVendor uses SecureStorage.UserType.VENDOR token"

requirements-completed: [QUICK-137]

# Metrics
duration: 72min
completed: 2026-03-10
---

# Quick Task 137: S3 Photo 12h Retention + Android Partner Delivery Proof + Notification Audit

**Hourly S3 cleanup job for delivery photos >12h, Partner app delivery proof camera gate for self-delivery, and complete notification audit identifying 5 gaps in self-delivery flow**

## Performance

- **Duration:** 72 min
- **Started:** 2026-03-10T16:56:56Z
- **Completed:** 2026-03-10T18:08:56Z
- **Tasks:** 3
- **Files modified:** 9 (1 backend, 7 Android, 1 docs)

## Accomplishments
- Hourly APScheduler job deletes S3 delivery proof photos older than 12 hours, nullifies `delivery_photo_url` but preserves `delivery_photo_uploaded_at` for audit trail
- Android Partner app now requires delivery proof photo before marking self-delivery orders as delivered (camera sheet, vendor auth upload, then status update)
- Notification audit identified 5 gaps in self-delivery flow, with GAP-3 (no "out for delivery" push) being highest priority

## Task Commits

Each task was committed atomically:

1. **Task 1: S3 delivery photo 12-hour cleanup job** - `4454dd6b` (feat)
2. **Task 2: Android Partner delivery proof photo** - `8a66cdba` (feat, Android repo)
3. **Task 3: Delivery notification audit** - `8df3794a` (docs)

## Files Created/Modified
- `apps/web/p2p-platform/backend/order_flow.py` - Added `cleanup_expired_delivery_photos` function + scheduler registration
- `partner/.../DeliveryProofSheet.kt` - New bottom sheet UI for delivery proof capture (ported from driver app)
- `partner/.../OrdersViewModel.kt` - Added photo state, `showDeliveryProofSheet`, `submitDeliveryProof` methods
- `partner/.../OrderDetailsScreen.kt` - Added camera launcher, delivery proof gate for "delivered" status
- `partner/.../OrdersScreen.kt` - Added camera launcher, `DeliveryProofSheet` composable
- `partner/src/main/AndroidManifest.xml` - Added FileProvider for camera temp files
- `partner/src/main/res/xml/file_paths.xml` - Created cache path for delivery_proofs
- `shared/.../DollorRepository.kt` - Added `uploadDeliveryPhotoAsVendor` with VENDOR auth token
- `.planning/quick/137-*/137-DELIVERY-NOTIFICATION-AUDIT.md` - Complete notification audit

## Decisions Made
- Used `asyncio.run()` for async S3 delete from sync BackgroundScheduler job (simpler than refactoring s3_service to sync)
- Added FileProvider to partner manifest (was missing -- required for camera `TakePicture` contract)
- Wired delivery proof into both OrdersScreen (card button) and OrderDetailsScreen (status button) for consistent experience
- Partner app `markDelivered()` now delegates to `showDeliveryProofSheet()` to gate through photo capture

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added FileProvider to partner AndroidManifest**
- **Found during:** Task 2 (Android Partner delivery proof)
- **Issue:** Partner app had no FileProvider configured, required for camera temp files
- **Fix:** Added `<provider>` block to AndroidManifest.xml + created `file_paths.xml` resource
- **Files modified:** `partner/src/main/AndroidManifest.xml`, `partner/src/main/res/xml/file_paths.xml`
- **Verification:** `./gradlew :partner:compileDebugKotlin` BUILD SUCCESSFUL
- **Committed in:** 8a66cdba (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added delivery proof to OrderDetailsScreen**
- **Found during:** Task 2 (Android Partner delivery proof)
- **Issue:** Plan mentioned OrderDetailsScreen but the "Mark as Delivered" button there also needed the proof gate
- **Fix:** Added camera launcher, photo state, proof methods to OrderDetailsViewModel, and DeliveryProofSheet to OrderDetailsScreen
- **Files modified:** `partner/.../OrderDetailsScreen.kt`
- **Verification:** `./gradlew :partner:compileDebugKotlin` BUILD SUCCESSFUL
- **Committed in:** 8a66cdba (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes required for the feature to work correctly. No scope creep.

## Issues Encountered
- Backend pytest requires JWT_SECRET_KEY and DATABASE_URL env vars (pre-existing). All 1490 tests passed with env vars set.
- CR ticket creation failed (ADMIN_SECRET_KEY not available locally). Logged warning and continued per skill rules.

## User Setup Required
None - no external service configuration required.

## Next Steps
- Deploy backend to staging/production for the S3 cleanup job to start running
- Build and distribute Android Partner APK for delivery proof feature
- Consider fixing GAP-3 (add "out for delivery" push notification to `update_order_status`)

---
*Quick Task: 137*
*Completed: 2026-03-10*
