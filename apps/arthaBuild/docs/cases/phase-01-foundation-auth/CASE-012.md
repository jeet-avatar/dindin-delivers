---
id: CASE-012
title: "role field added to TokenResponse but not in frozen interface spec"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: PHASE_CORRECTNESS
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/schemas.py
    lines: "36"
  - path: CLAUDE.md
    lines: "frozen interface table"
---

## Why This Case Was Created
Triggered by the PHASE_CORRECTNESS audit dimension. CLAUDE.md defines a frozen interface for the login response that must not be changed without updating all consumers. The `role` field was added to `TokenResponse` during Phase 9 (RBAC work) but the CLAUDE.md frozen interface table was not updated to include it. This creates a mismatch between the spec and the implementation, which is exactly the kind of drift the frozen interface rule was designed to prevent.

## What Is Wrong
The CLAUDE.md frozen interface table (section "FROZEN INTERFACES") specifies the login response shape as:

```
Login response: {access_token, refresh_token, token_type:"bearer", first_name, last_name, email, user_type}
(flat — no nested user object)
Consumers: Phase 4 frontend (authService.ts reads flat fields directly)
```

The actual `TokenResponse` schema in `src/backend/schemas.py` lines 28–37 is:
```python
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    first_name: str
    last_name: str
    email: str
    user_type: str = "Administrator"
    role: str = "user"          # ← added in Phase 9, NOT in frozen interface spec
```

The `role` field is correctly set from `user.role` in the login route (`routers/auth.py:81`). But because it is not in the frozen interface spec, a frontend developer using CLAUDE.md as the reference document would not know that `role` exists in the response. Conversely, a backend developer reading the spec would not know they must preserve `role` when modifying `TokenResponse`.

The frozen interface rule in CLAUDE.md states: "DO NOT CHANGE WITHOUT UPDATING ALL CONSUMERS." Adding `role` without updating the spec means the spec no longer accurately documents what the interface looks like.

## Why It Was Done This Way (Root Cause)
Phase 9 added RBAC support, which required the frontend to know the logged-in user's role in order to show or hide admin UI. The `role` field was added to `TokenResponse` and correctly wired up in the login route. The frozen interface table in CLAUDE.md was not updated as part of the same commit — the architectural documentation was not kept in sync with the implementation.

## What Is Done Right
The `role` field itself is correctly implemented: it is set from `user.role` (the actual DB value, not hardcoded), it is sent alongside `user_type`, and it duplicates no other field incorrectly. The frontend can reliably read `role` to make authorization decisions.

## How To Fix It
Update the CLAUDE.md frozen interface table to include `role`:

**In CLAUDE.md, find the frozen interface entry:**
```
| Login response | {access_token, refresh_token, token_type:"bearer", first_name, last_name, email, user_type} (flat — no nested user object) | Phase 4 frontend (authService.ts reads flat fields directly) |
```

**Replace with:**
```
| Login response | {access_token, refresh_token, token_type:"bearer", first_name, last_name, email, user_type, role} (flat — no nested user object) | Phase 4 frontend (authService.ts reads flat fields directly) |
```

**Also verify the frontend actually reads `role`:**
```bash
grep -rn "role\|user_type" src/frontend/src/
```
Update the consumer list in the frozen interface table if the frontend does not yet read `role`.

## Architecture Mapping

**Layer:** Spec/Documentation → Backend Schema → Frontend Consumer

**Flow:**

    CLAUDE.md frozen interface spec (source of truth for consumers)
      ↓ spec says: {access_token, refresh_token, token_type, first_name, last_name, email, user_type}
    schemas.py:28 TokenResponse (actual implementation)
      ↓ actual has: {access_token, refresh_token, token_type, first_name, last_name, email, user_type, role}
                                                                                                     ↑
                                                                              THIS CASE LIVES HERE (spec/impl mismatch)
    authService.ts (Phase 4 frontend consumer)
      ↓ reads: fields from login response (unknown if it reads role)

**Upstream:** CLAUDE.md spec is read by developers (human consumers) before implementing frontend features

**Downstream:** Phase 4 frontend `authService.ts` reads the login response; any feature gating on `role` depends on the field being documented and consistently present

## Verification
- [ ] Grep proof: `grep -n "role" src/backend/schemas.py` → shows line 36 (`role: str = "user"`)
- [ ] Grep proof: `grep -n "Login response\|frozen" CLAUDE.md` → shows spec without `role` field
- [ ] Fix proof: after updating CLAUDE.md, `grep -n "Login response" CLAUDE.md` → shows `role` in the field list

## Downstream Impact
**Impact if unfixed:** Cosmetic — spec diverges from implementation

No runtime behavior is affected. The risk is that a frontend developer reads the frozen interface spec and does not know `role` is available, so they implement role-based UI gating by reading `user_type` (which is hardcoded to "Administrator" per CASE-005) instead of `role`. This would silently grant all users admin access in the frontend.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-005 (user_type hardcoded to "Administrator" — the other field in this spec)
