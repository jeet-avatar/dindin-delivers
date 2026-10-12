"""Track allowances: each plan's monthly included tracks and cloud tracks, prepaid packages, and a separations log.

Every separation uses one track. A BeatMind Cloud separation also uses one cloud track.
Spend order for both: this UTC month's plan allowance first, then purchased credits. Failed separations are refunded.

The app's no-card free trial has its own small allowance for the whole trial (TRIAL_INCLUDED_TRACKS, default 3,
separated on the user's computer only; TRIAL_INCLUDED_CLOUD, default 0). Trial separations are logged with
source 'trial', so a plan bought during the trial starts with its full monthly allowance.

Metering is on once the Stripe catalog resolves (see catalog.py); BILLING_ENFORCED=false turns it off
(separations are then logged as unmetered), BILLING_ENFORCED=true forces it on.
"""

from datetime import datetime, timezone
import json
import os
import re

import catalog
import database
from database import add_columns, autoincrement_pk, db, now_sql, subscription_access, trial_active

KINDS = ('track', 'cloud')


def _exempt(user_id):
    raw = os.getenv('AI_EXEMPT_EMAILS', '')
    if not raw:
        return False
    exempt = {e.strip().lower() for e in raw.split(',') if e.strip()}
    with db() as conn:
        row = conn.execute("SELECT email FROM users WHERE id=?", (user_id,)).fetchone()
        return bool(row and (row['email'] or '').lower() in exempt)
MODES = ('local', 'cloud', 'server')
LEGACY_INCLUDED_TRACKS = 10  # Subscribers from before plans existed are Starter.
TRIAL_INCLUDED_TRACKS = 3
SONGS_PER_MONTH = {'starter': 10, 'pro': 25, 'studio': 50}
TRIAL_SONGS = 3


class NoCredits(Exception):
    MESSAGES = {
        'track': 'Your tracks for this month are used up. Buy a track pack or upgrade your plan to separate more.',
        'cloud': 'Your Cloud HQ separations are used up. Buy a Cloud HQ pack or upgrade your plan to get more.',
        'trial': 'Your free trial includes {included} tracks. Choose a plan to keep going.',
        'trial_cloud': 'Cloud HQ separations are part of the paid plans. Choose a plan to use them.',
        'trial_mode': 'Your free trial separates tracks on your own Mac with the BeatMind Bridge. '
                      'Choose a plan to upload tracks to BeatMind.',
    }

    def __init__(self, kind, included=None):
        self.kind = kind
        super().__init__(self.MESSAGES[kind].format(included=included))


def _env_int(name, default):
    try:
        return max(0, int(os.getenv(name) or default))
    except ValueError:
        return default


def _env_packs():
    """Optional override: BEATMIND_PACKS='[{"id":"tracks_10","kind":"track","credits":10,"price_id":"price_..."}]'."""
    try:
        items = json.loads(os.getenv('BEATMIND_PACKS') or '[]')
    except ValueError:
        return []
    return [{'id': p['id'], 'kind': p['kind'], 'credits': p['credits'], 'price_id': p['price_id'], 'price': None}
            for p in items if isinstance(p, dict) and re.fullmatch(r'[a-z0-9_]{1,40}', str(p.get('id', '')))
            and p.get('kind') in KINDS and type(p.get('credits')) is int and p['credits'] > 0
            and str(p.get('price_id', '')).startswith('price_')]


def packs():
    """Packages for sale: the BEATMIND_PACKS override when set, else the beatmind_pack_* prices in Stripe."""
    return _env_packs() if os.getenv('BEATMIND_PACKS') else catalog.packs()


def pack(pack_id):
    return next((p for p in packs() if p['id'] == pack_id), None)


def enforced():
    flag = os.getenv('BILLING_ENFORCED', '').strip().lower()
    if flag in ('false', '0', 'off'):
        return False
    if flag in ('true', '1', 'on'):
        return True
    return catalog.resolved() or _env_int('BEATMIND_INCLUDED_TRACKS', 0) > 0 or bool(_env_packs())


def trial_allowance():
    return {'tracks': _env_int('TRIAL_INCLUDED_TRACKS', TRIAL_INCLUDED_TRACKS), 'cloud': _env_int('TRIAL_INCLUDED_CLOUD', 0)}


