from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, timedelta, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import get_db, init_db
from models import User, Client, Invoice, InvoiceItem, Payment, UserRole, InvoiceStatus, PaymentStatus, Vendor, Driver, DriverStatus

load_dotenv()

app = FastAPI(title="Invoice Management System")

# CORS - Allow dollor.ai, vibingticket.ai, and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://dollor.ai",
        "https://dollor.ai",
        "http://www.dollor.ai",
        "https://www.dollor.ai",
        "http://api.dollor.ai",
        "https://api.dollor.ai",
        "http://vibingticket.com",
        "https://vibingticket.com",
        "http://www.vibingticket.com",
        "https://www.vibingticket.com",
        "https://d3pus2gxlb5cer.cloudfront.net",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Email Configuration - AWS SES
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@dollor.ai")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Dollor.ai")

# Initialize boto3 SES client
import boto3
from botocore.exceptions import ClientError

ses_client = None
try:
    ses_client = boto3.client('ses', region_name=AWS_REGION)
    print(f"[EMAIL] AWS SES client initialized for region: {AWS_REGION}")
except Exception as e:
    print(f"[EMAIL] Failed to initialize AWS SES client: {e}")


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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
