---
phase: quick
plan: 006
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/006-driver-app-24-agent-qa/QA_KNOWLEDGE_BASE.md
  - .planning/quick/006-driver-app-24-agent-qa/006-REPORT.md
autonomous: true

must_haves:
  truths:
    - "All error messages in Driver app are user-friendly and consistent"
    - "Driver bid blocking flow correctly handles busy states with clear messaging"
    - "Logger usage follows proper os.Logger pattern across all ViewModels"
    - "iOS API calls match backend endpoint expectations"
  artifacts:
    - path: ".planning/quick/006-driver-app-24-agent-qa/QA_KNOWLEDGE_BASE.md"
      provides: "Accumulated QA findings and patterns for future reference"
      min_lines: 100
    - path: ".planning/quick/006-driver-app-24-agent-qa/006-REPORT.md"
      provides: "Complete QA analysis report with findings and recommendations"
      min_lines: 150
  key_links:
    - from: "RideBiddingViewModel.swift"
      to: "Backend /api/rides/*/bids endpoint"
      via: "P2PAPIService.submitRideBid"
      pattern: "active ride|active delivery"
    - from: "DeliveryViewModel.swift"
      to: "Backend /api/delivery-orders endpoint"
      via: "P2PAPIService.acceptDeliveryOrder"
      pattern: "acceptDeliveryOrder"
---

<objective>
Run comprehensive 24-agent QA analysis on iOS Driver app focusing on error consistency, bid blocking flow, logger fixes, and API contract alignment.

Purpose: Identify quality issues before they impact production drivers, document findings for knowledge retention.
Output: QA_KNOWLEDGE_BASE.md with accumulated patterns, 006-REPORT.md with complete analysis.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Driver App Files (key sources):
- /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/DriverDashboardView.swift
- /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
- /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/ViewModels/RideBiddingViewModel.swift
- /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/Views/MyDeliveriesView.swift
- /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/Views/AvailableOrdersView.swift
- /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: Error Message Consistency Audit</name>
  <files>
    - /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/ViewModels/*.swift
    - /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/Views/**/*.swift
  </files>
  <action>
    Scan ALL Swift files in the Driver app for error message patterns:

    1. Search for error message assignments:
       - `errorMessage =` patterns
       - `showErrorMessage(` calls
       - `.alert(` modifiers
       - `Text(viewModel.errorMessage` bindings

    2. Categorize error messages:
       - USER-FRIENDLY: Clear action + reason (e.g., "Failed to accept order: Network unavailable")
       - TECHNICAL: Contains code/developer language (e.g., "Error: \(error.localizedDescription)")
       - GENERIC: Unhelpful messages (e.g., "Something went wrong")

    3. Check consistency patterns:
       - Do all error messages follow same format? (Action: Reason)
       - Are there duplicate/similar messages that could be consolidated?
       - Do all ViewModels use the same error presentation pattern?

    4. Verify error handling completeness:
       - Are all API failure cases showing errors to user?
       - Are there silent failures (catch blocks without user notification)?

    Document findings with file:line references and severity ratings.
  </action>
  <verify>
    Run grep search: `grep -rn "errorMessage\|showError\|\.alert" apps/ios/delivery/eatffairdelivery/`
    Verify all patterns documented in report.
  </verify>
  <done>
    Complete error message inventory with categorization, consistency rating, and specific improvement recommendations.
  </done>
</task>

