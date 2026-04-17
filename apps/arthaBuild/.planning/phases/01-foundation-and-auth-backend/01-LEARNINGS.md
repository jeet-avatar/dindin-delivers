# Phase 1 — Learnings, Methodology & Test Record

> This document captures what we built, how we tested it, what broke, why it broke,
> and the methodology rules that came out of it. Read this before executing any future phase.

---

## What Phase 1 Built (verified file:line)

| File | Purpose | Key Facts |
|------|---------|-----------|
| `routers/auth.py` | Auth endpoints | check-user, login, forgot-password, reset-password, refresh |
| `routers/user.py` | Registration | Wired with `BackgroundTasks` + `send_verification_email` |
| `auth_utils.py` | JWT + bcrypt + lockout + rate limit | PyJWT only, HS256, bcrypt cost=12, `is_locked()` timezone-aware, SlowAPI shared instance |
| `schemas.py` | Pydantic models | `CheckUserResponse(success:bool)`, `TokenResponse` (flat, no nested user) |
| `models.py` | SQLAlchemy ORM | `User`, `PasswordResetToken` with FK+CASCADE |
| `email_utils.py` | SMTP | `send_reset_email`, `send_verification_email` (SUPPRESS_SEND when no SMTP_HOST) |
| `rawapi.py` | FastAPI app | Startup guard (`JWT_SECRET_KEY`), health endpoint, auth+user routers mounted |
| `database.py` | Async SQLAlchemy | `expire_on_commit=False` on sessionmaker |

---

## Test Suite (41 tests, all passing — commit `b799d33a`)

| File | Tests | TC IDs Covered |
|------|-------|---------------|
| `tests/test_user.py` | 7 | TC-AUTH-01 to TC-AUTH-05 (+ 03b, 03c) |
| `tests/test_auth.py` | 23 | TC-AUTH-06 to TC-AUTH-23 |
| `tests/test_health.py` | 4 | TC-DEPLOY-03, TC-DEPLOY-03b, TC-AB-001, TC-DEPLOY-06 |
| `tests/test_security.py` | 7 | NFR-SEC-01 to NFR-SEC-08 |

### TC-AUTH coverage (test_user.py + test_auth.py)

| TC | Scenario | Expected |
|----|---------|---------|
| TC-AUTH-01 | Register new user | 201 |
| TC-AUTH-02 | Register duplicate email | 409 |
| TC-AUTH-03 | Register weak password | 400 |
| TC-AUTH-03b | Register missing fields | 422 |
| TC-AUTH-03c | Register very long email | 422 |
| TC-AUTH-04 | Register triggers verification email | BackgroundTasks called |
| TC-AUTH-05 | Login with registered user | 200 + tokens |
| TC-AUTH-06 | check-user known email | `{success:true, message:...}` |
| TC-AUTH-07 | check-user unknown email | `{success:false, message:...}` |
| TC-AUTH-08 | Login valid credentials | `{access_token, refresh_token, token_type, first_name, last_name, email, user_type}` |
| TC-AUTH-09 | Login wrong password | 401 |
| TC-AUTH-10 | Login after 5 wrong → locked | 429 |
| TC-AUTH-11 | Login non-existent user | 401 |
| TC-AUTH-12 | Refresh valid token | 200 + new access_token |
| TC-AUTH-13 | Refresh tampered token | 401 |
| TC-AUTH-14 | Refresh wrong type (access not refresh) | 401 |
| TC-AUTH-15 | forgot-password known email | 200 (no enumeration) |
| TC-AUTH-16 | forgot-password unknown email | 200 (no enumeration) |
| TC-AUTH-17 | reset-password valid token | 200 |
| TC-AUTH-18 | reset-password already used | 400 |
| TC-AUTH-19 | reset-password expired | 400 |
| TC-AUTH-20 | reset-password invalid token | 400 |
| TC-AUTH-21 | Login with new password after reset | 200 |
| TC-AUTH-22 | Old password rejected after reset | 401 |
| TC-AUTH-23 | forgot-password invalidates prior tokens | prior token returns 400 |

### TC-DEPLOY + AB coverage (test_health.py)

| TC | Scenario | Expected |
|----|---------|---------|
| TC-DEPLOY-03 | GET /health → status ok | 200 `{status:"ok", service:"arthaBuild-api"}` |
| TC-DEPLOY-03b | GET /health → service name | `service` field present |
| TC-AB-001 | POST /api/chatbot/process without AI ready | 503 (not crash) |
| TC-DEPLOY-06 | startup_validation() with missing JWT_SECRET_KEY | RuntimeError raised |

### NFR-SEC coverage (test_security.py)

