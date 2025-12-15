"""
Dollor.ai ERP Dashboard API
Enterprise Dashboard endpoints using Dollor.ai PostgreSQL database
Replaces Snowflake with native database queries
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, case
from datetime import datetime, timedelta
from typing import Optional, List
import os

from database import get_db
from models import (
    Vendor, VendorStatus, OnboardingPhase, RiskRating,
    VendorPurchaseOrder, VendorPayout,
    Order, OrderStatus, Invoice, InvoiceStatus, Payment, PaymentStatus,
    Driver, DriverStatus, DriverPayout,
    Ride, RideStatus
)

router = APIRouter(prefix="/api", tags=["ERP Dashboard"])

# ==================== HELPER FUNCTIONS ====================

def format_date(date):
    return date.strftime("%Y-%m-%d")

def format_datetime(date):
    return date.strftime("%Y-%m-%d %H:%M")

def format_amount(amount):
    amount = float(amount or 0)
    if amount >= 1000000:
        formatted_amount = f"${amount / 1000000:.1f}M"
    elif amount >= 1000:
        formatted_amount = f"${amount / 1000:.1f}K"
    else:
        formatted_amount = f"${amount:.0f}"
    return formatted_amount


# ==================== CONSOLIDATED DASHBOARD ====================

@router.get("/dashboard/consolidated")
def get_dashboard_consolidated(
    days_back: int = Query(365, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Consolidated dashboard with all system metrics from Dollor.ai database"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    # Vendor/Purchase Order metrics
    open_po_count = db.query(func.count(VendorPurchaseOrder.id)).filter(
        VendorPurchaseOrder.status.in_(['open', 'pending', 'in_progress']),
        VendorPurchaseOrder.created_at >= cutoff_date
    ).scalar() or 0

    # Order metrics
    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, OrderStatus.PREPARING]),
        Order.created_at >= cutoff_date
    ).scalar() or 0

    # Invoice metrics
    open_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT]),
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    pending_approval_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.SENT,
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    # Total amounts
    total_order_amount = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= cutoff_date
    ).scalar() or 0

    total_invoice_amount = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    # Vendor metrics
    total_vendors = db.query(func.count(Vendor.id)).scalar() or 0
    pending_vendors = db.query(func.count(Vendor.id)).filter(
        Vendor.onboarding_status.in_([VendorStatus.PENDING, VendorStatus.IN_REVIEW])
    ).scalar() or 0
    approved_vendors = db.query(func.count(Vendor.id)).filter(
        Vendor.onboarding_status == VendorStatus.APPROVED
    ).scalar() or 0

    # Driver metrics
    total_drivers = db.query(func.count(Driver.id)).scalar() or 0
    active_drivers = db.query(func.count(Driver.id)).filter(
        Driver.status == DriverStatus.ACTIVE,
        Driver.is_online == True
    ).scalar() or 0

    # Rideshare metrics
    total_rides = db.query(func.count(Ride.id)).filter(
        Ride.created_at >= cutoff_date
    ).scalar() or 0
    active_rides = db.query(func.count(Ride.id)).filter(
        Ride.status.in_([RideStatus.WAITING_FOR_DRIVER, RideStatus.DRIVER_ASSIGNED, RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.CUSTOMER_PICKED_UP])
    ).scalar() or 0
    completed_rides = db.query(func.count(Ride.id)).filter(
        Ride.status == RideStatus.COMPLETED,
        Ride.created_at >= cutoff_date
    ).scalar() or 0
    ride_revenue = db.query(func.sum(Ride.total_fare)).filter(
        Ride.status == RideStatus.COMPLETED,
        Ride.created_at >= cutoff_date
    ).scalar() or 0

    # Recent activity
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(5).all()
    recent_vendors = db.query(Vendor).order_by(Vendor.created_at.desc()).limit(3).all()

    activity_items = []
    for order in recent_orders:
        activity_items.append({
            "id": f"order-{order.id}",
            "type": "order",
            "action": "created",
            "date": format_datetime(order.created_at),
            "user": order.customer_name or "Customer",
            "description": f"Order #{order.order_number} - {order.status.value}",
            "status": order.status.value,
            "entityId": f"order-{order.id}"
        })

    for vendor in recent_vendors:
        activity_items.append({
            "id": f"vendor-{vendor.id}",
            "type": "vendor",
            "action": "onboarded",
            "date": format_datetime(vendor.created_at),
            "user": "System",
            "description": f"Vendor {vendor.company_name} - {vendor.onboarding_status.value}",
            "entityId": f"vendor-{vendor.id}"
        })

    # Sort by date
    activity_items.sort(key=lambda x: x["date"], reverse=True)
    activity_items = activity_items[:5]

    return {
        "counts": {
            "openIpo": open_po_count,
            "requisition": pending_orders,
            "pendingApprovals": pending_approval_invoices,
            "noAction": 0,
            "openBills": open_invoices,
            "totalAmount": format_amount(total_order_amount + total_invoice_amount),
            "activeSystems": 5
        },
        "financialMetrics": [
            {
                "name": "Orders",
                "metrics": {
                    "Total Orders": db.query(func.count(Order.id)).filter(Order.created_at >= cutoff_date).scalar() or 0,
                    "Pending Orders": pending_orders,
                    "Delivered": db.query(func.count(Order.id)).filter(Order.status == OrderStatus.DELIVERED, Order.created_at >= cutoff_date).scalar() or 0,
                    "Total Revenue": format_amount(total_order_amount)
                }
            },
            {
                "name": "Invoices",
                "metrics": {
                    "Total Invoices": db.query(func.count(Invoice.id)).filter(Invoice.created_at >= cutoff_date).scalar() or 0,
                    "Open Invoices": open_invoices,
                    "Paid": db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= cutoff_date).scalar() or 0,
                    "Total Amount": format_amount(total_invoice_amount)
                }
            },
            {
                "name": "Vendors",
                "metrics": {
                    "Total Vendors": str(total_vendors),
                    "Pending Approval": str(pending_vendors),
                    "Approved": str(approved_vendors),
                    "Approval Rate": f"{(approved_vendors/max(total_vendors,1)*100):.0f}%"
                }
            },
            {
                "name": "Drivers",
                "metrics": {
                    "Total Drivers": str(total_drivers),
                    "Active Now": str(active_drivers),
                    "Approved": str(db.query(func.count(Driver.id)).filter(Driver.status == DriverStatus.APPROVED).scalar() or 0),
                    "Online Rate": f"{(active_drivers/max(total_drivers,1)*100):.0f}%"
                }
            },
            {
                "name": "Payments",
                "metrics": {
                    "Total Payments": str(db.query(func.count(Payment.id)).filter(Payment.created_at >= cutoff_date).scalar() or 0),
                    "Completed": str(db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.COMPLETED, Payment.created_at >= cutoff_date).scalar() or 0),
                    "Pending": str(db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.PENDING, Payment.created_at >= cutoff_date).scalar() or 0),
                    "Total Amount": format_amount(db.query(func.sum(Payment.amount)).filter(Payment.created_at >= cutoff_date).scalar() or 0)
                }
            },
            {
                "name": "Purchase Orders",
                "metrics": {
                    "Total POs": str(db.query(func.count(VendorPurchaseOrder.id)).filter(VendorPurchaseOrder.created_at >= cutoff_date).scalar() or 0),
                    "Open POs": str(open_po_count),
                    "Completed": str(db.query(func.count(VendorPurchaseOrder.id)).filter(VendorPurchaseOrder.status == 'completed', VendorPurchaseOrder.created_at >= cutoff_date).scalar() or 0),
                    "Total Amount": format_amount(db.query(func.sum(VendorPurchaseOrder.amount)).filter(VendorPurchaseOrder.created_at >= cutoff_date).scalar() or 0)
                }
            },
            {
                "name": "Rideshare",
                "metrics": {
                    "Total Rides": str(total_rides),
                    "Active Rides": str(active_rides),
                    "Completed": str(completed_rides),
                    "Revenue": format_amount(ride_revenue)
                }
            }
        ],
        "recentActivity": activity_items
    }


# ==================== ORDER DASHBOARD (replaces Coupa) ====================

@router.get("/dashboard/coupa")
def get_dashboard_orders(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Order/Transaction dashboard metrics"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    total_spend = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == 'succeeded',
        Order.created_at >= cutoff_date
    ).scalar() or 0

    total_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= cutoff_date
    ).scalar() or 0

    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED]),
        Order.created_at >= cutoff_date
    ).scalar() or 0

    po_count = db.query(func.count(VendorPurchaseOrder.id)).filter(
        VendorPurchaseOrder.created_at >= cutoff_date
    ).scalar() or 0

    return {
        "counts": {
            "totalSpend": total_spend,
            "requisitionValue": db.query(func.sum(Order.subtotal)).filter(Order.created_at >= cutoff_date).scalar() or 0,
            "reqCount": pending_orders,
            "poCount": po_count
        }
    }

@router.get("/dashboard/coupa/budget-overview")
def get_dashboard_budget_overview(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Monthly order trends"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    # Get monthly order counts
    monthly_data = db.query(
        func.to_char(Order.created_at, 'Mon').label('month'),
        func.count(Order.id).label('count')
    ).filter(
        Order.created_at >= cutoff_date
    ).group_by(
        func.to_char(Order.created_at, 'Mon'),
        func.extract('month', Order.created_at)
    ).order_by(
        func.extract('month', Order.created_at)
    ).all()

    labels = [row.month for row in monthly_data] if monthly_data else ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    data = [row.count for row in monthly_data] if monthly_data else [0, 0, 0, 0, 0, 0]

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": "Order Count",
                "data": data,
                "borderColor": "#2563eb",
                "backgroundColor": "#2563eb",
                "tension": 0.4
            }]
        }
    }

@router.get("/dashboard/coupa/cost-center-distribution")
def get_dashboard_vendor_distribution(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Orders by vendor distribution"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    vendor_data = db.query(
        Vendor.company_name,
        func.count(Order.id).label('order_count')
    ).join(Order, Order.vendor_id == Vendor.id).filter(
        Order.created_at >= cutoff_date
    ).group_by(Vendor.company_name).order_by(
        func.count(Order.id).desc()
    ).limit(10).all()

    labels = [row.company_name or 'Unknown' for row in vendor_data] if vendor_data else ['No Data']
    data = [row.order_count for row in vendor_data] if vendor_data else [0]

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316', '#84cc16', '#06b6d4']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@router.get("/dashboard/coupa/spend-by-department")
def get_dashboard_spend_by_vendor(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Spend by vendor"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    vendor_spend = db.query(
        Vendor.company_name,
        func.sum(Order.total_amount).label('total_spend')
    ).join(Order, Order.vendor_id == Vendor.id).filter(
        Order.created_at >= cutoff_date,
        Order.payment_status == 'succeeded'
    ).group_by(Vendor.company_name).order_by(
        func.sum(Order.total_amount).desc()
    ).limit(10).all()

    labels = [row.company_name or 'Unknown' for row in vendor_spend] if vendor_spend else ['No Data']
    data = [float(row.total_spend or 0) for row in vendor_spend] if vendor_spend else [0]

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": "Spend Amount",
                "data": data,
                "backgroundColor": "#2563eb",
            }]
        }
    }

@router.get("/dashboard/coupa/status-distribution")
def get_dashboard_order_status_distribution(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Order status distribution"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    status_data = db.query(
        Order.status,
        func.count(Order.id).label('count')
    ).filter(
        Order.created_at >= cutoff_date
    ).group_by(Order.status).all()

    labels = [row.status.value for row in status_data] if status_data else ['No Data']
    data = [row.count for row in status_data] if status_data else [0]

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@router.get("/dashboard/coupa/commodity-distribution")
def get_dashboard_cuisine_distribution(db: Session = Depends(get_db)):
    """Cuisine type distribution"""

    cuisine_data = db.query(
        Vendor.cuisine_type,
        func.count(Vendor.id).label('count')
    ).filter(
        Vendor.cuisine_type.isnot(None)
    ).group_by(Vendor.cuisine_type).order_by(
        func.count(Vendor.id).desc()
    ).limit(5).all()

    labels = [row.cuisine_type or 'Other' for row in cuisine_data] if cuisine_data else ['No Data']
    data = [row.count for row in cuisine_data] if cuisine_data else [0]

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                "borderWidth": 0
            }]
        }
    }

@router.get("/dashboard/cupa-tab")
def get_dashboard_orders_tab(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Orders tab summary"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    open_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]),
        Order.created_at >= cutoff_date
    ).scalar() or 0

    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.PENDING_PAYMENT,
        Order.created_at >= cutoff_date
    ).scalar() or 0

    pending_delivery = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.OUT_FOR_DELIVERY,
        Order.created_at >= cutoff_date
    ).scalar() or 0

    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == 'succeeded',
        Order.created_at >= cutoff_date
    ).scalar() or 0

    # Monthly trends
    monthly_data = db.query(
        func.to_char(Order.created_at, 'Mon').label('month'),
        func.sum(Order.total_amount).label('amount')
    ).filter(
        Order.created_at >= cutoff_date,
        Order.payment_status == 'succeeded'
    ).group_by(
        func.to_char(Order.created_at, 'Mon'),
        func.extract('month', Order.created_at)
    ).order_by(
        func.extract('month', Order.created_at)
    ).all()

    labels = [row.month for row in monthly_data] if monthly_data else ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    data = [float(row.amount or 0) for row in monthly_data] if monthly_data else [0, 0, 0, 0, 0, 0]

    return {
        "counts": {
            "openIpo": open_orders,
            "requisition": pending_orders,
            "pendingApprovals": pending_delivery,
            "noAction": 0,
            "requisitionTotal": format_amount(total_revenue)
        },
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'Total Revenue',
                "data": data,
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }


# ==================== INVOICE DASHBOARD (replaces NetSuite) ====================

@router.get("/dashboard/netsuite-tab")
def get_dashboard_invoices_tab(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Invoice tab summary"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    open_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT]),
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.SENT,
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    overdue_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.OVERDUE,
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    total_amount = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    # Monthly trends
    monthly_data = db.query(
        func.to_char(Invoice.created_at, 'Mon').label('month'),
        func.sum(Invoice.total_amount).label('amount')
    ).filter(
        Invoice.created_at >= cutoff_date
    ).group_by(
        func.to_char(Invoice.created_at, 'Mon'),
        func.extract('month', Invoice.created_at)
    ).order_by(
        func.extract('month', Invoice.created_at)
    ).all()

    labels = [row.month for row in monthly_data] if monthly_data else ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    data = [float(row.amount or 0) for row in monthly_data] if monthly_data else [0, 0, 0, 0, 0, 0]

    return {
        "counts": {
            "requisition": 0,
            "openIpo": open_invoices,
            "openBills": pending_invoices,
            "pendingApprovals": overdue_invoices,
            "totalAmount": format_amount(total_amount)
        },
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'Invoice Amount',
                "data": data,
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }

@router.get("/dashboard/netsuite/metrics")
def get_dashboard_invoice_metrics(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Invoice dashboard metrics"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    open_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT]),
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.SENT,
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    overdue_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.OVERDUE,
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    total_amount = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.created_at >= cutoff_date
    ).scalar() or 0

    return {
        "openPOs": open_invoices,
        "openBills": pending_invoices,
        "pendingApprovalPOs": overdue_invoices,
        "totalAmount": format_amount(total_amount)
    }

@router.get("/dashboard/netsuite/monthly-trends")
def get_dashboard_invoice_monthly_trends(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Invoice monthly trends"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    monthly_data = db.query(
        func.to_char(Invoice.created_at, 'Mon').label('month'),
        func.count(Invoice.id).label('count')
    ).filter(
        Invoice.created_at >= cutoff_date
    ).group_by(
        func.to_char(Invoice.created_at, 'Mon'),
        func.extract('month', Invoice.created_at)
    ).order_by(
        func.extract('month', Invoice.created_at)
    ).all()

    labels = [row.month for row in monthly_data] if monthly_data else ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    data = [row.count for row in monthly_data] if monthly_data else [0, 0, 0, 0, 0, 0]

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'Invoice Count',
                "data": data,
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }

@router.get("/dashboard/netsuite/status-distribution")
def get_dashboard_invoice_status_distribution(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Invoice status distribution"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    status_data = db.query(
        Invoice.status,
        func.count(Invoice.id).label('count')
    ).filter(
        Invoice.created_at >= cutoff_date
    ).group_by(Invoice.status).all()

    labels = [row.status.value for row in status_data] if status_data else ['No Data']
    data = [row.count for row in status_data] if status_data else [0]

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@router.get("/dashboard/netsuite/spend-by-department")
def get_dashboard_invoice_by_client(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Invoice amounts by client"""

    from models import Client

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    client_data = db.query(
        Client.name,
        func.sum(Invoice.total_amount).label('total')
    ).join(Invoice, Invoice.client_id == Client.id).filter(
        Invoice.created_at >= cutoff_date
    ).group_by(Client.name).order_by(
        func.sum(Invoice.total_amount).desc()
    ).limit(10).all()

    labels = [row.name or 'Unknown' for row in client_data] if client_data else ['No Data']
    data = [float(row.total or 0) for row in client_data] if client_data else [0]

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": "Invoice Amount",
                "data": data,
                "backgroundColor": "#2563eb",
            }]
        }
    }

