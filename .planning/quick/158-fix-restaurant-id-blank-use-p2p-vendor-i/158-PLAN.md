# Quick Task 158: Fix Restaurant ID Blank + Sample Earnings Indicator

## Task 1: Fix restaurantId to use P2P vendor ID
- **File:** `apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift`
- **Problem:** `restaurantId` property returns `Auth.auth().currentUser?.uid ?? ""` — nil for OAuth users
- **Fix:** Check `P2PAPIService.shared.currentVendorId` first, Firebase UID as fallback
- **Also:** Remove `.prefix(12) + "..."` truncation from ID display (P2P ID is short integer)

## Task 2: Add sample earnings indicator
- **File:** Same file, earnings display section
- **Problem:** `isSampleEarnings` flag is set but never shown to user
- **Fix:** Add "Estimated" caption below earnings amount when `isSampleEarnings == true`
