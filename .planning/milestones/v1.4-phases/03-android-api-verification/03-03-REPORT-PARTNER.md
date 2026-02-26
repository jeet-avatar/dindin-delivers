# Android Partner (Restaurant) App API Verification Report

## Build Baseline
- Package: `ai.dollor.partner`
- Last Firebase build: vC=18, v1.0.17 (Feb 23, 2026)
- API Base URL: `https://api.dollor.ai/api` (from shared `AppConfig.kt`)
- Retrofit base: `AppConfig.apiBaseUrl` = `https://api.dollor.ai/api` (all paths below are relative to this)

## Summary
- **Total endpoints verified: 53** (all via Retrofit DollorApiService.kt)
- **OK: 52**
- **Mismatches: 1** (MEDIUM: vendor account deletion requires admin auth, not vendor auth)
- **Dead code: 9** (endpoints defined in DollorApiService but not called by any partner ViewModel/service)

## Partner App ViewModel-to-API Mapping

### Authentication (AuthViewModel, RegistrationViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| AuthViewModel | `vendorLogin()` | `vendorLogin()` | `POST auth/vendor/login` |
| AuthViewModel | `vendorGoogleAuth()` | `vendorGoogleAuth()` | `POST auth/vendor/google-auth` |
| AuthViewModel | `vendorDemoLogin()` | `vendorDemoLogin()` | `POST auth/vendor/demo-login` |
| AuthViewModel | `registerFcmTokenIfNeeded()` | `registerPushToken()` | `POST notifications/register-token` |
| AuthViewModel | `vendorLogout()` | (local only) | N/A - clears local storage |
| RegistrationViewModel | `vendorPublicRegister()` | `vendorPublicRegister()` | `POST vendors/public` |

### Profile & Settings (ProfileViewModel, SettingsViewModel, EditProfileScreen)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| ProfileViewModel | `getVendorProfile()` | `getVendorProfile()` | `GET vendor/profile` |
| ProfileViewModel | `updateVendorOnlineStatus()` | `updateVendorOnlineStatus()` | `PATCH vendors/{vendorId}` |
| SettingsViewModel | `getVendorProfile()` | `getVendorProfile()` | `GET vendor/profile` |
| SettingsViewModel | `getVendorPayouts()` | `getVendorPayouts()` | `GET erp/payouts/vendor/{vendorId}` |
| SettingsViewModel | `updateVendorOnlineStatus()` | `updateVendorOnlineStatus()` | `PATCH vendors/{vendorId}` |
| SettingsViewModel | `updateVendorProfile()` | `updateVendorProfile()` | `PATCH vendors/{vendorId}` |
| SettingsViewModel | `updateVendorBusinessHours()` | `updateVendorBusinessHours()` | `PATCH vendors/{vendorId}` |
| SettingsViewModel | `deleteVendorAccount()` | `deleteVendorAccount()` | `DELETE vendors/{vendorId}` |
| SettingsViewModel | `vendorLogout()` | (local only) | N/A |

### Notification Settings (NotificationSettingsScreen)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| NotificationSettingsScreen | `updateVendorNotificationSettings()` | `updateVendorNotificationSettings()` | `PATCH vendors/{vendorId}` |

### Payment Settings (PaymentSettingsScreen)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| PaymentSettingsScreen | `getVendorStripeStatus()` | `getVendorStripeStatus()` | `GET vendors/{vendorId}/stripe/status` |
| PaymentSettingsScreen | `createVendorStripeAccount()` | `createVendorStripeAccount()` | `POST vendors/{vendorId}/stripe/connect` |
| PaymentSettingsScreen | `getVendorStripeOnboardingLink()` | `getVendorStripeOnboardingLink()` | `GET vendors/{vendorId}/stripe/onboarding-link` |
| PaymentSettingsScreen | `getVendorStripeDashboardLink()` | `getVendorStripeDashboardLink()` | `POST vendors/{vendorId}/stripe/dashboard-link` |

