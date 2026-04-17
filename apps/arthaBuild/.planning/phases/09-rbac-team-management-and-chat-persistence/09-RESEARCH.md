# Phase 9: RBAC, Team Management and Chat Persistence — Research

**Researched:** 2026-04-09
**Domain:** FastAPI RBAC, SQLAlchemy async, JWT role claims, React admin routing, chat DB persistence
**Confidence:** HIGH (all findings from direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Phase 9 includes a full dashboard for logged-in users
- Phase 9 includes a complete admin view — admin can see all team chats, manage team members, view platform activity
- Admin panel is NOT a separate future phase — it is part of Phase 9

### Claude's Discretion
- Layout and visual design of dashboard and admin panel (BrandMonkz-style patterns encouraged)
- Whether dashboard is a separate `/dashboard` route or post-login landing
- Token blacklist implementation details (in-memory dict vs DB table)

### Deferred Ideas (OUT OF SCOPE)
- Password management (Phase 11)
- Security hardening / SOC2 (Phase 12)
- Phase 10 scope items (already folded into Phase 9 per CONTEXT.md)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RBAC-01 | Role field on User (admin/user), `require_admin()` / `require_user()` FastAPI Depends, role in JWT claims | Confirmed — User model has no role field yet; auth_utils.py has `get_current_user_id` pattern to extend |
| CHAT-01 | ChatSession + ChatMessage DB tables, /api/chats endpoints, localStorage → real API, chat survives restarts, works cross-device | Confirmed — chatService.ts is pure localStorage; no chat endpoints exist yet |
| TEAM-01 | Admin endpoints (GET /api/admin/chats, POST /api/admin/team/invite), team_id FK on User, invite flow | Confirmed — no admin router exists; team_id and invite table must be added |
</phase_requirements>

---

## Summary

Phase 9 converts ArthaBuild from a single-user localStorage-only app into a multi-user team platform. Three independent areas of work run in parallel: (1) adding `role`/`team_id` to the User model and extending JWT, (2) replacing localStorage chat with DB-backed chat endpoints, and (3) building the admin panel and user dashboard UIs.

The codebase is very well structured for this work. Auth patterns (`get_current_user_id`, `decode_token`, `HTTPBearer`) are established in `auth_utils.py`. The Alembic migration chain is clean (`55f7c14b391d` → `a1b2c3d4e5f6` → `12fa982ac6c3`). SQLAlchemy async session via `get_db()` Depends is consistent across all routers. Migrations always use `render_as_batch=True` for SQLite ALTER TABLE.

The frontend has no admin route, no dashboard route, and no chat API calls — only localStorage. The `User` type in TypeScript has no `role` field; `authService.ts` stores `user_type` as `"Administrator"` hardcoded. Chat history lives entirely in `chatService.ts` via `localStorage.getItem("arthalight_chats_v1")`.

**Primary recommendation:** Run three PLAN files in this phase — 09-01 (DB migration + RBAC backend), 09-02 (chat persistence backend + frontend wiring), 09-03 (dashboard + admin panel UI). Each plan is independently executable with its own smoke tests.

---

## Standard Stack

### Core (already installed — no new packages needed)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| PyJWT | installed | JWT encode/decode with role claims | CLAUDE.md frozen: PyJWT only, never python-jose |
| SQLAlchemy async | 2.0.35 | ORM for ChatSession, ChatMessage | Established pattern in all routers |
| aiosqlite | installed | Async SQLite driver | BYOC SQLite deployment |
| Alembic | installed | DB migrations for new tables | All migrations use render_as_batch=True |
| FastAPI HTTPBearer | installed | Token extraction from Authorization header | Used in `get_current_user_id` already |
| passlib[bcrypt] | installed | Password hashing (not touched in this phase) | Existing |

### Frontend (no new packages needed)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| React Router | installed | `/dashboard`, `/admin` routes | Already handles Protected wrapper |
| Lucide React | installed | Admin panel icons | Already used throughout Sidebar, Chat |
| Tailwind CSS | installed | Admin layout styling | Established project style |

### New Python packages needed
None. All required libraries are already in requirements.txt.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/backend/
├── models.py              # ADD: role enum, team_id FK, ChatSession, ChatMessage, TeamInvite
├── auth_utils.py          # ADD: require_admin(), require_user() Depends functions
├── routers/
│   ├── chats.py           # NEW: POST /api/chats, GET /api/chats, GET /api/chats/{id}/messages, DELETE
│   └── admin.py           # NEW: GET /api/admin/chats, GET /api/admin/team, POST /api/admin/team/invite
├── alembic/versions/
│   └── XXXX_phase9_rbac_chat.py  # NEW: single migration for all Phase 9 model changes
└── schemas.py             # ADD: ChatSessionSchema, ChatMessageSchema, InviteRequest

src/frontend/src/
├── pages/
│   ├── Dashboard.tsx      # NEW: post-login landing page, chat history preview, quick actions
│   └── AdminPanel.tsx     # NEW: /admin route — team members, all team chats, invite flow
├── services/
│   └── chatService.ts     # REWRITE: localStorage → real API calls via api.ts
├── hooks/
│   └── useChat.ts         # UPDATE: adapt to async API instead of localStorage
├── types/
│   └── user.ts            # UPDATE: add role: "admin" | "user" field
└── routes.tsx             # ADD: /dashboard route, /admin route (admin-only Protected)
```

### Pattern 1: RBAC Depends (port from Dollor.ai auth_utils pattern)

**What:** FastAPI dependency functions that gate endpoints by role.
**When to use:** Any endpoint that requires admin-only or authenticated-user access.

```python
# auth_utils.py — extend existing get_current_user_id pattern

from models import User
from database import get_db

async def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Returns the full User ORM object. Raises 401 if not authenticated."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials, "access")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    """Returns user only if role == 'admin'. Raises 403 otherwise."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

### Pattern 2: Role in JWT claims

**What:** Add `role` claim to JWT payload so frontend can make routing decisions without an extra API call.
**When to use:** `create_access_token()` — add role to payload.

```python
# auth_utils.py — update create_access_token
def create_access_token(user_id: int, role: str = "user") -> str:
    payload = {
        "sub": str(user_id),
        "role": role,           # NEW: include role in claim
        "token_type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
```

IMPORTANT: The frozen interface in CLAUDE.md says `sub = str(user_id)`. Adding `role` is additive and non-breaking. But the `TokenResponse` schema and the login endpoint must also return `role` so the frontend can store it.

### Pattern 3: Chat persistence DB schema

**What:** Two new tables — `chat_sessions` (one per chat thread) and `chat_messages` (individual messages).
**When to use:** Every message send + every history load.

```python
# models.py additions
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    # ADD these columns (requires Alembic migration with batch_alter_table):
    role = Column(String, default="user", nullable=False)   # "admin" or "user"
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TeamInvite(Base):
    __tablename__ = "team_invites"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    email = Column(String, nullable=False)          # invitee email
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, unique=True, nullable=False)  # SHA-256 of raw invite token
    accepted = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False, default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)     # "user" or "assistant"
    content = Column(String, nullable=False)
    intent = Column(String, nullable=True)    # from AI response
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Pattern 4: Alembic migration for SQLite ALTER TABLE

**What:** SQLite does not support `ALTER TABLE ADD COLUMN` with FK — use `batch_alter_table`.
**When to use:** Any time new columns are added to existing tables (User here).

```python
# alembic migration — new revision chained from 12fa982ac6c3
def upgrade() -> None:
    # 1. Add Teams table first (users FK depends on it)
    op.create_table('teams', ...)

    # 2. Alter users table — MUST use batch_alter_table for SQLite
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(), nullable=False, server_default='user'))
        batch_op.add_column(sa.Column('team_id', sa.Integer(), sa.ForeignKey('teams.id'), nullable=True))

    # 3. New tables
    op.create_table('team_invites', ...)
    op.create_table('chat_sessions', ...)
    op.create_table('chat_messages', ...)
