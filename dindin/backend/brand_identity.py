"""
DOLLOR.AI - BRAND IDENTITY & EMAIL TEMPLATES
=============================================

Brand Guidelines, Email Templates, and Legal Framework
for a professional, trustworthy delivery platform.
"""

# =============================================================================
# BRAND IDENTITY
# =============================================================================

BRAND = {
    # Company Info
    "name": "Dollor.ai",
    "legal_name": "Dollor Technologies Inc.",
    "website": "https://dollor.ai",
    "support_email": "support@dollor.ai",
    "orders_email": "orders@dollor.ai",
    "legal_email": "legal@dollor.ai",

    # Tagline Options (ranked by impact)
    "tagline_primary": "Every Dollar Counts.",
    "tagline_secondary": "Transparent Delivery. Fair for Everyone.",
    "tagline_drivers": "Drivers Keep 100%.",
    "tagline_restaurants": "Fair Fees. Real Partners.",
    "tagline_customers": "Know Where Your Money Goes.",

    # Brand Story
    "mission": "To create the most transparent delivery platform where drivers keep 100% of their earnings, restaurants pay fair flat fees, and customers know exactly where every dollar goes.",

    "value_proposition": {
        "drivers": "Keep 100% of delivery fees and tips. No hidden deductions.",
        "restaurants": "Flat $1-$3 fee instead of 15-30% commission.",
        "customers": "Transparent pricing. No surge. No hidden fees."
    },

    # Brand Colors
    "colors": {
        "primary": "#4F46E5",      # Indigo - Trust, Technology
        "secondary": "#10B981",    # Emerald - Money, Growth, Success
        "accent": "#F59E0B",       # Amber - Energy, Warmth
        "success": "#22C55E",      # Green - Positive, Complete
        "warning": "#EAB308",      # Yellow - Attention
        "error": "#EF4444",        # Red - Alert
        "dark": "#1F2937",         # Charcoal - Professional
        "light": "#F9FAFB",        # Off-white - Clean
        "white": "#FFFFFF",
    },

    # Typography
    "fonts": {
        "heading": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        "body": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        "mono": "SF Mono, Monaco, monospace"
    },

    # Logo (SVG representation - use actual logo file in production)
    "logo_concept": """
    The Dollor.ai logo combines:
    - A stylized 'D' representing Dollor
    - A dollar sign ($) subtly integrated
    - A circular arrow suggesting flow/circulation of money
    - Clean, modern lines conveying technology and trust

    Color: Primary Indigo (#4F46E5) with Emerald accent (#10B981)
    """,

    # App Icons
    "app_icons": {
        "customer": "Shopping bag with dollar transparency symbol",
        "driver": "Steering wheel with upward arrow (earnings)",
        "restaurant": "Storefront with handshake symbol"
    }
}

# =============================================================================
# EMAIL TEMPLATE SYSTEM
# =============================================================================

