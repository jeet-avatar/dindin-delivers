# iOS Restaurant App - API Verification Report

**Generated:** 2026-02-22
**Verified against:** Backend commit `d4013937` (HEAD of main)
**Last TestFlight Build:** Build 164 / Version 1.0 (from Xcode project settings)
**Source Commit:** Unable to trace -- no restaurant-specific git tags found
**Delta from HEAD:** Unknown
**Total API calls verified:** 40
**Passing:** 37
**Mismatches:** 3

## Summary

The iOS Restaurant app (`apps/ios/restaurant/eatffairrestaurant/`) makes API calls through three mechanisms:
1. **P2PAPIService.shared** (39 function calls) -- shared service in `apps/ios/eatfair-ios-shared/`
2. **AIEmployeeService.shared** (Firebase/Firestore only -- no direct REST API calls to backend; delegates to P2PAPIService.getAIEmployeeStats for analytics)
3. **Direct API calls** (0 calls) -- no direct URL construction found in any ViewModel or View

The `baseURL` in P2PAPIService is `"\(AppConfig.shared.p2pAPIBaseURL)/api"`, meaning all calls prepend `/api` to their paths.

---

## P2PAPIService.swift (Vendor Functions)

### Vendor Auth

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 1 | `vendorLogin` | POST | `/api/auth/vendor/login` | `main_new.py:1722` | None (login) | OK | form-urlencoded body |
| 2 | `vendorRegister` | POST | `/api/auth/vendor/register` | `main_new.py:2025` | None (register) | OK | Called from LoginView quick-register |
| 3 | `vendorPublicRegister` | POST | `/api/vendors/public` | `main_new.py:9780` | None (public) | OK | Full 4-step registration form |
| 4 | `vendorGoogleAuth` | POST | `/api/auth/vendor/google-auth` | `main_new.py:2183` | None (login) | OK | Login + register combined |
| 5 | `vendorAppleAuth` | POST | `/api/auth/vendor/apple-auth` | `main_new.py:2321` | None (login) | OK | Login + register combined |
| 6 | `requestVendorPasswordReset` | POST | `/api/vendor/password-reset/request` | `main_new.py:6388` | None (public) | OK | |
| 7 | `logout` | N/A | N/A (client-side only) | N/A | N/A | OK | Clears Keychain + UserDefaults |

### Menu Management

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 8 | `fetchMenuItems` | GET | `/api/vendors/{vendorId}/menu` | `main_new.py:13552` | None (middleware allows GET) | OK | Public via middleware regex allowlist (line 357) |
| 9 | `createMenuItem` | POST | `/api/vendors/{vendorId}/menu` | `main_new.py:13493` | vendorToken | OK | |
| 10 | `updateMenuItem` | PATCH | `/api/vendors/{vendorId}/menu/{itemId}` | `main_new.py:13637` (PUT only) | vendorToken | **MISMATCH** | iOS sends PATCH, backend only accepts PUT. Returns 405. |
| 11 | `toggleItemAvailability` | PATCH | `/api/vendors/{vendorId}/menu/{itemId}` | (delegates to updateMenuItem) | vendorToken | **MISMATCH** | Same PATCH vs PUT issue as #10 |
| 12 | `deleteMenuItem` | DELETE | `/api/vendors/{vendorId}/menu/{itemId}` | `main_new.py:13697` | vendorToken | OK | |
| 13 | `getMenuCategories` | GET | `/api/vendors/{vendorId}/menu/categories` | `main_new.py:13721` | vendorToken (sent) | OK | Middleware allows unauthenticated GET on this path |
| 14 | `assignStockImages` | POST | `/api/vendors/{vendorId}/menu/assign-stock-images` | `main_new.py:14342` | **None sent** | **MISMATCH** | Backend requires `require_vendor`. iOS does not send vendorToken. Returns 401. |

