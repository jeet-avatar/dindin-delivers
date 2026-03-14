---
created: 2026-03-14T00:00:00Z
title: Add token blacklist and logout endpoint
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/main_new.py:1042-1046
  - apps/web/p2p-platform/backend/cache.py
  - apps/web/p2p-platform/backend/auth_utils.py
---

## Problem

There is no way to invalidate a JWT after issuance. If a token is stolen, it remains valid for the full 30-day lifetime (`main_new.py:1046`). There is no logout endpoint and no server-side session tracking. The only defence is waiting for natural expiry.

`require_auth_middleware` (`main_new.py:516`) and all `auth_utils.py` functions only verify the signature — they never check if a token has been revoked.

## Solution

1. **Redis token blacklist**: Store `revoked:{jti}` in Redis with TTL = remaining token lifetime. JTI = `sha256(token)[:16]` to keep keys short.

2. **Add `jti` claim to tokens**: Modify `create_access_token()` (`main_new.py:1177`) to include `"jti": uuid4().hex`.

3. **Blacklist check in middleware**: In `require_auth_middleware` and `require_any_auth`, after signature verification check `redis.exists(f"revoked:{payload['jti']}")`. 429 or 401 if found.

4. **Logout endpoints** (one per role):
   - `POST /api/auth/customer/logout`
   - `POST /api/auth/driver/logout`
   - `POST /api/auth/vendor/logout`
   - Each adds JTI to Redis blacklist with TTL

5. **FCM unregister** on logout: Call existing `/api/notifications/unregister-token` (`main_new.py:19064`) inside logout handler.

Note: Redis fallback (in-memory) is acceptable for blacklist — worst case a revoked token stays valid in one worker until Redis reconnects.
