"""
Chat/Messaging Routes - Real-time communication between customers and drivers

Endpoints:
- POST /api/chat/send - Send a message
- GET /api/chat/messages/{order_id} - Get conversation messages
- POST /api/chat/read/{order_id} - Mark messages as read
- POST /api/chat/typing/{order_id} - Update typing indicator
- GET /api/chat/conversation/{order_id} - Get conversation info
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from jose import jwt, JWTError
import json
import os

from database import get_db
from models import (
    ChatConversation, ChatMessage, MessageSenderType,
    Order, Driver, OrderStatus, User
)

# SECURITY: Shared auth dependency for all chat endpoints
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)
_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
_ALGORITHM = "HS256"

async def _require_chat_auth(token: Optional[str] = Depends(_oauth2_scheme)):
    """SECURITY: All chat endpoints require authentication"""
    if not token or not _SECRET_KEY:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

router = APIRouter(prefix="/api/chat", tags=["Chat"], dependencies=[Depends(_require_chat_auth)])


# =========================================================================
# REQUEST/RESPONSE MODELS
# =========================================================================

class SendMessageRequest(BaseModel):
    order_id: int
    sender_type: str  # "customer" or "driver"
    sender_id: int
    sender_name: Optional[str] = None
    message: str
    message_type: Optional[str] = "text"  # text, image, location
    attachments: Optional[str] = None  # JSON string


class MessageResponse(BaseModel):
    id: int
    sender_type: str
    sender_id: int
    sender_name: Optional[str]
    message: str
    message_type: str
    attachments: Optional[str]
    is_read: bool
    is_delivered: bool
    created_at: str

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    customer_name: Optional[str]
    driver_id: Optional[int]
    driver_name: Optional[str]
    is_active: bool
    last_message_at: Optional[str]
    last_message_preview: Optional[str]
    customer_unread_count: int
    driver_unread_count: int
    customer_typing: bool
    driver_typing: bool


class TypingRequest(BaseModel):
    sender_type: str  # "customer" or "driver"
    sender_id: int
    is_typing: bool


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def get_or_create_conversation(db: Session, order_id: int) -> ChatConversation:
    """Get existing conversation or create new one for the order"""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.order_id == order_id
    ).first()

    if conversation:
        return conversation

    # Get order details
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Create new conversation
    conversation = ChatConversation(
        order_id=order_id,
        customer_id=order.customer_id or 0,
        customer_name=order.customer_name,
        driver_id=order.driver_id,
        driver_name=order.driver_name,
        is_active=True
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation


async def broadcast_message_via_websocket(message_data: dict):
    """Broadcast message to connected clients via WebSocket"""
    try:
        from websocket_server import manager

        order_id = message_data.get("order_id")
        sender_type = message_data.get("sender_type")

        # Determine recipient
        if sender_type == "customer":
            # Send to driver
            driver_id = message_data.get("driver_id")
            if driver_id:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "chat_message",
                        "data": message_data
                    }),
                    f"driver_{driver_id}"
                )
        else:
            # Send to customer
            customer_id = message_data.get("customer_id")
            if customer_id:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "chat_message",
                        "data": message_data
                    }),
                    f"customer_{customer_id}"
                )

        # Also broadcast to order topic for any listeners
        await manager.broadcast_to_topic(
            f"order:{order_id}",
            json.dumps({
                "type": "chat_message",
                "data": message_data
            })
        )
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")


async def broadcast_typing_indicator(order_id: int, sender_type: str, is_typing: bool, recipient_id: int):
    """Broadcast typing indicator to the other party"""
    try:
        from websocket_server import manager

        recipient_type = "customer" if sender_type == "driver" else "driver"

        await manager.send_personal_message(
            json.dumps({
                "type": "typing_indicator",
                "data": {
                    "order_id": order_id,
                    "sender_type": sender_type,
                    "is_typing": is_typing
                }
            }),
            f"{recipient_type}_{recipient_id}"
        )
    except Exception as e:
        print(f"WebSocket typing indicator error: {e}")


# =========================================================================
# API ENDPOINTS
# =========================================================================

@router.post("/send")
async def send_message(request: SendMessageRequest, db: Session = Depends(get_db)):
    """
    Send a chat message in an order conversation.
    Automatically creates conversation if it doesn't exist.
    Broadcasts message via WebSocket for real-time delivery.
    """
    # Get or create conversation
    conversation = get_or_create_conversation(db, request.order_id)

    # Determine sender type enum
    sender_type_enum = MessageSenderType.CUSTOMER if request.sender_type == "customer" else MessageSenderType.DRIVER

    # Create message
    message = ChatMessage(
        conversation_id=conversation.id,
        sender_type=sender_type_enum,
        sender_id=request.sender_id,
        sender_name=request.sender_name,
        message=request.message,
        message_type=request.message_type or "text",
        attachments=request.attachments,
        is_delivered=True,
        delivered_at=datetime.utcnow()
    )
    db.add(message)

    # Update conversation
    conversation.last_message_at = datetime.utcnow()
    conversation.last_message_preview = request.message[:100] if len(request.message) > 100 else request.message

    # Increment unread count for recipient
    if request.sender_type == "customer":
        conversation.driver_unread_count += 1
    else:
        conversation.customer_unread_count += 1

    # Clear typing indicator for sender
    if request.sender_type == "customer":
        conversation.customer_typing = False
    else:
        conversation.driver_typing = False

    db.commit()
    db.refresh(message)

    # Prepare response data
    message_data = {
        "id": message.id,
        "order_id": request.order_id,
        "conversation_id": conversation.id,
        "sender_type": request.sender_type,
        "sender_id": request.sender_id,
        "sender_name": request.sender_name,
        "message": request.message,
        "message_type": message.message_type,
        "attachments": request.attachments,
        "is_read": False,
        "is_delivered": True,
        "created_at": message.created_at.isoformat(),
        "customer_id": conversation.customer_id,
        "driver_id": conversation.driver_id
    }

    # Broadcast via WebSocket
    await broadcast_message_via_websocket(message_data)

    return {
        "success": True,
        "message": message_data
    }


@router.get("/messages/{order_id}")
async def get_messages(
    order_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get chat messages for an order conversation.
    Returns messages in chronological order (oldest first).
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.order_id == order_id
    ).first()

    if not conversation:
        return {
            "success": True,
            "conversation": None,
            "messages": [],
            "total": 0
        }

    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id
    ).order_by(ChatMessage.created_at.asc()).offset(offset).limit(limit).all()

    total = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id
    ).count()

    return {
        "success": True,
        "conversation": {
            "id": conversation.id,
            "order_id": conversation.order_id,
            "customer_id": conversation.customer_id,
            "customer_name": conversation.customer_name,
            "driver_id": conversation.driver_id,
            "driver_name": conversation.driver_name,
            "is_active": conversation.is_active,
            "customer_unread_count": conversation.customer_unread_count,
            "driver_unread_count": conversation.driver_unread_count,
            "customer_typing": conversation.customer_typing,
            "driver_typing": conversation.driver_typing
        },
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type.value,
                "sender_id": m.sender_id,
                "sender_name": m.sender_name,
                "message": m.message,
                "message_type": m.message_type,
                "attachments": m.attachments,
                "is_read": m.is_read,
                "is_delivered": m.is_delivered,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ],
        "total": total
    }


@router.post("/read/{order_id}")
async def mark_messages_read(
    order_id: int,
    reader_type: str = Query(..., description="customer or driver"),
    reader_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """
    Mark all messages as read for the specified reader.
    Resets unread count for the reader.
    Broadcasts read receipts via WebSocket.
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.order_id == order_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Determine which messages to mark as read
    if reader_type == "customer":
        # Customer reads driver messages
        sender_type = MessageSenderType.DRIVER
        conversation.customer_unread_count = 0
    else:
        # Driver reads customer messages
        sender_type = MessageSenderType.CUSTOMER
        conversation.driver_unread_count = 0

    # Mark unread messages as read
    now = datetime.utcnow()
    updated = db.query(ChatMessage).filter(
        and_(
            ChatMessage.conversation_id == conversation.id,
            ChatMessage.sender_type == sender_type,
            ChatMessage.is_read == False
        )
    ).update({
        "is_read": True,
        "read_at": now
    })

    db.commit()

    # Broadcast read receipt via WebSocket
    try:
        from websocket_server import manager

        # Notify the sender that their messages were read
        sender_client_type = "driver" if reader_type == "customer" else "customer"
        sender_id = conversation.driver_id if reader_type == "customer" else conversation.customer_id

        if sender_id:
            await manager.send_personal_message(
                json.dumps({
                    "type": "read_receipt",
                    "data": {
                        "order_id": order_id,
                        "reader_type": reader_type,
                        "reader_id": reader_id,
                        "read_at": now.isoformat(),
                        "messages_read": updated
                    }
                }),
                f"{sender_client_type}_{sender_id}"
            )
    except Exception as e:
        print(f"WebSocket read receipt error: {e}")

    return {
        "success": True,
        "messages_marked_read": updated
    }


