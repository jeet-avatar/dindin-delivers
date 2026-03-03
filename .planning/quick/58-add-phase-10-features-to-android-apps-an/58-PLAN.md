---
phase: quick-58
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Android Customer app
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/chat/OrderChatScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/HelpSupportScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/navigation/NavigationGraph.kt
  # Android Driver app
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/deliveries/OrderChatScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/navigation/DriverNavGraph.kt
  # Android Partner app
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/main/MainScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/navigation/PartnerNavGraph.kt
  # Shared API
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt
  # Version bumps
  - /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
autonomous: true
requirements: [SUPPORT-01, SUPPORT-03]

must_haves:
  truths:
    - "Customer Android app has OrderChatScreen accessible from order tracking"
    - "Driver Android app has OrderChatScreen accessible from active delivery"
    - "Customer Android app has LiveChatScreen accessible from Help & Support"
    - "Partner Android app hides AI Features section and AI tab behind BuildConfig flag"
    - "Customer Android app Call Support button dials +18003655671"
    - "All 3 Android apps compile and build release APKs"
    - "All 3 iOS apps archive and upload to TestFlight"
    - "All 3 Android APKs upload to Firebase App Distribution"
  artifacts:
    - path: "app/src/main/java/ai/dollor/customer/ui/chat/OrderChatScreen.kt"
      provides: "Customer order chat UI with quick messages and 3s polling"
    - path: "app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt"
      provides: "AI support live chat UI with suggestions"
    - path: "driver/src/main/java/ai/dollor/driver/ui/deliveries/OrderChatScreen.kt"
      provides: "Driver order chat UI with delivery-specific quick messages"
  key_links:
    - from: "OrderChatScreen (customer)"
      to: "DollorRepository.getOrderChat/sendOrderChat"
      via: "ChatViewModel (existing)"
    - from: "LiveChatScreen"
      to: "/api/support/chat"
      via: "DollorApiService.sendSupportChat"
    - from: "OrderChatScreen (driver)"
      to: "DollorRepository.getDriverOrderChat/sendDriverOrderChat"
      via: "Direct coroutine calls"
---

<objective>
Add Phase 10 features (OrderChatView, LiveChatView, AI hiding, phone fix) to all 3 Android apps for iOS parity, then build and distribute all 6 apps (3 iOS to TestFlight, 3 Android APKs to Firebase).

Purpose: Phase 10 (Automated Support System) was completed for iOS only. Android apps are missing OrderChatView, LiveChatView, AI feature hiding, and the support phone number fix. All 6 apps need to be rebuilt and distributed with these changes.

Output: 3 new Android UI screens, AI feature hiding in Partner app, phone number fix, 6 app builds distributed to TestFlight/Firebase.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/10-automated-support-system/.continue-here.md
@.planning/phases/10-automated-support-system/10-01-SUMMARY.md
@.planning/phases/10-automated-support-system/10-03-SUMMARY.md

# iOS reference files to port from
@apps/ios/customer/eatfaircustomer/Views/OrderChatView.swift
@apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift
@apps/ios/delivery/eatffairdelivery/Views/OrderChatView.swift
@apps/ios/customer/eatfaircustomer/Views/HelpSupportView.swift

# Android existing patterns to follow
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/rideshare/DriverChatScreen.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/chat/ChatViewModel.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/HelpSupportScreen.kt
@/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/RideChatScreen.kt
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/main/MainScreen.kt
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Phase 10 features to all 3 Android apps</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/chat/OrderChatScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/HelpSupportScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/navigation/NavigationGraph.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/deliveries/OrderChatScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/navigation/DriverNavGraph.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/main/MainScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/navigation/PartnerNavGraph.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt
    /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
  </files>
  <action>
    **IMPORTANT: All Android work happens in `/Users/jeet/StudioProjects/eatfair-android/`**

    **A. Shared API layer additions:**

    1. Add `SUPPORT_PHONE` constant to `AppConfig.kt` in the `Legal` object:
       ```kotlin
       const val SUPPORT_PHONE = "+18003655671"
       ```

    2. Add support chat endpoint to `DollorApiService.kt` (after the existing order chat endpoints around line 217):
       ```kotlin
       @POST("support/chat")
       suspend fun sendSupportChat(
           @Body request: SupportChatRequest,
           @Header("Authorization") token: String
       ): SupportChatResponse
       ```
       Also add these data classes in `ApiModels.kt` or inline in the service:
       ```kotlin
       data class SupportChatRequest(val message: String)
       data class SupportChatResponse(val response: String, val session_id: String? = null)
       ```

    3. Add to `DollorRepository.kt` (after the existing chat section):
       ```kotlin
       suspend fun sendSupportChat(message: String): Result<SupportChatResponse> =
           withContext(Dispatchers.IO) {
               val token = secureStorage.getAuthHeader(SecureStorage.UserType.CUSTOMER)
                   ?: return@withContext Result.failure(Exception("Not authenticated"))
               safeApiCall { apiService.sendSupportChat(SupportChatRequest(message), token) }
           }
       ```

    **B. Customer App -- OrderChatScreen:**

    Create `app/src/main/java/ai/dollor/customer/ui/chat/OrderChatScreen.kt`:
    - Port from iOS `OrderChatView.swift` (customer version)
    - Use existing `ChatViewModel` (already has `getOrderChat`/`sendOrderChat` via Hilt)
    - Follow the EXACT same Compose patterns as `DriverChatScreen.kt` (rideshare chat):
      - `@OptIn(ExperimentalMaterial3Api::class)`, Scaffold with TopAppBar
      - LazyColumn for messages, loading/empty/error states
      - Quick messages horizontal row: "Where is my order?", "How long will it take?", "I'm at the door", "Please leave at the door", "Can you call me?", "Thank you!"
      - Input bar with OutlinedTextField + send FilledIconButton
      - Chat bubbles: customer messages on right (blue `Color(0xFF2196F3)`), driver messages on left
    - Accept `orderId: Int`, `driverName: String` parameters, plus `onNavigateBack: () -> Unit`
    - Use `hiltViewModel()` to get `ChatViewModel` (it reads orderId/driverName from SavedStateHandle)

    Add navigation route in `NavigationGraph.kt`:
    - Add `OrderChat` to the `Screen` sealed class:
      ```kotlin
      object OrderChat : Screen("order_chat/{orderId}/{driverName}") {
          fun createRoute(orderId: Int, driverName: String) = "order_chat/$orderId/${java.net.URLEncoder.encode(driverName, "UTF-8")}"
      }
      ```
    - Add composable route in the NavHost (after the existing DriverChat route around line 1136):
      ```kotlin
      composable(
          route = Screen.OrderChat.route,
          arguments = listOf(
              navArgument("orderId") { type = NavType.IntType },
              navArgument("driverName") { type = NavType.StringType }
          )
      ) { backStackEntry ->
          val orderId = backStackEntry.arguments?.getInt("orderId") ?: 0
          val driverName = java.net.URLDecoder.decode(
              backStackEntry.arguments?.getString("driverName") ?: "Driver", "UTF-8"
          )
          OrderChatScreen(onNavigateBack = { navController.navigateUp() })
      }
      ```

    **C. Customer App -- LiveChatScreen:**

    Create `app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt`:
    - Port from iOS `LiveChatView.swift`
    - Simple request/response pattern (no polling), not using a ViewModel -- just local state (same as iOS)
    - Initial greeting message: "Hi! I'm Dollor AI Support. How can I help you today?"
    - Quick suggestion buttons (shown before first user message): "Order status", "Ride issue", "Account help", "Refund request"
    - Suggestion buttons auto-send on tap
    - Chat bubbles: user messages on right (Dollor orange `Color(0xFFF2994A)`), AI messages on left with sparkle icon + "Dollor AI" label
    - Typing indicator (3 animated dots) while waiting for AI response
    - On send: POST to `/api/support/chat` via `DollorRepository.sendSupportChat`, show AI response or fallback error message
    - Input bar at bottom (hidden while loading)
    - Accept `onNavigateBack: () -> Unit` parameter

    **D. Customer App -- Wire HelpSupportScreen:**

    Modify `HelpSupportScreen.kt`:
    - Add `onLiveChat: () -> Unit` parameter (alongside existing `onChatWithUs`)
    - Change the `onChatWithUs` callback to navigate to LiveChatScreen
    - The `onChatWithUs` lambda already exists but is empty in NavigationGraph -- we will wire it there

    Modify `NavigationGraph.kt` at the HelpSupport composable (around line 978):
    - Add `LiveChat` to the `Screen` sealed class: `object LiveChat : Screen("live_chat")`
    - Add composable for LiveChatScreen:
      ```kotlin
      composable(Screen.LiveChat.route) {
          LiveChatScreen(onNavigateBack = { navController.navigateUp() })
      }
      ```
    - Wire `onChatWithUs` to navigate: `onChatWithUs = { navController.navigate(Screen.LiveChat.route) }`
    - Wire `onContactSupport` to open email: `onContactSupport = { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@dollor.ai"))) }`
    - Wire `onCallSupport` to dial phone: `onCallSupport = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${AppConfig.Legal.SUPPORT_PHONE}"))) }`
    - Import `android.content.Intent`, `android.net.Uri`, `ai.dollor.shared.config.AppConfig`
    - NOTE: You need `LocalContext.current` to get the context -- grab it inside the composable before calling HelpSupportScreen

    **E. Driver App -- OrderChatScreen:**

    Create `driver/src/main/java/ai/dollor/driver/ui/deliveries/OrderChatScreen.kt`:
    - Port from iOS `OrderChatView.swift` (driver version)
    - DO NOT use a ViewModel -- use direct coroutine calls to `DollorRepository` (same pattern as `DriverChatScreen.kt` in customer app which uses `CustomerRideshareApiService` directly)
    - Actually, the existing driver `MessagesViewModel` already handles order chat, but it manages its own tab + in-tab chat. For a standalone OrderChatScreen:
      - Accept `orderId: Int`, `customerName: String`, `onNavigateBack: () -> Unit`
      - Use `LaunchedEffect` with `while(true) { delay(3000) }` polling loop, calling `DollorRepository.getDriverOrderChat(orderId)` and `DollorRepository.sendDriverOrderChat(orderId, message)` directly
      - Inject `DollorRepository` via Hilt (`@Inject` in a ViewModel or use `hiltViewModel()`) -- simplest approach: create a minimal `OrderChatViewModel` in the same file using `@HiltViewModel` + `DollorRepository`
    - Quick messages: "On my way!", "Arrived at restaurant", "Picked up your order", "Almost there!", "I'm at the door", "Delivered!"
    - Chat bubbles: driver messages on right (green `Color(0xFF4CAF50)`), customer messages on left
    - Follow `RideChatScreen.kt` patterns exactly for UI structure

    Add navigation route in `DriverNavGraph.kt` (after the ride_chat route around line 305):
    ```kotlin
    composable(
        route = "order_chat/{orderId}/{customerName}",
        arguments = listOf(
            navArgument("orderId") { type = NavType.IntType },
            navArgument("customerName") { type = NavType.StringType }
        )
    ) { backStackEntry ->
        val orderId = backStackEntry.arguments?.getInt("orderId") ?: 0
        val customerName = java.net.URLDecoder.decode(
            backStackEntry.arguments?.getString("customerName") ?: "Customer", "UTF-8"
        )
        ai.dollor.driver.ui.deliveries.OrderChatScreen(
            orderId = orderId,
            customerName = customerName,
            onNavigateBack = { navController.popBackStack() }
        )
    }
    ```

    **F. Partner App -- Hide AI Features:**

    Modify `RestaurantSettingsScreen.kt`:
    - Wrap the entire "AI FEATURES" `item {}` block (lines 418-457) with `if (BuildConfig.ENABLE_AI_EMPLOYEES)`. Since `BuildConfig.ENABLE_AI_EMPLOYEES` won't exist, use a simpler approach: add a companion constant `private const val SHOW_AI_FEATURES = false` at the top of the file, and wrap the AI Features section with `if (SHOW_AI_FEATURES) { ... }`.

    Modify `MainScreen.kt`:
    - The AI tab is index 3 in `bottomNavItems`. Remove the AI tab item from the list (or conditionally include it using the same `SHOW_AI_FEATURES` flag). Simplest: create a `val SHOW_AI_FEATURES = false` constant and filter the bottomNavItems.
    - Update `MainScreen` composable to not accept/use `aiContent` when AI is hidden. Simplest: keep the parameter but adjust the tab indices in the `when` block so Settings becomes index 3 when AI is hidden.
    - Clean approach: filter `bottomNavItems` to exclude AI when flag is false. Adjust the `when(selectedTabIndex)` mapping to use `filteredItems[selectedTabIndex].route` instead of hardcoded indices.

    Modify `PartnerNavGraph.kt`:
    - The AIEmployees route and composable can stay (no harm if unreachable) but the `onAIEmployees` callback in RestaurantSettingsScreen won't be reachable since the AI section is hidden.

    **G. Version bumps:**

    Increment all 3 Android build versions in their `build.gradle.kts` files:
    - Customer: versionCode 28 -> 29, versionName "1.0.27" -> "1.0.28"
    - Driver: versionCode 25 -> 26, versionName "1.0.24" -> "1.0.25"
    - Partner: versionCode 21 -> 22, versionName "1.0.20" -> "1.0.21"

    **H. Verify builds compile:**

    Run from `/Users/jeet/StudioProjects/eatfair-android`:
    ```bash
    ./gradlew :app:assembleDebug :driver:assembleDebug :partner:assembleDebug
    ```
    All 3 must succeed (BUILD SUCCESSFUL). Fix any compilation errors before proceeding.
  </action>
  <verify>
    Run from `/Users/jeet/StudioProjects/eatfair-android`:
    ```
    ./gradlew :app:assembleDebug :driver:assembleDebug :partner:assembleDebug
    ```
    All 3 apps compile without errors. Verify:
    - `grep -rn "OrderChatScreen" app/src/main/java/ai/dollor/customer/ui/chat/` returns the new file
    - `grep -rn "LiveChatScreen" app/src/main/java/ai/dollor/customer/ui/help/` returns the new file
    - `grep -rn "OrderChatScreen" driver/src/main/java/ai/dollor/driver/ui/deliveries/` returns the new file
    - `grep -rn "SHOW_AI_FEATURES" partner/src/main/java/ai/dollor/partner/` shows the flag is false
    - `grep -rn "SUPPORT_PHONE" shared/src/main/java/ai/dollor/shared/config/AppConfig.kt` shows +18003655671
    - `grep -rn "versionCode = 29" app/build.gradle.kts` confirms version bump
  </verify>
  <done>
    All 3 Android apps compile with Phase 10 parity features:
    - Customer OrderChatScreen with quick messages and 3s polling
    - Customer LiveChatScreen connected to /api/support/chat
    - HelpSupportScreen phone/email/chat callbacks all wired
    - Driver OrderChatScreen with delivery-specific quick messages
    - Partner AI Features section and AI tab hidden behind SHOW_AI_FEATURES=false flag
    - All version codes incremented
  </done>
