# Dollor.ai Architecture Comparison Chart

## Quick Command
```
Claude, show me the architecture comparison. Reference .claude/docs/ARCHITECTURE-COMPARISON.md
```

---

## App File Count Summary

| App | Platform | Files | Status |
|-----|----------|-------|--------|
| Customer | Android | 85 | Most Complete |
| Partner | Android | 56 | Complete |
| Driver | Android | 12 | **INCOMPLETE** |
| Shared | Android | 44 | Complete |
| Customer | iOS | ~60 | Complete |
| Restaurant | iOS | ~45 | Complete |
| Delivery | iOS | ~35 | Partial |

---

## Feature Comparison - Android Apps

### Authentication Features

| Feature | Customer (app/) | Driver (driver/) | Partner (partner/) |
|---------|-----------------|------------------|-------------------|
| LoginScreen | ✅ | ✅ | ✅ |
| RegisterScreen | ✅ | ❌ **MISSING** | ✅ |
| ForgotPasswordScreen | ✅ | ❌ **MISSING** | ❌ MISSING |
| GoogleSignInButton | ✅ | ❌ MISSING | ✅ |
| LegalAcceptanceScreen | ✅ | ❌ MISSING | ❌ MISSING |
| AuthViewModel | ✅ | ❌ MISSING | ✅ |
| WelcomeScreen | ✅ | ❌ MISSING | ❌ MISSING |

### Core UI Screens

| Screen Category | Customer | Driver | Partner |
|-----------------|----------|--------|---------|
| Home/Dashboard | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ |
| Settings | ✅ | ❌ MISSING | ✅ |
| Earnings | ❌ N/A | ✅ | ✅ |
| Orders List | ✅ | ✅ | ✅ (incoming) |
| Order Detail | ✅ | ❌ MISSING | ✅ |
| Navigation | ✅ | ✅ | ✅ |

### Driver-Specific (driver/ module)

| Feature | Status | Notes |
|---------|--------|-------|
| DriverHomeScreen | ✅ | Basic implementation |
| AvailableOrdersScreen | ✅ | Shows available deliveries |
| EarningsScreen | ✅ | Shows earnings |
| ProfileScreen | ✅ | Basic profile |
| LoginScreen | ✅ | Email/password only |
| RegisterScreen | ❌ **MISSING** | **CRITICAL - Need to add** |
| DocumentUploadScreen | ❌ **MISSING** | For license, insurance |
| ActiveDeliveryScreen | ❌ **MISSING** | Navigation during delivery |
| RideshareScreen | ❌ **MISSING** | Ride acceptance UI |
| PayoutScreen | ❌ **MISSING** | Bank account, payouts |
| SettingsScreen | ❌ **MISSING** | Notifications, etc. |

### Partner-Specific (partner/ module)

| Feature | Status | Notes |
|---------|--------|-------|
| LoginScreen | ✅ | |
| RegistrationScreen | ✅ | 4-step form |
| PartnerHomeScreen | ✅ | Dashboard |
| EnhancedDashboardScreen | ✅ | Stats |
| ProfileScreen | ✅ | |
| RestaurantSettingsScreen | ✅ | |
| BusinessHoursScreen | ✅ | Operating hours |
| DocumentsScreen | ✅ | |
| MenuScreen | ❌ MISSING | Menu management |
| OrdersScreen | ❌ MISSING | Order management |
| PromotionsScreen | ✅ | |
| CreatePromotionScreen | ✅ | |
| AIInsightsScreen | ✅ | AI features |
| PaymentSettingsScreen | ✅ | |
| NotificationSettingsScreen | ✅ | |

---

## Shared Module Usage

### Models Used by Each App

| Model | Customer | Driver | Partner | Location |
|-------|----------|--------|---------|----------|
| Order | ✅ | ✅ | ✅ | shared/model/order/ |
| Restaurant | ✅ | ❌ | ✅ | shared/model/restaurant/ |
| Driver | ❌ | ✅ | ❌ | shared/model/driver/ |
| Address | ✅ | ❌ | ❌ | shared/model/address/ |
| CartItem | ✅ | ❌ | ❌ | shared/model/restaurant/ |
| RideshareModels | ✅ | ✅ | ❌ | shared/model/rideshare/ |

### Services Used by Each App

| Service | Customer | Driver | Partner |
|---------|----------|--------|---------|
| DollorApiService | ✅ | ✅ | ✅ |
| DollorRepository | ✅ | ✅ | ✅ |
| SecureStorage | ✅ | ✅ | ✅ |
| SessionManager | ✅ | ✅ | ✅ |
| GoogleSignInHelper | ✅ | ❌ | ✅ |

---

## API Endpoint Usage by App

### Customer App Endpoints
```
✅ /auth/customer/login
✅ /auth/customer/register
✅ /auth/customer/google
✅ /vendors/published
✅ /orders/create
✅ /customer/orders
✅ /addresses/*
✅ /rides/*
✅ /payments/*
✅ /customers/{id}/cards
```

### Driver App Endpoints
```
✅ /auth/driver/login
❌ /auth/driver/register - NOT IMPLEMENTED IN APP
❌ /auth/driver/google - NOT IMPLEMENTED
✅ /v2/driver/deliveries/*
❌ /v2/driver/rides/* - PARTIAL
✅ /drivers/{id}/earnings
❌ /v2/driver/{id}/payouts - NOT IMPLEMENTED
```