### Orders

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 15 | `fetchVendorOrders` | GET | `/api/erp/orders/vendor/{vendorId}` | `order_flow.py:2389` (prefix /api/erp) | vendorToken | OK | |
| 16 | `updateOrderStatus` | PUT | `/api/erp/orders/{orderId}/status?status=X` | `order_flow.py:2509` | vendorToken | OK | |
| 17 | `restaurantAcceptOrder` | POST | `/api/erp/orders/{orderId}/restaurant-accept` | `order_flow.py:1543` + alias `main_new.py:14473` | vendorToken | OK | 3-minute window |
| 18 | `restaurantDeclineOrder` | POST | `/api/erp/orders/{orderId}/restaurant-decline` | `order_flow.py:1655` + alias `main_new.py:14481` | vendorToken | OK | 3-minute window |
| 19 | `restaurantAcceptDelivery` | POST | `/api/erp/orders/{orderId}/restaurant-accept-delivery` | `order_flow.py:1854` + alias `main_new.py:14489` | vendorToken | OK | Self-delivery |
| 20 | `restaurantDeclineDelivery` | POST | `/api/erp/orders/{orderId}/restaurant-decline-delivery` | `order_flow.py:1949` + alias `main_new.py:14496` | vendorToken | OK | Send to driver pool |
| 21 | `restaurantCompleteDelivery` | POST | `/api/erp/orders/{orderId}/delivered` | `order_flow.py:2941` + alias `main_new.py:14466` | vendorToken | OK | Self-delivery completion |
| 22 | `uploadDeliveryPhoto` | POST | `/api/erp/orders/{orderId}/delivery-photo` | `order_flow.py:3803` | vendorToken or driverToken | OK | Multipart form data |

### KOT (Kitchen Order Ticket)

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 23 | `getKOTConfig` | GET | `/api/vendor/kot-config` | `main_new.py:10592` | vendorToken | OK | JWT-based vendor identification |
| 24 | `updateKOTConfig` | PUT | `/api/vendor/kot-config` | `main_new.py:10619` | vendorToken | OK | |
| 25 | `testKOTConnection` | POST | `/api/vendor/kot-test` | `main_new.py:10689` | vendorToken | OK | |
| 26 | `printKOT` | POST | `/api/erp/orders/{orderId}/print-kot` | `main_new.py:10770` | None sent | OK | Backend uses Depends(get_db) only at endpoint level |

### Promotions

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 27 | `createPromotion` | POST | `/api/promotions/create?vendor_id=X` | `promotions.py:98` | vendorToken | OK | |
| 28 | `getVendorPromotions` | GET | `/api/promotions/vendor/{vendorId}` | `promotions.py:397` | vendorToken | OK | |
| 29 | `updatePromotion` | PUT | `/api/promotions/{promotionId}` | `promotions.py:442` | vendorToken | OK | |
| 30 | `deletePromotion` | DELETE | `/api/promotions/{promotionId}` | `promotions.py:796` | vendorToken | OK | |
| 31 | `getPromotionSuggestions` | GET | `/api/promotions/suggestions/{vendorId}` | `promotions.py:263` | vendorToken | OK | AI-suggested promotions |
| 32 | `getPromotionAnalytics` | GET | `/api/promotions/analytics/{vendorId}` | `promotions.py:706` | vendorToken | OK | |
| 33 | `quickCreatePromotion` | POST | `/api/promotions/quick-create/{vendorId}/{promoType}` | `promotions.py:818` | vendorToken | OK | |

### Dashboard and Analytics

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 34 | `getAIInsights` | GET | `/api/vendors/{vendorId}/ai-insights?period=X` | `main_new.py:20746` | vendorToken | OK | |
| 35 | `getAIEmployeeStats` | GET | `/api/erp/analytics/ai-employees` | `main_new.py:17874` | **None sent** | **MISMATCH** | Backend requires `require_any_auth`. iOS does not send any auth token. Returns 401. |

### Settings and Profile

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 36 | `fetchVendorProfile` | GET | `/api/public/restaurants/{vendorId}` | `main_new.py:13888` | None (public) | OK | Only returns APPROVED vendors |
| 37 | `updateVendorStatus` | PUT | `/api/vendors/{vendorId}/online-status?is_online=X` | `main_new.py:11144` | vendorToken | OK | |
| 38 | `deleteVendorAccount` | DELETE | `/api/vendors/{vendorId}` | `main_new.py:11409` | vendorToken | OK | |

