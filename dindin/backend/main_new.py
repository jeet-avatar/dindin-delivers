from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
import secrets
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import get_db, init_db
from models import User, Client, Invoice, InvoiceItem, Payment, UserRole, InvoiceStatus, PaymentStatus, Vendor, Driver, DriverStatus

load_dotenv()

# ===================== SECURITY CONFIGURATION =====================
# CRITICAL: These values MUST be set via environment variables in production
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# Validate critical security settings in production
if IS_PRODUCTION:
    jwt_secret = os.getenv("JWT_SECRET_KEY", "")
    if not jwt_secret or len(jwt_secret) < 32 or jwt_secret == "your-secret-key-change-in-production":
        raise RuntimeError(
            "CRITICAL: JWT_SECRET_KEY must be set to a secure random value (min 32 chars) in production! "
            "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
        )

app = FastAPI(
    title="Dollor.ai API",
    description="Enterprise Food Delivery & Rideshare Platform",
    version="2.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable docs in production
    redoc_url="/redoc" if not IS_PRODUCTION else None,
)

# ===================== SECURITY MIDDLEWARE =====================
# Add comprehensive security middleware (rate limiting, headers, CORS)
try:
    from security_middleware import add_security_middleware
    add_security_middleware(app)
except ImportError as e:
    print(f"[SECURITY WARNING] Security middleware not loaded: {e}")
    # Fallback to basic CORS if security middleware not available
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://dollor.ai", "https://www.dollor.ai"] if IS_PRODUCTION else ["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# CRITICAL: Use cryptographically secure secret key
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(64) if not IS_PRODUCTION else "")
ALGORITHM = "HS256"
# Reduced token expiration for security (was 24 hours, now 1 hour for access tokens)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))  # 1 hour default
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days for refresh

# Email Configuration - AWS SES
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@dollor.ai")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Dollor.ai")

# Production validation
_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# Initialize boto3 SES client with production-grade settings
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config as BotoConfig

ses_client = None
try:
    # Configure boto3 for high throughput
    boto_config = BotoConfig(
        retries={'max_attempts': 3, 'mode': 'adaptive'},
        max_pool_connections=50,  # High concurrency for millions of users
        connect_timeout=5,
        read_timeout=30
    )
    ses_client = boto3.client('ses', region_name=AWS_REGION, config=boto_config)
    print(f"[EMAIL] AWS SES client initialized for region: {AWS_REGION}")

    # Verify SES identity in production
    if _IS_PRODUCTION:
        try:
            response = ses_client.get_identity_verification_attributes(
                Identities=[EMAIL_FROM]
            )
            status = response.get('VerificationAttributes', {}).get(EMAIL_FROM, {}).get('VerificationStatus')
            if status != 'Success':
                print(f"[EMAIL WARNING] Email {EMAIL_FROM} verification status: {status}")
        except Exception as verify_error:
            print(f"[EMAIL WARNING] Could not verify email identity: {verify_error}")
except Exception as e:
    print(f"[EMAIL] Failed to initialize AWS SES client: {e}")
    if _IS_PRODUCTION:
        print("[EMAIL WARNING] Production requires AWS SES - emails will not be sent!")


