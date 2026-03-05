---
phase: quick-100
plan: 100
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/profile/ProfileScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
autonomous: true
requirements: []

must_haves:
  truths:
    - "Customer can open order chat with driver during active delivery"
    - "Driver can open order chat with customer during active delivery"
    - "Customer can open Live Chat from Help screen"
    - "Partner AI features are hidden (SHOW_AI_FEATURES=false)"
    - "All 3 apps use correct support phone +18003655671"
    - "Driver and Partner help/support sections show phone number option"
  artifacts:
    - path: "app/src/main/java/ai/dollor/customer/ui/chat/OrderChatScreen.kt"
      provides: "Customer order chat UI"
    - path: "app/src/main/java/ai/dollor/customer/ui/chat/ChatViewModel.kt"
      provides: "Customer chat polling + send logic"
    - path: "driver/src/main/java/ai/dollor/driver/ui/deliveries/OrderChatScreen.kt"
      provides: "Driver order chat UI + ViewModel"
    - path: "app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt"
      provides: "Customer live support chat"
    - path: "partner/src/main/java/ai/dollor/partner/ui/main/MainScreen.kt"
      provides: "Partner AI tab hidden via SHOW_AI_FEATURES"
    - path: "partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt"
      provides: "Partner AI settings hidden via SHOW_AI_FEATURES"
  key_links:
    - from: "Customer NavigationGraph"
      to: "OrderChatScreen + LiveChatScreen"
      via: "Screen.OrderChat and Screen.LiveChat routes"
    - from: "Driver DriverNavGraph"
      to: "OrderChatScreen"
      via: "order_chat route"
    - from: "LiveChatViewModel"
      to: "/api/support/chat"
      via: "DollorRepository.sendSupportChat()"
---

<objective>
Verify and complete Phase 10 Android parity -- ensure OrderChatScreen (Customer + Driver), LiveChatScreen (Customer), AI feature hiding (Partner), and support phone number are fully wired in all 3 Android apps.

Purpose: Quick-58 already added all Phase 10 screens. This task audits for gaps, adds missing support phone to Driver and Partner help/support sections, and verifies all 3 apps compile.

Output: All 3 Android apps have full Phase 10 parity with iOS, all compile successfully.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Quick-58 (commit 030c8aac) already added:
- OrderChatScreen to Customer app (app/src/main/java/ai/dollor/customer/ui/chat/)
- OrderChatScreen to Driver app (driver/src/main/java/ai/dollor/driver/ui/deliveries/)
- LiveChatScreen to Customer app (app/src/main/java/ai/dollor/customer/ui/help/)
- SHOW_AI_FEATURES=false in Partner MainScreen + RestaurantSettingsScreen
- Support phone in AppConfig.Legal.SUPPORT_PHONE = "+18003655671"
- Navigation routes wired for all screens

GAP FOUND: Driver ProfileScreen Help section (line 726) only shows email (support@dollor.ai), no phone call option.
GAP FOUND: Partner RestaurantSettingsScreen Contact Support (line 476) only opens email, no phone call option.
Both should match iOS pattern of offering phone call via AppConfig.Legal.SUPPORT_PHONE.

Android repo: /Users/jeet/StudioProjects/eatfair-android
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add support phone to Driver and Partner help sections + verify all Phase 10 features compile</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/profile/ProfileScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
  </files>
  <action>
1. **Driver ProfileScreen** (`driver/.../ui/profile/ProfileScreen.kt` around line 720-734):
   - The "Help & Support" section currently only shows email. Add a "Call Support" option below it that dials `tel:${AppConfig.Legal.SUPPORT_PHONE}` (import `ai.dollor.shared.config.AppConfig`).
   - Add a new `ProfileMenuItem` with icon `Icons.Default.Phone`, title "Call Support", subtitle "+1-800-365-5671", onClick opens `ACTION_DIAL` intent with `tel:+18003655671`.

2. **Partner RestaurantSettingsScreen** (`partner/.../ui/settings/RestaurantSettingsScreen.kt` around line 474-478):
   - The "Contact Support" NavigationRow currently calls `sendSupportEmail()`. Add a new `NavigationRow` below it with icon `Icons.Default.Phone`, title "Call Support", that dials `tel:${AppConfig.Legal.SUPPORT_PHONE}` (import `ai.dollor.shared.config.AppConfig`). Use same `context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${AppConfig.Legal.SUPPORT_PHONE}")))` pattern as Customer app.

3. **Verify compilation** of all 3 apps:
   - `./gradlew :app:assembleDebug` (Customer)
   - `./gradlew :driver:assembleDebug` (Driver)
   - `./gradlew :partner:assembleDebug` (Partner)
   All must BUILD SUCCEEDED with no errors.

4. **Audit checklist** (verify these exist, do NOT recreate):
   - Customer OrderChatScreen: `app/.../ui/chat/OrderChatScreen.kt` + `ChatViewModel.kt` exist and are wired in `NavigationGraph.kt` via `Screen.OrderChat`
   - Driver OrderChatScreen: `driver/.../ui/deliveries/OrderChatScreen.kt` exists and is wired in `DriverNavGraph.kt`
   - Customer LiveChatScreen: `app/.../ui/help/LiveChatScreen.kt` exists and is wired in `NavigationGraph.kt` via `Screen.LiveChat`
   - Customer Help screen `onChatWithUs` navigates to `Screen.LiveChat.route`
   - Customer Help screen `onCallSupport` uses `AppConfig.Legal.SUPPORT_PHONE`
   - Partner `SHOW_AI_FEATURES = false` in both `MainScreen.kt` and `RestaurantSettingsScreen.kt`
   - Shared `DollorRepository` has `sendSupportChat()`, `getOrderChat()`, `sendOrderChat()`, `getDriverOrderChat()`, `sendDriverOrderChat()`
  </action>
  <verify>
    All 3 apps compile: `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleDebug :driver:assembleDebug :partner:assembleDebug`
    grep confirms phone wiring: `grep -n "SUPPORT_PHONE\|AppConfig.Legal" driver/src/main/java/ai/dollor/driver/ui/profile/ProfileScreen.kt partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt`
  </verify>
  <done>
    All 3 Android apps compile with Phase 10 features: OrderChatScreen (Customer+Driver), LiveChatScreen (Customer), AI hiding (Partner), support phone (all 3 apps). Driver and Partner help sections now include "Call Support" option using +18003655671.
  </done>
</task>

</tasks>

<verification>
- All 3 apps compile (`assembleDebug` passes)
- `grep -rn "SHOW_AI_FEATURES" partner/` confirms `false` in both files
- `grep -rn "SUPPORT_PHONE" shared/ app/ driver/ partner/` confirms phone used across all apps
- `grep -rn "OrderChatScreen\|LiveChatScreen" app/ driver/` confirms screens exist and are referenced in navigation
- `grep -rn "sendSupportChat\|getOrderChat" shared/` confirms API methods exist in shared repository
</verification>

<success_criteria>
- All 3 Android apps compile without errors
- Driver ProfileScreen has "Call Support" with +18003655671
- Partner RestaurantSettingsScreen has "Call Support" with +18003655671
- Full Phase 10 iOS-Android parity confirmed via audit checklist
</success_criteria>

<output>
After completion, create `.planning/quick/100-phase-10-android-parity-orderchatscreen-/100-SUMMARY.md`
</output>