@router.get("/dashboard/netsuite/type-distribution")
def get_dashboard_payment_type_distribution(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Payment method distribution"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    payment_data = db.query(
        Payment.payment_method,
        func.count(Payment.id).label('count')
    ).filter(
        Payment.created_at >= cutoff_date,
        Payment.payment_method.isnot(None)
    ).group_by(Payment.payment_method).all()

    labels = [row.payment_method or 'Unknown' for row in payment_data] if payment_data else ['No Data']
    data = [row.count for row in payment_data] if payment_data else [0]

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@router.get("/dashboard/netsuite-wolt-tab")
def get_dashboard_driver_payouts(db: Session = Depends(get_db)):
    """Driver payouts dashboard"""

    total_payouts = db.query(func.count(DriverPayout.id)).scalar() or 0
    pending_payouts = db.query(func.count(DriverPayout.id)).filter(
        DriverPayout.status == 'pending'
    ).scalar() or 0
    completed_payouts = db.query(func.count(DriverPayout.id)).filter(
        DriverPayout.status == 'completed'
    ).scalar() or 0
    total_amount = db.query(func.sum(DriverPayout.net_payout)).filter(
        DriverPayout.status == 'completed'
    ).scalar() or 0

    return {
        "counts": {
            "openPOs": str(total_payouts),
            "openBills": str(pending_payouts),
            "pendingApprovalPOs": str(completed_payouts),
            "totalAmount": format_amount(total_amount)
        },
        "chartData": {
            "labels": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            "datasets": [{
                "label": 'Payout Amount',
                "data": [0, 0, 0, 0, 0, 0],
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }


# ==================== VENDOR DASHBOARD (replaces ZIP) ====================

@router.get("/system-dashboard/zip")
def get_vendor_dashboard(db: Session = Depends(get_db)):
    """Vendor management dashboard"""

    pending_vendors = db.query(func.count(Vendor.id)).filter(
        Vendor.onboarding_status.in_([VendorStatus.PENDING, VendorStatus.IN_REVIEW])
    ).scalar() or 0

    approved_vendors = db.query(func.count(Vendor.id)).filter(
        Vendor.onboarding_status == VendorStatus.APPROVED
    ).scalar() or 0

    new_vendors_30d = db.query(func.count(Vendor.id)).filter(
        Vendor.created_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar() or 0

    total_vendor_spend = db.query(func.sum(VendorPayout.net_payout)).filter(
        VendorPayout.status == 'completed'
    ).scalar() or 0

    # Onboarding status distribution
    status_data = db.query(
        Vendor.onboarding_status,
        func.count(Vendor.id).label('count')
    ).group_by(Vendor.onboarding_status).all()

    return {
        "pendingRequests": pending_vendors,
        "approvedRequests": approved_vendors,
        "newVendors": new_vendors_30d,
        "spendUnderManagement": total_vendor_spend,
        "requestApprovalTime": {
            "labels": ["<1 Day", "1-3 Days", "3-7 Days", ">7 Days"],
            "datasets": [{"data": [70, 20, 8, 2]}]
        },
        "spendByCategory": {
            "labels": [row.onboarding_status.value for row in status_data] if status_data else ["No Data"],
            "datasets": [{"data": [row.count for row in status_data] if status_data else [0]}]
        }
    }


# ==================== DRIVER DASHBOARD (replaces JIRA) ====================

@router.get("/system-dashboard/jira")
def get_driver_dashboard(db: Session = Depends(get_db)):
    """Driver management dashboard"""

    total_drivers = db.query(func.count(Driver.id)).scalar() or 0
    active_drivers = db.query(func.count(Driver.id)).filter(
        Driver.is_online == True
    ).scalar() or 0
    pending_drivers = db.query(func.count(Driver.id)).filter(
        Driver.status == DriverStatus.PENDING
    ).scalar() or 0

    avg_rating = db.query(func.avg(Driver.rating)).scalar() or 5.0

    # Status distribution
    status_data = db.query(
        Driver.status,
        func.count(Driver.id).label('count')
    ).group_by(Driver.status).all()

    return {
        "openTickets": total_drivers,
        "highPriorityTickets": pending_drivers,
        "resolvedToday": active_drivers,
        "averageResolutionTime": float(avg_rating),
        "ticketVolume": {
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "datasets": [{"label": "New Drivers", "data": [0, 0, 0, 0, 0]}]
        },
        "ticketsByStatus": {
            "labels": [row.status.value for row in status_data] if status_data else ["No Data"],
            "datasets": [{"data": [row.count for row in status_data] if status_data else [0]}]
        }
    }


# ==================== ASSESSMENT DASHBOARD (replaces Process Unity) ====================

@router.get("/system-dashboard/process-unity")
def get_assessment_dashboard(db: Session = Depends(get_db)):
    """Vendor assessment dashboard"""

    # Risk rating distribution
    risk_data = db.query(
        Vendor.risk_rating,
        func.count(Vendor.id).label('count')
    ).filter(
        Vendor.risk_rating.isnot(None)
    ).group_by(Vendor.risk_rating).all()

    pending_reviews = db.query(func.count(Vendor.id)).filter(
        Vendor.onboarding_phase.in_([OnboardingPhase.UNDER_REVIEW, OnboardingPhase.COMPLIANCE_CHECK])
    ).scalar() or 0

    completed_reviews = db.query(func.count(Vendor.id)).filter(
        Vendor.onboarding_phase == OnboardingPhase.COMPLETED
    ).scalar() or 0

    avg_score = db.query(func.avg(Vendor.performance_score)).scalar() or 0

    return {
        "openAssessments": db.query(func.count(Vendor.id)).filter(
            Vendor.onboarding_phase.in_([OnboardingPhase.DOCUMENTS_PENDING, OnboardingPhase.UNDER_REVIEW])
        ).scalar() or 0,
        "pendingReviews": pending_reviews,
        "completedAssessments": completed_reviews,
        "riskScore": int(avg_score),
        "monthlyTrends": {
            "labels": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            "datasets": [{'label': 'Assessment Volume', "data": [0, 0, 0, 0, 0, 0]}]
        },
        "riskDistribution": {
            "labels": [row.risk_rating.value for row in risk_data] if risk_data else ["low", "medium", "high"],
            "datasets": [{"data": [row.count for row in risk_data] if risk_data else [0, 0, 0]}]
        }
    }


# ==================== COUPA SYSTEM DASHBOARD ====================

@router.get("/system-dashboard/coupa")
def get_orders_system_dashboard(db: Session = Depends(get_db)):
    """Orders system dashboard"""

    cutoff_30d = datetime.utcnow() - timedelta(days=30)

    open_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP])
    ).scalar() or 0

    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.PENDING_PAYMENT
    ).scalar() or 0

    delivered_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.created_at >= cutoff_30d
    ).scalar() or 0

    spend_30d = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == 'succeeded',
        Order.created_at >= cutoff_30d
    ).scalar() or 0

    # Status distribution
    status_data = db.query(
        Order.status,
        func.count(Order.id).label('count')
    ).group_by(Order.status).all()

    return {
        "openRequisitions": open_orders,
        "pendingApprovals": pending_orders,
        "approvedInvoices": delivered_orders,
        "spendLast30Days": spend_30d,
        "topCategories": {
            "labels": [row.status.value for row in status_data[:4]] if status_data else ["No Data"],
            "datasets": [{"data": [row.count for row in status_data[:4]] if status_data else [0]}]
        },
        "invoiceApprovalCycleTime": {
            "labels": ["<1 Day", "1-3 Days", "3-7 Days", ">7 Days"],
            "datasets": [{"data": [60, 25, 10, 5]}]
        }
    }


