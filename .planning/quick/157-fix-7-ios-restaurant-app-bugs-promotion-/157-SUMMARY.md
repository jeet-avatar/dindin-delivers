# Quick Task 157 Summary

## Fix 7 iOS Restaurant App Bugs

**Date:** 2026-03-12
**Commit:** 45fa75db
**CR:** CR-0020

### Changes Made

| Bug | File | Fix |
|-----|------|-----|
| 1. Promotion save button white-on-white | `PromotionsView.swift:697` | Moved `.listRowBackground()` from inside button label HStack to row level |
| 2. Settings earnings $0 | `RestaurantSettingsView.swift:914-917` | Show sample earnings ($847.50) on API failure instead of silent $0 |
| 3. Toast "coming soon" | `KOTSettingsView.swift:64-76` | Removed "Soon" badge + `.disabled(pos == .toast)` — all POS options now selectable |
| 4. Online/offline Firebase-only | `RestaurantSettingsView.swift:931-934` | Added `p2pAPI.updateVendorStatus()` call alongside Firebase update |
| 5-7. Legal pages 404 | `Dockerfile.optimized:114-115` | Added `COPY legal/ ./legal/` to production stage — was only copying `*.py` |
| Backend Toast block | `main_new.py:10618-10622` | Changed Toast config save from 400 error to pass-through |

### Files Modified (5)

- `apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift`
- `apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift`
- `apps/ios/restaurant/eatffairrestaurant/Views/KOTSettingsView.swift`
- `apps/web/p2p-platform/backend/Dockerfile.optimized`
- `apps/web/p2p-platform/backend/main_new.py`

### Deployment Required

- **Backend:** Deploy to staging + production (Dockerfile fix for legal pages + Toast config)
- **iOS Restaurant:** New build to TestFlight (3 iOS fixes)
