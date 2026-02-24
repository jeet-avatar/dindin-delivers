---
phase: quick-33
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md
autonomous: true
requirements: [QUICK-33]

must_haves:
  truths:
    - "Every tappable/clickable UI element across all 6 apps is catalogued"
    - "Each element has source file:line, screen context, label, and destination"
    - "Report is organized by app and flow (auth, nav, rideshare, food, settings)"
  artifacts:
    - path: ".planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md"
      provides: "Comprehensive UI interaction inventory across all 6 apps"
      contains: "## iOS Customer App"
  key_links: []
---

<objective>
Audit every call-to-action and interactive UI element across all 6 Dollor.ai apps (3 iOS + 3 Android). Produce a comprehensive inventory document cataloguing every button, swipe gesture, navigation trigger, tab switch, screen transition, toggle, and tappable element.

Purpose: Create a complete map of user-facing interactions for QA coverage, accessibility audit, and feature completeness tracking.
Output: Single markdown report at `.planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md`
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
iOS source: /Users/jeet/doordash-p2p/apps/ios/
  - customer/eatfaircustomer/Views/ (48 View files)
  - delivery/eatffairdelivery/Views/ + root views (20 files)
  - restaurant/eatffairrestaurant/Views/ (14 files)

Android source: /Users/jeet/StudioProjects/eatfair-android/
  - app/src/main/java/ai/dollor/customer/ui/ (~60 Screen files)
  - driver/src/main/java/ai/dollor/driver/ui/ (18 files)
  - partner/src/main/java/ai/dollor/partner/ui/ (34 files)

Patterns to search for:
- iOS (SwiftUI): Button, NavigationLink, .onTapGesture, .swipeActions, TabView, .sheet, .fullScreenCover, .alert, Toggle, .contextMenu, .navigationDestination, toolbar items
- Android (Jetpack Compose): Button, IconButton, TextButton, OutlinedButton, FloatingActionButton, onClick, clickable, Modifier.clickable, NavigationBar, Tab, Switch, DropdownMenuItem, ModalBottomSheet, navController.navigate
</patterns>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Audit all 3 iOS apps (Customer, Driver, Restaurant)</name>
  <files>.planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md</files>
  <action>