def get_email_base_styles():
    """Professional email CSS styles"""
    return """
    <style>
        /* Reset */
        body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

        /* Base */
        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #F3F4F6;
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1F2937;
        }

        /* Container */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        /* Header */
        .email-header {
            background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .email-header.success {
            background: linear-gradient(135deg, #10B981 0%, #22C55E 100%);
        }
        .email-header.warning {
            background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
        }
        .email-header h1 {
            color: #FFFFFF;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 8px 0;
        }
        .email-header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin: 0;
        }

        /* Logo */
        .logo {
            font-size: 32px;
            font-weight: 800;
            color: #FFFFFF;
            letter-spacing: -1px;
            margin-bottom: 20px;
        }
        .logo span {
            color: #A5F3FC;
        }

        /* Content */
        .email-content {
            padding: 40px 30px;
        }
        .email-content h2 {
            font-size: 22px;
            font-weight: 600;
            color: #1F2937;
            margin: 0 0 16px 0;
        }
        .email-content p {
            font-size: 16px;
            color: #4B5563;
            margin: 0 0 16px 0;
        }

        /* Order Box */
        .order-box {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }
        .order-box h3 {
            font-size: 14px;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 16px 0;
        }
        .order-number {
            font-size: 20px;
            font-weight: 700;
            color: #4F46E5;
            margin-bottom: 16px;
        }

        /* Line Items */
        .line-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #E5E7EB;
        }
        .line-item:last-child {
            border-bottom: none;
        }
        .line-item-label {
            color: #4B5563;
            font-size: 15px;
        }
        .line-item-value {
            color: #1F2937;
            font-weight: 600;
            font-size: 15px;
        }
        .line-item.total {
            border-top: 2px solid #E5E7EB;
            margin-top: 8px;
            padding-top: 16px;
        }
        .line-item.total .line-item-label,
        .line-item.total .line-item-value {
            font-size: 18px;
            font-weight: 700;
            color: #1F2937;
        }

        /* Highlight Box */
        .highlight-box {
            background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
            border: 1px solid #A7F3D0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
        }
        .highlight-box.earnings {
            background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
            border-color: #C7D2FE;
        }
        .highlight-amount {
            font-size: 36px;
            font-weight: 800;
            color: #10B981;
            margin: 8px 0;
        }
        .highlight-box.earnings .highlight-amount {
            color: #4F46E5;
        }
        .highlight-label {
            font-size: 14px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Transparency Section */
        .transparency-section {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .transparency-section h4 {
            font-size: 14px;
            font-weight: 600;
            color: #92400E;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
        }
        .transparency-section h4::before {
            content: "💡";
            margin-right: 8px;
        }
        .transparency-section p {
            font-size: 14px;
            color: #78716C;
            margin: 0;
        }

        /* Button */
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
            color: #FFFFFF !important;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            margin: 16px 0;
        }
        .button:hover {
            background: linear-gradient(135deg, #4338CA 0%, #4F46E5 100%);
        }
        .button.secondary {
            background: #F3F4F6;
            color: #4B5563 !important;
        }

        /* Footer */
        .email-footer {
            background: #1F2937;
            padding: 30px;
            text-align: center;
        }
        .email-footer p {
            color: #9CA3AF;
            font-size: 13px;
            margin: 8px 0;
        }
        .email-footer a {
            color: #A5B4FC;
            text-decoration: none;
        }
        .footer-links {
            margin: 16px 0;
        }
        .footer-links a {
            color: #9CA3AF;
            font-size: 12px;
            margin: 0 12px;
        }
        .tagline {
            color: #FFFFFF;
            font-size: 14px;
            font-weight: 600;
            margin-top: 16px;
        }

        /* Social */
        .social-links {
            margin: 16px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 8px;
        }

        /* Mobile */
        @media screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            .email-header, .email-content, .email-footer {
                padding: 24px 20px;
            }
        }
    </style>
    """


def get_email_header(title: str, subtitle: str = None, header_type: str = "default"):
    """Generate email header HTML"""
    header_class = f"email-header {header_type}" if header_type != "default" else "email-header"
    subtitle_html = f'<p>{subtitle}</p>' if subtitle else ""

    return f"""
    <div class="{header_class}">
        <div class="logo">Dollor<span>.ai</span></div>
        <h1>{title}</h1>
        {subtitle_html}
    </div>
    """


def get_email_footer():
    """Generate email footer HTML"""
    return """
    <div class="email-footer">
        <div class="footer-links">
            <a href="https://dollor.ai/privacy">Privacy Policy</a>
            <a href="https://dollor.ai/terms">Terms of Service</a>
            <a href="https://dollor.ai/support">Help Center</a>
        </div>
        <p>Questions? Contact us at <a href="mailto:support@dollor.ai">support@dollor.ai</a></p>
        <p class="tagline">Every Dollar Counts.</p>
        <p style="margin-top: 16px; font-size: 11px; color: #6B7280;">
            Dollor Technologies Inc. | San Francisco, CA<br>
            You're receiving this because you placed an order on Dollor.ai<br>
            <a href="https://dollor.ai/unsubscribe">Unsubscribe from marketing emails</a>
        </p>
    </div>
    """


