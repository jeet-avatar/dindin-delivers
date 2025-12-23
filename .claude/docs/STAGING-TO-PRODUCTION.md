# Staging to Production Checklist

> **CRITICAL**: This document tracks ALL changes required before deploying to production.
> **Last Updated**: 2025-12-23

---

## Status Summary

| Category | Items | Completed | Remaining |
|----------|-------|-----------|-----------|
| API URLs | 12 | 0 | 12 |
| Config Changes | 4 | 0 | 4 |
| Code Cleanup | 6 | 0 | 6 |
| Backend TODOs | 3 | 0 | 3 |
| Testing | 5 | 0 | 5 |

---

## 1. API URL Changes

### iOS (`apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift`)

| Line | Current (Staging) | Production | Status |
|------|-------------------|------------|--------|
| 14 | `p2pAPIBaseURL = "https://d3kuu45w6kl8hr.cloudfront.net"` | `https://api.dollor.ai` | [ ] |
| 18 | `negotiationServiceURL = "https://d3kuu45w6kl8hr.cloudfront.net/api/negotiation"` | `https://api.dollor.ai/api/negotiation` | [ ] |
| 20 | `chatServiceURL = "https://d3kuu45w6kl8hr.cloudfront.net/api/chat"` | `https://api.dollor.ai/api/chat` | [ ] |
| 22 | `callServiceURL = "https://d3kuu45w6kl8hr.cloudfront.net/api/call"` | `https://api.dollor.ai/api/call` | [ ] |
| 300 | `supportUrl = "https://d3kuu45w6kl8hr.cloudfront.net/support"` | `https://dollor.ai/support` | [ ] |
| 467 | `baseURL = "https://d3kuu45w6kl8hr.cloudfront.net"` | `https://api.dollor.ai` | [ ] |
| 559 | `termsOfServiceURL = "https://d3kuu45w6kl8hr.cloudfront.net/terms"` | `https://dollor.ai/terms` | [ ] |
| 560 | `privacyPolicyURL = "https://d3kuu45w6kl8hr.cloudfront.net/privacy"` | `https://dollor.ai/privacy` | [ ] |

### Android (`shared/src/main/java/com/eatfair/shared/config/AppConfig.kt`)

| Line | Current (Staging) | Production | Status |
|------|-------------------|------------|--------|
| 42 | `API_BASE_URL = "https://d3kuu45w6kl8hr.cloudfront.net/api"` | `https://api.dollor.ai/api` | [ ] |
| 77 | `STAGING_BASE = "https://d3kuu45w6kl8hr.cloudfront.net"` | `https://api.dollor.ai` | [ ] |
| 554 | `TERMS_OF_SERVICE_URL` | `https://dollor.ai/terms` | [ ] |
| 555 | `PRIVACY_POLICY_URL` | `https://dollor.ai/privacy` | [ ] |
| 556 | `DRIVER_TERMS_URL` | `https://dollor.ai/driver-terms` | [ ] |
| 557 | `RESTAURANT_TERMS_URL` | `https://dollor.ai/restaurant-terms` | [ ] |
| 558 | `SUPPORT_URL` | `https://dollor.ai/support` | [ ] |

---

## 2. Config Changes

| Platform | File | Change | Status |
|----------|------|--------|--------|
| iOS | `AppConfig.swift:310` | Verify `isDummyPaymentMode = false` | [x] Already correct |
| iOS | `HelpSupportView.swift:218` | Update `tel:+18001234567` to real support number | [ ] |
| iOS | `EnterpriseNetworkLayer.swift` | Unused - but verify not called | [x] Not used |
| iOS | `NetworkSecurity.swift` | Enable certificate pinning for `api.dollor.ai` | [ ] |

---

## 3. Code Cleanup (Before Production)

### Remove Mock/Preview Data

| Platform | File | Issue | Status |
|----------|------|-------|--------|
| Android | `FeaturedRestaurantsSection.kt:227` | Remove `mockRestaurants` list | [ ] |
| iOS | `OrderSuccessView.swift:118` | `dummyOrderCard` - verify only used as fallback | [ ] |

### Implement TODOs

