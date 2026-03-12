---
phase: quick-154
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/promotions.py
  - apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift
autonomous: true
requirements: [QUICK-154]
must_haves:
  truths:
    - "Quick-create promotion returns a full P2PPromotion-compatible object that iOS can decode"
    - "Smart recommendation cards with type 'promotion' navigate to PromotionsView"
    - "Non-promotion recommendation cards show a contextual alert or action"
  artifacts:
    - path: "apps/web/p2p-platform/backend/promotions.py"
      provides: "create_promotion returns full promotion object matching list_promotions format"
      contains: "vendor_id.*promotion.vendor_id"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift"
      provides: "Tappable recommendation cards with navigation"
      contains: "NavigationLink"
  key_links:
    - from: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      to: "promotions.py create_promotion"
      via: "JSON decode P2PPromotion from POST /promotions/quick-create/{vendor_id}/{promo_type}"
      pattern: "decode.*P2PPromotion"
---

<objective>
Fix 2 iOS Restaurant bugs: (1) Quick-create promotion fails with "data couldn't be read" because the backend returns a success message dict but iOS expects a full P2PPromotion object. (2) Smart recommendation cards are static — tapping them does nothing.

Purpose: Make promotions quick-create functional and recommendation cards actionable.
Output: Backend returns full promotion object; recommendation cards navigate to relevant views.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/promotions.py (lines 99-187 create_promotion, lines 395-437 list_promotions, lines 819-894 quick_create_promotion)
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 963-1002 quickCreatePromotion, lines 8793-8808 P2PPromotion)
@apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift (lines 470-513 smartRecommendationsCard)
@apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift (lines 125-152 generateSampleRecommendations)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix backend create_promotion to return full promotion object</name>
  <files>apps/web/p2p-platform/backend/promotions.py</files>
  <action>
In `create_promotion()` (line 179-187), replace the current return dict with a full promotion object matching the same format used by `list_promotions()` (lines 414-436). This ensures iOS `P2PPromotion` can decode it.

Replace the return block at lines 179-187 with:

```python
return {
    "id": promotion.id,
    "promotion_code": promotion.promotion_code,
    "vendor_id": promotion.vendor_id,
    "name": promotion.name,
    "description": promotion.description,
    "type": promotion.type.value,
    "value": promotion.value,
    "max_discount": promotion.max_discount,
    "min_order_amount": promotion.min_order_amount,
    "target_audience": promotion.target_audience.value,
    "schedule": promotion.schedule,
    "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
    "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
    "is_recurring": promotion.is_recurring,
    "usage_count": promotion.usage_count,
    "usage_limit": promotion.usage_limit,
    "total_discount_given": promotion.total_discount_given,
    "status": promotion.status.value,
    "pushed_to_app": promotion.pushed_to_app,
    "ai_suggested": promotion.ai_suggested,
    "created_at": promotion.created_at.isoformat(),
    "success": True,
    "processed_by": ai_employee["name"],
    "message": f"Promotion '{request.name}' created successfully!",
    "push_status": "Pushing to customer apps..." if request.push_to_app else "Not pushed yet"
}
```

Key points:
- Keep `success`, `processed_by`, `message`, `push_status` for backward compat (extra fields are ignored by iOS decoder)
- The critical fields iOS needs: `id`, `promotion_code`, `vendor_id`, `name`, `type`, `value`, `status`
- `usage_count` and `total_discount_given` will be 0 for new promotions (matching P2PPromotion optional Int?/Double?)
- This also fixes `quick_create_promotion` since it calls `create_promotion` at line 894
  </action>
  <verify>
Run: `cd apps/web/p2p-platform/backend && python -c "import promotions; print('import OK')"`
Verify the return dict includes all fields that P2PPromotion expects: id, promotion_code, vendor_id, name, type, value, status, start_date, end_date, usage_count, total_discount_given, max_discount, min_order_amount, description.
  </verify>
  <done>Backend create_promotion returns a full promotion object with all fields needed by P2PPromotion struct. The quick_create_promotion endpoint (which delegates to create_promotion) also returns the full object.</done>
</task>

<task type="auto">
  <name>Task 2: Make smart recommendation cards tappable with navigation</name>
  <files>apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift</files>
  <action>
In `smartRecommendationsCard` (lines 470-513), make each recommendation card tappable:

1. Add a `@State private var showingNonPromoAlert = false` and `@State private var selectedRecommendation: P2PAIRecommendation?` to AIInsightsView (near existing @State vars around line 9-10).

2. Replace the `ForEach` block (lines 480-507) with tappable versions. For recommendations where `rec.type == "promotion"`, wrap in a `NavigationLink` that navigates to `PromotionsView(ordersVM: ordersVM)`. For other types (menu, timing, staffing), make them a `Button` that sets `selectedRecommendation` and `showingNonPromoAlert = true`.

3. Add an `.alert` modifier on the VStack showing contextual guidance for non-promotion recommendations:
   - type "menu": "Go to Menu Management to add combo meals and update your offerings."
   - type "timing": "Update your operating hours in Restaurant Settings to capture more orders."
   - default: "Check your restaurant settings to implement this recommendation."

4. Verify `PromotionsView` is importable/accessible. It should already exist in the restaurant app views. If it requires specific init params, match them (it likely takes `ordersVM` or is standalone).

Key: The recommendation `type` field from `P2PAIRecommendation` determines the action: "promotion" -> navigate, others -> alert with guidance.
  </action>
  <verify>
Build the Restaurant iOS app:
```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Confirm build succeeds with no errors.
  </verify>
  <done>Tapping a promotion-type recommendation card navigates to PromotionsView. Tapping other recommendation types shows a contextual alert with guidance on where to take action. Build compiles cleanly.</done>
</task>

</tasks>

<verification>
1. Backend: `create_promotion` return dict contains all P2PPromotion-required fields (id, promotion_code, vendor_id, name, type, value, status)
2. iOS: Restaurant app builds without errors
3. The `quick_create_promotion` endpoint inherits the fix since it delegates to `create_promotion`
4. Recommendation cards are interactive (NavigationLink for promotions, alert for others)
</verification>

<success_criteria>
- Quick-create promotion no longer fails with "data couldn't be read" — backend returns full promotion object
- Smart recommendation cards are tappable with appropriate navigation/alerts
- iOS Restaurant app compiles cleanly
- No regressions in list_promotions or other promotion endpoints
</success_criteria>

<output>
After completion, create `.planning/quick/154-fix-promotions-quick-create-decode-actio/154-SUMMARY.md`
</output>