# ==================== NETSUITE SYSTEM DASHBOARD ====================

@router.get("/system-dashboard/netsuite")
def get_invoice_system_dashboard(db: Session = Depends(get_db)):
    """Invoice system dashboard"""

    open_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT])
    ).scalar() or 0

    pending_fulfillment = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.SENT
    ).scalar() or 0

    invoices_due = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.OVERDUE
    ).scalar() or 0

    revenue_ytd = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == InvoiceStatus.PAID,
        extract('year', Invoice.created_at) == datetime.utcnow().year
    ).scalar() or 0

    return {
        "openSOs": open_invoices,
        "pendingFulfillment": pending_fulfillment,
        "invoicesDue": invoices_due,
        "revenueYTD": revenue_ytd,
        "revenueBySubsidiary": {
            "labels": ["Invoices", "Orders", "Payments"],
            "datasets": [{"data": [revenue_ytd, 0, 0]}]
        },
        "daysSalesOutstanding": {
            "labels": ["Q1", "Q2", "Q3", "Q4"],
            "datasets": [{"data": [0, 0, 0, 0]}]
        }
    }


# ==================== NETSUITE WOLT SYSTEM DASHBOARD ====================

@router.get("/system-dashboard/netsuite-wolt")
def get_payout_system_dashboard(db: Session = Depends(get_db)):
    """Payout system dashboard"""

    total_payouts = db.query(func.count(DriverPayout.id)).scalar() or 0
    pending_payouts = db.query(func.count(DriverPayout.id)).filter(
        DriverPayout.status == 'pending'
    ).scalar() or 0
    completed_payouts = db.query(func.count(DriverPayout.id)).filter(
        DriverPayout.status == 'completed'
    ).scalar() or 0
    failed_payouts = db.query(func.count(DriverPayout.id)).filter(
        DriverPayout.status == 'failed'
    ).scalar() or 0

    return {
        "openOrders": total_payouts,
        "pendingSync": pending_payouts,
        "syncedOrders": completed_payouts,
        "syncErrors": failed_payouts,
        "orderSyncTime": {
            "labels": ["<5 min", "5-15 min", ">15 min"],
            "datasets": [{"data": [80, 15, 5]}]
        },
        "errorTypes": {
            "labels": ["Pending", "Completed", "Failed"],
            "datasets": [{"data": [pending_payouts, completed_payouts, failed_payouts]}]
        }
    }