| Platform | File | TODO | Status |
|----------|------|------|--------|
| iOS | `NotificationView.swift:226` | Implement `getNotifications()` API | [ ] |
| iOS | `NotificationView.swift:233` | Implement `markNotificationAsRead()` API | [ ] |
| iOS | `NotificationView.swift:238` | Implement `clearAllNotifications()` API | [ ] |
| Android | `NavigationGraph.kt` | Call API to delete account | [ ] |
| Android | `SearchViewModel.kt` | Clear search from local storage | [ ] |
| Android | `SearchScreen.kt` | AI recommendations feature | [ ] |

---

## 4. Backend Requirements

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /api/notifications` | Fetch user notifications | [ ] |
| `PUT /api/notifications/{id}/read` | Mark notification as read | [ ] |
| `DELETE /api/notifications` | Clear all notifications | [ ] |

---

## 5. Security Checklist

| Item | Description | Status |
|------|-------------|--------|
| Certificate Pinning | Enable in `NetworkSecurity.swift` for `api.dollor.ai` | [ ] |
| API Keys | Verify no hardcoded keys in source | [x] Clean |
| Debug Logs | Review print statements (optional - wrapped in DEBUG) | [ ] |
| ProGuard | Android release builds obfuscated | [ ] |

---

## 6. Pre-Production Testing

| Test | Platform | Status |
|------|----------|--------|
| Full auth flow (login, register, forgot password) | iOS, Android | [ ] |
| Order placement end-to-end | iOS, Android | [ ] |
| Rideshare fare estimate and booking | iOS, Android | [ ] |
| Payment processing (Stripe live mode) | iOS, Android | [ ] |
| Push notifications | iOS, Android | [ ] |

---

## 7. Firebase/Google Services

| Platform | File | Action | Status |
|----------|------|--------|--------|
| Android | `app/src/staging/google-services.json` | Replace with production Firebase config | [ ] |
| Android | `driver/src/staging/google-services.json` | Replace with production Firebase config | [ ] |
| Android | `partner/src/staging/google-services.json` | Replace with production Firebase config | [ ] |
| iOS | `GoogleService-Info.plist` | Verify production Firebase project | [ ] |

---

## 8. App Store / Play Store

| Item | iOS | Android | Status |
|------|-----|---------|--------|
| App Version | Increment | Increment | [ ] |
| Bundle ID | `com.dollor.customer` | `com.dollor.customer` | [ ] |
| Screenshots | Updated | Updated | [ ] |
| Privacy Policy URL | Live URL | Live URL | [ ] |
| Release Notes | Written | Written | [ ] |

---

## Change Log

| Date | Action | Files Changed |
|------|--------|---------------|
| 2025-12-23 | Created staging-to-production checklist | This file |
| 2025-12-23 | Added RegisterView, NotificationView to iOS | `Views/RegisterView.swift`, `Views/NotificationView.swift` |
| 2025-12-23 | Fixed RideEstimateRequest field names | `ApiModels.kt` |
| 2025-12-23 | Updated all iOS URLs to CloudFront staging | `AppConfig.swift` |
| 2025-12-23 | Added fare estimate API to iOS | `P2PAPIService.swift`, `RideRequestViewModel.swift` |
| 2025-12-23 | API Endpoint Testing - Verified working endpoints | See API Status below |

---

## Staging API Status (Tested 2025-12-23)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/health` | [x] Working | DB connected, v1.0.1 |
| `/api/vendors/published` | [x] Working | 14 restaurants |
| `/api/vendors/{id}/menu` | [x] Working | Empty for test vendors |
| `/api/rides/estimate` | [x] Working | Full fare breakdown |
| `/api/promotions/active` | [x] Working | 3 active promos |
| `/api/legal/terms` | [x] Working | Returns legal summary |
| `/api/customers/login` | [ ] Not Found | Needs backend check |
| `/api/customers/register` | [ ] Not Found | Needs backend check |
| `/privacy`, `/terms` pages | [ ] Not Found | Static pages missing |

---

## Quick Production Switch Commands

When ready for production, run these:

```bash
# iOS - Update URLs
cd /Users/jeet/StudioProjects/eatfair-ios
sed -i '' 's|d3kuu45w6kl8hr.cloudfront.net|api.dollor.ai|g' apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift

# Android - Update URLs
cd /Users/jeet/StudioProjects/eatfair-android
sed -i '' 's|d3kuu45w6kl8hr.cloudfront.net|api.dollor.ai|g' shared/src/main/java/com/eatfair/shared/config/AppConfig.kt
```

**DO NOT run these until staging is fully validated and production backend is ready!**