| TC | Scenario | Expected |
|----|---------|---------|
| NFR-SEC-01 | check-user response shape | only `success` + `message` fields (no user_id, no email) |
| NFR-SEC-02 | forgot-password no enumeration | same 200 for known and unknown |
| NFR-SEC-03 | JWT HS256 algorithm | decoded token uses HS256 |
| NFR-SEC-04 | bcrypt hash cost | cost factor ≥ 12 |
| NFR-SEC-05 | Locked account blocks login | locked user gets 429 |
| NFR-SEC-06 | Reset token one-time use | second use returns 400 |
| NFR-SEC-07 | No hardcoded API keys | grep returns 0 matches |
| NFR-SEC-08 | Reset token expiry enforced | expired token returns 400 |

---

## Smoke Tests (22/22 — Plan 01-05, pre-pytest)

These were manual curl tests run against a live server before the pytest suite was written:

| # | Test | Result |
|---|------|--------|
| 1 | GET /health → 200 | PASS |
| 2 | POST /api/user/register valid → 201 | PASS |
| 3 | POST /api/user/register duplicate → 409 | PASS |
| 4 | POST /api/user/register weak password → 400 | PASS |
| 5 | POST /api/auth/check-user known → success:true (no user_id leak) | PASS |
| 6 | POST /api/auth/check-user unknown → success:false | PASS |
| 7 | POST /api/auth/login valid → 200 with tokens | PASS |
| 8 | POST /api/auth/login wrong password → 401 | PASS |
| 9 | POST /api/auth/forgot-password known → 200 | PASS |
| 10 | POST /api/auth/forgot-password unknown → 200 (no enumeration) | PASS |
| 11 | POST /api/auth/refresh valid → 200 new access_token | PASS |
| 12 | POST /api/auth/refresh tampered → 401 | PASS |
| 13 | POST /api/auth/refresh wrong type → 401 | PASS |
| 14 | POST /api/auth/reset-password valid token → 200 | PASS |
| 15 | POST /api/auth/reset-password already used → 400 | PASS |
| 16 | POST /api/auth/reset-password expired → 400 | PASS |
| 17 | POST /api/auth/reset-password invalid → 400 | PASS |
| 18 | Login with post-reset password → 200 | PASS |
| 19 | POST /api/chatbot/process → 503 (AB-001 guard) | PASS |
| 20 | Rate limit → 429 at req 10 | PASS |
| 21 | JWT_SECRET_KEY="" → RuntimeError at import | PASS |
| 22 | No hardcoded API keys → 0 matches | PASS |

---

## Bugs Found and Root Causes

These bugs were discovered during the 5-round verification process. Every one of these would have
shipped silently without the "passing tests ≠ done" discipline.

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `await expire_all()` | `expire_all()` is sync, not async — Python returned coroutine object silently, no error thrown | Remove `await` |
| Email lookup case mismatch | Route stores email as `.lower()`, fixture queried original case, SQLite equality is case-sensitive | Add `.lower()` to all fixture queries |
| Shared user state mutation | `test_reset_password_can_login_with_new_password` changed Alice's password; `auth_tokens` fixture then failed to log in with old password in later tests | Dedicated users per reset fixture — never share mutable users across tests |
| TC-AUTH-22 missing | Loop was written as "TC-AUTH-06 through TC-AUTH-23" in header but skipped 22 — not caught until manual cross-check against REQUIREMENTS.md | Always cross-check TC IDs against requirements doc, not just headers |
| `exists` vs `success` | REQUIREMENTS.md originally said `exists`, implementation used `success` — tests passed because they tested the implementation, not the spec | Update REQUIREMENTS.md to match implementation; the spec is what's implemented |
| TC-DEPLOY-06 not tested | The startup validation code existed (`rawapi.py:84`), never had a test — coverage gap | Add monkeypatch test calling `startup_validation()` directly |
| Register route no email | Route said "check your email" in its response but never called any email function | Add `send_verification_email` to `email_utils.py`, wire as `BackgroundTasks` |
| Frozen interface wrong in CLAUDE.md | CLAUDE.md said login response was `user:{id,name,...}` nested object, actual `TokenResponse` is flat | Update CLAUDE.md + all downstream plan docs that reference the interface |
| Phase 4 plan wrong contracts | Phase 04-01-PLAN.md had: `check-user` → `{exists:bool}`, login → `{username:email}`, reset → `new_password` field | Fix all 3 contracts in `04-01-PLAN.md` before Phase 4 executes |

### Security Fixes Found at Code Review (commit `880623f8`)

These were found during the human checkpoint in Plan 01-05, not by automated tests:

