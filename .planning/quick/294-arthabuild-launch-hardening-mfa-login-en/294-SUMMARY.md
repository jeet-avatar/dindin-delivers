---
phase: 294-arthabuild-launch-hardening
plan: 01
subsystem: auth
tags: [mfa, totp, rfc9116, launch, hardening, retest]

# Dependency graph
requires:
  - phase: 293-foolproof-arthabuild-launch
    provides: [delete-account-ui, real-og-image, 404-page, compliance-addendum]
provides:
  - mfa-enforcement-login
  - security-txt-rfc9116
  - quick-293-zero-assume-retest
affects: [arthaBuild auth flow, public disclosure contact]

# Tech tracking
tech-stack:
  added: []   # pyotp already present (Phase 13)
  patterns:
    - "Inline MFA gate in login() (no self-HTTP call to /mfa/check)"
    - "Vite public/ → dist/.well-known/ static delivery (nginx default mime = text/plain)"

key-files:
  created:
    - /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
  modified:
    - /Users/jeet/arthaBuild/src/backend/schemas.py
    - /Users/jeet/arthaBuild/src/backend/routers/auth.py
    - /Users/jeet/arthaBuild/src/backend/tests/test_auth.py

key-decisions:
  - "MFA check inlined in login() instead of HTTP self-call to /mfa/check — zero-latency, no self-call loop risk"
  - "MFA gate placed AFTER email-verify (avoids leaking 'this email has MFA' to unverified users) and BEFORE JWT issuance"
  - "security.txt Expires = 2027-04-20T00:00:00Z (1 year per RFC 9116 recommendation)"
  - "Two Contact lines (mailto + https) per RFC 9116 best practice"
  - "Frontend login prompt UI for OTP intentionally deferred — zero production users have active MFA, backend gate is what matters for launch"

patterns-established:
  - "Post-password MFA gate pattern: query MFASecret, if active+empty_otp → 403 mfa_required, if active+otp → pyotp.TOTP.verify(valid_window=1)"
  - "RFC 9116 security.txt path: public/.well-known/security.txt → dist/.well-known/security.txt via default vite publicDir copy"

requirements-completed: [HARDEN-01, HARDEN-02, HARDEN-03]

# Metrics
duration: ~35 min
completed: 2026-04-20
---

# Quick-294: ArthaBuild Launch Hardening Summary

**Closed 2 deferred gaps from quick-293 (MFA-at-login enforcement + RFC 9116 security.txt) and captured a zero-assume retest table covering all 7 items (quick-293 1-5 plus quick-294 6-7) with real command output.**

**Prod:** `https://artha.build` (EC2 `44.194.34.223`)
**arthaBuild commit:** `6ae5307` on `main` (pushed)
**dindin commit:** follows this file

---

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-20T21:25:00Z (approx)
- **Completed:** 2026-04-20T21:40:00Z (approx)
- **Tasks:** 3 (schema+login+tests, security.txt, deploy+retest)
- **Files modified:** 4 (arthaBuild) + 2 (dindin docs)

## Accomplishments

- Backend enforces MFA at login for any user with active `MFASecret` row — verified via 3 live production scenarios (no OTP → 403, valid OTP → 200, invalid OTP → 403).
- `https://artha.build/.well-known/security.txt` serves RFC 9116 contact (`security@artha.build`) with 200 + text/plain + Expires 2027-04-20.
- 3 new unit tests cover the MFA gate (required-without-otp, valid-otp-success, no-MFA-regression). All 27 `test_auth.py` tests pass (zero regression).
- Zero-assume retest of quick-293 items (1)-(5): 4 live + 1 still-blocked-on-user. Every claim has a fresh command + actual stdout (no memory-based passes).

## Task Commits

1. **Task 1: Backend MFA enforcement in login + unit test** — part of `6ae5307` (feat)
2. **Task 2: RFC 9116 security.txt** — part of `6ae5307` (feat)
3. **Task 3: Deploy + zero-assume retest + two-repo commit** — deploy in this session, commit `6ae5307` (arthaBuild) + dindin docs commit follows

**Plan metadata:** dindin commit with 294-PLAN + 294-SUMMARY

