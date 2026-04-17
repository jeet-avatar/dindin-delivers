from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
import secrets
import httpx
from database import get_db
from models import User, PasswordResetToken
from schemas import (
    LoginRequest, CheckUserRequest, CheckUserResponse,
    TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, RefreshRequest
)
from auth_utils import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, is_locked, limiter, hash_password, validate_password,
    blacklist_token, _bearer_scheme, is_free_email, get_developer_whitelist
)
from fastapi.security import HTTPAuthorizationCredentials
from email_utils import generate_reset_token, hash_token, token_expiry, send_reset_email, send_welcome_email
from audit_utils import write_audit_event
import jwt
import os

# --- Google OAuth constants ---
_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# In-memory CSRF state store (single-tenant, single-process — same pattern as JTI blacklist)
_oauth_states: dict[str, float] = {}

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/check-user", response_model=CheckUserResponse)
@limiter.limit("10/minute")
async def check_user(
    request: Request,   # REQUIRED by SlowAPI
    data: CheckUserRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()
    if user:
        return CheckUserResponse(success=True, message="User found")
    return CheckUserResponse(success=False, message="User not found")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,   # REQUIRED by SlowAPI
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    # Extract client IP for audit log
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")

    # Look up by email (username field in frontend payload = email value)
    result = await db.execute(select(User).where(User.email == data.username.lower()))
    user = result.scalar_one_or_none()

    # No enumeration — same error whether email not found or password wrong
    generic_error = HTTPException(status_code=401, detail="Invalid email or password")

    if not user:
        # Audit: login failure (unknown email — role unknown)
        await write_audit_event(db, actor_email=data.username.lower(), actor_role="unknown",
                                action="auth.login_failed", result="failure", ip_address=ip)
        await db.commit()
        raise generic_error

    # Check account lockout
    if is_locked(user):
        await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                                action="auth.login_failed", result="failure", ip_address=ip,
                                target="lockout")
        await db.commit()
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    # Verify password
    if not verify_password(data.password, user.password_hash):
        # Record failed attempt
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                                    action="auth.login_failed", result="failure", ip_address=ip,
                                    target="lockout")
            await db.commit()
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                                action="auth.login_failed", result="failure", ip_address=ip)
        await db.commit()
        raise generic_error

    # Successful login — reset lockout counters
    user.failed_attempts = 0
    user.locked_until = None
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="auth.login_success", result="success", ip_address=ip)
    await db.commit()

    # Enforce email verification — check SKIP_EMAIL_VERIFICATION env flag (same pattern as auth_utils.py:167)
    skip_verification = os.getenv("SKIP_EMAIL_VERIFICATION", "").lower() in ("1", "true", "yes")
    if not user.is_verified and not skip_verification:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before logging in. Check your inbox for a verification link."
        )

    return TokenResponse(
        access_token=create_access_token(user.id, role=user.role),
        refresh_token=create_refresh_token(user.id),
        first_name=user.first_name or "",
        last_name=user.last_name or "",
        email=user.email,
        role=user.role,
        user_type="Administrator" if user.role == "admin" else "User",
    )


