# Phase 11: Password Management — Enterprise Email Flow - Research

**Researched:** 2026-04-10
**Domain:** Password management UX, HTML transactional email, email verification, admin-triggered reset, user profile endpoints
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email Template Style**
- Clean minimal design — white background, single column, brand accent color, no heavy imagery (like Linear/Vercel transactional emails)
- Logo/header: Claude's discretion (best practice for enterprise SaaS)
- Footer: company name + copyright + privacy policy link only (no social links, no marketing unsubscribe — these are transactional)
- CTA: solid filled button (e.g. "Reset Password") with fallback plain-text URL below for email clients that block images
- Applies to: password reset email, email verification email, admin-triggered reset email

**Token Expiry UX**
- Reset links valid for **15 minutes** (security-sensitive, industry standard)
- Reset links are **single-use** — invalidated immediately after password is changed
- Multiple reset requests: each new request **invalidates all previous links** — only the latest link works
- Expired/used link → dedicated error page with **inline "Send new link" button** (user never has to navigate away)

**Reset Flow Entry Points**
- **Logged-out**: Forgot-password form on login page → email link → reset-password page → success → back to login
- **Logged-in**: Settings page has "Change Password" form (current password + new password + confirm) — no email required
- **Admin-triggered**: Admin Panel has "Send password reset" action per user in the team list → sends reset email to that user on their behalf
- Post-reset landing: login page with success banner ("Password updated. Please log in.")
- Anti-enumeration: forgot-password always shows "If an account with that email exists, you'll receive a link shortly" — never reveals whether email is registered

**Email Verification**
- Non-blocking — user can use the app after signup, but sees a persistent dismissible banner "Please verify your email" until confirmed
- Verification method: click-to-verify link in email (one click, no code entry)
- Verification link valid for **24 hours**
- Resend: banner includes "Resend email" button with 60-second cooldown to prevent spam
- Once verified: banner disappears, `email_verified` flag set on user record

### Claude's Discretion
- Logo inclusion and exact placement in email header (product name as text is fine if no logo asset exists)
- Exact button color (match existing ArthaBuild brand accent)
- Skeleton/loading states during async operations
- Exact spacing, typography, and email client fallback CSS
- Whether to use a shared email template renderer (e.g., Jinja2 HTML partials) or inline styles per email

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CASE-181 | POST /api/user/change-password validates old password before updating to new | Backend: new endpoint in user.py router; bcrypt.checkpw pattern already used in auth.py:60 |
| CASE-182 | Password change rejects new password matching last 5 passwords | Out of scope per CONTEXT.md "Deferred" — CASE-182 is in CONTEXT but password history is NOT in locked decisions. See note below. |
| CASE-183 | Users with password older than 90 days receive 403 with 'password expired' | Out of scope per CONTEXT.md — password expiry is not in locked decisions. See note below. |
| CASE-184 | DELETE /api/user/me deletes account and invalidates all tokens | Backend: soft-delete + JTI blacklist (blacklist_token already exists in auth_utils.py:69) |
| CASE-185 | POST /api/user/resend-verification resends email verification link | Backend: new endpoint; User.is_verified field already exists (models.py:44); send_verification_email() exists |
| CASE-186 | Unverified users cannot access chat or NetSuite endpoints (403) | Middleware: add email_verified check to require_user() in auth_utils.py:124 |
| CASE-187 | PATCH /api/user/me updates first_name and last_name in DB | Backend: new endpoint in user.py router; User model has first_name + last_name (models.py:38-39) |

**IMPORTANT SCOPE NOTE on CASE-182 and CASE-183:**
The CONTEXT.md locked decisions do NOT include password history enforcement (CASE-182) or 90-day password expiry (CASE-183). These features were generated as CASE files but are not part of the user-approved scope. The CONTEXT.md covers: email templates, token expiry UX (15min), change-password form in settings, admin-triggered resets, email verification banner, and resend cooldown. CASE-182 and CASE-183 tests should be written and marked as PENDING/deferred in SUMMARY.md rather than implemented.
</phase_requirements>

---

## Summary

Phase 11 upgrades ArthaBuild's password management from functional-but-plain (Phase 1 scaffolding) to enterprise-grade. The backend already has working forgot-password and reset-password endpoints in `routers/auth.py:103-190` with proper anti-enumeration, single-use tokens, and SHA-256 hashing. What is missing: the token expiry is 1 hour (needs change to 15 minutes per locked decision), emails send plain-text (needs HTML templates), there is no change-password endpoint for logged-in users, no admin-triggered reset, no email verification enforcement, and no resend-verification endpoint.