# ==================== BASIC ENDPOINTS ====================

@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    """Key Performance Indicators"""

    cutoff_30d = datetime.utcnow() - timedelta(days=30)
    cutoff_60d = datetime.utcnow() - timedelta(days=60)

    # Current month
    orders_current = db.query(func.count(Order.id)).filter(
        Order.created_at >= cutoff_30d
    ).scalar() or 0

    # Previous month
    orders_previous = db.query(func.count(Order.id)).filter(
        Order.created_at >= cutoff_60d,
        Order.created_at < cutoff_30d
    ).scalar() or 0

    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.SENT
    ).scalar() or 0

    return [
        {
            "id": "kpi-1",
            "title": "Orders This Month",
            "value": orders_current,
            "change": orders_current - orders_previous,
            "trend": "up" if orders_current > orders_previous else "down",
            "period": "vs last month"
        },
        {
            "id": "kpi-2",
            "title": "Pending Invoices",
            "value": pending_invoices,
            "change": 0,
            "trend": "stable",
            "period": "current"
        },
    ]

@router.get("/documents")
def get_documents(db: Session = Depends(get_db)):
    """Recent vendor documents"""

    vendors_with_docs = db.query(Vendor).filter(
        or_(Vendor.w9_form == True, Vendor.insurance == True, Vendor.food_license == True)
    ).limit(5).all()

    documents = []
    for vendor in vendors_with_docs:
        if vendor.w9_form:
            documents.append({
                "id": f"doc-w9-{vendor.id}",
                "name": f"W-9 Form - {vendor.company_name}",
                "type": "tax",
                "uploadDate": format_date(vendor.updated_at or vendor.created_at),
                "expiryDate": format_date(datetime.utcnow() + timedelta(days=365)),
                "status": "valid",
                "fileUrl": vendor.w9_form_url or "#"
            })
        if vendor.insurance:
            documents.append({
                "id": f"doc-ins-{vendor.id}",
                "name": f"Insurance - {vendor.company_name}",
                "type": "compliance",
                "uploadDate": format_date(vendor.updated_at or vendor.created_at),
                "expiryDate": format_date(datetime.utcnow() + timedelta(days=180)),
                "status": "valid",
                "fileUrl": vendor.insurance_url or "#"
            })

    return documents[:5] if documents else []

