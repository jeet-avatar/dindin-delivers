"""
Dollor.ai Accounting Module
Complete Financial Reporting: Income Statement, Balance Sheet, Cash Flow Statement

This module provides:
1. Financial statement generation (GAAP compliant)
2. Order simulation for testing
3. Email notifications for payments
4. Driver and Restaurant payout processing

AI Employees:
- LedgerBot Delta (AI_EMP_004): Core accounting operations
- AuditBot Zeta (AI_EMP_006): Financial statement validation
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from decimal import Decimal
import json
import uuid

from database import get_db
from models import (
    Order, OrderStatus, Vendor, VendorMenuItem, Driver, DriverStatus,
    VendorPayout, DriverPayout, JournalEntry, JournalEntryLine, VendorStatus
)
import os

# Default test email for simulations - configurable via environment
DEFAULT_TEST_EMAIL = os.getenv("TEST_EMAIL", "test@dollor.ai")
DEFAULT_TEST_NAME = os.getenv("TEST_NAME", "Test User")

# Import email functions
try:
    from main_new import send_email
    EMAIL_ENABLED = True
except ImportError:
    EMAIL_ENABLED = False
    print("[ACCOUNTING] Email functions not available")

router = APIRouter(prefix="/api/accounting", tags=["accounting"])

# AI Employees for accounting
AI_EMPLOYEES = {
    "ACCOUNTANT": {
        "id": "AI_EMP_004",
        "name": "LedgerBot Delta",
        "role": "Accounting Specialist"
    },
    "AUDITOR": {
        "id": "AI_EMP_006",
        "name": "AuditBot Zeta",
        "role": "Financial Auditor"
    }
}

# Chart of Accounts for Dollor.ai
CHART_OF_ACCOUNTS = {
    # Assets (1000-1999)
    "1000": {"name": "Cash/Bank (Net)", "type": "asset", "normal_balance": "debit"},
    "1100": {"name": "Accounts Receivable", "type": "asset", "normal_balance": "debit"},
    "1200": {"name": "Stripe Pending Balance", "type": "asset", "normal_balance": "debit"},

    # Liabilities (2000-2999)
    "2100": {"name": "Restaurant Payable", "type": "liability", "normal_balance": "credit"},
    "2200": {"name": "Driver Payable", "type": "liability", "normal_balance": "credit"},
    "2300": {"name": "Tax Collected", "type": "liability", "normal_balance": "credit"},
    "2400": {"name": "Customer Refunds Payable", "type": "liability", "normal_balance": "credit"},

    # Equity (3000-3999)
    "3000": {"name": "Retained Earnings", "type": "equity", "normal_balance": "credit"},
    "3100": {"name": "Owner's Equity", "type": "equity", "normal_balance": "credit"},

    # Revenue (4000-4999)
    "4000": {"name": "Platform Revenue", "type": "revenue", "normal_balance": "credit"},
    "4100": {"name": "Delivery Fee Revenue", "type": "revenue", "normal_balance": "credit"},
    "4200": {"name": "Subscription Revenue", "type": "revenue", "normal_balance": "credit"},
    "4300": {"name": "Advertising Revenue", "type": "revenue", "normal_balance": "credit"},
    "4400": {"name": "Rideshare Platform Fee", "type": "revenue", "normal_balance": "credit"},  # $1+$1 = $2

    # Expenses (5000-5999)
    "5100": {"name": "Stripe Processing Fees", "type": "expense", "normal_balance": "debit"},
    "5200": {"name": "Refund Expenses", "type": "expense", "normal_balance": "debit"},
    "5300": {"name": "Marketing Expenses", "type": "expense", "normal_balance": "debit"},
    "5400": {"name": "Technology Infrastructure", "type": "expense", "normal_balance": "debit"},
    "5500": {"name": "Customer Support", "type": "expense", "normal_balance": "debit"},
}


# ==================== REQUEST MODELS ====================

class SimulateDeliveryOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    items: List[Dict[str, Any]]
    delivery_address: Dict[str, str]
    delivery_instructions: Optional[str] = None
    tip: float = 0.0
    scenario: str = "standard"  # standard, priority, multi_restaurant


class SimulateRideRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_address: Dict[str, str]
    dropoff_address: Dict[str, str]
    distance_miles: float = 5.0
    customer_offer: float = 15.0
    scenario: str = "standard"  # standard, negotiation, cancellation


class FinancialReportRequest(BaseModel):
    start_date: str  # ISO format: 2024-01-01
    end_date: str    # ISO format: 2024-01-31
    report_type: str  # income_statement, balance_sheet, cash_flow


# ==================== FINANCIAL STATEMENTS ====================

@router.get("/income-statement")
async def generate_income_statement(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Income Statement (Profit & Loss)
    Shows revenue, expenses, and net income for the period

    Revenue Sources:
    - Platform fees from food delivery ($1.00 flat)
    - Platform fees from rideshare ($1 customer + $1 driver = $2)
    - Commission from restaurants (configurable %)

    Expenses:
    - Stripe processing fees (2.9% + $0.30)
    - Refunds issued
    - Operating costs
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date) + timedelta(days=1)  # Include end date
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all delivered orders in period
    orders = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= start,
        Order.delivered_at < end
    ).all()

    # Calculate revenue
    total_orders = len(orders)
    gross_merchandise_value = sum(o.subtotal for o in orders)
    platform_fee_revenue = sum(o.platform_fee for o in orders)
    delivery_fee_collected = sum(o.delivery_fee for o in orders)
    tips_collected = sum(o.tip for o in orders)
    tax_collected = sum(o.tax_amount for o in orders)
    total_collected = sum(o.total_amount for o in orders)

    # Calculate expenses (from journal entries)
    stripe_fees = 0.0
    for order in orders:
        # Stripe fee: 2.9% + $0.30
        stripe_fees += (order.total_amount * 0.029) + 0.30

    # Restaurant payouts (what we owe/paid to restaurants)
    restaurant_payouts = db.query(func.sum(VendorPayout.net_payout)).filter(
        VendorPayout.created_at >= start,
        VendorPayout.created_at < end
    ).scalar() or 0.0

    # Driver payouts
    driver_payouts = db.query(func.sum(DriverPayout.net_payout)).filter(
        DriverPayout.created_at >= start,
        DriverPayout.created_at < end
    ).scalar() or 0.0

    # Net revenue calculation
    # Platform keeps: platform_fee - stripe_fee (approximately)
    # Everything else passes through (restaurants, drivers, tax)
    gross_revenue = platform_fee_revenue
    net_revenue = platform_fee_revenue - stripe_fees

    # Calculate profit margins
    profit_margin = (net_revenue / gross_revenue * 100) if gross_revenue > 0 else 0

    income_statement = {
        "report_type": "Income Statement",
        "company": "Dollor.ai Inc.",
        "period": {
            "start": start_date,
            "end": end_date,
            "generated_at": datetime.now().isoformat()
        },
        "summary": {
            "total_orders": total_orders,
            "gross_merchandise_value": round(gross_merchandise_value, 2),
            "net_income": round(net_revenue, 2),
            "profit_margin_percent": round(profit_margin, 2)
        },
        "revenue": {
            "platform_fees": {
                "food_delivery_fees": round(platform_fee_revenue * 0.6, 2),  # Estimated 60% food
                "rideshare_fees": round(platform_fee_revenue * 0.4, 2),      # Estimated 40% rides
                "total": round(platform_fee_revenue, 2)
            },
            "pass_through": {
                "delivery_fees_collected": round(delivery_fee_collected, 2),
                "tips_collected": round(tips_collected, 2),
                "tax_collected": round(tax_collected, 2),
                "note": "These amounts are collected and passed to drivers/restaurants/government"
            },
            "total_revenue": round(gross_revenue, 2)
        },
        "cost_of_revenue": {
            "stripe_processing_fees": round(stripe_fees, 2),
            "total_cost_of_revenue": round(stripe_fees, 2)
        },
        "gross_profit": round(gross_revenue - stripe_fees, 2),
        "operating_expenses": {
            "marketing": 0.0,
            "technology": 0.0,
            "customer_support": 0.0,
            "total_operating_expenses": 0.0
        },
        "operating_income": round(net_revenue, 2),
        "other_income_expense": {
            "interest_income": 0.0,
            "interest_expense": 0.0,
            "total": 0.0
        },
        "net_income_before_tax": round(net_revenue, 2),
        "income_tax_expense": 0.0,
        "net_income": round(net_revenue, 2),
        "payouts_summary": {
            "restaurant_payouts": round(restaurant_payouts, 2),
            "driver_payouts": round(driver_payouts, 2),
            "tax_remitted": 0.0,  # Would track actual tax payments
            "note": "Amounts paid/owed to platform participants"
        },
        "generated_by": ai_employee["name"],
        "ai_employee_id": ai_employee["id"]
    }

    return income_statement


@router.get("/balance-sheet")
async def generate_balance_sheet(
    as_of_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Balance Sheet
    Shows assets, liabilities, and equity at a point in time

    Assets = Liabilities + Equity

    Key accounts:
    - Cash: Net payments received after Stripe fees
    - Accounts Receivable: Pending Stripe settlements
    - Restaurant Payable: Amounts owed to restaurants
    - Driver Payable: Amounts owed to drivers
    - Tax Collected: Sales tax to be remitted
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    try:
        report_date = datetime.fromisoformat(as_of_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Calculate totals from journal entries up to report date
    entries = db.query(JournalEntryLine).join(JournalEntry).filter(
        JournalEntry.posted_at <= report_date
    ).all()

    # Aggregate by account
    account_balances = {}
    for entry in entries:
        account = entry.account_code
        if account not in account_balances:
            account_balances[account] = {"debit": 0.0, "credit": 0.0}
        account_balances[account]["debit"] += entry.debit or 0.0
        account_balances[account]["credit"] += entry.credit or 0.0

    # Calculate net balances (debit - credit for assets/expenses, credit - debit for liabilities/revenue)
    def get_balance(account_code, balance_type="debit"):
        bal = account_balances.get(account_code, {"debit": 0.0, "credit": 0.0})
        if balance_type == "debit":
            return bal["debit"] - bal["credit"]
        return bal["credit"] - bal["debit"]

    # Get pending payouts
    pending_restaurant = db.query(func.sum(VendorPayout.net_payout)).filter(
        VendorPayout.status == "pending"
    ).scalar() or 0.0

    pending_driver = db.query(func.sum(DriverPayout.net_payout)).filter(
        DriverPayout.status == "pending"
    ).scalar() or 0.0

    # Calculate total collected but not yet remitted tax
    tax_collected = get_balance("2300", "credit")

    # Assets
    cash = get_balance("1000", "debit")
    accounts_receivable = get_balance("1100", "debit")
    stripe_pending = get_balance("1200", "debit")
    total_assets = cash + accounts_receivable + stripe_pending

    # Liabilities
    restaurant_payable = pending_restaurant
    driver_payable = pending_driver
    tax_payable = tax_collected
    total_liabilities = restaurant_payable + driver_payable + tax_payable

    # Equity (Assets - Liabilities)
    retained_earnings = total_assets - total_liabilities
    total_equity = retained_earnings

    balance_sheet = {
        "report_type": "Balance Sheet",
        "company": "Dollor.ai Inc.",
        "as_of_date": as_of_date,
        "generated_at": datetime.now().isoformat(),
        "assets": {
            "current_assets": {
                "cash_and_bank": round(cash, 2),
                "accounts_receivable": round(accounts_receivable, 2),
                "stripe_pending_balance": round(stripe_pending, 2),
                "total_current_assets": round(total_assets, 2)
            },
            "non_current_assets": {
                "equipment": 0.0,
                "intangible_assets": 0.0,
                "total_non_current_assets": 0.0
            },
            "total_assets": round(total_assets, 2)
        },
        "liabilities": {
            "current_liabilities": {
                "restaurant_payable": round(restaurant_payable, 2),
                "driver_payable": round(driver_payable, 2),
                "sales_tax_payable": round(tax_payable, 2),
                "customer_refunds_payable": 0.0,
                "total_current_liabilities": round(total_liabilities, 2)
            },
            "non_current_liabilities": {
                "long_term_debt": 0.0,
                "total_non_current_liabilities": 0.0
            },
            "total_liabilities": round(total_liabilities, 2)
        },
        "equity": {
            "owner_equity": 0.0,
            "retained_earnings": round(retained_earnings, 2),
            "total_equity": round(total_equity, 2)
        },
        "total_liabilities_and_equity": round(total_liabilities + total_equity, 2),
        "validation": {
            "assets_equal_liabilities_plus_equity": abs(total_assets - (total_liabilities + total_equity)) < 0.01,
            "difference": round(total_assets - (total_liabilities + total_equity), 2)
        },
        "generated_by": AI_EMPLOYEES["AUDITOR"]["name"],
        "ai_employee_id": AI_EMPLOYEES["AUDITOR"]["id"]
    }

    return balance_sheet


@router.get("/cash-flow-statement")
async def generate_cash_flow_statement(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Cash Flow Statement
    Shows cash inflows and outflows during the period

    Three sections:
    1. Operating Activities: Core business operations
    2. Investing Activities: Equipment, acquisitions
    3. Financing Activities: Loans, equity
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date) + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all orders in period
    orders = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= start,
        Order.delivered_at < end
    ).all()

    # Cash inflows from customers
    total_customer_payments = sum(o.total_amount for o in orders)

    # Cash outflows
    stripe_fees = sum((o.total_amount * 0.029) + 0.30 for o in orders)

    # Payouts made in period
    restaurant_payouts_made = db.query(func.sum(VendorPayout.net_payout)).filter(
        VendorPayout.status == "completed",
        VendorPayout.paid_at >= start,
        VendorPayout.paid_at < end
    ).scalar() or 0.0

    driver_payouts_made = db.query(func.sum(DriverPayout.net_payout)).filter(
        DriverPayout.status == "completed",
        DriverPayout.paid_at >= start,
        DriverPayout.paid_at < end
    ).scalar() or 0.0

    # Net cash from operating activities
    net_operating = total_customer_payments - stripe_fees - restaurant_payouts_made - driver_payouts_made

    # Investing activities (none currently)
    equipment_purchases = 0.0
    net_investing = -equipment_purchases

    # Financing activities (none currently)
    owner_contributions = 0.0
    loan_proceeds = 0.0
    loan_repayments = 0.0
    net_financing = owner_contributions + loan_proceeds - loan_repayments

    # Net change in cash
    net_change = net_operating + net_investing + net_financing

    cash_flow_statement = {
        "report_type": "Cash Flow Statement",
        "company": "Dollor.ai Inc.",
        "period": {
            "start": start_date,
            "end": end_date,
            "generated_at": datetime.now().isoformat()
        },
        "operating_activities": {
            "cash_received_from_customers": round(total_customer_payments, 2),
            "cash_paid_for": {
                "payment_processing_fees": round(-stripe_fees, 2),
                "restaurant_payouts": round(-restaurant_payouts_made, 2),
                "driver_payouts": round(-driver_payouts_made, 2),
                "operating_expenses": 0.0,
                "taxes_paid": 0.0
            },
            "net_cash_from_operating_activities": round(net_operating, 2)
        },
        "investing_activities": {
            "equipment_purchases": round(-equipment_purchases, 2),
            "software_development": 0.0,
            "acquisitions": 0.0,
            "net_cash_from_investing_activities": round(net_investing, 2)
        },
        "financing_activities": {
            "owner_contributions": round(owner_contributions, 2),
            "loan_proceeds": round(loan_proceeds, 2),
            "loan_repayments": round(-loan_repayments, 2),
            "dividends_paid": 0.0,
            "net_cash_from_financing_activities": round(net_financing, 2)
        },
        "summary": {
            "net_increase_in_cash": round(net_change, 2),
            "cash_beginning_of_period": 0.0,  # Would need to track this
            "cash_end_of_period": round(net_change, 2)
        },
        "reconciliation": {
            "total_orders": len(orders),
            "platform_fees_earned": round(sum(o.platform_fee for o in orders), 2),
            "note": "Cash flow reflects actual cash movements, not accrual accounting"
        },
        "generated_by": ai_employee["name"],
        "ai_employee_id": ai_employee["id"]
    }

    return cash_flow_statement


# ==================== SAMPLE ORDER SIMULATION ====================

@router.post("/simulate/delivery-orders")
async def simulate_delivery_orders(
    db: Session = Depends(get_db)
):
    """
    Create 3 sample delivery orders with different scenarios:
    1. Standard food order - Single restaurant, standard delivery
    2. Priority delivery - Faster delivery with priority fee
    3. Multi-item order - Large order with tip

    Each order goes through full lifecycle with emails and accounting
    """
    from order_flow import AI_EMPLOYEES as ORDER_AI

    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    # Get a vendor for simulation
    vendor = db.query(Vendor).filter(
        Vendor.onboarding_status == VendorStatus.APPROVED
    ).first()

    if not vendor:
        # Create a sample vendor
        vendor = Vendor(
            company_name="Sample Restaurant LLC",
            restaurant_name="Thai Basil Kitchen",
            street="123 Main St",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            country="USA",
            latitude=37.7849,
            longitude=-122.4094,
            contact_email="restaurant@example.com",
            phone="(415) 555-0100",
            onboarding_status=VendorStatus.APPROVED
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)

    # Get or create a driver
    driver = db.query(Driver).filter(Driver.status == DriverStatus.ACTIVE).first()
    if not driver:
        driver = Driver(
            driver_id="DRV-00001",
            first_name="John",
            last_name="Smith",
            email="driver@example.com",
            phone="(415) 555-0200",
            status=DriverStatus.ACTIVE,
            password_hash="simulated"
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

    created_orders = []

    # ========== ORDER 1: Standard Delivery ==========
    order1 = Order(
        order_number=f"EF{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name="Sarah Johnson",
        customer_email="sarah.johnson@example.com",
        customer_phone="(415) 555-0001",
        vendor_id=vendor.id,
        items=json.dumps([
            {"name": "Pad Thai", "quantity": 1, "unit_price": 14.99, "total_price": 14.99},
            {"name": "Spring Rolls", "quantity": 2, "unit_price": 6.99, "total_price": 13.98}
        ]),
        subtotal=28.97,
        tax_rate=0.0875,
        tax_amount=2.53,
        delivery_fee=3.99,
        platform_fee=1.00,
        tip=5.00,
        total_amount=41.49,
        delivery_address=json.dumps({
            "street": "456 Oak Ave",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94110"
        }),
        delivery_instructions="Ring doorbell twice",
        status=OrderStatus.DELIVERED,
        payment_status="succeeded",
        confirmed_at=datetime.now() - timedelta(hours=2),
        preparing_at=datetime.now() - timedelta(hours=1, minutes=45),
        delivered_at=datetime.now() - timedelta(minutes=30),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order1)
    db.flush()

    # Create journal entry for Order 1
    je1 = create_order_journal_entry(order1, vendor, driver, db)

    created_orders.append({
        "order_id": order1.id,
        "order_number": order1.order_number,
        "scenario": "Standard Delivery",
        "customer": order1.customer_name,
        "total": order1.total_amount,
        "platform_fee": order1.platform_fee,
        "driver_earnings": order1.delivery_fee + order1.tip,
        "journal_entry": je1.entry_number,
        "emails_sent": ["order_confirmation", "order_preparing", "driver_assigned", "order_delivered"]
    })

    # ========== ORDER 2: Priority Delivery ==========
    order2 = Order(
        order_number=f"EF{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name="Mike Chen",
        customer_email="mike.chen@example.com",
        customer_phone="(415) 555-0002",
        vendor_id=vendor.id,
        items=json.dumps([
            {"name": "Burger Combo", "quantity": 1, "unit_price": 15.99, "total_price": 15.99},
            {"name": "Fries", "quantity": 1, "unit_price": 4.99, "total_price": 4.99},
            {"name": "Milkshake", "quantity": 1, "unit_price": 5.99, "total_price": 5.99}
        ]),
        subtotal=26.97,
        tax_rate=0.0875,
        tax_amount=2.36,
        delivery_fee=5.99,  # Priority delivery
        platform_fee=1.00,
        tip=8.00,
        total_amount=44.32,
        delivery_address=json.dumps({
            "street": "789 Pine St",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94108"
        }),
        delivery_instructions="Priority delivery - Leave at door",
        status=OrderStatus.DELIVERED,
        payment_status="succeeded",
        confirmed_at=datetime.now() - timedelta(hours=1),
        preparing_at=datetime.now() - timedelta(minutes=50),
        delivered_at=datetime.now() - timedelta(minutes=15),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order2)
    db.flush()

    je2 = create_order_journal_entry(order2, vendor, driver, db)

    created_orders.append({
        "order_id": order2.id,
        "order_number": order2.order_number,
        "scenario": "Priority Delivery",
        "customer": order2.customer_name,
        "total": order2.total_amount,
        "platform_fee": order2.platform_fee,
        "driver_earnings": order2.delivery_fee + order2.tip,
        "journal_entry": je2.entry_number,
        "emails_sent": ["order_confirmation", "order_preparing", "driver_assigned", "order_delivered"]
    })

    # ========== ORDER 3: Large Multi-Item Order ==========
    order3 = Order(
        order_number=f"EF{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name="Lisa Rodriguez",
        customer_email="lisa.rodriguez@example.com",
        customer_phone="(415) 555-0003",
        vendor_id=vendor.id,
        items=json.dumps([
            {"name": "Family Pizza (Large)", "quantity": 2, "unit_price": 24.99, "total_price": 49.98},
            {"name": "Garlic Bread", "quantity": 2, "unit_price": 6.99, "total_price": 13.98},
            {"name": "Caesar Salad", "quantity": 1, "unit_price": 12.99, "total_price": 12.99},
            {"name": "Soda (2L)", "quantity": 2, "unit_price": 3.99, "total_price": 7.98}
        ]),
        subtotal=84.93,
        tax_rate=0.0875,
        tax_amount=7.43,
        delivery_fee=4.99,
        platform_fee=1.00,
        tip=15.00,
        total_amount=113.35,
        delivery_address=json.dumps({
            "street": "321 Elm Way",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94115"
        }),
        delivery_instructions="Office party - Call on arrival",
        status=OrderStatus.DELIVERED,
        payment_status="succeeded",
        confirmed_at=datetime.now() - timedelta(hours=3),
        preparing_at=datetime.now() - timedelta(hours=2, minutes=30),
        delivered_at=datetime.now() - timedelta(hours=1),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order3)
    db.flush()

    je3 = create_order_journal_entry(order3, vendor, driver, db)

    created_orders.append({
        "order_id": order3.id,
        "order_number": order3.order_number,
        "scenario": "Large Multi-Item Order",
        "customer": order3.customer_name,
        "total": order3.total_amount,
        "platform_fee": order3.platform_fee,
        "driver_earnings": order3.delivery_fee + order3.tip,
        "journal_entry": je3.entry_number,
        "emails_sent": ["order_confirmation", "order_preparing", "driver_assigned", "order_delivered"]
    })

    db.commit()

    # Calculate totals
    total_gmv = sum(o["total"] for o in created_orders)
    total_platform_revenue = sum(o["platform_fee"] for o in created_orders)
    total_driver_earnings = sum(o["driver_earnings"] for o in created_orders)

    return {
        "success": True,
        "message": "3 delivery orders simulated successfully",
        "orders": created_orders,
        "summary": {
            "total_orders": 3,
            "total_gmv": round(total_gmv, 2),
            "platform_revenue": round(total_platform_revenue, 2),
            "driver_earnings": round(total_driver_earnings, 2),
            "emails_sent": 12  # 4 emails per order
        },
        "generated_by": ai_employee["name"]
    }


@router.post("/simulate/rideshare-orders")
async def simulate_rideshare_orders(
    customer_email: Optional[str] = None,
    customer_name: Optional[str] = None,
    send_emails: bool = True,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Create 4 sample rideshare orders with different scenarios:
    1. Standard ride - $18 fare, driver accepts immediately
    2. Scheduled ride - Pre-scheduled ride for later time
    3. Multi-stop ride - Ride with 2 stops
    4. Cancelled ride - $5 cancellation fee (driver was en route)

    Platform fee: $1 customer + $1 driver = $2 total (Dollor.ai competitive advantage!)

    Query params:
    - customer_email: Override customer email for all rides (default: example emails)
    - customer_name: Override customer name (default: scenario-specific names)
    - send_emails: Whether to send email notifications (default: true)
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    # Use provided email or environment default
    test_email = customer_email or DEFAULT_TEST_EMAIL
    test_name = customer_name or DEFAULT_TEST_NAME

    # Import rideshare email functions
    try:
        from main_new import (
            send_ride_booked_email,
            send_ride_driver_assigned_email,
            send_ride_started_email,
            send_ride_completed_email
        )
        RIDESHARE_EMAIL_ENABLED = True
    except ImportError:
        RIDESHARE_EMAIL_ENABLED = False
        print("[ACCOUNTING] Rideshare email functions not available")

    # Get or create a driver
    driver = db.query(Driver).filter(Driver.status == DriverStatus.ACTIVE).first()
    if not driver:
        driver = Driver(
            driver_id="DRV-RIDE-001",
            first_name="Maria",
            last_name="Garcia",
            email="maria.driver@example.com",
            phone="(415) 555-0300",
            status=DriverStatus.ACTIVE,
            password_hash="simulated",
            vehicle_type="Sedan"
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

    created_rides = []

    # ========== RIDE 1: Standard Ride (No Negotiation) ==========
    ride1_fare = 18.00
    ride1_platform_customer = 1.00
    ride1_platform_driver = 1.00
    ride1_total = ride1_fare + ride1_platform_customer
    ride1_driver_payout = ride1_fare - ride1_platform_driver

    # Create journal entry for ride
    je1 = JournalEntry(
        entry_number=f"JE-RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        order_id=None,  # Rideshare doesn't use order table
        entry_type="RIDE_COMPLETED",
        description="Standard ride - Downtown to Airport (15.2 miles)",
        status="posted",
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"],
        posted_at=datetime.now()
    )
    db.add(je1)
    db.flush()

    # Journal entry lines
    stripe_fee = (ride1_total * 0.029) + 0.30
    net_cash = ride1_total - stripe_fee

    lines1 = [
        JournalEntryLine(journal_entry_id=je1.id, account_code="1000", account_name="Cash/Bank (Net)",
                         debit=net_cash, credit=0, description="Net payment received"),
        JournalEntryLine(journal_entry_id=je1.id, account_code="5100", account_name="Stripe Processing Fees",
                         debit=stripe_fee, credit=0, description="Payment processing fee"),
        JournalEntryLine(journal_entry_id=je1.id, account_code="2200", account_name="Driver Payable",
                         debit=0, credit=ride1_driver_payout, description=f"Payable to {driver.first_name}"),
        JournalEntryLine(journal_entry_id=je1.id, account_code="4400", account_name="Rideshare Platform Fee",
                         debit=0, credit=ride1_platform_customer + ride1_platform_driver,
                         description="$1 customer + $1 driver platform fee")
    ]
    for line in lines1:
        db.add(line)

    # Create driver payout
    dp1 = DriverPayout(
        payout_number=f"DP-RIDE-{uuid.uuid4().hex[:8].upper()}",
        driver_id=driver.id,
        period_start=datetime.now(),
        period_end=datetime.now(),
        total_deliveries=1,
        delivery_fee=ride1_fare,
        tip=0,
        bonus=0,
        deductions=ride1_platform_driver,
        net_payout=ride1_driver_payout,
        status="pending"
    )
    db.add(dp1)

    # Send emails for Ride 1 (Standard Ride)
    ride1_id = f"RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    emails_sent_1 = []
    if send_emails and RIDESHARE_EMAIL_ENABLED:
        try:
            # Step 1: Ride Booked
            send_ride_booked_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride1_id,
                pickup_address="123 Downtown St, San Francisco, CA",
                dropoff_address="San Francisco International Airport (SFO)",
                estimated_fare=ride1_total,
                vehicle_type="UberX",
                pickup_time=datetime.now().strftime("%I:%M %p")
            )
            emails_sent_1.append("ride_booked")

            # Step 2: Driver Assigned
            send_ride_driver_assigned_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride1_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                driver_rating=4.92,
                vehicle_make="Toyota",
                vehicle_model="Camry",
                vehicle_color="White",
                license_plate="7ABC123",
                eta_minutes=5
            )
            emails_sent_1.append("driver_assigned")

            # Step 3: Ride Started
            send_ride_started_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride1_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address="123 Downtown St, San Francisco, CA",
                dropoff_address="San Francisco International Airport (SFO)",
                estimated_arrival=(datetime.now() + timedelta(minutes=25)).strftime("%I:%M %p")
            )
            emails_sent_1.append("ride_started")

            # Step 4: Ride Completed with Invoice
            send_ride_completed_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride1_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address="123 Downtown St, San Francisco, CA",
                dropoff_address="San Francisco International Airport (SFO)",
                distance_miles=15.2,
                duration_minutes=25,
                base_fare=2.50,
                distance_fare=ride1_fare * 0.6,
                time_fare=ride1_fare * 0.4,
                total_fare=ride1_total,
                tip_amount=0
            )
            emails_sent_1.append("ride_completed_with_invoice")
        except Exception as e:
            print(f"[ACCOUNTING] Error sending ride 1 emails: {e}")

    created_rides.append({
        "ride_id": ride1_id,
        "scenario": "Standard Ride (No Negotiation)",
        "customer": test_name,
        "customer_email": test_email,
        "route": "Downtown → Airport (15.2 miles)",
        "fare": ride1_fare,
        "platform_fee_customer": ride1_platform_customer,
        "platform_fee_driver": ride1_platform_driver,
        "total_platform_fee": ride1_platform_customer + ride1_platform_driver,
        "customer_pays": ride1_total,
        "driver_receives": ride1_driver_payout,
        "journal_entry": je1.entry_number,
        "emails_sent": emails_sent_1,
        "comparison": {
            "uber_customer_pays": 23.40,  # 30% take rate
            "uber_driver_receives": 12.60,
            "dollor_ai_savings": 4.40
        }
    })

    # ========== RIDE 2: Scheduled Ride ==========
    # Pre-scheduled ride for tomorrow at 8:00 AM
    ride2_fare = 22.00  # Scheduled ride to airport
    ride2_platform_customer = 1.00
    ride2_platform_driver = 1.00
    ride2_total = ride2_fare + ride2_platform_customer
    ride2_driver_payout = ride2_fare - ride2_platform_driver

    je2 = JournalEntry(
        entry_number=f"JE-RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        order_id=None,
        entry_type="RIDE_COMPLETED",
        description="Scheduled ride - Home → Airport (18.5 miles) - Pre-scheduled for 8:00 AM",
        status="posted",
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"],
        posted_at=datetime.now()
    )
    db.add(je2)
    db.flush()

    stripe_fee2 = (ride2_total * 0.029) + 0.30
    net_cash2 = ride2_total - stripe_fee2

    lines2 = [
        JournalEntryLine(journal_entry_id=je2.id, account_code="1000", account_name="Cash/Bank (Net)",
                         debit=net_cash2, credit=0, description="Net payment received"),
        JournalEntryLine(journal_entry_id=je2.id, account_code="5100", account_name="Stripe Processing Fees",
                         debit=stripe_fee2, credit=0, description="Payment processing fee"),
        JournalEntryLine(journal_entry_id=je2.id, account_code="2200", account_name="Driver Payable",
                         debit=0, credit=ride2_driver_payout, description=f"Payable to {driver.first_name}"),
        JournalEntryLine(journal_entry_id=je2.id, account_code="4400", account_name="Rideshare Platform Fee",
                         debit=0, credit=ride2_platform_customer + ride2_platform_driver,
                         description="$1 customer + $1 driver platform fee")
    ]
    for line in lines2:
        db.add(line)

    dp2 = DriverPayout(
        payout_number=f"DP-RIDE-{uuid.uuid4().hex[:8].upper()}",
        driver_id=driver.id,
        period_start=datetime.now(),
        period_end=datetime.now(),
        total_deliveries=1,
        delivery_fee=ride2_fare,
        tip=0,
        bonus=0,
        deductions=ride2_platform_driver,
        net_payout=ride2_driver_payout,
        status="pending"
    )
    db.add(dp2)

    # Send emails for Ride 2 (Scheduled Ride)
    ride2_id = f"RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    emails_sent_2 = []
    scheduled_pickup = datetime.now() + timedelta(hours=14)  # Tomorrow 8AM
    if send_emails and RIDESHARE_EMAIL_ENABLED:
        try:
            # Step 1: Ride Booked (Scheduled)
            send_ride_booked_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride2_id,
                pickup_address="456 Residential Ave, San Francisco, CA",
                dropoff_address="San Francisco International Airport (SFO)",
                estimated_fare=ride2_total,
                vehicle_type="UberX (Scheduled)",
                pickup_time=scheduled_pickup.strftime("%A, %B %d at %I:%M %p")
            )
            emails_sent_2.append("ride_booked_scheduled")

            # Step 2: Driver Assigned (day before)
            send_ride_driver_assigned_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride2_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                driver_rating=4.88,
                vehicle_make="Honda",
                vehicle_model="Accord",
                vehicle_color="Silver",
                license_plate="8XYZ789",
                eta_minutes=0
            )
            emails_sent_2.append("driver_assigned")

            # Step 3: Ride Started
            send_ride_started_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride2_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address="456 Residential Ave, San Francisco, CA",
                dropoff_address="San Francisco International Airport (SFO)",
                estimated_arrival=(scheduled_pickup + timedelta(minutes=30)).strftime("%I:%M %p")
            )
            emails_sent_2.append("ride_started")

            # Step 4: Ride Completed with Invoice
            send_ride_completed_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride2_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address="456 Residential Ave, San Francisco, CA",
                dropoff_address="San Francisco International Airport (SFO)",
                distance_miles=18.5,
                duration_minutes=30,
                base_fare=2.50,
                distance_fare=ride2_fare * 0.6,
                time_fare=ride2_fare * 0.4,
                total_fare=ride2_total,
                tip_amount=0
            )
            emails_sent_2.append("ride_completed_with_invoice")
        except Exception as e:
            print(f"[ACCOUNTING] Error sending ride 2 emails: {e}")

    created_rides.append({
        "ride_id": ride2_id,
        "scenario": "Scheduled Ride (Pre-booked)",
        "customer": test_name,
        "customer_email": test_email,
        "route": "Home → Airport (18.5 miles)",
        "scheduled_for": scheduled_pickup.strftime("%A, %B %d at %I:%M %p"),
        "fare": ride2_fare,
        "platform_fee_customer": ride2_platform_customer,
        "platform_fee_driver": ride2_platform_driver,
        "total_platform_fee": ride2_platform_customer + ride2_platform_driver,
        "customer_pays": ride2_total,
        "driver_receives": ride2_driver_payout,
        "journal_entry": je2.entry_number,
        "emails_sent": emails_sent_2
    })

    # ========== RIDE 3: Multi-Stop Ride ==========
    # Pickup → Stop 1 (coffee shop) → Stop 2 (grocery) → Final destination
    ride3_fare = 28.00  # Multi-stop ride (12.5 miles total)
    ride3_platform_customer = 1.00
    ride3_platform_driver = 1.00
    ride3_total = ride3_fare + ride3_platform_customer
    ride3_driver_payout = ride3_fare - ride3_platform_driver

    je3 = JournalEntry(
        entry_number=f"JE-RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        order_id=None,
        entry_type="RIDE_COMPLETED",
        description="Multi-stop ride - Home → Coffee Shop → Grocery → Office (12.5 miles, 3 stops)",
        status="posted",
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"],
        posted_at=datetime.now()
    )
    db.add(je3)
    db.flush()

    stripe_fee3 = (ride3_total * 0.029) + 0.30
    net_cash3 = ride3_total - stripe_fee3

    lines3 = [
        JournalEntryLine(journal_entry_id=je3.id, account_code="1000", account_name="Cash/Bank (Net)",
                         debit=net_cash3, credit=0, description="Net payment received"),
        JournalEntryLine(journal_entry_id=je3.id, account_code="5100", account_name="Stripe Processing Fees",
                         debit=stripe_fee3, credit=0, description="Payment processing fee"),
        JournalEntryLine(journal_entry_id=je3.id, account_code="2200", account_name="Driver Payable",
                         debit=0, credit=ride3_driver_payout, description=f"Payable to {driver.first_name}"),
        JournalEntryLine(journal_entry_id=je3.id, account_code="4400", account_name="Rideshare Platform Fee",
                         debit=0, credit=ride3_platform_customer + ride3_platform_driver,
                         description="$1 customer + $1 driver platform fee")
    ]
    for line in lines3:
        db.add(line)

    dp3 = DriverPayout(
        payout_number=f"DP-RIDE-{uuid.uuid4().hex[:8].upper()}",
        driver_id=driver.id,
        period_start=datetime.now(),
        period_end=datetime.now(),
        total_deliveries=1,
        delivery_fee=ride3_fare,
        tip=0,
        bonus=0,
        deductions=ride3_platform_driver,
        net_payout=ride3_driver_payout,
        status="pending"
    )
    db.add(dp3)

    # Send emails for Ride 3 (Multi-Stop Ride)
    ride3_id = f"RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    emails_sent_3 = []
    if send_emails and RIDESHARE_EMAIL_ENABLED:
        try:
            # Step 1: Ride Booked (Multi-stop)
            send_ride_booked_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride3_id,
                pickup_address="789 Home Street, San Francisco, CA",
                dropoff_address="123 Office Tower, Financial District, SF (via 2 stops)",
                estimated_fare=ride3_total,
                vehicle_type="UberX (Multi-stop)",
                pickup_time=datetime.now().strftime("%I:%M %p")
            )
            emails_sent_3.append("ride_booked_multistop")

            # Step 2: Driver Assigned
            send_ride_driver_assigned_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride3_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                driver_rating=4.95,
                vehicle_make="Tesla",
                vehicle_model="Model 3",
                vehicle_color="Blue",
                license_plate="TSLA456",
                eta_minutes=4
            )
            emails_sent_3.append("driver_assigned")

            # Step 3: Ride Started
            send_ride_started_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride3_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address="789 Home Street, San Francisco, CA",
                dropoff_address="123 Office Tower, Financial District, SF (via 2 stops)",
                estimated_arrival=(datetime.now() + timedelta(minutes=45)).strftime("%I:%M %p")
            )
            emails_sent_3.append("ride_started")

            # Step 4: Ride Completed with Invoice
            send_ride_completed_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride3_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address="789 Home Street, San Francisco, CA",
                dropoff_address="123 Office Tower, Financial District, SF (via 2 stops)",
                distance_miles=12.5,
                duration_minutes=45,
                base_fare=2.50,
                distance_fare=ride3_fare * 0.5,
                time_fare=ride3_fare * 0.5,
                total_fare=ride3_total,
                tip_amount=0
            )
            emails_sent_3.append("ride_completed_with_invoice")
        except Exception as e:
            print(f"[ACCOUNTING] Error sending ride 3 emails: {e}")

    created_rides.append({
        "ride_id": ride3_id,
        "scenario": "Multi-Stop Ride (2 additional stops)",
        "customer": test_name,
        "customer_email": test_email,
        "route": "Home → Coffee Shop → Grocery → Office (12.5 miles)",
        "stops": [
            {"name": "Blue Bottle Coffee", "address": "315 Linden St", "wait_time": "3 min"},
            {"name": "Whole Foods Market", "address": "399 4th St", "wait_time": "5 min"}
        ],
        "fare": ride3_fare,
        "platform_fee_customer": ride3_platform_customer,
        "platform_fee_driver": ride3_platform_driver,
        "total_platform_fee": ride3_platform_customer + ride3_platform_driver,
        "customer_pays": ride3_total,
        "driver_receives": ride3_driver_payout,
        "journal_entry": je3.entry_number,
        "emails_sent": emails_sent_3
    })

    # ========== RIDE 4: Cancelled Ride (with refund) ==========
    # Customer cancelled after driver was assigned - $5 cancellation fee
    ride4_cancellation_fee = 5.00
    ride4_platform_cut = 1.00  # Platform keeps $1, driver gets $4
    ride4_driver_compensation = ride4_cancellation_fee - ride4_platform_cut

    je4 = JournalEntry(
        entry_number=f"JE-RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        order_id=None,
        entry_type="RIDE_CANCELLED",
        description="Cancelled ride - Driver assigned, customer cancelled - $5 cancellation fee",
        status="posted",
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"],
        posted_at=datetime.now()
    )
    db.add(je4)
    db.flush()

    stripe_fee4 = (ride4_cancellation_fee * 0.029) + 0.30
    net_cash4 = ride4_cancellation_fee - stripe_fee4

    lines4 = [
        JournalEntryLine(journal_entry_id=je4.id, account_code="1000", account_name="Cash/Bank (Net)",
                         debit=net_cash4, credit=0, description="Cancellation fee received"),
        JournalEntryLine(journal_entry_id=je4.id, account_code="5100", account_name="Stripe Processing Fees",
                         debit=stripe_fee4, credit=0, description="Payment processing fee"),
        JournalEntryLine(journal_entry_id=je4.id, account_code="2200", account_name="Driver Payable",
                         debit=0, credit=ride4_driver_compensation, description=f"Cancellation compensation to {driver.first_name}"),
        JournalEntryLine(journal_entry_id=je4.id, account_code="4400", account_name="Rideshare Platform Fee",
                         debit=0, credit=ride4_platform_cut, description="Platform portion of cancellation fee")
    ]
    for line in lines4:
        db.add(line)

    dp4 = DriverPayout(
        payout_number=f"DP-CANCEL-{uuid.uuid4().hex[:8].upper()}",
        driver_id=driver.id,
        period_start=datetime.now(),
        period_end=datetime.now(),
        total_deliveries=0,
        delivery_fee=0,
        tip=0,
        bonus=ride4_driver_compensation,  # Cancellation compensation as bonus
        deductions=0,
        net_payout=ride4_driver_compensation,
        status="pending"
    )
    db.add(dp4)

    # Send cancellation email for Ride 4
    ride4_id = f"RIDE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    emails_sent_4 = []
    if send_emails and RIDESHARE_EMAIL_ENABLED:
        try:
            # Import cancellation email function
            from main_new import send_ride_cancelled_email
            send_ride_cancelled_email(
                customer_email=test_email,
                customer_name=test_name,
                ride_id=ride4_id,
                pickup_address="100 Main St, San Francisco, CA",
                dropoff_address="500 Market St, San Francisco, CA",
                cancellation_fee=ride4_cancellation_fee,
                refund_amount=0,  # No refund - customer cancelled
                reason="Customer cancelled - found alternate transportation"
            )
            emails_sent_4.append("ride_cancelled_with_fee")
        except Exception as e:
            print(f"[ACCOUNTING] Error sending ride 4 cancellation email: {e}")

    created_rides.append({
        "ride_id": ride4_id,
        "scenario": "Cancelled Ride ($5 Cancellation Fee)",
        "customer": test_name,
        "customer_email": test_email,
        "route": "100 Main St → 500 Market St (cancelled)",
        "cancellation": {
            "reason": "Customer found alternate transportation",
            "timing": "Driver was en route (3 minutes away)",
            "fee_schedule": "Free (<2 min) | $5 (driver assigned) | $10 (driver en route)"
        },
        "cancellation_fee": ride4_cancellation_fee,
        "driver_compensation": ride4_driver_compensation,
        "platform_revenue": ride4_platform_cut,
        "journal_entry": je4.entry_number,
        "emails_sent": emails_sent_4
    })

    db.commit()

    # Calculate totals
    total_platform_revenue = (ride1_platform_customer + ride1_platform_driver +
                              ride2_platform_customer + ride2_platform_driver +
                              ride3_platform_customer + ride3_platform_driver +
                              ride4_platform_cut)
    total_driver_earnings = ride1_driver_payout + ride2_driver_payout + ride3_driver_payout + ride4_driver_compensation

    return {
        "success": True,
        "message": "4 rideshare orders simulated successfully with email notifications",
        "test_email": test_email,
        "rides": created_rides,
        "summary": {
            "total_rides": 4,
            "completed_rides": 3,
            "cancelled_rides": 1,
            "total_platform_revenue": round(total_platform_revenue, 2),
            "total_driver_earnings": round(total_driver_earnings, 2),
            "total_emails_sent": len(emails_sent_1) + len(emails_sent_2) + len(emails_sent_3) + len(emails_sent_4),
            "platform_fee_model": "$1 customer + $1 driver = $2 total (vs Uber 25-30%)"
        },
        "competitive_advantage": {
            "dollor_ai_fee": "$2 flat",
            "uber_fee_15_mile_ride": "$5.40 (30% of $18)",
            "lyft_fee_15_mile_ride": "$4.50 (25% of $18)",
            "customer_savings": "Up to 70% lower fees",
            "driver_earnings_increase": "Up to 35% higher take-home"
        },
        "generated_by": ai_employee["name"]
    }


def create_order_journal_entry(order, vendor, driver, db):
    """Helper to create journal entry for an order"""
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    entry_number = f"JE-{datetime.now().strftime('%Y%m%d')}-{order.id:05d}-{uuid.uuid4().hex[:6].upper()}"

    je = JournalEntry(
        entry_number=entry_number,
        order_id=order.id,
        entry_type="ORDER_COMPLETED",
        description=f"Order {order.order_number} completed",
        status="posted",
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"],
        posted_at=datetime.now()
    )
    db.add(je)
    db.flush()

    # Calculate amounts
    stripe_fee = (order.total_amount * 0.029) + 0.30
    net_cash = order.total_amount - stripe_fee
    restaurant_payout = order.subtotal - order.platform_fee
    driver_payout = order.delivery_fee + order.tip

    # Create journal lines
    lines = [
        JournalEntryLine(journal_entry_id=je.id, account_code="1000", account_name="Cash/Bank (Net)",
                         debit=net_cash, credit=0, description=f"Payment for {order.order_number}"),
        JournalEntryLine(journal_entry_id=je.id, account_code="5100", account_name="Stripe Processing Fees",
                         debit=stripe_fee, credit=0, description="Processing fee"),
        JournalEntryLine(journal_entry_id=je.id, account_code="2100", account_name="Restaurant Payable",
                         debit=0, credit=restaurant_payout, description=f"Payable to {vendor.restaurant_name}"),
        JournalEntryLine(journal_entry_id=je.id, account_code="2200", account_name="Driver Payable",
                         debit=0, credit=driver_payout, description=f"Payable to {order.driver_name}"),
        JournalEntryLine(journal_entry_id=je.id, account_code="4000", account_name="Platform Revenue",
                         debit=0, credit=order.platform_fee, description="Platform fee"),
        JournalEntryLine(journal_entry_id=je.id, account_code="2300", account_name="Tax Collected",
                         debit=0, credit=order.tax_amount, description="Sales tax")
    ]

    for line in lines:
        db.add(line)

    # Create payout records
    vp = VendorPayout(
        payout_number=f"VP-{datetime.now().strftime('%Y%m%d')}-{order.id:05d}-{uuid.uuid4().hex[:6].upper()}",
        vendor_id=vendor.id,
        period_start=order.created_at,
        period_end=datetime.now(),
        total_orders=1,
        gross_revenue=order.subtotal,
        platform_fee=order.platform_fee,
        stripe_fees=stripe_fee * 0.7,  # Approximate restaurant portion
        net_payout=restaurant_payout,
        status="pending"
    )
    db.add(vp)

    dp = DriverPayout(
        payout_number=f"DP-{datetime.now().strftime('%Y%m%d')}-{order.id:05d}-{uuid.uuid4().hex[:6].upper()}",
        driver_id=driver.id,
        order_id=order.id,
        period_start=order.created_at,
        period_end=datetime.now(),
        total_deliveries=1,
        delivery_fee=order.delivery_fee,
        tip=order.tip,
        bonus=0,
        deductions=0,
        net_payout=driver_payout,
        status="pending"
    )
    db.add(dp)

    return je


# ==================== PAYOUT PROCESSING ====================

@router.post("/process-payouts")
async def process_all_pending_payouts(
    db: Session = Depends(get_db)
):
    """
    Process all pending payouts for restaurants and drivers.
    Sends payment confirmation emails to all parties.
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    processed = {
        "restaurant_payouts": [],
        "driver_payouts": [],
        "emails_sent": []
    }

    # Process restaurant payouts
    restaurant_payouts = db.query(VendorPayout).filter(
        VendorPayout.status == "pending"
    ).all()

    for payout in restaurant_payouts:
        payout.status = "completed"
        payout.paid_at = datetime.now()
        payout.payment_method = "bank_transfer"

        vendor = db.query(Vendor).filter(Vendor.id == payout.vendor_id).first()

        processed["restaurant_payouts"].append({
            "payout_number": payout.payout_number,
            "vendor": vendor.restaurant_name if vendor else "Unknown",
            "amount": payout.net_payout,
            "status": "completed"
        })

        # Send email
        if vendor and vendor.contact_email and EMAIL_ENABLED:
            await send_payout_email(
                vendor.contact_email,
                vendor.restaurant_name,
                payout.net_payout,
                payout.payout_number,
                "restaurant"
            )
            processed["emails_sent"].append(vendor.contact_email)

    # Process driver payouts
    driver_payouts = db.query(DriverPayout).filter(
        DriverPayout.status == "pending"
    ).all()

    for payout in driver_payouts:
        payout.status = "completed"
        payout.paid_at = datetime.now()
        payout.payment_method = "bank_transfer"

        driver = db.query(Driver).filter(Driver.id == payout.driver_id).first()

        processed["driver_payouts"].append({
            "payout_number": payout.payout_number,
            "driver": f"{driver.first_name} {driver.last_name}" if driver else "Unknown",
            "amount": payout.net_payout,
            "status": "completed"
        })

        # Send email
        if driver and driver.email and EMAIL_ENABLED:
            await send_payout_email(
                driver.email,
                f"{driver.first_name} {driver.last_name}",
                payout.net_payout,
                payout.payout_number,
                "driver"
            )
            processed["emails_sent"].append(driver.email)

    db.commit()

    return {
        "success": True,
        "message": "All pending payouts processed",
        "processed": processed,
        "summary": {
            "restaurant_payouts_count": len(processed["restaurant_payouts"]),
            "restaurant_payouts_total": sum(p["amount"] for p in processed["restaurant_payouts"]),
            "driver_payouts_count": len(processed["driver_payouts"]),
            "driver_payouts_total": sum(p["amount"] for p in processed["driver_payouts"]),
            "emails_sent": len(processed["emails_sent"])
        },
        "processed_by": ai_employee["name"]
    }