</task>

<task type="auto">
  <name>Task 2: Build and distribute all 6 apps (iOS TestFlight + Android Firebase)</name>
  <files>
    /Users/jeet/doordash-p2p/apps/ios/customer/eatfaircustomer.xcworkspace
    /Users/jeet/doordash-p2p/apps/ios/delivery/eatffairdelivery.xcworkspace
    /Users/jeet/doordash-p2p/apps/ios/restaurant/eatffairrestaurant.xcodeproj
  </files>
  <action>
    **A. Build and upload 3 Android APKs:**

    From `/Users/jeet/StudioProjects/eatfair-android`:

    1. Build all 3 release APKs:
       ```bash
       ./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease
       ```

    2. Upload to Firebase App Distribution:
       ```bash
       firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
         --app "1:65740760476:android:535885ca28086e6242d459" \
         --testers "jeetnair.in@gmail.com" \
         --release-notes "Customer v1.0.28 - Order chat, live AI support chat, phone number fix" \
         --project dollorai-production

       firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
         --app "1:65740760476:android:7d9bed1ee685434c42d459" \
         --testers "jeetnair.in@gmail.com" \
         --release-notes "Driver v1.0.25 - Order chat with customers during delivery" \
         --project dollorai-production

       firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
         --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
         --testers "jeetnair.in@gmail.com" \
         --release-notes "Partner v1.0.21 - AI features hidden, stability improvements" \
         --project dollorai-production
       ```

    **B. Archive and upload 3 iOS apps to TestFlight:**

    From `/Users/jeet/doordash-p2p`:

    **IMPORTANT:** Before archiving, increment iOS build numbers. Check current build numbers:
    - Customer: Build 1102 -> 1103
    - Driver: Build 207 -> 208
    - Restaurant: Build 177 -> 178

    Increment build numbers:
    ```bash
    # Customer
    agvtool -usesvn what-version  # check current
    cd apps/ios/customer && agvtool next-version -all && cd ../../..

    # Driver
    cd apps/ios/delivery && agvtool next-version -all && cd ../../..

    # Restaurant
    cd apps/ios/restaurant && agvtool next-version -all && cd ../../..
    ```

    Alternatively, use `plutil` or `PlistBuddy` to set build numbers directly in Info.plist files if agvtool doesn't work in these project structures.

    1. **Customer App** (archive + upload):
       ```bash
       xcodebuild archive \
         -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
         -scheme eatfaircustomer -configuration Release \
         -archivePath /tmp/dollor-archives/customer.xcarchive \
         -destination 'generic/platform=iOS' -allowProvisioningUpdates

       xcodebuild -exportArchive \
         -archivePath /tmp/dollor-archives/customer.xcarchive \
         -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
         -exportPath /tmp/dollor-ipas/customer \
         -allowProvisioningUpdates \
         -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
         -authenticationKeyID 9K626GB728 \
         -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
       ```

    2. **Driver App** (archive + upload):
       ```bash
       xcodebuild archive \
         -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
         -scheme eatffairdelivery -configuration Release \
         -archivePath /tmp/dollor-archives/driver.xcarchive \
         -destination 'generic/platform=iOS' -allowProvisioningUpdates

       xcodebuild -exportArchive \
         -archivePath /tmp/dollor-archives/driver.xcarchive \
         -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
         -exportPath /tmp/dollor-ipas/driver \
         -allowProvisioningUpdates \
         -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
         -authenticationKeyID 9K626GB728 \
         -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
       ```

    3. **Restaurant App** (archive + upload -- note: may need -project instead of -workspace):
       ```bash
       xcodebuild archive \
         -workspace apps/ios/EatFair.xcworkspace \
         -scheme eatffairrestaurant -configuration Release \
         -archivePath /tmp/dollor-archives/restaurant.xcarchive \
         -destination 'generic/platform=iOS' -allowProvisioningUpdates

       xcodebuild -exportArchive \
         -archivePath /tmp/dollor-archives/restaurant.xcarchive \
         -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
         -exportPath /tmp/dollor-ipas/restaurant \
         -allowProvisioningUpdates \
         -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
         -authenticationKeyID 9K626GB728 \
         -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
       ```

       If `-workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant` fails with "scheme not found", use:
       ```bash
       -project apps/ios/restaurant/eatffairrestaurant.xcodeproj -scheme eatffairrestaurant
       ```

    **C. Update MEMORY.md build versions** after all uploads succeed:
    - iOS Customer: Build 1103
    - iOS Driver: Build 208
    - iOS Restaurant: Build 178
    - Android Customer: vC=29, v1.0.28
    - Android Driver: vC=26, v1.0.25
    - Android Partner: vC=22, v1.0.21
  </action>
  <verify>
    - All 3 Android APKs exist at `{module}/build/outputs/apk/release/{module}-release.apk`
    - Firebase upload output shows "successfully distributed" for all 3 APKs
    - All 3 iOS archives exist at `/tmp/dollor-archives/{name}.xcarchive`
    - All 3 iOS export/uploads complete without error (check for "No errors uploading" in output)
    - MEMORY.md updated with new build versions
  </verify>
  <done>
    All 6 apps built and distributed:
    - 3 Android APKs on Firebase App Distribution (jeetnair.in@gmail.com)
    - 3 iOS builds on TestFlight
    - Build versions updated in MEMORY.md
    - STATE.md updated to reflect Phase 10 Android parity complete
  </done>
</task>

</tasks>

<verification>
1. All 3 Android apps compile: `./gradlew :app:assembleDebug :driver:assembleDebug :partner:assembleDebug` passes
2. Customer OrderChatScreen exists and is routed in NavigationGraph
3. Customer LiveChatScreen exists and is wired from HelpSupportScreen "Chat with Us"
4. Driver OrderChatScreen exists and is routed in DriverNavGraph
5. Partner AI Features section hidden (SHOW_AI_FEATURES = false)
6. Partner AI tab hidden from bottom navigation
7. Customer HelpSupportScreen "Call Support" dials +18003655671
8. All 6 apps distributed (3 Firebase + 3 TestFlight)
</verification>

<success_criteria>
- Phase 10 Android parity achieved: all features from iOS 10-01 and 10-03 ported
- 6 apps built and distributed with incremented version numbers
- MEMORY.md updated with new build versions
- STATE.md updated to reflect completion
</success_criteria>

<output>
After completion, create `.planning/quick/58-add-phase-10-features-to-android-apps-an/58-SUMMARY.md`
</output>
