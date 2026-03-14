---
created: 2026-03-14T00:00:00Z
title: Add per-account rate limiting on auth endpoints (complement per-IP)
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/cache.py:189-223
  - apps/web/p2p-platform/backend/main_new.py:572-578
---

## Problem

All rate limiters key on client IP (`cache.py:189–211`). This means:
- Multiple accounts behind the same IP (corporate NAT, school, shared VPN) share a single rate limit bucket
- A targeted attack on one account from many IPs bypasses all rate limiting
- A VPN user rotating IPs can attempt unlimited logins on one account

## Solution

Apply **dual rate limiting** on login endpoints — both per-IP (existing) AND per-email:

1. In `cache.py`, modify `get_client_ip()` to return IP, or accept a custom key

2. Add per-email rate limiter: `email_auth_rate_limiter = RateLimiter(max_requests=20, window_seconds=3600)` — 20 attempts per hour per email

3. In each login endpoint (customer `3423`, driver `2879`, vendor `2016`, admin `1988`):
   - Keep existing IP check (first — fast reject before DB query)
   - After extracting email from form, add: `check_rate_limit(request, email_auth_rate_limiter, email)`

4. Return 429 with `Retry-After` header on either limit hit (same as existing)

5. Exempt demo emails (same exemption list `main_new.py:585–590`)

Note: Per-email limits should be higher than per-IP (IPs are shared, emails are specific). 20/hr is loose enough for legitimate users, tight enough to block password spraying.
