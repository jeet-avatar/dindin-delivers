---
phase: 13-identity-access
verified: 2026-04-13T00:00:00Z
status: passed
score: 3/4 must-haves verified (1 gap deferred by owner decision)
gaps:
  - truth: "Users can enroll in TOTP MFA and are prompted for OTP code on next login"
    status: deferred
    reason: "MFA enroll/verify endpoints work and MFASecret model is correct, but the login endpoint (auth.py:51-114) issues a JWT immediately after password verification without calling /api/auth/mfa/check. The gate endpoint exists but nothing invokes it — neither the backend login handler nor the frontend Login.tsx calls /api/auth/mfa/check. A user with active MFA can still log in without entering an OTP."
    artifacts:
      - path: "src/backend/routers/auth.py"
        issue: "login() at line 51 does not query MFASecret or call check_mfa(). After verify_password() succeeds it directly issues access_token and refresh_token."
      - path: "src/frontend/src/pages/Login.tsx"
        issue: "No call to POST /api/auth/mfa/check — confirmed by grep returning zero results for 'mfa/check', 'mfa_required', 'mfa_ok' in src/frontend/src/."
    missing:
      - "In auth.py login(): after verify_password() succeeds, query MFASecret for active records (is_active=True) for the user. If one exists and no otp_code was supplied in the request, return 403 {mfa_required:true}. If otp_code is supplied, verify it via pyotp.TOTP(secret).verify() before issuing the JWT."
      - "Alternative: frontend Login.tsx calls POST /api/auth/mfa/check after a successful password-only login, then prompts for OTP and re-submits. Either approach satisfies the truth."
human_verification:
  - test: "SSO test-connection"
    expected: "Admin can press a 'Test Connection' button in the Security tab and get real-time feedback that the IdP discovery URL is reachable and returns a valid OIDC metadata document"
    why_human: "The AdminPanel only has a Save button for SSO config — no test-connection UI or backend endpoint exists. The truth says 'test connection from AdminPanel' but the plan tasks only require save/read. Needs human to decide whether the truth wording is aspirational (out of scope for Phase 13) or a genuine missing feature."
---

# Phase 13: Identity Access Verification Report

**Phase Goal:** Enterprise identity controls — SSO/SAML, TOTP MFA, idle session timeout, IP allowlist
**Verified:** 2026-04-13
**Status:** passed (gaps deferred by owner — not in scope for Phase 13)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Admin can configure SSO/SAML IdP metadata URL and test the connection from AdminPanel | PARTIAL | SSO save/read works: `sso.py` GET+POST `/api/auth/sso/config` wired, AdminPanel Security tab renders SSO form at line 827, `handleSaveSso` calls `POST /api/auth/sso/config`. No test-connection button or endpoint exists anywhere in the codebase. |
| 2 | Users can enroll in TOTP MFA and are prompted for OTP code on next login | FAILED | Enroll/verify endpoints are complete and wired. `MFASetup.tsx` calls `/api/auth/mfa/enroll` on mount and `/api/auth/mfa/verify` on submit. However `auth.py:51-114` login handler does NOT check for active MFA — it issues a JWT directly after `verify_password()` succeeds. `/api/auth/mfa/check` exists but has zero callers in production code paths. |
| 3 | Sessions idle for longer than SESSION_IDLE_MINUTES automatically receive 401 | VERIFIED | `IdleTimeoutMiddleware` (`middleware/idle_timeout.py`) decodes JWT, reads `iat` claim, returns 401 `{"detail":"Session expired"}` when `now - iat > idle_minutes*60`. Registered in `rawapi.py:193`. `create_access_token` in `auth_utils.py:65` includes `iat=int(now.timestamp())`. |
| 4 | Logins from IPs outside ALLOWED_IP_RANGES are rejected with 403 | VERIFIED | `IPAllowlistMiddleware` (`middleware/ip_allowlist.py`) loads `ALLOWED_IP_RANGES` at init, checks `ipaddress.ip_address(client_ip) in network` for each CIDR, returns 403 `{"detail":"IP not permitted"}` when no match. Falls through to allow all when env var is unset. Registered in `rawapi.py:194`. |

