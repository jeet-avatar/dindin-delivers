"""
Analytics router
================
Phase 19: Lightweight privacy-respecting analytics for artha.build.

Endpoints:
  POST /api/analytics/collect  — no auth, rate limited 60/min, inserts to analytics_events
  GET  /api/admin/analytics/summary — admin auth required, 30-day aggregated stats

Architecture layer: Router
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth_utils import require_admin, limiter

router = APIRouter(tags=["analytics"])


class AnalyticsPayload(BaseModel):
    type: str
    session_id: str
    page: str
    referrer: Optional[str] = None
    scroll_depth: Optional[int] = 0
    time_on_page: Optional[int] = 0
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    event_type: Optional[str] = None
    element: Optional[str] = None
    value: Optional[str] = None


@router.post("/api/analytics/collect")
@limiter.limit("60/minute")
async def collect(request: Request, payload: AnalyticsPayload, db: AsyncSession = Depends(get_db)):
    await db.execute(text("""
        INSERT INTO analytics_events
          (type, session_id, page, referrer, scroll_depth, time_on_page,
           utm_source, utm_medium, utm_campaign, utm_term, utm_content,
           event_type, element, value)
        VALUES
          (:type, :session_id, :page, :referrer, :scroll_depth, :time_on_page,
           :utm_source, :utm_medium, :utm_campaign, :utm_term, :utm_content,
           :event_type, :element, :value)
    """), payload.model_dump())
    await db.commit()
    return {"ok": True}


@router.get("/api/admin/analytics/summary")
async def summary(admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()

    daily = await db.execute(text("""
        SELECT date(created_at) as day, count(*) as views
        FROM analytics_events WHERE type='pageview' AND created_at >= :cutoff
        GROUP BY day ORDER BY day
    """), {"cutoff": cutoff})

    top_pages = await db.execute(text("""
        SELECT page, count(*) as views
        FROM analytics_events WHERE type='pageview' AND created_at >= :cutoff
        GROUP BY page ORDER BY views DESC LIMIT 10
    """), {"cutoff": cutoff})

    top_referrers = await db.execute(text("""
        SELECT referrer, count(*) as views
        FROM analytics_events WHERE type='pageview' AND referrer IS NOT NULL AND created_at >= :cutoff
        GROUP BY referrer ORDER BY views DESC LIMIT 10
    """), {"cutoff": cutoff})

    campaigns = await db.execute(text("""
        SELECT utm_campaign, utm_source, count(*) as visits
        FROM analytics_events WHERE utm_campaign IS NOT NULL AND created_at >= :cutoff
        GROUP BY utm_campaign, utm_source ORDER BY visits DESC
    """), {"cutoff": cutoff})

    return {
        "daily_pageviews": [dict(r) for r in daily.mappings()],
        "top_pages": [dict(r) for r in top_pages.mappings()],
        "top_referrers": [dict(r) for r in top_referrers.mappings()],
        "utm_campaigns": [dict(r) for r in campaigns.mappings()],
    }
