---
created: 2026-03-14T00:00:00Z
title: "verification_routes.py RBAC + IDOR — restrict KYC endpoints to drivers/vendors"
area: security/rbac
severity: HIGH
files:
  - apps/web/p2p-platform/backend/verification_routes.py
---

## Problem

8 endpoints in `verification_routes.py` use `require_any_auth`. KYC/identity verification is only relevant to drivers and vendors, but any authenticated customer can create verification inquiries or access others' verification status. IDOR: status/decision endpoints don't verify the inquiry belongs to the authenticated user.

## RBAC Mapping

| Endpoint | Should Be | IDOR Check |
|----------|-----------|------------|
| `POST /persona/create-inquiry` | require_driver or require_vendor | Link inquiry to auth user |
| `GET /persona/status/{id}` | require_driver or require_vendor | Verify inquiry belongs to auth user |
| `POST /onfido/create-applicant` | require_driver or require_vendor | Link to auth user |
| `POST /onfido/create-check` | require_driver or require_vendor | Verify applicant is auth user |
| `POST /veriff/create-session` | require_driver or require_vendor | Link to auth user |
| `GET /veriff/status/{id}` | require_driver or require_vendor | Verify session belongs to auth user |
| `GET /veriff/decision/{id}` | require_driver or require_vendor | Verify session belongs to auth user |
| `GET /providers` | Public (already allowlisted) | N/A |
| `GET /required-documents/{type}` | Public (already allowlisted) | N/A |

## Solution

1. Create a helper `require_driver_or_vendor` that accepts either role
2. Add IDOR checks: look up the inquiry/session, verify it belongs to the authenticated user
3. Keep `/providers` and `/required-documents` public