@router.get("/transactions")
def get_transactions_list(db: Session = Depends(get_db)):
    """Recent transactions"""

    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(10).all()

    transactions = []
    for order in recent_orders:
        transactions.append({
            "id": f"trx-{order.id}",
            "type": "order",
            "number": order.order_number,
            "date": format_date(order.created_at),
            "dueDate": format_date(order.created_at + timedelta(days=30)),
            "amount": order.total_amount,
            "status": order.status.value,
            "description": f"Order from {order.customer_name or 'Customer'}"
        })

    return transactions

@router.get("/activity")
def get_activity(db: Session = Depends(get_db)):
    """Recent activity feed"""

    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(3).all()
    recent_vendors = db.query(Vendor).order_by(Vendor.created_at.desc()).limit(2).all()

    activity_items = []

    for order in recent_orders:
        activity_items.append({
            "id": f"act-order-{order.id}",
            "type": "order",
            "action": "created",
            "date": format_datetime(order.created_at),
            "user": order.customer_name or "Customer",
            "description": f"Order #{order.order_number}",
            "status": order.status.value,
            "entityId": f"order-{order.id}"
        })

    for vendor in recent_vendors:
        activity_items.append({
            "id": f"act-vendor-{vendor.id}",
            "type": "vendor",
            "action": "onboarded",
            "date": format_datetime(vendor.created_at),
            "user": "System",
            "description": f"Vendor: {vendor.company_name}",
            "entityId": f"vendor-{vendor.id}"
        })

    activity_items.sort(key=lambda x: x["date"], reverse=True)
    return activity_items[:5]

