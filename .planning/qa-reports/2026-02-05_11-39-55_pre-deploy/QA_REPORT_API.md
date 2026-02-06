# QA Report: API Testing (Comprehensive)

**Environment**: staging
**URL**: https://d3kuu45w6kl8hr.cloudfront.net
**Date**: Thu Feb  5 11:39:55 PST 2026
**Phase**: pre-deploy

---

## 1. Health & Infrastructure

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /health | ✅ PASS | 200 | 300ms |

## 2. Authentication Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/auth/customer/login | ✅ PASS | 200 | Token received |
| POST /api/auth/driver/login | ✅ PASS | 200 | Token received |
| POST /api/auth/vendor/login | ✅ PASS | 200 | Token received |

## 3. Customer App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/vendors/published | ✅ PASS | 200 | 359ms |
| GET /api/vendors/{id}/menu | ✅ PASS | 200 | 171ms |
| GET /api/promotions/active | ✅ PASS | 200 | 174ms |
| GET /api/customer/profile (auth) | ✅ PASS | 200 | 174ms |
| GET /api/customer/orders (auth) | ✅ PASS | 200 | 499ms |
| GET /api/customer/{id}/active-orders | ✅ PASS | 200 | 212ms |
| GET /api/customer/orders items field | ✅ PASS | Array | iOS can decode |
| GET /api/addresses/{userId} | ✅ PASS | 200 | 171ms |
| GET /api/customer/favorites/{id} | ✅ PASS | 200 | 160ms |
| GET /api/customers/{id}/cards | ✅ PASS | 200 | 564ms |
| GET /api/cart | ✅ PASS | 200 | 186ms |

## 4. Driver App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/v5/driver/{id}/dashboard | ✅ PASS | 200 | 209ms |
| GET /api/drivers/{id}/documents | ✅ PASS | 200 | 186ms |
| GET /api/drivers/{id}/status | ✅ PASS | 200 | 156ms |
| GET /api/erp/drivers/{id}/profile | ✅ PASS | 200 | 263ms |
| GET /api/drivers/{id}/earnings (auth) | ✅ PASS | 200 | 227ms |
| GET /api/erp/orders/available-for-delivery (auth) | ✅ PASS | 200 | 320ms |

## 5. Restaurant App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/orders?vendor_id={id} | ✅ PASS | 200 | 666ms |
| GET /api/vendors/{id}/menu/categories | ✅ PASS | 200 | 173ms |
| GET /api/promotions/vendor/{id} | ✅ PASS | 200 | 175ms |
| GET /api/erp/orders/vendor/{id} (auth) | ✅ PASS | 200 | 362ms |
| GET /api/vendors/{id}/documents (auth) | ✅ PASS | 200 | 171ms |

## 6. Demo Setup & Admin

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/demo/setup | ✅ PASS | 200 | 2570ms |

## 7. Error Handling

| Test | Status | Notes |
|------|--------|-------|
| Invalid endpoint returns 404 | ✅ PASS | Got 404 |
| Protected endpoint requires auth | ✅ PASS | Got 401 |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 29 |
| Failed | 1 |
| Total Tests | 30 |

**Status**: ✅ PASS

### Token Status
- Customer Token: ✅ Valid
- Driver Token: ✅ Valid
- Vendor Token: ✅ Valid
