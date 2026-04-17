"""
ArthaBuild API Key Management Router
=====================================
Provides CRUD endpoints for API key management under /api/v1/keys.

API keys allow third-party integrations (Zapier, CI pipelines, customer scripts)
to call ArthaBuild without a user JWT. The raw key is returned ONCE at creation
and never stored — only the SHA-256 hash is persisted.

Architecture layer: API (routers)
Phase: 16 — API Platform
"""
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth_utils import require_user
from database import get_db
from models import APIKey, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/keys", tags=["api-keys"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class CreateAPIKeyRequest(BaseModel):
    name: str  # human label, e.g. "Zapier integration"


class APIKeyResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    # key is only included once at creation — omitted from list/delete responses
    key: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _hash_key(raw_key: str) -> str:
    """Return SHA-256 hex digest of the raw API key."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=APIKeyResponse, status_code=201)
async def create_api_key(
    body: CreateAPIKeyRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new API key for the authenticated user.
    The raw key is returned ONCE in this response and never stored.
    Store it securely — it cannot be retrieved again.
    """
    raw_key = secrets.token_urlsafe(32)
    key_hash = _hash_key(raw_key)

    api_key = APIKey(
        user_id=current_user.id,
        key_hash=key_hash,
        name=body.name,
        is_active=True,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    logger.info(f"API key created: id={api_key.id} user_id={current_user.id} name={body.name!r}")
    return APIKeyResponse(
        id=api_key.id,
        name=api_key.name,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
        key=raw_key,  # returned ONCE — never stored raw
    )


@router.get("/", response_model=list[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all API keys for the authenticated user.
    The raw key is NOT returned — only metadata (name, id, is_active, last_used_at).
    """
    result = await db.execute(
        select(APIKey)
        .where(APIKey.user_id == current_user.id)
        .order_by(APIKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        APIKeyResponse(
            id=k.id,
            name=k.name,
            is_active=k.is_active,
            last_used_at=k.last_used_at,
            created_at=k.created_at,
            key=None,  # never returned after creation
        )
        for k in keys
    ]


@router.delete("/{key_id}", status_code=200)
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate an API key (soft-delete: sets is_active=False).
    Only the owning user can deactivate their own keys.
    """
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    if not api_key.is_active:
        raise HTTPException(status_code=409, detail="API key is already inactive")

    api_key.is_active = False
    await db.commit()
    logger.info(f"API key deactivated: id={key_id} user_id={current_user.id}")
    return {"message": "API key deactivated", "id": key_id}
