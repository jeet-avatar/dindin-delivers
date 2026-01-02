# Android Partner App - Staging Guide

## Quick Command
```
Claude, I'm working on the Android PARTNER app. Reference .claude/docs/STAGING-ANDROID-PARTNER.md
```

---

## App Configuration

| Field | Value |
|-------|-------|
| Module | `partner/` |
| Package | `com.eatfair.partner` |
| Staging Package | `com.eatfair.partner.staging` |
| App Name | Dollor Partner Staging |
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
  1. Lint Check        → ./gradlew :partner:lintStagingDebug
  2. Unit Tests        → ./gradlew :partner:testStagingDebugUnitTest
  3. Build APKs        → ./gradlew :partner:assembleStagingDebug
  4. Instrumented Tests → (optional, continue-on-error)
  5. Release Build     → ./gradlew :partner:assembleStagingRelease
```

### Manual Build Commands
```bash
# Debug build
./gradlew :partner:assembleStagingDebug

# Release build
./gradlew :partner:assembleStagingRelease

# Run tests
./gradlew :partner:testStagingDebugUnitTest

# Clean build
./gradlew :partner:clean :partner:assembleStagingDebug
```

---

## Dependencies

### Shared Module (`shared/`)
| Component | Status | Notes |
|-----------|--------|-------|
| `DollorApiService` | [ ] | All vendor endpoints |
| `DollorRepository` | [ ] | Vendor methods |
| `VendorOrder` model | [ ] | Order data |
| `MenuItem` model | [ ] | Menu data |
| `AppConfig` | [ ] | Staging URLs |

### External SDKs
| SDK | Purpose | Status |
|-----|---------|--------|
| Firebase Auth | Authentication | [ ] |
| Firebase Messaging | Push notifications | [ ] |
| Google Maps | Location picker | [ ] |

---

## API Endpoints Verification

### Authentication
| Endpoint | Method | Status |
|----------|--------|--------|
| `/auth/vendor/login` | POST | [ ] |
| `/auth/vendor/register` | POST | [ ] |
| `/auth/vendor/google-auth` | POST | [ ] |
| `/vendors/public` | POST | [ ] |
| `/vendors/{id}/delete` | DELETE | [ ] |

### Profile & Settings
| Endpoint | Method | Status |
|----------|--------|--------|
| `/vendor/profile` | GET | [ ] |
| `/vendors/{id}` | GET/PATCH | [ ] |
| `/vendors/{id}/documents` | GET/POST/DELETE | [ ] |

### Orders
| Endpoint | Method | Status |
|----------|--------|--------|
| `/erp/orders/vendor/{id}` | GET | [ ] |
| `/vendors/{id}/orders` | GET | [ ] |
| `/erp/orders/{id}/accept` | POST | [ ] |
| `/erp/orders/{id}/reject` | POST | [ ] |
| `/erp/orders/{id}/ready` | POST | [ ] |
| `/orders/{id}/mark-unavailable` | POST | [ ] |

### Menu Management
| Endpoint | Method | Status |
|----------|--------|--------|
| `/vendors/{id}/menu` | GET/POST | [ ] |
| `/vendors/{id}/menu/categories` | GET | [ ] |
| `/vendors/{id}/menu/{itemId}` | PUT/PATCH/DELETE | [ ] |

### Promotions
| Endpoint | Method | Status |
|----------|--------|--------|
| `/promotions/vendor/{id}` | GET | [ ] |
| `/promotions/create` | POST | [ ] |
| `/promotions/{id}` | PUT/DELETE | [ ] |
| `/promotions/analytics/{id}` | GET | [ ] |
| `/promotions/suggestions/{id}` | GET | [ ] |

### Payouts
| Endpoint | Method | Status |
|----------|--------|--------|
| `/vendors/{id}/payouts` | GET | [ ] |
| `/vendors/{id}/bank-account` | POST | [ ] |

---

## UI Screens Checklist

### Auth Flow
- [ ] Splash Screen
- [ ] Login Screen
- [ ] Registration Form (4 steps)
- [ ] Document Upload
- [ ] Approval Pending

### Dashboard
- [ ] Home Dashboard - Today's stats
- [ ] Open/Closed Toggle
- [ ] New Orders Alert
- [ ] Revenue Summary

### Orders Management
- [ ] Incoming Orders List
- [ ] Order Detail View
- [ ] Accept Order
- [ ] Reject Order (with reason)
- [ ] Mark Items Unavailable
- [ ] Mark Ready for Pickup
- [ ] Order History

### Menu Management
- [ ] Menu Categories View
- [ ] Menu Items List
- [ ] Add New Item
- [ ] Edit Item (name, price, description)
- [ ] Toggle Item Available/Unavailable
- [ ] Delete Item
- [ ] Image Upload

### Promotions
- [ ] Active Promotions List
- [ ] Create Promotion
- [ ] Edit Promotion
- [ ] Delete Promotion
- [ ] Analytics View
- [ ] AI Suggestions

### Profile & Settings
- [ ] Business Profile
- [ ] Edit Business Info
- [ ] Operating Hours
- [ ] Notification Settings
- [ ] Documents
- [ ] Bank Account/Payouts
- [ ] Help/Support

---

## Pre-Production Checklist

### Code Quality
- [ ] No duplicate code
- [ ] Uses shared/ models
- [ ] No hardcoded URLs
- [ ] ProGuard configured

### Business Logic
- [ ] Order accept/reject works
- [ ] Menu CRUD operations work
- [ ] Promotion creation works
- [ ] Operating hours honored

### Notifications
- [ ] New order notifications
- [ ] Order update notifications
- [ ] Sound/vibration works
- [ ] Background notifications

### Testing
- [ ] Login/logout flow
- [ ] Accept order flow
- [ ] Reject order with reason
- [ ] Menu add/edit/delete
- [ ] Promotion creation
- [ ] Profile updates save
