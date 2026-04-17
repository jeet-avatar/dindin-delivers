"""
Phase 13: SSO router — SAML/OIDC IdP configuration and callback.

Endpoints:
  GET  /api/auth/sso/config   — return current IdP metadata URL (admin-only read)
  POST /api/auth/sso/config   — save IdP metadata URL (admin-only write)
  GET  /api/auth/sso/callback — OIDC authorization-code callback, returns JWT

OIDC implementation uses authlib. For SAML, customers must configure
python3-saml separately (out of scope for Phase 13 MVP).
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, HttpUrl

from database import get_db
from models import User, SystemConfig
from auth_utils import (
    require_admin,
    require_user,
    create_access_token,
    create_refresh_token,
)

try:
    from authlib.integrations.httpx_client import AsyncOAuth2Client  # type: ignore
    _authlib_available = True
except ImportError:
    _authlib_available = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/sso", tags=["sso"])

_SSO_CONFIG_KEY = "sso_idp_metadata_url"
_SSO_CLIENT_ID_KEY = "sso_client_id"
_SSO_CLIENT_SECRET_KEY = "sso_client_secret"


# ── Schemas ──────────────────────────────────────────────────────────────────

class SSOConfigRequest(BaseModel):
    idp_metadata_url: str
    client_id: str | None = None
    client_secret: str | None = None


class SSOConfigResponse(BaseModel):
    idp_metadata_url: str | None
    client_id: str | None
    configured: bool


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_config_value(db: AsyncSession, key: str) -> str | None:
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    row = result.scalar_one_or_none()
    return row.value if row else None


async def _set_config_value(db: AsyncSession, key: str, value: str, admin_id: int) -> None:
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    row = result.scalar_one_or_none()
    if row:
        row.value = value
        row.updated_by = admin_id
    else:
        db.add(SystemConfig(key=key, value=value, updated_by=admin_id))
    await db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config", response_model=SSOConfigResponse)
async def get_sso_config(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return current SSO IdP configuration (admin only)."""
    idp_url = await _get_config_value(db, _SSO_CONFIG_KEY)
    client_id = await _get_config_value(db, _SSO_CLIENT_ID_KEY)
    return SSOConfigResponse(
        idp_metadata_url=idp_url,
        client_id=client_id,
        configured=bool(idp_url),
    )


@router.post("/config", status_code=200)
async def save_sso_config(
    data: SSOConfigRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save SSO IdP metadata URL (admin only)."""
    await _set_config_value(db, _SSO_CONFIG_KEY, data.idp_metadata_url, admin.id)
    if data.client_id:
        await _set_config_value(db, _SSO_CLIENT_ID_KEY, data.client_id, admin.id)
    if data.client_secret:
        await _set_config_value(db, _SSO_CLIENT_SECRET_KEY, data.client_secret, admin.id)
    logger.info(f"SSO config updated by admin {admin.email}")
    return {"message": "SSO configuration saved", "idp_metadata_url": data.idp_metadata_url}


@router.get("/callback")
async def sso_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    OIDC authorization-code callback.

    Exchanges the `code` query param for user identity via the IdP token endpoint
    (configured via POST /api/auth/sso/config). Creates or looks up the matching User
    and returns a JWT identical in shape to the normal login response.

    If authlib is not installed, returns 501 with install instructions.
    """
    if not _authlib_available:
        raise HTTPException(
            status_code=501,
            detail="authlib not installed. Run: pip install authlib httpx",
        )

    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing 'code' query parameter")

    # Load config from DB
    idp_url = await _get_config_value(db, _SSO_CONFIG_KEY)
    client_id = await _get_config_value(db, _SSO_CLIENT_ID_KEY)
    client_secret = await _get_config_value(db, _SSO_CLIENT_SECRET_KEY)

    if not idp_url or not client_id:
        raise HTTPException(status_code=501, detail="SSO not configured. Admin must set IdP metadata URL first.")

    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    redirect_uri = f"{frontend_base}/oauth/callback"

    try:
        async with AsyncOAuth2Client(client_id=client_id, client_secret=client_secret) as client:
            # Exchange code for tokens using the IdP token endpoint
            # (idp_metadata_url is the OIDC discovery URL — token_endpoint derived from it)
            import httpx as _httpx
            discovery_resp = await _httpx.AsyncClient().get(idp_url, timeout=10)
            discovery = discovery_resp.json()
            token_endpoint = discovery.get("token_endpoint")
            userinfo_endpoint = discovery.get("userinfo_endpoint")

            if not token_endpoint:
                raise HTTPException(status_code=502, detail="IdP discovery did not return token_endpoint")

            token = await client.fetch_token(
                token_endpoint,
                code=code,
                redirect_uri=redirect_uri,
            )

            if not userinfo_endpoint:
                raise HTTPException(status_code=502, detail="IdP discovery did not return userinfo_endpoint")

            userinfo_resp = await client.get(userinfo_endpoint)
            userinfo = userinfo_resp.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSO callback error: {e}")
        raise HTTPException(status_code=502, detail=f"SSO exchange failed: {e}")

    email = (userinfo.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="IdP did not return an email address")

    # Create or look up user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        given = userinfo.get("given_name") or userinfo.get("name", "").split()[0] or "SSO"
        family = userinfo.get("family_name") or (userinfo.get("name", "").split()[-1] if " " in userinfo.get("name", "") else "User")
        full_name = f"{given} {family}".strip()
        user = User(
            email=email,
            name=full_name,
            first_name=given,
            last_name=family,
            password_hash="__sso__",  # SSO users have no local password
            is_active=True,
            is_verified=True,
            role="user",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "email": user.email,
        "user_type": "user",
        "role": user.role,
    }
