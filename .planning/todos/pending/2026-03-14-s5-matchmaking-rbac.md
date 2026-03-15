---
created: 2026-03-14T00:00:00Z
title: "matchmaking_routes.py RBAC — role-specific auth on 7 endpoints"
area: security/rbac
severity: HIGH
files:
  - apps/web/p2p-platform/backend/matchmaking_routes.py
---

## Problem

7 endpoints in `matchmaking_routes.py` use `require_any_auth`. A driver can create matchmaking requests (customer-only), a customer can submit bids (driver-only), and anyone can accept bids or complete requests triggering payouts.

## RBAC Mapping

| Endpoint | Should Be | IDOR Check |
|----------|-----------|------------|
| `POST /request` | require_customer | Verify customer_id matches auth |
| `POST /bid` | require_driver | Verify driver_id matches auth |
| `GET /request/{id}/bids` | require_customer | Verify request belongs to auth customer |
| `POST /accept-bid` | require_customer | Verify bid belongs to auth customer's request |
| `POST /driver/payment-info` | require_driver | Verify driver_id matches auth |
| `GET /driver/{id}/validate/{state}` | require_driver | Verify driver_id matches auth |
| `POST /complete/{id}` | require_driver or require_admin | Verify driver is assigned to request |
| `GET /analytics/state/{code}` | require_admin | Admin-only analytics |

## Solution

1. Replace `require_any_auth` with role-specific auth per mapping
2. Add IDOR checks for customer/driver ID parameters
