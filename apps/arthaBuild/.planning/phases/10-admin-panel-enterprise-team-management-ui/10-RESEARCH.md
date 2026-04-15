# Phase 10: Admin Panel — Enterprise Team Management UI - Research

**Researched:** 2026-04-10
**Domain:** FastAPI admin endpoints + React admin panel wiring + SQLite stats queries
**Confidence:** HIGH

## Summary

Phase 9 built the skeleton. The AdminPanel.tsx is a fully functional 3-tab UI (Members / Chats / Invite). The admin router at `src/backend/routers/admin.py` already has the four endpoints Phase 9 delivered: `GET /api/admin/team`, `GET /api/admin/chats`, `POST /api/admin/team/invite`, `DELETE /api/admin/team/{user_id}`. Phase 10 must ADD six new backend endpoints (stats, user CRUD, audit, config, license, teams) and wire them into an extended frontend panel — NOT rebuild what exists.

The key insight for planning is scope clarity: the case ticket IDs (CASE-173 through CASE-180) each map to a specific new endpoint. Several of these endpoints (`/api/admin/stats`, `/api/admin/audit`, `/api/admin/config`, `/api/admin/teams`) require new models or new queries against existing tables. Two endpoints (`/api/admin/users/{id}/role` and `DELETE /api/admin/users/{id}`) are renames/expansions of the existing `DELETE /api/admin/team/{user_id}`. The `/api/admin/license` endpoint reuses the existing `validate_license()` function from `routers/license.py`.

The invite acceptance flow is partially built on the backend (TeamInvite model + `send_invite_email()` exists, invite token stored in DB) but has NO corresponding frontend route (`/accept-invite`) and no backend endpoint to consume the token and register the invited user under the right team. This is the most complex gap in Phase 10.

**Primary recommendation:** Implement all 8 new backend endpoints in admin.py first, then extend AdminPanel.tsx with new tabs (Stats, Usage) and wire the invite acceptance flow as a new frontend page + new backend endpoint.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CASE-173 | GET /api/admin/stats returns total_users, total_chats, active_sessions | Query User, ChatSession, ChatMessage tables with SQLAlchemy aggregate funcs — all models exist |
| CASE-174 | GET /api/admin/users returns all users with role and team assignment | Identical to existing GET /api/admin/team — rename or alias; User model has role + team_id |
| CASE-175 | PATCH /api/admin/users/{id}/role changes user role (admin/user) | New endpoint; User.role is a plain String column — simple UPDATE; add to admin.py |
| CASE-176 | DELETE /api/admin/users/{id} deactivates (soft-deletes) a user | Functionally matches existing DELETE /api/admin/team/{user_id} — set is_active=False, team_id=None |
| CASE-177 | GET /api/admin/audit returns recent admin actions with timestamp and actor | Requires new AuditLog SQLAlchemy model + Alembic migration; log on PATCH role / DELETE user |
| CASE-178 | PUT /api/admin/config updates system settings (e.g., max_chat_history) | Requires new SystemConfig model + Alembic migration OR simple in-memory dict with env var fallback |
| CASE-179 | GET /api/admin/license shows current license status and expiry | Reuse validate_license() from routers/license.py — return dict directly; no new model needed |
| CASE-180 | POST /api/admin/teams creates a new team with name and assigns admin | Team model already exists; new endpoint creates Team row, assigns admin.team_id |
</phase_requirements>

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI + SQLAlchemy async | Existing | New admin endpoints | Same pattern as all Phase 9 endpoints |
| Alembic | Existing | New DB migration for AuditLog + SystemConfig | render_as_batch=True already established |
| React + TypeScript | Existing | Extended AdminPanel.tsx | Already in use |
| Tailwind CSS | Existing | New tab styling | Already in use |
| lucide-react | Existing | Icons for new tabs | Already imported (Shield, Users, etc.) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fastapi-mail | Existing | Invite email (already wired in email_utils.py) | Invite acceptance flow reuses send_invite_email() |

### No New Dependencies Required

