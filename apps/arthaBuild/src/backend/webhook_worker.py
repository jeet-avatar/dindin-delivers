"""
ArthaBuild Webhook Delivery Worker
=====================================
Phase 16: Dispatches signed webhook payloads to registered endpoints.

Webhook failures NEVER crash the main request — all exceptions are caught and logged.
Uses httpx.AsyncClient for async HTTP delivery with a 10s timeout.

Signing: X-ArthaBuild-Signature = HMAC-SHA256(payload_bytes, secret)
Headers: X-ArthaBuild-Event, X-ArthaBuild-Signature

Architecture layer: Background worker
Phase: 16 — API Platform
"""
import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Supported event names (must match plan spec exactly)
VALID_EVENTS = {"chat.completed", "script.deployed", "user.registered"}


async def dispatch_webhook(db: AsyncSession, event: str, payload: dict) -> None:
    """
    Query active WebhookEndpoint rows for event and POST a signed payload to each URL.

    This function is designed to be called via asyncio.create_task() — it catches ALL
    exceptions and logs them. Webhook delivery failure never propagates to the caller.

    Args:
        db:      Async SQLAlchemy session. Must be open when this coroutine starts.
        event:   Event name, e.g. "chat.completed" or "script.deployed".
        payload: Dict of event data. Will be JSON-serialised for delivery.
    """
    # Import here to avoid circular imports at module level
    from models import WebhookEndpoint

    try:
        result = await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.event == event,
                WebhookEndpoint.is_active == True,  # noqa: E712
            )
        )
        endpoints = result.scalars().all()
    except Exception as exc:
        logger.error(f"webhook_worker: DB query failed for event={event!r}: {exc}", exc_info=True)
        return

    if not endpoints:
        logger.debug(f"webhook_worker: no active endpoints for event={event!r}")
        return

    payload_bytes = json.dumps(payload, default=str).encode("utf-8")

    try:
        import httpx
    except ImportError:
        logger.error("webhook_worker: httpx not installed — cannot deliver webhooks. pip install httpx")
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        for endpoint in endpoints:
            try:
                signature = hmac.new(
                    endpoint.secret.encode("utf-8"),
                    payload_bytes,
                    hashlib.sha256,
                ).hexdigest()

                resp = await client.post(
                    endpoint.url,
                    content=payload_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "X-ArthaBuild-Event": event,
                        "X-ArthaBuild-Signature": signature,
                    },
                )
                logger.debug(
                    f"webhook_worker: delivered event={event!r} to {endpoint.url!r} "
                    f"status={resp.status_code}"
                )
            except Exception as exc:
                logger.debug(
                    f"webhook_worker: delivery failed for event={event!r} url={endpoint.url!r}: {exc}"
                )


async def register_webhook(
    db: AsyncSession,
    user_id: int,
    event: str,
    url: str,
    secret: str,
) -> "WebhookEndpoint":
    """
    Create and persist a new WebhookEndpoint row.

    Args:
        db:      Open async SQLAlchemy session.
        user_id: ID of the user registering the webhook.
        event:   One of VALID_EVENTS.
        url:     Target URL to POST to.
        secret:  HMAC signing secret (caller-supplied; stored as-is).

    Returns:
        The newly created WebhookEndpoint ORM object.
    """
    from models import WebhookEndpoint

    endpoint = WebhookEndpoint(
        user_id=user_id,
        event=event,
        url=url,
        secret=secret,
        is_active=True,
    )
    db.add(endpoint)
    await db.commit()
    await db.refresh(endpoint)
    logger.info(f"register_webhook: created endpoint id={endpoint.id} event={event!r} url={url!r}")
    return endpoint