def allowance(user):
    """This user's monthly plan allowance and where it comes from."""
    none = {'source': 'none', 'plan': None, 'tier': None, 'interval': None, 'status': None,
            'included_tracks': 0, 'included_cloud': 0, 'mixmind': False, 'current_period_end': None, 'cancel_at': None}
    if not user:
        return none
    if str(user.get('email') or '').lower() in database._exempt_emails():
        # Comped testers get the top plan, so every model tier and feature is unlocked; charges are skipped elsewhere.
        return {**none, 'source': 'comp', 'plan': 'studio', 'tier': 'studio', 'status': 'comp',
                'included_tracks': SONGS_PER_MONTH['studio'], 'included_cloud': 20, 'mixmind': True}
    if subscription_access(user):
        if user.get('included_tracks') is not None:
            return {**none, 'source': 'subscription', 'plan': user.get('plan'), 'tier': user.get('plan_tier'),
                    'interval': user.get('plan_interval'), 'status': user['subscription_status'],
                    'included_tracks': user['included_tracks'], 'included_cloud': user.get('included_cloud') or 0,
                    'mixmind': bool(user.get('mixmind')), 'current_period_end': user.get('current_period_end'),
                    'cancel_at': user.get('cancel_at')}
        # Subscribed before plans existed and not yet synced from Stripe: Starter.
        return {**none, 'source': 'legacy', 'plan': 'starter', 'tier': 'starter', 'status': user['subscription_status'],
                'included_tracks': _env_int('BEATMIND_INCLUDED_TRACKS', LEGACY_INCLUDED_TRACKS)}
    if trial_active(user):
        trial = trial_allowance()
        return {**none, 'source': 'trial', 'plan': 'trial', 'tier': 'trial', 'status': 'app_trial',
                'included_tracks': trial['tracks'], 'included_cloud': trial['cloud'],
                'current_period_end': user.get('trial_ends_at')}
    return {**none, 'status': user.get('subscription_status')}


def reference_features(plan):
    """Feature access is independent of balances and metering overrides."""
    paid = plan.get('source') in {'subscription', 'legacy', 'comp'}
    tier = plan.get('tier')
    return {'references': plan.get('source') == 'trial' or (paid and tier in {'pro', 'studio'}),
            'cloud_hq': paid and tier == 'studio'}


def require_reference_access(user, cloud=False):
    from fastapi import HTTPException
    features = reference_features(allowance(user))
    if not features['cloud_hq' if cloud else 'references']:
        raise HTTPException(403, 'Cloud HQ requires Studio. Upgrade your plan to use it.' if cloud else
                            'Reference tracks require Pro or Studio. Upgrade your plan to use them.')


def init(conn):
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS credit_ledger (
            id {autoincrement_pk()},
            user_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            delta INTEGER NOT NULL,
            reason TEXT NOT NULL,
            reference_id TEXT,
            stripe_session TEXT UNIQUE,
            created_at TEXT DEFAULT ({now_sql()})
        )""")
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS separations (
            id {autoincrement_pk()},
            user_id INTEGER NOT NULL,
            reference_id TEXT UNIQUE NOT NULL,
            mode TEXT NOT NULL,
            source TEXT NOT NULL,
            cloud INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'charged',
            created_at TEXT DEFAULT ({now_sql()})
        )""")
    # Where the cloud track came from: 'allowance' or 'credit'. NULL on older rows, which always used a credit.
    add_columns(conn, 'separations', {'cloud_source': 'TEXT'})
    conn.execute("CREATE INDEX IF NOT EXISTS credit_ledger_user ON credit_ledger (user_id, kind)")
    conn.execute("CREATE INDEX IF NOT EXISTS separations_user ON separations (user_id, created_at)")
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS song_usage (
            id {autoincrement_pk()},
            user_id INTEGER NOT NULL,
            session_id TEXT NOT NULL,
            created_at TEXT DEFAULT ({now_sql()})
        )""")
    conn.execute("CREATE INDEX IF NOT EXISTS song_usage_user ON song_usage (user_id, created_at)")
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS round_packs (
            id {autoincrement_pk()},
            user_id INTEGER NOT NULL,
            session_id TEXT NOT NULL,
            rounds INTEGER NOT NULL,
            stripe_session TEXT UNIQUE,
            created_at TEXT DEFAULT ({now_sql()})
        )""")
    conn.execute("CREATE INDEX IF NOT EXISTS round_packs_session ON round_packs (user_id, session_id)")


def _month():
    return datetime.now(timezone.utc).strftime('%Y-%m')


def _user(conn, user_id):
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return dict(row) if row else None


def _balance(conn, user_id, kind):
    return conn.execute("SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id=? AND kind=?",
                        (user_id, kind)).fetchone()[0]


def _used(conn, user_id, kind, plan):
    """Allowance used: this UTC month for a plan, the whole trial for the free trial."""
    column = 'cloud_source' if kind == 'cloud' else 'source'
    if plan['source'] == 'trial':
        return conn.execute(f"SELECT COUNT(*) FROM separations WHERE user_id=? AND {column}='trial' AND status='charged'",
                            (user_id,)).fetchone()[0]
    return conn.execute(f"""SELECT COUNT(*) FROM separations WHERE user_id=? AND {column}='allowance' AND status='charged'
                            AND substr(created_at, 1, 7)=?""", (user_id, _month())).fetchone()[0]


