---
phase: quick-156
plan: 1
subsystem: ios-restaurant, backend
tags: [bugfix, deploy, testflight, investigation]
dependency_graph:
  requires: []
  provides: [business-hours-fix, promotion-edit-fix, delivery-photo-investigation]
  affects: [ios-restaurant-app, backend-api]
tech_stack:
  added: []
  patterns: [P2P-backend-as-primary-source-of-truth]
key_files:
  created: []
  modified:
    - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
decisions:
  - P2P backend is primary source of truth for operating hours, Firebase is optional secondary
metrics:
  duration: 27m
  completed: 2026-03-12
---

# Quick Task 156: Fix Business Hours, Promotion Edit, Delivery Photo Investigation

Fixed two bugs (business hours not saving, promotion edit not returning full object) and investigated delivery photo E2E flow. Deployed backend to production, uploaded iOS Restaurant build 200 to TestFlight.

## One-liner

Business hours fix removes Firebase guard blocking P2P save; promotion edit returns full object; delivery photo gap identified in both customer apps.

## What Was Done

### Task 1: Commit fixes and create CR tickets (6f859382)

**Business Hours Fix (CR-0019):**
- The `saveOperatingHours()` function in `RestaurantSettingsView.swift` had a `guard !restaurantId.isEmpty` that returned early before reaching the P2P backend save call
- When vendors are registered via P2P backend (not Firebase), `restaurantId` is empty, causing the entire save to silently fail
- Fix: Removed the Firebase-dependent guard, made P2P backend the primary save target, kept Firebase as optional secondary
- Added error handling with local state revert on save failure

**Promotion Edit Fix (CR-0017):**
- Already committed as `dea9cf37` -- `update_promotion` endpoint now returns full promotion object instead of minimal `{"success": true}` dict
- CR created for audit trail

**Delivery Photo E2E Investigation (CR-0018):**

| Component | Status | Location |
|-----------|--------|----------|
| Backend model | EXISTS | `models.py:492-493` -- `delivery_photo_url` + `delivery_photo_uploaded_at` on Order |
| Backend upload endpoint | EXISTS | `order_flow.py:4620` -- `upload_delivery_photo()` + iOS alias route |
| Backend proof gate | EXISTS | `order_flow.py:3745-3759` -- blocks completion without photo |
| Backend cleanup | EXISTS | `order_flow.py:2706-2754` -- 12-hour retention, hourly cleanup |
| iOS Driver capture | EXISTS | `DeliveryProofSheet.swift` -- camera capture + upload flow |
| Android Driver capture | EXISTS | `DeliveryProofSheet.kt` + `ActiveDeliveryViewModel.kt` |
| iOS Customer display | **MISSING** | No delivery photo display in `DeliveryTrackingView.swift` |
| Android Customer display | **MISSING** | No delivery photo display in customer app |

**Gap:** Both customer apps (iOS and Android) do NOT display the delivery proof photo. The photo is captured by drivers, uploaded to backend, stored for 12 hours, but never shown to customers. This is a feature gap, not a bug -- the backend infrastructure is complete.

### Task 2: Deploy backend to staging and production

- Staging deploy: workflow run `22983744090` -- SUCCESS
- Production deploy: workflow run `22983968002` -- SUCCESS
- Staging health check: 200 OK
- Production health check: 200 OK

### Task 3: iOS Restaurant build 200 on TestFlight (ba7f5cb3)

- Bumped `CURRENT_PROJECT_VERSION` from 199 to 200 in all 6 build configurations
- Archive succeeded with Release configuration
- Upload to TestFlight succeeded -- build 200 processing

## Change Requests

| CR ID | Title | Status |
|-------|-------|--------|
| CR-0017 | Fix promotion edit not saving (update_promotion response) | Verified |
| CR-0018 | Investigate delivery photo end-to-end flow | Verified |
| CR-0019 | Fix business hours not saving in Restaurant app | Verified |

## Commits

| Hash | Message | Files |
|------|---------|-------|
| `dea9cf37` | fix: return full promotion object from update_promotion endpoint | `promotions.py` (pre-existing) |
| `6f859382` | fix(quick-156): [CR-0019] fix business hours not saving | `RestaurantSettingsView.swift` |
| `ba7f5cb3` | build: bump iOS Restaurant to build 200 | `project.pbxproj` |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- [x] All 3 CR tickets created and in Verified status
- [x] Business hours fix committed (6f859382)
- [x] Promotion edit fix deployed to production (dea9cf37, already committed)
- [x] Delivery photo E2E investigation complete with gaps documented
- [x] iOS Restaurant build 200 uploaded to TestFlight
- [x] Backend production healthy (health check 200)
- [x] Staging deploy succeeded (run 22983744090)
- [x] Production deploy succeeded (run 22983968002)

## Self-Check: PASSED

All 3 files found, all 3 commits verified in git history.
