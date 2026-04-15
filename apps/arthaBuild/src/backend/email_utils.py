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
# Brand constants
# ---------------------------------------------------------------------------
_BRAND_HEADER = """
  <tr>
    <td style="background:linear-gradient(135deg,#0a0e1e 0%,#0d1128 100%);padding:0;">
      <div style="height:3px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4);"></div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:28px 40px;">
          <span style="font-family:'Outfit','DM Sans',-apple-system,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">Artha<span style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Build</span></span>
          <span style="display:block;font-family:'DM Sans',-apple-system,sans-serif;font-size:11px;color:#8b5cf6;letter-spacing:0.5px;margin-top:2px;">Your Always-On ERP AI Agent</span>
        </td></tr>
      </table>
    </td>
  </tr>"""

_BRAND_FOOTER = """
  <tr>
    <td style="background:linear-gradient(135deg,#0a0e1e 0%,#0d1128 100%);padding:24px 40px;border-top:1px solid rgba(99,102,241,0.2);">
      <p style="margin:0;font-family:'DM Sans',-apple-system,sans-serif;color:#6b7280;font-size:12px;line-height:1.6;">
        &copy; 2026 ArthaBuild &bull; A <a href="https://techcloudpro.com" style="color:#8b5cf6;text-decoration:none;">TechCloudPro</a> product &bull;
        <a href="https://artha.build/privacy" style="color:#6b7280;text-decoration:none;">Privacy Policy</a>
      </p>
    </td>
  </tr>"""

def _cta_button(label: str, href: str) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);box-shadow:0 4px 16px rgba(99,102,241,0.35);">
              <a href="{href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-family:'DM Sans',-apple-system,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">
                {label}
              </a>
            </td></tr>
          </table>"""

def _email_shell(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
        {_BRAND_HEADER}
        <tr><td style="background:#ffffff;padding:40px;">
          {body_html}
        </td></tr>
        {_BRAND_FOOTER}
      </table>
    </td></tr>
  </table>
</body>
</html>"""

# ---------------------------------------------------------------------------
# Private HTML renderers (inline styles, single-column, ArthaBuild branding)
# ---------------------------------------------------------------------------

def _render_reset_email_html(reset_link: str, expiry_minutes: int = 15) -> str:
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">Reset your password</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            We received a request to reset the password for your ArthaBuild account.
            Click the button below to set a new password. This link expires in <strong>{expiry_minutes} minutes</strong>.
          </p>
          {_cta_button("Reset Password", reset_link)}
          <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="{reset_link}" style="color:#6366f1;word-break:break-all;">{reset_link}</a>
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
            If you didn't request this, you can safely ignore this email.
          </p>"""
    return _email_shell("Reset your ArthaBuild password", body)


def _render_verification_email_html(verify_link: str, user_email: str) -> str:
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">Verify your email address</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            One quick step — verify your email to activate your ArthaBuild account.
            This link expires in <strong>24 hours</strong>.
          </p>
          {_cta_button("Verify Email", verify_link)}
          <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="{verify_link}" style="color:#6366f1;word-break:break-all;">{verify_link}</a>
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
            If you didn't create an account with {user_email}, you can safely ignore this email.
          </p>"""
    return _email_shell("Verify your ArthaBuild email address", body)


def _render_admin_reset_email_html(reset_link: str, admin_name: str, expiry_minutes: int = 15) -> str:
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">Password reset requested</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Your account administrator (<strong>{admin_name}</strong>) has initiated a password reset for your account.
            Click the button below to set a new password. This link expires in <strong>{expiry_minutes} minutes</strong>.
          </p>
          {_cta_button("Reset Password", reset_link)}
          <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="{reset_link}" style="color:#6366f1;word-break:break-all;">{reset_link}</a>
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
            If you did not expect this reset, please contact your administrator immediately.
          </p>"""
    return _email_shell("Password reset requested by your administrator", body)


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
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">You've been invited to join ArthaBuild</h2>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            A team member has invited you to collaborate on ArthaBuild — your AI-powered NetSuite automation platform.
            Click the button below to accept your invitation. <strong>Valid for 7 days.</strong>
          </p>
          {_cta_button("Accept Invitation", invite_link)}
          <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>"""
    return _email_shell("You've been invited to join ArthaBuild", body)


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
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">Welcome to ArthaBuild, {first_name}!</h2>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Your email is verified and your account is ready. Here's what you can do right now:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;width:100%;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <span style="color:#6366f1;font-size:16px;margin-right:10px;">&#9679;</span>
                <span style="color:#374151;font-size:14px;">Ask questions about your NetSuite setup</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <span style="color:#8b5cf6;font-size:16px;margin-right:10px;">&#9679;</span>
                <span style="color:#374151;font-size:14px;">Generate SuiteScripts with one prompt</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;">
                <span style="color:#06b6d4;font-size:16px;margin-right:10px;">&#9679;</span>
                <span style="color:#374151;font-size:14px;">Deploy directly to your NetSuite sandbox</span>
              </td>
            </tr>
          </table>
          {_cta_button("Open ArthaBuild", frontend_url)}"""
    return _email_shell("Welcome to ArthaBuild!", body)


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
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">Your password was changed</h2>
          <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
            Hi {first_name}, your ArthaBuild password was successfully changed on <strong>{changed_at} UTC</strong>.
          </p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">If this was you, no further action is needed.</p>
          <div style="background:#fff1f2;border-left:3px solid #f43f5e;padding:14px 18px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
              <strong>Wasn't you?</strong> Contact us immediately at
              <a href="mailto:support@artha.build" style="color:#f43f5e;text-decoration:none;font-weight:600;">support@artha.build</a>
            </p>
          </div>"""
    return _email_shell("Your ArthaBuild password was changed", body)


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
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">Script deployed successfully &#10003;</h2>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Hi {first_name}, your SuiteScript has been deployed.
          </p>
          <div style="background:#f8f8ff;border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
            <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Script</p>
            <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">{script_name}</p>
            <p style="margin:8px 0 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Environment</p>
            <p style="margin:4px 0 0;color:#6366f1;font-size:14px;font-weight:600;">{target_env}</p>
          </div>
          {_cta_button("Verify in NetSuite", "https://system.netsuite.com")}"""
    return _email_shell("Script deployed — ArthaBuild", body)


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
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    pct = int((used / limit) * 100)
    body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;">You're almost at your script limit</h2>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
            Hi {first_name}, you've used <strong>{used} of {limit}</strong> free script generations this month.
          </p>
          <div style="background:#f8f8ff;border-radius:10px;padding:16px 20px;margin:0 0 20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:13px;color:#374151;font-weight:600;">Scripts used</span>
              <span style="font-size:13px;color:#6366f1;font-weight:700;">{used}/{limit}</span>
            </div>
            <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;">
              <div style="width:{pct}%;height:8px;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:999px;"></div>
            </div>
          </div>
          <div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:14px 18px;border-radius:6px;margin:0 0 24px;">
            <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
              When you reach {limit}, script generation pauses until next month. Upgrade to keep building.
            </p>
          </div>
          {_cta_button("Upgrade Plan", f"{frontend_url}/#plans")}"""
    return _email_shell("You're almost at your free script limit — ArthaBuild", body)


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