Phase 10 requires zero new pip or npm packages. All needed tools are already installed.

**Installation:**
```bash
# Nothing to install — all dependencies already present
```

## Architecture Patterns

### What Already Exists (DO NOT REBUILD)

```
src/backend/routers/admin.py          # 4 working endpoints (team/chats/invite/remove)
src/backend/models.py                 # User, Team, TeamInvite, ChatSession, ChatMessage, ScriptDeployment, LicenseCache
src/backend/email_utils.py            # send_invite_email() — non-fatal if no SMTP
src/frontend/src/pages/AdminPanel.tsx # 3-tab UI (Members | Chats | Invite)
src/frontend/src/services/adminService.ts  # 4 API calls matching 4 backend endpoints
src/frontend/src/routes.tsx           # /admin route with AdminProtected guard
```

### What Must Be Added in Phase 10

```
Backend:
├── models.py                         # +AuditLog model, +SystemConfig model
├── alembic/versions/XXXXXX.py        # migration for new tables
├── routers/admin.py                  # +6 new endpoints (stats, users CRUD, audit, config, license, teams)
└── routers/user.py                   # +POST /api/user/accept-invite (new registered user joins existing team)

Frontend:
├── pages/AdminPanel.tsx              # +2 new tabs: Stats | Config (extend existing 3-tab to 5-tab)
├── pages/AcceptInvite.tsx            # NEW page: /accept-invite?token=xxx → registration form
├── services/adminService.ts         # +5 new API call functions
└── routes.tsx                       # +/accept-invite route (public, no auth guard)
```

### Pattern 1: New Admin Endpoint (Stats)

**What:** Aggregate queries against existing tables
**When to use:** CASE-173 — pure read, no new models required

```python
# Source: existing pattern in routers/admin.py
@router.get("/stats")
async def admin_get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return usage stats scoped to admin's team."""
    # total_users: count users on team
    user_count = await db.execute(
        select(func.count()).select_from(User).where(User.team_id == admin.team_id)
    )
    # total_chats: count chat sessions for team users
    # active_sessions: count chats updated in last 24h
    # scripts_deployed: count ScriptDeployment rows for team users
    ...
```

### Pattern 2: AuditLog Model + Migration

**What:** New SQLAlchemy model for audit trail
**When to use:** CASE-177 — required for audit endpoint

