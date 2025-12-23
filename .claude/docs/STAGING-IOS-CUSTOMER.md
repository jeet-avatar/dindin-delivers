# iOS Customer App - Staging Guide

## Quick Command
```
Claude, I'm working on the iOS CUSTOMER app. Reference .claude/docs/STAGING-IOS-CUSTOMER.md
```

---

## App Configuration

| Field | Value |
|-------|-------|
| Directory | `apps/ios/customer/` |
| Bundle ID | `com.dollor.customer` |
| App Name | DinDin |
| Shared Module | `apps/ios/eatfair-ios-shared/` |

## API Configuration (from Staging.xcconfig)
| Environment | URL |
|-------------|-----|
| API_BASE_URL | `https://d3kuu45w6kl8hr.cloudfront.net` |
| WEBSOCKET_URL | `wss://d3kuu45w6kl8hr.cloudfront.net` |
| CDN_URL | `https://d3kuu45w6kl8hr.cloudfront.net` |

---

## CI/CD Pipeline

### Workflow: `ios-ci.yml`
```yaml
Jobs:
  1. SwiftLint         → swiftlint lint
  2. Build Shared      → xcodebuild -scheme EatFairShared
  3. Build Customer    → xcodebuild -scheme eatfaircustomer
  4. Run Tests         → xcodebuild test
  5. Archive (main)    → xcodebuild archive + exportArchive
```

### GitHub Actions
```bash
# Check latest build
gh run list --repo jeet-avatar/eatfair-ios --workflow=ios-ci.yml --limit 5
```

### Local Build Commands
```bash
# Build for simulator
cd apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -configuration Debug

# Build for device
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -sdk iphoneos \
  -configuration Release
```

---

## Dependencies

### Shared Module (`eatfair-ios-shared/`)
| Component | Status | Notes |
|-----------|--------|-------|
| `P2PAPIService` | [x] | All customer endpoints including fare estimate |
| `P2PAuthService` | [x] | Authentication |
| `SessionManager` | [x] | Token management |
| `AppConfig` | [x] | CloudFront staging URLs |
| `SecureStorage` | [x] | Keychain storage |

### External SDKs (via CocoaPods/SPM)
| SDK | Purpose | Status |
|-----|---------|--------|
| Firebase Auth | Google/Apple Sign-In | [ ] |
| Firebase Messaging | Push notifications | [ ] |
| Stripe iOS | Payments | [ ] |
| Google Maps iOS | Maps & places | [ ] |

---

## API Endpoints (Same as Android)

### Authentication
| Endpoint | Status |
|----------|--------|
| `/auth/customer/login` | [ ] Endpoint not found |
| `/auth/customer/register` | [ ] Endpoint not found |
| `/auth/customer/google` | [ ] |
| `/auth/customer/apple-auth` | [ ] |

### Core Features
| Feature | Endpoints | Status |
|---------|-----------|--------|
| Restaurants | `/vendors/published`, `/vendors/{id}/menu` | [x] 14 restaurants |
| Orders | `/orders/create`, `/customer/orders`, `/orders/{id}/track` | [ ] |
| Addresses | `/addresses/{id}/*` | [ ] |
| Rideshare | `/rides/estimate` | [x] Working |
| Payments | `/payments/*`, `/customers/{id}/cards` | [ ] |
| Promotions | `/promotions/active` | [x] 3 active promos |
| Legal | `/api/legal/terms` | [x] Working |

---

## UI Screens Checklist

### Auth Flow
- [x] Launch Screen
- [x] Onboarding (WelcomeView)
- [x] Login (Email + Google + Apple) (LoginView)
- [x] Register (RegisterView)
- [x] Forgot Password (in LoginView)

### Main Features
- [x] Home - Featured, categories (HomeView)
- [x] Restaurant List & Detail (RestaurantDetailView)
- [x] Menu & Cart (MenuView, CartView)
- [x] Checkout & Payment (CheckoutView)
- [x] Order Tracking (OrderTrackingView)
- [x] Rideshare Flow (RideRequestView)
- [x] Profile & Settings (ProfileView, SettingsView)
- [x] Notifications (NotificationView)
- [x] Edit Profile (in ProfileView)
- [x] Order History (OrderHistoryView)
- [x] Favorites (FavoritesView)
- [x] Legal Acceptance (LegalAcceptanceView)
- [x] Refer & Earn (ReferAndEarnView)
- [x] Help & Support (HelpSupportView)

---

## Pre-Production Checklist

### Code
- [ ] Uses shared module
- [ ] No duplicate code
- [ ] SwiftLint passes
- [ ] No hardcoded URLs

### App Store
- [ ] App icon (1024x1024)
- [ ] Screenshots
- [ ] Privacy policy
- [ ] App description

### Testing
- [ ] All flows work
- [ ] Push notifications
- [ ] Deep links
- [ ] iPad support (if applicable)
