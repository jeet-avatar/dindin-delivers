---
phase: 12-security-hardening-and-soc2-readiness
plan: "02"
subsystem: infrastructure-security
tags: [nginx, tls, cors, terraform, ebs-encryption, soc2, security-headers, static-analysis-tests]
dependency_graph:
  requires: []
  provides:
    - nginx.prod.conf with TLS 1.2/1.3, HTTPS redirect, 5 security headers
    - EBS encryption at rest via Terraform encrypted=true
    - CORS tightened with ALLOWED_ORIGINS env var, no wildcard
    - 14 static-analysis security tests (5 test files) in tests/security/
  affects:
    - nginx/nginx.prod.conf (new file)
    - src/backend/rawapi.py (CORS config)
    - infra/terraform/main.tf (EBS encryption)
    - docs/ARCHITECTURE.md (v2.1)
    - docs/architecture-diagram.html (v2.1)
    - docs/test-report.html (Phase 12 tests added)
tech_stack:
  added:
    - nginx.prod.conf (production TLS config, separate from dev nginx.conf)
    - tests/security/ (5-file static analysis test suite)
  patterns:
    - Static config file analysis for Nginx security tests (not HTTP requests)
    - ALLOWED_ORIGINS comma-separated env var for CORS control
    - encrypted=true in Terraform root_block_device for EBS AES-256
key_files:
  created:
    - nginx/nginx.prod.conf
    - src/backend/tests/security/__init__.py
    - src/backend/tests/security/test_security_headers.py
    - src/backend/tests/security/test_https_redirect.py
    - src/backend/tests/security/test_tls_config.py
    - src/backend/tests/security/test_csrf.py
    - src/backend/tests/security/test_encryption.py
  modified:
    - src/backend/rawapi.py (CORS ALLOWED_ORIGINS + allow_credentials=False)
    - infra/terraform/main.tf (encrypted=true on root_block_device)
    - docs/ARCHITECTURE.md (v2.0 → v2.1, Section 13 added)
    - docs/architecture-diagram.html (v2.0 → v2.1, section 9d + changelog entry)
    - docs/test-report.html (Phase 12 Plan 02 test rows, counters 96→110)
decisions:
  - "AB-1202-PATH: Test file __file__ paths use 4 levels (../../../..) not 5 — tests/security/ is 4 levels below arthaBuild/ root (not 5 as plan template assumed)"
  - "AB-1202-CSRF: Login endpoint uses json= not data= — existing test_auth.py uses json= for all /api/auth/login calls"
  - "AB-1202-CRED: allow_credentials=False (CORS) — JWT delivered in Authorization header, not cookies; this is correct and prevents CSRF by design"
metrics:
  duration: ~35 minutes
  completed: 2026-04-10
  tasks: 2
  files: 12
---

# Phase 12 Plan 02: Network Security + Infrastructure Hardening Summary

**One-liner:** nginx.prod.conf with TLS 1.2/1.3, HSTS, X-Frame:DENY, CSP-Report-Only; Terraform EBS encrypted=true; CORS ALLOWED_ORIGINS env var; 14 static-analysis security tests (110 total, 0 failed).

## What Was Built

### Task 1: nginx.prod.conf — HTTPS Redirect + Security Headers + TLS Hardening

Created `nginx/nginx.prod.conf` as a production-only Nginx config separate from the dev `nginx.conf` (which remains port 80, unchanged):

**Port 80 block (CASE-188):**
- `return 301 https://$host$request_uri` — all HTTP traffic redirected to HTTPS permanently

**Port 443 block (CASE-195):**
- `ssl_protocols TLSv1.2 TLSv1.3` — SSLv3, TLSv1.0, TLSv1.1 explicitly absent (RFC 8996 deprecated)
- Mozilla Intermediate cipher suite (ECDHE-RSA-AES128-GCM-SHA256 etc.)
- `ssl_prefer_server_ciphers off` — allows client to choose from suite
- `ssl_session_cache shared:SSL:10m` + `ssl_session_timeout 1d` — session resumption

