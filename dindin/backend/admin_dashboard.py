"""
Dollor.ai Admin Dashboard
Enterprise-level admin interface for managing the platform
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from datetime import datetime, timedelta
from typing import Optional
import os
import json

from database import get_db
from models import (
    User, UserRole, Driver, DriverStatus, Vendor, VendorStatus,
    Order, OrderStatus, VendorMenuItem, DriverPayout, VendorPayout,
    AIEmployee, AIEmployeeStatus, Refund, RefundStatus, JournalEntry
)

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

# Simple admin auth - in production use proper auth
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "dollor-admin-2024")

def verify_admin(secret: str = Query(...)):
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    return True


@router.get("/", response_class=HTMLResponse)
def admin_dashboard(secret: str = Query(...), db: Session = Depends(get_db)):
    """Main admin dashboard with all platform statistics"""
    verify_admin(secret)

    # ==================== USER STATS ====================
    total_customers = db.query(User).filter(User.role == UserRole.USER).count()
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN).count()

    # ==================== DRIVER STATS ====================
    total_drivers = db.query(Driver).count()
    pending_drivers = db.query(Driver).filter(Driver.status == DriverStatus.PENDING).count()
    approved_drivers = db.query(Driver).filter(Driver.status == DriverStatus.APPROVED).count()
    active_drivers = db.query(Driver).filter(Driver.status == DriverStatus.ACTIVE).count()
    online_drivers = db.query(Driver).filter(Driver.is_online == True).count()

    # ==================== RESTAURANT STATS ====================
    total_restaurants = db.query(Vendor).count()
    pending_restaurants = db.query(Vendor).filter(Vendor.onboarding_status == VendorStatus.PENDING).count()
    approved_restaurants = db.query(Vendor).filter(Vendor.onboarding_status == VendorStatus.APPROVED).count()
    in_review_restaurants = db.query(Vendor).filter(Vendor.onboarding_status == VendorStatus.IN_REVIEW).count()

    # Menu Items
    total_menu_items = db.query(VendorMenuItem).count()
    available_items = db.query(VendorMenuItem).filter(VendorMenuItem.is_available == True).count()

    # ==================== ORDER STATS ====================
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == OrderStatus.PENDING_PAYMENT).count()
    confirmed_orders = db.query(Order).filter(Order.status == OrderStatus.CONFIRMED).count()
    preparing_orders = db.query(Order).filter(Order.status == OrderStatus.PREPARING).count()
    ready_orders = db.query(Order).filter(Order.status == OrderStatus.READY_FOR_PICKUP).count()
    out_for_delivery = db.query(Order).filter(Order.status == OrderStatus.OUT_FOR_DELIVERY).count()
    delivered_orders = db.query(Order).filter(Order.status == OrderStatus.DELIVERED).count()
    cancelled_orders = db.query(Order).filter(Order.status == OrderStatus.CANCELLED).count()

    # Today's orders
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    todays_orders = db.query(Order).filter(Order.created_at >= today).count()

    # Revenue
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == "succeeded"
    ).scalar() or 0

    todays_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= today,
        Order.payment_status == "succeeded"
    ).scalar() or 0

    platform_fees_collected = db.query(func.sum(Order.platform_fee)).filter(
        Order.payment_status == "succeeded"
    ).scalar() or 0

    # ==================== PAYOUT STATS ====================
    driver_payouts_pending = db.query(DriverPayout).filter(DriverPayout.status == "pending").count()
    vendor_payouts_pending = db.query(VendorPayout).filter(VendorPayout.status == "pending").count()

    total_driver_payouts = db.query(func.sum(DriverPayout.net_payout)).filter(
        DriverPayout.status == "completed"
    ).scalar() or 0

    total_vendor_payouts = db.query(func.sum(VendorPayout.net_payout)).filter(
        VendorPayout.status == "completed"
    ).scalar() or 0

    # ==================== REFUND STATS ====================
    try:
        total_refunds = db.query(Refund).count()
        pending_refunds = db.query(Refund).filter(Refund.status == RefundStatus.PENDING).count()
        refund_amount = db.query(func.sum(Refund.refund_amount)).filter(
            Refund.status == RefundStatus.COMPLETED
        ).scalar() or 0
    except:
        total_refunds = 0
        pending_refunds = 0
        refund_amount = 0

    # ==================== AI EMPLOYEES ====================
    try:
        ai_employees = db.query(AIEmployee).all()
        active_ai = sum(1 for ai in ai_employees if ai.status == AIEmployeeStatus.ACTIVE)
    except:
        ai_employees = []
        active_ai = 0

    # ==================== RECENT DATA ====================
    recent_orders = db.query(Order).order_by(desc(Order.id)).limit(10).all()
    recent_drivers = db.query(Driver).order_by(desc(Driver.id)).limit(10).all()
    recent_restaurants = db.query(Vendor).order_by(desc(Vendor.id)).limit(10).all()
    recent_users = db.query(User).order_by(desc(User.id)).limit(10).all()

    # Build comprehensive HTML dashboard
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dollor.ai Admin Dashboard</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                min-height: 100vh;
                color: #fff;
                padding: 20px;
            }}
            .container {{ max-width: 1600px; margin: 0 auto; }}

            .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding: 20px;
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
            }}
            .logo {{
                font-size: 2.5em;
                font-weight: bold;
                background: linear-gradient(90deg, #00d4aa, #7b68ee);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}

            .platform-fee {{
                background: linear-gradient(90deg, #00d4aa, #7b68ee);
                padding: 15px 25px;
                border-radius: 15px;
                text-align: center;
                margin-bottom: 20px;
            }}
            .platform-fee h2 {{ font-size: 1.5em; }}

            .stats-section {{
                margin-bottom: 25px;
            }}
            .section-title {{
                font-size: 1.2em;
                margin-bottom: 15px;
                color: #00d4aa;
                padding-left: 10px;
                border-left: 3px solid #00d4aa;
            }}

            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 15px;
            }}
            .stat-card {{
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                transition: transform 0.3s;
            }}
            .stat-card:hover {{ transform: translateY(-3px); }}
            .stat-value {{
                font-size: 2em;
                font-weight: bold;
                background: linear-gradient(90deg, #00d4aa, #7b68ee);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            .stat-label {{
                color: #aaa;
                font-size: 0.8em;
                margin-top: 5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}

            .stat-card.warning {{ border-left: 3px solid #f39c12; }}
            .stat-card.success {{ border-left: 3px solid #2ecc71; }}
            .stat-card.danger {{ border-left: 3px solid #e74c3c; }}
            .stat-card.info {{ border-left: 3px solid #3498db; }}

            .section {{
                background: rgba(255,255,255,0.05);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 20px;
            }}

            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            th, td {{
                padding: 10px 12px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-size: 0.9em;
            }}
            th {{
                color: #00d4aa;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 0.75em;
                letter-spacing: 0.5px;
            }}
            tr:hover {{ background: rgba(255,255,255,0.05); }}

            .badge {{
                display: inline-block;
                padding: 3px 10px;
                border-radius: 15px;
                font-size: 0.75em;
                font-weight: 500;
            }}
            .badge-pending {{ background: #f39c12; color: #000; }}
            .badge-active {{ background: #2ecc71; }}
            .badge-approved {{ background: #27ae60; }}
            .badge-inactive {{ background: #95a5a6; }}
            .badge-confirmed {{ background: #3498db; }}
            .badge-preparing {{ background: #9b59b6; }}
            .badge-ready {{ background: #1abc9c; }}
            .badge-delivered {{ background: #2ecc71; }}
            .badge-cancelled {{ background: #e74c3c; }}
            .badge-out {{ background: #e67e22; }}

            .grid-2 {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                gap: 20px;
            }}

            .refresh-btn {{
                background: linear-gradient(90deg, #00d4aa, #7b68ee);
                border: none;
                padding: 10px 20px;
                border-radius: 20px;
                color: white;
                font-weight: 600;
                cursor: pointer;
            }}
            .refresh-btn:hover {{ transform: scale(1.05); }}

            .ai-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }}
            .ai-card {{
                background: rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 15px;
                display: flex;
                align-items: center;
                gap: 15px;
            }}
            .ai-avatar {{
                font-size: 2.5em;
            }}
            .ai-info {{ flex: 1; }}
            .ai-name {{ font-weight: 600; font-size: 1.1em; }}
            .ai-role {{ color: #888; font-size: 0.85em; }}
            .ai-status {{ margin-top: 5px; }}

            .money {{ color: #2ecc71; font-weight: 600; }}

            @media (max-width: 768px) {{
                .stats-grid {{ grid-template-columns: repeat(2, 1fr); }}
                .grid-2 {{ grid-template-columns: 1fr; }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">$ollor.ai</div>
                <div>
                    <span style="margin-right: 20px; color: #888;">Last updated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</span>
                    <button class="refresh-btn" onclick="location.reload()">Refresh</button>
                </div>
            </div>

            <div class="platform-fee">
                <h2>$1 Platform Fee Model - World's First Fair Delivery Platform</h2>
                <p style="margin-top: 5px; opacity: 0.9;">Total Platform Fees Collected: <span class="money">${platform_fees_collected:,.2f}</span></p>
            </div>

            <!-- FINANCIAL OVERVIEW -->
            <div class="stats-section">
                <div class="section-title">Financial Overview</div>
                <div class="stats-grid">
                    <div class="stat-card success">
                        <div class="stat-value">${total_revenue:,.2f}</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-value">${todays_revenue:,.2f}</div>
                        <div class="stat-label">Today's Revenue</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-value">${platform_fees_collected:,.2f}</div>
                        <div class="stat-label">Platform Fees</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${total_driver_payouts:,.2f}</div>
                        <div class="stat-label">Driver Payouts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${total_vendor_payouts:,.2f}</div>
                        <div class="stat-label">Vendor Payouts</div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-value">${refund_amount:,.2f}</div>
                        <div class="stat-label">Refunds Issued</div>
                    </div>
                </div>
            </div>

            <!-- ORDER STATS -->
            <div class="stats-section">
                <div class="section-title">Orders</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{total_orders}</div>
                        <div class="stat-label">Total Orders</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-value">{todays_orders}</div>
                        <div class="stat-label">Today's Orders</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{pending_orders}</div>
                        <div class="stat-label">Pending Payment</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-value">{confirmed_orders}</div>
                        <div class="stat-label">Confirmed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{preparing_orders}</div>
                        <div class="stat-label">Preparing</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{ready_orders}</div>
                        <div class="stat-label">Ready for Pickup</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{out_for_delivery}</div>
                        <div class="stat-label">Out for Delivery</div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-value">{delivered_orders}</div>
                        <div class="stat-label">Delivered</div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-value">{cancelled_orders}</div>
                        <div class="stat-label">Cancelled</div>
                    </div>
                </div>
            </div>

            <!-- USERS, DRIVERS, RESTAURANTS -->
            <div class="stats-section">
                <div class="section-title">Platform Users</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{total_customers}</div>
                        <div class="stat-label">Customers</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_drivers}</div>
                        <div class="stat-label">Total Drivers</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{pending_drivers}</div>
                        <div class="stat-label">Pending Drivers</div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-value">{active_drivers}</div>
                        <div class="stat-label">Active Drivers</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-value">{online_drivers}</div>
                        <div class="stat-label">Online Now</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_restaurants}</div>
                        <div class="stat-label">Total Restaurants</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{pending_restaurants}</div>
                        <div class="stat-label">Pending Restaurants</div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-value">{approved_restaurants}</div>
                        <div class="stat-label">Approved Restaurants</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_menu_items}</div>
                        <div class="stat-label">Menu Items</div>
                    </div>
                </div>
            </div>

            <!-- PENDING ACTIONS -->
            <div class="stats-section">
                <div class="section-title">Pending Actions</div>
                <div class="stats-grid">
                    <div class="stat-card warning">
                        <div class="stat-value">{pending_drivers}</div>
                        <div class="stat-label">Drivers to Approve</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{pending_restaurants}</div>
                        <div class="stat-label">Restaurants to Approve</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{driver_payouts_pending}</div>
                        <div class="stat-label">Driver Payouts Pending</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">{vendor_payouts_pending}</div>
                        <div class="stat-label">Vendor Payouts Pending</div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-value">{pending_refunds}</div>
                        <div class="stat-label">Refunds Pending</div>
                    </div>
                </div>
            </div>

            <!-- AI EMPLOYEES -->
            <div class="section">
                <div class="section-title" style="margin-bottom: 15px;">AI Employees ({active_ai} Active)</div>
                <div class="ai-grid">
    """

    # Add AI Employees
    for ai in ai_employees:
        status_color = "#2ecc71" if ai.status == AIEmployeeStatus.ACTIVE else "#f39c12" if ai.status == AIEmployeeStatus.PROCESSING else "#95a5a6"
        html += f"""
                    <div class="ai-card">
                        <div class="ai-avatar">{ai.avatar or '🤖'}</div>
                        <div class="ai-info">
                            <div class="ai-name">{ai.name}</div>
                            <div class="ai-role">{ai.role}</div>
                            <div class="ai-status">
                                <span class="badge" style="background: {status_color};">{ai.status.value if hasattr(ai.status, 'value') else ai.status}</span>
                                <span style="color: #888; font-size: 0.8em; margin-left: 5px;">{ai.total_tasks_completed} tasks</span>
                            </div>
                        </div>
                    </div>
        """

    if not ai_employees:
        html += """<p style="color: #888;">No AI employees configured yet.</p>"""

    html += """
                </div>
            </div>

            <!-- RECENT ORDERS -->
            <div class="grid-2">
                <div class="section">
                    <div class="section-title" style="margin-bottom: 15px;">Recent Orders</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
    """

    for order in recent_orders:
        status_class = {
            OrderStatus.PENDING_PAYMENT: "badge-pending",
            OrderStatus.CONFIRMED: "badge-confirmed",
            OrderStatus.PREPARING: "badge-preparing",
            OrderStatus.READY_FOR_PICKUP: "badge-ready",
            OrderStatus.OUT_FOR_DELIVERY: "badge-out",
            OrderStatus.DELIVERED: "badge-delivered",
            OrderStatus.CANCELLED: "badge-cancelled",
        }.get(order.status, "badge-pending")

        html += f"""
                            <tr>
                                <td>{order.order_number}</td>
                                <td>{order.customer_name or 'N/A'}</td>
                                <td class="money">${order.total_amount:.2f}</td>
                                <td><span class="badge {status_class}">{order.status.value if hasattr(order.status, 'value') else order.status}</span></td>
                            </tr>
        """

    if not recent_orders:
        html += """<tr><td colspan="4" style="text-align: center; color: #888;">No orders yet</td></tr>"""

    html += """
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title" style="margin-bottom: 15px;">Recent Drivers</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
    """

    for driver in recent_drivers:
        status_class = {
            DriverStatus.PENDING: "badge-pending",
            DriverStatus.APPROVED: "badge-approved",
            DriverStatus.ACTIVE: "badge-active",
            DriverStatus.INACTIVE: "badge-inactive",
            DriverStatus.SUSPENDED: "badge-cancelled",
        }.get(driver.status, "badge-pending")

        full_name = f"{driver.first_name or ''} {driver.last_name or ''}".strip() or "N/A"
        html += f"""
                            <tr>
                                <td>{full_name}</td>
                                <td>{driver.email}</td>
                                <td>{driver.vehicle_type or 'N/A'}</td>
                                <td><span class="badge {status_class}">{driver.status.value if hasattr(driver.status, 'value') else driver.status}</span></td>
                            </tr>
        """

    if not recent_drivers:
        html += """<tr><td colspan="4" style="text-align: center; color: #888;">No drivers yet</td></tr>"""

    html += """
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="grid-2">
                <div class="section">
                    <div class="section-title" style="margin-bottom: 15px;">Restaurants</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Cuisine</th>
                                <th>City</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
    """

    for restaurant in recent_restaurants:
        status_class = {
            VendorStatus.PENDING: "badge-pending",
            VendorStatus.IN_REVIEW: "badge-preparing",
            VendorStatus.APPROVED: "badge-approved",
            VendorStatus.REJECTED: "badge-cancelled",
            VendorStatus.SUSPENDED: "badge-cancelled",
        }.get(restaurant.onboarding_status, "badge-pending")

        html += f"""
                            <tr>
                                <td>{restaurant.restaurant_name or restaurant.company_name or 'N/A'}</td>
                                <td>{restaurant.cuisine_type or 'N/A'}</td>
                                <td>{restaurant.city or 'N/A'}</td>
                                <td><span class="badge {status_class}">{restaurant.onboarding_status.value if hasattr(restaurant.onboarding_status, 'value') else restaurant.onboarding_status}</span></td>
                            </tr>
        """

    if not recent_restaurants:
        html += """<tr><td colspan="4" style="text-align: center; color: #888;">No restaurants yet</td></tr>"""

    html += """
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title" style="margin-bottom: 15px;">Recent Users</div>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
    """

    for user in recent_users:
        role_class = {
            UserRole.USER: "badge-active",
            UserRole.VENDOR: "badge-preparing",
            UserRole.DRIVER: "badge-confirmed",
            UserRole.ADMIN: "badge-danger",
        }.get(user.role, "badge-active")

        html += f"""
                            <tr>
                                <td>{user.id}</td>
                                <td>{user.email}</td>
                                <td>{user.full_name or 'N/A'}</td>
                                <td><span class="badge {role_class}">{user.role.value if hasattr(user.role, 'value') else user.role}</span></td>
                            </tr>
        """

    if not recent_users:
        html += """<tr><td colspan="4" style="text-align: center; color: #888;">No users yet</td></tr>"""

    html += """
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section" style="text-align: center; color: #666; margin-top: 20px;">
                <p>Dollor.ai Admin Dashboard v2.0</p>
                <p style="margin-top: 5px;">
                    API Docs: <a href="/docs" style="color: #00d4aa;">/docs</a> |
                    Stripe: <a href="https://dashboard.stripe.com" target="_blank" style="color: #00d4aa;">Dashboard</a>
                </p>
            </div>
        </div>

        <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => location.reload(), 30000);
        </script>
    </body>
    </html>
    """

    return html


