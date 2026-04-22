---
name: ArthaBuild Launch Readiness v3 — Zero-Hallucination Re-verification
date: 2026-04-22
verdict: CONDITIONAL GO — 1 NEW security finding (is_active login bypass) surfaced by zero-assumption testing
supersedes: LAUNCH_READINESS_REPORT_v2.md
tested_by: claude-opus-4-7
method: every claim = verification command + verbatim observed output
---

# Zero-Hallucination Re-verification

Every row below shows the **actual command** run and the **raw observed output**. No reuse of earlier results. No assumptions from memory. When I can't verify something directly, I say so.

---

## §A — Git + deploy parity (no-assumption proof that deployed code = source code)

| Claim | Command | Observed | Verdict |
|---|---|---|---|
| Local HEAD | `cd /Users/jeet/arthaBuild && git rev-parse HEAD` | `b8deeb85d8e65b2f4c616c2e6959922ca27c5fd3` | ✅ |
| origin/main HEAD | `git ls-remote origin main` | `b8deeb85...` (same) | ✅ matches local |
| Public bundle hash | `curl https://artha.build/ \| grep index-*.js` | `index-CIx_UWrG.js` | ✅ |
| Origin-served bundle (EC2 localhost) | `curl -k https://localhost/ -H "Host: artha.build"` | `assets/index-CIx_UWrG.js` | ✅ same as public |
| Bundle file on EC2 disk | `ls /home/ubuntu/arthaBuild/src/frontend/dist/assets/` | `index-CIx_UWrG.js` present | ✅ |
| Backend container started | `docker inspect arthaBuild-backend` | `started=2026-04-22T21:57:28.265595473Z` | ✅ after quick-296 deploy |
| Quick-296 code INSIDE running container | `docker exec arthaBuild-backend grep "DeleteAccountRequest" /app/routers/user.py` | `14:class DeleteAccountRequest(BaseModel):` | ✅ |
| Gate code line 251 in container | `docker exec arthaBuild-backend sed -n "251p" /app/routers/user.py` | `    if data.confirm != "DELETE":` | ✅ |

## §B — Code state at file:line (local + EC2 + running container all match)

| What | File | Line | Evidence |
|---|---|---|---|
| Quick-295: authService reads `err.detail.mfa_required === true` | `/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts` | 81 | ✅ grepped |
| Quick-295: Password.tsx branches on mfa_required | `/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx` | 25-26 | ✅ grepped |
| Quick-295: /mfa-challenge route registered | `/Users/jeet/arthaBuild/src/frontend/src/routes.tsx` | 63 | ✅ |
| Quick-296: DeleteAccountRequest model | `/Users/jeet/arthaBuild/src/backend/routers/user.py` | 14 | ✅ |
| Quick-296: confirm gate in endpoint | `/Users/jeet/arthaBuild/src/backend/routers/user.py` | 252 | ✅ |
| Quick-296: frontend sends confirm body | `/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts` | 232 | ✅ `body: JSON.stringify({ confirm: "DELETE" })` |

## §C — Live API battery (raw HTTP code + body from fresh calls)

### C.1 Infra

| Claim | Evidence |
|---|---|
| TLS cert valid | `subject=CN=artha.build`, `issuer=Let's Encrypt E7`, `notBefore=Apr 14 2026`, `notAfter=Jul 13 2026` |
| HSTS header | `strict-transport-security: max-age=31536000; includeSubDomains` |
| X-Frame-Options | `x-frame-options: SAMEORIGIN` |
| X-Content-Type-Options | `x-content-type-options: nosniff` |
| Referrer-Policy | `referrer-policy: strict-origin-when-cross-origin` |
| Edge | `server: cloudflare` |
| Backend health | `GET /health` → `HTTP 200` body `{"status":"ok"}` |
| Containers | backend (healthy), nginx (running), ollama (healthy) |

### C.2 Auth API

| Test | HTTP | Body |
|---|---|---|
| check-user existing | 200 | `{"success":true,"message":"User found"}` |
| check-user missing | 200 | `{"success":false,"message":"User not found"}` |
| login normal | 200 | keys: access_token, refresh_token, email, first_name, last_name, role=admin, token_type, user_type=Administrator |
| login wrong password | 401 | `{"detail":"Invalid email or password"}` |
| login nonexistent user | 401 | `{"detail":"Invalid email or password"}` (identical — no enum) |

### C.3 MFA E2E (the quick-295 payload)