@router.get("/vendors")
def get_vendors_list(db: Session = Depends(get_db)):
    """List all vendors"""

    vendors = db.query(Vendor).order_by(Vendor.created_at.desc()).limit(20).all()

    return [{
        "id": f"vendor-{v.id}",
        "companyName": v.company_name,
        "taxId": v.tax_id or "",
        "businessType": v.business_type or "",
        "industry": v.industry or "Food Service",
        "website": v.website or "",
        "primaryContact": {
            "name": v.contact_name or "",
            "email": v.contact_email or "",
            "phone": v.contact_phone or "",
            "title": v.contact_title or ""
        },
        "address": {
            "street": v.street or "",
            "city": v.city or "",
            "state": v.state or "",
            "zip": v.zip_code or "",
            "country": v.country or "US"
        },
        "onboardingStatus": v.onboarding_status.value,
        "onboardingPhase": v.onboarding_phase.value,
        "riskRating": v.risk_rating.value if v.risk_rating else "medium",
        "performanceScore": v.performance_score or 0,
        "contractStatus": v.contract_status or "pending",
        "lastActivity": format_date(v.last_activity) if v.last_activity else format_date(v.created_at),
        "createdDate": format_date(v.created_at),
        "approvedDate": format_date(v.approved_at) if v.approved_at else None,
        "zipStatus": v.zip_status or "pending",
        "requiredDocuments": {
            "w9Form": v.w9_form,
            "insurance": v.insurance,
            "financialStatements": v.financial_statements,
            "complianceCerts": v.compliance_certs,
            "securityPolicy": v.security_policy
        }
    } for v in vendors]

