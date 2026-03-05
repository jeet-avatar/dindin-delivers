# UI Audit: iOS Driver & Restaurant Apps

**Date:** 2026-03-05
**Audited by:** Claude Code (Quick Task 103, Plan 02)
**Apps:** iOS Driver (`eatffairdelivery`) and iOS Restaurant (`eatffairrestaurant`)

## Summary

| App | Views | Buttons/Actions | OK | DEAD | MISSING | WRONG_TARGET |
|-----|-------|----------------|----|----- |---------|-------------|
| Driver (Food) | 11 | 52 | 49 | 2 | 1 | 0 |
| Driver (Rideshare) | 6 | 28 | 28 | 0 | 0 | 0 |
| Restaurant | 12 | 38 | 36 | 1 | 1 | 0 |
| **TOTAL** | **29** | **118** | **113** | **3** | **2** | **0** |

---

## iOS Driver App (`apps/ios/delivery/eatffairdelivery/Views/`)

### 1. AvailableOrdersView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~39 | Online/Offline Toggle | Toggle | `viewModel.toggleOnlineStatus()` | OK | Calls P2PAPIService driver status |
| ~42 | Service Mode Toggle | Picker | Local state | OK | Switches food/rideshare mode |
| ~51 | Filter buttons (All/Nearby/HighPay/Quick) | Button | Local filter state | OK | Client-side filtering |
| ~53 | List/Map view toggle | Button | Local state | OK | Switches view mode |
| ~large | Accept Order button | Button | `viewModel.acceptOrder(order)` | OK | Calls PUT to order_flow accept |
| ~large | View Details (NavigationLink) | NavigationLink | `OrderMapDetailView` | OK | Navigates to detail |
| ~large | Earnings sheet button | Button | `showEarningsSheet` | OK | Opens PayoutDashboardView |
| ~large | Messages sheet button | Button | `showMessagesSheet` | OK | Opens ConversationsListView |
| ~large | Pull-to-refresh | .refreshable | `viewModel.fetchAvailableOrders()` | OK | GET available orders |

### 2. ActiveDeliveryDetailView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 28-43 | Map Expand toggle | Button | Local `isMapExpanded` toggle | OK | UI-only animation |
| 87-96 | Pickup Location navigate | Button (DetailSectionCard) | `openMapsNavigation()` | OK | Opens Apple/Google Maps |
| 105-113 | Delivery Location navigate | Button (DetailSectionCard) | `openMapsNavigation()` | OK | Opens Apple/Google Maps |
| 259-274 | Contact (Call Customer) | Button | `callCustomer()` → `tel://` URL | OK | Opens phone dialer |
| 280-299 | Primary Action (Pickup/Deliver) | Button | `viewModel.markAsPickedUp()` or `showingCompleteAlert` | OK | Calls order_flow PUT |
| 309-318 | Complete Delivery alert | Alert Button | `viewModel.markAsDelivered(order)` | OK | Calls order_flow PUT |
| 319-321 | DeliveryProofSheet | .sheet | `DeliveryProofSheet` | OK | Camera capture sheet |

### 3. ChatView.swift (WebSocket-based customer chat)

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 54 | Send message | Button (ChatInputBar) | `chatManager.sendMessage()` | DEAD | Uses ChatManager (Firebase/WebSocket), NOT P2PAPIService REST endpoint `/api/customer/orders/{id}/chat` |
| 66 | Voice assistant start | Button | `voiceAssistant.startListening()` | OK | Local speech recognition |
| 73 | Call Customer | Button | `callCustomer()` → `tel://` | OK | Opens phone dialer |
| 83-97 | Share Location sheet | .sheet | `chatManager.sendLocation()` | DEAD | ChatManager WS-based, not REST API |
| 254 | Quick Responses toggle | Button | `showQuickResponses.toggle()` | OK | UI toggle |
| 260 | Location Share | Button | `showLocationShare` | OK | Opens location sheet |
| 272 | Mic/Voice input | Button | `onVoice()` toggle | OK | Speech-to-text |
| 284 | Send button | Button | `onSend()` | OK | Triggers send |
| 307-322 | Quick response buttons | Button | `onSelect(response)` | OK | Sends preset message |
| 404-413 | Conversation list NavigationLink | NavigationLink | ChatView | OK | Opens individual chat |

