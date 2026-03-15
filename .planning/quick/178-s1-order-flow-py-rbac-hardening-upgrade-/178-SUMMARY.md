---
task: 178
title: "RBAC hardening across all backend router files (S1-S8)"
date: 2026-03-15
status: complete
---

## Summary

Upgraded `require_any_auth` to role-specific auth (`require_customer`, `require_driver`, `require_vendor`, `require_admin`) across all backend router files. Added IDOR checks to prevent cross-user data access.

## Changes By File

### Already Done (Prior Sessions)
- **order_flow.py**: 44 role-specific + 21 IDOR checks (done in prior commit)
- **matchmaking_routes.py**: Already had RBAC from insurance commit
- **main_new.py FCM/location/tracking**: Already secured with role-specific auth + IDOR
- **Tickets/Coupa/Accounting**: Already `require_admin`

### New Changes (This Session)
| File | Before | After | IDOR Added |
|------|--------|-------|------------|
| **promotions.py** | 9 require_any_auth | 7 require_vendor + 1 require_any_auth (redeem) | 6 vendor ownership checks |
| **stripe_integration.py** | 8 require_any_auth | 2 require_customer + 4 require_admin + 1 require_any_auth (get order w/ participant check) | 1 order participant check |
| **investor_tracking.py** | 1 require_any_auth (views) | 1 require_admin | N/A |
| **auto_onboarding.py** | 1 require_any_auth (invite) | 1 require_admin | N/A |
| **main_new.py (chat)** | Chat send accepted sender_id from body | Force sender identity from JWT token | 2 IDOR (send + read chat, order participant check) |

## Security Impact

- **Promotions IDOR CLOSED**: Any user could create/edit/delete promotions for any vendor → now vendor-only with ownership verification
- **Stripe IDOR CLOSED**: Any user could create payment intents → now customer-only
- **Chat impersonation CLOSED**: Any user could send chat as any other user → sender identity now forced from JWT
- **Admin data exposure CLOSED**: Investor views (emails/IPs), order listing, payout sync → admin-only
- **Financial endpoints CLOSED**: Vendor payouts, accounting sync → admin-only
