"""
SQLite database for BeatMind — user accounts and subscriptions.
"""

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

DB_PATH = os.getenv("DB_PATH", "beatmind.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    # Production stores this database on EFS. WAL's shared-memory index is not
    # supported across network filesystems; set journaling only at startup.
    mode = os.getenv("DB_JOURNAL_MODE", "DELETE" if os.getenv("ENV") == "production" else "WAL").upper()
    if mode not in {"DELETE", "WAL"}:
        raise ValueError("DB_JOURNAL_MODE must be DELETE or WAL")
    conn = get_conn()
    try:
        actual = conn.execute(f"PRAGMA journal_mode={mode}").fetchone()[0]
        if actual.upper() != mode:
            raise RuntimeError("Database journal mode could not be configured")
    finally:
        conn.close()
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                stripe_customer_id TEXT,
                subscription_status TEXT DEFAULT 'inactive',
                subscription_id TEXT,
                trial_ends_at TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        add_columns(conn, "users", USER_PLAN_COLUMNS)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stripe_events (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                processed_at TEXT DEFAULT (datetime('now'))
            )""")
        import billing
        import ai_usage
        billing.init(conn)
        ai_usage.init(conn)


# The subscriber's plan, copied from Stripe by the webhook. Rows from before plans existed keep NULLs.
USER_PLAN_COLUMNS = {
    "plan": "TEXT",
    "plan_tier": "TEXT",
    "plan_lookup_key": "TEXT",
    "plan_interval": "TEXT",
    "included_tracks": "INTEGER",
    "included_cloud": "INTEGER",
    "mixmind": "INTEGER",
    "current_period_end": "TEXT",
    "past_due_since": "TEXT",
}


def add_columns(conn, table: str, columns: dict[str, str]) -> None:
    """Additive, repeatable migration: add each missing nullable column. Never drops or rewrites data."""
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    for name, kind in columns.items():
        if name in existing:
            continue
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {kind}")
        except sqlite3.OperationalError as error:
            if "duplicate column" not in str(error).lower():  # Another task added it first.
                raise


def get_user_by_email(email: str) -> dict | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def create_user(email: str, password_hash: str, name: str, trial_ends_at: str) -> dict:
    with db() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, name, trial_ends_at) VALUES (?, ?, ?, ?)",
            (email, password_hash, name, trial_ends_at),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


def update_user_subscription(
    email: str,
    stripe_customer_id: str,
    subscription_status: str,
    subscription_id: str | None = None,
):
    with db() as conn:
        conn.execute(
            """UPDATE users SET stripe_customer_id=?, subscription_status=?, subscription_id=?
               WHERE email=?""",
            (stripe_customer_id, subscription_status, subscription_id, email),
        )


def update_user_password(user_id: int, password_hash: str) -> None:
    with db() as conn:
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (password_hash, user_id))


PAST_DUE_GRACE_DAYS = 7


def past_due_grace_days() -> int:
    try:
        return max(0, int(os.getenv("BILLING_PAST_DUE_GRACE_DAYS") or PAST_DUE_GRACE_DAYS))
    except ValueError:
        return PAST_DUE_GRACE_DAYS


def _utc(value: str | None):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _paid_status(user: dict) -> bool:
    """active/trialing: yes. past_due: yes for a grace period after the first failed renewal while Stripe
    retries the card (BILLING_PAST_DUE_GRACE_DAYS, default 7). unpaid, canceled, incomplete: no."""
    status = user.get("subscription_status")
    if status in ("active", "trialing"):
        return True
    if status == "past_due":
        since = _utc(user.get("past_due_since"))
        return since is None or datetime.now(timezone.utc) < since + timedelta(days=past_due_grace_days())
    return False


def subscription_access(user: dict) -> bool:
    """BeatMind access from a Stripe subscription. A MixMind-only plan does not include BeatMind."""
    return user.get("plan_tier") != "mixmind" and _paid_status(user)


def mixmind_access(user: dict) -> bool:
    """MixMind is included in Studio, MixMind and the combo plans; not in Starter, Pro, legacy plans or the trial."""
    return bool(user.get("mixmind")) and _paid_status(user)


def trial_active(user: dict) -> bool:
    trial = _utc(user.get("trial_ends_at"))
    return bool(trial and datetime.now(timezone.utc) < trial)


def is_subscribed(user: dict) -> bool:
    """Return True if user has BeatMind access through a subscription or the app's free trial."""
    return subscription_access(user) or trial_active(user)