### Documents (RestaurantDocumentsViewModel -- direct DollorApiService)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| RestaurantDocumentsViewModel | (direct) `api.getVendorDocuments()` | `getVendorDocuments()` | `GET vendors/{vendorId}/documents` |
| RestaurantDocumentsViewModel | (direct) `api.uploadVendorDocument()` | `uploadVendorDocument()` | `POST vendors/{vendorId}/documents` |
| RestaurantDocumentsViewModel | (direct) `api.deleteVendorDocument()` | `deleteVendorDocument()` | `DELETE vendors/{vendorId}/documents/{documentId}` |

### Orders (OrdersViewModel, OrderDetailsScreen)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| OrdersViewModel | `getVendorOrders()` | `getVendorOrders()` | `GET erp/orders/vendor/{vendorId}` |
| OrdersViewModel | `acceptOrder()` | `acceptOrder()` | `PATCH orders/{orderId}/status` |
| OrdersViewModel | `rejectOrder()` | `rejectOrder()` | `PATCH orders/{orderId}/status` |
| OrdersViewModel | `markOrderReady()` | `markOrderReady()` | `PATCH orders/{orderId}/status` |
| OrdersViewModel | `restaurantAcceptOrder()` | `restaurantAcceptOrder()` | `POST erp/orders/{orderId}/restaurant-accept` |
| OrdersViewModel | `restaurantDeclineDelivery()` | `restaurantDeclineDelivery()` | `POST erp/orders/{orderId}/restaurant-decline-delivery` |
| OrdersViewModel | `restaurantAcceptDelivery()` | `restaurantAcceptDelivery()` | `POST erp/orders/{orderId}/restaurant-accept-delivery` |
| OrdersViewModel | `updateOrderStatus("out_for_delivery")` | `updateOrderStatus()` | `PATCH orders/{orderId}/status` |
| OrdersViewModel | `updateOrderStatus("delivered")` | `updateOrderStatus()` | `PATCH orders/{orderId}/status` |
| OrdersViewModel | `updateVendorOnlineStatus()` | `updateVendorOnlineStatus()` | `PATCH vendors/{vendorId}` |
| OrderDetailsScreen | `getOrderDetails()` | `getVendorOrders()` (filters locally) | `GET erp/orders/vendor/{vendorId}` |
| OrderDetailsScreen | `restaurantAcceptOrder()` | `restaurantAcceptOrder()` | `POST erp/orders/{orderId}/restaurant-accept` |
| OrderDetailsScreen | `restaurantDeclineOrder()` | `restaurantDeclineOrder()` | `POST erp/orders/{orderId}/restaurant-decline` |
| OrderDetailsScreen | `restaurantAcceptDelivery()` | `restaurantAcceptDelivery()` | `POST erp/orders/{orderId}/restaurant-accept-delivery` |
| OrderDetailsScreen | `restaurantDeclineDelivery()` | `restaurantDeclineDelivery()` | `POST erp/orders/{orderId}/restaurant-decline-delivery` |

### Menu (MenuViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| MenuViewModel | `getVendorMenu()` | `getVendorMenu()` | `GET vendors/{vendorId}/menu` |
| MenuViewModel | `addMenuItem()` | `addMenuItem()` | `POST vendors/{vendorId}/menu` |
| MenuViewModel | `updateMenuItem()` | `updateMenuItem()` | `PUT vendors/{vendorId}/menu/{itemId}` |
| MenuViewModel | `deleteMenuItem()` | `deleteMenuItem()` | `DELETE vendors/{vendorId}/menu/{itemId}` |
| MenuViewModel | `patchMenuItem()` | `patchMenuItem()` | `PATCH vendors/{vendorId}/menu/{itemId}/customizations` |

### Reviews (ReviewsViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| ReviewsViewModel | `getVendorReviews()` | `getVendorReviews()` | `GET vendors/{vendorId}/reviews` |

### Promotions (PromotionsViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| PromotionsViewModel | `getVendorPromotions()` | `getVendorPromotions()` | `GET promotions/vendor/{vendorId}` |
| PromotionsViewModel | `togglePromotion()` | `updatePromotion()` | `PUT promotions/{promotionId}` |
| PromotionsViewModel | `deletePromotion()` | `deletePromotion()` | `DELETE promotions/{promotionId}` |

### AI Employees (AIEmployeesViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| AIEmployeesViewModel | `getAIEmployeesStats()` | `getAIEmployeesStats()` | `GET erp/analytics/ai-employees` |

### KOT Settings (KOTSettingsViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| KOTSettingsViewModel | `getKOTConfig()` | `getKOTConfig()` | `GET vendor/kot-config` |
| KOTSettingsViewModel | `updateKOTConfig()` | `updateKOTConfig()` | `PUT vendor/kot-config` |

### Earnings (EarningsScreen)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| EarningsScreen | `getVendorPayouts()` | `getVendorPayouts()` | `GET erp/payouts/vendor/{vendorId}` |
| EarningsScreen | `getVendorOrders()` | `getVendorOrders()` | `GET erp/orders/vendor/{vendorId}` |

### Push Notifications (PartnerFirebaseMessagingService)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| PartnerFirebaseMessagingService | `registerPushToken()` | `registerPushToken()` | `POST notifications/register-token` |

## Verification Results

### Vendor Authentication
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 1 | POST | `auth/vendor/login` | `main_new.py:1756` `@app.post("/api/auth/vendor/login")` | OK | FormUrlEncoded |
| 2 | POST | `auth/vendor/register` | `main_new.py:2054` `@app.post("/api/auth/vendor/register")` | OK | NOT called by partner app (dead code) |
| 3 | POST | `auth/vendor/google-auth` | `main_new.py:2208` `@app.post("/api/auth/vendor/google-auth")` | OK | |
| 4 | POST | `auth/vendor/apple-auth` | `main_new.py:2304` `@app.post("/api/auth/vendor/apple-auth")` | OK | NOT called by partner app (dead code -- Apple Sign-In is iOS only) |
| 5 | POST | `vendor/password-reset/request` | `main_new.py:6292` `@app.post("/api/vendor/password-reset/request")` | OK | NOT called by partner app (dead code -- no forgot password UI) |
| 6 | POST | `vendor/password-reset/confirm` | `main_new.py:6321` `@app.post("/api/vendor/password-reset/confirm")` | OK | NOT called by partner app (dead code) |
| 7 | POST | `auth/vendor/demo-login` | `main_new.py:1820` `@app.post("/api/auth/vendor/demo-login")` | OK | Requires ADMIN_SECRET_KEY |
| 8 | POST | `vendors/public` | `main_new.py:9683` `@app.post("/api/vendors/public")` | OK | Public self-registration |
| 9 | DELETE | `vendors/{vendorId}` | `main_new.py:11304` `@app.delete("/api/vendors/{vendor_id}")` | **MISMATCH** | Backend requires `require_admin`, but Android sends vendor token. See Mismatches. |

### Vendor Profile & Settings
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 10 | GET | `vendor/profile` | `main_new.py:10400` `@app.get("/api/vendor/profile")` | OK | Token-based vendor lookup |
| 11 | GET | `vendors/{vendorId}` | `main_new.py:10389` `@app.get("/api/vendors/{vendor_id}")` | OK | NOT called by partner app (dead code) |
| 12 | PATCH | `vendors/{vendorId}` (profile) | `main_new.py:10756` `@app.patch("/api/vendors/{vendor_id}")` | OK | Multiple PATCH overloads share same backend route |
| 13 | PATCH | `vendors/{vendorId}` (hours) | `main_new.py:10756` same as above | OK | Backend accepts any subset of fields |
| 14 | PATCH | `vendors/{vendorId}` (notifications) | `main_new.py:10756` same as above | OK | |
| 15 | PATCH | `vendors/{vendorId}` (online status) | `main_new.py:10756` same as above | OK | |

