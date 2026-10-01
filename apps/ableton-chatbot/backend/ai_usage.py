"""Every model call's token usage and estimated cost, and a monthly fair-use cap on that cost.

The estimate is for monitoring, not invoicing. Rates are USD per million tokens:
- Claude (Anthropic list rates; cache read 0.1x input, cache write 1.25x input): Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15,
  Opus 5 $5/$25, Opus 5.5 $4/$20 input/output. Bedrock partner pricing may differ, so these stay estimates.
- OpenAI models (templates, audio listening): PLACEHOLDER rates until set from OpenAI's price list with
  OPENAI_INPUT_USD_PER_MTOK, OPENAI_CACHED_INPUT_USD_PER_MTOK, OPENAI_AUDIO_INPUT_USD_PER_MTOK and
  OPENAI_OUTPUT_USD_PER_MTOK. Rows record which basis was used; token counts are logged regardless.
- AI_RATES_JSON='{"<model substring>": {"input": .., "output": .., "cache_read": .., "cache_write": .., "audio_input": ..}}'
  overrides any model.

Paid plans: a monthly cap (AI_FAIR_USE_USD_STARTER/PRO/STUDIO, default $8/$15/$30 per UTC month) blocks AI
features only when AI_FAIR_USE_ENFORCED=true (429); otherwise usage is only logged.
MixMind AI (the desktop app's proxy, feature 'mixmind'): its own monthly cap MIXMIND_AI_CAP_USD (default $10 per UTC
month), enforced only when MIXMIND_AI_FAIR_USE_ENFORCED=true (429); otherwise over-cap calls are logged.
Free trial: always capped at TRIAL_CHAT_MESSAGES (default 50) chat messages or TRIAL_AI_USD (default $2) of
estimated spend over the whole trial, whichever comes first (402: choose a plan).
"""

from datetime import datetime, timezone
import json
import logging
import os

from fastapi import HTTPException

from database import add_columns, autoincrement_pk, db, now_sql

log = logging.getLogger("beatmind.ai_usage")

CLAUDE_HAIKU_45 = {'input': 1.0, 'output': 5.0, 'cache_read': 0.1, 'cache_write': 1.25, 'audio_input': 1.0}
# Published list rates (input, output) by model-id fragment; the most specific fragment comes first.
CLAUDE_LIST_RATES = (('opus-5-5', 4.0, 20.0), ('opus-5', 5.0, 25.0), ('sonnet-4-6', 3.0, 15.0), ('haiku-4-5', 1.0, 5.0))
MIXMIND_AI_CAP_USD = 10.0
MIXMIND_CAP_MESSAGE = "Monthly MixMind AI allowance reached"
# PLACEHOLDERS, not OpenAI's prices: deliberately round numbers so an unconfigured estimate is visibly provisional.
OPENAI_PLACEHOLDER = {'input': 5.0, 'cached_input': 0.5, 'audio_input': 40.0, 'output': 20.0}
# PLACEHOLDER for Claude models other than Haiku 4.5 (e.g. BEATMIND_MODEL switched to a larger model).
CLAUDE_PLACEHOLDER = {'input': 5.0, 'output': 25.0}
FAIR_USE_USD = {'starter': 8.0, 'pro': 15.0, 'studio': 30.0}
TRIAL_CHAT_MESSAGES = 50
TRIAL_AI_USD = 2.0
FAIR_USE_MESSAGE = ("You've reached this month's fair-use limit for BeatMind AI on your plan. "
                    "Upgrade your plan to keep going, or wait until the 1st of next month (UTC). "
                    "Your songs, stems and track packs are unaffected.")
TRIAL_MESSAGE = "Your free trial's AI messages are used up. Choose a plan to keep going."


