"""
Dollor.ai - Notification Service
================================

Microservice handling all notifications for the platform:
- Email (transactional, marketing)
- Push (Firebase FCM, Apple APNs)
- SMS (Twilio)
- In-app notifications

Port: 8009
Error Prefix: NTF
"""

import os
import sys
import smtplib
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    NotificationErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "notification-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8009

# Email Config
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@dollor.ai")
FROM_NAME = os.getenv("FROM_NAME", "Dollor.ai")

# Push Config
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
APNS_KEY_PATH = os.getenv("APNS_KEY_PATH", "")

# SMS Config (Twilio)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# =============================================================================
# DATABASE SETUP
# =============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# ENUMS & MODELS
# =============================================================================

class NotificationType(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"


class NotificationStatus(str, Enum):
    """Status of a notification"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"


class NotificationChannel(str, Enum):
    """Notification delivery channel"""
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"
    ALL = "all"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    template: str  # Template name
    data: Dict[str, Any]  # Template variables
    priority: NotificationPriority = NotificationPriority.NORMAL


class PushRequest(BaseModel):
    user_id: Optional[int] = None
    driver_id: Optional[int] = None
    vendor_id: Optional[int] = None  # For restaurant push notifications
    fcm_token: Optional[str] = None
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    priority: NotificationPriority = NotificationPriority.NORMAL


class SMSRequest(BaseModel):
    phone_number: str
    message: str
    priority: NotificationPriority = NotificationPriority.NORMAL


class InAppNotificationRequest(BaseModel):
    user_id: int
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    action_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class BulkNotificationRequest(BaseModel):
    notification_type: NotificationType
    recipient_ids: List[int]
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None


# Vendor/Driver specific
class VendorApprovalEmail(BaseModel):
    to_email: EmailStr
    restaurant_name: str
    contact_name: str


class VendorRegistrationEmail(BaseModel):
    to_email: EmailStr
    restaurant_name: str
    contact_name: str
    vendor_id: str


class DriverApprovalEmail(BaseModel):
    to_email: EmailStr
    driver_name: str
    driver_code: str


class DriverRegistrationEmail(BaseModel):
    to_email: EmailStr
    driver_name: str
    driver_code: str


class OrderNotification(BaseModel):
    order_id: int
    notification_type: str  # new_order, order_ready, order_picked_up, order_delivered
    recipient_type: str  # customer, driver, restaurant


class NotificationCreate(BaseModel):
    """Model for creating a generic notification"""
    user_id: Optional[int] = None
    driver_id: Optional[int] = None
    vendor_id: Optional[int] = None
    notification_type: NotificationType
    channel: NotificationChannel = NotificationChannel.ALL
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    priority: NotificationPriority = NotificationPriority.NORMAL


class NotificationResponse(BaseModel):
    """Model for notification response"""
    id: int
    notification_type: str
    channel: str
    title: str
    message: str
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# EMAIL TEMPLATES
# =============================================================================

EMAIL_TEMPLATES = {
    "vendor_approval": {
        "subject": "Congratulations! {restaurant_name} is Now Live on Dollor.ai",
        "template": "vendor_approval"
    },
    "vendor_registration": {
        "subject": "Application Received - {restaurant_name} | Dollor.ai",
        "template": "vendor_registration"
    },
    "driver_approval": {
        "subject": "You're Approved! Start Delivering with Dollor.ai",
        "template": "driver_approval"
    },
    "driver_registration": {
        "subject": "Application Received - Driver {driver_code} | Dollor.ai",
        "template": "driver_registration"
    },
    "order_confirmation": {
        "subject": "Order #{order_id} Confirmed",
        "template": "order_confirmation"
    },
    "order_ready": {
        "subject": "Your Order is Ready for Pickup!",
        "template": "order_ready"
    },
    "order_delivered": {
        "subject": "Order #{order_id} Delivered - Rate Your Experience",
        "template": "order_delivered"
    },
    "password_reset": {
        "subject": "Reset Your Dollor.ai Password",
        "template": "password_reset"
    }
}


# =============================================================================
# EMAIL SERVICE
# =============================================================================

class EmailService:
    def __init__(self, logger):
        self.logger = logger
        self.smtp_configured = bool(SMTP_USER and SMTP_PASSWORD)

    def send_email(self, to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
        """Send an email using SMTP"""
        if not self.smtp_configured:
            self.logger.info("Email logged (SMTP not configured)", to=to_email, subject=subject)
            return True  # Dev mode

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
            msg["To"] = to_email

            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(FROM_EMAIL, to_email, msg.as_string())

            self.logger.info("Email sent", to=to_email, subject=subject)
            return True

        except Exception as e:
            self.logger.error("Email send failed", to=to_email, error=str(e))
            return False

    def send_vendor_approval(self, to_email: str, restaurant_name: str, contact_name: str) -> bool:
        """Send vendor approval email"""
        subject = f"Congratulations! {restaurant_name} is Now Live on Dollor.ai"
        html_body = self._render_vendor_approval_template(restaurant_name, contact_name)
        text_body = f"Welcome {contact_name}! {restaurant_name} is now live on Dollor.ai."
        return self.send_email(to_email, subject, html_body, text_body)

    def send_vendor_registration(self, to_email: str, restaurant_name: str, contact_name: str, vendor_id: str) -> bool:
        """Send vendor registration confirmation"""
        subject = f"Application Received - {restaurant_name} | Dollor.ai"
        html_body = self._render_vendor_registration_template(restaurant_name, contact_name, vendor_id)
        text_body = f"Thank you {contact_name}! We received your application for {restaurant_name}. Application ID: {vendor_id}"
        return self.send_email(to_email, subject, html_body, text_body)

    def send_driver_approval(self, to_email: str, driver_name: str, driver_code: str) -> bool:
        """Send driver approval email"""
        subject = "You're Approved! Start Delivering with Dollor.ai"
        html_body = self._render_driver_approval_template(driver_name, driver_code)
        text_body = f"Welcome {driver_name}! You're approved. Your driver code: {driver_code}"
        return self.send_email(to_email, subject, html_body, text_body)

    def send_driver_registration(self, to_email: str, driver_name: str, driver_code: str) -> bool:
        """Send driver registration confirmation"""
        subject = f"Application Received - Driver {driver_code} | Dollor.ai"
        html_body = self._render_driver_registration_template(driver_name, driver_code)
        text_body = f"Thank you {driver_name}! Application ID: {driver_code}"
        return self.send_email(to_email, subject, html_body, text_body)

    def _render_vendor_approval_template(self, restaurant_name: str, contact_name: str) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffd700; margin: 0;">Dollor.ai</h1>
            </div>
            <div style="padding: 40px 30px;">
                <h2>Welcome, {contact_name}!</h2>
                <p><strong>{restaurant_name}</strong> is now live on Dollor.ai!</p>
                <p>Your customers can start ordering right away.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <strong>Next Steps:</strong>
                    <ol>
                        <li>Log in to your Vendor Dashboard</li>
                        <li>Download the Restaurant app</li>
                        <li>Set up bank account for payouts</li>
                    </ol>
                </div>
                <a href="https://dollor.ai/vendor/login" style="display: inline-block; background: #ffd700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Dashboard</a>
            </div>
            <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666;">
                <p>&copy; 2024 Dollor.ai</p>
            </div>
        </body>
        </html>
        """

    def _render_vendor_registration_template(self, restaurant_name: str, contact_name: str, vendor_id: str) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffd700; margin: 0;">Dollor.ai</h1>
            </div>
            <div style="padding: 40px 30px;">
                <h2>Thank you, {contact_name}!</h2>
                <p>We've received your application for <strong>{restaurant_name}</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0; color: #666;">Application ID</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold;">{vendor_id}</p>
                </div>
                <p><strong>What's next?</strong></p>
                <ol>
                    <li>Document Review (1-2 business days)</li>
                    <li>Menu Setup</li>
                    <li>Go Live!</li>
                </ol>
            </div>
            <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666;">
                <p>&copy; 2024 Dollor.ai</p>
            </div>
        </body>
        </html>
        """

    def _render_driver_approval_template(self, driver_name: str, driver_code: str) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Dollor.ai Driver</h1>
            </div>
            <div style="padding: 40px 30px;">
                <h2>Welcome to the team, {driver_name}!</h2>
                <p>Your driver application has been <strong>approved</strong>!</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #10b981;">
                    <p style="margin: 0; color: #666;">Your Driver Code</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #10b981;">{driver_code}</p>
                </div>
                <p><strong>Get Started:</strong></p>
                <ol>
                    <li>Download the Driver app</li>
                    <li>Log in with your credentials</li>
                    <li>Go online and start earning!</li>
                </ol>
                <a href="https://dollor.ai/driver/login" style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Driving</a>
            </div>
            <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666;">
                <p>&copy; 2024 Dollor.ai</p>
            </div>
        </body>
        </html>
        """

    def _render_driver_registration_template(self, driver_name: str, driver_code: str) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Dollor.ai Driver</h1>
            </div>
            <div style="padding: 40px 30px;">
                <h2>Thank you, {driver_name}!</h2>
                <p>We've received your driver application.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0; color: #666;">Application ID</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold;">{driver_code}</p>
                </div>
                <p><strong>What's next?</strong></p>
                <ol>
                    <li>Document Review (1-2 days)</li>
                    <li>Background Check</li>
                    <li>Start Earning!</li>
                </ol>
            </div>
            <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666;">
                <p>&copy; 2024 Dollor.ai</p>
            </div>
        </body>
        </html>
        """


# =============================================================================
# PUSH NOTIFICATION SERVICE
# =============================================================================

class PushService:
    def __init__(self, logger):
        self.logger = logger
        self.fcm_initialized = False
        self._init_firebase()

    def _init_firebase(self):
        """Initialize Firebase Admin SDK"""
        if FIREBASE_CREDENTIALS and os.path.exists(FIREBASE_CREDENTIALS):
            try:
                import firebase_admin
                from firebase_admin import credentials
                cred = credentials.Certificate(FIREBASE_CREDENTIALS)
                firebase_admin.initialize_app(cred)
                self.fcm_initialized = True
                self.logger.info("Firebase initialized")
            except Exception as e:
                self.logger.warning("Firebase init failed", error=str(e))

    def send_push(self, fcm_token: str, title: str, body: str, data: Dict = None) -> bool:
        """Send push notification via FCM"""
        if not self.fcm_initialized:
            self.logger.info("Push logged (FCM not configured)", token=fcm_token[:20], title=title)
            return True

        try:
            from firebase_admin import messaging
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                token=fcm_token
            )
            messaging.send(message)
            self.logger.info("Push sent", title=title)
            return True
        except Exception as e:
            self.logger.error("Push failed", error=str(e))
            return False

    def send_to_topic(self, topic: str, title: str, body: str, data: Dict = None) -> bool:
        """Send push notification to a topic"""
        if not self.fcm_initialized:
            self.logger.info("Topic push logged", topic=topic, title=title)
            return True

        try:
            from firebase_admin import messaging
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                topic=topic
            )
            messaging.send(message)
            self.logger.info("Topic push sent", topic=topic, title=title)
            return True
        except Exception as e:
            self.logger.error("Topic push failed", error=str(e))
            return False


# =============================================================================
# SMS SERVICE
# =============================================================================

class SMSService:
    def __init__(self, logger):
        self.logger = logger
        self.twilio_client = None
        self._init_twilio()

    def _init_twilio(self):
        """Initialize Twilio client"""
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                self.logger.info("Twilio initialized")
            except Exception as e:
                self.logger.warning("Twilio init failed", error=str(e))

    def send_sms(self, to_phone: str, message: str) -> bool:
        """Send SMS via Twilio"""
        if not self.twilio_client:
            self.logger.info("SMS logged (Twilio not configured)", to=to_phone, message=message[:50])
            return True

        try:
            self.twilio_client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone
            )
            self.logger.info("SMS sent", to=to_phone)
            return True
        except Exception as e:
            self.logger.error("SMS failed", to=to_phone, error=str(e))
            return False


# =============================================================================
# CREATE SERVICE
# =============================================================================

factory = MicroserviceFactory(
    service_name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Notification service for Dollor.ai platform (Email, Push, SMS)",
    port=SERVICE_PORT,
)

app = factory.create_app()
logger = factory.logger

# Initialize services
email_service = EmailService(logger)
push_service = PushService(logger)
sms_service = SMSService(logger)


# =============================================================================
# ROUTES - EMAIL
# =============================================================================

@app.post("/api/notifications/email/send", tags=["Email"])
async def send_email_notification(
    request: EmailRequest,
    background_tasks: BackgroundTasks
):
    """
    Send a templated email notification.

    Error Codes:
    - NTF-101: Invalid email address
    - NTF-102: Unknown template
    - NTF-501: Email service error
    """
    if request.template not in EMAIL_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NTF-102", "message": f"Unknown template: {request.template}"}
        )

    # Send in background for non-blocking response
    template_config = EMAIL_TEMPLATES[request.template]
    subject = template_config["subject"].format(**request.data)

    background_tasks.add_task(
        email_service.send_email,
        request.to_email,
        subject,
        f"<html><body>{request.data}</body></html>",  # Simplified
        str(request.data)
    )

    return {"success": True, "message": "Email queued for delivery"}


@app.post("/api/notifications/email/vendor-approval", tags=["Email"])
async def send_vendor_approval_email_endpoint(
    request: VendorApprovalEmail,
    background_tasks: BackgroundTasks
):
    """Send vendor approval email"""
    background_tasks.add_task(
        email_service.send_vendor_approval,
        request.to_email,
        request.restaurant_name,
        request.contact_name
    )
    return {"success": True, "message": "Vendor approval email queued"}


@app.post("/api/notifications/email/vendor-registration", tags=["Email"])
async def send_vendor_registration_email_endpoint(
    request: VendorRegistrationEmail,
    background_tasks: BackgroundTasks
):
    """Send vendor registration confirmation email"""
    background_tasks.add_task(
        email_service.send_vendor_registration,
        request.to_email,
        request.restaurant_name,
        request.contact_name,
        request.vendor_id
    )
    return {"success": True, "message": "Vendor registration email queued"}


@app.post("/api/notifications/email/driver-approval", tags=["Email"])
async def send_driver_approval_email_endpoint(
    request: DriverApprovalEmail,
    background_tasks: BackgroundTasks
):
    """Send driver approval email"""
    background_tasks.add_task(
        email_service.send_driver_approval,
        request.to_email,
        request.driver_name,
        request.driver_code
    )
    return {"success": True, "message": "Driver approval email queued"}


@app.post("/api/notifications/email/driver-registration", tags=["Email"])
async def send_driver_registration_email_endpoint(
    request: DriverRegistrationEmail,
    background_tasks: BackgroundTasks
):
    """Send driver registration confirmation email"""
    background_tasks.add_task(
        email_service.send_driver_registration,
        request.to_email,
        request.driver_name,
        request.driver_code
    )
    return {"success": True, "message": "Driver registration email queued"}


# =============================================================================
# ROUTES - PUSH NOTIFICATIONS
# =============================================================================

@app.post("/api/notifications/push/send", tags=["Push"])
async def send_push_notification(
    request: PushRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Send push notification to a user, driver, or vendor/restaurant.

    Error Codes:
    - NTF-201: User not found
    - NTF-202: No FCM token registered
    - NTF-502: Push service error
    """
    fcm_token = request.fcm_token

    # If no token provided, lookup from database
    if not fcm_token:
        if request.driver_id:
            result = db.execute(
                text("SELECT fcm_token FROM drivers WHERE id = :id"),
                {"id": request.driver_id}
            ).fetchone()
            if result:
                fcm_token = result[0]
        elif request.vendor_id:
            # Lookup vendor/restaurant FCM token (stored as push_token)
            result = db.execute(
                text("SELECT push_token FROM vendors WHERE id = :id"),
                {"id": request.vendor_id}
            ).fetchone()
            if result:
                fcm_token = result[0]
        elif request.user_id:
            result = db.execute(
                text("SELECT fcm_token FROM users WHERE id = :id"),
                {"id": request.user_id}
            ).fetchone()
            if result:
                fcm_token = result[0]

    if not fcm_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NTF-202", "message": "No FCM token available"}
        )

    background_tasks.add_task(
        push_service.send_push,
        fcm_token,
        request.title,
        request.body,
        request.data
    )

    return {"success": True, "message": "Push notification queued"}