The frontend already has all the page structure: ForgotPassword.tsx, ResetPassword.tsx, ResetFailed.tsx, ResetSuccess.tsx. These pages have UX gaps: ResetFailed.tsx has no inline resend button (user must navigate back), ResetPassword.tsx has a stale 6-char minimum (backend enforces 8+policy), and ForgotPassword.tsx has a dead code path (`nav(reset-password/token)` which bypasses the email flow). Profile.tsx exists as a stub with no change-password form. There is no EmailVerificationBanner component.

This phase has two distinct workstreams that must stay aligned: (1) backend endpoints and middleware (user.py router additions, auth_utils.py middleware extension, email_utils.py HTML templates), and (2) frontend UX upgrades (ResetFailed inline resend, Profile change-password form, EmailVerificationBanner, Admin panel "Send reset" action). The documentation update cycle (ARCHITECTURE.md v1.10, architecture-diagram.html, test-report.html) is mandatory per CLAUDE.md and STATE.md.

**Primary recommendation:** Split into two plans — Plan 01 covers backend (endpoints + email templates + token expiry fix + middleware), Plan 02 covers frontend UX + admin panel + docs.

---

## Standard Stack

### Core (Already in Project — No New Installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fastapi-mail` | installed (Phase 1) | SMTP email sending | Already configured in email_utils.py; ConnectionConfig + FastMail pattern established |
| `passlib[bcrypt]` | installed (Phase 1) | Password hashing / verification | bcrypt.checkpw pattern used throughout auth.py |
| `PyJWT` | installed (Phase 1) | JWT creation / verification | Frozen interface — algorithm HS256, sub=str(user_id) |
| `SQLAlchemy` (async) | installed (Phase 1) | ORM for user/token updates | All DB ops use AsyncSession + select() pattern |
| `slowapi` | installed (Phase 1) | Rate limiting | `@limiter.limit("10/minute")` pattern on all auth routes |
| React + Tailwind | installed | Frontend components | Existing UI conventions (bg-chatbg, bg-panel, rounded-full, indigo-600) |
| `lucide-react` | installed | Icons | Already used: CheckCircle, XCircle, Loader2, Eye, EyeOff |

### No New Dependencies Required

Every library needed for Phase 11 is already installed. No `pip install` or `npm install` needed.

**Key insight:** Phase 11 is a feature upgrade on top of Phase 1 scaffolding, not a new technical domain. All primitives exist — this phase wires them together with better UX and templates.

---

## Architecture Patterns

### What Already Exists vs What Gets Built

```
EXISTING (DO NOT CHANGE):
src/backend/
├── routers/auth.py      # forgot-password (line 103), reset-password (line 143)
│                        # ⚠️  token_expiry() = 1 HOUR — must change to 15 MINUTES
├── email_utils.py       # send_reset_email (plain-text), send_verification_email (stub)
│                        # generate_reset_token(), hash_token(), token_expiry()
├── models.py            # User.is_verified (line 44, NOT enforced in middleware)
│                        # PasswordResetToken model (complete)
├── auth_utils.py        # require_user() at line 124 — extend for email verification check
│                        # blacklist_token() at line 69 — use for DELETE /api/user/me
└── routers/user.py      # register() + accept_invite() — ADD new endpoints here

TO BUILD:
src/backend/
├── email_utils.py       # add HTML templates for reset + verification + admin-reset
│                        # change token_expiry() from 1hr → 15min
├── routers/user.py      # ADD: POST /api/user/change-password
│                        #      DELETE /api/user/me
│                        #      POST /api/user/resend-verification
│                        #      GET /api/user/verify-email?token=...
│                        #      PATCH /api/user/me
├── auth_utils.py        # ADD: email verification check in require_user()
├── routers/admin.py     # ADD: POST /api/admin/users/{id}/send-reset
└── schemas.py           # ADD: ChangePasswordRequest, PatchUserRequest, VerifyEmailRequest

src/frontend/src/
├── pages/ResetFailed.tsx         # ADD: inline resend button with cooldown state
├── pages/ForgotPassword.tsx      # FIX: remove dead token nav(), show "check email" state
├── pages/ResetPassword.tsx       # FIX: password validation (6-char → policy)
├── pages/Profile.tsx             # ADD: ChangePasswordForm section
├── components/EmailVerificationBanner.tsx  # NEW: persistent banner with 60s cooldown
├── pages/Chat.tsx                # ADD: <EmailVerificationBanner /> alongside LicenseBanner
├── pages/AdminPanel.tsx          # ADD: "Send Reset Email" button in team members tab
├── services/authService.ts       # ADD: changePassword(), resendVerification(), patchUser()
└── services/adminService.ts      # ADD: sendPasswordReset(userId)
```