@router.get("/vendors/{vendor_id}")
def get_vendor_detail(vendor_id: str, db: Session = Depends(get_db)):
    """Get vendor details"""

    # Parse vendor ID
    vid = vendor_id.replace("vendor-", "")
    try:
        vid = int(vid)
    except ValueError:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor = db.query(Vendor).filter(Vendor.id == vid).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "id": f"vendor-{vendor.id}",
        "companyName": vendor.company_name,
        "taxId": vendor.tax_id or "",
        "businessType": vendor.business_type or "",
        "industry": vendor.industry or "Food Service",
        "website": vendor.website or "",
        "primaryContact": {
            "name": vendor.contact_name or "",
            "email": vendor.contact_email or "",
            "phone": vendor.contact_phone or "",
            "title": vendor.contact_title or ""
        },
        "address": {
            "street": vendor.street or "",
            "city": vendor.city or "",
            "state": vendor.state or "",
            "zip": vendor.zip_code or "",
            "country": vendor.country or "US"
        },
        "onboardingStatus": vendor.onboarding_status.value,
        "onboardingPhase": vendor.onboarding_phase.value,
        "riskRating": vendor.risk_rating.value if vendor.risk_rating else "medium",
        "performanceScore": vendor.performance_score or 0,
        "contractStatus": vendor.contract_status or "pending",
        "lastActivity": format_date(vendor.last_activity) if vendor.last_activity else format_date(vendor.created_at),
        "createdDate": format_date(vendor.created_at),
        "approvedDate": format_date(vendor.approved_at) if vendor.approved_at else None,
        "zipStatus": vendor.zip_status or "pending",
        "requiredDocuments": {
            "w9Form": vendor.w9_form,
            "insurance": vendor.insurance,
            "financialStatements": vendor.financial_statements,
            "complianceCerts": vendor.compliance_certs,
            "securityPolicy": vendor.security_policy
        }
    }

@router.get("/vendors/analytics")
def get_vendor_analytics(db: Session = Depends(get_db)):
    """Vendor analytics and insights"""

    # Find vendors with issues
    low_score_vendors = db.query(Vendor).filter(
        Vendor.performance_score < 50
    ).limit(5).all()

    insights = []
    for vendor in low_score_vendors:
        vendor_insights = []
        if not vendor.w9_form:
            vendor_insights.append("Missing W-9 form")
        if not vendor.insurance:
            vendor_insights.append("Missing insurance documentation")
        if vendor.performance_score and vendor.performance_score < 50:
            vendor_insights.append("Low performance score")

        if vendor_insights:
            insights.append({
                "vendorId": f"vendor-{vendor.id}",
                "insights": vendor_insights
            })

    return {"insights": insights}


# ==================== TRANSACTION ENDPOINTS ====================

@router.get("/transactions/coupa")
def get_order_transactions(
    days_back: int = Query(800, description="Number of days to look back"),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get order transactions"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    orders = db.query(Order).filter(
        Order.created_at >= cutoff_date
    ).order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

    return {"data": [{
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "vendor_id": order.vendor_id,
        "total_amount": order.total_amount,
        "status": order.status.value,
        "payment_status": order.payment_status,
        "created_at": format_datetime(order.created_at)
    } for order in orders]}

@router.get("/transactions/netsuite")
def get_invoice_transactions(
    days_back: int = Query(800, description="Number of days to look back"),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get invoice transactions"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    invoices = db.query(Invoice).filter(
        Invoice.created_at >= cutoff_date
    ).order_by(Invoice.created_at.desc()).offset(offset).limit(limit).all()

    return {"data": [{
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "total_amount": invoice.total_amount,
        "status": invoice.status.value,
        "issue_date": format_date(invoice.issue_date),
        "due_date": format_date(invoice.due_date),
        "created_at": format_datetime(invoice.created_at)
    } for invoice in invoices]}

@router.get("/transactions/counts")
def get_transaction_counts(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get transaction counts"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    return {
        "coupa": {
            "purchase_order": db.query(func.count(VendorPurchaseOrder.id)).filter(VendorPurchaseOrder.created_at >= cutoff_date).scalar() or 0,
            "invoice": db.query(func.count(Order.id)).filter(Order.created_at >= cutoff_date).scalar() or 0,
            "requisition": db.query(func.count(Order.id)).filter(Order.status == OrderStatus.PENDING_PAYMENT, Order.created_at >= cutoff_date).scalar() or 0,
            "payments": db.query(func.count(Payment.id)).filter(Payment.created_at >= cutoff_date).scalar() or 0,
            "pending_approval": db.query(func.count(Order.id)).filter(Order.status == OrderStatus.CONFIRMED, Order.created_at >= cutoff_date).scalar() or 0,
        },
        "netsuite": {
            "purchase_order": db.query(func.count(Invoice.id)).filter(Invoice.created_at >= cutoff_date).scalar() or 0,
            "bill": db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.SENT, Invoice.created_at >= cutoff_date).scalar() or 0,
            "bill_payment": db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.PAID, Invoice.created_at >= cutoff_date).scalar() or 0,
            "pending_approval": db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.DRAFT, Invoice.created_at >= cutoff_date).scalar() or 0,
        }
    }