```

### Pattern 5: Chat API endpoints

**What:** Standard CRUD for chat sessions, plus message append.
**When to use:** All chat operations from frontend.

```
POST   /api/chats                          → create new ChatSession, return {id, title, created_at}
GET    /api/chats                          → list user's own ChatSessions (sorted by updated_at desc)
GET    /api/chats/{session_id}/messages    → all messages in a session
PATCH  /api/chats/{session_id}             → rename title
DELETE /api/chats/{session_id}             → delete session + cascade messages

# Admin-only:
GET    /api/admin/chats                    → all ChatSessions for all team members
GET    /api/admin/team                     → list all team members (user_id, name, email, role)
POST   /api/admin/team/invite              → create TeamInvite, send email with accept link
DELETE /api/admin/team/{user_id}           → remove user from team (set team_id=null or deactivate)
```

### Pattern 6: /api/chatbot/process saves to DB

**What:** After generating AI response, save both user message and assistant message to chat_messages.
**When to use:** Modify rawapi.py `ask()` endpoint to accept `chat_session_id` and persist.

Current flow: `rawapi.py ask()` → in-memory `chat_sessions` dict
Required flow: `rawapi.py ask()` → in-memory dict (keep for RAG context) + async write to `chat_messages`

The endpoint already uses `request: Request` (not a Depends-based route), so RBAC must be added inline using `get_current_user_id` directly from the Bearer header.

### Pattern 7: Frontend chat session ID handling

**What:** Chat.tsx currently uses obfuscated localStorage IDs (via `encodeId`/`decodeId`). After migration, the ID comes from the DB (integer). The URL pattern `/chat/:token` where `token = encodeId(chat_id)` should be preserved but `chat_id` becomes a DB integer.

**When to use:** chatService.ts rewrite — all `chatService.create()`, `chatService.list()`, `chatService.addMessage()` become fetch() calls.

```typescript
// chatService.ts — new DB-backed implementation (replace localStorage version)
export async function listChats(): Promise<Chat[]> {
  const resp = await fetch("/api/chats", { headers: authHeaders() });
  if (!resp.ok) throw new Error("Failed to load chats");
  return resp.json();
}

