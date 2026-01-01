from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VENDOR = "vendor"

class InvoiceStatus(enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class VendorStatus(enum.Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class OnboardingPhase(enum.Enum):
    NOT_STARTED = "not_started"
    DOCUMENTS_PENDING = "documents_pending"
    UNDER_REVIEW = "under_review"
    COMPLIANCE_CHECK = "compliance_check"
    COMPLETED = "completed"

class RiskRating(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)  # Link to vendor account
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoices = relationship("Invoice", back_populates="user")
    vendor = relationship("Vendor", foreign_keys=[vendor_id])

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    company = Column(String(255))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    invoices = relationship("Invoice", back_populates="client")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    issue_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    
    subtotal = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    notes = Column(Text)
    terms = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    
    description = Column(String(500), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    
    invoice = relationship("Invoice", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, nullable=False)
    payment_method = Column(String(50))
    reference_number = Column(String(100))
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.COMPLETED)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="payments")

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Company Information
    company_name = Column(String(255), nullable=False)
    tax_id = Column(String(50))
    business_type = Column(String(100))
    industry = Column(String(100))
    website = Column(String(255))
    
    # Restaurant-Specific Fields
    restaurant_name = Column(String(255))
    cuisine_type = Column(String(100))
    operating_hours = Column(Text)
    seating_capacity = Column(Integer)
    delivery_available = Column(Boolean, default=True)
    pickup_available = Column(Boolean, default=True)
    average_prep_time = Column(Integer)  # in minutes
    
    # Primary Contact
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    contact_title = Column(String(100))
    
    # Address
    street = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Status and Ratings
    onboarding_status = Column(SQLEnum(VendorStatus), default=VendorStatus.PENDING)
    onboarding_phase = Column(SQLEnum(OnboardingPhase), default=OnboardingPhase.NOT_STARTED)
    risk_rating = Column(SQLEnum(RiskRating), default=RiskRating.MEDIUM)
    performance_score = Column(Integer, default=0)
    
    # Contract Information
    contract_status = Column(String(50))
    contract_start_date = Column(DateTime)
    contract_end_date = Column(DateTime)
    
    # ZIP Integration
    zip_status = Column(String(50))
    zip_vendor_id = Column(String(100))
    
    # Documents
    w9_form = Column(Boolean, default=False)
    w9_form_url = Column(String(500))
    insurance = Column(Boolean, default=False)
    insurance_url = Column(String(500))
    financial_statements = Column(Boolean, default=False)
    financial_statements_url = Column(String(500))
    compliance_certs = Column(Boolean, default=False)
    compliance_certs_url = Column(String(500))
    security_policy = Column(Boolean, default=False)
    security_policy_url = Column(String(500))
    food_license = Column(Boolean, default=False)
    food_license_url = Column(String(500))
    health_permit = Column(Boolean, default=False)
    health_permit_url = Column(String(500))
    
    # Mobile App Fields
    app_registered = Column(Boolean, default=False)
    mobile_device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))  # 'ios' or 'android'
    
    # Additional Information
    notes = Column(Text)
    onboarding_notes = Column(Text)
    rejection_reason = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)
    last_activity = Column(DateTime)

    # Publishing (for mobile apps - iOS, Android, Web)
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime)
    published_platforms = Column(Text)  # JSON array: ["ios", "android", "web"]

    # Relationships
    purchase_orders = relationship("VendorPurchaseOrder", back_populates="vendor", cascade="all, delete-orphan")
    menu_items = relationship("VendorMenuItem", back_populates="vendor", cascade="all, delete-orphan")

class VendorPurchaseOrder(Base):
    __tablename__ = "vendor_purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    amount = Column(Float, nullable=False)
    status = Column(String(50))
    
    order_date = Column(DateTime, nullable=False)
    delivery_date = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="purchase_orders")

class VendorMenuItem(Base):
    __tablename__ = "vendor_menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    
    # Menu Item Details
    item_name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # Appetizers, Main Course, Desserts, Beverages, etc.
    price = Column(Float, nullable=False)
    
    # Availability
    is_available = Column(Boolean, default=True)
    is_vegetarian = Column(Boolean, default=False)
    is_vegan = Column(Boolean, default=False)
    is_gluten_free = Column(Boolean, default=False)
    is_spicy = Column(Boolean, default=False)
    spice_level = Column(Integer, default=0)  # 0-5 scale
    
    # Additional Info
    prep_time = Column(Integer)  # in minutes
    calories = Column(Integer)
    image_url = Column(String(500))
    
    # Inventory
    in_stock = Column(Boolean, default=True)
    daily_limit = Column(Integer)
    items_sold_today = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="menu_items")

