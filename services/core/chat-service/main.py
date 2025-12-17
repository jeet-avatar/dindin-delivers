"""
Dollor.ai - Chat Service
========================

MATCHMAKING PLATFORM - Communication Facilitator

This service enables direct communication between INDEPENDENT drivers
and customers. Dollor.ai facilitates messaging but does NOT:
- Monitor or control conversations (except for safety)
- Act as intermediary in disputes
- Direct driver actions through messaging

The chat is a tool for independent parties to coordinate.

Port: 8018
WebSocket: /ws/chat/{conversation_id}
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.ext.declarative import declarative_base
import enum

# Optional redis import
redis = None
REDIS_AVAILABLE = False
try:
    import redis.asyncio as _redis
    redis = _redis
    REDIS_AVAILABLE = True
except ImportError:
    pass

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "chat-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8018

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/2")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Chat settings
MAX_MESSAGE_LENGTH = 1000
MESSAGE_RETENTION_DAYS = 30
MAX_FILE_SIZE_MB = 10

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(SERVICE_NAME)

# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =============================================================================
# ENUMS
# =============================================================================

class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    LOCATION = "location"
    SYSTEM = "system"
    QUICK_REPLY = "quick_reply"

class ConversationType(str, enum.Enum):
    RIDE = "ride"
    DELIVERY = "delivery"
    SUPPORT = "support"

class ParticipantRole(str, enum.Enum):
    CUSTOMER = "customer"
    DRIVER = "driver"
    SUPPORT = "support"


class ConversationStatus(str, enum.Enum):
    """Status of a conversation"""
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


# =============================================================================
# DATABASE MODELS
# =============================================================================

class Conversation(Base):
    """Chat conversation between parties"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(50), unique=True, nullable=False, index=True)

    # Related entities
    ride_id = Column(String(50), nullable=True, index=True)
    order_id = Column(String(50), nullable=True, index=True)

    # Participants
    customer_id = Column(String(50), nullable=False, index=True)
    driver_id = Column(String(50), nullable=True, index=True)

    conversation_type = Column(String(20), default=ConversationType.RIDE.value)

    # Status
    is_active = Column(Boolean, default=True)
    customer_unread_count = Column(Integer, default=0)
    driver_unread_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime, nullable=True)

