---
id: CASE-118
title: "Unauthenticated request to admin endpoint returns 401 or 403"
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
feature: "Admin endpoint auth guard (no token)"
test_ref: "tests/test_rbac.py::TestRequireAdmin::test_unauthenticated_cannot_access_admin"
files:
  - path: src/backend/auth_utils.py
    lines: ""
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
Verifies that admin endpoints reject requests with no `Authorization` header at all —
not just requests from non-admin authenticated users. This covers the scenario where the
`require_admin` dependency must also implicitly require authentication.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `auth_utils.py` — `require_admin` may not be using `HTTPBearer` or equivalent, allowing
  requests without a token to reach the role check with a None user
- The dependency chain may have a fallback that returns an anonymous user object instead of
  raising an exception
- A public route alias for the admin endpoint may have been accidentally created

## Why It Was Done This Way (Root Cause)
`require_admin` chains on top of FastAPI's `HTTPBearer` security scheme (or equivalent).
When no `Authorization` header is present, `HTTPBearer` raises an `HTTPException` before
`require_admin`'s role check even runs. The exact status code depends on configuration:
FastAPI's default `HTTPBearer` raises 403, but custom configurations may return 401. The
test accepts either code.

## What Is Done Right
- Sends request with no Authorization header whatsoever
- Asserts status code is in `{401, 403}` — not 200 or 404
- Covers the attack vector where an unauthenticated caller guesses an admin URL

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestRequireAdmin::test_unauthenticated_cannot_access_admin -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    GET /api/admin/team  [no Authorization header]
      → routers/admin.py:list_team_members()
        → Depends(require_admin)
          → HTTPBearer() → no token
            → raise HTTPException(401/403)  ← THIS TEST COVERS THIS
              (require_admin role check never reached)

**Upstream:** Completely unauthenticated caller (web scraper, attacker, logged-out browser)
**Downstream:** 401/403 returned; no admin data exposed

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestRequireAdmin::test_unauthenticated_cannot_access_admin -v`

## Downstream Impact
**Impact if unfixed:** Admin endpoints are publicly accessible without any credentials,
exposing team rosters, chat histories, and invitation records to anonymous callers.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-116 (admin passes), CASE-117 (non-admin 403), CASE-105 (unauth chat list)
