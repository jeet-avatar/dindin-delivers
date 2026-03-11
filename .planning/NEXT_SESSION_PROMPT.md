# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 11, 2026)

### Completed This Session

**Quick-150 + Quick-151: iOS Restaurant App Gap Closure — ALL 7 GAPS COMPLETE**

| GAP | What | CR | Commit | Repo |
|-----|------|----|--------|------|
| 1 | Promotions CRUD (PromotionsView + ViewModel) | — | 37216705 | doordash-p2p |
| 2 | Menu add/delete sync to P2P backend | CR-0012 | 8a120f4b | doordash-p2p |
| 3 | Operating hours save to P2P | CR-0013 | 8a120f4b | doordash-p2p |
| 4 | Document upload UI (progress ring, badges) | CR-0014 | 8a120f4b | doordash-p2p |
| 5 | Notification settings @AppStorage + P2P sync | CR-0015 | 8a120f4b | doordash-p2p |
| 6 | pending_delivery_proof flow — verified complete | — | (no changes) | — |
| 7 | Android promo codes → API validation | CR-0016 | 95d22bd9 | eatfair-android |

### New Infrastructure Added
- `P2PAPIService.patchVendorSettings()` — reusable PATCH wrapper for vendor settings (used by GAPs 3+5)
- `PromoCodeValidator` — Android object for promo API calls from checkout composables (uses HttpURLConnection, no ViewModel needed)

### Key Files Modified
- **doordash-p2p:** P2PAPIService.swift (+59), EnhancedMenuView.swift (+76), RestaurantDocumentsView.swift (+187), RestaurantSettingsView.swift (+67)
- **eatfair-android:** V3CheckoutScreen.kt, MultiRestaurantCheckoutScreen.kt

### CR Tickets Status
- CR-0012 through CR-0016: all at **"In Progress"** — need approval + deploy transitions

---

## PRIORITY 1: Push + Deploy + Distribute

**Both repos have uncommitted changes pushed to local only — must push to remote before deploy.**

```bash
# 1. Push both repos
git push origin main
cd /Users/jeet/StudioProjects/eatfair-android && git push origin main

# 2. Deploy backend
gh workflow run deploy-staging.yml --ref main
# Smoke test staging
gh workflow run deploy-dollar-ai.yml

# 3. Transition CR tickets (CR-0012 to CR-0016)
ADMIN_KEY="DollorProductionSecretKey2024Admin"
for CR in CR-0012 CR-0013 CR-0014 CR-0015 CR-0016; do
  # Approve → In Progress → Staging → Production → Verified
  curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR/transition?secret_key=$ADMIN_KEY" \
    -H "Content-Type: application/json" \
    -d '{"new_status":"Approved","actor_email":"system@dollor.ai","role":"super_admin"}'
done

# 4. Build + distribute
# iOS Restaurant → TestFlight (build 194+)
# Android Customer → Firebase (vC=38+)
```

### After deploy
- Write 150-SUMMARY.md to close out quick-150
- Remove .continue-here.md

---

## PRIORITY 2: iOS Restaurant App — Complete ASC Setup + Submit

**Status:** Quick-126 plan created but executor was interrupted.
**Plan:** `.planning/quick/124-get-ios-restaurant-app-ready-for-app-sto/124-PLAN.md`

The Restaurant app ASC metadata is **almost completely empty** — needs description, keywords, categories, age rating, build attachment, demo credentials, screenshots.

---

## PRIORITY 3: iOS Driver App — Prepare + Submit

Same ASC metadata audit + fill needed for Driver app (com.dollorai.delivery, build 215).
- Demo: demo.driver@dollor.ai / DemoDriver2025!
- State: PREPARE_FOR_SUBMISSION

---

## PRIORITY 4: Release iOS Customer App

Build 1111 is approved (PENDING_DEVELOPER_RELEASE). Before releasing:
1. Fill "What's New" text in ASC
2. Set privacy URL in version localization
3. Click "Release This Version"

**Wait for Apple's business papers confirmation first.**

---

## PRIORITY 5: Apple Cleanup TODO (for next iOS builds)

Saved at `.planning/todos/pending/2026-03-09-apple-app-store-ios-cleanup-for-next-builds.md`:
1. Remove NSContactsUsageDescription (unused)
2. Remove NSLocationAlwaysAndWhenInUseUsageDescription (unused)
3. Set ENABLE_AI_FEATURES=NO in Production.xcconfig
4. Delete ACHPaymentService.swift (dead code)
5. Verify ASC privacy labels match SDK data collection
6. Fill What's New text
7. Set privacy URL in version localization

---

## PRIORITY 6: Continue v1.5 Roadmap

| Phase | Status | Next Step |
|-------|--------|-----------|
| 07 Play Store | 1/3 plans | Customer on internal, need production track |
| 08 DB Rotation | Not started | `/gsd:plan-phase 8` |
| 09 Rideshare E2E | Not started | `/gsd:plan-phase 9` |
| 10 Support System | 2/3 plans | Plan 10-03 remaining |

---

## Current Build Versions

| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1113 | TestFlight Mar 6, **Build 1111 APPROVED** |
| iOS | Driver | 215 | TestFlight Mar 6 |
| iOS | Restaurant | 193 | TestFlight Mar 11 |
| Android | Customer | vC=37 (1.0.36) | Firebase + Play Store Mar 6 |
| Android | Driver | vC=33 (1.0.32) | Firebase Mar 6 |
| Android | Partner | vC=33 (1.0.32) | Firebase Mar 11 |

---

## Key Facts for Next Session

- ADMIN_SECRET_KEY: `DollorProductionSecretKey2024Admin` (AWS `dollor/production/admin`)
- CR transitions need `role: "super_admin"` (not `system`)
- iOS simulator: use `iPhone 17 Pro` (iPhone 16 removed from Xcode)
- All Android promo stash changes already popped and committed
- Change Management lifecycle: Draft → Submitted → Under Review → Approved → In Progress → Staging → Production → Verified → Closed

---

## Suggested Session Flow

```
/gsd:resume-work
→ Push both repos + deploy backend (Priority 1)
→ Build + distribute iOS Restaurant + Android Customer
→ Transition CRs to Verified
→ Complete Restaurant app ASC metadata + submit (Priority 2)
→ Prepare Driver app ASC metadata + submit (Priority 3)
→ /gsd:pause-work
```
