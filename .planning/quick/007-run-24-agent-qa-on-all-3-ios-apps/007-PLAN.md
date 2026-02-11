---
phase: quick-007
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
read_only: true

must_haves:
  truths:
    - "Error message patterns are documented for all 3 iOS apps"
    - "Logger compliance is verified across Customer, Driver, Restaurant apps"
    - "Driver bid blocking flow is verified working in production"
    - "API contract alignment is checked between iOS and Backend"
  artifacts:
    - path: ".planning/quick/007-run-24-agent-qa-on-all-3-ios-apps/007-REPORT.md"
      provides: "Comprehensive QA findings report"
      contains: "## Executive Summary"
---

<objective>
Run comprehensive 24-agent QA analysis across all 3 iOS apps (Customer, Driver, Restaurant).

Purpose: Verify error message consistency, logger compliance, bid blocking flow, and API contracts across the entire iOS platform after recent updates (Backend v1.0.15, Customer 1060, Driver 168, Restaurant 140).

Output: Consolidated QA report with findings, ratings, and recommendations for QA_KNOWLEDGE_BASE.md updates.
</objective>

<execution_context>
This is a READ-ONLY QA analysis task. No code changes will be made.
</execution_context>

<context>
@.claude/agents/QA_KNOWLEDGE_BASE.md
@.planning/quick/006-driver-app-24-agent-qa/006-REPORT.md

Key Source Files:
- Customer App: /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer/
- Driver App: /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/
- Restaurant App: /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant/
- Shared Module: /Users/jeet/StudioProjects/eatfair-ios/apps/ios/eatfair-ios-shared/
- Backend: /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Cross-App Error Message Consistency Audit</name>
  <files>READ-ONLY analysis across all ViewModels in customer/, delivery/, restaurant/</files>
  <action>
Analyze error message patterns across all 3 iOS apps:

1. **Customer App** (apps/ios/customer/eatfaircustomer/ViewModels/):
   - RideRequestViewModel.swift - 17 errorMessage patterns
   - MultiRestaurantCartViewModel.swift - 7 patterns
   - OrderHistoryViewModel.swift - 9 patterns
   - HomeViewModel.swift - 1 pattern
   - Classify each as: USER-FRIENDLY vs TECHNICAL

2. **Driver App** (apps/ios/delivery/eatffairdelivery/ViewModels/):
   - RideBiddingViewModel.swift - 14 patterns
   - DeliveryViewModel.swift - 16 patterns
   - EarningsViewModel.swift - 3 patterns
   - DriverProfileViewModel.swift - 4 raw error.localizedDescription (known issue)

3. **Restaurant App** (apps/ios/restaurant/eatffairrestaurant/ViewModels/):
   - OrdersViewModel.swift - 24+ patterns
   - AnalyticsViewModel.swift - 1 pattern
   - AIInsightsViewModel.swift - 2 patterns

Create error message consistency matrix:
| App | Total Patterns | User-Friendly | Technical | Rating |
Document any inconsistencies between apps (e.g., same operation uses different message styles)
  </action>
  <verify>
Count error patterns: grep -r "errorMessage\|showError" each app's ViewModels
Verify patterns follow "Action: Reason" or "Reason + Suggestion" format
  </verify>
  <done>Error message audit table with per-app ratings and cross-app consistency score</done>
</task>

<task type="auto">
  <name>Task 2: Logger Compliance and print() Audit</name>
  <files>READ-ONLY analysis of all Swift files</files>
  <action>
Verify os.Logger pattern compliance:

1. **Expected Logger Pattern**:
```swift
import os
private let logger = Logger(subsystem: "com.dollorai.{app}", category: "{FileName}")
```

2. **Audit Each App**:

   **Customer App** (com.dollorai.customer):
   - 26 files with proper Logger declarations found
   - Check for any files using print() instead
   - Verify subsystem consistency

   **Driver App** (com.dollorai.delivery):
   - 11 files with Logger declarations
   - Known: 19 print() statements in 3 files (DeliveryViewModel, DriverStatsCard, OrderMapDetailView)
   - Verify all ViewModels have Logger

   **Restaurant App** (com.dollorai.restaurant):
   - 12 files with Logger declarations (100% compliance previously verified)
   - 0 print() statements (clean)

