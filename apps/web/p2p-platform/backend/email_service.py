"""
Email Service for Dollor.ai
Sends transactional emails for vendor approvals, order notifications, etc.

Production vs Development:
- Production: Requires SMTP credentials. Fails if not configured.
- Development: Logs emails to console but doesn't actually send.
"""
import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Environment detection
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
IS_PRODUCTION = ENVIRONMENT in ("production", "prod")
IS_DEVELOPMENT = ENVIRONMENT in ("development", "dev", "local", "staging")

# Email configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@dollor.ai")
FROM_NAME = os.getenv("FROM_NAME", "Dollor.ai")

# Validate production configuration
def _validate_smtp_config() -> bool:
    """Check if SMTP is properly configured for sending emails."""
    return bool(SMTP_USER and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Send an email using SMTP with authenticated credentials.

    Production Mode:
    - Requires SMTP_USER and SMTP_PASSWORD to be set
    - Actually sends emails via SMTP
    - Returns False if credentials are missing

    Development Mode:
    - Logs email details to console
    - Does not actually send emails
    - Returns True (simulates success)

    Returns True if successful, False otherwise.
    """
    # Validate email address format (basic check)
    if not to_email or "@" not in to_email:
        logger.error(f"Invalid email address: {to_email}")
        return False

    # Check SMTP configuration
    if not _validate_smtp_config():
        if IS_PRODUCTION:
            # In production, missing credentials is an error
            logger.error(f"SMTP not configured in production! Email NOT sent to {to_email}: {subject}")
            return False
        else:
            # In development, log and simulate success
            logger.info(f"[DEV MODE] Email simulated to {to_email}: {subject}")
            print(f"📧 [DEV] Email would be sent to {to_email}: {subject}")
            return True

    # Send actual email with authenticated SMTP
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email

        # Add plain text and HTML parts
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Send email with TLS
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_vendor_approval_email(
    to_email: str,
    restaurant_name: str,
    contact_name: str
) -> bool:
    """
    Send approval notification email to a vendor.
    """
    subject = f"🎉 Congratulations! {restaurant_name} is Now Live on Dollor.ai"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center; }}
            .logo {{ font-size: 32px; color: #ffd700; font-weight: bold; }}
            .content {{ padding: 40px 30px; }}
            .greeting {{ font-size: 24px; color: #1e293b; margin-bottom: 20px; }}
            .message {{ color: #475569; font-size: 16px; line-height: 1.6; }}
            .highlight {{ background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(26, 26, 46, 0.1) 100%); border-left: 4px solid #ffd700; padding: 20px; margin: 30px 0; border-radius: 8px; }}
            .cta-button {{ display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%); color: #1a1a2e; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; }}
            .apps {{ margin: 30px 0; }}
            .app-badge {{ display: inline-block; margin: 5px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
            .steps {{ margin: 20px 0; }}
            .step {{ display: flex; align-items: center; margin: 15px 0; }}
            .step-number {{ background: #ffd700; color: #1a1a2e; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">💰 Dollor.ai</div>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">The $1 Delivery Revolution</p>
            </div>
            <div class="content">
                <h1 class="greeting">Welcome to Dollor.ai, {contact_name}! 🎉</h1>
                <p class="message">
                    Great news! <strong>{restaurant_name}</strong> has been approved and is now live on the Dollor.ai platform.
                    Your customers can start ordering right away!
                </p>

                <div class="highlight">
                    <strong>🚀 Your restaurant is ready to receive orders!</strong><br>
                    Log in to your dashboard to manage orders, update your menu, and track earnings.
                </div>

                <h3>Next Steps:</h3>
                <div class="steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <span>Log in to your Vendor Dashboard to review your menu</span>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <span>Download the Dollor.ai Restaurant app for real-time order alerts</span>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <span>Set up your bank account for weekly payouts</span>
                    </div>
                </div>

                <center>
                    <a href="https://dollor.ai/vendor/login" class="cta-button">
                        🔑 Login to Dashboard
                    </a>
                </center>

                <div class="apps">
                    <p><strong>Download the Restaurant App:</strong></p>
                    <p>
                        📱 <a href="https://apps.apple.com/app/dollor-restaurant">iOS App Store</a> &nbsp;|&nbsp;
                        📱 <a href="https://play.google.com/store/apps/details?id=com.dollor.restaurant">Google Play</a>
                    </p>
                </div>

                <p class="message" style="margin-top: 30px;">
                    If you have any questions, our partner support team is available 24/7.<br>
                    Just reply to this email or call us at <strong>(800) 555-FOOD</strong>.
                </p>
            </div>
            <div class="footer">
                <p>© 2024 Dollor.ai - The World's First $1 Delivery Platform</p>
                <p>
                    <a href="https://dollor.ai/terms">Terms</a> |
                    <a href="https://dollor.ai/privacy">Privacy</a> |
                    <a href="https://dollor.ai/support">Support</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Welcome to Dollor.ai, {contact_name}!

    Great news! {restaurant_name} has been approved and is now live on the Dollor.ai platform.

    Your customers can start ordering right away!

    Next Steps:
    1. Log in to your Vendor Dashboard to review your menu
    2. Download the Dollor.ai Restaurant app for real-time order alerts
    3. Set up your bank account for weekly payouts

    Login to Dashboard: https://dollor.ai/vendor/login

    If you have any questions, our partner support team is available 24/7.
    Just reply to this email or call us at (800) 555-FOOD.

    © 2024 Dollor.ai - The World's First $1 Delivery Platform
    """

    return send_email(to_email, subject, html_body, text_body)


def send_vendor_registration_confirmation(
    to_email: str,
    restaurant_name: str,
    contact_name: str,
    vendor_id: str
) -> bool:
    """
    Send registration confirmation email to a new vendor.
    """
    subject = f"Application Received - {restaurant_name} | Dollor.ai"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center; }}
            .logo {{ font-size: 32px; color: #ffd700; font-weight: bold; }}
            .content {{ padding: 40px 30px; }}
            .greeting {{ font-size: 24px; color: #1e293b; margin-bottom: 20px; }}
            .message {{ color: #475569; font-size: 16px; line-height: 1.6; }}
            .app-id {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }}
            .timeline {{ margin: 30px 0; }}
            .timeline-item {{ display: flex; margin: 15px 0; }}
            .timeline-dot {{ width: 12px; height: 12px; background: #ffd700; border-radius: 50%; margin-right: 15px; margin-top: 5px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">💰 Dollor.ai</div>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Partner Application</p>
            </div>
            <div class="content">
                <h1 class="greeting">Thank you, {contact_name}! 🙏</h1>
                <p class="message">
                    We've received your application for <strong>{restaurant_name}</strong> to join the Dollor.ai platform.
                </p>

                <div class="app-id">
                    Application ID: <strong>{vendor_id}</strong>
                </div>

                <h3>What happens next?</h3>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div>
                            <strong>Document Review</strong><br>
                            <span style="color: #64748b;">Our team reviews your submitted information (1-2 business days)</span>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot" style="background: #e2e8f0;"></div>
                        <div>
                            <strong>Menu Setup</strong><br>
                            <span style="color: #64748b;">AI-assisted menu configuration and pricing optimization</span>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot" style="background: #e2e8f0;"></div>
                        <div>
                            <strong>Go Live!</strong><br>
                            <span style="color: #64748b;">Start receiving orders from hungry customers</span>
                        </div>
                    </div>
                </div>

                <p class="message">
                    Once approved, you'll receive an email with instructions to log in to your dashboard
                    using the email and password you provided during registration.
                </p>

                <p class="message" style="margin-top: 30px;">
                    Questions? Reply to this email or call <strong>(800) 555-FOOD</strong>.
                </p>
            </div>
            <div class="footer">
                <p>© 2024 Dollor.ai - The World's First $1 Delivery Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Thank you, {contact_name}!

    We've received your application for {restaurant_name} to join the Dollor.ai platform.

    Application ID: {vendor_id}

    What happens next?
    1. Document Review - Our team reviews your submitted information (1-2 business days)
    2. Menu Setup - AI-assisted menu configuration and pricing optimization
    3. Go Live! - Start receiving orders from hungry customers

    Once approved, you'll receive an email with instructions to log in to your dashboard.

    Questions? Reply to this email or call (800) 555-FOOD.

    © 2024 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_driver_approval_email(
    to_email: str,
    driver_name: str,
    driver_code: str
) -> bool:
    """
    Send approval notification email to a driver.
    """
    subject = f"You're Approved! Start Delivering with Dollor.ai"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }}
            .logo {{ font-size: 32px; color: white; font-weight: bold; }}
            .content {{ padding: 40px 30px; }}
            .greeting {{ font-size: 24px; color: #1e293b; margin-bottom: 20px; }}
            .message {{ color: #475569; font-size: 16px; line-height: 1.6; }}
            .highlight {{ background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 8px; }}
            .cta-button {{ display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; }}
            .driver-code {{ background: #f8fafc; border: 2px solid #10b981; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 24px; text-align: center; margin: 20px 0; color: #10b981; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
            .steps {{ margin: 20px 0; }}
            .step {{ display: flex; align-items: center; margin: 15px 0; }}
            .step-number {{ background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Dollor.ai Driver</div>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Earn More. Drive Less.</p>
            </div>
            <div class="content">
                <h1 class="greeting">Welcome to the team, {driver_name}!</h1>
                <p class="message">
                    Great news! Your driver application has been <strong>approved</strong>.
                    You're now ready to start earning with Dollor.ai!
                </p>

                <div class="driver-code">
                    Your Driver Code: <strong>{driver_code}</strong>
                </div>

                <div class="highlight">
                    <strong>You're ready to start delivering!</strong><br>
                    Download the Driver app, go online, and start accepting delivery requests.
                </div>

                <h3>Get Started:</h3>
                <div class="steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <span>Download the Dollor.ai Driver app</span>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <span>Log in with your email and password</span>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <span>Go online and start accepting deliveries!</span>
                    </div>
                </div>

                <center>
                    <a href="https://dollor.ai/driver/login" class="cta-button">
                        Start Driving
                    </a>
                </center>

                <div style="margin: 30px 0;">
                    <p><strong>Download the Driver App:</strong></p>
                    <p>
                        <a href="https://apps.apple.com/app/dollor-driver">iOS App Store</a> |
                        <a href="https://play.google.com/store/apps/details?id=com.dollor.driver">Google Play</a>
                    </p>
                </div>

                <p class="message" style="margin-top: 30px;">
                    Questions? Our driver support team is here to help 24/7.<br>
                    Email us at <strong>drivers@dollor.ai</strong> or call <strong>(800) 555-RIDE</strong>.
                </p>
            </div>
            <div class="footer">
                <p>2024 Dollor.ai - Earn $25+/hour with $1 Deliveries</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Welcome to the team, {driver_name}!

    Great news! Your driver application has been approved.
    You're now ready to start earning with Dollor.ai!

    Your Driver Code: {driver_code}

    Get Started:
    1. Download the Dollor.ai Driver app
    2. Log in with your email and password
    3. Go online and start accepting deliveries!

    Download the Driver App:
    - iOS: https://apps.apple.com/app/dollor-driver
    - Android: https://play.google.com/store/apps/details?id=com.dollor.driver

    Questions? Email drivers@dollor.ai or call (800) 555-RIDE.

    2024 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_driver_registration_confirmation(
    to_email: str,
    driver_name: str,
    driver_code: str
) -> bool:
    """
    Send registration confirmation email to a new driver.
    """
    subject = f"Application Received - Driver {driver_code} | Dollor.ai"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }}
            .logo {{ font-size: 32px; color: white; font-weight: bold; }}
            .content {{ padding: 40px 30px; }}
            .greeting {{ font-size: 24px; color: #1e293b; margin-bottom: 20px; }}
            .message {{ color: #475569; font-size: 16px; line-height: 1.6; }}
            .app-id {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }}
            .timeline {{ margin: 30px 0; }}
            .timeline-item {{ display: flex; margin: 15px 0; }}
            .timeline-dot {{ width: 12px; height: 12px; background: #10b981; border-radius: 50%; margin-right: 15px; margin-top: 5px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Dollor.ai Driver</div>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Driver Application</p>
            </div>
            <div class="content">
                <h1 class="greeting">Thank you, {driver_name}!</h1>
                <p class="message">
                    We've received your application to become a Dollor.ai delivery partner.
                </p>

                <div class="app-id">
                    Application ID: <strong>{driver_code}</strong>
                </div>

                <h3>What happens next?</h3>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div>
                            <strong>Document Review</strong><br>
                            <span style="color: #64748b;">We verify your license and vehicle information (1-2 business days)</span>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot" style="background: #e2e8f0;"></div>
                        <div>
                            <strong>Background Check</strong><br>
                            <span style="color: #64748b;">Standard safety verification process</span>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot" style="background: #e2e8f0;"></div>
                        <div>
                            <strong>Start Earning!</strong><br>
                            <span style="color: #64748b;">Download the app and hit the road</span>
                        </div>
                    </div>
                </div>

                <p class="message">
                    Once approved, you'll receive an email with instructions to download the Driver app
                    and start accepting deliveries.
                </p>

                <p class="message" style="margin-top: 30px;">
                    Questions? Email <strong>drivers@dollor.ai</strong> or call <strong>(800) 555-RIDE</strong>.
                </p>
            </div>
            <div class="footer">
                <p>2024 Dollor.ai - Earn $25+/hour with $1 Deliveries</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Thank you, {driver_name}!

    We've received your application to become a Dollor.ai delivery partner.

    Application ID: {driver_code}

    What happens next?
    1. Document Review - We verify your license and vehicle information (1-2 business days)
    2. Background Check - Standard safety verification process
    3. Start Earning! - Download the app and hit the road

    Once approved, you'll receive an email with instructions to download the Driver app.

    Questions? Email drivers@dollor.ai or call (800) 555-RIDE.

    2024 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_customer_welcome_email(
    to_email: str,
    customer_name: str,
    customer_code: str = None
) -> bool:
    """
    Send welcome email to a new customer after registration.
    """
    subject = "Welcome to Dollor.ai!"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }}
            .welcome-box {{ background: #FFF7ED; padding: 20px; border-radius: 10px; margin: 20px 0; }}
            .feature {{ margin: 15px 0; padding: 10px; }}
            .cta-button {{ display: inline-block; background: #FF6B35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Dollor.ai!</h1>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>

                <p>Thank you for joining Dollor.ai! We're excited to have you as part of our community.</p>

                <div class="welcome-box">
                    <h3 style="margin-top: 0;">Our Mission</h3>
                    <p>Fair pricing for everyone in the food delivery ecosystem. No hidden fees, no surge pricing.</p>
                </div>

                <h3>What makes us different:</h3>

                <div class="feature">
                    <strong>Only $1 Platform Fee</strong> - No hidden charges or surge pricing
                </div>

                <div class="feature">
                    <strong>100% Menu Prices</strong> - Restaurants set their own prices
                </div>

                <div class="feature">
                    <strong>100% Tips to Drivers</strong> - Your tips go directly to drivers
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai" class="cta-button">Start Ordering Now</a>
                </p>

                <p>Questions? Reply to this email or contact us at support@dollor.ai</p>

                <p>Welcome aboard!<br>The Dollor.ai Team</p>
            </div>
            <div class="footer">
                <p>2024 Dollor.ai by Vibing World Inc.</p>
                <p>You received this email because you created an account on Dollor.ai</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Welcome to Dollor.ai!

    Hi {customer_name},

    Thank you for joining Dollor.ai! We're excited to have you as part of our community.

    OUR MISSION
    Fair pricing for everyone in the food delivery ecosystem. No hidden fees, no surge pricing.

    WHAT MAKES US DIFFERENT:
    - Only $1 Platform Fee - No hidden charges or surge pricing
    - 100% Menu Prices - Restaurants set their own prices
    - 100% Tips to Drivers - Your tips go directly to drivers

    Start ordering now at https://dollor.ai

    Questions? Contact us at support@dollor.ai

    Welcome aboard!
    The Dollor.ai Team

    2024 Dollor.ai by Vibing World Inc.
    """

    return send_email(to_email, subject, html_body, text_body)


def send_email_verification_code(
    to_email: str,
    customer_name: str,
    verification_code: str
) -> bool:
    """
    Send email verification code to customer.
    """
    subject = f"Your Dollor.ai Verification Code: {verification_code}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 24px; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }}
            .code-box {{ background: #f8f9fa; border: 2px dashed #FF6B35; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }}
            .code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF6B35; font-family: monospace; }}
            .footer {{ background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }}
            .warning {{ background: #FFF3CD; border: 1px solid #FFEEBA; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Verify Your Email</h1>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>

                <p>Please use the following code to verify your email address:</p>

                <div class="code-box">
                    <div class="code">{verification_code}</div>
                </div>

                <p>Enter this code in the app to complete your registration.</p>

                <div class="warning">
                    <strong>This code expires in 10 minutes.</strong><br>
                    If you didn't request this code, please ignore this email.
                </div>

                <p>Thanks,<br>The Dollor.ai Team</p>
            </div>
            <div class="footer">
                <p>2024 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Verify Your Email - Dollor.ai

    Hi {customer_name},

    Please use the following code to verify your email address:

    {verification_code}

    Enter this code in the app to complete your registration.

    This code expires in 10 minutes.
    If you didn't request this code, please ignore this email.

    Thanks,
    The Dollor.ai Team

    2024 Dollor.ai by Vibing World Inc.
    """

    return send_email(to_email, subject, html_body, text_body)


# ==================== ORDER LIFECYCLE EMAILS ====================

def send_order_confirmation_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    restaurant_name: str,
    order_total: float,
    items_summary: str = ""
) -> bool:
    """
    Send order confirmation email to customer when order is placed.
    """
    subject = f"Order Confirmed! #{order_number} from {restaurant_name}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 20px; text-align: center; }}
            .logo {{ font-size: 28px; color: #ffd700; font-weight: bold; }}
            .content {{ padding: 30px; }}
            .order-box {{ background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .order-number {{ font-size: 24px; color: #1e293b; font-weight: bold; }}
            .status {{ display: inline-block; background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 10px 0; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Dollor.ai</div>
            </div>
            <div class="content">
                <h2>Hi {customer_name}!</h2>
                <p>Your order has been confirmed and is being prepared!</p>

                <div class="order-box">
                    <div class="order-number">Order #{order_number}</div>
                    <span class="status">Confirmed</span>
                    <p><strong>Restaurant:</strong> {restaurant_name}</p>
                    {f'<p><strong>Items:</strong> {items_summary}</p>' if items_summary else ''}
                    <p><strong>Total:</strong> ${order_total:.2f}</p>
                </div>

                <p>We'll notify you when your order is ready for pickup and when the driver is on the way!</p>
                <p>Track your order in the Dollor.ai app.</p>
            </div>
            <div class="footer">
                <p>Questions? Contact support@dollor.ai</p>
                <p>2025 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Hi {customer_name}!

    Your order #{order_number} from {restaurant_name} has been confirmed!
    Total: ${order_total:.2f}

    We'll notify you when your order is ready and when the driver is on the way.
    Track your order in the Dollor.ai app.

    - The Dollor.ai Team
    """

    return send_email(to_email, subject, html_body, text_body)


def send_order_ready_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    restaurant_name: str
) -> bool:
    """
    Send email when order is ready for pickup.
    """
    subject = f"Your order is ready! #{order_number}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px 20px; text-align: center; }}
            .logo {{ font-size: 28px; color: white; font-weight: bold; }}
            .content {{ padding: 30px; }}
            .status-icon {{ font-size: 48px; text-align: center; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Order Ready!</div>
            </div>
            <div class="content">
                <h2 style="text-align: center;">Your Food is Ready!</h2>
                <p>Hi {customer_name},</p>
                <p>Great news! Your order <strong>#{order_number}</strong> from <strong>{restaurant_name}</strong> is ready and waiting for a driver to pick it up.</p>
                <p>A driver will be assigned shortly and your food will be on its way soon!</p>
            </div>
            <div class="footer">
                <p>2025 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Your Food is Ready!

    Hi {customer_name},

    Your order #{order_number} from {restaurant_name} is ready!
    A driver will pick it up shortly.

    - The Dollor.ai Team
    """

    return send_email(to_email, subject, html_body, text_body)


def send_driver_assigned_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    driver_name: str,
    eta_minutes: int = 20
) -> bool:
    """
    Send email when driver is assigned and on the way.
    """
    subject = f"Driver on the way! #{order_number}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .driver-box {{ background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }}
            .eta {{ font-size: 32px; font-weight: bold; color: #1d4ed8; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Driver On The Way!</h2>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>Your driver <strong>{driver_name}</strong> has picked up your order and is heading your way!</p>

                <div class="driver-box">
                    <p>Estimated Arrival</p>
                    <div class="eta">{eta_minutes} min</div>
                </div>

                <p>Track your driver in real-time in the Dollor.ai app!</p>
            </div>
            <div class="footer">
                <p>Order #{order_number}</p>
                <p>2025 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Driver On The Way!

    Hi {customer_name},

    Your driver {driver_name} has picked up order #{order_number} and is heading your way!
    Estimated arrival: {eta_minutes} minutes

    Track your driver in the Dollor.ai app.

    - The Dollor.ai Team
    """

    return send_email(to_email, subject, html_body, text_body)


def send_order_delivered_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    order_total: float,
    driver_name: str
) -> bool:
    """
    Send email when order is delivered.
    """
    subject = f"Order Delivered! #{order_number}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; text-align: center; }}
            .tip-box {{ background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Order Delivered!</h2>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>Your order <strong>#{order_number}</strong> has been delivered!</p>
                <p>Total: <strong>${order_total:.2f}</strong></p>

                <div class="tip-box">
                    <p>Enjoyed your delivery?</p>
                    <p>Leave a tip for <strong>{driver_name}</strong> in the app!</p>
                    <p style="font-size: 12px; color: #92400e;">Drivers keep 100% of tips on Dollor.ai</p>
                </div>

                <p>Thank you for choosing Dollor.ai!</p>
            </div>
            <div class="footer">
                <p>Rate your experience in the app</p>
                <p>2025 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Order Delivered!

    Hi {customer_name},

    Your order #{order_number} has been delivered!
    Total: ${order_total:.2f}

    Enjoyed your delivery? Leave a tip for {driver_name} in the app!
    Drivers keep 100% of tips on Dollor.ai.

    Thank you for choosing Dollor.ai!

    - The Dollor.ai Team
    """

    return send_email(to_email, subject, html_body, text_body)


def send_order_cancelled_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    reason: str = "Order was cancelled",
    refund_amount: float = None
) -> bool:
    """
    Send email when order is cancelled.
    """
    subject = f"Order Cancelled - #{order_number}"

    refund_text = f"<p>A refund of <strong>${refund_amount:.2f}</strong> will be processed within 5-10 business days.</p>" if refund_amount else ""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .reason-box {{ background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Order Cancelled</h2>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>We're sorry, but your order <strong>#{order_number}</strong> has been cancelled.</p>

                <div class="reason-box">
                    <p><strong>Reason:</strong> {reason}</p>
                    {refund_text}
                </div>

                <p>We apologize for any inconvenience. Please try ordering again or contact support if you have questions.</p>
            </div>
            <div class="footer">
                <p>Need help? support@dollor.ai</p>
                <p>2025 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Order Cancelled

    Hi {customer_name},

    Your order #{order_number} has been cancelled.
    Reason: {reason}
    {f'Refund: ${refund_amount:.2f} will be processed within 5-10 business days.' if refund_amount else ''}

    We apologize for any inconvenience.

    - The Dollor.ai Team
    """

    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_email(
    to_email: str,
    customer_name: str,
    reset_code: str
) -> bool:
    """
    Send password reset code to customer.
    """
    subject = f"Your Dollor.ai Password Reset Code: {reset_code}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 24px; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }}
            .code-box {{ background: #f8f9fa; border: 2px dashed #FF6B35; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }}
            .code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF6B35; font-family: monospace; }}
            .footer {{ background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }}
            .warning {{ background: #FFF3CD; border: 1px solid #FFEEBA; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset</h1>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>

                <p>We received a request to reset your password. Use the code below to complete the process:</p>

                <div class="code-box">
                    <div class="code">{reset_code}</div>
                </div>

                <p>Enter this code in the app to reset your password.</p>

                <div class="warning">
                    <strong>This code expires in 15 minutes.</strong><br>
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                </div>

                <p>Thanks,<br>The Dollor.ai Team</p>
            </div>
            <div class="footer">
                <p>2024 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Password Reset - Dollor.ai

    Hi {customer_name},

    We received a request to reset your password. Use the code below:

    {reset_code}

    Enter this code in the app to reset your password.

    This code expires in 15 minutes.
    If you didn't request this, please ignore this email.

    Thanks,
    The Dollor.ai Team

    2024 Dollor.ai by Vibing World Inc.
    """

    return send_email(to_email, subject, html_body, text_body)


def send_new_order_vendor_email(
    to_email: str,
    restaurant_name: str,
    order_number: str,
    customer_name: str,
    order_total: float,
    items_summary: str = ""
) -> bool:
    """
    Send email to vendor when new order is received.
    """
    subject = f"New Order #{order_number} - ${order_total:.2f}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .order-box {{ background: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #f59e0b; }}
            .urgent {{ font-size: 18px; color: #d97706; font-weight: bold; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>New Order!</h2>
            </div>
            <div class="content">
                <p class="urgent">Please confirm within 3 minutes</p>

                <div class="order-box">
                    <h3>Order #{order_number}</h3>
                    <p><strong>Customer:</strong> {customer_name}</p>
                    {f'<p><strong>Items:</strong> {items_summary}</p>' if items_summary else ''}
                    <p><strong>Total:</strong> ${order_total:.2f}</p>
                </div>

                <p>Open the Dollor.ai Partner app to accept this order!</p>
            </div>
            <div class="footer">
                <p>{restaurant_name}</p>
                <p>2025 Dollor.ai by Vibing World Inc.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    NEW ORDER for {restaurant_name}!

    Order #{order_number}
    Customer: {customer_name}
    Total: ${order_total:.2f}

    Please confirm within 3 minutes!
    Open the Dollor.ai Partner app to accept.

    - Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


# ==================== RIDESHARE LIFECYCLE EMAILS ====================

def send_ride_request_confirmation_email(
    to_email: str,
    customer_name: str,
    request_id: str,
    pickup_address: str,
    dropoff_address: str,
    estimated_price: float,
    estimated_distance_miles: float,
    estimated_duration_minutes: int
) -> bool:
    """
    Send confirmation email when customer creates a ride request.
    """
    subject = f"Ride Request Submitted - {request_id}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 20px; text-align: center; color: white; }}
            .logo {{ font-size: 28px; font-weight: bold; }}
            .content {{ padding: 30px; }}
            .ride-box {{ background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .location {{ display: flex; align-items: flex-start; margin: 15px 0; }}
            .location-icon {{ width: 24px; height: 24px; margin-right: 12px; font-size: 20px; }}
            .location-text {{ flex: 1; }}
            .location-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; }}
            .location-address {{ font-size: 16px; color: #1e293b; margin-top: 4px; }}
            .trip-details {{ display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #eff6ff; border-radius: 8px; }}
            .detail {{ text-align: center; }}
            .detail-value {{ font-size: 24px; font-weight: bold; color: #4f46e5; }}
            .detail-label {{ font-size: 12px; color: #64748b; margin-top: 4px; }}
            .status {{ display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 10px 0; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Dollor.ai Rides</div>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ride request is live!</p>
            </div>
            <div class="content">
                <h2>Hi {customer_name}!</h2>
                <p>Your ride request has been submitted and drivers in your area are being notified.</p>

                <div class="ride-box">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <span class="status">Waiting for Bids</span>
                    </div>

                    <div class="location">
                        <div class="location-icon">📍</div>
                        <div class="location-text">
                            <div class="location-label">Pickup</div>
                            <div class="location-address">{pickup_address}</div>
                        </div>
                    </div>

                    <div class="location">
                        <div class="location-icon">🏁</div>
                        <div class="location-text">
                            <div class="location-label">Dropoff</div>
                            <div class="location-address">{dropoff_address}</div>
                        </div>
                    </div>

                    <div class="trip-details">
                        <div class="detail">
                            <div class="detail-value">${estimated_price:.2f}</div>
                            <div class="detail-label">Est. Fare</div>
                        </div>
                        <div class="detail">
                            <div class="detail-value">{estimated_distance_miles:.1f}</div>
                            <div class="detail-label">Miles</div>
                        </div>
                        <div class="detail">
                            <div class="detail-value">{estimated_duration_minutes}</div>
                            <div class="detail-label">Minutes</div>
                        </div>
                    </div>
                </div>

                <p><strong>What happens next?</strong></p>
                <p>Drivers will submit their fare proposals. You'll receive notifications as bids come in, and you can choose the best offer.</p>
                <p>Check the Dollor.ai app to view and accept bids!</p>
            </div>
            <div class="footer">
                <p>Request ID: {request_id}</p>
                <p>© 2025 Dollor.ai - Fair Rideshare Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Ride Request Submitted - Dollor.ai

    Hi {customer_name},

    Your ride request has been submitted!

    REQUEST ID: {request_id}

    PICKUP: {pickup_address}
    DROPOFF: {dropoff_address}

    TRIP DETAILS:
    - Estimated Fare: ${estimated_price:.2f}
    - Distance: {estimated_distance_miles:.1f} miles
    - Duration: {estimated_duration_minutes} minutes

    Drivers will submit their fare proposals. Check the app to view and accept bids!

    © 2025 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_ride_bid_received_email(
    to_email: str,
    customer_name: str,
    request_id: str,
    driver_name: str,
    driver_rating: float,
    proposed_price: float,
    eta_minutes: int,
    total_bids: int
) -> bool:
    """
    Send email when a driver submits a bid on customer's ride request.
    """
    subject = f"New Bid Received - ${proposed_price:.2f} | {request_id}"

    # Format rating stars
    full_stars = int(driver_rating) if driver_rating else 0
    rating_display = "★" * full_stars + "☆" * (5 - full_stars)
    rating_value = driver_rating if driver_rating else 0.0

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .bid-box {{ background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border: 2px solid #10b981; }}
            .bid-price {{ font-size: 48px; font-weight: bold; color: #059669; text-align: center; }}
            .driver-info {{ display: flex; align-items: center; margin: 20px 0; padding: 15px; background: white; border-radius: 8px; }}
            .driver-avatar {{ width: 50px; height: 50px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; margin-right: 15px; }}
            .driver-details {{ flex: 1; }}
            .driver-name {{ font-size: 18px; font-weight: bold; color: #1e293b; }}
            .driver-rating {{ color: #f59e0b; font-size: 14px; }}
            .eta-badge {{ display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 8px 16px; border-radius: 20px; font-size: 14px; }}
            .cta-button {{ display: inline-block; background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>New Bid Received!</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">You have {total_bids} bid(s) waiting</p>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>A driver has submitted a bid for your ride!</p>

                <div class="bid-box">
                    <div class="bid-price">${proposed_price:.2f}</div>

                    <div class="driver-info">
                        <div class="driver-avatar">🚗</div>
                        <div class="driver-details">
                            <div class="driver-name">{driver_name}</div>
                            <div class="driver-rating">{rating_display} ({rating_value:.1f})</div>
                        </div>
                        <span class="eta-badge">{eta_minutes} min away</span>
                    </div>
                </div>

                <center>
                    <a href="https://dollor.ai/customer/rides" class="cta-button">
                        View All Bids
                    </a>
                </center>

                <p style="text-align: center; color: #64748b; font-size: 14px;">
                    Compare bids and choose the best offer for your ride!
                </p>
            </div>
            <div class="footer">
                <p>Request ID: {request_id}</p>
                <p>© 2025 Dollor.ai - Fair Rideshare Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    New Bid Received - Dollor.ai

    Hi {customer_name},

    A driver has submitted a bid for your ride!

    BID DETAILS:
    - Price: ${proposed_price:.2f}
    - Driver: {driver_name}
    - Rating: {rating_value:.1f}/5
    - ETA: {eta_minutes} minutes

    You have {total_bids} bid(s) total.

    View all bids in the Dollor.ai app!

    Request ID: {request_id}
    © 2025 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_ride_matched_email(
    to_email: str,
    customer_name: str,
    request_id: str,
    driver_name: str,
    driver_phone: str,
    driver_vehicle: str,
    final_price: float,
    eta_minutes: int,
    pickup_address: str
) -> bool:
    """
    Send email when customer accepts a bid and ride is matched.
    """
    subject = f"Ride Confirmed! Driver {driver_name} is on the way"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .match-badge {{ background: #22c55e; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: bold; margin: 10px 0; }}
            .driver-card {{ background: #f8fafc; border-radius: 16px; padding: 25px; margin: 20px 0; }}
            .driver-header {{ display: flex; align-items: center; margin-bottom: 20px; }}
            .driver-avatar {{ width: 70px; height: 70px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; margin-right: 20px; }}
            .driver-info h3 {{ margin: 0 0 5px 0; color: #1e293b; font-size: 22px; }}
            .vehicle-info {{ color: #64748b; font-size: 14px; }}
            .contact-btn {{ display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 10px 5px 10px 0; }}
            .eta-box {{ background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
            .eta-time {{ font-size: 48px; font-weight: bold; color: #1d4ed8; }}
            .eta-label {{ color: #64748b; font-size: 14px; margin-top: 5px; }}
            .price-box {{ background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
            .price {{ font-size: 36px; font-weight: bold; color: #16a34a; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Ride Confirmed!</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your driver is on the way</p>
            </div>
            <div class="content">
                <center><span class="match-badge">MATCHED</span></center>

                <p>Hi {customer_name},</p>
                <p>Great news! Your ride has been confirmed. Your driver is heading to pick you up!</p>

                <div class="driver-card">
                    <div class="driver-header">
                        <div class="driver-avatar">🚗</div>
                        <div class="driver-info">
                            <h3>{driver_name}</h3>
                            <div class="vehicle-info">{driver_vehicle if driver_vehicle else 'Vehicle info pending'}</div>
                        </div>
                    </div>
                    <a href="tel:{driver_phone}" class="contact-btn">📞 Call Driver</a>
                    <a href="sms:{driver_phone}" class="contact-btn">💬 Text Driver</a>
                </div>

                <div class="eta-box">
                    <div class="eta-time">{eta_minutes}</div>
                    <div class="eta-label">minutes until pickup</div>
                </div>

                <div class="price-box">
                    <div style="font-size: 14px; color: #64748b;">Agreed Fare</div>
                    <div class="price">${final_price:.2f}</div>
                </div>

                <div style="background: #fffbeb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <strong>📍 Pickup Location:</strong><br>
                    {pickup_address}
                </div>

                <p style="text-align: center; color: #64748b;">
                    Track your driver in real-time in the Dollor.ai app!
                </p>
            </div>
            <div class="footer">
                <p>Request ID: {request_id}</p>
                <p>© 2025 Dollor.ai - Fair Rideshare Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Ride Confirmed! - Dollor.ai

    Hi {customer_name},

    Your ride has been confirmed!

    DRIVER DETAILS:
    - Name: {driver_name}
    - Vehicle: {driver_vehicle if driver_vehicle else 'Vehicle info pending'}
    - Phone: {driver_phone}

    ETA: {eta_minutes} minutes

    FARE: ${final_price:.2f}

    PICKUP: {pickup_address}

    Track your driver in the Dollor.ai app!

    Request ID: {request_id}
    © 2025 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_ride_started_email(
    to_email: str,
    customer_name: str,
    request_id: str,
    driver_name: str,
    pickup_address: str,
    dropoff_address: str,
    estimated_duration_minutes: int,
    final_price: float
) -> bool:
    """
    Send email when ride starts (customer picked up).
    """
    subject = f"Ride Started! On the way to your destination"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .status-badge {{ background: #6366f1; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: bold; margin: 10px 0; }}
            .route-box {{ background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .route-point {{ display: flex; align-items: flex-start; margin: 15px 0; }}
            .route-icon {{ font-size: 20px; margin-right: 12px; }}
            .route-line {{ border-left: 2px dashed #cbd5e1; margin-left: 10px; height: 30px; }}
            .duration-box {{ background: linear-gradient(135deg, #ede9fe, #ddd6fe); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
            .duration-time {{ font-size: 36px; font-weight: bold; color: #4f46e5; }}
            .fare-info {{ background: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🚗 Ride In Progress</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Enjoy your ride!</p>
            </div>
            <div class="content">
                <center><span class="status-badge">IN PROGRESS</span></center>

                <p>Hi {customer_name},</p>
                <p>You're on your way with <strong>{driver_name}</strong>!</p>

                <div class="route-box">
                    <div class="route-point">
                        <span class="route-icon">🟢</span>
                        <div>
                            <div style="font-size: 12px; color: #64748b;">PICKED UP FROM</div>
                            <div>{pickup_address}</div>
                        </div>
                    </div>
                    <div class="route-line"></div>
                    <div class="route-point">
                        <span class="route-icon">🏁</span>
                        <div>
                            <div style="font-size: 12px; color: #64748b;">HEADING TO</div>
                            <div>{dropoff_address}</div>
                        </div>
                    </div>
                </div>

                <div class="duration-box">
                    <div style="font-size: 14px; color: #64748b;">Estimated Arrival</div>
                    <div class="duration-time">{estimated_duration_minutes} min</div>
                </div>

                <div class="fare-info">
                    <div style="font-size: 14px; color: #64748b;">Trip Fare</div>
                    <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${final_price:.2f}</div>
                </div>
            </div>
            <div class="footer">
                <p>Request ID: {request_id}</p>
                <p>© 2025 Dollor.ai - Fair Rideshare Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Ride In Progress - Dollor.ai

    Hi {customer_name},

    Your ride with {driver_name} has started!

    FROM: {pickup_address}
    TO: {dropoff_address}

    ESTIMATED ARRIVAL: {estimated_duration_minutes} minutes
    FARE: ${final_price:.2f}

    Enjoy your ride!

    Request ID: {request_id}
    © 2025 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_ride_completed_email(
    to_email: str,
    customer_name: str,
    request_id: str,
    driver_name: str,
    pickup_address: str,
    dropoff_address: str,
    final_price: float,
    platform_fee: float,
    distance_miles: float,
    duration_minutes: int
) -> bool:
    """
    Send email when ride is completed with receipt.
    """
    subject = f"Ride Complete! Receipt for ${final_price:.2f}"

    driver_earnings = final_price - platform_fee

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .complete-icon {{ font-size: 64px; text-align: center; margin: 20px 0; }}
            .receipt-box {{ background: #f8fafc; border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #e2e8f0; }}
            .receipt-header {{ border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px; }}
            .receipt-row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
            .receipt-label {{ color: #64748b; }}
            .receipt-value {{ font-weight: 500; color: #1e293b; }}
            .receipt-total {{ display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #1e293b; margin-top: 15px; }}
            .total-label {{ font-size: 18px; font-weight: bold; }}
            .total-value {{ font-size: 24px; font-weight: bold; color: #22c55e; }}
            .tip-box {{ background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }}
            .tip-button {{ display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 5px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
            .driver-earnings {{ background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Ride Complete!</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thanks for riding with Dollor.ai</p>
            </div>
            <div class="content">
                <div class="complete-icon">🎉</div>

                <p>Hi {customer_name},</p>
                <p>You've arrived at your destination. Here's your trip receipt:</p>

                <div class="receipt-box">
                    <div class="receipt-header">
                        <strong>Trip Receipt</strong><br>
                        <span style="color: #64748b; font-size: 14px;">{request_id}</span>
                    </div>

                    <div class="receipt-row">
                        <span class="receipt-label">Driver</span>
                        <span class="receipt-value">{driver_name}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">From</span>
                        <span class="receipt-value">{pickup_address[:40]}...</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">To</span>
                        <span class="receipt-value">{dropoff_address[:40]}...</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Distance</span>
                        <span class="receipt-value">{distance_miles:.1f} miles</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Duration</span>
                        <span class="receipt-value">{duration_minutes} min</span>
                    </div>

                    <div class="receipt-row">
                        <span class="receipt-label">Trip Fare</span>
                        <span class="receipt-value">${final_price:.2f}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Platform Fee</span>
                        <span class="receipt-value">${platform_fee:.2f}</span>
                    </div>

                    <div class="receipt-total">
                        <span class="total-label">Total Charged</span>
                        <span class="total-value">${final_price:.2f}</span>
                    </div>
                </div>

                <div class="driver-earnings">
                    <div style="font-size: 14px; color: #059669;">💰 {driver_name} earned</div>
                    <div style="font-size: 20px; font-weight: bold; color: #059669;">${driver_earnings:.2f}</div>
                    <div style="font-size: 12px; color: #64748b;">Drivers keep the fare, platform fee goes to Dollor.ai</div>
                </div>

                <div class="tip-box">
                    <p style="margin: 0 0 15px 0;"><strong>Enjoyed your ride?</strong></p>
                    <p style="margin: 0 0 15px 0; color: #92400e;">Add a tip for {driver_name}</p>
                    <a href="https://dollor.ai/customer/rides/{request_id}/tip" class="tip-button">Add Tip</a>
                    <p style="font-size: 12px; color: #92400e; margin: 15px 0 0 0;">100% of tips go directly to your driver</p>
                </div>

                <p style="text-align: center;">
                    <a href="https://dollor.ai/customer/rides/{request_id}/rate" style="color: #6366f1;">Rate your ride</a>
                </p>
            </div>
            <div class="footer">
                <p>Request ID: {request_id}</p>
                <p>© 2025 Dollor.ai - Fair Rideshare Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Ride Complete - Dollor.ai Receipt

    Hi {customer_name},

    Thanks for riding with Dollor.ai! Here's your receipt:

    TRIP DETAILS
    ------------
    Request ID: {request_id}
    Driver: {driver_name}
    From: {pickup_address}
    To: {dropoff_address}
    Distance: {distance_miles:.1f} miles
    Duration: {duration_minutes} min

    CHARGES
    -------
    Trip Fare: ${final_price:.2f}
    Platform Fee: ${platform_fee:.2f}
    -----------------
    TOTAL: ${final_price:.2f}

    {driver_name} earned ${driver_earnings:.2f}

    Add a tip for your driver at:
    https://dollor.ai/customer/rides/{request_id}/tip

    © 2025 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)


def send_ride_cancelled_email(
    to_email: str,
    customer_name: str,
    request_id: str,
    cancelled_by: str,
    reason: str,
    refund_amount: float = None
) -> bool:
    """
    Send email when ride is cancelled.
    """
    subject = f"Ride Cancelled - {request_id}"

    refund_text = f"""
        <div class="refund-box">
            <p style="margin: 0;">💳 Refund Processing</p>
            <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 10px 0;">${refund_amount:.2f}</p>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Will be credited within 5-10 business days</p>
        </div>
    """ if refund_amount else ""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; }}
            .header {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 20px; text-align: center; color: white; }}
            .content {{ padding: 30px; }}
            .cancel-icon {{ font-size: 64px; text-align: center; margin: 20px 0; }}
            .reason-box {{ background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .refund-box {{ background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }}
            .cta-button {{ display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Ride Cancelled</h2>
            </div>
            <div class="content">
                <div class="cancel-icon">❌</div>

                <p>Hi {customer_name},</p>
                <p>Your ride request has been cancelled.</p>

                <div class="reason-box">
                    <p style="margin: 0 0 10px 0;"><strong>Cancelled by:</strong> {cancelled_by}</p>
                    <p style="margin: 0;"><strong>Reason:</strong> {reason}</p>
                </div>

                {refund_text}

                <p>We apologize for any inconvenience. You can request a new ride anytime!</p>

                <center>
                    <a href="https://dollor.ai/customer/rides/new" class="cta-button">
                        Request New Ride
                    </a>
                </center>
            </div>
            <div class="footer">
                <p>Request ID: {request_id}</p>
                <p>Need help? Contact support@dollor.ai</p>
                <p>© 2025 Dollor.ai - Fair Rideshare Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Ride Cancelled - Dollor.ai

    Hi {customer_name},

    Your ride request {request_id} has been cancelled.

    Cancelled by: {cancelled_by}
    Reason: {reason}
    {f'Refund: ${refund_amount:.2f} will be processed within 5-10 business days.' if refund_amount else ''}

    You can request a new ride anytime at https://dollor.ai

    Need help? Contact support@dollor.ai

    © 2025 Dollor.ai
    """

    return send_email(to_email, subject, html_body, text_body)
