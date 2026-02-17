"""
Redis Cache Client for Dollor.ai
Provides centralized Redis access with graceful fallback.
If Redis is unavailable, operations return None/False — the app continues working.
"""

import os
import json
import logging
import time
from typing import Optional

import redis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        retry_on_timeout=True,
    )
    # Test connection at import time
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info(f"Redis connected: {REDIS_URL}")
except Exception as e:
    redis_client = None
    REDIS_AVAILABLE = False
    logger.warning(f"Redis unavailable ({e}), falling back to in-memory")


# ── Cache helpers ─────────────────────────────────────────────────────────────

def cache_get(key: str) -> Optional[str]:
    """Get a cached value. Returns None if miss or Redis unavailable."""
    if not redis_client:
        return None
    try:
        return redis_client.get(key)
    except Exception:
        return None


def cache_set(key: str, value: str, ttl: int = 60) -> bool:
    """Set a cached value with TTL in seconds."""
    if not redis_client:
        return False
    try:
        redis_client.setex(key, ttl, value)
        return True
    except Exception:
        return False


def cache_json_get(key: str):
    """Get a cached JSON value, deserialized."""
    raw = cache_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


def cache_json_set(key: str, value, ttl: int = 60) -> bool:
    """Cache a JSON-serializable value with TTL."""
    try:
        return cache_set(key, json.dumps(value, default=str), ttl)
    except (TypeError, ValueError):
        return False


def cache_delete(key: str) -> bool:
    """Delete a cached key."""
    if not redis_client:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False


# ── Rate Limiting (Redis sorted sets) ─────────────────────────────────────────

def rate_limit_check(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
    """
    Check rate limit using Redis sorted sets (sliding window).
    Returns (is_allowed, retry_after_seconds).
    Falls back to always-allow if Redis unavailable.
    """
    if not redis_client:
        return True, 0

    try:
        now = time.time()
        window_start = now - window_seconds
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window_seconds + 1)
        results = pipe.execute()

        current_count = results[1]
        if current_count >= max_requests:
            # Over limit — remove the just-added entry
            redis_client.zrem(key, str(now))
            # Calculate retry-after from oldest entry
            oldest = redis_client.zrange(key, 0, 0, withscores=True)
            if oldest:
                retry_after = max(0, int(window_seconds - (now - oldest[0][1])))
            else:
                retry_after = window_seconds
            return False, retry_after

        return True, 0
    except Exception as e:
        logger.warning(f"Rate limit Redis error: {e}")
        return True, 0


# ── Password Reset Codes (Redis with TTL) ─────────────────────────────────────

def store_reset_code(email: str, code: str, ttl_seconds: int = 900) -> bool:
    """Store a password reset code with TTL (default 15 min)."""
    if not redis_client:
        return False
    try:
        redis_client.setex(f"reset:{email}", ttl_seconds, code)
        return True
    except Exception:
        return False


def get_reset_code(email: str) -> Optional[str]:
    """Get a stored password reset code. Returns None if expired/missing."""
    if not redis_client:
        return None
    try:
        return redis_client.get(f"reset:{email}")
    except Exception:
        return None


def delete_reset_code(email: str) -> bool:
    """Delete a used reset code."""
    return cache_delete(f"reset:{email}")
