---
created: 2026-03-14T00:00:00Z
title: "order_flow.py RBAC hardening — upgrade 48 require_any_auth to role-specific auth"
area: security/rbac
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/order_flow.py
---

## Problem

`order_flow.py` has 48 endpoints using `require_any_auth` — ANY authenticated user (customer, driver, vendor) can call ANY endpoint. A customer can mark orders as delivered (triggering payouts), assign drivers, process payouts, change order statuses, etc.

## RBAC Mapping

### Customer-only endpoints:
- `POST /orders/create` — only customers should create orders
- `POST /orders/{id}/confirm-payment` — only the ordering customer

### Vendor-only endpoints:
- `POST /orders/{id}/restaurant-accept` — only the vendor who received the order
- `POST /orders/{id}/restaurant-decline` — same
- `POST /orders/{id}/restaurant-accept-delivery` — same
- `POST /orders/{id}/restaurant-decline-delivery` — same
- `POST /orders/{id}/start-preparing` — same
- `POST /orders/{id}/ready-for-pickup` — same
- `GET /orders/vendor/{vendor_id}` — only that vendor (IDOR check needed)
- `GET /orders/pending-restaurant` — vendor's own pending orders

### Driver-only endpoints:
- `POST /orders/{id}/picked-up` — only the assigned driver
- `POST /orders/{id}/delivered` — only the assigned driver (TRIGGERS PAYOUT)
- `PUT /orders/{id}/complete-delivery` — only the assigned driver (TRIGGERS PAYOUT)
- `POST /orders/{id}/delivery-photo` — only the assigned driver
- `PUT /drivers/{id}/location` — only that driver (IDOR)
- `PUT /drivers/{id}/status` — only that driver (IDOR)
- `GET /orders/driver/{id}/active` — only that driver (IDOR)
- `GET /orders/driver/{id}/pending` — only that driver (IDOR)
- `GET /orders/available-for-delivery` — any authenticated driver

### Admin-only endpoints:
- `PUT /orders/{id}/status` — admin override
- `POST /orders/{id}/assign-driver` — admin dispatch
- `PUT /orders/{id}/unassign-driver` — admin
- `DELETE /orders/cleanup` — admin only
- `POST /payouts/{id}/process` — admin only (CRITICAL: financial)
- `GET /payouts/pending` — admin only
- `GET /journal-entries` — admin only
- `GET /analytics/realtime` — admin only
- `GET /analytics/ai-employees` — admin only
- `POST /drivers/create` — admin only

### System/internal endpoints:
- `POST /orders/{id}/auto-dispatch` — system/admin
- `POST /orders/{id}/broadcast-to-drivers` — system/admin
- `POST /orders/{id}/request-delivery-decision` — system/admin
- `POST /orders/{id}/check-restaurant-timeout` — system/admin

## Solution

1. Replace `require_any_auth` with role-specific `require_customer`, `require_driver`, `require_vendor`, `require_admin` per the mapping above
2. Add IDOR checks: verify authenticated user ID matches path parameter ID (e.g., driver endpoints verify `auth_driver.id == driver_id`)
3. For order-scoped endpoints, verify the authenticated user is a participant in that order (customer who placed it, vendor who received it, or driver assigned to it)
