from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum, JSON, Computed
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VENDOR = "vendor"
    DRIVER = "driver"

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
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)  # Link to driver account
    created_at = Column(DateTime, default=datetime.utcnow)

    invoices = relationship("Invoice", back_populates="user")
    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    driver = relationship("Driver", foreign_keys=[driver_id])

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
    vendor_id = Column(Integer, Computed('id'), index=True)
    
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

    # Document Verification (Third-Party Integration)
    verification_id = Column(String(255))  # Persona/Onfido inquiry ID
    verification_status = Column(String(50), default="not_started")  # pending, verified, rejected, needs_review
    documents_verified = Column(Boolean, default=False)
    documents_verified_at = Column(DateTime)
    verification_notes = Column(Text)
    verification_reviewer_id = Column(Integer)  # Admin who manually reviewed

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

    # Customizations (stored as JSON for flexibility)
    # Format: [{"name": "Spice Level", "type": "single", "required": true, "options": [{"name": "Mild", "price": 0}, ...]}]
    customizations = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="menu_items")

class OrderStatus(enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Customer & Vendor & Driver
    customer_id = Column(Integer)  # Reference to customer (can add Customer table later)
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    driver_id = Column(Integer, nullable=True)  # Assigned driver
    driver_name = Column(String(255), nullable=True)
    
    # Order Items (JSON array)
    items = Column(Text)  # JSON: [{"menu_item_id": 1, "name": "...", "quantity": 2, "price": 15.99}]
    
    # Amounts
    subtotal = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)  # Customer tip for driver
    platform_fee = Column(Float, default=0.0)  # Your commission ($1 flat fee)
    total_amount = Column(Float, nullable=False)
    
    # Delivery Details
    delivery_address = Column(Text)  # JSON: {"street": "...", "city": "...", ...}
    delivery_instructions = Column(Text)
    delivery_latitude = Column(Float)
    delivery_longitude = Column(Float)
    driver_location = Column(Text)  # JSON: {"latitude": ..., "longitude": ..., "updated_at": ...}
    
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
    delivered_at = Column(DateTime)
    dispatched_at = Column(DateTime)  # When driver was assigned

    # Auto-Dispatch System
    auto_dispatched = Column(Boolean, default=False)  # Was this auto-dispatched?
    broadcast_to_drivers = Column(Boolean, default=False)  # Was broadcast sent?
    broadcast_at = Column(DateTime)  # When broadcast was sent
    broadcast_radius_km = Column(Float)  # Radius used for broadcast

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
    platform_fee = Column(Float, default=0.0)  # Your commission (e.g., 15%)
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


class CustomerStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class Customer(Base):
    """Customer accounts for food ordering"""
    __tablename__ = "customers"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(50), unique=True, nullable=True, index=True)

    # Personal Information (matches database schema: first_name, last_name)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50))
    password_hash = Column(String(255))  # For customer authentication

    # Addresses
    default_address = Column(JSON)
    saved_addresses = Column(JSON)  # Array of addresses

    # Preferences
    dietary_preferences = Column(JSON)  # ["vegetarian", "gluten_free"]
    favorite_cuisines = Column(JSON)
    notification_preferences = Column(JSON)

    # Loyalty
    loyalty_points = Column(Integer, default=0)
    loyalty_tier = Column(String(50), default="bronze")  # bronze, silver, gold, platinum

    # Stats
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    average_order_value = Column(Float, default=0.0)

    # Engagement
    first_order_at = Column(DateTime)
    last_order_at = Column(DateTime)
    days_since_last_order = Column(Integer)

    # Mobile App
    device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))  # ios, android
    app_version = Column(String(20))

    # Stripe
    stripe_customer_id = Column(String(255))

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Cart(Base):
    """Shopping cart for customers"""
    __tablename__ = "carts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    # Promo code
    promo_code = Column(String(50), nullable=True)
    promo_discount = Column(Float, default=0.0)
    promo_type = Column(String(50), nullable=True)  # percentage, flat_amount, free_delivery

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    """Individual items in a shopping cart"""
    __tablename__ = "cart_items"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=False, index=True)
    menu_item_id = Column(Integer, ForeignKey("vendor_menu_items.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)

    # Item Details (denormalized for performance)
    item_name = Column(String(255), nullable=False)
    item_description = Column(Text)
    item_price = Column(Float, nullable=False)  # Price at time of adding to cart
    quantity = Column(Integer, default=1)

    # Restaurant info (denormalized)
    vendor_name = Column(String(255), nullable=False)

    # Customizations
    special_instructions = Column(Text)
    customizations = Column(JSON, default=dict)  # Selected customization options

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    cart = relationship("Cart", back_populates="items")


class DriverStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(String(50), unique=True, nullable=False, index=True)

    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    password_hash = Column(String(255))  # For driver app authentication
    date_of_birth = Column(String(20))  # YYYY-MM-DD format
    license_number = Column(String(50))  # Driver's license number

    # Address
    street = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))

    # Vehicle Information
    vehicle_type = Column(String(50))  # car, motorcycle, bicycle
    vehicle_make = Column(String(100))
    vehicle_model = Column(String(100))
    vehicle_year = Column(Integer)
    vehicle_color = Column(String(50))
    license_plate = Column(String(20))

    # Documents
    drivers_license = Column(Boolean, default=False)
    drivers_license_url = Column(String(500))
    drivers_license_expiry = Column(DateTime)
    insurance = Column(Boolean, default=False)
    insurance_url = Column(String(500))
    insurance_expiry = Column(DateTime)
    background_check = Column(Boolean, default=False)
    background_check_date = Column(DateTime)

    # Status and Ratings
    status = Column(SQLEnum(DriverStatus), default=DriverStatus.PENDING)
    rating = Column(Float, default=5.0)
    total_deliveries = Column(Integer, default=0)

    # Real-time tracking
    current_latitude = Column(Float)
    current_longitude = Column(Float)
    is_online = Column(Boolean, default=False)
    last_location_update = Column(DateTime)
    location_updated_at = Column(DateTime)  # Last GPS update
    went_online_at = Column(DateTime)  # When driver came online
    went_offline_at = Column(DateTime)  # When driver went offline

    # Mobile App
    device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))  # 'ios' or 'android'
    fcm_token = Column(String(500))  # FCM token for push notifications
    device_type = Column(String(20))  # ios, android, web
    fcm_token_updated_at = Column(DateTime)
    photo_url = Column(String(500))  # Driver photo

    # Stripe Connect (for payouts)
    stripe_account_id = Column(String(255))
    stripe_onboarded = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)

    # Document Verification (Third-Party Integration)
    verification_id = Column(String(255))  # Persona/Onfido inquiry ID
    verification_status = Column(String(50), default="not_started")  # pending, verified, rejected, needs_review
    documents_verified = Column(Boolean, default=False)
    documents_verified_at = Column(DateTime)
    verification_notes = Column(Text)
    verification_reviewer_id = Column(Integer)  # Admin who manually reviewed

    # Relationships
    payouts = relationship("DriverPayout", back_populates="driver")


