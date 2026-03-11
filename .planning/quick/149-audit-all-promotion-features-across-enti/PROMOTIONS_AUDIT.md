# Promotions Feature Audit Report

**Date:** 2026-03-11
**Scope:** Backend endpoints, iOS apps (Customer + Restaurant + Shared), Android apps (Customer + Partner + Shared)

## Summary Stats

| Metric | Value |
|--------|-------|
| Total backend endpoints | 12 |
| Live on production | 12 (all respond 200 or 401) |
| iOS Shared API methods | 9 |
| iOS Restaurant coverage | 1/8 vendor endpoints (analytics only) |
| iOS Customer coverage | 3/3 customer endpoints |
| Android Shared API methods | 10 |
| Android Partner coverage | 4/8 vendor endpoints |
| Android Customer coverage | 3/3 customer endpoints |
| Backend test coverage | 166 unit tests in `test_promotions.py` |

---

## 1. Backend Endpoint Catalog

### 1.1 Endpoints from `promotions.py` (Router: `/api/promotions`)

Mounted in `main_new.py:14974-14975` via `app.include_router(promotions_router)`.

| # | Route | Method | Auth | Description | Source | Prod Status |
|---|-------|--------|------|-------------|--------|-------------|
| 1 | `/api/promotions/create` | POST | `require_any_auth` | Create a new promotion for a vendor | `promotions.py:98-187` | 401 (auth required) |
| 2 | `/api/promotions/suggestions/{vendor_id}` | GET | `require_any_auth` | AI-generated promotion suggestions based on sales data | `promotions.py:263-392` | 401 (auth required) |
| 3 | `/api/promotions/vendor/{vendor_id}` | GET | `require_any_auth` | List all promotions for a vendor (filterable by status) | `promotions.py:397-437` | 401 (auth required) |
| 4 | `/api/promotions/{promotion_id}` | PUT | `require_any_auth` | Update an existing promotion | `promotions.py:442-513` | 401 (auth required) |
| 5 | `/api/promotions/apply` | POST | None (public) | Apply promotion code to order (validates eligibility) | `promotions.py:518-623` | 200 |
| 6 | `/api/promotions/redeem` | POST | `require_any_auth` | Record a promotion redemption after order placement | `promotions.py:653-701` | 401 (auth required) |
| 7 | `/api/promotions/analytics/{vendor_id}` | GET | `require_any_auth` | Get promotion performance analytics with ROI | `promotions.py:706-764` | 401 (auth required) |
| 8 | `/api/promotions/{promotion_id}` | DELETE | `require_any_auth` | Cancel a promotion (soft delete, sets status=cancelled) | `promotions.py:796-813` | 401 (auth required) |
| 9 | `/api/promotions/quick-create/{vendor_id}/{promo_type}` | POST | `require_any_auth` | Quick-create from template (happy_hour, lunch_special, first_order, free_delivery, weekend) | `promotions.py:818-893` | 401 (auth required) |

### 1.2 Inline Endpoints in `main_new.py`

| # | Route | Method | Auth | Description | Source | Prod Status |
|---|-------|--------|------|-------------|--------|-------------|
| 10 | `/api/promotions/featured` | GET | None (allowlisted) | Featured deals for customer home screen (uses real DB promos) | `main_new.py:14001-14105` | 200 |
| 11 | `/api/promotions/active` | GET | None (allowlisted) | Active promotions list for customers (hardcoded platform promos) | `main_new.py:14108-14164` | 200 |
| 12 | `/api/promotions/send-samples` | POST | None | One-time endpoint: sends 3 sample promo emails to support@dollor.ai | `main_new.py:14250-14287` | 401 |

### 1.3 Auth Allowlist

From `main_new.py:311-331` (auth middleware allowlist):
- `/api/promotions/featured` -- allowlisted (public)
- `/api/promotions/active` -- allowlisted (public)
- `/api/promotions/apply` -- allowlisted (public)

From `endpoint_config.py:101-105`:
- `promotions_apply` -- `/api/promotions/apply` POST
- `promotions_featured` -- `/api/promotions/featured` GET
- `promotions_active` -- `/api/promotions/active` GET

### 1.4 Promotion in Order Flow

`order_flow.py:1313-1319` -- During checkout, validates promo code against `Promotion` table.
`order_flow.py:1395-1406` -- After order creation, records `PromotionRedemption` if promo was applied.

`main_new.py:10299-10389` -- `/api/vendors/published` includes `active_promotion` field per vendor (best active promo shown on restaurant card).

---

## 2. Backend Models

### 2.1 Promotion Model (`models_extended.py:89-145`)

Table: `promotions`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (PK) | Auto-increment |
| promotion_code | String(50), unique, indexed | Auto-generated or custom |
| vendor_id | Integer (FK -> vendors.id) | Required |
| name | String(255) | Required |
| description | Text | Optional |
| type | Enum(PromotionType) | percentage, flat_amount, bogo, free_delivery, free_item, bundle |
| value | Float | Discount amount or percentage |
| max_discount | Float | Cap for percentage discounts |
| min_order_amount | Float | Minimum order to qualify (default 0) |
| target_audience | Enum(PromotionTargetAudience) | all, new_customers, returning, loyalty_members, dormant |
| applies_to | JSON | {"type": "all"\|"category"\|"items", "ids": [...]} |
| schedule | JSON | {"days": [1,2,3], "start_time": "11:00", "end_time": "14:00"} |
| start_date | DateTime | When promo starts |
| end_date | DateTime | When promo expires |
| is_recurring | Boolean | Whether schedule repeats |
| usage_count | Integer | Total redemptions |
| usage_limit | Integer | Max allowed redemptions |
| per_customer_limit | Integer | Max per customer |
| total_discount_given | Float | Running total of discounts |
| budget_limit | Float | Total discount budget cap |
| status | Enum(PromotionStatus) | draft, scheduled, active, paused, expired, cancelled |
| ai_suggested | Boolean | Whether AI suggested this |
| ai_suggestion_reason | Text | Why AI suggested |
| created_by_ai | String(50) | AI employee ID |
| created_by_ai_name | String(100) | AI employee name |
| pushed_to_app | Boolean | Whether pushed to customer apps |
| pushed_at | DateTime | When push notification sent |

Relationships: `vendor` (Vendor), `redemptions` (PromotionRedemption[])

### 2.2 PromotionRedemption Model (`models_extended.py:148-166`)

Table: `promotion_redemptions`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (PK) | |
| promotion_id | Integer (FK -> promotions.id) | |
| order_id | Integer (FK -> orders.id) | |
| customer_id | Integer | |
| discount_amount | Float | |
| original_total | Float | |
| final_total | Float | |
| redeemed_at | DateTime | |

### 2.3 Enums

- **PromotionType** (`models_extended.py:16-22`): percentage, flat_amount, bogo, free_delivery, free_item, bundle
- **PromotionStatus** (`models_extended.py:25-31`): draft, scheduled, active, paused, expired, cancelled
- **PromotionTargetAudience** (`models_extended.py:34-39`): all, new_customers, returning, loyalty_members, dormant

---

## 3. iOS API Methods (P2PAPIService.swift)

### 3.1 Customer-facing Methods

| # | Function | Endpoint | Method | Used By | Source |
|---|----------|----------|--------|---------|--------|
| 1 | `getActivePromotions()` | `/api/promotions/active` | GET | Customer | `P2PAPIService.swift:532-567` |
| 2 | `getFeaturedDeals()` | `/api/promotions/featured` | GET | Customer | `P2PAPIService.swift:573-630` |
| 3 | `validatePromoCode()` | `/api/promotions/apply` | POST | Customer | `P2PAPIService.swift:3094-3110` |

### 3.2 Vendor-facing Methods

| # | Function | Endpoint | Method | Used By | Source |
|---|----------|----------|--------|---------|--------|
| 4 | `createPromotion()` | `/api/promotions/create` | POST | Restaurant | `P2PAPIService.swift:635-692` |
| 5 | `getVendorPromotions()` | `/api/promotions/vendor/{id}` | GET | Restaurant | `P2PAPIService.swift:696-733` |
| 6 | `updatePromotion()` | `/api/promotions/{id}` | PUT | Restaurant | `P2PAPIService.swift:737-778` |
| 7 | `deletePromotion()` | `/api/promotions/{id}` | DELETE | Restaurant | `P2PAPIService.swift:782-812` |
| 8 | `getPromotionSuggestions()` | `/api/promotions/suggestions/{id}` | GET | Restaurant | `P2PAPIService.swift:815-852` |
| 9 | `getPromotionAnalytics()` | `/api/promotions/analytics/{id}` | GET | Restaurant | `P2PAPIService.swift:856-891` |

Additional: `quickCreatePromotion()` at `P2PAPIService.swift:963-999` -- quick-create by template type.

### 3.3 iOS Shared Models (P2PAPIService.swift)

| Model | Source | Purpose |
|-------|--------|---------|
| `P2PPromotionCreate` | `P2PAPIService.swift:8687-8731` | Create request DTO |
| `P2PPromotion` | `P2PAPIService.swift:8734-8749` | Promotion entity |
| `P2PPromotionsResponse` | `P2PAPIService.swift:8752-8755` | List response wrapper |
| `P2PPromotionSuggestion` | `P2PAPIService.swift:8758-8765` | AI suggestion |
| `P2PPromotionSuggestionsResponse` | `P2PAPIService.swift:8768-8771` | Suggestions wrapper |
| `P2PPromotionAnalytics` | `P2PAPIService.swift:8774-8781` | Analytics response |
| `P2PCustomerPromotion` | `P2PAPIService.swift:8926-8957` | Customer-facing promo |
| `P2PActivePromotionsResponse` | `P2PAPIService.swift:8960-8964` | Active promos wrapper |
| `P2PFeaturedDeal` | `P2PAPIService.swift:8967-8987` | Featured deal for home |
| `P2PActivePromotion` | `P2PAPIService.swift:7964-7970` | Active promo on restaurant card |
| `PromoCodeResponse` | `P2PAPIService.swift:10128-10145` | Promo code validation response |

---

## 4. iOS Restaurant App Promotion Features

**No dedicated PromotionsView exists.** There is no `PromotionsView.swift` or `PromotionsViewModel.swift` in the Restaurant app.

### What Exists

| Feature | File | Details |
|---------|------|---------|
| Promotion analytics fetch | `AnalyticsViewModel.swift:40-41,84-103` | Fetches `P2PPromotionAnalytics` via `getPromotionAnalytics()` |
| Analytics display trigger | `AnalyticsView.swift:51` | Calls `fetchPromotionAnalytics()` on appear |
| AI suggestion text | `OrdersViewModel.swift:675` | "Slow lunch period. Consider running a flash promotion." (text only, no action) |
| Notification toggle | `RestaurantSettingsView.swift:1127,1140` | "Promotional Updates" toggle (local state only, no backend) |

### What Is MISSING from iOS Restaurant App

| Feature | Backend Endpoint | iOS Shared API Method | Status |
|---------|------------------|-----------------------|--------|
| List vendor promotions | `GET /api/promotions/vendor/{id}` | `getVendorPromotions()` | NOT IMPLEMENTED |
| Create promotion | `POST /api/promotions/create` | `createPromotion()` | NOT IMPLEMENTED |
| Edit/Update promotion | `PUT /api/promotions/{id}` | `updatePromotion()` | NOT IMPLEMENTED |
| Delete promotion | `DELETE /api/promotions/{id}` | `deletePromotion()` | NOT IMPLEMENTED |
| AI suggestions | `GET /api/promotions/suggestions/{id}` | `getPromotionSuggestions()` | NOT IMPLEMENTED |
| Quick-create promotion | `POST /api/promotions/quick-create/{id}/{type}` | `quickCreatePromotion()` | NOT IMPLEMENTED |
| Toggle promotion status | `PUT /api/promotions/{id}` (status field) | `updatePromotion()` | NOT IMPLEMENTED |

**Key finding:** The iOS shared layer (`P2PAPIService.swift`) has ALL 9 vendor promotion API methods fully implemented. The Restaurant app only calls 1 of them (analytics). The remaining 6+ methods are available but no UI exists to use them.

---

## 5. iOS Customer App Promotion Features

| Feature | File | Details |
|---------|------|---------|
| Hot Deals section (restaurants with active promos) | `HomeView.swift:39-42,239-269` | Filters restaurants with `dealText != nil`, displays deal badges |
| Multi-Restaurant Promo Banner | `HomeView.swift:44-47,274` | Shows when cart is empty |
| Featured deals display | `HomeView.swift:1354-1362` | Shows promo code on deal cards |
| Restaurant deal badge | `HomeView.swift:768-771` | Shows active promotion text on restaurant cards |
| Promo code entry at checkout | `MultiRestaurantCheckoutView.swift:31-33,448-473` | TextField + Apply button |
| Promo code validation | `MultiRestaurantCheckoutView.swift:784-807` | Calls `P2PAPIService.validatePromoCode()` against `/api/promotions/apply` |
| Applied promo passed to order | `MultiRestaurantCheckoutView.swift:1041-1042` | `promoCode: appliedPromoCode` sent with order |

