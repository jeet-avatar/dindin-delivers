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

## Implemented

- Replaced `decode_google_jwt()` (insecure base64-decode-only) with full signature verification:
  - **Google**: `_verify_google_jwt()` uses `google-auth` library `id_token.verify_oauth2_token()` — fetches Google's public keys, verifies RS256 signature, checks expiry and issuer. `GOOGLE_CLIENT_ID` env var enables audience verification.
  - **Apple**: `_verify_apple_jwt()` fetches Apple's JWKS from `https://appleid.apple.com/auth/keys`, finds matching key by `kid`, verifies RS256 signature using `python-jose`. JWKS cached in memory for 1 hour.
  - Token issuer auto-detection (Apple if `iss` contains `appleid.apple.com`, else Google)
- Added `google-auth==2.38.0` to `requirements.txt`
- `python-jose[cryptography]` already in requirements — no new dep
- All 6 OAuth endpoints (vendor/driver/customer × Google/Apple) now go through verified `decode_google_jwt()` automatically
- Forged tokens (missing valid RS256 signature) now return empty dict → auth fails
- **Pending**: Set `GOOGLE_CLIENT_ID` env var in AWS Secrets Manager to enable audience verification
