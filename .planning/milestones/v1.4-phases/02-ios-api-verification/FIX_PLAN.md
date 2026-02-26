# iOS API Verification - Consolidated Fix Plan

**Generated:** 2026-02-22
**Phase 04 Blocker:** YES (3 medium mismatches in Restaurant app affect menu management; 4 mismatches in Driver app affect document upload and chat)

## Summary

- Customer app: 44 mismatches (0 critical services broken, 6 critical service groups with no backend, 7 medium, 2 low)
- Driver app: 4 mismatches (3 critical, 1 medium, 0 low)
- Restaurant app: 3 mismatches (0 critical, 3 medium, 0 low)
- **Total: 51 mismatches**

Note: 40 of the Customer app's 44 mismatches are from 5 dead service files (TripBoardService, NegotiationService, ChatService, CallService, DollorV3Service, ACHPaymentService) that have zero backend routes. These are aspirational code that was never wired to a backend.

## Critical Mismatches (MUST fix before Phase 04)

| # | App | Function | Issue | Fix Side | Fix Description | Effort |
|---|-----|----------|-------|----------|-----------------|--------|
| 1 | Driver | `uploadDriverDocument` | POST alias at main_new.py:21033 maps to wrong handler (get_driver_documents instead of upload_driver_document_by_id). Upload silently fails. | Backend | Change line 21033 handler from `get_driver_documents` to `upload_driver_document_by_id` | 2 min |
| 2 | Driver | `fetchRideChatMessages` | Uses customerToken instead of driverToken. Driver app sends nil token, gets 401. Rideshare chat completely broken for drivers. | iOS | Add driverToken path or create driver-specific variant | 10 min |
| 3 | Driver | `sendRideChatMessage` | Same as #2 -- uses customerToken instead of driverToken. Driver cannot send chat messages. | iOS | Same fix as #2 -- use driverToken in driver app context | 10 min |

## Medium Mismatches (Should fix before Phase 04)

| # | App | Function | Issue | Fix Side | Fix Description | Effort |
|---|-----|----------|-------|----------|-----------------|--------|
| 4 | Driver | `saveDriverFCMToken` | Uses PUT but backend only accepts POST at /api/erp/drivers/{id}/fcm-token. Returns 405. Push notifications not registered. | iOS | Change httpMethod from "PUT" to "POST" (line 10812) | 2 min |
| 5 | Customer | `updateCustomerProfile` | Path /api/customer/{id}/profile does not exist. Backend expects PUT /api/auth/customer/profile (JWT-based, no customerId in path). | iOS | Change path to /api/auth/customer/profile | 5 min |
| 6 | Restaurant | `updateMenuItem` | iOS sends PATCH but backend only accepts PUT for /api/vendors/{id}/menu/{id}. Returns 405. Menu editing broken. toggleItemAvailability also affected. | iOS | Change httpMethod from "PATCH" to "PUT" (line 369). Or backend: add @app.patch route. | 2 min |
| 7 | Restaurant | `assignStockImages` | Missing vendorToken auth header. Backend requires require_vendor. Returns 401. | iOS | Add vendorToken to request headers | 2 min |
| 8 | Restaurant | `getAIEmployeeStats` | Missing auth header. Backend requires require_any_auth. Returns 401. AI employee stats broken. | iOS | Add vendorToken/driverToken to request headers | 2 min |
| 9 | Customer | LegalService.getTieredPricingDisclosure | Path /api/legal/tiered-pricing does not exist in backend | Backend | Build route or remove from app | 15 min |
| 10 | Customer | LegalService.getLegalSummary | Path /api/platform-legal/summary does not exist | Backend | Build route or remove from app | 15 min |
| 11 | Customer | LegalService (3 endpoints) | 3 order-v2 endpoints (zero-liability, confirm-payment, confirm-delivery) have no backend routes | Backend | Build routes or remove from app | 30 min |

## Low Mismatches (Can defer)

| # | App | Function | Issue | Fix Side | Fix Description | Effort |
|---|-----|----------|-------|----------|-----------------|--------|
| 12 | Customer | `customerSubmitFareOffer` | Uses GET with query param for mutation. POST with JSON body is conventional. Works but non-standard. | iOS | Change to POST with JSON body | 5 min |
| 13 | Customer | `customerAcceptDriverFare` | Same as #12 -- GET for mutation | iOS | Change to POST with JSON body | 5 min |

## Dead/Unused API Calls (Cleanup candidates)

| # | App | Service/Function | Recommendation |
|---|-----|----------|---------------|
| 1 | Customer | TripBoardService (22 endpoints) | Remove -- no backend routes exist. Feature never built. |
| 2 | Customer | NegotiationService (5 endpoints) | Remove -- double URL prefix + no backend. P2PAPIService has working fare negotiation. |
| 3 | Customer | ChatService (6 endpoints) | Remove -- double URL prefix + wrong paths. P2PAPIService has working chat. |
| 4 | Customer | CallService (6 endpoints) | Remove or fix -- double URL prefix. Backend routes exist at /api/erp/call/* but URLs are broken. |
| 5 | Customer | DollorV3Service (4 endpoints) | Remove -- no /api/v3/ routes exist in backend. |
| 6 | Customer | ACHPaymentService (3 endpoints) | Remove -- no /api/enterprise/ routes exist. PaymentService (Stripe) works. |
| 7 | Customer | LegalService (5 of 8 endpoints) | Partial removal -- getCustomerTOS and getPrivacyPolicy work. Remove the 5 non-functional endpoints. |

## Shared Issues

- **P2PAPIService.swift is shared across all 3 apps.** Fixes to this file affect Customer, Driver, and Restaurant apps simultaneously. The 3 Restaurant mismatch TODO comments and 7 prior TODO comments coexist in the same file.
- **AppConfig.swift double-prefix pattern** causes ChatService, NegotiationService, and CallService failures. Root cause is in AppConfig.swift lines 46-56 where microservice URLs already include `/api/{service}` prefix, then the service files add `/api/{service}/...` again.

## Fix Order

**Recommended approach: Backend-first, then iOS**

### Wave 1: Backend fixes (3 changes, ~5 min)
1. Fix driver document upload alias (main_new.py line 21033) -- Critical
2. (Optional) Add @app.patch route for menu item update alongside existing @app.put

### Wave 2: iOS critical fixes (3 changes, ~25 min)
3. Fix ride chat auth token (fetchRideChatMessages + sendRideChatMessage) -- use driverToken in driver context
4. Fix driver FCM token method (PUT -> POST)
5. Fix updateMenuItem method (PATCH -> PUT)

### Wave 3: iOS medium fixes (3 changes, ~10 min)
6. Fix assignStockImages missing auth header
7. Fix getAIEmployeeStats missing auth header
8. Fix updateCustomerProfile path

### Wave 4: Dead code cleanup (optional, ~30 min)
9. Remove or disable TripBoardService, DollorV3Service, ACHPaymentService
10. Fix or remove NegotiationService, ChatService, CallService (fix AppConfig double-prefix)

**Each fix requires user approval per Phase 02 CONTEXT.md decision (audit-only, no auto-fixes).**

## Estimated Total Effort

- Backend fixes: 1-2 changes, ~5 minutes
- iOS fixes (critical + medium): 6 changes, ~35 minutes
- Dead code cleanup: Optional, ~30 minutes
- **Total minimum (critical + medium): ~40 minutes**
- **Total with cleanup: ~70 minutes**