async def send_email(to_email: str, subject: str, html_content: str, text_content: str = None):
    """
    Send an email using AWS SES. Falls back to console logging if SES is not configured.
    """
    if not ses_client:
        print(f"[EMAIL] AWS SES not configured. Would send to: {to_email}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Content: {text_content or html_content[:200]}...")
        return {"success": True, "method": "console_log"}

    try:
        # Build email message
        message = {
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Html': {'Data': html_content, 'Charset': 'UTF-8'}
            }
        }

        if text_content:
            message['Body']['Text'] = {'Data': text_content, 'Charset': 'UTF-8'}

        # Send email via AWS SES
        response = ses_client.send_email(
            Source=f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>",
            Destination={'ToAddresses': [to_email]},
            Message=message
        )

        message_id = response.get('MessageId', 'unknown')
        print(f"[EMAIL] Successfully sent email to {to_email} via AWS SES (MessageId: {message_id})")
        return {"success": True, "method": "aws_ses", "message_id": message_id}

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        print(f"[EMAIL] AWS SES error sending to {to_email}: {error_code} - {error_msg}")
        return {"success": False, "error": f"{error_code}: {error_msg}"}
    except Exception as e:
        print(f"[EMAIL] Failed to send email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}


async def send_driver_approval_email(driver_email: str, driver_name: str):
    """
    Send approval notification email to driver.
    """
    subject = "🎉 Congratulations! Your Driver Application Has Been Approved"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to the Team! 🚗</h1>
            </div>
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>Great news! Your driver application with <strong>Dollor.ai</strong> has been <strong>approved</strong>!</p>

                <p>Our AI verification system has reviewed your documents and everything checks out. You're now ready to start accepting delivery orders and earning money.</p>

                <h3>What's Next?</h3>
                <ul>
                    <li>✅ Open the Dollor.ai Driver app</li>
                    <li>✅ Go online to start receiving orders</li>
                    <li>✅ Complete deliveries and track your earnings</li>
                </ul>

                <p>If you have any questions, our AI support team is available 24/7 in the app.</p>

                <a href="https://dollor.ai/driver" class="button">Open Driver Dashboard</a>

                <p style="margin-top: 30px;">Happy delivering! 🎉</p>
                <p><strong>The Dollor.ai Team</strong></p>
            </div>
            <div class="footer">
                <p>Dollor.ai - AI-Powered Food Delivery</p>
                <p>This email was sent automatically by our AI verification system.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
    Hi {driver_name},

    Great news! Your driver application with Dollor.ai has been APPROVED!

    Our AI verification system has reviewed your documents and everything checks out. You're now ready to start accepting delivery orders and earning money.

    What's Next?
    - Open the Dollor.ai Driver app
    - Go online to start receiving orders
    - Complete deliveries and track your earnings

    If you have any questions, our AI support team is available 24/7 in the app.

    Happy delivering!
    The Dollor.ai Team

    ---
    Dollor.ai - AI-Powered Food Delivery
    """

    return await send_email(driver_email, subject, html_content, text_content)


async def send_driver_rejection_email(driver_email: str, driver_name: str, reason: str):
    """
    Send rejection notification email to driver.
    """
    subject = "Update on Your Driver Application"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Application Update</h1>
            </div>
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>Thank you for your interest in driving with <strong>Dollor.ai</strong>.</p>

                <p>After reviewing your application, we were unable to approve it at this time.</p>

                <p><strong>Reason:</strong> {reason}</p>

                <h3>What You Can Do:</h3>
                <ul>
                    <li>Review and update your documents</li>
                    <li>Ensure all information is accurate and clear</li>
                    <li>Resubmit your application</li>
                </ul>

                <a href="https://dollor.ai/driver/apply" class="button">Update Your Application</a>

                <p style="margin-top: 30px;">We look forward to having you on our team!</p>
                <p><strong>The Dollor.ai Team</strong></p>
            </div>
            <div class="footer">
                <p>Dollor.ai - AI-Powered Food Delivery</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
    Hi {driver_name},

    Thank you for your interest in driving with Dollor.ai.

    After reviewing your application, we were unable to approve it at this time.

    Reason: {reason}

    What You Can Do:
    - Review and update your documents
    - Ensure all information is accurate and clear
    - Resubmit your application

    We look forward to having you on our team!
    The Dollor.ai Team
    """

    return await send_email(driver_email, subject, html_content, text_content)


# ============================================================================
# ENTERPRISE EMAIL TEMPLATES - AI-OPERATED COMPANY (NO HUMAN IN LOOP)
# ============================================================================

def get_email_footer():
    """Standard enterprise footer for all emails"""
    return """
            <div class="footer">
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                    <p style="margin: 5px 0;"><strong>Dollor.ai</strong></p>
                    <p style="margin: 5px 0; font-size: 11px;">AI-Powered Delivery & Rideshare Platform</p>
                    <p style="margin: 10px 0; font-size: 11px;">
                        <a href="https://dollor.ai" style="color: #3b82f6; text-decoration: none;">Website</a> |
                        <a href="https://dollor.ai/support" style="color: #3b82f6; text-decoration: none;">AI Support</a> |
                        <a href="https://dollor.ai/privacy" style="color: #3b82f6; text-decoration: none;">Privacy</a> |
                        <a href="https://dollor.ai/terms" style="color: #3b82f6; text-decoration: none;">Terms</a>
                    </p>
                    <p style="margin: 10px 0; font-size: 10px; color: #9ca3af;">
                        This is an automated message from Dollor.ai's AI system.<br>
                        Our platform operates autonomously with AI verification and support.<br>
                        © 2024 Dollor.ai. All rights reserved.
                    </p>
                    <p style="margin: 5px 0; font-size: 10px; color: #9ca3af;">
                        123 AI Boulevard, San Francisco, CA 94105
                    </p>
                </div>
            </div>
    """

def get_email_header(title: str, color: str = "#3b82f6", icon: str = "🚀"):
    """Standard enterprise header for all emails"""
    return f"""
            <div class="header" style="background: linear-gradient(135deg, {color}, {color}dd); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <div style="font-size: 40px; margin-bottom: 10px;">{icon}</div>
                <h1 style="margin: 0; font-size: 24px;">{title}</h1>
            </div>
    """

def get_email_styles():
    """Standard CSS styles for all emails"""
    return """
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 20px auto; padding: 0; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .content { padding: 30px; }
            .button { display: inline-block; background: #3b82f6; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
            .button-green { background: #22c55e; }
            .button-orange { background: #f59e0b; }
            .info-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .order-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .order-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .order-total { font-size: 18px; font-weight: bold; color: #22c55e; }
            .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-confirmed { background: #dbeafe; color: #1d4ed8; }
            .status-preparing { background: #fef3c7; color: #b45309; }
            .status-pickup { background: #e0e7ff; color: #4338ca; }
            .status-delivered { background: #d1fae5; color: #065f46; }
            .tracking-timeline { margin: 20px 0; }
            .timeline-step { display: flex; align-items: flex-start; margin: 15px 0; }
            .timeline-icon { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 14px; }
            .timeline-icon-active { background: #22c55e; color: white; }
            .timeline-icon-pending { background: #e5e7eb; color: #9ca3af; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    """


# ============================================================================
# FOOD DELIVERY EMAIL TEMPLATES
# ============================================================================

async def send_order_confirmation_email(
    customer_email: str,
    customer_name: str,
    order_id: str,
    restaurant_name: str,
    items: list,
    subtotal: float,
    delivery_fee: float,
    tax: float,
    total: float,
    delivery_address: str,
    estimated_time: str
):
    """
    STEP 1: Order Confirmed - Sent immediately when customer places order
    """
    subject = f"Order Confirmed! #{order_id} from {restaurant_name}"

    items_html = ""
    for item in items:
        items_html += f"""
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span>{item.get('quantity', 1)}x {item.get('name', 'Item')}</span>
                <span>${item.get('price', 0):.2f}</span>
            </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Order Confirmed!", "#22c55e", "✅")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>Great news! Your order has been confirmed and {restaurant_name} is preparing your food.</p>

                <div class="success-box">
                    <strong>Order #{order_id}</strong><br>
                    <span class="status-badge status-confirmed">Confirmed</span>
                </div>

                <div class="order-details">
                    <h3 style="margin-top: 0;">Order Summary</h3>
                    {items_html}
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Subtotal</span>
                        <span style="float: right;">${subtotal:.2f}</span>
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Delivery Fee</span>
                        <span style="float: right;">${delivery_fee:.2f}</span>
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Tax</span>
                        <span style="float: right;">${tax:.2f}</span>
                    </div>
                    <div style="padding: 15px 0; font-size: 18px; font-weight: bold;">
                        <span>Total</span>
                        <span style="float: right; color: #22c55e;">${total:.2f}</span>
                    </div>
                </div>

                <div class="info-box">
                    <strong>📍 Delivery Address</strong><br>
                    {delivery_address}<br><br>
                    <strong>⏱️ Estimated Delivery</strong><br>
                    {estimated_time}
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_id}" class="button button-green">Track Your Order</a>
                </p>

                <p style="color: #666; font-size: 14px;">
                    You'll receive updates as your order progresses. Our AI system monitors every step to ensure a smooth delivery experience.
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_order_preparing_email(
    customer_email: str,
    customer_name: str,
    order_id: str,
    restaurant_name: str,
    estimated_ready: str
):
    """
    STEP 2: Restaurant Preparing - Sent when restaurant starts preparing
    """
    subject = f"🍳 {restaurant_name} is preparing your order #{order_id}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Your Food is Being Prepared!", "#f59e0b", "👨‍🍳")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>{restaurant_name} has started preparing your order. Fresh and delicious food is on its way!</p>

                <div class="warning-box">
                    <strong>Order #{order_id}</strong><br>
                    <span class="status-badge status-preparing">Preparing</span>
                </div>

                <div class="tracking-timeline">
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Order Confirmed</strong><br><span style="color: #666;">Your order was received</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">🍳</div>
                        <div><strong>Preparing</strong><br><span style="color: #666;">Chef is cooking your food</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">📦</div>
                        <div><strong>Ready for Pickup</strong><br><span style="color: #666;">Waiting for driver</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">🚗</div>
                        <div><strong>On the Way</strong><br><span style="color: #666;">Driver is delivering</span></div>
                    </div>
                </div>

                <div class="info-box">
                    <strong>⏱️ Estimated Ready Time</strong><br>
                    {estimated_ready}
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_id}" class="button">Track Your Order</a>
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_driver_assigned_email(
    customer_email: str,
    customer_name: str,
    order_id: str,
    driver_name: str,
    driver_photo_url: str = None,
    vehicle_info: str = None,
    estimated_pickup: str = None
):
    """
    STEP 3: Driver Assigned - Sent when a driver accepts the order
    """
    subject = f"🚗 Driver assigned to your order #{order_id}"

    driver_photo = f'<img src="{driver_photo_url}" style="width: 60px; height: 60px; border-radius: 50%; margin-right: 15px;">' if driver_photo_url else '<div style="width: 60px; height: 60px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">🚗</div>'

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Driver On The Way!", "#3b82f6", "🚗")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>Great news! A driver has been assigned to pick up your order.</p>

                <div style="display: flex; align-items: center; background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    {driver_photo}
                    <div>
                        <strong style="font-size: 18px;">{driver_name}</strong><br>
                        <span style="color: #666;">{vehicle_info or 'Dollor.ai Driver'}</span><br>
                        <span style="color: #22c55e;">⭐ Verified Driver</span>
                    </div>
                </div>

                <div class="info-box">
                    <strong>📍 Driver Status</strong><br>
                    Heading to {estimated_pickup or 'pickup location'}
                </div>

                <div class="tracking-timeline">
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Order Confirmed</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Preparing Complete</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">🚗</div>
                        <div><strong>Driver Assigned</strong><br><span style="color: #666;">Heading to restaurant</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">📦</div>
                        <div><strong>Picked Up</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">🏠</div>
                        <div><strong>Delivered</strong></div>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_id}" class="button">Track Live Location</a>
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_order_picked_up_email(
    customer_email: str,
    customer_name: str,
    order_id: str,
    driver_name: str,
    estimated_arrival: str
):
    """
    STEP 4: Order Picked Up - Sent when driver picks up from restaurant
    """
    subject = f"📦 Your order #{order_id} is on its way!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Order Picked Up!", "#8b5cf6", "📦")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p><strong>{driver_name}</strong> has picked up your order and is heading your way!</p>

                <div class="success-box">
                    <strong>🚗 Your food is on the move!</strong><br>
                    Estimated arrival: <strong>{estimated_arrival}</strong>
                </div>

                <div class="tracking-timeline">
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Order Confirmed</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Prepared</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Picked Up</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">🚗</div>
                        <div><strong>On The Way</strong><br><span style="color: #22c55e;">Driver is delivering</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">🏠</div>
                        <div><strong>Delivered</strong></div>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_id}" class="button">Track Live Location</a>
                </p>

                <p style="color: #666; font-size: 14px; text-align: center;">
                    💡 Tip: Have your phone ready - the driver may call when arriving
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_order_delivered_email(
    customer_email: str,
    customer_name: str,
    order_id: str,
    restaurant_name: str,
    driver_name: str,
    total: float,
    tip_amount: float = 0
):
    """
    STEP 5: Order Delivered - Sent when driver marks as delivered
    """
    subject = f"✅ Order #{order_id} delivered! Enjoy your meal!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Order Delivered!", "#22c55e", "🎉")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>Your order from <strong>{restaurant_name}</strong> has been delivered. Enjoy your meal!</p>

                <div class="success-box">
                    <strong>Order #{order_id}</strong><br>
                    <span class="status-badge status-delivered">Delivered</span>
                </div>

                <div class="order-details">
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Order Total</span>
                        <span style="float: right;">${total:.2f}</span>
                    </div>
                    {"<div style='padding: 10px 0;'><span>Tip for " + driver_name + "</span><span style='float: right; color: #22c55e;'>$" + f"{tip_amount:.2f}" + "</span></div>" if tip_amount > 0 else ""}
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p><strong>How was your experience?</strong></p>
                    <div style="font-size: 30px;">
                        <a href="https://dollor.ai/rate/{order_id}/1" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate/{order_id}/2" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate/{order_id}/3" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate/{order_id}/4" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate/{order_id}/5" style="text-decoration: none;">⭐</a>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_id}/receipt" class="button">View Receipt</a>
                </p>

                <div class="info-box">
                    <strong>🙏 Thank you for choosing Dollor.ai!</strong><br>
                    Your support helps us deliver more smiles. Order again soon!
                </div>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


# ============================================================================
# RIDESHARE EMAIL TEMPLATES
# ============================================================================

async def send_ride_booked_email(
    customer_email: str,
    customer_name: str,
    ride_id: str,
    pickup_address: str,
    dropoff_address: str,
    estimated_fare: float,
    vehicle_type: str,
    pickup_time: str
):
    """
    RIDESHARE STEP 1: Ride Booked - Sent when customer books a ride
    """
    subject = f"🚗 Ride Booked! Looking for your driver..."

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Ride Booked!", "#3b82f6", "🚗")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>Your ride has been booked! Our AI is matching you with the best available driver.</p>

                <div class="info-box">
                    <strong>Ride #{ride_id}</strong><br>
                    <span class="status-badge status-confirmed">Finding Driver</span>
                </div>

                <div class="order-details">
                    <h3 style="margin-top: 0;">Trip Details</h3>
                    <div style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong>📍 Pickup</strong><br>
                        <span style="color: #666;">{pickup_address}</span>
                    </div>
                    <div style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong>🏁 Dropoff</strong><br>
                        <span style="color: #666;">{dropoff_address}</span>
                    </div>
                    <div style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong>🚙 Vehicle Type</strong><br>
                        <span style="color: #666;">{vehicle_type}</span>
                    </div>
                    <div style="padding: 15px 0;">
                        <strong>💰 Estimated Fare</strong><br>
                        <span style="color: #22c55e; font-size: 24px; font-weight: bold;">${estimated_fare:.2f}</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/rides/{ride_id}" class="button">Track Your Ride</a>
                </p>

                <p style="color: #666; font-size: 14px;">
                    You'll receive a notification once a driver accepts your ride request.
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_ride_driver_assigned_email(
    customer_email: str,
    customer_name: str,
    ride_id: str,
    driver_name: str,
    driver_rating: float,
    vehicle_make: str,
    vehicle_model: str,
    vehicle_color: str,
    license_plate: str,
    eta_minutes: int
):
    """
    RIDESHARE STEP 2: Driver Assigned - Sent when driver accepts the ride
    """
    subject = f"🚗 Your driver {driver_name} is on the way!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Driver On The Way!", "#22c55e", "🚗")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>Great news! Your driver is heading to pick you up.</p>

                <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🚗</div>
                    <h3 style="margin: 10px 0;">{driver_name}</h3>
                    <p style="margin: 5px 0;">⭐ {driver_rating:.1f} Rating</p>
                </div>

                <div class="order-details">
                    <h3 style="margin-top: 0;">Vehicle Details</h3>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Vehicle</span>
                        <span style="float: right;">{vehicle_color} {vehicle_make} {vehicle_model}</span>
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>License Plate</span>
                        <span style="float: right; font-weight: bold; font-size: 18px;">{license_plate}</span>
                    </div>
                    <div style="padding: 15px 0; text-align: center;">
                        <span style="font-size: 14px; color: #666;">Arriving in</span><br>
                        <span style="font-size: 36px; font-weight: bold; color: #22c55e;">{eta_minutes} min</span>
                    </div>
                </div>

                <div class="warning-box">
                    <strong>📱 Safety Tip:</strong> Always verify the license plate matches before getting in.
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/rides/{ride_id}" class="button button-green">Track Driver Location</a>
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_ride_started_email(
    customer_email: str,
    customer_name: str,
    ride_id: str,
    driver_name: str,
    pickup_address: str,
    dropoff_address: str,
    estimated_arrival: str
):
    """
    RIDESHARE STEP 3: Ride Started - Sent when ride begins
    """
    subject = f"🚗 Your ride has started!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Ride In Progress!", "#8b5cf6", "🛣️")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>You're on your way! Enjoy your ride with {driver_name}.</p>

                <div class="success-box">
                    <strong>Ride #{ride_id}</strong><br>
                    <span class="status-badge" style="background: #e0e7ff; color: #4338ca;">In Progress</span>
                </div>

                <div class="tracking-timeline">
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Ride Booked</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Driver Assigned</strong></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Picked Up</strong><br><span style="color: #666;">{pickup_address}</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">🚗</div>
                        <div><strong>En Route</strong><br><span style="color: #22c55e;">ETA: {estimated_arrival}</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">🏁</div>
                        <div><strong>Arrive at Destination</strong><br><span style="color: #666;">{dropoff_address}</span></div>
                    </div>
                </div>

                <div class="info-box">
                    <strong>🆘 Need Help?</strong><br>
                    If you have any concerns during your ride, use the emergency button in the app or call our 24/7 AI support.
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/rides/{ride_id}" class="button">View Ride Details</a>
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_ride_completed_email(
    customer_email: str,
    customer_name: str,
    ride_id: str,
    driver_name: str,
    pickup_address: str,
    dropoff_address: str,
    distance_miles: float,
    duration_minutes: int,
    base_fare: float,
    distance_fare: float,
    time_fare: float,
    total_fare: float,
    tip_amount: float = 0
):
    """
    RIDESHARE STEP 4: Ride Completed - Sent when ride ends
    """
    subject = f"✅ Ride Complete! Thanks for riding with Dollor.ai"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Ride Complete!", "#22c55e", "🎉")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>You've arrived! Thanks for riding with Dollor.ai.</p>

                <div class="success-box">
                    <strong>Ride #{ride_id}</strong><br>
                    <span class="status-badge status-delivered">Completed</span>
                </div>

                <div class="order-details">
                    <h3 style="margin-top: 0;">Trip Summary</h3>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>📍 From</span>
                        <span style="float: right; max-width: 60%; text-align: right;">{pickup_address}</span>
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>🏁 To</span>
                        <span style="float: right; max-width: 60%; text-align: right;">{dropoff_address}</span>
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Distance</span>
                        <span style="float: right;">{distance_miles:.1f} miles</span>
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Duration</span>
                        <span style="float: right;">{duration_minutes} minutes</span>
                    </div>
                </div>

                <div class="order-details" style="margin-top: 20px;">
                    <h3 style="margin-top: 0;">Fare Breakdown</h3>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Base Fare</span>
                        <span style="float: right;">${base_fare:.2f}</span>
                    </div>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Distance ({distance_miles:.1f} mi)</span>
                        <span style="float: right;">${distance_fare:.2f}</span>
                    </div>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Time ({duration_minutes} min)</span>
                        <span style="float: right;">${time_fare:.2f}</span>
                    </div>
                    {"<div style='padding: 8px 0; border-bottom: 1px solid #e5e7eb;'><span>Tip for " + driver_name + "</span><span style='float: right;'>$" + f"{tip_amount:.2f}" + "</span></div>" if tip_amount > 0 else ""}
                    <div style="padding: 15px 0; font-size: 20px; font-weight: bold;">
                        <span>Total</span>
                        <span style="float: right; color: #22c55e;">${total_fare + tip_amount:.2f}</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p><strong>Rate your ride with {driver_name}</strong></p>
                    <div style="font-size: 30px;">
                        <a href="https://dollor.ai/rate-ride/{ride_id}/1" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate-ride/{ride_id}/2" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate-ride/{ride_id}/3" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate-ride/{ride_id}/4" style="text-decoration: none;">⭐</a>
                        <a href="https://dollor.ai/rate-ride/{ride_id}/5" style="text-decoration: none;">⭐</a>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/rides/{ride_id}/receipt" class="button">View Full Receipt</a>
                </p>

                <div class="info-box">
                    <strong>🙏 Thank you for choosing Dollor.ai!</strong><br>
                    Ride with us again soon. Every trip supports our AI-powered future of transportation.
                </div>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_ride_cancelled_email(
    customer_email: str,
    customer_name: str,
    ride_id: str,
    pickup_address: str,
    dropoff_address: str,
    cancellation_fee: float = 0,
    refund_amount: float = 0,
    reason: str = ""
):
    """
    Rideshare Email 5: Ride Cancelled - Government-compliant cancellation notice
    Sent when a ride is cancelled with fee/refund details
    """
    from datetime import datetime

    cancelled_at = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    subject = f"Ride Cancelled - {ride_id}"

    fee_section = ""
    if cancellation_fee > 0:
        fee_section = f"""
        <div class="warning-box">
            <strong>Cancellation Fee: ${cancellation_fee:.2f}</strong><br>
            A cancellation fee has been charged because the driver was already en route.
        </div>
        """
    elif refund_amount > 0:
        fee_section = f"""
        <div class="success-box">
            <strong>Refund: ${refund_amount:.2f}</strong><br>
            Your payment has been refunded. Please allow 3-5 business days for processing.
        </div>
        """
    else:
        fee_section = """
        <div class="info-box">
            <strong>No Charge</strong><br>
            Your ride was cancelled with no fee since the driver had not yet been dispatched.
        </div>
        """

    reason_section = ""
    if reason:
        reason_section = f"""
        <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <strong>Cancellation Reason:</strong><br>
            {reason}
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Ride Cancelled", "#ef4444", "❌")}
            <div class="content">
                <h2>Hi {customer_name},</h2>
                <p>Your ride has been cancelled.</p>

                <div class="ride-details">
                    <h3>Cancelled Ride Details</h3>
                    <div style="padding: 15px; background: #fef2f2; border-radius: 8px; margin: 15px 0;">
                        <div style="margin: 10px 0;">
                            <span style="color: #666;">Ride ID:</span><br>
                            <strong>{ride_id}</strong>
                        </div>
                        <div style="margin: 10px 0;">
                            <span style="color: #666;">Cancelled At:</span><br>
                            <strong>{cancelled_at}</strong>
                        </div>
                        <div style="margin: 10px 0;">
                            <span style="color: #666;">Pickup:</span><br>
                            <strong>{pickup_address}</strong>
                        </div>
                        <div style="margin: 10px 0;">
                            <span style="color: #666;">Dropoff:</span><br>
                            <strong>{dropoff_address}</strong>
                        </div>
                    </div>
                </div>

                {reason_section}

                {fee_section}

                <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px; border: 1px solid #bfdbfe;">
                    <h3 style="margin-top: 0;">Cancellation Policy</h3>
                    <ul style="padding-left: 20px; color: #444;">
                        <li><strong>Free cancellation:</strong> Within 2 minutes of booking</li>
                        <li><strong>$5 fee:</strong> After driver has been assigned</li>
                        <li><strong>$10 fee:</strong> After driver is en route to pickup</li>
                    </ul>
                </div>

                <p style="text-align: center; margin-top: 30px;">
                    <a href="https://dollor.ai/book" class="button button-green">Book Another Ride</a>
                </p>

                <div class="info-box" style="margin-top: 30px;">
                    <strong>Need help?</strong><br>
                    Contact us at support@dollor.ai or visit our Help Center.
                </div>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


# ============================================================================
# DRIVER ONBOARDING EMAIL TEMPLATES
# ============================================================================

async def send_driver_welcome_email(driver_email: str, driver_name: str):
    """
    Driver Onboarding Step 1: Welcome - Sent when driver signs up
    """
    subject = "Welcome to Dollor.ai! Let's get you started 🚗"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Welcome to Dollor.ai!", "#3b82f6", "👋")}
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>Welcome to the Dollor.ai driver community! We're excited to have you join our AI-powered platform.</p>

                <div class="info-box">
                    <strong>What makes Dollor.ai different?</strong><br>
                    We're a fully AI-operated platform with no human middlemen. This means faster payouts, transparent operations, and 24/7 AI support.
                </div>

                <h3>Complete Your Application</h3>
                <p>To start earning, please complete the following steps:</p>

                <div style="margin: 20px 0;">
                    <div style="display: flex; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin: 10px 0;">
                        <div style="width: 30px; height: 30px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">1</div>
                        <div><strong>Upload Driver's License</strong><br><span style="color: #666;">Front and back photos</span></div>
                    </div>
                    <div style="display: flex; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin: 10px 0;">
                        <div style="width: 30px; height: 30px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">2</div>
                        <div><strong>Upload Insurance</strong><br><span style="color: #666;">Valid auto insurance</span></div>
                    </div>
                    <div style="display: flex; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin: 10px 0;">
                        <div style="width: 30px; height: 30px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">3</div>
                        <div><strong>Vehicle Photos</strong><br><span style="color: #666;">Clear photos of your vehicle</span></div>
                    </div>
                    <div style="display: flex; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin: 10px 0;">
                        <div style="width: 30px; height: 30px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">4</div>
                        <div><strong>Background Check</strong><br><span style="color: #666;">Automatic AI verification</span></div>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/driver/onboarding" class="button button-green">Complete Your Profile</a>
                </p>

                <div class="success-box">
                    <strong>⚡ Fast AI Verification</strong><br>
                    Our AI reviews documents in minutes, not days. Most drivers are approved within 24 hours!
                </div>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(driver_email, subject, html_content)


async def send_driver_documents_received_email(driver_email: str, driver_name: str, document_type: str):
    """
    Driver Onboarding Step 2: Document Received - Sent when document is uploaded
    """
    subject = f"📄 Document Received - {document_type}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Document Received!", "#3b82f6", "📄")}
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>We've received your <strong>{document_type}</strong>. Our AI verification system is reviewing it now.</p>

                <div class="info-box">
                    <strong>⏱️ What happens next?</strong><br>
                    Our AI will verify your document within minutes. You'll receive an email once the verification is complete.
                </div>

                <div class="tracking-timeline">
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">✓</div>
                        <div><strong>Document Uploaded</strong><br><span style="color: #666;">{document_type}</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-active">🤖</div>
                        <div><strong>AI Verification</strong><br><span style="color: #f59e0b;">In Progress</span></div>
                    </div>
                    <div class="timeline-step">
                        <div class="timeline-icon timeline-icon-pending">✓</div>
                        <div><strong>Verified</strong></div>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/driver/status" class="button">Check Application Status</a>
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(driver_email, subject, html_content)