class Message(Base):
    """Individual chat message"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(50), unique=True, nullable=False, index=True)
    conversation_id = Column(String(50), nullable=False, index=True)

    # Sender
    sender_id = Column(String(50), nullable=False)
    sender_role = Column(String(20), nullable=False)  # customer, driver, support

    # Content
    message_type = Column(String(20), default=MessageType.TEXT.value)
    content = Column(Text, nullable=True)

    # For images/files
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True)

    # For location sharing
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Quick replies (for system messages)
    quick_replies = Column(Text, nullable=True)  # JSON array of options

    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

class QuickReplyTemplate(Base):
    """Pre-defined quick reply templates"""
    __tablename__ = "quick_reply_templates"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)  # arrival, delay, location, etc.
    role = Column(String(20), nullable=False)  # customer or driver
    text = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class StartConversationRequest(BaseModel):
    ride_id: Optional[str] = None
    order_id: Optional[str] = None
    customer_id: str
    driver_id: Optional[str] = None
    conversation_type: ConversationType = ConversationType.RIDE

class SendMessageRequest(BaseModel):
    conversation_id: str
    sender_id: str
    sender_role: ParticipantRole
    message_type: MessageType = MessageType.TEXT
    content: Optional[str] = None
    media_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MessageResponse(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    sender_role: str
    message_type: str
    content: Optional[str]
    media_url: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    is_read: bool
    created_at: str

class ConversationResponse(BaseModel):
    conversation_id: str
    ride_id: Optional[str]
    order_id: Optional[str]
    customer_id: str
    driver_id: Optional[str]
    conversation_type: str
    is_active: bool
    unread_count: int
    last_message: Optional[MessageResponse]
    created_at: str


# Model aliases for backward compatibility
MessageCreate = SendMessageRequest
ConversationCreate = StartConversationRequest


# =============================================================================
# CONNECTION MANAGER
# =============================================================================

class ChatConnectionManager:
    """Manages WebSocket connections for real-time chat"""

    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.redis_client = None

    async def connect_redis(self):
        if REDIS_AVAILABLE and redis and not self.redis_client:
            try:
                self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            except Exception:
                pass

    async def connect(self, websocket: WebSocket, conversation_id: str, user_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = {}
        self.active_connections[conversation_id][user_id] = websocket
        logger.info(f"Chat connected: {conversation_id} - {user_id}")

    def disconnect(self, conversation_id: str, user_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].pop(user_id, None)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
        logger.info(f"Chat disconnected: {conversation_id} - {user_id}")

    async def send_to_user(self, conversation_id: str, user_id: str, message: dict):
        if conversation_id in self.active_connections:
            ws = self.active_connections[conversation_id].get(user_id)
            if ws:
                await ws.send_json(message)

    async def broadcast_to_conversation(self, conversation_id: str, message: dict, exclude_user: str = None):
        if conversation_id in self.active_connections:
            for user_id, ws in self.active_connections[conversation_id].items():
                if user_id != exclude_user:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        logger.error(f"Error sending to {user_id}: {e}")

    async def publish_message(self, conversation_id: str, message: dict):
        """Publish to Redis for cross-instance communication"""
        if self.redis_client:
            await self.redis_client.publish(f"chat:{conversation_id}", json.dumps(message))

manager = ChatConnectionManager()

# =============================================================================
# QUICK REPLY TEMPLATES
# =============================================================================

DRIVER_QUICK_REPLIES = [
    {"category": "arrival", "text": "I'm on my way!"},
    {"category": "arrival", "text": "I'll be there in 5 minutes"},
    {"category": "arrival", "text": "I've arrived at the pickup location"},
    {"category": "location", "text": "Can you share your exact location?"},
    {"category": "delay", "text": "Traffic is heavy, might be a few minutes late"},
    {"category": "ready", "text": "I'm waiting outside"},
    {"category": "contact", "text": "Please call me if you can't find me"},
]

CUSTOMER_QUICK_REPLIES = [
    {"category": "ready", "text": "I'm coming out now"},
    {"category": "ready", "text": "I'll be there in 2 minutes"},
    {"category": "location", "text": "I'm at the main entrance"},
    {"category": "location", "text": "Look for me near the red door"},
    {"category": "change", "text": "Can you pick me up at a different spot?"},
    {"category": "delay", "text": "Running a bit late, please wait"},
    {"category": "thanks", "text": "Thanks! On my way down"},
]

# =============================================================================
# FASTAPI APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {SERVICE_NAME} v{SERVICE_VERSION} on port {SERVICE_PORT}")
    Base.metadata.create_all(bind=engine)
    await manager.connect_redis()

    # Initialize quick reply templates
    db = SessionLocal()
    try:
        existing = db.query(QuickReplyTemplate).count()
        if existing == 0:
            for reply in DRIVER_QUICK_REPLIES:
                db.add(QuickReplyTemplate(
                    category=reply["category"],
                    role="driver",
                    text=reply["text"]
                ))
            for reply in CUSTOMER_QUICK_REPLIES:
                db.add(QuickReplyTemplate(
                    category=reply["category"],
                    role="customer",
                    text=reply["text"]
                ))
            db.commit()
            logger.info("Initialized quick reply templates")
    finally:
        db.close()

    yield

    if manager.redis_client:
        await manager.redis_client.close()
    logger.info(f"Shutting down {SERVICE_NAME}")

app = FastAPI(
    title="Dollor.ai Chat Service",
    description="Real-time messaging between independent drivers and customers",
    version=SERVICE_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

# =============================================================================
# CONVERSATION ENDPOINTS
# =============================================================================

@app.post("/api/chat/conversations", response_model=ConversationResponse)
async def start_conversation(
    request: StartConversationRequest,
    db: Session = Depends(get_db)
):
    """Start a new conversation for a ride or delivery"""

    # Check for existing conversation
    query = db.query(Conversation)
    if request.ride_id:
        query = query.filter(Conversation.ride_id == request.ride_id)
    elif request.order_id:
        query = query.filter(Conversation.order_id == request.order_id)

    existing = query.first()
    if existing:
        return ConversationResponse(
            conversation_id=existing.conversation_id,
            ride_id=existing.ride_id,
            order_id=existing.order_id,
            customer_id=existing.customer_id,
            driver_id=existing.driver_id,
            conversation_type=existing.conversation_type,
            is_active=existing.is_active,
            unread_count=existing.customer_unread_count + existing.driver_unread_count,
            last_message=None,
            created_at=existing.created_at.isoformat()
        )

    # Create new conversation
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"

    conversation = Conversation(
        conversation_id=conversation_id,
        ride_id=request.ride_id,
        order_id=request.order_id,
        customer_id=request.customer_id,
        driver_id=request.driver_id,
        conversation_type=request.conversation_type.value
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # Send system message
    system_msg = Message(
        message_id=f"msg_{uuid.uuid4().hex[:12]}",
        conversation_id=conversation_id,
        sender_id="system",
        sender_role="system",
        message_type=MessageType.SYSTEM.value,
        content="Chat started. You can now communicate with each other for pickup coordination."
    )
    db.add(system_msg)
    db.commit()

    return ConversationResponse(
        conversation_id=conversation.conversation_id,
        ride_id=conversation.ride_id,
        order_id=conversation.order_id,
        customer_id=conversation.customer_id,
        driver_id=conversation.driver_id,
        conversation_type=conversation.conversation_type,
        is_active=conversation.is_active,
        unread_count=0,
        last_message=None,
        created_at=conversation.created_at.isoformat()
    )

@app.get("/api/chat/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """Get conversation details"""
    conversation = db.query(Conversation).filter(
        Conversation.conversation_id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get last message
    last_message = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    ).order_by(Message.created_at.desc()).first()

    last_msg_response = None
    if last_message:
        last_msg_response = MessageResponse(
            message_id=last_message.message_id,
            conversation_id=last_message.conversation_id,
            sender_id=last_message.sender_id,
            sender_role=last_message.sender_role,
            message_type=last_message.message_type,
            content=last_message.content,
            media_url=last_message.media_url,
            latitude=last_message.latitude,
            longitude=last_message.longitude,
            is_read=last_message.is_read,
            created_at=last_message.created_at.isoformat()
        )

    return {
        "conversation_id": conversation.conversation_id,
        "ride_id": conversation.ride_id,
        "order_id": conversation.order_id,
        "customer_id": conversation.customer_id,
        "driver_id": conversation.driver_id,
        "is_active": conversation.is_active,
        "last_message": last_msg_response,
        "created_at": conversation.created_at.isoformat()
    }

# =============================================================================
# MESSAGE ENDPOINTS
# =============================================================================

@app.post("/api/chat/messages", response_model=MessageResponse)
async def send_message(
    request: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """Send a message in a conversation"""

    # Verify conversation exists
    conversation = db.query(Conversation).filter(
        Conversation.conversation_id == request.conversation_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not conversation.is_active:
        raise HTTPException(status_code=400, detail="Conversation is closed")

    # Validate content length
    if request.content and len(request.content) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Message too long (max {MAX_MESSAGE_LENGTH} chars)")

    # Create message
    message_id = f"msg_{uuid.uuid4().hex[:12]}"

    message = Message(
        message_id=message_id,
        conversation_id=request.conversation_id,
        sender_id=request.sender_id,
        sender_role=request.sender_role.value,
        message_type=request.message_type.value,
        content=request.content,
        media_url=request.media_url,
        latitude=request.latitude,
        longitude=request.longitude
    )

    db.add(message)

    # Update conversation
    conversation.last_message_at = datetime.utcnow()
    if request.sender_role == ParticipantRole.CUSTOMER:
        conversation.driver_unread_count += 1
    else:
        conversation.customer_unread_count += 1

    db.commit()
    db.refresh(message)

    # Broadcast to WebSocket clients
    msg_data = {
        "type": "new_message",
        "message": {
            "message_id": message.message_id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "sender_role": message.sender_role,
            "message_type": message.message_type,
            "content": message.content,
            "media_url": message.media_url,
            "latitude": message.latitude,
            "longitude": message.longitude,
            "created_at": message.created_at.isoformat()
        }
    }

    await manager.broadcast_to_conversation(
        request.conversation_id,
        msg_data,
        exclude_user=request.sender_id
    )

    return MessageResponse(
        message_id=message.message_id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_role=message.sender_role,
        message_type=message.message_type,
        content=message.content,
        media_url=message.media_url,
        latitude=message.latitude,
        longitude=message.longitude,
        is_read=message.is_read,
        created_at=message.created_at.isoformat()
    )

@app.get("/api/chat/messages/{conversation_id}")
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=100),
    before: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get messages in a conversation"""

    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    )

    if before:
        query = query.filter(Message.message_id < before)

    messages = query.order_by(Message.created_at.desc()).limit(limit).all()

    return {
        "conversation_id": conversation_id,
        "messages": [
            {
                "message_id": m.message_id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "message_type": m.message_type,
                "content": m.content,
                "media_url": m.media_url,
                "latitude": m.latitude,
                "longitude": m.longitude,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat()
            }
            for m in reversed(messages)
        ],
        "has_more": len(messages) == limit
    }

