---
phase: quick-238
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [BUG-01, BUG-02, BUG-03, BUG-04, BUG-05]
must_haves:
  truths:
    - "BUG-01 is closed: complete_delivery() shadow removed — local function is named complete_delivery_v2"
    - "BUG-02 is closed: onCallPartner launches ACTION_DIAL intent in NavigationGraph.kt"
    - "BUG-03 is closed: onAddInstructions no-op removed — UI row is display-only, no empty clickable"
    - "BUG-04 is closed: OrderHistoryView.swift has .refreshable modifier"
    - "BUG-05 is closed: DeliveryTrackingView.swift has Chat button presenting OrderChatView"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "complete_delivery_v2 — no shadow of order_flow import"
      contains: "def complete_delivery_v2"
    - path: "apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift"
      provides: "pull-to-refresh on orders list"
      contains: ".refreshable"
    - path: "apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift"
      provides: "Chat button to OrderChatView during active delivery"
      contains: "OrderChatView"
  key_links:
    - from: "NavigationGraph.kt:336"
      to: "tel:$phone via Intent.ACTION_DIAL"
      via: "context.startActivity(intent)"
      pattern: "ACTION_DIAL"
    - from: "DeliveryTrackingView.swift"
      to: "OrderChatView"
      via: ".sheet(isPresented: $showChat)"
      pattern: "showChat"
---

<objective>
Verify and document closure of BUG-01 through BUG-05 from the Quick-103 UI audit (ISSUE_TRACKER.md).

Purpose: A pre-flight grep audit revealed all 5 bugs are already fixed in current source. This plan confirms each fix with grep proof and produces a SUMMARY documenting the closed state.

Output: Grep verification report for all 5 bugs + SUMMARY.md confirming closure.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/104-detailed-fix-plan-for-23-ui-audit-issues/ISSUE_TRACKER.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify all 5 bugs are closed with grep proof</name>
  <files>.planning/quick/238-fix-bug-01-through-bug-05-from-issue-tra/238-SUMMARY.md</files>
  <action>
    Pre-flight grep during planning confirmed all 5 bugs are already closed in current source. Run the following verification commands to confirm, then write the SUMMARY.

    Create CR ticket before starting:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Quick-238: Verify BUG-01 through BUG-05 closure from UI audit",
        "description": "Grep verification that all 5 UI audit bugs are already fixed in current source. No code changes expected.",
        "change_type": "docs",
        "priority": "Low",
        "requested_by": "support@dollor.ai"
      }'
    ```
    Submit the CR, then run verifications:

    BUG-01 — Backend function shadow (main_new.py):
    ```bash
    grep -n "def complete_delivery" /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/main_new.py
    # Expected: only "def complete_delivery_v2" — no plain "def complete_delivery"
    # The import at line ~15696 is the order_flow import (not a local def)
    ```

    BUG-02 — Android onCallPartner dial Intent (NavigationGraph.kt):
    ```bash
    grep -n "ACTION_DIAL\|onCallPartner" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/navigation/NavigationGraph.kt
    # Expected: ACTION_DIAL present inside onCallPartner lambda
    ```

    BUG-03 — Android onAddInstructions no-op removed (OrderTrackingScreen.kt + NavigationGraph.kt):
    ```bash
    grep -n "onAddInstructions" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt
    grep -n "onAddInstructions" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/navigation/NavigationGraph.kt
    # Expected: "onAddInstructions" appears in NavigationGraph (empty lambda comment is fine — UI is display-only)
    # The OrderTrackingScreen.kt no longer has onAddInstructions in its fun signature (removed)
    ```

    BUG-04 — iOS pull-to-refresh on OrderHistoryView.swift:
    ```bash
    grep -n "refreshable" /Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift
    # Expected: .refreshable present at line ~50
    ```

    BUG-05 — iOS Chat button on DeliveryTrackingView.swift:
    ```bash
    grep -n "showChat\|OrderChatView\|message.fill" /Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift
    # Expected: showChat state, OrderChatView sheet, message.fill icon all present
    ```

    After all greps confirm, write .planning/quick/238-fix-bug-01-through-bug-05-from-issue-tra/238-SUMMARY.md with:
    - Status: ALL CLOSED
    - Per-bug: file:line grep proof
    - Note which bugs were closed in prior sessions (not this task)
    - No code changes made — verification only

    Transition CR to Verified status after summary is written.
  </action>
  <verify>
    All 5 grep commands return matches:
    - `def complete_delivery_v2` exists, no plain `def complete_delivery` in main_new.py
    - `ACTION_DIAL` present in NavigationGraph.kt onCallPartner block
    - `onAddInstructions` in NavigationGraph.kt has empty/comment body (UI display-only in OrderTrackingScreen)
    - `.refreshable` present in OrderHistoryView.swift
    - `OrderChatView` + `showChat` present in DeliveryTrackingView.swift

    SUMMARY.md written to .planning/quick/238-fix-bug-01-through-bug-05-from-issue-tra/238-SUMMARY.md
  </verify>
  <done>
    238-SUMMARY.md documents all 5 bugs as closed with file:line grep proof. No code changes needed — all fixes were applied in prior sessions.
  </done>
</task>

</tasks>

<verification>
```bash
# BUG-01
grep -n "def complete_delivery" /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/main_new.py
# Must show only complete_delivery_v2

# BUG-02
grep -n "ACTION_DIAL" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/navigation/NavigationGraph.kt
# Must show dial intent present

# BUG-03
grep -n "onAddInstructions" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt
# Must show removed from composable signature

# BUG-04
grep -n "refreshable" /Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift
# Must show .refreshable modifier

# BUG-05
grep -n "OrderChatView\|showChat" /Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift
# Must show chat integration
```
</verification>

<success_criteria>
All 5 bugs from ISSUE_TRACKER.md Wave 1-3 confirmed closed:
- BUG-01: complete_delivery shadow eliminated (renamed to complete_delivery_v2)
- BUG-02: onCallPartner launches phone dialer
- BUG-03: onAddInstructions empty lambda removed, UI row display-only
- BUG-04: OrderHistoryView has .refreshable
- BUG-05: DeliveryTrackingView has Chat button presenting OrderChatView
</success_criteria>

<output>
After completion, create `.planning/quick/238-fix-bug-01-through-bug-05-from-issue-tra/238-SUMMARY.md`
</output>