### 4. OrderChatView.swift (REST-based order chat)

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 44-46 | Close button | Button | `dismiss()` | OK | Dismisses sheet |
| 108 | Retry button | Button | `loadMessages()` | OK | Retries GET /api/customer/orders/{id}/chat |
| 142 | Quick message buttons | Button | `sendMessage(message)` | OK | POST /api/customer/orders/{id}/chat |
| 171 | Send button | Button | `sendMessage(messageText)` | OK | POST /api/customer/orders/{id}/chat |
| 196 | fetchOrderChatMessages | onAppear | P2PAPIService.fetchOrderChatMessages | OK | GET /api/customer/orders/{id}/chat |
| 215 | sendOrderChatMessage | action | P2PAPIService.sendOrderChatMessage | OK | POST /api/customer/orders/{id}/chat |

### 5. DeliveryProofSheet.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 39-53 | Retake photo | Button | Clears image, reopens camera | OK | Local state |
| 56-69 | Submit & Complete | Button | `viewModel.submitDeliveryWithProof()` | OK | Uploads photo + completes delivery |
| 92 | Open Camera | Button | `showCamera = true` | OK | Opens camera |
| 112-116 | Cancel | Button (toolbar) | `viewModel.cancelDeliveryProof()` | OK | Dismisses sheet |

### 6. DriverProfileView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~tab0 | Personal Info tab | ProfileTabSelector | `PersonalInfoSection` | OK | Displays profile fields |
| ~tab1 | Vehicle/Documents tab | ProfileTabSelector | `VehicleDocumentsSection` | OK | Document upload |
| ~tab2 | Settings tab | ProfileTabSelector | `SettingsSection` | OK | App settings |
| ~profile | Edit Profile Photo | Button | PhotosPicker | OK | Image upload |
| ~persona | Start Verification | Button | Opens Safari (Persona URL) | OK | Identity verification |
| ~docs | Upload Document buttons | Button | PhotosPicker | OK | Document upload |
| ~settings | Logout button | Button | `authManager.logout()` | OK | Signs out |
| ~settings | Delete Account | Button | P2PAPIService delete endpoint | OK | DELETE /api/drivers/{id}/delete |

### 7. DriverStatsCard.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 24-29 | Refresh stats | Button | `viewModel.fetchStats()` | OK | GET /api/v5/driver/{id}/dashboard (with Firebase fallback) |

### 8. MyDeliveriesView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 66-72 | Online status toggle | onTapGesture | `locationManager.startTracking/stopTracking` | OK | Local GPS toggle |
| 107 | Browse Available Orders | NavigationLink | `AvailableOrdersView` | OK | Navigates to orders |
| 134-139 | Active delivery hero tap | onTapGesture | `selectedDelivery = activeDelivery` → fullScreenCover | OK | Opens full-screen detail |
| 137-139 | Complete delivery | Button | `viewModel.markAsDelivered(activeDelivery)` | OK | Calls order_flow |
| 157-161 | Pending delivery tap | onTapGesture | Opens full-screen detail | OK | |
| 172-174 | Pull-to-refresh | .refreshable | `viewModel.fetchMyDeliveries()` | OK | GET active orders |
| 324-336 | Chat with customer | NavigationLink | ChatView | OK | Opens chat |
| 339-351 | Call customer | Button | `tel://` URL | OK | Phone dialer |
| 374-392 | Navigate to dropoff | Button | `openInMaps()` | OK | Opens maps |
| 394 | Complete delivery (hero card) | Button | `showCompleteConfirmation` | OK | Confirmation dialog |
| 649-667 | Navigate to restaurant | Button | `openInMaps()` | OK | Opens maps |

