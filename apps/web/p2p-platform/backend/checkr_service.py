"""
Checkr-Hosted Background Check Integration — TNC Driver Vetting
================================================================

Replaces the Persona scaffolding for TNC driver background checks with
Checkr (the provider named in Zietra's CPUC TNC permit application).

Flow (Checkr-Hosted / Invitation):
  1. Backend creates a Checkr *candidate* (email + CA work location).
  2. Backend creates a hosted *invitation* -> Checkr returns `invitation_url`.
  3. Driver completes FCRA disclosures, consent and PII on Checkr's own pages.
  4. Checkr runs the report; `report.completed` webhook -> we set the gate.

Scope is the CPUC TNC minimum only (Decision 13-09-045 / PU Code 5445.2):
  - Criminal: SSN trace, National criminal, Sex Offender registry, County (7yr)
  - Driving record: Motor Vehicle Record (MVR)
Nothing extra (no drug test, credit, occupational health, federal/state criminal).

Checkr-Hosted means Checkr serves the disclosure/authorization/adverse-action
compliance UI; we only orchestrate and read results.

Env:
  CHECKR_API_KEY        - secret key (Basic auth username, blank password)
  CHECKR_API_URL        - https://api.checkr-staging.com (staging) / https://api.checkr.com (prod)
  CHECKR_PACKAGE_SLUG   - package to run (Essential Criminal for staging; "Dollor Driver" = Essential + MVR for prod)
  CHECKR_WEBHOOK_SECRET - HMAC secret for X-Checkr-Signature verification
"""

import os
import hmac
import base64
import hashlib
import logging
from datetime import datetime
from typing import Optional, Dict, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from auth_utils import require_any_auth, require_driver, require_admin
from models import Driver, DriverStatus

logger = logging.getLogger("checkr_service")

router = APIRouter(prefix="/api/checkr", tags=["Checkr Background Check"])

CHECKR_API_URL = os.getenv("CHECKR_API_URL", "https://api.checkr-staging.com").rstrip("/")
CHECKR_API_KEY = os.getenv("CHECKR_API_KEY", "")
CHECKR_PACKAGE_SLUG = os.getenv("CHECKR_PACKAGE_SLUG", "checkrdirect_essential_criminal")
CHECKR_WEBHOOK_SECRET = os.getenv("CHECKR_WEBHOOK_SECRET", "")

# California only — matches the CPUC TNC permit operating territory.
CHECKR_WORK_LOCATIONS = [{"country": "US", "state": "CA"}]

# Markers used to persist Checkr IDs inside Driver.verification_notes
# (keeps us migration-free; the authoritative gate stays Driver.background_check).
_M_CANDIDATE = "CHECKR_CANDIDATE_ID="
_M_INVITATION = "CHECKR_INVITATION_ID="
_M_INVITE_URL = "CHECKR_INVITATION_URL="
_M_REPORT = "CHECKR_REPORT_ID="


def _auth_headers() -> Dict[str, str]:
    """Checkr uses HTTP Basic auth: secret key as username, empty password."""
    token = base64.b64encode(f"{CHECKR_API_KEY}:".encode()).decode()
    return {"Authorization": f"Basic {token}", "Content-Type": "application/json"}


def _require_configured():
    if not CHECKR_API_KEY:
        raise HTTPException(status_code=503, detail="Checkr API key not configured (CHECKR_API_KEY)")


def _append_note(driver: Driver, text: str) -> None:
    driver.verification_notes = (driver.verification_notes or "") + f"\n{text}"


def _marker(notes: Optional[str], marker: str) -> Optional[str]:
    """Return the last value written for a given marker, if any."""
    if not notes:
        return None
    value = None
    for line in notes.splitlines():
        line = line.strip()
        if line.startswith(marker):
            value = line[len(marker):].strip()
    return value