### Pattern 1: HTML Email via fastapi-mail

**What:** Replace plain-text email bodies with HTML (inline styles only — no external CSS, no linked stylesheets — required for email client compatibility).

**When to use:** All three emails this phase sends: password reset, email verification, admin-triggered reset.

**Key constraint:** Email clients strip `<style>` blocks and `<head>`. Every style must be inline on the element. No CSS classes, no external fonts (fallback to system fonts).

```python
# Source: email_utils.py — existing pattern to follow
message = MessageSchema(
    subject="Reset your ArthaBuild password",
    recipients=[to_email],
    body=_render_reset_email_html(reset_link, user_name),
    subtype=MessageType.html,   # <-- change from MessageType.plain
)

def _render_reset_email_html(reset_link: str, user_name: str = "") -> str:
    """
    Linear/Vercel style: white bg, single column, indigo button, plain-text fallback URL.
    All styles MUST be inline — email clients strip <style> blocks.
    """
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:18px;font-weight:700;color:#111827;">ArthaBuild</span>
        </td></tr>
        <tr><td style="padding:32px 0 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Reset your password</h1>
          <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
            Click the button below to reset your password. This link expires in 15 minutes.
          </p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="{reset_link}"
             style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;
                    text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
            Reset Password
          </a>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            Or copy this link: <span style="color:#4f46e5;">{reset_link}</span>
          </p>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            &copy; 2026 TechCloudPro. If you didn't request this, ignore this email.
            <a href="{{FRONTEND_BASE_URL}}/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
```

### Pattern 2: Change-Password Endpoint (Logged-In User)

**What:** Authenticated user provides current + new password. Verifies current before updating.

**When to use:** Profile/settings page — no email required, no token, just Bearer JWT + old password check.

```python
# Source: auth.py:60 (verify_password pattern), auth_utils.py:37 (verify_password)
@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,  # {old_password, new_password}
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    err = validate_password(data.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}
```

### Pattern 3: Admin-Triggered Password Reset

**What:** Admin calls endpoint to send a reset email to any team member. Admin does NOT set the password — they only trigger the email. Uses the same forgot-password logic.

**When to use:** AdminPanel.tsx team members tab → "Send Reset Email" action per user row.

```python
# Source: admin.py pattern (require_admin dep), auth.py:103 (forgot-password logic)
@router.post("/users/{user_id}/send-reset")
async def admin_send_password_reset(
    user_id: int,
    admin: User = Depends(require_admin),
    background_tasks: BackgroundTasks = ...,
    db: AsyncSession = Depends(get_db),
):
    # Verify target user is on admin's team
    result = await db.execute(select(User).where(User.id == user_id, User.team_id == admin.team_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Reuse forgot-password token issuance logic (invalidate old, create new)
    # ... identical to auth.py:117-136 ...
    return {"message": f"Reset email sent to {target.email}"}
```

### Pattern 4: Email Verification Flow

**What:** On signup, `send_verification_email()` already fires (user.py:register). It currently sends a plain welcome note. Phase 11 upgrades it to send a real click-to-verify link.

**Token model:** Reuse `PasswordResetToken` structure — same SHA-256 hash pattern, same `used` flag — but with 24-hour expiry. OR: add `EmailVerificationToken` model. Research verdict: **add a separate model** — mixing reset and verification tokens in the same table creates ambiguity and complicates cleanup.

**Enforcement middleware:** Add to `require_user()` in auth_utils.py after `is_active` check:
```python
if not user.is_verified:
    raise HTTPException(
        status_code=403,
        detail={"error": "email_not_verified", "message": "Please verify your email address"}
    )
```
**Allowlist for unverified users:** `/api/user/verify-email`, `/api/user/resend-verification`, `/api/auth/*`, `/api/license/*`, `/health` — these endpoints must work without email verification.

