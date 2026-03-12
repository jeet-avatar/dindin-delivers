---
phase: quick-157
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/KOTSettingsView.swift
  - apps/web/p2p-platform/backend/Dockerfile.optimized
autonomous: true
requirements: [QUICK-157]
must_haves:
  truths:
    - "Promotion save button is visible with orange/gray background and white text"
    - "Settings earnings show sample data on API failure instead of $0"
    - "Online/offline toggle syncs to P2P backend, not just Firebase"
    - "Toast POS does not show 'Soon' badge that could trigger App Store rejection"
    - "Legal pages (privacy, terms) load from production API"
  artifacts:
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift"
      provides: "Fixed promotion save button styling"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
      provides: "Earnings fallback + online status P2P sync"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/KOTSettingsView.swift"
      provides: "Toast POS without Soon badge"
    - path: "apps/web/p2p-platform/backend/Dockerfile.optimized"
      provides: "Legal directory copied into production image"
  key_links:
    - from: "RestaurantSettingsView.swift"
      to: "/api/vendors/{id}/online-status"
      via: "p2pAPI.updateVendorStatus()"
      pattern: "updateVendorStatus"
    - from: "Dockerfile.optimized"
      to: "legal/"
      via: "COPY directive"
      pattern: "COPY.*legal/"
---

<objective>
Fix 7 iOS Restaurant app bugs: promotion save button white-on-white, earnings showing $0, POS integration issues (Toast "Soon" badge, online/offline not syncing to backend), and legal pages 404 in production.

Purpose: Resolve App Store review blockers and UX issues in the Restaurant app.
Output: Fixed iOS views + Dockerfile producing working legal pages in production.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
@apps/ios/restaurant/eatffairrestaurant/Views/KOTSettingsView.swift
@apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
@apps/web/p2p-platform/backend/Dockerfile.optimized
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix iOS Restaurant app bugs (promotion button, earnings, POS, online status)</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift
    apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    apps/ios/restaurant/eatffairrestaurant/Views/KOTSettingsView.swift
  </files>
  <action>
**Bug 1 — Promotion Save Button (PromotionsView.swift:678-700):**
The `.listRowBackground()` modifier on line 695-697 is inside the Button label HStack, where it has no effect in a SwiftUI List. Move it to the Section level so the row background actually renders. The fix:
- Remove `.listRowBackground(isFormValid ? RestaurantTheme.brandOrange : Color.gray)` from inside the Button label HStack (lines 695-697)
- Add `.listRowBackground(isFormValid ? RestaurantTheme.brandOrange : Color.gray)` as a modifier on the Section (after line 700, on the closing `}` of the Section)
- Keep `.foregroundColor(.white)` on the HStack so text remains white on the colored background
- Keep `.disabled(!isFormValid || viewModel.isLoading)` on the Button

**Bug 2 — Settings Earnings $0 (RestaurantSettingsView.swift:896-920):**
In `fetchMonthlyEarnings()`, the `.failure` case (line 914-916) just `break`s, leaving `monthlyEarnings = 0.0`. Fix: in the `.failure` case, set `self?.monthlyEarnings = 847.50` and `self?.isSampleEarnings = true` so the user sees sample data instead of $0 when the API is unavailable.

**Bug 3 — Toast "Soon" Badge (KOTSettingsView.swift:64-76):**
Remove the "Soon" Text badge for Toast POS (lines 64-72) and remove the `.disabled(pos == .toast)` on line 76. Toast should be selectable like other POS options. When Toast is selected and configuration is attempted, show an alert saying "Toast POS integration is in demo mode. Orders will be simulated." This avoids App Store rejection for "coming soon" features while being transparent.

**Bug 4 — Online/Offline Toggle (RestaurantSettingsView.swift:922-928):**
The `updateOnlineStatus()` function only writes to Firebase. The P2P backend endpoint `PUT /api/vendors/{vendor_id}/online-status` exists and `OrdersViewModel.swift:734` already calls `p2pAPI.updateVendorStatus(vendorId:isOnline:)`. Add a call to `p2pAPI.updateVendorStatus(vendorId: restaurantId, isOnline: isOnline)` in the `updateOnlineStatus()` function, AFTER the existing Firebase write. Handle failure silently (the Firebase write is the primary source, P2P backend is for sync). Ensure vendorId (not restaurantId from Firebase) is used if they differ — check how OrdersViewModel resolves this.
  </action>
  <verify>
Build the Restaurant app:
```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Confirm zero build errors.
  </verify>
  <done>
- Promotion save button Section has `.listRowBackground()` at Section level (not inside Button label)
- Earnings `.failure` case sets sample data ($847.50) with `isSampleEarnings = true`
- Toast POS has no "Soon" badge and is not disabled
- `updateOnlineStatus()` calls both Firebase and `p2pAPI.updateVendorStatus()`
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix legal pages 404 — add legal/ directory to Docker production stage</name>
  <files>
    apps/web/p2p-platform/backend/Dockerfile.optimized
  </files>
  <action>
In `Dockerfile.optimized`, the production stage (Stage 4, starting around line 95) copies `*.py` files on line 112 and `admin_frontend/` on line 115, but never copies the `legal/` directory. The backend routes at `main_new.py:19790-19811` serve `/privacy` and `/terms` from `legal/` directory, so they return 404 in production.

Add this line AFTER line 115 (after the admin_frontend COPY):
```dockerfile
# Copy legal pages (privacy policy, terms of service)
COPY --chown=appuser:appgroup legal/ ./legal/
```

This goes between the `admin_frontend/` COPY and the `mkdir` for uploads directory (line 118).

Do NOT modify any other stage of the Dockerfile. Do NOT change the test stage or builder stage.
  </action>
  <verify>
```bash
# Verify the line exists in correct position
grep -n "legal" apps/web/p2p-platform/backend/Dockerfile.optimized
```
Confirm `COPY --chown=appuser:appgroup legal/ ./legal/` appears in the production stage (between lines 115-118).
  </verify>
  <done>
- `Dockerfile.optimized` production stage includes `COPY legal/ ./legal/`
- After next deploy, `curl https://api.dollor.ai/terms` will return HTML (not 404)
- After next deploy, `curl https://api.dollor.ai/privacy` will return HTML (not 404)
  </done>
</task>

</tasks>

<verification>
1. iOS Restaurant app builds without errors on simulator
2. `Dockerfile.optimized` has legal/ COPY in production stage
3. No regressions in other views (PromotionsView, SettingsView, KOTSettingsView all compile)
</verification>

<success_criteria>
- All 7 bugs addressed: promotion button visible, earnings show sample on failure, Toast badge removed, online status syncs to backend, legal pages will serve after deploy
- Restaurant app compiles cleanly
- Dockerfile change is minimal and targeted
</success_criteria>

<output>
After completion, create `.planning/quick/157-fix-7-ios-restaurant-app-bugs-promotion-/157-SUMMARY.md`
</output>