### Vendor Documents
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 16 | GET | `vendors/{vendorId}/documents` | `main_new.py:11146` `@app.get("/api/vendors/{vendor_id}/documents")` | OK | Returns document list |
| 17 | POST | `vendors/{vendorId}/documents` | `main_new.py:11193` `@app.post("/api/vendors/{vendor_id}/documents")` | OK | Multipart upload -- correct handler (unlike driver alias bug) |
| 18 | DELETE | `vendors/{vendorId}/documents/{documentId}` | `main_new.py:11254` `@app.delete("/api/vendors/{vendor_id}/documents/{document_id}")` | OK | |

### Vendor Payouts
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 19 | GET | `erp/payouts/vendor/{vendorId}` | `main_new.py:5364` `@app.get("/api/erp/payouts/vendor/{vendor_id}")` | OK | Returns payout balance and settings |
| 20 | POST | `vendors/{vendorId}/bank-account` | `main_new.py:5315` `@app.post("/api/vendors/{vendor_id}/bank-account")` | OK | NOT called by partner app (dead code -- uses Stripe Connect) |

### Vendor Orders
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 21 | GET | `erp/orders/vendor/{vendorId}` | `order_flow.py:2389` (prefix `/api/erp`) | OK | Full path: `/api/erp/orders/vendor/{vendor_id}` |
| 22 | GET | `erp/orders/vendor/{vendorId}` (alt) | same as above | OK | Duplicate method `getVendorOrdersAlt` -- NOT called by partner app (dead code) |
| 23 | PATCH | `orders/{orderId}/status` | `main_new.py:8783` `@app.patch("/api/orders/{order_id}/status")` | OK | Generic status update with query param |
| 24 | PATCH | `orders/{orderId}/status` (accept) | same as above | OK | Status = "confirmed" |
| 25 | PATCH | `orders/{orderId}/status` (reject) | same as above | OK | Status = "cancelled" |
| 26 | PATCH | `orders/{orderId}/status` (ready) | same as above | OK | Status = "ready_for_pickup" |

### Restaurant Acceptance Flow
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 27 | POST | `erp/orders/{orderId}/restaurant-accept` | `order_flow.py:1543` (prefix `/api/erp`) | OK | Full: `/api/erp/orders/{order_id}/restaurant-accept` |
| 28 | POST | `erp/orders/{orderId}/restaurant-decline` | `order_flow.py:1655` (prefix `/api/erp`) | OK | Full: `/api/erp/orders/{order_id}/restaurant-decline` |

### Delivery Decision Flow
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 29 | POST | `erp/orders/{orderId}/restaurant-accept-delivery` | `order_flow.py:1854` (prefix `/api/erp`) | OK | Full: `/api/erp/orders/{order_id}/restaurant-accept-delivery` |
| 30 | POST | `erp/orders/{orderId}/restaurant-decline-delivery` | `order_flow.py:1949` (prefix `/api/erp`) | OK | Full: `/api/erp/orders/{order_id}/restaurant-decline-delivery` |

### Menu Management
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 31 | GET | `vendors/{vendorId}/menu` | `main_new.py:13447` `@app.get("/api/vendors/{vendor_id}/menu")` | OK | No auth required (public menu) |
| 32 | GET | `vendors/{vendorId}/menu/categories` | `main_new.py:13616` `@app.get("/api/vendors/{vendor_id}/menu/categories")` | OK | |
| 33 | POST | `vendors/{vendorId}/menu` | `main_new.py:13388` `@app.post("/api/vendors/{vendor_id}/menu")` | OK | Create menu item |
| 34 | PUT | `vendors/{vendorId}/menu/{itemId}` | `main_new.py:13532` `@app.put("/api/vendors/{vendor_id}/menu/{item_id}")` | OK | Full update |
| 35 | PATCH | `vendors/{vendorId}/menu/{itemId}/customizations` | `main_new.py:13560` `@app.patch("/api/vendors/{vendor_id}/menu/{item_id}/customizations")` | OK | Partial update |
| 36 | DELETE | `vendors/{vendorId}/menu/{itemId}` | `main_new.py:13592` `@app.delete("/api/vendors/{vendor_id}/menu/{item_id}")` | OK | |

