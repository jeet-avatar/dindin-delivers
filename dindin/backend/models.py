from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum, JSON
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
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    PENDING_MODIFICATION = "PENDING_MODIFICATION"  # Awaiting customer approval for partial order

    # NEW: Restaurant Delivery Decision Flow (60-second window)
    PENDING_RESTAURANT_DELIVERY = "PENDING_RESTAURANT_DELIVERY"  # Restaurant has 60s to decide if they deliver
    RESTAURANT_DELIVERING = "RESTAURANT_DELIVERING"  # Restaurant chose to deliver themselves
    AWAITING_DRIVER = "AWAITING_DRIVER"  # Restaurant declined/timeout - posted to driver pool

    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class DeliveryMethod(enum.Enum):
    """Who is delivering the order"""
    PENDING = "pending"          # Not yet decided
    RESTAURANT = "restaurant"    # Restaurant staff delivering
    DRIVER = "driver"            # Dollor driver delivering
    CUSTOMER_PICKUP = "pickup"   # Customer picking up (no delivery)


class ModificationStatus(enum.Enum):
    """Status of order modification requests"""
    PENDING = "pending"           # Waiting for customer response
    ACCEPTED = "accepted"         # Customer accepted partial order
    REJECTED = "rejected"         # Customer rejected, wants full refund
    EXPIRED = "expired"           # Customer didn't respond in time (auto-refund)

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
    delivery_distance_miles = Column(Float)  # Actual distance stored at order creation - CRITICAL for accurate payout calculation
    driver_location = Column(Text)  # JSON: {"latitude": ..., "longitude": ..., "updated_at": ...}

    # Restaurant Delivery Decision (60-second window)
    delivery_method = Column(SQLEnum(DeliveryMethod), default=DeliveryMethod.PENDING)
    restaurant_delivery_decision_at = Column(DateTime)  # When restaurant made decision
    restaurant_delivery_deadline = Column(DateTime)  # 60-second deadline for restaurant to decide
    restaurant_deliverer_name = Column(String(255))  # Name of restaurant staff delivering (if restaurant delivers)
    
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
    
    # Delivery Address Fields (for easier access)
    delivery_street = Column(String(500))
    delivery_city = Column(String(100))
    delivery_state = Column(String(100))
    delivery_zip = Column(String(20))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    preparing_at = Column(DateTime)
    ready_at = Column(DateTime)  # When order is ready for pickup
    picked_up_at = Column(DateTime)  # When driver picked up
    delivered_at = Column(DateTime)
    estimated_ready_at = Column(DateTime)  # Restaurant's estimated time when order will be ready
    estimated_delivery_time = Column(DateTime)  # Estimated delivery time for customer

    # Relationships
    vendor = relationship("Vendor")
    driver = relationship("Driver", foreign_keys=[driver_id], primaryjoin="Order.driver_id == Driver.id")

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


class DriverStatus(enum.Enum):
    PENDING = "pending"
    DOCUMENTS_REQUIRED = "documents_required"
    BACKGROUND_CHECK_PENDING = "background_check_pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"


