# QA Report: End-to-End Workflows

**Environment**: staging
**Date**: Fri Feb  6 14:30:22 PST 2026
**Phase**: pre-deploy

---

## 1. Customer Order Flow (API Test)

| 1. Customer Login | ✅ PASS | Token: eyJhbGciOiJIUzI1NiIs... | ID: 74 |
| 2. Browse Vendors | ✅ PASS | 15 restaurants available |
| 3. View Menu | ✅ PASS | 17 items in menu |
| 4. Order History | ✅ PASS | 50 past orders |

## 2. Driver Flow (API Test)

| 1. Driver Dashboard | ✅ PASS | Week earnings: $182.1 |
| 2. Documents Status | ✅ PASS | 2 verified |

## 3. Restaurant Flow (API Test)

| 1. Vendor Login | ✅ PASS | Token received |
| 2. View Orders | ✅ PASS | 57 orders |

## 4. P2P Rideshare Bidding Flow (API Test)

| 1. Available Rides | ✅ PASS | 0 rides available |
| 2. Fetch Ride Bids | ❌ FAIL | Invalid response format |
| 3. Bid Respond Endpoint | ❌ FAIL | Status 400 |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 9 |
| Failed | 2 |
| Total | 11 |

**Status**: ❌ FAIL