**Single atomic arthaBuild commit** (`6ae5307`) — 4 files only:
- `src/backend/schemas.py` (+1 line: `otp_code` field)
- `src/backend/routers/auth.py` (+25 lines: MFASecret import, pyotp import, MFA gate block)
- `src/backend/tests/test_auth.py` (+108 lines: 3 new async tests)
- `src/frontend/public/.well-known/security.txt` (new, 9 lines)

Pre-existing unrelated mods (`email_utils.py`, `license.py`, `landingLinks.ts`, `OnboardingWizard.tsx`, `SignUpSuccess.tsx`, `Unsubscribe.tsx`) stayed unstaged — NOT in this commit.

---

## Must-haves acceptance

| # | Truth | Status | Proof |
|---|-------|--------|-------|
| T1 | User with active MFA + no otp → 403 `{mfa_required:true}`; with valid otp → 200 + JWT | LIVE | Production smoke: `POST /api/auth/login` without otp → `HTTP:403 {"detail":{"mfa_required":true,"message":"MFA code required"}}`; with valid TOTP → `HTTP:200 {access_token:...}` |
| T2 | User without MFA still logs in with just password | LIVE + unit | `test_login_no_mfa_still_works_without_otp` PASSED; `test_login_valid_credentials` PASSED; 27/27 test_auth.py tests pass |
| T3 | `/.well-known/security.txt` serves RFC 9116 fields | LIVE | `curl -sI https://artha.build/.well-known/security.txt` → `HTTP/2 200 content-type: text/plain content-length: 328`; body has 2 Contact + 1 Expires (`2027-04-20T00:00:00Z`) + Canonical + Policy |
| T4 | Every quick-293 claim reverified with fresh live command | DONE | Retest evidence table below — 7 rows with actual stdout |

---

## Retest evidence table (ZERO-ASSUME, all commands run 2026-04-20T21:34Z)

| # | Item | Command | Actual output | Pass/Fail |
|---|------|---------|---------------|-----------|
| (1) | Delete-account UI | `curl -sI https://artha.build/account/delete` + bundle grep | `HTTP:200`; bundle `index-DtDTaTXc.js` has 2 `account/delete` hits; `DELETE /api/user/me` without auth returns `401` (endpoint exists). Note: `deleteAccount` function name minified in prod bundle (0 hits), but route string + backend endpoint both confirmed live. | LIVE |
| (2) | og-image-v2.png | `curl -sI https://artha.build/og-image-v2.png` + `file` | `HTTP/2 200 content-type: image/png content-length: 63763`; `/tmp/og-check-294.png: PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced` | LIVE |
| (3) | 404 page (SPA) | curl random path + bundle grep | Random `/zzz-retest-<ts>` returns `HTTP/2 200` (SPA shell); bundle `index-DtDTaTXc.js` contains `"This page doesn't exist"` (1 hit) — React Router catch-all renders NotFound client-side. SPA 200 is Google-acceptable (soft-404). | LIVE |
| (4) | /security Compliance | bundle grep | `'Compliance & Attestations'` hits: 1; tokens found: `DPA`, `GDPR`, `SOC 2`, `SOC2`, `Subprocessor` | LIVE |
| (5) | Sentry DSN on EC2 | `grep SENTRY_DSN /home/ubuntu/arthaBuild/.env` + `docker compose exec backend printenv SENTRY_DSN` | `.env` match count: `0`; container: `NOT_SET` | BLOCKED — user action |
| (6) | MFA enforcement (new) | `pytest -k mfa` + `docker exec backend grep mfa_required` + live smoke | `pytest`: 3 passed (required-without-otp, valid-otp-success, no-MFA-regression); prod container `routers/auth.py` has 2 `mfa_required` hits; live smoke: register→enroll→verify→(no-otp=403, valid-otp=200, invalid-otp=403) ALL PASS | LIVE |
| (7) | security.txt (new) | `curl -sI` + `curl -s` + `grep -c ^Contact:` + `grep -c ^Expires:` | `HTTP/2 200 content-type: text/plain content-length: 328`; body = 2 Contact lines (`mailto:security@artha.build`, `https://artha.build/security`), 1 Expires (`2027-04-20T00:00:00Z`), Canonical, Policy, Preferred-Languages | LIVE |

**Retest log:** `/tmp/294-retest-1776720858.log` (full stdout captured during execution).