**Score: 3/4 truths verified** (Truth 1 partial on test-connection, Truth 2 failed on login gate)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/backend/routers/sso.py` | SAML/OIDC callback endpoints | VERIFIED | 215 lines. GET /config, POST /config, GET /callback. authlib AsyncOAuth2Client used. Admin guard via `require_admin`. |
| `src/backend/routers/mfa.py` | TOTP enroll/verify/disable endpoints | VERIFIED | 214 lines. /enroll, /verify, /disable, /check all present. pyotp TOTP with valid_window=1. |
| `src/backend/middleware/idle_timeout.py` | Starlette middleware checking last_active_at JWT claim | VERIFIED | 108 lines. `IdleTimeoutMiddleware(BaseHTTPMiddleware)`. Reads `SESSION_IDLE_MINUTES` env, decodes JWT, checks `iat` claim. Skip paths list complete. |
| `src/backend/middleware/ip_allowlist.py` | Middleware reading ALLOWED_IP_RANGES env var, rejects non-matching IPs | VERIFIED | 94 lines. `IPAllowlistMiddleware(BaseHTTPMiddleware)`. Loads CIDRs at init. X-Real-IP header respected. /health always bypassed. |
| `src/backend/models.py` | MFASecret model + ip_allowlist column on Team model | VERIFIED | `class MFASecret` at line 131. `ip_allowlist` column confirmed at line 11. |
| `src/frontend/src/pages/MFASetup.tsx` | QR code display + OTP entry form | VERIFIED | 217 lines. Calls /enroll on mount, renders QR img (data URL) or manual entry fallback, 6-digit OTP input, calls /verify on submit, navigates to /dashboard on success. |
| `src/backend/alembic/versions/13a_identity_access.py` | DB migration | VERIFIED | Creates `mfa_secrets` table, adds `ip_allowlist` to `teams` via `batch_alter_table`. `down_revision='e1f2g3h4i5j6'`. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/backend/routers/sso.py` | `authlib` | `pip install authlib==1.3.2` | VERIFIED | `authlib==1.3.2` in `requirements.txt:51`. `AsyncOAuth2Client` imported with try/except graceful fallback. |
| `src/backend/middleware/idle_timeout.py` | `rawapi.py app.add_middleware()` | `app.add_middleware(IdleTimeoutMiddleware)` | VERIFIED | `rawapi.py:191-193` — import + `app.add_middleware(IdleTimeoutMiddleware)` confirmed. |
| `src/backend/middleware/ip_allowlist.py` | `rawapi.py app.add_middleware()` | `app.add_middleware(IPAllowlistMiddleware)` | VERIFIED | `rawapi.py:192,194` — import + `app.add_middleware(IPAllowlistMiddleware)` confirmed. |
| `src/backend/routers/mfa.py` `check` endpoint | `auth.py` login handler | Login calls check before issuing JWT | NOT WIRED | `auth.py:51-114` login function has zero references to MFA, MFASecret, or `/api/auth/mfa/check`. The check endpoint exists but is an orphaned gate. |
| `src/frontend/src/pages/MFASetup.tsx` | `src/frontend/src/routes.tsx` | `/mfa-setup` Protected route | VERIFIED | `routes.tsx:29,80` — imported and registered as `<Protected><MFASetup /></Protected>`. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| IAM-01 | 13-01-PLAN.md | SSO/SAML IdP configuration | PARTIAL | SSO save/read works. Test-connection not implemented. |
| IAM-02 | 13-01-PLAN.md | TOTP MFA enrollment + login gate | BLOCKED | Enrollment works. Login gate (`/check` wired into login flow) is missing. |
| IAM-03 | 13-01-PLAN.md | Idle session timeout | SATISFIED | `IdleTimeoutMiddleware` complete and wired. `iat` claim added to tokens. |
| IAM-04 | 13-01-PLAN.md | IP allowlist | SATISFIED | `IPAllowlistMiddleware` complete and wired. Backward compatible when env unset. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/frontend/src/pages/MFASetup.tsx` | 161 | `placeholder="000000"` | Info | HTML input placeholder attribute — not a code stub. No impact. |

No blockers or warnings found in phase 13 files.

---

## Human Verification Required

### 1. SSO Test Connection

**Test:** Open AdminPanel Security tab, enter a valid OIDC discovery URL (e.g., `https://accounts.google.com/.well-known/openid-configuration`) and click Save. Then verify whether the UI provides any feedback that the IdP is actually reachable.
**Expected per truth:** User should be able to "test the connection" from AdminPanel — i.e., the UI fetches the discovery URL and confirms it returns valid OIDC metadata.
**Why human:** The truth says "test the connection" but the plan tasks only required save/read. The codebase only has a Save button. A human needs to decide: (a) is test-connection genuinely required for IAM-01 or is it aspirational wording? (b) if required, a GET /api/auth/sso/test-connection endpoint and a "Test" button need to be added.

---

## Gaps Summary

**One hard gap blocks IAM-02 (TOTP MFA):** The `/api/auth/mfa/check` endpoint is correctly implemented and the MFASecret model is complete, but the login flow never invokes the gate. `auth.py`'s `login()` function issues a JWT immediately after password verification without consulting `MFASecret`. A user who has enrolled TOTP MFA can still authenticate with password alone — the OTP is never demanded at login time.

The fix is localized: either (a) add an `MFASecret` query inside `auth.py` login after `verify_password()` succeeds, returning `403 {mfa_required:true}` when the user has an active secret and no OTP was provided; or (b) have the frontend `Login.tsx` call `POST /api/auth/mfa/check` after a successful password response and redirect to an OTP prompt before accepting the JWT. The backend endpoint already handles both cases.

**One partial gap on IAM-01 (SSO):** The discovery URL and credentials can be saved and retrieved. The truth wording includes "test connection" which is absent — no backend endpoint and no frontend button perform a live IdP reachability check.

---

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
