# ArthaBuild Security Controls

**Version:** 1.0
**Date:** 2026-04-10
**Standard:** SOC2 Type II readiness (CC6, CC7, CC8, A1 trust service criteria)

This document provides evidence for SOC2 control categories relevant to ArthaBuild.
All references are to source files in the ArthaBuild repository.

---

## Access Control (CC6)

| Control ID | Control | Status | Evidence |
|------------|---------|--------|----------|
| CC6.1 | Authentication required for all API endpoints | Implemented | `rawapi.py` — `require_auth_middleware` global middleware; all non-allowlisted paths require Bearer JWT |
| CC6.1 | Bcrypt password hashing, cost = 12 | Implemented | `auth_utils.py:hash_password()` — `passlib.context` bcrypt, rounds=12 |
| CC6.1 | JWT HS256, 24h access / 7d refresh | Implemented | `auth_utils.py:create_access_token()` + `create_refresh_token()` |
| CC6.1 | Email verification required before first login | Implemented | `routers/user.py` — `require_user_unverified_ok` alias; protected endpoints enforce `require_verified=True` — Phase 11 |
| CC6.1 | Account lockout: 5 failed attempts → 15 min | Implemented | `routers/auth.py` — `locked_until` field on User; 429 response on locked accounts |
| CC6.1 | JWT blacklist on logout (JTI) | Implemented | `auth_utils.py` — in-memory JTI set; `auth.logout` event logged |
| CC6.2 | Role-based access control (admin / user) | Implemented | `auth_utils.py:require_admin()` + `require_user()` FastAPI Depends — Phase 9 |
| CC6.2 | First-user-is-admin bootstrapping | Implemented | `routers/user.py:register()` — `SELECT COUNT(*) FROM users` before insert |
| CC6.2 | Admin cannot remove themselves | Implemented | AdminPanel.tsx — Promote/Remove buttons hidden for admin's own row |
| CC6.6 | Rate limiting: 10 req/min on all auth endpoints | Implemented | SlowAPI in `rawapi.py` — `@limiter.limit("10/minute")` on all auth routes |
| CC6.6 | No email enumeration (forgot-password always 200) | Implemented | `routers/auth.py:forgot_password()` — identical response whether email found or not |
| CC6.6 | No email enumeration (login — same error for bad email vs bad password) | Implemented | `routers/auth.py:login()` — 401 with identical message for both cases |
| CC6.7 | HTTPS enforced in production (TLS 1.2/1.3) | Implemented | `nginx/nginx.prod.conf` — `ssl_protocols TLSv1.2 TLSv1.3` — Phase 12 |
| CC6.7 | HSTS: max-age=31536000; includeSubDomains | Implemented | `nginx/nginx.prod.conf` — `add_header Strict-Transport-Security` — Phase 12 |
| CC6.7 | HTTP → HTTPS redirect (port 80 → 443) | Implemented | `nginx/nginx.prod.conf` — `return 301 https://$host$request_uri` — Phase 12 |
| CC6.7 | X-Frame-Options: DENY | Implemented | `nginx/nginx.prod.conf` — Phase 12 |
| CC6.7 | X-Content-Type-Options: nosniff | Implemented | `nginx/nginx.prod.conf` — Phase 12 |
| CC6.7 | Referrer-Policy: strict-origin-when-cross-origin | Implemented | `nginx/nginx.prod.conf` — Phase 12 |
| CC6.7 | CSP (report-only mode v1.0) | Partial | `nginx/nginx.prod.conf` — `Content-Security-Policy-Report-Only` — tighten to enforcing post-launch |
| CC6.8 | CORS restricted to explicit allowlist | Implemented | `rawapi.py` — `ALLOWED_ORIGINS` env var, comma-separated; no wildcard — Phase 12 |
| CC6.8 | CSRF: JWT-in-Authorization-header (no cookie JWT) | Implemented | `authService.ts` — memory-only token via `setAccessToken()`, no Set-Cookie; cross-site requests cannot include custom headers |

---

## Audit Logging (CC7)

| Control ID | Control | Status | Evidence |
|------------|---------|--------|----------|
| CC7.2 | All auth events logged (login/logout/refresh/failed) | Implemented | `audit_utils.py:write_audit_event()` — Phase 12 Plan 01 |
| CC7.2 | All password events logged (forgot/reset/change) | Implemented | `audit_utils.py` hooks in `routers/auth.py` and `routers/user.py` |
| CC7.2 | All admin actions logged (role change, invite, delete, config, team create, send-reset) | Implemented | `audit_utils.py` hooks in `routers/admin.py` — Phase 10 + Phase 12 |
| CC7.2 | Audit log is append-only (no UPDATE/DELETE endpoint) | Implemented | No PUT/PATCH/DELETE on `/api/admin/audit` — verified by `test_audit_log_has_no_mutation_endpoints` |
| CC7.2 | Audit log includes: actor_email, actor_role, action, result, ip_address, target, timestamp | Implemented | `models.py:AuditLog` expanded columns — Phase 12 Plan 01 |
| CC7.2 | Audit log survives account deletion (actor stored as string, not FK) | Implemented | `audit_utils.py` — `actor_email` is `String`, not FK to users — decision AB-1202 |
| CC7.2 | Composite index on (created_at, actor_email) for time-range queries | Implemented | Alembic migration `d5e6f7a8b9ca` — `ix_audit_logs_ts_actor` |
| CC7.2 | Paginated audit API: GET /api/admin/audit?offset=0&limit=50 | Implemented | `routers/admin.py` — newest-first, max limit=200 |