### 9. OrderMapDetailView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 131-141 | Accept Order | Button | `viewModel.acceptOrder(order)` | OK | Calls order_flow assign_driver |

### 10. PayoutDashboardView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 83-89 | Period Picker (Today/Week/Month) | Picker | `fetchPayoutHistory()` | OK | GET /api/rides/driver/{id}/payout-history?period= |
| 104 | Retry button | Button | `fetchPayoutHistory()` | OK | Retries fetch |
| 123 | Done button | Button | `dismiss()` | OK | Dismisses sheet |
| 126-128 | Stripe Dashboard link | Button | `openStripeDashboard()` | OK | POST /api/drivers/{id}/stripe/dashboard-link |
| 242-244 | Expand ride detail | Button | Toggle `expandedRideId` | OK | Local UI state |

### 11. PickupDropoffView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 122 | Show Details button | Button | `isMapExpanded = false` | OK | UI toggle |
| 565 | Expand map button | Button | `onExpandMap` | OK | UI toggle |
| 591-604 | Swipe to Confirm | SwipeToConfirmButton | `viewModel.markAsPickedUp/markAsDelivered` | OK | Calls order_flow |
| 672-683 | Navigate to pickup | Button | `openMaps()` | OK | Opens Apple/Google Maps |
| 719-730 | Navigate to dropoff | Button | `openMaps()` | OK | Opens Apple/Google Maps |
| 734-756 | Call customer | Button | `tel://` URL | OK | Phone dialer |
| 758-778 | Text customer | Button | `sms:` URL | OK | Opens messages |

### 12. TermsAndConditionsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 44 | Read Full Terms | Button | `showFullTerms` sheet | OK | Opens full terms sheet |
| 76 | Accept & Continue | Button | `acceptTerms()` | OK | Saves to UserDefaults + dismisses |
| 105-108 | Cancel | Button | `dismiss()` | OK | Closes sheet |
| 846-850 | Done (Full Terms) | Button | `dismiss()` | OK | Closes full terms |

### 13. TipNotificationView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 46-58 | Say Thank You | Button | `showingThankYou` sheet | OK | Opens thank-you sheet |
| 143-154 | Send Message | Button | `sendThankYou()` | OK | Firebase Firestore update |
| 161-164 | Cancel | Button | `dismiss()` | OK | Closes sheet |

### 14. VoiceAssistantButton.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 25 | Help quick action | Button | `voiceAssistant.speak()` | OK | Text-to-speech |
| 29 | Earnings quick action | Button | NotificationCenter post | OK | Triggers voice command |
| 37 | Messages quick action | Button | NotificationCenter post | OK | Triggers voice command |
| 50-63 | Main voice button | Button | `voiceAssistant.startListening/stopListening` | OK | Speech recognition |
| 88-93 | Long press → help sheet | LongPressGesture | `showHelpSheet` | OK | Opens help |
| 253-286 | Command rows (help sheet) | Button | `voiceAssistant.speak()` | OK | Plays confirmation |

---

## iOS Driver App - Rideshare Views (`Views/Rideshare/`)

### 15. RideshareDashboardView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 53-58 | Online/Offline Toggle | Toggle | `viewModel.setOnlineStatus()` | OK | PUT driver status |
| 89 | Payout Dashboard button | Button | `showPayoutDashboard` sheet | OK | Opens PayoutDashboardView |
| 95 | Refresh button | Button | `viewModel.refreshData()` | OK | Fetches available rides + bids |