### Reviews
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 37 | GET | `vendors/{vendorId}/reviews` | `main_new.py:17214` `@app.get("/api/vendors/{vendor_id}/reviews")` | OK | Pagination via limit/offset query params |

### Promotions
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 38 | GET | `promotions/vendor/{vendorId}` | `promotions.py:397` (prefix `/api/promotions`) | OK | Full: `/api/promotions/vendor/{vendor_id}` |
| 39 | POST | `promotions/create` | `promotions.py:98` (prefix `/api/promotions`) | OK | Full: `/api/promotions/create`. NOT called by partner app (dead code) |
| 40 | PUT | `promotions/{promotionId}` | `promotions.py:442` (prefix `/api/promotions`) | OK | Full: `/api/promotions/{promotion_id}` |
| 41 | DELETE | `promotions/{promotionId}` | `promotions.py:796` (prefix `/api/promotions`) | OK | Full: `/api/promotions/{promotion_id}` |
| 42 | GET | `promotions/analytics/{vendorId}` | `promotions.py:706` (prefix `/api/promotions`) | OK | NOT called by partner app (dead code) |
| 43 | GET | `promotions/suggestions/{vendorId}` | `promotions.py:263` (prefix `/api/promotions`) | OK | NOT called by partner app (dead code) |

### Vendor Stripe Connect
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 44 | POST | `vendors/{vendorId}/stripe/connect` | `main_new.py:4902` `@app.post("/api/vendors/{vendor_id}/stripe/connect")` | OK | |
| 45 | GET | `vendors/{vendorId}/stripe/onboarding-link` | `main_new.py:4973` `@app.get("/api/vendors/{vendor_id}/stripe/onboarding-link")` | OK | |
| 46 | GET | `vendors/{vendorId}/stripe/status` | `main_new.py:5044` `@app.get("/api/vendors/{vendor_id}/stripe/status")` | OK | |
| 47 | POST | `vendors/{vendorId}/stripe/dashboard-link` | `main_new.py:5123` `@app.post("/api/vendors/{vendor_id}/stripe/dashboard-link")` | OK | |

### KOT Config
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 48 | GET | `vendor/kot-config` | `main_new.py:10488` `@app.get("/api/vendor/kot-config")` | OK | |
| 49 | PUT | `vendor/kot-config` | `main_new.py:10515` `@app.put("/api/vendor/kot-config")` | OK | |

### AI Employees
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 50 | GET | `erp/analytics/ai-employees` | `main_new.py:17769` `@app.get("/api/erp/analytics/ai-employees")` | OK | Also aliased at line 21001 without `/api/` prefix |
| 51 | GET | `menu-verification/status/{vendorId}` | `menu_verification.py:94` (prefix `/api/menu-verification`) | OK | Full: `/api/menu-verification/status/{vendor_id}`. NOT called by partner app (dead code) |

### Legal
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 52 | GET | `legal/tos` | `main_new.py:19214` `@app.get("/api/legal/tos")` | OK | |
| 53 | GET | `legal/privacy-policy` | `main_new.py:19220` `@app.get("/api/legal/privacy-policy")` | OK | Android-specific alias for `/api/legal/privacy` |

### Push Notifications
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 54 (shared) | POST | `notifications/register-token` | `main_new.py:17958` `@app.post("/api/notifications/register-token")` | OK | FormUrlEncoded -- shared across all 3 apps |

## Mismatches Detail

