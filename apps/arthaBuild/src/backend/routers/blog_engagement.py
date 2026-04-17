"""
Blog engagement router
======================
Phase 19 D-1: Anonymous reactions + moderated comments for artha.build blog.

Public endpoints (no auth — added to idle_timeout _SKIP_PATHS):
  GET  /api/blog/{slug}/reactions     — reaction counts (insightful/hot/saved)
  POST /api/blog/{slug}/react         — register a reaction (rate-limited 10/min)
  GET  /api/blog/{slug}/comments      — approved comments only
  POST /api/blog/{slug}/comments      — submit comment (status=pending, rate-limited 5/hr)

Admin endpoints (require_admin):
  GET    /api/admin/blog/comments                 — all comments (any status)
  POST   /api/admin/blog/comments/{id}/approve
  POST   /api/admin/blog/comments/{id}/reject
  POST   /api/admin/blog/comments/{id}/reply      — team reply (approved, is_team_reply=1)
  DELETE /api/admin/blog/comments/{id}

Architecture layer: Router. Uses shared limiter from auth_utils (singleton pattern).
"""
import hashlib
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth_utils import require_admin, limiter

router = APIRouter(tags=["blog"])

VALID_REACTIONS = {"insightful", "hot", "saved"}


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


# ── Reactions ───────────────────────────────────────────────────────────────

class ReactionPayload(BaseModel):
    reaction: str


@router.get("/api/blog/{slug}/reactions")
async def get_reactions(slug: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT reaction, count(*) as count
        FROM blog_reactions WHERE post_slug = :slug
        GROUP BY reaction
    """), {"slug": slug})
    counts = {r: 0 for r in VALID_REACTIONS}
    for row in rows.mappings():
        if row["reaction"] in counts:
            counts[row["reaction"]] = row["count"]
    return {"insightful": counts["insightful"], "hot": counts["hot"], "saved": counts["saved"]}


@router.post("/api/blog/{slug}/react")
@limiter.limit("10/minute")
async def react(slug: str, request: Request, payload: ReactionPayload, db: AsyncSession = Depends(get_db)):
    if payload.reaction not in VALID_REACTIONS:
        raise HTTPException(status_code=400, detail="Invalid reaction")
    client_ip = (request.client.host if request.client else None) or "0.0.0.0"
    ip_hash = _hash_ip(client_ip)
    # INSERT OR IGNORE — duplicates from same IP for same (slug, reaction) are silently ignored.
    await db.execute(text("""
        INSERT OR IGNORE INTO blog_reactions (post_slug, reaction, ip_hash)
        VALUES (:slug, :reaction, :ip_hash)
    """), {"slug": slug, "reaction": payload.reaction, "ip_hash": ip_hash})
    await db.commit()
    return {"ok": True}


# ── Comments ────────────────────────────────────────────────────────────────

class CommentPayload(BaseModel):
    name: str
    email: Optional[str] = None
    body: str


@router.get("/api/blog/{slug}/comments")
async def get_comments(slug: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT id, parent_id, name, body, is_team_reply, status, created_at
        FROM blog_comments
        WHERE post_slug = :slug AND status = 'approved'
        ORDER BY created_at ASC
    """), {"slug": slug})
    return [dict(r) for r in rows.mappings()]


@router.post("/api/blog/{slug}/comments")
@limiter.limit("5/hour")
async def post_comment(slug: str, request: Request, payload: CommentPayload, db: AsyncSession = Depends(get_db)):
    if not payload.name.strip() or not payload.body.strip():
        raise HTTPException(status_code=400, detail="Name and body are required")
    await db.execute(text("""
        INSERT INTO blog_comments (post_slug, name, email, body, status, is_team_reply)
        VALUES (:slug, :name, :email, :body, 'pending', 0)
    """), {
        "slug": slug,
        "name": payload.name.strip(),
        "email": payload.email,
        "body": payload.body.strip(),
    })
    await db.commit()
    return {"ok": True, "message": "Comment submitted for review"}


# ── Admin moderation ────────────────────────────────────────────────────────

@router.get("/api/admin/blog/comments")
async def admin_list_comments(admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT id, post_slug, parent_id, name, email, body, status, is_team_reply, created_at
        FROM blog_comments ORDER BY created_at DESC
    """))
    return [dict(r) for r in rows.mappings()]


@router.post("/api/admin/blog/comments/{comment_id}/approve")
async def approve_comment(comment_id: int, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE blog_comments SET status='approved' WHERE id=:id"), {"id": comment_id})
    await db.commit()
    return {"ok": True}


@router.post("/api/admin/blog/comments/{comment_id}/reject")
async def reject_comment(comment_id: int, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE blog_comments SET status='rejected' WHERE id=:id"), {"id": comment_id})
    await db.commit()
    return {"ok": True}


class ReplyPayload(BaseModel):
    body: str


@router.post("/api/admin/blog/comments/{comment_id}/reply")
async def reply_comment(comment_id: int, payload: ReplyPayload, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    row = await db.execute(text("SELECT post_slug FROM blog_comments WHERE id=:id"), {"id": comment_id})
    comment = row.mappings().first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.execute(text("""
        INSERT INTO blog_comments (post_slug, parent_id, name, body, status, is_team_reply)
        VALUES (:slug, :parent_id, 'ArthaBuild', :body, 'approved', 1)
    """), {"slug": comment["post_slug"], "parent_id": comment_id, "body": payload.body.strip()})
    await db.commit()
    return {"ok": True}


@router.delete("/api/admin/blog/comments/{comment_id}")
async def delete_comment(comment_id: int, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM blog_comments WHERE id=:id"), {"id": comment_id})
    await db.commit()
    return {"ok": True}
