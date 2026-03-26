# apps/hospital-pricing/backend/auth/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.jwt import verify_token
from models.hospital import UserRole

_bearer = HTTPBearer()


def _get_current_payload(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    try:
        return verify_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_procurement_officer(payload: dict = Depends(_get_current_payload)) -> dict:
    allowed = {
        UserRole.procurement_officer,
        UserRole.procurement_approver,
        UserRole.entity_admin,
        UserRole.platform_admin,
    }
    if UserRole(payload.get("role")) not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    return payload


def require_approver(payload: dict = Depends(_get_current_payload)) -> dict:
    allowed = {
        UserRole.procurement_approver,
        UserRole.entity_admin,
        UserRole.platform_admin,
    }
    if UserRole(payload.get("role")) not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    return payload


def require_entity_admin(payload: dict = Depends(_get_current_payload)) -> dict:
    allowed = {UserRole.entity_admin, UserRole.platform_admin}
    if UserRole(payload.get("role")) not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    return payload


def require_platform_admin(payload: dict = Depends(_get_current_payload)) -> dict:
    if UserRole(payload.get("role")) != UserRole.platform_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    return payload