| Test | HTTP | Body (verbatim) |
|---|---|---|
| MFA check pre-enroll | 200 | `{"mfa_required":false}` |
| Enroll | 200 | `{provisioning_uri, qr_data_url}` — TOTP secret extracted len=32 |
| Verify+activate with current TOTP | 200 | `{"message":"MFA activated successfully","mfa_enabled":true}` |
| **Login NO otp** | **403** | `{"detail":{"mfa_required":true,"message":"MFA code required"}}` |
| Login WRONG otp | 403 | `{"detail":{"mfa_required":true,"message":"Invalid MFA code"}}` |
| Login GOOD otp | 200 | access_token issued + role=admin |
| Disable MFA | 200 | `{"message":"MFA disabled","mfa_enabled":false}` |
| Post-disable normal login | 200 | access_token issued |

### C.4 DELETE-confirm gate (quick-296) — 6 attack paths

| Test | HTTP | Body (verbatim) |
|---|---|---|
| No body | 422 | `{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}` |
| `{"confirm":"wrong"}` | 400 | `{"detail":"Confirmation phrase required. Send {\"confirm\": \"DELETE\"} to proceed."}` |
| `{"confirm":""}` | 400 | same 400 message |
| `{"confirm":"delete"}` (lowercase) | 400 | same 400 message (case-sensitive confirmed) |
| `{"confirm":"DELETEX"}` (prefix attack) | 400 | same 400 message |
| `{"confirm":123}` (type coercion) | 422 | `{"detail":[{"type":"string_type","loc":["body","confirm"],"msg":"Input should be a valid string","input":123}]}` |
| **Admin state after 6 rejected** | 200 | `{"id":1,"first_name":"Artha","last_name":".Build","email":"artha.build@artha.build","role":"admin","is_verified":true}` — ✅ intact |

### C.5 DELETE happy-path (throwaway user, fresh flow — not reused from prior test)

| Step | Result |
|---|---|
| Register throwaway `artha.build+v2-1776899866@artha.build` | 201 registered |
| Mark is_verified=1 via DB | state: `(20, email, 1, 1)` |
| Login as throwaway | 200 + access_token (len=251) |
| DELETE with `{"confirm":"DELETE"}` | 200 `{"message":"Account deleted"}` |
| DB post-delete | `is_active=0` ✅ |
| Pre-delete token used on `/me` | 401 `{"detail":"Token has been revoked"}` — JTI blacklist works ✅ |

## §D — 🚨 NEW SECURITY FINDING (caught by zero-assumption testing)

**BUG: soft-deleted users can re-authenticate and receive a fresh token.**

Evidence (verbatim observation from §C.5 flow):

```
--- D8f: try to login as deleted user — must FAIL ---
{"access_token":"eyJhbGci...","refresh_token":"...","role":"user",...}
HTTP=200
```

**Root cause** — `/Users/jeet/arthaBuild/src/backend/routers/auth.py:52-145` (POST /api/auth/login) does **not** check `user.is_active` at any point. It only checks:
- `user.is_verified` (line 109)
- `is_locked(user)` (line 77)
- password (line 85)
- MFA (line 124)

Contrast: `auth_utils.py:174` (`require_user` used by every protected endpoint) DOES check `is_active`. So the deleted user's token works at login but fails at `/api/user/me`. The token is issued — just not useful. But this is still wrong because:
1. Leaks existence of soft-deleted accounts (attacker can distinguish soft-deleted from password-wrong)
2. Bypasses the intent of soft-delete
3. Generates audit noise
4. Refresh token is issued, can be used until expiry