---

## Change Management (CC8)

| Control ID | Control | Status | Evidence |
|------------|---------|--------|----------|
| CC8.1 | Vulnerability disclosure policy (SECURITY.md) | Implemented | Repo root `SECURITY.md` — Phase 12 Plan 03 |
| CC8.1 | Dependency vulnerability scan (pip-audit) | Implemented | `docs/security/ZAP_SCAN_REPORT.md` — Phase 12 Plan 03; 0 CRITICAL/HIGH findings |
| CC8.1 | OWASP ZAP scan methodology documented | Implemented | `docs/security/ZAP_SCAN_REPORT.md` — Phase 12 Plan 03 |
| CC8.1 | No hardcoded secrets in codebase | Implemented | `grep -r "sk-proj" src/ --include="*.py"` returns zero matches |
| CC8.1 | JWT_SECRET_KEY startup validation (fails at startup if missing) | Implemented | `rawapi.py` startup guard — `RuntimeError` if `JWT_SECRET_KEY` not set |

---

## Availability (A1)

| Control ID | Control | Status | Evidence |
|------------|---------|--------|----------|
| A1.1 | Data encrypted at rest (EBS AES-256) | Implemented | `infra/terraform/main.tf` — `encrypted = true` on `root_block_device` — Phase 12 |
| A1.1 | SQLite data persisted via Docker volume | Implemented | `docker-compose.yml` — `arthaBuild-data` volume mount at `/app/data` |
| A1.1 | FAISS vectorstore persisted via Docker volume | Implemented | `docker-compose.yml` — same `app_data` volume; FAISS at `/app/data/vectorstore_ollama` |
| A1.2 | License grace period (72h offline resilience) | Implemented | `routers/license.py` — cached validity for 72 hours when license server unreachable |

---

## Data Protection

| Control | Status | Evidence |
|---------|--------|----------|
| NetSuite TBA credentials: never written to disk/DB/logs | Implemented | `session_store.py` — in-memory Python dict only (CLAUDE.md rule) |
| OpenAI keys: zero in codebase | Implemented | `grep -r "sk-proj" src/ --include="*.py"` returns zero matches |
| JWT_SECRET_KEY: required env var (fails at startup if missing) | Implemented | `rawapi.py` startup validation |
| Password reset tokens: SHA-256 hashed only | Implemented | `routers/auth.py` — `hashlib.sha256(token.encode()).hexdigest()` in DB; raw token sent in email only |
| Email verification tokens: SHA-256 hashed only | Implemented | `routers/user.py` — same hashing pattern as password reset |
| Password hashing: bcrypt cost=12 | Implemented | `auth_utils.py:hash_password()` |

---

## Deferred Controls (Post-Launch)

| Control | Reason | Target |
|---------|--------|--------|
| CSP enforcing mode | React SPA needs violation analysis before enforcing — CSP-Report-Only in v1.0 | Post-launch |
| Log shipping to SIEM | Feature request for enterprise customers — not in v1.0 scope | Post v1.0 |
| SQLCipher (app-level encryption) | GCP/Azure deployments not in v1.0 scope; EBS covers AWS | Post v1.0 |
| pip-audit findings remediation (langchain ecosystem) | Hard version pin constraint (langgraph 0.2.38 requires langchain-core <0.4) | v2.0 LangChain upgrade |
| pip-audit findings remediation (pyjwt, starlette) | No CRITICAL/HIGH — upgrade tracked for stability | v1.1 |
| Formal SOC2 Type II audit | Requires 6-month operational period with audit trail | 2027 |
| ZAP full active scan (live stack) | Requires running docker-compose stack — run before each production deployment | Pre-deployment |

---

## Control Evidence Index

| File | Controls |
|------|---------|
| `src/backend/audit_utils.py` | CC7.2 (all audit logging) |
| `src/backend/auth_utils.py` | CC6.1 (JWT, bcrypt), CC6.2 (RBAC) |
| `src/backend/routers/auth.py` | CC6.6 (rate limit, no enum), CC7.2 (auth events) |
| `src/backend/routers/user.py` | CC6.1 (email verify), CC7.2 (user events) |
| `src/backend/routers/admin.py` | CC6.2 (admin-only), CC7.2 (admin events) |
| `nginx/nginx.prod.conf` | CC6.7 (TLS, HSTS, headers), CC6.8 (CORS, CSP) |
| `src/backend/rawapi.py` | CC6.1 (global auth middleware), CC6.8 (CORS ALLOWED_ORIGINS) |
| `infra/terraform/main.tf` | A1.1 (EBS encryption) |
| `docs/security/ZAP_SCAN_REPORT.md` | CC8.1 (vuln scan, ZAP methodology) |
| `SECURITY.md` | CC8.1 (vulnerability disclosure) |