**Coverage: 3/3 customer endpoints used** (featured, active, apply).

---

## 6. Android API Methods (DollorApiService.kt)

### 6.1 Customer-facing Methods

| # | Function | Endpoint | Method | Source |
|---|----------|----------|--------|--------|
| 1 | `getActivePromotions()` | `promotions/active` | GET | `DollorApiService.kt:424-425` |
| 2 | `getFeaturedDeals()` | `promotions/featured` | GET | `DollorApiService.kt:431-432` |
| 3 | `applyPromoCode()` | `promotions/apply` | POST | `DollorApiService.kt:438-442` |

### 6.2 Vendor-facing Methods

| # | Function | Endpoint | Method | Source |
|---|----------|----------|--------|--------|
| 4 | `getVendorPromotions()` | `promotions/vendor/{vendorId}` | GET | `DollorApiService.kt:1297-1301` |
| 5 | `createPromotion()` | `promotions/create` | POST | `DollorApiService.kt:1303-1308` |
| 6 | `updatePromotion()` | `promotions/{promotionId}` | PUT | `DollorApiService.kt:1310-1315` |
| 7 | `deletePromotion()` | `promotions/{promotionId}` | DELETE | `DollorApiService.kt:1317-1321` |
| 8 | `getPromotionAnalytics()` | `promotions/analytics/{vendorId}` | GET | `DollorApiService.kt:1323-1327` |
| 9 | `getPromotionSuggestions()` | `promotions/suggestions/{vendorId}` | GET | `DollorApiService.kt:1329-1333` |

### 6.3 Repository Layer (DollorRepository.kt)

| Function | Source | Notes |
|----------|--------|-------|
| `getVendorPromotions()` | `DollorRepository.kt:1779-1784` | Returns `List<Promotion>` |
| `createPromotion()` | `DollorRepository.kt:1786-1792` | Takes `CreatePromotionRequest` |
| `updatePromotion()` | `DollorRepository.kt:1794-1799` | Takes `Map<String, Any>` |
| `deletePromotion()` | `DollorRepository.kt:1801-1810` | Soft delete |
| `togglePromotion()` | `DollorRepository.kt:1812-1813` | Convenience wrapper around update |

**Missing from repository:** `getPromotionAnalytics()`, `getPromotionSuggestions()` -- API methods exist but no repository wrappers.

---

## 7. Android Partner App Promotion Features

| Feature | File | Details |
|---------|------|---------|
| Promotions list screen | `PromotionsScreen.kt:26-196` | Tabs (Active/Inactive/All), stats summary, promo cards |
| Promotion card (view) | `PromotionsScreen.kt:216-454` | Shows code, name, type badge, usage progress, dates, min order |
| Toggle active/inactive | `PromotionsScreen.kt:157-159` | Pause/Activate buttons on each card |
| Delete promotion | `PromotionsScreen.kt:170-195` | Delete button with confirmation dialog |
| Create promotion screen | `CreatePromotionScreen.kt:30-510` | Full form: code, title, description, discount type (percentage/flat/free delivery), value, min order, max discount, usage limit, start/end date, preview |
| Navigation | `PartnerNavGraph.kt:54-55,280-295` | Routes: `promotions`, `create_promotion` |
| ViewModel | `PromotionsViewModel.kt:26-104` | Load, toggle, delete promotions via repository |
| Edit promotion nav | `PartnerNavGraph.kt:286` | `onEditPromotion` callback exists but `/* Edit not implemented yet */` |

### What Android Partner HAS

- List promotions (with Active/Inactive/All tabs)
- Create promotion (full form with preview)
- Toggle promotion status (pause/activate)
- Delete promotion (with confirmation)

### What Android Partner is MISSING