class BackgroundCheckStatus(enum.Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    CLEAR = "clear"
    CONSIDER = "consider"  # Requires manual review
    FAILED = "failed"
    EXPIRED = "expired"


class InsuranceType(enum.Enum):
    PERSONAL = "personal"
    COMMERCIAL = "commercial"
    RIDESHARE = "rideshare"  # Period 1/2/3 coverage


class DocumentType(enum.Enum):
    DRIVERS_LICENSE = "drivers_license"
    INSURANCE_CARD = "insurance_card"
    VEHICLE_REGISTRATION = "vehicle_registration"
    VEHICLE_PHOTO_FRONT = "vehicle_photo_front"
    VEHICLE_PHOTO_BACK = "vehicle_photo_back"
    VEHICLE_PHOTO_INTERIOR = "vehicle_photo_interior"
    PROFILE_PHOTO = "profile_photo"
    PROOF_OF_ADDRESS = "proof_of_address"
    VEHICLE_INSPECTION = "vehicle_inspection"
    BACKGROUND_CHECK_CONSENT = "background_check_consent"
    SSN_VERIFICATION = "ssn_verification"


class DocumentStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ConsentType(enum.Enum):
    TERMS_OF_SERVICE = "terms_of_service"
    PRIVACY_POLICY = "privacy_policy"
    DRIVER_AGREEMENT = "driver_agreement"
    INDEPENDENT_CONTRACTOR = "independent_contractor"
    BACKGROUND_CHECK_AUTH = "background_check_auth"
    INSURANCE_DISCLOSURE = "insurance_disclosure"
    SAFETY_GUIDELINES = "safety_guidelines"
    RIDER_TERMS = "rider_terms"


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
    password_reset_token = Column(String(100), nullable=True)  # Token for password reset
    password_reset_expiry = Column(DateTime, nullable=True)  # Token expiry time
    date_of_birth = Column(DateTime)
    ssn_last_four = Column(String(4))  # Last 4 digits for verification display

    # Address
    street = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100), default="US")

    # ============== DRIVER LICENSE VERIFICATION ==============
    drivers_license = Column(Boolean, default=False)
    drivers_license_url = Column(String(500))  # Front of license
    drivers_license_back_url = Column(String(500))  # Back of license
    drivers_license_number = Column(String(50))
    drivers_license_state = Column(String(10))
    drivers_license_expiry = Column(DateTime)
    drivers_license_verified = Column(Boolean, default=False)
    drivers_license_verified_at = Column(DateTime)
    drivers_license_status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)
    drivers_license_rejection_reason = Column(Text)

    # ============== BACKGROUND CHECK ==============
    background_check = Column(Boolean, default=False)
    background_check_status = Column(SQLEnum(BackgroundCheckStatus), default=BackgroundCheckStatus.NOT_STARTED)
    background_check_provider = Column(String(100))  # e.g., "Checkr", "Sterling", "HireRight"
    background_check_report_id = Column(String(255))
    background_check_requested_at = Column(DateTime)
    background_check_completed_at = Column(DateTime)
    background_check_expiry = Column(DateTime)  # Usually 1 year
    background_check_clear = Column(Boolean, default=False)
    background_check_notes = Column(Text)  # Admin notes for "consider" results
    criminal_record_check = Column(Boolean, default=False)
    dmv_record_check = Column(Boolean, default=False)
    sex_offender_check = Column(Boolean, default=False)

    # ============== INSURANCE VERIFICATION ==============
    insurance = Column(Boolean, default=False)
    insurance_url = Column(String(500))
    insurance_type = Column(SQLEnum(InsuranceType), default=InsuranceType.PERSONAL)
    insurance_provider = Column(String(100))
    insurance_policy_number = Column(String(100))
    insurance_expiry = Column(DateTime)
    insurance_verified = Column(Boolean, default=False)
    insurance_verified_at = Column(DateTime)
    insurance_status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)
    insurance_rejection_reason = Column(Text)
    insurance_liability_amount = Column(Float)  # Coverage amount in dollars
    insurance_has_rideshare_coverage = Column(Boolean, default=False)  # Critical for TNC compliance

    # ============== VEHICLE VERIFICATION ==============
    vehicle_type = Column(String(50))  # car, motorcycle, bicycle, scooter
    vehicle_make = Column(String(100))
    vehicle_model = Column(String(100))
    vehicle_year = Column(Integer)
    vehicle_color = Column(String(50))
    license_plate = Column(String(20))
    license_plate_state = Column(String(10))
    vehicle_vin = Column(String(50))
    vehicle_registration_url = Column(String(500))
    vehicle_registration_expiry = Column(DateTime)
    vehicle_registration_verified = Column(Boolean, default=False)
    vehicle_registration_status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)
    vehicle_doors = Column(Integer, default=4)  # Most TNCs require 4-door
    vehicle_seats = Column(Integer, default=5)
    vehicle_meets_requirements = Column(Boolean, default=False)  # Year, doors, condition

    # Vehicle Photos (for verification)
    vehicle_front_url = Column(String(500))  # Front view of vehicle
    vehicle_side_url = Column(String(500))   # Side view of vehicle
    vehicle_back_url = Column(String(500))   # Back view showing license plate

    # ============== VEHICLE INSPECTION ==============
    vehicle_inspection_required = Column(Boolean, default=True)
    vehicle_inspection_date = Column(DateTime)
    vehicle_inspection_expiry = Column(DateTime)
    vehicle_inspection_passed = Column(Boolean, default=False)
    vehicle_inspection_url = Column(String(500))
    vehicle_inspection_notes = Column(Text)

    # ============== PROFILE PHOTO ==============
    profile_photo_url = Column(String(500))
    profile_photo_verified = Column(Boolean, default=False)
    profile_photo_status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)

    # ============== VERIFICATION STATUS ==============
    verification_complete = Column(Boolean, default=False)  # All required docs verified
    verification_completed_at = Column(DateTime)
    onboarding_step = Column(Integer, default=1)  # Track progress: 1=personal, 2=docs, 3=vehicle, 4=background, 5=complete
    can_accept_rides = Column(Boolean, default=False)  # Final flag: only True when fully verified

    # Status and Ratings
    status = Column(SQLEnum(DriverStatus), default=DriverStatus.PENDING)
    status_reason = Column(Text)  # Why suspended/deactivated
    rating = Column(Float, default=5.0)
    total_deliveries = Column(Integer, default=0)
    total_rides = Column(Integer, default=0)
    acceptance_rate = Column(Float, default=100.0)
    cancellation_rate = Column(Float, default=0.0)

    # Real-time tracking
    current_latitude = Column(Float)
    current_longitude = Column(Float)
    is_online = Column(Boolean, default=False)
    last_location_update = Column(DateTime)

    # Mobile App
    device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))  # 'ios' or 'android'

    # Stripe Connect (for payouts)
    stripe_account_id = Column(String(255))
    stripe_onboarded = Column(Boolean, default=False)

    # ============== CONSENT TRACKING ==============
    tos_accepted = Column(Boolean, default=False)
    tos_accepted_at = Column(DateTime)
    tos_version = Column(String(20))
    privacy_policy_accepted = Column(Boolean, default=False)
    privacy_policy_accepted_at = Column(DateTime)
    privacy_policy_version = Column(String(20))
    driver_agreement_accepted = Column(Boolean, default=False)
    driver_agreement_accepted_at = Column(DateTime)
    driver_agreement_version = Column(String(20))
    background_check_consent = Column(Boolean, default=False)
    background_check_consent_at = Column(DateTime)
    insurance_disclosure_accepted = Column(Boolean, default=False)
    insurance_disclosure_accepted_at = Column(DateTime)
    safety_guidelines_accepted = Column(Boolean, default=False)
    safety_guidelines_accepted_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)
    last_active = Column(DateTime)
    deactivated_at = Column(DateTime)

    # Admin Notes
    admin_notes = Column(Text)
    reviewed_by = Column(String(100))  # Admin who approved/rejected
    reviewed_at = Column(DateTime)

    # Relationships
    payouts = relationship("DriverPayout", back_populates="driver")
    documents = relationship("DriverDocument", back_populates="driver", cascade="all, delete-orphan")
    consents = relationship("DriverConsent", back_populates="driver", cascade="all, delete-orphan")
    verification_history = relationship("DriverVerificationHistory", back_populates="driver", cascade="all, delete-orphan")


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


