---
id: CASE-122
title: "Token cannot be used after logout (blacklist enforced)"
phase: "09"
phase_name: "RBAC & Team Management"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "JWT blacklist (post-logout rejection)"
test_ref: "tests/test_rbac.py::TestTokenBlacklist::test_blacklisted_token_rejected"
files:
  - path: src/backend/routers/auth.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies the core security property of the logout system: after calling
`POST /api/auth/logout`, the same access token used to log out is immediately rejected by
any subsequent authenticated endpoint call, returning HTTP 401. Without this, logout is
purely cosmetic — the token remains valid until expiry.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `auth_utils.py:require_user` — the blacklist check may have been removed or skipped
- The blacklist set may not be shared between the logout handler and the `require_user`
  dependency (e.g., if each request creates a new set instance)
- In a multi-worker environment, the in-memory blacklist is not shared across processes;
  this test only covers single-worker behaviour

## Why It Was Done This Way (Root Cause)
`require_user` (after validating the JWT signature and expiry) extracts the `jti` from the
payload and checks `if jti in blacklist: raise HTTPException(status_code=401)`. The
`blacklist` is a module-level `set()` in `auth_utils.py` (or equivalent singleton). When
`logout()` adds the `jti` to this set, subsequent calls to `require_user` with the same
token hit the blacklist check and are rejected before the handler runs.

## What Is Done Right
- Full flow: register → login → logout → use same token → assert 401
- Does not accept 403 (which would indicate auth dependency missing, not blacklist)
- Specifically asserts 401 to confirm the blacklist path (not role check) triggered

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestTokenBlacklist::test_blacklisted_token_rejected -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency → In-Memory Blacklist

**Flow:**
    Step 1: POST /api/auth/logout [token T] → blacklist.add(T.jti) → 200

    Step 2: GET /api/chats [same token T]
      → auth_utils.py:require_user()
        → decode JWT → jti = T.jti
          → if jti in blacklist: raise HTTPException(401)  ← THIS TEST COVERS THIS

**Upstream:** User logs out, then another client (or attacker) reuses the old token
**Downstream:** 401 returned; request rejected before any data is accessed

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestTokenBlacklist::test_blacklisted_token_rejected -v`

## Downstream Impact
**Impact if unfixed:** Logout is cosmetic — stolen or shared tokens remain valid for their
full lifetime after sign-out, enabling session hijacking with no revocation mechanism.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-120 (jti in payload), CASE-121 (logout returns 200), CASE-123 (logout without token)
