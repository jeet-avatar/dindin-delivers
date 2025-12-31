"""
Email Service for Dollor.ai
Sends transactional emails for vendor approvals, order notifications, etc.
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# Email configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@dollor.ai")
FROM_NAME = os.getenv("FROM_NAME", "Dollor.ai")


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Send an email using SMTP.
    Returns True if successful, False otherwise.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"📧 Email would be sent to {to_email}: {subject}")
        print(f"   (SMTP not configured - email logged only)")
        return True  # Return True in dev mode

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email

        # Add plain text and HTML parts
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        print(f"✅ Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
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