@router.get("/transactions/filters")
def get_transaction_filters(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get filter options"""

    # Get unique vendors
    vendors = db.query(Vendor.company_name).filter(Vendor.company_name.isnot(None)).distinct().all()

    # Get unique statuses
    order_statuses = [s.value for s in OrderStatus]
    invoice_statuses = [s.value for s in InvoiceStatus]

    return {
        "coupa": {
            "departments": [],
            "suppliers": [v[0] for v in vendors],
            "users": [],
            "statuses": order_statuses,
            "costCenters": [],
        },
        "netsuite": {
            "subsidiaries": [],
            "vendors": [v[0] for v in vendors],
            "locations": [],
            "statuses": invoice_statuses,
            "users": [],
            "types": ["Invoice", "Payment", "Order"],
        }
    }

@router.get("/transactions/netsuite/filters")
def get_netsuite_filters(
    days_back: int = Query(800, description="Number of days to look back"),
    types: str = Query("[]"),
    db: Session = Depends(get_db)
):
    """Get NetSuite specific filters"""

    vendors = db.query(Vendor.company_name).filter(Vendor.company_name.isnot(None)).distinct().all()

    return {
        "subsidiaries": [],
        "vendors": [v[0] for v in vendors],
        "locations": [],
        "statuses": [s.value for s in InvoiceStatus],
        "users": [],
        "types": ["Invoice", "Payment"],
    }


# ==================== RIDESHARE DASHBOARD ====================

@router.get("/system-dashboard/rideshare")
def get_rideshare_dashboard(db: Session = Depends(get_db)):
    """Rideshare management dashboard"""

    total_rides = db.query(func.count(Ride.id)).scalar() or 0
    active_rides = db.query(func.count(Ride.id)).filter(
        Ride.status.in_([RideStatus.WAITING_FOR_DRIVER, RideStatus.DRIVER_ASSIGNED, RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.CUSTOMER_PICKED_UP])
    ).scalar() or 0
    completed_rides = db.query(func.count(Ride.id)).filter(
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0
    cancelled_rides = db.query(func.count(Ride.id)).filter(
        Ride.status == RideStatus.CANCELLED
    ).scalar() or 0

    # Revenue metrics
    total_revenue = db.query(func.sum(Ride.total_fare)).filter(
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0
    platform_revenue = db.query(func.sum(Ride.platform_fee)).filter(
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0
    driver_payouts = db.query(func.sum(Ride.driver_earnings)).filter(
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0

    # Status distribution
    status_data = db.query(
        Ride.status,
        func.count(Ride.id).label('count')
    ).group_by(Ride.status).all()

    return {
        "totalRides": total_rides,
        "activeRides": active_rides,
        "completedRides": completed_rides,
        "cancelledRides": cancelled_rides,
        "totalRevenue": total_revenue,
        "platformRevenue": platform_revenue,
        "driverPayouts": driver_payouts,
        "completionRate": f"{(completed_rides/max(total_rides,1)*100):.0f}%",
        "ridesByStatus": {
            "labels": [row.status.value for row in status_data] if status_data else ["No Data"],
            "datasets": [{"data": [row.count for row in status_data] if status_data else [0]}]
        },
        "revenueBreakdown": {
            "labels": ["Platform Fee", "Driver Earnings"],
            "datasets": [{"data": [float(platform_revenue), float(driver_payouts)]}]
        }
    }


@router.get("/dashboard/rideshare-tab")
def get_rideshare_tab(
    days_back: int = Query(800, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Rideshare tab summary"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    active_rides = db.query(func.count(Ride.id)).filter(
        Ride.status.in_([RideStatus.WAITING_FOR_DRIVER, RideStatus.DRIVER_ASSIGNED, RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.CUSTOMER_PICKED_UP])
    ).scalar() or 0

    waiting_rides = db.query(func.count(Ride.id)).filter(
        Ride.status == RideStatus.WAITING_FOR_DRIVER
    ).scalar() or 0

    in_progress_rides = db.query(func.count(Ride.id)).filter(
        Ride.status.in_([RideStatus.DRIVER_ASSIGNED, RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.CUSTOMER_PICKED_UP])
    ).scalar() or 0

    total_revenue = db.query(func.sum(Ride.total_fare)).filter(
        Ride.status == RideStatus.COMPLETED,
        Ride.created_at >= cutoff_date
    ).scalar() or 0

    # Monthly trends
    monthly_data = db.query(
        func.to_char(Ride.created_at, 'Mon').label('month'),
        func.sum(Ride.total_fare).label('amount')
    ).filter(
        Ride.created_at >= cutoff_date,
        Ride.status == RideStatus.COMPLETED
    ).group_by(
        func.to_char(Ride.created_at, 'Mon'),
        func.extract('month', Ride.created_at)
    ).order_by(
        func.extract('month', Ride.created_at)
    ).all()

    labels = [row.month for row in monthly_data] if monthly_data else ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    data = [float(row.amount or 0) for row in monthly_data] if monthly_data else [0, 0, 0, 0, 0, 0]

    return {
        "counts": {
            "openIpo": active_rides,
            "requisition": waiting_rides,
            "pendingApprovals": in_progress_rides,
            "noAction": 0,
            "requisitionTotal": format_amount(total_revenue)
        },
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'Ride Revenue',
                "data": data,
                "borderColor": '#8b5cf6',
                "backgroundColor": '#8b5cf6',
                "tension": 0.4
            }]
        }
    }


@router.get("/transactions/rideshare")
def get_rideshare_transactions(
    days_back: int = Query(800, description="Number of days to look back"),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get rideshare transactions"""

    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    rides = db.query(Ride).filter(
        Ride.created_at >= cutoff_date
    ).order_by(Ride.created_at.desc()).offset(offset).limit(limit).all()

    return {"data": [{
        "id": ride.id,
        "ride_number": ride.ride_number,
        "customer_name": ride.customer_name,
        "driver_name": ride.driver_name,
        "total_fare": ride.total_fare,
        "platform_fee": ride.platform_fee,
        "driver_earnings": ride.driver_earnings,
        "status": ride.status.value if ride.status else "unknown",
        "pickup_address": ride.pickup_address,
        "dropoff_address": ride.dropoff_address,
        "distance_miles": ride.distance_miles,
        "created_at": format_datetime(ride.created_at) if ride.created_at else None,
        "completed_at": format_datetime(ride.completed_at) if ride.completed_at else None
    } for ride in rides]}


print("[ERP DASHBOARD] Module loaded with Dollor.ai PostgreSQL database integration")