def _left(conn, user_id, plan, kind):
    return max(0, plan['included_cloud' if kind == 'cloud' else 'included_tracks'] - _used(conn, user_id, kind, plan))


def summary(user_id):
    is_enforced = enforced()
    with db() as conn:
        plan = allowance(_user(conn, user_id))
        recent = conn.execute("""SELECT reference_id, mode, source, cloud, cloud_source, status, created_at FROM separations
                                 WHERE user_id=? ORDER BY id DESC LIMIT 20""", (user_id,)).fetchall()
        tracks_used, cloud_used = _used(conn, user_id, 'track', plan), _used(conn, user_id, 'cloud', plan)
        return {'enforced': is_enforced, 'plan': plan, 'features': reference_features(plan),
                'included_per_month': plan['included_tracks'], 'tracks_used': tracks_used,
                'allowance_left': max(0, plan['included_tracks'] - tracks_used),
                'included_cloud_per_month': plan['included_cloud'] if reference_features(plan)['cloud_hq'] else 0, 'cloud_used': cloud_used,
                'cloud_allowance_left': max(0, plan['included_cloud'] - cloud_used) if reference_features(plan)['cloud_hq'] else 0,
                'track_credits': _balance(conn, user_id, 'track'), 'cloud_credits': _balance(conn, user_id, 'cloud'),
                'separations': [dict(row) for row in recent]}


def _sources(conn, user_id, mode, is_enforced):
    """(track source, cloud source) for the next separation, or raise NoCredits naming what is missing."""
    if not is_enforced:
        return 'unmetered', None
    plan = allowance(_user(conn, user_id))
    if plan['source'] == 'trial':
        return _trial_sources(conn, user_id, mode, plan)
    cloud = None
    if mode == 'cloud':
        if _left(conn, user_id, plan, 'cloud') > 0:
            cloud = 'allowance'
        elif _balance(conn, user_id, 'cloud') > 0:
            cloud = 'credit'
        else:
            raise NoCredits('cloud')
    if _left(conn, user_id, plan, 'track') > 0:
        return 'allowance', cloud
    if _balance(conn, user_id, 'track') > 0:
        return 'credit', cloud
    raise NoCredits('track')


def _trial_sources(conn, user_id, mode, plan):
    """The free trial separates on the user's computer from its own allowance; cloud only if configured."""
    if mode == 'server':
        raise NoCredits('trial_mode')
    cloud = None
    if mode == 'cloud':
        if _left(conn, user_id, plan, 'cloud') < 1:
            raise NoCredits('trial_cloud')
        cloud = 'trial'
    if _left(conn, user_id, plan, 'track') < 1:
        raise NoCredits('trial', plan['included_tracks'])
    return 'trial', cloud


def check(user_id, mode):
    """Raise NoCredits before any work starts, without charging."""
    if _exempt(user_id):
        return
    is_enforced = enforced()
    with db() as conn:
        _sources(conn, user_id, mode, is_enforced)


def charge(user_id, reference_id, mode):
    """Record a separation and take its credits once. Raises NoCredits."""
    assert mode in MODES
    if _exempt(user_id):
        return
    is_enforced = enforced()  # May load the Stripe catalog: never inside the write lock.
    with db() as conn:
        if database.is_postgres():
            # Lock this user's row for the transaction: serializes concurrent charge() calls for
            # the same user (two separations racing the same balance) without blocking other users.
            conn.execute("SELECT id FROM users WHERE id=? FOR UPDATE", (user_id,))
        else:
            conn.execute('BEGIN IMMEDIATE')  # SQLite's single writer: this is the whole database's lock.
        if conn.execute("SELECT 1 FROM separations WHERE reference_id=?", (reference_id,)).fetchone():
            return
        source, cloud_source = _sources(conn, user_id, mode, is_enforced)
        for kind, spent in (('track', source), ('cloud', cloud_source)):
            if spent == 'credit':
                conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, ?, -1, 'separation', ?)",
                             (user_id, kind, reference_id))
        conn.execute("INSERT INTO separations (user_id, reference_id, mode, source, cloud, cloud_source) VALUES (?, ?, ?, ?, ?, ?)",
                     (user_id, reference_id, mode, source, int(cloud_source is not None), cloud_source))


