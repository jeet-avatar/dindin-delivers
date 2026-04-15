import secrets
import hashlib
import os
import logging
from datetime import datetime, timedelta, timezone
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_CONFIGURED = bool(SMTP_HOST)

if not SMTP_CONFIGURED:
    logger.warning("SMTP_HOST not configured — password reset emails will be suppressed")

_FALLBACK_EMAIL = "noreply@example.com"
_smtp_user = os.getenv("SMTP_USER", _FALLBACK_EMAIL)
# MAIL_FROM must be a valid email address — use fallback when SMTP is not configured
_mail_from = os.getenv("SMTP_FROM", _smtp_user) or _FALLBACK_EMAIL

mail_conf = ConnectionConfig(
    MAIL_USERNAME=_smtp_user,
    MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", ""),
    MAIL_FROM=_mail_from,
    MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
    MAIL_SERVER=os.getenv("SMTP_HOST", "localhost"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=SMTP_CONFIGURED,
    VALIDATE_CERTS=SMTP_CONFIGURED,
    SUPPRESS_SEND=not SMTP_CONFIGURED,  # Non-fatal: suppress instead of raising if no SMTP
)
fm = FastMail(mail_conf)


# ---------------------------------------------------------------------------
# Private HTML renderers (inline styles, single-column, ArthaBuild branding)
# ---------------------------------------------------------------------------

def _render_reset_email_html(reset_link: str, expiry_minutes: int = 15) -> str:
    """White bg, single column, ArthaBuild header, indigo CTA, plain-text fallback."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset your ArthaBuild password</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Reset your password</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            We received a request to reset the password for your ArthaBuild account.
            Click the button below to set a new password. This link expires in {expiry_minutes} minutes.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="{reset_link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Reset Password
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{reset_link}" style="color:#4f46e5;word-break:break-all;">{reset_link}</a>
          </p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _render_verification_email_html(verify_link: str, user_email: str) -> str:
    """Same shell as reset email but for email address verification. Link expires in 24 hours."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your ArthaBuild email address</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Verify your email address</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Click below to verify your email address for ArthaBuild.
            This link expires in 24 hours.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="{verify_link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Verify Email
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{verify_link}" style="color:#4f46e5;word-break:break-all;">{verify_link}</a>
          </p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">
            If you didn't create an ArthaBuild account with {user_email}, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _render_admin_reset_email_html(reset_link: str, admin_name: str, expiry_minutes: int = 15) -> str:
    """Same shell as reset email but body clarifies an admin triggered the reset."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Password reset requested by your administrator</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Password reset requested</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Your account administrator (<strong>{admin_name}</strong>) has initiated a password reset for your account.
            Click the button below to set a new password. This link expires in {expiry_minutes} minutes.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="{reset_link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Reset Password
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{reset_link}" style="color:#4f46e5;word-break:break-all;">{reset_link}</a>
          </p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">
            If you did not expect this reset, please contact your administrator immediately.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Token utilities
# ---------------------------------------------------------------------------

def generate_reset_token() -> tuple[str, str]:
    """Returns (raw_token_for_email_url, sha256_hash_for_db)"""
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_token(raw: str) -> str:
    """Hash a raw token for DB lookup."""
    return hashlib.sha256(raw.encode()).hexdigest()


def token_expiry() -> datetime:
    """15 minutes from now, UTC. (Industry standard for password reset links.)"""
    return datetime.now(timezone.utc) + timedelta(minutes=15)


# ---------------------------------------------------------------------------
# Email send functions
# ---------------------------------------------------------------------------

async def send_verification_email(to_email: str, verify_link: str = ""):
    """Send HTML click-to-verify email. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — verification link for {to_email}: {verify_link}")
        return
    body = _render_verification_email_html(verify_link, to_email)
    message = MessageSchema(
        subject="Verify your ArthaBuild email address",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


async def send_reset_email(to_email: str, reset_link: str):
    """Send HTML password reset email. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — reset link for {to_email}: {reset_link}")
        return
    body = _render_reset_email_html(reset_link)
    message = MessageSchema(
        subject="Reset your ArthaBuild password",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


async def send_admin_reset_email(to_email: str, reset_link: str, admin_name: str):
    """Send HTML admin-triggered password reset email. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — admin reset link for {to_email}: {reset_link}")
        return
    body = _render_admin_reset_email_html(reset_link, admin_name)
    message = MessageSchema(
        subject="Password reset requested by your administrator",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


def _render_invite_email_html(invite_link: str) -> str:
    """White bg, single column, ArthaBuild header, indigo CTA, invite body."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You've been invited to join ArthaBuild</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">You've been invited to join ArthaBuild</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            A team member has invited you to collaborate on ArthaBuild &mdash; your AI-powered NetSuite automation platform.
            Click the button below to accept your invitation (valid for 7 days).
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="{invite_link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Accept Invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_invite_email(to_email: str, raw_token: str):
    """Send HTML team invite email. Silently skipped if SMTP not configured."""
    frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    invite_link = f"{frontend_base_url}/accept-invite?token={raw_token}"

    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — invite link for {to_email}: {invite_link}")
        return

    body = _render_invite_email_html(invite_link)
    message = MessageSchema(
        subject="You've been invited to join ArthaBuild",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


def _render_welcome_email_html(first_name: str) -> str:
    """Welcome email rendered after email verification. Indigo header, ArthaBuild branding."""
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to ArthaBuild!</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Welcome to ArthaBuild, {first_name}!</h2>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Your email is verified and your account is ready to go.
          </p>
          <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
            <li>Ask questions about your NetSuite setup</li>
            <li>Generate SuiteScripts with one prompt</li>
            <li>Deploy directly to your NetSuite sandbox</li>
          </ul>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="{frontend_url}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Open ArthaBuild
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_welcome_email(to_email: str, first_name: str):
    """Send HTML welcome email after email verification. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — welcome email for {to_email}")
        return
    body = _render_welcome_email_html(first_name)
    message = MessageSchema(
        subject="Welcome to ArthaBuild \u2014 you're all set!",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


def _render_password_changed_email_html(first_name: str, changed_at: str) -> str:
    """Password changed confirmation email. Includes warning block for unauthorized changes."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ArthaBuild password changed</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Your password was changed</h2>
          <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
            Hi {first_name}, your ArthaBuild password was successfully changed on {changed_at} UTC.
          </p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            If this was you, no further action is needed.
          </p>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin:16px 0;">
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
              If you did not make this change, contact support immediately at
              <a href="mailto:support@artha.build" style="color:#ef4444;">support@artha.build</a>
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_password_changed_email(to_email: str, first_name: str):
    """Send password changed confirmation email. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — password changed email for {to_email}")
        return
    changed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    body = _render_password_changed_email_html(first_name, changed_at)
    message = MessageSchema(
        subject="Your ArthaBuild password was changed",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


def _render_script_deployed_email_html(first_name: str, script_name: str, target_env: str) -> str:
    """Script deployed confirmation email. Links to NetSuite for verification."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Script deployed &mdash; ArthaBuild</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Script deployed successfully</h2>
          <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
            Hi {first_name}, your SuiteScript '<strong>{script_name}</strong>' was successfully deployed to <strong>{target_env}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
            You can verify the deployment by logging into NetSuite and checking your script records.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="https://system.netsuite.com" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Open NetSuite
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_script_deployed_email(to_email: str, first_name: str, script_name: str, target_env: str):
    """Send script deployed confirmation email. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — script deployed email for {to_email} ({script_name})")
        return
    body = _render_script_deployed_email_html(first_name, script_name, target_env)
    message = MessageSchema(
        subject=f"Script deployed: {script_name}",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


def _render_quota_warning_email_html(first_name: str, used: int, limit: int) -> str:
    """Quota warning email for free-tier users approaching script generation limit."""
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ArthaBuild script limit warning</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ArthaBuild</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">You're almost at your free script limit</h2>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Hi {first_name}, you've used <strong>{used} of {limit}</strong> free script generations this month.
          </p>
          <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin:16px 0;">
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
              When you reach {limit}, new script generations will be paused until next month.
            </p>
          </div>
          <p style="margin:16px 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Upgrade to Starter for 10 scripts/month, or Growth for 100.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#4f46e5;">
              <a href="{frontend_url}/#pricing" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Upgrade Plan
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; 2026 TechCloudPro &bull;
            <a href="https://techcloudpro.com/privacy" style="color:#9ca3af;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_quota_warning_email(to_email: str, first_name: str, used: int, limit: int):
    """Send quota warning email when user approaches their free script limit. Silently skipped if SMTP not configured."""
    if not SMTP_CONFIGURED:
        logger.debug(f"SMTP suppressed — quota warning email for {to_email} ({used}/{limit})")
        return
    body = _render_quota_warning_email_html(first_name, used, limit)
    message = MessageSchema(
        subject="You're almost at your free script limit",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)
