"""
API Key Authentication Middleware
===================================
Phase 16: Resolves X-API-Key header to a User and injects into request.state.api_key_user.

Flow:
  1. If X-API-Key header is absent → call_next immediately (JWT auth still applies downstream).
  2. If present: compute SHA-256, look up active APIKey row, update last_used_at.
  3. Inject resolved User into request.state.api_key_user so require_user() can read it.
  4. If key is invalid/inactive → return 401 JSON response.

Must be registered AFTER CORSMiddleware so the header passes CORS first.

Architecture layer: Middleware
Phase: 16 — API Platform
"""
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select

from database import AsyncSessionLocal
from models import APIKey, User

logger = logging.getLogger(__name__)


def _hash_key(raw_key: str) -> str:
    """Return SHA-256 hex digest of the raw API key."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware: if X-API-Key header is present, resolve to User and inject into request.state.
    If absent, pass through unchanged — JWT auth still applies via Depends(require_user).
    """

    async def dispatch(self, request: Request, call_next):
        raw_key = request.headers.get("X-API-Key")
        if not raw_key:
            # No API key header — pass through, let JWT auth handle it downstream
            return await call_next(request)

        key_hash = _hash_key(raw_key)

        try:
            async with AsyncSessionLocal() as db:
                # Look up the key by hash — must be active
                result = await db.execute(
                    select(APIKey).where(
                        APIKey.key_hash == key_hash,
                        APIKey.is_active == True,  # noqa: E712
                    )
                )
                api_key = result.scalar_one_or_none()

                if api_key is None:
                    logger.warning(f"Invalid or inactive API key from {request.client.host if request.client else 'unknown'}")
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Invalid or inactive API key"},
                    )

                # Fetch the owning user
                user_result = await db.execute(
                    select(User).where(User.id == api_key.user_id, User.is_active == True)  # noqa: E712
                )
                user = user_result.scalar_one_or_none()

                if user is None:
                    logger.warning(f"API key {api_key.id} owner user not found or inactive")
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "API key owner account is inactive"},
                    )

                # Update last_used_at (fire-and-forget update in same session)
                api_key.last_used_at = datetime.now(timezone.utc)
                await db.commit()

        except Exception as exc:
            logger.error(f"API key auth middleware error: {exc}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error during API key authentication"},
            )

        # Inject the resolved user so require_user() can pick it up via request.state
        request.state.api_key_user = user
        return await call_next(request)