# =============================================================================
# EMAIL TEMPLATES
# =============================================================================

def generate_customer_order_confirmation_email(
    customer_name: str,
    order_id: str = None,  # Alias for order_number (main_new.py compatibility)
    order_number: str = None,  # Original parameter name
    restaurant_name: str = "",
    items: list = None,
    subtotal: float = 0.0,
    tax: float = 0.0,
    delivery_fee: float = 0.0,
    platform_fee: float = 0.0,
    tip: float = 0.0,
    total: float = 0.0,
    delivery_address: str = "",
    estimated_time: str = "30-45 minutes"
) -> tuple:
    """
    Generate customer order confirmation email
    Returns: (subject, html_content) tuple for compatibility with main_new.py
    """
    # Handle order_id alias
    order_num = order_number or order_id or "UNKNOWN"
    items = items or []

    items_html = ""
    for item in items:
        # Support both 'total' and 'price' keys for item pricing
        item_price = item.get('total', item.get('price', 0))
        qty = item.get('quantity', 1)
        items_html += f"""
        <div class="line-item">
            <span class="line-item-label">{item.get('name', 'Item')} x{qty}</span>
            <span class="line-item-value">${item_price:.2f}</span>
        </div>
        """

    subject = f"Order Confirmed! #{order_num} from {restaurant_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmed - {order_number}</title>
        {get_email_base_styles()}
    </head>
    <body>
        <div class="email-container">
            {get_email_header("Order Confirmed!", f"From {restaurant_name}", "success")}

            <div class="email-content">
                <h2>Hi {customer_name},</h2>
                <p>Your order has been confirmed and the restaurant is preparing your food!</p>

                <div class="order-box">
                    <h3>Order Details</h3>
                    <div class="order-number">#{order_number}</div>

                    {items_html}

                    <div class="line-item">
                        <span class="line-item-label">Subtotal</span>
                        <span class="line-item-value">${subtotal:.2f}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Tax</span>
                        <span class="line-item-value">${tax:.2f}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Delivery Fee</span>
                        <span class="line-item-value">${delivery_fee:.2f}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Platform Fee</span>
                        <span class="line-item-value">${platform_fee:.2f}</span>
                    </div>
                    {"<div class='line-item'><span class='line-item-label'>Tip</span><span class='line-item-value'>$" + f"{tip:.2f}" + "</span></div>" if tip > 0 else ""}
                    <div class="line-item total">
                        <span class="line-item-label">Total</span>
                        <span class="line-item-value">${total:.2f}</span>
                    </div>
                </div>

                <div class="order-box">
                    <h3>Delivery To</h3>
                    <p style="margin: 0; color: #1F2937; font-weight: 500;">{delivery_address}</p>
                    <p style="margin: 8px 0 0 0; color: #6B7280;">Estimated: {estimated_time}</p>
                </div>

                <div class="transparency-section">
                    <h4>Where Your Money Goes</h4>
                    <p>
                        <strong>${subtotal:.2f}</strong> goes to {restaurant_name}<br>
                        <strong>${delivery_fee + tip:.2f}</strong> goes to your driver (100% - no platform cut)<br>
                        <strong>${platform_fee:.2f}</strong> platform fee (transparent, flat rate)<br>
                        <strong>${tax:.2f}</strong> tax (collected for the state)
                    </p>
                </div>

                <div style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_num}/track" class="button">Track Your Order</a>
                </div>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return (subject, html_content)


