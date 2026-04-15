import os
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import User, Team, TeamInvite, PasswordResetToken, EmailVerificationToken
from schemas import RegisterRequest, ChangePasswordRequest, PatchUserRequest, ResendVerificationRequest
from auth_utils import (hash_password, validate_password, limiter, create_access_token,
                        create_refresh_token, require_user, verify_password, blacklist_token,
                        require_user_unverified_ok, SECRET_KEY, ALGORITHM, _bearer_scheme,
                        is_free_email)
from email_utils import (send_verification_email, send_reset_email,
                         send_invite_email, send_admin_reset_email,
                         send_welcome_email, send_password_changed_email,
                         generate_reset_token, hash_token, token_expiry)
from audit_utils import write_audit_event
import jwt

router = APIRouter(prefix="/api/user", tags=["user"])


@router.post("/register", status_code=201)
@limiter.limit("10/minute")
async def register(
    request: Request,   # REQUIRED by SlowAPI rate limiting
    data: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # 1. Validate password policy
    err = validate_password(data.password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # 2. Check for duplicate email (case-insensitive)
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    if is_free_email(data.email):
        raise HTTPException(status_code=400, detail="Please use your company email address. Free email providers are not accepted.")

    # 3. First-user-is-admin: check if any users exist
    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()

    if user_count == 0:
        # First user becomes admin and creates the default team
        team = Team(name=data.organization or "My Team")
        db.add(team)
        await db.flush()  # get team.id without committing
        role = "admin"
        team_id = team.id
    else:
        role = "user"
        team_id = None

    # 4. Create and save user
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    user = User(
        name=f"{data.first_name} {data.last_name}",
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email.lower(),
        organization=data.organization,
        password_hash=hash_password(data.password),
        role=role,
        team_id=team_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 5. Generate and store email verification token (24h expiry)
    raw_vtoken, vtoken_hash = generate_reset_token()
    vtoken_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=vtoken_hash,
        expires_at=vtoken_expires,
    ))
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="auth.register", result="success", ip_address=ip)
    await db.commit()

    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    verify_link = f"{frontend_base}/verify-email?token={raw_vtoken}"
    background_tasks.add_task(send_verification_email, user.email, verify_link)
    return {"message": "Registration successful. Please check your email to verify your account."}


@router.get("/verify-email")
async def verify_email(
    token: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth required. Accepts raw token from email link."""
    token_hash = hash_token(token)
    result = await db.execute(
        select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
    )
    vtoken = result.scalar_one_or_none()
    if not vtoken or vtoken.used:
        raise HTTPException(status_code=400, detail="Invalid or already-used verification link")
    expires = vtoken.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification link has expired")
    # Mark used + set is_verified on user
    vtoken.used = True
    user_result = await db.execute(select(User).where(User.id == vtoken.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.is_verified = True
    await db.commit()
    if user:
        background_tasks.add_task(send_welcome_email, user.email, user.first_name or "there")
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    data: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth required. Anti-enumeration: always returns 200."""
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()
    if not user or user.is_verified:
        # Anti-enumeration: never reveal whether the email is registered or already verified
        return {"message": "If that email is registered and unverified, a new link has been sent."}
    # Invalidate previous verification tokens for this user
    old_tokens_result = await db.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used == False
        )
    )
    for old in old_tokens_result.scalars().all():
        old.used = True
    # Create new token
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    raw_vtoken, vtoken_hash = generate_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(EmailVerificationToken(user_id=user.id, token_hash=vtoken_hash, expires_at=expires_at))
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="user.email_resend", result="success", ip_address=ip)
    await db.commit()
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    verify_link = f"{frontend_base}/verify-email?token={raw_vtoken}"
    background_tasks.add_task(send_verification_email, user.email, verify_link)
    return {"message": "If that email is registered and unverified, a new link has been sent."}


@router.get("/me")
async def get_profile(current_user: User = Depends(require_user_unverified_ok)):
    """Get current user profile. Works for unverified users (allowlisted)."""
    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
    }


@router.patch("/me")
async def update_profile(
    data: PatchUserRequest,
    current_user: User = Depends(require_user_unverified_ok),
    db: AsyncSession = Depends(get_db),
):
    """Update first_name and/or last_name. Works for unverified users."""
    if data.first_name is not None:
        current_user.first_name = data.first_name
        current_user.name = f"{data.first_name} {current_user.last_name or ''}"
    if data.last_name is not None:
        current_user.last_name = data.last_name
        current_user.name = f"{current_user.first_name or ''} {data.last_name}"
    await db.commit()
    return {"first_name": current_user.first_name, "last_name": current_user.last_name}


@router.delete("/me")
async def delete_account(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    current_user: User = Depends(require_user_unverified_ok),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete: set is_active=False and blacklist the current token's JTI."""
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    current_user.is_active = False
    await write_audit_event(db, actor_email=current_user.email, actor_role=current_user.role,
                            action="user.account_deleted", result="success", ip_address=ip)
    await db.commit()
    # Blacklist the current token's JTI
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if jti:
            blacklist_token(jti)
    except Exception:
        pass
    return {"message": "Account deleted"}


@router.post("/change-password")
async def change_password(
    request: Request,
    data: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_user_unverified_ok),
    db: AsyncSession = Depends(get_db),
):
    """Change password after verifying old password. Works for unverified users."""
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    err = validate_password(data.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    current_user.password_hash = hash_password(data.new_password)
    await write_audit_event(db, actor_email=current_user.email, actor_role=current_user.role,
                            action="user.password_changed", result="success", ip_address=ip)
    await db.commit()
    background_tasks.add_task(
        send_password_changed_email,
        current_user.email,
        current_user.first_name or "there",
    )
    return {"message": "Password updated successfully"}


@router.post("/accept-invite")
async def accept_invite(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Consume a team invite token and register the invited user.

    Flow:
    1. Hash token -> lookup TeamInvite by token_hash
    2. Validate: not accepted, not expired
    3. Validate: email not already registered (409)
    4. Create User with team_id=invite.team_id, role='user' (bypass first-user-is-admin)
    5. Mark invite.accepted = True
    6. Return same login response shape as POST /api/auth/login
    """
    token = body.get("token", "").strip()
    first_name = body.get("first_name", "").strip()
    last_name = body.get("last_name", "").strip()
    password = body.get("password", "")

    if not all([token, first_name, last_name, password]):
        raise HTTPException(status_code=400, detail="token, first_name, last_name, and password are required")

    # Validate password policy
    err = validate_password(password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # Lookup invite by SHA-256 hash of raw token (same pattern as PasswordResetToken)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    result = await db.execute(select(TeamInvite).where(TeamInvite.token_hash == token_hash))
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already used")
    if invite.accepted:
        raise HTTPException(status_code=400, detail="Invite has already been accepted")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite has expired")

    # Check if email already registered
    email = invite.email.lower()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create user — always role='user', team_id from invite (bypasses first-user-is-admin)
    user = User(
        name=f"{first_name} {last_name}",
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=hash_password(password),
        role="user",
        team_id=invite.team_id,
    )
    db.add(user)
    await db.flush()  # get user.id

    # Mark invite accepted
    invite.accepted = True
    await db.commit()
    await db.refresh(user)

    # Return same shape as /api/auth/login (frozen interface per CLAUDE.md)
    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role,
    }
