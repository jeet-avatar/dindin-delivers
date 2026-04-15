import jwt
import re
import os
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set — add it to .env before starting the server")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Shared limiter — must be attached to app.state.limiter in rawapi.py
limiter = Limiter(key_func=get_remote_address)

# JTI blacklist — in-memory set for revoked tokens (logout)
_blacklisted_jtis: set[str] = set()


# --- Password utilities ---

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def validate_password(password: str):
    """Returns error string if invalid, None if valid."""
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


# --- JWT utilities ---

def create_access_token(user_id: int, role: str = "user") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "jti": str(uuid.uuid4()),
        "token_type": "access",
        "iat": int(now.timestamp()),  # Phase 13: required for IdleTimeoutMiddleware
        "exp": now + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def blacklist_token(jti: str) -> None:
    """Add a token's JTI to the blacklist (logout/revocation)."""
    _blacklisted_jtis.add(jti)


def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "token_type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: str) -> dict:
    """Decodes and validates token. Raises jwt.InvalidTokenError on failure."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("token_type") != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload


# --- FastAPI dependency: get current user from Bearer token ---

def get_current_user(token: str) -> dict:
    """Decodes access token and returns payload. Raises jwt.InvalidTokenError if invalid."""
    return decode_token(token, "access")


_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> int:
    """
    FastAPI dependency: extract user_id (int) from Bearer JWT.
    Raises 401 HTTPException if token is missing, invalid, or expired.
    Usage: user_id: int = Depends(get_current_user_id)
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials, "access")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(payload["sub"])


from database import get_db
from models import User


async def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
    require_verified: bool = True,
) -> User:
    """
    FastAPI async dependency: returns the authenticated User ORM object.

    Phase 16: Falls back to request.state.api_key_user when no Bearer token is present.
    APIKeyAuthMiddleware injects the resolved user into request.state before this runs,
    so all existing endpoints guarded by Depends(require_user) automatically accept
    X-API-Key requests without any per-endpoint changes.

    Checks JTI blacklist (logout invalidation), user active status, and email verification.
    Usage: current_user: User = Depends(require_user)
    """
    # Phase 16: API key fallback — if middleware resolved a user via X-API-Key, use it directly
    api_key_user = getattr(request.state, "api_key_user", None)
    if api_key_user is not None:
        return api_key_user

    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials, "access")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    jti = payload.get("jti")
    if jti and jti in _blacklisted_jtis:
        raise HTTPException(status_code=401, detail="Token has been revoked")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    skip_verification = os.getenv("SKIP_EMAIL_VERIFICATION", "").lower() in ("1", "true", "yes")
    if require_verified and not user.is_verified and not skip_verification:
        raise HTTPException(
            status_code=403,
            detail={"error": "email_not_verified", "message": "Please verify your email address to continue"}
        )

    return user


async def require_user_unverified_ok(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Like require_user but does NOT enforce email verification.
    Use for endpoints that must work before email is verified
    (GET/PATCH/DELETE /me, change-password, resend-verification)."""
    return await require_user(request=request, credentials=credentials, db=db, require_verified=False)


async def require_admin(user: User = Depends(require_user)) -> User:
    """
    FastAPI async dependency: requires the authenticated user to have role='admin'.
    Usage: admin: User = Depends(require_admin)
    """
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# --- Lockout utilities ---

def is_locked(user) -> bool:
    """Returns True if user account is currently locked."""
    if not user.locked_until:
        return False
    locked_until = user.locked_until
    # SQLite may return naive datetimes even from timezone=True columns
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    return locked_until > datetime.now(timezone.utc)


# --- Company email enforcement ---

_FREE_EMAIL_DOMAINS: frozenset = frozenset({
    "gmail.com", "googlemail.com",
    "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.ca", "yahoo.com.au",
    "hotmail.com", "hotmail.co.uk", "hotmail.fr",
    "outlook.com", "live.com", "msn.com", "live.co.uk",
    "icloud.com", "me.com", "mac.com",
    "aol.com", "aim.com",
    "protonmail.com", "proton.me",
    "mail.com", "email.com", "inbox.com",
    "yandex.com", "yandex.ru",
    "zoho.com",
    "gmx.com", "gmx.net", "gmx.de", "web.de",
    "qq.com", "163.com", "126.com",
    "rediffmail.com",
    "fastmail.com", "fastmail.fm",
})


def is_free_email(email: str) -> bool:
    """Returns True if the email belongs to a free consumer provider (not a company email)."""
    domain = email.lower().split("@")[-1] if "@" in email else ""
    return domain in _FREE_EMAIL_DOMAINS


def get_developer_whitelist() -> frozenset:
    """
    Returns the set of emails allowed to bypass the company-email rule via Google OAuth.
    Sourced from DEVELOPER_EMAILS env var (comma-separated).
    Example: DEVELOPER_EMAILS=jeet@gmail.com,dev@gmail.com
    """
    import os
    raw = os.getenv("DEVELOPER_EMAILS", "")
    return frozenset(e.strip().lower() for e in raw.split(",") if e.strip())
