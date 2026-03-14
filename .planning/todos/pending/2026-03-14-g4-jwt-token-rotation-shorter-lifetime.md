---
created: 2026-03-14T00:00:00Z
title: Implement JWT token rotation with shorter access token lifetime
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/main_new.py:1042-1046
  - apps/web/p2p-platform/backend/main_new.py:1177-1185
---

## Problem

Access tokens have a 30-day lifetime (`main_new.py:1046`) with no rotation. A compromised token is valid for up to 30 days. There are no refresh tokens — the mobile apps request a new access token on each fresh login only.

## Solution

Implement refresh token pattern:

1. **Shorten access token**: 1 hour (or 24 hours for mobile UX balance)

2. **Issue refresh token on login** (all 4 login endpoints):
   - Refresh token = opaque random 32-byte hex (not JWT)
   - Store in Redis: `refresh:{token}` → `{user_id, role, issued_at}` with 30-day TTL
   - Return as `refresh_token` in login response

3. **New endpoint**: `POST /api/auth/refresh`
   - Accept `refresh_token` in body
   - Lookup in Redis, validate not expired
   - Issue new access token (rotated — new short expiry)
   - Optionally rotate refresh token too (sliding window)
   - Return new `access_token`

4. **iOS/Android**: On 401, auto-call `/api/auth/refresh` and retry once

5. **Revocation**: Delete `refresh:{token}` from Redis on logout (ties into G3)

Note: Consider UX impact — users logged out after 30 days without activity if refresh token not used. App should silently refresh in background.