3. **Subsystem Consistency Check**:
   - Customer: "com.dollorai.customer" (some files use "ai.dollor.customer")
   - Driver: "com.dollorai.delivery" (some use Bundle.main.bundleIdentifier)
   - Restaurant: "com.dollorai.restaurant" (consistent)
   - Shared: Mix of "ai.dollor.shared" and "com.dollorai.shared"

Document any inconsistencies in subsystem naming
  </action>
  <verify>
grep -r "os\.Logger\|import os" each app
grep -r "print\(" each app (count by file)
grep -r "Logger(subsystem" to verify naming patterns
  </verify>
  <done>Logger compliance table with subsystem consistency assessment</done>
</task>

<task type="auto">
  <name>Task 3: API Contract and Bid Blocking Verification</name>
  <files>READ-ONLY analysis of P2PAPIService.swift, bid_routes.py, ViewModels</files>
  <action>
Verify API contracts and critical flows:

1. **Bid Blocking Flow (CRITICAL)**:
   - Backend (bid_routes.py lines 702-719): Returns "active ride" or "active delivery" in error
   - Driver iOS (RideBiddingViewModel.swift lines 200-205): Smart detection with .contains()
   - Driver iOS (AvailableRideRequestsView.swift): Smart alerts with "View Active Work" navigation

   Verify error message chain:
   Backend HTTP 400 -> P2PAPIService -> RideBiddingViewModel -> UI Alert

2. **Key API Contracts**:
   Check P2PAPIService.swift for these critical response structures:
   - FareNegotiationResponse: must have platform_fee_driver, platform_fee_customer
   - CustomerRideBidsResponse: must have request_id, bids, total_bids, bidding_open
   - AcceptedDriverInfo: must have vehicle_photo_url, license_plate, rating
   - Driver Dashboard: nested today/this_week/this_month structure

3. **Cross-Platform Endpoint Alignment**:
   | Operation | iOS Endpoint | Verified |
   |-----------|--------------|----------|
   | Create Order | /api/erp/orders/create | Check |
   | Customer Login | /api/auth/customer/login | Check |
   | Driver Login | /api/auth/driver/login | Check |
   | Vendor Login | /api/auth/vendor/login | Check |
   | Submit Bid | /api/rides/request/{id}/bid | Check |
   | Mark Delivered | /api/erp/orders/{id}/mark-delivered | Check |

4. **Backend Version Check**:
   curl https://api.dollor.ai/health to verify 1.0.15 deployed
  </action>
  <verify>
Trace bid blocking error from backend to iOS UI
Verify FareNegotiationResponse struct matches backend JSON
Check health endpoint for version 1.0.15
  </verify>
  <done>API contract verification table with bid blocking flow diagram</done>
</task>

</tasks>

<verification>
All 3 tasks completed with:
- [ ] Error message consistency matrix created
- [ ] Logger compliance percentages calculated
- [ ] API contract verification completed
- [ ] Bid blocking flow traced end-to-end
- [ ] Findings written to 007-REPORT.md
</verification>

<success_criteria>
1. Error message audit covers 100% of ViewModels across all 3 apps
2. Logger compliance verified with subsystem consistency assessment
3. Bid blocking flow confirmed working (Backend -> iOS chain)
4. API contracts verified against QA_KNOWLEDGE_BASE.md
5. Report suitable for updating QA_KNOWLEDGE_BASE.md with new findings
</success_criteria>

<output>
After completion, create:
`.planning/quick/007-run-24-agent-qa-on-all-3-ios-apps/007-REPORT.md`

Report structure:
```markdown
# Cross-Platform iOS QA Report
**Date**: 2026-02-10
**Apps**: Customer (1060), Driver (168), Restaurant (140)
**Backend**: 1.0.15

## Executive Summary
[Overall rating, key findings, blockers]

## 1. Error Message Consistency
[Per-app tables, cross-app consistency score]

## 2. Logger Compliance
[Per-app compliance, subsystem consistency]

## 3. API Contract Verification
[Endpoint alignment, bid blocking flow]

## 4. Recommendations for QA_KNOWLEDGE_BASE.md
[Updates needed]
```
</output>
