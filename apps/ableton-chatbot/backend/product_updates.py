"""Product-update emails (new Bridge and web releases) with one-click unsubscribe.

Each campaign is sent at most once per user. Preferences live in their own table so the
users table stays owned by accounts and billing.
"""

import os
import time
from html import escape

from database import db
from email_transport import send_email

API_URL = os.getenv("SERVER_URL", "https://api.beatmind.io").rstrip("/")
SITE_URL = os.getenv("FRONTEND_URL", "https://www.beatmind.io").rstrip("/")
SEND_INTERVAL_SECONDS = float(os.getenv("BEATMIND_EMAIL_INTERVAL", "1.1"))  # SES sandbox: 1 message per second


def init(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS email_preferences (
        user_id INTEGER PRIMARY KEY, product_updates INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now')))""")
    conn.execute("""CREATE TABLE IF NOT EXISTS email_sends (
        campaign TEXT NOT NULL, user_id INTEGER NOT NULL, message_id TEXT,
        sent_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (campaign, user_id))""")


def unsubscribe_token(user_id: int) -> str:
    from jose import jwt
    from beatmind_auth import ALGORITHM, _get_secret
    return jwt.encode({"sub": str(user_id), "typ": "unsubscribe"}, _get_secret(), algorithm=ALGORITHM)


def unsubscribe(token: str) -> bool:
    from jose import JWTError
    from beatmind_auth import decode_token
    try:
        claims = decode_token(token)
    except (JWTError, RuntimeError):
        return False
    if claims.get("typ") != "unsubscribe":
        return False
    with db() as conn:
        init(conn)
        conn.execute("""INSERT INTO email_preferences (user_id, product_updates) VALUES (?, 0)
                        ON CONFLICT(user_id) DO UPDATE SET product_updates=0, updated_at=datetime('now')""",
                     (int(claims["sub"]),))
    return True


def recipients(campaign, only_email=None):
    with db() as conn:
        init(conn)
        rows = conn.execute("""SELECT u.id, u.email, u.name FROM users u
            LEFT JOIN email_preferences p ON p.user_id = u.id
            LEFT JOIN email_sends s ON s.user_id = u.id AND s.campaign = ?
            WHERE COALESCE(p.product_updates, 1) = 1 AND s.user_id IS NULL
            ORDER BY u.id""", (campaign,)).fetchall()
    return [dict(row) for row in rows if not only_email or row["email"].lower() == only_email.lower()]


def render(user, subject, headline, lines, cta_label, cta_url):
    link = f"{API_URL}/api/email/unsubscribe?token={unsubscribe_token(user['id'])}"
    greeting = f"Hi {user['name'].split()[0]}," if user.get("name") else "Hi,"
    plain = "\n\n".join([greeting, headline, *lines, f"{cta_label}: {cta_url}",
                         "Updates never interrupt an open Ableton project: the Bridge installs when you choose, "
                         "and the web app reloads only when you click Reload.",
                         f"Unsubscribe from product updates: {link}"])
    items = "".join(f'<p style="color:#ccc;margin:0 0 12px;">{escape(line)}</p>' for line in lines)
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:12px;">
      <div style="font-size:20px;font-weight:900;margin-bottom:24px;">
        <span style="background:#ff6b00;color:#fff;padding:4px 10px;border-radius:6px;margin-right:8px;">B</span>beatmind
      </div>
      <p style="color:#ccc;margin:0 0 12px;">{escape(greeting)}</p>
      <h2 style="margin:0 0 16px;">{escape(headline)}</h2>
      {items}
      <a href="{escape(cta_url, quote=True)}" style="display:inline-block;background:#ff6b00;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:12px 0 20px;">{escape(cta_label)}</a>
      <p style="color:#888;font-size:13px;">Updates never interrupt an open Ableton project: the Bridge installs when you choose, and the web app reloads only when you click Reload.</p>
      <p style="color:#555;font-size:12px;margin-top:28px;"><a href="{escape(link, quote=True)}" style="color:#777;">Unsubscribe from product updates</a></p>
    </div>"""
    return plain, html, {"List-Unsubscribe": f"<{link}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}


def send_campaign(campaign, subject, headline, lines, cta_label, cta_url, only_email=None, dry_run=False):
    """Send one campaign to everyone opted in who has not received it. Returns (sent, skipped_errors, planned)."""
    targets = recipients(campaign, only_email)
    if dry_run:
        return 0, [], [t["email"] for t in targets]
    sent, errors = 0, []
    for index, user in enumerate(targets):
        plain, html, headers = render(user, subject, headline, lines, cta_label, cta_url)
        try:
            message_id = send_email(user["email"], subject, plain, html, headers)
        except Exception as error:  # a rejected address must not stop the campaign
            errors.append((user["email"], type(error).__name__))
            continue
        with db() as conn:
            conn.execute("INSERT OR IGNORE INTO email_sends (campaign, user_id, message_id) VALUES (?, ?, ?)",
                         (campaign, user["id"], message_id))
        sent += 1
        if index + 1 < len(targets):
            time.sleep(SEND_INTERVAL_SECONDS)
    return sent, errors, [t["email"] for t in targets]
