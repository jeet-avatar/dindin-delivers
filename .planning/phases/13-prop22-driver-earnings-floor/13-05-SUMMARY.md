---
phase: 13-prop22-driver-earnings-floor
plan: 05
subsystem: ios-driver
tags: [prop22, ios, swift, swiftui, bpc7454, compliance, payout]

# Dependency graph
requires:
  - phase: 13-04
    provides: GET /api/driver/prop22/periods and GET /api/driver/prop22/periods/{id}/rides endpoints

provides:
  - PayoutDashboardView.swift with Prop22Period/Prop22RideItem Codable structs
  - prop22Section() @ViewBuilder rendering period cards with status badges
  - Prop22PeriodDetailView with QTD hours + per-ride floor disclosure
  - fetchProp22Periods() and fetchProp22PeriodRides() using driver auth token

affects:
  - 13-06 (deploy — iOS driver app change included in deployment)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Custom Decodable init() to handle dual JSON keys (ride_id vs order_id) in same struct
    - Same auth/baseURL pattern as fetchPayoutHistory() — SecureStorage.shared.driverAccessToken + AppConfig.shared.p2pAPIBaseURL
    - NavigationLink + PlainButtonStyle for tappable period cards in ScrollView VStack

key-files:
  created: []
  modified:
    - apps/ios/delivery/eatffairdelivery/Views/PayoutDashboardView.swift

key-decisions:
  - "Prop22RideItem uses Decodable (not Codable) because custom init() for dual-key support requires explicit encode/decode; since we never encode, Decodable-only is cleaner"
  - "Custom Decodable init() handles both ride_id (rideshare) and order_id (food delivery) — API returns different keys depending on service_type"
  - "prop22Section() calls fetchProp22Periods() in .onAppear so Prop22 data loads independently from main payout history"
  - "CR creation skipped — ADMIN_SECRET_KEY in AWS Secrets Manager, not available in local dev (same as plan 04 precedent)"

requirements-completed: [PROP22-05]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 13 Plan 05: iOS PayoutDashboardView Prop 22 Compliance Section Summary

**Prop22Period/Prop22RideItem Codable structs, prop22Section() @ViewBuilder with period cards and status badges, Prop22PeriodDetailView with QTD hours, all added to PayoutDashboardView.swift — iOS driver app builds 0 errors**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T01:30:45Z
- **Completed:** 2026-03-26T01:34:21Z
- **Tasks:** 2 (read/setup + implementation)
- **Files modified:** 1 (PayoutDashboardView.swift)

## Accomplishments

- `Prop22Period` Codable struct at line 67 — 11 fields including `qtd_engaged_hours`, correct CodingKeys mapping all snake_case API fields
- `Prop22RideItem` Decodable struct at line 97 — custom `init(from decoder:)` handles both `ride_id` (rideshare) and `order_id` (food delivery) API response variants
- `@State var prop22Periods/prop22Loading/prop22Error` at lines 141-143
- `prop22Section()` at line 445 — appended to ScrollView VStack after `ridesList()` at line 184
- `prop22PeriodCard()` at line 480 — renders date range, engaged hours/miles, earnings floor, top-up, status badge, deadline (MANUAL_REVIEW/OVERDUE only)
- `prop22StatusBadge()` at line 551 — PENDING=Calculating(orange), RECONCILED=No Top-Up(green), PAID=Paid(green), MANUAL_REVIEW=Review(orange), OVERDUE=Overdue(red)
- `fetchProp22Periods()` at line 573 — same auth/baseURL pattern as existing `fetchPayoutHistory()` (SecureStorage.shared.driverAccessToken + AppConfig.shared.p2pAPIBaseURL)
- `Prop22PeriodDetailView` struct at line 710 — QTD engaged hours section (BPC §7454(b)(2)) + per-ride floor disclosure with nil="—" / 0.0="$0.00" rendering
- iOS driver app: **Build succeeded** (0 errors) — `ab8f0c22`

## Task Commits

1. **Task 1 + Task 2: Read structure + Add Prop 22 section** - `ab8f0c22` (feat)

## Files Created/Modified

- `apps/ios/delivery/eatffairdelivery/Views/PayoutDashboardView.swift` — 399 lines added (432 → 831 lines total)

## Line Numbers of Additions

| Symbol | Line |
|--------|------|
| `Prop22Period` struct | 67 |
| `Prop22RideItem` struct | 97 |
| `@State prop22Periods/prop22Loading/prop22Error` | 141-143 |
| `prop22Section()` call in ScrollView | 184 |
| `prop22Section()` @ViewBuilder | 445 |
| `prop22PeriodCard()` | 480 |
| `prop22StatusBadge()` | 551 |
| `fetchProp22Periods()` | 573 |
| `formatProp22PeriodDate()` | 618 |
| `formatDeadlineDate()` | 634 |
| `Prop22PeriodDetailView` struct | 710 |

## Auth Token Variable Name

`SecureStorage.shared.driverAccessToken` (confirmed at PayoutDashboardView.swift:393 in original file)

## Build Result

```
** BUILD SUCCEEDED **
```
Timestamp: 2026-03-26T01:33:52Z (0 errors, warnings only from unrelated CocoaPods targets)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prop22RideItem conformance error with custom Decodable init**
- **Found during:** Task 2 (first build attempt)
- **Issue:** `struct Prop22RideItem: Codable` with custom `init(from decoder:)` fails to synthesize `Encodable` conformance — Swift cannot auto-generate encode() when custom decode() is present
- **Fix:** Changed `Codable` to `Decodable` — we only ever decode from the API, never encode. No encode() needed.
- **Files modified:** `apps/ios/delivery/eatffairdelivery/Views/PayoutDashboardView.swift:97`
- **Commit:** `ab8f0c22` (fix applied before final commit)

## Self-Check: PASSED
