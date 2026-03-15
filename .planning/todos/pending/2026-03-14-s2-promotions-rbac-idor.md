---
created: 2026-03-14T00:00:00Z
title: "promotions.py RBAC + IDOR — verify vendor ownership on all 9 endpoints"
area: security/rbac
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/promotions.py
---

## Problem

All 9 endpoints in `promotions.py` use `require_any_auth`. Critical IDOR: `POST /promotions/create` accepts `vendor_id` from the request body but doesn't verify the authenticated user owns that vendor. Any authenticated customer/driver can create promotions for ANY vendor.

## Affected Endpoints

| Endpoint | Should Be | IDOR Check Needed |
|----------|-----------|-------------------|
| `POST /create` | require_vendor | Verify auth vendor_id == request vendor_id |
| `GET /suggestions/{vendor_id}` | require_vendor | Verify auth vendor_id == path vendor_id |
| `GET /vendor/{vendor_id}` | require_vendor | Verify auth vendor_id == path vendor_id |
| `PUT /{id}` | require_vendor | Verify auth vendor owns the promotion |
| `DELETE /{id}` | require_vendor | Verify auth vendor owns the promotion |
| `POST /quick-create/{vendor_id}/{type}` | require_vendor | Verify auth vendor_id == path vendor_id |
| `GET /analytics/{vendor_id}` | require_vendor | Verify auth vendor_id == path vendor_id |
| `POST /apply` | require_customer | Customer applying promo |
| `POST /redeem` | require_customer | Customer redeeming promo |

## Solution

1. Replace `require_any_auth` with `require_vendor` for vendor endpoints, `require_customer` for customer endpoints
2. Add IDOR checks: `if vendor.id != vendor_id: raise HTTPException(403)`
3. For promotion updates/deletes, look up the promotion, verify `promotion.vendor_id == vendor.id`