<task type="auto">
  <name>Task 2: Driver Bid Blocking Flow Verification</name>
  <files>
    - /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/ViewModels/RideBiddingViewModel.swift
    - /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift
  </files>
  <action>
    Verify the driver bid blocking flow at RideBiddingViewModel.swift lines 197-208:

    1. Trace the flow:
       - submitBid() called -> P2PAPIService.submitRideBid() -> backend response
       - On failure: Check if error contains "active ride" or "active delivery"
       - If blocking error: Show backend message directly (user-friendly)
       - If other error: Wrap with "Failed to submit bid: {message}"

    2. Verify RideshareDashboardView.swift smart alert handling:
       - hasActiveRide computed property checks for "active ride"
       - hasActiveDelivery computed property checks for "active delivery"
       - isBlockingError combines both checks
       - alertTitle provides context-aware title
       - Alert shows "View Active Work" button for blocking errors

    3. Validate the user experience:
       - When driver has active ride: Alert title = "Complete Active Ride First"
       - When driver has active delivery: Alert title = "Complete Delivery First"
       - Tapping "View Active Work" navigates to Active tab

    4. Check for edge cases:
       - What if backend returns different message format?
       - What if error contains both "active ride" and "active delivery"?
       - Is the navigation to Active tab working correctly?

    Document the complete flow with code references.
  </action>
  <verify>
    Read RideBiddingViewModel.swift lines 186-210 and RideshareDashboardView.swift lines 153-180.
    Confirm blocking error detection and smart alert flow are correct.
  </verify>
  <done>
    Complete flow documentation with verification that:
    - Backend error messages pass through correctly
    - Smart alert titles are accurate
    - "View Active Work" navigation works
    - Edge cases handled appropriately
  </done>
</task>

<task type="auto">
  <name>Task 3: Logger Pattern Audit and API Contract Check</name>
  <files>
    - /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/eatffairdelivery/**/*.swift
  </files>
  <action>
    Part A - Logger Pattern Audit:

    1. Scan for logger declarations:
       - `private let logger = Logger(subsystem:` (CORRECT pattern)
       - `import os` at top of file (REQUIRED for os.Logger)
       - `print(` statements (SHOULD be replaced with logger)

    2. Verify logger usage consistency:
       - All ViewModels should use os.Logger
       - Subsystem should be "com.dollorai.delivery"
       - Category should match class name
       - Debug logs wrapped in `#if DEBUG` blocks

    3. Document any files still using print() statements

    Part B - API Contract Alignment:

    1. List all P2PAPIService method calls in Driver app:
       - fetchAvailableDeliveryOrders
       - fetchMyDeliveries
       - acceptDeliveryOrder
       - markOrderPickedUp
       - completeDelivery
       - fetchAvailableRideRequests
       - submitRideBid
       - withdrawBid
       - respondToCounterOffer
       - startRide
       - completeRideRequest

    2. For each call, verify:
       - Parameter names match backend expectations
       - Response handling matches expected format
       - Error messages are properly extracted from backend response

    3. Flag any potential mismatches or deprecated endpoints.

    Create comprehensive audit tables for both parts.
  </action>
  <verify>
    Run: `grep -rn "Logger\|print(" apps/ios/delivery/eatffairdelivery/ | head -50`
    Run: `grep -rn "p2pService\." apps/ios/delivery/eatffairdelivery/ | head -50`
    Verify all findings documented.
  </verify>
  <done>
    Complete logger audit table showing compliance status per file.
    Complete API contract table showing alignment status per endpoint.
    Any issues flagged with severity and recommended fixes.
  </done>
</task>

</tasks>

<verification>
- QA_KNOWLEDGE_BASE.md exists with accumulated patterns
- 006-REPORT.md exists with complete analysis
- All 4 focus areas covered:
  1. Error message consistency - inventory and recommendations
  2. Bid blocking flow - verified and documented
  3. Logger fixes - audit complete with compliance status
  4. API contract alignment - all endpoints checked
</verification>

<success_criteria>
- Error message audit identifies any inconsistencies or technical messages
- Bid blocking flow at RideBiddingViewModel.swift:197-208 verified working
- Logger pattern compliance documented for all ViewModels
- API contract alignment confirmed or mismatches flagged
- Findings documented in QA_KNOWLEDGE_BASE.md for future sessions
- Comprehensive 006-REPORT.md generated
</success_criteria>

<output>
After completion, create:
1. `.planning/quick/006-driver-app-24-agent-qa/QA_KNOWLEDGE_BASE.md` - Accumulated QA patterns and findings
2. `.planning/quick/006-driver-app-24-agent-qa/006-REPORT.md` - Complete QA analysis report
3. `.planning/quick/006-driver-app-24-agent-qa/006-SUMMARY.md` - Per template summary
</output>
