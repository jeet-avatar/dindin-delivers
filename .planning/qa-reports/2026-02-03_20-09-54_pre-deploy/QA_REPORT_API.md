# QA Report: API Testing (Comprehensive)

**Environment**: production
**URL**: https://api.dollor.ai
**Date**: Tue Feb  3 20:09:54 PST 2026
**Phase**: pre-deploy

---

## 1. Health & Infrastructure

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /health | ✅ PASS | 200 | 231ms |

## 2. Authentication Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/auth/customer/login | ✅ PASS | 200 | Token received |
| POST /api/auth/driver/login | ✅ PASS | 200 | Token received |
| POST /api/auth/vendor/login | ✅ PASS | 200 | Token received |

## 3. Customer App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/vendors/published | ✅ PASS | 200 | 250ms |
| GET /api/vendors/{id}/menu | ✅ PASS | 200 | 182ms |
| GET /api/promotions/active | ✅ PASS | 200 | 167ms |
| GET /api/customer/profile (auth) | ✅ PASS | 200 | 170ms |
| GET /api/customer/orders (auth) | ✅ PASS | 200 | 416ms |
| GET /api/customer/{id}/active-orders | ✅ PASS | 200 | 346ms |
| GET /api/addresses/{userId} | ✅ PASS | 200 | 238ms |
| GET /api/customer/favorites/{id} | ✅ PASS | 200 | 166ms |
| GET /api/customers/{id}/cards | ✅ PASS | 200 | 523ms |
| GET /api/cart | ✅ PASS | 200 | 171ms |

## 4. Driver App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/v5/driver/{id}/dashboard | ✅ PASS | 200 | 175ms |
| GET /api/drivers/{id}/documents | ✅ PASS | 200 | 165ms |
| GET /api/drivers/{id}/status | ✅ PASS | 200 | 170ms |
| GET /api/erp/drivers/{id}/profile | ✅ PASS | 200 | 211ms |
| GET /api/drivers/{id}/earnings (auth) | ✅ PASS | 200 | 227ms |
| GET /api/erp/orders/available-for-delivery (auth) | ✅ PASS | 200 | 180ms |

## 5. Restaurant App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/orders?vendor_id={id} | ✅ PASS | 200 | 254ms |
| GET /api/vendors/{id}/menu/categories | ✅ PASS | 200 | 167ms |
| GET /api/promotions/vendor/{id} | ✅ PASS | 200 | 194ms |
| GET /api/erp/orders/vendor/{id} (auth) | ✅ PASS | 200 | 585ms |
| GET /api/vendors/{id}/documents (auth) | ✅ PASS | 200 | 179ms |

## 6. Demo Setup & Admin

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/demo/setup | ✅ PASS | 200 | 2863ms |

## 7. Error Handling

| Test | Status | Notes |
|------|--------|-------|
| Invalid endpoint returns 404 | ✅ PASS | Got 404 |
| Protected endpoint requires auth | ✅ PASS | Got 401 |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 28 |
| Failed | 1 |
| Total Tests | 29 |

**Status**: ✅ PASS

### Token Status
- Customer Token: ✅ Valid
- Driver Token: ✅ Valid
- Vendor Token: ✅ Valid
