# Insurance evidence — gaps & how to close them

> Companion to `INSURANCE-EVIDENCE-2026-06-05.pdf`. This file lists every
> screenshot that the underwriter packet currently *doesn't* have, ranked by
> how load-bearing it is for the matchmaking-fee argument, with a concrete
> recipe to capture each.

## Status snapshot

| Flow | Screens captured | Coverage |
|------|------------------|----------|
| food-customer        | 23 | ✅ strong (full lifecycle + 10 App Store shots) |
| food-restaurant      | 11 | ✅ strong (incoming → accept → KOT + App Store) |
| food-driver          | 14 | 🟡 mostly App Store; missing earnings detail screen |
| rideshare-rider      | 2  | 🔴 only request screen, no in-progress or receipt |
| rideshare-driver     | 0  | 🔴 nothing captured |

Total in PDF: 52 screenshots + receipt math appendices (24 pages).

## Critical gaps (close these before underwriter meeting)

### 1. Rideshare driver flow (0 screens)
The underwriter argument leans hardest on driver economics — that the driver
retains commercial-auto liability AND retains 95%+ of fare. We need the
**driver-side rideshare earnings screen** showing the per-trip breakdown
(fare $20.00, platform fee $1.00, take-home $19.00, tier 1).

**Recipe — Option A (fastest, ~15 min, manual):**
1. Launch Driver TestFlight build on physical device or simulator already booted
2. Log in: `demo.driver@dollor.ai` / `DemoDriver2025!`
3. Go to Earnings tab → Rideshare → tap most recent completed ride
4. `xcrun simctl io booted screenshot rideshare-driver-receipt.png` (or device screenshot)

**Recipe — Option B (autonomous, ~2 hrs, blocked by iOS build):**
Add `InsuranceTour` test method to `eatffairdeliveryUITests` Driver Flows,
add screenshot calls between actions, build + run UI test, extract from
`.xcresult`. Blocked today by the pod resource copy errors in the customer
build — needs a `pod install` clean first.

### 2. Rideshare rider in-progress + receipt (2 / 5 screens)
Have: ride request form, geocoded pickup.
Missing: searching state, active trip, completed receipt with $1 service fee
visible.

**Recipe:** Same as #1 but in the Customer app's Rides tab. Has a completed
ride in history (RIDE2026000517 per quick-356 memory).

### 3. Food driver earnings detail
Have: driver active screens, App Store shots.
Missing: per-trip earnings card showing $8.25 delivery (100% kept) + $5.00 tip
(100% kept) + $0.00 platform fee.

**Recipe:** Driver app → Earnings → tap most recent DOLL... delivery.

## Nice-to-have

### 4. Restaurant daily settlement
Restaurant app → Earnings or Reports → today's settlement. Shows the $1/order
platform fee aggregated across the day, vs the multi-thousand-dollar gross
food sale.

### 5. Customer order receipt with line-by-line fee breakdown
Customer app → Orders → completed order → tap "Receipt" or "Breakdown" tab.
Should mirror the format in INSURANCE-RECEIPTS.md → Trip 1 → Customer Receipt.

We have a tracking screen (`13-receipt-final.png`) but it may not show the
explicit `$1 Service fee — Dollor matchmaking` line. Need to verify the
production app actually surfaces this line.

## Why we didn't capture these in this session

The autonomous XCUITest-with-screenshots approach was attempted in this
session but hit Xcode build-system complications:

1. **Configuration name mismatch** — the project's xcodeproj only defines
   `Debug` and `Release` configurations, not `Development/Staging/Production`.
   The xcconfig files in `apps/ios/Config/` are project-level but the build
   defaulted to Release when `-configuration Development` was passed.

2. **Pod resource copy failure** — `Release-iphonesimulator` build phase
   tried to copy 11 pod bundles from inside `Dollor.app` to a sibling path
   and failed. Likely needs `cd apps/ios/customer && pod install` to refresh
   the Pods project's resource-copy phases.

3. **Test target file membership** — new files added to
   `eatfaircustomerUITests/Flows/` are not automatically picked up by
   `xcodebuild test`; the `.xcodeproj` would need explicit `pbxproj` edits.
   This was caught before time was lost — the file was removed.

The TestHelpers.swift modifications (adding `screenshot(_:)` helper to all
three apps' test helpers) are kept in place — they're zero-cost and useful
for any future XCUITest pass.

## How to refresh the PDF

When new screenshots land in any of the flow folders, just re-run:

```bash
python3 .planning/insurance/2026-06-05/build-pdf.py
```

The build script auto-skips missing files and renders gap pages with the
relevant receipt math from this doc / INSURANCE-RECEIPTS.md.
