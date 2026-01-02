# Android Driver App - Staging Guide

## Quick Command
```
Claude, I'm working on the Android DRIVER app. Reference .claude/docs/STAGING-ANDROID-DRIVER.md
```

---

## App Configuration

| Field | Value |
|-------|-------|
| Module | `driver/` |
| Package | `com.eatfair.driver` |
| Staging Package | `com.eatfair.driver.staging` |
| App Name | Dollor Driver Staging |
| Version | 1.0.0 (versionCode: 1) |

## API Configuration
| Environment | URL |
|-------------|-----|
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net/api` |
| Production | `https://api.dollor.ai/api` |

---

## CI/CD Pipeline

### Workflow: `android-ci.yml`
```yaml
Jobs:
  1. Lint Check        → ./gradlew :driver:lintStagingDebug
  2. Unit Tests        → ./gradlew :driver:testStagingDebugUnitTest
  3. Build APKs        → ./gradlew :driver:assembleStagingDebug
  4. Instrumented Tests → (optional, continue-on-error)
  5. Release Build     → ./gradlew :driver:assembleStagingRelease
```

### Manual Build Commands
```bash
# Debug build
./gradlew :driver:assembleStagingDebug

# Release build
./gradlew :driver:assembleStagingRelease

# Run tests
./gradlew :driver:testStagingDebugUnitTest

# Clean build
./gradlew :driver:clean :driver:assembleStagingDebug
```

---

## Dependencies

### Shared Module (`shared/`)
| Component | Status | Notes |
|-----------|--------|-------|
| `DollorApiService` | [ ] | All driver endpoints |
| `DollorRepository` | [ ] | Driver methods |
| `Driver` model | [ ] | Driver data class |
| `DriverSession` | [ ] | Session management |
| `DriverEarnings` | [ ] | Earnings data |
| `AppConfig` | [ ] | Staging URLs |

### External SDKs
| SDK | Purpose | Status |
|-----|---------|--------|
| Firebase Auth | Authentication | [ ] |
| Firebase Messaging | Push notifications | [ ] |
| Google Maps | Navigation | [ ] |
| Google Location | Live location | [ ] |

---

## API Endpoints Verification

### Authentication
| Endpoint | Method | Status |
|----------|--------|--------|
| `/auth/driver/login` | POST | [ ] |
| `/auth/driver/register` | POST | [ ] |
| `/auth/driver/google` | POST | [ ] |
| `/auth/driver/refresh` | POST | [ ] |
| `/auth/driver/forgot-password` | POST | [ ] |
| `/drivers/{id}/delete` | DELETE | [ ] |

### Profile & Status
| Endpoint | Method | Status |
|----------|--------|--------|
| `/erp/drivers/{id}` | GET/PUT | [ ] |
| `/drivers/{id}/status` | GET/POST | [ ] |
| `/drivers/{id}/documents` | GET/POST | [ ] |
| `/driver/location` | POST | [ ] |

### Deliveries (Food)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/v2/driver/deliveries/available` | GET | [ ] |
| `/v2/driver/deliveries` | GET | [ ] |
| `/v2/driver/deliveries/{id}/accept` | POST | [ ] |
| `/v2/driver/deliveries/{id}/pickup` | POST | [ ] |
| `/v2/driver/deliveries/{id}/complete` | POST | [ ] |
| `/erp/orders/{id}/picked-up` | POST | [ ] |
| `/erp/orders/{id}/delivered` | POST | [ ] |

### Rideshare
| Endpoint | Method | Status |
|----------|--------|--------|
| `/v2/driver/rides/available` | GET | [ ] |
| `/erp/driver/{id}/rides` | GET | [ ] |
| `/v2/driver/rides/{id}/accept` | POST | [ ] |
| `/v2/driver/rides/{id}/arrive` | POST | [ ] |
| `/v2/driver/rides/{id}/start` | POST | [ ] |
| `/v2/driver/rides/{id}/complete` | POST | [ ] |
| `/v2/driver/rides/{id}/cancel` | POST | [ ] |

### Earnings & Payouts
| Endpoint | Method | Status |
|----------|--------|--------|
| `/drivers/{id}/earnings` | GET | [ ] |
| `/v2/driver/dashboard/{id}` | GET | [ ] |
| `/erp/driver/{id}/stats` | GET | [ ] |
| `/v2/driver/{id}/balance` | GET | [ ] |
| `/v2/driver/{id}/bank-account` | POST | [ ] |
| `/v2/driver/{id}/payouts` | GET/POST | [ ] |

---

## UI Screens Checklist

### Auth Flow
- [ ] Splash Screen
- [ ] Login Screen
- [ ] Register Screen
- [ ] Document Upload
- [ ] Approval Pending Screen

### Dashboard
- [ ] Home Dashboard - Stats, earnings
- [ ] Online/Offline Toggle
- [ ] Available Orders List
- [ ] Available Rides List

### Delivery Flow
- [ ] Order Card - Details, distance
- [ ] Accept Order Confirmation
- [ ] Navigation to Restaurant
- [ ] Mark Picked Up
- [ ] Navigation to Customer
- [ ] Mark Delivered
- [ ] Delivery Complete

### Rideshare Flow
- [ ] Ride Request Card
- [ ] Bid/Accept Interface
- [ ] Navigation to Pickup
- [ ] Arrived at Pickup
- [ ] Start Ride
- [ ] Navigation to Dropoff
- [ ] Complete Ride
- [ ] Rate Customer

### Earnings
- [ ] Earnings Dashboard
- [ ] Daily/Weekly/Monthly Views
- [ ] Payout History
- [ ] Link Bank Account
- [ ] Request Payout

### Profile
- [ ] Profile Screen
- [ ] Edit Profile
- [ ] Documents Management
- [ ] Vehicle Info
- [ ] Settings
- [ ] Help/Support

---

## Pre-Production Checklist

### Code Quality
- [ ] No duplicate code
- [ ] Uses shared/ models
- [ ] No hardcoded URLs
- [ ] ProGuard configured

### Location Features
- [ ] Background location works
- [ ] Location updates every 10s
- [ ] Battery optimization handled
- [ ] Location permission flow

### Notifications
- [ ] New order notifications
- [ ] Ride request notifications
- [ ] Order update notifications
- [ ] Sound/vibration works

### Testing
- [ ] Online/offline toggle
- [ ] Accept order flow
- [ ] Complete delivery flow
- [ ] Rideshare complete flow
- [ ] Earnings display correctly