### Documents

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 39 | `getVendorDocuments` | GET | `/api/vendors/{vendorId}/documents` | `main_new.py:11251` | vendorToken or customerToken | OK | |
| 40 | `uploadVendorDocument` | POST | `/api/vendors/{vendorId}/documents` | `main_new.py:11298` | vendorToken or customerToken | OK | Multipart form data |

### FCM Token

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 41 | `saveVendorFCMToken` | POST | `/api/erp/vendors/{vendorId}/fcm-token` | `main_new.py:17790` + alias `main_new.py:21058` | None sent | OK | Backend does not require auth at endpoint level |

---

## AIEmployeeService.swift

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| -- | All CRUD operations | N/A | Firebase/Firestore | Firebase/Firestore | Firebase Auth | OK | Uses Firestore exclusively for AI employee create, read, update, delete |
| 35 | `getAIEmployeeStats` (via P2PAPIService) | GET | `/api/erp/analytics/ai-employees` | `main_new.py:17874` | **None sent** | **MISMATCH** | Already counted above |

---

## Direct API Calls in Restaurant App

No direct URL construction (URLRequest, URL(string:, URLComponents) was found outside of P2PAPIService or AIEmployeeService. All API calls go through P2PAPIService.shared.

---

## Mismatches Found

### Critical (App Crash / Data Loss / Feature Broken)

None found. All critical paths (auth, orders, KOT) are correctly wired.

### Medium (Feature Broken)

| # | Function | Issue | Fix Approach |
|---|----------|-------|-------------|
| 1 | `updateMenuItem` (P2PAPIService.swift:357) | iOS uses PATCH method but backend at main_new.py:13637 only registers PUT for `/api/vendors/{vendor_id}/menu/{item_id}`. PATCH returns 405 Method Not Allowed. **Menu item editing broken.** `toggleItemAvailability` also affected (delegates to updateMenuItem). | **iOS fix:** Change line 369 from `request.httpMethod = "PATCH"` to `request.httpMethod = "PUT"`. Or **backend fix:** Add @app.patch route alongside PUT. |
| 2 | `assignStockImages` (P2PAPIService.swift:1000) | iOS does NOT send vendorToken in the auth header. Backend at main_new.py:14342 requires `Depends(require_vendor)`. Returns 401 Unauthorized. **AI stock image assignment broken.** | **iOS fix:** Add `if let token = vendorToken { request.setValue("Bearer \\(token)", ...) }` to the function. |
| 3 | `getAIEmployeeStats` (P2PAPIService.swift:10933) | iOS does NOT send any auth token. Backend at main_new.py:17874 requires `Depends(require_any_auth)`. Returns 401 Unauthorized. **AI employee stats broken in AIEmployeesView.** | **iOS fix:** Add auth header to the request (vendorToken for restaurant app context). |

### Low (Cosmetic / Non-Breaking)

None found.

---

## Dead/Unused API Calls

| # | Function | Evidence | Impact if Used | Impact if Deleted |
|---|----------|----------|----------------|-------------------|
| None | N/A | All P2PAPIService functions called from the Restaurant app have active call sites | N/A | N/A |

The Restaurant app has no dead API calls. Every function called from P2PAPIService is actively used.

---

## Verification Methodology

1. Scanned all 15 Swift files in apps/ios/restaurant/eatffairrestaurant/ for P2PAPIService.shared, p2pAPI., URLRequest, URL(string:, and baseURL references
2. Traced each P2PAPIService function call to its definition in P2PAPIService.swift (~14,000 lines)
3. Extracted the URL path each function constructs (accounting for baseURL = p2pAPIBaseURL + "/api")
4. Verified path existence in backend via grep against main_new.py, order_flow.py, promotions.py
5. Checked HTTP method matches between iOS and backend route decorator
6. Verified auth token is sent where backend requires authentication via Depends(require_vendor) or Depends(require_any_auth)
7. Documented every mismatch with severity and fix approach
8. Confirmed AIEmployeeService.swift uses Firebase/Firestore exclusively (not REST API)
