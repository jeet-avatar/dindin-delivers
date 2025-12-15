"""
EatFair P2P - Real-time Event & Notification System
AI Employee: Phoenix - Notification Ninja

Features:
1. WebSocket for instant updates
2. Push notifications (Firebase Cloud Messaging)
3. Email notifications (SendGrid/AWS SES)
4. SMS notifications (Twilio)
5. Event-driven architecture
6. Instant menu/promo sync to customer apps
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Set
from pydantic import BaseModel
import json
import uuid
import asyncio
import os

from database import get_db
from models import Vendor, Order, OrderStatus
from models_extended import (
    RealTimeEvent, Communication, CommunicationChannel,
    CommunicationStatus, RecipientType, Customer
)

router = APIRouter(prefix="/api/realtime", tags=["realtime"])

# ==================== AI EMPLOYEE ====================

AI_EMPLOYEES = {
    "NOTIFICATION_NINJA": {
        "id": "AI_EMP_008",
        "name": "Phoenix",
        "role": "Notification Ninja",
        "description": "Push, email, SMS at the right moments"
    }
}


# ==================== WEBSOCKET CONNECTION MANAGER ====================

class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates

    Connection Types:
    - customer_{customer_id}: Individual customer app
    - vendor_{vendor_id}: Restaurant app
    - driver_{driver_id}: Driver app
    - admin: Admin dashboard
    """

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.connection_info: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket, client_type: str, client_id: str):
        await websocket.accept()
        key = f"{client_type}_{client_id}"

        if key not in self.active_connections:
            self.active_connections[key] = set()

        self.active_connections[key].add(websocket)
        self.connection_info[websocket] = {
            "type": client_type,
            "id": client_id,
            "connected_at": datetime.now().isoformat()
        }

        print(f"[Phoenix] 🔌 New connection: {key}")

    def disconnect(self, websocket: WebSocket):
        info = self.connection_info.get(websocket)
        if info:
            key = f"{info['type']}_{info['id']}"
            if key in self.active_connections:
                self.active_connections[key].discard(websocket)
                if not self.active_connections[key]:
                    del self.active_connections[key]
            del self.connection_info[websocket]
            print(f"[Phoenix] ❌ Disconnected: {key}")

    async def send_personal(self, client_type: str, client_id: str, message: Dict):
        """Send to specific client"""
        key = f"{client_type}_{client_id}"
        if key in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[key]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)

            # Clean up disconnected
            for conn in disconnected:
                self.disconnect(conn)

    async def send_to_vendor_customers(self, vendor_id: int, message: Dict):
        """Send to all customers who have ordered from this vendor"""
        # In production, maintain a mapping of vendor -> customers
        # For now, broadcast to all customers
        await self.broadcast_to_type("customer", message)

    async def broadcast_to_type(self, client_type: str, message: Dict):
        """Broadcast to all connections of a type"""
        keys_to_send = [k for k in self.active_connections.keys() if k.startswith(f"{client_type}_")]
        for key in keys_to_send:
            for connection in self.active_connections.get(key, set()):
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def broadcast_all(self, message: Dict):
        """Broadcast to all connected clients"""
        for connections in self.active_connections.values():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except:
                    pass

    def get_connection_count(self) -> Dict:
        """Get count of connections by type"""
        counts = {"customer": 0, "vendor": 0, "driver": 0, "admin": 0}
        for key in self.active_connections:
            client_type = key.split("_")[0]
            if client_type in counts:
                counts[client_type] += len(self.active_connections[key])
        return counts


# Global connection manager
manager = ConnectionManager()


# ==================== WEBSOCKET ENDPOINTS ====================

@router.websocket("/ws/{client_type}/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_type: str,
    client_id: str
):
    """
    WebSocket connection for real-time updates

    Client Types:
    - customer: Customer mobile app
    - vendor: Restaurant mobile app / dashboard
    - driver: Driver mobile app
    - admin: Admin dashboard

    Messages sent:
    - menu:updated - Menu item changed
    - promo:new - New promotion available
    - promo:updated - Promotion changed
    - order:new - New order (for vendor/driver)
    - order:status - Order status changed
    - restaurant:new - New restaurant available
    """
    await manager.connect(websocket, client_type, client_id)

    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": f"Welcome! Phoenix is watching for updates.",
            "client_type": client_type,
            "client_id": client_id,
            "timestamp": datetime.now().isoformat()
        })

        # Keep connection alive and listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle client messages (ping, subscribe, etc.)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})

                elif message.get("type") == "subscribe":
                    # Handle subscription to specific topics
                    pass

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)


# ==================== REQUEST MODELS ====================

