# QA Report: API Testing (Comprehensive)

**Environment**: production
**URL**: https://api.dollor.ai
**Date**: Tue Feb  3 15:21:03 PST 2026
**Phase**: pre-deploy

---

## 1. Health & Infrastructure

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /health | ✅ PASS | 200 | 283ms |

## 2. Authentication Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/auth/customer/login | ✅ PASS | 200 | Token received |
| POST /api/auth/driver/login | ✅ PASS | 200 | Token received |
| POST /api/auth/vendor/login | ✅ PASS | 200 | Token received |

## 3. Customer App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /health (infrastructure) | ✅ PASS | 200 | 177ms |
| GET /api/vendors | ✅ PASS | 200 | 427ms |
| GET /api/vendors/published | ✅ PASS | 200 | 196ms |
| GET /api/vendors/{id} | ❌ FAIL | 401 (expected 200) | 159ms |
| GET /api/vendors/{id}/menu | ✅ PASS | 200 | 172ms |
| GET /api/promotions/active | ✅ PASS | 200 | 173ms |
| GET /api/customer/profile (auth) | ✅ PASS | 200 | 180ms |
| GET /api/customer/orders (auth) | ✅ PASS | 200 | 331ms |
| GET /api/customer/{id}/active-orders | ✅ PASS | 200 | 277ms |
| GET /api/addresses/{userId} | ✅ PASS | 200 | 178ms |
| GET /api/customer/favorites/{id} | ✅ PASS | 200 | 188ms |
| GET /api/customers/{id}/cards | ✅ PASS | 200 | 609ms |
| GET /api/cart | ✅ PASS | 200 | 194ms |

## 4. Driver App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/v5/driver/{id}/dashboard | ✅ PASS | 200 | 192ms |
| GET /api/drivers/{id}/documents | ✅ PASS | 200 | 175ms |
| GET /api/drivers/{id}/status | ✅ PASS | 200 | 175ms |
| GET /api/erp/drivers/{id}/profile | ✅ PASS | 200 | 186ms |
| GET /api/drivers/{id}/earnings | ✅ PASS | 200 | 209ms |
| GET /api/drivers/{id}/available-orders | ❌ FAIL | 404 (expected 200) | 172ms |
| GET /api/drivers/{id}/deliveries | ❌ FAIL | 404 (expected 200) | 184ms |
| GET /api/erp/orders/available-for-delivery | ✅ PASS | 200 | 174ms |

## 5. Restaurant App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/orders?vendor_id={id} | ✅ PASS | 200 | 314ms |
| GET /api/erp/orders/vendor/{id} | ✅ PASS | 200 | 239ms |
| GET /api/vendors/{id}/menu/categories | ✅ PASS | 200 | 170ms |
| GET /api/vendors/{id}/online-status | ❌ FAIL | 405 (expected 200) | 175ms |
| GET /api/promotions/vendor/{id} | ✅ PASS | 200 | 180ms |
| GET /api/vendors/{id}/documents | ❌ FAIL | 401 (expected 200) | 176ms |

## 6. Order Lifecycle Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/erp/orders/available-for-delivery | ✅ PASS | 200 | 172ms |

## 7. Demo Setup & Admin

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/demo/setup | ✅ PASS | 200 | 2578ms |

## 7. Error Handling

| Test | Status | Notes |
|------|--------|-------|
| Invalid endpoint returns 404 | ✅ PASS | Got 404 |
| Protected endpoint requires auth | ✅ PASS | Got 401 |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 30 |
| Failed | 6 |
| Total Tests | 36 |

**Status**: ❌ FAIL

### Token Status
- Customer Token: ✅ Valid
- Driver Token: ✅ Valid
- Vendor Token: ✅ Valid