class OrderStatus(enum.Enum):
    # Payment & Initial
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"

    # Restaurant Acceptance Flow (3-minute window)
    PENDING_RESTAURANT = "pending_restaurant"
    PENDING_MODIFICATION = "pending_modification"
    DECLINED_BY_RESTAURANT = "declined_by_restaurant"
    RESTAURANT_TIMEOUT = "restaurant_timeout"

    # Preparation & Delivery
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Customer & Vendor
    customer_id = Column(Integer)  # Reference to customer (can add Customer table later)
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    
    # Order Items (JSON array)
    items = Column(Text)  # JSON: [{"menu_item_id": 1, "name": "...", "quantity": 2, "price": 15.99}]
    
    # Amounts
    subtotal = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)  # Your commission
    total_amount = Column(Float, nullable=False)
    
    # Delivery Details
    delivery_address = Column(Text)  # JSON: {"street": "...", "city": "...", ...}
    delivery_instructions = Column(Text)
    delivery_latitude = Column(Float)
    delivery_longitude = Column(Float)
    
    # Status
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING_PAYMENT)
    payment_status = Column(String(50), default="pending")  # pending, processing, succeeded, failed, refunded
    
    # Stripe Integration
    stripe_payment_intent_id = Column(String(255))
    stripe_charge_id = Column(String(255))
    stripe_customer_id = Column(String(255))
    payment_method = Column(String(50))
    
    # Invoice Reference
    invoice_number = Column(String(50))
    invoice_generated = Column(Boolean, default=False)
    invoice_pdf_url = Column(String(500))
    
    # Coupa Integration (for accounting)
    coupa_synced = Column(Boolean, default=False)
    coupa_invoice_id = Column(String(100))
    coupa_status = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    preparing_at = Column(DateTime)
    dispatched_at = Column(DateTime)
    delivered_at = Column(DateTime)
    cancelled_at = Column(DateTime)

    # Restaurant Acceptance Window (3-minute timeout)
    sent_to_restaurant_at = Column(DateTime)
    restaurant_accepted_at = Column(DateTime)
    restaurant_declined_at = Column(DateTime)
    restaurant_decline_reason = Column(String(500))
    restaurant_timeout_at = Column(DateTime)
    ready_for_pickup_at = Column(DateTime)

    # Driver Assignment (no FK - driver service is separate)
    driver_id = Column(Integer, nullable=True)
    driver_name = Column(String(255))
    driver_assigned_at = Column(DateTime)

    # Tip (can be added post-delivery)
    tip = Column(Float, default=0.0)
    tip_added_at = Column(DateTime)

    # Relationships
    vendor = relationship("Vendor")

class StripePaymentLog(Base):
    __tablename__ = "stripe_payment_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    
    # Stripe Event Details
    event_type = Column(String(100))  # payment_intent.succeeded, charge.succeeded, etc.
    stripe_event_id = Column(String(255), unique=True)
    payment_intent_id = Column(String(255))
    charge_id = Column(String(255))
    
    # Payment Details
    amount = Column(Float)
    currency = Column(String(10), default="usd")
    status = Column(String(50))
    
    # Raw Data
    raw_data = Column(Text)  # Full JSON from Stripe
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)

class VendorPayout(Base):
    __tablename__ = "vendor_payouts"
    
    id = Column(Integer, primary_key=True, index=True)
    payout_number = Column(String(50), unique=True, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    
    # Payout Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Financial Details
    total_orders = Column(Integer, default=0)
    gross_revenue = Column(Float, default=0.0)  # Total order amounts
    platform_fee = Column(Float, default=0.0)  # Platform fee ($1 flat per order - see PRICING_MODEL.md)
    stripe_fees = Column(Float, default=0.0)  # Stripe processing fees
    net_payout = Column(Float, default=0.0)  # What vendor receives
    
    # Status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    
    # Coupa Integration
    coupa_invoice_id = Column(String(100))
    coupa_status = Column(String(50))
    coupa_synced_at = Column(DateTime)
    
    # Payment Details
    paid_at = Column(DateTime)
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor")