# ==================== REFUND SYSTEM ====================

class RefundReason(enum.Enum):
    CUSTOMER_CANCELLED = "customer_cancelled"
    RESTAURANT_REJECTED = "restaurant_rejected"
    RESTAURANT_CLOSED = "restaurant_closed"
    ITEM_UNAVAILABLE = "item_unavailable"
    DELIVERY_ISSUE = "delivery_issue"
    QUALITY_ISSUE = "quality_issue"
    WRONG_ORDER = "wrong_order"
    LATE_DELIVERY = "late_delivery"
    OTHER = "other"


class RefundStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Refund(Base):
    """Tracks refunds for cancelled or problematic orders"""
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    refund_number = Column(String(50), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)

    # Refund Details
    reason = Column(SQLEnum(RefundReason), nullable=False)
    reason_details = Column(Text)  # Additional notes
    requested_by = Column(String(50))  # customer, restaurant, driver, system
    requested_by_id = Column(Integer)  # ID of requester

    # Amounts
    original_amount = Column(Float, nullable=False)
    refund_amount = Column(Float, nullable=False)
    refund_type = Column(String(20))  # full, partial

    # What gets refunded
    refund_subtotal = Column(Float, default=0.0)
    refund_tax = Column(Float, default=0.0)
    refund_delivery_fee = Column(Float, default=0.0)
    refund_platform_fee = Column(Float, default=0.0)
    refund_tip = Column(Float, default=0.0)

    # Stripe Integration
    stripe_refund_id = Column(String(255))
    stripe_payment_intent_id = Column(String(255))
    stripe_status = Column(String(50))  # succeeded, pending, failed

    # Status
    status = Column(SQLEnum(RefundStatus), default=RefundStatus.PENDING)
    failure_reason = Column(Text)

    # Processing
    processed_by_ai = Column(String(100))
    processed_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order = relationship("Order")


# ==================== ORDER INVOICE SYSTEM ====================