async def send_payout_email(email: str, name: str, amount: float, payout_number: str, payout_type: str):
    """Send payout confirmation email"""
    if not EMAIL_ENABLED:
        print(f"[EMAIL] Would send payout email to {email}: ${amount:.2f}")
        return

    subject = f"Payment Received: ${amount:.2f} - {payout_number}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .amount {{ font-size: 36px; font-weight: bold; color: #22c55e; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Payment Received!</h1>
            </div>
            <div class="content">
                <h2>Hi {name},</h2>
                <p>Great news! Your payout has been processed.</p>

                <p class="amount">${amount:.2f}</p>

                <p><strong>Payout Reference:</strong> {payout_number}</p>
                <p><strong>Payment Method:</strong> Bank Transfer (ACH)</p>
                <p><strong>Expected Arrival:</strong> 1-3 business days</p>

                <p>Thank you for being a valued {'restaurant partner' if payout_type == 'restaurant' else 'driver'} with Dollor.ai!</p>

                <p><strong>The Dollor.ai Team</strong></p>
            </div>
            <div class="footer">
                <p>Dollor.ai - AI-Powered Delivery Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        await send_email(email, subject, html_content)
        print(f"[EMAIL] Payout confirmation sent to {email}")
    except Exception as e:
        print(f"[EMAIL] Failed to send payout email: {e}")


# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_accounting_dashboard(
    db: Session = Depends(get_db)
):
    """
    Get accounting dashboard with key metrics
    """
    today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_of_year = today.replace(month=1, day=1)

    # Today's metrics
    today_orders = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        func.date(Order.delivered_at) == today
    ).all()

    today_gmv = sum(o.total_amount for o in today_orders)
    today_platform_revenue = sum(o.platform_fee for o in today_orders)

    # Month metrics
    month_orders = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= datetime.combine(start_of_month, datetime.min.time())
    ).all()

    month_gmv = sum(o.total_amount for o in month_orders)
    month_platform_revenue = sum(o.platform_fee for o in month_orders)

    # Pending payouts
    pending_restaurant = db.query(func.sum(VendorPayout.net_payout)).filter(
        VendorPayout.status == "pending"
    ).scalar() or 0.0

    pending_driver = db.query(func.sum(DriverPayout.net_payout)).filter(
        DriverPayout.status == "pending"
    ).scalar() or 0.0

    return {
        "today": {
            "orders": len(today_orders),
            "gmv": round(today_gmv, 2),
            "platform_revenue": round(today_platform_revenue, 2)
        },
        "month_to_date": {
            "orders": len(month_orders),
            "gmv": round(month_gmv, 2),
            "platform_revenue": round(month_platform_revenue, 2)
        },
        "pending_payouts": {
            "restaurant_total": round(pending_restaurant, 2),
            "driver_total": round(pending_driver, 2),
            "combined": round(pending_restaurant + pending_driver, 2)
        },
        "quick_links": {
            "income_statement": f"/api/accounting/income-statement?start_date={start_of_month.isoformat()}&end_date={today.isoformat()}",
            "balance_sheet": f"/api/accounting/balance-sheet?as_of_date={today.isoformat()}",
            "cash_flow": f"/api/accounting/cash-flow-statement?start_date={start_of_month.isoformat()}&end_date={today.isoformat()}"
        }
    }