class DriverPayout(Base):
    __tablename__ = "driver_payouts"

    id = Column(Integer, primary_key=True, index=True)
    payout_number = Column(String(50), unique=True, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)

    # Payout Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Financial Details
    total_deliveries = Column(Integer, default=0)
    delivery_fee = Column(Float, default=0.0)  # Base delivery fee
    tip = Column(Float, default=0.0)  # Customer tip
    bonus = Column(Float, default=0.0)  # Peak hour bonuses, etc.
    deductions = Column(Float, default=0.0)  # Any deductions
    net_payout = Column(Float, default=0.0)  # What driver receives

    # Status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed

    # Payment Details
    paid_at = Column(DateTime)
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    stripe_transfer_id = Column(String(255))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    driver = relationship("Driver", back_populates="payouts")


class JournalEntry(Base):
    """Double-entry accounting journal entries for all transactions"""
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    entry_number = Column(String(50), unique=True, nullable=False, index=True)

    # Reference
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    vendor_payout_id = Column(Integer, ForeignKey("vendor_payouts.id"), nullable=True)
    driver_payout_id = Column(Integer, ForeignKey("driver_payouts.id"), nullable=True)

    # Entry Details
    entry_type = Column(String(50))  # ORDER_COMPLETED, VENDOR_PAYOUT, DRIVER_PAYOUT, REFUND
    description = Column(Text)

    # Status
    status = Column(String(50), default="posted")  # posted, pending, void

    # AI Employee who created this (for audit trail)
    created_by_ai = Column(String(50))  # AI_EMP_004 (LedgerBot Delta)
    created_by_ai_name = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    posted_at = Column(DateTime)

    # Relationships
    lines = relationship("JournalEntryLine", back_populates="journal_entry")


class JournalEntryLine(Base):
    """Individual lines for complex journal entries"""
    __tablename__ = "journal_entry_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)

    account_code = Column(String(50))
    account_name = Column(String(100))
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    description = Column(String(255))

    # Relationships
    journal_entry = relationship("JournalEntry", back_populates="lines")


# =========================================================================
# AI EMPLOYEE MODELS - Automated Delivery Operations
# =========================================================================

class AIEmployeeStatus(enum.Enum):
    ACTIVE = "active"
    IDLE = "idle"
    PROCESSING = "processing"
    ERROR = "error"
    OFFLINE = "offline"