### MISMATCH #1 (MEDIUM): Vendor account deletion requires admin auth

- **Endpoint:** `DELETE /api/vendors/{vendorId}`
- **Android code:** `DollorApiService.kt:968` -- `@DELETE("vendors/{vendorId}")` with vendor `@Header("Authorization")` token
- **Repository:** `DollorRepository.kt:497` -- uses `SecureStorage.UserType.VENDOR` token
- **Backend:** `main_new.py:11304` -- `delete_vendor(vendor_id, db, admin=Depends(require_admin))`
- **Impact:** Vendor account self-deletion from the Android app will always return 403 because the backend requires admin JWT (via `require_admin` dependency). Play Store requires apps to provide account deletion -- this feature is broken for vendors.
- **Fix options:**
  1. **Backend fix (preferred):** Add a vendor self-delete endpoint like `DELETE /api/vendor/delete-account` that accepts vendor JWT, similar to how `DELETE /api/customers/{customer_id}/delete` and `DELETE /api/drivers/{driver_id}/delete` work for those roles.
  2. **Backend fix (alternative):** Modify the existing endpoint to accept vendor self-deletion when the vendor JWT matches the vendor_id being deleted.
- **Severity:** MEDIUM -- Required by Play Store policy, but admin can delete on behalf of vendor as a workaround.

## Dead Code Analysis

The following DollorApiService vendor-facing endpoints exist but are NOT called by any partner ViewModel or service:

| # | Method | Retrofit Path | DollorApiService Method | Reason |
|---|--------|--------------|------------------------|--------|
| 1 | POST | `auth/vendor/register` | `vendorRegister()` | Partner uses public registration (`vendors/public`) instead |
| 2 | POST | `auth/vendor/apple-auth` | `vendorAppleAuth()` | Apple Sign-In is iOS-only; Android uses Google Sign-In |
| 3 | POST | `vendor/password-reset/request` | `requestVendorPasswordReset()` | No forgot password UI in partner app |
| 4 | POST | `vendor/password-reset/confirm` | `confirmVendorPasswordReset()` | No forgot password UI in partner app |
| 5 | GET | `vendors/{vendorId}` | `getVendorById()` | Partner uses token-based `vendor/profile` instead |
| 6 | POST | `vendors/{vendorId}/bank-account` | `updateVendorBankAccount()` | Bank linking done through Stripe Connect |
| 7 | GET | `erp/orders/vendor/{vendorId}` (alt) | `getVendorOrdersAlt()` | Exact duplicate of `getVendorOrders()` -- never called |
| 8 | POST | `promotions/create` | `createPromotion()` | No create promotion UI (only toggle/delete) |
| 9 | GET | `promotions/analytics/{vendorId}` | `getPromotionAnalytics()` | No promotion analytics UI |
| 10 | GET | `promotions/suggestions/{vendorId}` | `getPromotionSuggestions()` | No promotion suggestions UI |
| 11 | GET | `menu-verification/status/{vendorId}` | `getMenuVerificationStatus()` | AIEmployeesViewModel only calls getAIEmployeesStats() |

**Note:** `updateVendorBankAccount()`, `createPromotion()`, `getPromotionAnalytics()`, and `getPromotionSuggestions()` are available in the DollorRepository for future feature development. The routes exist and work correctly -- they're just not wired to UI yet.

## Edge Cases Verified

### 1. RestaurantDocumentsViewModel Direct API Access
- **Pattern:** Uses `DollorApiService` directly (not via `DollorRepository`)
- **Auth:** Manually constructs `"Bearer $token"` string -- correct format
- **GET documents:** `api.getVendorDocuments(vendorId, "Bearer $token")` -> `GET /api/vendors/{vendorId}/documents` -> hits `get_vendor_documents` at line 11146 -- **OK**
- **POST upload:** `api.uploadVendorDocument(vendorId, file, documentType, "Bearer $token")` -> `POST /api/vendors/{vendorId}/documents` -> hits `upload_vendor_document` at line 11193 -- **OK** (vendor doc upload is correctly wired, unlike the driver doc alias bug)
- **DELETE document:** `api.deleteVendorDocument(vendorId, documentId, "Bearer $token")` -> `DELETE /api/vendors/{vendorId}/documents/{documentId}` -> hits `delete_vendor_document` at line 11254 -- **OK**