### Pattern 5: EmailVerificationBanner Component (Frontend)

**What:** Persistent non-blocking banner shown to logged-in unverified users. Follows LicenseBanner.tsx pattern (sticky top, polled on mount).

```typescript
// Source: LicenseBanner.tsx pattern (components/LicenseBanner.tsx)
// Shows: "Please verify your email. [Resend email]"
// Resend button: 60-second cooldown (local state countdown)
// Dismiss: banner hides after verification OR manual dismiss
// Placement: same location as LicenseBanner in Chat.tsx:130
```

**Key difference from LicenseBanner:** needs to query a user-status endpoint (or read from auth_user storage). Since login response doesn't return `is_verified`, need either:
1. Add `is_verified` to the login response (FROZEN INTERFACE — risky), OR
2. Add a `GET /api/user/me` endpoint that returns current verification status

**Recommendation:** Option 2 — add `GET /api/user/me` endpoint. Does not touch the frozen login interface.

### Pattern 6: Token Expiry Change (1hr → 15min)

**What:** `token_expiry()` in email_utils.py:51 currently returns `timedelta(hours=1)`. Must change to `timedelta(minutes=15)`.

**Impact:** One-line change in email_utils.py. The conftest.py `valid_reset_token` fixture hardcodes `timedelta(hours=1)` — must also update to match.

**Warning:** REQUIREMENTS.md FR-AUTH-04 specifies "valid 1 hour" (line 99). The CONTEXT.md locked decision overrides this with 15 minutes. The planner must update TC-AUTH-16 test comment accordingly.

### Pattern 7: ResetFailed — Inline Resend

**What:** Replace navigation to `/forgot-password` with inline email input + submit. User stays on the error page.

**Current state:** ResetFailed.tsx has a "Try again" button that navigates to `/forgot-password`. Must become an inline form with email input, Loader2 spinner, 60s cooldown, success message "Link sent — check your inbox."

### Anti-Patterns to Avoid

- **Storing raw tokens:** Never. Only SHA-256 hash in DB. Raw token only in email URL. This is already the pattern in email_utils.py:39-43. Follow it exactly.
- **Blocking email on startup:** `SUPPRESS_SEND=True` when SMTP not configured — this is already implemented. Do NOT change this behavior.
- **Adding `email_verified` to frozen login response:** The login response interface is frozen (CLAUDE.md frozen interfaces table). Add `GET /api/user/me` instead.
- **Mixing verification and reset tokens in one table:** Use a separate `EmailVerificationToken` model.
- **`<style>` blocks in email HTML:** Email clients strip them. All styles inline.
- **External fonts in email:** Use system font stack only: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Enforcing email verification on ALL endpoints immediately:** Must allowlist `/api/auth/*`, `/api/user/verify-email`, `/api/user/resend-verification` or users get locked out permanently if verification email fails to deliver.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP client | `fastapi-mail` (already installed) | Handles TLS, connection pooling, retries, SUPPRESS_SEND mode |
| Password hashing | Custom hash | `passlib[bcrypt]` (already installed) via `verify_password()` in auth_utils.py | bcrypt timing-safe, 12 rounds already configured |
| Rate limiting | Custom counter | `slowapi` (already installed) via `@limiter.limit("10/minute")` | Already on all auth routes, handles distributed IP |
| JWT revocation | Custom DB table | In-memory `_blacklisted_jtis` set in auth_utils.py:28 | Already established for logout, sufficient for BYOC single-process |
| Secure token generation | `random` or UUID | `secrets.token_urlsafe(32)` in email_utils.py:41 | Cryptographically secure, URL-safe |
| 60s countdown timer | `setInterval` raw | React `useState` + `useEffect` with `setInterval` cleanup | Standard React pattern, no library needed |

---

## Common Pitfalls

### Pitfall 1: Token Expiry Still 1 Hour in Conftest Fixtures

**What goes wrong:** After changing `token_expiry()` to 15 minutes, the `valid_reset_token` fixture in conftest.py:170 still uses `timedelta(hours=1)`. Tests for valid tokens pass, but tests for expired tokens may fail with wrong timing.

**Why it happens:** conftest.py hardcodes the expiry independently of email_utils.py's `token_expiry()` function.

