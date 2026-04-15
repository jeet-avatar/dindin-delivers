---
id: CASE-120
title: "JWT payload includes 'jti' claim (JWT ID for blacklist support)"
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
feature: "JWT jti claim"
test_ref: "tests/test_rbac.py::TestRequireAdmin::test_jti_in_jwt_payload"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that every JWT issued by ArthaBuild contains a `jti` (JWT ID) claim — a unique
identifier (`str(uuid4())`) per token. The `jti` is the key used by the logout blacklist:
when a user logs out, the `jti` is added to an in-memory set, and subsequent requests
bearing a token with that `jti` are rejected even if the signature is still valid.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — `create_access_token()` may have had the `jti` generation removed
- The `jti` key may have been renamed or placed in a nested sub-object
- `uuid4()` import may be missing, causing a silent fallback to no jti

## Why It Was Done This Way (Root Cause)
`create_access_token()` calls `str(uuid4())` and adds it to the payload dict under the key
`"jti"`. This is an RFC 7519 standard claim. The test decodes the access token returned at
login and asserts `"jti" in payload` and that the value is a non-empty string. Without `jti`,
the logout mechanism cannot invalidate individual tokens — only expiry-based invalidation
would work, leaving logged-out tokens valid until natural expiry.

## What Is Done Right
- Decodes the raw JWT to inspect the payload directly
- Asserts both the presence of the `jti` key and that it has a non-empty value
- Documents the architecture dependency: logout blacklist requires jti

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestRequireAdmin::test_jti_in_jwt_payload -v
```

## Architecture Mapping

**Layer:** JWT Token → Payload Claim → Blacklist

**Flow:**
    POST /api/auth/login → {access_token: "eyJ..."}
      → jwt.decode(access_token, ...)
        → payload["jti"] == "some-uuid4-string"  ← THIS TEST COVERS THIS

    Later (logout):
      POST /api/auth/logout → blacklist.add(payload["jti"])
      Next request: payload["jti"] in blacklist → 401

**Upstream:** `create_access_token()` in auth.py generates `jti = str(uuid4())`
**Downstream:** Logout blacklist uses jti to invalidate specific tokens (CASE-122)

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestRequireAdmin::test_jti_in_jwt_payload -v`

## Downstream Impact
**Impact if unfixed:** Logout becomes stateless-only (expiry-based), meaning logged-out
tokens remain valid until expiry — a security gap where stolen tokens stay usable even after
the user has explicitly signed out.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-119 (role claim), CASE-121 (logout 200), CASE-122 (blacklisted token rejected)