**Severity:** MEDIUM (not LOW because it breaks soft-delete semantics; not HIGH because the token can't reach most protected endpoints).

**Fix:** add after line 98 in `auth.py`:
```python
if not user.is_active:
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="auth.login_failed", result="failure", ip_address=ip,
                            target="inactive_account")
    await db.commit()
    raise generic_error
```

## §E — Registration + password policy

| Test | HTTP | Body |
|---|---|---|
| Free gmail.com email | 400 | `{"detail":"Please use your company email address. Free email providers are not accepted."}` |
| Weak password (<8 chars) | 400 | `{"detail":"Password must be at least 8 characters"}` |
| No uppercase | 400 | `{"detail":"Password must contain at least one uppercase letter"}` |
| No digit | 400 | `{"detail":"Password must contain at least one number"}` |
| forgot-password real user | 200 | `{"message":"If that email is registered, you will receive a reset link shortly."}` |
| forgot-password fake user | 200 | same message — ✅ no enumeration |
| reset-password bad token | 400 | `{"detail":"Invalid or expired reset link"}` |

## §F — Chat + anti-hallucination (verified via define-array grep, not prose)

| Test | HTTP | Verdict |
|---|---|---|
| Normal N/record question | 200 | 549 chars, mentions N/record ✅ |
| **Fake N/autosend trap** | 200 | First 400 chars contain: *"N/autosend is not a real SuiteScript 2.x module. I'm substituting `N/email`…"* Then code block define array = `'N/record', 'N/search', 'N/email'` — **N/autosend NOT in define array** ✅ |
| License status | 200 | `{"valid":true,"plan":"dev","mode":"dev","reason":"no LICENSE_KEY set","sales_email":"sales@artha.build","scripts_used":null,"scripts_limit":null}` |

## §G — Admin + Swagger lockdown

| Test | HTTP | Body |
|---|---|---|
| /api/admin/users no auth | 401 | `{"detail":"Not authenticated"}` |
| /docs | 404 | (Swagger disabled in prod) ✅ |
| /redoc | 404 | ✅ |
| /openapi.json | 404 | ✅ |

## §H — Frontend + bundle integrity (at origin, bypassing CF)

| Check | Result |
|---|---|
| 15 SPA routes (/, /log-in, /mfa-challenge, /create-account, /forgot-password, /privacy, /terms, /security, /blog, /solutions, /unsubscribe, /verify-email, /signup-success, /reset-success, /reset-failed) | **15/15 → 200** ✅ |
| 6 SEO files (/robots.txt, /llms.txt, /sitemap.xml, /.well-known/security.txt, /og-image-v2.png, /favicon.ico) | **6/6 → 200** ✅ |
| Sitemap URL count | 95 (matches build artifact) ✅ |
| Bundle: `index-CIx_UWrG.js` size | 4,188,538 bytes |
| Bundle `mfa_required` count | 4 ✅ |
| Bundle `mfa-challenge` count | 2 ✅ |
| Bundle `confirm:DELETE` count | **1** (one site: authService.deleteAccount) — **corrected from v2 report which claimed "5" using a looser regex** |

## §I — Sentry + rate limiter

| Check | Result |
|---|---|
| `SENTRY_DSN` in running backend process env (`/proc/$pid/environ`) | present (count=1) ✅ |
| Sentry actually delivering events? | **NOT verified in this session** — memory `arthaBuild-launch-foolproof-quick293.md` says "2 test events verified" on Apr 21, but I did not trigger and confirm a new event in Sentry UI |
| Rate limiter — 30 burst logins at origin | `200=0 401=10 429=20 other=0` ✅ 20/30 hit 429 |

---

## §J — Findings summary (zero-assumption report)

| # | Finding | Severity | State |
|---|---------|----------|-------|
| 1 | MFA frontend gap (Password.tsx ignores 403 mfa_required) | HIGH | ✅ CLOSED in quick-295 (deployed + E2E verified this session) |
| 2 | DELETE /api/user/me confirm bypass | HIGH | ✅ CLOSED in quick-296 (deployed + 6-attack E2E verified this session) |
| 3 | **soft-deleted users can re-login and get fresh token** | **MEDIUM** | **🆕 OPEN — discovered by zero-assumption testing this session** |
| 4 | `[object Object]` stringify bug on MFA response | LOW | ✅ CLOSED in quick-295 (authService.ts:88 now typeof-checks detail) |
| 5 | Bundle `confirm:DELETE` count claim | LOW (report accuracy) | ✅ corrected here: actual count is 1, not 5 (v2 used looser regex) |
| 6 | Sentry event delivery (not just DSN present) | LOW (observability) | ❓ NOT verified this session; relying on Apr 21 memory claim |

## §K — Verdict

**CONDITIONAL GO.** 9 of 9 test suites pass functionally. Every quick-295 + quick-296 fix is **demonstrably live** at file:line AND verified against raw API output AND parity-checked between local / origin / running container.

**Blocker for unconditional GO:** Finding #3 (`is_active` login bypass). Recommend fixing as quick-297 before marketing push. ~5-minute fix, same deploy pattern as quick-296.

**Unverified claims I refuse to repeat without direct proof:**
- That Sentry is actually *delivering* events (DSN present ≠ working transport). Recommend: send a test event from admin UI or `/api/admin/trigger-sentry-test` endpoint if one exists.

Signed: claude-opus-4-7 · 2026-04-22 23:25 UTC
Method: anti-hallucination skill active — every claim backed by grep / curl / ssh command executed in the current session
