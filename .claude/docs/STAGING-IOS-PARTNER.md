# iOS Restaurant (Partner) App - Staging Guide

## Quick Command
```
Claude, I'm working on the iOS RESTAURANT app. Reference .claude/docs/STAGING-IOS-PARTNER.md
```

---

## App Configuration

| Field | Value |
|-------|-------|
| Directory | `apps/ios/restaurant/` |
| Bundle ID | `com.dollor.restaurant` |
| App Name | DinDin Restaurant |
| Shared Module | `apps/ios/eatfair-ios-shared/` |

## API Configuration
| Environment | URL |
|-------------|-----|
| API_BASE_URL | `https://d3kuu45w6kl8hr.cloudfront.net` |

---

## CI/CD Pipeline

### Workflow: `ios-ci.yml`
```yaml
Jobs:
  1. SwiftLint         → swiftlint lint
  2. Build Shared      → xcodebuild -scheme EatFairShared
  3. Build Restaurant  → xcodebuild -scheme eatffairrestaurant
  4. Run Tests         → xcodebuild test
  5. Archive (main)    → xcodebuild archive
```

### Local Build Commands
```bash
cd apps/ios/restaurant
xcodebuild -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -configuration Debug
```

---

## Dependencies

### Shared Module
| Component | Status |
|-----------|--------|
| `P2PAPIService` | [ ] |
| `P2PAuthService` | [ ] |
| `VendorSession` | [ ] |
| `AppConfig` | [ ] |

### External SDKs
| SDK | Purpose | Status |
|-----|---------|--------|
| Firebase Auth | Authentication | [ ] |
| Firebase Messaging | Order notifications | [ ] |

---

## API Endpoints

### Authentication
| Endpoint | Status |
|----------|--------|
| `/auth/vendor/login` | [ ] |
| `/auth/vendor/register` | [ ] |
| `/auth/vendor/google-auth` | [ ] |
| `/vendors/public` | [ ] |

### Restaurant Operations
| Feature | Endpoints | Status |
|---------|-----------|--------|
| Profile | `/vendor/profile`, `/vendors/{id}` | [ ] |
| Orders | `/erp/orders/vendor/{id}`, `/erp/orders/{id}/*` | [ ] |
| Menu | `/vendors/{id}/menu/*` | [ ] |
| Promotions | `/promotions/vendor/{id}`, `/promotions/*` | [ ] |
| Payouts | `/vendors/{id}/payouts`, `/vendors/{id}/bank-account` | [ ] |

---

## UI Screens Checklist

### Auth
- [ ] Login
- [ ] Registration (4 steps)
- [ ] Document Upload
- [ ] Pending Approval

### Main
- [ ] Dashboard
- [ ] Open/Close Toggle
- [ ] Incoming Orders
- [ ] Order Management
- [ ] Menu Management
- [ ] Promotions
- [ ] Profile/Settings

---

## Pre-Production Checklist
- [ ] Order notifications work
- [ ] Accept/reject flow complete
- [ ] Menu CRUD works
- [ ] No hardcoded URLs
- [ ] App Store assets ready
