# Android API Verification - Consolidated Fix Plan

## Overall Summary

| App | Total Verified | OK | Mismatches | Dead Code |
|-----|---------------|-----|------------|-----------|
| Customer | 76 (unique) | 76 | 0 | 0 |
| Driver | 60 | 59 | 1 | 8 |
| Partner | 53 | 52 | 1 | 9 (+ 2 overlap with driver) |
| **Total** | **189** | **187** | **2** | **17 unique** |

**Note on totals:** Some shared endpoints (e.g., `notifications/register-token`, `legal/tos`, `legal/privacy-policy`) exist across multiple app sections of DollorApiService.kt but were counted per-app. Dead code counts are per-app; some dead code endpoints overlap (e.g., `auth/vendor/apple-auth` is dead in Partner but also exists as a route for iOS).

## Actionable Fixes (Priority Order)

### Critical (blocks Phase 05 deployment)

**None.** No critical mismatches were found. All authentication flows, order flows, rideshare flows, and payment flows have correct API paths and HTTP methods across all 3 Android apps.

### Medium (should fix before deployment)

| # | App | Endpoint | Issue | Fix | Effort |
|---|-----|----------|-------|-----|--------|
| 1 | Driver | `POST /api/drivers/{driverId}/documents` | Alias at `main_new.py:20968` maps to `get_driver_documents` (GET-style handler) instead of `upload_driver_document_by_id` (upload handler). Driver document upload fails silently. | **Backend fix:** Change line 20968 handler from `get_driver_documents` to `upload_driver_document_by_id` | 5 min |
| 2 | Partner | `DELETE /api/vendors/{vendorId}` | Backend at `main_new.py:11304` requires `require_admin`, but Android sends vendor JWT. Vendor self-deletion returns 403. Required by Play Store policy. | **Backend fix:** Add a vendor self-delete endpoint (e.g., `DELETE /api/vendor/delete-account`) that accepts vendor JWT, similar to customer (`DELETE /api/customers/{id}/delete`) and driver (`DELETE /api/drivers/{id}/delete`) | 15 min |

### Low (nice to have)

**None.** All other endpoints match correctly.

## Dead Code Summary

### Endpoints in DollorApiService.kt NOT Called by ANY of the 3 Android Apps

These endpoints are defined in the shared DollorApiService but no ViewModel or service in any of the 3 apps calls them:

| # | Method | Retrofit Path | Defined For | Reason Not Used |
|---|--------|--------------|-------------|-----------------|
| 1 | POST | `auth/driver/apple-auth` | Driver | Apple Sign-In is iOS-only |
| 2 | POST | `auth/driver/refresh` | Driver | No token refresh interceptor implemented |
| 3 | POST | `auth/driver/demo-login` | Driver | Demo login not wired into driver UI |
| 4 | PUT | `erp/drivers/{driverId}` | Driver | Profile editing not implemented in driver app |
| 5 | POST | `erp/orders/{orderId}/start-delivery-decision` | Driver | Restaurant-side operation, not driver |
| 6 | POST | `erp/orders/{orderId}/restaurant-delivery-decision` | Driver | Restaurant-side operation, not driver |
| 7 | GET | `erp/orders/{orderId}/delivery-decision-status` | Driver | Not polled by driver app |
| 8 | POST | `drivers/{driverId}/bank-account` | Driver | Uses Stripe Connect onboarding instead |
| 9 | POST | `auth/vendor/register` | Partner | Uses public registration (`vendors/public`) instead |
| 10 | POST | `auth/vendor/apple-auth` | Partner | Apple Sign-In is iOS-only |
| 11 | POST | `vendor/password-reset/request` | Partner | No forgot password UI in partner app |
| 12 | POST | `vendor/password-reset/confirm` | Partner | No forgot password UI in partner app |
| 13 | GET | `vendors/{vendorId}` | Partner | Uses token-based `vendor/profile` instead |
| 14 | POST | `vendors/{vendorId}/bank-account` | Partner | Uses Stripe Connect onboarding instead |
| 15 | GET | `erp/orders/vendor/{vendorId}` (alt) | Partner | Exact duplicate of `getVendorOrders()` |
| 16 | POST | `promotions/create` | Partner | No create promotion UI |
| 17 | GET | `promotions/analytics/{vendorId}` | Partner | No promotion analytics UI |
| 18 | GET | `promotions/suggestions/{vendorId}` | Partner | No promotion suggestions UI |
| 19 | GET | `menu-verification/status/{vendorId}` | Partner | AIEmployeesViewModel only calls getAIEmployeesStats() |

**Recommendation:** Leave as-is. These routes are harmless (they exist in backend and return valid responses). Removing them from DollorApiService would reduce surface area but provides no functional benefit. Some (like password reset, bank account, promotions) may be wired to UI in future releases.

## Fix Approach

| # | Fix Type | Description | Requires App Rebuild? |
|---|----------|-------------|----------------------|
| 1 | Backend alias fix | Change line 20968 handler reference | No -- server-side only |
| 2 | Backend new endpoint | Add vendor self-delete route | No -- server-side only |

Both fixes are backend-only and require NO Android app rebuild or Firebase distribution. They can be deployed via CI/CD (`deploy-staging.yml` then `deploy-dollar-ai.yml`) and will immediately fix the affected flows for all existing installed apps.

## Estimated Total Effort

- Critical: 0 fixes
- Medium: 2 fixes, ~20 minutes
- Low: 0 fixes
- **Total: 2 fixes, ~20 minutes**

## Phase 05 (Android Distribution) Status

**UNBLOCKED.** No critical mismatches found across all 3 Android apps. The 2 medium issues (driver doc upload alias, vendor self-delete) are backend-only fixes that do not require app rebuilds. Phase 05 can proceed to distribute current Android builds while the backend fixes are deployed separately.

**Recommended sequence:**
1. Deploy backend fix #1 (driver doc alias) -- 5 min
2. Deploy backend fix #2 (vendor self-delete) -- 15 min
3. Smoke test both fixes on staging
4. Deploy to production
5. Proceed with Phase 05 Android distribution (current builds will work with fixed backend)