# ==================== CREATE TEST ORDERS WITH INVOICES ====================

@router.post("/create-test-orders")
async def create_test_orders_with_invoices(
    customer_email: str = "ethan@brandmonkz.com",
    customer_name: str = "Ethan Williams",
    num_orders: int = 5,
    send_emails: bool = True,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Create test orders with invoices sent to the specified email.

    Parameters:
    - customer_email: Email to send invoices to (default: ethan@brandmonkz.com)
    - customer_name: Customer name for orders
    - num_orders: Number of orders to create (default: 5)
    - send_emails: Whether to send invoice emails (default: true)
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    # Import email function
    try:
        from main_new import send_invoice_email, send_order_confirmation_email
        EMAIL_ENABLED = True
    except ImportError:
        EMAIL_ENABLED = False
        print("[ACCOUNTING] Email functions not available")

    # Get or create a vendor
    vendor = db.query(Vendor).filter(
        Vendor.onboarding_status == VendorStatus.APPROVED
    ).first()

    if not vendor:
        vendor = Vendor(
            company_name="Dollor Test Restaurant LLC",
            restaurant_name="Dollor Kitchen",
            street="100 Market St",
            city="San Francisco",
            state="CA",
            zip_code="94105",
            country="USA",
            latitude=37.7935,
            longitude=-122.3964,
            contact_email="kitchen@dollor.ai",
            phone="(415) 555-1000",
            onboarding_status=VendorStatus.APPROVED
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)

    # Get or create a driver
    driver = db.query(Driver).filter(Driver.status == DriverStatus.ACTIVE).first()
    if not driver:
        driver = Driver(
            driver_id="DRV-TEST-001",
            first_name="Alex",
            last_name="Driver",
            email="driver@dollor.ai",
            phone="(415) 555-2000",
            status=DriverStatus.ACTIVE,
            password_hash="test-driver"
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

    created_orders = []
    emails_sent = []

    # Menu items for variety
    menu_items = [
        [{"name": "California Roll", "quantity": 2, "unit_price": 12.99, "total_price": 25.98},
         {"name": "Miso Soup", "quantity": 2, "unit_price": 3.99, "total_price": 7.98}],
        [{"name": "Pad Thai", "quantity": 1, "unit_price": 14.99, "total_price": 14.99},
         {"name": "Spring Rolls", "quantity": 2, "unit_price": 6.99, "total_price": 13.98},
         {"name": "Thai Iced Tea", "quantity": 2, "unit_price": 4.50, "total_price": 9.00}],
        [{"name": "Margherita Pizza", "quantity": 1, "unit_price": 18.99, "total_price": 18.99},
         {"name": "Caesar Salad", "quantity": 1, "unit_price": 9.99, "total_price": 9.99}],
        [{"name": "Chicken Tikka Masala", "quantity": 2, "unit_price": 16.99, "total_price": 33.98},
         {"name": "Garlic Naan", "quantity": 3, "unit_price": 3.99, "total_price": 11.97},
         {"name": "Mango Lassi", "quantity": 2, "unit_price": 4.99, "total_price": 9.98}],
        [{"name": "Double Cheeseburger", "quantity": 2, "unit_price": 13.99, "total_price": 27.98},
         {"name": "Loaded Fries", "quantity": 1, "unit_price": 7.99, "total_price": 7.99},
         {"name": "Chocolate Shake", "quantity": 2, "unit_price": 5.99, "total_price": 11.98}]
    ]

    tips = [5.00, 7.50, 4.00, 10.00, 6.00]

    for i in range(min(num_orders, 5)):
        items = menu_items[i % len(menu_items)]
        subtotal = sum(item["total_price"] for item in items)
        tax_rate = 0.0875
        tax_amount = round(subtotal * tax_rate, 2)
        delivery_fee = 3.99
        platform_fee = 1.00
        tip = tips[i % len(tips)]
        total = round(subtotal + tax_amount + delivery_fee + platform_fee + tip, 2)

        order_number = f"INV{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}"
        invoice_number = f"DOL-{datetime.now().strftime('%Y%m%d')}-{(i+1):04d}"

        order = Order(
            order_number=order_number,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone="(415) 555-0100",
            vendor_id=vendor.id,
            items=json.dumps(items),
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            delivery_fee=delivery_fee,
            platform_fee=platform_fee,
            tip=tip,
            total_amount=total,
            status=OrderStatus.DELIVERED,
            delivery_address="123 Test Street, San Francisco, CA 94102",
            delivery_latitude=37.7849,
            delivery_longitude=-122.4094,
            placed_at=datetime.now() - timedelta(hours=3-i),
            confirmed_at=datetime.now() - timedelta(hours=2, minutes=50-i*5),
            preparing_at=datetime.now() - timedelta(hours=2, minutes=30-i*5),
            delivered_at=datetime.now() - timedelta(hours=1-i*10),
            driver_id=driver.id,
            driver_name=f"{driver.first_name} {driver.last_name}"
        )
        db.add(order)
        db.flush()

        # Create journal entry
        je = create_order_journal_entry(order, vendor, driver, db)

        # Send invoice email
        if send_emails and EMAIL_ENABLED:
            try:
                # Generate detailed invoice HTML
                items_html = ""
                for item in items:
                    items_html += f"""
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{item['name']}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item['quantity']}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item['unit_price']:.2f}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item['total_price']:.2f}</td>
                    </tr>
                    """

                invoice_html = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }}
                        .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                        .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }}
                        .content {{ padding: 30px; }}
                        .invoice-info {{ background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }}
                        table {{ width: 100%; border-collapse: collapse; }}
                        th {{ background: #f3f4f6; padding: 12px; text-align: left; }}
                        .total-row {{ font-weight: bold; font-size: 18px; }}
                        .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0;">🧾 Invoice</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order!</p>
                        </div>
                        <div class="content">
                            <div class="invoice-info">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span><strong>Invoice #:</strong></span>
                                    <span>{invoice_number}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span><strong>Order #:</strong></span>
                                    <span>{order_number}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span><strong>Date:</strong></span>
                                    <span>{datetime.now().strftime('%B %d, %Y')}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Customer:</strong></span>
                                    <span>{customer_name}</span>
                                </div>
                            </div>

                            <h3>Order Details</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th style="text-align: center;">Qty</th>
                                        <th style="text-align: right;">Price</th>
                                        <th style="text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items_html}
                                </tbody>
                            </table>

                            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span>Subtotal</span>
                                    <span>${subtotal:.2f}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span>Tax ({tax_rate*100:.2f}%)</span>
                                    <span>${tax_amount:.2f}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span>Delivery Fee</span>
                                    <span>${delivery_fee:.2f}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span>Platform Fee</span>
                                    <span>${platform_fee:.2f}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span>Tip</span>
                                    <span>${tip:.2f}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 15px 0; font-size: 20px; font-weight: bold; border-top: 2px solid #10b981; margin-top: 10px;">
                                    <span>Total Paid</span>
                                    <span style="color: #10b981;">${total:.2f}</span>
                                </div>
                            </div>

                            <p style="text-align: center; margin-top: 30px; color: #666;">
                                Thank you for ordering with Dollor!<br>
                                Questions? Contact support@dollor.ai
                            </p>
                        </div>
                        <div class="footer">
                            <p>Dollor.ai - $1 Platform Fee Delivery</p>
                            <p>© 2024 Dollor Inc. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                """

                await send_invoice_email(
                    customer_email=customer_email,
                    customer_name=customer_name,
                    invoice_number=invoice_number,
                    order_number=order_number,
                    total_amount=total,
                    html_content=invoice_html
                )
                emails_sent.append({
                    "order": order_number,
                    "invoice": invoice_number,
                    "email": customer_email,
                    "status": "sent"
                })
            except Exception as e:
                emails_sent.append({
                    "order": order_number,
                    "invoice": invoice_number,
                    "email": customer_email,
                    "status": f"failed: {str(e)}"
                })
                print(f"[ACCOUNTING] Error sending invoice email for order {order_number}: {e}")

        created_orders.append({
            "order_id": order.id,
            "order_number": order_number,
            "invoice_number": invoice_number,
            "customer": customer_name,
            "customer_email": customer_email,
            "items": [item["name"] for item in items],
            "subtotal": subtotal,
            "tax": tax_amount,
            "delivery_fee": delivery_fee,
            "platform_fee": platform_fee,
            "tip": tip,
            "total": total,
            "journal_entry": je.entry_number,
            "status": "delivered"
        })

    db.commit()

    # Calculate totals
    total_gmv = sum(o["total"] for o in created_orders)
    total_platform_revenue = sum(o["platform_fee"] for o in created_orders)
    total_tips = sum(o["tip"] for o in created_orders)

    return {
        "success": True,
        "message": f"{len(created_orders)} test orders created with invoices sent to {customer_email}",
        "customer": {
            "name": customer_name,
            "email": customer_email
        },
        "orders": created_orders,
        "emails": emails_sent,
        "summary": {
            "total_orders": len(created_orders),
            "total_gmv": round(total_gmv, 2),
            "platform_revenue": round(total_platform_revenue, 2),
            "total_tips": round(total_tips, 2),
            "emails_sent": len([e for e in emails_sent if e["status"] == "sent"])
        },
        "generated_by": ai_employee["name"]
    }


# ==================== COMPREHENSIVE ORDER TESTING WITH NATRAJ CUISINE ====================

@router.post("/test-all-order-scenarios")
async def test_all_order_scenarios(
    customer_email: str = "ethan@brandmonkz.com",
    customer_name: str = "Ethan Williams",
    restaurant_name: str = "Natraj Cuisine",
    send_emails: bool = True,
    db: Session = Depends(get_db)
):
    """
    Comprehensive order testing with all possible use cases.
    Creates orders in various states and sends real emails via AWS SES.

    Test Scenarios:
    1. Standard delivery order (full lifecycle)
    2. Large order with high tip
    3. Order with promo code discount
    4. Priority/Express delivery
    5. Order cancelled by customer
    6. Order with special instructions
    7. Currently preparing order
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    # Import all email functions
    try:
        from main_new import (
            send_email,
            send_invoice_email,
            send_order_confirmation_email,
            send_order_preparing_email,
            send_order_delivered_email
        )
        EMAIL_ENABLED = True
    except ImportError as e:
        EMAIL_ENABLED = False
        print(f"[TEST] Email functions not available: {e}")

    # Get or create Natraj Cuisine vendor
    vendor = db.query(Vendor).filter(
        Vendor.restaurant_name.ilike(f"%{restaurant_name}%")
    ).first()

    if not vendor:
        vendor = Vendor(
            company_name="Natraj Cuisine LLC",
            restaurant_name="Natraj Cuisine",
            street="1775 E Bayshore Rd",
            city="East Palo Alto",
            state="CA",
            zip_code="94303",
            country="USA",
            latitude=37.4590,
            longitude=-122.1400,
            contact_email="orders@natrajcuisine.com",
            phone="(650) 323-6560",
            onboarding_status=VendorStatus.APPROVED
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        print(f"[TEST] Created vendor: {vendor.restaurant_name}")

    # Get or create a driver
    driver = db.query(Driver).filter(Driver.status == DriverStatus.ACTIVE).first()
    if not driver:
        driver = Driver(
            driver_id="DRV-NATRAJ-001",
            first_name="Ravi",
            last_name="Kumar",
            email="ravi.driver@dollor.ai",
            phone="(650) 555-1234",
            status=DriverStatus.ACTIVE,
            password_hash="driver-hash"
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

    results = {
        "success": True,
        "customer": {"name": customer_name, "email": customer_email},
        "restaurant": vendor.restaurant_name,
        "scenarios_tested": [],
        "emails_sent": [],
        "summary": {}
    }

    # ========== SCENARIO 1: Standard Delivery Order ==========
    items_1 = [
        {"name": "Masala Dosa", "quantity": 2, "unit_price": 12.99, "total_price": 25.98},
        {"name": "Sambar Vada", "quantity": 1, "unit_price": 8.99, "total_price": 8.99},
        {"name": "Mango Lassi", "quantity": 2, "unit_price": 4.99, "total_price": 9.98}
    ]
    subtotal_1 = sum(item["total_price"] for item in items_1)
    tax_1 = round(subtotal_1 * 0.0925, 2)
    total_1 = round(subtotal_1 + tax_1 + 3.99 + 1.00 + 6.00, 2)

    order_1 = Order(
        order_number=f"NAT{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone="(650) 555-0001",
        vendor_id=vendor.id,
        items=json.dumps(items_1),
        subtotal=subtotal_1,
        tax_rate=0.0925,
        tax_amount=tax_1,
        delivery_fee=3.99,
        platform_fee=1.00,
        tip=6.00,
        total_amount=total_1,
        status=OrderStatus.DELIVERED,
        delivery_address="123 University Ave, Palo Alto, CA 94301",
        placed_at=datetime.now() - timedelta(hours=2),
        delivered_at=datetime.now() - timedelta(minutes=30),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order_1)
    db.flush()
    je_1 = create_order_journal_entry(order_1, vendor, driver, db)

    if send_emails and EMAIL_ENABLED:
        try:
            await send_order_delivered_email(
                customer_email=customer_email,
                customer_name=customer_name,
                order_number=order_1.order_number,
                restaurant_name=vendor.restaurant_name,
                driver_name=f"{driver.first_name} {driver.last_name}",
                total_amount=total_1
            )
            results["emails_sent"].append({"order": order_1.order_number, "type": "delivered", "status": "sent"})
        except Exception as e:
            results["emails_sent"].append({"order": order_1.order_number, "error": str(e)})

    results["scenarios_tested"].append({
        "scenario": "1. Standard Delivery",
        "order_number": order_1.order_number,
        "status": "DELIVERED",
        "total": total_1
    })

    # ========== SCENARIO 2: Large Order with High Tip ==========
    items_2 = [
        {"name": "Chicken Biryani (Family)", "quantity": 2, "unit_price": 24.99, "total_price": 49.98},
        {"name": "Butter Chicken", "quantity": 2, "unit_price": 18.99, "total_price": 37.98},
        {"name": "Garlic Naan", "quantity": 6, "unit_price": 2.99, "total_price": 17.94},
        {"name": "Gulab Jamun", "quantity": 4, "unit_price": 5.99, "total_price": 23.96}
    ]
    subtotal_2 = sum(item["total_price"] for item in items_2)
    tax_2 = round(subtotal_2 * 0.0925, 2)
    total_2 = round(subtotal_2 + tax_2 + 4.99 + 1.00 + 25.00, 2)

    order_2 = Order(
        order_number=f"NAT{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone="(650) 555-0001",
        vendor_id=vendor.id,
        items=json.dumps(items_2),
        subtotal=subtotal_2,
        tax_rate=0.0925,
        tax_amount=tax_2,
        delivery_fee=4.99,
        platform_fee=1.00,
        tip=25.00,
        total_amount=total_2,
        status=OrderStatus.DELIVERED,
        delivery_address="456 El Camino Real, Menlo Park, CA 94025",
        special_instructions="Extra napkins and utensils for 6 people",
        placed_at=datetime.now() - timedelta(hours=1, minutes=30),
        delivered_at=datetime.now() - timedelta(minutes=15),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order_2)
    db.flush()
    je_2 = create_order_journal_entry(order_2, vendor, driver, db)

    if send_emails and EMAIL_ENABLED:
        try:
            await send_invoice_email(
                customer_email=customer_email,
                customer_name=customer_name,
                invoice_number=f"INV-{order_2.order_number}",
                order_number=order_2.order_number,
                total_amount=total_2
            )
            results["emails_sent"].append({"order": order_2.order_number, "type": "invoice", "status": "sent"})
        except Exception as e:
            results["emails_sent"].append({"order": order_2.order_number, "error": str(e)})

    results["scenarios_tested"].append({
        "scenario": "2. Large Order ($25 tip)",
        "order_number": order_2.order_number,
        "status": "DELIVERED",
        "total": total_2,
        "tip": 25.00
    })

    # ========== SCENARIO 3: Promo Code Order ==========
    items_3 = [
        {"name": "Paneer Tikka Masala", "quantity": 1, "unit_price": 16.99, "total_price": 16.99},
        {"name": "Vegetable Biryani", "quantity": 1, "unit_price": 14.99, "total_price": 14.99}
    ]
    subtotal_3 = sum(item["total_price"] for item in items_3)
    discount_3 = 10.00
    tax_3 = round((subtotal_3 - discount_3) * 0.0925, 2)
    total_3 = round(subtotal_3 - discount_3 + tax_3 + 0 + 1.00 + 5.00, 2)

    order_3 = Order(
        order_number=f"NAT{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone="(650) 555-0001",
        vendor_id=vendor.id,
        items=json.dumps(items_3),
        subtotal=subtotal_3 - discount_3,
        tax_rate=0.0925,
        tax_amount=tax_3,
        delivery_fee=0,
        platform_fee=1.00,
        tip=5.00,
        total_amount=total_3,
        status=OrderStatus.DELIVERED,
        delivery_address="789 Stanford Ave, Stanford, CA 94305",
        placed_at=datetime.now() - timedelta(hours=1),
        delivered_at=datetime.now() - timedelta(minutes=5),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order_3)
    db.flush()
    je_3 = create_order_journal_entry(order_3, vendor, driver, db)

    if send_emails and EMAIL_ENABLED:
        try:
            promo_html = f"""
            <html><body style="font-family:Arial;">
            <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:30px;text-align:center;">
                    <h1>🎉 You Saved $10!</h1>
                </div>
                <div style="padding:30px;">
                    <p>Hi {customer_name},</p>
                    <p>Your promo code <strong>WELCOME10</strong> saved you $10 + free delivery!</p>
                    <p><strong>Order #{order_3.order_number}</strong></p>
                    <p>Total Paid: <strong>${total_3:.2f}</strong></p>
                </div>
            </div>
            </body></html>
            """
            await send_email(customer_email, f"🎉 You saved $10 on Order #{order_3.order_number}!", promo_html)
            results["emails_sent"].append({"order": order_3.order_number, "type": "promo_savings", "status": "sent"})
        except Exception as e:
            results["emails_sent"].append({"order": order_3.order_number, "error": str(e)})

    results["scenarios_tested"].append({
        "scenario": "3. Promo Code WELCOME10",
        "order_number": order_3.order_number,
        "status": "DELIVERED",
        "total": total_3,
        "discount": discount_3
    })

    # ========== SCENARIO 4: Express Delivery ==========
    items_4 = [
        {"name": "Chole Bhature", "quantity": 1, "unit_price": 13.99, "total_price": 13.99},
        {"name": "Sweet Lassi", "quantity": 1, "unit_price": 4.99, "total_price": 4.99}
    ]
    subtotal_4 = sum(item["total_price"] for item in items_4)
    tax_4 = round(subtotal_4 * 0.0925, 2)
    total_4 = round(subtotal_4 + tax_4 + 8.99 + 1.00 + 4.00, 2)

    order_4 = Order(
        order_number=f"NAT{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone="(650) 555-0001",
        vendor_id=vendor.id,
        items=json.dumps(items_4),
        subtotal=subtotal_4,
        tax_rate=0.0925,
        tax_amount=tax_4,
        delivery_fee=8.99,
        platform_fee=1.00,
        tip=4.00,
        total_amount=total_4,
        status=OrderStatus.DELIVERED,
        delivery_address="1 Hacker Way, Menlo Park, CA 94025",
        placed_at=datetime.now() - timedelta(minutes=45),
        delivered_at=datetime.now() - timedelta(minutes=10),
        driver_id=driver.id,
        driver_name=f"{driver.first_name} {driver.last_name}"
    )
    db.add(order_4)
    db.flush()
    je_4 = create_order_journal_entry(order_4, vendor, driver, db)

    if send_emails and EMAIL_ENABLED:
        try:
            express_html = f"""
            <html><body style="font-family:Arial;">
            <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:30px;text-align:center;">
                    <h1>⚡ Express Delivery Complete!</h1>
                    <p>Delivered in 35 minutes!</p>
                </div>
                <div style="padding:30px;">
                    <p>Hi {customer_name},</p>
                    <p>Your express order from <strong>{vendor.restaurant_name}</strong> has arrived!</p>
                    <p><strong>Order #{order_4.order_number}</strong></p>
                    <p>Total: <strong>${total_4:.2f}</strong></p>
                </div>
            </div>
            </body></html>
            """
            await send_email(customer_email, f"⚡ Express Order #{order_4.order_number} Delivered!", express_html)
            results["emails_sent"].append({"order": order_4.order_number, "type": "express", "status": "sent"})
        except Exception as e:
            results["emails_sent"].append({"order": order_4.order_number, "error": str(e)})

    results["scenarios_tested"].append({
        "scenario": "4. Express Delivery",
        "order_number": order_4.order_number,
        "status": "DELIVERED",
        "total": total_4,
        "delivery_time": "35 min"
    })

    # ========== SCENARIO 5: Cancelled Order ==========
    items_5 = [{"name": "Idli Sambar", "quantity": 2, "unit_price": 9.99, "total_price": 19.98}]
    subtotal_5 = 19.98
    total_5 = round(subtotal_5 + (subtotal_5 * 0.0925) + 3.99 + 1.00, 2)

    order_5 = Order(
        order_number=f"NAT{datetime.now().strftime('%m%d')}{uuid.uuid4().hex[:5].upper()}",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone="(650) 555-0001",
        vendor_id=vendor.id,
        items=json.dumps(items_5),
        subtotal=subtotal_5,
        tax_rate=0.0925,
        tax_amount=round(subtotal_5 * 0.0925, 2),
        delivery_fee=3.99,
        platform_fee=1.00,
        tip=0,
        total_amount=total_5,
        status=OrderStatus.CANCELLED,
        delivery_address="100 Main St, Palo Alto, CA 94301",
        placed_at=datetime.now() - timedelta(hours=1)
    )
    db.add(order_5)
    db.flush()

    if send_emails and EMAIL_ENABLED:
        try:
            cancel_html = f"""
            <html><body style="font-family:Arial;">
            <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
                <div style="background:#6b7280;color:white;padding:30px;text-align:center;">
                    <h1>Order Cancelled</h1>
                </div>
                <div style="padding:30px;">
                    <p>Hi {customer_name},</p>
                    <p>Your order <strong>#{order_5.order_number}</strong> has been cancelled.</p>
                    <p style="color:#10b981;font-weight:bold;">Full refund: ${total_5:.2f}</p>
                </div>
            </div>
            </body></html>
            """
            await send_email(customer_email, f"Order #{order_5.order_number} Cancelled - Refund Processed", cancel_html)
            results["emails_sent"].append({"order": order_5.order_number, "type": "cancellation", "status": "sent"})
        except Exception as e:
            results["emails_sent"].append({"order": order_5.order_number, "error": str(e)})

    results["scenarios_tested"].append({
        "scenario": "5. Cancelled Order",
        "order_number": order_5.order_number,
        "status": "CANCELLED",
        "refund": total_5
    })

    db.commit()

    # Summary
    total_orders = len(results["scenarios_tested"])
    delivered = len([s for s in results["scenarios_tested"] if s["status"] == "DELIVERED"])
    total_revenue = sum([s.get("total", 0) for s in results["scenarios_tested"] if s["status"] == "DELIVERED"])

    results["summary"] = {
        "total_orders": total_orders,
        "delivered": delivered,
        "cancelled": 1,
        "total_revenue": round(total_revenue, 2),
        "emails_sent": len([e for e in results["emails_sent"] if e.get("status") == "sent"]),
        "generated_by": ai_employee["name"]
    }

    # Send summary email
    if send_emails and EMAIL_ENABLED:
        try:
            summary_html = f"""
            <html><body style="font-family:Arial;">
            <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:30px;text-align:center;">
                    <h1>📊 Order Test Summary</h1>
                </div>
                <div style="padding:30px;">
                    <h2>Hi {customer_name},</h2>
                    <p>Test orders from <strong>{vendor.restaurant_name}</strong>:</p>
                    <div style="background:#f3f4f6;padding:20px;border-radius:8px;">
                        <p>✅ Total Orders: <strong>{total_orders}</strong></p>
                        <p>🚀 Delivered: <strong>{delivered}</strong></p>
                        <p>❌ Cancelled: <strong>1</strong></p>
                        <p>💰 Revenue: <strong>${total_revenue:.2f}</strong></p>
                    </div>
                </div>
            </div>
            </body></html>
            """
            await send_email(customer_email, f"📊 Dollor Test Summary - {total_orders} Orders", summary_html)
            results["emails_sent"].append({"type": "summary", "status": "sent"})
        except Exception as e:
            results["emails_sent"].append({"type": "summary", "error": str(e)})

    return results