@router.post("/logout")
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the current access token by adding its JTI to the blacklist."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    actor_email = "unknown"
    actor_role = "unknown"
    try:
        payload = decode_token(credentials.credentials, "access")
        jti = payload.get("jti")
        if jti:
            blacklist_token(jti)
        # Look up user from sub (user_id) to get email + role
        user_id = int(payload.get("sub", 0))
        actor_role = payload.get("role", "unknown")
        if user_id:
            user_result = await db.execute(select(User).where(User.id == user_id))
            user_obj = user_result.scalar_one_or_none()
            if user_obj:
                actor_email = user_obj.email
                actor_role = user_obj.role
    except jwt.InvalidTokenError:
        # Token already invalid — no-op, still return success
        pass
    await write_audit_event(db, actor_email=actor_email, actor_role=actor_role,
                            action="auth.logout", result="success", ip_address=ip)
    await db.commit()
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
@limiter.limit("10/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Always return 200 regardless of email existence (no enumeration)
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if user:
        # Invalidate any existing unused tokens for this user before issuing a new one.
        # Prevents a stolen old reset email from being used after a fresh request is made.
        await db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used == False)
            .values(used=True)
        )
        raw_token, token_hash = generate_reset_token()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=token_expiry(),
        )
        db.add(reset_token)
        await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                                action="user.forgot_password", result="success", ip_address=ip)
        await db.commit()

        # AB-004: Reset link MUST use FRONTEND_BASE_URL (React route), not APP_BASE_URL (FastAPI).
        # /reset-password/:token is a React Router page using useParams(). In dev: port 5173.
        # In prod Docker: port 80. Path param (not query param) — ResetPassword.tsx uses useParams().
        # The fallback "http://localhost:5173" ensures dev works even if .env is incomplete.
        frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
        reset_link = f"{frontend_base_url}/reset-password/{raw_token}"
        background_tasks.add_task(send_reset_email, user.email, reset_link)

    # Same response whether email found or not
    return {"message": "If that email is registered, you will receive a reset link shortly."}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Validate new password policy first
    err = validate_password(data.password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # 2. Look up token by SHA-256 hash
    hashed = hash_token(data.token)
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hashed)
    )
    token_record = result.scalar_one_or_none()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # 3. Check if already used
    if token_record.used:
        raise HTTPException(status_code=400, detail="Link already used")

    # 4. Check expiry
    now = datetime.now(timezone.utc)
    expires = token_record.expires_at
    # Make timezone-aware if needed (SQLite may return naive datetime)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=400, detail="Link expired")

    # 5. Update user password and mark token used
    result = await db.execute(select(User).where(User.id == token_record.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    user.password_hash = hash_password(data.password)
    user.failed_attempts = 0
    user.locked_until = None
    token_record.used = True
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="user.password_reset", result="success", ip_address=ip)
    await db.commit()

    return {"message": "Password updated successfully"}


@router.get("/google")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google login not configured")

    state = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).timestamp()
    _oauth_states[state] = now

    # Prune states older than 10 minutes
    cutoff = now - 600
    for k in list(_oauth_states.keys()):
        if _oauth_states[k] < cutoff:
            del _oauth_states[k]

    backend_base = os.getenv("APP_BASE_URL", "https://artha.build")
    redirect_uri = f"{backend_base}/api/auth/google/callback"

    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    })
    return RedirectResponse(f"{_GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    code: str = None,
    state: str = None,
    error: str = None,
):
    """Handle Google OAuth callback — create/find user, issue JWT, redirect to frontend."""
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

    if error:
        return RedirectResponse(f"{frontend_base}/log-in?error=google_denied")

    if not state or state not in _oauth_states:
        return RedirectResponse(f"{frontend_base}/log-in?error=invalid_state")
    del _oauth_states[state]

    if not code:
        return RedirectResponse(f"{frontend_base}/log-in?error=no_code")

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    backend_base = os.getenv("APP_BASE_URL", "https://artha.build")
    redirect_uri = f"{backend_base}/api/auth/google/callback"

    async with httpx.AsyncClient() as http:
        # Exchange code for access token
        token_resp = await http.post(_GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            return RedirectResponse(f"{frontend_base}/log-in?error=token_exchange_failed")

        google_access_token = token_resp.json().get("access_token")

        # Get user profile from Google
        userinfo_resp = await http.get(_GOOGLE_USERINFO_URL, headers={
            "Authorization": f"Bearer {google_access_token}"
        })
        if userinfo_resp.status_code != 200:
            return RedirectResponse(f"{frontend_base}/log-in?error=userinfo_failed")

        userinfo = userinfo_resp.json()

    email = userinfo.get("email", "").lower()
    first_name = userinfo.get("given_name", "")
    last_name = userinfo.get("family_name", "")

    if not email:
        return RedirectResponse(f"{frontend_base}/log-in?error=no_email")

    # Block free email domains (same rule as traditional signup)
    developer_whitelist = get_developer_whitelist()
    if is_free_email(email) and email not in developer_whitelist:
        return RedirectResponse(f"{frontend_base}/log-in?error=company_email_required")

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    is_new_user = user is None

    if not user:
        count_result = await db.execute(select(func.count()).select_from(User))
        user_count = count_result.scalar()
        role = "admin" if user_count == 0 else "user"

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            name=f"{first_name} {last_name}".strip() or email,
            role=role,
            password_hash="",
            is_verified=True,
            is_active=True,
            failed_attempts=0,
        )
        db.add(user)
        await db.flush()

    # Ensure OAuth users are always verified and active (Google verified the email)
    if not user.is_verified:
        user.is_verified = True
    if not user.is_active:
        user.is_active = True

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="auth.google_login", result="success", ip_address=ip)
    await db.commit()

    # Send welcome email on first-ever OAuth login (fire-and-forget)
    if is_new_user:
        try:
            await send_welcome_email(user.email, user.first_name or user.email.split("@")[0])
        except Exception:
            pass  # Never block login due to email failure

    access_token = create_access_token(user.id, role=user.role)
    refresh_tok = create_refresh_token(user.id)

    params = urlencode({
        "token": access_token,
        "refresh_token": refresh_tok,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "email": user.email,
        "role": user.role,
    })
    return RedirectResponse(f"{frontend_base}/oauth/callback?{params}")


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    try:
        payload = decode_token(data.refresh_token, expected_type="refresh")
    except jwt.ExpiredSignatureError:
        await write_audit_event(db, actor_email="unknown", actor_role="unknown",
                                action="auth.token_refresh_failed", result="failure", ip_address=ip,
                                target="expired")
        await db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired, please log in again")
    except jwt.InvalidTokenError:
        await write_audit_event(db, actor_email="unknown", actor_role="unknown",
                                action="auth.token_refresh_failed", result="failure", ip_address=ip,
                                target="invalid")
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="auth.token_refresh", result="success", ip_address=ip)
    await db.commit()
    return {
        "access_token": create_access_token(user_id, role=user.role),
        "token_type": "bearer",
        "role": user.role,
    }
