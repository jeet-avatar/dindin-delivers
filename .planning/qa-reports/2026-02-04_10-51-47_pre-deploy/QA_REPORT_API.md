# QA Report: API Testing (Comprehensive)

**Environment**: staging
**URL**: https://d3kuu45w6kl8hr.cloudfront.net
**Date**: Wed Feb  4 10:51:47 PST 2026
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
| GET /api/vendors/published | ✅ PASS | 200 | 244ms |
| GET /api/vendors/{id}/menu | ✅ PASS | 200 | 174ms |
| GET /api/promotions/active | ✅ PASS | 200 | 156ms |
| GET /api/customer/profile (auth) | ✅ PASS | 200 | 169ms |
| GET /api/customer/orders (auth) | ✅ PASS | 200 | 387ms |
| GET /api/customer/{id}/active-orders | ✅ PASS | 200 | 201ms |
| GET /api/addresses/{userId} | ✅ PASS | 200 | 172ms |
| GET /api/customer/favorites/{id} | ✅ PASS | 200 | 163ms |
| GET /api/customers/{id}/cards | ✅ PASS | 200 | 611ms |
| GET /api/cart | ✅ PASS | 200 | 185ms |

## 4. Driver App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/v5/driver/{id}/dashboard | ✅ PASS | 200 | 186ms |
| GET /api/drivers/{id}/documents | ✅ PASS | 200 | 172ms |
| GET /api/drivers/{id}/status | ✅ PASS | 200 | 173ms |
| GET /api/erp/drivers/{id}/profile | ✅ PASS | 200 | 187ms |
| GET /api/drivers/{id}/earnings (auth) | ✅ PASS | 200 | 195ms |
| GET /api/erp/orders/available-for-delivery (auth) | ✅ PASS | 200 | 168ms |

## 5. Restaurant App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/orders?vendor_id={id} | ✅ PASS | 200 | 260ms |
| GET /api/vendors/{id}/menu/categories | ✅ PASS | 200 | 165ms |
| GET /api/promotions/vendor/{id} | ✅ PASS | 200 | 168ms |
| GET /api/erp/orders/vendor/{id} (auth) | ✅ PASS | 200 | 258ms |
| GET /api/vendors/{id}/documents (auth) | ✅ PASS | 200 | 178ms |

## 6. Demo Setup & Admin

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/demo/setup | ✅ PASS | 200 | 2530ms |

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
