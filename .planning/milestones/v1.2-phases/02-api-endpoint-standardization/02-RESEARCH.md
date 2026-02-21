# Phase 02: API Endpoint Standardization - Research

**Researched:** 2026-02-21
**Domain:** Cross-platform API path alignment (iOS Swift, Android Kotlin, Python FastAPI backend)
**Confidence:** HIGH

## Summary

A comprehensive code-level audit of all API paths across iOS (P2PAPIService.swift), Android (DollorApiService.kt + CustomerRideshareApiService.kt), and backend (main_new.py, order_flow.py, bid_routes.py) reveals that **the 8 mobile changes from the prior plan (wise-cooking-grove.md) were already applied** to client code. However, this audit uncovered **7 NEW bugs** -- endpoints called by clients that do NOT exist on the backend (guaranteed 404s), plus **17+ path divergences** where iOS and Android call different backend paths for the same operation (both work, but create maintenance burden).

The critical finding is that 3 iOS endpoints and 5+ Android endpoints are calling paths that do not exist. The iOS vendor delete account is broken (App Store compliance issue). Several Android financial endpoints (balance, bank-account, payouts) are 404ing, which would break any driver payout flow.

**Primary recommendation:** Fix the 7 broken endpoints first (backend aliases or client-side path fixes), then standardize the 17+ divergences by picking canonical paths and adding backend aliases for the transition period.

## Standard Stack

### Core (No new libraries needed)
| Component | Version/Location | Purpose | Notes |
|-----------|-----------------|---------|-------|
| Python FastAPI | Backend | API routes | Already in use -- just adding route aliases or fixing client paths |
| Swift URLSession | iOS shared lib | HTTP calls | Path changes only, no API changes |
| Kotlin Retrofit | Android shared module | HTTP calls | Path annotation changes only |

### Files To Modify
| File | Location | Lines | Changes |
|------|----------|-------|---------|
| `P2PAPIService.swift` | `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` | ~14,139 | Fix 3 broken paths |
| `DollorApiService.kt` | `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt` | ~1,395 | Fix broken paths, standardize divergences |
| `CustomerRideshareApiService.kt` | `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt` | ~1,233 | Already fixed from prior plan |
| `main_new.py` | `apps/web/p2p-platform/backend/main_new.py` | ~21,456 | Add missing route aliases, deprecate old aliases |
| `order_flow.py` | `apps/web/p2p-platform/backend/order_flow.py` | ~4,710 | Possible new route aliases |
| `bid_routes.py` | `apps/web/p2p-platform/backend/bid_routes.py` | ~3,203 | No changes expected |

### Architecture Info
| Component | Detail |
|-----------|--------|
| iOS baseURL | `AppConfig.shared.p2pAPIBaseURL + "/api"` = `https://api.dollor.ai/api` |
| Android Retrofit baseURL | `AppConfig.API_BASE_URL + "/"` = `https://api.dollor.ai/api/` |
| Android CustomerRideshareApiService baseURL | `AppConfig.apiBaseUrl.removeSuffix("/api")` = `https://api.dollor.ai` (adds `/api/` per endpoint) |
| order_flow.py router prefix | `/api/erp` |
| bid_routes.py router prefix | `/api/rides` |

## Architecture Patterns

### Pattern 1: Backend Route Alias (Preferred for Transition)
**What:** Add `app.add_api_route()` or `@app.get/post()` decorator pointing to existing handler
**When to use:** When a client calls a path that should work but doesn't -- backend fix is faster and lower-risk than mobile deploy
**Example:**
```python
# Source: main_new.py existing pattern (line 21143)
app.add_api_route("/api/auth/customer/apple-auth", customer_apple_auth, methods=["POST"])
```

### Pattern 2: Client Path Fix (Preferred for Standardization)
**What:** Change client URL string to match the canonical backend path
**When to use:** When both clients should use the same path and a clear canonical exists
**Example (iOS):**
```swift
// BEFORE (broken -- 404):
guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)/delete") else {
// AFTER (fixed -- matches backend):
guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)") else {
```

**Example (Android Retrofit):**
```kotlin
// Path change only -- method/params unchanged
@DELETE("vendors/{vendorId}")  // was: "vendors/{vendorId}/delete"
suspend fun deleteVendorAccount(...)
```