@router.get("/api/stats")
def get_admin_stats(secret: str = Query(...), db: Session = Depends(get_db)):
    """Get platform statistics as JSON"""
    verify_admin(secret)

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    return {
        "customers": db.query(User).filter(User.role == UserRole.USER).count(),
        "drivers": {
            "total": db.query(Driver).count(),
            "pending": db.query(Driver).filter(Driver.status == DriverStatus.PENDING).count(),
            "active": db.query(Driver).filter(Driver.status == DriverStatus.ACTIVE).count(),
            "online": db.query(Driver).filter(Driver.is_online == True).count(),
        },
        "restaurants": {
            "total": db.query(Vendor).count(),
            "pending": db.query(Vendor).filter(Vendor.onboarding_status == VendorStatus.PENDING).count(),
            "approved": db.query(Vendor).filter(Vendor.onboarding_status == VendorStatus.APPROVED).count(),
        },
        "orders": {
            "total": db.query(Order).count(),
            "today": db.query(Order).filter(Order.created_at >= today).count(),
            "pending": db.query(Order).filter(Order.status == OrderStatus.PENDING_PAYMENT).count(),
            "in_progress": db.query(Order).filter(Order.status.in_([
                OrderStatus.CONFIRMED, OrderStatus.PREPARING,
                OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY
            ])).count(),
            "delivered": db.query(Order).filter(Order.status == OrderStatus.DELIVERED).count(),
        },
        "revenue": {
            "total": db.query(func.sum(Order.total_amount)).filter(Order.payment_status == "succeeded").scalar() or 0,
            "today": db.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= today, Order.payment_status == "succeeded"
            ).scalar() or 0,
            "platform_fees": db.query(func.sum(Order.platform_fee)).filter(Order.payment_status == "succeeded").scalar() or 0,
        },
        "platform": {
            "name": "Dollor.ai",
            "fee_model": "$1 flat fee",
            "version": "2.0.0"
        }
    }