def generate_customer_delivery_complete_email(
    customer_name: str,
    order_id: str = None,  # Alias for order_number (main_new.py compatibility)
    order_number: str = None,  # Original parameter name
    restaurant_name: str = "",
    driver_name: str = "",
    total: float = 0.0,
    tip_amount: float = 0.0,  # Alias for tip (main_new.py compatibility)
    tip: float = 0.0,
    delivery_fee: float = 0.0
) -> tuple:
    """
    Generate customer delivery completion email
    Returns: (subject, html_content) tuple for compatibility with main_new.py
    """
    # Handle aliases
    order_num = order_number or order_id or "UNKNOWN"
    tip_val = tip or tip_amount or 0.0

    subject = f"Order #{order_num} delivered! Enjoy your meal!"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered - {order_num}</title>
        {get_email_base_styles()}
    </head>
    <body>
        <div class="email-container">
            {get_email_header("Order Delivered!", "Enjoy your meal", "success")}

            <div class="email-content">
                <h2>Hi {customer_name},</h2>
                <p>Your order from <strong>{restaurant_name}</strong> has been delivered by <strong>{driver_name}</strong>.</p>

                <div class="highlight-box">
                    <div class="highlight-label">Order Total</div>
                    <div class="highlight-amount">${total:.2f}</div>
                    <div class="order-number">#{order_num}</div>
                </div>

                <div class="transparency-section">
                    <h4>Your Driver Earned ${delivery_fee + tip_val:.2f}</h4>
                    <p>
                        {driver_name} received <strong>100%</strong> of the delivery fee (${delivery_fee:.2f})
                        {f"plus your ${tip_val:.2f} tip" if tip_val > 0 else ""}.
                        Dollor.ai takes zero cut from driver earnings.
                    </p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                    <p style="margin-bottom: 16px;"><strong>How was your experience?</strong></p>
                    <a href="https://dollor.ai/orders/{order_num}/rate?stars=5" style="font-size: 32px; text-decoration: none;">⭐⭐⭐⭐⭐</a>
                </div>

                <div style="text-align: center;">
                    <a href="https://dollor.ai/orders/{order_num}/receipt" class="button">View Receipt</a>
                    <br>
                    <a href="https://dollor.ai/orders/{order_num}/support" class="button secondary">Report an Issue</a>
                </div>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return (subject, html_content)


def generate_restaurant_new_order_email(
    restaurant_name: str,
    order_id: str = None,  # Alias for order_number (main_new.py compatibility)
    order_number: str = None,  # Original parameter name
    customer_name: str = "",
    items: list = None,
    total: float = 0.0,  # main_new.py compatibility - used to calculate net_payout
    subtotal: float = 0.0,
    platform_fee: float = 0.0,
    net_payout: float = 0.0,
    delivery_method: str = "driver",
    special_instructions: str = None
) -> tuple:
    """
    Generate restaurant new order notification email
    Returns: (subject, html_content) tuple for compatibility with main_new.py
    """
    # Handle aliases
    order_num = order_number or order_id or "UNKNOWN"
    items = items or []

    # Calculate net_payout if not provided (use total as subtotal if subtotal not given)
    if subtotal == 0 and total > 0:
        subtotal = total
    if net_payout == 0 and subtotal > 0:
        net_payout = subtotal - platform_fee

    items_html = ""
    for item in items:
        # Support both 'total' and 'price' keys for item pricing
        item_price = item.get('total', item.get('price', 0))
        items_html += f"""
        <div class="line-item">
            <span class="line-item-label">{item.get('name', 'Item')} x{item.get('quantity', 1)}</span>
            <span class="line-item-value">${item_price:.2f}</span>
        </div>
        """

    instructions_html = ""
    if special_instructions:
        instructions_html = f"""
        <div class="order-box" style="background: #FEF3C7; border-color: #FCD34D;">
            <h3 style="color: #92400E;">Special Instructions</h3>
            <p style="margin: 0; color: #78350F;">{special_instructions}</p>
        </div>
        """

    subject = f"New Order #{order_num} - ${total:.2f}"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order - {order_num}</title>
        {get_email_base_styles()}
    </head>
    <body>
        <div class="email-container">
            {get_email_header("New Order!", f"Order #{order_num}", "warning")}

            <div class="email-content">
                <h2>{restaurant_name}</h2>
                <p>You have a new order from <strong>{customer_name}</strong>!</p>

                <div class="order-box">
                    <h3>Order Items</h3>
                    {items_html}
                </div>

                {instructions_html}

                <div class="highlight-box earnings">
                    <div class="highlight-label">Your Payout</div>
                    <div class="highlight-amount">${net_payout:.2f}</div>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6B7280;">
                        ${subtotal:.2f} subtotal - ${platform_fee:.2f} platform fee
                    </p>
                </div>

                <div class="transparency-section">
                    <h4>Dollor.ai Fair Fee</h4>
                    <p>
                        Your platform fee is only <strong>${platform_fee:.2f}</strong>
                        ({((platform_fee/subtotal)*100):.1f}% effective rate).<br>
                        Compare to competitors: 15-30% commission.
                    </p>
                </div>

                <div style="text-align: center;">
                    <a href="https://dollor.ai/restaurant/orders/{order_num}" class="button">View Order Details</a>
                </div>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return (subject, html_content)