### Pattern 3: Backend-Side Fix for Missing Endpoints
**What:** Create new backend endpoint that delegates to existing logic
**When to use:** When client calls a path that semantically makes sense but backend never implemented it
**Example:**
```python
# For Android's GET /api/drivers/{driver_id}/balance
@app.get("/api/drivers/{driver_id}/balance")
def get_driver_balance(driver_id: int, ...):
    """Returns available balance from Stripe Connect"""
    ...
```

### Anti-Patterns to Avoid
- **Changing paths in production without aliases:** Always add the new path AS AN ALIAS first, deploy backend, then update clients, then deprecate old path
- **Fixing client AND backend simultaneously:** Creates a deploy ordering problem -- backend must have both paths working before any client ships
- **Removing backend aliases before confirming App Store/Play Store deployments:** Old app versions will still call old paths

## Verified Bugs (Endpoints That 404)

### BUG-01: iOS Vendor Delete Account (CRITICAL -- App Store compliance)
- **iOS calls:** `DELETE /api/vendors/{vendorId}/delete` (P2PAPIService.swift:6730)
- **Backend has:** `DELETE /api/vendors/{vendor_id}` (main_new.py:11347)
- **Issue:** Extra `/delete` suffix in iOS path
- **Fix:** Change iOS path to `/api/vendors/{vendorId}` (matches Android, which calls `vendors/{vendorId}`)
- **Confidence:** HIGH -- verified via grep, no aliases exist

### BUG-02: iOS Order Chat (GET + POST)
- **iOS calls:** `GET /api/orders/{orderId}/chat` (P2PAPIService.swift:11687) and `POST /api/orders/{orderId}/chat` (P2PAPIService.swift:11743)
- **Backend has:** `GET /api/customer/orders/{order_id}/chat` (main_new.py:16585) and `POST /api/customer/orders/{order_id}/chat` (main_new.py:16623)
- **Issue:** Missing `/customer/` prefix in iOS path
- **Fix:** Either add backend aliases or fix iOS paths
- **Confidence:** HIGH -- verified via grep

### BUG-03: iOS Menu Verification Status
- **iOS calls:** `GET /api/menu-verification/status/{vendorId}` (P2PAPIService.swift:1043)
- **Android calls:** `GET /api/menu-verification/status/{vendorId}` (DollorApiService.kt:1370)
- **Backend has:** No `menu-verification` endpoints at all
- **Fix:** Create backend endpoints OR remove from clients (if feature not implemented)
- **Confidence:** HIGH -- verified, no match in main_new.py

### BUG-04: iOS Menu Verification Approve-All
- **iOS calls:** `POST /api/menu-verification/approve-all/{vendorId}` (P2PAPIService.swift:1077)
- **Backend has:** Nothing
- **Fix:** Same as BUG-03
- **Confidence:** HIGH

### BUG-05: iOS Promotions Quick-Create
- **iOS calls:** `POST /api/promotions/quick-create/{vendorId}/{promoType}` (P2PAPIService.swift:963)
- **Backend has:** Nothing
- **Fix:** Create backend endpoint or remove from iOS
- **Confidence:** HIGH

### BUG-06: Android Customer Demo Login
- **Android calls:** `POST /api/customer/demo-login` (DollorApiService.kt:85)
- **Backend has:** No customer demo-login endpoint (only vendor demo-login at `/api/auth/vendor/demo-login`)
- **Fix:** Add backend alias OR change Android to use standard login (demo handled server-side)
- **Impact:** LOW -- demo login is only for App Store review
- **Confidence:** HIGH

### BUG-07: Android Driver Demo Login
- **Android calls:** `POST /api/auth/driver/demo-login` (DollorApiService.kt:478)
- **Backend has:** Nothing
- **Fix:** Same as BUG-06
- **Impact:** LOW
- **Confidence:** HIGH

### Android Financial Endpoints (Missing Backend)
These Android endpoints call paths that don't exist. Impact depends on whether these features are actually used in the Android app:

| Android Endpoint | Path Called | Backend Status |
|-----------------|------------|----------------|
| `getDriverBalance` | `GET /api/drivers/{id}/balance` | NOT FOUND |
| `linkBankAccount` | `POST /api/drivers/{id}/bank-account` | NOT FOUND |
| `requestPayout` | `POST /api/drivers/{id}/payouts` | NOT FOUND |
| `updateVendorBankAccount` | `POST /api/vendors/{id}/bank-account` | NOT FOUND |
| `getVendorPayouts` | `GET /api/erp/payouts/vendor/{id}` | NOT FOUND |

**Note:** These are in DollorApiService.kt but the actual driver payout flow may use Stripe Connect endpoints (which DO exist) instead. Verification needed to determine if these are actually called in the Android app flow.

## Path Divergences (Both Work, But Should Standardize)

These are cases where iOS and Android call DIFFERENT backend paths for the same logical operation. Both paths work, but maintaining duplicate routes is a burden.

| # | Operation | iOS Path | Android Path | Canonical | Action |
|---|-----------|----------|-------------|-----------|--------|
| 1 | Driver location update | `PUT /api/auth/driver/location` | `POST /api/driver/location` | TBD | Standardize to one |
| 2 | Driver online/status toggle | `PUT /api/auth/driver/online` | `GET/POST /api/drivers/{id}/status` | `/api/drivers/{id}/status` | Standardize |
| 3 | Driver dashboard/earnings | `GET /api/v5/driver/{id}/dashboard` | `GET /api/drivers/{id}/earnings` | `/api/drivers/{id}/earnings` | Standardize |
| 4 | Available rides (driver) | `GET /api/erp/rides/available` | `GET /api/rides/available` | `/api/rides/available` (bid_routes) | Standardize |
| 5 | Ride tracking | `GET /api/erp/rides/{id}/track` | `GET /api/rides/{id}/track` | Either | Low priority |
| 6 | Ride accept (driver) | `POST /api/erp/rides/{id}/accept` | `POST /api/erp/rides/{id}/accept` | Aligned | None needed |
| 7 | Ride picked up | `POST /api/erp/rides/{id}/picked-up` | `POST /api/rides/request/{id}/arrived` | Different semantics? | Investigate |
| 8 | Ride complete | `PUT /api/erp/orders/{id}/complete-delivery` + `POST /api/rides/request/{id}/complete` | `POST /api/rides/request/{id}/complete` | bid_routes complete | Remove iOS legacy |
| 9 | Order status update | `PUT /api/erp/orders/{id}/status` | `PATCH /api/orders/{id}/status` | Either | Low priority |
| 10 | Vendor online status | `PUT /api/vendors/{id}/online-status` | `PATCH /api/vendors/{id}` | Either | Low priority |
| 11 | My deliveries (driver) | `GET /api/erp/orders/driver/{id}/active` | `GET /api/erp/driver/{id}/deliveries` | Different data | Low priority |
| 12 | FCM token registration | `POST /api/erp/{role}/{id}/fcm-token` | `POST /api/notifications/register-token` | Different approach | Low priority |
| 13 | Driver payout history | `GET /api/rides/driver/{id}/payout-history` | `GET /api/drivers/{id}/payout-history` | Either | Low priority |
| 14 | Driver bids list | `GET /api/rides/driver/{id}/bids` | `GET /api/driver/bids` | bid_routes canonical | Standardize |
| 15 | Vendor delete | `DELETE /api/vendors/{id}/delete` (BUG) | `DELETE /api/vendors/{id}` | `/api/vendors/{id}` | Fix iOS |
| 16 | Order chat | `GET/POST /api/orders/{id}/chat` (BUG) | `GET/POST /api/customer/orders/{id}/chat` | `/api/customer/orders/{id}/chat` | Fix iOS |
| 17 | iOS has duplicate ride complete | Two functions for same op | One function | Remove `completeRide()` | iOS cleanup |

## Prior Plan Status

The previous plan (`.claude/plans/wise-cooking-grove.md`) identified 13 divergences and 8 required changes. **All 8 changes have been applied to the current code:**

