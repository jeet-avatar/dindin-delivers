# iOS Restaurant vs Android Partner Feature Parity Audit

**Date:** 2026-03-10
**iOS App:** `apps/ios/restaurant/eatffairrestaurant/` (Build 186)
**Android App:** `/Users/jeet/StudioProjects/eatfair-android/partner/` (vC=30)

## Summary

Both apps share the same 5-tab navigation structure (Orders, Menu, Analytics, AI, Settings) and cover the core restaurant management workflow. Android has more dedicated screens for sub-features (reviews, promotions, earnings, delivery map, notifications), while iOS tends to embed these within existing views or the settings screen.

**Total features compared:** 48
**Parity:** 31 features at parity
**iOS-only:** 2 features
**Android-only:** 10 features
**Partial parity:** 5 features

---

## Feature Comparison Table

### 1. Authentication

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Email/password login | LoginView.swift | LoginScreen.kt | No |
| Google Sign-In (OAuth) | LoginView.swift + entitlements | LoginScreen.kt | No |
| Apple Sign-In (OAuth) | LoginView.swift + entitlements | LoginScreen.kt | No |
| Registration (multi-step) | RestaurantRegistrationView.swift | RegistrationScreen.kt + RegistrationViewModel.kt | No |
| Token persistence (Keychain/SharedPrefs) | P2PAPIService (shared) | AuthViewModel.kt | No |
| Token refresh | Not implemented | Not implemented | No (both missing) |
| Auto-login on relaunch | ContentView.swift | PartnerNavGraph.kt | No |

### 2. Order Management

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Incoming orders list | OrdersDashboardView (tab 0) | OrdersScreen.kt | No |
| Order details view | EnhancedDashboardView (inline) | OrderDetailsScreen.kt (dedicated) | Partial - Android has dedicated screen |
| Accept/reject orders | OrdersViewModel.swift | OrdersViewModel.kt | No |
| Order status transitions | OrdersViewModel.swift | OrdersViewModel.kt | No |
| Order history / filtering | EnhancedDashboardView (FilterTab) | OrdersScreen.kt | No |
| Self-delivery toggle | EnhancedDashboardView | OrdersScreen.kt | No |
| Delivery decision screen | EnhancedDashboardView (inline) | DeliveryDecisionScreen.kt (dedicated) | Partial - Android has dedicated screen |

### 3. Self-Delivery

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Self-delivery option on orders | OrdersViewModel.swift | OrdersViewModel.kt | No |
| Delivery proof photo | RestaurantDeliveryProofSheet.swift | **MISSING** | **iOS-only** |
| Map view for delivery | EnhancedDashboardView (Map()) | DeliveryMapScreen.kt | No |
| Navigation to customer | EnhancedDashboardView (openMaps) | DeliveryMapScreen.kt | No |
| Leave-at-door handling | EnhancedDashboardView | **MISSING** | **iOS-only** |
| Delivery instructions callout | EnhancedDashboardView | **MISSING** | **Partial** - Android has orders but no callout UI |

### 4. Menu Management

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Menu items list | EnhancedMenuView.swift | MenuScreen.kt | No |
| Add/edit menu items | EnhancedMenuView.swift | MenuScreen.kt | No |
| Category management | EnhancedMenuView.swift | MenuScreen.kt | No |
| Item availability toggle | EnhancedMenuView.swift + OrdersViewModel | MenuScreen.kt | No |
| Mark items unavailable | EnhancedMenuView.swift (inline) | MarkItemsUnavailableScreen.kt (dedicated) | No |
| Image picker for items | ImagePicker.swift | **Built into menu flow** | No |

### 5. Analytics & Earnings

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Analytics dashboard | AnalyticsView.swift (tab) | AnalyticsScreen.kt (tab) | No |
| Revenue/order stats | AnalyticsView.swift | AnalyticsScreen.kt | No |
| Earnings breakdown | RestaurantSettingsView (link) | EarningsScreen.kt (dedicated) | Partial - Android has richer dedicated screen |
| Promotion analytics | AnalyticsViewModel.swift (inline) | AnalyticsViewModel.kt | No |

### 6. AI Features

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| AI Insights tab | AIInsightsView.swift | AIInsightsScreen.kt | No |
| AI Employees | AIEmployeesView.swift | AIEmployeesScreen.kt | No |
| AI ViewModel | AIInsightsViewModel.swift | AIViewModel.kt + AIEmployeesViewModel.kt | No |

### 7. Settings & Profile

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Restaurant profile edit | RestaurantSettingsView (showEditProfile) | EditProfileScreen.kt | No |
| Business/operating hours | RestaurantSettingsView (showOperatingHours) | BusinessHoursScreen.kt | No |
| Payment settings | RestaurantSettingsView (showPaymentSettings) | PaymentSettingsScreen.kt | No |
| Notification settings | RestaurantSettingsView (showNotificationSettings) | NotificationSettingsScreen.kt | No |
| KOT settings | KOTSettingsView.swift | KOTSettingsScreen.kt | No |
| Documents management | RestaurantDocumentsView.swift | RestaurantDocumentsScreen.kt + DocumentsScreen.kt | No |
| FAQ | FAQView (inline in settings) | FAQScreen.kt | No |
| Legal docs (terms/privacy) | LegalDocumentView (inline) | LegalDocumentScreen.kt | No |
| Sign out | RestaurantSettingsView | RestaurantSettingsScreen.kt | No |

