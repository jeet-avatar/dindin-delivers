---
created: 2026-03-14T00:00:00Z
title: "Admin-only endpoints RBAC — investor views, ticket system, Coupa dashboard"
area: security/rbac
severity: HIGH
files:
  - apps/web/p2p-platform/backend/investor_tracking.py
  - apps/web/p2p-platform/backend/main_new.py
---

## Problem

Several admin-only endpoints use `require_any_auth` instead of `require_admin`:
- Investor tracking views expose emails + IP addresses
- Ticket system endpoints expose support data
- Coupa dashboard endpoints expose financial data
- Platform accounting endpoints expose revenue stats

## Affected Endpoints

### investor_tracking.py
| Endpoint | Current | Should Be |
|----------|---------|-----------|
| `GET /investor/views` | require_any_auth | require_admin |

### main_new.py — Ticket System
| Endpoint | Current | Should Be |
|----------|---------|-----------|
| `GET /api/tickets` | require_any_auth | require_admin |
| `GET /api/tickets/metrics` | require_any_auth | require_admin |
| `GET /api/tickets/trends` | require_any_auth | require_admin |
| `GET /api/tickets/priority-distribution` | require_any_auth | require_admin |
| `GET /api/tickets/resolution-by-type` | require_any_auth | require_admin |
| `GET /api/tickets/team-performance` | require_any_auth | require_admin |
| `POST /api/tickets` | require_any_auth | require_any_auth (users can create tickets) |
| `PATCH /api/tickets/{id}` | require_any_auth | require_admin |

### main_new.py — Coupa Dashboard
| Endpoint | Current | Should Be |
|----------|---------|-----------|
| `GET /api/dashboard/coupa` | require_any_auth | require_admin |
| `GET /api/dashboard/coupa/budget-overview` | require_any_auth | require_admin |
| `GET /api/dashboard/coupa/*` (6 more) | require_any_auth | require_admin |
| `GET /api/system-dashboard/coupa` | require_any_auth | require_admin |

### main_new.py — Accounting
| Endpoint | Current | Should Be |
|----------|---------|-----------|
| `GET /api/accounting/platform-revenue` | require_any_auth | require_admin |
| `GET /api/accounting/vendor-payouts` | require_any_auth | require_admin |

## Solution

1. Replace `require_any_auth` with `require_admin` on all listed endpoints
2. Exception: `POST /api/tickets` stays `require_any_auth` (any user can create support tickets)
