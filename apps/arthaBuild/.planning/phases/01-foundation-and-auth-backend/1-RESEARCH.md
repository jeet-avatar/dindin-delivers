# Phase 1: Foundation & Auth Backend - Research

**Researched:** 2026-04-07
**Domain:** FastAPI authentication — JWT, bcrypt, SQLite/SQLAlchemy, Alembic, rate limiting, SMTP email
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-AUTH-01 | User registration: name, email, org, password → bcrypt hash, verification email, no duplicate email | passlib CryptContext (rounds=12) pattern; fastapi-mail 1.6.2 for email; SQLAlchemy unique constraint on email |
| FR-AUTH-02 | Email check endpoint: `{ exists: true/false }` — no role/info leakage | Simple DB lookup, always return 200 + bool regardless of result |
| FR-AUTH-03 | Login: JWT access (24hr) + refresh (7d); 5-attempt lockout (15 min); no email enumeration | PyJWT 2.12.1 HS256; lockout via failed_attempts + locked_until columns on User model |
| FR-AUTH-04 | Forgot password: same 200 response whether email exists or not; 1hr reset token | Store hashed token in password_reset_tokens table; always return 200 |
| FR-AUTH-05 | Reset password: validate token (not expired, not used); enforce password policy | Mark token used=True on success; validate policy before hashing |
| FR-AUTH-06 | JWT refresh: valid refresh token → new access token; expired → 401 | Separate token_type claim in payload to prevent access tokens being used as refresh tokens |
</phase_requirements>

---

## Summary

Phase 1 builds all auth infrastructure from scratch on an existing FastAPI app (`rawapi.py`) that currently has zero auth endpoints. The frontend auth pages (Login, Register, ForgotPassword, ResetPassword) are already complete and call specific endpoints — the task is purely to implement the backend to match those contracts.

The stack is fully prescribed: PyJWT (not python-jose — which is abandoned), passlib with bcrypt rounds=12, SQLAlchemy 2.0 async with aiosqlite, Alembic for migrations, fastapi-mail 1.6.2 for SMTP, and SlowAPI for rate limiting. The auth module must be structured as a separate `APIRouter` and wired into the existing `rawapi.py` via `app.include_router()` — no modification to the existing chatbot routes.

The biggest architectural decision is reset token storage: use a dedicated `password_reset_tokens` database table (not in-memory, not JWT-only) to support one-time-use enforcement. Account lockout tracking is done via `failed_attempts` + `locked_until` columns directly on the User model to avoid a separate table. The port fix (8080 → 8000 in `VITE_API_URL`) and removal of hardcoded OpenAI keys are also part of this phase.

**Primary recommendation:** Implement auth as `src/backend/routers/auth.py` with `APIRouter(prefix="/api/auth")`, wire it into `rawapi.py` with `app.include_router()`, use PyJWT 2.12.1 (not python-jose), and store reset tokens in a dedicated DB table.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PyJWT | 2.12.1 | JWT encode/decode (HS256) | FastAPI official docs now use PyJWT; python-jose is abandoned (last release 3yr ago, 8 security warnings) |
| passlib[bcrypt] | 1.7.4 | Password hashing with bcrypt | CryptContext API; `rounds=12` enforces OWASP minimum; `deprecated="auto"` handles hash upgrades |
| SQLAlchemy | 2.0+ | ORM + async engine | Industry standard; `create_async_engine` with aiosqlite for non-blocking DB ops |
| aiosqlite | 0.20+ | Async SQLite driver | Required by SQLAlchemy async when using SQLite; `sqlite+aiosqlite:///` URL scheme |
| alembic | 1.13+ | DB schema migrations | Use `render_as_batch=True` for SQLite (required for ALTER TABLE operations) |
| fastapi-mail | 1.6.2 | SMTP email sending | Latest stable (Feb 2026); ConnectionConfig + FastMail + MessageSchema pattern |
| slowapi | 0.1.9 | Per-endpoint rate limiting | Port of Flask-Limiter for Starlette/FastAPI; `@limiter.limit("10/minute")` decorator |
| python-dotenv | 1.0+ | .env config loading | `load_dotenv()` at app startup; all secrets via env vars |
| python-multipart | latest | Form data parsing | Required by FastAPI for OAuth2PasswordRequestForm |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pydantic | v2 (bundled with FastAPI) | Request/response validation | Define schemas for register, login, token response |
| secrets (stdlib) | stdlib | Cryptographically secure random tokens | Generate reset tokens with `secrets.token_urlsafe(32)` |
| hashlib (stdlib) | stdlib | Hash reset tokens before DB storage | Store SHA-256 of the token, not plaintext |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PyJWT | python-jose | python-jose abandoned; PyJWT is FastAPI's current official recommendation |
| passlib | pwdlib | pwdlib is newer but lacks legacy algorithm support; passlib fine for new greenfield project |
| SlowAPI | fastapi-limiter | fastapi-limiter requires Redis; SlowAPI supports in-memory (no Redis needed for single-server VPC deployment) |
| DB reset token table | JWT as reset token | JWT approach can't enforce one-time use without a denylist; DB table is simpler and explicit |

