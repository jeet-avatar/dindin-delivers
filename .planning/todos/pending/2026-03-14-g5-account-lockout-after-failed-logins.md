---
created: 2026-03-14T00:00:00Z
title: Add account lockout after N failed login attempts
area: security/auth
severity: LOW
files:
  - apps/web/p2p-platform/backend/main_new.py:1940-1981
  - apps/web/p2p-platform/backend/main_new.py:2011-2066
  - apps/web/p2p-platform/backend/main_new.py:2874-2925
  - apps/web/p2p-platform/backend/main_new.py:3417-3460
  - apps/web/p2p-platform/backend/cache.py
---

## Problem

Rate limiting (10/min/IP) slows brute force but doesn't lock accounts. An attacker using multiple IPs or a rotating proxy can attempt unlimited passwords against a single account over time. No `failed_login_count` or `locked_until` field exists on the User model.

Current rate limit: `main_new.py:572` — per-IP, not per-email.

## Solution

1. **Track failed attempts in Redis**: Key `login_fails:{email}` → increment on failure, expire in 15 min

2. **Lockout threshold**: 10 consecutive failures → lock account for 15 minutes

3. **On login failure** (all 4 login endpoints):
   - Increment `login_fails:{email}` in Redis
   - If count ≥ 10: return 429 with "Account temporarily locked. Try again in 15 minutes."
   - Always return generic "Incorrect email or password" first (don't reveal lock state to avoid enumeration)

4. **On login success**: Delete `login_fails:{email}` from Redis

5. **Admin unlock**: `POST /api/admin/users/{id}/unlock` — deletes Redis key

6. **Demo accounts exempt**: Add demo emails to lockout exemption (same as rate limit exemption `main_new.py:585–590`)

Note: Per-email lockout is safer than per-IP. Keep lockout short (15 min) to avoid DoS where attacker intentionally locks legitimate users out.