class OrderInvoice(Base):
    """Customer-facing invoices for food delivery orders"""
    __tablename__ = "order_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)

    # Customer Info
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))

    # Restaurant Info
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    restaurant_name = Column(String(255))
    restaurant_address = Column(Text)

    # Invoice Details
    invoice_date = Column(DateTime, default=datetime.utcnow)
    order_date = Column(DateTime)

    # Items (JSON array of order items)
    items = Column(Text)  # JSON: [{"name": "...", "quantity": 2, "unit_price": 15.99, "total": 31.98}]

    # Amounts (matching order)
    subtotal = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)

    # Payment Info
    payment_method = Column(String(50))
    payment_status = Column(String(50))
    stripe_payment_intent_id = Column(String(255))

    # Delivery Info
    delivery_address = Column(Text)

    # PDF Generation
    pdf_url = Column(String(500))
    pdf_generated = Column(Boolean, default=False)
    pdf_generated_at = Column(DateTime)

    # Email Tracking
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("Order")
    vendor = relationship("Vendor")


# ==================== ORDER MODIFICATION SYSTEM ====================

class OrderModification(Base):
    """
    Tracks order modifications when restaurant marks items unavailable.
    Customer can accept partial order or reject for full refund.
    """
    __tablename__ = "order_modifications"

    id = Column(Integer, primary_key=True, index=True)
    modification_number = Column(String(50), unique=True, nullable=False, index=True)  # MOD-20251210-00001
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)

    # Original Order Details
    original_items = Column(Text)  # JSON: Original items list
    original_subtotal = Column(Float)
    original_tax = Column(Float)
    original_total = Column(Float)

    # Unavailable Items
    unavailable_items = Column(Text)  # JSON: [{"name": "...", "price": 12.99, "quantity": 1, "reason": "out of stock"}]
    unavailable_count = Column(Integer, default=0)
    unavailable_total = Column(Float, default=0.0)

    # Modified Order (after removing unavailable items)
    modified_items = Column(Text)  # JSON: Remaining available items
    modified_subtotal = Column(Float)
    modified_tax = Column(Float)
    modified_delivery_fee = Column(Float)  # Delivery fee stays same
    modified_platform_fee = Column(Float)  # Platform fee stays $1
    modified_tip = Column(Float)  # Tip proportionally adjusted
    modified_total = Column(Float)

    # Refund Amount (difference customer gets back if they accept)
    partial_refund_amount = Column(Float)

    # Status
    status = Column(String(50), default="pending")  # pending, accepted, rejected, expired

    # Customer Response
    customer_response = Column(String(50))  # "accept_partial" or "reject_full_refund"
    customer_responded_at = Column(DateTime)

    # Notification Tracking
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime)
    push_notification_id = Column(String(255))

    # Expiration (customer has 10 minutes to respond)
    expires_at = Column(DateTime)

    # Created by restaurant
    created_by_restaurant_id = Column(Integer, ForeignKey("vendors.id"))
    created_by_restaurant_name = Column(String(255))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order = relationship("Order")
    vendor = relationship("Vendor")


# ==================== RIDESHARE SYSTEM ====================

class RideStatus(enum.Enum):
    WAITING_FOR_DRIVER = "waiting_for_driver"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_EN_ROUTE = "driver_en_route"
    PICKED_UP = "picked_up"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Ride(Base):
    """Rideshare rides - Uber-style transportation with $1 platform fee"""
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    ride_number = Column(String(50), unique=True, nullable=False, index=True)  # RIDE-ABC123

    # Customer Information
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255))
    customer_phone = Column(String(50))

    # Pickup Location
    pickup_street = Column(Text)
    pickup_city = Column(String(100))
    pickup_state = Column(String(100))
    pickup_zip = Column(String(20))
    pickup_lat = Column(Float)
    pickup_lng = Column(Float)

    # Dropoff Location
    dropoff_street = Column(Text)
    dropoff_city = Column(String(100))
    dropoff_state = Column(String(100))
    dropoff_zip = Column(String(20))
    dropoff_lat = Column(Float)
    dropoff_lng = Column(Float)

    # Trip Details
    distance_miles = Column(Float, default=0.0)
    duration_minutes = Column(Float, default=0.0)
    notes = Column(Text)

    # Fare Breakdown (matches iOS RideRequestViewModel)
    base_fare = Column(Float, default=2.0)
    distance_fee = Column(Float, default=0.0)
    time_fee = Column(Float, default=0.0)
    surge_multiplier = Column(Float, default=1.0)
    platform_fee = Column(Float, default=1.0)  # $1 flat fee
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)
    total_fare = Column(Float, default=0.0)
    driver_earnings = Column(Float, default=0.0)

    # Negotiation
    customer_offer = Column(Float)
    driver_offer = Column(Float)
    agreed_fare = Column(Float)
    negotiation_status = Column(String(50))  # none, customer_offered, driver_countered, accepted, rejected

    # Driver Information
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    driver_name = Column(String(255))
    driver_phone = Column(String(50))
    driver_latitude = Column(Float)
    driver_longitude = Column(Float)

    # Status
    status = Column(SQLEnum(RideStatus), default=RideStatus.WAITING_FOR_DRIVER)

    # Payment
    payment_status = Column(String(50))  # pending, paid, refunded
    payment_intent_id = Column(String(255))
    payment_amount = Column(Float)
    paid_at = Column(DateTime)

    # Cancellation
    cancellation_reason = Column(Text)
    cancellation_fee = Column(Float, default=0.0)
    refund_amount = Column(Float, default=0.0)
    cancelled_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    driver_accepted_at = Column(DateTime)
    picked_up_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Relationships
    driver = relationship("Driver", foreign_keys=[driver_id])