@router.post("/typing/{order_id}")
async def update_typing_indicator(
    order_id: int,
    request: TypingRequest,
    db: Session = Depends(get_db)
):
    """
    Update typing indicator for a user.
    Broadcasts typing status via WebSocket for real-time display.
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.order_id == order_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Update typing status
    if request.sender_type == "customer":
        conversation.customer_typing = request.is_typing
        recipient_id = conversation.driver_id
    else:
        conversation.driver_typing = request.is_typing
        recipient_id = conversation.customer_id

    db.commit()

    # Broadcast typing indicator
    if recipient_id:
        await broadcast_typing_indicator(
            order_id=order_id,
            sender_type=request.sender_type,
            is_typing=request.is_typing,
            recipient_id=recipient_id
        )

    return {
        "success": True,
        "typing": request.is_typing
    }


@router.get("/conversation/{order_id}")
async def get_conversation(order_id: int, db: Session = Depends(get_db)):
    """
    Get conversation info for an order.
    Creates conversation if it doesn't exist (for orders with assigned drivers).
    """
    # Check if order exists
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get or create conversation
    conversation = db.query(ChatConversation).filter(
        ChatConversation.order_id == order_id
    ).first()

    # Only auto-create if driver is assigned
    if not conversation and order.driver_id:
        conversation = ChatConversation(
            order_id=order_id,
            customer_id=order.customer_id or 0,
            customer_name=order.customer_name,
            driver_id=order.driver_id,
            driver_name=order.driver_name,
            is_active=True
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    if not conversation:
        return {
            "success": True,
            "conversation": None,
            "message": "No driver assigned yet"
        }

    return {
        "success": True,
        "conversation": {
            "id": conversation.id,
            "order_id": conversation.order_id,
            "customer_id": conversation.customer_id,
            "customer_name": conversation.customer_name,
            "driver_id": conversation.driver_id,
            "driver_name": conversation.driver_name,
            "is_active": conversation.is_active,
            "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
            "last_message_preview": conversation.last_message_preview,
            "customer_unread_count": conversation.customer_unread_count,
            "driver_unread_count": conversation.driver_unread_count,
            "customer_typing": conversation.customer_typing,
            "driver_typing": conversation.driver_typing
        }
    }


@router.post("/conversation/{order_id}/close")
async def close_conversation(order_id: int, db: Session = Depends(get_db)):
    """
    Close/deactivate a conversation (typically when order is completed).
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.order_id == order_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.is_active = False
    conversation.customer_typing = False
    conversation.driver_typing = False
    db.commit()

    return {
        "success": True,
        "message": "Conversation closed"
    }


