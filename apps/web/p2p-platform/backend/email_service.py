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
