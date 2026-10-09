"""Insurance REST API routes for Dollor.ai Usage-Based Insurance (UBI).

Sections:
- REST API (Insurance API key auth): trip events, driver events, driver summary, platform summary
- Webhook Management (Admin JWT auth): register, list, update, delete
- API Key Management (Admin JWT auth): generate, list, revoke
"""
import csv
import io
import secrets
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db
from insurance.auth import hash_api_key, require_insurance_api_key, validate_api_key
from insurance.models import InsuranceApiKey, InsuranceEvent, InsuranceWebhookConfig

router = APIRouter()

# ── Admin auth (lazy) ──────────────────────────────────────────────────────────
# require_admin is imported lazily inside this wrapper to avoid the circular import
# (auth_utils -> models -> ...) that previously forced admin auth to be disabled on
# the webhook/API-key management endpoints. The wrapper is a first-class FastAPI
# dependency, so FastAPI still resolves the token + db sub-dependencies normally.
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


async def require_admin_dep(
    token: str = Depends(_oauth2_scheme),
    db: DBSession = Depends(get_db),
):
    """Admin-only dependency with a deferred import of auth_utils.require_admin."""
    from auth_utils import require_admin
    return await require_admin(token=token, db=db)


async def require_admin_or_insurance_key(
    x_insurance_api_key: Optional[str] = Header(None),
    token: Optional[str] = Depends(_oauth2_scheme),
    db: DBSession = Depends(get_db),
):
    """Allow EITHER a valid insurance API key OR an admin JWT (for report endpoints)."""
    if x_insurance_api_key:
        try:
            return validate_api_key(x_insurance_api_key, db)
        except HTTPException:
            pass  # fall through to try admin JWT
    if token:
        from auth_utils import require_admin
        return await require_admin(token=token, db=db)
    raise HTTPException(status_code=401, detail="Admin JWT or insurance API key required")

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

    # Aggregate seconds AND miles per UBI period (1, 2, 3)
    time_by_period: dict = {}
    miles_by_period: dict = {}
    for e in events:
        key = str(e.period)
        if e.segment_duration_seconds:
            time_by_period[key] = time_by_period.get(key, 0) + e.segment_duration_seconds
        if e.segment_miles:
            miles_by_period[key] = round(miles_by_period.get(key, 0.0) + e.segment_miles, 4)

    return {
        "driver_id": driver_id,
        "total_trips": total_trips,
        "total_miles": round(total_miles, 4),
        "total_seconds": total_seconds,
        "time_by_period": time_by_period,
        "miles_by_period": miles_by_period,
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
    miles_by_period: dict = {}
    for e in events:
        key = str(e.period)
        if e.segment_duration_seconds:
            time_by_period[key] = time_by_period.get(key, 0) + e.segment_duration_seconds
        if e.segment_miles:
            miles_by_period[key] = round(miles_by_period.get(key, 0.0) + e.segment_miles, 4)

    return {
        "total_trips": total_trips,
        "total_drivers": len(driver_ids),
        "total_miles": round(total_miles, 4),
        "total_seconds": total_seconds,
        "time_by_period": time_by_period,
        "miles_by_period": miles_by_period,
    }


# ── Insurance Reports: Admin JWT OR insurance API key ─────────────────────────


def _cf_tnc_rows(report: dict) -> list:
    """Flatten the CF/TNC report into (section, metric, value) rows for CSV/PDF."""
    rows = [("Section", "Metric", "Value")]
    meta = report["report"]
    for k in ("title", "tnc_operator", "permit_number", "state", "from_date", "to_date", "generated_at"):
        rows.append(("Report", k, meta.get(k)))

    mbp = report["mileage_by_period"]
    for period, vals in sorted(mbp["by_period"].items()):
        rows.append((f"Mileage P{period}", "miles", vals["miles"]))
        rows.append((f"Mileage P{period}", "hours", vals["hours"]))
        rows.append((f"Mileage P{period}", "events", vals["events"]))
    rows.append(("Mileage Totals", "total_miles", mbp["total_miles"]))
    rows.append(("Mileage Totals", "total_hours", mbp["total_hours"]))

    for k, v in report["trips_and_drivers"].items():
        rows.append(("Trips & Drivers", k, v))
    for k, v in report["financial_allocation"].items():
        rows.append(("Financial Allocation", k, v))
    for k, v in report["driver_age_distribution"].items():
        rows.append(("Driver Age Distribution", k, v))
    return rows


@router.get("/api/insurance/reports/cf-tnc")
def cf_tnc_report(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    format: str = Query("json", pattern="^(json|csv|pdf)$"),
    _auth=Depends(require_admin_or_insurance_key),
    db: DBSession = Depends(get_db),
):
    """Crum & Forster TNC insurance report (admin JWT or insurance API key).

    format=json (default) | csv (stdlib csv) | pdf (reportlab).
    """
    from insurance.reports import build_cf_tnc_report

    report = build_cf_tnc_report(db, from_date=from_date, to_date=to_date, state=state)

    if format == "json":
        return report

    rows = _cf_tnc_rows(report)

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerows(rows)
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cf_tnc_report.csv"},
        )

    # format == "pdf"
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError:
        raise HTTPException(status_code=501, detail="PDF generation unavailable (reportlab not installed)")

    pdf_buf = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buf, pagesize=letter, title="CF TNC Insurance Report")
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(report["report"]["title"], styles["Title"]),
        Spacer(1, 0.2 * inch),
    ]
    table = Table([[str(c) if c is not None else "" for c in row] for row in rows], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
    ]))
    elements.append(table)
    doc.build(elements)
    pdf_buf.seek(0)
    return StreamingResponse(
        iter([pdf_buf.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cf_tnc_report.pdf"},
    )


# ── Webhook Management: Admin JWT auth ────────────────────────────────────────


@router.post("/api/insurance/webhooks", status_code=201)
def create_webhook(
    body: WebhookCreateRequest,
    _admin=Depends(require_admin_dep),
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
    _admin=Depends(require_admin_dep),
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
    _admin=Depends(require_admin_dep),
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
    _admin=Depends(require_admin_dep),
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
    _admin=Depends(require_admin_dep),
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
    _admin=Depends(require_admin_dep),
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
    _admin=Depends(require_admin_dep),
    db: DBSession = Depends(get_db),
) -> dict:
    """Revoke an insurance API key by setting is_active=False."""
    api_key = db.query(InsuranceApiKey).filter(InsuranceApiKey.id == key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    db.commit()
    return {"message": f"API key {key_id} revoked", "id": key_id}