@app.post("/api/notifications/push/topic", tags=["Push"])
async def send_push_to_topic(
    topic: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    background_tasks: BackgroundTasks = None
):
    """Send push notification to a topic (all drivers, all restaurants, etc.)"""
    background_tasks.add_task(
        push_service.send_to_topic,
        topic,
        title,
        body,
        data
    )
    return {"success": True, "message": f"Push sent to topic: {topic}"}


# =============================================================================
# ROUTES - SMS
# =============================================================================

@app.post("/api/notifications/sms/send", tags=["SMS"])
async def send_sms_notification(
    request: SMSRequest,
    background_tasks: BackgroundTasks
):
    """
    Send SMS notification.

    Error Codes:
    - NTF-301: Invalid phone number
    - NTF-503: SMS service error
    """
    background_tasks.add_task(
        sms_service.send_sms,
        request.phone_number,
        request.message
    )
    return {"success": True, "message": "SMS queued for delivery"}


# =============================================================================
# ROUTES - ORDER NOTIFICATIONS
# =============================================================================

@app.post("/api/notifications/order", tags=["Orders"])
async def send_order_notification(
    request: OrderNotification,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Send order-related notification (new order, ready, picked up, delivered).
    Automatically determines recipient and notification channel.
    """
    # Get order details
    order = db.execute(
        text("""
            SELECT o.id, o.order_id, o.order_number, o.customer_id, o.driver_id, o.vendor_id,
                   o.total_amount, o.items,
                   c.email as customer_email, c.phone as customer_phone, c.push_token as customer_fcm,
                   d.email as driver_email, d.fcm_token as driver_fcm,
                   v.contact_email as vendor_email, v.push_token as vendor_fcm,
                   v.restaurant_name as vendor_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN drivers d ON o.driver_id = d.id
            LEFT JOIN vendors v ON o.vendor_id = v.id
            WHERE o.id = :order_id
        """),
        {"order_id": request.order_id}
    ).fetchone()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NTF-401", "message": "Order not found"}
        )

    notifications_sent = []

    # Determine what notifications to send based on type
    if request.notification_type == "new_order":
        # Notify restaurant via push notification
        if order.vendor_fcm:
            background_tasks.add_task(
                push_service.send_push,
                order.vendor_fcm,
                "🔔 New Order!",
                f"Order #{order.order_number or order.order_id} - ${order.total_amount:.2f}" if order.total_amount else f"Order #{order.order_number or order.order_id}",
                {"order_id": str(order.id), "type": "new_order"}
            )
            notifications_sent.append("push:restaurant")

        # Also notify restaurant via email
        if order.vendor_email:
            background_tasks.add_task(
                email_service.send_email,
                order.vendor_email,
                f"New Order #{order.order_number or order.order_id}",
                f"<p>You have a new order! Please check your Dollor Business app.</p>",
                "You have a new order!"
            )
            notifications_sent.append("email:restaurant")

    elif request.notification_type == "order_ready":
        # Notify driver
        if order.driver_fcm:
            background_tasks.add_task(
                push_service.send_push,
                order.driver_fcm,
                "Order Ready for Pickup",
                f"Order #{order.order_id} is ready at the restaurant",
                {"order_id": str(order.id), "type": "order_ready"}
            )
            notifications_sent.append("push:driver")

    elif request.notification_type == "order_picked_up":
        # Notify customer
        if order.customer_email:
            background_tasks.add_task(
                email_service.send_email,
                order.customer_email,
                f"Your Order is On the Way!",
                f"<p>Your order #{order.order_id} has been picked up and is on the way!</p>",
                f"Your order #{order.order_id} is on the way!"
            )
            notifications_sent.append("email:customer")

    elif request.notification_type == "order_delivered":
        # Notify customer to rate
        if order.customer_email:
            background_tasks.add_task(
                email_service.send_email,
                order.customer_email,
                f"Order Delivered - Rate Your Experience",
                f"<p>Your order #{order.order_id} has been delivered. How was it?</p>",
                f"Order #{order.order_id} delivered. Rate your experience!"
            )
            notifications_sent.append("email:customer")

    return {
        "success": True,
        "notifications_sent": notifications_sent,
        "order_id": request.order_id
    }


# =============================================================================
# HEALTH
# =============================================================================

@app.get("/api/notifications/health", tags=["Health"])
async def notification_health():
    """Notification service health check"""
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "status": "healthy",
        "email_configured": email_service.smtp_configured,
        "push_configured": push_service.fcm_initialized,
        "sms_configured": sms_service.twilio_client is not None,
        "timestamp": datetime.utcnow().isoformat()
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=SERVICE_PORT,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