| Feature | Backend Endpoint | API Method Exists | Status |
|---------|------------------|-------------------|--------|
| Edit promotion | `PUT /api/promotions/{id}` | Yes | UI NOT IMPLEMENTED (nav callback is no-op) |
| AI suggestions | `GET /api/promotions/suggestions/{id}` | Yes | NOT IMPLEMENTED (no UI) |
| Promotion analytics | `GET /api/promotions/analytics/{id}` | Yes | NOT IMPLEMENTED (no UI) |
| Quick-create promotion | `POST /api/promotions/quick-create/{id}/{type}` | No repo method | NOT IMPLEMENTED |

---

## 8. Android Customer App Promotion Features

| Feature | File | Details |
|---------|------|---------|
| Featured deals section | `HomeScreen.kt:256-261` | Shows featured deals on home, toast with promo code on click |
| Featured deals UI | `FeaturedDealsSection.kt:164-181` | Copy promo code to clipboard on tap |
| Multi-restaurant promo banner | `HomeScreen.kt:266-271` | `MultiRestaurantPromoBanner` when cart is empty |
| V3 Checkout promo code | `V3CheckoutScreen.kt:54-57,256-330` | Promo code field with hardcoded validation (WELCOME50, FLAT5 only!) |
| Multi-checkout promo code | `MultiRestaurantCheckoutScreen.kt:53-54,202-222` | Basic promo UI, hardcoded 15% discount |

**Critical issue:** Android V3CheckoutScreen validates promo codes CLIENT-SIDE with hardcoded values (`WELCOME50`, `FLAT5`) instead of calling `/api/promotions/apply`. See `V3CheckoutScreen.kt:298-304`. MultiRestaurantCheckoutScreen also uses a hardcoded 15% discount.

---

## 9. Cross-Reference Matrix

| Backend Endpoint | iOS Restaurant | iOS Customer | Android Partner | Android Customer |
|------------------|----------------|--------------|-----------------|------------------|
| `GET /api/promotions/featured` | N/A | Implemented | N/A | Implemented |
| `GET /api/promotions/active` | N/A | Implemented | N/A | Implemented |
| `POST /api/promotions/apply` | N/A | Implemented | N/A | **NOT USED** (hardcoded) |
| `POST /api/promotions/create` | **MISSING** | N/A | Implemented | N/A |
| `GET /api/promotions/vendor/{id}` | **MISSING** | N/A | Implemented | N/A |
| `PUT /api/promotions/{id}` | **MISSING** | N/A | **PARTIAL** (toggle only) | N/A |
| `DELETE /api/promotions/{id}` | **MISSING** | N/A | Implemented | N/A |
| `GET /api/promotions/suggestions/{id}` | **MISSING** | N/A | **MISSING** | N/A |
| `GET /api/promotions/analytics/{id}` | Implemented | N/A | **MISSING** | N/A |
| `POST /api/promotions/redeem` | N/A | N/A (called by backend) | N/A | N/A |
| `POST /api/promotions/quick-create/{id}/{type}` | **MISSING** | N/A | **MISSING** | N/A |
| `POST /api/promotions/send-samples` | N/A | N/A | N/A | N/A |

---

## 10. Restaurant App Gap Analysis

### iOS Restaurant: What vendors CAN do

| Capability | Status | Details |
|------------|--------|---------|
| View promotion analytics | YES | Via AnalyticsView -> AnalyticsViewModel -> `getPromotionAnalytics()` |
| List own promotions | NO | API method exists in shared, no UI |
| Create a new promotion | NO | API method exists in shared, no UI |
| Edit an existing promotion | NO | API method exists in shared, no UI |
| Delete/deactivate a promotion | NO | API method exists in shared, no UI |
| View AI suggestions | NO | API method exists in shared, no UI |
| Quick-create from templates | NO | API method exists in shared, no UI |
| Toggle promotion status | NO | API method exists in shared, no UI |

**The iOS shared API layer is COMPLETE** -- all 9 vendor methods are implemented. The Restaurant app simply lacks the SwiftUI views and view models to use them.

---

## 11. iOS vs Android Partner Parity

| Feature | iOS Restaurant | Android Partner | Gap |
|---------|----------------|-----------------|-----|
| List promotions | MISSING | YES | iOS behind |
| Create promotion | MISSING | YES (full form) | iOS behind |
| Edit promotion | MISSING | NO (placeholder) | Both missing |
| Delete promotion | MISSING | YES | iOS behind |
| Toggle status | MISSING | YES | iOS behind |
| AI suggestions | MISSING | MISSING | Both missing |
| Promotion analytics | YES | MISSING | Android behind |
| Quick-create templates | MISSING | MISSING | Both missing |

