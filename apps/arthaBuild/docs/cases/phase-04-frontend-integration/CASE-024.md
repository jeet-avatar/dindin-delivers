---
id: CASE-024
title: "Token refresh response missing role — inconsistent with login response"
phase: "04"
phase_name: "Frontend Integration"
category: API_CORRECTNESS
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/auth.py
    lines: "193-216"
  - path: src/backend/schemas.py
    lines: "28-36"
---

## Why This Case Was Created
API consistency audit between login and token refresh. Phase 9 added `role` to the login response (`schemas.py:36`, `auth.py:76`). The frontend reads `role` from the login response to gate admin UI sections (e.g., showing the Admin Panel tab). If the access token expires and the frontend silently refreshes it, the refresh response does not include `role`, so the frontend loses the user's role and must either re-fetch it from another endpoint or incorrectly default to `user`.

## What Is Wrong
**Login response** (`auth.py:75-82`) returns via `TokenResponse` schema which includes `role`:
```python
return TokenResponse(
    access_token=create_access_token(user.id, role=user.role),
    refresh_token=create_refresh_token(user.id),
    first_name=user.first_name or "",
    last_name=user.last_name or "",
    email=user.email,
    role=user.role,   # ← role is present
)
```

**Refresh response** (`auth.py:212-215`) returns a plain dict missing `role`:
```python
return {
    "access_token": create_access_token(user_id),
    "token_type": "bearer",
    # role is absent
}
```

`schemas.py:28-36` defines `TokenResponse` with `role: str = "user"`, but the refresh endpoint does not use `TokenResponse` — it returns a raw dict. A frontend `authService.ts` that reads `response.role` after token refresh will receive `undefined`. If the frontend caches role from login and never re-reads it from the refresh response, this is benign. But if the frontend re-initializes auth state from the refresh response (e.g., after page reload), the admin role is lost.

## Why It Was Done This Way (Root Cause)
The refresh endpoint was implemented in Phase 1 before RBAC was added in Phase 9. The minimal response `{access_token, token_type}` was correct at the time. When Phase 9 added `role` to the login response, the refresh endpoint was not updated to match. This is a phase boundary consistency gap.

## What Is Done Right
The `create_access_token(user_id)` call in the refresh path correctly embeds `role` inside the JWT payload (see `auth_utils.py:58-66` — `role` is a JWT claim). Any endpoint that uses `require_user` or `get_current_user_id` gets the role from the token. The gap is only in the HTTP response body, not in the token itself.

## How To Fix It
**Step 1 — Fetch user in the refresh endpoint and return full response.**

In `src/backend/routers/auth.py:207-216`, the refresh endpoint already fetches the user (`result = await db.execute(select(User)...)`). Update the return to include `role`:

```python
return {
    "access_token": create_access_token(user_id, role=user.role),  # pass role to token
    "token_type": "bearer",
    "role": user.role,    # add this field
}
```

**Step 2 — Optionally return `TokenResponse` schema for type safety.**

Import `TokenResponse` in `auth.py:7-10` and change the return type annotation:

```python
@router.post("/refresh", response_model=None)   # or define a RefreshResponse schema
```

A simpler targeted fix is the dict approach in Step 1 — it adds only the missing field without restructuring the response.

**Step 3 — Add a test in `test_auth.py`:**
```python
async def test_refresh_response_includes_role(client, registered_user, auth_tokens):
    resp = await client.post("/api/auth/refresh", json={"refresh_token": auth_tokens["refresh_token"]})
    assert resp.status_code == 200
    data = resp.json()
    assert "role" in data, f"Refresh response missing 'role': {data}"
    assert data["role"] in ("admin", "user")
```

## Architecture Mapping

**Layer:** Backend Router (auth)

**Flow:**

    [Frontend access token expires] → [authService refreshToken()] → [POST /api/auth/refresh]
                                                                              ↑
                                                                  response missing 'role' field
                                                                              ↓
                                      [Frontend receives {access_token, token_type}]
                                      [role = response.role → undefined]
                                      [Admin UI may hide/show incorrectly]

**Upstream:** Frontend `authService.ts` token expiry handler
**Downstream:** Frontend role-gated UI components (Admin Panel tab, team management views)

## Verification
- [ ] Grep proof: `grep -n "return {" src/backend/routers/auth.py | grep -A3 "refresh"`
- [ ] Test proof: `pytest tests/test_auth.py -k "refresh" -v`
- [ ] Runtime proof: `curl -X POST http://localhost:8000/api/auth/refresh -H "Content-Type: application/json" -d '{"refresh_token":"<valid_refresh_token>"}' | python3 -m json.tool` — check if `role` field is present

## Downstream Impact
**Impact if unfixed:** Degraded UX

Frontend state after a silent token refresh will be missing `role`. If the frontend initializes admin gating from the refresh response (e.g., after browser reload triggers a refresh), admin users will see a regular-user UI. They would need to log out and log back in to restore admin access. No data loss, no security risk (JWT still carries the correct role; API auth is unaffected).

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