```python
# Source: models.py existing pattern
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)       # "role_changed", "user_removed", "team_created"
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    detail = Column(String, nullable=True)        # JSON string for extra context
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

Migration uses `render_as_batch=True` (MANDATORY per CLAUDE.md for SQLite).

### Pattern 3: SystemConfig Model (Simple Key-Value)

**What:** In-DB key-value store for admin-configurable settings
**When to use:** CASE-178 — `max_chat_history`, future settings

```python
class SystemConfig(Base):
    __tablename__ = "system_config"
    key = Column(String, primary_key=True)       # e.g. "max_chat_history"
    value = Column(String, nullable=False)        # stored as string, parsed by consumer
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
```

**PUT /api/admin/config** accepts `{key: str, value: str}` and upserts.

### Pattern 4: Invite Acceptance Flow (Most Complex)

**What:** New user registers via invite token → joined to team, bypasses first-user-is-admin
**When to use:** Invite flow completion (backend + frontend both needed)

Backend: `POST /api/user/accept-invite` in `routers/user.py`
```python
# 1. Receive: {token, first_name, last_name, password}
# 2. hash token → lookup TeamInvite by token_hash
# 3. Check: not accepted, not expired
# 4. Check: email not already registered (409 if yes)
# 5. Create User with team_id=invite.team_id, role="user"
# 6. Mark invite.accepted=True
# 7. Return: {access_token, refresh_token, ...} — same shape as /api/auth/login response
```

Frontend: `AcceptInvite.tsx` page at `/accept-invite` route
- Reads `?token=` from URL params
- Shows registration form (first_name, last_name, password)
- On submit: POST /api/user/accept-invite with token + form data
- On success: store tokens → navigate to /chat/new

### Pattern 5: Role Change Endpoint

**What:** PATCH /api/admin/users/{id}/role
**When to use:** CASE-175

```python
@router.patch("/users/{user_id}/role")
async def admin_change_user_role(
    user_id: int,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    new_role = body.get("role")
    if new_role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'user'")
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    # fetch user, verify same team, update role
    # Write to AuditLog
    ...
```

### Pattern 6: Frontend Stats Tab

**What:** New "Stats" tab added to existing AdminPanel.tsx 3-tab structure
**When to use:** Wire GET /api/admin/stats to UI

The existing tab pattern (Tab type, tabs array, tab state) is clean. Add:
- `"stats"` to the `Tab` type union
- Add stats tab button to tabs array with `BarChart2` icon from lucide-react
- Lazy-load stats on tab activation (same `statsLoaded` flag pattern as `chatsLoaded`)
- Display: cards for total_users, total_chats, scripts_deployed

### Anti-Patterns to Avoid

- **Don't rename existing endpoints** — CASE-174 says "GET /api/admin/users" but the existing endpoint is `GET /api/admin/team`. ADD the new path as an alias (include_router registers both) or implement alongside. Do NOT break the existing endpoint since adminService.ts calls `/api/admin/team` and tests cover it.
- **Don't create a new AdminPanel page** — extend the existing `src/frontend/src/pages/AdminPanel.tsx` by adding tabs.
- **Don't skip the AuditLog write** — CASE-177 requires that PATCH role and DELETE user both write to audit_logs. Do this inside the endpoint, not as background task.
- **Don't use `render_as_batch=False`** — SQLite REQUIRES render_as_batch=True in all Alembic migrations per CLAUDE.md.
- **Don't store invite token in plaintext** — pattern is already established: `secrets.token_urlsafe(32)` raw token sent in email, SHA-256 hash stored in DB (same as PasswordResetToken).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP | fastapi-mail (already in email_utils.py) | Already configured with SUPPRESS_SEND pattern |
| Token security | Custom token | `secrets.token_urlsafe(32)` + sha256 hash | Same pattern as PasswordResetToken, already in email_utils.py |
| Admin auth guard | New auth logic | `Depends(require_admin)` | Already implemented in auth_utils.py:154 |
| Stats aggregation | Application-side loop | SQLAlchemy `func.count()` | DB-side aggregation is correct; no ORM object loading needed |
| Config storage | .env file updates | SystemConfig DB table | Allows runtime updates without restart |

**Key insight:** The project has strong patterns for token-based flows (invite, reset). Reuse exactly. The only new data persistence needed is AuditLog + SystemConfig models.

## Common Pitfalls

### Pitfall 1: Breaking Existing /api/admin/team Endpoint

**What goes wrong:** Renaming GET /api/admin/team to GET /api/admin/users breaks adminService.ts + test_chats.py.
**Why it happens:** CASE-174 says endpoint should be "GET /api/admin/users" but Phase 9 built "GET /api/admin/team".
**How to avoid:** Add GET /api/admin/users as a NEW endpoint that returns the same data. Keep GET /api/admin/team intact. Both can coexist on the same router.
**Warning signs:** `pytest tests/ -v` shows test_admin_can_list_team_members failing.

### Pitfall 2: Alembic Migration Without render_as_batch=True

**What goes wrong:** `ALTER TABLE` operations fail on SQLite with "Cannot add a NOT NULL column with a default value".
**Why it happens:** SQLite does not support column-level ALTER in standard migration.
**How to avoid:** Always use `with op.batch_alter_table("table_name") as batch_op:` for all column additions. CLAUDE.md rule is explicit.
**Warning signs:** `alembic upgrade head` exits with SQLite OperationalError.

### Pitfall 3: Invite Acceptance Without Proper Team Assignment

**What goes wrong:** User registers via invite but gets `team_id=None` or becomes admin (first-user-is-admin logic fires).
**Why it happens:** `routers/user.py` POST /api/user/register checks `SELECT COUNT(*) FROM users` and assigns admin + team to first user. If someone registers via invite after the admin, they get `role='user', team_id=None`.
**How to avoid:** The `/api/user/accept-invite` endpoint must BYPASS the first-user-is-admin logic and explicitly set `team_id=invite.team_id, role='user'`.
**Warning signs:** Invited user can access /admin after registration.

### Pitfall 4: AuditLog admin_id FK Constraint Fails on SQLite

**What goes wrong:** `ForeignKey("users.id")` in a new table migration fails if users table has rows but SQLite FK enforcement is off by default.
**Why it happens:** Phase 9 established the pattern of omitting FK constraints in batch alter contexts. For new tables (not batch alter), FKs in SQLAlchemy model definitions are fine — they're in `CREATE TABLE`, not `ALTER TABLE`.
**How to avoid:** AuditLog is a brand-new table, not a batch alter. ForeignKey in model definition is safe. Batch alter is only needed when ADDING columns to EXISTING tables.
**Warning signs:** Confusion with AB-905 decision which was specifically for batch_alter_table on users table.

### Pitfall 5: Stats Query Scoping

**What goes wrong:** `/api/admin/stats` counts ALL users/chats in DB, not just the admin's team.
**Why it happens:** Easy to write `SELECT COUNT(*) FROM users` without the WHERE clause.
**How to avoid:** All admin queries are scoped to `admin.team_id` (established Phase 9 pattern). Stats must filter by `User.team_id == admin.team_id` for users, then by those user_ids for chats.
**Warning signs:** Admin sees counts from other teams (impossible in single-tenant but bad practice for multi-tenant future).

### Pitfall 6: AcceptInvite Route Needs to Be Public

**What goes wrong:** Wrapping `/accept-invite` in `<Protected>` guard blocks unauthenticated users from accessing the invite link.
**Why it happens:** Default is to protect all app routes.
**How to avoid:** Add route WITHOUT Protected wrapper in routes.tsx: `<Route path="/accept-invite" element={<AcceptInvite />} />`.

## Code Examples

### Stats Endpoint (SQLAlchemy aggregate)

```python
# Source: SQLAlchemy docs — select + func.count
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

@router.get("/stats")
async def admin_get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if admin.team_id is None:
        return {"total_users": 1, "total_chats": 0, "active_sessions": 0, "scripts_deployed": 0}

    # Get team user IDs
    users_result = await db.execute(
        select(User.id).where(User.team_id == admin.team_id)
    )
    user_ids = [r for r in users_result.scalars().all()]

    total_users = len(user_ids)

    total_chats_result = await db.execute(
        select(func.count()).select_from(ChatSession)
        .where(ChatSession.user_id.in_(user_ids))
    )
    total_chats = total_chats_result.scalar() or 0

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    active_result = await db.execute(
        select(func.count()).select_from(ChatSession)
        .where(ChatSession.user_id.in_(user_ids))
        .where(ChatSession.updated_at > cutoff)
    )
    active_sessions = active_result.scalar() or 0

    scripts_result = await db.execute(
        select(func.count()).select_from(ScriptDeployment)
        .where(ScriptDeployment.user_id.in_(user_ids))
    )
    scripts_deployed = scripts_result.scalar() or 0

    return {
        "total_users": total_users,
        "total_chats": total_chats,
        "active_sessions": active_sessions,
        "scripts_deployed": scripts_deployed,
    }
```

### AuditLog Write Pattern

```python
# Write after every admin action (role change, user removal, team creation)
async def _write_audit(db: AsyncSession, admin_id: int, action: str,
                        target_user_id: int | None = None, detail: str | None = None):
    log = AuditLog(admin_id=admin_id, action=action,
                   target_user_id=target_user_id, detail=detail)
    db.add(log)
    # Do NOT await db.commit() here — caller commits once after main operation
```

### Frontend Stats Tab Extension

```tsx
// Extend existing Tab type and tabs array in AdminPanel.tsx
type Tab = "members" | "chats" | "invite" | "stats" | "config";

// Add to tabs array:
{ id: "stats", label: "Usage Stats", icon: <BarChart2 size={16} /> },
```

### AcceptInvite Page Skeleton

```tsx
// src/frontend/src/pages/AcceptInvite.tsx
// Reads ?token= from URL, shows registration form, calls POST /api/user/accept-invite
// On success: store tokens via authService, navigate to /chat/new

import { useSearchParams, useNavigate } from "react-router-dom";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  // form state: firstName, lastName, password
  // submit: POST /api/user/accept-invite {token, first_name, last_name, password}
  // success: store tokens, navigate("/chat/new")
}
```

### Alembic Migration (New Tables)

```python
# New tables use CREATE TABLE — no batch_alter needed
# batch_alter_table is ONLY needed when ADDING COLUMNS to EXISTING tables

