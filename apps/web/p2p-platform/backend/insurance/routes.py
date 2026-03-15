"""Insurance REST API routes for Dollor.ai Usage-Based Insurance (UBI).

Sections:
- REST API (Insurance API key auth): trip events, driver events, driver summary, platform summary
- Webhook Management (Admin JWT auth): register, list, update, delete
- API Key Management (Admin JWT auth): generate, list, revoke
"""
import secrets
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from auth_utils import require_admin
from database import get_db
from insurance.auth import hash_api_key, require_insurance_api_key
from insurance.models import InsuranceApiKey, InsuranceEvent, InsuranceWebhookConfig

router = APIRouter()

# ── Helper ─────────────────────────────────────────────────────────────────────


def _event_to_dict(e: InsuranceEvent) -> dict:
    return {
        "id": e.id,
        "driver_id": e.driver_id,
        "trip_type": e.trip_type,
        "trip_id": e.trip_id,
        "session_id": e.session_id,
        "period": e.period,
        "event_type": e.event_type,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "latitude": e.latitude,
        "longitude": e.longitude,
        "odometer_miles": e.odometer_miles,
        "segment_miles": e.segment_miles,
        "segment_duration_seconds": e.segment_duration_seconds,
        "metadata": e.metadata_json,
    }


# ── Pydantic request/response schemas ─────────────────────────────────────────


class WebhookCreateRequest(BaseModel):
    provider_name: str
    callback_url: str
    secret_key: Optional[str] = None


class WebhookUpdateRequest(BaseModel):
    provider_name: Optional[str] = None
    callback_url: Optional[str] = None
    secret_key: Optional[str] = None
    is_active: Optional[bool] = None
    event_types: Optional[list] = None


class ApiKeyCreateRequest(BaseModel):
    provider_name: str
    permissions: Optional[list] = None


# ── REST API: Insurance API key auth ──────────────────────────────────────────


@router.get("/api/insurance/trips/{trip_type}/{trip_id}/events")
def get_trip_events(
    trip_type: str,
    trip_id: int,
    _api_key: InsuranceApiKey = Depends(require_insurance_api_key),
    db: DBSession = Depends(get_db),
) -> dict:
    """Return all InsuranceEvents for a specific trip."""
    events = (
        db.query(InsuranceEvent)
        .filter(
            InsuranceEvent.trip_type == trip_type,
            InsuranceEvent.trip_id == trip_id,
        )
        .order_by(InsuranceEvent.timestamp)
        .all()
    )
    return {"events": [_event_to_dict(e) for e in events]}


