---
created: 2026-03-14T00:00:00Z
title: Verify Google and Apple OAuth token signatures
area: security/auth
severity: HIGH
files:
  - apps/web/p2p-platform/backend/main_new.py:2535-2554
---

## Problem

`decode_google_jwt()` at `main_new.py:2535–2554` decodes Google and Apple identity tokens by splitting the JWT and base64-decoding the payload — it does NOT verify the token's cryptographic signature. A malicious actor could forge a Google/Apple JWT with any email and gain access to any account that has OAuth enabled.

Used in all OAuth flows:
- Google: customer (`3567`), driver (`3093`), vendor (`2556`)
- Apple: customer (`6325`), driver (`3179`), vendor (`2652`)

## Solution

**Google**: Use `google-auth` library's `id_token.verify_oauth2_token(token, Request(), CLIENT_ID)` which fetches Google's public keys from `https://www.googleapis.com/oauth2/v3/certs` and verifies the RS256 signature.

**Apple**: Use `python-jose` or `PyJWT` to fetch Apple's public keys from `https://appleid.apple.com/auth/keys` (JWKS endpoint) and verify the token signature before trusting any claim.

Cache the public keys with a 1-hour TTL to avoid repeated HTTPS calls.

Steps:
1. Add `google-auth` to requirements.txt
2. Replace `decode_google_jwt()` body with verified decode
3. For Apple, fetch JWKS and verify RS256 signature
4. Cache JWKS in Redis/memory with TTL
5. Deploy and test with real Google/Apple tokens