### Partner App Endpoints
```
✅ /auth/vendor/login
✅ /vendors/public (register)
✅ /auth/vendor/google-auth
✅ /vendor/profile
✅ /erp/orders/vendor/{id}
❌ /vendors/{id}/menu/* - NOT FULLY IMPLEMENTED
✅ /promotions/*
```

---

## Critical Missing Features

### Driver App - HIGH PRIORITY

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| RegisterScreen | 🔴 CRITICAL | Medium | Can't onboard new drivers |
| DocumentUploadScreen | 🔴 CRITICAL | Medium | License, insurance upload |
| GoogleSignInButton | 🟡 HIGH | Low | Uses shared helper |
| ActiveDeliveryScreen | 🟡 HIGH | Medium | Navigation during delivery |
| RideshareFlowScreens | 🟡 HIGH | High | Multiple screens needed |
| PayoutScreen | 🟡 HIGH | Medium | Bank account linking |
| SettingsScreen | 🟢 MEDIUM | Low | Notification settings |

### Partner App - MEDIUM PRIORITY

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| MenuManagementScreen | 🟡 HIGH | Medium | CRUD for menu items |
| OrderManagementScreen | 🟡 HIGH | Medium | Accept/reject orders |
| ForgotPasswordScreen | 🟢 MEDIUM | Low | Password recovery |

---

## Registration Flow Comparison

### Customer Registration (COMPLETE)
```
WelcomeScreen → RegisterScreen → LegalAcceptance → HomeScreen
                     ↓
              (Name, Email, Phone, Password)
                     ↓
              Google Sign-In Option
```

### Driver Registration (INCOMPLETE)
```
LoginScreen → ???
     ↓
  NO REGISTER FLOW
  NO DOCUMENT UPLOAD
  NO VEHICLE INFO
```

**NEEDED:**
```
WelcomeScreen → RegisterScreen → DocumentUploadScreen → ApprovalPendingScreen
                     ↓
              (Name, Email, Phone, Password)
              (Vehicle Type, License Plate)
                     ↓
              Upload: License, Insurance, Vehicle Photo
                     ↓
              Admin Reviews → Approved → HomeScreen
```

### Partner Registration (COMPLETE)
```
LoginScreen → RegistrationScreen (4 steps) → ApprovalPending → HomeScreen
                     ↓
              Step 1: Business Info
              Step 2: Owner Info
              Step 3: Location
              Step 4: Documents
```

---

## Recommended Implementation Order

### Phase 1: Driver App Critical Path
1. ✅ LoginScreen (exists)
2. ❌ RegisterScreen - **CREATE**
3. ❌ DocumentUploadScreen - **CREATE**
4. ❌ ApprovalPendingScreen - **CREATE**

### Phase 2: Driver App Features
5. ❌ ActiveDeliveryScreen
6. ❌ RideshareAcceptScreen
7. ❌ PayoutScreen
8. ❌ SettingsScreen

### Phase 3: Partner App Completion
9. ❌ MenuManagementScreen
10. ❌ OrderManagementScreen
11. ❌ ForgotPasswordScreen

---

## File Structure Expected

### Driver App (CURRENT: 12 files, NEEDED: ~30 files)
```
driver/src/main/java/com/eatfair/driver/
├── ui/
│   ├── auth/
│   │   ├── LoginScreen.kt           ✅ EXISTS
│   │   ├── RegisterScreen.kt        ❌ MISSING
│   │   ├── AuthViewModel.kt         ❌ MISSING
│   │   └── DocumentUploadScreen.kt  ❌ MISSING
│   ├── home/
│   │   └── DriverHomeScreen.kt      ✅ EXISTS
│   ├── orders/
│   │   ├── AvailableOrdersScreen.kt ✅ EXISTS
│   │   └── ActiveDeliveryScreen.kt  ❌ MISSING
│   ├── rideshare/
│   │   ├── AvailableRidesScreen.kt  ❌ MISSING
│   │   └── ActiveRideScreen.kt      ❌ MISSING
│   ├── earnings/
│   │   └── EarningsScreen.kt        ✅ EXISTS
│   ├── payouts/
│   │   └── PayoutScreen.kt          ❌ MISSING
│   ├── profile/
│   │   └── ProfileScreen.kt         ✅ EXISTS
│   └── settings/
│       └── SettingsScreen.kt        ❌ MISSING
├── navigation/
│   └── DriverNavGraph.kt            ✅ EXISTS
└── MainActivity.kt                   ✅ EXISTS
```

---

## Summary

| App | Completeness | Critical Blockers |
|-----|--------------|-------------------|
| Customer (Android) | 95% | None |
| Partner (Android) | 85% | Menu management |
| Driver (Android) | 40% | **Registration flow missing** |
| Shared Module | 100% | None |
| Customer (iOS) | 90% | Minor |
| Restaurant (iOS) | 85% | Minor |
| Delivery (iOS) | 70% | Registration, Rideshare |
| Web Backend | 95% | None |
| Web Frontend | 90% | Minor polish |
