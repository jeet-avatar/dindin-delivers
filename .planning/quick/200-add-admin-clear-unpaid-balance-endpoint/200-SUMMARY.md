---
phase: quick-200
plan: 01
subsystem: admin-portal
tags: [admin, customer-management, payment-block, rideshare, escape-hatch]
dependency_graph:
  requires: [quick-198]
  provides: [ADMIN-CLEAR-UNPAID-01]
  affects: [CustomersAdmin, main_new.py, App.tsx, MainLayout.tsx]
tech_stack:
  added: []
  patterns: [Ant Design Popconfirm, admin_mutation_limiter, require_admin]
key_files:
  created:
    - apps/web/p2p-platform/frontend/src/app/screens/customer/CustomersAdmin.tsx
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/frontend/src/App.tsx
    - apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
decisions:
  - CR ticket skipped — ADMIN_SECRET_KEY is in AWS Secrets Manager (not available locally); documented in commit message
  - logger.info used for audit trail per plan spec (no audit_log helper in main_new.py)
  - Customers link added under Partners sidebar group alongside Drivers (logical grouping)
metrics:
  duration: 15m
  completed: 2026-03-19
  tasks_completed: 2
  files_modified: 4
---

# Quick-200: Add Admin Clear-Unpaid-Balance Endpoint Summary

**One-liner:** Admin portal customer list with `has_unpaid_balance` status display and Popconfirm-gated "Clear Balance" action backed by two new admin endpoints.

## What Was Built

Two backend endpoints and one admin portal screen, closing the gap identified in quick-198 where customers blocked by payment capture failure had no way to be unblocked.

### Backend (main_new.py)

**GET /api/admin/customers** (line 4077)
- Returns up to 500 customers ordered by id desc
- Optional `?blocked_only=true` to filter to `has_unpaid_balance=True` customers
- Each record includes: `id`, `email`, `name`, `phone`, `has_unpaid_balance`, `is_active`, `created_at`
- Requires admin JWT (`require_admin`) + `admin_mutation_limiter` rate limit

**POST /api/admin/customers/{customer_id}/clear-unpaid-balance** (line 4104)
- Sets `Customer.has_unpaid_balance = False` and commits
- Returns `{"success": true, "customer_id": N, "message": "Unpaid balance flag cleared"}`
- 404 if customer not found
- `logger.info` records admin email + customer_id for audit trail

### Frontend (CustomersAdmin.tsx)

- Ant Design Table with columns: ID, Name, Email, Phone, Payment Status, Active, Created At, Actions
- Payment Status: red `Blocked` tag when `has_unpaid_balance=true`; green `Clear` tag when false
- Actions column: `Popconfirm`-gated "Clear Balance" button, **disabled** when `has_unpaid_balance=false`
- "Blocked only" `Switch` toggle calls `?blocked_only=true` endpoint variant
- "Refresh" button re-fetches data
- Stats cards showing total / blocked count / active count
- Registered at `/admin/customers` in App.tsx
- "Customers" link added to Partners sidebar section in MainLayout.tsx

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Backend endpoints | `007c6876` | `feat(quick-200): add admin customer list + clear-unpaid-balance endpoints` |
| Task 2: Frontend screen | `744cee18` | `feat(quick-200): add CustomersAdmin screen with payment block status and clear button` |

## Verification

- [x] Grep proof: both `admin_list_customers` (line 4078) and `admin_clear_unpaid_balance` (line 4105) confirmed in main_new.py
- [x] File proof: `CustomersAdmin.tsx` exists at correct path (7040 bytes)
- [x] Frontend proof: `npm run build` completed in 5.99s with 0 TypeScript errors
- [x] Router proof: `/admin/customers` route registered in App.tsx; Customers link in MainLayout.tsx sidebar
- [x] Pattern proof: `api.post('/api/admin/customers/${customerId}/clear-unpaid-balance')` in Clear Balance handler
- [x] Popconfirm gate: `disabled={!record.has_unpaid_balance}` on both Popconfirm and Button

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `apps/web/p2p-platform/frontend/src/app/screens/customer/CustomersAdmin.tsx`
- FOUND: `007c6876` (task 1 backend commit)
- FOUND: `744cee18` (task 2 frontend commit)
- FOUND: both endpoints in main_new.py at lines 4078 and 4104-4105
