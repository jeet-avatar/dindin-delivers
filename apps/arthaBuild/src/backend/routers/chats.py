"""
ArthaBuild Chat Sessions Router
================================
Provides CRUD for user-scoped chat sessions and their messages.

All endpoints require authentication (Depends(require_user)).
Users can only access their own chat sessions — isolation is enforced at query level.

Architecture layer: API (routers)
Phase: 9 — RBAC + Team Management + Chat Persistence
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, ChatSession, ChatMessage
from auth_utils import require_user

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.post("", status_code=201)
async def create_chat_session(
    body: dict,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session for the authenticated user."""
    title = body.get("title", "New Chat") if body else "New Chat"
    session = ChatSession(user_id=current_user.id, title=title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


@router.get("")
async def list_chat_sessions(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all chat sessions belonging to the authenticated user, newest first."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]


@router.get("/{session_id}/messages")
async def get_chat_messages(
    session_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all messages for a chat session. Returns 403 if not the owner."""
    # Verify ownership
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = msg_result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "intent": m.intent,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.patch("/{session_id}")
async def rename_chat_session(
    session_id: int,
    body: dict,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a chat session. Returns 403 if not the owner."""
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    new_title = body.get("title", session.title)
    session.title = new_title
    await db.commit()
    return {"id": session.id, "title": session.title}


@router.delete("/{session_id}")
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session and all its messages. Returns 403 if not the owner."""
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(session)
    await db.commit()
    return {"message": "deleted"}
