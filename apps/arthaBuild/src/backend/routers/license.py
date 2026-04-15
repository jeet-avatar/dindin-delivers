"""
ArthaBuild License Validation
Privacy guarantee: only {license_key, instance_id, version} sent to license server.
No customer data, prompts, scripts, or NetSuite credentials ever leave the instance.
"""
import os
import uuid
import logging
import httpx
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc

from database import get_db
from models import LicenseCache, ScriptDeployment, User, ScriptGeneration
from auth_utils import get_current_user_id, require_user_unverified_ok

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/license", tags=["license"])

LICENSE_KEY = os.getenv("LICENSE_KEY", "")
LICENSE_SERVER_URL = os.getenv("LICENSE_SERVER_URL")  # No hardcoded fallback — set in deployment env
if not LICENSE_SERVER_URL:
    logger.warning("LICENSE_SERVER_URL not set — license validation will fail if LICENSE_KEY is configured")
SALES_EMAIL = os.getenv("SALES_EMAIL", "sales@techcloudpro.com")
VERSION = "1.0.0"
CACHE_TTL_DAYS = int(os.getenv("CACHE_TTL_DAYS", "7"))
GRACE_PERIOD_HOURS = int(os.getenv("GRACE_PERIOD_HOURS", "72"))

# License modes — single source of truth
MODE_DEV = "dev"
MODE_ACTIVE = "active"
MODE_GRACE = "grace"
MODE_RESTRICTED = "restricted"

TIER_LIMITS = {
    "dev": 5,          # free plan — 5 script generations per calendar month
    "starter": 10,
    "growth": 100,
    "enterprise": None,  # unlimited
}


def get_or_create_instance_id() -> str:
    """Get stable instance ID for this deployment. Written to data/instance_id.txt on first run."""
    id_file = Path("./data/instance_id.txt")
    id_file.parent.mkdir(exist_ok=True)
    if id_file.exists():
        return id_file.read_text().strip()
    instance_id = str(uuid.uuid4())
    id_file.write_text(instance_id)
    logger.info(f"Generated instance ID: {instance_id}")
    return instance_id


async def _call_license_server(license_key: str, instance_id: str) -> dict:
    """Call the TechCloudPro license server. Only sends: license_key, instance_id, version."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{LICENSE_SERVER_URL}/api/validate",
            json={"license_key": license_key, "instance_id": instance_id, "version": VERSION},
        )
        return resp.json()


async def validate_license(db: AsyncSession) -> dict:
    """
    Full license validation with cache + grace period logic.
    Returns: {valid, plan, mode: 'active'|'grace'|'restricted', days_remaining, source}
    """
    if not LICENSE_KEY:
        return {"valid": True, "plan": MODE_DEV, "mode": MODE_DEV, "reason": "no LICENSE_KEY set"}

    instance_id = get_or_create_instance_id()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(LicenseCache)
        .where(LicenseCache.license_key == LICENSE_KEY)
        .where(LicenseCache.instance_id == instance_id)
        .order_by(LicenseCache.last_checked.desc())
        .limit(1)
    )
    cached = result.scalar_one_or_none()

    # Cache still valid — return without calling license server
    if cached and cached.valid_until and cached.valid_until > now:
        return {
            "valid": True, "plan": cached.plan, "mode": MODE_ACTIVE,
            "days_remaining": (cached.valid_until - now).days, "source": "cache"
        }

    # Cache expired or empty — try license server
    try:
        data = await _call_license_server(LICENSE_KEY, instance_id)
        if data.get("valid"):
            plan = data.get("plan", "starter")
            if cached:
                cached.valid_until = now + timedelta(days=CACHE_TTL_DAYS)
                cached.last_checked = now
                cached.plan = plan
            else:
                db.add(LicenseCache(
                    license_key=LICENSE_KEY, instance_id=instance_id,
                    plan=plan, valid_until=now + timedelta(days=CACHE_TTL_DAYS),
                    last_checked=now,
                ))
            await db.commit()
            expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
            return {
                "valid": True, "plan": plan, "mode": MODE_ACTIVE,
                "days_remaining": (expires_at - now).days, "source": "server"
            }
        else:
            return {"valid": False, "plan": None, "mode": MODE_RESTRICTED,
                    "reason": data.get("message", "Invalid license")}
    except Exception as e:
        logger.warning(f"License server unreachable: {e}")
        if cached and cached.last_checked:
            hours_elapsed = (now - cached.last_checked).total_seconds() / 3600
            if hours_elapsed < GRACE_PERIOD_HOURS:
                return {
                    "valid": True, "plan": cached.plan, "mode": MODE_GRACE,
                    "hours_remaining": round(GRACE_PERIOD_HOURS - hours_elapsed, 1),
                    "source": "grace_period"
                }
        return {"valid": False, "plan": None, "mode": MODE_RESTRICTED,
                "reason": "License server unreachable and grace period expired"}


async def check_deploy_quota(db: AsyncSession, user_id: int, plan: str) -> dict:
    """Check if user can deploy another production script. Returns {allowed, used, limit}."""
    limit = TIER_LIMITS.get(plan)
    if limit is None:
        return {"allowed": True, "used": None, "limit": None}  # enterprise = unlimited

    result = await db.execute(
        select(sqlfunc.count(ScriptDeployment.id))
        .where(ScriptDeployment.user_id == user_id)
        .where(ScriptDeployment.target == "production")
        .where(ScriptDeployment.license_key == LICENSE_KEY)
    )
    used = result.scalar() or 0
    return {"allowed": used < limit, "used": used, "limit": limit}


async def check_script_quota(db: AsyncSession, user_id: int, plan: str) -> dict:
    """Check if user can generate another SuiteScript this calendar month.
    Returns {allowed, used, limit}. Only enforced on dev (free) plan."""
    limit = TIER_LIMITS.get(plan)
    if limit is None:
        return {"allowed": True, "used": None, "limit": None}  # enterprise = unlimited
    # Dev plan: count current calendar month only
    # Paid plans: count all-time (per check_deploy_quota pattern)
    now = datetime.now(timezone.utc)
    if plan == "dev":
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result = await db.execute(
            select(sqlfunc.count(ScriptGeneration.id))
            .where(ScriptGeneration.user_id == user_id)
            .where(ScriptGeneration.created_at >= month_start)
        )
    else:
        result = await db.execute(
            select(sqlfunc.count(ScriptGeneration.id))
            .where(ScriptGeneration.user_id == user_id)
        )
    used = result.scalar() or 0
    return {"allowed": used < limit, "used": used, "limit": limit}


async def record_script_generation(db: AsyncSession, user_id: int):
    """Record a SuiteScript generation event for quota tracking."""
    db.add(ScriptGeneration(user_id=user_id))
    await db.commit()


async def record_deploy(db: AsyncSession, user_id: int, script_name: str, target: str):
    """Record a script deployment. Only production deploys count against quota."""
    db.add(ScriptDeployment(
        user_id=user_id, script_name=script_name,
        target=target, license_key=LICENSE_KEY
    ))
    await db.commit()


@router.get("/status")
async def get_license_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user_unverified_ok),
):
    """Get current license status including script generation quota."""
    result = await validate_license(db)
    result["sales_email"] = SALES_EMAIL
    # Attach script quota for the LicenseBanner usage indicator
    quota = await check_script_quota(db, current_user.id, result.get("plan") or "dev")
    result["scripts_used"] = quota["used"]
    result["scripts_limit"] = quota["limit"]
    return result
