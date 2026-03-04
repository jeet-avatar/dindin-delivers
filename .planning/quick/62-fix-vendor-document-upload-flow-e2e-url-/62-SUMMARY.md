---
phase: quick-62
plan: 1
subsystem: ui
tags: [ios, android, react, vendor-documents, camera-capture, mobile]

# Dependency graph
requires:
  - phase: quick-55
    provides: "www.dollor.ai canonical domain convention"
provides:
  - "iOS vendor document URL constant (AppConstants.vendorDocumentsURL)"
  - "Android vendor document URL pointing to www.dollor.ai/vendor/documents"
  - "Web camera capture for mobile document photography"
affects: [vendor-onboarding, document-upload, restaurant-app]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HTML5 capture='environment' for mobile rear camera on file inputs"
    - "Hidden input + ref pattern for triggering camera from custom button"

key-files:
  created: []
  modified:
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
    - "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
    - "partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt (Android repo)"
    - "apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx"

key-decisions:
  - "Use www.dollor.ai/vendor/documents for both iOS and Android (canonical domain per quick-55)"
  - "Keep both Upload Document and Take Photo buttons for desktop+mobile compatibility"

patterns-established:
  - "vendorDocumentsURL constant in AppConstants for future vendor portal links"
  - "Hidden camera input + useRef pattern for mobile camera capture in React"

requirements-completed: [Q62-01, Q62-02, Q62-03]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Quick-62: Fix Vendor Document Upload Flow Summary

**iOS and Android restaurant apps now link to www.dollor.ai/vendor/documents (not admin portal), with camera capture support on web for mobile document photography**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T04:23:53Z
- **Completed:** 2026-03-04T04:26:39Z
- **Tasks:** 3
- **Files modified:** 4 (across 2 repos)

## Accomplishments
- iOS restaurant app Settings > Documents button now opens vendor document portal (not admin portal)
- Android partner app "Upload Documents on Web" button now opens www.dollor.ai/vendor/documents (not admin.dollor.ai)
- Web vendor document upload page has both file picker and camera capture buttons for mobile browser document photography
- Backend vendor document endpoints verified functional (7 endpoint functions, all DB columns present, upload directory active with 1775+ files)
- Admin document review route confirmed at /admin/document-review

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix iOS and Android URLs** - `3a4d4992` (fix, iOS repo) + `b1e3ff65` (fix, Android repo)
2. **Task 2: Add camera capture to web** - `de71154f` (feat)
3. **Task 3: Verify backend endpoints** - No commit (verification-only, no code changes)

## Files Created/Modified
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` - Added vendorDocumentsURL constant
- `apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift` - Changed Link from adminPanelURL to vendorDocumentsURL, updated button label
- `partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt` (Android repo) - Changed URL from admin.dollor.ai to www.dollor.ai/vendor/documents
- `apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx` - Added CameraOutlined import, camera input ref, cameraDocType state, handleCameraCapture function, Take Photo button, .webp in accept

## Decisions Made
- Used www.dollor.ai/vendor/documents (canonical domain per quick-55 convention) for both iOS and Android
- Kept both "Upload Document" (file picker) and "Take Photo" (camera) buttons to support both desktop and mobile workflows
- Updated iOS button label from "Go to Admin Portal" to "Upload Documents" for clarity
- Added .webp to accepted file formats for modern mobile photo format support

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Steps
- Build and distribute updated iOS restaurant app via TestFlight
- Build and distribute updated Android partner app via Firebase
- Deploy frontend to staging for camera capture testing on mobile browsers

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: quick-62*
*Completed: 2026-03-04*