@app.post("/api/chat/messages/{conversation_id}/read")
async def mark_messages_read(
    conversation_id: str,
    user_id: str = Query(...),
    user_role: ParticipantRole = Query(...),
    db: Session = Depends(get_db)
):
    """Mark all messages as read for a user"""

    # Update unread messages
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
        Message.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })

    # Reset unread count
    conversation = db.query(Conversation).filter(
        Conversation.conversation_id == conversation_id
    ).first()

    if conversation:
        if user_role == ParticipantRole.CUSTOMER:
            conversation.customer_unread_count = 0
        else:
            conversation.driver_unread_count = 0

    db.commit()

    # Broadcast read receipts
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "messages_read",
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"status": "ok", "message": "Messages marked as read"}

# =============================================================================
# QUICK REPLIES
# =============================================================================

@app.get("/api/chat/quick-replies")
async def get_quick_replies(
    role: ParticipantRole = Query(...),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get quick reply templates"""

    query = db.query(QuickReplyTemplate).filter(
        QuickReplyTemplate.role == role.value,
        QuickReplyTemplate.is_active == True
    )

    if category:
        query = query.filter(QuickReplyTemplate.category == category)

    templates = query.all()

    return {
        "role": role.value,
        "replies": [
            {"category": t.category, "text": t.text}
            for t in templates
        ]
    }

# =============================================================================
# LOCATION SHARING
# =============================================================================

@app.post("/api/chat/share-location")
async def share_location(
    conversation_id: str,
    sender_id: str,
    sender_role: ParticipantRole,
    latitude: float,
    longitude: float,
    db: Session = Depends(get_db)
):
    """Share current location in chat"""

    message_id = f"msg_{uuid.uuid4().hex[:12]}"

    message = Message(
        message_id=message_id,
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_role=sender_role.value,
        message_type=MessageType.LOCATION.value,
        content="📍 Shared location",
        latitude=latitude,
        longitude=longitude
    )

    db.add(message)
    db.commit()

    # Broadcast
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "location_shared",
        "message_id": message_id,
        "sender_id": sender_id,
        "sender_role": sender_role.value,
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"status": "ok", "message_id": message_id}

# =============================================================================
# WEBSOCKET ENDPOINT
# =============================================================================

@app.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: str,
    user_id: str = Query(...)
):
    """Real-time WebSocket for chat messages"""

    await manager.connect(websocket, conversation_id, user_id)

    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })

        while True:
            data = await websocket.receive_json()

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

            elif data.get("type") == "typing":
                # Broadcast typing indicator
                await manager.broadcast_to_conversation(
                    conversation_id,
                    {
                        "type": "typing",
                        "user_id": user_id,
                        "is_typing": data.get("is_typing", True)
                    },
                    exclude_user=user_id
                )

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(conversation_id, user_id)

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