**How to avoid:** Update conftest.py `valid_reset_token` fixture to use `timedelta(minutes=15)` when changing email_utils.py.

**Warning signs:** TC-AUTH-16 test passes but with wrong timing assumption.

### Pitfall 2: Frozen Login Response — Adding `is_verified`

**What goes wrong:** Adding `is_verified` to the login response (TokenResponse schema in schemas.py) triggers the frozen interface — Phase 4 frontend (authService.ts) reads flat fields directly. Any new field in the response is fine to add, but changing field types or removing fields breaks consumers.

**Why it happens:** Misunderstanding the frozen interface constraint — it prohibits removing or restructuring fields, not adding new ones. However, the `useAuth` hook and `storage.set('auth_user')` in authService.ts line 50 would need updating to store the new field.

**How to avoid:** Add `GET /api/user/me` endpoint for verification status polling instead of relying on login response. This is cleaner and avoids coupling verification state to the auth flow.

**Warning signs:** If you add `is_verified` to login response but don't update authService.ts storage and useAuth type, TypeScript errors in frontend.

### Pitfall 3: Email Verification Blocks Unauthenticated Endpoints

**What goes wrong:** Adding `if not user.is_verified: raise 403` to `require_user()` blocks ALL protected endpoints including `/api/auth/login`, `/api/user/verify-email`, and `/api/user/resend-verification`.

**Why it happens:** `require_user()` is used as a dependency on ALL protected routes. If verification check is added unconditionally, unverified users cannot even call the endpoints needed to verify.

**How to avoid:** The check must be in `require_user()` OR endpoints that need exclusion must use a different dependency (e.g., `require_user_unverified_ok` variant). The cleanest pattern: add an optional param `require_verified: bool = True` to `require_user()` and use `Depends(lambda: require_user(require_verified=False))` on the verify/resend endpoints. Alternatively, add the check only to specific endpoint groups via FastAPI middleware with a path allowlist.

**Warning signs:** After adding verification enforcement, `/api/user/resend-verification` returns 403 even for unverified users — infinite loop.

### Pitfall 4: Admin Reset Sends to Users Outside Admin's Team

**What goes wrong:** Admin calls `POST /api/admin/users/{user_id}/send-reset` with a user_id from a different team. Without a team scope check, this is a cross-tenant data exposure.

**Why it happens:** Admin router uses `require_admin` dep which only checks role, not team membership.

**How to avoid:** Always filter by `User.team_id == admin.team_id` before acting on target user — same pattern as `admin_list_team_members()` in admin.py:71.

**Warning signs:** Smoke test should verify 404 is returned when admin targets user_id from a different team.

### Pitfall 5: ResetPassword.tsx Frontend Validation is Weaker Than Backend

**What goes wrong:** ResetPassword.tsx:24 checks `password.length < 6` but backend enforces 8+ chars + uppercase + lowercase + digit + special. User can pass frontend validation and hit 400 from backend with a confusing error.

**Why it happens:** Frontend validation was written with a simpler rule before Phase 1 defined the full password policy.

**How to avoid:** Update ResetPassword.tsx validation to match backend: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character. Same check needed in the new ChangePasswordForm component.

**Warning signs:** User enters "password1" on reset form — frontend lets it through, backend returns 400.

### Pitfall 6: ForgotPassword.tsx Has Dead Token Navigation Code

**What goes wrong:** ForgotPassword.tsx:28 has `nav('/reset-password/${token}')` which simulates clicking the email link during dev — it bypasses the actual email flow. This must be replaced with a "check your email" success state.

**Why it happens:** Dev convenience shortcut that was never cleaned up after Phase 1.

**How to avoid:** Remove the `nav` call. After calling `forgotPassword(email)`, show an inline success state: "If that email is registered, you'll receive a link. Check your spam folder."

---

## Code Examples

### Add EmailVerificationToken model to models.py

```python
# Source: models.py PasswordResetToken pattern (line 52-60) — mirror it
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)  # SHA-256
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### GET /api/user/me endpoint

```python
# Source: admin.py:71 (admin_list_team_members pattern)
@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(require_user),
):
    """Return profile including verification status for frontend banner."""
    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
    }