| Change | Status | Evidence |
|--------|--------|----------|
| Ride chat: iOS to `/p2p/ride-requests/{id}/chat` | DONE | P2PAPIService.swift:6824 uses canonical path |
| Ride history: Android to `/customer/rides/history` | DONE | DollorApiService.kt:307 uses correct path |
| Ride rating: Android to `/rides/{id}/rate` | DONE | DollorApiService.kt:323 uses correct path |
| Ride cancel: Android to `/rides/request/{id}/cancel` | DONE | DollorApiService.kt:316 uses correct path |
| Order create: Android to `/erp/orders/create` | DONE | DollorApiService.kt:117 uses correct path |
| Card default: iOS to POST | DONE | P2PAPIService.swift:6628 uses POST |
| Favorites add: iOS to path params | DONE | P2PAPIService.swift:2604 uses path params |
| Recurring delete: Android fix | DONE | CustomerRideshareApiService.kt:951 uses correct path |

**However, these changes were never committed through the GSD pipeline** and are not in git history. They were likely applied directly to source files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Backend route aliases | Custom middleware redirect | `app.add_api_route()` | FastAPI's built-in mechanism, zero overhead |
| Path testing | Manual curl | `scripts/extract-api-endpoints.py` | Already exists, generates API_REGISTRY.md |
| Cross-platform sync | Manual comparison | Side-by-side grep audit | Same approach used in this research |

## Common Pitfalls

### Pitfall 1: Deploy Ordering
**What goes wrong:** Updating client path before backend has the new route, causing 404s in production
**Why it happens:** Backend and mobile have different deploy timelines
**How to avoid:** Always add backend alias FIRST, deploy backend, then update clients, then deprecate old alias after app adoption
**Warning signs:** New endpoint returning 404 in staging/production

### Pitfall 2: iOS/Android Different baseURL Assembly
**What goes wrong:** Assuming iOS and Android path strings are equivalent
**Why it happens:** iOS uses `\(baseURL)/path` where baseURL = `host/api`. Android Retrofit uses `@GET("path")` where baseUrl = `host/api/`. Both resolve to `host/api/path` but string comparison doesn't match.
**How to avoid:** Always resolve full URLs when comparing. iOS: `baseURL + "/" + path`. Android: `baseUrl + path`.
**Warning signs:** Grepping for a path finds it in one platform but not the other

### Pitfall 3: Removing Backend Aliases Too Early
**What goes wrong:** Old app versions in the wild still call deprecated paths, get 404s
**Why it happens:** App Store/Play Store approval takes days, users don't update immediately
**How to avoid:** Keep aliases for minimum 90 days after new app version ships
**Warning signs:** Sudden spike in 404 errors after backend deploy

### Pitfall 4: Missing the CustomerRideshareApiService
**What goes wrong:** Auditing DollorApiService.kt but missing endpoints in CustomerRideshareApiService.kt
**Why it happens:** Android splits rideshare endpoints into a separate file using raw OkHttp instead of Retrofit
**How to avoid:** Always check BOTH files for Android rideshare endpoints
**Warning signs:** Rideshare-related 404s on Android only

### Pitfall 5: Phase 01 Deleted Proxy Stubs
**What goes wrong:** Assuming endpoints exist because they used to be in main_new.py
**Why it happens:** Phase 01 deleted 93 ERP proxy stubs. Some clients may still reference deleted paths.
**How to avoid:** Always verify against CURRENT backend code, not memory/docs
**Warning signs:** Endpoints that exist in memory notes but not in grep results

## Code Examples

### Adding a Backend Route Alias
```python
# Source: main_new.py pattern (existing aliases, lines 21100-21170)
# Register alias pointing to existing handler function:
app.add_api_route("/api/vendors/{vendor_id}/delete", delete_vendor, methods=["DELETE"])
```

### Fixing iOS Path
```swift
// Source: P2PAPIService.swift (verified current code)
// BEFORE (BUG-01 -- 404):
guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)/delete") else {
// AFTER (matches backend DELETE /api/vendors/{vendor_id}):
guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)") else {
```

