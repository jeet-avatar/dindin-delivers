---
created: 2026-03-14T00:00:00Z
title: Enforce KYC verification gate before drivers can accept rides
area: security/identity
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/verification_routes.py
  - apps/web/p2p-platform/backend/main_new.py:2874-2925
  - apps/web/p2p-platform/backend/bid_routes.py
---

## Problem

Persona/Onfido/Veriff KYC integration exists (`verification_routes.py`) but verification is not enforced as a gate before a driver can accept rides or bids. Drivers can register, log in, and start accepting ride requests before their identity is verified.

Risk: unverified individuals can provide rides, creating safety and legal liability.

## Solution

1. **Verification status check**: Add `is_identity_verified` flag to Driver model (or query `verification_status` from existing verification table)

2. **Enforce in bid submission**: In `bid_routes.py` (bid submission endpoint), check `driver.is_identity_verified` before allowing bid — return 403 "Identity verification required before you can accept rides"

3. **Enforce in ride acceptance**: Same check when driver accepts a counter-offer

4. **Verification status endpoint**: `GET /api/driver/verification-status` — returns current KYC state

5. **Grace period**: Allow drivers to register and be on-boarded before requiring KYC — but block active operations until verified

6. **Admin override**: Allow admin to manually mark driver as verified (`/api/admin/drivers/{id}/verify`)

## Implemented

- **KYC gate** added to `bid_routes.py` before the APPROVED/ACTIVE check:
  - Uses `verification_status == "verified"` (Persona/Onfido/Veriff webhook) OR `documents_verified == True` (manual admin approval)
  - Returns HTTP 403 "Identity verification required before you can accept rides."
- **`GET /api/driver/verification-status`** endpoint added at `main_new.py` (after line 6200):
  - Returns `verification_status`, `documents_verified`, `kyc_verified`, `can_accept_rides`
  - Protected by `require_driver`
- **Admin override** already exists at `main_new.py:21450`: `POST /api/admin/drivers/{id}/verify` — sets `documents_verified=True`, `verification_status="verified"`, status `APPROVED`
- No `is_identity_verified` field was added — existing `verification_status`/`documents_verified` fields from `models.py:815-816` are used directly
