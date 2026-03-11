---
phase: quick-150
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # GAP 1
  - apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift
  - apps/ios/restaurant/eatffairrestaurant/ViewModels/PromotionsViewModel.swift
  # GAP 2
  - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedMenuView.swift
  # GAP 3
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  # GAP 4
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantDocumentsView.swift
  # GAP 5 (same file as GAP 3)
  # GAP 6
  - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
  # GAP 7
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/checkout/V3CheckoutScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/checkout/MultiRestaurantCheckoutScreen.kt
autonomous: false
requirements: [GAP-1, GAP-2, GAP-3, GAP-4, GAP-5, GAP-6, GAP-7]

must_haves:
  truths:
    - "Vendor can list, create, edit, delete, and toggle promotions from iOS Restaurant app"
    - "New menu items added in iOS Restaurant sync to P2P backend (not just Firebase)"
    - "Deleted menu items removed from P2P backend (not just Firebase)"
    - "Operating hours saved from iOS Restaurant persist to P2P backend"
    - "Document upload UI shows clear progress, status badges, and proper layout"
    - "Notification settings persist across app restarts (UserDefaults)"
    - "pending_delivery_proof status renders correctly in dashboard"
    - "Android checkout validates promo codes via backend API, not hardcoded values"
  artifacts:
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift"
      provides: "Full promotions CRUD UI with tabs, create form, edit, delete, toggle, AI suggestions, quick-create"
      min_lines: 400
    - path: "apps/ios/restaurant/eatffairrestaurant/ViewModels/PromotionsViewModel.swift"
      provides: "ViewModel calling all P2PAPIService promotion methods"
      min_lines: 100
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/EnhancedMenuView.swift"
      provides: "addItem and deleteItem now call P2P API before Firebase"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
      provides: "Operating hours save to P2P via PATCH /api/vendors/{id}, notification settings persist to UserDefaults"
  key_links:
    - from: "PromotionsViewModel.swift"
      to: "P2PAPIService"
      via: "createPromotion, getVendorPromotions, updatePromotion, deletePromotion, getPromotionSuggestions, quickCreatePromotion, getPromotionAnalytics"
      pattern: "P2PAPIService\\.shared\\."
    - from: "EnhancedMenuView.swift addItem"
      to: "P2PAPIService.createMenuItem"
      via: "P2P API call before Firebase write"
      pattern: "createMenuItem"
    - from: "EnhancedMenuView.swift deleteItem"
      to: "P2PAPIService.deleteMenuItem"
      via: "P2P API call before Firebase delete"
      pattern: "deleteMenuItem"
    - from: "RestaurantSettingsView.swift saveOperatingHours"
      to: "PATCH /api/vendors/{id}"
      via: "URLRequest PATCH with operating_hours field"
      pattern: "operating.hours"
    - from: "V3CheckoutScreen.kt"
      to: "DollorApiService.applyPromoCode"
      via: "Repository call replacing hardcoded WELCOME50/FLAT5"
      pattern: "applyPromoCode"
---

<objective>
Close 7 gaps identified in iOS Restaurant app audit (Quick-148) and Promotions audit (Quick-149).

Purpose: Bring iOS Restaurant app to feature parity with Android Partner for promotions, fix data sync gaps (menu add/delete, operating hours), improve document upload UI, persist notification settings, and fix Android checkout hardcoded promo codes.

