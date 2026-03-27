# apps/hospital-pricing/backend/auth/router.py
import uuid as _uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from auth.jwt import create_access_token, create_refresh_token, verify_token
from database import get_db
from models.hospital import User, HospitalEntity

_bearer = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not _pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    payload = {
        "sub": str(user.user_id),
        "entity_id": str(user.entity_id),
        "role": user.role.value,
    }
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
        path="/auth/refresh",
    )
    return TokenResponse(access_token=access_token)


class EntityDetail(BaseModel):
    name: str
    is_covered_entity: bool
    gpo_memberships: list


class UserInfoResponse(BaseModel):
    user_id: str
    entity_id: str
    email: str
    role: str
    entity: Optional[EntityDetail]


@router.get("/me", response_model=UserInfoResponse)
async def me(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> UserInfoResponse:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = verify_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(
        select(User)
        .options(selectinload(User.entity))
        .where(User.user_id == _uuid.UUID(payload["sub"]))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    entity_detail: Optional[EntityDetail] = None
    if user.entity is not None:
        entity_detail = EntityDetail(
            name=user.entity.name,
            is_covered_entity=user.entity.is_covered_entity,
            gpo_memberships=user.entity.gpo_memberships or [],
        )

    return UserInfoResponse(
        user_id=str(user.user_id),
        entity_id=str(user.entity_id),
        email=user.email,
        role=user.role.value,
        entity=entity_detail,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    try:
        payload = verify_token(refresh_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_payload = {k: v for k, v in payload.items() if k not in ("exp", "iat")}
    new_access = create_access_token(new_payload)
    new_refresh = create_refresh_token(new_payload)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
        path="/auth/refresh",
    )
    return TokenResponse(access_token=new_access)