@router.get("/api/orders")
def list_orders(
    secret: str = Query(...),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all orders with optional filtering"""
    verify_admin(secret)

    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(desc(Order.id)).offset(offset).limit(limit).all()

    return [{
        "id": o.id,
        "order_number": o.order_number,
        "customer_name": o.customer_name,
        "customer_email": o.customer_email,
        "total_amount": o.total_amount,
        "platform_fee": o.platform_fee,
        "status": o.status.value if hasattr(o.status, 'value') else str(o.status),
        "payment_status": o.payment_status,
        "created_at": o.created_at.isoformat() if o.created_at else None
    } for o in orders]


@router.get("/api/users")
def list_users(
    secret: str = Query(...),
    role: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all users with optional filtering"""
    verify_admin(secret)

    query = db.query(User)
    if role:
        query = query.filter(User.role == role)

    users = query.order_by(desc(User.id)).offset(offset).limit(limit).all()

    return [{
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role.value if hasattr(u.role, 'value') else str(u.role)
    } for u in users]


@router.get("/api/drivers")
def list_drivers(
    secret: str = Query(...),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all drivers with optional filtering"""
    verify_admin(secret)

    query = db.query(Driver)
    if status:
        query = query.filter(Driver.status == status)

    drivers = query.order_by(desc(Driver.id)).offset(offset).limit(limit).all()

    return [{
        "id": d.id,
        "email": d.email,
        "first_name": d.first_name,
        "last_name": d.last_name,
        "phone": d.phone,
        "status": d.status.value if hasattr(d.status, 'value') else str(d.status),
        "vehicle_type": d.vehicle_type,
        "license_plate": d.license_plate,
        "is_online": d.is_online,
        "rating": d.rating,
        "total_deliveries": d.total_deliveries
    } for d in drivers]


@router.get("/api/restaurants")
def list_restaurants(
    secret: str = Query(...),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all restaurants"""
    verify_admin(secret)

    query = db.query(Vendor)
    if status:
        query = query.filter(Vendor.onboarding_status == status)

    restaurants = query.order_by(desc(Vendor.id)).offset(offset).limit(limit).all()

    return [{
        "id": r.id,
        "restaurant_name": r.restaurant_name,
        "company_name": r.company_name,
        "cuisine_type": r.cuisine_type,
        "contact_email": r.contact_email,
        "contact_phone": r.contact_phone,
        "city": r.city,
        "status": r.onboarding_status.value if hasattr(r.onboarding_status, 'value') else str(r.onboarding_status),
        "delivery_available": r.delivery_available,
        "pickup_available": r.pickup_available
    } for r in restaurants]
