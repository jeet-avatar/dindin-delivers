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
| `P2PAPIService` | [ ] | All customer endpoints |
| `P2PAuthService` | [ ] | Authentication |
| `SessionManager` | [ ] | Token management |
| `AppConfig` | [ ] | Staging URLs |
| `SecureStorage` | [ ] | Keychain storage |

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
| `/auth/customer/login` | [ ] |
| `/auth/customer/register` | [ ] |
| `/auth/customer/google` | [ ] |
| `/auth/customer/apple-auth` | [ ] |

### Core Features
| Feature | Endpoints | Status |
|---------|-----------|--------|
| Restaurants | `/vendors/published`, `/vendors/{id}/menu` | [ ] |
| Orders | `/orders/create`, `/customer/orders`, `/orders/{id}/track` | [ ] |
| Addresses | `/addresses/{id}/*` | [ ] |
| Rideshare | `/rides/*` | [ ] |
| Payments | `/payments/*`, `/customers/{id}/cards` | [ ] |

---

## UI Screens Checklist

### Auth Flow
- [ ] Launch Screen
- [ ] Onboarding
- [ ] Login (Email + Google + Apple)
- [ ] Register
- [ ] Forgot Password

### Main Features
- [ ] Home - Featured, categories
- [ ] Restaurant List & Detail
- [ ] Menu & Cart
- [ ] Checkout & Payment
- [ ] Order Tracking
- [ ] Rideshare Flow
- [ ] Profile & Settings

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