def verify_webhook_signature(raw_body: bytes, signature_header: str) -> bool:
    """Verify Checkr webhook signature (X-Checkr-Signature: HMAC-SHA256 hex of body).

    FAILS CLOSED: if CHECKR_WEBHOOK_SECRET is unset we cannot authenticate the caller,
    so the request is rejected. The webhook path is the only public Checkr route, so an
    unverifiable payload must never be allowed to mutate a driver's background-check gate.
    """
    if not CHECKR_WEBHOOK_SECRET:
        logger.error("CHECKR_WEBHOOK_SECRET not set — rejecting Checkr webhook (fail closed)")
        return False
    expected = hmac.new(CHECKR_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (signature_header or "").strip())


# =============================================================================
# Checkr API client
# =============================================================================

async def _post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{CHECKR_API_URL}{path}", headers=_auth_headers(), json=payload)
    if resp.status_code not in (200, 201):
        logger.error(f"Checkr POST {path} -> {resp.status_code}: {resp.text[:500]}")
        raise HTTPException(status_code=502, detail=f"Checkr API error ({resp.status_code})")
    return resp.json()


async def _get(path: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{CHECKR_API_URL}{path}", headers=_auth_headers())
    if resp.status_code != 200:
        logger.error(f"Checkr GET {path} -> {resp.status_code}: {resp.text[:500]}")
        raise HTTPException(status_code=502, detail=f"Checkr API error ({resp.status_code})")
    return resp.json()


async def create_candidate(driver: Driver) -> str:
    """Create a Checkr candidate. For the hosted flow we send minimal info;
    the candidate supplies the rest (DOB, SSN, address) on Checkr's pages."""
    payload = {
        "email": driver.email,
        "work_locations": CHECKR_WORK_LOCATIONS,
    }
    if driver.first_name:
        payload["first_name"] = driver.first_name
    if driver.last_name:
        payload["last_name"] = driver.last_name
    if getattr(driver, "phone", None):
        payload["phone"] = driver.phone
    data = await _post("/v1/candidates", payload)
    return data["id"]


async def create_invitation(candidate_id: str) -> Dict[str, Any]:
    """Create a Checkr-Hosted invitation; Checkr returns the hosted invitation_url."""
    payload = {
        "candidate_id": candidate_id,
        "package": CHECKR_PACKAGE_SLUG,
        "work_locations": CHECKR_WORK_LOCATIONS,
    }
    return await _post("/v1/invitations", payload)


async def get_report(report_id: str) -> Dict[str, Any]:
    return await _get(f"/v1/reports/{report_id}")


# =============================================================================
# Routes
# =============================================================================

@router.post("/background-check/initiate")
async def initiate_background_check(
    driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Driver self-initiates their own Checkr-Hosted background check.
    Returns the invitation_url the driver completes on Checkr's hosted pages."""
    _require_configured()
    driver_id = driver.id
    if not driver.email:
        raise HTTPException(status_code=400, detail="Driver email required for background check")

    candidate_id = _marker(driver.verification_notes, _M_CANDIDATE) or await create_candidate(driver)
    invitation = await create_invitation(candidate_id)
    invitation_url = invitation.get("invitation_url", "")
    invitation_id = invitation.get("id", "")

    driver.background_check = False  # pending until report clears
    driver.background_check_date = datetime.utcnow()
    driver.verification_provider = "checkr"
    driver.verification_id = candidate_id
    driver.verification_status = "pending"
    _append_note(driver, f"{_M_CANDIDATE}{candidate_id}")
    _append_note(driver, f"{_M_INVITATION}{invitation_id}")
    _append_note(driver, f"{_M_INVITE_URL}{invitation_url}")
    _append_note(driver, f"Checkr invitation created {datetime.utcnow().isoformat()}")
    db.commit()

    logger.info(f"Checkr invitation created for driver {driver_id}: {invitation_id}")
    return {
        "success": True,
        "driver_id": driver_id,
        "candidate_id": candidate_id,
        "invitation_id": invitation_id,
        "invitation_url": invitation_url,
        "status": "pending",
        "message": "Background check invitation created. Driver completes it on Checkr's hosted pages.",
    }


@router.post("/webhook")
async def checkr_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Checkr webhooks. Gate the driver on report.completed."""
    raw = await request.body()
    if not verify_webhook_signature(raw, request.headers.get("X-Checkr-Signature", "")):
        raise HTTPException(status_code=401, detail="Invalid Checkr webhook signature")

    body = await request.json()
    event_type = body.get("type", "")
    obj = body.get("data", {}).get("object", {})

    if event_type != "report.completed":
        # invitation.completed etc. — acknowledge, nothing to gate yet.
        return {"received": True, "processed": False, "type": event_type}

    report_id = obj.get("id", "")
    candidate_id = obj.get("candidate_id", "")
    result = (obj.get("result") or "").lower()   # "clear" | "consider"
    status = (obj.get("status") or "").lower()    # "complete" | "suspended" | ...

    driver = (
        db.query(Driver).filter(Driver.verification_id == candidate_id).first()
        if candidate_id else None
    )
    if not driver:
        logger.warning(f"Checkr report webhook: no driver for candidate {candidate_id}")
        return {"received": True, "processed": False, "reason": "driver not found"}

    _append_note(driver, f"{_M_REPORT}{report_id}")

    # Only a "clear" report passes the TNC gate. "consider"/suspended => not cleared.
    if result == "clear" and status in ("complete", ""):
        driver.background_check = True
        driver.background_check_date = datetime.utcnow()
        driver.verification_status = "passed"
        _append_note(driver, f"Checkr report CLEAR {datetime.utcnow().isoformat()}")
        logger.info(f"Driver {driver.id} passed Checkr background check ({report_id})")
    else:
        driver.background_check = False
        driver.verification_status = "failed"
        if driver.status not in (DriverStatus.SUSPENDED,):
            driver.status = DriverStatus.SUSPENDED
        _append_note(driver, f"Checkr report {result or status} — not cleared {datetime.utcnow().isoformat()}")
        logger.warning(f"Driver {driver.id} Checkr report not clear: result={result} status={status}")

    db.commit()
    return {"received": True, "processed": True, "driver_id": driver.id, "passed": driver.background_check}


def _caller_is_driver_or_admin(auth: dict, driver: Driver, db: Session) -> bool:
    """IDOR guard: True only if the JWT belongs to this driver or to an admin user."""
    # Driver self-access: match by numeric id, driver code, or email claim.
    claim_driver_id = auth.get("driver_id")
    if claim_driver_id is not None and str(claim_driver_id) in (str(driver.id), str(driver.driver_id)):
        return True
    sub = auth.get("sub")
    if sub and driver.email and sub == driver.email:
        return True
    # Admin override.
    if sub:
        from models import User, UserRole
        user = db.query(User).filter(User.email == sub).first()
        if user and user.role == UserRole.ADMIN:
            return True
    return False


@router.get("/background-check/{driver_id}/status")
async def get_background_check_status(
    driver_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_any_auth),
):
    """Background-check status for a driver, including the invitation_url if pending.

    IDOR guard: only the driver themselves or an admin may read this.
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if not _caller_is_driver_or_admin(auth, driver, db):
        raise HTTPException(status_code=403, detail="Access denied")

    if driver.background_check:
        status = "passed"
    elif driver.verification_status in ("failed",):
        status = "failed"
    elif driver.background_check_date:
        status = "pending"
    else:
        status = "not_started"

    return {
        "driver_id": driver_id,
        "provider": "checkr",
        "status": status,
        "passed": bool(driver.background_check),
        "checked_at": driver.background_check_date.isoformat() if driver.background_check_date else None,
        "invitation_url": _marker(driver.verification_notes, _M_INVITE_URL) if status in ("pending", "not_started") else None,
    }
