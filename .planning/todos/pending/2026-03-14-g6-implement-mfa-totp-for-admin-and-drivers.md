---
created: 2026-03-14T00:00:00Z
title: Implement MFA (TOTP) for admin accounts and optional for drivers
area: security/auth
severity: LOW
files:
  - apps/web/p2p-platform/backend/main_new.py:1940-1981
  - apps/web/p2p-platform/backend/main_new.py:2874-2925
---

## Problem

No multi-factor authentication exists anywhere in the platform (`main_new.py` — no MFA-related code found). Admin accounts access sensitive operations (user management, payouts, dispute resolution) with only a password. No TOTP, SMS, or backup codes.

## Solution

Phased rollout:

**Phase 1 — Admin MFA (mandatory)**:
1. Add `totp_secret` (encrypted) and `mfa_enabled` fields to User model
2. `POST /api/admin/mfa/setup` — generate TOTP secret, return QR code URI
3. `POST /api/admin/mfa/verify-setup` — verify first TOTP code to activate
4. Modify admin login to return `mfa_required: true` + temp token (not full access)
5. `POST /api/admin/mfa/verify` — accept TOTP code, exchange temp token for full access token
6. Use `pyotp` library for TOTP generation/verification

**Phase 2 — Driver MFA (optional, high-value accounts)**:
- Same flow but opt-in
- Triggered when driver enables "extra security" in settings

**Backup codes**: Generate 8 single-use backup codes on setup; store bcrypt-hashed in DB.

Library: `pyotp` + `qrcode` for QR generation.

Note: Start with admin only — this has the highest risk profile. Driver/vendor MFA can be feature-gated.
