---
phase: 10-admin-panel-enterprise-team-management-ui
plan: "02"
subsystem: backend-auth, frontend-pages
tags: [invite, accept-invite, user-registration, team-management, rbac]
dependency_graph:
  requires: [09-01, 09-02, 09-03]
  provides: [invite-acceptance-endpoint, accept-invite-page, public-route]
  affects: [routers/user.py, routes.tsx, AcceptInvite.tsx]
tech_stack:
  added: []
  patterns: [sha256-token-hash, same-login-response-shape, public-route-no-guard]
key_files:
  created:
    - src/frontend/src/pages/AcceptInvite.tsx
  modified:
    - src/backend/routers/user.py
    - src/frontend/src/routes.tsx
    - docs/ARCHITECTURE.md
    - docs/architecture-diagram.html
    - docs/test-report.html
decisions:
  - "AB-1002-01: create_access_token(user.id, role=user.role) — takes direct args, not a dict (actual auth_utils.py signature)"
  - "AB-1002-02: setAccessToken() for token storage (memory-only per CLAUDE.md), not storeTokens (no such export in api.ts)"
  - "AB-1002-03: storage.set('auth_user', {...}) for user profile matching authService.ts login() pattern"
  - "AB-1002-04: role field added to accept-invite response to match actual login response shape (auth.py returns role)"
metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_created: 1
  files_modified: 6
  completed_date: 2026-04-10
---

# Phase 10 Plan 02: Invite Acceptance Flow Summary

**One-liner:** Backend POST /api/user/accept-invite + AcceptInvite.tsx page + /accept-invite public route completing the team invite round-trip started in Phase 9.

## What Was Built

Phase 9 built the invite *sending* side (TeamInvite model + send_invite_email). This plan completes the acceptance side — the invited user clicks the email link, fills in their name and password, and joins the team with role="user" assigned to the inviting admin's team.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add POST /api/user/accept-invite to routers/user.py | e72b6785 | `src/backend/routers/user.py` |
| 2 | AcceptInvite.tsx page + /accept-invite public route | acb6dbbb | `src/frontend/src/pages/AcceptInvite.tsx`, `src/frontend/src/routes.tsx` |

## Verification Results

```
# Backend route registration
/api/user/register
/api/user/accept-invite  ✓

# Invite.accepted written on success
grep "accepted = True" routers/user.py  ✓

# Frontend route
grep "accept-invite" routes.tsx  ✓ (line 66, no Protected wrapper)

# Build
npm run build  →  ✓ built in 4.05s (zero TypeScript errors)

# Test suite
pytest  →  85/85 passed, 5 skipped (no regressions)
```

## Key Architecture Decisions

**AB-1002-01: create_access_token signature**
The plan code showed `create_access_token({"sub": str(user.id), ...})` (dict form), but the actual `auth_utils.py` exports `create_access_token(user_id: int, role: str = "user")`. Used the correct signature: `create_access_token(user.id, role=user.role)`.

**AB-1002-02: Token storage function**
The plan referenced `storeTokens` but `api.ts` exports `setAccessToken`. CLAUDE.md requires tokens in memory only, never localStorage. Used `setAccessToken(access_token)` — identical security model to `authService.ts login()`.

**AB-1002-03: User profile storage**
After setting the access token in memory, stored non-sensitive user profile (`first_name`, `last_name`, `role`, `email`) via `storage.set("auth_user", {...})` matching `authService.ts login()` exactly — this populates the `useAuth()` hook state.

**AB-1002-04: role field in response**
The plan response shape omitted `role`, but auth.py's `TokenResponse` returns it and `authService.ts` reads it. Added `role: user.role` to the accept-invite response for full interface parity.

## Endpoint Specification

**POST `/api/user/accept-invite`** (unauthenticated)

```
Request:  {token, first_name, last_name, password}
200 OK:   {access_token, refresh_token, token_type:"bearer", first_name, last_name, email, role:"user"}
400:      Missing fields / weak password / invite already accepted / invite expired
404:      Token not found (invalid or never-issued token)
409:      Email already registered
```

Security guarantees:
- Invited user is ALWAYS `role="user"` — cannot become admin via invite
- `team_id` always from invite record (cannot be overridden)
- Raw token never stored — SHA-256 hash lookup in `team_invites.token_hash`
- `invite.accepted = True` committed atomically with user creation

## Frontend Flow

`/accept-invite?token=xxx` → `AcceptInvite.tsx`

1. `useSearchParams()` reads `token` from query string
2. If no token → "Invalid Invite Link" error state (no form rendered)
3. Form: `first_name`, `last_name`, `password` (side-by-side name fields)
4. Submit → `POST /api/user/accept-invite`
5. Success → `setAccessToken(access_token)` + `storage.set("auth_user")` + `navigate("/chat/new")`
6. Error → inline error message

Route guard: `/accept-invite` added at top level in routes.tsx, outside `<Protected>` and `<AdminProtected>` — invited users are unauthenticated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] create_access_token called with wrong signature**
- **Found during:** Task 1 implementation
- **Issue:** Plan showed dict-style call `create_access_token({"sub": str(user.id), "role": role})` but actual auth_utils.py signature is `create_access_token(user_id: int, role: str = "user")`
- **Fix:** Used `create_access_token(user.id, role=user.role)` matching how auth.py calls it
- **Files modified:** `src/backend/routers/user.py`
- **Commit:** e72b6785

**2. [Rule 1 - Bug] storeTokens does not exist in api.ts**
- **Found during:** Task 2 implementation
- **Issue:** Plan imported `storeTokens from "../services/api"` but api.ts exports `setAccessToken`, not `storeTokens`
- **Fix:** Used `setAccessToken` (identical memory-only semantics) + added `storage.set("auth_user")` to populate useAuth hook
- **Files modified:** `src/frontend/src/pages/AcceptInvite.tsx`
- **Commit:** acb6dbbb

## Documentation Updates (per CLAUDE.md Architecture Rule)

| File | Change |
|------|--------|
| `docs/ARCHITECTURE.md` | Bumped v1.8→v1.9, added Phase 10 Plan 02 section (endpoint spec, AcceptInvite page flow, new route), updated route map table |
| `docs/architecture-diagram.html` | Bumped v1.8→v1.9, Phase 10 data flow diagram, changelog entry, phase roadmap updated to "In Progress" |
| `docs/test-report.html` | Added 6 Phase 10 Plan 02 acceptance checks (TC-INV-01..TC-INV-06), updated total to 105 checks, phase counter to 10 |

## Self-Check

```bash
[ -f "src/backend/routers/user.py" ] → FOUND
[ -f "src/frontend/src/pages/AcceptInvite.tsx" ] → FOUND
git log --oneline | grep "e72b6785" → FOUND: feat(10-02): add POST /api/user/accept-invite endpoint
git log --oneline | grep "acb6dbbb" → FOUND: feat(10-02): AcceptInvite.tsx page + /accept-invite public route
```

## Self-Check: PASSED