Output: Updated iOS Restaurant app + Android Customer app, ready for TestFlight/Firebase upload.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/148-enterprise-level-audit-of-ios-restaurant/RESTAURANT_APP_AUDIT.md
@.planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 295-460 for createMenuItem/deleteMenuItem, lines 635-999 for promotion methods)
@apps/ios/restaurant/eatffairrestaurant/Views/EnhancedMenuView.swift
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantDocumentsView.swift
@apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
@apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1 (GAP 1): Build PromotionsView.swift + PromotionsViewModel.swift with full CRUD</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/PromotionsView.swift
    apps/ios/restaurant/eatffairrestaurant/ViewModels/PromotionsViewModel.swift
    apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
  </files>
  <action>
    **PromotionsViewModel.swift** (~150 lines):
    - `@Published var promotions: [P2PPromotion] = []`
    - `@Published var suggestions: [P2PPromotionSuggestion] = []`
    - `@Published var analytics: P2PPromotionAnalytics?`
    - `@Published var isLoading = false`, `@Published var error: String?`
    - `@Published var filterTab: PromotionFilter = .all` (enum: all, active, inactive)
    - `var filteredPromotions: [P2PPromotion]` computed property filtering by status
    - `fetchPromotions()` -- calls `P2PAPIService.shared.getVendorPromotions(vendorId:)`
    - `createPromotion(_ data: P2PPromotionCreate)` -- calls `P2PAPIService.shared.createPromotion(data:)`
    - `updatePromotion(id:, updates:)` -- calls `P2PAPIService.shared.updatePromotion(promotionId:updates:)`
    - `deletePromotion(id:)` -- calls `P2PAPIService.shared.deletePromotion(promotionId:)`
    - `togglePromotion(_ promo: P2PPromotion)` -- calls updatePromotion with status toggle (active<->paused)
    - `fetchSuggestions()` -- calls `P2PAPIService.shared.getPromotionSuggestions(vendorId:)`
    - `quickCreate(type:)` -- calls `P2PAPIService.shared.quickCreatePromotion(vendorId:promoType:)`
    - `fetchAnalytics()` -- calls `P2PAPIService.shared.getPromotionAnalytics(vendorId:)`
    - Get vendorId from `P2PAPIService.shared.currentVendorId` (same pattern as OrdersViewModel)

    **PromotionsView.swift** (~500 lines):
    Reference Android Partner's PromotionsScreen.kt (tabs, stats, cards) and CreatePromotionScreen.kt (form).

    Main structure:
    1. **PromotionsView** (list view):
       - Stats summary bar: total promos, active count, total redemptions
       - Picker/segmented control for filter tabs: Active / Inactive / All
       - List of PromotionCard views
       - FAB or toolbar button "+" to create new promotion
       - Pull-to-refresh
       - Empty state when no promotions

    2. **PromotionCard** subview:
       - Promotion name, code (copyable), type badge (percentage/flat/free_delivery/etc)
       - Usage progress: "X/Y redeemed" with ProgressView
       - Date range (start_date - end_date)
       - Min order amount if set
       - Action buttons: Toggle (Pause/Activate), Edit, Delete (with confirmation alert)

    3. **CreatePromotionSheet** (modal sheet):
       - Form fields matching Android CreatePromotionScreen:
         - Promotion code (auto-generated or custom)
         - Title/name
         - Description
         - Discount type picker: Percentage, Flat Amount, Free Delivery
         - Discount value (number field)
         - Min order amount (optional)
         - Max discount cap (for percentage, optional)
         - Usage limit (optional)
         - Start date picker
         - End date picker
       - Preview section showing how promo will look
       - Save button calling viewModel.createPromotion()
       - Also used for EDIT mode (pre-fill fields from existing promo)

    4. **AI Suggestions section** (collapsible):
       - Fetch on appear via viewModel.fetchSuggestions()
       - Show each suggestion with: type, name, description, expected_impact
       - "Use This" button that pre-fills CreatePromotionSheet

    5. **Quick Create section** (horizontal scroll of template buttons):
       - 5 templates: Happy Hour, Lunch Special, First Order, Free Delivery, Weekend
       - Each taps viewModel.quickCreate(type:) directly
       - Shows success toast on creation

    **EnhancedDashboardView.swift** update:
    - Add a new tab (Tag 5) for Promotions between AI (tag 3) and Settings (tag 4)
    - OR replace AI tab position -- user decides. Recommendation: add as Tag 5, shift Settings to Tag 5->6. Actually, keep 5 tabs and replace the AI tab (tag 3) content with a combined AI+Promotions view, OR add Promotions as a section within Settings.
    - RECOMMENDED: Add "Promotions" as Tab 3 (before AI Insights at Tab 4), shift AI to 4, Settings to 5. That gives: Orders(0), Menu(1), Analytics(2), Promotions(3), AI(4), Settings(5). But 6 tabs is a lot for iOS tab bar.
    - BETTER: Keep 5 tabs. Add Promotions as a NavigationLink inside Settings tab (like KOT Settings and Documents). This matches the pattern already used.
    - Add `NavigationLink(destination: PromotionsView()) { Label("Promotions", systemImage: "tag.fill") }` in the Settings view business section, right after the profile section.

    Use `import EatFairShared` for P2PAPIService access. Follow existing app patterns: `@StateObject` for view model, `Task { }` for async loading on appear, `.alert` for errors, `.sheet` for modals.
  </action>
  <verify>
    Build the iOS Restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Verify: Build succeeds with 0 errors. PromotionsView.swift and PromotionsViewModel.swift exist and are non-empty.
  </verify>
  <done>
    PromotionsView renders with list/create/edit/delete/toggle/suggestions/quick-create. PromotionsViewModel calls all 7 P2PAPIService promotion methods. Navigation to PromotionsView accessible from Settings tab.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 1</name>
  <what-built>Full Promotions CRUD (PromotionsView + PromotionsViewModel) added to iOS Restaurant app with list, create, edit, delete, toggle, AI suggestions, and quick-create templates.</what-built>
  <how-to-verify>
    1. Open iOS Restaurant app in Simulator
    2. Navigate to Settings tab
    3. Tap "Promotions" link
    4. Verify: Promotions list view loads (may be empty if no promos exist for test vendor)
    5. Tap "+" to open create promotion sheet
    6. Verify: Form has all fields (code, title, type picker, value, dates, etc.)
    7. Check AI suggestions section is visible
    8. Check quick-create template buttons are visible
    9. Approve to proceed to GAP 2, or describe issues
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to GAP 2, or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 3 (GAP 2): Fix menu addItem/deleteItem to sync with P2P backend</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/EnhancedMenuView.swift
  </files>
  <action>
    **P2PAPIService methods already exist:**
    - `createMenuItem(vendorId:menuItem:completion:)` at P2PAPIService.swift:299 -- POST /api/vendors/{vendor_id}/menu
    - `deleteMenuItem(vendorId:itemId:completion:)` at P2PAPIService.swift:417 -- DELETE /api/vendors/{vendor_id}/menu/{item_id}

    **Backend endpoints exist:**
    - `POST /api/vendors/{vendor_id}/menu` at main_new.py:13489 (create_menu_item)
    - `DELETE /api/vendors/{vendor_id}/menu/{item_id}` at main_new.py:13693 (delete_menu_item)

    **Fix addItem (EnhancedMenuView.swift:876):**
    Current code writes to Firebase Firestore only. Change to:
    1. Build a `P2PMenuItemCreate` struct from the form data (name, description, price, category, image_url)
    2. Call `P2PAPIService.shared.createMenuItem(vendorId: vendorId, menuItem: itemData)` FIRST
    3. On P2P success, ALSO write to Firebase as backup (keep existing Firebase write for dual-write consistency)
    4. On P2P failure, show error alert but still write to Firebase as fallback (with a warning log)
    5. Refresh menu items after creation

    Need to check what `P2PMenuItemCreate` struct expects. Read P2PAPIService.swift around line 8687 for the model definition. The struct likely has: name, description, price, category, image_url, is_available, customization_groups.

    **Fix deleteItem (EnhancedMenuView.swift:1040):**
    Current code deletes from Firebase Firestore only. Change to:
    1. Call `P2PAPIService.shared.deleteMenuItem(vendorId: vendorId, itemId: Int(itemId)!)` FIRST
    2. On P2P success, ALSO delete from Firebase as backup
    3. On P2P failure, show error but still delete from Firebase as fallback
    4. Refresh menu items after deletion

    The item ID from P2P is an Int. Firebase uses String document IDs. The existing menu items fetched from P2P should have an `id` field. When deleting, use the P2P integer ID for the API call and the Firebase document ID for Firestore deletion.

    Get vendorId from `P2PAPIService.shared.currentVendorId` (same pattern used elsewhere in the file at line 759).
  </action>
  <verify>
    Build the iOS Restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Verify: Build succeeds. grep for `createMenuItem` and `deleteMenuItem` in EnhancedMenuView.swift to confirm P2P calls are present.
  </verify>
  <done>
    addItem calls P2PAPIService.createMenuItem before Firebase write. deleteItem calls P2PAPIService.deleteMenuItem before Firebase delete. Both fall back to Firebase-only on P2P failure.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 2</name>
  <what-built>Menu addItem and deleteItem now sync to P2P backend first, then Firebase as backup.</what-built>
  <how-to-verify>
    1. Code review: check EnhancedMenuView.swift addItem function calls createMenuItem
    2. Code review: check EnhancedMenuView.swift deleteItem function calls deleteMenuItem
    3. Confirm build succeeds
    4. Approve to proceed to GAP 3
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to GAP 3, or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 5 (GAP 3): Fix operating hours to save to P2P backend</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  </files>
  <action>
    **Backend endpoint exists:**
    - `PATCH /api/vendors/{vendor_id}` at main_new.py:10823 (patch_vendor)
    - Accepts `VendorSettingsUpdate` which includes `operating_hours: Optional[str]` (main_new.py:10817)
    - Also accepts `notification_preferences: Optional[dict]` (main_new.py:10818)
    - Requires `require_vendor` auth (vendorToken)

    **P2PAPIService may not have a patchVendor method.** Check if it exists. If not, create a simple inline URLRequest in the view (or add a helper). Actually, the simplest approach:

    **Fix saveOperatingHours (RestaurantSettingsView.swift:837):**
    Current code: writes operating hours dict to Firebase `restaurants/{id}` document.

    After the existing Firebase write, add a P2P API call:
    1. Build the operating hours as a single string (e.g., "Mon: 9:00 AM - 9:00 PM, Tue: 9:00 AM - 9:00 PM, ...") -- the backend stores `operating_hours` as a single `Optional[str]`
    2. Create a URLRequest to `PATCH {baseURL}/vendors/{vendorId}` with JSON body: `{"operating_hours": "<string>"}`
    3. Set `Content-Type: application/json` and `Authorization: Bearer {vendorToken}`
    4. Fire the request. On success, log. On failure, log warning (Firebase is already saved as backup).

    Use `P2PAPIService.shared.baseURL` and `P2PAPIService.shared.vendorToken` for the request.
    Use `P2PAPIService.shared.secureSession` if accessible, otherwise use `URLSession.shared` (SSL pinning is on shared already per the security setup).

    Format the hours string to match what the backend returns in vendor profile (e.g., "Mon-Fri: 11:00 AM - 9:00 PM, Sat-Sun: 12:00 PM - 8:00 PM" or per-day format). Look at how the existing `saveOperatingHours` structures the data for Firebase and convert to a string representation.
  </action>
  <verify>
    Build the iOS Restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Verify: grep for `operating_hours` or `PATCH` or `/vendors/` in RestaurantSettingsView.swift saveOperatingHours function.
  </verify>
  <done>
    saveOperatingHours writes to both Firebase AND P2P backend via PATCH /api/vendors/{id}. Operating hours persist across profile fetches from P2P.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 3</name>
  <what-built>Operating hours now save to P2P backend in addition to Firebase.</what-built>
  <how-to-verify>
    1. Code review: saveOperatingHours sends PATCH to /api/vendors/{id} with operating_hours
    2. Confirm build succeeds
    3. Approve to proceed to GAP 4
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to GAP 4, or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 7 (GAP 4): Improve document upload UI</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/RestaurantDocumentsView.swift
  </files>
  <action>
    The document upload already goes to P2P backend (getVendorDocuments + uploadVendorDocument are wired). The issue is UI quality. Audit the current RestaurantDocumentsView.swift and improve:

    1. **Progress header**: Make the completion percentage more prominent with a circular progress indicator (like a ring/gauge) instead of just text. Use `ProgressView(value:)` with `.progressViewStyle(.circular)` or a custom ZStack with Circle + trim.

    2. **Document cards**: Improve each card with:
       - Clear status badge with color coding: Required (gray), Uploaded - Pending (orange), Verified (green), Rejected (red)
       - Use SF Symbols: `checkmark.seal.fill` (verified), `clock.fill` (pending), `xmark.circle.fill` (rejected), `doc.fill` (required)
       - Thumbnail preview of uploaded document (if image data is available)
       - Upload date display
       - Better tap target for upload action

    3. **Upload progress**: Show a `ProgressView` during upload with percentage if possible, or at minimum an indeterminate spinner with "Uploading..." text overlay on the card.

    4. **Status banner**: Make approval status banner more visually distinct:
       - Approved: green background with checkmark
       - Pending Review: orange/amber with clock icon
       - Rejected: red with message about what to fix
       - Not Submitted: neutral with call-to-action

    5. **Submit button**: Make "Submit for Review" button more prominent (full-width, themed color).

    6. **Layout polish**: Add proper padding, card shadows (`.shadow(color: .black.opacity(0.05), radius: 4, y: 2)`), rounded corners, consistent spacing.

    Keep all existing P2P API integration intact. This is UI-only improvement.
  </action>
  <verify>
    Build the iOS Restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Verify: Build succeeds. RestaurantDocumentsView.swift has improved UI elements.
  </verify>
  <done>
    Document upload UI has clear status badges, better progress indicators, improved layout with cards/shadows, and prominent submit button.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 4</name>
  <what-built>Improved document upload UI with status badges, progress indicators, and better layout.</what-built>
  <how-to-verify>
    1. Open iOS Restaurant app in Simulator
    2. Navigate to Settings > Documents
    3. Verify: Cards have clear status badges with color coding
    4. Verify: Progress header is more prominent
    5. Verify: Overall layout looks polished
    6. Approve to proceed to GAP 5
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to GAP 5, or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 9 (GAP 5): Persist notification settings to UserDefaults</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  </files>
  <action>
    **Current state (RestaurantSettingsView.swift:1120-1168):**
    NotificationSettingsView has 3 toggles as `@State` variables:
    - Order alerts
    - Prep reminders
    - Promotional emails/updates
    These reset on app restart because they're just `@State`.

    **Fix: Use @AppStorage instead of @State.**

    Replace:
    ```swift
    @State private var orderAlerts = true
    @State private var prepReminders = true
    @State private var promotionalEmails = false
    ```
    With:
    ```swift
    @AppStorage("notification_orderAlerts") private var orderAlerts = true
    @AppStorage("notification_prepReminders") private var prepReminders = true
    @AppStorage("notification_promotionalEmails") private var promotionalEmails = false
    ```

    `@AppStorage` automatically reads/writes UserDefaults and persists across restarts. This is the simplest, most robust fix.

    **Bonus**: Also save to P2P backend if the PATCH endpoint supports it. The `VendorSettingsUpdate` model at main_new.py:10818 has `notification_preferences: Optional[dict]`. So after toggling, also send:
    ```
    PATCH /api/vendors/{vendorId}
    {"notification_preferences": {"order_alerts": true, "prep_reminders": true, "promotional_emails": false}}
    ```
    This ensures settings sync across devices. But @AppStorage is the primary fix for persistence.
  </action>
  <verify>
    Build the iOS Restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Verify: grep for `@AppStorage` in RestaurantSettingsView.swift to confirm persistence.
  </verify>
  <done>
    Notification settings use @AppStorage for UserDefaults persistence. Toggles survive app restart. Optionally also synced to P2P backend via PATCH.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 5</name>
  <what-built>Notification settings now persist via @AppStorage (UserDefaults) and optionally sync to P2P backend.</what-built>
  <how-to-verify>
    1. Code review: @AppStorage replaces @State for notification toggles
    2. Confirm build succeeds
    3. Approve to proceed to GAP 6
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to GAP 6, or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 11 (GAP 6): Verify pending_delivery_proof status flow is complete</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
    apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
  </files>
  <action>
    Per the description, this is partially fixed already (commit 7eb12513):
    - P2PAPIService.swift maps "pending_delivery_proof" correctly
    - EnhancedDashboardView has Phase C section for this status
    - OrdersViewModel includes it in deliveringOrders filter

    **Verify the fix is complete by reading the current code:**
    1. Check OrdersViewModel.swift -- confirm `pending_delivery_proof` is in the `deliveringOrders` computed property filter
    2. Check EnhancedDashboardView.swift -- confirm there's a card/section rendering for `pending_delivery_proof` status with appropriate action (upload proof photo button)
    3. Check the order card renders correctly for this status: should show "Upload Delivery Proof" button that triggers the RestaurantDeliveryProofSheet

    **If anything is missing**, add it. The flow should be:
    - Order with status `pending_delivery_proof` appears in "Delivering" tab
    - Card shows "Upload Proof Photo" button
    - Tapping opens camera via RestaurantDeliveryProofSheet
    - After upload, status transitions to `delivered`

    **If everything is already wired**, this task just confirms with a build. No changes needed if the code is already correct.

    Also check that the modified files from the git status (OrdersViewModel.swift and EnhancedDashboardView.swift are both shown as modified in working tree) contain these changes.
  </action>
  <verify>
    Build the iOS Restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Grep for `pending_delivery_proof` in both OrdersViewModel.swift and EnhancedDashboardView.swift to confirm presence.
  </verify>
  <done>
    pending_delivery_proof status renders in Delivering tab with Upload Proof Photo action button. Complete flow from pending_delivery_proof -> camera -> upload -> delivered is wired.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 6</name>
  <what-built>Verified pending_delivery_proof status flow is complete in dashboard and orders view model.</what-built>
  <how-to-verify>
    1. Code review: pending_delivery_proof in OrdersViewModel deliveringOrders filter
    2. Code review: EnhancedDashboardView renders card for this status
    3. Confirm build succeeds
    4. Approve to proceed to GAP 7
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to GAP 7, or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 13 (GAP 7): Fix Android checkout hardcoded promo codes</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/checkout/V3CheckoutScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/checkout/MultiRestaurantCheckoutScreen.kt
  </files>
  <action>
    **V3CheckoutScreen.kt (lines 295-304):**
    Current hardcoded logic:
    ```kotlin
    if (promoCode == "WELCOME50" || promoCode == "FLAT5") {
        isPromoApplied = true
        promoDiscount = if (promoCode == "FLAT5") 5.0 else subtotal * 0.5
        if (promoDiscount > 15.0) promoDiscount = 15.0
    } else {
        showPromoError = true
    }
    ```

    Replace with API call to `/api/promotions/apply`:
    1. The API method already exists: `DollorApiService.applyPromoCode(request: ApplyPromoCodeRequest)` at DollorApiService.kt:438-442
    2. Models exist: `ApplyPromoCodeRequest` and `ApplyPromoCodeResponse` at ApiModels.kt:1832-1841
    3. Need to check if `DollorRepository` has a wrapper. If not, call the API service via the ViewModel.

    Replace the hardcoded block with:
    ```kotlin
    // Call backend to validate promo code
    scope.launch {
        try {
            isPromoLoading = true
            val response = repository.applyPromoCode(
                ApplyPromoCodeRequest(
                    promo_code = promoCode,
                    order_total = subtotal,
                    vendor_id = vendorId  // if available in scope
                )
            )
            if (response.valid) {
                isPromoApplied = true
                promoDiscount = response.discount_amount
                appliedPromoCode = promoCode
            } else {
                showPromoError = true
                promoErrorMessage = response.message ?: "Invalid promo code"
            }
        } catch (e: Exception) {
            showPromoError = true
            promoErrorMessage = "Failed to validate promo code"
        } finally {
            isPromoLoading = false
        }
    }
    ```

    Check `ApplyPromoCodeResponse` fields -- it should have: `valid: Boolean`, `discount_amount: Double`, `message: String?`, etc. Verify against the backend response at promotions.py:518-623.

    If repository doesn't have `applyPromoCode()`, add it:
    ```kotlin
    suspend fun applyPromoCode(request: ApplyPromoCodeRequest): ApplyPromoCodeResponse {
        return apiService.applyPromoCode(request)
    }
    ```

    Need to figure out how the ViewModel/Repository is accessed in V3CheckoutScreen. Look at how other API calls are made in that file (likely via a ViewModel parameter or hiltViewModel()).

    **MultiRestaurantCheckoutScreen.kt (line 63):**
    Current: `val discount = if (promoApplied) minOf(subtotal * 0.15, 10.0) else 0.0`
    This hardcodes 15% up to $10. Replace with actual discount from API response.

    The flow should be:
    1. Add `var promoDiscount by remember { mutableStateOf(0.0) }`
    2. When "Apply" is tapped, call the same `applyPromoCode()` API
    3. On success, set `promoApplied = true` and `promoDiscount = response.discount_amount`
    4. Replace line 63 with: `val discount = if (promoApplied) promoDiscount else 0.0`

    **Important:** The `/api/promotions/apply` endpoint is PUBLIC (in auth allowlist at main_new.py:311) so no auth token needed. But it still expects a POST body with `promo_code`, `order_total`, and optionally `vendor_id`.
  </action>
  <verify>
    Build the Android Customer app:
    ```bash
    cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleDebug 2>&1 | tail -5
    ```
    Verify: Build succeeds. grep for "WELCOME50" in V3CheckoutScreen.kt should return NO matches (hardcoded codes removed). grep for "applyPromoCode" should return matches.
  </verify>
  <done>
    V3CheckoutScreen validates promo codes via /api/promotions/apply API instead of hardcoded WELCOME50/FLAT5. MultiRestaurantCheckoutScreen uses actual discount amount from API instead of hardcoded 15%. All vendor-created promotions now work on Android checkout.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>USER APPROVAL GATE after GAP 7</name>
  <what-built>Android checkout now validates promo codes via backend API instead of hardcoded values.</what-built>
  <how-to-verify>
    1. Code review: V3CheckoutScreen.kt calls applyPromoCode API
    2. Code review: MultiRestaurantCheckoutScreen.kt uses API discount, not hardcoded 15%
    3. Confirm Android build succeeds
    4. Approve to proceed to final build + upload step
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to build + upload, or describe issues</resume-signal>
</task>

</tasks>

<verification>
After all 7 gaps are closed:
1. iOS Restaurant app builds without errors
2. Android Customer app builds without errors
3. All 7 gap fixes are committed atomically (one commit per gap, with CR tickets)
4. PromotionsView exists with full CRUD
5. Menu add/delete syncs to P2P
6. Operating hours save to P2P
7. Document UI is improved
8. Notification settings persist
9. pending_delivery_proof flow is complete
10. Android promo codes use API validation
</verification>

<success_criteria>
- iOS Restaurant app builds and runs with all 7 fixes
- Android Customer app builds with promo code API fix
- Each gap has its own atomic commit with CR ticket ID
- User approved each step before proceeding to next
- Ready for TestFlight upload (iOS) and Firebase distribution (Android)
</success_criteria>

<output>
After completion, create `.planning/quick/150-ios-restaurant-app-gap-closure-promotion/150-SUMMARY.md`
</output>