@router.get("/api/insurance/drivers/{driver_id}/events")
def get_driver_events(
    driver_id: int,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    trip_type: Optional[str] = Query(None),
    _api_key: InsuranceApiKey = Depends(require_insurance_api_key),
    db: DBSession = Depends(get_db),
) -> dict:
    """Return all InsuranceEvents for a driver, with optional date and trip_type filters."""
    q = db.query(InsuranceEvent).filter(InsuranceEvent.driver_id == driver_id)

    if from_date:
        try:
            dt = datetime.fromisoformat(from_date)
            q = q.filter(InsuranceEvent.timestamp >= dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date format. Use ISO 8601.")

    if to_date:
        try:
            dt = datetime.fromisoformat(to_date)
            q = q.filter(InsuranceEvent.timestamp <= dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date format. Use ISO 8601.")

    if trip_type:
        q = q.filter(InsuranceEvent.trip_type == trip_type)

    events = q.order_by(InsuranceEvent.timestamp).all()
    return {"events": [_event_to_dict(e) for e in events]}


@router.get("/api/insurance/drivers/{driver_id}/summary")
def get_driver_summary(
    driver_id: int,
    _api_key: InsuranceApiKey = Depends(require_insurance_api_key),
    db: DBSession = Depends(get_db),
) -> dict:
    """Return aggregate stats for a driver: total trips, miles, seconds, time_by_period."""
    events = (
        db.query(InsuranceEvent)
        .filter(InsuranceEvent.driver_id == driver_id)
        .all()
    )

    # Count unique trip IDs (non-null) as total_trips
    trip_ids = {e.trip_id for e in events if e.trip_id is not None}
    total_trips = len(trip_ids)

    total_miles = sum(e.segment_miles or 0.0 for e in events)
    total_seconds = sum(e.segment_duration_seconds or 0 for e in events)

    # Aggregate seconds per UBI period (1, 2, 3)
    time_by_period: dict = {}
    for e in events:
        if e.segment_duration_seconds:
            key = str(e.period)
            time_by_period[key] = time_by_period.get(key, 0) + e.segment_duration_seconds

    return {
        "driver_id": driver_id,
        "total_trips": total_trips,
        "total_miles": round(total_miles, 4),
        "total_seconds": total_seconds,
        "time_by_period": time_by_period,
    }


@router.get("/api/insurance/summary")
def get_platform_summary(
    _api_key: InsuranceApiKey = Depends(require_insurance_api_key),
    db: DBSession = Depends(get_db),
) -> dict:
    """Return platform-wide aggregate stats across all drivers."""
    events = db.query(InsuranceEvent).all()

    trip_ids = {e.trip_id for e in events if e.trip_id is not None}
    total_trips = len(trip_ids)
    driver_ids = {e.driver_id for e in events}

    total_miles = sum(e.segment_miles or 0.0 for e in events)
    total_seconds = sum(e.segment_duration_seconds or 0 for e in events)

    time_by_period: dict = {}
    for e in events:
        if e.segment_duration_seconds:
            key = str(e.period)
            time_by_period[key] = time_by_period.get(key, 0) + e.segment_duration_seconds

    return {
        "total_trips": total_trips,
        "total_drivers": len(driver_ids),
        "total_miles": round(total_miles, 4),
        "total_seconds": total_seconds,
        "time_by_period": time_by_period,
    }


# ── Webhook Management: Admin JWT auth ────────────────────────────────────────


@router.post("/api/insurance/webhooks", status_code=201)
def create_webhook(
    body: WebhookCreateRequest,
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """Register a new webhook endpoint for insurance event delivery."""
    secret = body.secret_key or secrets.token_hex(32)
    webhook = InsuranceWebhookConfig(
        id=str(uuid.uuid4()),
        provider_name=body.provider_name,
        callback_url=body.callback_url,
        secret_key=secret,
        is_active=True,
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return {
        "id": webhook.id,
        "provider_name": webhook.provider_name,
        "callback_url": webhook.callback_url,
        "is_active": webhook.is_active,
        "created_at": webhook.created_at.isoformat() if webhook.created_at else None,
    }


@router.get("/api/insurance/webhooks")
def list_webhooks(
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """List all registered webhook configurations."""
    webhooks = db.query(InsuranceWebhookConfig).order_by(InsuranceWebhookConfig.created_at).all()
    return {
        "webhooks": [
            {
                "id": w.id,
                "provider_name": w.provider_name,
                "callback_url": w.callback_url,
                "is_active": w.is_active,
                "event_types": w.event_types,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "updated_at": w.updated_at.isoformat() if w.updated_at else None,
            }
            for w in webhooks
        ]
    }


@router.put("/api/insurance/webhooks/{webhook_id}")
def update_webhook(
    webhook_id: str,
    body: WebhookUpdateRequest,
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """Update an existing webhook configuration."""
    webhook = db.query(InsuranceWebhookConfig).filter(
        InsuranceWebhookConfig.id == webhook_id
    ).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if body.provider_name is not None:
        webhook.provider_name = body.provider_name
    if body.callback_url is not None:
        webhook.callback_url = body.callback_url
    if body.secret_key is not None:
        webhook.secret_key = body.secret_key
    if body.is_active is not None:
        webhook.is_active = body.is_active
    if body.event_types is not None:
        webhook.event_types = body.event_types

    webhook.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(webhook)

    return {
        "id": webhook.id,
        "provider_name": webhook.provider_name,
        "callback_url": webhook.callback_url,
        "is_active": webhook.is_active,
        "event_types": webhook.event_types,
        "updated_at": webhook.updated_at.isoformat() if webhook.updated_at else None,
    }


@router.delete("/api/insurance/webhooks/{webhook_id}")
def delete_webhook(
    webhook_id: str,
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """Delete a webhook configuration."""
    webhook = db.query(InsuranceWebhookConfig).filter(
        InsuranceWebhookConfig.id == webhook_id
    ).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    db.delete(webhook)
    db.commit()
    return {"message": f"Webhook {webhook_id} deleted"}


# ── API Key Management: Admin JWT auth ────────────────────────────────────────


@router.post("/api/insurance/api-keys", status_code=201)
def generate_api_key(
    body: ApiKeyCreateRequest,
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """Generate a new insurance API key. The raw key is returned ONCE — store it securely."""
    raw_key = f"ins_{secrets.token_hex(24)}"
    key_hash = hash_api_key(raw_key)

    api_key = InsuranceApiKey(
        id=str(uuid.uuid4()),
        provider_name=body.provider_name,
        api_key_hash=key_hash,
        is_active=True,
        permissions=body.permissions,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return {
        "id": api_key.id,
        "provider_name": api_key.provider_name,
        "raw_key": raw_key,  # Returned ONCE — not stored in plain text
        "is_active": api_key.is_active,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
    }


@router.get("/api/insurance/api-keys")
def list_api_keys(
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """List all insurance API keys (without raw keys or hashes)."""
    keys = db.query(InsuranceApiKey).order_by(InsuranceApiKey.created_at).all()
    return {
        "api_keys": [
            {
                "id": k.id,
                "provider_name": k.provider_name,
                "is_active": k.is_active,
                "permissions": k.permissions,
                "created_at": k.created_at.isoformat() if k.created_at else None,
            }
            for k in keys
        ]
    }


@router.delete("/api/insurance/api-keys/{key_id}")
def revoke_api_key(
    key_id: str,
    # TODO: Add require_admin dependency after circular import is resolved
    # admin = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> dict:
    """Revoke an insurance API key by setting is_active=False."""
    api_key = db.query(InsuranceApiKey).filter(InsuranceApiKey.id == key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    db.commit()
    return {"message": f"API key {key_id} revoked", "id": key_id}