| Finding | Issue | Fix |
|---------|-------|-----|
| JWT_SECRET_KEY guard timing | Checked in `@app.on_event("startup")` — server accepts requests briefly before failing | Move to import-time `RuntimeError` — process never starts |
| check-user leaks user_id + email | Response included both fields — enables account enumeration | Trim to `{success:bool}` only |
| CORS wildcard | `allow_origins=["*"]` | Use `FRONTEND_BASE_URL` env var |
| Multiple reset tokens | User could have multiple active reset tokens simultaneously | Delete all existing `used=False` tokens before inserting new one |
| No FK on reset tokens | Orphaned tokens accumulate when user is deleted | Add `ForeignKey("users.id", ondelete="CASCADE")` + Alembic migration |
| Reset URL in INFO logs | `logger.info(f"Reset link: {reset_link}")` → token in prod logs | Downgrade to `logger.debug(...)` |

---

## The 5-Round Verification Story

This is the single most important methodology lesson from Phase 1.

**Round 1** — Tests ran but 8 were skipped/errored. Thought we were done. Wrong.
**Round 2** — 40/41 passed. TC-AUTH-22 was missing. Thought we were done. Wrong.
**Round 3** — 41/41 passed. Code-to-requirements trace found 3 issues:
  - `await expire_all()` coroutine bug
  - email case mismatch in fixtures
  - shared user state mutation
Thought we were done. Wrong.
**Round 4** — All 3 fixed. But: frozen interface in CLAUDE.md was wrong, Phase 4 plan had wrong contracts, nothing committed yet. Thought we were done. Wrong.
**Round 5** — All issues fixed, CLAUDE.md updated, Phase 4 plan corrected, everything committed. Actually done.

**The rule for every future phase:**
1. Run tests → they pass ≠ done
2. Read every route → trace every assertion → confirm response shapes match requirements
3. Cross-check every TC ID against the requirements doc (not just the test headers)
4. Read every planning doc that references the interface → update any stale contracts
5. Commit everything → only then claim done

---

## Methodology Guidelines Established in Phase 1

### Anti-Hallucination Discipline
- Never trust that passing tests = correct tests
- Always trace implementation → spec, not just implementation → test
- If REQUIREMENTS.md says `exists` but code returns `success` — update REQUIREMENTS.md (implementation wins, but document it)
- Cross-check TC IDs manually — loops/ranges in headers can silently skip IDs

### Fixture Design Rules (from bugs)
- **Never share mutable users between tests** — one user per fixture that changes state
- **Always lowercase email in fixtures** — routes store `.lower()`, queries must match
- **Never use `await` on sync SQLAlchemy methods** — `expire_on_commit=False` eliminates most needs for manual expiry anyway

### Test Coverage Rules
- Every security constraint needs its own test (see NFR-SEC-01 to NFR-SEC-08)
- Every error path needs a test — not just happy path
- Startup validation functions must be tested with monkeypatch (TC-DEPLOY-06)
- Interface shape tests: assert exact keys, not just status codes

### Interface Freeze Protocol
- After Phase N completes, freeze ALL response shapes that Phase N+1 depends on
- Write the frozen interface to CLAUDE.md immediately
- Grep ALL downstream plan files for the old interface and update them
- "Frozen" means: changing it requires updating CLAUDE.md + ALL consumers before proceeding

### Code Review Gate (human checkpoint)
- Automated tests catch logic bugs; human review catches security assumptions
- Every phase with auth or credential handling must have a human checkpoint
- The code review in Phase 1 found 6 critical security issues that all 41 tests missed

---

## Known Deferred Bugs (fix in Phase 4)

These are intentional — fixing them in Phase 2 or 3 would break the frozen interface before
Phase 4 is ready to consume it.

| Bug | Location | Symptom | Fix Phase |
|-----|---------|---------|-----------|
| `UserCheckResponse` wrong fields | `authService.ts` | Interface has `user_id` + `email` but backend returns `{success, message}` → `checkEmail()` always returns `false` in non-mock mode | Phase 4 |
| `setUser(res.user)` on flat response | `useAuth.ts` | `res.user` is `undefined` on flat login response → user state never sets in non-mock mode | Phase 4 |

---

## Frozen Interfaces (DO NOT CHANGE — consumers listed)

```
JWT sub          = str(user_id)   algorithm=HS256   library=PyJWT
Login request    = {username, password}    ← field is 'username', frontend sends email as username
Login response   = {access_token, refresh_token, token_type:"bearer",
                    first_name, last_name, email, user_type}  ← FLAT, no nested user object
check-user req   = {email}
check-user resp  = {success:bool, message:str}  ← field is 'success' NOT 'exists'
Reset request    = {token, password}  ← field is 'password' NOT 'new_password'
Backend port     = 8000
```

**Consumers of these interfaces:**
- Phase 2: `session_store.py` uses `str(user_id)` from JWT sub
- Phase 4: `authService.ts` reads flat login response fields directly
- Phase 5: nginx proxies to port 8000
