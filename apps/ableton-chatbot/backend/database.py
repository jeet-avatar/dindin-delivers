"""
SQLite database for BeatMind — user accounts and subscriptions.
"""

import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "beatmind.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
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


def is_subscribed(user: dict) -> bool:
    """Return True if user has active subscription or is in trial."""
    from datetime import datetime, timezone

    if user["subscription_status"] == "active":
        return True

    trial = user.get("trial_ends_at")
    if trial:
        try:
            trial_dt = datetime.fromisoformat(trial).replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < trial_dt:
                return True
        except ValueError:
            pass

    return False