Scan every Swift View file in all 3 iOS apps. For each interactive element found, record:
- Element type (Button, NavigationLink, .onTapGesture, Toggle, .sheet trigger, .swipeActions, TabView tab, toolbar button, .alert action, .contextMenu item, .fullScreenCover trigger, .confirmationDialog action)
- Label/text (the user-visible string or SF Symbol name)
- Source file:line number
- Screen name (which View struct it's in)
- Action/destination (what it triggers — function call, navigation, sheet, API call)

Search patterns (grep in Swift files):
- `Button(` or `Button {` — standard buttons
- `NavigationLink` — navigation triggers
- `.onTapGesture` — tap handlers on non-button views
- `.swipeActions` — swipe gestures on list items
- `TabView` + `.tag(` — tab switches
- `.sheet(` / `.fullScreenCover(` — modal presentations
- `.alert(` / `.confirmationDialog(` — dialog actions
- `Toggle(` — toggle switches
- `.contextMenu` — long-press menus
- `.toolbar {` + `ToolbarItem` — toolbar buttons
- `Link(` — external URL links
- `Menu {` — dropdown menus

Process app by app:
1. iOS Customer: `/Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer/` — all Views/*.swift + ContentView.swift + MainAppView
2. iOS Driver: `/Users/jeet/doordash-p2p/apps/ios/delivery/eatffairdelivery/` — all Views/*.swift + Views/Rideshare/*.swift + DriverDashboardView + DriverLoginView
3. iOS Restaurant: `/Users/jeet/doordash-p2p/apps/ios/restaurant/eatffairrestaurant/` — all Views/*.swift + ContentView.swift

Organize output by app, then by flow:
- Auth (login, register, forgot password, legal acceptance)
- Main Navigation (tabs, sidebar, main screen)
- Food Delivery (browse, search, restaurant detail, menu, cart, checkout, tracking, order history)
- Rideshare (ride request, bidding, active ride, chat, receipt, recurring, dispute, tip, rate)
- Profile/Settings (profile, edit, addresses, payment methods, notifications, help, refer)

Write the iOS section of UI_INTERACTION_AUDIT.md with a table per flow per app:
| # | Element Type | Label/Text | File:Line | Screen | Action/Destination |
  </action>
  <verify>
Grep for `Button` across all iOS View files and compare count against audit entries to ensure completeness.
Run: `grep -rn "Button" /Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer/Views/ | wc -l` and verify the audit captures a reasonable proportion (not all grep hits are interactive elements, but counts should be in same order of magnitude).
  </verify>
  <done>iOS section of UI_INTERACTION_AUDIT.md contains every interactive element from all 3 iOS apps, organized by app and flow, with file:line references for each.</done>
</task>

<task type="auto">
  <name>Task 2: Audit all 3 Android apps (Customer, Driver, Partner)</name>
  <files>.planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md</files>
  <action>
Scan every Kotlin Screen/Activity file in all 3 Android apps. For each interactive element found, record:
- Element type (Button, IconButton, TextButton, OutlinedButton, FloatingActionButton, ExtendedFloatingActionButton, clickable Modifier, Switch, Checkbox, Tab, DropdownMenuItem, ModalBottomSheet action, AlertDialog action, Card with onClick, Row/Column with clickable)
- Label/text (the user-visible string or icon description)
- Source file:line number
- Screen name (which @Composable function it's in)
- Action/destination (what it triggers — navController.navigate, viewModel call, API call, dialog, bottom sheet)

Search patterns (grep in Kotlin files):
- `Button(` — standard buttons
- `IconButton(` — icon-only buttons
- `TextButton(` — text buttons
- `OutlinedButton(` — outlined buttons
- `FloatingActionButton(` / `ExtendedFloatingActionButton(` — FABs
- `Modifier.clickable` / `.clickable {` — clickable modifiers
- `navController.navigate(` — navigation calls (to find what triggers them)
- `Switch(` — toggle switches
- `Checkbox(` — checkboxes
- `Tab(` / `NavigationBarItem(` — tab/nav items
- `DropdownMenuItem(` — dropdown items
- `AlertDialog(` + `confirmButton` / `dismissButton` — dialog actions
- `ModalBottomSheet` — bottom sheet triggers
- `SwipeToDismiss` / `SwipeableActionsBox` — swipe actions

Process app by app:
1. Android Customer: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/` — all Screen.kt files + MainActivity.kt
2. Android Driver: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/` — all Screen.kt files + MainActivity.kt
3. Android Partner: `/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/` — all Screen.kt files + MainActivity.kt

Also check navigation graph files:
- `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/navigation/` (if exists)
- Same pattern for driver and partner modules

Organize output by app, then by flow (same categories as iOS task).

Append the Android section to UI_INTERACTION_AUDIT.md with same table format:
| # | Element Type | Label/Text | File:Line | Screen | Action/Destination |
  </action>
  <verify>
Grep for `Button(` across all Android Screen files and compare count against audit entries.
Run: `grep -rn "Button(" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/ | wc -l` and verify proportional coverage.
  </verify>
  <done>Android section of UI_INTERACTION_AUDIT.md contains every interactive element from all 3 Android apps, organized by app and flow, with file:line references for each.</done>
</task>

<task type="auto">
  <name>Task 3: Generate summary statistics and cross-platform comparison</name>
  <files>.planning/quick/33-comprehensive-ui-interaction-audit-acros/UI_INTERACTION_AUDIT.md</files>
  <action>
Add a summary section to the top of UI_INTERACTION_AUDIT.md with:

1. **Total counts per app:**
   | App | Buttons | Nav Links | Toggles | Swipe Actions | Tabs | Sheets/Dialogs | Other | TOTAL |
   For all 6 apps.

2. **Cross-platform comparison:**
   For each major flow (auth, food delivery, rideshare, settings), compare iOS vs Android:
   - Feature parity: Does the same interaction exist on both platforms?
   - Missing interactions: Elements present in one platform but not the other
   - Naming differences: Same action but different label text

3. **Flow coverage matrix:**
   | Flow | iOS Customer | Android Customer | iOS Driver | Android Driver | iOS Restaurant | Android Partner |
   With checkmarks for which flows are implemented in which app.

4. **Grand total:** Total interactive elements across all 6 apps.

Place this summary at the TOP of the document before the per-app detailed sections.
  </action>
  <verify>Verify the summary totals match the sum of per-app section entries.</verify>
  <done>UI_INTERACTION_AUDIT.md has a summary section with total counts, cross-platform comparison, flow coverage matrix, and grand total. The report is complete and ready for use.</done>
</task>

</tasks>

<verification>
- UI_INTERACTION_AUDIT.md exists and contains sections for all 6 apps
- Every entry has file:line reference, element type, label, screen, and action
- Summary statistics at top with totals and cross-platform comparison
- No hallucinated entries — every file:line reference is verifiable
</verification>

<success_criteria>
- Complete inventory of every interactive UI element across all 6 apps
- Organized by app and user flow for easy navigation
- Cross-platform comparison identifying feature parity gaps
- Total count of all call-to-action elements with breakdown by type
</success_criteria>

<output>
After completion, create `.planning/quick/33-comprehensive-ui-interaction-audit-acros/33-SUMMARY.md`
</output>
