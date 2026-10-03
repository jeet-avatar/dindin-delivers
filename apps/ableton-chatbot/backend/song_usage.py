"""Permanent song starts, independent of chats, files and separation credits."""

from datetime import datetime, timezone
import re

from fastapi import HTTPException

import billing
import database
from database import db, now_sql

POLICY = 'songs-v1'
LIMIT_MESSAGE = ('Your new-song allowance is used up. Continue an existing song, upgrade your plan, '
                 'or wait for the next monthly allowance (1st of the month, UTC). '
                 'Saving, archiving and deleting do not restore song credits. Separation packs do not add songs.')
CONSENT_MESSAGE = ('Before production, open Choose Live Set and confirm the song allowance. '
                   'The first production action uses one song credit; planning does not.')


def init(conn):
    conn.execute(f"""CREATE TABLE IF NOT EXISTS song_starts (
        user_id INTEGER NOT NULL,
        song_id TEXT NOT NULL,
        policy TEXT NOT NULL,
        live_title TEXT NOT NULL,
        authorized_at TEXT NOT NULL DEFAULT ({now_sql()}),
        started_at TEXT,
        period TEXT,
        source TEXT,
        PRIMARY KEY (user_id, song_id)
    )""")
    conn.execute('CREATE INDEX IF NOT EXISTS song_starts_period ON song_starts (user_id, period, source)')
    conn.execute(f"""CREATE TABLE IF NOT EXISTS song_set_relinks (
        id {database.autoincrement_pk()}, user_id INTEGER NOT NULL, song_id TEXT NOT NULL,
        old_title TEXT NOT NULL, new_title TEXT NOT NULL, confirmed_at TEXT NOT NULL DEFAULT ({now_sql()})
    )""")


def month():
    return datetime.now(timezone.utc).strftime('%Y-%m')


def _lock(conn, user_id):
    if database.is_postgres():
        row = conn.execute('SELECT * FROM users WHERE id=? FOR UPDATE', (user_id,)).fetchone()
    else:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    if not row:
        raise HTTPException(401, 'Sign in again before starting production.')
    if not database.is_subscribed(dict(row)):
        raise HTTPException(402, 'An active BeatMind plan or trial is required for production.')
    return dict(row)


def _summary(conn, user, song_id=None):
    plan = billing.allowance(user)
    trial = plan['source'] == 'trial'
    period = 'trial' if trial else month()
    source = 'trial' if trial else 'subscription'
    # Existing purchased separation credits remain separate and cannot replenish songs.
    included = max(0, int(plan['included_tracks']))
    used = conn.execute('SELECT COUNT(*) FROM song_starts WHERE user_id=? AND period=? AND source=?',
                        (user['id'], period, source)).fetchone()[0]
    row = conn.execute('SELECT * FROM song_starts WHERE user_id=? AND song_id=?',
                       (user['id'], song_id)).fetchone() if song_id else None
    return {'policy': POLICY, 'included': included, 'used': used, 'remaining': max(0, included - used),
            'period': period, 'source': source,
            'authorized': bool(row), 'started': bool(row and row['started_at']),
            'live_title': row['live_title'] if row else None}


def summary(user, song_id=None):
    with db() as conn:
        return _summary(conn, user, song_id)


def authorize(user_id, song_id, live_title, *, consent=False, same_song=False):
    with db() as conn:
        user = _lock(conn, user_id)
        state = _summary(conn, user, song_id)
        if not state['authorized'] and not consent:
            raise HTTPException(409, CONSENT_MESSAGE)
        if not state['started'] and state['remaining'] <= 0:
            raise HTTPException(402, LIMIT_MESSAGE)
        if state['started'] and state['live_title'] != live_title and not same_song:
            raise HTTPException(409, 'This chat already belongs to another Live Set. Start a new song, '
                                'or explicitly confirm that this is the same composition renamed or saved elsewhere.')
        if state['started'] and state['live_title'] != live_title:
            conn.execute('INSERT INTO song_set_relinks (user_id, song_id, old_title, new_title) VALUES (?, ?, ?, ?)',
                         (user_id, song_id, state['live_title'], live_title))
        conn.execute("""INSERT INTO song_starts (user_id, song_id, policy, live_title) VALUES (?, ?, ?, ?)
                        ON CONFLICT (user_id, song_id) DO UPDATE SET live_title=excluded.live_title""",
                     (user_id, song_id, POLICY, live_title))
        return _summary(conn, user, song_id)


def start(user_id, song_id, live_title):
    """Commit once BEFORE a potential music write. Interrupted/ambiguous writes are never refunded."""
    with db() as conn:
        user = _lock(conn, user_id)
        state = _summary(conn, user, song_id)
        if not state['authorized']:
            raise HTTPException(409, CONSENT_MESSAGE)
        if state['live_title'] != live_title:
            raise HTTPException(409, 'The Live Set has changed. Choose Live Set before continuing this song.')
        if state['started']:
            return state
        if state['remaining'] <= 0:
            raise HTTPException(402, LIMIT_MESSAGE)
        conn.execute(f"""UPDATE song_starts SET started_at=({now_sql()}), period=?, source=?
                         WHERE user_id=? AND song_id=? AND started_at IS NULL""",
                     (state['period'], state['source'], user_id, song_id))
        return _summary(conn, user, song_id)


def explicit_restart(message):
    """Conservative fast path for explicit replacement, not a musical-similarity classifier."""
    return bool(re.search(r"(?:^|[.!?]\s*)(?:please\s+|let's\s+|now\s+)*"
                          r'(?:(?:start|create|make|build)\s+(?:(?:a|an|another|brand)\s+)*new\s+(?:song|project|live set)\b'
                          r'|(?:start over|start from scratch|replace (?:the )?(?:whole|entire) (?:song|track|composition))\b)',
                          message.strip(), re.I))