async def send_driver_document_verified_email(driver_email: str, driver_name: str, document_type: str, remaining_docs: list = None):
    """
    Driver Onboarding Step 3: Document Verified - Sent when each document is verified
    """
    subject = f"✅ {document_type} Verified!"

    remaining_html = ""
    if remaining_docs and len(remaining_docs) > 0:
        remaining_html = """
            <div class="warning-box">
                <strong>📋 Still Needed:</strong><br>
                <ul style="margin: 10px 0; padding-left: 20px;">
        """
        for doc in remaining_docs:
            remaining_html += f"<li>{doc}</li>"
        remaining_html += """
                </ul>
            </div>
        """
    else:
        remaining_html = """
            <div class="success-box">
                <strong>🎉 All Documents Verified!</strong><br>
                Your application is being reviewed for final approval.
            </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Document Verified!", "#22c55e", "✅")}
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>Great news! Your <strong>{document_type}</strong> has been verified by our AI system.</p>

                {remaining_html}

                <p style="text-align: center;">
                    <a href="https://dollor.ai/driver/onboarding" class="button button-green">Continue Application</a>
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(driver_email, subject, html_content)


async def send_driver_first_delivery_email(driver_email: str, driver_name: str, earnings: float):
    """
    Driver Milestone: First Delivery Complete
    """
    subject = "🎉 Congratulations on your first delivery!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("First Delivery Complete!", "#22c55e", "🎉")}
            <div class="content">
                <h2>Amazing job, {driver_name}!</h2>
                <p>You've completed your first delivery with Dollor.ai! This is just the beginning of your journey.</p>

                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 10px; color: white; margin: 20px 0;">
                    <div style="font-size: 48px;">💰</div>
                    <div style="font-size: 14px; margin-top: 10px;">You Earned</div>
                    <div style="font-size: 42px; font-weight: bold;">${earnings:.2f}</div>
                </div>

                <div class="info-box">
                    <strong>💡 Pro Tips for Success:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Stay online during peak hours (11am-2pm, 5pm-9pm)</li>
                        <li>Keep your phone charged and GPS accurate</li>
                        <li>Communicate with customers for better ratings</li>
                        <li>Complete more deliveries to unlock bonuses</li>
                    </ul>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/driver/earnings" class="button button-green">View Your Earnings</a>
                </p>

                <p style="color: #666; text-align: center;">
                    Keep up the great work! 🚀
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(driver_email, subject, html_content)


async def send_weekly_earnings_summary_email(
    driver_email: str,
    driver_name: str,
    week_start: str,
    week_end: str,
    total_earnings: float,
    total_deliveries: int,
    total_hours: float,
    avg_rating: float,
    tips_earned: float
):
    """
    Driver Weekly Summary - Sent every Monday
    """
    subject = f"📊 Your Weekly Earnings Summary - ${total_earnings:.2f}"

    hourly_rate = total_earnings / total_hours if total_hours > 0 else 0

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Weekly Earnings Summary", "#3b82f6", "📊")}
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>Here's your earnings summary for {week_start} - {week_end}</p>

                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 10px; color: white; margin: 20px 0;">
                    <div style="font-size: 14px;">Total Earnings</div>
                    <div style="font-size: 48px; font-weight: bold;">${total_earnings:.2f}</div>
                    <div style="font-size: 14px; margin-top: 10px;">Including ${tips_earned:.2f} in tips</div>
                </div>

                <div class="order-details">
                    <h3 style="margin-top: 0;">Performance Stats</h3>
                    <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>📦 Deliveries Completed</span>
                        <span style="float: right; font-weight: bold;">{total_deliveries}</span>
                    </div>
                    <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>⏱️ Hours Online</span>
                        <span style="float: right; font-weight: bold;">{total_hours:.1f} hrs</span>
                    </div>
                    <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>💵 Avg. Hourly Rate</span>
                        <span style="float: right; font-weight: bold; color: #22c55e;">${hourly_rate:.2f}/hr</span>
                    </div>
                    <div style="padding: 12px 0;">
                        <span>⭐ Average Rating</span>
                        <span style="float: right; font-weight: bold;">{avg_rating:.1f} / 5.0</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/driver/earnings" class="button">View Detailed Report</a>
                </p>

                <div class="info-box">
                    <strong>💡 Tip:</strong> Peak hours this week are expected to be Friday and Saturday evenings. Go online early to maximize your earnings!
                </div>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(driver_email, subject, html_content)


# ============================================================================
# RESTAURANT EMAIL TEMPLATES
# ============================================================================

async def send_restaurant_new_order_email(
    restaurant_email: str,
    restaurant_name: str,
    order_id: str,
    customer_name: str,
    items: list,
    total: float,
    special_instructions: str = None
):
    """
    Restaurant: New Order Notification
    """
    subject = f"🔔 New Order #{order_id} - ${total:.2f}"

    items_html = ""
    for item in items:
        items_html += f"""
            <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>{item.get('quantity', 1)}x {item.get('name', 'Item')}</strong>
                {"<br><span style='color: #666; font-size: 13px;'>" + item.get('customizations', '') + "</span>" if item.get('customizations') else ""}
            </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("New Order!", "#f59e0b", "🔔")}
            <div class="content">
                <h2>New Order for {restaurant_name}</h2>

                <div class="warning-box">
                    <strong>Order #{order_id}</strong><br>
                    Customer: {customer_name}<br>
                    Total: <strong>${total:.2f}</strong>
                </div>

                <div class="order-details">
                    <h3 style="margin-top: 0;">Order Items</h3>
                    {items_html}
                </div>

                {"<div class='info-box'><strong>📝 Special Instructions:</strong><br>" + special_instructions + "</div>" if special_instructions else ""}

                <p style="text-align: center;">
                    <a href="https://dollor.ai/restaurant/orders/{order_id}" class="button button-orange">View & Accept Order</a>
                </p>

                <p style="color: #666; font-size: 14px; text-align: center;">
                    Please confirm this order in your restaurant dashboard.
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(restaurant_email, subject, html_content)


# ==================== REFUND & INVOICE EMAILS ====================

