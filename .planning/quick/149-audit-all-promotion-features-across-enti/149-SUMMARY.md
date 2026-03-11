---
phase: quick-149
plan: 01
subsystem: docs
tags: [promotions, audit, ios, android, api, gap-analysis]

requires:
  - phase: none
    provides: none
provides:
  - "PROMOTIONS_AUDIT.md: comprehensive audit of all promotion features across backend + 4 client apps"
  - "Cross-reference matrix showing endpoint coverage per platform"
  - "Gap analysis identifying iOS Restaurant missing 7/8 vendor features"
  - "Critical finding: Android checkout bypasses backend promo validation"
affects: [ios-restaurant-promotions, android-checkout-fix, promotion-parity]

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - ".planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md"
  modified: []

key-decisions:
  - "iOS shared API layer is complete (9 methods) -- Restaurant app only needs SwiftUI views"
  - "Android V3Checkout promo validation is hardcoded (CRITICAL bug), needs API integration"
  - "Android Partner is ahead of iOS Restaurant for promotions (4/8 vs 1/8 endpoints)"

patterns-established:
  - "Audit format: endpoint catalog + client inventory + cross-reference matrix + gap analysis"

requirements-completed: [AUDIT-01]

duration: 5min
completed: 2026-03-11
---

# Quick-149: Promotions Feature Audit Summary

**Full audit of 12 backend promotion endpoints verified against production, with cross-platform coverage analysis revealing iOS Restaurant missing 7/8 vendor features and Android checkout bypassing backend promo validation entirely**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T18:07:24Z
- **Completed:** 2026-03-11T18:12:20Z
- **Tasks:** 3 (all combined into single audit artifact)
- **Files created:** 1

## Accomplishments

- Cataloged all 12 backend promotion endpoints with production HTTP status verification (all live: 3 public/200, 9 auth-required/401)
- Inventoried 9 iOS shared API methods, 10 Android API methods, and all promotion models across both platforms
- Found CRITICAL bug: Android V3CheckoutScreen and MultiRestaurantCheckoutScreen validate promo codes client-side with hardcoded values, never calling `/api/promotions/apply`
- iOS Restaurant app has complete shared API layer but only uses 1 of 8 vendor methods (analytics)
- Created cross-reference matrix and prioritized recommendations

## Task Commits

1. **Tasks 1-3: Full audit (endpoints, UI inventory, gap analysis)** - `dde34dd7` (docs)

## Files Created

- `.planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md` - 423-line comprehensive audit with 14 sections

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Key Findings

1. **CRITICAL:** Android checkout uses hardcoded promo codes (WELCOME50, FLAT5) instead of backend API -- vendor-created promotions will never work on Android
2. **iOS Restaurant:** Shared API layer has all 9 vendor methods ready; needs only SwiftUI views (PromotionsView + PromotionsViewModel)
3. **Android Partner:** Has list/create/toggle/delete but missing edit, analytics, and AI suggestions UI
4. **Both platforms:** Missing AI suggestions and quick-create template features
5. **Backend:** 166 unit tests cover promotion logic; all 12 endpoints live on production

## Next Steps

- Fix Android checkout promo validation (CRITICAL)
- Build iOS Restaurant PromotionsView (MEDIUM)
- Add Android Partner analytics and edit screens (MEDIUM)
- Surface AI suggestions on both platforms (LOW)

---
*Phase: quick-149*
*Completed: 2026-03-11*
