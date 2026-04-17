---
id: CASE-040
title: "Team member list does not explicitly verify team_id ownership"
phase: "09"
phase_name: "RBAC & Team Management"
category: ARCH_VIOLATION
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/admin.py
    lines: "68-99"
  - path: src/backend/auth_utils.py
    lines: "154-161"
---

## Why This Case Was Created
Defense-in-depth audit for the team member list endpoint. The `GET /api/admin/team` endpoint relies on a single ORM query filter (`where(User.team_id == admin.team_id)`) to restrict results to the admin's team. There is no explicit ownership assertion — no `assert member.team_id == admin.team_id` check on each returned member. If the ORM query were accidentally modified (e.g., the `where` clause removed, or a join introduced that returns cross-team data), the endpoint would silently return incorrect data. The function's correctness depends entirely on one ORM filter being present and unmodified.

## What Is Wrong
`src/backend/routers/admin.py:86-99`:
```python
result = await db.execute(
    select(User).where(User.team_id == admin.team_id)   # ← entire isolation depends on this
)
members = result.scalars().all()
return [
    {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }
    for u in members
    # ← no assert u.team_id == admin.team_id here
]
```

The return path iterates `members` and serializes each user without verifying that `u.team_id == admin.team_id`. If the ORM query had an accidental SQLAlchemy join that introduces rows from other teams (e.g., a future addition of an outer join for user profile data), those rows would silently appear in the response.

Similarly, the `GET /api/admin/chats` endpoint at `admin.py:38-64` fetches `team_user_ids` from one query and then fetches `ChatSession` records using `ChatSession.user_id.in_(team_user_ids)`. If the first query returns incorrect user IDs, the second query's `in_()` will return the wrong sessions.

This is a defense-in-depth gap, not an active bug: the current code is correct. The concern is that the isolation is single-layer with no assertion.

## Why It Was Done This Way (Root Cause)
The ORM filter pattern is standard SQLAlchemy practice — the `where()` clause is the accepted mechanism for row-level security in ORM queries. Adding an explicit `assert u.team_id == admin.team_id` check per-row is not a common pattern in Python FastAPI codebases. The developer correctly relied on the ORM to enforce the filter. The gap is that there is no defense-in-depth layer for future refactors.

## What Is Done Right
The `admin.team_id` value comes from `require_admin` → `require_user` → `select(User).where(User.id == user_id)` — the admin's team_id is loaded from the DB, not from the JWT payload, so it cannot be spoofed by a tampered JWT. The `where(User.team_id == admin.team_id)` filter is applied at the DB level (translated to SQL `WHERE team_id = ?`), which is the most reliable form of filtering. The `remove` endpoint adds an additional cross-check: `if user.team_id != admin.team_id: raise 403`.

## How To Fix It
**Option A (minimal — add an assertion in the serialization loop):**

In `src/backend/routers/admin.py:90-99`, add an explicit ownership check:

```python
members = result.scalars().all()
# Defense-in-depth: assert no row from another team leaked through the ORM query
safe_members = [u for u in members if u.team_id == admin.team_id]
if len(safe_members) != len(members):
    logger.error(
        f"CRITICAL: team_id isolation breach detected in /api/admin/team. "
        f"Admin team_id={admin.team_id}, {len(members) - len(safe_members)} rows had wrong team_id. "
        "Serving only safe rows."
    )
return [
    {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }
    for u in safe_members
]
```

**Option B (add a row-level assertion that raises on mismatch):**

```python
for u in members:
    if u.team_id != admin.team_id:
        logger.critical(
            f"team_id isolation breach: user {u.id} has team_id={u.team_id}, "
            f"expected {admin.team_id}. Aborting response."
        )
        raise HTTPException(status_code=500, detail="Internal isolation error")
```

Option A (filtering) is safer — it serves the correct data even if one row leaks. Option B (raising) is stricter — it surfaces the bug immediately.

**Apply the same pattern to `admin.py:56-65`** for the admin chats endpoint, checking each `ChatSession.user_id in team_user_ids`.

## Architecture Mapping

**Layer:** Backend Router (admin.py)

**Flow:**

    [GET /api/admin/team]
               ↓
    [require_admin → admin loaded from DB (team_id from DB, not JWT)]
               ↓
    [select(User).where(User.team_id == admin.team_id)]
               ↓
    [members = result.scalars().all()]
               ↓
    [serialize each member]  ← NO EXPLICIT team_id == admin.team_id CHECK HERE
               ↓
    [return list]

    If ORM filter were removed/broken:
    [members = ALL users in DB]  → silently returned to admin

**Upstream:** `require_admin` dependency loading admin from DB, ORM query in `admin_list_team_members`
**Downstream:** Admin dashboard team member list UI

## Verification
- [ ] Grep proof: `grep -n "team_id == admin.team_id" src/backend/routers/admin.py` — shows only the query-level filter, no per-row assertion
- [ ] Test proof: The cross-team isolation test (CASE-037) indirectly tests this boundary. No test for the defense-in-depth assertion itself.
- [ ] Runtime proof: In the DB, manually set a user's `team_id` to the admin's `team_id` after the query runs (not possible at runtime — isolation proof is at query time only)

## Downstream Impact
**Impact if unfixed:** Security Risk (latent — only manifests if ORM query is accidentally changed)

No active data leak. The ORM filter is correct. The risk is that a future refactor removing or modifying the `where()` clause would cause cross-team data leakage with no automated detection. Adding the per-row assertion creates a second line of defense that catches the regression at runtime with a clear error log, rather than silently leaking data.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-chat/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-037, CASE-038
