---
created: 2026-03-14T00:00:00Z
title: Implement Apple Sign-In nonce validation
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/main_new.py:3177-3290
  - apps/web/p2p-platform/backend/main_new.py:6325-6390
  - apps/ios/customer/
  - apps/ios/delivery/
---

## Problem

Apple Sign-In `identity_token` is decoded but the `nonce` claim is never generated or validated — `main_new.py:3177`, `6326`. Without nonce, a stolen `identity_token` can be replayed against the API to authenticate as the victim. OWASP Mobile Top 10: M5 — Insufficient Cryptography.

## Solution

**iOS side**: Generate a cryptographically random nonce before triggering Sign-In with Apple. Pass hashed nonce (SHA256) to `ASAuthorizationAppleIDRequest.nonce`. Apple embeds it in the identity_token's `nonce` claim.

**Backend side**:
1. Accept `nonce` parameter on all Apple auth endpoints
2. Store nonce in Redis with 5-minute TTL keyed by a session ID
3. After decoding `identity_token`, extract `nonce` claim
4. Verify token nonce matches stored nonce
5. Delete nonce from Redis after single use (one-time-use)

Files to change:
- `main_new.py`: Apple auth endpoints (`3179`, `2652`, `6325`)
- iOS Customer app: `P2PAPIService.swift` — Apple auth call
- iOS Driver app: Apple auth call

Related: G1 (signature verification) should be done first — nonce in an unverified token provides no security.