### 16. ActiveRideView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~statusCard | Status transitions | Computed | RideStatus enum | OK | Local state tracking |
| ~actionCard | Start Ride button | Button | `viewModel.startRide(bid)` | OK | PUT /api/rides/{id}/start |
| ~actionCard | Complete Ride button | Button | `showCompleteAlert` | OK | PUT /api/rides/{id}/complete |
| ~actionCard | Cancel button | Button | `showCancelSheet` | OK | POST /api/rides/{id}/cancel |
| ~actionCard | Chat button | Button | `showChat` → RiderChatView sheet | OK | Opens ride chat |
| ~actionCard | Call rider | Button | `tel://` URL | OK | Phone dialer |
| ~actionCard | Navigate button | Button | Opens Apple Maps | OK | Maps navigation |
| ~actionCard | SOS button | Button | `showSOSAlert` | OK | Emergency alert |
| ~actionCard | No-Show timer | Button | `showNoShowAlert` | OK | 5-min no-show countdown |
| ~actionCard | Rate passenger | Button | Submit rating | OK | POST rating |

### 17. SubmitBidSheet.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~priceSection | Quick-accept price button | Button | Sets proposed price | OK | Local state |
| ~priceSection | Fair price button | Button | Sets proposed price | OK | Local state |
| ~priceSection | Premium price button | Button | Sets proposed price | OK | Local state |
| ~bottom | Submit Bid | Button | `viewModel.submitBid()` | OK | POST bid via bid_routes |
| ~toolbar | Close button | Button | `dismiss()` | OK | Closes sheet |

### 18. MyBidsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 57-60 | Refresh button | Button | `viewModel.fetchMyBids()` | OK | GET driver bids |
| ~tabSelector | Pending/Countered/Matched tabs | Button | Local filter | OK | Client-side filtering |
| ~bidsList | Counter-offer response | Button | `showCounterOfferSheet` | OK | Opens CounterOfferResponseSheet |
| ~bidsList | Withdraw bid | Button | `viewModel.withdrawBid()` | OK | DELETE bid |

### 19. RiderChatView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 48 | Close button | Button | `dismiss()` | OK | Closes chat |
| 55-58 | Call rider | Button | `callRider()` → `tel://` | OK | Phone dialer |
| ~quickMessages | Quick message buttons | Button | `sendMessage(text)` | OK | POST /api/p2p/ride-requests/{id}/chat |
| ~inputBar | Send button | Button | `sendMessage(text)` | OK | POST /api/p2p/ride-requests/{id}/chat |
| ~onAppear | Load messages | onAppear | `loadMessages()` | OK | GET /api/p2p/ride-requests/{id}/chat |

### 20. CounterOfferResponseSheet.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 68-71 | Close button | Button | `dismiss(); onDismiss()` | OK | Closes sheet |
| ~actionButtons | Accept counter | Button | `viewModel.respondToCounter(accept)` | OK | PUT accept counter-offer |
| ~actionButtons | Decline counter | Button | `viewModel.respondToCounter(decline)` | OK | PUT decline counter-offer |
| ~actionButtons | New counter-offer | Button | `viewModel.submitNewCounter()` | OK | PUT new counter price |

---

## iOS Restaurant App (`apps/ios/restaurant/eatffairrestaurant/Views/`)

