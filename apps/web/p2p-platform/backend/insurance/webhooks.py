"""Webhook dispatch and HMAC signing for insurance events."""
import json
import hmac
import hashlib
import logging
import threading
import time
from datetime import datetime
from typing import Optional
import requests
from sqlalchemy.orm import Session as DBSession

from models import Driver
from insurance.models import InsuranceEvent, InsuranceWebhookConfig

logger = logging.getLogger(__name__)
MAX_RETRIES = 3
RETRY_BACKOFFS = [1, 4, 16]


def sign_payload(payload_json: str, secret: str) -> str:
    """Sign a JSON payload with HMAC-SHA256.

    Args:
        payload_json: JSON string to sign
        secret: Secret key for signing

    Returns:
        Signature in format "sha256={hex_digest}"
    """
    sig = hmac.new(secret.encode(), payload_json.encode(), hashlib.sha256).hexdigest()
    return f"sha256={sig}"


def build_webhook_payload(
    event_id: str,
    event_type: str,
    timestamp: datetime,
    driver_id: int,
    driver_first_name: Optional[str],
    driver_last_name: Optional[str],
    driver_license_plate: Optional[str],
    trip_type: str,
    trip_id: Optional[int],
    period: int,
    odometer_miles: float,
    latitude: Optional[float],
    longitude: Optional[float],
    segment_miles: float,
    segment_duration_seconds: int,
) -> dict:
    """Build webhook payload from insurance event data.

    Args:
        event_id: Unique event identifier
        event_type: Type of event (period_start, period_end)
        timestamp: Event timestamp
        driver_id: Driver ID
        driver_first_name: Driver first name
        driver_last_name: Driver last name
        driver_license_plate: Vehicle license plate
        trip_type: Type of trip (rideshare, delivery, available)
        trip_id: Trip ID if applicable
        period: Insurance period (1, 2, or 3)
        odometer_miles: Odometer reading in miles
        latitude: Event latitude
        longitude: Event longitude
        segment_miles: Segment miles
        segment_duration_seconds: Segment duration in seconds

    Returns:
        Dictionary with webhook payload structure
    """
    # Format timestamp as ISO 8601 with milliseconds and Z suffix
    ts_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    return {
        "event_id": event_id,
        "event_type": event_type,
        "timestamp": ts_str,
        "driver": {
            "id": driver_id,
            "first_name": driver_first_name,
            "last_name": driver_last_name,
            "license_plate": driver_license_plate,
        },
        "trip": {
            "type": trip_type,
            "id": trip_id,
            "period": period,
            "odometer_miles": odometer_miles,
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
        },
        "segment": {
            "miles": segment_miles,
            "duration_seconds": segment_duration_seconds,
        },
    }


def _send_webhook(url: str, payload_json: str, signature: str) -> bool:
    """Send webhook with retries.

    Args:
        url: Webhook callback URL
        payload_json: JSON payload string
        signature: HMAC signature

    Returns:
        True if successful, False if all retries exhausted
    """
    for attempt, backoff in enumerate(RETRY_BACKOFFS):
        try:
            resp = requests.post(
                url,
                data=payload_json,
                headers={
                    "Content-Type": "application/json",
                    "X-Insurance-Signature": signature,
                },
                timeout=10,
            )
            if resp.status_code < 400:
                return True
            logger.warning(
                f"Webhook {url} returned {resp.status_code} (attempt {attempt + 1})"
            )
        except Exception as e:
            logger.warning(f"Webhook {url} failed (attempt {attempt + 1}): {e}")

        if attempt < MAX_RETRIES - 1:
            time.sleep(backoff)

    return False


def dispatch_webhooks(event: InsuranceEvent, db: DBSession) -> None:
    """Dispatch insurance event to all configured webhooks asynchronously.

    Args:
        event: InsuranceEvent to dispatch
        db: Database session
    """
    try:
        # Get all active webhooks
        webhooks = db.query(InsuranceWebhookConfig).filter(
            InsuranceWebhookConfig.is_active == True
        ).all()

        if not webhooks:
            return

        # Get driver information
        driver = db.query(Driver).filter(Driver.id == event.driver_id).first()

        # Build payload
        payload = build_webhook_payload(
            event_id=event.id,
            event_type=event.event_type,
            timestamp=event.timestamp,
            driver_id=event.driver_id,
            driver_first_name=driver.first_name if driver else None,
            driver_last_name=driver.last_name if driver else None,
            driver_license_plate=getattr(driver, "license_plate", None) if driver else None,
            trip_type=event.trip_type,
            trip_id=event.trip_id,
            period=event.period,
            odometer_miles=event.odometer_miles,
            latitude=event.latitude,
            longitude=event.longitude,
            segment_miles=event.segment_miles,
            segment_duration_seconds=event.segment_duration_seconds,
        )

        payload_json = json.dumps(payload)

        # Send to each webhook asynchronously
        for webhook in webhooks:
            # Filter by event_types if configured
            if webhook.event_types and event.event_type not in webhook.event_types:
                continue

            # Sign and dispatch
            signature = sign_payload(payload_json, webhook.secret_key)
            thread = threading.Thread(
                target=_send_webhook,
                args=(webhook.callback_url, payload_json, signature),
                daemon=True,
            )
            thread.start()

    except Exception as e:
        logger.error(f"dispatch_webhooks error: {e}", exc_info=True)
