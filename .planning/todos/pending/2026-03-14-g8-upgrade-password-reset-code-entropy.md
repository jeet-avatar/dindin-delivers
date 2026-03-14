---
created: 2026-03-14T00:00:00Z
title: Upgrade password reset code from 6-digit to high-entropy token
area: security/auth
severity: LOW
files:
  - apps/web/p2p-platform/backend/main_new.py:6460-6530
  - apps/web/p2p-platform/backend/main_new.py:6545-6603
  - apps/web/p2p-platform/backend/cache.py:227-235
---

## Problem

Customer and driver password reset codes are 6-digit numbers (`main_new.py:6474`). With only 1 million possibilities and a 15-minute window, an attacker can attempt all codes in ~41 minutes at 10 req/sec (rate limit is 5/hr/email, which helps, but the entropy is still very low).

Vendor/admin reset uses JWT which has high entropy — only customer/driver are affected.

## Solution

Replace 6-digit code with `secrets.token_urlsafe(32)` (43-character URL-safe base64 string = ~256 bits of entropy):

1. In `/api/customer/password-reset/request` (`main_new.py:6474`):
   - Replace `str(random.randint(100000, 999999))` with `secrets.token_urlsafe(32)`

2. In `/api/driver/password-reset/request` (`main_new.py:6545`):
   - Same replacement

3. Email template: include full token as URL link rather than code to type
   - `https://dollor.ai/reset-password?token={token}&email={email}`
   - If SMS (when added), use shorter code but at least 8 digits

4. Storage: same Redis pattern with 15-min TTL (`cache.py:227–235`) — no change needed

5. Confirm endpoints: accept the full token string instead of 6-digit code

Note: Unifies the reset mechanism with the vendor/admin JWT approach (stateless + high entropy).