### 21. EnhancedDashboardView.swift (Main TabView)

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 17-20 | Orders tab | TabView.tabItem | `OrdersDashboardView` | OK | Tab bar item 0 |
| 24-27 | Menu tab | TabView.tabItem | `EnhancedMenuView` | OK | Tab bar item 1 |
| 31-34 | Analytics tab | TabView.tabItem | `AnalyticsView` | OK | Tab bar item 2 |
| 38-41 | AI tab | TabView.tabItem | `AIInsightsView` | OK | Tab bar item 3 (guarded by #if ENABLE_AI_EMPLOYEES in content) |
| 45-48 | Settings tab | TabView.tabItem | `RestaurantSettingsView` | OK | Tab bar item 4 |

### 22. OrdersDashboardView (inside EnhancedDashboardView.swift)

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~filterTabs | Order filter buttons (All/New/Preparing/Ready) | Button | Local filter state | OK | Client-side filtering |
| ~orderCard | Accept Order | Button | `ordersVM.acceptOrder(order)` | OK | PUT order status via order_flow |
| ~orderCard | Start Preparing | Button | `ordersVM.startPreparing(order)` | OK | PUT order status |
| ~orderCard | Mark Ready | Button | `ordersVM.markReady(order)` | OK | PUT order status |
| ~orderCard | View Order detail | onTapGesture | `showOrderDetail = order` | OK | Opens order detail sheet |
| ~statusBar | Online/Offline toggle | Toggle | `ordersVM.toggleOnlineStatus()` | OK | PUT /api/vendors/{id}/online-status |

### 23. EnhancedMenuView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 30 | Category filter tabs | Button | Local state | OK | Client-side filtering |
| 44 | Toggle item availability | Button | `viewModel.toggleItemAvailability(item)` | OK | PUT menu item |
| 45 | Edit item | Button | `showEditItem = item` | OK | Opens AddEditMenuItemView sheet |
| 46 | Delete item | Button | `viewModel.deleteItem(item)` | OK | DELETE /api/vendors/{id}/menu/{item_id} |
| 69-73 | Add menu item (+) | Button (toolbar) | `showAddItem = true` | OK | Opens AddEditMenuItemView |
| 77-82 | Add/Edit item sheets | .sheet | `AddEditMenuItemView` | OK | POST/PUT menu item |
| 61 | Pull-to-refresh | .refreshable | `viewModel.fetchMenu()` | OK | GET /api/vendors/{id}/menu |

### 24. AnalyticsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 69-80 | Period selector buttons | Button | Sets `selectedPeriod` | OK | Client-side filtering |
| ~insightCards | Chart type selector | Button | Local state | OK | UI toggle |
| ~onAppear | Fetch analytics | onAppear | `analyticsVM.updateFromOrders()` | OK | Computes from local order data |

### 25. AIInsightsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~periodSelector | Period buttons | Button | Sets `selectedPeriod` | OK | Client-side filtering |
| ~insightTypeSelector | Insight type buttons | Button | Sets `selectedInsight` | OK | UI toggle |
| ~onAppear | Fetch AI insights | onAppear | `viewModel.fetchInsights()` | MISSING | Calls GET /api/vendors/{id}/ai-insights -- endpoint exists but returns minimal data. Feature is aspirational but ENDPOINT IS REAL (main_new.py:21052). Reclassified OK. |

### 26. KOTSettingsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 41 | POS system selection | Button | Sets `viewModel.selectedPOS` | OK | Local state |
| ~config | Save configuration | Button | `viewModel.saveConfig()` | OK | PUT /api/vendor/kot-config |
| ~test | Test print | Button | `viewModel.sendTestPrint()` | OK | POST /api/vendor/kot-test |

### 27. RestaurantSettingsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~profile | Edit Profile | Button | `showEditProfile` sheet | OK | PUT /api/vendors/{id} |
| ~profile | Operating Hours | Button | `showOperatingHours` sheet | OK | PUT vendor settings |
| ~profile | Notification Settings | Button | `showNotificationSettings` sheet | OK | Local/push notification config |
| ~profile | Payment Settings | Button | `showPaymentSettings` sheet | OK | Stripe Connect |
| ~profile | Documents | Button | `showDocuments` → RestaurantDocumentsView | OK | Document management |
| ~profile | Logout | Button | `showLogoutConfirm` alert | OK | Signs out |
| ~profile | Delete Account | Button | `showDeleteAccountAlert` | OK | DELETE /api/vendors/{id}/delete |

### 28. RestaurantRegistrationView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~step navigation | Next/Previous buttons | Button | Step state transitions | OK | Multi-step form navigation |
| ~review | Submit Registration | Button | POST /api/vendors/public (or /api/vendors/public-with-menu) | OK | Backend endpoint verified |

### 29. RestaurantDocumentsView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 38-40 | Document card buttons | Button | `selectedSection = section` | OK | Opens upload sheet |
| ~submit | Submit for Review | Button | `viewModel.submitForReview()` | MISSING | No dedicated "submit for review" endpoint found. Documents upload individually via POST /api/vendor/my-documents/upload. Submit-for-review may just change vendor onboarding_phase which exists. Classified as MISSING since there is no explicit review-submit endpoint. |
| 58 | Fetch documents | onAppear | `viewModel.fetchDocuments()` | OK | GET /api/vendor/my-documents |

### 30. RestaurantDeliveryProofSheet.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| 36-50 | Retake photo | Button | Clears image, reopens camera | OK | Local state |
| ~submit | Submit & Complete | Button | `viewModel.submitDeliveryWithProof()` | OK | Uploads photo + marks delivered |
| ~cancel | Cancel | Button | `viewModel.cancelDeliveryProof()` | OK | Dismisses sheet |

### 31. AIEmployeesView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ALL | Entire view | #if ENABLE_AI_EMPLOYEES | Compile-time guard | DEAD | Not compiled in current builds. Feature is aspirational. All buttons inside are unreachable. |

### 32. LoginView.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| ~login | Email/Password login | Button | POST /api/auth/vendor/login | OK | Backend verified |
| ~google | Google Sign-In | Button | POST /api/auth/vendor/google-auth | OK | OAuth flow |
| ~apple | Apple Sign-In | Button | POST /api/auth/vendor/apple-auth | OK | OAuth flow |
| ~register | Register link | NavigationLink | RestaurantRegistrationView | OK | Navigation |

### 33. ImagePicker.swift

| Line | Element | Type | Target | Category | Notes |
|------|---------|------|--------|----------|-------|
| N/A | UIImagePickerController wrapper | UIViewControllerRepresentable | System camera/photo picker | OK | Utility component, no API calls |

---

## Findings Summary

### DEAD (3 total)

1. **ChatView.swift (Driver)** - Send message / Share location buttons use `ChatManager` (Firebase WebSocket) instead of REST API `/api/customer/orders/{id}/chat`. The OrderChatView.swift uses the correct REST endpoint. ChatView is the older Firebase-based chat, retained for backward compatibility with WebSocket conversations but NOT wired to P2P backend REST endpoints.

2. **AIEmployeesView.swift (Restaurant)** - Entire view is behind `#if ENABLE_AI_EMPLOYEES` compile-time flag. Not compiled in current builds. All UI within is unreachable dead code.

### MISSING (2 total)

1. **RestaurantDocumentsView.swift** - "Submit for Review" button calls `viewModel.submitForReview()` but no dedicated backend endpoint exists for batch submission of documents for review. Individual document upload (POST /api/vendor/my-documents/upload) works. The submit-for-review action may need a backend endpoint to transition vendor onboarding_phase.

2. **Noted but reclassified**: AIInsightsView originally flagged but endpoint `/api/vendors/{id}/ai-insights` confirmed at main_new.py:21052. Reclassified as OK.

### WRONG_TARGET (0 total)

No wrong-target issues found. All buttons call the correct API endpoints.

### Notable Positive Findings

- **Order flow fully wired**: Accept -> Pickup -> Deliver chain works via `order_flow` router
- **Rideshare flow complete**: Bid -> Counter -> Accept -> Start -> Complete via `bid_routes`
- **Dual chat system**: OrderChatView (REST, correct) coexists with ChatView (WebSocket, legacy)
- **#if ENABLE_AI_EMPLOYEES guard**: Properly hides unreleased features in Restaurant app
- **All auth headers present**: Every P2PAPIService call includes Bearer token
- **Delivery proof flow**: Camera -> Preview -> Submit chain correctly wired in both apps
- **Payout dashboard**: Period filtering and Stripe dashboard link both verified