**Installation:**
```bash
pip install PyJWT passlib[bcrypt] sqlalchemy aiosqlite alembic fastapi-mail slowapi python-dotenv python-multipart
```

---

## Architecture Patterns

### Recommended Project Structure
```
pythonn_backend/
├── rawapi.py              # Existing entry point — ADD include_router() here only
├── database.py            # NEW: async engine, session, Base
├── models.py              # NEW: User, PasswordResetToken SQLAlchemy models
├── schemas.py             # NEW: Pydantic request/response schemas
├── auth_utils.py          # NEW: JWT create/decode, password hash/verify, deps
├── routers/
│   └── auth.py            # NEW: All auth endpoints as APIRouter
├── .env                   # New: JWT_SECRET_KEY, SMTP_*, etc.
├── alembic.ini            # Generated by: alembic init alembic
└── alembic/
    ├── env.py             # Modified to import Base.metadata
    └── versions/
        └── 0001_create_users.py
```

### Pattern 1: Async SQLAlchemy Engine + Session Dependency

**What:** Create a single async engine and sessionmaker at module level; expose as a FastAPI dependency.
**When to use:** Every database operation in every endpoint.

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./arthaBuild.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

**Critical:** `expire_on_commit=False` is required for async sessions per SQLAlchemy docs — without it, accessing attributes after commit raises `MissingGreenlet` errors.

### Pattern 2: User Model with Lockout Fields

**What:** All lockout state on the User row — no separate table needed.
**When to use:** Single-tenant SQLite deployment; lockout doesn't need complex querying.

```python
# models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    organization = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)  # SHA-256 of the raw token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Pattern 3: PyJWT Token Creation/Verification

**What:** Create access and refresh tokens with distinct `token_type` claims to prevent one being used as the other.
**When to use:** Login endpoint (create both), refresh endpoint (verify refresh, create new access).

```python
# auth_utils.py
import jwt
from datetime import datetime, timedelta, timezone
import os

SECRET_KEY = os.environ["JWT_SECRET_KEY"]  # Fail at startup if missing
ALGORITHM = "HS256"

def create_access_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "token_type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "token_type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str, expected_type: str) -> dict:
    """Raises jwt.InvalidTokenError on failure."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("token_type") != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload
```

### Pattern 4: passlib CryptContext for bcrypt

```python
# auth_utils.py (continued)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### Pattern 5: SlowAPI Rate Limiting

**What:** Apply `@limiter.limit("10/minute")` per endpoint using client IP as key.
**When to use:** All `/api/auth/*` endpoints.
**Critical:** The endpoint must accept `request: Request` as a parameter — SlowAPI hooks into it.

```python
# In rawapi.py (main app setup)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# In routers/auth.py
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...
```

**Important:** The `limiter` instance used in the router must match the one attached to `app.state.limiter`. The cleanest approach: define limiter in a shared `auth_utils.py` or `dependencies.py` and import it in both `rawapi.py` and `routers/auth.py`.

### Pattern 6: Integrate Auth Router into Existing rawapi.py

**What:** Single `app.include_router()` call with prefix — zero changes to existing chatbot routes.
**When to use:** This is the only change needed to `rawapi.py` for auth wiring.

```python
# In rawapi.py — ADD these lines only
from routers.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
```

The frontend calls these exact paths:
- `POST /api/auth/login`
- `POST /api/auth/check-user`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/refresh`

And registration at `POST /api/user/register` — this requires a separate router or adding it directly.

### Pattern 7: fastapi-mail SMTP Configuration

```python
# email_utils.py
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
import os

mail_conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("SMTP_USER", ""),
    MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", ""),
    MAIL_FROM=os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "")),
    MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
    MAIL_SERVER=os.getenv("SMTP_HOST", ""),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    SUPPRESS_SEND=not bool(os.getenv("SMTP_HOST")),  # Suppress if no SMTP configured
)
fm = FastMail(mail_conf)

async def send_reset_email(to_email: str, reset_link: str):
    message = MessageSchema(
        subject="Reset your ArthaBuild password",
        recipients=[to_email],
        body=f"Click to reset your password (valid 1 hour): {reset_link}",
        subtype=MessageType.plain,
    )
    await fm.send_message(message)
```

**Key:** Set `SUPPRESS_SEND=True` when `SMTP_HOST` is not configured. This makes the forgot-password endpoint non-fatal if SMTP isn't set up yet — requirement `FR-DEPLOY-02` states invalid SMTP config should be a startup warning, not fatal.

### Pattern 8: Reset Token — One-Time Use via DB

**What:** Generate a random token, store SHA-256 hash in DB, return raw token in URL. On reset, look up hash, check expiry, mark used.

```python
import secrets, hashlib
from datetime import datetime, timedelta, timezone

def generate_reset_token() -> tuple[str, str]:
    """Returns (raw_token_for_email, hash_for_db)"""
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed

def get_reset_link(base_url: str, raw_token: str) -> str:
    return f"{base_url}/reset-password?token={raw_token}"
```

On reset: `SELECT * FROM password_reset_tokens WHERE token_hash = sha256(submitted_token) AND used = false AND expires_at > now()`. If found, update password, set `used = True`.

### Pattern 9: Password Policy Validation

```python
import re

def validate_password(password: str) -> str | None:
    """Returns error message or None if valid."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "Password must contain at least one special character"
    return None