### Fixing Android Retrofit Path
```kotlin
// Source: DollorApiService.kt (Retrofit annotation)
// Demo login fix -- change to standard login flow:
// BEFORE:
@POST("customer/demo-login")
suspend fun customerDemoLogin(@Body request: DemoLoginRequest): CustomerLoginResponse
// AFTER: Remove or change to use standard auth/customer/login
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 40+ duplicate alias routes | Phase 01 deleted 93 proxy stubs | 2026-02-21 | Reduced alias count significantly |
| iOS/Android unchecked paths | API_REGISTRY.md + grep verification | v1.1 Phase 03.1 | Prevents hallucinated endpoints in plans |
| Manual endpoint comparison | This research audit | Now | First complete cross-platform path audit |

## Priority-Ordered Fix List

### P0 -- CRITICAL (Broken functionality)
1. **BUG-01:** iOS vendor delete account -- App Store requires working account deletion
2. **BUG-02:** iOS order chat -- customers can't chat about food orders

### P1 -- HIGH (Broken but low-traffic features)
3. **BUG-03/04:** Menu verification endpoints (iOS + Android) -- not implemented on backend
4. **BUG-05:** iOS promotions quick-create -- not implemented on backend

### P2 -- MEDIUM (Developer experience, future-proofing)
5. Standardize iOS ride complete to use `rides/request/{id}/complete` (remove legacy `complete-delivery` usage for rides)
6. Standardize available rides path (both use `/api/rides/available`)
7. Standardize driver status path

### P3 -- LOW (Nice to have, no user impact)
8. **BUG-06/07:** Demo login endpoints (only affects App Store review)
9. Android financial endpoints (balance, bank-account, payouts) -- may not be called in practice
10. Remaining path divergences (both work, maintenance cost only)

## Open Questions

1. **Are Android financial endpoints (balance, bank-account, payouts) actually called in the app?**
   - What we know: DollorApiService.kt defines them, backend doesn't have them
   - What's unclear: Whether any Android screen/ViewModel actually invokes these methods
   - Recommendation: `grep -r "getDriverBalance\|linkBankAccount\|requestPayout" /Users/jeet/StudioProjects/eatfair-android/` to check usage

2. **Should BUG-03/04/05 (menu verification, quick-create) be implemented or removed?**
   - What we know: Clients call them, backend doesn't have them
   - What's unclear: Whether these are planned features or abandoned stubs
   - Recommendation: Ask user -- if not planned, remove from clients; if planned, defer to future phase

3. **Were the 8 prior plan changes committed to Android git?**
   - What we know: Changes are in current Android code but no GSD commit trail
   - What's unclear: Whether they were pushed/committed to Android repo
   - Recommendation: Check `git log` in `/Users/jeet/StudioProjects/eatfair-android` for recent changes

4. **Should backend aliases be removed eventually?**
   - What we know: ~30+ alias routes remain in main_new.py for backward compatibility
   - What's unclear: Whether old app versions are still in use
   - Recommendation: Track alias removal as a separate future task, 90-day minimum transition

## Sources

### Primary (HIGH confidence)
- Direct grep of `main_new.py` (21,456 lines) -- all `@app.get/post/put/delete/patch` decorators and `add_api_route` calls
- Direct grep of `order_flow.py` (router prefix `/api/erp`) and `bid_routes.py` (router prefix `/api/rides`)
- Direct read of `P2PAPIService.swift` (14,139 lines) -- all `baseURL` path constructions
- Direct read of `DollorApiService.kt` (1,395 lines) -- all Retrofit `@GET/@POST/@PUT/@DELETE/@PATCH` annotations
- Direct read of `CustomerRideshareApiService.kt` (1,233 lines) -- all OkHttp URL constructions
- Prior plan: `.claude/plans/wise-cooking-grove.md` -- cross-referenced against current code

### Secondary (MEDIUM confidence)
- `AppConfig.kt` (Android) confirming baseURL = `https://api.dollor.ai/api`
- `SharedModule.kt` (Android) confirming Retrofit base URL construction
- `P2PAPIService.swift:14-15` confirming iOS baseURL = `AppConfig.shared.p2pAPIBaseURL + "/api"`

## Metadata

**Confidence breakdown:**
- Bugs (BUG-01 through BUG-07): HIGH -- verified via grep, each client path checked against ALL backend route definitions
- Divergences: HIGH -- systematic comparison of all endpoint paths in both clients against backend
- Prior plan status: HIGH -- verified each of 8 changes in current source code
- Android financial endpoints: MEDIUM -- confirmed missing on backend but unclear if actually called from app

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- only changes if new backend routes are added)
