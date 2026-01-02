# Android Customer App - Staging Guide

## Quick Command
```
Claude, I'm working on the Android CUSTOMER app. Reference .claude/docs/STAGING-ANDROID-CUSTOMER.md
```

---

## App Configuration

| Field | Value |
|-------|-------|
| Module | `app/` |
| Package | `com.eatfair.app` |
| Staging Package | `com.eatfair.app.staging` |
| App Name | Dollor.ai Staging |
| Version | 1.0.1 (versionCode: 2) |

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
  1. Lint Check        → ./gradlew :app:lintStagingDebug
  2. Unit Tests        → ./gradlew :app:testStagingDebugUnitTest
  3. Build APKs        → ./gradlew :app:assembleStagingDebug
  4. Instrumented Tests → (optional, continue-on-error)
  5. Release Build     → ./gradlew :app:assembleStagingRelease
```

### GitHub Actions Status
```bash
# Check latest build
gh run list --repo jeet-avatar/eatfair-android --limit 5

# View specific run
gh run view <run_id>
```

### Manual Build Commands
```bash
# Debug build
./gradlew :app:assembleStagingDebug

# Release build (requires keystore)
./gradlew :app:assembleStagingRelease

# Run tests
./gradlew :app:testStagingDebugUnitTest

# Lint check
./gradlew :app:lintStagingDebug

# Clean build
./gradlew :app:clean :app:assembleStagingDebug
```

---

## Dependencies

### Shared Module (`shared/`)
| Component | Status | Notes |
|-----------|--------|-------|
| `DollorApiService` | [x] | All customer endpoints |
| `DollorRepository` | [x] | Customer methods |
| `SecureStorage` | [x] | Token storage |
| `AppConfig` | [x] | Staging URLs (CloudFront) |
| `GoogleSignInHelper` | [x] | Auth flow |
| `SessionManager` | [x] | Session handling |

### External SDKs
| SDK | Purpose | Status |
|-----|---------|--------|
| Firebase Auth | Google Sign-In | [ ] |
| Firebase Storage | Image uploads | [ ] |
| Firebase Messaging | Push notifications | [ ] |
| Stripe SDK | Payments | [ ] |
| Google Maps | Location/Maps | [ ] |
| Google Places | Address autocomplete | [ ] |

---

## API Endpoints Verification

### Authentication
```bash
# Customer login
curl -X POST https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=test123"

# Google auth
curl -X POST https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/google \
  -H "Content-Type: application/json" \
  -d '{"id_token":"..."}'
```

| Endpoint | Method | Status |
|----------|--------|--------|
| `/auth/customer/login` | POST | [x] Working - returns JWT |
| `/auth/customer/register` | POST | [x] Working - creates customer |
| `/auth/customer/google` | POST | [ ] |
| `/customer/password-reset/request` | POST | [ ] |
| `/customer/password-reset/confirm` | POST | [ ] |
| `/customers/{id}/delete` | DELETE | [ ] |

### Restaurants
| Endpoint | Method | Status |
|----------|--------|--------|
| `/vendors/published` | GET | [x] 14 restaurants |
| `/public/restaurants/{id}` | GET | [x] |
| `/vendors/{id}/menu` | GET | [x] (empty for test vendors) |

### Orders
| Endpoint | Method | Status |
|----------|--------|--------|
| `/orders/create` | POST | [ ] |
| `/customer/orders` | GET | [ ] |
| `/customer/{id}/active-orders` | GET | [ ] |
| `/customer/orders/{id}/track` | GET | [ ] |
| `/orders/{id}/cancel` | POST | [ ] |
| `/orders/{id}/modification` | GET | [ ] |
| `/orders/{id}/modification/respond` | POST | [ ] |

### Addresses
| Endpoint | Method | Status |
|----------|--------|--------|
| `/addresses/{customerId}` | GET/POST | [ ] |
| `/addresses/{id}/{addressId}` | PUT/DELETE | [ ] |
| `/addresses/{id}/{addressId}/set-default` | POST | [ ] |

### Rideshare
| Endpoint | Method | Status |
|----------|--------|--------|
| `/rides/request` | POST | [ ] |
| `/rides/estimate` | POST | [x] Working with fare breakdown |
| `/customer/rides` | GET | [ ] |
| `/rides/{id}/track` | GET | [ ] |
| `/rides/{id}/cancel` | POST | [ ] |

### Payments
| Endpoint | Method | Status |
|----------|--------|--------|
| `/payments/create-intent` | POST | [ ] |
| `/customers/{id}/cards` | GET/POST | [ ] |
| `/customers/{id}/cards/{cardId}` | DELETE | [ ] |
| `/customers/{id}/cards/{cardId}/default` | POST | [ ] |

---

## UI Screens Checklist

### Auth Flow
- [ ] Splash Screen - Logo displays correctly
- [ ] Onboarding - Slides work, skip button
- [ ] Login Screen - Email/password fields, validation
- [ ] Register Screen - All fields, validation
- [ ] Forgot Password - Email input, code verification
- [ ] Google Sign-In - Button works, flow completes

### Home & Browse
- [ ] Home Screen - Featured deals load, categories show
- [ ] Restaurant List - Grid/list toggle, images load
- [ ] Restaurant Detail - Menu loads, info displays
- [ ] Search Screen - Search works, results show
- [ ] Category Filter - Filters apply correctly

### Cart & Checkout
- [ ] Cart Screen - Items show, quantity updates
- [ ] Checkout Screen - Address selection, payment
- [ ] Order Confirmation - Order ID shows
- [ ] Add Payment Card - Stripe UI works

### Orders & Tracking
- [ ] Active Orders - List shows, status updates
- [ ] Order Tracking - Map shows, driver location
- [ ] Order History - Past orders load
- [ ] Order Details - Items, prices show
- [ ] Rate Driver - Star rating, submit

### Rideshare
- [ ] Ride Request - Pickup/dropoff selection
- [ ] Fare Estimate - Price shows
- [ ] Driver Selection - Bids display
- [ ] Ride Tracking - Map, driver location
- [ ] Ride History - Past rides load

### Profile & Settings
- [ ] Profile Screen - Info displays
- [ ] Edit Profile - Save works
- [ ] Address Management - CRUD operations
- [ ] Payment Methods - Cards list
- [ ] Favorites - Restaurants list
- [ ] Settings - Toggles work
- [ ] Help/Support - Links work
- [ ] Terms/Privacy - Pages load

---

## Pre-Production Checklist

### Code Quality
- [ ] No duplicate code (check shared/)
- [ ] No unused imports/variables
- [ ] No hardcoded strings (use resources)
- [ ] No hardcoded URLs (use AppConfig)
- [ ] ProGuard rules configured
- [ ] No debug logs in release build

### Security
- [ ] API tokens in SecureStorage
- [ ] HTTPS only (no HTTP)
- [ ] No sensitive data in logs
- [ ] Certificate pinning config ready

### Testing
- [ ] All unit tests pass
- [ ] All screens render
- [ ] All buttons work
- [ ] Deep links work
- [ ] Push notifications receive
- [ ] Offline handling works

### Play Store Ready
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone, tablet)
- [ ] Privacy policy URL
- [ ] Version code incremented
- [ ] Release signing works