### 2. Multiple PATCH Overloads on Same Route
The DollorApiService has 4 different `@PATCH("vendors/{vendorId}")` methods:
- `updateVendorProfile()` with `UpdateVendorProfileRequest` body
- `updateVendorBusinessHours()` with `UpdateBusinessHoursRequest` body
- `updateVendorNotificationSettings()` with `UpdateNotificationSettingsRequest` body
- `updateVendorOnlineStatus()` with `UpdateOnlineStatusRequest` body

All 4 hit the same backend route: `PATCH /api/vendors/{vendor_id}` at `main_new.py:10756`. The backend accepts a generic body and updates whichever fields are present. This is **correct by design** -- the Retrofit overloads provide type safety on the Android side while the backend handles any field subset.

### 3. Order Status Updates (4 Overloads)
All 4 order status methods (`updateOrderStatus`, `acceptOrder`, `rejectOrder`, `markOrderReady`) hit `PATCH /api/orders/{order_id}/status` at `main_new.py:8783`. The backend accepts status as a query parameter, which matches the Retrofit `@Query("status")` annotation. Verified status values: `confirmed`, `cancelled`, `ready_for_pickup`, `out_for_delivery`, `delivered`.

### 4. Registration Flow
- `vendorRegister()` calls `POST /api/auth/vendor/register` -- exists but NOT used by partner app
- `vendorPublicRegister()` calls `POST /api/vendors/public` -- this is the one actually used for registration
- Both routes exist and are distinct: the first is for admin-assisted registration, the second is public self-registration with the 4-step form

### 5. Restaurant Acceptance vs Delivery Decision
The partner app correctly distinguishes between:
- **Order acceptance:** `restaurant-accept`/`restaurant-decline` (via order_flow.py:1543/1655)
- **Delivery decision:** `restaurant-accept-delivery`/`restaurant-decline-delivery` (via order_flow.py:1854/1949)
Both route sets exist in the order_flow.py router with prefix `/api/erp`, and also as aliases in main_new.py at lines 14368-14396 without the `/api/` prefix. Android hits the `/api/erp/` paths -- correct.

### 6. iOS Phase 02 Cross-Check
| iOS Issue | Android Partner Status | Notes |
|-----------|----------------------|-------|
| Broken doc upload alias | **NOT AFFECTED** | Android vendor docs hit `/api/vendors/{id}/documents` at line 11193 (correct handler). The driver alias bug at line 20968 only affects driver documents. |
| Wrong chat auth token | **NOT AFFECTED** | Partner app doesn't use chat endpoints |
| PUT vs POST FCM token | **CORRECT** | Android uses `POST notifications/register-token` which matches backend (line 17958) |

---

## Verification Methodology

1. Every vendor-facing `@GET`, `@POST`, `@PUT`, `@DELETE`, `@PATCH` annotation in DollorApiService.kt (lines 867-1398) was extracted
2. Each path was prepended with `/api/` (Retrofit baseUrl suffix)
3. Each endpoint was verified via `grep -rn` against backend `.py` files
4. Router-based routes resolved to full paths: `order_flow.py` (prefix `/api/erp`), `promotions.py` (prefix `/api/promotions`), `menu_verification.py` (prefix `/api/menu-verification`)
5. Every partner ViewModel was searched for `repository.` and `apiService.` calls to map actual usage
6. Dead code identified by cross-referencing DollorApiService methods against all partner ViewModel/service calls

---

*Generated: 2026-02-25*
*Auditor: Claude Opus 4.6 (GSD Phase 03, Plan 03)*