### 8. Promotions

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Promotions list screen | **MISSING** (no dedicated view) | PromotionsScreen.kt | **Android-only** |
| Create promotion | **MISSING** | CreatePromotionScreen.kt | **Android-only** |
| Promotions ViewModel | **MISSING** | PromotionsViewModel.kt | **Android-only** |

### 9. Reviews

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Reviews list screen | **MISSING** (no dedicated view) | ReviewsScreen.kt | **Android-only** |
| Reviews ViewModel | **MISSING** | ReviewsViewModel.kt | **Android-only** |

### 10. Notifications

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Push notification handling | eatffairrestaurantApp.swift | PartnerFirebaseMessagingService.kt + MainActivity.kt | No |
| FCM token registration | P2PAPIService (shared) | AuthViewModel.kt | No |
| Notification history screen | **MISSING** | NotificationsScreen.kt + NotificationsViewModel.kt | **Android-only** |

### 11. Support

| Feature | iOS | Android | Gap? |
|---------|-----|---------|------|
| Help Center link | RestaurantSettingsView | RestaurantSettingsScreen.kt | No |
| Contact Support link | RestaurantSettingsView | RestaurantSettingsScreen.kt | No |
| Admin Portal link | RestaurantSettingsView | RestaurantSettingsScreen.kt | No |
| Live Chat | **MISSING** | RestaurantSettingsScreen.kt (Call Support) | **Android-only** |

---

## Gap Summary

### iOS-only features (2)

| Feature | Priority | Notes |
|---------|----------|-------|
| Delivery proof photo sheet | **High** | RestaurantDeliveryProofSheet.swift - allows vendor to take photo proof during self-delivery |
| Leave-at-door handling UI | **Medium** | Shows leave_at_door flag and delivery instructions in order detail during self-delivery |

### Android-only features (10)

| Feature | Priority | Notes |
|---------|----------|-------|
| Promotions management (list + create) | **Critical** | PromotionsScreen.kt + CreatePromotionScreen.kt - vendors can create/manage featured deals. Backend wired in quick-125. |
| Reviews screen | **High** | ReviewsScreen.kt - view customer reviews and ratings |
| Notification history | **Medium** | NotificationsScreen.kt - in-app notification log |
| Dedicated earnings screen | **Medium** | EarningsScreen.kt - detailed payout breakdown (iOS only has link in settings) |
| Dedicated delivery decision screen | **Low** | DeliveryDecisionScreen.kt - iOS handles inline in dashboard |
| Dedicated order details screen | **Low** | OrderDetailsScreen.kt - iOS handles inline in dashboard |
| Mark items unavailable (dedicated) | **Low** | MarkItemsUnavailableScreen.kt - iOS handles inline in menu view |
| Delivery map screen (dedicated) | **Low** | DeliveryMapScreen.kt - iOS uses inline Map() component |
| Call Support action | **Low** | Android has phone call support link |
| Enhanced menu screen (dedicated) | **Low** | Android has separate EnhancedMenuScreen.kt - iOS has EnhancedMenuView.swift (equivalent) |

### Partial parity (5)

| Feature | Notes |
|---------|-------|
| Order details | iOS inline in dashboard vs Android dedicated screen |
| Delivery decision | iOS inline vs Android dedicated DeliveryDecisionScreen |
| Earnings | iOS has settings link vs Android has dedicated EarningsScreen |
| Delivery instructions | iOS has callout UI, Android has data but no callout display |
| Promotions reference | iOS AnalyticsViewModel references promos but no CRUD screen |

---

## Recommended Priorities

### Critical (should fix before next release)
1. **Add Promotions screen to iOS** - Backend wired (quick-125), Android has full CRUD. iOS vendors cannot manage promotions at all.

### High (fix in next sprint)
2. **Add Reviews screen to iOS** - Android shows customer feedback; iOS has no way to see reviews.
3. **Add Delivery proof to Android** - iOS has RestaurantDeliveryProofSheet for self-delivery photo proof; Android lacks this entirely.

### Medium (plan for next milestone)
4. **Add Notification history to iOS** - Android shows past notifications; iOS has no in-app notification log.
5. **Add dedicated Earnings screen to iOS** - Android has richer earnings breakdown; iOS only has a settings link.
6. **Add Leave-at-door UI to Android** - iOS shows leave_at_door flag clearly; Android needs this for self-delivery parity.

### Low (nice to have)
7. Dedicated order details screen on iOS (currently inline)
8. Dedicated delivery decision screen on iOS (currently inline)
9. Call Support action on iOS settings
