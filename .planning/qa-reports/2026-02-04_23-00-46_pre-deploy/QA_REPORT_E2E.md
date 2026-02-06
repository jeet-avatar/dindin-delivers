# QA Report: End-to-End Workflows

**Environment**: staging
**Date**: Wed Feb  4 23:01:10 PST 2026
**Phase**: pre-deploy

---

## 1. Customer Order Flow (API Test)

| 1. Customer Login | ✅ PASS | Token: eyJhbGciOiJIUzI1NiIs... | ID: 74 |
| 2. Browse Vendors | ✅ PASS | 13 restaurants available |
| 3. View Menu | ✅ PASS | 17 items in menu |
| 4. Order History | ✅ PASS | 50 past orders |

## 2. Driver Flow (API Test)

| 1. Driver Dashboard | ✅ PASS | Week earnings: $86.42 |
| 2. Documents Status | ✅ PASS | 2 verified |

## 3. Restaurant Flow (API Test)

| 1. Vendor Login | ✅ PASS | Token received |
| 2. View Orders | ✅ PASS | 56 orders |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 8 |
| Failed | 0 |
| Total | 8 |

**Status**: ✅ PASS
