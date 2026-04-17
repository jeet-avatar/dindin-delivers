"""
Phase 13: TOTP MFA router.

Endpoints:
  POST /api/auth/mfa/enroll  — generate TOTP secret, return provisioning URI + QR data URL
  POST /api/auth/mfa/verify  — verify OTP code, mark MFA as active
  POST /api/auth/mfa/disable — disable MFA for caller (or by admin for another user)
  POST /api/auth/mfa/check   — called at login time: require OTP if user has active MFA

Library: pyotp (TOTP RFC 6238, 30-second window, SHA-1, 6 digits — standard authenticator app compatible)
"""
import base64
import io
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

import pyotp  # type: ignore

from database import get_db
from models import User, MFASecret
from auth_utils import require_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/mfa", tags=["mfa"])

_APP_NAME = "ArthaBuild"


# ── Schemas ──────────────────────────────────────────────────────────────────

class MFAVerifyRequest(BaseModel):
    otp_code: str


class MFADisableRequest(BaseModel):
    user_id: int | None = None  # admin can disable another user's MFA


class MFACheckRequest(BaseModel):
    user_id: int
    otp_code: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_qr_data_url(provisioning_uri: str) -> str:
    """
    Generate a base64-encoded PNG QR code data URL for the provisioning URI.
    Falls back gracefully if qrcode or Pillow is not installed — returns empty string.
    """
    try:
        import qrcode  # type: ignore
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except ImportError:
        # qrcode not installed — frontend can use the provisioning_uri directly
        return ""


async def _get_active_secret(db: AsyncSession, user_id: int) -> MFASecret | None:
    result = await db.execute(
        select(MFASecret)
        .where(MFASecret.user_id == user_id, MFASecret.is_active == True)
    )
    return result.scalar_one_or_none()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/enroll")
async def enroll_mfa(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a TOTP secret for the current user.
    Returns provisioning_uri (for manual entry) and qr_data_url (PNG QR code as data URL).
    MFA is NOT active yet — user must call /verify with a valid OTP to activate.
    """
    # Deactivate any existing pending (inactive) secrets
    result = await db.execute(
        select(MFASecret).where(MFASecret.user_id == current_user.id, MFASecret.is_active == False)
    )
    for pending in result.scalars().all():
        await db.delete(pending)

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name=_APP_NAME,
    )
    qr_data_url = _make_qr_data_url(provisioning_uri)

    mfa_record = MFASecret(
        user_id=current_user.id,
        secret=secret,
        is_active=False,
    )
    db.add(mfa_record)
    await db.commit()

    return {
        "provisioning_uri": provisioning_uri,
        "qr_data_url": qr_data_url,
    }


@router.post("/verify", status_code=200)
async def verify_mfa(
    data: MFAVerifyRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify an OTP code against the user's pending (inactive) MFA secret.
    On success, marks is_active=True — MFA is now required at login.
    """
    # Find pending (not yet activated) secret
    result = await db.execute(
        select(MFASecret).where(MFASecret.user_id == current_user.id, MFASecret.is_active == False)
    )
    mfa_record = result.scalar_one_or_none()

    if not mfa_record:
        raise HTTPException(status_code=404, detail="No pending MFA enrollment found. Call /enroll first.")

    totp = pyotp.TOTP(mfa_record.secret)
    # valid_window=1 allows codes from 30 seconds before/after (clock drift tolerance)
    if not totp.verify(data.otp_code.strip(), valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid OTP code. Check your authenticator app and try again.")

    mfa_record.is_active = True
    await db.commit()

    logger.info(f"MFA activated for user {current_user.email}")
    return {"message": "MFA activated successfully", "mfa_enabled": True}


@router.post("/disable", status_code=200)
async def disable_mfa(
    data: MFADisableRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Disable MFA. User can disable their own MFA. Admin can disable another user's MFA
    by passing user_id in the request body.
    """
    target_user_id = current_user.id

    if data.user_id and data.user_id != current_user.id:
        # Only admins can disable another user's MFA
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required to disable another user's MFA")
        target_user_id = data.user_id

    result = await db.execute(
        select(MFASecret).where(MFASecret.user_id == target_user_id, MFASecret.is_active == True)
    )
    mfa_record = result.scalar_one_or_none()

    if not mfa_record:
        raise HTTPException(status_code=404, detail="No active MFA found for this user")

    mfa_record.is_active = False
    await db.commit()

    logger.info(f"MFA disabled for user_id={target_user_id} by {current_user.email}")
    return {"message": "MFA disabled", "mfa_enabled": False}


@router.post("/check", status_code=200)
async def check_mfa(
    data: MFACheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Called at login time (after password validation, before JWT issuance).
    If the user has active MFA:
      - If otp_code absent or blank → return 403 {mfa_required: true}
      - If otp_code present → validate it; on success return {mfa_ok: true}
    If the user has no active MFA → return {mfa_required: false} (proceed to issue JWT).

    This endpoint is intentionally unauthenticated (called before JWT is issued).
    Caller must verify the user's password BEFORE calling this endpoint.
    """
    active_secret = await _get_active_secret(db, data.user_id)

    if not active_secret:
        return {"mfa_required": False}

    if not data.otp_code or not data.otp_code.strip():
        raise HTTPException(
            status_code=403,
            detail={"mfa_required": True, "message": "MFA code required"},
        )

    totp = pyotp.TOTP(active_secret.secret)
    if not totp.verify(data.otp_code.strip(), valid_window=1):
        raise HTTPException(status_code=403, detail={"mfa_required": True, "message": "Invalid MFA code"})

    return {"mfa_required": True, "mfa_ok": True}