export async function createChatSession(title = "New Chat"): Promise<Chat> {
  const resp = await fetch("/api/chats", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!resp.ok) throw new Error("Failed to create chat");
  return resp.json();
}
```

### Pattern 8: Admin-only route guard (React)

**What:** A `Protected` component variant that checks `user.role === "admin"`.
**When to use:** `/admin` route in routes.tsx.

```tsx
// routes.tsx — add AdminProtected
function AdminProtected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/log-in" replace />;
  if (user.role !== "admin") return <Navigate to="/chat/new" replace />;
  return children;
}

// routes.tsx additions:
<Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
<Route path="/admin" element={<AdminProtected><AdminPanel /></AdminProtected>} />
<Route path="/admin/*" element={<AdminProtected><AdminPanel /></AdminProtected>} />
```

### Pattern 9: First-user-is-admin rule

**What:** When a new deployment has zero users, the first registrant becomes `role="admin"` automatically and creates the team.
**When to use:** `routers/user.py register()` — check user count before insert.

```python
# user.py register() — after duplicate email check
count_result = await db.execute(select(func.count()).select_from(User))
user_count = count_result.scalar()

if user_count == 0:
    # First user: create default team and set admin role
    team = Team(name=data.organization or "My Team")
    db.add(team)
    await db.flush()  # get team.id
    role = "admin"
    team_id = team.id
else:
    role = "user"
    team_id = None  # assigned when accepting invite
