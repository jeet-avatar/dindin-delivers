---
task: 297
slug: fix-login-to-reject-soft-deleted-users-a
date: 2026-04-22
mode: quick
repo_split:
  code: /Users/jeet/arthaBuild/
  plan_docs: /Users/jeet/doordash-p2p/.planning/quick/297-fix-login-to-reject-soft-deleted-users-a/
must_haves:
  truths:
    - "POST /api/auth/login at auth.py:52-145 does NOT check user.is_active. Soft-deleted users can re-authenticate (verified live in LAUNCH_READINESS_REPORT_v3 §C.5 D8f)"
    - "require_user at auth_utils.py:174 DOES check is_active — so issued token is mostly useless, but login still leaks existence + breaks soft-delete intent"
    - "Fix is 5 lines after line 98 (after password verified): raise the same generic_error that wrong password raises, so attacker can't enumerate inactive vs wrong-password"
  artifacts:
    - "/Users/jeet/arthaBuild/src/backend/routers/auth.py — add is_active check after password verify"
  key_links:
    - "auth.py:85 (password verify)"
    - "auth.py:98 (raise generic_error)"
    - "auth_utils.py:174 (reference check to mirror)"
    - "LAUNCH_READINESS_REPORT_v3_zero_hallucination.md §D for full incident evidence"
---

# Plan 297 — Login rejects soft-deleted users

## Goal

Make POST /api/auth/login return `401 Invalid email or password` for users with `is_active=0`, same shape as wrong-password — no enumeration.

## Task 1 — Patch auth.py

**File:** `/Users/jeet/arthaBuild/src/backend/routers/auth.py`

**Action:** after line 98 (end of wrong-password branch) and before line 100 (successful login), add:

```python
    # Reject soft-deleted users (quick-297). Return same generic error as wrong-password
    # to prevent enumeration of inactive accounts.
    if not user.is_active:
        await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                                action="auth.login_failed", result="failure", ip_address=ip,
                                target="inactive_account")
        await db.commit()
        raise generic_error
```

**Verify:**
- `grep -n "is_active" /Users/jeet/arthaBuild/src/backend/routers/auth.py` — expect a new match near login() body
- Python syntax check: `python3 -m py_compile /Users/jeet/arthaBuild/src/backend/routers/auth.py`

**Done:**
- Commit in arthaBuild with message `fix(security)(quick-297): reject soft-deleted users at login`

## Task 2 — Deploy + E2E

**Actions:**
1. Push arthaBuild to origin/main
2. scp auth.py → EC2 `/home/ubuntu/arthaBuild/src/backend/routers/auth.py`
3. `docker compose up -d --build backend` on EC2
4. Wait for health (curl /health until 200, max 30s)

**E2E:**
1. Login as admin → 200 (active user — no regression)
2. Create throwaway, verify, login → 200 OK
3. DELETE that throwaway with `{"confirm":"DELETE"}` → 200
4. **Re-login as deleted throwaway → must now return 401 `Invalid email or password`** (was 200 before)
5. Verify admin still logins + /api/user/me still 200

**Done:**
- All 5 E2E steps pass with expected HTTP codes captured

## Task 3 — Full launch readiness re-run (9 suites) + v4 report

**Actions:**
- Rerun same zero-assumption battery from v3
- Add explicit §D2 test for quick-297 (soft-deleted user cannot login)
- Write `LAUNCH_READINESS_REPORT_v4.md`
- Verdict = unconditional GO if and only if §D2 shows 401 for inactive user

**Done:** v4 report committed in dindin, STATE.md updated with quick-297 row

## Rollback

- Revert auth.py, `docker compose up -d --build backend`
- Prior container image id `sha256:21fd1fe466104e202914e5d5c2e0f8971d096ac52949258321f1f3c03e3dcdde`

## Risk

- **Admin self-lockout:** if `is_active` is accidentally set to 0 on admin row, admin can't login. Mitigation: we just verified via direct SQLite that admin is `is_active=1` in v3 report §C. DB-level restore path documented (`docker exec arthaBuild-backend python3 sqlite3 update users set is_active=1`).
- **False-positive lockout for legit users:** none — only users with `erased_at` or explicit `is_active=0` are affected, and they SHOULD be locked out.
