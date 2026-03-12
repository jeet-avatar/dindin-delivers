---
phase: quick-152
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
autonomous: true
requirements: [QUICK-152]
must_haves:
  truths:
    - "Demand forecast chart always renders in AIInsightsView, even for vendors with zero orders"
    - "Monthly earnings on settings page shows real revenue from P2P backend, not Firestore"
  artifacts:
    - path: "apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift"
      provides: "Fallback forecast data when backend returns empty demandForecast"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
      provides: "Monthly earnings fetched from P2P backend API instead of Firestore"
  key_links:
    - from: "AIInsightsViewModel.swift"
      to: "AIInsightsView.swift demandForecastCard"
      via: "demandForecast computed property returning non-empty array"
      pattern: "demandForecast.*isEmpty"
    - from: "RestaurantSettingsView.swift (SettingsViewModel)"
      to: "P2PAPIService.getAIInsights"
      via: "API call with period month"
      pattern: "getAIInsights.*month"
---

<objective>
Fix two iOS Restaurant app bugs: (1) demand forecast graph never shows because backend returns empty demandForecast array for vendors with few/no orders, and (2) monthly earnings displays $0.00 because it queries Firestore (which has no orders) instead of the P2P backend.

Purpose: Make the AI Insights and Settings screens useful for all vendors, including new ones.
Output: Two modified Swift files with fallback forecast data and backend-sourced earnings.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift
@apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift (lines 199-281 — demandForecastCard checks viewModel.demandForecast.isEmpty)
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift (lines 342-348 — earnings display, lines 650-674 — SettingsViewModel properties, lines 893-921 — fetchMonthlyEarnings via Firestore)
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 903-960 — getAIInsights, lines 8847-8862 — P2PDemandForecast model, lines 8924-8948 — P2PAIInsightsResponse with totalRevenue)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add fallback forecast data in AIInsightsViewModel when backend returns empty</name>
  <files>apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift</files>
  <action>
The backend (main_new.py:21419-21433) generates forecast entries only for hours 9-22 where predicted > 0. For vendors with zero orders, the entire demandForecast array comes back empty, causing the chart in AIInsightsView to show "Not enough data" text instead of the graph.

Fix the `demandForecast` computed property (line 17) to return sample/placeholder data when the backend array is empty:

1. Change the computed property from:
   `var demandForecast: [P2PDemandForecast] { insights?.demandForecast ?? [] }`
   to a version that checks if `insights?.demandForecast` is empty (or nil) and returns generated sample data.

2. Add a private method `generateSampleForecast() -> [P2PDemandForecast]` that:
   - Gets the current hour from `Calendar.current.component(.hour, from: Date())`
   - Generates 7 entries starting from current hour, filtering to 9AM-10PM range (matching backend logic)
   - Uses realistic-looking sample values: predicted = 2-8 orders (vary by time of day — lunch 11-14 higher ~5-8, dinner 17-21 higher ~4-7, other times ~1-3), minOrders = max(0, predicted - 2), maxOrders = predicted + 3
   - Format hour strings to match backend format: for hour < 12 use "{hour}:00", for hour 12 use "12:00 PM", for hour > 12 use "{hour-12}:00 PM"
   - If no hours fall in 9-22 range (late night), generate entries for next day's lunch hours (11AM-5PM) as a fallback so the chart is never empty

3. Also add a computed property `isSampleForecast: Bool` that returns `true` when insights is nil or insights.demandForecast is empty. The view can optionally use this later to show a subtle "(Sample data)" label.

Do NOT modify AIInsightsView.swift — the existing `.isEmpty` check on line 210 will now pass because the computed property returns sample data, so the Chart will render.
  </action>
  <verify>
Build the restaurant app:
```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Confirm no compile errors. The demandForecast property should never return an empty array.
  </verify>
  <done>AIInsightsViewModel.demandForecast always returns non-empty P2PDemandForecast array — sample data when backend has no forecast, real data when it does. Chart in AIInsightsView renders in both cases.</done>
</task>

<task type="auto">
  <name>Task 2: Switch monthly earnings from Firestore to P2P backend API</name>
  <files>apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift</files>
  <action>
The current `fetchMonthlyEarnings()` (lines 893-921) queries Firestore `orders` collection which has no data, so earnings always show $0.00. Replace it with a call to the P2P backend.

1. Replace the body of `fetchMonthlyEarnings()` (lines 893-921) with a call to `p2pAPI.getAIInsights(vendorId:period:completion:)` using period "month":
   ```swift
   private func fetchMonthlyEarnings() {
       guard let vendorId = vendorId else { return }

       p2pAPI.getAIInsights(vendorId: vendorId, period: "month") { [weak self] result in
           DispatchQueue.main.async {
               switch result {
               case .success(let response):
                   // totalRevenue from backend is gross revenue; subtract platform fee ($1/order)
                   let platformFee = AppConfig.shared.restaurantPlatformFee
                   let earnings = response.totalRevenue - (Double(response.totalOrders) * platformFee)
                   self?.monthlyEarnings = max(0, earnings)
               case .failure:
                   // Silently keep $0.00 on failure — not critical
                   break
               }
           }
       }
   }
   ```

2. The `p2pAPI` property already exists at line 667. The `vendorId` computed property already exists at line 673. No new imports needed — EatFairShared is already imported.

3. Remove the Firestore import ONLY if no other method in SettingsViewModel uses `db` (the Firestore reference at line 666). Check first — if other methods reference `db`, leave the import and property. If `db` is only used in `fetchMonthlyEarnings`, remove the `private let db = Firestore.firestore()` line (666) to clean up.

4. Verify the backend supports period="month" by checking main_new.py. The backend AI insights endpoint accepts period parameter and filters orders by date range — "month" should return current month's data with totalRevenue and totalOrders.
  </action>
  <verify>
Build the restaurant app:
```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Confirm no compile errors and no references to removed Firestore query in fetchMonthlyEarnings.
  </verify>
  <done>Monthly earnings on RestaurantSettingsView fetches from P2P backend API via getAIInsights(period: "month"), showing real PostgreSQL-sourced revenue minus platform fees. No more Firestore dependency for earnings.</done>
</task>

</tasks>

<verification>
1. Restaurant app builds without errors
2. AIInsightsViewModel.demandForecast never returns empty array
3. fetchMonthlyEarnings calls P2P backend, not Firestore
4. Earnings calculation correctly subtracts $1/order platform fee
</verification>

<success_criteria>
- Demand forecast chart renders for all vendors (including those with zero orders)
- Monthly earnings shows real data from PostgreSQL backend
- No compilation errors in restaurant app
</success_criteria>

<output>
After completion, create `.planning/quick/152-fix-ios-restaurant-demand-forecast-graph/152-SUMMARY.md`
</output>