**Net assessment:** Android Partner is significantly ahead of iOS Restaurant for promotion management. Android has 4/8 vendor features; iOS has 1/8.

---

## 12. Dead Code / Unused Endpoints

### Dead/Admin-Only Endpoints
| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/promotions/send-samples` | Dead code | One-time test email sender, no client calls it |
| `POST /api/promotions/redeem` | Backend-only | Called internally by order_flow.py during order creation, not by clients directly |

### Client Code Calling Non-Existent/Wrong Endpoints
| Client | Issue | File | Details |
|--------|-------|------|---------|
| Android V3Checkout | Hardcoded promo validation | `V3CheckoutScreen.kt:298-304` | Only accepts `WELCOME50` and `FLAT5`, does NOT call `/api/promotions/apply` |
| Android MultiCheckout | Hardcoded discount | `MultiRestaurantCheckoutScreen.kt:63,215-216` | Hardcoded 15% discount up to $10, no API call |

### iOS Shared Methods Never Called
| Method | Endpoint | Notes |
|--------|----------|-------|
| `createPromotion()` | `/api/promotions/create` | Available in shared, NO UI in Restaurant app |
| `getVendorPromotions()` | `/api/promotions/vendor/{id}` | Available in shared, NO UI in Restaurant app |
| `updatePromotion()` | `/api/promotions/{id}` PUT | Available in shared, NO UI in Restaurant app |
| `deletePromotion()` | `/api/promotions/{id}` DELETE | Available in shared, NO UI in Restaurant app |
| `getPromotionSuggestions()` | `/api/promotions/suggestions/{id}` | Available in shared, NO UI in Restaurant app |
| `quickCreatePromotion()` | `/api/promotions/quick-create/{id}/{type}` | Available in shared, NO UI in Restaurant app |

---

## 13. Recommendations

### CRITICAL: Missing features that break user workflows

1. **Android checkout promo validation must call backend API** -- `V3CheckoutScreen.kt` and `MultiRestaurantCheckoutScreen.kt` use hardcoded promo codes instead of `/api/promotions/apply`. Vendor-created promos will NEVER work on Android checkout. This defeats the entire promotion system.

### MEDIUM: Features available on one platform but not the other

2. **iOS Restaurant needs a PromotionsView** -- The shared API layer is complete (all 9 methods). Build a `PromotionsView.swift` + `PromotionsViewModel.swift` mirroring Android's `PromotionsScreen.kt`. This would give vendors on iOS the ability to list, create, toggle, and delete promotions.

3. **Android Partner needs analytics view** -- iOS Restaurant fetches analytics; Android Partner has the API method but no UI or repository wrapper.

4. **Android Partner edit promotion** -- Navigation callback exists (`onEditPromotion`) but is a no-op. Need an EditPromotionScreen or reuse CreatePromotionScreen with pre-filled data.

5. **Both platforms need AI suggestions UI** -- Backend generates useful suggestions (slow period boost, first order special, spend more save more, weekend feast, re-engage dormant). Neither platform surfaces these to vendors.

### LOW: Nice-to-have improvements

6. **Quick-create templates** -- Backend supports 5 templates (happy_hour, lunch_special, first_order, free_delivery, weekend). Neither platform uses quick-create. Could be exposed as one-tap buttons.

7. **Android Partner needs repository wrappers** for `getPromotionAnalytics()` and `getPromotionSuggestions()` -- API service methods exist but no `DollorRepository` functions.

8. **Remove `send-samples` endpoint** -- Dead code, only used for one-time email testing.

9. **Promotion notification preferences** -- iOS Restaurant has a "Promotional Updates" toggle in settings (`RestaurantSettingsView.swift:1127`) but it's local state only, not persisted to backend.

---

## 14. Test Coverage

`apps/web/p2p-platform/backend/tests/unit/test_promotions.py`: **166 unit tests**

Covers:
- Promotion message generation (all types)
- Discount calculation (percentage, flat, BOGO, free delivery, edge cases)
- AI insight generation
- Request model validation (create, update, apply)
- AI employee definitions
- Router configuration
- Enum value validation

Does NOT cover (integration):
- Endpoint HTTP request/response cycle
- Database operations (create, update, delete)
- Auth middleware behavior
- Promotion scheduling/expiration logic
- Push notification delivery