```

### Anti-Patterns to Avoid

- **Checking role from localStorage only:** Role must come from JWT claims (decode on backend), not just the stored `user_type` string. The frontend can use the stored role for UI routing, but backend must always re-verify from token.
- **Storing TBA credentials in ChatMessage content:** Never. NetSuite session credentials must never appear in any logged or stored data.
- **Using `defaultdict(list)` chat_sessions for persistence:** The existing in-memory `chat_sessions` dict in rawapi.py is for LLM context window only. DB persistence is separate and additive.
- **Rewriting useChat.ts from scratch:** The hook has important UI logic (auto-title, grouped chats, starred filter). Only replace the data source (localStorage → API calls), not the hook structure.
- **Blocking startup on DB chat count for first-user logic:** Use async count query in the register endpoint, not in startup validation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin role check | Custom middleware | FastAPI `Depends(require_admin)` | Composable, testable, matches existing pattern |
| JWT role extraction | Re-decode in each route | `require_user()` Depends returns full User ORM | Role is in User.role, not just JWT claim |
| Chat session UUID | Custom random ID | SQLite auto-increment PK | Already using int PKs everywhere; encodeId handles obfuscation |
| Invite token | Custom hash scheme | Same pattern as `PasswordResetToken`: `secrets.token_urlsafe(32)` + SHA-256 hash | Consistent, already tested |
| Team isolation | Custom query filter | SQLAlchemy `WHERE user_id = current_user.id` on all chat queries | Simple, correct, auditable |

---

## Common Pitfalls

### Pitfall 1: SQLite ALTER TABLE fails without batch_alter_table
**What goes wrong:** `op.add_column('users', ...)` raises `OperationalError` because SQLite does not support ALTER TABLE for columns with FK constraints or NOT NULL.
**Why it happens:** Alembic's default ALTER TABLE uses native SQL — SQLite requires the table-copy approach.
**How to avoid:** Always wrap User table changes in `with op.batch_alter_table('users') as batch_op:`. Confirmed by every prior migration in this project (all use batch_alter).
**Warning signs:** `OperationalError: Cannot add a NOT NULL column with default value NULL` during `alembic upgrade head`.

### Pitfall 2: TokenResponse frozen interface — adding role breaks frontend
**What goes wrong:** The login response schema is a FROZEN INTERFACE (CLAUDE.md). Planner must add `role` to `TokenResponse` but must not rename or remove existing fields (`access_token`, `refresh_token`, `token_type`, `first_name`, `last_name`, `email`, `user_type`).
**Why it happens:** `authService.ts` reads `data.first_name`, `data.last_name` etc. directly. Adding `role` is safe (additive); renaming is not.
**How to avoid:** Add `role: str = "user"` to `TokenResponse` schema and map it from `user.role`. Also update `authService.ts` to store `role` alongside other user fields.
**Warning signs:** Frontend stores `user_type = "Administrator"` hardcoded — this must be replaced with the real DB role.

### Pitfall 3: chat_sessions in-memory dict and DB get out of sync
**What goes wrong:** rawapi.py uses `chat_sessions[session_id]` (in-memory) for LLM conversation context. If Phase 9 only writes to DB without maintaining the in-memory dict, the RAG pipeline loses conversation context.
**Why it happens:** Two separate "session" concepts: LLM context (in-memory) vs chat history (DB).
**How to avoid:** Keep the `chat_sessions` dict as-is for LLM context. Add DB writes as a side-effect AFTER the in-memory append. The `session_id` in the chatbot endpoint should map to the DB `ChatSession.id` (as a string/int).
**Warning signs:** "What did I ask before?" test (TC-CHAT-13) fails even after Phase 9 if in-memory dict is removed.

### Pitfall 4: First user doesn't get admin role — no one can manage team
**What goes wrong:** If all users register as `role="user"`, no one can invite team members. The admin panel is unreachable.
**Why it happens:** Register endpoint doesn't check user count.
**How to avoid:** Check `SELECT COUNT(*) FROM users` in the register endpoint — first user becomes admin and creates the default team.
**Warning signs:** Fresh deployment, registered user, no path to admin panel.

### Pitfall 5: User type stored in frontend as "Administrator" hardcoded
**What goes wrong:** `authService.ts` line 77: `role: data.user_type || "Administrator"` — this means every user shows as Administrator regardless of DB role. The admin panel would allow all users.
**Why it happens:** `TokenResponse` had a placeholder `user_type = "Administrator"` field added in Phase 1.
**How to avoid:** Update both backend (`TokenResponse` to include `role` from DB) and frontend (`authService.ts` to store `role` from JWT/response, not hardcoded "Administrator").
**Warning signs:** All logged-in users can reach `/admin` because `user.role === "Administrator"` passes any check.

### Pitfall 6: encodeId/decodeId with DB integer IDs
**What goes wrong:** `encodeId` in `src/lib/crypto.ts` currently encodes localStorage string IDs like `"chat-abc123"`. After switching to DB integer IDs, the encoding must handle integers. The URL format `/chat/:token` where `token = encodeId(String(dbId))` needs to be consistent.
**Why it happens:** Old IDs were random strings; new IDs are sequential integers.
**How to avoid:** Pass `String(dbChatSession.id)` to `encodeId()` — it already accepts strings. On decode, convert back to int for DB query.
**Warning signs:** `decodeId(token)` returns a string like "5"; `chatService.getById("5")` does a string comparison on DB integer IDs.

### Pitfall 7: conftest.py must add ChatSession/ChatMessage models to Base.metadata
**What goes wrong:** `create_tables` fixture in conftest.py calls `Base.metadata.create_all` — this only creates tables that have been imported. If the new models aren't imported, the test DB has no chat tables.
**Why it happens:** Python ORM models must be imported (side-effect of class definition registers with Base) before metadata.create_all runs.
**How to avoid:** Add `from models import ChatSession, ChatMessage, Team, TeamInvite` to conftest.py imports.
**Warning signs:** `sqlite3.OperationalError: no such table: chat_sessions` in tests.

---

## Code Examples

### Example 1: Chat router — create and list sessions
```python
# routers/chats.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import ChatSession, ChatMessage
from auth_utils import require_user
from models import User

