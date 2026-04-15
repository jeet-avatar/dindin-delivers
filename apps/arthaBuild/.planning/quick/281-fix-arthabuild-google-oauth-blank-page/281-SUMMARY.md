---
phase: quick-281
plan: "01"
subsystem: auth
tags: [oauth, google-login, is_verified, frontend-fix]
key-files:
  modified:
    - apps/arthaBuild/src/backend/routers/auth.py
    - apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx
decisions:
  - "Add is_verified=True guard for existing OAuth users before token creation, not inside new-user block"
  - "Remove useAuth entirely from OAuthCallback — token+user are stored via setAccessToken+storage.set, no login() call needed"
metrics:
  duration: "< 5 minutes"
  completed: "2026-04-14T22:53:31Z"
  tasks_completed: 2
  files_changed: 2
---

# Quick 281: Fix ArthaBuild Google OAuth Blank Page — Summary

**One-liner:** Fixed two bugs causing a blank page after Google OAuth: backend now marks existing users `is_verified=True` on every login, and frontend no longer calls the email/password `login()` function from `OAuthCallback`.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Backend: mark existing OAuth users as verified/active | 78b19d37 |
| 2 | Frontend: remove incorrect `login()` call from OAuthCallback | 78b19d37 |

## Changes Made

### Task 1 — `apps/arthaBuild/src/backend/routers/auth.py`

In `google_callback`, added a guard block immediately after the `if not user:` new-user branch (and before the existing `await db.commit()` / `create_access_token`):

```python
# Ensure OAuth users are always verified and active (Google verified the email)
if not user.is_verified:
    user.is_verified = True
if not user.is_active:
    user.is_active = True
```

This covers existing users who registered via email/password and later try to log in with Google — they would have `is_verified=False` until email confirmation, but Google has already confirmed the email, so the flag should be set. The existing `await db.commit()` (for the audit event) persists both flags in the same transaction.

### Task 2 — `apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx`

Removed the `useAuth` import and the `login(user)` call from the `useEffect`. The `login()` function is the email/password flow — it POSTs to `/api/auth/login` with a user object (not credentials), which fails silently. The correct flow (`setAccessToken`, `storage.set("auth_user", ...)`, `navigate("/chat/new")`) was already present and is now the only path.

## Verification

```
grep -n "is_verified = True" apps/arthaBuild/src/backend/routers/auth.py
# Line 361: is_verified=True  (new-user block — unchanged)
# Line 370: user.is_verified = True  (existing-user guard — new)

grep -n "login" apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx
# Line 29: // Store token in memory (same pattern as email/password login)  — comment only

grep -n "setAccessToken|storage.set|nav(" apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx
# Line 30: setAccessToken(token)
# Line 39: storage.set("auth_user", user)
# Lines 20, 25, 41: nav(...)  — all three present
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `apps/arthaBuild/src/backend/routers/auth.py` — `is_verified = True` at lines 361 and 370
- [x] `apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx` — no `login` import or call
- [x] Commit `78b19d37` exists with both files changed
