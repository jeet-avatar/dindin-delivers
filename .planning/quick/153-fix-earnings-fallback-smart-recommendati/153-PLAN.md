---
phase: quick-153
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/promotions.py
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  - apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift
autonomous: true
requirements: [FIX-EARNINGS, FIX-RECOMMENDATIONS, FIX-PROMOTIONS-DECODE]
must_haves:
  truths:
    - "Monthly earnings section shows sample data (e.g. $847.50) when API returns 0 revenue instead of $0.00"
    - "Smart recommendations section shows sample recommendation cards when backend returns empty recommendations array"
    - "Promotions list loads without 'data could not be read' decode error"
  artifacts:
    - path: "apps/web/p2p-platform/backend/promotions.py"
      provides: "vendor_id field in list_promotions response dict"
      contains: "vendor_id"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
      provides: "Sample earnings fallback when API returns 0"
    - path: "apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift"
      provides: "Sample recommendations fallback matching demandForecast pattern"
  key_links:
    - from: "P2PPromotion.vendorId (non-optional Int)"
      to: "promotions.py list_promotions response"
      via: "JSON decode"
      pattern: "vendor_id.*p\\.vendor_id"
---

<objective>
Fix 3 iOS Restaurant app bugs: monthly earnings always showing $0.00, smart recommendations not appearing, and promotions list failing to decode.

Purpose: Restaurant owners see broken/empty data in Settings and AI Insights screens, and promotions crash on decode.
Output: Working earnings display with sample fallback, sample recommendations when empty, and correct promotions JSON response.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/promotions.py (lines 395-437 — list_promotions missing vendor_id)
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift (lines 893-910 — fetchMonthlyEarnings, line 658 — monthlyEarnings property)
@apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift (full file — recommendations fallback needed)
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 8792-8808 — P2PPromotion model, lines 8920-8929 — P2PAIRecommendation model)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix promotions backend response — add missing vendor_id field</name>
  <files>apps/web/p2p-platform/backend/promotions.py</files>
  <action>
In `promotions.py` at line 414, inside the list comprehension dict for `list_promotions` endpoint (line 397-437), add `"vendor_id": p.vendor_id` to the response dict. Insert it after the `"promotion_code"` line (line 416). This field is required by the iOS `P2PPromotion` model which has `vendorId: Int` as a non-optional property — without it, JSON decode fails with "data could not be read because it's missing".

The fix is a single line addition. Do NOT change any other fields or logic.
  </action>
  <verify>
Run: `grep -n "vendor_id" apps/web/p2p-platform/backend/promotions.py | grep "p.vendor_id"` — should show the new line.
Run: `cd apps/web/p2p-platform/backend && python -c "import promotions; print('imports ok')"` — should not error.
  </verify>
  <done>"vendor_id": p.vendor_id is present in the list_promotions response dict, iOS P2PPromotion model can decode the response without error.</done>
</task>

<task type="auto">
  <name>Task 2: Add sample earnings fallback and sample recommendations</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift
  </files>
  <action>
**RestaurantSettingsView.swift — fetchMonthlyEarnings() (line 893-910):**

In the `.success` case (line 899-903), after calculating `earnings`, add a fallback: if `earnings` is 0 AND `response.totalOrders` is 0, set `self?.monthlyEarnings` to a sample value like `847.50` (realistic sample). Also add a `@Published var isSampleEarnings: Bool = false` property near line 658 and set it to `true` when using the sample value, `false` when real data is available. This follows the same pattern as `isSampleForecast` in AIInsightsViewModel.

The updated logic should be:
```swift
case .success(let response):
    let platformFee = AppConfig.shared.restaurantPlatformFee
    let earnings = response.totalRevenue - (Double(response.totalOrders) * platformFee)
    if response.totalOrders == 0 {
        // Show sample earnings when no real order data
        self?.monthlyEarnings = 847.50
        self?.isSampleEarnings = true
    } else {
        self?.monthlyEarnings = max(0, earnings)
        self?.isSampleEarnings = false
    }
```

**AIInsightsViewModel.swift — recommendations (line 29):**

Change the `recommendations` computed property (line 29) to use the same fallback pattern as `demandForecast` (lines 17-19):
```swift
var recommendations: [P2PAIRecommendation] {
    let backendData = insights?.recommendations ?? []
    return backendData.isEmpty ? generateSampleRecommendations() : backendData
}
```

Add a corresponding `isSampleRecommendations` Bool:
```swift
var isSampleRecommendations: Bool {
    insights == nil || (insights?.recommendations ?? []).isEmpty
}
```

Add a `generateSampleRecommendations()` method after `generateSampleForecast()` (after line 112). Generate 3 realistic sample recommendations using the `P2PAIRecommendation` model fields (type, icon, title, description, impact, priority):

```swift
private func generateSampleRecommendations() -> [P2PAIRecommendation] {
    [
        P2PAIRecommendation(
            type: "menu",
            icon: "star.fill",
            title: "Add combo meals",
            description: "Restaurants with combo deals see 20-30% higher average order values.",
            impact: "+25% avg order value",
            priority: "high"
        ),
        P2PAIRecommendation(
            type: "timing",
            icon: "clock.fill",
            title: "Extend weekend hours",
            description: "Your area shows high demand after 9 PM on weekends. Consider extending hours.",
            impact: "+15% weekend orders",
            priority: "medium"
        ),
        P2PAIRecommendation(
            type: "promotion",
            icon: "tag.fill",
            title: "Launch a lunch special",
            description: "A 10% off lunch promo can boost weekday orders during 11 AM-2 PM.",
            impact: "+20% lunch orders",
            priority: "medium"
        )
    ]
}
```

Note: `P2PAIRecommendation` requires a memberwise init — check if it has one or if it uses Codable only. If it only has Codable init, add a `public init(type:icon:title:description:impact:priority:)` to the struct in P2PAPIService.swift (after line 8929), similar to how `P2PDemandForecast` has an explicit init at line 8863.
  </action>
  <verify>
Build the restaurant app:
```bash
cd /Users/jeet/doordash-p2p && xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Should compile without errors.
  </verify>
  <done>Monthly earnings shows $847.50 sample value when API returns 0 orders. Recommendations section shows 3 sample recommendation cards when backend returns empty array. Both have isSample* flags for UI indication.</done>
</task>

</tasks>

<verification>
1. `grep "vendor_id" apps/web/p2p-platform/backend/promotions.py` shows `p.vendor_id` in list_promotions response
2. Restaurant app builds successfully with no compile errors
3. Sample earnings value (847.50) is set when totalOrders == 0
4. Sample recommendations (3 items) are returned when backend recommendations are empty
</verification>

<success_criteria>
- Promotions list endpoint returns vendor_id field, eliminating iOS decode error
- Monthly earnings shows sample data ($847.50) instead of $0.00 for new restaurants
- Smart recommendations shows 3 sample cards instead of empty section for new restaurants
- Restaurant app compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/153-fix-earnings-fallback-smart-recommendati/153-SUMMARY.md`
</output>