**Live MFA smoke test commands (all 3 scenarios, run against production):**
```
Test A (no otp):     POST /api/auth/login {username,password} →
                     HTTP:403 {"detail":{"mfa_required":true,"message":"MFA code required"}}
Test B (valid otp):  POST /api/auth/login {username,password,otp_code=pyotp.TOTP(secret).now()} →
                     HTTP:200 {"access_token":"eyJhbGci...","refresh_token":"..."}
Test C (bad otp):    POST /api/auth/login {username,password,otp_code="000000"} →
                     HTTP:403 {"detail":{"mfa_required":true,"message":"Invalid MFA code"}}
Cleanup: 2 rows removed (user + mfa_secret)
```

---

## Files Created/Modified

### arthaBuild repo

**Created:**
- `src/frontend/public/.well-known/security.txt` — RFC 9116 disclosure contact (9 lines, 328 bytes)

**Modified:**
- `src/backend/schemas.py` — `LoginRequest.otp_code: Optional[str] = None` added (+1 line)
- `src/backend/routers/auth.py` — `+from models import MFASecret`, `+import pyotp`, 18-line MFA gate block inserted between email-verify and JWT issuance
- `src/backend/tests/test_auth.py` — 3 new async tests under "FR-AUTH-03b: MFA enforcement at login (quick-294)" section (+108 lines)

### dindin (docs)

- `.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-PLAN.md` (already committed at plan time)
- `.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-SUMMARY.md` (this file)

---

## Decisions Made

- **Inline MFA check (not self-HTTP-call to `/mfa/check`)** — zero-latency, removes self-call loop risk. Query is the same 2-line `select(MFASecret)` that `_get_active_secret` uses.
- **Gate placement: AFTER email-verify, BEFORE JWT issuance** — prevents leaking "this email has MFA" to unverified-email callers; ensures no JWT is ever handed out without a valid OTP when one is required.
- **Do NOT import `_get_active_secret` from `routers.mfa`** — avoids router-to-router dep; inline query is ~3 lines.
- **Google OAuth flow untouched** — OAuth users bypass password path; MFA-for-OAuth is a separate future task (explicitly out of scope per launch pragmatism).
- **Frontend OTP input UI deferred** — zero production users currently have `MFASecret.is_active=True` (MFA enrollment UI was never integrated end-to-end), so backend gate alone suffices for launch. When any user enables MFA, the frontend will need to handle 403 + `mfa_required` response with an OTP prompt step.
- **Expires = 1 year** — RFC 9116 requires a future timestamp; 1 year is the recommended cadence. Set to `2027-04-20T00:00:00Z`.

---

## Deviations from Plan

### [Rule 3 - Blocking] EC2 host is not a git repository

**Found during:** Task 3B (backend deploy)
**Issue:** Plan assumed backend deploy pathway could be "git pull + docker build". Verified at deploy time: `/home/ubuntu/arthaBuild/` has no `.git` directory — files are managed via direct scp (same pattern as quick-293).
**Fix:** Used scp to push the 2 changed backend files (`routers/auth.py`, `schemas.py`) directly to EC2, then `docker compose build backend && docker compose up -d backend`. Dockerfile COPIES source into image at build time, so scp-before-build is correct.
**Verified:** `docker compose exec backend grep -c 'mfa_required' routers/auth.py` → `2` (post-rebuild).
**Commits affected:** None — this was a deploy-step detail, not a code change.

### [Rule 3 - Blocking] Free-tier 3-per-domain limit blocked @techcloudpro.com smoke

**Found during:** Task 3C live MFA smoke test
**Issue:** Plan suggested `@techcloudpro.com + timestamp` for fresh test user. Production enforces `3 accounts per domain` free-tier cap (correctly — Option A consent + free-tier gating shipped in quick-292). techcloudpro.com was already at cap.
**Fix:** Used a fresh ephemeral domain `vnet-demo-<timestamp>.com` which is a one-time throwaway and passed the company-email filter (Gmail/Yahoo/Outlook are blocked per free-email-domain rule; arbitrary domains are allowed).
**Impact:** No code changes. Smoke test succeeded — all 3 MFA scenarios verified. Test user cleaned up from DB after.

### [No deviation] Unit test fixture name

**Check during:** Task 1 Step 3
**Verified:** `db_session` fixture exists in `src/backend/tests/conftest.py:112` (direct session, same signature as plan expected). No substitution needed.