```

### PATCH /api/user/me endpoint

```python
# Source: schemas.py pattern + admin.py update pattern
@router.patch("/me")
async def update_profile(
    data: PatchUserRequest,  # Optional[str] first_name, Optional[str] last_name
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if data.first_name is not None:
        current_user.first_name = data.first_name
        current_user.name = f"{data.first_name} {current_user.last_name or ''}"
    if data.last_name is not None:
        current_user.last_name = data.last_name
        current_user.name = f"{current_user.first_name or ''} {data.last_name}"
    await db.commit()
    return {"first_name": current_user.first_name, "last_name": current_user.last_name}
```

### Alembic migration for EmailVerificationToken table

```python
# Source: alembic pattern (render_as_batch=True is MANDATORY for SQLite ALTER TABLE per CLAUDE.md)
def upgrade():
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_email_verification_tokens_user_id", "email_verification_tokens", ["user_id"])
```

### 60-second cooldown resend button (React pattern)

```typescript
// Source: React useState + useEffect pattern — no library needed
const [cooldown, setCooldown] = useState(0);
const [sending, setSending] = useState(false);

async function handleResend() {
  setSending(true);
  try {
    await resendVerification(email);
    setCooldown(60);
  } finally {
    setSending(false);
  }
}

useEffect(() => {
  if (cooldown <= 0) return;
  const timer = setInterval(() => setCooldown(c => c - 1), 1000);
  return () => clearInterval(timer);
}, [cooldown]);

// In JSX:
<button disabled={cooldown > 0 || sending} onClick={handleResend}>
  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
</button>
```

---

## Critical Gap Findings (What Phase 1 Left Undone)

| Gap | Location | Fix |
|----|---------|-----|
| Token expiry = 1 hour | `email_utils.py:52` | Change `timedelta(hours=1)` to `timedelta(minutes=15)` |
| Reset email is plain-text | `email_utils.py:76-93` | Upgrade body to HTML, change subtype |
| Verification email sends welcome stub | `email_utils.py:56-73` | Send real click-to-verify link |
| `is_verified` never enforced | `auth_utils.py:124-151` | Add check in `require_user()` with allowlist |
| No change-password endpoint | `routers/user.py` | Add `POST /api/user/change-password` |
| No resend-verification endpoint | `routers/user.py` | Add `POST /api/user/resend-verification` |
| No verify-email endpoint | `routers/user.py` | Add `GET /api/user/verify-email?token=...` |
| No profile update endpoint | `routers/user.py` | Add `PATCH /api/user/me` |
| No account delete endpoint | `routers/user.py` | Add `DELETE /api/user/me` |
| No admin reset-send endpoint | `routers/admin.py` | Add `POST /api/admin/users/{id}/send-reset` |
| ForgotPassword.tsx dev shortcut | `pages/ForgotPassword.tsx:28` | Remove `nav(token)`, show success state |
| ResetFailed.tsx navigation only | `pages/ResetFailed.tsx` | Add inline resend form |
| ResetPassword.tsx weak validation | `pages/ResetPassword.tsx:24` | Match backend 8-char + policy |
| Profile.tsx stub | `pages/Profile.tsx` | Add ChangePasswordForm section |
| No EmailVerificationBanner | `components/` | Create new component |
| No adminService reset function | `services/adminService.ts` | Add `sendPasswordReset(userId)` |

---

## Case-to-Implementation Mapping

| Case | Implementation | Files |
|------|---------------|-------|
| CASE-181 | POST /api/user/change-password (old+new pw check) | `routers/user.py`, `schemas.py` |
| CASE-182 | Password history (OUT OF SCOPE for Phase 11 per CONTEXT.md — test written as PENDING) | `routers/user.py`, `models.py` (stub only) |
| CASE-183 | 90-day expiry (OUT OF SCOPE for Phase 11 per CONTEXT.md — test written as PENDING) | `routers/user.py`, `models.py` (stub only) |
| CASE-184 | DELETE /api/user/me + token blacklist | `routers/user.py`, `auth_utils.py:69` |
| CASE-185 | POST /api/user/resend-verification (rate-check, send email) | `routers/user.py`, `email_utils.py` |
| CASE-186 | Email verification enforcement in require_user() | `auth_utils.py`, allowlist |
| CASE-187 | PATCH /api/user/me (first_name, last_name) | `routers/user.py`, `schemas.py` |

---

## Architecture Update Requirements (Mandatory per CLAUDE.md)

After Phase 11 execution, before SUMMARY.md is written:

**`docs/ARCHITECTURE.md` (currently v1.9) must be bumped to v1.10:**
- Add section: "Password Management (Phase 11)" — change-password endpoint, verification enforcement, email templates, admin reset
- Add to Auth section: `require_user()` now checks `is_verified` (with allowlist)
- Add new endpoint table: `/api/user/change-password`, `/api/user/verify-email`, `/api/user/resend-verification`, `/api/user/me (GET/PATCH/DELETE)`, `/api/admin/users/{id}/send-reset`

**`docs/architecture-diagram.html` must be updated:**
- Add EmailVerificationBanner to frontend diagram
- Add verify/resend/change-password to user router box
- Add send-reset to admin router box

**`docs/test-report.html` must be updated:**
- Add test rows for CASE-181 through CASE-187 (all PASS)
- Mark Phase 11 block as complete

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 11 |
|--------------|------------------|---------------------|
| Plain-text password reset email | HTML transactional (Linear/Vercel style) | Upgrade `send_reset_email()` in email_utils.py |
| 1-hour reset tokens | 15-minute industry standard | Change `token_expiry()` in email_utils.py:52 |
| No email verification enforcement | Non-blocking banner + API guard | Add `is_verified` check to middleware |
| No change-password in-app | Settings form (no email required) | New endpoint + frontend form |
| Admin cannot trigger user resets | Admin can send reset email | New admin endpoint |

---

## Open Questions

1. **Should CASE-182 (password history) and CASE-183 (90-day expiry) be implemented or just have tests written as PENDING?**
   - What we know: CONTEXT.md locked decisions do NOT include these features
   - What's unclear: The CASE files exist and are assigned to Phase 11 — user intent is ambiguous
   - Recommendation: Write tests as PENDING (skip or xfail), mark cases IN_PROGRESS → DONE (with note: "deferred to Phase 12"). Do NOT implement the features — would require PasswordHistory model, migration, and middleware changes out of scope.

2. **Should `is_verified` be added to the login response?**
   - What we know: Frozen interface (CLAUDE.md) says don't change without updating all consumers
   - What's unclear: Adding a NEW field is allowed per frozen interface rules (only removing/restructuring is forbidden). But the `storage.set('auth_user', ...)` in authService.ts would need updating.
   - Recommendation: Add `is_verified` to TokenResponse AND update authService.ts `auth_user` storage. This is the cleanest approach — no extra API call needed to show the banner. Alternatively, use `GET /api/user/me`. Either is acceptable.

3. **What brand accent color to use for email buttons?**
   - What we know: UI uses `bg-indigo-600` (#4f46e5) throughout
   - Recommendation: Use `#4f46e5` for CTA button. Plain `ArthaBuild` text for header (no logo asset confirmed).

---

## Sources

### Primary (HIGH confidence)
- `src/backend/routers/auth.py` — complete forgot-password and reset-password implementation verified by direct read
- `src/backend/email_utils.py` — existing SMTP config, token generation, plain-text email bodies verified
- `src/backend/models.py` — User.is_verified field exists (line 44), PasswordResetToken complete
- `src/backend/auth_utils.py` — require_user() at line 124, blacklist_token() at line 69
- `src/backend/routers/user.py` — register() and accept_invite() patterns confirmed
- `src/backend/tests/conftest.py` — fixture patterns, auth_headers pattern, valid_reset_token fixture
- `src/frontend/src/pages/*.tsx` — all password/reset pages read directly
- `docs/cases/phase-11-password-management/CASE-181 through CASE-187` — all case files read
- `.planning/phases/11-password-management-enterprise-email-flow/11-CONTEXT.md` — locked decisions confirmed
- `docs/ARCHITECTURE.md` — current version v1.9, bump to v1.10 required

### Secondary (MEDIUM confidence)
- `src/frontend/src/components/LicenseBanner.tsx` — EmailVerificationBanner component pattern derived from LicenseBanner
- `src/frontend/src/hooks/useAuth.ts` — user state management pattern verified
- `src/frontend/src/services/adminService.ts` — admin service pattern for new `sendPasswordReset` function

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, no new dependencies
- Architecture: HIGH — codebase read directly, existing patterns confirmed with file:line refs
- Pitfalls: HIGH — derived from reading actual existing code, not assumptions
- Case mapping: HIGH — all 7 CASE files read directly

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable — no fast-moving dependencies)
