"""
Enterprise Payment System for Dollor.ai
========================================

Full-stack payment infrastructure supporting:
1. Customer Payments: Card (Stripe) + ACH (Plaid + Stripe)
2. Vendor Payouts: Standard ACH, Fast ACH, Instant (Debit Card)
3. Driver Payouts: Standard ACH, Instant Pay
4. Stripe Connect: Onboarding for vendors and drivers

Fee Structure:
- Customer Card Payment: 2.9% + $0.30 (absorbed or passed to customer)
- Customer ACH Payment: 0.8% capped at $5 (savings passed to customer)
- Vendor Standard Payout: $1.00 (weekly ACH)
- Vendor Fast Payout: $0.50/day (daily ACH, vendor pays)
- Vendor Instant Payout: 1.5% (instant to debit, vendor pays)
- Driver Standard Payout: Free (weekly ACH)
- Driver Instant Payout: 1% min $0.50 (instant to debit)

Environment Variables Required:
- STRIPE_SECRET_KEY: Stripe secret key (sk_live_xxx or sk_test_xxx)
- STRIPE_PUBLISHABLE_KEY: Stripe publishable key (pk_live_xxx or pk_test_xxx)
- STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_xxx)
- PLAID_CLIENT_ID: Plaid client ID
- PLAID_SECRET: Plaid secret (sandbox/development/production)
- PLAID_ENV: Plaid environment (sandbox/development/production)
- ENVIRONMENT: production or development
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from enum import Enum
import stripe
import json
import os
import uuid
import httpx
from dotenv import load_dotenv

from database import get_db
from models import (
    Order, OrderStatus, Vendor, Driver, VendorPayout, DriverPayout,
    StripePaymentLog, VendorStatus, DriverStatus
)

load_dotenv()

# ===================== CONFIGURATION =====================

# Stripe Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_key_here")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_your_key_here")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Plaid Configuration
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID", "")
PLAID_SECRET = os.getenv("PLAID_SECRET", "")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")  # sandbox, development, production

PLAID_BASE_URLS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com"
}

# Environment
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# Fee Configuration
class FeeConfig:
    # Customer Collection Fees
    CARD_PERCENTAGE = 0.029  # 2.9%
    CARD_FIXED = 0.30  # $0.30
    ACH_PERCENTAGE = 0.008  # 0.8%
    ACH_MAX_FEE = 5.00  # Capped at $5

    # Payout Fees
    VENDOR_STANDARD_PAYOUT_FEE = 1.00  # $1 for weekly ACH
    VENDOR_FAST_PAYOUT_FEE = 0.50  # $0.50/day for daily ACH
    VENDOR_INSTANT_PERCENTAGE = 0.015  # 1.5% for instant
    DRIVER_INSTANT_PERCENTAGE = 0.01  # 1% for instant
    DRIVER_INSTANT_MIN = 0.50  # Minimum $0.50

    # Customer Incentives
    ACH_CUSTOMER_DISCOUNT = 0.50  # $0.50 discount for ACH payment

router = APIRouter(prefix="/api/enterprise", tags=["enterprise-payments"])


# ===================== PYDANTIC MODELS =====================

class PaymentMethod(str, Enum):
    CARD = "card"
    ACH = "ach"
    WALLET = "wallet"

class PayoutSpeed(str, Enum):
    STANDARD = "standard"  # 1-2 business days
    FAST = "fast"  # Same day ACH
    INSTANT = "instant"  # Seconds to debit card

# Customer Payment Models
class CreatePaymentRequest(BaseModel):
    amount: int = Field(..., description="Amount in cents")
    currency: str = "usd"
    payment_method: PaymentMethod = PaymentMethod.CARD
    customer_email: Optional[str] = None
    customer_id: Optional[str] = None
    order_id: Optional[str] = None
    save_payment_method: bool = False

class PaymentResponse(BaseModel):
    payment_id: str
    client_secret: Optional[str] = None
    amount: int
    currency: str
    payment_method: str
    status: str
    customer_discount: float = 0
    processing_fee: float
    net_amount: int

# ACH/Plaid Models
class PlaidLinkTokenRequest(BaseModel):
    customer_id: str
    customer_email: str
    customer_name: Optional[str] = None

class PlaidLinkTokenResponse(BaseModel):
    link_token: str
    expiration: str

class PlaidExchangeRequest(BaseModel):
    public_token: str
    customer_id: str

class BankAccountResponse(BaseModel):
    account_id: str
    bank_name: str
    account_mask: str  # Last 4 digits
    account_type: str  # checking/savings
    stripe_bank_account_id: str

# Stripe Connect Models
class ConnectOnboardingRequest(BaseModel):
    entity_type: Literal["vendor", "driver"]
    entity_id: int
    email: str
    business_type: Literal["individual", "company"] = "individual"
    country: str = "US"

class ConnectOnboardingResponse(BaseModel):
    account_id: str
    onboarding_url: str
    status: str

# Payout Models
class PayoutRequest(BaseModel):
    entity_type: Literal["vendor", "driver"]
    entity_id: int
    amount: int = Field(..., description="Amount in cents")
    speed: PayoutSpeed = PayoutSpeed.STANDARD
    description: Optional[str] = None

class PayoutResponse(BaseModel):
    payout_id: str
    amount: int
    fee: float
    net_amount: int
    speed: str
    status: str
    arrival_date: Optional[str] = None

class BalanceResponse(BaseModel):
    available: int
    pending: int
    currency: str


# ===================== HELPER FUNCTIONS =====================

def calculate_ach_fee(amount_cents: int) -> float:
    """Calculate ACH fee (0.8% capped at $5)"""
    amount_dollars = amount_cents / 100
    fee = amount_dollars * FeeConfig.ACH_PERCENTAGE
    return min(fee, FeeConfig.ACH_MAX_FEE)

def calculate_card_fee(amount_cents: int) -> float:
    """Calculate card processing fee (2.9% + $0.30)"""
    amount_dollars = amount_cents / 100
    return (amount_dollars * FeeConfig.CARD_PERCENTAGE) + FeeConfig.CARD_FIXED

def calculate_instant_payout_fee(amount_cents: int, entity_type: str) -> float:
    """Calculate instant payout fee"""
    amount_dollars = amount_cents / 100
    if entity_type == "vendor":
        return amount_dollars * FeeConfig.VENDOR_INSTANT_PERCENTAGE
    else:  # driver
        fee = amount_dollars * FeeConfig.DRIVER_INSTANT_PERCENTAGE
        return max(fee, FeeConfig.DRIVER_INSTANT_MIN)

async def call_plaid(endpoint: str, data: dict) -> dict:
    """Make authenticated call to Plaid API"""
    base_url = PLAID_BASE_URLS.get(PLAID_ENV, PLAID_BASE_URLS["sandbox"])

    payload = {
        "client_id": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
        **data
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}{endpoint}",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Plaid error: {error_data.get('error_message', 'Unknown error')}"
            )

        return response.json()


# ===================== CUSTOMER PAYMENT ENDPOINTS =====================

@router.post("/payments/create", response_model=PaymentResponse)
async def create_payment(
    request: CreatePaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Create a payment intent for customer checkout.

    Supports:
    - Card payments (Stripe)
    - ACH payments (Plaid + Stripe) - Lower fees, customer gets discount

    Returns client_secret for frontend to complete payment.
    """
    try:
        # Get or create Stripe customer
        customer_id = request.customer_id
        if not customer_id and request.customer_email:
            # Search for existing customer
            existing = stripe.Customer.list(email=request.customer_email, limit=1)
            if existing.data:
                customer_id = existing.data[0].id
            else:
                customer = stripe.Customer.create(
                    email=request.customer_email,
                    metadata={"source": "dollor_enterprise"}
                )
                customer_id = customer.id

        # Calculate fees and discounts
        if request.payment_method == PaymentMethod.ACH:
            processing_fee = calculate_ach_fee(request.amount)
            customer_discount = FeeConfig.ACH_CUSTOMER_DISCOUNT * 100  # Convert to cents
            payment_method_types = ["us_bank_account"]
        else:
            processing_fee = calculate_card_fee(request.amount)
            customer_discount = 0
            payment_method_types = ["card"]

        # Create PaymentIntent
        intent_params = {
            "amount": request.amount,
            "currency": request.currency,
            "payment_method_types": payment_method_types,
            "metadata": {
                "order_id": request.order_id or "",
                "payment_method_type": request.payment_method.value,
                "processing_fee": str(processing_fee),
                "customer_discount": str(customer_discount / 100)
            }
        }

        if customer_id:
            intent_params["customer"] = customer_id

        if request.save_payment_method:
            intent_params["setup_future_usage"] = "off_session"

        # For ACH, use automatic payment methods
        if request.payment_method == PaymentMethod.ACH:
            intent_params["payment_method_options"] = {
                "us_bank_account": {
                    "financial_connections": {
                        "permissions": ["payment_method", "balances"]
                    }
                }
            }

        payment_intent = stripe.PaymentIntent.create(**intent_params)

        return PaymentResponse(
            payment_id=payment_intent.id,
            client_secret=payment_intent.client_secret,
            amount=request.amount,
            currency=request.currency,
            payment_method=request.payment_method.value,
            status=payment_intent.status,
            customer_discount=customer_discount / 100,  # Convert to dollars
            processing_fee=processing_fee,
            net_amount=request.amount - int(customer_discount)
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.post("/payments/ach/setup", response_model=PaymentResponse)
async def setup_ach_payment(
    request: CreatePaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Create ACH payment using Stripe's Financial Connections.

    This creates a PaymentIntent with us_bank_account as the payment method.
    The frontend uses Stripe.js to complete the bank account linking.
    """
    request.payment_method = PaymentMethod.ACH
    return await create_payment(request, db)


# ===================== PLAID INTEGRATION =====================

@router.post("/plaid/link-token", response_model=PlaidLinkTokenResponse)
async def create_plaid_link_token(request: PlaidLinkTokenRequest):
    """
    Create a Plaid Link token for bank account verification.

    The frontend uses this token to open Plaid Link and let the user
    authenticate with their bank.
    """
    if not PLAID_CLIENT_ID or not PLAID_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Plaid not configured. Set PLAID_CLIENT_ID and PLAID_SECRET."
        )

    response = await call_plaid("/link/token/create", {
        "user": {
            "client_user_id": request.customer_id
        },
        "client_name": "Dollor",
        "products": ["auth", "transactions"],
        "country_codes": ["US"],
        "language": "en",
        "account_filters": {
            "depository": {
                "account_subtypes": ["checking", "savings"]
            }
        }
    })

    return PlaidLinkTokenResponse(
        link_token=response["link_token"],
        expiration=response["expiration"]
    )


@router.post("/plaid/exchange", response_model=BankAccountResponse)
async def exchange_plaid_token(request: PlaidExchangeRequest, db: Session = Depends(get_db)):
    """
    Exchange Plaid public_token for access_token and create Stripe bank account.

    Flow:
    1. Exchange public_token for access_token
    2. Get account/routing numbers from Plaid
    3. Create bank account token in Stripe
    4. Attach to Stripe customer
    """
    # Exchange public token
    exchange_response = await call_plaid("/item/public_token/exchange", {
        "public_token": request.public_token
    })
    access_token = exchange_response["access_token"]

    # Get auth data (account/routing numbers)
    auth_response = await call_plaid("/auth/get", {
        "access_token": access_token
    })

    # Get first checking account
    accounts = auth_response.get("accounts", [])
    numbers = auth_response.get("numbers", {}).get("ach", [])

    if not accounts or not numbers:
        raise HTTPException(status_code=400, detail="No bank accounts found")

    account = accounts[0]
    number_data = next((n for n in numbers if n["account_id"] == account["account_id"]), None)

    if not number_data:
        raise HTTPException(status_code=400, detail="Could not retrieve account numbers")

    # Create Stripe bank account token
    try:
        bank_token = stripe.Token.create(
            bank_account={
                "country": "US",
                "currency": "usd",
                "account_holder_name": account.get("name", "Account Holder"),
                "account_holder_type": "individual",
                "routing_number": number_data["routing"],
                "account_number": number_data["account"]
            }
        )

        # Get or create Stripe customer and attach bank account
        # In production, look up customer by request.customer_id
        customer = stripe.Customer.create(
            metadata={"dollor_customer_id": request.customer_id}
        )

        bank_account = stripe.Customer.create_source(
            customer.id,
            source=bank_token.id
        )

        return BankAccountResponse(
            account_id=account["account_id"],
            bank_name=account.get("name", "Bank Account"),
            account_mask=account.get("mask", "****"),
            account_type=account.get("subtype", "checking"),
            stripe_bank_account_id=bank_account.id
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


# ===================== STRIPE CONNECT ONBOARDING =====================

@router.post("/connect/onboard", response_model=ConnectOnboardingResponse)
async def create_connect_account(
    request: ConnectOnboardingRequest,
    db: Session = Depends(get_db)
):
    """
    Create Stripe Connect Express account for vendor or driver.

    This enables:
    - Direct payouts to their bank account
    - Instant payouts to debit card
    - Automated 1099 tax forms
    """
    # Verify entity exists
    if request.entity_type == "vendor":
        entity = db.query(Vendor).filter(Vendor.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Vendor not found")
    else:
        entity = db.query(Driver).filter(Driver.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Driver not found")

    try:
        # Create Express account
        account = stripe.Account.create(
            type="express",
            country=request.country,
            email=request.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True}
            },
            business_type=request.business_type,
            metadata={
                "entity_type": request.entity_type,
                "entity_id": str(request.entity_id),
                "source": "dollor_enterprise"
            }
        )

        # Create onboarding link
        base_url = os.getenv("APP_BASE_URL", "https://dollor.ai")
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{base_url}/connect/refresh?account={account.id}",
            return_url=f"{base_url}/connect/complete?account={account.id}",
            type="account_onboarding"
        )

        # Store Connect account ID in database
        # In production, add stripe_connect_account_id column to Vendor/Driver tables
        # entity.stripe_connect_account_id = account.id
        # db.commit()

        return ConnectOnboardingResponse(
            account_id=account.id,
            onboarding_url=account_link.url,
            status="pending"
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.get("/connect/status/{account_id}")
async def get_connect_status(account_id: str):
    """Check Stripe Connect account status and capabilities."""
    try:
        account = stripe.Account.retrieve(account_id)

        return {
            "account_id": account.id,
            "details_submitted": account.details_submitted,
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "capabilities": {
                "card_payments": account.capabilities.get("card_payments", "inactive"),
                "transfers": account.capabilities.get("transfers", "inactive")
            },
            "requirements": {
                "currently_due": account.requirements.currently_due if account.requirements else [],
                "eventually_due": account.requirements.eventually_due if account.requirements else [],
                "pending_verification": account.requirements.pending_verification if account.requirements else []
            }
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.post("/connect/dashboard-link/{account_id}")
async def create_dashboard_link(account_id: str):
    """Create a link for the vendor/driver to access their Stripe Express dashboard."""
    try:
        login_link = stripe.Account.create_login_link(account_id)
        return {"url": login_link.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


# ===================== PAYOUT ENDPOINTS =====================

@router.post("/payouts/create", response_model=PayoutResponse)
async def create_payout(
    request: PayoutRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create payout to vendor or driver.

    Payout Speeds:
    - STANDARD: Weekly ACH, $1 fee for vendors, free for drivers
    - FAST: Daily ACH, $0.50/day for vendors (vendor pays)
    - INSTANT: Seconds to debit card, 1.5% for vendors, 1% for drivers

    Requires Stripe Connect account to be set up.
    """
    # Verify entity and get Connect account
    if request.entity_type == "vendor":
        entity = db.query(Vendor).filter(Vendor.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Vendor not found")
        # In production: stripe_account_id = entity.stripe_connect_account_id
    else:
        entity = db.query(Driver).filter(Driver.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Driver not found")
        # In production: stripe_account_id = entity.stripe_connect_account_id

    # For demo, we'll use a placeholder
    # In production, get from database
    stripe_account_id = getattr(entity, 'stripe_connect_account_id', None)
    if not stripe_account_id:
        raise HTTPException(
            status_code=400,
            detail="Stripe Connect account not set up. Complete onboarding first."
        )

    # Calculate fee based on speed and entity type
    if request.speed == PayoutSpeed.INSTANT:
        fee = calculate_instant_payout_fee(request.amount, request.entity_type)
    elif request.speed == PayoutSpeed.FAST:
        fee = FeeConfig.VENDOR_FAST_PAYOUT_FEE if request.entity_type == "vendor" else 0
    else:  # STANDARD
        fee = FeeConfig.VENDOR_STANDARD_PAYOUT_FEE if request.entity_type == "vendor" else 0

    fee_cents = int(fee * 100)
    net_amount = request.amount - fee_cents

    if net_amount <= 0:
        raise HTTPException(status_code=400, detail="Payout amount must exceed fees")

    try:
        if request.speed == PayoutSpeed.INSTANT:
            # Instant payout to debit card
            payout = stripe.Payout.create(
                amount=net_amount,
                currency="usd",
                method="instant",
                description=request.description or f"Dollor {request.entity_type} instant payout",
                stripe_account=stripe_account_id
            )
        else:
            # Standard or Fast ACH payout
            payout = stripe.Payout.create(
                amount=net_amount,
                currency="usd",
                method="standard",
                description=request.description or f"Dollor {request.entity_type} payout",
                stripe_account=stripe_account_id
            )

        # Record payout in database
        payout_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

        if request.entity_type == "vendor":
            db_payout = VendorPayout(
                payout_number=payout_number,
                vendor_id=request.entity_id,
                gross_revenue=request.amount / 100,
                platform_fee=fee,
                net_payout=net_amount / 100,
                status="pending",
                period_start=datetime.now(),
                period_end=datetime.now()
            )
        else:
            db_payout = DriverPayout(
                payout_number=payout_number,
                driver_id=request.entity_id,
                gross_earnings=request.amount / 100,
                platform_fee=fee,
                net_payout=net_amount / 100,
                status="pending"
            )

        db.add(db_payout)
        db.commit()

        # Calculate arrival date
        if request.speed == PayoutSpeed.INSTANT:
            arrival = "Within minutes"
        elif request.speed == PayoutSpeed.FAST:
            arrival = "Same business day"
        else:
            arrival = "1-2 business days"

        return PayoutResponse(
            payout_id=payout.id,
            amount=request.amount,
            fee=fee,
            net_amount=net_amount,
            speed=request.speed.value,
            status=payout.status,
            arrival_date=arrival
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Payout failed: {str(e)}")


@router.get("/payouts/balance/{entity_type}/{entity_id}", response_model=BalanceResponse)
async def get_balance(
    entity_type: Literal["vendor", "driver"],
    entity_id: int,
    db: Session = Depends(get_db)
):
    """Get available and pending balance for vendor or driver."""

    # Verify entity and get Connect account
    if entity_type == "vendor":
        entity = db.query(Vendor).filter(Vendor.id == entity_id).first()
    else:
        entity = db.query(Driver).filter(Driver.id == entity_id).first()

    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.title()} not found")

    stripe_account_id = getattr(entity, 'stripe_connect_account_id', None)
    if not stripe_account_id:
        raise HTTPException(status_code=400, detail="Stripe Connect not set up")

    try:
        balance = stripe.Balance.retrieve(stripe_account=stripe_account_id)

        # Get USD balance
        available = 0
        pending = 0

        for b in balance.available:
            if b.currency == "usd":
                available = b.amount

        for b in balance.pending:
            if b.currency == "usd":
                pending = b.amount

        return BalanceResponse(
            available=available,
            pending=pending,
            currency="usd"
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.get("/payouts/history/{entity_type}/{entity_id}")
async def get_payout_history(
    entity_type: Literal["vendor", "driver"],
    entity_id: int,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get payout history for vendor or driver."""

    if entity_type == "vendor":
        payouts = db.query(VendorPayout).filter(
            VendorPayout.vendor_id == entity_id
        ).order_by(VendorPayout.created_at.desc()).limit(limit).all()

        return [{
            "payout_number": p.payout_number,
            "gross_amount": p.gross_revenue,
            "fee": p.platform_fee,
            "net_amount": p.net_payout,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None
        } for p in payouts]
    else:
        payouts = db.query(DriverPayout).filter(
            DriverPayout.driver_id == entity_id
        ).order_by(DriverPayout.created_at.desc()).limit(limit).all()

        return [{
            "payout_number": p.payout_number,
            "gross_amount": p.gross_earnings,
            "fee": p.platform_fee,
            "net_amount": p.net_payout,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None
        } for p in payouts]


# ===================== BATCH PAYOUTS =====================

@router.post("/payouts/batch")
async def create_batch_payouts(
    entity_type: Literal["vendor", "driver"],
    speed: PayoutSpeed = PayoutSpeed.STANDARD,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Process batch payouts for all vendors or drivers with pending balances.

    This is typically run on a schedule:
    - STANDARD: Weekly (every Monday)
    - FAST: Daily
    """

    # Get all entities with pending payouts
    if entity_type == "vendor":
        # Get vendors with completed orders not yet paid out
        pending_payouts = db.query(
            Order.vendor_id,
            func.sum(Order.subtotal).label("total_revenue"),
            func.sum(Order.platform_fee).label("total_fees"),
            func.count(Order.id).label("order_count")
        ).filter(
            Order.payment_status == "succeeded",
            Order.status == OrderStatus.DELIVERED
            # Add: Order.payout_id == None to track unpaid orders
        ).group_by(Order.vendor_id).all()
    else:
        # Get drivers with completed deliveries
        pending_payouts = db.query(
            Order.driver_id,
            func.sum(Order.delivery_fee + Order.tip).label("total_earnings"),
            func.count(Order.id).label("delivery_count")
        ).filter(
            Order.payment_status == "succeeded",
            Order.status == OrderStatus.DELIVERED,
            Order.driver_id.isnot(None)
        ).group_by(Order.driver_id).all()

    results = []
    for payout_data in pending_payouts:
        entity_id = payout_data[0]
        if entity_type == "vendor":
            amount = int((payout_data[1] - payout_data[2]) * 100)  # Net revenue in cents
        else:
            amount = int(payout_data[1] * 100)  # Earnings in cents

        if amount > 0:
            try:
                result = await create_payout(
                    PayoutRequest(
                        entity_type=entity_type,
                        entity_id=entity_id,
                        amount=amount,
                        speed=speed,
                        description=f"Batch payout - {datetime.now().strftime('%Y-%m-%d')}"
                    ),
                    background_tasks,
                    db
                )
                results.append({
                    "entity_id": entity_id,
                    "status": "success",
                    "payout_id": result.payout_id
                })
            except HTTPException as e:
                results.append({
                    "entity_id": entity_id,
                    "status": "failed",
                    "error": e.detail
                })

    return {
        "processed": len(results),
        "successful": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "failed"]),
        "results": results
    }


# ===================== FEE CALCULATOR ENDPOINT =====================

@router.get("/fees/calculate")
async def calculate_fees(
    amount: int,
    payment_method: PaymentMethod = PaymentMethod.CARD,
    payout_speed: Optional[PayoutSpeed] = None,
    entity_type: Optional[Literal["vendor", "driver"]] = None
):
    """
    Calculate fees for a given amount.

    Useful for displaying fee breakdown in the app before payment/payout.
    """
    result = {
        "amount": amount,
        "currency": "usd"
    }

    # Collection fees
    if payment_method == PaymentMethod.CARD:
        collection_fee = calculate_card_fee(amount)
        result["collection"] = {
            "method": "card",
            "fee": round(collection_fee, 2),
            "fee_percentage": "2.9% + $0.30",
            "customer_discount": 0
        }
    elif payment_method == PaymentMethod.ACH:
        collection_fee = calculate_ach_fee(amount)
        result["collection"] = {
            "method": "ach",
            "fee": round(collection_fee, 2),
            "fee_percentage": "0.8% (max $5)",
            "customer_discount": FeeConfig.ACH_CUSTOMER_DISCOUNT,
            "savings_vs_card": round(calculate_card_fee(amount) - collection_fee, 2)
        }

    # Payout fees
    if payout_speed and entity_type:
        if payout_speed == PayoutSpeed.INSTANT:
            payout_fee = calculate_instant_payout_fee(amount, entity_type)
            fee_desc = f"{FeeConfig.VENDOR_INSTANT_PERCENTAGE * 100}%" if entity_type == "vendor" else f"{FeeConfig.DRIVER_INSTANT_PERCENTAGE * 100}% (min ${FeeConfig.DRIVER_INSTANT_MIN})"
        elif payout_speed == PayoutSpeed.FAST:
            payout_fee = FeeConfig.VENDOR_FAST_PAYOUT_FEE if entity_type == "vendor" else 0
            fee_desc = f"${payout_fee}/day"
        else:
            payout_fee = FeeConfig.VENDOR_STANDARD_PAYOUT_FEE if entity_type == "vendor" else 0
            fee_desc = "Free" if payout_fee == 0 else f"${payout_fee}"

        result["payout"] = {
            "speed": payout_speed.value,
            "fee": round(payout_fee, 2),
            "fee_description": fee_desc,
            "net_amount": amount - int(payout_fee * 100),
            "arrival": "Instant" if payout_speed == PayoutSpeed.INSTANT else "Same day" if payout_speed == PayoutSpeed.FAST else "1-2 business days"
        }

    return result


# ===================== WEBHOOK HANDLERS =====================

@router.post("/webhooks/stripe-connect")
async def handle_connect_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """Handle Stripe Connect webhooks for account updates and payout events."""

    payload = await request.body()

    # In production, use a separate webhook secret for Connect
    connect_webhook_secret = os.getenv("STRIPE_CONNECT_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET)

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, connect_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    event_object = event["data"]["object"]

    if event_type == "account.updated":
        # Connected account was updated
        account_id = event_object["id"]

        if event_object.get("payouts_enabled"):
            # Account is now ready for payouts
            print(f"[CONNECT] Account {account_id} payouts enabled")
            # Update database: entity.stripe_payouts_enabled = True

        if event_object.get("details_submitted"):
            print(f"[CONNECT] Account {account_id} onboarding complete")

    elif event_type == "payout.paid":
        # Payout was successful
        payout_id = event_object["id"]
        print(f"[CONNECT] Payout {payout_id} completed")
        # Update payout status in database

    elif event_type == "payout.failed":
        # Payout failed
        payout_id = event_object["id"]
        failure_message = event_object.get("failure_message", "Unknown error")
        print(f"[CONNECT] Payout {payout_id} failed: {failure_message}")
        # Update payout status and notify user

    return {"status": "success", "event_type": event_type}
