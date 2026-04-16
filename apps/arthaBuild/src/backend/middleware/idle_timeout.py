"""
Phase 13: Idle session timeout middleware.

Checks the `iat` (issued-at) claim of the Bearer JWT on every authenticated request.
If now - iat > SESSION_IDLE_MINUTES * 60 seconds, returns 401 {"detail": "Session expired"}.

Design:
  - Uses iat (issued-at time) as a proxy for last-activity time. For true idle tracking,
    short-lived access tokens (e.g. 15 min) with a slide-window refresh endpoint would be
    required. The iat approach is simpler and sufficient for the Phase 13 enterprise use case.
  - When SESSION_IDLE_MINUTES=0, ALL authenticated requests expire immediately (useful in tests).
  - Skipped paths are entirely public — health checks, login, register, OAuth callback.

CLAUDE.md rule: PyJWT only (never python-jose), HS256, JWT sub always str(user_id).
"""
import os
import logging
from datetime import datetime, timezone

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Paths that bypass idle-timeout checking (public endpoints that have no JWT)
_SKIP_PATHS = {
    "/health",
    "/health/detail",  # detail check uses require_user which will handle auth
    "/api/auth/login",
    "/api/auth/check-user",
    "/api/user/register",
    "/api/auth/google/login",
    "/api/auth/google/callback",
    "/api/auth/sso/callback",
    "/api/user/forgot-password",
    "/api/user/reset-password",
    "/api/user/resend-verification",
    "/api/user/verify-email",
    "/api/invite/accept",
    "/api/auth/refresh",
    "/api/analytics/collect",
    "/docs",
    "/openapi.json",
}

_SKIP_PREFIXES = (
    "/static",
    "/assets",
    "/favicon",
)


class IdleTimeoutMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that rejects requests if the JWT was issued more than
    SESSION_IDLE_MINUTES ago (default 30 minutes).
    """

    def __init__(self, app, idle_minutes: int | None = None):
        super().__init__(app)
        if idle_minutes is not None:
            self.idle_minutes = idle_minutes
        else:
            self.idle_minutes = int(os.getenv("SESSION_IDLE_MINUTES", "30"))
        self._secret = os.getenv("JWT_SECRET_KEY", "")
        logger.info(f"IdleTimeoutMiddleware: idle_minutes={self.idle_minutes}")

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip paths that don't require authentication
        if path in _SKIP_PATHS:
            return await call_next(request)
        for prefix in _SKIP_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            # No token — let the endpoint-level auth dependency handle the 401
            return await call_next(request)

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, self._secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            # Token exp already enforced by PyJWT decode — let it pass to endpoint
            return await call_next(request)
        except jwt.InvalidTokenError:
            return await call_next(request)

        iat = payload.get("iat")
        if iat is not None and self.idle_minutes >= 0:
            now = datetime.now(timezone.utc).timestamp()
            age_seconds = now - float(iat)
            if age_seconds > self.idle_minutes * 60:
                logger.info(
                    f"Session idle timeout: iat={iat}, age={age_seconds:.0f}s, "
                    f"limit={self.idle_minutes * 60}s, path={path}"
                )
                return JSONResponse(
                    {"detail": "Session expired"},
                    status_code=401,
                )

        return await call_next(request)