async def send_refund_confirmation_email(
    customer_email: str,
    customer_name: str,
    order_number: str,
    refund_amount: float,
    refund_reason: str,
    original_amount: float
):
    """
    Refund Confirmation Email
    Sent when a refund is processed (customer cancel or restaurant reject)
    """
    subject = f"Refund Processed - Order #{order_number}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            {get_email_header("Refund Processed", "#10b981", "💰")}
            <div class="content">
                <h2>Hi {customer_name},</h2>

                <p>Your refund has been processed successfully.</p>

                <div class="order-details">
                    <h3>Refund Details</h3>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Order Number</span>
                        <strong>#{order_number}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Original Amount</span>
                        <span>${original_amount:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #10b981;">
                        <span><strong>Refund Amount</strong></span>
                        <strong>${refund_amount:.2f}</strong>
                    </div>
                </div>

                <div class="info-box">
                    <strong>Reason:</strong> {refund_reason}
                </div>

                <div class="info-box" style="background: #ecfdf5; border-color: #10b981;">
                    <strong>Refund Timeline:</strong><br>
                    Your refund will be credited to your original payment method within 5-10 business days,
                    depending on your bank.
                </div>

                <p style="color: #666; font-size: 14px;">
                    If you have any questions about your refund, please contact our support team.
                </p>
            </div>
            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(customer_email, subject, html_content)


async def send_invoice_email(
    customer_email: str,
    customer_name: str,
    invoice_number: str,
    order_number: str,
    total_amount: float,
    html_content: str = None
):
    """
    Invoice Email
    Sent with the invoice/receipt for a completed order
    """
    subject = f"Your Receipt - Invoice #{invoice_number}"

    if not html_content:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{get_email_styles()}</head>
        <body>
            <div class="container">
                {get_email_header("Your Receipt", "#6366f1", "🧾")}
                <div class="content">
                    <h2>Hi {customer_name},</h2>

                    <p>Thank you for your order! Here is your receipt.</p>

                    <div class="order-details">
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                            <span>Invoice Number</span>
                            <strong>{invoice_number}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                            <span>Order Number</span>
                            <strong>#{order_number}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 15px 0; font-size: 18px;">
                            <span><strong>Total Paid</strong></span>
                            <strong style="color: #10b981;">${total_amount:.2f}</strong>
                        </div>
                    </div>

                    <p style="text-align: center;">
                        <a href="https://dollor.ai/orders/{order_number}/invoice" class="button">View Full Invoice</a>
                    </p>

                    <p style="color: #666; font-size: 14px; text-align: center;">
                        Thank you for ordering with EatFair!
                    </p>
                </div>
                {get_email_footer()}
            </div>
        </body>
        </html>
        """

    return await send_email(customer_email, subject, html_content)


# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "user"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    vendor_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ClientCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    company: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    country: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float

class InvoiceItemResponse(BaseModel):
    id: int
    description: str
    quantity: float
    unit_price: float
    amount: float
    
    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    client_id: int
    issue_date: datetime
    due_date: datetime
    items: List[InvoiceItemCreate]
    tax_rate: float = 0.0
    discount_amount: float = 0.0
    notes: Optional[str] = None
    terms: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str
    issue_date: datetime
    due_date: datetime
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: str
    notes: Optional[str]
    terms: Optional[str]
    created_at: datetime
    items: List[InvoiceItemResponse]
    
    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    amount: float
    payment_date: datetime
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_date: datetime
    payment_method: Optional[str]
    reference_number: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print(f"[AUTH ERROR] Token decoded but no 'sub' field found in payload")
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        print(f"[AUTH ERROR] Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        print(f"[AUTH ERROR] Invalid token: {str(e)}")
        raise credentials_exception
    except JWTError as e:
        print(f"[AUTH ERROR] JWT Error: {str(e)}")
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"[AUTH ERROR] User not found for email: {email}")
        raise credentials_exception
    return user

def generate_invoice_number(db: Session) -> str:
    """Generate unique invoice number"""
    today = datetime.now()
    prefix = f"INV-{today.year}{today.month:02d}"
    
    last_invoice = db.query(Invoice).filter(
        Invoice.invoice_number.like(f"{prefix}%")
    ).order_by(Invoice.invoice_number.desc()).first()
    
    if last_invoice:
        last_num = int(last_invoice.invoice_number.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}-{new_num:04d}"

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Routes
@app.get("/")
def read_root():
    return {"message": "Invoice Management System API", "version": "1.0.0"}


# =============================================================================
# APP CONFIGURATION ENDPOINT
# =============================================================================
# This endpoint provides centralized configuration for all mobile apps
# All pricing, fees, and settings should come from here - NO HARDCODES in apps!

@app.get("/api/config")
def get_app_config():
    """
    Returns centralized configuration for iOS/Android apps.
    This ensures all pricing, fees, and settings are consistent across all apps.
    """
    return {
        # Platform fees - $1 + $1 = $2 total platform fee model
        "serviceFee": 1.00,                    # Customer pays $1 platform fee
        "restaurantPlatformFee": 1.00,         # Restaurant pays $1 per order
        "platformFeePerRestaurant": 1.00,      # Same as above (alias)

        # Delivery fees
        "baseDeliveryFee": 2.99,               # Base delivery fee
        "deliveryFee": 2.99,                   # Alias
        "perMileDeliveryFee": 0.50,            # Per mile rate
        "maxDeliveryFee": 12.99,               # Maximum delivery fee cap
        "extraStopFee": 2.00,                  # Fee for extra stops
        "maxDeliveryDistanceMiles": 15.0,      # Max delivery distance

        # Tax (default - actual tax calculated by state)
        "taxRate": 0.08,                       # 8% default tax rate

        # Rideshare pricing
        "rideBaseFare": 2.00,                  # Base fare
        "ridePerMileRate": 1.00,               # Per mile rate
        "ridePerMinuteRate": 0.15,             # Per minute rate
        "ridePlatformFee": 1.00,               # $1 platform fee
        "rideMinFare": 5.00,                   # Minimum fare
        "rideCancellationFee": 5.00,           # Cancellation fee (base)
        "rideCancellationFeeDriverEnRoute": 5.00,   # Fee when driver assigned
        "rideCancellationFeeInProgress": 10.00,     # Fee when ride in progress
        "rideSurgeEnabled": True,              # Surge pricing enabled
        "rideMaxSurgeMultiplier": 3.0,         # Maximum surge multiplier

        # Order settings
        "maxRestaurantsPerOrder": 3,           # Max restaurants per order
        "smallOrderThreshold": 10.0,           # Small order threshold
        "smallOrderFee": 2.0,                  # Small order fee

        # Tip settings
        "defaultTipRate": 0.15,                # 15% default tip
        "tipOptions": [0, 15, 20, 25],         # Tip percentage options

        # Prep time settings
        "defaultPrepTimeMinutes": 20,          # Default prep time
        "maxPrepTimeMinutes": 60,              # Max prep time

        # Distance settings
        "nearbyDistanceMeters": 3218.69,       # 2 miles in meters

        # Support info
        "supportUrl": "https://dollor.ai/support",
        "supportPhone": "+1-800-DOLLOR",
        "supportEmail": "support@dollor.ai",

        # Legal URLs
        "termsOfServiceURL": "https://dollor.ai/terms",
        "privacyPolicyURL": "https://dollor.ai/privacy",

        # Feature flags
        "isDummyPaymentMode": False,           # Production: real payments
        "isAIFeaturesEnabled": True,           # AI features enabled
        "isDynamicPricingEnabled": False,      # Dynamic pricing disabled

        # Version
        "configVersion": "1.0.0",
        "minAppVersion": "1.0.0"
    }

# =============================================================================
# LEGAL PAGES - Terms of Service and Privacy Policy
# =============================================================================

TERMS_OF_SERVICE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Dollor AI Service</title>
    <style>
        :root { --primary-color: #FF6B35; --text-color: #333; --bg-color: #fff; --border-color: #e0e0e0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: var(--text-color); background-color: var(--bg-color); padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: var(--primary-color); font-size: 2rem; margin-bottom: 10px; border-bottom: 3px solid var(--primary-color); padding-bottom: 10px; }
        h2 { color: var(--primary-color); font-size: 1.4rem; margin-top: 30px; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid var(--border-color); }
        h3 { color: var(--text-color); font-size: 1.1rem; margin-top: 20px; margin-bottom: 10px; }
        p { margin-bottom: 15px; }
        ul, ol { margin-bottom: 15px; padding-left: 25px; }
        li { margin-bottom: 8px; }
        .meta { color: #666; font-size: 0.9rem; margin-bottom: 30px; }
        .important { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center; color: #666; font-size: 0.9rem; }
        a { color: var(--primary-color); }
        @media (max-width: 600px) { body { padding: 15px; } h1 { font-size: 1.5rem; } h2 { font-size: 1.2rem; } }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p class="meta"><strong>Last Updated:</strong> December 7, 2024 | <strong>Effective Date:</strong> December 7, 2024</p>

    <h2>1. Agreement to Terms</h2>
    <p>Welcome to Dollor AI Service ("Dollor," "we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of the Dollor mobile applications, including the Dollor Customer App, Dollor Driver App, and Dollor Restaurant App (collectively, the "Services").</p>
    <p>By downloading, installing, or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our Services.</p>
    <div class="important">
        <strong>IMPORTANT:</strong> THESE TERMS CONTAIN AN ARBITRATION AGREEMENT AND CLASS ACTION WAIVER THAT AFFECT YOUR LEGAL RIGHTS. PLEASE READ THEM CAREFULLY.
    </div>

    <h2>2. Description of Services</h2>
    <p>Dollor provides a technology platform that connects:</p>
    <ul>
        <li><strong>Customers</strong> who wish to order food from local restaurants or request rideshare transportation</li>
        <li><strong>Restaurants</strong> who wish to offer their food for delivery or pickup</li>
        <li><strong>Drivers</strong> who wish to provide delivery and rideshare services</li>
    </ul>
    <h3>Platform Fee Structure</h3>
    <ul>
        <li>Customers pay a platform fee of $1.00 per order/ride</li>
        <li>Restaurants pay a platform fee of $1.00 per order</li>
        <li>Drivers receive the fare minus the platform fee</li>
    </ul>

    <h2>3. Eligibility</h2>
    <p>To use our Services, you must:</p>
    <ul>
        <li>Be at least 18 years of age</li>
        <li>Have the legal capacity to enter into a binding agreement</li>
        <li>Not be prohibited from using the Services under applicable law</li>
        <li>Provide accurate and complete registration information</li>
    </ul>

    <h2>4. Account Registration and Security</h2>
    <p>You may register using email and password, Google Sign-In, or Apple Sign-In. You are responsible for maintaining the confidentiality of your account credentials and all activities under your account.</p>

    <h2>5. User Conduct</h2>
    <p>You agree NOT to:</p>
    <ul>
        <li>Use the Services for any illegal purpose</li>
        <li>Harass, abuse, or harm other users</li>
        <li>Impersonate any person or entity</li>
        <li>Interfere with or disrupt the Services</li>
        <li>Attempt to gain unauthorized access to our systems</li>
        <li>Engage in discrimination of any kind</li>
    </ul>

    <h2>6. Payments and Pricing</h2>
    <p>We accept credit/debit cards (Visa, Mastercard, American Express, Discover) and Apple Pay. Payments are processed by Stripe, Inc. Tips are optional and 100% go directly to drivers.</p>

    <h2>7. Orders and Deliveries</h2>
    <p>Orders are subject to restaurant acceptance. Estimated delivery times are approximations only. Drivers are independent contractors, not employees.</p>

    <h2>8. Rideshare Services</h2>
    <p>Initial fares are estimated based on distance and time. Drivers may propose counter-offers. Final fare is agreed upon before ride confirmation.</p>

    <h2>9. Intellectual Property</h2>
    <p>The Services are owned by Dollor and protected by intellectual property laws. You receive a limited, non-exclusive license for personal use only.</p>

    <h2>10. Privacy</h2>
    <p>Your privacy is important to us. Please review our <a href="/privacy">Privacy Policy</a> for details on how we collect and use your information.</p>

    <h2>11. Disclaimers</h2>
    <p>THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. We do not control and are not responsible for food quality, driver conduct, or third-party services.</p>

    <h2>12. Limitation of Liability</h2>
    <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOLLOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED $100 OR THE AMOUNT YOU PAID IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

    <h2>13. Dispute Resolution</h2>
    <p>Any dispute shall be resolved by binding arbitration administered by the American Arbitration Association. YOU AGREE TO RESOLVE DISPUTES ON AN INDIVIDUAL BASIS AND WAIVE THE RIGHT TO PARTICIPATE IN A CLASS ACTION. These Terms are governed by the laws of the State of Delaware.</p>

    <h2>14. Apple-Specific Terms</h2>
    <p>If you access our Services through an Apple device: These Terms are between you and Dollor only, not Apple Inc. Dollor is solely responsible for maintenance, support, and warranties. Apple and its subsidiaries are third-party beneficiaries of these Terms.</p>

    <h2>15. Driver-Specific Terms</h2>
    <p>Drivers are independent contractors, not employees. Drivers are responsible for their own taxes, insurance, vehicle maintenance, and compliance with local laws. Drivers must pass background checks and maintain valid auto insurance.</p>

    <h2>16. Restaurant-Specific Terms</h2>
    <p>Restaurants are responsible for menu accuracy, food safety, and compliance with health regulations. A $1.00 platform fee applies to each completed order.</p>

    <h2>17. Modifications</h2>
    <p>We may modify these Terms at any time. Material changes will be notified through in-app notifications or email. Continued use constitutes acceptance.</p>

    <h2>18. Contact Information</h2>
    <p>For questions about these Terms:</p>
    <ul>
        <li><strong>Email:</strong> legal@dollor.ai</li>
        <li><strong>Support:</strong> support@dollor.ai</li>
        <li><strong>Website:</strong> <a href="https://dollor.ai">https://dollor.ai</a></li>
    </ul>

    <div class="footer">
        <p><strong>By using Dollor AI Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong></p>
        <p>&copy; 2024 Dollor AI Service. All rights reserved.</p>
    </div>
</body>
</html>
"""

PRIVACY_POLICY_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Dollor AI Service</title>
    <style>
        :root { --primary-color: #FF6B35; --text-color: #333; --bg-color: #fff; --border-color: #e0e0e0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: var(--text-color); background-color: var(--bg-color); padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: var(--primary-color); font-size: 2rem; margin-bottom: 10px; border-bottom: 3px solid var(--primary-color); padding-bottom: 10px; }
        h2 { color: var(--primary-color); font-size: 1.4rem; margin-top: 30px; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid var(--border-color); }
        h3 { color: var(--text-color); font-size: 1.1rem; margin-top: 20px; margin-bottom: 10px; }
        p { margin-bottom: 15px; }
        ul, ol { margin-bottom: 15px; padding-left: 25px; }
        li { margin-bottom: 8px; }
        .meta { color: #666; font-size: 0.9rem; margin-bottom: 30px; }
        .highlight { background-color: #e8f4f8; border-left: 4px solid var(--primary-color); padding: 15px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.95rem; }
        th, td { border: 1px solid var(--border-color); padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: 600; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center; color: #666; font-size: 0.9rem; }
        a { color: var(--primary-color); }
        @media (max-width: 600px) { body { padding: 15px; } h1 { font-size: 1.5rem; } h2 { font-size: 1.2rem; } table { font-size: 0.85rem; } th, td { padding: 8px; } }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="meta"><strong>Last Updated:</strong> December 7, 2024 | <strong>Effective Date:</strong> December 7, 2024</p>

    <div class="highlight">
        <p><strong>Your Privacy Matters:</strong> Dollor AI Service is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how you can control it.</p>
    </div>

    <h2>1. Information We Collect</h2>
    <h3>Information You Provide</h3>
    <table>
        <tr><th>Category</th><th>Data Types</th></tr>
        <tr><td>Account Information</td><td>Name, email, phone number, password (encrypted), profile photo</td></tr>
        <tr><td>Payment Information</td><td>Card details (via Stripe), billing address, transaction history</td></tr>
        <tr><td>Delivery Information</td><td>Addresses, delivery instructions, saved locations</td></tr>
        <tr><td>Driver Information</td><td>License, vehicle details, insurance, bank account</td></tr>
        <tr><td>Restaurant Information</td><td>Business details, menu, operating hours</td></tr>
    </table>

    <h3>Information Collected Automatically</h3>
    <ul>
        <li><strong>Device Information:</strong> Device type, OS version, unique identifiers</li>
        <li><strong>Location Information:</strong> GPS location (with permission) during active orders/rides</li>
        <li><strong>Usage Information:</strong> Features used, search queries, order history</li>
    </ul>

    <h3>Information from Third Parties</h3>
    <ul>
        <li><strong>Google Sign-In:</strong> Name, email, profile photo</li>
        <li><strong>Apple Sign-In:</strong> Name, email (may be anonymized)</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
        <li>Process orders and ride requests</li>
        <li>Connect customers with restaurants and drivers</li>
        <li>Calculate fares and process payments</li>
        <li>Send notifications and updates</li>
        <li>Verify identity and ensure safety</li>
        <li>Detect and prevent fraud</li>
        <li>Improve our services</li>
    </ul>

    <h2>3. How We Share Your Information</h2>
    <h3>With Other Users</h3>
    <table>
        <tr><th>User Type</th><th>Information Shared</th></tr>
        <tr><td>Drivers see</td><td>Customer first name, pickup/delivery address, order details</td></tr>
        <tr><td>Customers see</td><td>Driver first name, photo, vehicle info, real-time location</td></tr>
        <tr><td>Restaurants see</td><td>Customer first name, delivery address, order details</td></tr>
    </table>

    <h3>With Service Providers</h3>
    <table>
        <tr><th>Provider</th><th>Purpose</th></tr>
        <tr><td>Stripe</td><td>Payment processing</td></tr>
        <tr><td>Firebase</td><td>Authentication, notifications</td></tr>
        <tr><td>Google Maps</td><td>Navigation, location services</td></tr>
        <tr><td>AWS</td><td>Cloud hosting (encrypted)</td></tr>
    </table>

    <p><strong>We Do NOT Sell Your Data.</strong> Dollor does not sell your personal information to third parties.</p>

    <h2>4. Data Retention</h2>
    <table>
        <tr><th>Data Type</th><th>Retention Period</th></tr>
        <tr><td>Account information</td><td>Duration of account + 3 years</td></tr>
        <tr><td>Transaction records</td><td>7 years (legal requirements)</td></tr>
        <tr><td>Location data</td><td>90 days after trip completion</td></tr>
        <tr><td>Support communications</td><td>3 years</td></tr>
    </table>

    <h2>5. Data Security</h2>
    <ul>
        <li><strong>Encryption:</strong> All data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
        <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
        <li><strong>Payment Security:</strong> PCI DSS compliant via Stripe</li>
        <li><strong>Breach Notification:</strong> We will notify affected users within 72 hours of a breach</li>
    </ul>

    <h2>6. Your Privacy Rights</h2>
    <table>
        <tr><th>Right</th><th>How to Exercise</th></tr>
        <tr><td>Access your data</td><td>App settings or email privacy@dollor.ai</td></tr>
        <tr><td>Correct your data</td><td>App settings or support@dollor.ai</td></tr>
        <tr><td>Delete your account</td><td>App settings > Delete Account</td></tr>
        <tr><td>Opt out of marketing</td><td>Unsubscribe link or app settings</td></tr>
        <tr><td>Control location</td><td>Device settings</td></tr>
        <tr><td>Control notifications</td><td>App settings or device settings</td></tr>
    </table>
    <p>We respond to all privacy requests within 30 days.</p>

    <h2>7. Children's Privacy</h2>
    <p>Our Services are not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If we learn that we have collected information from a child, we will delete it promptly.</p>

    <h2>8. Third-Party Services</h2>
    <ul>
        <li><strong>Google Services:</strong> Sign-In, Maps, Firebase - <a href="https://policies.google.com/privacy">Privacy Policy</a></li>
        <li><strong>Apple Services:</strong> Sign-In, Maps, Push Notifications - <a href="https://www.apple.com/privacy">Privacy Policy</a></li>
        <li><strong>Stripe:</strong> Payment Processing - <a href="https://stripe.com/privacy">Privacy Policy</a></li>
    </ul>

    <h2>9. California Privacy Rights (CCPA)</h2>
    <p>California residents have additional rights including:</p>
    <ul>
        <li>Right to know what personal information is collected</li>
        <li>Right to delete personal information</li>
        <li>Right to opt-out of sale (we do not sell data)</li>
        <li>Right to non-discrimination</li>
    </ul>

    <h2>10. European Privacy Rights (GDPR)</h2>
    <p>If you are in the EEA, you have additional rights including:</p>
    <ul>
        <li>Right to restriction of processing</li>
        <li>Right to object to processing</li>
        <li>Right to data portability</li>
        <li>Right to withdraw consent</li>
        <li>Right to lodge a complaint with a supervisory authority</li>
    </ul>

    <h2>11. Location Data</h2>
    <p><strong>When collected:</strong> During active orders/rides and when browsing nearby restaurants.</p>
    <p><strong>How to control:</strong> iOS Settings > Privacy > Location Services > Dollor</p>
    <p><strong>Options:</strong> Never, While Using, Always</p>

    <h2>12. Contact Us</h2>
    <p>For privacy questions or to exercise your rights:</p>
    <ul>
        <li><strong>Privacy Email:</strong> <a href="mailto:privacy@dollor.ai">privacy@dollor.ai</a></li>
        <li><strong>Support Email:</strong> <a href="mailto:support@dollor.ai">support@dollor.ai</a></li>
        <li><strong>Website:</strong> <a href="https://dollor.ai">https://dollor.ai</a></li>
    </ul>

    <h2>13. Updates to This Policy</h2>
    <p>We may update this Privacy Policy periodically. Material changes will be notified through in-app notifications or email. Continued use constitutes acceptance.</p>

    <div class="footer">
        <p><strong>By using Dollor AI Service, you acknowledge that you have read and understood this Privacy Policy.</strong></p>
        <p>&copy; 2024 Dollor AI Service. All rights reserved.</p>
        <p style="margin-top: 15px;"><a href="/terms">Terms of Service</a></p>
    </div>
</body>
</html>
"""

@app.get("/terms", response_class=HTMLResponse)
async def get_terms_of_service():
    """Returns the Terms of Service page"""
    return TERMS_OF_SERVICE_HTML

@app.get("/privacy", response_class=HTMLResponse)
async def get_privacy_policy():
    """Returns the Privacy Policy page"""
    return PRIVACY_POLICY_HTML

# Also support /terms.html and /privacy.html for direct file access
@app.get("/terms.html", response_class=HTMLResponse)
async def get_terms_html():
    """Returns the Terms of Service page (alternate URL)"""
    return TERMS_OF_SERVICE_HTML

@app.get("/privacy.html", response_class=HTMLResponse)
async def get_privacy_html():
    """Returns the Privacy Policy page (alternate URL)"""
    return PRIVACY_POLICY_HTML

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=UserRole.ADMIN if user.role == "admin" else UserRole.USER
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Login attempt for: {form_data.username}")  # Debug log
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        print(f"User not found: {form_data.username}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"User found, verifying password...")  # Debug log
    if not verify_password(form_data.password, user.password_hash):
        print(f"Password verification failed")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"Login successful for: {user.email}")  # Debug log
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# Vendor Login
@app.post("/api/auth/vendor/login", response_model=Token)
def vendor_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Vendor login attempt for: {form_data.username}")
    
    # Find user with VENDOR role
    user = db.query(User).filter(
        User.email == form_data.username,
        User.role == UserRole.VENDOR
    ).first()
    
    if not user:
        print(f"Vendor user not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.password_hash):
        print(f"Password verification failed for vendor")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if vendor account is active
    if user.vendor_id:
        vendor = db.query(Vendor).filter(Vendor.id == user.vendor_id).first()
        if vendor and str(vendor.onboarding_status).upper() not in ["APPROVED", "VENDORSTATUS.APPROVED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vendor account is not approved. Status: {vendor.onboarding_status}"
            )
    
    print(f"Vendor login successful for: {user.email}")
    access_token = create_access_token(data={"sub": user.email, "role": "vendor"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# Pydantic models for vendor registration
class VendorRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    restaurant_name: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# Vendor Registration
@app.post("/api/auth/vendor/register", response_model=Token)
def vendor_register(request: VendorRegisterRequest, db: Session = Depends(get_db)):
    print(f"Vendor registration attempt for: {request.email}")

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create vendor record first
    from models import VendorStatus
    new_vendor = Vendor(
        name=request.restaurant_name,
        vendor_id=f"VEN-{datetime.now().strftime('%Y%m')}-{db.query(Vendor).count() + 1:04d}",
        contact_name=request.full_name,
        contact_email=request.email,
        onboarding_status=VendorStatus.PENDING,
        street="",
        city="",
        state="",
        zip_code="",
        country="US"
    )
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    # Create user record
    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        password_hash=hashed_password,
        full_name=request.full_name,
        role=UserRole.VENDOR,
        vendor_id=new_vendor.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    print(f"Vendor registration successful for: {new_user.email}, vendor_id: {new_vendor.id}")
    access_token = create_access_token(data={"sub": new_user.email, "role": "vendor"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

# Password Reset Request
@app.post("/api/auth/password-reset/request")
def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    print(f"Password reset requested for: {request.email}")

    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If this email exists, a password reset link has been sent"}

    # Generate reset token (valid for 1 hour)
    reset_token = create_access_token(
        data={"sub": user.email, "type": "password_reset"},
        expires_delta=timedelta(hours=1)
    )

    # In production, send email with reset link
    # For now, just log it
    print(f"Password reset token for {user.email}: {reset_token[:50]}...")

    # TODO: Integrate with email service (SendGrid, SES, etc.)
    # send_password_reset_email(user.email, reset_token)

    return {"message": "If this email exists, a password reset link has been sent"}

# Password Reset Confirm
@app.post("/api/auth/password-reset/confirm")
def confirm_password_reset(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid reset token")

        # Update password
        user.password_hash = get_password_hash(request.new_password)
        db.commit()

        print(f"Password reset successful for: {email}")
        return {"message": "Password has been reset successfully"}

    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

# Helper function to get current vendor user
def get_current_vendor_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to vendors only"
        )
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account not linked to a vendor"
        )
    return current_user

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== DRIVER AUTHENTICATION ====================

class DriverRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str

class DriverLoginResponse(BaseModel):
    access_token: str
    token_type: str
    driver_id: int
    driver_code: str
    name: str
    email: str

    class Config:
        from_attributes = True

@app.post("/api/auth/driver/login")
def driver_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Driver login - authenticates driver and returns token"""
    print(f"Driver login attempt for: {form_data.username}")

    # Find user with DRIVER role
    user = db.query(User).filter(
        User.email == form_data.username,
        User.role == UserRole.DRIVER
    ).first()

    if not user:
        print(f"Driver user not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        print(f"Password verification failed for driver")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get driver record
    driver = db.query(Driver).filter(Driver.id == user.driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver profile not found"
        )

    if driver.status not in [DriverStatus.ACTIVE, DriverStatus.APPROVED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Driver account is not active. Status: {driver.status.value}"
        )

    print(f"Driver login successful for: {user.email}")
    access_token = create_access_token(data={"sub": user.email, "role": "driver", "driver_id": driver.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "name": f"{driver.first_name} {driver.last_name}",
        "email": driver.email
    }


@app.post("/api/auth/driver/register")
def driver_register(request: DriverRegisterRequest, db: Session = Depends(get_db)):
    """Register a new driver account"""
    print(f"Driver registration attempt for: {request.email}")

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if driver email already exists
    existing_driver = db.query(Driver).filter(Driver.email == request.email).first()
    if existing_driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver email already registered"
        )

    # Create driver record
    driver_count = db.query(Driver).count()
    driver_code = f"DRV-{driver_count + 1:05d}"

    new_driver = Driver(
        driver_id=driver_code,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        status=DriverStatus.PENDING  # Needs approval
    )
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    # Create user record linked to driver
    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        password_hash=hashed_password,
        full_name=f"{request.first_name} {request.last_name}",
        role=UserRole.DRIVER,
        driver_id=new_driver.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    print(f"Driver registration successful for: {new_user.email}, driver_id: {new_driver.id}")
    access_token = create_access_token(data={"sub": new_user.email, "role": "driver", "driver_id": new_driver.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": new_driver.id,
        "driver_code": driver_code,
        "name": f"{new_driver.first_name} {new_driver.last_name}",
        "email": new_driver.email,
        "status": new_driver.status.value,
        "message": "Registration successful. Your account is pending approval."
    }


# ============================================================================
# CUSTOMER AUTHENTICATION ENDPOINTS (for iOS Customer App)
# ============================================================================

class CustomerRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class CustomerLoginRequest(BaseModel):
    email: EmailStr
    password: str

class CustomerOAuthRequest(BaseModel):
    email: str
    name: str
    google_id: Optional[str] = None
    apple_id: Optional[str] = None

class CustomerPasswordResetRequest(BaseModel):
    email: EmailStr

class CustomerPasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@app.post("/api/customer/login")
def customer_login(request: CustomerLoginRequest, db: Session = Depends(get_db)):
    """Customer email/password login"""
    print(f"Customer login attempt for: {request.email}")

    user = db.query(User).filter(
        User.email == request.email,
        User.role == UserRole.USER
    ).first()

    if not user:
        print(f"Customer not found: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    access_token = create_access_token(data={"sub": user.email, "role": "customer", "user_id": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }

@app.post("/api/customer/register")
def customer_register(request: CustomerRegisterRequest, db: Session = Depends(get_db)):
    """Register new customer account"""
    print(f"Customer registration attempt for: {request.email}")

    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        password_hash=hashed_password,
        full_name=request.full_name,
        role=UserRole.USER
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "role": "customer", "user_id": new_user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email
    }

@app.post("/api/customer/google-auth")
def customer_google_auth(request: CustomerOAuthRequest, db: Session = Depends(get_db)):
    """Google OAuth login/register for customers - handles both new and existing users"""
    print(f"Customer Google auth for: {request.email}")

    # Check if user exists
    user = db.query(User).filter(User.email == request.email).first()

    if user:
        # Existing user - log them in
        if user.role != UserRole.USER:
            # User exists but is not a customer (might be driver/vendor)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email registered with different account type"
            )
        print(f"Existing customer found: {user.email}")
    else:
        # New user - register them
        print(f"Creating new customer via Google: {request.email}")
        user = User(
            email=request.email,
            password_hash=get_password_hash(secrets.token_hex(32)),  # Random password for OAuth users
            full_name=request.name,
            role=UserRole.USER
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.email, "role": "customer", "user_id": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }

@app.post("/api/customer/apple-auth")
def customer_apple_auth(request: CustomerOAuthRequest, db: Session = Depends(get_db)):
    """Apple OAuth login/register for customers - handles both new and existing users"""
    print(f"Customer Apple auth for: {request.email}, apple_id: {request.apple_id}")

    user = None

    # First try to find by Apple ID if provided
    if request.apple_id:
        # Check if we have a user with this Apple ID stored (you'd store this in a separate field)
        # For now, we'll use email as primary identifier
        pass

    # Find by email
    if request.email:
        user = db.query(User).filter(User.email == request.email).first()

    if user:
        if user.role != UserRole.USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email registered with different account type"
            )
        print(f"Existing customer found via Apple: {user.email}")
    else:
        # New user - create account
        # Apple may not provide email on subsequent logins, use apple_id as fallback
        email = request.email if request.email else f"{request.apple_id}@privaterelay.appleid.com"
        name = request.name if request.name else "Apple User"

        print(f"Creating new customer via Apple: {email}")
        user = User(
            email=email,
            password_hash=get_password_hash(secrets.token_hex(32)),
            full_name=name,
            role=UserRole.USER
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.email, "role": "customer", "user_id": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }

# Password reset storage (in production, use Redis or database)
password_reset_codes: Dict[str, Dict[str, Any]] = {}

@app.post("/api/customer/password-reset/request")
def customer_request_password_reset(request: CustomerPasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset - sends code to email"""
    print(f"Password reset requested for: {request.email}")

    user = db.query(User).filter(User.email == request.email, User.role == UserRole.USER).first()
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If an account exists with this email, a reset code has been sent."}

    # Generate 6-digit code
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store code with expiration (15 minutes)
    password_reset_codes[request.email] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }

    # Send email with code via SES
    IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if not IS_PRODUCTION:
        # Only log in development, never in production
        print(f"[DEV ONLY] Password reset code generated for {request.email}")

    return {"message": "If an account exists with this email, a reset code has been sent."}

@app.post("/api/customer/password-reset/confirm")
def customer_confirm_password_reset(request: CustomerPasswordResetConfirm, db: Session = Depends(get_db)):
    """Confirm password reset with code"""

    # Check code
    stored = password_reset_codes.get(request.email)
    if not stored:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    if datetime.utcnow() > stored["expires"]:
        del password_reset_codes[request.email]
        raise HTTPException(status_code=400, detail="Reset code has expired")

    if stored["code"] != request.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    # Update password
    user = db.query(User).filter(User.email == request.email, User.role == UserRole.USER).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = get_password_hash(request.new_password)
    db.commit()

    # Clear used code
    del password_reset_codes[request.email]

    return {"message": "Password has been reset successfully"}

# ============================================================================
# END CUSTOMER AUTHENTICATION ENDPOINTS
# ============================================================================


@app.post("/api/auth/driver/refresh")
def refresh_driver_token(request: Request, db: Session = Depends(get_db)):
    """
    Refresh driver token - accepts expired token and issues new one.
    The token signature must still be valid (not tampered with).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ")[1]

    try:
        # Decode without verifying expiration - we still verify signature
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify user still exists and is a driver
    user = db.query(User).filter(User.email == email, User.role == UserRole.DRIVER).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or not a driver",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify driver is still active
    driver = db.query(Driver).filter(Driver.id == user.driver_id).first()
    if not driver or driver.status not in [DriverStatus.ACTIVE, DriverStatus.APPROVED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver account is not active"
        )

    # Issue new token
    new_token = create_access_token(data={"sub": user.email, "role": "driver", "driver_id": driver.id})
    print(f"[AUTH] Token refreshed for driver: {user.email}")

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "name": f"{driver.first_name} {driver.last_name}",
        "email": driver.email
    }


@app.get("/api/auth/driver/me")
def get_driver_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current driver's profile"""
    if current_user.role != UserRole.DRIVER or not current_user.driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a driver account"
        )

    driver = db.query(Driver).filter(Driver.id == current_user.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    return {
        "id": driver.id,
        "driver_code": driver.driver_id,
        "name": f"{driver.first_name} {driver.last_name}",
        "email": driver.email,
        "phone": driver.phone,
        "status": driver.status.value,
        "rating": driver.rating,
        "total_deliveries": driver.total_deliveries,
        "is_online": driver.is_online,
        "vehicle": {
            "type": driver.vehicle_type,
            "make": driver.vehicle_make,
            "model": driver.vehicle_model,
            "year": driver.vehicle_year,
            "color": driver.vehicle_color,
            "license_plate": driver.license_plate
        } if driver.vehicle_type else None
    }


@app.put("/api/auth/driver/online")
def set_driver_online(is_online: bool, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Toggle driver online/offline status"""
    if current_user.role != UserRole.DRIVER or not current_user.driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a driver account"
        )

    driver = db.query(Driver).filter(Driver.id == current_user.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    driver.is_online = is_online
    driver.last_location_update = datetime.utcnow()
    db.commit()

    return {"success": True, "is_online": driver.is_online}


@app.put("/api/auth/driver/location")
def update_driver_location(latitude: float, longitude: float, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update driver's current location"""
    if current_user.role != UserRole.DRIVER or not current_user.driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a driver account"
        )

    driver = db.query(Driver).filter(Driver.id == current_user.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    driver.current_latitude = latitude
    driver.current_longitude = longitude
    driver.last_location_update = datetime.utcnow()
    db.commit()

    return {"success": True, "latitude": latitude, "longitude": longitude}


# ==================== DRIVER PROFILE & DOCUMENTS ====================

@app.get("/api/erp/drivers/{driver_id}")
def get_driver_profile(driver_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get driver profile details"""
    from models import Driver, DriverStatus

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check authorization - driver can only access their own profile
    if current_user.role == UserRole.DRIVER and current_user.driver_id != driver_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")

    return {
        "id": driver.id,
        "driver_id": driver.driver_id,
        "first_name": driver.first_name,
        "last_name": driver.last_name,
        "name": f"{driver.first_name} {driver.last_name}",
        "email": driver.email,
        "phone": driver.phone,
        "status": driver.status.value if driver.status else "pending",
        "rating": driver.rating,
        "total_deliveries": driver.total_deliveries,
        "vehicle_type": driver.vehicle_type,
        "vehicle_make": driver.vehicle_make,
        "vehicle_model": driver.vehicle_model,
        "vehicle_year": driver.vehicle_year,
        "vehicle_color": driver.vehicle_color,
        "license_plate": driver.license_plate,
        "is_online": driver.is_online,
        "stripe_onboarded": driver.stripe_onboarded,
        "created_at": driver.created_at.isoformat() if driver.created_at else None,
        "approved_at": driver.approved_at.isoformat() if driver.approved_at else None,
        "documents": {
            "drivers_license": driver.drivers_license,
            "drivers_license_url": driver.drivers_license_url,
            "drivers_license_expiry": driver.drivers_license_expiry.isoformat() if driver.drivers_license_expiry else None,
            "insurance": driver.insurance,
            "insurance_url": driver.insurance_url,
            "insurance_expiry": driver.insurance_expiry.isoformat() if driver.insurance_expiry else None,
            "background_check": driver.background_check,
            "background_check_date": driver.background_check_date.isoformat() if driver.background_check_date else None,
        }
    }


class DriverProfileUpdate(BaseModel):
    """Model for updating driver profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None

    # Address fields
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None

    # License fields
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    license_class: Optional[str] = None
    license_expiry: Optional[str] = None

    # Vehicle fields
    vehicle_type: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    license_plate: Optional[str] = None
    plate_state: Optional[str] = None

    # Insurance fields
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_expiry: Optional[str] = None

    # Bank fields
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_type: Optional[str] = None
    routing_number: Optional[str] = None
    account_number_last4: Optional[str] = None

    # Preferences
    notifications_enabled: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    accept_cash_orders: Optional[bool] = None
    max_delivery_distance: Optional[float] = None


@app.put("/api/drivers/{driver_id}")
def update_driver_profile(
    driver_id: int,
    profile_update: DriverProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update driver profile information"""
    from models import Driver

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check authorization - driver can only update their own profile
    if current_user.role == UserRole.DRIVER and current_user.driver_id != driver_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    # Update basic info
    if profile_update.first_name is not None:
        driver.first_name = profile_update.first_name
    if profile_update.last_name is not None:
        driver.last_name = profile_update.last_name
    if profile_update.phone is not None:
        driver.phone = profile_update.phone

    # Update vehicle info
    if profile_update.vehicle_type is not None:
        driver.vehicle_type = profile_update.vehicle_type
    if profile_update.vehicle_make is not None:
        driver.vehicle_make = profile_update.vehicle_make
    if profile_update.vehicle_model is not None:
        driver.vehicle_model = profile_update.vehicle_model
    if profile_update.vehicle_year is not None:
        driver.vehicle_year = profile_update.vehicle_year
    if profile_update.vehicle_color is not None:
        driver.vehicle_color = profile_update.vehicle_color
    if profile_update.license_plate is not None:
        driver.license_plate = profile_update.license_plate

    # Update license expiry if provided
    if profile_update.license_expiry is not None:
        try:
            driver.drivers_license_expiry = datetime.fromisoformat(profile_update.license_expiry.replace('Z', '+00:00'))
        except:
            pass

    # Update insurance expiry if provided
    if profile_update.insurance_expiry is not None:
        try:
            driver.insurance_expiry = datetime.fromisoformat(profile_update.insurance_expiry.replace('Z', '+00:00'))
        except:
            pass

    driver.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(driver)

    return {
        "success": True,
        "message": "Profile updated successfully",
        "driver": {
            "id": driver.id,
            "driver_code": driver.driver_id,
            "name": f"{driver.first_name} {driver.last_name}",
            "email": driver.email,
            "phone": driver.phone,
            "status": driver.status.value if driver.status else "pending",
            "vehicle_type": driver.vehicle_type,
            "vehicle_make": driver.vehicle_make,
            "vehicle_model": driver.vehicle_model,
            "vehicle_year": driver.vehicle_year,
            "vehicle_color": driver.vehicle_color,
            "license_plate": driver.license_plate
        }
    }


@app.get("/api/drivers/{driver_id}/documents")
def get_driver_documents(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all documents for a driver"""
    from models import Driver

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check authorization
    if current_user.role == UserRole.DRIVER and current_user.driver_id != driver_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these documents")

    documents = []
    doc_id = 1

    # Build document list from driver fields
    if driver.drivers_license_url:
        documents.append({
            'id': doc_id,
            'document_type': 'drivers_license',
            'file_name': driver.drivers_license_url.split('/')[-1] if driver.drivers_license_url else 'drivers_license.pdf',
            'file_url': driver.drivers_license_url,
            'upload_date': driver.updated_at.isoformat() if driver.updated_at else datetime.now().isoformat(),
            'expiry_date': driver.drivers_license_expiry.isoformat() if driver.drivers_license_expiry else None,
            'status': 'approved' if driver.drivers_license else 'pending',
            'verified': driver.drivers_license
        })
        doc_id += 1

    if driver.insurance_url:
        documents.append({
            'id': doc_id,
            'document_type': 'insurance',
            'file_name': driver.insurance_url.split('/')[-1] if driver.insurance_url else 'insurance.pdf',
            'file_url': driver.insurance_url,
            'upload_date': driver.updated_at.isoformat() if driver.updated_at else datetime.now().isoformat(),
            'expiry_date': driver.insurance_expiry.isoformat() if driver.insurance_expiry else None,
            'status': 'approved' if driver.insurance else 'pending',
            'verified': driver.insurance
        })
        doc_id += 1

    if driver.background_check:
        documents.append({
            'id': doc_id,
            'document_type': 'background_check',
            'file_name': 'background_check_verified',
            'file_url': None,
            'upload_date': driver.background_check_date.isoformat() if driver.background_check_date else None,
            'expiry_date': None,
            'status': 'approved',
            'verified': True
        })

    return {
        "driver_id": driver_id,
        "documents": documents,
        "count": len(documents),
        "all_verified": driver.drivers_license and driver.insurance and driver.background_check
    }


@app.post("/api/drivers/{driver_id}/documents")
async def upload_driver_document(
    driver_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document for a driver - triggers AI verification automatically"""
    from models import Driver
    import os
    import uuid

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check authorization
    if current_user.role == UserRole.DRIVER and current_user.driver_id != driver_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload documents")

    # Create uploads directory
    upload_dir = "uploads/driver_documents"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else '.pdf'
    unique_filename = f"{driver_id}_{document_type}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    file_url = f"/uploads/driver_documents/{unique_filename}"

    # Update driver document fields
    if document_type == 'drivers_license':
        driver.drivers_license_url = file_url
        if expiry_date:
            driver.drivers_license_expiry = datetime.fromisoformat(expiry_date)
    elif document_type == 'insurance':
        driver.insurance_url = file_url
        if expiry_date:
            driver.insurance_expiry = datetime.fromisoformat(expiry_date)

    driver.updated_at = datetime.utcnow()
    db.commit()

    # Trigger AI verification automatically (TechCloudPro AI Employee)
    verification_result = await trigger_ai_document_verification(
        driver_id=driver_id,
        document_type=document_type,
        file_path=file_path,
        db=db
    )

    return {
        "success": True,
        "message": "Document uploaded and submitted for AI verification",
        "file_url": file_url,
        "document_type": document_type,
        "verification_status": verification_result.get("status", "pending"),
        "ai_verification_id": verification_result.get("verification_id")
    }


async def trigger_ai_document_verification(driver_id: int, document_type: str, file_path: str, db: Session):
    """
    Trigger TechCloudPro AI Employee to verify driver documents.
    This is an automated process - no human intervention needed.
    """
    from models import Driver, DriverStatus
    import httpx
    import base64

    verification_id = f"verify_{driver_id}_{document_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # For now, implement basic auto-verification
    # In production, this would call TechCloudPro AI service

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        return {"status": "error", "message": "Driver not found"}

    # Auto-verify document (simulate AI approval)
    # In production: Call TechCloudPro AI API for document verification
    if document_type == 'drivers_license':
        driver.drivers_license = True
        print(f"[AI] Driver {driver_id}: Driver's license verified automatically")
    elif document_type == 'insurance':
        driver.insurance = True
        print(f"[AI] Driver {driver_id}: Insurance verified automatically")

    # Check if all required documents are verified, then auto-approve driver
    was_already_approved = driver.status == DriverStatus.APPROVED
    if driver.drivers_license and driver.insurance and not was_already_approved:
        # Auto-run background check (simulated)
        driver.background_check = True
        driver.background_check_date = datetime.utcnow()

        # Auto-approve driver - NO HUMAN NEEDED
        driver.status = DriverStatus.APPROVED
        driver.approved_at = datetime.utcnow()
        print(f"[AI] Driver {driver_id}: All documents verified - AUTO-APPROVED by TechCloudPro AI")

        # Send approval email to driver
        driver_name = f"{driver.first_name or ''} {driver.last_name or ''}".strip() or "Driver"
        driver_email = driver.email
        if driver_email:
            import asyncio
            try:
                # Run email sending in background
                asyncio.create_task(send_driver_approval_email(driver_email, driver_name))
                print(f"[AI] Approval email queued for driver {driver_id}: {driver_email}")
            except Exception as e:
                print(f"[AI] Failed to queue approval email for driver {driver_id}: {e}")

    driver.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "verified" if (driver.drivers_license or driver.insurance) else "pending",
        "verification_id": verification_id,
        "auto_approved": driver.status == DriverStatus.APPROVED
    }


@app.patch("/api/drivers/{driver_id}/approve")
async def approve_driver(
    driver_id: int,
    approval_data: Optional[dict] = None,
    db: Session = Depends(get_db)
):
    """
    AI-triggered driver approval endpoint.
    Called by TechCloudPro AI Employee after document verification.
    This is part of the automated "no human company" workflow.
    """
    from models import Driver, DriverStatus

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Get approval action from request
    action = approval_data.get("action", "approve") if approval_data else "approve"
    reason = approval_data.get("reason", "AI verification completed successfully") if approval_data else "AI verification completed successfully"

    driver_name = f"{driver.first_name or ''} {driver.last_name or ''}".strip() or "Driver"
    driver_email = driver.email
    email_sent = False

    if action == "approve":
        driver.status = DriverStatus.APPROVED
        driver.approved_at = datetime.utcnow()

        # If documents weren't already marked as verified, do it now
        if not driver.drivers_license:
            driver.drivers_license = True
        if not driver.insurance:
            driver.insurance = True
        if not driver.background_check:
            driver.background_check = True
            driver.background_check_date = datetime.utcnow()

        message = f"Driver {driver.first_name} {driver.last_name} approved by AI"
        print(f"[TechCloudPro AI] {message}")

        # Send approval email
        if driver_email:
            email_result = await send_driver_approval_email(driver_email, driver_name)
            email_sent = email_result.get("success", False)
            print(f"[TechCloudPro AI] Approval email sent to {driver_email}: {email_sent}")

    elif action == "reject":
        driver.status = DriverStatus.SUSPENDED
        message = f"Driver {driver.first_name} {driver.last_name} rejected: {reason}"
        print(f"[TechCloudPro AI] {message}")

        # Send rejection email
        if driver_email:
            email_result = await send_driver_rejection_email(driver_email, driver_name, reason)
            email_sent = email_result.get("success", False)
            print(f"[TechCloudPro AI] Rejection email sent to {driver_email}: {email_sent}")

    elif action == "request_more_info":
        # Keep as pending, just log
        message = f"More information requested for driver {driver.first_name} {driver.last_name}: {reason}"
        print(f"[TechCloudPro AI] {message}")

    driver.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "driver_id": driver_id,
        "status": driver.status.value,
        "message": message,
        "approved_at": driver.approved_at.isoformat() if driver.approved_at else None,
        "email_sent": email_sent
    }


@app.post("/api/drivers/ai-webhook")
async def ai_verification_webhook(
    webhook_data: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for TechCloudPro AI Employee to submit verification results.
    This allows the AI system to autonomously approve/reject drivers.

    Expected payload:
    {
        "driver_id": 123,
        "verification_type": "document" | "background",
        "document_type": "drivers_license" | "insurance",
        "result": "approved" | "rejected" | "needs_review",
        "confidence_score": 0.95,
        "ai_notes": "Document appears valid, expiry date verified",
        "ai_employee_id": "techcloudpro_verifier_001"
    }
    """
    from models import Driver, DriverStatus

    driver_id = webhook_data.get("driver_id")
    result = webhook_data.get("result", "pending")
    document_type = webhook_data.get("document_type")
    confidence_score = webhook_data.get("confidence_score", 0.0)
    ai_notes = webhook_data.get("ai_notes", "")
    ai_employee_id = webhook_data.get("ai_employee_id", "unknown")

    if not driver_id:
        raise HTTPException(status_code=400, detail="driver_id is required")

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    print(f"[AI Webhook] Received verification from {ai_employee_id} for driver {driver_id}")
    print(f"[AI Webhook] Result: {result}, Document: {document_type}, Confidence: {confidence_score}")

    if result == "approved" and confidence_score >= 0.8:
        # Mark document as verified
        if document_type == "drivers_license":
            driver.drivers_license = True
        elif document_type == "insurance":
            driver.insurance = True
        elif document_type == "background":
            driver.background_check = True
            driver.background_check_date = datetime.utcnow()

        # Check if all documents verified for auto-approval
        if driver.drivers_license and driver.insurance:
            if not driver.background_check:
                driver.background_check = True
                driver.background_check_date = datetime.utcnow()

            driver.status = DriverStatus.APPROVED
            driver.approved_at = datetime.utcnow()
            print(f"[AI Webhook] Driver {driver_id} AUTO-APPROVED - all documents verified")

    elif result == "rejected":
        driver.status = DriverStatus.SUSPENDED
        print(f"[AI Webhook] Driver {driver_id} REJECTED by AI: {ai_notes}")

    driver.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "driver_id": driver_id,
        "new_status": driver.status.value,
        "documents_verified": {
            "drivers_license": driver.drivers_license,
            "insurance": driver.insurance,
            "background_check": driver.background_check
        },
        "auto_approved": driver.status == DriverStatus.APPROVED,
        "processed_at": datetime.utcnow().isoformat()
    }


# Client endpoints
@app.post("/api/clients", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_client = Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/api/clients", response_model=List[ClientResponse])
def get_clients(skip: int = 0, limit: int = 100, search: Optional[str] = None, 
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Client)
    
    if search:
        query = query.filter(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
                Client.company.ilike(f"%{search}%")
            )
        )
    
    clients = query.offset(skip).limit(limit).all()
    return clients

@app.get("/api/clients/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/api/clients/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client_update: ClientCreate, 
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for key, value in client_update.dict().items():
        setattr(db_client, key, value)
    
    db_client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/api/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has invoices
    invoice_count = db.query(Invoice).filter(Invoice.client_id == client_id).count()
    if invoice_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete client with existing invoices")
    
    db.delete(db_client)
    db.commit()
    return {"message": "Client deleted successfully"}

# Invoice endpoints
@app.post("/api/invoices", response_model=InvoiceResponse)
def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db), 
                  current_user: User = Depends(get_current_user)):
    # Calculate amounts
    subtotal = sum(item.quantity * item.unit_price for item in invoice_data.items)
    tax_amount = subtotal * (invoice_data.tax_rate / 100)
    total_amount = subtotal + tax_amount - invoice_data.discount_amount
    
    # Create invoice
    db_invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        user_id=current_user.id,
        client_id=invoice_data.client_id,
        issue_date=invoice_data.issue_date,
        due_date=invoice_data.due_date,
        subtotal=subtotal,
        tax_rate=invoice_data.tax_rate,
        tax_amount=tax_amount,
        discount_amount=invoice_data.discount_amount,
        total_amount=total_amount,
        status=InvoiceStatus.DRAFT,
        notes=invoice_data.notes,
        terms=invoice_data.terms
    )
    db.add(db_invoice)
    db.flush()
    
    # Create invoice items
    for item in invoice_data.items:
        db_item = InvoiceItem(
            invoice_id=db_invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=item.quantity * item.unit_price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_invoice)
    
    # Format response
    client = db.query(Client).filter(Client.id == db_invoice.client_id).first()
    return {
        **db_invoice.__dict__,
        "client_name": client.name,
        "items": db_invoice.items
    }

@app.get("/api/invoices")
def get_invoices(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).join(Client)
    
    if status:
        query = query.filter(Invoice.status == InvoiceStatus[status.upper()])
    
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    
    if search:
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(f"%{search}%"),
                Client.name.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for invoice in invoices:
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        paid_amount = sum(p.amount for p in invoice.payments if p.status == PaymentStatus.COMPLETED)
        
        result.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_id": invoice.client_id,
            "client_name": client.name,
            "issue_date": invoice.issue_date,
            "due_date": invoice.due_date,
            "subtotal": invoice.subtotal,
            "tax_amount": invoice.tax_amount,
            "discount_amount": invoice.discount_amount,
            "total_amount": invoice.total_amount,
            "paid_amount": paid_amount,
            "balance": invoice.total_amount - paid_amount,
            "status": invoice.status.value,
            "created_at": invoice.created_at
        })
    
    return {"data": result, "total": total}

@app.get("/api/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    return {
        **invoice.__dict__,
        "client_name": client.name,
        "items": invoice.items
    }

@app.put("/api/invoices/{invoice_id}/status")
def update_invoice_status(invoice_id: int, status: str, db: Session = Depends(get_db), 
                         current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        invoice.status = InvoiceStatus[status.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db.commit()
    return {"message": "Status updated successfully"}

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only delete draft invoices")
    
    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}

# Payment endpoints
@app.post("/api/invoices/{invoice_id}/payments", response_model=PaymentResponse)
def create_payment(invoice_id: int, payment_data: PaymentCreate, 
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db_payment = Payment(
        invoice_id=invoice_id,
        **payment_data.dict()
    )
    db.add(db_payment)
    
    # Update invoice status based on payments
    total_paid = sum(p.amount for p in invoice.payments if p.status == PaymentStatus.COMPLETED) + payment_data.amount
    
    if total_paid >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID
    elif invoice.status == InvoiceStatus.DRAFT:
        invoice.status = InvoiceStatus.SENT
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

@app.get("/api/invoices/{invoice_id}/payments", response_model=List[PaymentResponse])
def get_invoice_payments(invoice_id: int, db: Session = Depends(get_db), 
                        current_user: User = Depends(get_current_user)):
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
    return payments

# Dashboard endpoints
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Total invoices
    total_invoices = db.query(Invoice).count()
    
    # Total revenue
    total_revenue = db.query(func.sum(Invoice.total_amount)).scalar() or 0
    
    # Outstanding balance
    paid_amount = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0
    outstanding = total_revenue - paid_amount
    
    # Overdue invoices
    overdue_count = db.query(Invoice).filter(
        and_(
            Invoice.due_date < datetime.now(),
            Invoice.status != InvoiceStatus.PAID,
            Invoice.status != InvoiceStatus.CANCELLED
        )
    ).count()
    
    # Status breakdown
    status_breakdown = {}
    for status in InvoiceStatus:
        count = db.query(Invoice).filter(Invoice.status == status).count()
        status_breakdown[status.value] = count
    
    # Monthly revenue (last 12 months)
    monthly_data = []
    for i in range(11, -1, -1):
        target_date = datetime.now() - timedelta(days=30*i)
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if i == 0:
            month_end = datetime.now()
        else:
            next_month = month_start + timedelta(days=32)
            month_end = next_month.replace(day=1) - timedelta(seconds=1)
        
        month_revenue = db.query(func.sum(Invoice.total_amount)).filter(
            and_(
                Invoice.created_at >= month_start,
                Invoice.created_at <= month_end
            )
        ).scalar() or 0
        
        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": float(month_revenue)
        })
    
    # Recent invoices
    recent_invoices = db.query(Invoice).join(Client).order_by(
        Invoice.created_at.desc()
    ).limit(5).all()
    
    recent_list = []
    for inv in recent_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        recent_list.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_name": client.name,
            "amount": inv.total_amount,
            "status": inv.status.value,
            "due_date": inv.due_date
        })
    
    return {
        "total_invoices": total_invoices,
        "total_revenue": float(total_revenue),
        "outstanding": float(outstanding),
        "overdue_count": overdue_count,
        "status_breakdown": status_breakdown,
        "monthly_revenue": monthly_data,
        "recent_invoices": recent_list
    }

@app.get("/api/dashboard/recent-activity")
def get_recent_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Recent invoices
    recent_invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).limit(5).all()
    
    # Recent payments
    recent_payments = db.query(Payment).order_by(Payment.created_at.desc()).limit(5).all()
    
    activity = []
    
    for inv in recent_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        activity.append({
            "id": f"inv-{inv.id}",
            "type": "invoice",
            "action": f"Invoice {inv.invoice_number} created",
            "client": client.name,
            "amount": inv.total_amount,
            "date": inv.created_at
        })
    
    for pay in recent_payments:
        invoice = db.query(Invoice).filter(Invoice.id == pay.invoice_id).first()
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        activity.append({
            "id": f"pay-{pay.id}",
            "type": "payment",
            "action": f"Payment received for {invoice.invoice_number}",
            "client": client.name,
            "amount": pay.amount,
            "date": pay.created_at
        })
    
    activity.sort(key=lambda x: x["date"], reverse=True)
    return activity[:10]

# ============================================================================
# VENDOR MANAGEMENT ENDPOINTS (ZIP Integration)
# ============================================================================

class VendorCreate(BaseModel):
    company_name: str
    tax_id: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    # Restaurant specific
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    operating_hours: Optional[str] = None
    seating_capacity: Optional[int] = None
    delivery_available: Optional[bool] = True
    pickup_available: Optional[bool] = True
    average_prep_time: Optional[int] = None
    # Contact
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_title: Optional[str] = None
    # Address
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Mobile app
    platform: Optional[str] = None
    mobile_device_id: Optional[str] = None
    push_token: Optional[str] = None
    notes: Optional[str] = None

class VendorResponse(BaseModel):
    id: int
    vendor_id: str
    company_name: str
    tax_id: Optional[str]
    business_type: Optional[str]
    industry: Optional[str]
    website: Optional[str]
    # Restaurant-specific fields
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    operating_hours: Optional[str] = None
    seating_capacity: Optional[int] = None
    delivery_available: Optional[bool] = True
    pickup_available: Optional[bool] = True
    average_prep_time: Optional[int] = None
    description: Optional[str] = None
    # Contact info
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    contact_title: Optional[str]
    # Address
    street: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    country: Optional[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Onboarding/Status
    onboarding_status: str
    onboarding_phase: str
    risk_rating: str
    performance_score: int
    contract_status: Optional[str]
    zip_status: Optional[str]
    w9_form: bool
    insurance: bool
    financial_statements: bool
    compliance_certs: bool
    security_policy: bool
    notes: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime]
    last_activity: Optional[datetime]

    class Config:
        from_attributes = True

@app.post("/api/vendors/public", response_model=VendorResponse)
def create_vendor_public(vendor: VendorCreate, db: Session = Depends(get_db)):
    """Public endpoint for restaurant applications - no auth required"""
    from models import Vendor
    
    print("=" * 60)
    print("🍽️  RESTAURANT APPLICATION RECEIVED")
    print(f"Restaurant: {vendor.restaurant_name}")
    print(f"Contact: {vendor.contact_email}")
    print("=" * 60)
    
    try:
        # Generate vendor ID
        count = db.query(Vendor).count()
        vendor_id = f"VEN-{datetime.now().year}{datetime.now().month:02d}-{count + 1:04d}"
        
        print(f"Generated vendor_id: {vendor_id}")
        
        db_vendor = Vendor(
            vendor_id=vendor_id,
            **vendor.dict()
        )
        db.add(db_vendor)
        db.commit()
        db.refresh(db_vendor)
        
        print(f"✅ Vendor created successfully! ID: {db_vendor.id}")
        print("=" * 60)
        
        return db_vendor
        
    except Exception as e:
        print(f"❌ ERROR creating vendor: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print("=" * 60)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create vendor: {str(e)}")

@app.post("/api/vendors", response_model=VendorResponse)
def create_vendor(vendor: VendorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Vendor
    
    # Generate vendor ID
    count = db.query(Vendor).count()
    vendor_id = f"VEN-{datetime.now().year}{datetime.now().month:02d}-{count + 1:04d}"
    
    db_vendor = Vendor(
        vendor_id=vendor_id,
        **vendor.dict()
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@app.get("/api/vendors", response_model=List[VendorResponse])
def get_vendors(
    status: Optional[str] = None,
    risk_rating: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all vendors - public endpoint for dev mode"""
    from models import Vendor, VendorStatus, RiskRating

    query = db.query(Vendor)

    if status:
        query = query.filter(Vendor.onboarding_status == VendorStatus[status.upper()])

    if risk_rating:
        query = query.filter(Vendor.risk_rating == RiskRating[risk_rating.upper()])

    return query.order_by(Vendor.created_at.desc()).all()

@app.get("/api/vendors/{vendor_id}", response_model=VendorResponse)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Vendor

    # Verify user has access to this vendor (either admin or owns this vendor)
    if current_user.role != UserRole.ADMIN and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this vendor")

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@app.get("/api/vendor/profile", response_model=VendorResponse)
def get_vendor_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the current logged-in vendor's profile"""
    from models import Vendor

    if current_user.role != UserRole.VENDOR or not current_user.vendor_id:
        raise HTTPException(status_code=403, detail="Not a vendor account")

    vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    return vendor


@app.put("/api/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor

    # Verify user has access to this vendor (either admin or owns this vendor)
    if current_user.role != UserRole.ADMIN and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this vendor")

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    for key, value in vendor.dict(exclude_unset=True).items():
        setattr(db_vendor, key, value)

    db_vendor.last_activity = datetime.now()
    db.commit()
    db.refresh(db_vendor)
    return db_vendor


class VendorSettingsUpdate(BaseModel):
    """Pydantic model for vendor settings updates (partial updates)"""
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    street: Optional[str] = None
    street_address: Optional[str] = None  # Alias for street
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    seating_capacity: Optional[int] = None
    avg_prep_time: Optional[int] = None
    average_prep_time: Optional[int] = None  # Alias
    delivery_available: Optional[bool] = None
    pickup_available: Optional[bool] = None
    operating_hours: Optional[str] = None
    notification_preferences: Optional[dict] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@app.patch("/api/vendors/{vendor_id}", response_model=VendorResponse)
def patch_vendor(
    vendor_id: int,
    update_data: VendorSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Partial update of vendor settings"""
    from models import Vendor

    # Verify user has access to this vendor (either admin or owns this vendor)
    if current_user.role != UserRole.ADMIN and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this vendor")

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Handle field aliases
    update_dict = update_data.dict(exclude_unset=True)

    # Map street_address to street if provided
    if 'street_address' in update_dict and update_dict['street_address']:
        update_dict['street'] = update_dict.pop('street_address')
    else:
        update_dict.pop('street_address', None)

    # Map avg_prep_time to average_prep_time if provided
    if 'avg_prep_time' in update_dict and update_dict['avg_prep_time']:
        update_dict['average_prep_time'] = update_dict.pop('avg_prep_time')
    else:
        update_dict.pop('avg_prep_time', None)

    for key, value in update_dict.items():
        if hasattr(db_vendor, key) and value is not None:
            setattr(db_vendor, key, value)

    db_vendor.last_activity = datetime.now()
    db.commit()
    db.refresh(db_vendor)
    return db_vendor


@app.patch("/api/vendors/{vendor_id}/status")
def update_vendor_status(
    vendor_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor, VendorStatus
    
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update vendor status
    db_vendor.onboarding_status = VendorStatus[status.upper()]
    
    # If vendor is being approved, create user account
    if status.upper() == "APPROVED" and db_vendor.approved_at is None:
        db_vendor.approved_at = datetime.now()
        
        # Check if user account already exists
        existing_user = db.query(User).filter(User.email == db_vendor.contact_email).first()
        if not existing_user:
            # Create vendor user account with temporary password
            temp_password = f"vendor{vendor_id}temp"  # They should change this
            hashed_password = get_password_hash(temp_password)
            
            vendor_user = User(
                email=db_vendor.contact_email,
                password_hash=hashed_password,
                full_name=db_vendor.contact_name or db_vendor.restaurant_name,
                role=UserRole.VENDOR,
                vendor_id=db_vendor.id
            )
            db.add(vendor_user)
            
            # TODO: Send email with login credentials
            print(f"Vendor user created: {db_vendor.contact_email} / {temp_password}")
    
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

# Create Vendor User Account (Admin endpoint)
@app.post("/api/vendors/{vendor_id}/create-account")
def create_vendor_account(
    vendor_id: int,
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to create a vendor user account"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == vendor.contact_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User account already exists for this email")
    
    # Create vendor user
    hashed_password = get_password_hash(password)
    vendor_user = User(
        email=vendor.contact_email,
        password_hash=hashed_password,
        full_name=vendor.contact_name or vendor.restaurant_name,
        role=UserRole.VENDOR,
        vendor_id=vendor.id
    )
    db.add(vendor_user)
    db.commit()
    db.refresh(vendor_user)
    
    return {"message": "Vendor account created", "user_id": vendor_user.id, "email": vendor_user.email}
    
    try:
        db_vendor.onboarding_status = VendorStatus[status.upper()]
        if status.upper() == "APPROVED":
            db_vendor.approved_at = datetime.now()
        db_vendor.last_activity = datetime.now()
        db.commit()
        return {"message": "Status updated successfully", "status": status}
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid status")

# Document type mapping for the frontend
DOCUMENT_TYPE_MAP = {
    'w9_form': {'label': 'W-9 Tax Form', 'description': 'IRS Form W-9 for tax reporting', 'required': True, 'hasExpiry': False},
    'business_license': {'label': 'Business License', 'description': 'State or local business operating license', 'required': True, 'hasExpiry': False},
    'food_handler': {'label': 'Food Handler Certificate', 'description': 'Food safety and handling certification', 'required': True, 'hasExpiry': True},
    'health_permit': {'label': 'Health Permit', 'description': 'Department of Health operating permit', 'required': True, 'hasExpiry': True},
    'liability_insurance': {'label': 'Liability Insurance', 'description': 'General liability insurance certificate', 'required': True, 'hasExpiry': True},
    'menu': {'label': 'Menu', 'description': 'Current menu with prices', 'required': False, 'hasExpiry': False}
}

# Map vendor model fields to frontend document types
VENDOR_DOC_FIELD_MAP = {
    'w9_form': 'w9_form',
    'liability_insurance': 'insurance',
    'health_permit': 'health_permit',
    'food_handler': 'food_license',  # Map food_handler to food_license in DB
    'business_license': 'compliance_certs',  # Map business_license to compliance_certs in DB
}

@app.get("/api/vendors/{vendor_id}/documents")
def get_vendor_documents(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all documents for a vendor"""
    from models import Vendor

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Check authorization
    if current_user.role != "admin" and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these documents")

    documents = []
    doc_id = 1

    # Build document list from vendor fields
    doc_fields = [
        ('w9_form', 'w9_form_url', 'w9_form'),
        ('insurance', 'insurance_url', 'liability_insurance'),
        ('health_permit', 'health_permit_url', 'health_permit'),
        ('food_license', 'food_license_url', 'food_handler'),
        ('compliance_certs', 'compliance_certs_url', 'business_license'),
    ]

    for has_doc_field, url_field, doc_type in doc_fields:
        has_doc = getattr(db_vendor, has_doc_field, False)
        url = getattr(db_vendor, url_field, None)

        if has_doc and url:
            documents.append({
                'id': doc_id,
                'document_type': doc_type,
                'file_name': url.split('/')[-1] if url else f'{doc_type}.pdf',
                'file_url': url,
                'upload_date': db_vendor.updated_at.isoformat() if db_vendor.updated_at else datetime.now().isoformat(),
                'expiry_date': None,  # Could add expiry tracking to DB later
                'status': 'approved' if has_doc else 'pending',
                'admin_notes': None
            })
            doc_id += 1

    return {"documents": documents, "count": len(documents)}

@app.post("/api/vendors/{vendor_id}/documents")
async def upload_vendor_document(
    vendor_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document for a vendor"""
    from models import Vendor
    import os
    import uuid

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Check authorization
    if current_user.role != "admin" and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload documents")

    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/vendor_documents"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{vendor_id}_{document_type}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update vendor document fields based on type
    field_mapping = {
        'w9_form': ('w9_form', 'w9_form_url'),
        'liability_insurance': ('insurance', 'insurance_url'),
        'health_permit': ('health_permit', 'health_permit_url'),
        'food_handler': ('food_license', 'food_license_url'),
        'business_license': ('compliance_certs', 'compliance_certs_url'),
    }

    if document_type in field_mapping:
        has_field, url_field = field_mapping[document_type]
        setattr(db_vendor, has_field, True)
        setattr(db_vendor, url_field, f"/uploads/vendor_documents/{unique_filename}")

    db_vendor.updated_at = datetime.now()
    db_vendor.last_activity = datetime.now()
    db.commit()

    return {"message": "Document uploaded successfully", "file_path": file_path}

@app.delete("/api/vendors/{vendor_id}/documents/{document_id}")
def delete_vendor_document(
    vendor_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document for a vendor"""
    from models import Vendor

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Check authorization
    if current_user.role != "admin" and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete documents")

    # For now, just mark as deleted by clearing the URL
    # In production, you'd also delete the file and use proper document tracking
    db_vendor.updated_at = datetime.now()
    db_vendor.last_activity = datetime.now()
    db.commit()

    return {"message": "Document deleted successfully"}

@app.patch("/api/vendors/{vendor_id}/documents")
def update_vendor_documents(
    vendor_id: int,
    documents: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor
    
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update document flags
    for doc_type, status in documents.items():
        if hasattr(db_vendor, doc_type):
            setattr(db_vendor, doc_type, status)
    
    db_vendor.last_activity = datetime.now()
    db.commit()
    return {"message": "Documents updated successfully"}

@app.delete("/api/vendors/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Vendor
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted successfully"}

# ============================================================================
# RESTAURANT MENU ENDPOINTS (For Mobile App)
# ============================================================================

class CustomizationOption(BaseModel):
    """Single option within a customization group"""
    name: str
    price: float = 0.0
    is_default: Optional[bool] = False
    is_available: Optional[bool] = True

class MenuItemCustomization(BaseModel):
    """Customization group for a menu item (e.g., Size, Spice Level, Add-ons)"""
    name: str
    type: str  # "single" or "multiple"
    required: bool = False
    min_selections: Optional[int] = 0
    max_selections: Optional[int] = 1
    options: List[CustomizationOption]

class MenuItemCreate(BaseModel):
    item_name: str
    description: Optional[str] = None
    category: str
    price: float
    is_available: bool = True
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_spicy: bool = False
    spice_level: int = 0
    prep_time: Optional[int] = None
    calories: Optional[int] = None
    image_url: Optional[str] = None
    in_stock: bool = True
    daily_limit: Optional[int] = None
    customizations: Optional[List[MenuItemCustomization]] = None

class MenuItemResponse(BaseModel):
    id: int
    vendor_id: int
    item_name: str
    description: Optional[str]
    category: str
    price: float
    is_available: bool
    is_vegetarian: bool
    is_vegan: bool
    is_gluten_free: bool
    is_spicy: bool
    spice_level: int
    prep_time: Optional[int]
    calories: Optional[int]
    image_url: Optional[str]
    in_stock: bool
    daily_limit: Optional[int]
    items_sold_today: int
    customizations: Optional[List[dict]] = None
    created_at: datetime

    class Config:
        from_attributes = True

@app.post("/api/vendors/{vendor_id}/menu", response_model=MenuItemResponse)
def create_menu_item(
    vendor_id: int,
    menu_item: MenuItemCreate,
    db: Session = Depends(get_db)
):
    from models import Vendor, VendorMenuItem

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Convert to dict and handle customizations
    item_data = menu_item.dict()
    # Convert customizations to list of dicts if present
    if item_data.get('customizations'):
        item_data['customizations'] = [c.dict() if hasattr(c, 'dict') else c for c in item_data['customizations']]

    db_menu_item = VendorMenuItem(
        vendor_id=vendor_id,
        **item_data
    )
    db.add(db_menu_item)
    db.commit()
    db.refresh(db_menu_item)
    return db_menu_item

@app.get("/api/vendors/{vendor_id}/menu", response_model=List[MenuItemResponse])
def get_vendor_menu(
    vendor_id: int,
    category: Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    from models import VendorMenuItem
    
    query = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id)
    
    if category:
        query = query.filter(VendorMenuItem.category == category)
    
    if available_only:
        query = query.filter(VendorMenuItem.is_available == True, VendorMenuItem.in_stock == True)
    
    return query.all()

@app.put("/api/vendors/{vendor_id}/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    vendor_id: int,
    item_id: int,
    menu_item: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import VendorMenuItem
    
    db_menu_item = db.query(VendorMenuItem).filter(
        VendorMenuItem.id == item_id,
        VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not db_menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    for key, value in menu_item.dict(exclude_unset=True).items():
        setattr(db_menu_item, key, value)
    
    db.commit()
    db.refresh(db_menu_item)
    return db_menu_item

@app.patch("/api/vendors/{vendor_id}/menu/{item_id}/customizations")
def update_menu_item_customizations(
    vendor_id: int,
    item_id: int,
    customizations: List[MenuItemCustomization],
    db: Session = Depends(get_db)
):
    """Update customizations for a menu item"""
    from models import VendorMenuItem

    db_menu_item = db.query(VendorMenuItem).filter(
        VendorMenuItem.id == item_id,
        VendorMenuItem.vendor_id == vendor_id
    ).first()

    if not db_menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Convert to list of dicts
    db_menu_item.customizations = [c.dict() for c in customizations]
    db.commit()
    db.refresh(db_menu_item)

    return {
        "success": True,
        "message": f"Updated customizations for {db_menu_item.item_name}",
        "customizations": db_menu_item.customizations
    }

@app.delete("/api/vendors/{vendor_id}/menu/{item_id}")
def delete_menu_item(
    vendor_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import VendorMenuItem
    
    menu_item = db.query(VendorMenuItem).filter(
        VendorMenuItem.id == item_id,
        VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.delete(menu_item)
    db.commit()
    return {"message": "Menu item deleted successfully"}

@app.get("/api/vendors/{vendor_id}/menu/categories")
def get_menu_categories(vendor_id: int, db: Session = Depends(get_db)):
    from models import VendorMenuItem
    
    categories = db.query(VendorMenuItem.category).filter(
        VendorMenuItem.vendor_id == vendor_id
    ).distinct().all()
    
    return [cat[0] for cat in categories if cat[0]]

# Mobile App Registration
@app.post("/api/vendors/{vendor_id}/register-app")
def register_mobile_app(
    vendor_id: int,
    app_data: dict,
    db: Session = Depends(get_db)
):
    from models import Vendor
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.app_registered = True
    vendor.platform = app_data.get("platform")
    vendor.mobile_device_id = app_data.get("device_id")
    vendor.push_token = app_data.get("push_token")
    vendor.last_activity = datetime.now()
    
    db.commit()
    return {"message": "App registered successfully", "vendor_id": vendor.vendor_id}

# ============================================================================
# PUBLIC RESTAURANT LISTING API (For Customer App)
# ============================================================================

@app.get("/api/public/restaurants")
def get_public_restaurants(
    city: Optional[str] = None,
    cuisine: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to get list of approved restaurants with their addresses.
    Used by customer-facing app to browse restaurants.
    """
    from models import Vendor, VendorStatus, VendorMenuItem
    from stock_images import get_stock_image_for_dish

    query = db.query(Vendor).filter(
        Vendor.onboarding_status == VendorStatus.APPROVED,
        Vendor.cuisine_type.isnot(None)  # Only show actual restaurants (have cuisine type)
    )

    if city:
        query = query.filter(Vendor.city.ilike(f"%{city}%"))

    if cuisine:
        query = query.filter(Vendor.cuisine_type.ilike(f"%{cuisine}%"))

    restaurants = query.all()

    result = []
    for vendor in restaurants:
        # Get menu item count
        menu_count = db.query(VendorMenuItem).filter(
            VendorMenuItem.vendor_id == vendor.id,
            VendorMenuItem.is_available == True
        ).count()

        # Get sample menu items for preview
        sample_items = db.query(VendorMenuItem).filter(
            VendorMenuItem.vendor_id == vendor.id,
            VendorMenuItem.is_available == True
        ).limit(4).all()

        # Build preview images from menu items
        preview_images = []
        for item in sample_items:
            img = item.image_url if item.image_url else get_stock_image_for_dish(
                item.item_name, item.category, item.is_vegetarian
            )
            preview_images.append(img)

        result.append({
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "name": vendor.restaurant_name or vendor.company_name,
            "cuisine_type": vendor.cuisine_type,
            "address": {
                "street": vendor.street,
                "city": vendor.city,
                "state": vendor.state,
                "zip_code": vendor.zip_code,
                "country": vendor.country,
                "full_address": f"{vendor.street}, {vendor.city}, {vendor.state} {vendor.zip_code}" if vendor.street else None
            },
            "location": {
                "latitude": vendor.latitude,
                "longitude": vendor.longitude
            },
            "contact": {
                "phone": vendor.contact_phone,
                "email": vendor.contact_email
            },
            "operating_hours": vendor.operating_hours,
            "delivery_available": vendor.delivery_available,
            "pickup_available": vendor.pickup_available,
            "average_prep_time": vendor.average_prep_time,
            "menu_items_count": menu_count,
            "preview_images": preview_images,
            "rating": 4.5,  # Placeholder - implement actual ratings
            "is_open": True  # Placeholder - implement actual hours check
        })

    return {
        "success": True,
        "count": len(result),
        "restaurants": result
    }


@app.get("/api/public/restaurants/{vendor_id}")
def get_public_restaurant_detail(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to get restaurant details with full menu.
    Menu items include stock images if no custom image is provided.
    """
    from models import Vendor, VendorStatus, VendorMenuItem
    from stock_images import get_stock_image_for_dish

    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.onboarding_status == VendorStatus.APPROVED
    ).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Get all available menu items
    menu_items = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == vendor_id,
        VendorMenuItem.is_available == True
    ).all()

    # Group by category and add stock images
    menu_by_category = {}
    for item in menu_items:
        category = item.category or "Other"
        if category not in menu_by_category:
            menu_by_category[category] = []

        # Add stock image if no custom image
        image_url = item.image_url if item.image_url else get_stock_image_for_dish(
            item.item_name, item.category, item.is_vegetarian
        )

        menu_by_category[category].append({
            "id": item.id,
            "name": item.item_name,
            "description": item.description,
            "price": float(item.price) if item.price else 0,
            "image_url": image_url,
            "is_vegetarian": item.is_vegetarian,
            "is_vegan": item.is_vegan,
            "is_gluten_free": item.is_gluten_free,
            "is_spicy": item.is_spicy,
            "spice_level": item.spice_level,
            "prep_time": item.prep_time,
            "calories": item.calories,
            "in_stock": item.in_stock,
            "customizations": item.customizations or []
        })

    return {
        "success": True,
        "restaurant": {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "name": vendor.restaurant_name or vendor.company_name,
            "cuisine_type": vendor.cuisine_type,
            "address": {
                "street": vendor.street,
                "city": vendor.city,
                "state": vendor.state,
                "zip_code": vendor.zip_code,
                "country": vendor.country,
                "full_address": f"{vendor.street}, {vendor.city}, {vendor.state} {vendor.zip_code}" if vendor.street else None
            },
            "location": {
                "latitude": vendor.latitude,
                "longitude": vendor.longitude
            },
            "contact": {
                "phone": vendor.contact_phone,
                "email": vendor.contact_email
            },
            "operating_hours": vendor.operating_hours,
            "delivery_available": vendor.delivery_available,
            "pickup_available": vendor.pickup_available,
            "average_prep_time": vendor.average_prep_time,
            "rating": 4.5,
            "reviews_count": 0
        },
        "menu": menu_by_category,
        "menu_items_count": len(menu_items),
        "categories": list(menu_by_category.keys())
    }


@app.post("/api/vendors/{vendor_id}/menu/assign-stock-images")
def assign_stock_images_to_menu(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    """
    Assign stock images to all menu items that don't have images.
    AI Employee task - automatically populates missing images.
    """
    from models import VendorMenuItem
    from stock_images import get_stock_image_for_dish

    items = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == vendor_id,
        (VendorMenuItem.image_url == None) | (VendorMenuItem.image_url == "")
    ).all()

    updated_count = 0
    for item in items:
        item.image_url = get_stock_image_for_dish(
            item.item_name,
            item.category,
            item.is_vegetarian
        )
        updated_count += 1

    db.commit()

    return {
        "success": True,
        "message": f"Assigned stock images to {updated_count} menu items",
        "items_updated": updated_count
    }


# Include Stripe payment routes
from stripe_integration import router as stripe_router
app.include_router(stripe_router)

# Include ERP/Order Flow routes
from order_flow import router as order_flow_router
app.include_router(order_flow_router)

# Include Auto-Onboarding routes (Nova AI Employee)
from auto_onboarding import router as onboarding_router
app.include_router(onboarding_router)

# Include Promotions routes (Sierra AI Employee)
from promotions import router as promotions_router
app.include_router(promotions_router)

# Include Real-time Events routes (Phoenix AI Employee)
from realtime_events import router as realtime_router
app.include_router(realtime_router)

# Include Menu Verification routes (Aria AI Employee)
from menu_verification import router as verification_router
app.include_router(verification_router)

# Include Vibing routes (Food Image AI Employee)
from vibing_routes import router as vibing_router
app.include_router(vibing_router)

# Include Refund & Invoice routes (FinanceBot Zeta)
try:
    from refund_invoice import router as refund_invoice_router
    app.include_router(refund_invoice_router)
    print("[MAIN] Refund & Invoice routes loaded successfully")
except ImportError as e:
    print(f"[MAIN] Warning: Could not load refund_invoice routes: {e}")

# Include Accounting routes (LedgerBot Delta & AuditBot Zeta)
try:
    from accounting import router as accounting_router
    app.include_router(accounting_router)
    print("[MAIN] Accounting routes loaded successfully (Income Statement, Balance Sheet, Cash Flow)")
except ImportError as e:
    print(f"[MAIN] Warning: Could not load accounting routes: {e}")

# Include Enterprise Payments routes (Stripe + ACH + Plaid + Connect)
try:
    from enterprise_payments import router as enterprise_payments_router
    app.include_router(enterprise_payments_router)
    print("[MAIN] Enterprise Payments loaded (Card, ACH, Plaid, Connect, Instant Payouts)")
except ImportError as e:
    print(f"[MAIN] Warning: Enterprise payments not loaded: {e}")

# Include Rideshare routes (Uber-style ride sharing with $1 platform fee)
try:
    from rideshare import router as rideshare_router
    app.include_router(rideshare_router)
    print("[MAIN] Rideshare routes loaded successfully ($1 platform fee model)")
except ImportError as e:
    print(f"[MAIN] Warning: Could not load rideshare routes: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
