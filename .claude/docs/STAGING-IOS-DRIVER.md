# iOS Driver (Delivery) App - Staging Guide

## Quick Command
```
Claude, I'm working on the iOS DRIVER app. Reference .claude/docs/STAGING-IOS-DRIVER.md
```

---

## App Configuration

| Field | Value |
|-------|-------|
| Directory | `apps/ios/delivery/` |
| Bundle ID | `com.dollor.driver` |
| App Name | DinDin Driver |
| Shared Module | `apps/ios/eatfair-ios-shared/` |

## API Configuration
| Environment | URL |
|-------------|-----|
| API_BASE_URL | `https://d3kuu45w6kl8hr.cloudfront.net` |
| WEBSOCKET_URL | `wss://d3kuu45w6kl8hr.cloudfront.net` |

---

## CI/CD Pipeline

### Workflow: `ios-ci.yml`
```yaml
Jobs:
  1. SwiftLint         → swiftlint lint
  2. Build Shared      → xcodebuild -scheme EatFairShared
  3. Build Delivery    → xcodebuild -scheme eatffairdelivery
  4. Run Tests         → xcodebuild test
  5. Archive (main)    → xcodebuild archive
```

### Local Build Commands
```bash
cd apps/ios/delivery
xcodebuild -workspace eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery \
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
| `DriverSession` | [ ] |
| `AppConfig` | [ ] |

### External SDKs
| SDK | Purpose | Status |
|-----|---------|--------|
| Firebase Auth | Authentication | [ ] |
| Firebase Messaging | Push notifications | [ ] |
| Google Maps iOS | Navigation | [ ] |
| Core Location | Background location | [ ] |

---

## API Endpoints

### Authentication
| Endpoint | Status |
|----------|--------|
| `/auth/driver/login` | [ ] |
| `/auth/driver/register` | [ ] |
| `/auth/driver/google` | [ ] |
| `/auth/driver/apple-auth` | [ ] |

### Driver Operations
| Feature | Endpoints | Status |
|---------|-----------|--------|
| Profile | `/erp/drivers/{id}`, `/drivers/{id}/status` | [ ] |
| Deliveries | `/v2/driver/deliveries/*` | [ ] |
| Rideshare | `/v2/driver/rides/*` | [ ] |
| Earnings | `/drivers/{id}/earnings`, `/v2/driver/dashboard/{id}` | [ ] |
| Payouts | `/v2/driver/{id}/payouts`, `/v2/driver/{id}/bank-account` | [ ] |

---

## UI Screens Checklist

### Auth
- [ ] Login
- [ ] Register
- [ ] Document Upload
- [ ] Pending Approval

### Main
- [ ] Dashboard
- [ ] Online/Offline Toggle
- [ ] Available Orders
- [ ] Available Rides
- [ ] Delivery Flow
- [ ] Rideshare Flow
- [ ] Earnings
- [ ] Profile

---

## Pre-Production Checklist
- [ ] Background location works
- [ ] Push notifications
- [ ] All flows complete
- [ ] No hardcoded URLs
- [ ] App Store assets ready