def refund(reference_id):
    """Return the credits of a separation that failed. Safe to call repeatedly.

    Allowance and trial tracks come back by marking the separation refunded; purchased credits are re-added.
    """
    with db() as conn:
        if database.is_postgres():
            # Lock the matching row itself (if any) for the transaction.
            row = conn.execute("SELECT * FROM separations WHERE reference_id=? AND status='charged' FOR UPDATE",
                               (reference_id,)).fetchone()
        else:
            conn.execute('BEGIN IMMEDIATE')
            row = conn.execute("SELECT * FROM separations WHERE reference_id=? AND status='charged'", (reference_id,)).fetchone()
        if not row:
            return
        if row['source'] == 'credit':
            conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, 'track', 1, 'refund', ?)",
                         (row['user_id'], reference_id))
        if row['cloud'] and row['cloud_source'] in ('credit', None):  # NULL: rows from before cloud_source.
            conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason, reference_id) VALUES (?, 'cloud', 1, 'refund', ?)",
                         (row['user_id'], reference_id))
        conn.execute("UPDATE separations SET status='refunded' WHERE id=?", (row['id'],))


def grant(user_id, pack_id, stripe_session, kind=None, credits=None):
    """Add a purchased package once per Stripe Checkout session. Returns False for unknown packages or repeats.

    kind/credits come from the session metadata BeatMind wrote when it created the Checkout, so a paid
    package is granted even if its price was archived since; older sessions fall back to the catalog.
    """
    if kind in KINDS and type(credits) is int and credits > 0:
        item = {'kind': kind, 'credits': credits}
    else:
        item = pack(pack_id)
    if not item:
        return False
    with db() as conn:
        cursor = conn.execute("""INSERT INTO credit_ledger (user_id, kind, delta, reason, stripe_session)
                                 VALUES (?, ?, ?, ?, ?) ON CONFLICT (stripe_session) DO NOTHING""",
                             (user_id, item['kind'], item['credits'], 'purchase:' + pack_id, stripe_session))
        return cursor.rowcount == 1


def songs_limit(tier):
    tier = tier if tier in SONGS_PER_MONTH else 'starter'
    return _env_int(f'BEATMIND_SONGS_{tier.upper()}', SONGS_PER_MONTH[tier])


def songs_this_month(user_id):
    with db() as conn:
        row = conn.execute("SELECT COUNT(*) FROM song_usage WHERE user_id=? AND substr(created_at, 1, 7)=?",
                           (user_id, _month())).fetchone()
    return row[0]


def record_song(user_id, session_id):
    with db() as conn:
        conn.execute("INSERT INTO song_usage (user_id, session_id) VALUES (?, ?)", (user_id, session_id))


def enforce_song_limit(user):
    if _exempt(user['id']):
        return
    plan = allowance(user)
    if plan['source'] == 'trial':
        limit = _env_int('TRIAL_SONGS', TRIAL_SONGS)
    elif plan['source'] in ('subscription', 'legacy'):
        limit = songs_limit(plan['tier'])
    else:
        return
    used = songs_this_month(user['id'])
    if used >= limit:
        from fastapi import HTTPException
        if plan['source'] == 'trial':
            raise HTTPException(402, f"Your free trial includes {limit} songs. Choose a plan to keep making music.")
        raise HTTPException(429, f"You've produced {used} of {limit} songs this month. "
                            "Upgrade your plan for more songs, or wait until the 1st of next month (UTC).")


ROUND_PACKS_FALLBACK = {
    'rounds_10': {'rounds': 10, 'price_id': os.getenv('BEATMIND_ROUNDS_10_PRICE_ID', '')},
    'rounds_25': {'rounds': 25, 'price_id': os.getenv('BEATMIND_ROUNDS_25_PRICE_ID', '')},
}


def extra_rounds(user_id, session_id):
    with db() as conn:
        row = conn.execute("SELECT COALESCE(SUM(rounds), 0) FROM round_packs WHERE user_id=? AND session_id=?",
                           (user_id, session_id)).fetchone()
    return row[0]


def max_rounds(user_id, session_id):
    from execution import MAX_PRODUCTION_ROUNDS
    return MAX_PRODUCTION_ROUNDS + extra_rounds(user_id, session_id)


def grant_rounds(user_id, session_id, pack_id, stripe_session):
    item = ROUND_PACKS.get(pack_id)
    if not item:
        return False
    with db() as conn:
        cursor = conn.execute("""INSERT INTO round_packs (user_id, session_id, rounds, stripe_session)
                                 VALUES (?, ?, ?, ?) ON CONFLICT (stripe_session) DO NOTHING""",
                             (user_id, session_id, item['rounds'], stripe_session))
        return cursor.rowcount == 1


def round_pack_options():
    resolved = catalog.resolve().get('round_packs', {})
    if resolved:
        return [{'id': key.replace('beatmind_', ''), 'rounds': entry['rounds'], 'price_id': entry['price_id']}
                for key, entry in resolved.items()]
    return [{'id': pid, 'rounds': spec['rounds'], 'price_id': spec['price_id']}
            for pid, spec in ROUND_PACKS_FALLBACK.items() if spec['price_id']]
