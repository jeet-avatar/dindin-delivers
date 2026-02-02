# EatFair iOS Codebase Concerns

> **Analysis Date**: January 2026
> **Codebase**: eatfair-ios (Customer, Driver, Restaurant Apps)
> **Primary Language**: Swift 5.5+

This document identifies technical debt, security considerations, performance issues, and maintenance concerns in the iOS codebase. It also highlights what is done well.

---

## Table of Contents

1. [Technical Debt](#1-technical-debt)
2. [Security Considerations](#2-security-considerations)
3. [Performance Considerations](#3-performance-considerations)
4. [Maintenance Concerns](#4-maintenance-concerns)
5. [What's Done Well](#5-whats-done-well)
6. [Prioritized Action Items](#6-prioritized-action-items)

---

## 1. Technical Debt

### 1.1 Deprecated APIs and Legacy Code

**Location**: `/apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift`

Several properties are marked as deprecated but still present in the codebase:

```swift
// Lines 100-107 - Distance-based pricing (deprecated)
@Published public var ridesharePlatformFeePerMile: Double = 0.10  // Deprecated
@Published public var ridesharePlatformFeeMinimum: Double = 1.00  // Deprecated
@Published public var rideshareDistanceTier1Max: Double = 10.0   // Deprecated
@Published public var rideshareDistanceTier2Max: Double = 20.0   // Deprecated
@Published public var rideshareDistanceTier1Fee: Double = 1.00   // Deprecated
@Published public var rideshareDistanceTier2Fee: Double = 2.00   // Deprecated
@Published public var rideshareDistanceTier3Fee: Double = 3.00   // Deprecated

// Line 50 - Service fee rate (deprecated)
@Published public var serviceFeeRate: Double = 0.0  // DEPRECATED: Dollor.ai uses flat $1 fees
```

**Deprecated Methods** (Lines 191-220):
- `getRideshareTier(distanceMiles:)` - Use `getRideshareTier(fareAmount:)` instead
- `getRideshareTierName(distanceMiles:)` - Use `getRideshareTierName(fareAmount:)` instead
- `getRideshareFeeDescription(distanceMiles:)` - Use `getRideshareFeeDescription(fareAmount:)` instead
- `getRidesharePlatformFeeBreakdown(distanceMiles:)` - Use `getRidesharePlatformFeeBreakdown(fareAmount:)` instead

**Deprecated Model**:
- `/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift` (Line 160-161):
  - `DeliveryOrderStatus` enum marked as deprecated - renamed to `OrderStatus`

**Recommendation**: Remove deprecated properties after confirming no active usage. Create migration script to update any external references.

---

### 1.2 Firebase Remnants

**Issue**: Firebase is still used for Firestore database operations despite transition to P2P API backend.

**Files with Firebase imports**:

| File | Firebase Usage |
|------|----------------|
| `eatfaircustomerApp.swift` | FirebaseCore, FirebaseAuth, FirebaseFirestore, FirebaseMessaging |
| `DatabaseSeeder.swift` | FirebaseFirestore (database seeding) |
| `MultiRestaurantCheckoutView.swift` | FirebaseFirestore, FirebaseAuth |
| `MultiRestaurantCartViewModel.swift` | FirebaseAuth |
| `OrderHistoryView.swift` | FirebaseFirestore |
| `ProfileView.swift` | FirebaseAuth |
| `SettingsView.swift` | FirebaseAuth |
| `MenuViewModel.swift` | FirebaseFirestore |
| `AIEmployeeService.swift` | FirebaseFirestore, FirebaseAuth |
| `ChatManager.swift` (delivery app) | FirebaseFirestore, FirebaseAuth |
| `eatffairrestaurantApp.swift` | FirebaseCore, FirebaseMessaging |
| `eatffairdeliveryApp.swift` | FirebaseCore, FirebaseAuth, FirebaseMessaging |

**Package.swift Dependency**:
```swift
// /apps/ios/eatfair-ios-shared/Package.swift
.package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.0.0")
```

**Recommendation**:
1. Evaluate which Firebase features are actually needed (Push notifications via FCM is likely required)
2. Migrate remaining Firestore operations to P2P API
3. Remove unused Firebase imports to reduce app size
4. Consider keeping only FirebaseMessaging for push notifications

---

### 1.3 Dead Code and Backup Files

**Location**: `/apps/ios/customer/eatfaircustomer/_dead_code_backup/`

Contains 4 backup files that should be removed:
- `CartView.swift` (replaced by MultiRestaurantCartView)
- `CartViewModel.swift` (replaced by MultiRestaurantCartViewModel)
- `DealsView.swift`
- `CheckoutView.swift` (1,198 lines - replaced by MultiRestaurantCheckoutView)

**Total Size**: ~2,200 lines of dead code

**Recommendation**: Delete the `_dead_code_backup` directory. These files are already in git history if needed.

---

### 1.4 TODO and FIXME Comments

**Active TODOs requiring attention**:

| Location | TODO |
|----------|------|
| `NotificationView.swift:226-239` | API endpoint implementation for notifications |
| `P2PAPIService.swift:8510` | Restaurant self-delivery vs driver delivery upgrade |
| `P2PAPIService.swift:8726` | Restaurant self-delivery upgrade |
| `P2PAPIService.swift:8872` | General upgrade for app go-live |

**Recommendation**: Create tracking issues for each TODO before app launch.

---

### 1.5 Large Files Needing Refactoring

| File | Lines | Concern |
|------|-------|---------|
| `P2PAPIService.swift` | 10,723 | Monolithic API service - should be split by domain |
| `TripBoardView.swift` | 2,105 | Large view - extract subviews |
| `AvailableOrdersView.swift` | 1,875 | Large view |
| `DriverProfileView.swift` | 1,787 | Large view |
| `TripBoardService.swift` | 1,733 | Large service |
| `RideRequestView.swift` | 1,699 | Large view |
| `HomeView.swift` | 1,441 | Large view |
| `RestaurantSettingsView.swift` | 1,383 | Large view |
| `MultiRestaurantCheckoutView.swift` | 1,230 | Large view |

**Recommendation**: Split `P2PAPIService.swift` into domain-specific services:
- `CustomerAPIService.swift`
- `DriverAPIService.swift`
- `VendorAPIService.swift`
- `OrderAPIService.swift`
- `RideshareAPIService.swift`

---

## 2. Security Considerations

### 2.1 What's Done Well (Security)

**Secure Token Storage**:
- Authentication tokens stored in iOS Keychain via `SecureStorage.swift`
- Uses `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for proper protection
- Token migration from UserDefaults to Keychain implemented

**API Key Configuration**:
- Google Maps API key loaded from `Info.plist` or `GoogleService-Info.plist`
- No hardcoded API keys in source code
- Proper validation with `starts(with: "AIza")` check
- `/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Config/GoogleMapsConfig.swift`

**Network Security** (`NetworkSecurity.swift`):
- TLS 1.2 minimum enforced
- Cookie handling disabled for sensitive requests
- Certificate pinning infrastructure ready (currently ATS-only)
- Stripe certificate pins configured

```swift
// Good security configuration
configuration.tlsMinimumSupportedProtocolVersion = .TLSv12
configuration.httpShouldSetCookies = false
configuration.httpCookieAcceptPolicy = .never
configuration.urlCache = nil  // Disabled for sensitive requests
```

### 2.2 Areas for Improvement

**Certificate Pinning Disabled**:
```swift
// NetworkSecurity.swift - Lines 16-28
"dollor.ai": [
    // Certificate pinning disabled - using ATS for security
],
"api.dollor.ai": [
    // Certificate pinning disabled - using ATS for security
],
```

**Recommendation**: Enable certificate pinning for production before high-value transactions are processed.

**UserDefaults for Non-Sensitive Data**:
Some data stored in UserDefaults that could be considered semi-sensitive:
- `p2p_customer_id`
- `p2p_vendor_id`
- `p2p_driver_id`
- User names and emails

**Recommendation**: Review if user IDs should be moved to Keychain.

**Debug Logging in Production**:
Extensive `#if DEBUG` gated logging exists, which is good. However, some print statements may leak through:

```swift
// P2PAPIService.swift lines 1327-1398
print("DEBUG API vendorGoogleAuth: URL = \(fullURL)")
print("DEBUG API vendorGoogleAuth: Request body = \(body)")
```

**Recommendation**: Audit all print statements to ensure they're properly gated.

---

## 3. Performance Considerations

### 3.1 Large API Service Impact

The 10,723-line `P2PAPIService.swift` file:
- Increases compile time
- Makes code navigation difficult
- Creates potential for merge conflicts
- Uses 145+ URLSession calls

**Recommendation**: Refactor into smaller, focused services.

### 3.2 Image Loading

Multiple files use basic `AsyncImage` without caching strategy:
- 180+ files contain image loading code
- No apparent centralized image caching

**Recommendation**: Implement a shared image caching layer (consider SDWebImage or custom URLCache configuration).

### 3.3 Timer and Network Usage

Files with significant Timer/URLSession usage:
- `P2PAPIService.swift`: 145 URLSession instances
- `NegotiationService.swift`: 4 Timer uses (WebSocket keep-alive)
- `ChatService.swift`: 6 Timer uses
- `NetworkSecurity.swift`: 9 URLSession configurations

**Potential Issues**:
- Multiple WebSocket connections may impact battery
- Timer-based polling could be replaced with server-sent events

**Recommendation**: Review timer usage and consider more efficient patterns.

### 3.4 State Management Overhead

Heavy use of SwiftUI state management:
- 223+ occurrences of `@State`, `@StateObject`, `@ObservedObject`, `@EnvironmentObject`
- Some views have 35+ state variables (`TripBoardView.swift`)

**Recommendation**: Consider consolidating state into larger view models for complex views.

---

## 4. Maintenance Concerns

### 4.1 Duplicate Code

**LocationManager Duplication**:
Two separate implementations exist:
- `customer/eatfaircustomer/Services/LocationManager.swift` (35 lines)
- `delivery/eatffairdelivery/Services/LocationManager.swift` (441 lines)

**Recommendation**: Move shared location functionality to `eatfair-ios-shared`.

**Multiple Codable Implementations**:
127+ Codable structs/extensions defined across the codebase. Most are in the shared module, which is good, but some duplication exists.

### 4.2 Inconsistent Patterns

**Debug Conditionals**:
Some files use `#if DEBUG` properly, while others use plain `print()` statements.

**WebSocket URL Handling**:
Two similar patterns for WebSocket URL conversion:
```swift
// NegotiationService.swift:266
.replacingOccurrences(of: "http://", with: "ws://")

// ChatService.swift:304
.replacingOccurrences(of: "http://", with: "ws://")
```

**Recommendation**: Create a shared utility for URL scheme conversion.

### 4.3 Missing Documentation

**Files lacking documentation**:
- Most ViewModels lack comprehensive documentation
- API response models could use more property documentation
- Complex business logic in checkout flows needs comments

**Well-documented files** (good examples to follow):
- `AppConfig.swift` - Excellent pricing model documentation
- `SecureStorage.swift` - Clear method documentation
- `GoogleMapsConfig.swift` - API requirements documented

### 4.4 Test Coverage

**Existing Tests**:
- `eatfaircustomerTests/eatfaircustomerTests.swift` - Unit tests
- `CustomerAppStagingAPITests.swift` (1,068 lines) - API integration tests
- `eatffairrestaurantUITests.swift` (1,312 lines) - UI tests

**Missing Tests**:
- Shared module has limited test coverage
- ViewModels lack unit tests
- Payment flows need more test coverage

**Recommendation**: Add unit tests for:
- `P2PAPIService` critical paths
- Payment processing
- Order state management

### 4.5 Dependency Management

**Current Dependencies**:
- Firebase iOS SDK 12.0.0
- Stripe iOS (via SPM)
- Google Sign-In iOS
- Swift Protobuf

**Concerns**:
- Firebase SDK is large (increases app size)
- Multiple build artifacts in checkouts directories consuming disk space

**Recommendation**: Review if all Firebase products are needed. Consider lazy loading for less-used features.

---

## 5. What's Done Well

### 5.1 Architecture Strengths

1. **Shared Module**: `eatfair-ios-shared` provides excellent code reuse across all three apps
2. **Centralized Configuration**: `AppConfig.swift` serves as single source of truth for pricing and API URLs
3. **Secure Storage**: Proper Keychain usage for sensitive data
4. **Environment Management**: xcconfig-based environment URLs (Dev/Staging/Production)

### 5.2 Code Quality

1. **SwiftUI Best Practices**: Proper use of `@MainActor` and `DispatchQueue.main`
2. **Error Handling**: Centralized `ErrorHandler.swift` for consistent messaging
3. **Type Safety**: Extensive use of Codable protocols
4. **No Force Unwrapping in Production Code**: Force unwraps (`!`) are limited to test code

### 5.3 Security Practices

1. **No Hardcoded Secrets**: API keys loaded from plist files
2. **HTTPS Enforcement**: All API calls use HTTPS
3. **Token Security**: Proper Keychain storage with appropriate accessibility settings
4. **Debug Code Gating**: `#if DEBUG` used throughout

### 5.4 Documentation

1. **Pricing Model**: Extensively documented in `AppConfig.swift`
2. **API Configuration**: Clear comments about required Google Cloud APIs
3. **Bundle IDs**: Documented for each app target

---

## 6. Prioritized Action Items

### High Priority (Before Launch)

| Item | File(s) | Effort |
|------|---------|--------|
| Implement notification API endpoints | `NotificationView.swift` | Medium |
| Complete self-delivery logic | `P2PAPIService.swift` | Medium |
| Delete `_dead_code_backup` directory | Customer app | Low |
| Enable certificate pinning | `NetworkSecurity.swift` | Medium |

### Medium Priority (Post-Launch)

| Item | File(s) | Effort |
|------|---------|--------|
| Refactor `P2PAPIService.swift` into smaller services | Shared module | High |
| Consolidate `LocationManager` implementations | Customer & Delivery apps | Medium |
| Add unit tests for ViewModels | All apps | High |
| Remove deprecated pricing properties | `AppConfig.swift` | Low |
| Implement image caching | All apps | Medium |

### Low Priority (Future Sprints)

| Item | File(s) | Effort |
|------|---------|--------|
| Migrate remaining Firebase Firestore usage to P2P API | Multiple files | High |
| Split large views into smaller components | Multiple views | Medium |
| Add comprehensive documentation | ViewModels | Medium |
| Optimize WebSocket reconnection logic | NegotiationService, ChatService | Medium |
| Review Firebase SDK usage and remove unused products | Package.swift | Medium |

---

## Appendix: Quick Commands

```bash
# Find all TODO comments
grep -r "TODO" apps/ios --include="*.swift" | grep -v ".build" | grep -v "checkouts"

# Find all deprecated usages
grep -r "deprecated" apps/ios --include="*.swift" | grep -v ".build"

# Find Firebase imports
grep -r "import Firebase" apps/ios --include="*.swift" | grep -v ".build" | grep -v "checkouts"

# Count lines in largest files
find apps/ios -name "*.swift" -type f ! -path "*build*" ! -path "*checkouts*" -exec wc -l {} \; | sort -rn | head -20
```

---

*This document should be updated as concerns are addressed or new ones are identified.*