# =========================================================================
# DRIVER MESSAGES LIST (for Messages tab)
# =========================================================================

@router.get("/driver/{driver_id}/conversations")
async def get_driver_conversations(
    driver_id: int,
    active_only: bool = Query(True),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get list of conversations for a driver (for Messages tab).
    Returns conversations with unread counts and last message preview.
    """
    query = db.query(ChatConversation).filter(
        ChatConversation.driver_id == driver_id
    )

    if active_only:
        query = query.filter(ChatConversation.is_active == True)

    conversations = query.order_by(
        ChatConversation.last_message_at.desc().nullsfirst()
    ).limit(limit).all()

    return {
        "success": True,
        "conversations": [
            {
                "id": c.id,
                "order_id": c.order_id,
                "customer_id": c.customer_id,
                "customer_name": c.customer_name,
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "last_message_preview": c.last_message_preview,
                "unread_count": c.driver_unread_count,
                "customer_typing": c.customer_typing
            }
            for c in conversations
        ]
    }


@router.get("/customer/{customer_id}/conversations")
async def get_customer_conversations(
    customer_id: int,
    active_only: bool = Query(True),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get list of conversations for a customer.
    Returns conversations with unread counts and last message preview.
    """
    query = db.query(ChatConversation).filter(
        ChatConversation.customer_id == customer_id
    )

    if active_only:
        query = query.filter(ChatConversation.is_active == True)

    conversations = query.order_by(
        ChatConversation.last_message_at.desc().nullsfirst()
    ).limit(limit).all()

    return {
        "success": True,
        "conversations": [
            {
                "id": c.id,
                "order_id": c.order_id,
                "driver_id": c.driver_id,
                "driver_name": c.driver_name,
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "last_message_preview": c.last_message_preview,
                "unread_count": c.customer_unread_count,
                "driver_typing": c.driver_typing
            }
            for c in conversations
        ]
    }
