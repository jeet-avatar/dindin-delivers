---
phase: quick-43
status: complete
commit: d58eaa47
---

# Quick Task 43: Fix Remaining iOS UI Test Failures — 214/214 Pass

## Results

| App | Before | After | Fixed |
|-----|--------|-------|-------|
| Customer | 45/45 (100%) | 45/45 (100%) | unchanged |
| Driver | 41/46 (89%) | 46/46 (100%) | +5 |
| Restaurant | 113/123 (92%) | 123/123 (100%) | +10 |
| **Total** | **199/214 (93%)** | **214/214 (100%)** | **+15** |

## Root Causes

### Driver (5 failures → 0)

**ProfileTabSelector accessibility label mismatch**: `ProfileTabSelector` at `DriverProfileView.swift:324` sets `.accessibilityLabel("\(tabs[index]) tab")`, making the Settings button's label "Settings tab" — not "Settings". All tests used `app.buttons["Settings"]` which never matched. The `if` guard silently skipped the tap, leaving the test on the default Personal tab. Tests then scrolled in the wrong content.

**Fix**: Changed `app.buttons["Settings"]` → `app.buttons["Settings tab"]` in DriverProfileTests.swift (4 occurrences) and TestHelpers.swift navigateToLogin() (1 occurrence). Added scroll loops for Logout/Delete buttons.

### Restaurant (10 failures → 0)

1. **Auth tests (7)**: `navigateToLogin()` did only 1 `scrollView.swipeUp()` to find Sign Out button. The RestaurantSettingsView has 6+ sections before the Sign Out button — 1 swipe wasn't enough. When logout failed, the app stayed on the dashboard, and all auth tests couldn't find login screen elements.

   **Fix**: Changed to `app.swipeUp()` loop (8 iterations) with early exit when Sign Out button found.

2. **Order filter tabs (1)**: `FilterTab` at `EnhancedDashboardView.swift:326` sets `.accessibilityLabel("Filter by \(title), \(count) orders")`, so `app.buttons["All"]` doesn't match "Filter by All, 0 orders".

   **Fix**: Changed to `BEGINSWITH[c] 'Filter by All'` predicate.

3. **Settings Sign Out / Delete Account (2)**: `scrollView.swipeUp()` on the internal SwiftUI List scroll view was unreliable. 2-3 fixed swipes weren't enough.

   **Fix**: Changed to `app.swipeUp()` loop (8-10 iterations) with early exit on element found.

## Pattern Rule

SwiftUI's `.accessibilityLabel()` OVERRIDES the button text as the XCTest identifier. Always verify accessibility labels in the actual view code before writing test selectors. Use `grep accessibilityLabel` on the view file before using `app.buttons["exact text"]`.