class AIEmployee(Base):
    """AI Employees that run the automated delivery platform"""
    __tablename__ = "ai_employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)  # AI_EMP_001

    # Identity
    name = Column(String(100), nullable=False)  # OrderBot Alpha
    role = Column(String(50), nullable=False)  # order_orchestrator
    department = Column(String(50), nullable=False)  # logistics
    avatar = Column(String(10))  # 🤖

    # Status
    status = Column(SQLEnum(AIEmployeeStatus), default=AIEmployeeStatus.IDLE)
    is_online = Column(Boolean, default=True)
    last_active = Column(DateTime, default=datetime.utcnow)

    # Performance Metrics (lifetime)
    total_tasks_completed = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    total_hours_active = Column(Float, default=0.0)
    average_task_time_seconds = Column(Float, default=0.0)
    success_rate = Column(Float, default=100.0)  # percentage

    # Current Session
    session_start = Column(DateTime)
    tasks_this_session = Column(Integer, default=0)
    errors_this_session = Column(Integer, default=0)

    # Configuration
    model_version = Column(String(50), default="gpt-4")
    config_json = Column(Text)  # JSON configuration

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    activities = relationship("AIEmployeeActivity", back_populates="ai_employee")
    hourly_reports = relationship("AIEmployeeHourlyReport", back_populates="ai_employee")


class AIEmployeeActivity(Base):
    """Activity log for AI Employee actions"""
    __tablename__ = "ai_employee_activities"

    id = Column(Integer, primary_key=True, index=True)
    ai_employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=False)

    # Activity Details
    activity_type = Column(String(50), nullable=False)  # ORDER_PROCESSED, DISPATCH_ASSIGNED, etc.
    description = Column(Text)
    status = Column(String(20), default="completed")  # completed, failed, pending

    # Related Entities
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)

    # Performance
    processing_time_ms = Column(Integer)  # Time to complete in milliseconds
    error_message = Column(Text)

    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    # Relationships
    ai_employee = relationship("AIEmployee", back_populates="activities")


class AIEmployeeHourlyReport(Base):
    """Hourly reports generated by each AI Employee"""
    __tablename__ = "ai_employee_hourly_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), unique=True, nullable=False, index=True)  # RPT-AI001-20241201-14
    ai_employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=False)

    # Report Period
    report_hour = Column(DateTime, nullable=False)  # Start of the hour
    report_date = Column(DateTime, nullable=False)  # Date for grouping

    # Metrics - Common to all AI Employees
    tasks_completed = Column(Integer, default=0)
    tasks_failed = Column(Integer, default=0)
    avg_processing_time_ms = Column(Integer, default=0)
    total_processing_time_ms = Column(Integer, default=0)
    error_rate = Column(Float, default=0.0)
    uptime_percentage = Column(Float, default=100.0)

    # Role-Specific Metrics (JSON for flexibility)
    # OrderBot: orders_processed, total_order_value, payment_success_rate
    # KitchenBot: orders_sent_to_kitchen, avg_prep_time, kitchen_delays
    # DispatchBot: deliveries_dispatched, avg_delivery_time, driver_utilization
    # LedgerBot: journal_entries_created, total_debits, total_credits, reconciled
    # QualityBot: reviews_processed, complaints_handled, avg_rating
    role_specific_metrics = Column(Text)  # JSON

    # Summary
    summary_text = Column(Text)  # Human-readable summary
    alerts = Column(Text)  # JSON array of any alerts/issues
    recommendations = Column(Text)  # JSON array of recommendations

    # Status
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ai_employee = relationship("AIEmployee", back_populates="hourly_reports")


class AIEmployeeDailyReport(Base):
    """Daily summary reports aggregating hourly reports"""
    __tablename__ = "ai_employee_daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), unique=True, nullable=False, index=True)  # DAILY-AI001-20241201
    ai_employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=False)

    # Report Period
    report_date = Column(DateTime, nullable=False)

    # Aggregated Metrics
    total_tasks = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    success_rate = Column(Float, default=100.0)
    total_active_hours = Column(Float, default=0.0)
    peak_hour = Column(Integer)  # Hour with most activity (0-23)
    peak_hour_tasks = Column(Integer, default=0)

    # Role-Specific Daily Summary (JSON)
    daily_metrics = Column(Text)

    # Performance Comparison
    vs_previous_day = Column(Float)  # % change in tasks
    vs_weekly_avg = Column(Float)  # % vs 7-day average

    # Summary
    summary_text = Column(Text)
    key_achievements = Column(Text)  # JSON array
    issues_encountered = Column(Text)  # JSON array
    recommendations = Column(Text)  # JSON array

    # Status
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class DashboardMetric(Base):
    """Real-time metrics for the AI Operations Dashboard"""
    __tablename__ = "dashboard_metrics"

    id = Column(Integer, primary_key=True, index=True)
    metric_key = Column(String(100), unique=True, nullable=False, index=True)

    # Metric Value
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(20))  # count, percentage, dollars, seconds
    metric_label = Column(String(100))

    # Categorization
    category = Column(String(50))  # orders, deliveries, finance, quality
    ai_employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=True)

    # Time Window
    time_window = Column(String(20))  # realtime, hourly, daily, weekly

    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