router = APIRouter(prefix="/api/chats", tags=["chats"])

@router.post("", status_code=201)
async def create_chat(
    data: dict,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(
        user_id=current_user.id,
        title=data.get("title", "New Chat"),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}

@router.get("")
async def list_chats(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [{"id": s.id, "title": s.title, "updated_at": s.updated_at.isoformat()} for s in sessions]
```

### Example 2: Admin router — list all team chats
```python
# routers/admin.py
@router.get("/chats")
async def admin_list_all_chats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Return all chat sessions for users on the same team
    result = await db.execute(
        select(ChatSession, User.email, User.name)
        .join(User, ChatSession.user_id == User.id)
        .where(User.team_id == admin.team_id)
        .order_by(ChatSession.updated_at.desc())
    )
    rows = result.all()
    return [{"id": s.id, "title": s.title, "user_email": email, "user_name": name} for s, email, name in rows]
```

### Example 3: rawapi.py — add chat_session_id param and DB persist
```python
# rawapi.py ask() — additions
from auth_utils import get_current_user_id

@app.post("/api/chatbot/process")
async def ask(request: Request, db: AsyncSession = Depends(get_db)):
    # Extract user_id from JWT (non-blocking if token missing — keep backward compat)
    user_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from auth_utils import decode_token
            payload = decode_token(auth_header[7:], "access")
            user_id = int(payload["sub"])
        except Exception:
            pass

    data = await request.json()
    chat_session_id = data.get("chat_session_id")  # DB ChatSession.id (new field)
    # ... existing logic ...

    # After getting response_text:
    if user_id and chat_session_id:
        from models import ChatMessage
        db.add(ChatMessage(session_id=chat_session_id, role="user", content=user_input))
        db.add(ChatMessage(session_id=chat_session_id, role="assistant", content=response_text, intent=intent))
        # Also update session updated_at
        await db.execute(
            update(ChatSession).where(ChatSession.id == chat_session_id).values(updated_at=func.now())
        )
        await db.commit()
```

### Example 4: TypeScript User type update
```typescript
// types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";   // ADD this
  avatar?: string;
}
```

### Example 5: authService.ts — store role from login response
```typescript
// authService.ts login() — update user object construction
const user = {
  name: data.first_name + " " + data.last_name,
  first_name: data.first_name,
  last_name: data.last_name,
  role: data.role || "user",    // CHANGE: was data.user_type || "Administrator"
  email: data.email,
};
```

---

## Current State Inventory (CRITICAL for Planner)

### Backend — what exists
| File | Relevant State |
|------|---------------|
| `models.py` | `User` has: id, name, first_name, last_name, email, organization, password_hash, is_active, is_verified, failed_attempts, locked_until, created_at. NO role, NO team_id. |
| `auth_utils.py` | Has: `get_current_user_id` (returns int from Bearer JWT), `decode_token`, `create_access_token(user_id: int)`. NO role param. NO require_admin/require_user. |
| `schemas.py` | `TokenResponse` has: access_token, refresh_token, token_type="bearer", first_name, last_name, email, user_type="Administrator" (HARDCODED). |
| `routers/auth.py` | Login calls `create_access_token(user.id)` — no role passed. Returns `TokenResponse` with hardcoded user_type. |
| `rawapi.py` | `/api/chatbot/process` uses `request: Request` (no Depends). Has in-memory `chat_sessions` dict. No RBAC check. No DB write for messages. |
| Alembic head | `12fa982ac6c3` (license_cache + script_deployments). Next migration chains from this. |

### Frontend — what exists
| File | Relevant State |
|------|---------------|
| `chatService.ts` | All operations use `localStorage.getItem("arthalight_chats_v1")`. The `chatService` object (list/getById/create/addMessage/updateTitle/remove) all operate on localStorage. No API calls for chat CRUD. |
| `useChat.ts` | Uses `fetchChats()`, `createChat()`, `saveChat()`, `deleteChat()` — all localStorage. |
| `api.ts` | Has `sendChatMessage()` for POST /api/chatbot/process only. Has `getAccessToken()` / `setAccessToken()`. Has `authHeaders()` helper. No chat CRUD API calls. |
| `authService.ts` | Stores `role: data.user_type || "Administrator"` — hardcoded "Administrator" fallback. |
| `types/user.ts` | `interface User { id, name, email, avatar? }` — NO role field. |
| `routes.tsx` | Routes: `/`, `/log-in`, `/log-in/password`, `/forgot-password`, `/reset-password/:token`, `/reset-success`, `/reset-failed`, `/create-account`, `/signup-success`, `/chat/new`, `/chat/:token`, `/history`, `/profile`, `/privacy`, `/terms`. NO `/dashboard`, NO `/admin`. |
| `Sidebar.tsx` | Shows user name/email from `useAuth()`. Has logout. Links to `/upgrade` and `/settings` (both 404 currently). No admin link. |
| `Protected` component | Only checks `if (!user)`. No role check. |

---

## Frozen Interfaces (DO NOT BREAK)

From CLAUDE.md — these must remain intact:

| Interface | Current Value | Phase 9 Change |
|-----------|--------------|----------------|
| JWT sub | `str(user_id)` | Unchanged |
| Login response | `{access_token, refresh_token, token_type:"bearer", first_name, last_name, email, user_type}` | ADD `role` field; keep all existing fields |
| Backend port | `8000` | Unchanged |
| Token storage (client) | memory only — never localStorage | Unchanged (access token stays in-memory) |
| POST /api/chatbot/process request body | `{message, session_id}` | ADD optional `chat_session_id` (new DB field); existing `session_id` stays for LLM context |

---

## Open Questions

1. **Invite flow — email required?**
   - What we know: Phase 11 handles email template upgrades. Phase 9 needs invite to work.
   - What's unclear: Should invite email be plain-text (like Phase 1 reset email) or deferred until Phase 11?
   - Recommendation: Use the existing `email_utils.py` pattern (plain-text + SUPPRESS_SEND fallback) — do not block on styled templates. Flag as "upgrade in Phase 11."

2. **Dashboard route — replace `/chat/new` or separate `/dashboard`?**
   - What we know: CONTEXT.md says "post-login landing page." Currently `/chat/new` is the post-login destination.
   - What's unclear: Should login redirect to `/dashboard` instead of `/chat/new`?
   - Recommendation: Add `/dashboard` as a new route. Update `authService.ts` login redirect to `/dashboard`. Dashboard shows recent chats + "New Chat" button that navigates to `/chat/new`.

3. **Team membership model — single team per deployment?**
   - What we know: BYOC deployment = single customer. The roadmap says "admin manages users within their ArthaBuild deployment."
   - What's unclear: Does every user belong to the same team, or can there be sub-teams?
   - Recommendation: Single team per deployment. First user creates the default team; all invited users join that team. `team_id` on User references the one team record. Keep it simple — sub-teams are Phase 12+ territory.

4. **Token blacklist for logout — in-memory or DB?**
   - What we know: CLAUDE.md says "token blacklist (jti) for logout" — this is in the roadmap description for Phase 9.
   - What's unclear: Implementation approach.
   - Recommendation: In-memory set (Python `set()` in rawapi.py) for Phase 9. This is simple and correct for single-process Docker deployments. A DB table adds complexity and is only needed for multi-process horizontal scaling (Phase 12+). Add a `jti` (UUID) claim to JWT and check against the blacklist set on every authenticated request.

---

## Plan Structure Recommendation

Phase 9 should have 3 PLAN files:

**09-01-PLAN.md: DB Migration + RBAC Backend**
- New Alembic migration: Team, ChatSession, ChatMessage, TeamInvite tables + role/team_id on User
- `auth_utils.py`: add `require_user()`, `require_admin()`, update `create_access_token(role)`, add jti+blacklist
- `schemas.py`: add `role` to `TokenResponse`
- `routers/auth.py`: pass `user.role` to `create_access_token`
- `routers/user.py`: first-user-is-admin logic
- `routers/chats.py`: all chat CRUD endpoints
- `routers/admin.py`: admin-only endpoints
- `rawapi.py`: include new routers, add `chat_session_id` to chatbot endpoint
- Smoke tests: 59+ → 80+ (add RBAC + chat API tests)

**09-02-PLAN.md: Frontend Chat Persistence + Auth Role Wiring**
- `types/user.ts`: add `role` field
- `authService.ts`: store real `role` from login response, update login redirect to `/dashboard`
- `chatService.ts`: replace localStorage with real API calls
- `useChat.ts`: adapt to async API (add loading states)
- `api.ts`: add chat CRUD functions (listChats, createChatSession, deleteChatSession, renameChatSession)
- `Chat.tsx`: pass `chat_session_id` to `sendChatMessage`
- `routes.tsx`: add `/dashboard` route
- `Dashboard.tsx`: new page — recent chats list + quick actions
- `Sidebar.tsx`: render chats from API state instead of localStorage; add admin link if `user.role === "admin"`

**09-03-PLAN.md: Admin Panel UI**
- `routes.tsx`: add `/admin` route with `AdminProtected`
- `AdminPanel.tsx`: full admin UI — team members table, invite form, all team chats list
- Invite flow: form → `POST /api/admin/team/invite` → confirmation message
- Team members: `GET /api/admin/team` → table with role badges, remove action
- All team chats: `GET /api/admin/chats` → list with user attribution
- Architecture + test-report HTML updates

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `/src/backend/models.py` — exact User model fields, no role/team_id
- `/src/backend/auth_utils.py` — JWT patterns, existing Depends structure
- `/src/backend/schemas.py` — TokenResponse frozen interface, user_type hardcode
- `/src/backend/routers/auth.py` — login endpoint, create_access_token call
- `/src/backend/rawapi.py` — chatbot endpoint structure, in-memory session dict
- `/src/backend/alembic/versions/` — all 3 migrations, render_as_batch pattern confirmed
- `/src/backend/tests/conftest.py` — test patterns, fixture structure
- `/src/frontend/src/services/chatService.ts` — full localStorage implementation
- `/src/frontend/src/services/authService.ts` — hardcoded "Administrator" role
- `/src/frontend/src/types/user.ts` — no role field
- `/src/frontend/src/routes.tsx` — no /admin or /dashboard routes
- `/src/frontend/src/hooks/useChat.ts` — localStorage-based hook
- `/src/frontend/src/components/Sidebar.tsx` — user display, no role-based nav
- `CLAUDE.md` — frozen interfaces, mandatory rules
- `CONTEXT.md` — user decisions (dashboard + admin panel in Phase 9)
- `STATE.md` — execution order, previous decisions
- `ROADMAP.md` — Phase 9 description

### Secondary (MEDIUM confidence)
- Dollor.ai auth_utils.py pattern (referenced in ROADMAP.md) — confirmed Depends-based RBAC approach is appropriate for FastAPI

---

## Metadata

**Confidence breakdown:**
- Current model state: HIGH — read directly from models.py
- Alembic migration pattern: HIGH — confirmed render_as_batch in all 3 existing migrations
- Frontend localStorage → API migration: HIGH — chatService.ts fully inspected
- Frozen interface impact: HIGH — TokenResponse and login flow fully traced
- Admin UI design: MEDIUM — BrandMonkz pattern referenced but not inspected

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable codebase, no fast-moving deps)
