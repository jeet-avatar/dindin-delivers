"""
Auth utilities for BeatMind — JWT tokens and password hashing.
"""

import os
import hmac
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET env var is not set")
    return secret


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, _get_secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raises JWTError if invalid, expired, or tampered."""
    claims = jwt.decode(token, _get_secret(), algorithms=[ALGORITHM])
    if claims.get("purpose") is not None:
        raise JWTError("Purpose-specific tokens cannot authenticate sessions")
    return claims


def password_reset_state(password_hash: str) -> str:
    """Bind a reset link to the current password without exposing its stored hash."""
    return hmac.new(_get_secret().encode(), password_hash.encode(), "sha256").hexdigest()
