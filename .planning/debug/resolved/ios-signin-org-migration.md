---
status: resolved
trigger: "All 3 iOS apps cannot sign in on latest TestFlight builds after org migration"
created: 2026-02-24T00:00:00Z
updated: 2026-02-24T12:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - SSL pinning hashes use SPKI format but iOS SecKeyCopyExternalRepresentation returns PKCS1 format
test: Compared openssl SPKI hashes vs SecKeyCopyExternalRepresentation PKCS1 hashes for all 3 certs
expecting: Hashes should match - they do NOT. Every API call rejected by SSL pinning.
next_action: Archive debug session - fix applied and verified

## Symptoms

expected: Users can login via Apple Sign-In, Google Sign-In, or demo email/password credentials
actual: App not letting me sign in - all 3 login methods, all 3 apps
errors: SSL pinning ALWAYS fails - URLSession delegate cancels auth challenge, killing all API connections
reproduction: Install any of 3 apps from TestFlight (builds 1093/201/170), attempt any login method
started: Since build 1091 (Feb 23) when SSL pinning was first enabled. Org migration was coincidental.

## Eliminated

- hypothesis: URL encoding issue in login form bodies
  evidence: Fixed in commit 6715fa04 but login still fails
  timestamp: 2026-02-24

- hypothesis: Stale Stripe SSL pin
  evidence: Removed in commit 6715fa04 but login still fails
  timestamp: 2026-02-24

- hypothesis: Org migration broke certificates/provisioning
  evidence: Team ID unchanged, entitlements correct, API_BASE_URL correct in archive, backend works
  timestamp: 2026-02-24

- hypothesis: Backend endpoints broken
  evidence: All 3 login endpoints return 200 with valid JWT via curl
  timestamp: 2026-02-24

## Evidence

- checked: SSL cert chain hashes (SPKI vs PKCS1)
  found: All 3 pins are SPKI hashes but iOS computes PKCS1 hashes - NONE match
  implication: SSL pinning ALWAYS fails, ALL secureSession requests rejected

- checked: SecKeyCopyExternalRepresentation documentation
  found: Returns PKCS1 format for RSA keys (no AlgorithmIdentifier header)
  implication: Hash is computed over different data than what openssl produces

- checked: When SSL pinning was introduced
  found: Commit 25fb8c1c (Feb 22) - VAPT remediation
  implication: Login broken since build 1091, org migration was red herring

## Resolution

root_cause: SSL pin hash format mismatch. Pins are SPKI hashes (openssl), iOS code computes PKCS1 hashes (SecKeyCopyExternalRepresentation). They never match.
fix: Modified getPublicKeyHash() in NetworkSecurity.swift to prepend ASN.1 SPKI header before hashing. The header converts PKCS1 raw key data (from SecKeyCopyExternalRepresentation) into SPKI format, matching the pinned hashes.
verification: |
  1. Mathematically verified: header + PKCS1 data produces identical hash to full SPKI DER for all 3 certs
  2. Build succeeded: xcodebuild build -scheme eatfaircustomer completed with no errors
  3. Backend verified: All 3 login endpoints return 200 with valid JWT via curl
files_changed:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift
