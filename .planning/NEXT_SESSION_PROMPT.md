# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 9, 2026)

### Completed This Session (5 tasks + 1 in-progress)

| # | Task | What | Commit |
|---|------|------|--------|
| 123 | Rideshare E2E flow test | 14/15 PASS on production, 65 tasks synced to tracker, 10 departments verified | `71dee42a` |
| 124 | Fix 4 rideshare data issues | Stale rides cleanup (16 expired), rideshare earnings, bids filter (7-day), active count | `433a0677` |
| 124 | Deploy rideshare fixes | CR-0001 through full lifecycle, staging + production deployed | CI/CD runs |
| 125 | Enterprise Apple audit | 86 checks, 68 PASS, 3 FAIL, 10 WARN — **BUILD 1111 APPROVED by Apple** | `37b7f6c2` |
| — | Apple cleanup TODO | 7 items saved for next iOS builds | `d3157b62` |
| 126 | Restaurant app ASC prep | **IN PROGRESS** — plan created, executor interrupted by user | Plan only |

### STATE.md Cleanup
- Removed 190 duplicate decision lines (333 → 143 lines)

### Key Discovery: iOS Customer App APPROVED
- Build 1111 state: **PENDING_DEVELOPER_RELEASE** — ready to release to App Store
- Apple is checking business papers/agreements — will confirm if anything else needed
- Current production build: **1114** (latest uploaded Mar 6)

### Rideshare Lifecycle (investigated)
- Customer sets 1-30 min bidding window
- Rides visible to drivers while OPEN/BIDDING AND bidding_expires_at > now
- Auto-expiry job runs every 60s
- Matched driver: 10-min no-show timeout → ride reopens +5 min
- In-progress: 2-hour stall → auto-cancel
- Each bid: 10-min individual expiry

### Slow Period Promotion (investigated)
- NOT AI-powered — pure rule-based analytics
- Endpoint: `GET /api/vendors/{vendor_id}/ai-insights`
- Flags hours with < 2 orders as "slow", suggests discounts
- Also generates: staffing recommendations, trending items, prep time alerts, demand forecast (simple hourly average)
- No actual promotion creation system exists — just suggestions

---

## PRIORITY 1: iOS Restaurant App — Complete ASC Setup + Submit

**Status:** Quick-126 plan created but executor was interrupted. Resume this.
**Plan:** `.planning/quick/124-get-ios-restaurant-app-ready-for-app-sto/124-PLAN.md`

The Restaurant app ASC metadata is **almost completely empty**:
- ALL version localization fields null (description, keywords, supportUrl, etc.)
- No categories set
- Age rating not completed
- No build attached to version
- No review detail (no demo credentials)
- Zero screenshots uploaded
- Code has "Coming Soon" text in KOTSettingsView.swift (Toast POS)

**Positive:** Sign in with Apple is implemented, demo vendor login works, no unused permissions (unlike Customer app).

**Action:** Resume quick-126 execution — fill all ASC metadata via API, attach build 185, audit code, submit for review. Screenshots need manual upload.

---

## PRIORITY 2: iOS Driver App — Prepare + Submit

Same ASC metadata audit + fill needed for Driver app (com.dollorai.delivery, build 215).
- Demo: demo.driver@dollor.ai / DemoDriver2025!
- State: PREPARE_FOR_SUBMISSION

---

## PRIORITY 3: Release iOS Customer App

Build 1111 is approved. Before releasing:
1. Fill "What's New" text in ASC
2. Set privacy URL in version localization
3. Click "Release This Version"

**Wait for Apple's business papers confirmation first.**

---

## PRIORITY 4: Apple Cleanup TODO (for next iOS builds)

Saved at `.planning/todos/pending/2026-03-09-apple-app-store-ios-cleanup-for-next-builds.md`:
1. Remove NSContactsUsageDescription (unused)
2. Remove NSLocationAlwaysAndWhenInUseUsageDescription (unused)
3. Set ENABLE_AI_FEATURES=NO in Production.xcconfig
4. Delete ACHPaymentService.swift (dead code)
5. Verify ASC privacy labels match SDK data collection
6. Fill What's New text
7. Set privacy URL in version localization

---

## PRIORITY 5: Continue v1.5 Roadmap

| Phase | Status | Next Step |
|-------|--------|-----------|
| 07 Play Store | 1/3 plans | Customer on internal, need production track |
| 08 DB Rotation | Not started | `/gsd:plan-phase 8` |
| 09 Rideshare E2E | Not started | `/gsd:plan-phase 9` |
| 10 Support System | 2/3 plans | Plan 10-03 remaining |

---

## Rideshare Fixes Deployed (Quick-124)

| Fix | Before | After |
|-----|--------|-------|
| Available rides | 10+ stale ghost rides from Feb 14-18 | 0 (null-expiry >30min excluded + admin cleanup) |
| Driver earnings | $0 (food delivery only) | Includes rideshare_rides, rideshare_earnings, rideshare_tips |
| My bids | 19 (all historical) | Last 7 days default (`?days=` param) |
| Active rides | 12 (all accepted bids ever) | Only MATCHED/IN_PROGRESS (`active_rides_count` field) |
| Admin cleanup | No endpoint | `POST /api/rides/admin/cleanup-stale-rides` |

---

## Current Build Versions

| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1114 | TestFlight Mar 6, **Build 1111 APPROVED** |
| iOS | Driver | 215 | TestFlight Mar 6 |
| iOS | Restaurant | 185 | TestFlight Mar 6 |
| Android | Customer | vC=37 (1.0.36) | Firebase + Play Store Mar 6 |
| Android | Driver | vC=33 (1.0.32) | Firebase Mar 6 |
| Android | Partner | vC=29 (1.0.28) | Firebase Mar 6 |

---

## Change Management Pipeline (Verified Working)

Full lifecycle tested with CR-0001:
Draft → Submitted → Under Review → Approved → In Progress → PR Created → CI Running → Staging → Production → Verified → Closed

12 audit trail entries recorded. Pipeline: Project Tracker case → Change Request → CI/CD deploy.

---

## Suggested Session Flow

```
/gsd:resume-work
→ Complete Restaurant app ASC metadata + submit (quick-126)
→ Prepare Driver app ASC metadata + submit
→ Release Customer app (after Apple confirms business papers)
→ Apply Apple cleanup TODO items + rebuild iOS apps
→ Continue v1.5 roadmap (Phase 08 or 09)
→ /gsd:pause-work
```