# ==================== CUSTOMER FAVORITES SYSTEM ====================

class CustomerFavorite(Base):
    """Customer favorite restaurants - replaces Firebase favorites"""
    __tablename__ = "customer_favorites"

    id = Column(Integer, primary_key=True, index=True)

    # Customer (using customer ID from customer session)
    customer_id = Column(Integer, nullable=False, index=True)

    # Restaurant/Vendor Information
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    restaurant_name = Column(String(255))
    cuisine = Column(String(100))
    rating = Column(Float, default=0.0)
    image_url = Column(String(500))
    address = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String(50))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor")


# ==================== DRIVER VERIFICATION SYSTEM ====================

class DriverDocument(Base):
    """Stores driver uploaded documents with verification status"""
    __tablename__ = "driver_documents"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)

    # Document Details
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    document_url = Column(String(500), nullable=False)
    document_name = Column(String(255))  # Original filename
    file_size = Column(Integer)  # bytes
    mime_type = Column(String(100))

    # Verification
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)
    verified_by = Column(String(100))  # Admin who verified
    verified_at = Column(DateTime)
    rejection_reason = Column(Text)

    # Expiration (for licenses, insurance, etc.)
    expiry_date = Column(DateTime)
    expiry_notification_sent = Column(Boolean, default=False)
    expiry_notification_sent_at = Column(DateTime)

    # Metadata
    metadata_json = Column(Text)  # JSON for document-specific data

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    driver = relationship("Driver", back_populates="documents")


class DriverConsent(Base):
    """Tracks all legal consents given by drivers"""
    __tablename__ = "driver_consents"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)

    # Consent Details
    consent_type = Column(SQLEnum(ConsentType), nullable=False)
    consent_version = Column(String(20), nullable=False)  # e.g., "1.0", "2.1"
    consent_text_hash = Column(String(64))  # SHA256 hash of consent text at time of signing

    # Agreement
    agreed = Column(Boolean, default=False)
    agreed_at = Column(DateTime)
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(String(500))
    device_id = Column(String(255))

    # Signature (for important agreements)
    electronic_signature = Column(String(255))  # Name as typed
    signature_image_url = Column(String(500))  # If signature image captured

    # Revocation (users can revoke some consents)
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)
    revocation_reason = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    driver = relationship("Driver", back_populates="consents")


class DriverVerificationHistory(Base):
    """Audit trail for all driver verification status changes"""
    __tablename__ = "driver_verification_history"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)

    # Status Change
    previous_status = Column(String(50))
    new_status = Column(String(50))
    change_type = Column(String(50))  # status_change, document_approved, document_rejected, background_check_update

    # Details
    field_changed = Column(String(100))  # Which field changed
    old_value = Column(Text)
    new_value = Column(Text)
    reason = Column(Text)

    # Who made the change
    changed_by = Column(String(100))  # Admin username or "system"
    changed_by_type = Column(String(20))  # admin, system, driver

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    driver = relationship("Driver", back_populates="verification_history")


# ==================== CUSTOMER CONSENT SYSTEM ====================

