---
created: 2026-03-14T00:00:00Z
title: Fix password reset email delivery — email sending is TODO in code
area: security/auth
severity: HIGH
files:
  - apps/web/p2p-platform/backend/main_new.py:2763-2782
  - apps/web/p2p-platform/backend/main_new.py:2780
---

## Problem

The vendor/admin password reset flow generates a JWT token at `main_new.py:2775` but the email sending is commented out / TODO at `main_new.py:2780`. Users who request a vendor/admin password reset receive a success message but never get the email. The token exists but is never delivered.

The customer/driver reset (`main_new.py:6460–6492`) may have the same issue — needs verification.

## Solution

1. Verify customer/driver reset actually sends emails (check `main_new.py:6460–6492`)
2. For vendor/admin reset at `main_new.py:2780`: implement actual SMTP email send using existing `send_email_smtp()` or equivalent
3. Email template: "Reset your Dollor.ai password — click link within 1 hour"
4. Link format: `https://dollor.ai/reset-password?token={jwt_token}`
5. Test E2E: request reset → receive email → click link → confirm new password works
6. Monitor SMTP logs for delivery failures

Note: Until this is fixed, vendor/admin accounts CANNOT reset their passwords. This is a functional blocker.
