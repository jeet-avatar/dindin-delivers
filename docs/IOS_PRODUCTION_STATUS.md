# Dollor.ai iOS Customer App - Production Status

**Last Updated:** December 27, 2025
**Status:** BLOCKED - Hardcoded to Staging

---

## Critical Issue

**iOS AppConfig.swift is hardcoded to STAGING URLs**

```swift
// Current (WRONG):
@Published public var p2pAPIBaseURL: String = "https://d3kuu45w6kl8hr.cloudfront.net"

// Required (PRODUCTION):
@Published public var p2pAPIBaseURL: String = "https://api.dollor.ai"
```

---

## Files Requiring Update

### 1. AppConfig.swift
**Path:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift`

| Line | Current | Required |
|------|---------|----------|
| 14 | `https://d3kuu45w6kl8hr.cloudfront.net` | `https://api.dollor.ai` |
| 18 | `https://d3kuu45w6kl8hr.cloudfront.net/api/negotiation` | `https://api.dollor.ai/api/negotiation` |
| 20 | `https://d3kuu45w6kl8hr.cloudfront.net/api/chat` | `https://api.dollor.ai/api/chat` |
| 22 | `https://d3kuu45w6kl8hr.cloudfront.net/api/call` | `https://api.dollor.ai/api/call` |
| 300 | `https://d3kuu45w6kl8hr.cloudfront.net/support` | `https://api.dollor.ai/support` |
| 467 | `https://d3kuu45w6kl8hr.cloudfront.net` (APIEndpoints.baseURL) | `https://api.dollor.ai` |
| 559 | `https://d3kuu45w6kl8hr.cloudfront.net/terms` | `https://api.dollor.ai/terms` |
| 560 | `https://d3kuu45w6kl8hr.cloudfront.net/privacy` | `https://api.dollor.ai/privacy` |

---

## API Configuration

| Environment | Base URL | Status |
|-------------|----------|--------|
| **Production** | `https://api.dollor.ai` | NOT CONFIGURED |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` | Currently Active |

---

## Architecture

### URL Resolution Flow (Current - Staging)
```
1. AppConfig.swift
   └─ p2pAPIBaseURL = "https://d3kuu45w6kl8hr.cloudfront.net"

2. P2PAPIService.swift
   └─ baseURL = "\(AppConfig.shared.p2pAPIBaseURL)/api"
   └─ = "https://d3kuu45w6kl8hr.cloudfront.net/api"

3. All API calls go to STAGING
```

### URL Resolution Flow (Required - Production)
```
1. AppConfig.swift
   └─ p2pAPIBaseURL = "https://api.dollor.ai"

2. P2PAPIService.swift
   └─ baseURL = "\(AppConfig.shared.p2pAPIBaseURL)/api"
   └─ = "https://api.dollor.ai/api"

3. All API calls go to PRODUCTION
```

---

## API Endpoints (Matches Android)

### P2P Rideshare
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/rides/request` | POST | Matches Android |
| `/api/rides/customer/{id}/requests` | GET | Matches Android |
| `/api/rides/request/{id}/bids` | GET | Matches Android |
| `/api/rides/bid/{id}/respond` | POST | Matches Android |
| `/api/rides/request/{id}/cancel` | POST | Matches Android |
| `/api/rides/{id}/track` | GET | Matches Android |
| `/api/rides/estimate` | POST | Matches Android |

### Restaurants
| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/vendors/published?platform=ios` | GET | Returns 0 restaurants |

---

## Secure Storage

### Token Storage (Keychain)
| Key | Description |
|-----|-------------|
| `p2p_customer_access_token` | Customer JWT token |
| `p2p_customer_id` | Customer ID |
| `p2p_customer_name` | Customer name |
| `p2p_customer_email` | Customer email |

---

## Pricing Configuration (Matches Android)

### Food Delivery
| Parameter | Value |
|-----------|-------|
| foodCustomerFee | $1.00 |
| foodRestaurantFee | $1.00 |
| foodDriverFee | $0.00 |

### Rideshare (Tiered)
| Fare Range | Platform Fee |
|------------|--------------|
| rideshareTier1MaxFare (≤$35) | $1.00 |
| rideshareTier2MaxFare ($35-$70) | $2.00 |
| Tier 3 (>$70) | $3.00 |

### Fare Calculation
| Parameter | Value |
|-----------|-------|
| rideBaseFare | $2.50 |
| ridePerMileRate | $1.15 |
| ridePerMinuteRate | $0.18 |
| rideMinFare | $5.00 |

---

## Known Issues

### 1. Hardcoded Staging URLs
- All URLs point to `d3kuu45w6kl8hr.cloudfront.net`
- Production URL `api.dollor.ai` not configured
- **Fix Required:** Update AppConfig.swift

### 2. No Published Restaurants
- `/api/vendors/published?platform=ios` returns 0 restaurants
- **Fix Required:** Backend database migration

### 3. Backend in Test Mode
- Production backend: `isDummyPaymentMode: true`
- **Fix Required:** Update backend environment variables

---

## Cross-Platform Parity with Android

| Component | iOS | Android | Match |
|-----------|-----|---------|-------|
| API Endpoints | Same | Same | ✅ |
| Token Storage Keys | Same | Same | ✅ |
| Pricing Config | Same | Same | ✅ |
| Production URL | NOT SET | Set | ❌ |
| Authentication Flow | Same | Same | ✅ |

---

## Next Steps

1. [ ] Wait for backend fixes:
   - [ ] `isDummyPaymentMode` set to `false`
   - [ ] Restaurants published for iOS platform
   - [ ] Branding updated to Dollor.ai
2. [ ] Update AppConfig.swift to production URLs
3. [ ] Test P2P rideshare flow end-to-end
4. [ ] Submit to App Store