### [Scope addition] MFA secret cleanup in `test_login_mfa_required_with_valid_otp_succeeds` and `test_login_no_mfa_still_works_without_otp`

**Issue:** Tests run in order. The first MFA test leaves an active MFASecret row for Alice. Subsequent tests that share the `registered_user` fixture would hit the MFA gate unexpectedly.
**Fix:** Each MFA test that needs a specific MFA state explicitly clears existing MFASecret rows for the user before setting up its own state. Defensive — adds ~5 lines per test.
**Impact:** No functional scope change — tests are just isolated from each other's state.

---

## Issues Encountered

- **Local pytest env missing backend deps** (slowapi, passlib, fastapi-mail, etc.) — installed into global Python via `pip install` one-off. No requirements file change. Tests ran clean after.
- **No pre-existing arthaBuild venv** on developer machine — used anaconda Python 3.12 with missing deps filled in. For future work, consider pinning a `.venv/` at repo root.

---

## USER ACTION REQUIRED

### (A) Sentry DSN (carried over from quick-293, item (5))

**Status:** Still blocked — confirmed at Apr 20 21:34Z:
- `/home/ubuntu/arthaBuild/.env` has 0 `SENTRY_DSN=` lines
- Backend container `printenv SENTRY_DSN` returns `NOT_SET`

**To resolve:** See quick-293 SUMMARY.md section "Sentry DSN" for exact `echo >> .env` + `docker compose up -d backend` steps. Unchanged.

### (B) Cloudflare cache purge for legacy `/og-image.png`

**Status:** Optional (not a launch blocker — canonical `/og-image-v2.png` is working everywhere).

**If you want to also fix the legacy URL:**
1. Cloudflare Dashboard → `artha.build` zone → Caching → Configuration → Purge Cache → Custom Purge
2. Enter: `https://artha.build/og-image.png`
3. Click Purge

This is a dashboard-only step — Claude has no CF API token.

### (C) Cloudflare SSL = Full (Strict)

**Status:** User-managed (out of scope for both quick-293 and quick-294).

1. Cloudflare Dashboard → `artha.build` zone → SSL/TLS → Overview
2. Mode should be **"Full (Strict)"**. If it shows "Flexible" or "Full", change to "Full (Strict)".
3. If the change errors with "origin certificate invalid" — stop. Origin TLS cert issue must be resolved first.

---

## Next Phase Readiness

- Launch fully hardened on the two quick-294 fronts. Safe to proceed with marketing/landing page buildout.
- **Frontend OTP login prompt** is the only remaining UX follow-up. Backend returns 403 + `{mfa_required: true}` — frontend can keep shipping as-is because no production users have MFA active yet. When a user enables MFA via the existing `/api/auth/mfa/enroll` flow, the login page will need a second step. Low priority (post-launch).
- **quick-293 item (5) Sentry** still blocked on DSN — user action.

---

## Self-Check

- [x] arthaBuild commit `6ae5307` exists + pushed (verified via `git log -1 --stat` showing 4 files)
- [x] security.txt LIVE at https://artha.build/.well-known/security.txt (HTTP 200, text/plain, 328 bytes, 2 Contact, 1 Expires)
- [x] Backend container contains MFA gate (`docker compose exec backend grep -c mfa_required routers/auth.py` returns `2`)
- [x] 3 new MFA unit tests pass + 24 existing test_auth.py tests pass (27 total, 1 pre-existing skip)
- [x] Live MFA smoke verified all 3 scenarios on production (no otp → 403, valid otp → 200, bad otp → 403)
- [x] Retest evidence table contains 7 rows with real command output — no memory-based passes
- [x] arthaBuild commit has ONLY the 4 intended files (pre-existing unrelated mods unstaged)
- [x] No `--no-verify` used on any commit
- [ ] Sentry DSN on EC2 — **USER ACTION (A)** — carried over from quick-293
- [ ] CF cache purge for legacy `/og-image.png` — **USER ACTION (B)** — optional
- [ ] CF SSL = Full (Strict) — **USER ACTION (C)** — out of scope

**Status:** Both quick-294 items (6)+(7) LIVE. quick-293 items (1)-(4) re-verified LIVE. Item (5) Sentry remains blocked pending user DSN. Launch-hardening is done from Claude's side.