class Customer(Base):
    """Customer accounts with consent tracking"""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    # Identity
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50))
    full_name = Column(String(255))
    password_hash = Column(String(255))  # For email login

    # Auth Providers
    apple_user_id = Column(String(255), unique=True, index=True)
    google_user_id = Column(String(255), unique=True, index=True)

    # Profile
    profile_photo_url = Column(String(500))

    # Address
    default_address = Column(Text)  # JSON

    # Payment
    stripe_customer_id = Column(String(255))
    default_payment_method = Column(String(255))

    # ============== CONSENT TRACKING ==============
    tos_accepted = Column(Boolean, default=False)
    tos_accepted_at = Column(DateTime)
    tos_version = Column(String(20))
    privacy_policy_accepted = Column(Boolean, default=False)
    privacy_policy_accepted_at = Column(DateTime)
    privacy_policy_version = Column(String(20))
    rider_terms_accepted = Column(Boolean, default=False)
    rider_terms_accepted_at = Column(DateTime)
    rider_terms_version = Column(String(20))
    marketing_consent = Column(Boolean, default=False)
    marketing_consent_at = Column(DateTime)

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Device
    device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)

    # Relationships
    consents = relationship("CustomerConsent", back_populates="customer", cascade="all, delete-orphan")


class CustomerAddress(Base):
    """Customer saved addresses - matches database schema from addresses.py"""
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=False, index=True)

    # Address Details (matching addresses.py schema)
    location_name = Column(String(100))  # "Home", "Work", etc.
    street = Column(String(255), nullable=False)
    unit = Column(String(50))
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    instructions = Column(String(500))
    address_type = Column(String(20), default="Home")

    # Coordinates
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)

    # Contact
    phone_number = Column(String(20))

    # Flags
    is_default = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CustomerConsent(Base):
    """Tracks all legal consents given by customers/riders"""
    __tablename__ = "customer_consents"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Consent Details
    consent_type = Column(SQLEnum(ConsentType), nullable=False)
    consent_version = Column(String(20), nullable=False)
    consent_text_hash = Column(String(64))

    # Agreement
    agreed = Column(Boolean, default=False)
    agreed_at = Column(DateTime)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    device_id = Column(String(255))

    # Revocation
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)
    revocation_reason = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="consents")


# ==================== LEGAL DOCUMENT VERSIONS ====================

class LegalDocument(Base):
    """Stores versions of legal documents (TOS, Privacy Policy, etc.)"""
    __tablename__ = "legal_documents"

    id = Column(Integer, primary_key=True, index=True)

    # Document Identity
    document_type = Column(SQLEnum(ConsentType), nullable=False)
    version = Column(String(20), nullable=False)  # e.g., "1.0", "1.1", "2.0"

    # Content
    title = Column(String(255), nullable=False)
    content_text = Column(Text, nullable=False)  # Full text of document
    content_hash = Column(String(64), nullable=False)  # SHA256 hash
    content_url = Column(String(500))  # URL to hosted version

    # Metadata
    effective_date = Column(DateTime, nullable=False)
    supersedes_version = Column(String(20))  # Which version this replaces
    summary_of_changes = Column(Text)  # What changed from previous version

    # Status
    is_current = Column(Boolean, default=False)  # Is this the active version
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime)

    # Approval
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    legal_review_completed = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== BACKGROUND CHECK INTEGRATION ====================

class BackgroundCheckRequest(Base):
    """Tracks background check requests to third-party providers (Checkr, etc.)"""
    __tablename__ = "background_check_requests"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)

    # Provider Details
    provider = Column(String(100), nullable=False)  # checkr, sterling, etc.
    provider_request_id = Column(String(255))
    provider_report_id = Column(String(255))
    provider_candidate_id = Column(String(255))

    # Request Details
    package_type = Column(String(100))  # basic, standard, premium
    checks_requested = Column(Text)  # JSON array of check types

    # Status
    status = Column(SQLEnum(BackgroundCheckStatus), default=BackgroundCheckStatus.PENDING)
    status_detail = Column(String(100))

    # Results (high-level - detailed in reports)
    overall_result = Column(String(50))  # clear, consider, fail
    criminal_check_result = Column(String(50))
    mvr_check_result = Column(String(50))  # Motor Vehicle Record
    ssn_verification_result = Column(String(50))

    # Timing
    requested_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    expires_at = Column(DateTime)  # Background checks typically valid for 1 year

    # Report
    report_url = Column(String(500))  # Secure URL to full report
    report_json = Column(Text)  # Cached report data

    # Webhooks
    webhook_received = Column(Boolean, default=False)
    webhook_received_at = Column(DateTime)
    webhook_payload = Column(Text)  # JSON

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    driver = relationship("Driver")
