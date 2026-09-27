"""Track packages: a monthly included allowance, prepaid track and cloud credits, and a separations log.

Every separation uses one track. A BeatMind Cloud separation also uses one cloud credit.
Dormant until configured: with no allowance and no packages, separations are not limited.
Package prices live in Stripe; this module only knows price IDs.
"""

from datetime import datetime, timezone
import json
import os
import re

from database import db

KINDS = ('track', 'cloud')
MODES = ('local', 'cloud', 'server')


class NoCredits(Exception):
    def __init__(self, kind):
        self.kind = kind
        super().__init__('Your BeatMind Cloud credits are used up. Buy cloud credits to separate on a BeatMind GPU.'
                         if kind == 'cloud' else 'Your tracks for this month are used up. Buy a track package to separate more.')


def packs():
    """Configured packages: BEATMIND_PACKS='[{"id":"tracks_10","kind":"track","credits":10,"price_id":"price_..."}]'."""
    try:
        items = json.loads(os.getenv('BEATMIND_PACKS') or '[]')
    except ValueError:
        return []
    return [{'id': p['id'], 'kind': p['kind'], 'credits': p['credits'], 'price_id': p['price_id']}
            for p in items if isinstance(p, dict) and re.fullmatch(r'[a-z0-9_]{1,40}', str(p.get('id', '')))
            and p.get('kind') in KINDS and type(p.get('credits')) is int and p['credits'] > 0
            and str(p.get('price_id', '')).startswith('price_')]


def pack(pack_id):
    return next((p for p in packs() if p['id'] == pack_id), None)


def included_per_month():
    try:
        return max(0, int(os.getenv('BEATMIND_INCLUDED_TRACKS') or 0))
    except ValueError:
        return 0


def enforced():
    return included_per_month() > 0 or bool(packs())


def init(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS credit_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            delta INTEGER NOT NULL,
            reason TEXT NOT NULL,
            reference_id TEXT,
            stripe_session TEXT UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        )""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS separations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reference_id TEXT UNIQUE NOT NULL,
            mode TEXT NOT NULL,
            source TEXT NOT NULL,
            cloud INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'charged',
            created_at TEXT DEFAULT (datetime('now'))
        )""")
    conn.execute("CREATE INDEX IF NOT EXISTS credit_ledger_user ON credit_ledger (user_id, kind)")
    conn.execute("CREATE INDEX IF NOT EXISTS separations_user ON separations (user_id, created_at)")


def _month():
    return datetime.now(timezone.utc).strftime('%Y-%m')


def _balance(conn, user_id, kind):
    return conn.execute("SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id=? AND kind=?",
                        (user_id, kind)).fetchone()[0]


def _allowance_left(conn, user_id):
    used = conn.execute("""SELECT COUNT(*) FROM separations WHERE user_id=? AND source='allowance' AND status='charged'
                           AND substr(created_at, 1, 7)=?""", (user_id, _month())).fetchone()[0]
    return max(0, included_per_month() - used)


def summary(user_id):
    with db() as conn:
        recent = conn.execute("""SELECT reference_id, mode, source, cloud, status, created_at FROM separations
                                 WHERE user_id=? ORDER BY id DESC LIMIT 20""", (user_id,)).fetchall()
        return {'enforced': enforced(), 'included_per_month': included_per_month(),
                'allowance_left': _allowance_left(conn, user_id),
                'track_credits': _balance(conn, user_id, 'track'), 'cloud_credits': _balance(conn, user_id, 'cloud'),
                'separations': [dict(row) for row in recent]}


def _shortfall(conn, user_id, mode):
    if not enforced():
        return None
    if mode == 'cloud' and _balance(conn, user_id, 'cloud') < 1:
        return 'cloud'
    if _allowance_left(conn, user_id) < 1 and _balance(conn, user_id, 'track') < 1:
        return 'track'
    return None


def check(user_id, mode):
    """Raise NoCredits before any work starts, without charging."""
    with db() as conn:
        missing = _shortfall(conn, user_id, mode)
    if missing:
        raise NoCredits(missing)


def charge(user_id, reference_id, mode):
    """Record a separation and take its credits once. Raises NoCredits."""
    assert mode in MODES
    with db() as conn:
        conn.execute('BEGIN IMMEDIATE')  # Check and spend under one write lock.
        if conn.execute("SELECT 1 FROM separations WHERE reference_id=?", (reference_id,)).fetchone():
            return
        missing = _shortfall(conn, user_id, mode)
        if missing:
            raise NoCredits(missing)
        if not enforced():
            source = 'unmetered'
        elif _allowance_left(conn, user_id) > 0:
            source = 'allowance'
        else:
            source = 'credit'
            conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, 'track', -1, 'separation', ?)",
                         (user_id, reference_id))
        cloud = int(mode == 'cloud' and enforced())
        if cloud:
            conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, 'cloud', -1, 'separation', ?)",
                         (user_id, reference_id))
        conn.execute("INSERT INTO separations (user_id, reference_id, mode, source, cloud) VALUES (?, ?, ?, ?, ?)",
                     (user_id, reference_id, mode, source, cloud))


def refund(reference_id):
    """Return the credits of a separation that failed. Safe to call repeatedly."""
    with db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute("SELECT * FROM separations WHERE reference_id=? AND status='charged'", (reference_id,)).fetchone()
        if not row:
            return
        if row['source'] == 'credit':
            conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, 'track', 1, 'refund', ?)",
                         (row['user_id'], reference_id))
        if row['cloud']:
            conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, 'cloud', 1, 'refund', ?)",
                         (row['user_id'], reference_id))
        conn.execute("UPDATE separations SET status='refunded' WHERE id=?", (row['id'],))


def grant(user_id, pack_id, stripe_session):
    """Add a purchased package once per Stripe Checkout session. Returns False for unknown packages or repeats."""
    item = pack(pack_id)
    if not item:
        return False
    with db() as conn:
        cursor = conn.execute("""INSERT OR IGNORE INTO credit_ledger (user_id, kind, delta, reason, stripe_session)
                                 VALUES (?, ?, ?, ?, ?)""", (user_id, item['kind'], item['credits'], 'purchase:' + pack_id, stripe_session))
        return cursor.rowcount == 1