```

### Pattern 10: Account Lockout Check

```python
from datetime import datetime, timezone

def check_lockout(user: User) -> bool:
    """Returns True if account is currently locked."""
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        return True
    return False

async def record_failed_attempt(db: AsyncSession, user: User):
    user.failed_attempts += 1
    if user.failed_attempts >= 5:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.commit()

async def reset_failed_attempts(db: AsyncSession, user: User):
    user.failed_attempts = 0
    user.locked_until = None
    await db.commit()
```

### Pattern 11: Alembic SQLite Setup

**Critical SQLite-specific config in `alembic/env.py`:**
```python
# Use render_as_batch=True — REQUIRED for SQLite ALTER TABLE
context.configure(
    connection=connection,
    target_metadata=target_metadata,
    render_as_batch=True,  # <-- CRITICAL for SQLite
)
```

**alembic.ini:** Set `sqlalchemy.url = sqlite:///./arthaBuild.db` (sync URL, not async — Alembic runs synchronously even if app is async).

Initialize: `alembic init alembic`, then update `env.py` to import `Base` from `database.py`.

### Anti-Patterns to Avoid

- **Using `python-jose`:** Abandoned library with 8 security warnings. Use PyJWT.
- **Using `Base.metadata.create_all()` instead of Alembic:** Bypasses migration history; use `alembic upgrade head` always.
- **Storing raw reset token in DB:** Always store SHA-256 hash; return raw token to user only once in email.
- **Reusing access token as refresh token:** Always check `token_type` claim — prevent tokens being used for wrong purpose.
- **Exposing email enumeration in login/forgot-password:** Always return the same response regardless of whether email exists.
- **Blocking startup if SMTP not configured:** Per FR-DEPLOY-02, SMTP failure is a warning, not fatal. Use `SUPPRESS_SEND` flag.
- **Modifying existing chatbot routes in rawapi.py:** Only add `include_router()` and startup validation — don't touch existing code.
- **Sharing mutable state between requests for lockout:** Track lockout in DB, not in-memory dict (wouldn't survive restart and has race conditions).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| bcrypt hashing | Custom hash function | `passlib.CryptContext` | Timing-safe comparison, hash upgrade support, salt generation |
| JWT sign/verify | Custom token format | `PyJWT` | Handles exp, iat, nbf claims; algorithm confusion prevention |
| Rate limiting | Request counter dict | `slowapi` | Thread-safe, supports Redis for multi-instance, handles reset windows |
| Email sending | Raw smtplib | `fastapi-mail` | Async-native, background task support, STARTTLS/SSL handling |
| DB migrations | Altering tables manually | `alembic` | Schema version tracking, `render_as_batch` for SQLite, rollback support |
| Secure random tokens | `random.random()` | `secrets.token_urlsafe(32)` | Cryptographically secure; `random` is NOT safe for security tokens |

**Key insight:** Auth is a domain where subtle bugs (timing attacks, token reuse, enumeration) cause security breaches. Always use battle-tested libraries; never assume "it's simple enough to build ourselves."

---

## Common Pitfalls

### Pitfall 1: MissingGreenlet Error with async SQLAlchemy
**What goes wrong:** `MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here` when accessing model attributes after commit.
**Why it happens:** `expire_on_commit=True` (default) invalidates ORM objects after commit, forcing lazy loads that can't run in async context.
**How to avoid:** Set `expire_on_commit=False` in `async_sessionmaker`.
**Warning signs:** Attribute access on ORM objects after `await db.commit()` raises errors.

### Pitfall 2: Alembic fails on SQLite ALTER TABLE
**What goes wrong:** `OperationalError: table users has no column named X` or migration errors when adding/dropping columns.
**Why it happens:** SQLite doesn't support `ALTER TABLE ADD COLUMN` with constraints, or `DROP COLUMN` in older versions.
**How to avoid:** Always use `render_as_batch=True` in `alembic/env.py`. This causes Alembic to use a copy-insert-drop strategy.
**Warning signs:** Any migration that adds a column with NOT NULL constraint, drops a column, or renames a column will fail without batch mode.

### Pitfall 3: SlowAPI Request Parameter Missing
**What goes wrong:** Rate limiting silently does nothing — all requests go through regardless of limit.
**Why it happens:** SlowAPI hooks into the `request` object; if the endpoint doesn't accept `request: Request`, the limiter can't hook in.
**How to avoid:** Every rate-limited endpoint MUST have `request: Request` as a parameter.
**Warning signs:** No `429` responses even after many rapid requests.

### Pitfall 4: python-jose Import (Wrong Library)
**What goes wrong:** Installing `python-jose` and expecting it to be maintained/secure.
**Why it happens:** Old tutorials and even some FastAPI docs still reference python-jose.
**How to avoid:** Use `import jwt` from `PyJWT`. The API is nearly identical: `jwt.encode()`, `jwt.decode()`, `jwt.exceptions.InvalidTokenError`.
**Warning signs:** `pip install python-jose` — stop and use `pip install PyJWT` instead.

### Pitfall 5: SMTP config makes startup fatal
**What goes wrong:** If customer hasn't configured SMTP, the entire app fails to start.
**Why it happens:** fastapi-mail validates connection on instantiation if `VALIDATE_CERTS=True` and `USE_CREDENTIALS=True`.
**How to avoid:** Use `SUPPRESS_SEND=True` when SMTP env vars are absent. Log a startup warning instead of raising.
**Warning signs:** App crashes on `docker-compose up` with `SMTPAuthenticationError`.

### Pitfall 6: Frontend calls /api/user/register (not /api/auth/register)
**What goes wrong:** Auth router under `/api/auth` prefix misses the registration endpoint.
**Why it happens:** The frontend `authService.ts` calls `POST /api/user/register` (not `/api/auth/register`).
**How to avoid:** Either register the register endpoint under a separate `/api/user` router, OR override the prefix for that single route. Check the frontend service file for exact paths before implementing.
**Warning signs:** Register page returns 404.

### Pitfall 7: Refresh token accepted where access token is expected
**What goes wrong:** Security vulnerability — refresh token used to access protected resources.
**Why it happens:** JWT decode doesn't differentiate token types unless you check explicitly.
**How to avoid:** Include `"token_type": "access"` or `"refresh"` claim in payload and validate it in `decode_token()`.

---

## Code Examples

### Complete database.py

```python
# Source: SQLAlchemy async docs + aiosqlite pattern
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./arthaBuild.db")

engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

### FastAPI Startup Validation (rawapi.py addition)

```python
# Source: REQUIREMENTS.md FR-DEPLOY-02 + TC-DEPLOY-06
import os

@app.on_event("startup")
async def startup_event():
    if not os.getenv("JWT_SECRET_KEY"):
        raise RuntimeError("JWT_SECRET_KEY is required but not set")
    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        import logging
        logging.warning("SMTP_HOST not configured — email features will be disabled")
```

### Auth Router Wiring (rawapi.py addition)

```python
# Source: FastAPI official docs - bigger-applications
from routers.auth import router as auth_router
from routers.user import router as user_router  # for /api/user/register

app.include_router(auth_router)   # prefix already in router: /api/auth
app.include_router(user_router)   # prefix already in router: /api/user
```

### Registration Endpoint Skeleton

```python
# Source: REQUIREMENTS.md FR-AUTH-01
@router.post("/register", status_code=201)
async def register(data: RegisterRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # 1. Validate password policy
    err = validate_password(data.password)
    if err:
        raise HTTPException(400, detail=err)
    # 2. Check duplicate email
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(409, detail="Email already registered")
    # 3. Hash and save
    user = User(name=data.name, email=data.email, organization=data.organization, password_hash=hash_password(data.password))
    db.add(user)
    await db.commit()
    # 4. Send verification email in background
    background_tasks.add_task(send_verification_email, data.email)
    return {"message": "Registration successful. Please check your email."}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| python-jose for JWT | PyJWT 2.12.1 | FastAPI docs updated ~2024 | Drop-in replacement; `import jwt` instead of `from jose import jwt` |
| passlib (old docs) | pwdlib (new FastAPI docs) | ~2024 | passlib still works fine for new projects; pwdlib lacks legacy algorithm support |
| `@app.on_event("startup")` | `lifespan` context manager | FastAPI 0.95+ | Both work; lifespan is the newer pattern but on_event still supported |
| `declarative_base()` function | `DeclarativeBase` class | SQLAlchemy 2.0 | `from sqlalchemy.orm import DeclarativeBase` — class-based is now preferred |

**Deprecated/outdated:**
- `python-jose`: Do NOT use — abandoned, 8 security warnings. FastAPI's own docs removed it.
- `from sqlalchemy.ext.declarative import declarative_base`: Moved to `sqlalchemy.orm` in 2.0.
- `create_engine` for async SQLite: Must use `create_async_engine` with `sqlite+aiosqlite://` URL.

---

## Open Questions

1. **Frontend calls `POST /api/user/register` not `/api/auth/register`**
   - What we know: The `authService.ts` spec says it calls `/api/user/register`
   - What's unclear: Exact frontend service file contents not yet visible (source not extracted)
   - Recommendation: Create a separate `routers/user.py` with `APIRouter(prefix="/api/user")` for the register endpoint, OR verify the actual frontend paths from `authService.ts` once source is extracted

2. **Frontend `VITE_API_URL` file location**
   - What we know: Needs to change from 8080 to 8000; frontend is in `src/frontend/`
   - What's unclear: Is it `.env`, `.env.local`, or hardcoded in `vite.config.ts`?
   - Recommendation: Check `src/frontend/.env` and `src/frontend/.env.local` after extraction

3. **OpenAI key removal scope**
   - What we know: Keys in `model_utils.py`, `finetunedmodelrun.py`, `sdf_utils.py`
   - What's unclear: Are there other files? What replaces the functionality in Phase 1 (full replacement is Phase 3)?
   - Recommendation: Phase 1 task = remove keys from files and replace with `os.getenv("OPENAI_API_KEY", "")` placeholder — actual Ollama replacement is Phase 3

4. **Verification email flow completeness**
   - What we know: FR-AUTH-01 says "sends verification email"
   - What's unclear: Does `/signup-success` redirect mean the token is verified before login is allowed (`is_verified` check on login), or is email verification optional?
   - Recommendation: Implement `is_verified` field but NOT enforce it on login for Phase 1 (simplifies phase; enforcement can be Phase 4/8)

---

## Sources

### Primary (HIGH confidence)
- [FastAPI Official JWT Tutorial](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) — JWT patterns, current PyJWT recommendation confirmed
- [FastAPI Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/) — APIRouter pattern
- [PyJWT 2.12.1 on PyPI](https://pypi.org/project/PyJWT/) — Current version confirmed March 2026
- [fastapi-mail 1.6.2 on PyPI](https://pypi.org/project/fastapi-mail/) — Current version confirmed Feb 2026
- [SlowAPI 0.1.9 on PyPI](https://pypi.org/project/slowapi/) — Current version, rate limit decorator syntax

### Secondary (MEDIUM confidence)
- [GitHub discussion: python-jose abandonment](https://github.com/fastapi/fastapi/discussions/11345) — Community + FastAPI maintainers confirming switch to PyJWT
- [GitHub discussion: passlib maintenance](https://github.com/fastapi/fastapi/discussions/11773) — Context on passlib vs pwdlib
- SQLAlchemy async + aiosqlite pattern — multiple consistent sources (2025-2026 blog posts)
- `render_as_batch=True` Alembic SQLite requirement — multiple tutorial sources agree

### Tertiary (LOW confidence)
- Account lockout via DB columns vs separate table — based on multiple implementation guides, no single authoritative source; verify pattern fits the data model

---

## Metadata

**Confidence breakdown:**
- Standard stack (PyJWT, passlib, SQLAlchemy, aiosqlite, fastapi-mail, slowapi): HIGH — version-confirmed from PyPI, official docs
- Architecture (router separation, lockout in User model, reset token table): HIGH — official FastAPI docs + well-established patterns
- Pitfalls (MissingGreenlet, Alembic batch mode, SlowAPI Request param): HIGH — known documented issues with clear solutions
- Frontend endpoint paths (/api/user/register vs /api/auth/register): MEDIUM — based on description, not verified from actual source files

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (30 days — stable libraries)
