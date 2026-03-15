---
created: 2026-03-14T00:00:00Z
title: "stripe_integration.py RBAC + IDOR — role-specific auth on 8 payment endpoints"
area: security/rbac
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/stripe_integration.py
---

## Problem

All 8 endpoints in `stripe_integration.py` use `require_any_auth`. Payment intent creation, order status changes, and vendor payout sync are accessible to any authenticated user regardless of role. No IDOR checks on order ownership.

## Affected Endpoints

| Endpoint | Should Be | IDOR Check Needed |
|----------|-----------|-------------------|
| `POST /payments/create-intent` | require_customer | Verify customer owns the order |
| `POST /orders` | require_customer | Verify customer ID matches |
| `GET /orders/{id}` | require_any_auth | But verify user is order participant |
| `GET /orders` | require_admin | Or scoped to user's own orders |
| `PATCH /orders/{id}/status` | require_admin | Admin-only status changes |
| `POST /accounting/sync-vendor-payouts` | require_admin | Financial operation |
| `GET /accounting/vendor-payouts` | require_admin | Financial data |
| `POST /webhooks/stripe` | Public (signature-verified) | N/A |

## Solution

1. Replace `require_any_auth` with role-specific auth per mapping
2. For order endpoints, verify authenticated user is a participant (customer, assigned driver, or receiving vendor)
3. Admin-only for accounting/payout endpoints