class PublishEventRequest(BaseModel):
    event_type: str
    vendor_id: Optional[int] = None
    target_type: str = "all_customers"  # all_customers, vendor_customers, specific_user
    target_ids: Optional[List[int]] = None
    payload: Dict
    send_push: bool = False
    push_title: Optional[str] = None
    push_body: Optional[str] = None


class SendNotificationRequest(BaseModel):
    recipient_type: str  # customer, vendor, driver
    recipient_id: int
    channel: str  # push, email, sms, in_app
    title: Optional[str] = None
    body: str
    data: Optional[Dict] = None


# ==================== PUBLISH EVENT ====================

@router.post("/publish")
async def publish_event(
    request: PublishEventRequest,
    db: Session = Depends(get_db)
):
    """
    Publish a real-time event
    AI Employee: Phoenix

    This:
    1. Stores event in database
    2. Broadcasts to connected WebSocket clients
    3. Optionally sends push notifications
    """
    ai_employee = AI_EMPLOYEES["NOTIFICATION_NINJA"]

    # Create event record
    event = RealTimeEvent(
        event_id=f"evt_{uuid.uuid4().hex}",
        event_type=request.event_type,
        vendor_id=request.vendor_id,
        target_type=request.target_type,
        target_ids=request.target_ids,
        payload=request.payload,
        send_push=request.send_push,
        push_title=request.push_title,
        push_body=request.push_body,
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"]
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    # Prepare WebSocket message
    ws_message = {
        "type": request.event_type,
        "event_id": event.event_id,
        "vendor_id": request.vendor_id,
        "payload": request.payload,
        "timestamp": datetime.now().isoformat()
    }

    # Broadcast based on target type
    if request.target_type == "all_customers":
        await manager.broadcast_to_type("customer", ws_message)
    elif request.target_type == "vendor_customers" and request.vendor_id:
        await manager.send_to_vendor_customers(request.vendor_id, ws_message)
    elif request.target_type == "specific_user" and request.target_ids:
        for user_id in request.target_ids:
            await manager.send_personal("customer", str(user_id), ws_message)

    # Also send to vendor if vendor-related
    if request.vendor_id:
        await manager.send_personal("vendor", str(request.vendor_id), ws_message)

    # Send push notifications if requested
    push_results = None
    if request.send_push and request.push_title and request.push_body:
        push_results = await send_push_notifications(
            event.id,
            request.target_type,
            request.vendor_id,
            request.target_ids,
            request.push_title,
            request.push_body,
            request.payload,
            db
        )

        # Update event with push results
        event.push_sent = True
        event.push_sent_at = datetime.now()
        event.push_success_count = push_results.get("success", 0)
        event.push_failure_count = push_results.get("failure", 0)
        event.processed = True
        event.processed_at = datetime.now()
        db.commit()

    return {
        "success": True,
        "event_id": event.event_id,
        "event_type": request.event_type,
        "processed_by": ai_employee["name"],
        "websocket_broadcast": True,
        "push_notifications": push_results,
        "connections": manager.get_connection_count()
    }


# ==================== PUSH NOTIFICATIONS ====================

async def send_push_notifications(
    event_id: int,
    target_type: str,
    vendor_id: Optional[int],
    target_ids: Optional[List[int]],
    title: str,
    body: str,
    data: Dict,
    db: Session
) -> Dict:
    """
    Send push notifications via Firebase Cloud Messaging
    AI Employee: Phoenix
    """
    # In production, integrate with Firebase Admin SDK
    # For now, return mock results

    fcm_server_key = os.getenv("FCM_SERVER_KEY")

    if not fcm_server_key:
        # Mock response for development
        return {
            "success": 10,
            "failure": 0,
            "message": "Push notifications simulated (FCM not configured)"
        }

    # Get push tokens based on target
    tokens = []

    if target_type == "all_customers":
        customers = db.query(Customer).filter(
            Customer.push_token.isnot(None),
            Customer.is_active == True
        ).all()
        tokens = [c.push_token for c in customers]

    elif target_type == "vendor_customers" and vendor_id:
        # Get customers who have ordered from this vendor
        from models import Order
        customer_ids = db.query(Order.customer_id).filter(
            Order.vendor_id == vendor_id,
            Order.customer_id.isnot(None)
        ).distinct().all()
        customer_ids = [c[0] for c in customer_ids]

        customers = db.query(Customer).filter(
            Customer.id.in_(customer_ids),
            Customer.push_token.isnot(None)
        ).all()
        tokens = [c.push_token for c in customers]

    elif target_type == "specific_user" and target_ids:
        customers = db.query(Customer).filter(
            Customer.id.in_(target_ids),
            Customer.push_token.isnot(None)
        ).all()
        tokens = [c.push_token for c in customers]

    # Send to FCM (mock for now)
    success_count = len(tokens)
    failure_count = 0

    # In production:
    # import firebase_admin
    # from firebase_admin import messaging
    #
    # message = messaging.MulticastMessage(
    #     notification=messaging.Notification(title=title, body=body),
    #     data=data,
    #     tokens=tokens
    # )
    # response = messaging.send_multicast(message)
    # success_count = response.success_count
    # failure_count = response.failure_count

    return {
        "success": success_count,
        "failure": failure_count,
        "total_tokens": len(tokens)
    }


# ==================== SEND NOTIFICATION ====================

@router.post("/notify")
async def send_notification(
    request: SendNotificationRequest,
    db: Session = Depends(get_db)
):
    """
    Send a notification to a specific user
    AI Employee: Phoenix

    Channels:
    - push: Firebase Cloud Messaging
    - email: SendGrid/AWS SES
    - sms: Twilio
    - in_app: Store for later retrieval
    """
    ai_employee = AI_EMPLOYEES["NOTIFICATION_NINJA"]

    # Create communication record
    comm = Communication(
        communication_id=f"comm_{uuid.uuid4().hex}",
        recipient_type=RecipientType(request.recipient_type),
        recipient_id=request.recipient_id,
        channel=CommunicationChannel(request.channel),
        title=request.title,
        body=request.body,
        data=request.data,
        status=CommunicationStatus.PENDING,
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"]
    )

    db.add(comm)
    db.commit()
    db.refresh(comm)

    # Send based on channel
    result = None
    if request.channel == "push":
        result = await send_single_push(comm, db)
    elif request.channel == "email":
        result = await send_email(comm, db)
    elif request.channel == "sms":
        result = await send_sms(comm, db)
    elif request.channel == "in_app":
        # Just store, will be retrieved by app
        comm.status = CommunicationStatus.DELIVERED
        comm.delivered_at = datetime.now()
        result = {"status": "stored"}

    db.commit()

    return {
        "success": True,
        "communication_id": comm.communication_id,
        "channel": request.channel,
        "status": comm.status.value,
        "processed_by": ai_employee["name"],
        "result": result
    }


async def send_single_push(comm: Communication, db: Session) -> Dict:
    """Send push notification to single user"""
    # Get recipient's push token
    token = None

    if comm.recipient_type == RecipientType.CUSTOMER:
        customer = db.query(Customer).filter(Customer.id == comm.recipient_id).first()
        if customer:
            token = customer.push_token

    elif comm.recipient_type == RecipientType.VENDOR:
        vendor = db.query(Vendor).filter(Vendor.id == comm.recipient_id).first()
        if vendor:
            token = vendor.push_token

    if not token:
        comm.status = CommunicationStatus.FAILED
        comm.failure_reason = "No push token found"
        return {"status": "failed", "reason": "No push token"}

    # Send via FCM (mock for now)
    comm.status = CommunicationStatus.SENT
    comm.sent_at = datetime.now()

    return {"status": "sent", "token": token[:20] + "..."}


async def send_email(comm: Communication, db: Session) -> Dict:
    """Send email notification"""
    # In production, integrate with SendGrid or AWS SES

    comm.status = CommunicationStatus.SENT
    comm.sent_at = datetime.now()

    return {"status": "sent", "provider": "mock"}


async def send_sms(comm: Communication, db: Session) -> Dict:
    """Send SMS notification via Twilio"""
    # In production, integrate with Twilio

    comm.status = CommunicationStatus.SENT
    comm.sent_at = datetime.now()

    return {"status": "sent", "provider": "mock"}


# ==================== EVENT TRIGGERS ====================

async def trigger_menu_update(vendor_id: int, item_id: int, action: str, db: Session):
    """
    Trigger when menu item is updated
    Called from menu management API
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        return

    event_request = PublishEventRequest(
        event_type="menu:updated",
        vendor_id=vendor_id,
        target_type="vendor_customers",
        payload={
            "action": action,  # created, updated, deleted
            "item_id": item_id,
            "restaurant_name": vendor.restaurant_name
        },
        send_push=False  # Don't spam customers for menu updates
    )

    await publish_event(event_request, db)


async def trigger_order_status(order_id: int, new_status: str, db: Session):
    """
    Trigger when order status changes
    Called from order flow API
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return

    ai_employee = AI_EMPLOYEES["NOTIFICATION_NINJA"]

    # Determine notification based on status
    push_messages = {
        "confirmed": ("Order Confirmed! 🎉", f"Your order #{order.order_number} has been confirmed"),
        "preparing": ("Being Prepared 👨‍🍳", f"Your order #{order.order_number} is being prepared"),
        "out_for_delivery": ("On the Way! 🚗", f"Your order #{order.order_number} is out for delivery"),
        "delivered": ("Delivered! 📦", f"Your order #{order.order_number} has been delivered. Enjoy!")
    }

    # Send to customer
    if order.customer_id:
        # WebSocket update
        await manager.send_personal("customer", str(order.customer_id), {
            "type": "order:status",
            "order_id": order.id,
            "order_number": order.order_number,
            "status": new_status,
            "timestamp": datetime.now().isoformat()
        })

        # Push notification
        if new_status in push_messages:
            title, body = push_messages[new_status]
            comm = Communication(
                communication_id=f"comm_{uuid.uuid4().hex}",
                recipient_type=RecipientType.CUSTOMER,
                recipient_id=order.customer_id,
                channel=CommunicationChannel.PUSH,
                title=title,
                body=body,
                order_id=order.id,
                created_by_ai=ai_employee["id"],
                created_by_ai_name=ai_employee["name"]
            )
            db.add(comm)
            db.commit()

    # Send to vendor
    await manager.send_personal("vendor", str(order.vendor_id), {
        "type": "order:status",
        "order_id": order.id,
        "order_number": order.order_number,
        "status": new_status,
        "timestamp": datetime.now().isoformat()
    })

    # Send to driver if assigned
    if order.driver_id:
        await manager.send_personal("driver", str(order.driver_id), {
            "type": "order:status",
            "order_id": order.id,
            "order_number": order.order_number,
            "status": new_status,
            "timestamp": datetime.now().isoformat()
        })


async def trigger_new_order(order_id: int, db: Session):
    """
    Trigger when new order is created
    Notifies vendor to accept
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return

    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()

    ai_employee = AI_EMPLOYEES["NOTIFICATION_NINJA"]

    # WebSocket to vendor
    await manager.send_personal("vendor", str(order.vendor_id), {
        "type": "order:new",
        "order_id": order.id,
        "order_number": order.order_number,
        "total": order.total_amount,
        "items_count": len(json.loads(order.items)) if order.items else 0,
        "timestamp": datetime.now().isoformat()
    })

    # Push notification to vendor
    if vendor and vendor.push_token:
        comm = Communication(
            communication_id=f"comm_{uuid.uuid4().hex}",
            recipient_type=RecipientType.VENDOR,
            recipient_id=order.vendor_id,
            channel=CommunicationChannel.PUSH,
            title="New Order! 🔔",
            body=f"Order #{order.order_number} - ${order.total_amount:.2f}",
            order_id=order.id,
            vendor_id=order.vendor_id,
            created_by_ai=ai_employee["id"],
            created_by_ai_name=ai_employee["name"]
        )
        db.add(comm)
        db.commit()


# ==================== STATUS & STATS ====================

@router.get("/status")
async def get_realtime_status():
    """Get current WebSocket connection status"""
    return {
        "success": True,
        "connections": manager.get_connection_count(),
        "total_connections": sum(manager.get_connection_count().values()),
        "status": "online"
    }


@router.get("/events")
async def get_recent_events(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get recent events"""
    events = db.query(RealTimeEvent).order_by(
        RealTimeEvent.created_at.desc()
    ).limit(limit).all()

    return {
        "success": True,
        "events": [{
            "event_id": e.event_id,
            "event_type": e.event_type,
            "vendor_id": e.vendor_id,
            "target_type": e.target_type,
            "payload": e.payload,
            "push_sent": e.push_sent,
            "push_success_count": e.push_success_count,
            "created_at": e.created_at.isoformat()
        } for e in events]
    }


@router.get("/communications/{recipient_type}/{recipient_id}")
async def get_communications(
    recipient_type: str,
    recipient_id: int,
    unread_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get communications for a specific user"""
    query = db.query(Communication).filter(
        Communication.recipient_type == RecipientType(recipient_type),
        Communication.recipient_id == recipient_id
    )

    if unread_only:
        query = query.filter(Communication.read_at.is_(None))

    comms = query.order_by(Communication.created_at.desc()).limit(100).all()

    return {
        "success": True,
        "communications": [{
            "id": c.id,
            "communication_id": c.communication_id,
            "channel": c.channel.value,
            "title": c.title,
            "body": c.body,
            "data": c.data,
            "status": c.status.value,
            "read_at": c.read_at.isoformat() if c.read_at else None,
            "created_at": c.created_at.isoformat()
        } for c in comms],
        "unread_count": len([c for c in comms if not c.read_at])
    }


@router.post("/communications/{communication_id}/read")
async def mark_as_read(
    communication_id: str,
    db: Session = Depends(get_db)
):
    """Mark a communication as read"""
    comm = db.query(Communication).filter(
        Communication.communication_id == communication_id
    ).first()

    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")

    comm.read_at = datetime.now()
    comm.status = CommunicationStatus.READ
    db.commit()

    return {"success": True, "message": "Marked as read"}