def generate_restaurant_payout_email(
    restaurant_name: str,
    payout_number: str,
    period_start: str,
    period_end: str,
    total_orders: int,
    gross_revenue: float,
    platform_fees: float,
    net_payout: float
) -> str:
    """Generate restaurant payout summary email"""

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payout Summary - {payout_number}</title>
        {get_email_base_styles()}
    </head>
    <body>
        <div class="email-container">
            {get_email_header("Payout Ready!", f"{period_start} - {period_end}", "success")}

            <div class="email-content">
                <h2>{restaurant_name}</h2>
                <p>Great news! Your payout has been processed.</p>

                <div class="highlight-box">
                    <div class="highlight-label">Net Payout</div>
                    <div class="highlight-amount">${net_payout:.2f}</div>
                    <div class="order-number">{payout_number}</div>
                </div>

                <div class="order-box">
                    <h3>Payout Summary</h3>
                    <div class="line-item">
                        <span class="line-item-label">Total Orders</span>
                        <span class="line-item-value">{total_orders}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Gross Revenue</span>
                        <span class="line-item-value">${gross_revenue:.2f}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Platform Fees</span>
                        <span class="line-item-value">-${platform_fees:.2f}</span>
                    </div>
                    <div class="line-item total">
                        <span class="line-item-label">Net Payout</span>
                        <span class="line-item-value">${net_payout:.2f}</span>
                    </div>
                </div>

                <div class="transparency-section">
                    <h4>Your Effective Rate: {((platform_fees/gross_revenue)*100):.1f}%</h4>
                    <p>
                        You paid ${platform_fees:.2f} in platform fees on ${gross_revenue:.2f} in sales.<br>
                        That's {((platform_fees/gross_revenue)*100):.1f}% vs 15-30% at other platforms.
                    </p>
                </div>

                <div style="text-align: center;">
                    <a href="https://dollor.ai/restaurant/payouts/{payout_number}" class="button">View Full Report</a>
                </div>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """


def generate_driver_delivery_complete_email(
    driver_name: str,
    order_number: str,
    restaurant_name: str,
    customer_name: str,
    delivery_fee: float,
    tip: float,
    total_earnings: float,
    distance: float
) -> str:
    """Generate driver delivery completion email"""

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delivery Complete - {order_number}</title>
        {get_email_base_styles()}
    </head>
    <body>
        <div class="email-container">
            {get_email_header("Delivery Complete!", f"Great work, {driver_name.split()[0]}!", "success")}

            <div class="email-content">
                <h2>Earnings Summary</h2>
                <p>You've completed delivery #{order_number} from <strong>{restaurant_name}</strong> to <strong>{customer_name}</strong>.</p>

                <div class="highlight-box earnings">
                    <div class="highlight-label">You Earned</div>
                    <div class="highlight-amount">${total_earnings:.2f}</div>
                </div>

                <div class="order-box">
                    <h3>Earnings Breakdown</h3>
                    <div class="line-item">
                        <span class="line-item-label">Delivery Fee</span>
                        <span class="line-item-value">${delivery_fee:.2f}</span>
                    </div>
                    {"<div class='line-item'><span class='line-item-label'>Tip from Customer</span><span class='line-item-value' style='color: #10B981;'>$" + f"{tip:.2f}" + "</span></div>" if tip > 0 else ""}
                    <div class="line-item total">
                        <span class="line-item-label">Total</span>
                        <span class="line-item-value">${total_earnings:.2f}</span>
                    </div>
                </div>

                <div style="background: #ECFDF5; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065F46;">
                        You Keep 100%
                    </p>
                    <p style="margin: 8px 0 0 0; color: #047857;">
                        Dollor.ai takes ZERO cut from your delivery fees or tips
                    </p>
                </div>

                <div class="order-box">
                    <h3>Delivery Stats</h3>
                    <div class="line-item">
                        <span class="line-item-label">Distance</span>
                        <span class="line-item-value">{distance:.1f} miles</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Earnings/Mile</span>
                        <span class="line-item-value">${(total_earnings/distance):.2f}</span>
                    </div>
                </div>

                <div style="text-align: center;">
                    <a href="https://dollor.ai/driver/earnings" class="button">View All Earnings</a>
                </div>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """


def generate_driver_payout_email(
    driver_name: str,
    payout_number: str,
    period_start: str,
    period_end: str,
    total_deliveries: int,
    delivery_fees: float,
    tips: float,
    bonuses: float,
    net_payout: float
) -> str:
    """Generate driver payout summary email"""

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payout Summary - {payout_number}</title>
        {get_email_base_styles()}
    </head>
    <body>
        <div class="email-container">
            {get_email_header("Payout Ready!", f"{period_start} - {period_end}", "success")}

            <div class="email-content">
                <h2>Hi {driver_name.split()[0]},</h2>
                <p>Your payout has been processed and is on its way!</p>

                <div class="highlight-box earnings">
                    <div class="highlight-label">Total Payout</div>
                    <div class="highlight-amount">${net_payout:.2f}</div>
                    <div class="order-number">{payout_number}</div>
                </div>

                <div class="order-box">
                    <h3>Earnings Breakdown</h3>
                    <div class="line-item">
                        <span class="line-item-label">Total Deliveries</span>
                        <span class="line-item-value">{total_deliveries}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Delivery Fees</span>
                        <span class="line-item-value">${delivery_fees:.2f}</span>
                    </div>
                    <div class="line-item">
                        <span class="line-item-label">Tips</span>
                        <span class="line-item-value" style="color: #10B981;">${tips:.2f}</span>
                    </div>
                    {"<div class='line-item'><span class='line-item-label'>Bonuses</span><span class='line-item-value' style='color: #F59E0B;'>$" + f"{bonuses:.2f}" + "</span></div>" if bonuses > 0 else ""}
                    <div class="line-item">
                        <span class="line-item-label">Platform Deductions</span>
                        <span class="line-item-value" style="color: #10B981;">$0.00</span>
                    </div>
                    <div class="line-item total">
                        <span class="line-item-label">Net Payout</span>
                        <span class="line-item-value">${net_payout:.2f}</span>
                    </div>
                </div>

                <div style="background: #ECFDF5; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065F46;">
                        100% of Your Earnings
                    </p>
                    <p style="margin: 8px 0 0 0; color: #047857;">
                        Platform deductions: $0.00 | You keep everything you earn
                    </p>
                </div>

                <div style="text-align: center;">
                    <a href="https://dollor.ai/driver/payouts/{payout_number}" class="button">View Payout Details</a>
                </div>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """


# =============================================================================
# EXPORT
# =============================================================================

__all__ = [
    'BRAND',
    'get_email_base_styles',
    'get_email_header',
    'get_email_footer',
    'generate_customer_order_confirmation_email',
    'generate_customer_delivery_complete_email',
    'generate_restaurant_new_order_email',
    'generate_restaurant_payout_email',
    'generate_driver_delivery_complete_email',
    'generate_driver_payout_email',
]
