---
id: CASE-005
title: "TokenResponse.user_type hardcoded to 'Administrator' for all users"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: HARDCODED
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/schemas.py
    lines: "28-37"
  - path: src/backend/routers/auth.py
    lines: "75-82"
---

## Why This Case Was Created
Triggered by the HARDCODED audit dimension. The `TokenResponse` Pydantic model has a `user_type` field with a hardcoded default of `"Administrator"`. Since the `login` route does not override this default, every user who logs in receives `user_type: "Administrator"` in their token response — regardless of their actual role. This is a data correctness bug that also has a misleading security implication.

## What Is Wrong
`src/backend/schemas.py` line 35:
```python
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    first_name: str
    last_name: str
    email: str
    user_type: str = "Administrator"   # ← hardcoded default, never overridden
    role: str = "user"
```

`src/backend/routers/auth.py` lines 75–82:
```python
return TokenResponse(
    access_token=create_access_token(user.id, role=user.role),
    refresh_token=create_refresh_token(user.id),
    first_name=user.first_name or "",
    last_name=user.last_name or "",
    email=user.email,
    role=user.role,         # role is correctly set from DB
    # user_type is NOT set — falls back to "Administrator" default
)
```

The login route correctly sets `role=user.role` (from the DB column), but never sets `user_type`. Since `user_type` defaults to `"Administrator"`, every login response tells the frontend that the user is an Administrator — including regular users whose `role` in the DB is `"user"`.

The `role` field (added in Phase 9) duplicates the purpose of `user_type` and is correctly set. The `user_type` field appears to be a pre-Phase-9 way to communicate the same information, now made redundant — but it still ships a misleading value.

## Why It Was Done This Way (Root Cause)
`user_type = "Administrator"` was set as a hardcoded default during Phase 1, when the application was single-user (one administrator). The product assumption at that time was that all users of ArthaBuild are administrators of their own NetSuite instance. When Phase 9 added RBAC with a proper `role` field (`"admin"` / `"user"`), `user_type` was not updated to match — the new `role` field was added alongside the old `user_type` field without reconciling them.

## What Is Done Right
The `role` field (line 36) is correctly populated from `user.role` in the login route (line 81). JWT tokens also encode the correct role via `create_access_token(user.id, role=user.role)`. The actual authorization logic in `auth_utils.py` uses the JWT `role` claim, not `user_type`. So authorization is functionally correct despite the misleading response field.

## How To Fix It
**Option A (minimal fix):** Set `user_type` from `user.role` in the login response:

In `src/backend/routers/auth.py` lines 75–82, add `user_type=user.role`:
```python
return TokenResponse(
    access_token=create_access_token(user.id, role=user.role),
    refresh_token=create_refresh_token(user.id),
    first_name=user.first_name or "",
    last_name=user.last_name or "",
    email=user.email,
    role=user.role,
    user_type=user.role,    # ← fix: derive from actual role, not hardcoded default
)
```

Also change the default in `schemas.py` from `"Administrator"` to an empty string to prevent silent hardcoding:
```python
user_type: str = ""   # populated from user.role at login
```

**Option B (preferred — remove duplicate):** Remove `user_type` from `TokenResponse` entirely, since `role` serves the same purpose and is correctly set. This requires verifying that no frontend code reads `user_type` from the login response:
```bash
grep -rn "user_type" src/frontend/src/
```
If no frontend code references `user_type`, remove the field from `TokenResponse` and update the frozen interface table in CLAUDE.md.

## Architecture Mapping

**Layer:** Backend Router → Response Schema

**Flow:**

    POST /api/auth/login
      → routers/auth.py:38 login()
        → TokenResponse(role=user.role, user_type="Administrator" [hardcoded default])
                                                         ↑
                                              THIS CASE LIVES HERE
          → Frontend reads {user_type: "Administrator"} even for non-admin users

**Upstream:** Frontend `authService.ts` reads the login response fields

**Downstream:** Any frontend feature that checks `user_type` to gate admin UI will incorrectly grant admin views to all users

## Verification
- [ ] Grep proof: `grep -n "user_type\|Administrator" src/backend/schemas.py` → shows line 35 with hardcoded default
- [ ] Grep proof: `grep -n "user_type" src/backend/routers/auth.py` → shows `user_type` is NOT passed in `TokenResponse(...)` call
- [ ] Runtime proof: `curl -X POST http://localhost:8000/api/auth/login -d '{"username":"...", "password":"..."}' | jq .user_type` → returns `"Administrator"` for a regular user

## Downstream Impact
**Impact if unfixed:** Degraded UX + potential Security Risk

Any frontend code that gates admin features on `user_type === "Administrator"` will incorrectly show admin UI to all users. The `role` field is the correct source of truth and is properly set, so any code using `role` is unaffected. The risk is that a frontend developer reads `user_type` instead of `role` and inadvertently grants all users admin access.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-012 (role field added in Phase 9, not in frozen interface spec)
