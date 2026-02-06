# QA Report: API Testing (Comprehensive)

**Environment**: staging
**URL**: https://d3kuu45w6kl8hr.cloudfront.net
**Date**: Wed Feb  4 11:01:23 PST 2026
**Phase**: pre-deploy

---

## 1. Health & Infrastructure

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /health | ✅ PASS | 200 | 313ms |

## 2. Authentication Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/auth/customer/login | ✅ PASS | 200 | Token received |
| POST /api/auth/driver/login | ✅ PASS | 200 | Token received |
| POST /api/auth/vendor/login | ✅ PASS | 200 | Token received |

## 3. Customer App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/vendors/published | ✅ PASS | 200 | 256ms |
| GET /api/vendors/{id}/menu | ✅ PASS | 200 | 172ms |
| GET /api/promotions/active | ✅ PASS | 200 | 159ms |
| GET /api/customer/profile (auth) | ✅ PASS | 200 | 176ms |
| GET /api/customer/orders (auth) | ✅ PASS | 200 | 452ms |
| GET /api/customer/{id}/active-orders | ✅ PASS | 200 | 206ms |
| GET /api/addresses/{userId} | ✅ PASS | 200 | 175ms |
| GET /api/customer/favorites/{id} | ✅ PASS | 200 | 161ms |
| GET /api/customers/{id}/cards | ✅ PASS | 200 | 554ms |
| GET /api/cart | ✅ PASS | 200 | 188ms |

## 4. Driver App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/v5/driver/{id}/dashboard | ✅ PASS | 200 | 179ms |
| GET /api/drivers/{id}/documents | ✅ PASS | 200 | 176ms |
| GET /api/drivers/{id}/status | ✅ PASS | 200 | 170ms |
| GET /api/erp/drivers/{id}/profile | ✅ PASS | 200 | 178ms |
| GET /api/drivers/{id}/earnings (auth) | ✅ PASS | 200 | 209ms |
| GET /api/erp/orders/available-for-delivery (auth) | ✅ PASS | 200 | 170ms |

## 5. Restaurant App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| GET /api/orders?vendor_id={id} | ✅ PASS | 200 | 248ms |
| GET /api/vendors/{id}/menu/categories | ✅ PASS | 200 | 171ms |
| GET /api/promotions/vendor/{id} | ✅ PASS | 200 | 168ms |
| GET /api/erp/orders/vendor/{id} (auth) | ✅ PASS | 200 | 257ms |
| GET /api/vendors/{id}/documents (auth) | ✅ PASS | 200 | 181ms |

## 6. Demo Setup & Admin

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
| POST /api/demo/setup | ✅ PASS | 200 | 2956ms |

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