def init(conn):
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS ai_usage (
            id {autoincrement_pk()},
            user_id INTEGER,
            feature TEXT NOT NULL,
            request_id TEXT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            cache_read_tokens INTEGER NOT NULL DEFAULT 0,
            cache_write_tokens INTEGER NOT NULL DEFAULT 0,
            audio_input_tokens INTEGER NOT NULL DEFAULT 0,
            estimated_usd REAL NOT NULL DEFAULT 0,
            rate_basis TEXT NOT NULL,
            created_at TEXT DEFAULT ({now_sql()})
        )""")
    add_columns(conn, 'ai_usage', {'request_id': 'TEXT'})
    conn.execute("CREATE INDEX IF NOT EXISTS ai_usage_user ON ai_usage (user_id, created_at)")


def _env_float(name, default):
    try:
        return float(os.getenv(name) or default)
    except ValueError:
        return default


def rates(provider, model):
    """(USD per million tokens by kind, basis) for a model; basis is published, configured or placeholder."""
    try:
        overrides = json.loads(os.getenv('AI_RATES_JSON') or '{}')
    except ValueError:
        overrides = {}
    for fragment, value in (overrides.items() if isinstance(overrides, dict) else ()):
        if fragment and fragment in model and isinstance(value, dict):
            return {kind: float(value.get(kind, 0) or 0) for kind in CLAUDE_HAIKU_45}, 'configured'
    if provider == 'openai':
        names = {'input': 'OPENAI_INPUT_USD_PER_MTOK', 'cache_read': 'OPENAI_CACHED_INPUT_USD_PER_MTOK',
                 'audio_input': 'OPENAI_AUDIO_INPUT_USD_PER_MTOK', 'output': 'OPENAI_OUTPUT_USD_PER_MTOK'}
        defaults = {'input': OPENAI_PLACEHOLDER['input'], 'cache_read': OPENAI_PLACEHOLDER['cached_input'],
                    'audio_input': OPENAI_PLACEHOLDER['audio_input'], 'output': OPENAI_PLACEHOLDER['output']}
        basis = 'configured' if all(os.getenv(name) for name in names.values()) else 'placeholder'
        return {'cache_write': 0.0, **{kind: _env_float(names[kind], defaults[kind]) for kind in names}}, basis
    for fragment, input_rate, output_rate in CLAUDE_LIST_RATES:
        if fragment in model:
            return _claude_rates(input_rate, output_rate), 'published'
    return _claude_rates(CLAUDE_PLACEHOLDER['input'], CLAUDE_PLACEHOLDER['output']), 'placeholder'


def _claude_rates(input_rate, output_rate):
    return {'input': input_rate, 'output': output_rate, 'cache_read': input_rate * 0.1,
            'cache_write': input_rate * 1.25, 'audio_input': input_rate}


def anthropic_tokens(response):
    """Token counts from an Anthropic or Bedrock Messages response. input_tokens excludes cached tokens."""
    usage = getattr(response, 'usage', None)
    return {'input_tokens': getattr(usage, 'input_tokens', 0) or 0,
            'output_tokens': getattr(usage, 'output_tokens', 0) or 0,
            'cache_read_tokens': getattr(usage, 'cache_read_input_tokens', 0) or 0,
            'cache_write_tokens': getattr(usage, 'cache_creation_input_tokens', 0) or 0}


def openai_tokens(payload):
    """Token counts from an OpenAI chat completion. prompt_tokens includes cached and audio tokens."""
    usage = (payload.get('usage') if isinstance(payload, dict) else None) or {}
    details = usage.get('prompt_tokens_details') or {}
    prompt, cached, audio = usage.get('prompt_tokens') or 0, details.get('cached_tokens') or 0, details.get('audio_tokens') or 0
    return {'input_tokens': max(0, prompt - cached - audio), 'output_tokens': usage.get('completion_tokens') or 0,
            'cache_read_tokens': cached, 'audio_input_tokens': audio}


def estimate(provider, model, tokens):
    rate, basis = rates(provider, model)
    kinds = {'input_tokens': 'input', 'output_tokens': 'output', 'cache_read_tokens': 'cache_read',
             'cache_write_tokens': 'cache_write', 'audio_input_tokens': 'audio_input'}
    return sum(tokens.get(field, 0) * rate[kind] for field, kind in kinds.items()) / 1_000_000, basis


def record(user_id, feature, provider, model, tokens, request_id=None):
    """Log one model call; request_id groups the calls of one chat message. Never raises: usage logging must
    not break the user's request."""
    try:
        usd, basis = estimate(provider, model, tokens)
        with db() as conn:
            conn.execute("""INSERT INTO ai_usage (user_id, feature, request_id, provider, model, input_tokens, output_tokens,
                            cache_read_tokens, cache_write_tokens, audio_input_tokens, estimated_usd, rate_basis)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                         (user_id, feature, request_id, provider, model, *(int(tokens.get(field, 0) or 0) for field in (
                             'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'audio_input_tokens')),
                          usd, basis))
    except Exception:
        log.exception("AI usage could not be recorded")


def fair_use_enforced():
    return os.getenv('AI_FAIR_USE_ENFORCED', 'false').lower() == 'true'


def cap_usd(tier):
    tier = tier if tier in FAIR_USE_USD else 'starter'
    return _env_float(f'AI_FAIR_USE_USD_{tier.upper()}', FAIR_USE_USD[tier])


def month_to_date(user_id, tier):
    with db() as conn:
        row = conn.execute("""SELECT COUNT(*) AS calls, COALESCE(SUM(estimated_usd), 0) AS usd,
                              COALESCE(SUM(input_tokens), 0) AS input, COALESCE(SUM(output_tokens), 0) AS output,
                              COALESCE(SUM(cache_read_tokens), 0) AS cache_read, COALESCE(SUM(cache_write_tokens), 0) AS cache_write,
                              COALESCE(SUM(audio_input_tokens), 0) AS audio,
                              COALESCE(SUM(CASE WHEN rate_basis = 'placeholder' THEN 1 ELSE 0 END), 0) AS placeholder
                              FROM ai_usage WHERE user_id=? AND substr(created_at, 1, 7)=?""",
                           (user_id, datetime.now(timezone.utc).strftime('%Y-%m'))).fetchone()
    cap = cap_usd(tier)
    return {'month': datetime.now(timezone.utc).strftime('%Y-%m'), 'calls': row['calls'],
            'estimated_usd': round(row['usd'], 4), 'input_tokens': row['input'], 'output_tokens': row['output'],
            'cache_read_tokens': row['cache_read'], 'cache_write_tokens': row['cache_write'],
            'audio_input_tokens': row['audio'], 'placeholder_rated_calls': row['placeholder'],
            'fair_use_cap_usd': cap, 'fair_use_enforced': fair_use_enforced(),
            'over_fair_use': row['usd'] >= cap}


def over_cap(user_id, tier):
    """True only when the cap is enforced and this month's estimated spend has reached it."""
    return fair_use_enforced() and month_to_date(user_id, tier)['over_fair_use']


def mixmind_cap_usd():
    return _env_float('MIXMIND_AI_CAP_USD', MIXMIND_AI_CAP_USD)


def mixmind_fair_use_enforced():
    return os.getenv('MIXMIND_AI_FAIR_USE_ENFORCED', 'false').lower() == 'true'


def mixmind_month_usd(user_id):
    """This UTC month's estimated spend on MixMind AI only (feature 'mixmind')."""
    with db() as conn:
        row = conn.execute("""SELECT COALESCE(SUM(estimated_usd), 0) AS usd FROM ai_usage
                              WHERE user_id=? AND feature='mixmind' AND substr(created_at, 1, 7)=?""",
                           (user_id, datetime.now(timezone.utc).strftime('%Y-%m'))).fetchone()
    return row['usd']


def mixmind_over_cap(user_id):
    """True when the MixMind cap is enforced and reached. Unenforced, reaching it is only logged."""
    spent, cap = mixmind_month_usd(user_id), mixmind_cap_usd()
    if spent < cap:
        return False
    if not mixmind_fair_use_enforced():
        log.warning("MixMind AI user %s is over the monthly cap ($%.4f of $%.2f); not enforced", user_id, spent, cap)
        return False
    return True


def trial_limits():
    return {'chat_messages': int(_env_float('TRIAL_CHAT_MESSAGES', TRIAL_CHAT_MESSAGES)),
            'estimated_usd': _env_float('TRIAL_AI_USD', TRIAL_AI_USD)}


def trial_usage(user_id):
    """AI used during the free trial (all of the user's usage: the trial is their first week)."""
    with db() as conn:
        row = conn.execute("""SELECT COUNT(DISTINCT CASE WHEN feature='chat' THEN COALESCE(request_id, CAST(id AS TEXT)) END) AS messages,
                              COALESCE(SUM(estimated_usd), 0) AS usd FROM ai_usage WHERE user_id=?""", (user_id,)).fetchone()
    limits = trial_limits()
    return {'chat_messages': row['messages'], 'estimated_usd': round(row['usd'], 4), 'limits': limits,
            'exhausted': row['messages'] >= limits['chat_messages'] or row['usd'] >= limits['estimated_usd']}


def status(user_id, plan):
    """Month-to-date usage and the limit that applies to this user's plan."""
    usage = month_to_date(user_id, plan['tier'])
    if plan['source'] == 'trial':
        usage['trial'] = trial_usage(user_id)
    return usage


def enforce(user):
    """Raise before an AI call when the free trial's AI is used up, or an enforced fair-use cap is reached."""
    import billing
    plan = billing.allowance(user)
    if plan['source'] == 'trial':
        if trial_usage(user['id'])['exhausted']:
            raise HTTPException(402, TRIAL_MESSAGE)
    elif fair_use_enforced() and over_cap(user['id'], plan['tier']):
        raise HTTPException(429, FAIR_USE_MESSAGE)