**Security headers (CASE-189) — `always` keyword ensures headers on error responses too:**
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; ...` (report mode — safe for React v1.0)

All location blocks from nginx.conf copied exactly: `/api/` proxy (120s timeout for AI), `/health` proxy, `/` SPA fallback.

### Task 2: CORS Tightening + Terraform EBS Encryption + 14 Security Tests

**CORS in rawapi.py (CASE-190):**
- `ALLOWED_ORIGINS` env var: comma-separated list of allowed origins (production use)
- Falls back to `FRONTEND_BASE_URL` (single origin), then dev localhost list (5173-5180, 127.0.0.1:5173)
- `allow_credentials=False` — JWT in `Authorization: Bearer` header, not cookies. Cross-site requests cannot include custom headers → no CSRF vector by design.
- No wildcard `*` origin in any environment.

**Terraform EBS encryption (CASE-193):**
- `encrypted = true` added to `root_block_device` in `infra/terraform/main.tf`
- AES-256 via AWS-managed `aws/ebs` KMS key (no `kms_key_id` needed for v1.0)
- Covers SQLite DB + FAISS vectorstore (both on the same EBS volume)
- SOC2 A1.1: availability and encryption of data at rest

**14 static-analysis security tests in `src/backend/tests/security/`:**

| File | Tests | Verifies |
|------|-------|---------|
| `test_security_headers.py` | 5 | HSTS, X-Frame-Options:DENY, X-Content-Type-Options:nosniff, Referrer-Policy, CSP-Report-Only |
| `test_https_redirect.py` | 2 | 301 redirect on port 80, dev nginx.conf unchanged |
| `test_tls_config.py` | 3 | TLS 1.2/1.3 only, no deprecated protocols in directives, Mozilla cipher present |
| `test_csrf.py` | 3 | No JWT in Set-Cookie on login, no wildcard CORS, ALLOWED_ORIGINS env var |
| `test_encryption.py` | 1 | `encrypted = true` inside `root_block_device` block in Terraform |

All tests parse config files on disk — no live HTTP requests. This is the correct pattern: HTTPX test client talks to FastAPI directly, bypassing Nginx entirely, so nginx headers cannot be tested via HTTP.

**Architecture docs updated:**
- `docs/ARCHITECTURE.md` → v2.1 (Section 13: Phase 12 Plan 02 controls)
- `docs/architecture-diagram.html` → v2.1 (Section 9d: SOC2 control table, changelog entry)
- `docs/test-report.html` → Phase 12 Plan 02 rows added, totals updated 96→110

## Verification

| Check | Result |
|-------|--------|
| `grep "ssl_protocols" nginx/nginx.prod.conf` | `ssl_protocols TLSv1.2 TLSv1.3` |
| `grep "Strict-Transport-Security" nginx/nginx.prod.conf` | HSTS max-age=31536000 present |
| `grep "return 301" nginx/nginx.prod.conf` | HTTP→HTTPS redirect present |
| `grep "TLSv1.0\|TLSv1.1\|SSLv3" nginx/nginx.prod.conf` (directives only) | 0 matches |
| `grep "ALLOWED_ORIGINS" src/backend/rawapi.py` | env var parsing present |
| `grep "encrypted" infra/terraform/main.tf` | `encrypted = true` in root_block_device |
| `pytest tests/security/ -v` | 14/14 passed |
| `pytest tests/ -q` | 110 passed, 5 skipped, 0 failed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test file paths used 5 `..` levels instead of 4**
- **Found during:** Task 2, first test run
- **Issue:** Plan template used `"../../../../.."` (5 levels) but `tests/security/` is only 4 levels below the ArthaBuild root (`arthaBuild/src/backend/tests/security/` → 4 levels up = `arthaBuild/`)
- **Fix:** Changed all 5-level paths to `"../../../.."` (4 levels) in all 5 test files
- **Files modified:** All 5 `tests/security/test_*.py` files
- **Decision:** AB-1202-PATH

**2. [Rule 1 - Bug] CSRF test used `data=` instead of `json=` for login**
- **Found during:** Task 2, test_csrf.py run
- **Issue:** Plan template used `data={"username": ..., "password": ...}` which sends form-encoded body (422 Unprocessable Entity). Existing `test_auth.py` uses `json=` consistently.
- **Fix:** Changed to `json={"username": ..., "password": ...}`
- **Files modified:** `tests/security/test_csrf.py`
- **Decision:** AB-1202-CSRF

## Self-Check

### Files exist:

- nginx/nginx.prod.conf: FOUND
- src/backend/tests/security/test_security_headers.py: FOUND
- src/backend/tests/security/test_https_redirect.py: FOUND
- src/backend/tests/security/test_tls_config.py: FOUND
- src/backend/tests/security/test_csrf.py: FOUND
- src/backend/tests/security/test_encryption.py: FOUND
- docs/ARCHITECTURE.md: v2.1 — FOUND
- docs/architecture-diagram.html: v2.1 — FOUND

### Commits exist:

- 6a65cdb8: feat(12-02): nginx.prod.conf — HTTPS redirect, TLS 1.2/1.3 hardening, security headers
- c9018bc4: feat(12-02): CORS ALLOWED_ORIGINS, Terraform EBS encryption, 14 security tests

## Self-Check: PASSED