def upgrade():
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("detail", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "system_config",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", sa.String(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No admin endpoints | 4 endpoints in admin.py | Phase 9 (2026-04-10) | Stats/audit/config/license are the remaining gaps |
| No audit trail | AuditLog table (to build) | Phase 10 | Phase 12 SOC2 requires this |
| localStorage chat | DB-backed chat sessions | Phase 9 | Already in place |

**Deprecated/outdated:**
- Nothing deprecated in this phase. Phase 10 is purely additive.

## Open Questions

1. **Should /api/admin/users be a new endpoint or alias for /api/admin/team?**
   - What we know: CASE-174 says "/api/admin/users", Phase 9 built "/api/admin/team". adminService.ts calls /api/admin/team. Tests cover /api/admin/team.
   - What's unclear: Whether the planner should break the old URL or add new one.
   - Recommendation: ADD `/api/admin/users` as a new route returning the same data. Keep `/api/admin/team` intact. Zero test breakage.

2. **SystemConfig: DB table vs in-memory dict?**
   - What we know: CASE-178 requires PUT endpoint that updates settings like `max_chat_history`.
   - What's unclear: Whether settings need to survive server restarts.
   - Recommendation: Use SystemConfig DB table (key-value). Single row per setting, upsert on PUT. Survives restarts. Consistent with the project's SQLite-first approach.

3. **Stats "active_sessions" definition**
   - What we know: ChatSession.updated_at is available.
   - What's unclear: "active" = updated in last 24h? last hour? ongoing?
   - Recommendation: Define as "updated_at within last 24 hours" — most intuitive for a daily usage metric.

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/backend/routers/admin.py` — 4 existing endpoints, their exact signatures
- Direct code inspection: `src/backend/models.py` — all 8 existing models, columns confirmed
- Direct code inspection: `src/backend/auth_utils.py` — require_admin pattern confirmed
- Direct code inspection: `src/backend/email_utils.py` — send_invite_email() confirmed, SUPPRESS_SEND pattern
- Direct code inspection: `src/frontend/src/pages/AdminPanel.tsx` — 3-tab structure confirmed
- Direct code inspection: `src/frontend/src/services/adminService.ts` — 4 existing API calls
- Direct code inspection: `src/frontend/src/routes.tsx` — AdminProtected, /admin route confirmed
- Phase 9 SUMMARY files (09-01, 09-03) — confirmed exactly what was built and what decisions were made

### Secondary (MEDIUM confidence)
- CLAUDE.md rule: `render_as_batch=True` mandatory for all Alembic migrations on SQLite
- STATE.md decisions: AB-901 through AB-905 document Phase 9 architecture decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from direct code inspection, no new installs needed
- Architecture: HIGH — existing patterns fully understood from source code
- Pitfalls: HIGH — pitfalls derived from actual Phase 9 decisions (AB-901, AB-905) and CLAUDE.md rules
- Invite flow: MEDIUM — backend partially exists (TeamInvite model + send_invite_email), but the accept-invite endpoint and page must be built fresh; complexity is understood

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable project, 30-day window reasonable)
